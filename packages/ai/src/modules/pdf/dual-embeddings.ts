/**
 * Dual Embeddings Module for WF-0028
 *
 * Generates embeddings for retrieval chunks and stores both citation units
 * and retrieval chunks to the database with proper linking.
 *
 * Key design decisions:
 * - Embeddings only for retrieval chunks (not citation units) - reduces cost
 * - Citation units linked via FK to parent retrieval chunk
 * - Transaction ensures atomic insert of all chunks
 */

import { embedMany } from "ai";

import { pdfCitationUnit, pdfRetrievalChunk } from "@turbostarter/db/schema/pdf";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import { createDualResolutionChunks, getChunkingStats, validateChunks } from "./chunking";
import { parseDocumentLayout } from "./layout-parser";
import { modelStrategies } from "./strategies";

import type { DualResolutionChunks, LayoutElement, RetrievalChunkData } from "./chunking";
import type { LayoutElement as LayoutParserElement } from "./layout-parser";
import type { InsertPdfCitationUnit, InsertPdfRetrievalChunk } from "@turbostarter/db/schema/pdf";

// ============================================================================
// Types
// ============================================================================

/**
 * Retrieval chunk with embedding added
 */
export interface RetrievalChunkWithEmbedding extends RetrievalChunkData {
  embedding: number[];
}

/**
 * Dual resolution chunks with embeddings for retrieval chunks
 */
export interface DualResolutionChunksWithEmbeddings
  extends Omit<DualResolutionChunks, "retrievalChunks"> {
  retrievalChunks: RetrievalChunkWithEmbedding[];
}

/**
 * Result of storing dual chunks to the database
 */
export interface StoreDualChunksResult {
  /** IDs of inserted retrieval chunks */
  retrievalChunkIds: string[];
  /** IDs of inserted citation units */
  citationUnitIds: string[];
  /** Statistics about what was stored */
  stats: {
    totalRetrievalChunks: number;
    totalCitationUnits: number;
    avgUnitsPerChunk: number;
    pageRange: { start: number; end: number };
  };
}

/**
 * Full pipeline result
 */
