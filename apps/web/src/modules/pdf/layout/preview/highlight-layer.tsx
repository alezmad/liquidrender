"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import { usePdfViewer } from "../../context";
import { useCitationUnit } from "../../hooks/use-citation-unit";
import { useEmbedding } from "../../hooks";

import type { BoundingBox } from "../../hooks/use-citation-unit";

// ============================================================================
// Constants
// ============================================================================

/** Duration in ms before auto-clearing the highlight */
const HIGHLIGHT_DURATION_MS = 5000;

/** Minimum word match percentage to consider a span relevant (legacy fallback) */
const MIN_MATCH_PERCENTAGE = 0.3;

/** CSS class applied to highlighted spans (legacy fallback) */
const HIGHLIGHT_CLASS = "pdf-citation-highlight";

/** Data attribute to mark highlighted spans (legacy fallback) */
const HIGHLIGHT_ATTR = "data-citation-highlight";

// ============================================================================
// Styles
// ============================================================================

/** Injected styles for legacy text span highlighting */
const HIGHLIGHT_STYLES = `
.${HIGHLIGHT_CLASS} {
  background-color: rgba(250, 204, 21, 0.4) !important;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(250, 204, 21, 0.6);
  transition: background-color 300ms ease-in-out;
}
`;

/** Styles for bounding box overlay highlights */
const bboxOverlayStyles = {
  container: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none" as const,
    zIndex: 10,
  },
  highlight: {
    position: "absolute" as const,
    backgroundColor: "rgba(250, 204, 21, 0.4)",
    borderRadius: "2px",
    boxShadow: "0 0 4px rgba(250, 204, 21, 0.6)",
    transition: "opacity 300ms ease-in-out",
    pointerEvents: "none" as const,
  },
};

// ============================================================================
// Utilities - Legacy Word Overlap Matching
// ============================================================================

/**
 * Inject highlight styles into document head (once)
 */
function ensureStylesInjected(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("pdf-highlight-styles")) return;

  const style = document.createElement("style");
  style.id = "pdf-highlight-styles";
  style.textContent = HIGHLIGHT_STYLES;
  document.head.appendChild(style);
}

/**
 * Normalize text for comparison - removes extra whitespace, lowercases
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Get significant words from text (words with 3+ characters)
 */
function getSignificantWords(text: string): Set<string> {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter((w) => w.length >= 3);
  return new Set(words);
}

/**
 * Calculate word overlap percentage between two texts
 */
function calculateWordOverlap(text1: string, text2: string): number {
  const words1 = getSignificantWords(text1);
  const words2 = getSignificantWords(text2);

  if (words1.size === 0 || words2.size === 0) return 0;

  let matchCount = 0;
  for (const word of words1) {
    if (words2.has(word)) matchCount++;
  }

  return matchCount / Math.min(words1.size, words2.size);
}

/**
 * Find text layer spans that match the embedding content and apply highlights
 */
