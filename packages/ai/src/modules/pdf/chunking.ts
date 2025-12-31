/**
 * Dual-Resolution Chunking Strategy (WF-0028)
 *
 * Creates two levels of chunks from parsed PDF layout elements:
 * 1. Citation Units - paragraph-level with precise bounding boxes for highlighting
 * 2. Retrieval Chunks - groups of 3-5 citation units for efficient vector search
 *
 * This separation enables:
 * - Efficient semantic search via larger retrieval chunks
 * - Pixel-perfect citation highlighting via granular citation units
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Input from layout parser - a single layout element from the PDF
 */
export interface LayoutElement {
  content: string;
  type: "prose" | "heading" | "list" | "table" | "code";
  pageNumber: number;
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
  bboxX?: number;
  bboxY?: number;
  bboxWidth?: number;
  bboxHeight?: number;
  sectionTitle?: string;
}

/**
 * Configuration for the chunking algorithm
 */
export interface ChunkingConfig {
  /** Minimum units per retrieval chunk (default: 3) */
  minUnitsPerChunk: number;
  /** Maximum units per retrieval chunk (default: 5) */
  maxUnitsPerChunk: number;
  /** Maximum tokens per retrieval chunk (default: 800) */
  maxChunkTokens: number;
  /** Whether to break on major section headings (default: true) */
  breakOnSections: boolean;
}

/**
 * Default chunking configuration
 */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  minUnitsPerChunk: 3,
  maxUnitsPerChunk: 5,
  maxChunkTokens: 800,
  breakOnSections: true,
};

/**
 * Citation unit data - ready for database insertion (no ID, generated on insert)
 */
export interface CitationUnitData {
  content: string;
  pageNumber: number;
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
  bboxX?: number;
  bboxY?: number;
  bboxWidth?: number;
  bboxHeight?: number;
  sectionTitle?: string;
  unitType: "prose" | "heading" | "list" | "table" | "code";
}

/**
 * Retrieval chunk data - ready for database insertion (no ID, generated on insert)
 */
export interface RetrievalChunkData {
  content: string;
  pageStart: number;
  pageEnd: number;
  sectionHierarchy: string[];
  chunkType: string;
  /** Indices into the citationUnits array for linking after DB insert */
  citationUnitIndices: number[];
}

/**
 * Result of the dual-resolution chunking process
 */