export interface ProcessPdfResult {
  /** Document ID that was processed */
  documentId: string;
  /** Storage result */
  storage: StoreDualChunksResult;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embeddings for retrieval chunks only
 *
 * Citation units do NOT get embeddings - they are retrieved via their
 * parent retrieval chunk's FK relationship.
 *
 * @param chunks - Dual resolution chunks from the chunking module
 * @returns Chunks with embeddings added to retrieval chunks
 */
export async function generateDualEmbeddings(
  chunks: DualResolutionChunks,
): Promise<DualResolutionChunksWithEmbeddings> {
  const { citationUnits, retrievalChunks } = chunks;

  // Handle empty input
  if (retrievalChunks.length === 0) {
    return {
      citationUnits,
      retrievalChunks: [],
    };
  }

  // Generate embeddings for retrieval chunks only
  const { embeddings } = await embedMany({
    model: modelStrategies.textEmbeddingModel("default"),
    values: retrievalChunks.map((chunk) => chunk.content),
  });

  // Combine chunks with their embeddings
  const chunksWithEmbeddings: RetrievalChunkWithEmbedding[] = retrievalChunks.map(
    (chunk, index) => ({
      ...chunk,
      embedding: embeddings[index] ?? [],
    }),
  );

  return {
    citationUnits,
    retrievalChunks: chunksWithEmbeddings,
  };
}

// ============================================================================
// Database Storage
// ============================================================================

/**
 * Store dual resolution chunks to the database with proper linking
 *
 * Uses a transaction to ensure atomicity:
 * 1. Insert all retrieval chunks first (to get IDs)
 * 2. Insert all citation units with FK references to their parent chunk
 *
 * @param documentId - ID of the PDF document
 * @param chunks - Chunks with embeddings
 * @returns IDs of inserted records and statistics
 */
export async function storeDualChunks(
  documentId: string,
  chunks: DualResolutionChunksWithEmbeddings,
): Promise<StoreDualChunksResult> {
  const { citationUnits, retrievalChunks } = chunks;

  // Pre-generate IDs for retrieval chunks so we can reference them in citation units
  const retrievalChunkRecords: InsertPdfRetrievalChunk[] = retrievalChunks.map((chunk) => ({
    id: generateId(),
    documentId,
    content: chunk.content,
    embedding: chunk.embedding,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
    sectionHierarchy: chunk.sectionHierarchy,
    chunkType: chunk.chunkType,
  }));

  // Build citation unit records with FK references
  // Each retrieval chunk knows which citation unit indices it contains
  const citationUnitRecords: InsertPdfCitationUnit[] = citationUnits.map((unit, index) => {
    // Find which retrieval chunk contains this citation unit
    const parentChunk = retrievalChunks.find((chunk) =>
      chunk.citationUnitIndices.includes(index),
    );
    const parentChunkIndex = parentChunk
      ? retrievalChunks.indexOf(parentChunk)
      : -1;
    const retrievalChunkId =
      parentChunkIndex >= 0 ? retrievalChunkRecords[parentChunkIndex]?.id : undefined;

    return {
      id: generateId(),
      documentId,
      retrievalChunkId: retrievalChunkId ?? null,
      content: unit.content,
      pageNumber: unit.pageNumber,
      paragraphIndex: unit.paragraphIndex,
      charStart: unit.charStart,
      charEnd: unit.charEnd,
      bboxX: unit.bboxX ?? null,
      bboxY: unit.bboxY ?? null,
      bboxWidth: unit.bboxWidth ?? null,
      bboxHeight: unit.bboxHeight ?? null,
      sectionTitle: unit.sectionTitle ?? null,
      unitType: unit.unitType,
    };
  });

  // Use transaction to ensure atomicity
  await db.transaction(async (tx) => {
    // Insert retrieval chunks first
    if (retrievalChunkRecords.length > 0) {
      await tx.insert(pdfRetrievalChunk).values(retrievalChunkRecords);
    }

    // Insert citation units with FK references
    if (citationUnitRecords.length > 0) {
      await tx.insert(pdfCitationUnit).values(citationUnitRecords);
    }
  });

  // Calculate statistics
  const totalUnits = retrievalChunks.reduce(
    (sum, chunk) => sum + chunk.citationUnitIndices.length,
    0,
  );
  const allPages = citationUnits.map((u) => u.pageNumber);

  return {
    retrievalChunkIds: retrievalChunkRecords.map((r) => r.id!),
    citationUnitIds: citationUnitRecords.map((u) => u.id!),
    stats: {
      totalRetrievalChunks: retrievalChunkRecords.length,
      totalCitationUnits: citationUnitRecords.length,
      avgUnitsPerChunk:
        retrievalChunkRecords.length > 0
          ? totalUnits / retrievalChunkRecords.length
          : 0,
      pageRange: {
        start: allPages.length > 0 ? Math.min(...allPages) : 0,
        end: allPages.length > 0 ? Math.max(...allPages) : 0,
      },
    },
  };
}

// ============================================================================
// Full Pipeline
// ============================================================================

/**
 * Process a PDF document with dual-resolution chunking
 *
 * Full pipeline:
 * 1. Parse PDF layout (layout-parser)
 * 2. Create dual-resolution chunks (chunking)
 * 3. Generate embeddings for retrieval chunks
 * 4. Store to database with proper linking
 *
 * @param documentId - ID of the PDF document record
 * @param path - Storage path to the PDF file
 * @returns Processing result with statistics
 */
export async function processPdfWithDualResolution(
  documentId: string,
  path: string,
): Promise<ProcessPdfResult> {
  const startTime = Date.now();

  // Step 1: Parse PDF layout
  console.log(`[dual-embeddings] Parsing layout for document ${documentId}`);
  const parsedElements = await parseDocumentLayout(path);
  console.log(`[dual-embeddings] Found ${parsedElements.length} layout elements`);

  // Convert from layout-parser types to chunking types (null -> undefined for sectionTitle)
  const layoutElements: LayoutElement[] = parsedElements.map(
    (el: LayoutParserElement) => ({
      ...el,
      sectionTitle: el.sectionTitle ?? undefined,
    }),
  );

  // Step 2: Create dual-resolution chunks
  console.log(`[dual-embeddings] Creating dual-resolution chunks`);
  const chunks = createDualResolutionChunks(layoutElements);

  // Validate chunks for consistency
  const validationErrors = validateChunks(chunks);
  if (validationErrors.length > 0) {
    console.warn(`[dual-embeddings] Chunk validation warnings:`, validationErrors);
  }

  // Log chunking stats
  const chunkingStats = getChunkingStats(chunks);
  console.log(`[dual-embeddings] Chunking stats:`, chunkingStats);

  // Step 3: Generate embeddings for retrieval chunks
  console.log(
    `[dual-embeddings] Generating embeddings for ${chunks.retrievalChunks.length} retrieval chunks`,
  );
  const chunksWithEmbeddings = await generateDualEmbeddings(chunks);

  // Step 4: Store to database
  console.log(`[dual-embeddings] Storing chunks to database`);
  const storageResult = await storeDualChunks(documentId, chunksWithEmbeddings);

  const processingTimeMs = Date.now() - startTime;
  console.log(
    `[dual-embeddings] Processing complete in ${processingTimeMs}ms:`,
    storageResult.stats,
  );

  return {
    documentId,
    storage: storageResult,
    processingTimeMs,
  };
}
