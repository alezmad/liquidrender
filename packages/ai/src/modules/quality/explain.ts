/**
 * LLM-based Data Quality Explainer
 *
 * Generates human-readable explanations for data quality metrics and suggests actions.
 * Helps users understand what metrics like "null%: 87.3" actually mean for their business.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Input types
export interface QualityMetric {
  tableName: string;
  columnName: string;
  dataType: string;
  nullPercentage?: number;
  cardinality?: number;
  uniquenessPercentage?: number;
  averageLength?: number;
  minValue?: unknown;
  maxValue?: unknown;
  sampleValues?: unknown[];
  lastUpdated?: string;
  daysSinceUpdate?: number;
}

// Response schema
const qualityInsightSchema = z.object({
  interpretation: z.string().describe("What this metric means in business terms"),
  recommendation: z.string().optional().describe("Suggested action or consideration"),
  severity: z.enum(["low", "medium", "high", "critical"])
    .describe("How concerning this quality issue is"),
  suggestedDimension: z.string().optional()
    .describe("If this suggests a useful dimension/filter (e.g., 'active_users')"),
});

const qualityExplanationSchema = z.object({
  insights: z.record(z.string(), qualityInsightSchema)
    .describe("Map of column names to quality insights"),
  overallHealth: z.enum(["excellent", "good", "fair", "poor"])
    .describe("Overall data health assessment"),
  topIssues: z.array(z.object({
    column: z.string(),
    issue: z.string(),
    impact: z.string(),
  })).max(5).describe("Top 5 data quality concerns"),
  recommendations: z.array(z.string())
    .describe("General recommendations for improving data quality"),
});

export type QualityInsight = z.infer<typeof qualityInsightSchema>;
export type QualityExplanation = z.infer<typeof qualityExplanationSchema>;

/**
 * Explain data quality metrics using Claude
 */
export async function explainDataQuality(
  metrics: QualityMetric[],
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
    businessType?: string;
    tableName?: string;
  } = {}
): Promise<QualityExplanation> {
  const { model = "haiku", maxTokens = 2000, businessType = "Unknown", tableName = "data" } = options;

  // Prepare metrics summary
  const metricsSummary = metrics.map(m => ({
    column: m.columnName,
    type: m.dataType,
    nullPct: m.nullPercentage,
    cardinality: m.cardinality,
    uniquePct: m.uniquenessPercentage,
    avgLen: m.averageLength,
    sampleValues: m.sampleValues?.slice(0, 3),
    daysSinceUpdate: m.daysSinceUpdate,
  }));

  const prompt = `Analyze data quality metrics for a ${businessType} database table: **${tableName}**

**Quality Metrics:**
${JSON.stringify(metricsSummary, null, 2)}

**Instructions:**
1. Interpret each metric in business terms (not technical jargon)
2. Explain what high/low null percentages mean for business operations
3. Identify concerning patterns (e.g., 87% null = mostly inactive data)
4. Suggest actions or considerations for each issue
5. Rate severity: low (informational), medium (minor concern), high (needs attention), critical (urgent)
6. Suggest useful dimensions/filters that might help (e.g., "active_users" for high null last_login)

**Examples:**
- last_login (null: 87.3%) → "87% of users have never logged in - likely indicates a large inactive user base or new signups that haven't activated. Consider adding 'active_users' dimension filtered by last_login IS NOT NULL." [Severity: medium]
- email (unique: 98.2%) → "Email is highly unique (98.2%), making it suitable as a unique identifier. The 1.8% duplication might indicate test accounts or shared family emails." [Severity: low]
- revenue (null: 0%, cardinality: 45,231) → "Complete revenue data with high variability (45K unique values). Excellent data quality for financial analysis." [Severity: low]

**Focus on:**
- Business impact (not just technical metrics)
- Actionable recommendations
- Trust-building explanations (show you understand the data)`;

  try {
    const result = await generateObject({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      schema: qualityExplanationSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    throw new Error(
      `LLM quality explanation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get quick insight for a single metric (convenience wrapper)
 */
export async function explainSingleMetric(
  metric: QualityMetric,
  options: {
    model?: "haiku" | "sonnet";
    businessType?: string;
  } = {}
): Promise<QualityInsight> {
  const result = await explainDataQuality([metric], {
    ...options,
    tableName: metric.tableName,
  });

  return result.insights[metric.columnName] ?? {
    interpretation: "No quality concerns detected",
    severity: "low",
  };
}
