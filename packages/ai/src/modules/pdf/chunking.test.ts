/**
 * Unit tests for dual-resolution chunking (WF-0028)
 */

import { describe, expect, it } from "vitest";

import {
  createDualResolutionChunks,
  getChunkingStats,
  validateChunks,
  DEFAULT_CHUNKING_CONFIG,
} from "./chunking";

import type { LayoutElement, DualResolutionChunks } from "./chunking";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestElement(overrides: Partial<LayoutElement> = {}): LayoutElement {
  return {
    content: "Test paragraph content for unit testing purposes.",
    type: "prose",
    pageNumber: 1,
    paragraphIndex: 0,
    charStart: 0,
    charEnd: 47,
    bboxX: 0.1,
    bboxY: 0.1,
    bboxWidth: 0.8,
    bboxHeight: 0.05,
    sectionTitle: undefined,
    ...overrides,
  };
}

function createTestElements(count: number): LayoutElement[] {
  return Array.from({ length: count }, (_, i) =>
    createTestElement({
      content: `Paragraph ${i + 1} content with some reasonable text length.`,
      paragraphIndex: i,
      charStart: i * 60,
      charEnd: (i + 1) * 60,
      bboxY: 0.1 + i * 0.05,
    }),
  );
}

// ============================================================================
// createDualResolutionChunks Tests
// ============================================================================

describe("createDualResolutionChunks", () => {
  it("should return empty arrays for empty input", () => {
    const result = createDualResolutionChunks([]);

    expect(result.citationUnits).toHaveLength(0);
    expect(result.retrievalChunks).toHaveLength(0);
  });

  it("should create citation units for each layout element", () => {
    const elements = createTestElements(5);
    const result = createDualResolutionChunks(elements);

    expect(result.citationUnits).toHaveLength(5);
    expect(result.citationUnits[0]?.content).toBe(elements[0]?.content);
    expect(result.citationUnits[0]?.pageNumber).toBe(1);
    expect(result.citationUnits[0]?.unitType).toBe("prose");
  });

  it("should preserve bounding box coordinates in citation units", () => {
    const element = createTestElement({
      bboxX: 0.15,
      bboxY: 0.25,
      bboxWidth: 0.7,
      bboxHeight: 0.08,
    });
    const result = createDualResolutionChunks([element]);

    expect(result.citationUnits[0]?.bboxX).toBe(0.15);
    expect(result.citationUnits[0]?.bboxY).toBe(0.25);
    expect(result.citationUnits[0]?.bboxWidth).toBe(0.7);
    expect(result.citationUnits[0]?.bboxHeight).toBe(0.08);
  });

  it("should group citation units into retrieval chunks", () => {
    const elements = createTestElements(10);
    const result = createDualResolutionChunks(elements);

    // Should create multiple retrieval chunks
    expect(result.retrievalChunks.length).toBeGreaterThan(1);
    expect(result.retrievalChunks.length).toBeLessThanOrEqual(4); // ~10/3 to 10/5

    // Each chunk should reference valid citation unit indices
    for (const chunk of result.retrievalChunks) {
      expect(chunk.citationUnitIndices.length).toBeGreaterThanOrEqual(1);
      for (const idx of chunk.citationUnitIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(10);
      }
    }
  });

  it("should concatenate content in retrieval chunks", () => {
    const elements = createTestElements(3);
    const result = createDualResolutionChunks(elements, { minUnitsPerChunk: 3, maxUnitsPerChunk: 5 });

    // With 3 elements and min=3, should be one chunk
    expect(result.retrievalChunks).toHaveLength(1);
    expect(result.retrievalChunks[0]?.content).toContain("Paragraph 1");
    expect(result.retrievalChunks[0]?.content).toContain("Paragraph 2");
    expect(result.retrievalChunks[0]?.content).toContain("Paragraph 3");
  });

  it("should calculate correct page boundaries for retrieval chunks", () => {
    const elements = [
      createTestElement({ pageNumber: 1, paragraphIndex: 0 }),
      createTestElement({ pageNumber: 2, paragraphIndex: 1 }),
      createTestElement({ pageNumber: 3, paragraphIndex: 2 }),
    ];
    const result = createDualResolutionChunks(elements, { minUnitsPerChunk: 3, maxUnitsPerChunk: 5 });

    expect(result.retrievalChunks[0]?.pageStart).toBe(1);
    expect(result.retrievalChunks[0]?.pageEnd).toBe(3);
  });

  it("should break on section headings when enabled", () => {
    const elements = [
      createTestElement({ content: "Intro paragraph", type: "prose", paragraphIndex: 0 }),
      createTestElement({ content: "Chapter 1", type: "heading", paragraphIndex: 1 }),
      createTestElement({ content: "Chapter content", type: "prose", paragraphIndex: 2 }),
      createTestElement({ content: "More content", type: "prose", paragraphIndex: 3 }),
      createTestElement({ content: "Even more", type: "prose", paragraphIndex: 4 }),
    ];

    const result = createDualResolutionChunks(elements, { breakOnSections: true });

    // Should break at the heading
    expect(result.retrievalChunks.length).toBeGreaterThanOrEqual(2);
  });

  it("should respect maxUnitsPerChunk configuration", () => {
    const elements = createTestElements(15);
    const result = createDualResolutionChunks(elements, { maxUnitsPerChunk: 3 });

    // Each chunk should have at most 3 units (except possibly the last merged one)
    for (let i = 0; i < result.retrievalChunks.length - 1; i++) {
      expect(result.retrievalChunks[i]?.citationUnitIndices.length).toBeLessThanOrEqual(3);
    }
  });

  it("should handle different element types", () => {
    const elements = [
      createTestElement({ type: "heading", content: "Title" }),
      createTestElement({ type: "prose", content: "Body text" }),
      createTestElement({ type: "list", content: "- Item 1\n- Item 2" }),
      createTestElement({ type: "code", content: "const x = 1;" }),
      createTestElement({ type: "table", content: "| A | B |" }),
    ];

    const result = createDualResolutionChunks(elements);

    expect(result.citationUnits[0]?.unitType).toBe("heading");
    expect(result.citationUnits[1]?.unitType).toBe("prose");
    expect(result.citationUnits[2]?.unitType).toBe("list");
    expect(result.citationUnits[3]?.unitType).toBe("code");
    expect(result.citationUnits[4]?.unitType).toBe("table");
  });
});

