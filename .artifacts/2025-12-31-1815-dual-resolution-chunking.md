# Dual-Resolution PDF Chunking System

> Implementation spec for precise citations with semantic retrieval

## Problem Statement

Current chunking (`RecursiveCharacterTextSplitter`) has fundamental issues:
- Arbitrary 1000-char boundaries split mid-sentence/paragraph
- `indexOf` for position finding is fragile with duplicate text
- No layout awareness — PDF structure is lost
- Fuzzy text matching for highlights is imprecise

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DUAL-RESOLUTION CHUNKING                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PDF Document                                                       │
│       ↓                                                             │
│  Layout Parser (pdf.js getTextContent with positions)               │
│       ↓                                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              CITATION UNITS (source of truth)               │    │
│  │  • One per paragraph                                        │    │
│  │  • Exact bounding box for pixel-perfect highlighting        │    │
│  │  • charStart/charEnd within page                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│       ↓                                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              RETRIEVAL CHUNKS (for search)                  │    │
│  │  • Groups 3-5 citation units                                │    │
│  │  • Semantic boundaries (section breaks)                     │    │
│  │  • Single embedding per chunk                               │    │
│  │  • Links back to citation units                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  QUERY FLOW:                                                        │
│  1. Embed query → vector search retrieval_chunks                    │
│  2. Get matching chunk → return linked citation_units               │
│  3. AI cites [[cite:cu_001:5]] → frontend renders bounding box      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Tables (in `pdf` schema)

```sql
-- Citation units: paragraph-level, positional data
CREATE TABLE pdf.citation_unit (
  id VARCHAR(32) PRIMARY KEY DEFAULT generate_id(),
  document_id VARCHAR(32) NOT NULL REFERENCES pdf.document(id) ON DELETE CASCADE,
  retrieval_chunk_id VARCHAR(32), -- NULL until grouped into retrieval chunk

  -- Content
  content TEXT NOT NULL,

  -- Position (precise)
  page_number INTEGER NOT NULL,
  paragraph_index INTEGER NOT NULL,  -- 0-based within page
  char_start INTEGER NOT NULL,       -- Within page text
  char_end INTEGER NOT NULL,

  -- Bounding box (for pixel-perfect highlighting)
  bbox_x REAL,
  bbox_y REAL,
  bbox_width REAL,
  bbox_height REAL,

  -- Metadata
  section_title TEXT,                -- Detected heading above this paragraph
  unit_type VARCHAR(20) DEFAULT 'prose', -- prose, list, table, heading, code

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(document_id, page_number, paragraph_index)
);

-- Retrieval chunks: semantic units for vector search
CREATE TABLE pdf.retrieval_chunk (
  id VARCHAR(32) PRIMARY KEY DEFAULT generate_id(),
  document_id VARCHAR(32) NOT NULL REFERENCES pdf.document(id) ON DELETE CASCADE,

  -- Content (concatenated from citation units)
  content TEXT NOT NULL,

  -- Embedding for vector search
  embedding vector(1536),

  -- Boundaries
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,

  -- Semantic context
  section_hierarchy TEXT[],          -- ["Chapter 2", "2.1 Methods"]
  chunk_type VARCHAR(20) DEFAULT 'prose',

  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key after both tables exist
ALTER TABLE pdf.citation_unit
  ADD CONSTRAINT fk_retrieval_chunk
  FOREIGN KEY (retrieval_chunk_id)
  REFERENCES pdf.retrieval_chunk(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_citation_unit_document ON pdf.citation_unit(document_id);
CREATE INDEX idx_citation_unit_retrieval ON pdf.citation_unit(retrieval_chunk_id);
CREATE INDEX idx_citation_unit_page ON pdf.citation_unit(document_id, page_number);
CREATE INDEX idx_retrieval_chunk_document ON pdf.retrieval_chunk(document_id);
CREATE INDEX idx_retrieval_chunk_embedding ON pdf.retrieval_chunk
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Drizzle Schema

```typescript
// packages/db/src/schema/pdf.ts

