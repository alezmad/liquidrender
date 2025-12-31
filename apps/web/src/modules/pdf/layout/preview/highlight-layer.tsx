"use client";

import { memo, useCallback, useEffect, useRef } from "react";

import { usePdfViewer } from "../../context";
import { useEmbedding } from "../../hooks";

// ============================================================================
// Constants
// ============================================================================

/** Duration in ms before auto-clearing the highlight */
const HIGHLIGHT_DURATION_MS = 5000;

/** Minimum word match percentage to consider a span relevant */
const MIN_MATCH_PERCENTAGE = 0.3;

/** CSS class applied to highlighted spans */
const HIGHLIGHT_CLASS = "pdf-citation-highlight";

/** Data attribute to mark highlighted spans */
const HIGHLIGHT_ATTR = "data-citation-highlight";

// ============================================================================
// Styles (injected into document)
// ============================================================================

const HIGHLIGHT_STYLES = `
.${HIGHLIGHT_CLASS} {
  background-color: rgba(250, 204, 21, 0.4) !important;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(250, 204, 21, 0.6);
  transition: background-color 300ms ease-in-out;
}
`;

// ============================================================================
// Utilities
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

  console.debug(`[HighlightLayer] Highlighted ${highlightCount} spans`);
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
// Component
// ============================================================================

/**
 * HighlightLayer - Applies CSS highlights directly to PDF text spans
 *
 * When `activeHighlight` is set in the PdfViewerContext, this component:
 * 1. Fetches the embedding content from the API
 * 2. Searches the TextLayer for matching text spans
 * 3. Applies a highlight CSS class directly to matching spans
 *
 * The highlight auto-clears after 5 seconds.
 */
export const HighlightLayer = memo(function HighlightLayer() {
  const { activeHighlight, clearHighlight } = usePdfViewer();
  const { data: embedding } = useEmbedding(activeHighlight);

  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure styles are injected
  useEffect(() => {
    ensureStylesInjected();
  }, []);

  // Apply highlights to matching text
  const applyHighlights = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!container || !embedding?.content) {
      if (container) clearAllHighlights(container);
      return;
    }

    // Clear existing highlights first
    clearAllHighlights(container);

    // Apply new highlights
    applyHighlightsToSpans(container, embedding.content);
  }, [embedding?.content]);

  // Update highlights when embedding content changes
  useEffect(() => {
    if (!activeHighlight || !embedding?.content) {
      clearAllHighlights(containerRef.current?.parentElement ?? null);
      return;
    }

    // Give the TextLayer time to render after page navigation
    const initialTimeout = setTimeout(applyHighlights, 100);

    const container = containerRef.current?.parentElement;
    if (!container) return;

    // Observe DOM changes in case TextLayer loads later
    const observer = new MutationObserver(() => {
      applyHighlights();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(initialTimeout);
      observer.disconnect();
    };
  }, [activeHighlight, embedding?.content, applyHighlights]);

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

  // This component doesn't render visible content - it just manages DOM highlights
  return (
    <div
      ref={containerRef}
      data-highlight-layer
      style={{ display: "none" }}
      aria-hidden="true"
    />
  );
});

HighlightLayer.displayName = "HighlightLayer";
