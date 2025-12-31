import { and, desc, eq, count } from "@turbostarter/db";
import { knosiaNotification, knosiaDigest, knosiaAiInsight } from "@turbostarter/db/schema";
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