import { pgSchema, varchar, text, integer, real, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core"; // or custom type
import { generateId } from "@turbostarter/shared/utils";

export const pdfSchema = pgSchema("pdf");

// Citation units: paragraph-level, positional
export const citationUnit = pdfSchema.table("citation_unit", {
  id: varchar("id", { length: 32 }).primaryKey().$defaultFn(() => generateId()),
  documentId: varchar("document_id", { length: 32 }).notNull(),
  retrievalChunkId: varchar("retrieval_chunk_id", { length: 32 }),

  // Content
  content: text("content").notNull(),

  // Position
  pageNumber: integer("page_number").notNull(),
  paragraphIndex: integer("paragraph_index").notNull(),
  charStart: integer("char_start").notNull(),
  charEnd: integer("char_end").notNull(),

  // Bounding box
  bboxX: real("bbox_x"),
  bboxY: real("bbox_y"),
  bboxWidth: real("bbox_width"),
  bboxHeight: real("bbox_height"),

  // Metadata
  sectionTitle: text("section_title"),
  unitType: varchar("unit_type", { length: 20 }).default("prose"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  documentIdx: index("idx_cu_document").on(table.documentId),
  retrievalIdx: index("idx_cu_retrieval").on(table.retrievalChunkId),
  pageIdx: index("idx_cu_page").on(table.documentId, table.pageNumber),
  uniqueParaIdx: uniqueIndex("idx_cu_unique").on(table.documentId, table.pageNumber, table.paragraphIndex),
}));

// Retrieval chunks: semantic units for search
export const retrievalChunk = pdfSchema.table("retrieval_chunk", {
  id: varchar("id", { length: 32 }).primaryKey().$defaultFn(() => generateId()),
  documentId: varchar("document_id", { length: 32 }).notNull(),

  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),

  pageStart: integer("page_start").notNull(),
  pageEnd: integer("page_end").notNull(),

  sectionHierarchy: text("section_hierarchy").array(),
  chunkType: varchar("chunk_type", { length: 20 }).default("prose"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  documentIdx: index("idx_rc_document").on(table.documentId),
}));
```

## Core Implementation

### 1. Layout Parser: Extract Paragraphs with Positions

```typescript
// packages/ai/src/modules/pdf/layout-parser.ts

import * as pdfjs from "pdfjs-dist";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fontSize?: number;
}

export interface ParsedParagraph {
  content: string;
  pageNumber: number;
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
  boundingBox: BoundingBox;
  isHeading: boolean;
  headingLevel?: number;
}

export interface ParsedPage {
  pageNumber: number;
  width: number;
  height: number;
  paragraphs: ParsedParagraph[];
  fullText: string;
}

/**
 * Parse PDF and extract paragraphs with precise positions
 */
export async function parsePdfLayout(pdfBuffer: ArrayBuffer): Promise<ParsedPage[]> {
  const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
  const pages: ParsedPage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    // Convert text items to our format
    const items: TextItem[] = textContent.items
      .filter((item): item is pdfjs.TextItem => "str" in item)
      .map((item) => {
        const [, , , , x, y] = item.transform;
        return {
          str: item.str,
          x: x,
          y: viewport.height - y, // Flip Y (PDF origin is bottom-left)
          width: item.width,
          height: item.height,
          fontName: item.fontName,
        };
      });

    // Group into paragraphs
    const paragraphs = groupIntoParagraphs(items, pageNum, viewport.height);

    // Build full page text for charStart/charEnd calculation
    let charOffset = 0;
    for (const para of paragraphs) {
      para.charStart = charOffset;
      para.charEnd = charOffset + para.content.length;
      charOffset = para.charEnd + 1; // +1 for paragraph separator
    }

    pages.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      paragraphs,
      fullText: paragraphs.map(p => p.content).join("\n"),
    });
  }

  return pages;
}

/**
 * Group text items into paragraphs based on vertical spacing
 */
function groupIntoParagraphs(
  items: TextItem[],
  pageNumber: number,
  pageHeight: number
): ParsedParagraph[] {
  if (items.length === 0) return [];

  // Sort by Y (top to bottom), then X (left to right)
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 3) return a.x - b.x; // Same line
    return yDiff;
  });

  // Detect typical line height
  const lineHeights: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].y - sorted[i - 1].y;
    if (gap > 0 && gap < 50) lineHeights.push(gap);
  }
  const avgLineHeight = lineHeights.length > 0
    ? lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length
    : 12;

  // Paragraph break threshold: 1.5x line height
  const paraBreakThreshold = avgLineHeight * 1.5;

  // Group into lines, then paragraphs
  const paragraphs: ParsedParagraph[] = [];
  let currentPara: TextItem[] = [];
  let paraIndex = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const prevItem = sorted[i - 1];

    if (prevItem) {
      const verticalGap = item.y - prevItem.y;

      // New paragraph if large vertical gap
      if (verticalGap > paraBreakThreshold && currentPara.length > 0) {
        paragraphs.push(createParagraph(currentPara, pageNumber, paraIndex++));
        currentPara = [];
      }
    }

    currentPara.push(item);
  }

  // Don't forget last paragraph
  if (currentPara.length > 0) {
    paragraphs.push(createParagraph(currentPara, pageNumber, paraIndex));
  }

  return paragraphs;
}