function applyHighlightsToSpans(
  container: Element,
  embeddingContent: string,
): number {
  // Find the TextLayer - it has class "textLayer" from pdfjs
  const textLayers = container.querySelectorAll(".textLayer");
  if (textLayers.length === 0) {
    console.debug("[HighlightLayer] No TextLayer found");
    return 0;
  }

  let highlightCount = 0;

  // Check each text layer
  for (const textLayer of textLayers) {
    const spans = textLayer.querySelectorAll("span");

    // For each span, check if it contains significant words from the embedding
    for (const span of spans) {
      const spanText = span.textContent ?? "";
      if (spanText.trim().length < 3) continue;

      const overlap = calculateWordOverlap(spanText, embeddingContent);
      if (overlap >= MIN_MATCH_PERCENTAGE) {
        span.classList.add(HIGHLIGHT_CLASS);
        span.setAttribute(HIGHLIGHT_ATTR, "true");
        highlightCount++;
      }
    }
  }

  // If no individual spans match, try grouping consecutive spans
  if (highlightCount === 0) {
    for (const textLayer of textLayers) {
      const spans = Array.from(textLayer.querySelectorAll("span"));
      const combinedText = spans.map((s) => s.textContent ?? "").join(" ");

      // Check if the combined text contains significant content from embedding
      const overlap = calculateWordOverlap(combinedText, embeddingContent);
      if (overlap >= MIN_MATCH_PERCENTAGE) {
        // Find contiguous groups that match
        for (let i = 0; i < spans.length; i++) {
          let groupText = "";

          for (let j = i; j < Math.min(i + 10, spans.length); j++) {
            groupText += " " + (spans[j]?.textContent ?? "");

            const groupOverlap = calculateWordOverlap(
              groupText,
              embeddingContent,
            );
            if (groupOverlap >= MIN_MATCH_PERCENTAGE) {
              // Highlight all spans in this group
              for (let k = i; k <= j; k++) {
                const span = spans[k];
                if (span) {
                  span.classList.add(HIGHLIGHT_CLASS);
                  span.setAttribute(HIGHLIGHT_ATTR, "true");
                  highlightCount++;
                }
              }
              break;
            }
          }

          if (highlightCount > 0) break;
        }
      }
    }
  }

  console.debug(`[HighlightLayer] Highlighted ${highlightCount} spans (legacy)`);
  return highlightCount;
}

/**
 * Remove all highlights from the document
 */
function clearAllHighlights(container: Element | null): void {
  if (!container) return;

  const highlighted = container.querySelectorAll(`[${HIGHLIGHT_ATTR}]`);
  for (const el of highlighted) {
    el.classList.remove(HIGHLIGHT_CLASS);
    el.removeAttribute(HIGHLIGHT_ATTR);
  }
}

// ============================================================================
// Utilities - Bounding Box Highlighting
// ============================================================================

interface PageDimensions {
  width: number;
  height: number;
}

/**
 * Get the dimensions of the visible PDF page element
 */
function getPageDimensions(container: Element, pageNumber: number): PageDimensions | null {
  // lector renders pages with data-page-number attribute
  const pageElement = container.querySelector(
    `[data-page-number="${pageNumber}"]`
  ) as HTMLElement | null;

  if (!pageElement) {
    // Fallback: try to find the canvas layer which has actual dimensions
    const canvasLayer = container.querySelector(".canvasWrapper canvas") as HTMLCanvasElement | null;
    if (canvasLayer) {
      return {
        width: canvasLayer.clientWidth,
        height: canvasLayer.clientHeight,
      };
    }
    return null;
  }

  return {
    width: pageElement.clientWidth,
    height: pageElement.clientHeight,
  };
}

/**
 * Convert normalized bbox (0-1) to pixel coordinates
 */
function bboxToPixels(
  bbox: BoundingBox,
  dimensions: PageDimensions
): { left: number; top: number; width: number; height: number } {
  return {
    left: bbox.x * dimensions.width,
    top: bbox.y * dimensions.height,
    width: bbox.width * dimensions.width,
    height: bbox.height * dimensions.height,
  };
}

// ============================================================================
// Bounding Box Overlay Component
// ============================================================================

