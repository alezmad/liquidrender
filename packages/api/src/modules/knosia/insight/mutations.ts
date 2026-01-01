import { knosiaAiInsight, knosiaNotification } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import {
  getWorkspaceWithVocabulary,
  getWorkspaceMemberIds,
  getInsightsGeneratedToday,
  hasSimilarRecentInsight,
  getWorkspaceMetrics,
} from "./queries";

import {
  calculateStats,
  calculatePearsonCorrelation,
  calculateLinearTrend,
  zScoreAnomalyDetection,
} from "./helpers";

import type {
  GenerateInsightsInput,
  GeneratedInsight,
  InsightEvidence,
  GenerateInsightsResult,
} from "./schemas";

// ============================================================================
// INSIGHT GENERATION CORE
// ============================================================================

/**
 * Generate daily AI insights for a workspace
 *
 * This is the main entry point for insight generation:
 * 1. Get workspace metrics from vocabulary
 * 2. Detect anomalies (values outside normal range)
 * 3. Find patterns (trends, correlations)
 * 4. Generate up to maxInsights per day
 * 5. Store in knosia_ai_insight table
 * 6. Create notifications for target users
 */
export async function generateDailyInsights(
  input: GenerateInsightsInput,
): Promise<GenerateInsightsResult> {
  const { workspaceId, maxInsights = 3 } = input;

  // Check workspace exists and has vocabulary
  const workspace = await getWorkspaceWithVocabulary(workspaceId);
  if (!workspace) {
    return {
      workspaceId,
      generatedCount: 0,
      insightIds: [],
      skippedReason: "Workspace not found",
    };
  }

  // Check daily limit not exceeded
  const todayCount = await getInsightsGeneratedToday(workspaceId);
  const remainingSlots = maxInsights - todayCount;

  if (remainingSlots <= 0) {
    return {
      workspaceId,
      generatedCount: 0,
      insightIds: [],
      skippedReason: `Daily limit reached (${maxInsights} insights)`,
    };
  }

  // Get metrics to analyze
  const metrics = await getWorkspaceMetrics(workspaceId);
  if (metrics.length === 0) {
    return {
      workspaceId,
      generatedCount: 0,
      insightIds: [],
      skippedReason: "No metrics in vocabulary",
    };
  }

  // Determine target users
  const targetUserIds =
    input.targetUserIds ?? (await getWorkspaceMemberIds(workspaceId));

  // Generate insights
  const generatedInsights: GeneratedInsight[] = [];

  // 1. Detect anomalies (simulated - real implementation would query actual data)
  const anomalies = await detectAnomalies(workspaceId, metrics);
  for (const anomaly of anomalies) {
    if (generatedInsights.length >= remainingSlots) break;

    // Avoid duplicates
    const hasSimilar = await hasSimilarRecentInsight(
      workspaceId,
      anomaly.evidence.metric,
      "anomaly",
    );
    if (!hasSimilar) {
      generatedInsights.push(anomaly);
    }
  }

  // 2. Detect patterns
  if (generatedInsights.length < remainingSlots) {
    const patterns = await detectPatterns(workspaceId, metrics);
    for (const pattern of patterns) {
      if (generatedInsights.length >= remainingSlots) break;

      const hasSimilar = await hasSimilarRecentInsight(
        workspaceId,
        pattern.evidence.metric,
        pattern.category,
      );
      if (!hasSimilar) {
        generatedInsights.push(pattern);
      }
    }
  }

  // 3. Store insights and create notifications
  const insightIds: string[] = [];

  for (const insight of generatedInsights) {
    const insightId = await storeInsight(workspaceId, insight, targetUserIds);
    insightIds.push(insightId);
  }

  return {
    workspaceId,
    generatedCount: insightIds.length,
    insightIds,
  };
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect anomalies in metric values
 *
 * Uses z-score analysis to identify values outside 2 standard deviations.
 * In production with real data sources, this would:
 * 1. Query actual metric data from connected data sources
 * 2. Calculate mean and standard deviation
 * 3. Identify values outside 2 std deviations
 *
 * Currently uses simulated historical data for demonstration.
 */
async function detectAnomalies(
  workspaceId: string,
  metrics: Array<{
    id: string;
    slug: string;
    canonicalName: string;
    definition: unknown;
  }>,
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];

  for (const metric of metrics) {
    // TODO: Replace with actual data source queries
    // In production, fetch historical values from connected databases
    const historicalValues = generateSimulatedHistoricalData();
    const currentValue = historicalValues[historicalValues.length - 1] ?? 0;
    const previousValue = historicalValues[historicalValues.length - 2] ?? currentValue;

    // Calculate statistics using helpers
    const { mean, stdDev } = calculateStats(historicalValues);
    const { isAnomaly, zScore } = zScoreAnomalyDetection(currentValue, mean, stdDev);

    if (isAnomaly) {
      const changePercent = previousValue !== 0
        ? ((currentValue - previousValue) / previousValue) * 100
        : 0;

      insights.push({
        headline: `${zScore > 0 ? "Unusual spike" : "Unusual drop"} in ${metric.canonicalName}`,
        explanation: `${metric.canonicalName} is ${Math.abs(zScore).toFixed(1)} standard deviations ${zScore > 0 ? "above" : "below"} the 30-day average. Current value: ${currentValue.toFixed(2)}, Average: ${mean.toFixed(2)}.`,
        evidence: {
          metric: metric.slug,
          currentValue,
          previousValue,
          changePercent,
          pattern: zScore > 0 ? "spike" : "drop",
          zScore,
        },
        severity: Math.abs(zScore) > 3 ? "critical" : "warning",
        category: "anomaly",
      });

      // Limit to one anomaly per batch to avoid flooding
      if (insights.length >= 2) break;
    }
  }

  return insights;
}

