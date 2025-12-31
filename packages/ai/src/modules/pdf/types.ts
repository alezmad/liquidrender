import { pdfMessageRoleEnum } from "@turbostarter/db/schema/pdf";

import type { tools } from "./api";
import type { EnumToConstant } from "@turbostarter/shared/types";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";

export interface RemoteFile {
  url: string;
  size: number;
}

export type {
  SelectPdfChat as Chat,
  SelectPdfDocument as Document,
  SelectPdfMessage as Message,
} from "@turbostarter/db/schema/pdf";

export const Role = Object.fromEntries(
  pdfMessageRoleEnum.enumValues.map((role) => [
    role.replace(/-/g, "_").toUpperCase(),
    role,
  ]),
) as EnumToConstant<typeof pdfMessageRoleEnum.enumValues>;

export type Role = (typeof Role)[keyof typeof Role];

export type PdfMessage = UIMessage<
  unknown,
  UIDataTypes,
  InferUITools<typeof tools>
>;
export type PdfMessagePart = PdfMessage["parts"][number];

// ============================================================================
// Citation Types (Interactive PDF Chat)
// ============================================================================

/**
 * Metadata stored with each embedding chunk for citation support
 */
export interface EmbeddingMetadata {
  pageNumber: number;
  charStart?: number;
  charEnd?: number;
  sectionTitle?: string;
}

/**
 * Citation returned by AI with source reference
 */
export interface Citation {
  /** Citation index displayed as [1], [2], etc. */
  index: number;
  /** Reference to pdf.embedding row */
  embeddingId: string;
  /** Semantic similarity score 0-1 */
  relevance: number;
  /** Page number for quick navigation */
  pageNumber: number;
  /** Short preview of the cited content */
  excerpt: string;
}

/**
 * AI response with parsed citations
 */
export interface CitationResponse {
  /** Message content with [[cite:id:page]] markers replaced with [1], [2] */
  content: string;
  /** Parsed citation references */
  citations: Citation[];
}

/**
 * Navigation history entry for back/forward
 */
export interface NavigationEntry {
  /** Target page number */
  page: number;
  /** Optional embedding to highlight */
  embeddingId?: string;
  /** Timestamp for ordering */
  timestamp: number;
}

/**
 * PDF viewer state exposed via context
 */
export interface PdfViewerState {
  /** Currently visible page */
  currentPage: number;
  /** Current zoom level (1 = 100%) */
  zoomLevel: number;
  /** Scroll position within page */
  scrollPosition: number;
  /** Currently highlighted embedding ID */
  activeHighlight: string | null;
  /** Navigation history stack */
  history: NavigationEntry[];
  /** Current position in history (-1 = not navigating) */
  historyIndex: number;
}

/**
 * PDF viewer actions exposed via context
 */
export interface PdfViewerActions {
  /** Navigate to a specific page with optional highlight */
  navigateTo: (options: {
    page: number;
    embeddingId?: string;
    animate?: boolean;
  }) => void;
  /** Go back in navigation history */
  goBack: () => void;
  /** Go forward in navigation history */
  goForward: () => void;
  /** Clear active highlight */
  clearHighlight: () => void;
  /** Set current page (from viewer scroll) */
  setCurrentPage: (page: number) => void;
}
