import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embed, embedMany } from "ai";

import { sql } from "@turbostarter/db";
import { pdfEmbedding } from "@turbostarter/db/schema/pdf";
import { db } from "@turbostarter/db/server";
import { getSignedUrl } from "@turbostarter/storage/server";

import { modelStrategies } from "./strategies";

import type { Document } from "@langchain/core/documents";
import type { EmbeddingMetadata } from "./types";

/**
 * Chunk with embedding and metadata for citation support
 */
export interface EmbeddingChunk {
  content: string;
  embedding: number[];
  metadata: EmbeddingMetadata;
}

/**
 * Try to detect section title from content (first line if it looks like a heading)
 */
const detectSectionTitle = (content: string): string | undefined => {
  const firstLine = content.split("\n")[0]?.trim();
  // Heuristic: if first line is short (<100 chars) and doesn't end with typical sentence punctuation,
  // it might be a heading
  if (firstLine && firstLine.length < 100 && !/[.?!:,;]$/.test(firstLine)) {
    return firstLine;
  }
  return undefined;
};

/**
 * Track character offsets within each page's content
 */
interface PageTextInfo {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  content: string;
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const loadDocument = async (path: string) => {
  const { url } = await getSignedUrl({ path });

  const response = await fetch(url);
  const blob = await response.blob();

  const loader = new PDFLoader(blob);
  return loader.load();
};

export const splitDocument = async (documents: Document[]) => {
  return textSplitter.splitDocuments(documents);
};

export const generateDocumentEmbeddings = async (
  path: string,
): Promise<EmbeddingChunk[]> => {
  const documents = await loadDocument(path);

  // Build page text map for character offset tracking
  // PDFLoader returns one Document per page with metadata.loc.pageNumber
  const pageTextInfos: PageTextInfo[] = [];

  for (const doc of documents) {
    const pageNumber = (doc.metadata?.loc?.pageNumber as number) ?? 1;
    const content = doc.pageContent;

    pageTextInfos.push({
      pageNumber,
      startOffset: 0, // Reset per page since we track within page
      endOffset: content.length,
      content,
    });
  }

  // Split documents into chunks
  const chunks = await splitDocument(documents);

  // Generate embeddings
  const { embeddings, values } = await embedMany({
    model: modelStrategies.textEmbeddingModel("default"),
    values: chunks.map((chunk) => chunk.pageContent),
  });

  // Build result with metadata
  return chunks.map((chunk, index) => {
    // Get page number from chunk metadata (set by RecursiveCharacterTextSplitter)
    const chunkPageNumber = (chunk.metadata?.loc?.pageNumber as number) ?? 1;

    // Find character offsets within the page
    const pageInfo = pageTextInfos.find((p) => p.pageNumber === chunkPageNumber);
    let charStart: number | undefined;
    let charEnd: number | undefined;

    if (pageInfo) {
      // Find the position of this chunk's content within the page
      const chunkContent = chunk.pageContent;
      const posInPage = pageInfo.content.indexOf(chunkContent);
      if (posInPage !== -1) {
        charStart = posInPage;
        charEnd = posInPage + chunkContent.length;
      }
    }

    const sectionTitle = detectSectionTitle(chunk.pageContent);

    return {
      content: values[index] ?? chunk.pageContent,
      embedding: embeddings[index] ?? [],
      metadata: {
        pageNumber: chunkPageNumber,
        charStart,
        charEnd,
        sectionTitle,
      },
    };
  });
};

/**
 * Result from fetching a single embedding by ID
 */
export interface EmbeddingDetail {
  id: string;
  content: string;
  pageNumber: number;
  charStart?: number;
  charEnd?: number;
  sectionTitle?: string;
}

/**
 * Get embedding by ID for citation highlighting
 */
export const getEmbeddingById = async (
  id: string,
): Promise<EmbeddingDetail | null> => {
  const result = await db.execute<{
    id: string;
    content: string;
    page_number: number | null;
    char_start: number | null;
    char_end: number | null;
    section_title: string | null;
  }>(sql`
    SELECT id, content, page_number, char_start, char_end, section_title
    FROM pdf.embedding
    WHERE id = ${id}
    LIMIT 1
  `);

  const rows = Array.isArray(result) ? result : [];
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    content: row.content,
    pageNumber: row.page_number ?? 1,
    charStart: row.char_start ?? undefined,
    charEnd: row.char_end ?? undefined,
    sectionTitle: row.section_title ?? undefined,
  };
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: modelStrategies.textEmbeddingModel("default"),
    value: input,
  });
  return embedding;
};

/**
 * Result from embedding similarity search with citation support
 */
export interface EmbeddingSearchResult {
  /** Embedding row ID for citation reference */
  id: string;
  /** Original content text */
  name: string;
  /** Cosine similarity score 0-1 */
  similarity: number;
  /** Page number (extracted from content or default to 1) */
  pageNumber: number;
}

/**
 * Extract significant keywords from query for keyword search fallback.
 * Focuses on specific identifiers (numbers, codes) that embeddings handle poorly.
 */