/**
 * Generate simulated historical data for testing
 * In production, this would be replaced with actual data source queries
 */
function generateSimulatedHistoricalData(): number[] {
  const baseValue = 100 + Math.random() * 50;
  const values: number[] = [];

  // Generate 30 days of "normal" data
  for (let i = 0; i < 30; i++) {
    values.push(baseValue + (Math.random() - 0.5) * 20);
  }

  // 20% chance to inject an anomaly at the end
  if (Math.random() < 0.2) {
    const lastValue = values[values.length - 1] ?? baseValue;
    values.push(lastValue * (1 + (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5)));
  } else {
    values.push(baseValue + (Math.random() - 0.5) * 20);
  }

  return values;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Detect patterns in historical data
 *
 * Uses Pearson correlation and linear regression to find:
 * 1. Correlations between metrics (|r| > 0.7)
 * 2. Significant trends (>10% change over 30 days)
 *
 * Currently uses simulated data for demonstration.
 */
async function detectPatterns(
  workspaceId: string,
  metrics: Array<{
    id: string;
    slug: string;
    canonicalName: string;
    definition: unknown;
  }>,
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];

  // Generate time series data for each metric
  // TODO: Replace with actual data source queries
  const timeSeries = metrics.slice(0, 5).map((metric) => ({
    metric,
    values: generateSimulatedHistoricalData(),
  }));

  // Detect correlations between metrics
  for (let i = 0; i < timeSeries.length; i++) {
    for (let j = i + 1; j < timeSeries.length; j++) {
      const seriesA = timeSeries[i];
      const seriesB = timeSeries[j];

      if (!seriesA || !seriesB) continue;

      const correlation = calculatePearsonCorrelation(seriesA.values, seriesB.values);

      // Report strong correlations (|r| > 0.7)
      if (Math.abs(correlation) > 0.7) {
        insights.push({
          headline: `${seriesA.metric.canonicalName} ${correlation > 0 ? "moves with" : "inversely tracks"} ${seriesB.metric.canonicalName}`,
          explanation: `Analysis of the last 30 days shows a ${correlation > 0 ? "positive" : "negative"} correlation (r=${correlation.toFixed(2)}) between these metrics. Changes in one often ${correlation > 0 ? "accompany" : "oppose"} changes in the other.`,
          evidence: {
            metric: seriesA.metric.slug,
            currentValue: correlation,
            pattern: `correlated_with:${seriesB.metric.slug}`,
            correlationStrength: Math.abs(correlation) > 0.9 ? "very_strong" : "strong",
          },
          severity: "info",
          category: "correlation",
        });

        // Limit correlations to avoid flooding
        if (insights.filter((i) => i.category === "correlation").length >= 2) break;
      }
    }
  }

  // Detect trends
  for (const series of timeSeries) {
    const trend = calculateLinearTrend(series.values);

    // Report significant trends (>10% change over period)
    if (Math.abs(trend.percentChange) > 10) {
      const lastValue = series.values[series.values.length - 1] ?? 0;
      const firstValue = series.values[0] ?? 0;

      insights.push({
        headline: `${series.metric.canonicalName} is ${trend.direction === "up" ? "trending upward" : "declining"}`,
        explanation: `Over the last 30 days, ${series.metric.canonicalName} has ${trend.direction === "up" ? "increased" : "decreased"} by ${Math.abs(trend.percentChange).toFixed(1)}%. This represents a consistent ${trend.direction}ward trend.`,
        evidence: {
          metric: series.metric.slug,
          currentValue: lastValue,
          previousValue: firstValue,
          changePercent: trend.percentChange,
          pattern: `trend_${trend.direction}`,
        },
        severity: Math.abs(trend.percentChange) > 25 ? "warning" : "info",
        category: "trend",
      });

      // Limit trends to avoid flooding
      if (insights.filter((i) => i.category === "trend").length >= 2) break;
    }
  }

  return insights;
}

