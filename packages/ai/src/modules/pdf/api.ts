import {
  convertToModelMessages,
  generateId,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import * as z from "zod";

import { eq, sql } from "@turbostarter/db";
import {
  pdfChat,
  pdfDocument,
  pdfEmbedding,
  pdfMessage,
} from "@turbostarter/db/schema/pdf";
import { db } from "@turbostarter/db/server";
import { generateId as generateCitationId } from "@turbostarter/shared/utils";
import { getDeleteUrl } from "@turbostarter/storage/server";

import { repairToolCall } from "../../utils/llm";

import { PROMPTS } from "./constants";
import { processPdfWithDualResolution } from "./dual-embeddings";
import { findRelevantContent } from "./embeddings";
import { searchWithCitations } from "./search";
import { modelStrategies } from "./strategies";
import { Role } from "./types";

import type { PdfMessagePayload } from "./schema";
import type { Citation, CitationResponse, PreciseCitation } from "./types";
import type { EmbeddingSearchResult } from "./embeddings";
import type { SearchResult } from "./search";
import type {
  InsertPdfChat,
  InsertPdfDocument,
  InsertPdfMessage,
} from "@turbostarter/db/schema/pdf";

/**
 * Update document processing status
 */
const updateDocumentStatus = async (
  documentId: string,
  status: "pending" | "processing" | "ready" | "failed",
  error?: string,
) => {
  await db
    .update(pdfDocument)
    .set({
      processingStatus: status,
      processingError: error ?? null,
    })
    .where(eq(pdfDocument.id, documentId));
};

const createDocument = async (data: InsertPdfDocument) => {
  const [documentData] = await db.insert(pdfDocument).values(data).returning();

  if (!documentData) {
    return null;
  }

  // Process with dual-resolution chunking (citation units + retrieval chunks)
  void (async () => {
    try {
      // Set status to processing
      await updateDocumentStatus(documentData.id, "processing");

      const result = await processPdfWithDualResolution(
        documentData.id,
        documentData.path,
      );
      console.log(
        `[api] Dual-resolution processing complete: ${result.storage.stats.totalCitationUnits} citation units, ${result.storage.stats.totalRetrievalChunks} retrieval chunks`,
      );

      // Set status to ready
      await updateDocumentStatus(documentData.id, "ready");
    } catch (error) {
      console.error(`[api] Failed to process PDF with dual-resolution:`, error);
      // Set status to failed with error message
      await updateDocumentStatus(
        documentData.id,
        "failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  })();

  return documentData;
};

const deleteDocument = async (path: string) => {
  const { url } = await getDeleteUrl({ path });

  await fetch(url, {
    method: "DELETE",
  });
};

export const createChat = async (
  data: InsertPdfChat & Omit<InsertPdfDocument, "chatId">,
) => {
  const [chatData] = await db
    .insert(pdfChat)
    .values(data)
    .returning()
    .onConflictDoUpdate({
      target: pdfChat.id,
      set: data,
    });

  if (!chatData) {
    return null;
  }

  await createDocument({
    ...data,
    chatId: chatData.id,
  });

  return chatData;
};

export const createMessage = async (data: InsertPdfMessage) =>
  db.insert(pdfMessage).values(data).onConflictDoUpdate({
    target: pdfMessage.id,
    set: data,
  });

export const createMessages = async (data: InsertPdfMessage[]) =>
  db.insert(pdfMessage).values(data).onConflictDoNothing();

export const getChat = async (id: string) =>
  db.query["pdf.pdfChat"].findFirst({
    where: eq(pdfChat.id, id),
  });

export const deleteChat = async (id: string) => {
  const documents = await getChatDocuments(id);
  const [deleted] = await db.delete(pdfChat).where(eq(pdfChat.id, id)).returning();

  if (!deleted) {
    return;
  }

  void Promise.allSettled(
    documents.map((document) => deleteDocument(document.path)),
  );

  return deleted;
};

export const getUserChats = async (userId: string) =>
  db.query["pdf.pdfChat"].findMany({
    where: eq(pdfChat.userId, userId),
    orderBy: (chat, { desc }) => [desc(chat.createdAt)],
  });

export const getChatMessages = async (id: string) => {
  return db.query["pdf.pdfMessage"].findMany({
    where: eq(pdfMessage.chatId, id),
    orderBy: (message, { asc }) => [asc(message.createdAt)],
  });
};

export const getChatDocuments = async (id: string) =>
  db.query["pdf.pdfDocument"].findMany({
    where: eq(pdfDocument.chatId, id),
    orderBy: (document, { asc }) => [asc(document.createdAt)],
  });

export const getDocument = async (id: string) =>
  db.query["pdf.pdfDocument"].findFirst({
    where: eq(pdfDocument.id, id),
  });

// ============================================================================
// Hybrid Search (new dual-resolution with legacy fallback)
// ============================================================================

/**
 * Unified search result for tool responses
 */
interface UnifiedSearchResult {
  id: string;
  content: string;
  pageNumber: number;
  similarity: number;
  /** Citation unit ID for pixel-perfect highlighting (new system) */
  citationUnitId?: string;
  /** Source type: 'dual' for new system, 'legacy' for old embeddings */
  source: "dual" | "legacy";
}

/**
 * Hybrid search: tries new dual-resolution system first, falls back to legacy
 */
async function hybridSearch(
  query: string,
  documentId: string,
  limit = 6,
): Promise<UnifiedSearchResult[]> {
  // Try new dual-resolution search first
  try {
    const newResults = await searchWithCitations(query, documentId, { limit });
    if (newResults.length > 0) {
      console.log(`[hybridSearch] Using dual-resolution: ${newResults.length} results`);
      // Convert to unified format, using first citation unit for precise citing
      return newResults.map((r) => {
        const firstUnit = r.citationUnits[0];
        return {
          id: firstUnit?.id ?? r.retrievalChunkId,
          content: r.content,
          pageNumber: firstUnit?.pageNumber ?? r.pageStart,
          similarity: r.similarity,
          citationUnitId: firstUnit?.id,
          source: "dual" as const,
        };
      });
    }
  } catch (error) {
    console.warn(`[hybridSearch] Dual-resolution search failed, trying legacy:`, error);
  }

  // Fall back to legacy embeddings for old documents
  console.log(`[hybridSearch] Falling back to legacy embeddings`);
  const legacyResults = await findRelevantContent(query, documentId);
  return legacyResults.slice(0, limit).map((r) => ({
    id: r.id,
    content: r.name,
    pageNumber: r.pageNumber,
    similarity: r.similarity,
    source: "legacy" as const,
  }));
}

// Create highlight tool for precise text citations
const createHighlightTool = () => ({
  highlightText: tool({
    description: `Highlight a specific phrase from the PDF document to support your answer.
Use this tool for EACH fact you cite. The text must be an EXACT quote from the document.
Keep highlights short (10-100 characters) - single sentences or key phrases only.`,
    inputSchema: z.object({
      text: z.string().min(10).max(200).describe("Exact phrase from the document to highlight"),
      page: z.number().int().positive().describe("Page number where text appears (1-indexed)"),
      relevance: z.string().optional().describe("Brief note on why this supports your answer"),
    }),
    execute: async ({ text, page, relevance }) => {
      const citationId = generateCitationId();
      const citation: PreciseCitation = {
        citationId,
        text,
        page,
        relevance: relevance ?? null,
        timestamp: Date.now(),
      };
      return citation;
    },
  }),
});

// Create tools with optional document filtering
const createTools = (documentIds?: string[]) => {
  console.log(`🛠️ createTools called with documentIds:`, documentIds);
  const searchTool = {
    findRelevantContent: tool({
      description: `Get information from the PDF document to answer questions. Returns sources with IDs and page numbers that you MUST cite using [[cite:ID:PAGE]] format.`,
      inputSchema: z.object({
        query: z
          .string()
          .describe("The user's query to find relevant information for."),
      }),
      execute: async ({ query }) => {
        console.log(`🛠️ Tool execute called with query: "${query}"`);
        // If we have specific documents, search in each and combine results
        if (documentIds && documentIds.length > 0) {
          console.log(`🛠️ Searching in ${documentIds.length} documents:`, documentIds);
          const results = await Promise.all(
            documentIds.map((docId) => hybridSearch(query, docId, 6))
          );
          const combined = results.flat().slice(0, 6);
          console.log(`🛠️ Combined results:`, combined.length);
          // Return formatted results with citation instructions
          return {
            results: combined,
            citationInstructions: "IMPORTANT: Cite each source using [[cite:ID:PAGE]] format where ID is the source's id and PAGE is pageNumber.",
          };
        }
        // No specific documents - search across all (legacy behavior)
        const results = await findRelevantContent(query);
        return {
          results: results.map((r) => ({
            id: r.id,
            content: r.name,
            pageNumber: r.pageNumber,
            similarity: r.similarity,
            source: "legacy" as const,
          })),
          citationInstructions: "IMPORTANT: Cite each source using [[cite:ID:PAGE]] format where ID is the source's id and PAGE is pageNumber.",
        };
      },
    }),
  };
  const highlightTool = createHighlightTool();
  return { ...searchTool, ...highlightTool };
};

// Legacy export for backwards compatibility
export const tools = createTools();

// ============================================================================
// Citation Parsing
// ============================================================================

/**
 * Regular expression to match citation markers: [[cite:embeddingId:pageNum]]
 * Captures: embeddingId, pageNum
 */
const CITATION_REGEX = /\[\[cite:([a-zA-Z0-9]+):(\d+)\]\]/g;

/**
 * Common search result interface for citation parsing
 * Works with both legacy EmbeddingSearchResult and new UnifiedSearchResult
 */
interface CitableSearchResult {
  id: string;
  content?: string;  // New format
  name?: string;     // Legacy format
  similarity: number;
  pageNumber: number;
}

/**
 * Parses AI response content containing [[cite:id:page]] markers and converts
 * them to numbered citations [1], [2], etc.
 *
 * @param content - Raw AI response with [[cite:id:page]] markers
 * @param searchResults - Array of search results (legacy or unified format)
 * @returns CitationResponse with parsed content and citation array
 *
 * @example
 * ```typescript
 * const response = parseCitations(
 *   "The document states X [[cite:abc123:5]] and Y [[cite:def456:8]].",
 *   searchResults
 * );
 * // response.content = "The document states X [1] and Y [2]."
 * // response.citations = [{ index: 1, embeddingId: "abc123", ... }, ...]
 * ```
 */
export function parseCitations(
  content: string,
  searchResults: CitableSearchResult[]
): CitationResponse {
  const citations: Citation[] = [];
  const seenIds = new Map<string, number>(); // id -> citation index

  // Create a lookup map for results
  const resultMap = new Map(
    searchResults.map((r) => [r.id, r])
  );

  // Replace all citation markers with numbered references
  const parsedContent = content.replace(CITATION_REGEX, (_match, resultId: string, pageNumStr: string) => {
    const pageNumber = parseInt(pageNumStr, 10);

    // If we've already seen this ID, reuse the same citation number
    if (seenIds.has(resultId)) {
      return `[${seenIds.get(resultId)}]`;
    }

    // Create new citation
    const index = citations.length + 1;
    seenIds.set(resultId, index);

    // Look up the result for excerpt and relevance
    const result = resultMap.get(resultId);
    const textContent = result?.content ?? result?.name ?? "";

    citations.push({
      index,
      embeddingId: resultId,  // Keep field name for API compatibility
      relevance: result?.similarity ?? 0,
      pageNumber: result?.pageNumber ?? pageNumber,
      // Create excerpt: first 150 chars of content
      excerpt: textContent
        ? textContent.substring(0, 150) + (textContent.length > 150 ? "..." : "")
        : `[Content from page ${pageNumber}]`,
    });

    return `[${index}]`;
  });

  return {
    content: parsedContent,
    citations,
  };
}

/**
 * Formats search results as context for the AI with citation metadata.
 * This helps the AI understand how to cite the sources.
 * Works with both legacy EmbeddingSearchResult and new UnifiedSearchResult.
 *
 * @param results - Array of search results (legacy or unified format)
 * @returns Formatted string with citation instructions per result
 */
export function formatEmbeddingsForCitation(results: CitableSearchResult[]): string {
  if (results.length === 0) {
    return "No relevant content found in the document.";
  }

  return results
    .map((r, i) => {
      const textContent = r.content ?? r.name ?? "[No content]";
      return `[Source ${i + 1}]
ID: ${r.id}
Page: ${r.pageNumber}
Relevance: ${(r.similarity * 100).toFixed(1)}%
Content: ${textContent}
---
To cite this source, use: [[cite:${r.id}:${r.pageNumber}]]`;
    })
    .join("\n\n");
}

export const streamChatWithDocuments = async ({
  chatId,
  signal,
  documentIds,
  ...message
}: PdfMessagePayload & { signal: AbortSignal; chatId: string; documentIds?: string[] }) => {
  console.log(`📨 streamChatWithDocuments - chatId: ${chatId}, documentIds:`, documentIds);
  await createMessage({ ...message, chatId });

  const messages = await getChatMessages(chatId);

  const result = streamText({
    // Use uncached model - tools need fresh execution, not cached responses
    model: modelStrategies.languageModel("uncached"),
    messages: convertToModelMessages([
      ...messages.map((m) => ({
        ...m,
        parts: [
          {
            type: "text" as const,
            text: m.content,
          },
        ],
      })),
      {
        ...message,
        parts: [
          {
            type: "text" as const,
            text: message.content,
          },
        ],
      },
    ]),
    system: PROMPTS.SYSTEM,
    stopWhen: stepCountIs(6),
    abortSignal: signal,
    tools: createTools(documentIds),
    experimental_transform: smoothStream({
      chunking: "word",
      delayInMs: 15,
    }),
    experimental_repairToolCall: repairToolCall,
    onError: (error) => {
      console.error(error);
    },
  });

  void result.consumeStream();

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
      await createMessage({
        id: responseMessage.id || generateId(),
        chatId,
        content: responseMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n"),
        role: Role.ASSISTANT,
      });
    },
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
};

// Re-export PreciseCitation type for consumers
export type { PreciseCitation } from "./types";
