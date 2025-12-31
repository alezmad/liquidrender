// Brief module types for Knosia
// Aligned with API BriefingResponse from packages/api/src/modules/knosia/briefing/schemas.ts

// ============================================================================
// CHANGE & STATUS TYPES
// ============================================================================

export type ChangeDirection = "up" | "down" | "flat";
export type KPIStatus = "normal" | "warning" | "critical";
export type AlertSeverity = "warning" | "critical";
export type InsightPriority = "critical" | "high" | "medium" | "low";
export type InsightType = "anomaly" | "trend" | "correlation" | "recommendation" | "warning";
export type InsightStatus = "pending" | "viewed" | "engaged" | "dismissed" | "converted";

// ============================================================================
// API INSIGHT TYPE (raw from database)
// ============================================================================

export interface APIInsightEvidence {
  metric: string;
  currentValue: number;
  previousValue?: number;
  changePercent?: number;
  pattern?: string;
}

export interface APIInsight {
  id: string;
  workspaceId: string;
  targetUserId: string | null;
  headline: string;
  explanation: string;
  evidence: APIInsightEvidence | null;
  status: InsightStatus;
  threadId: string | null;
  surfacedAt: string;
  viewedAt: string | null;
  engagedAt: string | null;
  dismissedAt: string | null;
}

// ============================================================================
// KPI TYPES (from API)
// ============================================================================

export interface KPIChange {
  value: string;
  direction: ChangeDirection;
  comparison: string;
  tooltip: string;
}

export interface KPI {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  change?: KPIChange;
  status?: KPIStatus;
  vocabularyItemId: string;
}

// ============================================================================
// ALERT & INSIGHT TYPES (from API)
// ============================================================================

export interface Factor {
  text: string;
  grounding: string[];
}

export interface SuggestedAction {
  label: string;
  query: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  factors: Factor[];
  actions: SuggestedAction[];
}

export interface InsightCorrelation {
  factor: string;
  impact: string;
  confidence: number;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  correlation?: InsightCorrelation;
  actions: SuggestedAction[];
}

// ============================================================================
// BRIEF INSIGHT TYPE (UI-specific)
// ============================================================================

export interface InsightEvidence {
  label: string;
  value: string;
}

export interface InsightAction {
  id: string;
  label: string;
}

export interface BriefInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  summary: string;
  details?: string;
  evidence?: InsightEvidence[];
  suggestedActions?: InsightAction[];
  status?: InsightStatus;
}

// ============================================================================
// BRIEF RESPONSE (from API)
// ============================================================================

export interface Brief {
  greeting: string;
  dataThrough: string;
  kpis: KPI[];
  alerts: Alert[];
  insights: Insight[];
  suggestedQuestions: string[];
}

// ============================================================================
// UI-SPECIFIC SECTION TYPES
// ============================================================================

export type BriefSectionType =
  | "attention"   // Items requiring immediate attention
  | "on_track"    // Metrics performing well
  | "thinking"    // AI's current analysis/thoughts
  | "tasks";      // Suggested actions

export interface BriefSection {
  type: BriefSectionType;
  title: string;
  items: BriefItem[];
  expanded?: boolean;
}

export interface BriefItem {
  id: string;
  type: "metric" | "alert" | "insight" | "task";
  title: string;
  description?: string;
  value?: string | number;
  change?: MetricChange;
  priority?: InsightPriority;
  action?: BriefItemAction;
}

export interface MetricChange {
  direction: "up" | "down" | "stable";
  value: number;
  period: string;
  isPositive?: boolean;
}

export interface BriefItemAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

// ============================================================================
// BRIEF UI PROPS
// ============================================================================

export interface BriefViewProps {
  workspaceId: string;
  roleId?: string;
}

export interface AttentionSectionProps {
  items: BriefItem[];
  onItemClick?: (itemId: string) => void;
}

export interface OnTrackSectionProps {
  items: BriefItem[];
  showAll?: boolean;
  onToggleShowAll?: () => void;
}

export interface ThinkingSectionProps {
  content?: string;
  isLoading?: boolean;
}

export interface TasksSectionProps {
  items: BriefItem[];
  onTaskAction?: (taskId: string, action: string) => void;
}

export interface InsightCardProps {
  insight: BriefInsight;
  compact?: boolean;
  onView?: () => void;
  onEngage?: () => void;
  onDismiss?: () => void;
}