// ============================================================================
// getChunkingStats Tests
// ============================================================================

describe("getChunkingStats", () => {
  it("should return zeros for empty input", () => {
    const stats = getChunkingStats({ citationUnits: [], retrievalChunks: [] });

    expect(stats.totalCitationUnits).toBe(0);
    expect(stats.totalRetrievalChunks).toBe(0);
    expect(stats.avgUnitsPerChunk).toBe(0);
    expect(stats.avgTokensPerChunk).toBe(0);
  });

  it("should calculate correct statistics", () => {
    const elements = createTestElements(10);
    const chunks = createDualResolutionChunks(elements);
    const stats = getChunkingStats(chunks);

    expect(stats.totalCitationUnits).toBe(10);
    expect(stats.totalRetrievalChunks).toBeGreaterThan(0);
    expect(stats.avgUnitsPerChunk).toBeGreaterThan(0);
    expect(stats.avgTokensPerChunk).toBeGreaterThan(0);
    expect(stats.pageRange.start).toBe(1);
    expect(stats.pageRange.end).toBe(1);
  });

  it("should calculate correct page range", () => {
    const elements = [
      createTestElement({ pageNumber: 5 }),
      createTestElement({ pageNumber: 3 }),
      createTestElement({ pageNumber: 10 }),
    ];
    const chunks = createDualResolutionChunks(elements);
    const stats = getChunkingStats(chunks);

    expect(stats.pageRange.start).toBe(3);
    expect(stats.pageRange.end).toBe(10);
  });
});

// ============================================================================
// validateChunks Tests
// ============================================================================

describe("validateChunks", () => {
  it("should return no errors for valid chunks", () => {
    const elements = createTestElements(10);
    const chunks = createDualResolutionChunks(elements);
    const errors = validateChunks(chunks);

    expect(errors).toHaveLength(0);
  });

  it("should detect invalid citation unit index references", () => {
    const chunks: DualResolutionChunks = {
      citationUnits: [
        {
          content: "Test",
          pageNumber: 1,
          paragraphIndex: 0,
          charStart: 0,
          charEnd: 4,
          unitType: "prose",
        },
      ],
      retrievalChunks: [
        {
          content: "Test",
          pageStart: 1,
          pageEnd: 1,
          sectionHierarchy: [],
          chunkType: "prose",
          citationUnitIndices: [0, 5], // Index 5 is invalid
        },
      ],
    };

    const errors = validateChunks(chunks);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("invalid citation unit index 5"))).toBe(true);
  });

  it("should detect unreferenced citation units", () => {
    const chunks: DualResolutionChunks = {
      citationUnits: [
        {
          content: "Test 1",
          pageNumber: 1,
          paragraphIndex: 0,
          charStart: 0,
          charEnd: 6,
          unitType: "prose",
        },
        {
          content: "Test 2",
          pageNumber: 1,
          paragraphIndex: 1,
          charStart: 7,
          charEnd: 13,
          unitType: "prose",
        },
      ],
      retrievalChunks: [
        {
          content: "Test 1",
          pageStart: 1,
          pageEnd: 1,
          sectionHierarchy: [],
          chunkType: "prose",
          citationUnitIndices: [0], // Index 1 is unreferenced
        },
      ],
    };

    const errors = validateChunks(chunks);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("Citation unit 1 is not referenced"))).toBe(true);
  });

  it("should detect page boundary inconsistencies", () => {
    const chunks: DualResolutionChunks = {
      citationUnits: [
        {
          content: "Test",
          pageNumber: 5, // Page 5
          paragraphIndex: 0,
          charStart: 0,
          charEnd: 4,
          unitType: "prose",
        },
      ],
      retrievalChunks: [
        {
          content: "Test",
          pageStart: 1, // Wrong - should be 5
          pageEnd: 1, // Wrong - should be 5
          sectionHierarchy: [],
          chunkType: "prose",
          citationUnitIndices: [0],
        },
      ],
    };

    const errors = validateChunks(chunks);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("pageStart") || e.includes("pageEnd"))).toBe(true);
  });
});

// ============================================================================
// DEFAULT_CHUNKING_CONFIG Tests
// ============================================================================

describe("DEFAULT_CHUNKING_CONFIG", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_CHUNKING_CONFIG.minUnitsPerChunk).toBe(3);
    expect(DEFAULT_CHUNKING_CONFIG.maxUnitsPerChunk).toBe(5);
    expect(DEFAULT_CHUNKING_CONFIG.maxChunkTokens).toBe(800);
    expect(DEFAULT_CHUNKING_CONFIG.breakOnSections).toBe(true);
  });
});
