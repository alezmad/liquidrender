/**
 * PDF Module (WF-0028 Dual-Resolution Chunking)
 *
 * Barrel export for PDF processing with dual-resolution chunking:
 * - Citation Units: paragraph-level with precise bounding boxes for highlighting
 * - Retrieval Chunks: groups of 3-5 citation units for efficient vector search
 *
 * Main entry point: processPdfWithDualResolution() for full pipeline
 */

// ============================================================================
// Layout Parser (T2)
// Parse PDFs with layout awareness to extract structured elements
// ============================================================================

export {
  parseDocumentLayout,
  groupElementsByPage,
  getLayoutStatistics,
} from "./layout-parser";

export type { UnitType, LayoutElement } from "./layout-parser";

// ============================================================================
// Chunking Strategy (T3)
// Create dual-resolution chunks from layout elements
// ============================================================================

export {
  createDualResolutionChunks,
  getChunkingStats,
  validateChunks,
  DEFAULT_CHUNKING_CONFIG,
} from "./chunking";

export type {
  ChunkingConfig,
  CitationUnitData,
  RetrievalChunkData,
  DualResolutionChunks,
} from "./chunking";

// ============================================================================
// Dual Embeddings (T4)
// Generate embeddings and store dual-resolution chunks
// ============================================================================

export {
  generateDualEmbeddings,
  storeDualChunks,
  processPdfWithDualResolution,
} from "./dual-embeddings";

export type {
  RetrievalChunkWithEmbedding,
  DualResolutionChunksWithEmbeddings,
  StoreDualChunksResult,
  ProcessPdfResult,
} from "./dual-embeddings";

// ============================================================================
// Search with Citations (T5)
// Vector similarity search with linked citation units
// ============================================================================

export {
  searchWithCitations,
  getCitationUnitsForChunk,
  getCitationUnitById,
  getRetrievalChunkById,
} from "./search";

export type {
  BoundingBox,
  CitationUnit,
  SearchResult,
  SearchOptions,
} from "./search";

// ============================================================================
// Legacy Exports (for backwards compatibility)
// Original PDF module exports remain available
// ============================================================================

export * from "./api";
export * from "./constants";
export * from "./embeddings";
export * from "./schema";
export * from "./types";
export * from "./strategies";