export interface DualResolutionChunks {
  citationUnits: CitationUnitData[];
  retrievalChunks: RetrievalChunkData[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Rough token count estimation (words * 1.3 for typical English text)
 * More accurate than character count for LLM context limits
 */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

/**
 * Determine if an element represents a major section break
 * Major headings indicate semantic boundaries that shouldn't be crossed
 */
function isMajorSectionBreak(element: LayoutElement): boolean {
  if (element.type !== "heading") return false;

  // Heuristics for major section detection:
  // 1. Short content (likely a header, not inline text)
  // 2. Starts with common section markers (numbers, roman numerals)
  // 3. All caps or title case patterns
  const content = element.content.trim();

  // Short headings are likely section titles
  if (content.length < 100) {
    // Check for numbered sections: "1.", "1.1", "I.", "Chapter 1", etc.
    if (/^(\d+\.|\d+\s|[IVX]+\.|Chapter\s+\d)/i.test(content)) {
      return true;
    }

    // Check for all caps (common for major headings)
    if (content === content.toUpperCase() && content.length > 3) {
      return true;
    }

    // Default: treat any heading as a potential section break
    return true;
  }

  return false;
}

/**
 * Extract section title from elements, building hierarchy
 */
function buildSectionHierarchy(elements: LayoutElement[]): string[] {
  const hierarchy: string[] = [];

  for (const element of elements) {
    if (element.sectionTitle) {
      // Use explicit section title if provided
      if (!hierarchy.includes(element.sectionTitle)) {
        hierarchy.push(element.sectionTitle);
      }
    } else if (element.type === "heading") {
      // Use heading content as section marker
      const title = element.content.trim().slice(0, 100); // Truncate long headings
      if (title && !hierarchy.includes(title)) {
        hierarchy.push(title);
      }
    }
  }

  return hierarchy;
}

/**
 * Determine the dominant chunk type from a group of elements
 */
function determineChunkType(
  elements: LayoutElement[],
): "prose" | "heading" | "list" | "table" | "code" | "mixed" {
  const typeCounts = new Map<string, number>();

  for (const element of elements) {
    typeCounts.set(element.type, (typeCounts.get(element.type) ?? 0) + 1);
  }

  // Find the most common type
  let maxCount = 0;
  let dominantType: string = "prose";

  typeCounts.forEach((count, type) => {
    if (count > maxCount) {
      maxCount = count;
      dominantType = type;
    }
  });

  // If no clear majority (>50%), mark as mixed
  if (maxCount <= elements.length / 2 && typeCounts.size > 1) {
    return "mixed";
  }

  return dominantType as "prose" | "heading" | "list" | "table" | "code";
}

// ============================================================================
// Main Chunking Function
// ============================================================================

/**
 * Create dual-resolution chunks from layout elements
 *
 * Algorithm:
 * 1. Convert each LayoutElement to a CitationUnit
 * 2. Group adjacent CitationUnits into RetrievalChunks (3-5 units each)
 * 3. Respect section boundaries (don't split across major headings)
 * 4. Respect token limits (don't exceed maxChunkTokens)
 *
 * @param elements - Array of layout elements from the PDF parser
 * @param config - Optional chunking configuration
 * @returns Dual-resolution chunks ready for database insertion
 */
export function createDualResolutionChunks(
  elements: LayoutElement[],
  config: Partial<ChunkingConfig> = {},
): DualResolutionChunks {
  const fullConfig: ChunkingConfig = { ...DEFAULT_CHUNKING_CONFIG, ...config };

  // Handle empty input
  if (elements.length === 0) {
    return { citationUnits: [], retrievalChunks: [] };
  }

  // Step 1: Convert all elements to citation units
  const citationUnits: CitationUnitData[] = elements.map((element) => ({
    content: element.content,
    pageNumber: element.pageNumber,
    paragraphIndex: element.paragraphIndex,
    charStart: element.charStart,
    charEnd: element.charEnd,
    bboxX: element.bboxX,
    bboxY: element.bboxY,
    bboxWidth: element.bboxWidth,
    bboxHeight: element.bboxHeight,
    sectionTitle: element.sectionTitle,
    unitType: element.type,
  }));

  // Step 2: Group citation units into retrieval chunks
  const retrievalChunks: RetrievalChunkData[] = [];

  let currentGroup: { element: LayoutElement; index: number }[] = [];
  let currentTokens = 0;

  const flushGroup = () => {
    if (currentGroup.length === 0) return;

    const groupElements = currentGroup.map((g) => g.element);
    const groupIndices = currentGroup.map((g) => g.index);

    // Concatenate content with double newlines for readability
    const content = groupElements.map((e) => e.content).join("\n\n");

    // Calculate page boundaries
    const pageNumbers = groupElements.map((e) => e.pageNumber);
    const pageStart = Math.min(...pageNumbers);
    const pageEnd = Math.max(...pageNumbers);

    // Build section hierarchy from headings in the group
    const sectionHierarchy = buildSectionHierarchy(groupElements);

    // Determine dominant chunk type
    const chunkType = determineChunkType(groupElements);

    retrievalChunks.push({
      content,
      pageStart,
      pageEnd,
      sectionHierarchy,
      chunkType,
      citationUnitIndices: groupIndices,
    });

    // Reset for next group
    currentGroup = [];
    currentTokens = 0;
  };

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]!;
    const elementTokens = estimateTokens(element.content);

    // Check if we should start a new chunk
    const shouldStartNew =
      // Section break (if enabled)
      (fullConfig.breakOnSections &&
        isMajorSectionBreak(element) &&
        currentGroup.length > 0) ||
      // Max units reached
      currentGroup.length >= fullConfig.maxUnitsPerChunk ||
      // Token limit would be exceeded
      (currentGroup.length > 0 &&
        currentTokens + elementTokens > fullConfig.maxChunkTokens &&
        currentGroup.length >= fullConfig.minUnitsPerChunk);

    if (shouldStartNew) {
      flushGroup();
    }

    // Add element to current group
    currentGroup.push({ element, index: i });
    currentTokens += elementTokens;
  }

  // Flush any remaining elements
  flushGroup();

