import { and, desc, eq, count, inArray } from "@turbostarter/db";
import {
  knosiaNotification,
  knosiaDigest,
  knosiaAiInsight,
  // knosiaCanvas, // TODO: Implement canvas tables (see vision docs)
  // knosiaCanvasBlock,
  // knosiaCanvasAlert,
  knosiaVocabularyItem,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { GetNotificationsInput, GetAiInsightsInput } from "./schemas";

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, input: GetNotificationsInput) {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(knosiaNotification.userId, userId),
    input.workspaceId ? eq(knosiaNotification.workspaceId, input.workspaceId) : undefined,
    input.unreadOnly ? eq(knosiaNotification.read, false) : undefined,
    input.type ? eq(knosiaNotification.type, input.type) : undefined,
  );

  const data = await db
    .select()
    .from(knosiaNotification)
    .where(where)
    .orderBy(desc(knosiaNotification.createdAt))
    .limit(input.perPage)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(knosiaNotification)
    .where(where)
    .then((res) => res[0]?.count ?? 0);

  const unreadCount = await db
    .select({ count: count() })
    .from(knosiaNotification)
    .where(
      and(
        eq(knosiaNotification.userId, userId),
        eq(knosiaNotification.read, false),
      ),
    )
    .then((res) => res[0]?.count ?? 0);

  return { data, total, unreadCount };
}

/**
 * Get a notification by ID
 */
export async function getNotification(id: string, userId: string) {
  const result = await db
    .select()
    .from(knosiaNotification)
    .where(
      and(
        eq(knosiaNotification.id, id),
        eq(knosiaNotification.userId, userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// ============================================================================
// DIGEST QUERIES
// ============================================================================

/**
 * Get digests for a user
 */
export async function getUserDigests(userId: string, workspaceId?: string) {
  const where = and(
    eq(knosiaDigest.userId, userId),
    workspaceId ? eq(knosiaDigest.workspaceId, workspaceId) : undefined,
  );

  return db
    .select()
    .from(knosiaDigest)
    .where(where)
    .orderBy(desc(knosiaDigest.createdAt));
}

/**
 * Get a digest by ID
 */
export async function getDigest(id: string, userId: string) {
  const result = await db
    .select()
    .from(knosiaDigest)
    .where(
      and(
        eq(knosiaDigest.id, id),
        eq(knosiaDigest.userId, userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// ============================================================================
// AI INSIGHT QUERIES
// ============================================================================

/**
 * Get AI insights for a workspace
 */
export async function getAiInsights(userId: string, input: GetAiInsightsInput) {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(knosiaAiInsight.workspaceId, input.workspaceId),
    eq(knosiaAiInsight.targetUserId, userId),
    input.status ? eq(knosiaAiInsight.status, input.status) : undefined,
  );

  const data = await db
    .select()
    .from(knosiaAiInsight)
    .where(where)
    .orderBy(desc(knosiaAiInsight.surfacedAt))
    .limit(input.perPage)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(knosiaAiInsight)
    .where(where)
    .then((res) => res[0]?.count ?? 0);

  return { data, total };
}

/**
 * Get an AI insight by ID
 */
export async function getAiInsight(id: string, userId: string) {
  const result = await db
    .select()
    .from(knosiaAiInsight)
    .where(
      and(
        eq(knosiaAiInsight.id, id),
        eq(knosiaAiInsight.targetUserId, userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// ============================================================================
// DIGEST PREVIEW HELPERS
// ============================================================================

/**
 * Get canvases data for digest preview
 * TODO: Implement when canvas tables are added (see vision docs)
 */
export async function getCanvasesData(
  _canvasIds: string[]
): Promise<Array<{ name: string; summary: string }>> {
  // Stub implementation - canvas tables not yet implemented
  return [];
}

/**
 * Get metrics data for digest preview
 * Note: metrics are vocabulary items of type 'metric'
 */
export async function getMetricsData(workspaceId: string, metricSlugs: string[]) {
  if (!metricSlugs.length) return [];

  const metrics = await db
    .select({
      id: knosiaVocabularyItem.id,
      canonicalName: knosiaVocabularyItem.canonicalName,
      slug: knosiaVocabularyItem.slug,
      definition: knosiaVocabularyItem.definition,
    })
    .from(knosiaVocabularyItem)
    .where(
      and(
        eq(knosiaVocabularyItem.workspaceId, workspaceId),
        eq(knosiaVocabularyItem.type, "metric"),
        inArray(knosiaVocabularyItem.slug, metricSlugs),
      ),
    );

  // Return metrics with placeholder values
  // In a real implementation, this would query actual metric values
  return metrics.map((m) => {
    const definition = m.definition as {
      descriptionHuman?: string;
      formulaHuman?: string;
    } | null;

    return {
      id: m.id,
      name: m.canonicalName,
      slug: m.slug,
      description: definition?.descriptionHuman ?? null,
      // Placeholder values - real implementation would query data source
      value: null as number | null,
      formattedValue: "—",
      change: null as number | null,
      changeFormatted: null as string | null,
    };
  });
}

/**
 * Get recent alerts for digest preview
 * TODO: Implement when canvas alert tables are added (see vision docs)
 */
export async function getRecentAlerts(
  _workspaceId: string,
  _limit = 10
): Promise<Array<{ name: string; message: string; severity: string }>> {
  // Stub implementation - canvas alert tables not yet implemented
  return [];
}

// formatAlertCondition removed - will be needed when alert tables are implemented

/**
 * Get recent AI insights for digest preview
 */
export async function getRecentInsights(workspaceId: string, limit = 5) {
  const insights = await db
    .select({
      id: knosiaAiInsight.id,
      headline: knosiaAiInsight.headline,
      explanation: knosiaAiInsight.explanation,
      severity: knosiaAiInsight.severity,
      category: knosiaAiInsight.category,
      evidence: knosiaAiInsight.evidence,
      status: knosiaAiInsight.status,
      surfacedAt: knosiaAiInsight.surfacedAt,
    })
    .from(knosiaAiInsight)
    .where(
      and(
        eq(knosiaAiInsight.workspaceId, workspaceId),
        eq(knosiaAiInsight.status, "pending"),
      ),
    )
    .orderBy(desc(knosiaAiInsight.surfacedAt))
    .limit(limit);

  return insights;
}