// ============================================================================
// STORAGE
// ============================================================================

/**
 * Store an insight and create notifications for target users
 */
async function storeInsight(
  workspaceId: string,
  insight: GeneratedInsight,
  targetUserIds: string[],
): Promise<string> {
  const insightId = generateId();

  // Store insight (for each target user if multiple, or null for all)
  // For simplicity, we'll create one insight per user
  const insertPromises = targetUserIds.map((userId) =>
    db.insert(knosiaAiInsight).values({
      id: generateId(),
      workspaceId,
      targetUserId: userId,
      headline: insight.headline,
      explanation: insight.explanation,
      evidence: insight.evidence,
      severity: insight.severity,
      category: insight.category,
      status: "pending",
      surfacedAt: new Date(),
    }),
  );

  await Promise.all(insertPromises);

  // Create notifications for each user
  const notificationPromises = targetUserIds.map((userId) =>
    db.insert(knosiaNotification).values({
      id: generateId(),
      userId,
      workspaceId,
      type: "ai_insight",
      title: insight.headline,
      body: insight.explanation.slice(0, 200),
      sourceType: "ai_insight",
      sourceId: insightId,
      read: false,
    }),
  );

  await Promise.all(notificationPromises);

  return insightId;
}

// ============================================================================
// MANUAL INSIGHT CREATION
// ============================================================================

/**
 * Create a single insight manually (for testing or admin use)
 */
export async function createInsight(
  workspaceId: string,
  targetUserId: string | null,
  insight: GeneratedInsight,
): Promise<string> {
  const insightId = generateId();

  await db.insert(knosiaAiInsight).values({
    id: insightId,
    workspaceId,
    targetUserId,
    headline: insight.headline,
    explanation: insight.explanation,
    evidence: insight.evidence,
    severity: insight.severity,
    category: insight.category,
    status: "pending",
    surfacedAt: new Date(),
  });

  return insightId;
}
