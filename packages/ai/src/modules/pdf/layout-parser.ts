/**
 * Layout Parser for PDF Dual-Resolution Chunking (WF-0028)
 *
 * Parses PDFs with layout awareness to extract structured elements
 * (prose, headings, lists, tables, code) with position metadata.
 */

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { getSignedUrl } from "@turbostarter/storage/server";

// =============================================================================
// Types
// =============================================================================

/**
 * Unit types matching the database schema enum
 */
export type UnitType = "prose" | "heading" | "list" | "table" | "code";

/**
 * A layout-aware element extracted from a PDF
 */
export interface LayoutElement {
  /** The text content of this element */
  content: string;

  /** Detected element type */
  type: UnitType;

  /** 1-based page number */
  pageNumber: number;

  /** 0-based paragraph index within the page */
  paragraphIndex: number;

  /** Character start position within page text */
  charStart: number;

  /** Character end position within page text */
  charEnd: number;

  /** Estimated bounding box X (0-1 normalized to page width) */
  bboxX: number;

  /** Estimated bounding box Y (0-1 normalized to page height) */
  bboxY: number;

  /** Estimated bounding box width (0-1 normalized) */
  bboxWidth: number;

  /** Estimated bounding box height (0-1 normalized) */
  bboxHeight: number;

  /** Detected or inherited section title */
  sectionTitle: string | null;
}

/**
 * Internal representation of a page's content
 */
interface PageContent {
  pageNumber: number;
  content: string;
  paragraphs: string[];
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum characters for a heading line */
const HEADING_MAX_LENGTH = 100;

/** Patterns that indicate list items */
const LIST_PATTERNS = [
  /^[\u2022\u2023\u25E6\u2043\u2219]\s+/, // Bullet characters
  /^[-–—]\s+/, // Dashes
  /^\d+[.)]\s+/, // Numbered: 1. or 1)
  /^[a-zA-Z][.)]\s+/, // Lettered: a. or a)
  /^[ivxlcdm]+[.)]\s+/i, // Roman numerals
];