function createParagraph(
  items: TextItem[],
  pageNumber: number,
  paragraphIndex: number
): ParsedParagraph {
  // Merge text items into content
  // Group by line first (similar Y values)
  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [];

  for (const item of items) {
    if (currentLine.length === 0) {
      currentLine.push(item);
    } else {
      const lastItem = currentLine[currentLine.length - 1];
      const yDiff = Math.abs(item.y - lastItem.y);

      if (yDiff < 3) {
        currentLine.push(item);
      } else {
        lines.push(currentLine);
        currentLine = [item];
      }
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Sort each line by X, then join
  const content = lines
    .map(line => line.sort((a, b) => a.x - b.x).map(i => i.str).join(" "))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // Calculate bounding box
  const allX = items.map(i => i.x);
  const allY = items.map(i => i.y);
  const allRight = items.map(i => i.x + i.width);
  const allBottom = items.map(i => i.y + i.height);

  const boundingBox: BoundingBox = {
    x: Math.min(...allX),
    y: Math.min(...allY),
    width: Math.max(...allRight) - Math.min(...allX),
    height: Math.max(...allBottom) - Math.min(...allY),
  };

  // Detect if heading (heuristic: short, no ending punctuation, possibly larger font)
  const isHeading = content.length < 100 && !/[.?!,;:]$/.test(content);

  return {
    content,
    pageNumber,
    paragraphIndex,
    charStart: 0, // Set by caller
    charEnd: 0,   // Set by caller
    boundingBox,
    isHeading,
    headingLevel: isHeading ? detectHeadingLevel(items) : undefined,
  };
}

function detectHeadingLevel(items: TextItem[]): number {
  // Could use font size comparison, bold detection, etc.
  // For now, simple heuristic based on content length
  const avgFontSize = items.reduce((sum, i) => sum + (i.height || 12), 0) / items.length;
  if (avgFontSize > 18) return 1;
  if (avgFontSize > 14) return 2;
  return 3;
}
```

### 2. Chunking Strategy: Group Paragraphs into Retrieval Chunks

```typescript
// packages/ai/src/modules/pdf/chunking.ts

import type { ParsedPage, ParsedParagraph } from "./layout-parser";

export interface CitationUnitData {
  content: string;
  pageNumber: number;
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
  bboxX: number;
  bboxY: number;
  bboxWidth: number;
  bboxHeight: number;
  sectionTitle?: string;
  unitType: "prose" | "heading" | "list" | "table" | "code";
}

export interface RetrievalChunkData {
  content: string;
  pageStart: number;
  pageEnd: number;
  sectionHierarchy: string[];
  chunkType: string;
  citationUnits: CitationUnitData[]; // Linked units
}

export interface ChunkingConfig {
  /** Target tokens per retrieval chunk (default: 500) */
  targetTokens: number;
  /** Max tokens per retrieval chunk (default: 1000) */
  maxTokens: number;
  /** Min paragraphs per chunk (default: 2) */
  minParagraphs: number;
  /** Max paragraphs per chunk (default: 8) */
  maxParagraphs: number;
}

const DEFAULT_CONFIG: ChunkingConfig = {
  targetTokens: 500,
  maxTokens: 1000,
  minParagraphs: 2,
  maxParagraphs: 8,
};

/**
 * Group paragraphs into semantic retrieval chunks
 * Returns both citation units and retrieval chunks
 */
export function createDualResolutionChunks(
  pages: ParsedPage[],
  config: Partial<ChunkingConfig> = {}
): { citationUnits: CitationUnitData[]; retrievalChunks: RetrievalChunkData[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Flatten all paragraphs with page context
  const allUnits: CitationUnitData[] = [];
  let currentSectionTitle: string | undefined;

  for (const page of pages) {
    for (const para of page.paragraphs) {
      // Track section titles (headings)
      if (para.isHeading) {
        currentSectionTitle = para.content;
      }

      allUnits.push({
        content: para.content,
        pageNumber: para.pageNumber,
        paragraphIndex: para.paragraphIndex,
        charStart: para.charStart,
        charEnd: para.charEnd,
        bboxX: para.boundingBox.x,
        bboxY: para.boundingBox.y,
        bboxWidth: para.boundingBox.width,
        bboxHeight: para.boundingBox.height,
        sectionTitle: currentSectionTitle,
        unitType: para.isHeading ? "heading" : "prose",
      });
    }
  }

  // Group into retrieval chunks
  const retrievalChunks: RetrievalChunkData[] = [];
  let currentChunk: CitationUnitData[] = [];
  let currentTokens = 0;
  let sectionHierarchy: string[] = [];

  for (const unit of allUnits) {
    const unitTokens = estimateTokens(unit.content);

    // Track section hierarchy
    if (unit.unitType === "heading") {
      // Simple hierarchy: just track current section
      sectionHierarchy = [unit.content];
    }

    // Decide whether to start new chunk
    const shouldBreak =
      // Token limit exceeded
      (currentTokens + unitTokens > cfg.maxTokens && currentChunk.length >= cfg.minParagraphs) ||
      // Max paragraphs reached
      currentChunk.length >= cfg.maxParagraphs ||
      // Section break (heading after prose)
      (unit.unitType === "heading" && currentChunk.length > 0 &&
       currentChunk[currentChunk.length - 1].unitType !== "heading");

    if (shouldBreak && currentChunk.length > 0) {
      retrievalChunks.push(createRetrievalChunk(currentChunk, sectionHierarchy));
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(unit);
    currentTokens += unitTokens;
  }

  // Don't forget last chunk
  if (currentChunk.length > 0) {
    retrievalChunks.push(createRetrievalChunk(currentChunk, sectionHierarchy));
  }

  return { citationUnits: allUnits, retrievalChunks };
}

function createRetrievalChunk(
  units: CitationUnitData[],
  sectionHierarchy: string[]
): RetrievalChunkData {
  return {
    content: units.map(u => u.content).join("\n\n"),
    pageStart: Math.min(...units.map(u => u.pageNumber)),
    pageEnd: Math.max(...units.map(u => u.pageNumber)),
    sectionHierarchy: [...sectionHierarchy],
    chunkType: units.some(u => u.unitType === "heading") ? "mixed" : "prose",
    citationUnits: units,
  };
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}
```

### 3. Embedding Generation

```typescript
// packages/ai/src/modules/pdf/dual-embeddings.ts

import { embedMany } from "ai";
import { generateId } from "@turbostarter/shared/utils";

import { db } from "@turbostarter/db/server";
import { citationUnit, retrievalChunk } from "@turbostarter/db/schema/pdf";

import { parsePdfLayout } from "./layout-parser";
import { createDualResolutionChunks } from "./chunking";
import { modelStrategies } from "./strategies";

import type { CitationUnitData, RetrievalChunkData } from "./chunking";

export interface ProcessedDocument {
  documentId: string;
  citationUnitCount: number;
  retrievalChunkCount: number;
}

/**
 * Process PDF with dual-resolution chunking
 * Stores both citation units and retrieval chunks
 */
export async function processDocumentDualResolution(
  documentId: string,
  pdfBuffer: ArrayBuffer
): Promise<ProcessedDocument> {
  // 1. Parse PDF layout
  const pages = await parsePdfLayout(pdfBuffer);

  // 2. Create dual-resolution chunks
  const { citationUnits, retrievalChunks } = createDualResolutionChunks(pages);

  // 3. Generate embeddings for retrieval chunks only
  const { embeddings } = await embedMany({
    model: modelStrategies.textEmbeddingModel("default"),
    values: retrievalChunks.map(chunk => chunk.content),
  });

  // 4. Store in database (transaction)
  await db.transaction(async (tx) => {
    // Insert retrieval chunks first (to get IDs)
    const chunkIds: string[] = [];

    for (let i = 0; i < retrievalChunks.length; i++) {
      const chunk = retrievalChunks[i];
      const chunkId = generateId();
      chunkIds.push(chunkId);

      await tx.insert(retrievalChunk).values({
        id: chunkId,
        documentId,
        content: chunk.content,
        embedding: embeddings[i],
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        sectionHierarchy: chunk.sectionHierarchy,
        chunkType: chunk.chunkType,
      });
    }

    // Insert citation units with retrieval chunk references
    let unitIndex = 0;
    for (let chunkIdx = 0; chunkIdx < retrievalChunks.length; chunkIdx++) {
      const chunk = retrievalChunks[chunkIdx];
      const chunkId = chunkIds[chunkIdx];

      for (const unit of chunk.citationUnits) {
        await tx.insert(citationUnit).values({
          id: generateId(),
          documentId,
          retrievalChunkId: chunkId,
          content: unit.content,
          pageNumber: unit.pageNumber,
          paragraphIndex: unit.paragraphIndex,
          charStart: unit.charStart,
          charEnd: unit.charEnd,
          bboxX: unit.bboxX,
          bboxY: unit.bboxY,
          bboxWidth: unit.bboxWidth,
          bboxHeight: unit.bboxHeight,
          sectionTitle: unit.sectionTitle,
          unitType: unit.unitType,
        });
        unitIndex++;
      }
    }
  });

  return {
    documentId,
    citationUnitCount: citationUnits.length,
    retrievalChunkCount: retrievalChunks.length,
  };
}
```

### 4. Search with Citation Resolution

```typescript
// packages/ai/src/modules/pdf/search.ts

import { sql } from "@turbostarter/db";
import { db } from "@turbostarter/db/server";

import { generateEmbedding } from "./embeddings";

export interface CitationResult {
  id: string;
  content: string;
  pageNumber: number;
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  sectionTitle?: string;

  // Parent chunk context
  retrievalChunkId: string;
  chunkContent: string;
  similarity: number;
}

/**
 * Search for relevant content, return citation units for precise highlighting
 */
export async function searchWithCitations(
  query: string,
  documentId: string,
  limit: number = 6
): Promise<CitationResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // Search retrieval chunks, join with citation units
  const results = await db.execute<{
    // Citation unit fields
    cu_id: string;
    cu_content: string;
    page_number: number;
    paragraph_index: number;
    char_start: number;
    char_end: number;
    bbox_x: number | null;
    bbox_y: number | null;
    bbox_width: number | null;
    bbox_height: number | null;
    section_title: string | null;
    // Retrieval chunk fields
    rc_id: string;
    rc_content: string;
    similarity: number;
  }>(sql`
    WITH ranked_chunks AS (
      SELECT
        id,
        content,
        1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM pdf.retrieval_chunk
      WHERE document_id = ${documentId}
        AND 1 - (embedding <=> ${vectorStr}::vector) > 0.1
      ORDER BY similarity DESC
      LIMIT ${limit}
    )
    SELECT
      cu.id as cu_id,
      cu.content as cu_content,
      cu.page_number,
      cu.paragraph_index,
      cu.char_start,
      cu.char_end,
      cu.bbox_x,
      cu.bbox_y,
      cu.bbox_width,
      cu.bbox_height,
      cu.section_title,
      rc.id as rc_id,
      rc.content as rc_content,
      rc.similarity
    FROM ranked_chunks rc
    JOIN pdf.citation_unit cu ON cu.retrieval_chunk_id = rc.id
    ORDER BY rc.similarity DESC, cu.paragraph_index ASC
  `);

  const rows = Array.isArray(results) ? results : [];

  return rows.map(row => ({
    id: row.cu_id,
    content: row.cu_content,
    pageNumber: row.page_number,
    paragraphIndex: row.paragraph_index,
    charStart: row.char_start,
    charEnd: row.char_end,
    boundingBox: row.bbox_x !== null ? {
      x: row.bbox_x,
      y: row.bbox_y!,
      width: row.bbox_width!,
      height: row.bbox_height!,
    } : null,
    sectionTitle: row.section_title ?? undefined,
    retrievalChunkId: row.rc_id,
    chunkContent: row.rc_content,
    similarity: row.similarity,
  }));
}

/**
 * Get citation unit by ID (for highlighting)
 */
export async function getCitationUnit(id: string): Promise<CitationResult | null> {
  const results = await db.execute<{
    cu_id: string;
    cu_content: string;
    page_number: number;
    paragraph_index: number;
    char_start: number;
    char_end: number;
    bbox_x: number | null;
    bbox_y: number | null;
    bbox_width: number | null;
    bbox_height: number | null;
    section_title: string | null;
    rc_id: string;
    rc_content: string;
  }>(sql`
    SELECT
      cu.id as cu_id,
      cu.content as cu_content,
      cu.page_number,
      cu.paragraph_index,
      cu.char_start,
      cu.char_end,
      cu.bbox_x,
      cu.bbox_y,
      cu.bbox_width,
      cu.bbox_height,
      cu.section_title,
      rc.id as rc_id,
      rc.content as rc_content
    FROM pdf.citation_unit cu
    LEFT JOIN pdf.retrieval_chunk rc ON cu.retrieval_chunk_id = rc.id
    WHERE cu.id = ${id}
    LIMIT 1
  `);

  const row = Array.isArray(results) ? results[0] : null;
  if (!row) return null;

  return {
    id: row.cu_id,
    content: row.cu_content,
    pageNumber: row.page_number,
    paragraphIndex: row.paragraph_index,
    charStart: row.char_start,
    charEnd: row.char_end,
    boundingBox: row.bbox_x !== null ? {
      x: row.bbox_x,
      y: row.bbox_y!,
      width: row.bbox_width!,
      height: row.bbox_height!,
    } : null,
    sectionTitle: row.section_title ?? undefined,
    retrievalChunkId: row.rc_id,
    chunkContent: row.rc_content,
    similarity: 1, // Direct fetch, not from search
  };
}
```

### 5. Updated Highlight Layer (Bounding Box Support)

```typescript
// apps/web/src/modules/pdf/layout/preview/highlight-layer.tsx (updated)

// Add bounding box rendering alongside text matching

interface HighlightRect {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Render highlight using bounding box (pixel-perfect)
 */
function renderBoundingBoxHighlight(
  container: Element,
  pageNumber: number,
  bbox: { x: number; y: number; width: number; height: number },
  pageHeight: number
): void {
  // Find the page canvas
  const pageElement = container.querySelector(`[data-page-number="${pageNumber}"]`);
  if (!pageElement) return;

  // Create highlight overlay
  const overlay = document.createElement("div");
  overlay.className = "pdf-bbox-highlight";
  overlay.style.cssText = `
    position: absolute;
    left: ${bbox.x}px;
    top: ${bbox.y}px;
    width: ${bbox.width}px;
    height: ${bbox.height}px;
    background-color: rgba(250, 204, 21, 0.3);
    border: 2px solid rgba(250, 204, 21, 0.8);
    border-radius: 2px;
    pointer-events: none;
    z-index: 10;
  `;

  pageElement.appendChild(overlay);
}
```

## Migration Path

### Phase 1: Add New Tables (Non-Breaking)
1. Create `citation_unit` and `retrieval_chunk` tables
2. Keep existing `embedding` table working
3. New documents use dual-resolution

### Phase 2: Backfill Existing Documents
1. Re-process existing PDFs with layout parser
2. Create citation units and retrieval chunks
3. Link to existing embeddings or replace

### Phase 3: Switch Search
1. Update `findRelevantContent` to use new tables
2. Update citation format: `[[cite:cu_xxx:5]]` (citation unit ID)
3. Update highlight layer to use bounding boxes

### Phase 4: Cleanup
1. Remove old `embedding` table
2. Remove legacy chunking code

## API Changes

### Citation Format Update

**Before:**
```
[[cite:embedding_id:page_number]]
```

**After:**
```
[[cite:citation_unit_id:page_number]]
```

The citation unit ID gives us:
- Exact paragraph content
- Bounding box for pixel-perfect highlighting
- Link to parent retrieval chunk for context
- Section title for display

### New Endpoints

```typescript
// GET /api/ai/pdf/citation/:id
// Returns citation unit with bounding box

// GET /api/ai/pdf/citation/:id/context
// Returns parent retrieval chunk (surrounding context)

// GET /api/ai/pdf/citation/:id/siblings
// Returns other citation units in same retrieval chunk
```

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Chunk boundaries** | Arbitrary character split | Paragraph-based semantic |
| **Highlight precision** | Fuzzy text match | Pixel-perfect bounding box |
| **Citation granularity** | ~1000 chars | Single paragraph |
| **Context retrieval** | Re-search | Follow `retrievalChunkId` |
| **Section awareness** | Heuristic | Tracked hierarchy |
| **Storage efficiency** | 1 embedding/chunk | 1 embedding/retrieval chunk |

## Estimated Effort

| Task | Effort |
|------|--------|
| Layout parser | 4-6 hours |
| Chunking strategy | 2-3 hours |
| Database schema + migration | 2 hours |
| Embedding generation update | 2-3 hours |
| Search with citations | 2-3 hours |
| Highlight layer update | 2-3 hours |
| API endpoints | 2 hours |
| Testing + edge cases | 4-6 hours |
| **Total** | **20-28 hours** |