interface BboxOverlayProps {
  bbox: BoundingBox;
  pageNumber: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Renders a single bounding box highlight overlay
 */
const BboxOverlay = memo(function BboxOverlay({
  bbox,
  pageNumber,
  containerRef,
}: BboxOverlayProps) {
  const [pixelRect, setPixelRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const container = containerRef.current?.parentElement;
      if (!container) return;

      const dimensions = getPageDimensions(container, pageNumber);
      if (!dimensions) {
        console.debug(`[HighlightLayer] Could not get dimensions for page ${pageNumber}`);
        return;
      }

      const rect = bboxToPixels(bbox, dimensions);
      setPixelRect(rect);
    };

    // Initial calculation
    updatePosition();

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(updatePosition);
    const container = containerRef.current?.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [bbox, pageNumber, containerRef]);

  if (!pixelRect) return null;

  return (
    <div
      style={{
        ...bboxOverlayStyles.highlight,
        left: `${pixelRect.left}px`,
        top: `${pixelRect.top}px`,
        width: `${pixelRect.width}px`,
        height: `${pixelRect.height}px`,
      }}
      data-bbox-highlight
      aria-hidden="true"
    />
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * HighlightLayer - Applies highlights to PDF content based on citations
 *
 * Supports two highlighting modes:
 * 1. Bounding Box (WF-0028): Uses precise bbox coordinates from citation units
 * 2. Word Overlap (legacy): Falls back to text matching when bbox unavailable
 *
 * When `activeHighlight` is set in the PdfViewerContext, this component:
 * 1. Fetches the citation unit data (or legacy embedding)
 * 2. If bbox available: Renders overlay rectangles at precise positions
 * 3. If no bbox: Searches TextLayer for matching text spans
 *
 * The highlight auto-clears after 5 seconds.
 */
export const HighlightLayer = memo(function HighlightLayer() {
  const { activeHighlight, clearHighlight, currentPage } = usePdfViewer();

  // Try citation unit first (WF-0028)
  const { data: citationUnit, isLoading: citationLoading } = useCitationUnit(activeHighlight);

  // Fall back to legacy embedding if citation unit not found
  const shouldFetchEmbedding = Boolean(activeHighlight) && !citationLoading && !citationUnit;
  const { data: embedding } = useEmbedding(shouldFetchEmbedding ? activeHighlight : null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine which mode to use
  const hasBbox = citationUnit?.bbox != null;
  const fallbackContent = citationUnit?.content ?? embedding?.content;

  // Ensure styles are injected for legacy mode
  useEffect(() => {
    ensureStylesInjected();
  }, []);

  // Apply legacy highlights to matching text
  const applyLegacyHighlights = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!container || !fallbackContent) {
      if (container) clearAllHighlights(container);
      return;
    }

    // Clear existing highlights first
    clearAllHighlights(container);

    // Apply new highlights
    applyHighlightsToSpans(container, fallbackContent);
  }, [fallbackContent]);

  // Update legacy highlights when content changes
  useEffect(() => {
    // Skip if using bbox mode
    if (hasBbox) return;

    if (!activeHighlight || !fallbackContent) {
      clearAllHighlights(containerRef.current?.parentElement ?? null);
      return;
    }

    // Give the TextLayer time to render after page navigation
    const initialTimeout = setTimeout(applyLegacyHighlights, 100);

    const container = containerRef.current?.parentElement;
    if (!container) return;

    // Observe DOM changes in case TextLayer loads later
    const observer = new MutationObserver(() => {
      applyLegacyHighlights();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(initialTimeout);
      observer.disconnect();
    };
  }, [activeHighlight, fallbackContent, hasBbox, applyLegacyHighlights]);

  // Clear legacy highlights when switching to bbox mode
  useEffect(() => {
    if (hasBbox) {
      clearAllHighlights(containerRef.current?.parentElement ?? null);
    }
  }, [hasBbox]);

  // Auto-clear highlight after duration
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (activeHighlight) {
      timeoutRef.current = setTimeout(() => {
        clearAllHighlights(containerRef.current?.parentElement ?? null);
        clearHighlight();
        timeoutRef.current = null;
      }, HIGHLIGHT_DURATION_MS);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activeHighlight, clearHighlight]);

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      clearAllHighlights(containerRef.current?.parentElement ?? null);
    };
  }, []);

  // Only show bbox highlight if on the correct page
  const showBboxHighlight = hasBbox && citationUnit && currentPage === citationUnit.pageNumber;

  return (
    <>
      {/* Hidden reference element for container access */}
      <div
        ref={containerRef}
        data-highlight-layer
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* Bounding box overlay for WF-0028 citation units */}
      {showBboxHighlight && citationUnit.bbox && (
        <div style={bboxOverlayStyles.container} data-bbox-overlay>
          <BboxOverlay
            bbox={citationUnit.bbox}
            pageNumber={citationUnit.pageNumber}
            containerRef={containerRef}
          />
        </div>
      )}
    </>
  );
});

HighlightLayer.displayName = "HighlightLayer";
