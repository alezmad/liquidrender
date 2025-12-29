import { z } from "zod";

import { connectionIdSchema } from "../shared-schemas";

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const getBriefingSchema = z.object({
  connectionId: connectionIdSchema.optional(),
  date: z.string().date().optional(),
});

export type GetBriefingInput = z.infer<typeof getBriefingSchema>;

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * KPI change direction indicator
 */
export type ChangeDirection = "up" | "down" | "flat";

/**
 * KPI status indicator for visual treatment
 */
export type KPIStatus = "normal" | "warning" | "critical";

/**
 * Alert severity levels
 */
export type AlertSeverity = "warning" | "critical";

/**
 * Change metadata for a KPI value
 */
export interface KPIChange {
  /** Formatted change value (e.g., "+12.5%", "-$5,000") */
  value: string;
  /** Direction of change */
  direction: ChangeDirection;
  /** Comparison period label (e.g., "vs last week", "MoM") */
  comparison: string;
  /** Detailed tooltip explanation */
  tooltip: string;
}

/**
 * Single KPI in the briefing
 */
export interface KPI {
  /** Unique identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Formatted display value (e.g., "$1.2M", "15,234") */
  value: string;
  /** Raw numeric value for calculations */
  rawValue: number;
  /** Change from comparison period */
  change?: KPIChange;
  /** Status indicator for visual treatment */
  status?: KPIStatus;
  /** Reference to vocabulary item */
  vocabularyItemId: string;
}

/**
 * Factor contributing to an alert or insight
 */
export interface Factor {
  /** Human-readable description */
  text: string;
  /** Vocabulary item IDs used as grounding */
  grounding: string[];
}

/**
 * Suggested action for an alert or insight
 */
export interface SuggestedAction {
  /** Button/link label */
  label: string;
  /** Natural language query to execute */
  query: string;
}

/**
 * Alert requiring attention
 */
export interface Alert {
  /** Unique identifier */
  id: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Alert headline */
  title: string;
  /** Detailed description */
  description: string;
  /** Contributing factors with grounding */
  factors: Factor[];
  /** Suggested follow-up actions */
  actions: SuggestedAction[];
}

/**
 * Correlation data for an insight
 */
export interface InsightCorrelation {
  /** Factor being correlated */
  factor: string;
  /** Impact description */
  impact: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Proactive insight from data analysis
 */
export interface Insight {
  /** Unique identifier */
  id: string;
  /** Insight headline */
  title: string;
  /** Detailed description */
  description: string;
  /** Optional correlation data */
  correlation?: InsightCorrelation;
  /** Suggested follow-up actions */
  actions: SuggestedAction[];
}

/**
 * Complete briefing response
 */
export interface BriefingResponse {
  /** Personalized greeting based on time of day */
  greeting: string;
  /** Data freshness timestamp (ISO date) */
  dataThrough: string;
  /** Primary KPIs for the user's role */
  kpis: KPI[];
  /** Active alerts requiring attention */
  alerts: Alert[];
  /** Proactive insights from data analysis */
  insights: Insight[];
  /** Suggested follow-up questions */
  suggestedQuestions: string[];
}
