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
 * In a real implementation, this would:
 * 1. Query actual metric data from connected data sources
 * 2. Calculate mean and standard deviation
 * 3. Identify values outside 2 std deviations
 *
 * For now, returns simulated insights based on vocabulary metrics.
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

  // TODO: Replace with actual data source queries
  // This is a placeholder that demonstrates the structure

  // Simulate detecting an anomaly on a random metric
  // In production, this would query real data and apply statistical analysis
  if (metrics.length > 0) {
    const metricIndex = Math.floor(Math.random() * metrics.length);
    const metric = metrics[metricIndex];

    // Guard against undefined (shouldn't happen but satisfies TypeScript)
    if (!metric) return insights;

    // Simulate anomaly data
    const currentValue = 150;
    const previousValue = 100;
    const changePercent = ((currentValue - previousValue) / previousValue) * 100;

    // Only surface if change is significant (>20%)
    if (Math.abs(changePercent) > 20) {
      insights.push({
        headline: `Unusual spike in ${metric.canonicalName}`,
        explanation: `${metric.canonicalName} has increased by ${changePercent.toFixed(1)}% compared to the previous period. This is outside the normal range based on historical data.`,
        evidence: {
          metric: metric.slug,
          currentValue,
          previousValue,
          changePercent,
          pattern: "spike",
        },
        severity: changePercent > 50 ? "warning" : "info",
        category: "anomaly",
      });
    }
  }

  return insights;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Detect patterns in historical data
 *
 * In a real implementation, this would:
 * 1. Analyze time-series data for trends
 * 2. Look for correlations between metrics
 * 3. Identify recurring patterns (weekly, monthly)
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

  // TODO: Replace with actual pattern detection
  // This is a placeholder that demonstrates the structure

  if (metrics.length >= 2) {
    const metric1 = metrics[0];
    const metric2 = metrics[1];

    // Guard against undefined (shouldn't happen but satisfies TypeScript)
    if (!metric1 || !metric2) return insights;

    // Simulate detecting a correlation
    insights.push({
      headline: `${metric1.canonicalName} correlates with ${metric2.canonicalName}`,
      explanation: `Historical analysis shows a strong correlation between ${metric1.canonicalName} and ${metric2.canonicalName}. When one increases, the other tends to follow within 2-3 days.`,
      evidence: {
        metric: metric1.slug,
        currentValue: 0, // Placeholder
        pattern: `correlated_with:${metric2.slug}`,
      },
      severity: "info",
      category: "correlation",
    });
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