/** Patterns suggesting code blocks */
const CODE_PATTERNS = [
  /^\s{4,}/, // 4+ space indentation
  /^\t+/, // Tab indentation
  /^```/, // Markdown code fence
  /^(const|let|var|function|class|import|export|if|for|while|return)\s/, // Keywords
  /[{}[\]();]/, // Bracket-heavy content
  /^\s*\/\//, // Comment lines
  /^\s*#\s*\w+/, // Shell/Python comments
];

/** Patterns suggesting table rows */
const TABLE_PATTERNS = [
  /\|.*\|/, // Pipe-delimited
  /\t.*\t.*\t/, // Tab-separated (3+ columns)
  /^\s*[-+]+\s*$/, // Table separator lines
];

// =============================================================================
// Element Type Detection
// =============================================================================

/**
 * Detect if a paragraph is a heading
 */
function isHeading(text: string): boolean {
  const trimmed = text.trim();

  // Must be relatively short
  if (trimmed.length > HEADING_MAX_LENGTH) return false;

  // Must not end with typical sentence punctuation
  if (/[.?!,;:]$/.test(trimmed)) return false;

  // Should not be a list item
  if (LIST_PATTERNS.some((p) => p.test(trimmed))) return false;

  // Empty or whitespace-only is not a heading
  if (trimmed.length === 0) return false;

  // Single line, not too short (avoid random words)
  const lines = trimmed.split("\n");
  if (lines.length > 2) return false;

  // All caps or title case often indicates heading
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const startsWithCap = /^[A-Z]/.test(trimmed);

  // Headings typically don't start with lowercase
  if (!startsWithCap && !isAllCaps) return false;

  return true;
}

/**
 * Detect if a paragraph is a list item or list block
 */
function isList(text: string): boolean {
  const lines = text.trim().split("\n");

  // At least one line should match a list pattern
  const listLines = lines.filter((line) =>
    LIST_PATTERNS.some((p) => p.test(line.trim())),
  );

  // Consider it a list if majority of lines are list items
  return listLines.length > 0 && listLines.length >= lines.length / 2;
}

/**
 * Detect if a paragraph is a code block
 */
function isCode(text: string): boolean {
  const lines = text.trim().split("\n");

  // Check for code patterns
  let codeIndicators = 0;

  for (const line of lines) {
    if (CODE_PATTERNS.some((p) => p.test(line))) {
      codeIndicators++;
    }
  }

  // High density of code patterns suggests code
  return codeIndicators >= Math.ceil(lines.length / 2);
}

/**
 * Detect if a paragraph is a table
 */
function isTable(text: string): boolean {
  const lines = text.trim().split("\n");

  // Need multiple lines for a table
  if (lines.length < 2) return false;

  // Check for table patterns
  const tableLines = lines.filter((line) =>
    TABLE_PATTERNS.some((p) => p.test(line)),
  );

  // Most lines should look like table rows
  return tableLines.length >= lines.length / 2;
}

/**
 * Detect the type of a text element
 */
function detectElementType(text: string): UnitType {
  // Order matters: more specific checks first
  if (isTable(text)) return "table";
  if (isCode(text)) return "code";
  if (isList(text)) return "list";
  if (isHeading(text)) return "heading";
  return "prose";
}

// =============================================================================
// Paragraph Splitting
// =============================================================================

/**
 * Split page content into logical paragraphs
 *
 * Uses double newlines as primary delimiter, with special handling for:
 * - Code blocks (preserve internal newlines)
 * - Lists (group consecutive list items)
 * - Tables (preserve structure)
 */
function splitIntoParagraphs(content: string): string[] {
  // Primary split on double newlines
  const rawParagraphs = content.split(/\n{2,}/);

  const paragraphs: string[] = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (trimmed.length === 0) continue;

    paragraphs.push(trimmed);
  }

  return paragraphs;
}

// =============================================================================
// Bounding Box Estimation
// =============================================================================

/**
 * Estimate bounding box from character position within page
 *
 * This is a V1 approximation. Assumes:
 * - Single column layout
 * - Uniform line height
 * - Standard margins (10% on each side)
 *
 * For more accurate boxes, we would need pdf.js text layer parsing.
 */
function estimateBoundingBox(
  charStart: number,
  charEnd: number,
  pageTextLength: number,
): { bboxX: number; bboxY: number; bboxWidth: number; bboxHeight: number } {
  // Standard margins (normalized 0-1)
  const marginLeft = 0.1;
  const marginRight = 0.1;
  const marginTop = 0.08;
  const marginBottom = 0.08;

  // Content area
  const contentWidth = 1 - marginLeft - marginRight;
  const contentHeight = 1 - marginTop - marginBottom;

  // Estimate vertical position based on character position
  // Assume characters are distributed proportionally down the page
  const startRatio = pageTextLength > 0 ? charStart / pageTextLength : 0;
  const endRatio = pageTextLength > 0 ? charEnd / pageTextLength : 1;

  // Calculate Y position and height
  const bboxY = marginTop + startRatio * contentHeight;
  const bboxHeight = Math.max(0.02, (endRatio - startRatio) * contentHeight);

  return {
    bboxX: marginLeft,
    bboxY,
    bboxWidth: contentWidth,
    bboxHeight,
  };
}

// =============================================================================
// Section Title Tracking
// =============================================================================

/**
 * Extract section title from a heading element
 */
function extractSectionTitle(element: { type: UnitType; content: string }): string | null {
  if (element.type !== "heading") return null;

  // Clean up the heading text
  const title = element.content.trim();

  // Skip very short titles (likely not meaningful sections)
  if (title.length < 3) return null;

  return title;
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Load a PDF document and return raw page content
 */
async function loadPdfPages(path: string): Promise<PageContent[]> {
  const { url } = await getSignedUrl({ path });

  const response = await fetch(url);
  const blob = await response.blob();

  const loader = new PDFLoader(blob);
  const documents = await loader.load();

  // PDFLoader returns one Document per page with metadata.loc.pageNumber
  return documents.map((doc) => {
    const pageNumber = (doc.metadata?.loc?.pageNumber as number) ?? 1;
    const content = doc.pageContent;
    const paragraphs = splitIntoParagraphs(content);

    return {
      pageNumber,
      content,
      paragraphs,
    };
  });
}

/**
 * Parse a PDF document with layout awareness
 *
 * @param path - Storage path to the PDF file
 * @returns Array of layout-aware elements with position metadata
 */
export async function parseDocumentLayout(path: string): Promise<LayoutElement[]> {
  const pages = await loadPdfPages(path);

  const elements: LayoutElement[] = [];
  let currentSectionTitle: string | null = null;

  for (const page of pages) {
    let charOffset = 0;
    let paragraphIndex = 0;

    for (const paragraph of page.paragraphs) {
      // Find actual position in page content
      const actualStart = page.content.indexOf(paragraph, charOffset);
      const charStart = actualStart !== -1 ? actualStart : charOffset;
      const charEnd = charStart + paragraph.length;

      // Update offset for next search
      charOffset = charEnd;

      // Detect element type
      const type = detectElementType(paragraph);

      // Estimate bounding box
      const bbox = estimateBoundingBox(charStart, charEnd, page.content.length);

      // Create element
      const element: LayoutElement = {
        content: paragraph,
        type,
        pageNumber: page.pageNumber,
        paragraphIndex,
        charStart,
        charEnd,
        ...bbox,
        sectionTitle: currentSectionTitle,
      };

      // Track section titles from headings
      const newTitle = extractSectionTitle(element);
      if (newTitle) {
        currentSectionTitle = newTitle;
        element.sectionTitle = newTitle;
      }

      elements.push(element);
      paragraphIndex++;
    }
  }

  return elements;
}

/**
 * Group elements by page for easier processing
 */
export function groupElementsByPage(
  elements: LayoutElement[],
): Map<number, LayoutElement[]> {
  const pageMap = new Map<number, LayoutElement[]>();

  for (const element of elements) {
    const pageElements = pageMap.get(element.pageNumber) ?? [];
    pageElements.push(element);
    pageMap.set(element.pageNumber, pageElements);
  }

  return pageMap;
}

/**
 * Get statistics about element types in a document
 */
export function getLayoutStatistics(elements: LayoutElement[]): {
  total: number;
  byType: Record<UnitType, number>;
  byPage: Map<number, number>;
} {
  const byType: Record<UnitType, number> = {
    prose: 0,
    heading: 0,
    list: 0,
    table: 0,
    code: 0,
  };

  const byPage = new Map<number, number>();

  for (const element of elements) {
    byType[element.type]++;

    const pageCount = byPage.get(element.pageNumber) ?? 0;
    byPage.set(element.pageNumber, pageCount + 1);
  }

  return {
    total: elements.length,
    byType,
    byPage,
  };
}