function extractKeywords(query: string): string[] {
  // Match patterns like "35/2024", "123/2023", alphanumeric codes
  const patterns = [
    /\d+\/\d{4}/g, // Legal references like 35/2024
    /\b[A-Z]{2,}[-/]?\d+/g, // Codes like TDF/379
    /\b\d{4,}/g, // Long numbers
  ];

  const keywords: string[] = [];
  for (const pattern of patterns) {
    const matches = query.match(pattern);
    if (matches) keywords.push(...matches);
  }

  return [...new Set(keywords)];
}

export const findRelevantContent = async (
  query: string,
  documentId?: string,
): Promise<EmbeddingSearchResult[]> => {
  console.log(
    `🔍 findRelevantContent called with query: "${query}", documentId: ${documentId}`,
  );

  const userQueryEmbedded = await generateEmbedding(query);
  console.log(
    `🔍 Generated query embedding with ${userQueryEmbedded.length} dimensions`,
  );

  // First, let's check how many embeddings exist for this document
  if (documentId) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(pdfEmbedding)
      .where(sql`${pdfEmbedding.documentId} = ${documentId}`);
    console.log(
      `🔍 Found ${countResult[0]?.count ?? 0} embeddings for document ${documentId}`,
    );
  }

  // Use raw SQL for the similarity calculation in both SELECT and WHERE
  // The <=> operator is the cosine distance operator in pgvector
  const vectorStr = `[${userQueryEmbedded.join(",")}]`;
  console.log(
    `🔍 Running similarity search with vector of ${userQueryEmbedded.length} dimensions`,
  );

  try {
    // Include page_number in the query to support citations
    // Lowered threshold from 0.3 to 0.1 - text-embedding-3-small produces
    // lower similarity scores for general queries (0.15-0.25 typical)
    const SIMILARITY_THRESHOLD = 0.1;

    const similarGuides = await db.execute<{
      id: string;
      content: string;
      similarity: number;
      page_number: number | null;
    }>(
      documentId
        ? sql`
            SELECT id, content, page_number, 1 - (embedding <=> ${vectorStr}::vector) as similarity
            FROM pdf.embedding
            WHERE document_id = ${documentId}
              AND 1 - (embedding <=> ${vectorStr}::vector) > ${SIMILARITY_THRESHOLD}
            ORDER BY similarity DESC
            LIMIT 6
          `
        : sql`
            SELECT id, content, page_number, 1 - (embedding <=> ${vectorStr}::vector) as similarity
            FROM pdf.embedding
            WHERE 1 - (embedding <=> ${vectorStr}::vector) > ${SIMILARITY_THRESHOLD}
            ORDER BY similarity DESC
            LIMIT 6
          `,
    );

    console.log(
      `🔍 db.execute returned type:`,
      typeof similarGuides,
      Array.isArray(similarGuides),
    );

    // db.execute returns an array directly, not { rows: [...] }
    const rows = Array.isArray(similarGuides)
      ? similarGuides
      : ((similarGuides as unknown as { rows: typeof similarGuides }).rows ??
        []);

    let results: EmbeddingSearchResult[] = rows.map(
      (
        row: {
          id: string;
          content: string;
          similarity: number;
          page_number: number | null;
        },
        index: number,
      ) => ({
        id: row.id,
        name: row.content,
        similarity: row.similarity,
        // Use stored page number if available, fallback to index + 1 for legacy embeddings
        pageNumber: row.page_number ?? index + 1,
      }),
    );

    console.log(
      `🔍 Found ${results.length} semantic results:`,
      results.map((g) => ({
        id: g.id,
        similarity: g.similarity,
        pageNumber: g.pageNumber,
        preview: g.name?.substring(0, 50),
      })),
    );

    // Keyword fallback: if semantic search found few results and query has specific identifiers
    const keywords = extractKeywords(query);
    if (keywords.length > 0 && results.length < 3) {
      console.log(`🔍 Running keyword fallback for: ${keywords.join(", ")}`);

      // Build ILIKE conditions for each keyword
      const keywordPattern = keywords.map((k) => `%${k}%`).join("%");

      const keywordResults = await db.execute<{
        id: string;
        content: string;
        page_number: number | null;
      }>(
        documentId
          ? sql`
              SELECT id, content, page_number
              FROM pdf.embedding
              WHERE document_id = ${documentId}
                AND content ILIKE ${keywordPattern}
              LIMIT 4
            `
          : sql`
              SELECT id, content, page_number
              FROM pdf.embedding
              WHERE content ILIKE ${keywordPattern}
              LIMIT 4
            `,
      );

      const keywordRows = Array.isArray(keywordResults)
        ? keywordResults
        : ((keywordResults as unknown as { rows: typeof keywordResults }).rows ?? []);

      console.log(`🔍 Keyword search found ${keywordRows.length} matches`);

      // Add keyword results with high similarity (they're exact matches)
      const existingIds = new Set(results.map((r) => r.id));
      for (const row of keywordRows) {
        if (!existingIds.has(row.id)) {
          results.push({
            id: row.id,
            name: row.content,
            similarity: 0.95, // High score for exact keyword matches
            pageNumber: row.page_number ?? 1,
          });
        }
      }

      // Re-sort by similarity
      results.sort((a, b) => b.similarity - a.similarity);
      results = results.slice(0, 6);
    }

    return results;
  } catch (error) {
    console.error(`🔍 ERROR in similarity search:`, error);
    throw error;
  }
};
