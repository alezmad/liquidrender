import { z } from "zod";

import { workspaceIdSchema } from "../shared-schemas";

// ============================================================================
// INSIGHT GENERATION INPUT SCHEMAS
// ============================================================================

/**
 * Input for daily insight generation
 */
export const generateInsightsInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  /** Optional: limit to specific users (null = all workspace users) */
  targetUserIds: z.array(z.string()).optional(),
  /** Maximum insights to generate per run */
  maxInsights: z.number().min(1).max(10).default(3),
});

/**
 * Input for detecting anomalies in metric data
 */
export const detectAnomaliesInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  /** Metric slugs to analyze */
  metricSlugs: z.array(z.string()).optional(),
  /** Standard deviations threshold for anomaly detection */
  threshold: z.number().min(1).max(5).default(2),
});

/**
 * Input for pattern detection across historical data
 */
export const detectPatternsInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  /** Time window for pattern analysis (days) */
  windowDays: z.number().min(7).max(90).default(30),
});

// ============================================================================
// INSIGHT OUTPUT SCHEMAS
// ============================================================================

/**
 * Evidence attached to an insight
 */
export const insightEvidenceSchema = z.object({
  metric: z.string(),
  currentValue: z.number(),
  previousValue: z.number().optional(),
  changePercent: z.number().optional(),
  pattern: z.string().optional(),
});

/**
 * Generated insight structure
 */
export const generatedInsightSchema = z.object({
  headline: z.string().min(1).max(255),
  explanation: z.string().min(1),
  evidence: insightEvidenceSchema,
  severity: z.enum(["info", "warning", "critical"]),
  category: z.enum(["anomaly", "trend", "pattern", "correlation"]),
});

/**
 * Result of insight generation
 */
export const generateInsightsResultSchema = z.object({
  workspaceId: z.string(),
  generatedCount: z.number(),
  insightIds: z.array(z.string()),
  skippedReason: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GenerateInsightsInput = z.infer<typeof generateInsightsInputSchema>;
export type DetectAnomaliesInput = z.infer<typeof detectAnomaliesInputSchema>;
export type DetectPatternsInput = z.infer<typeof detectPatternsInputSchema>;
export type InsightEvidence = z.infer<typeof insightEvidenceSchema>;
export type GeneratedInsight = z.infer<typeof generatedInsightSchema>;
export type GenerateInsightsResult = z.infer<typeof generateInsightsResultSchema>;
