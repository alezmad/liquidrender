// Thread module types for Knosia

import type { User } from "@turbostarter/auth";

// ============================================================================
// THREAD TYPES
// ============================================================================

export type ThreadStatus = "active" | "archived" | "stale";

export interface Thread {
  id: string;
  userId: string;
  workspaceId: string;
  title: string | null;
  status: ThreadStatus;
  context?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  // API returns flat fields, metadata is optional for UI-transformed data
  metadata?: ThreadMessageMetadata | null;
  // Flat fields from API response
  intent?: string | null;
  grounding?: string[] | null;
  sqlGenerated?: string | null;
  visualization?: { type?: string; data?: unknown; config?: unknown } | null;
  confidence?: number | null;
  provenance?: {
    freshness: string;
    sources: { name: string; query?: string }[];
    assumptions?: string[];
    confidenceLevel: "exact" | "calculated" | "estimated" | "predicted";
    confidenceScore: number;
  } | null;
  commentCount?: number | null;
  createdAt: string;
}

export interface ThreadMessageMetadata {
  // Block Trust Metadata
  blockTrust?: BlockTrustMetadata;
  // Query execution info
  queryInfo?: QueryExecutionInfo;
  // Attached visualizations
  visualizations?: VisualizationRef[];
}

// ============================================================================
// BLOCK TRUST METADATA
// ============================================================================

export type BlockProvenance =
  | "vocabulary"      // From verified vocabulary
  | "derived"         // Calculated from vocabulary items
  | "ai_generated"    // AI-generated without verification
  | "user_defined";   // User-defined custom

export type ConfidenceLevel = "high" | "medium" | "low";

export interface BlockTrustMetadata {
  provenance: BlockProvenance;
  vocabularyItemIds?: string[];
  confidence: ConfidenceLevel;
  lastVerified?: string;
  verifiedBy?: string;
}

export interface QueryExecutionInfo {
  sql?: string;
  executionTimeMs?: number;
  rowCount?: number;
  cached?: boolean;
}

export interface VisualizationRef {
  type: string;
  blockId?: string;
  data?: unknown;
}

// ============================================================================
// THREAD UI PROPS
// ============================================================================

export interface ThreadViewProps {
  threadId: string;
  workspaceId: string;
  connectionId: string;
}

export interface ThreadSidebarProps {
  workspaceId: string;
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

export interface ThreadMessageProps {
  message: ThreadMessage;
  user?: User;
  showTrustBadge?: boolean;
}

export interface BlockTrustBadgeProps {
  trust: BlockTrustMetadata;
  compact?: boolean;
}

export interface ThreadActionsProps {
  threadId: string;
  onArchive?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}

export interface SnapshotModalProps {
  threadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