  // Handle edge case: if last chunk is too small, merge with previous
  if (
    retrievalChunks.length >= 2 &&
    retrievalChunks[retrievalChunks.length - 1]!.citationUnitIndices.length <
      fullConfig.minUnitsPerChunk
  ) {
    const lastChunk = retrievalChunks.pop()!;
    const prevChunk = retrievalChunks[retrievalChunks.length - 1]!;

    // Only merge if combined size is reasonable
    const combinedTokens = estimateTokens(
      prevChunk.content + "\n\n" + lastChunk.content,
    );
    if (combinedTokens <= fullConfig.maxChunkTokens * 1.5) {
      // Allow 50% overage for merging
      prevChunk.content += "\n\n" + lastChunk.content;
      prevChunk.pageEnd = Math.max(prevChunk.pageEnd, lastChunk.pageEnd);
      prevChunk.citationUnitIndices.push(...lastChunk.citationUnitIndices);

      // Merge section hierarchies
      for (const section of lastChunk.sectionHierarchy) {
        if (!prevChunk.sectionHierarchy.includes(section)) {
          prevChunk.sectionHierarchy.push(section);
        }
      }

      // Update chunk type if needed
      if (prevChunk.chunkType !== lastChunk.chunkType) {
        prevChunk.chunkType = "mixed";
      }
    } else {
      // Put it back if merge would be too large
      retrievalChunks.push(lastChunk);
    }
  }

  return { citationUnits, retrievalChunks };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get statistics about the chunking result
 * Useful for debugging and logging
 */
export function getChunkingStats(chunks: DualResolutionChunks): {
  totalCitationUnits: number;
  totalRetrievalChunks: number;
  avgUnitsPerChunk: number;
  avgTokensPerChunk: number;
  pageRange: { start: number; end: number };
} {
  const { citationUnits, retrievalChunks } = chunks;

  if (retrievalChunks.length === 0) {
    return {
      totalCitationUnits: 0,
      totalRetrievalChunks: 0,
      avgUnitsPerChunk: 0,
      avgTokensPerChunk: 0,
      pageRange: { start: 0, end: 0 },
    };
  }

  const totalUnits = retrievalChunks.reduce(
    (sum, chunk) => sum + chunk.citationUnitIndices.length,
    0,
  );

  const totalTokens = retrievalChunks.reduce(
    (sum, chunk) => sum + estimateTokens(chunk.content),
    0,
  );

  const allPages = citationUnits.map((u) => u.pageNumber);

  return {
    totalCitationUnits: citationUnits.length,
    totalRetrievalChunks: retrievalChunks.length,
    avgUnitsPerChunk: totalUnits / retrievalChunks.length,
    avgTokensPerChunk: totalTokens / retrievalChunks.length,
    pageRange: {
      start: Math.min(...allPages),
      end: Math.max(...allPages),
    },
  };
}

/**
 * Validate chunking result for consistency
 * Returns array of error messages (empty if valid)
 */
export function validateChunks(chunks: DualResolutionChunks): string[] {
  const errors: string[] = [];
  const { citationUnits, retrievalChunks } = chunks;

  // Check all citation unit indices are valid
  for (let i = 0; i < retrievalChunks.length; i++) {
    const chunk = retrievalChunks[i]!;
    for (const unitIndex of chunk.citationUnitIndices) {
      if (unitIndex < 0 || unitIndex >= citationUnits.length) {
        errors.push(
          `Retrieval chunk ${i} references invalid citation unit index ${unitIndex}`,
        );
      }
    }
  }

  // Check all citation units are referenced by at least one retrieval chunk
  const referencedUnits = new Set<number>();
  for (const chunk of retrievalChunks) {
    for (const index of chunk.citationUnitIndices) {
      referencedUnits.add(index);
    }
  }

  for (let i = 0; i < citationUnits.length; i++) {
    if (!referencedUnits.has(i)) {
      errors.push(`Citation unit ${i} is not referenced by any retrieval chunk`);
    }
  }

  // Check page consistency (skip chunks with invalid indices)
  for (let i = 0; i < retrievalChunks.length; i++) {
    const chunk = retrievalChunks[i]!;
    const validIndices = chunk.citationUnitIndices.filter(
      (idx) => idx >= 0 && idx < citationUnits.length,
    );
    if (validIndices.length === 0) continue; // Skip if all indices are invalid

    const unitPages = validIndices.map((idx) => citationUnits[idx]!.pageNumber);
    const actualStart = Math.min(...unitPages);
    const actualEnd = Math.max(...unitPages);

    if (chunk.pageStart !== actualStart) {
      errors.push(
        `Retrieval chunk ${i} has pageStart ${chunk.pageStart} but units span from page ${actualStart}`,
      );
    }
    if (chunk.pageEnd !== actualEnd) {
      errors.push(
        `Retrieval chunk ${i} has pageEnd ${chunk.pageEnd} but units span to page ${actualEnd}`,
      );
    }
  }

  return errors;
}
