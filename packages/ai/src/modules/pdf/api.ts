import {
  convertToModelMessages,
  generateId,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import * as z from "zod";

import { eq } from "@turbostarter/db";
import {
  pdfChat,
  pdfDocument,
  pdfEmbedding,
  pdfMessage,
} from "@turbostarter/db/schema/pdf";
import { db } from "@turbostarter/db/server";
import { getDeleteUrl } from "@turbostarter/storage/server";

import { repairToolCall } from "../../utils/llm";

import { PROMPTS } from "./constants";
import { findRelevantContent, generateDocumentEmbeddings } from "./embeddings";
import { modelStrategies } from "./strategies";
import { Role } from "./types";

import type { PdfMessagePayload } from "./schema";
import type { Citation, CitationResponse } from "./types";
import type { EmbeddingSearchResult } from "./embeddings";
import type {
  InsertPdfChat,
  InsertPdfDocument,
  InsertPdfMessage,
} from "@turbostarter/db/schema/pdf";

const createDocument = async (data: InsertPdfDocument) => {
  const [documentData] = await db.insert(pdfDocument).values(data).returning();

  if (!documentData) {
    return null;
  }

  void (async () => {
    const generated = await generateDocumentEmbeddings(documentData.path);

    if (!generated.length) {
      return;
    }

    await db
      .insert(pdfEmbedding)
      .values(
        generated.map((chunk) => ({
          content: chunk.content,
          documentId: documentData.id,
          embedding: chunk.embedding,
          // Citation metadata for page navigation
          pageNumber: chunk.metadata.pageNumber,
          charStart: chunk.metadata.charStart,
          charEnd: chunk.metadata.charEnd,
          sectionTitle: chunk.metadata.sectionTitle,
        })),
      )
      .onConflictDoNothing();
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

// Create tools with optional document filtering
const createTools = (documentIds?: string[]) => {
  console.log(`🛠️ createTools called with documentIds:`, documentIds);
  return {
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
            documentIds.map((docId) => findRelevantContent(query, docId))
          );
          const combined = results.flat().slice(0, 6);
          console.log(`🛠️ Combined results:`, combined.length);
          // Return formatted results with citation instructions
          return {
            results: combined,
            citationInstructions: "IMPORTANT: Cite each source using [[cite:ID:PAGE]] format where ID is the source's id and PAGE is pageNumber.",
          };
        }
        const results = await findRelevantContent(query);
        return {
          results,
          citationInstructions: "IMPORTANT: Cite each source using [[cite:ID:PAGE]] format where ID is the source's id and PAGE is pageNumber.",
        };
      },
    }),
  };
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
 * Parses AI response content containing [[cite:id:page]] markers and converts
 * them to numbered citations [1], [2], etc.
 *
 * @param content - Raw AI response with [[cite:id:page]] markers
 * @param embeddings - Array of embedding results for looking up excerpts
 * @returns CitationResponse with parsed content and citation array
 *
 * @example
 * ```typescript
 * const response = parseCitations(
 *   "The document states X [[cite:abc123:5]] and Y [[cite:def456:8]].",
 *   embeddingResults
 * );
 * // response.content = "The document states X [1] and Y [2]."
 * // response.citations = [{ index: 1, embeddingId: "abc123", ... }, ...]
 * ```
 */
export function parseCitations(
  content: string,
  embeddings: EmbeddingSearchResult[]
): CitationResponse {
  const citations: Citation[] = [];
  const seenIds = new Map<string, number>(); // embeddingId -> citation index

  // Create a lookup map for embeddings
  const embeddingMap = new Map(
    embeddings.map((e) => [e.id, e])
  );

  // Replace all citation markers with numbered references
  const parsedContent = content.replace(CITATION_REGEX, (_match, embeddingId: string, pageNumStr: string) => {
    const pageNumber = parseInt(pageNumStr, 10);

    // If we've already seen this embedding, reuse the same citation number
    if (seenIds.has(embeddingId)) {
      return `[${seenIds.get(embeddingId)}]`;
    }

    // Create new citation
    const index = citations.length + 1;
    seenIds.set(embeddingId, index);

    // Look up the embedding for excerpt and relevance
    const embedding = embeddingMap.get(embeddingId);

    citations.push({
      index,
      embeddingId,
      relevance: embedding?.similarity ?? 0,
      pageNumber: embedding?.pageNumber ?? pageNumber,
      // Create excerpt: first 150 chars of content
      excerpt: embedding?.name
        ? embedding.name.substring(0, 150) + (embedding.name.length > 150 ? "..." : "")
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
 * Formats embedding results as context for the AI with citation metadata.
 * This helps the AI understand how to cite the sources.
 *
 * @param embeddings - Array of embedding search results
 * @returns Formatted string with citation instructions per result
 */
export function formatEmbeddingsForCitation(embeddings: EmbeddingSearchResult[]): string {
  if (embeddings.length === 0) {
    return "No relevant content found in the document.";
  }

  return embeddings
    .map((e, i) => {
      return `[Source ${i + 1}]
ID: ${e.id}
Page: ${e.pageNumber}
Relevance: ${(e.similarity * 100).toFixed(1)}%
Content: ${e.name}
---
To cite this source, use: [[cite:${e.id}:${e.pageNumber}]]`;
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
    stopWhen: stepCountIs(3),
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
