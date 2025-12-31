/**
 * Search with Citations Module (WF-0028)
 *
 * Performs vector similarity search on retrieval chunks and returns
 * matching results with linked citation units for pixel-perfect highlighting.
 */

import { eq } from "drizzle-orm";

import { sql } from "@turbostarter/db";
import { pdfCitationUnit, pdfRetrievalChunk } from "@turbostarter/db/schema/pdf";
import { db } from "@turbostarter/db/server";

import { generateEmbedding } from "./embeddings";

// ============================================================================
// Types
// ============================================================================

/**
 * Bounding box for pixel-perfect highlighting
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Citation unit with precise location for highlighting
 */
export interface CitationUnit {
  id: string;
  content: string;
  pageNumber: number;
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
  bbox: BoundingBox | null;
  sectionTitle: string | null;
  unitType: string;
}

/**
 * Search result with retrieval chunk and linked citation units
 */
export interface SearchResult {
  retrievalChunkId: string;
  content: string;
  similarity: number;
  pageStart: number;
  pageEnd: number;
  sectionHierarchy: string[];
  citationUnits: CitationUnit[];
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum similarity threshold (default: 0.1) */
  threshold?: number;
  /** Whether to include citation units (default: true) */
  includeUnits?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform raw citation unit row to CitationUnit interface
 */
function transformCitationUnit(row: {
  id: string;
  content: string;
  pageNumber: number;
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
  bboxX: number | null;
  bboxY: number | null;
  bboxWidth: number | null;
  bboxHeight: number | null;
  sectionTitle: string | null;
  unitType: string | null;
}): CitationUnit {
  // Build bbox only if all coordinates are present
  const bbox: BoundingBox | null =
    row.bboxX != null &&
    row.bboxY != null &&
    row.bboxWidth != null &&
    row.bboxHeight != null
      ? {
          x: row.bboxX,
          y: row.bboxY,
          width: row.bboxWidth,
          height: row.bboxHeight,
        }
      : null;

  return {
    id: row.id,
    content: row.content,
    pageNumber: row.pageNumber,
    paragraphIndex: row.paragraphIndex,
    charStart: row.charStart,
    charEnd: row.charEnd,
    bbox,
    sectionTitle: row.sectionTitle,
    unitType: row.unitType ?? "prose",
  };
}

// ============================================================================
// Main Search Functions
// ============================================================================

/**
 * Search for relevant content with citation support
 *
 * @param query - Natural language query to search for
 * @param documentId - Document ID to search within
 * @param options - Search options (limit, threshold, includeUnits)
 * @returns Array of search results with citation units
 */
export async function searchWithCitations(
  query: string,
  documentId: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { limit = 5, threshold = 0.1, includeUnits = true } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // Perform vector similarity search on retrieval chunks
  const chunkResults = await db.execute<{
    id: string;
    content: string;
    similarity: number;
    page_start: number;
    page_end: number;
    section_hierarchy: string[] | null;
    chunk_type: string | null;
  }>(sql`
    SELECT
      id,
      content,
      1 - (embedding <=> ${vectorStr}::vector) as similarity,
      page_start,
      page_end,
      section_hierarchy,
      chunk_type
    FROM pdf.retrieval_chunk
    WHERE document_id = ${documentId}
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> ${vectorStr}::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);

  // Handle result format (db.execute returns array directly)
  const rows = Array.isArray(chunkResults) ? chunkResults : [];

  // Build search results
  const results: SearchResult[] = [];

  for (const row of rows) {
    let citationUnits: CitationUnit[] = [];

    // Fetch linked citation units if requested
    if (includeUnits) {
      citationUnits = await getCitationUnitsForChunk(row.id);
    }

    results.push({
      retrievalChunkId: row.id,
      content: row.content,
      similarity: row.similarity,
      pageStart: row.page_start,
      pageEnd: row.page_end,
      sectionHierarchy: row.section_hierarchy ?? [],
      citationUnits,
    });
  }

  return results;
}

/**
 * Get all citation units linked to a retrieval chunk
 *
 * @param chunkId - Retrieval chunk ID
 * @returns Array of citation units ordered by page and paragraph
 */
export async function getCitationUnitsForChunk(
  chunkId: string,
): Promise<CitationUnit[]> {
  const rows = await db
    .select({
      id: pdfCitationUnit.id,
      content: pdfCitationUnit.content,
      pageNumber: pdfCitationUnit.pageNumber,
      paragraphIndex: pdfCitationUnit.paragraphIndex,
      charStart: pdfCitationUnit.charStart,
      charEnd: pdfCitationUnit.charEnd,
      bboxX: pdfCitationUnit.bboxX,
      bboxY: pdfCitationUnit.bboxY,
      bboxWidth: pdfCitationUnit.bboxWidth,
      bboxHeight: pdfCitationUnit.bboxHeight,
      sectionTitle: pdfCitationUnit.sectionTitle,
      unitType: pdfCitationUnit.unitType,
    })
    .from(pdfCitationUnit)
    .where(eq(pdfCitationUnit.retrievalChunkId, chunkId))
    .orderBy(pdfCitationUnit.pageNumber, pdfCitationUnit.paragraphIndex);

  return rows.map(transformCitationUnit);
}

/**
 * Get a single citation unit by ID
 *
 * @param unitId - Citation unit ID
 * @returns Citation unit or null if not found
 */
export async function getCitationUnitById(
  unitId: string,
): Promise<CitationUnit | null> {
  const rows = await db
    .select({
      id: pdfCitationUnit.id,
      content: pdfCitationUnit.content,
      pageNumber: pdfCitationUnit.pageNumber,
      paragraphIndex: pdfCitationUnit.paragraphIndex,
      charStart: pdfCitationUnit.charStart,
      charEnd: pdfCitationUnit.charEnd,
      bboxX: pdfCitationUnit.bboxX,
      bboxY: pdfCitationUnit.bboxY,
      bboxWidth: pdfCitationUnit.bboxWidth,
      bboxHeight: pdfCitationUnit.bboxHeight,
      sectionTitle: pdfCitationUnit.sectionTitle,
      unitType: pdfCitationUnit.unitType,
    })
    .from(pdfCitationUnit)
    .where(eq(pdfCitationUnit.id, unitId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return transformCitationUnit(row);
}

/**
 * Get retrieval chunk by ID (without citation units)
 *
 * @param chunkId - Retrieval chunk ID
 * @returns Retrieval chunk data or null if not found
 */
export async function getRetrievalChunkById(chunkId: string): Promise<{
  id: string;
  content: string;
  pageStart: number;
  pageEnd: number;
  sectionHierarchy: string[];
  chunkType: string;
} | null> {
  const rows = await db
    .select({
      id: pdfRetrievalChunk.id,
      content: pdfRetrievalChunk.content,
      pageStart: pdfRetrievalChunk.pageStart,
      pageEnd: pdfRetrievalChunk.pageEnd,
      sectionHierarchy: pdfRetrievalChunk.sectionHierarchy,
      chunkType: pdfRetrievalChunk.chunkType,
    })
    .from(pdfRetrievalChunk)
    .where(eq(pdfRetrievalChunk.id, chunkId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    content: row.content,
    pageStart: row.pageStart,
    pageEnd: row.pageEnd,
    sectionHierarchy: row.sectionHierarchy ?? [],
    chunkType: row.chunkType ?? "prose",
  };
}
