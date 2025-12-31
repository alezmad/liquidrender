import { and, eq, inArray } from "@turbostarter/db";
import { knosiaNotification, knosiaDigest, knosiaAiInsight } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type {
  CreateDigestInput,
  UpdateDigestInput,
  UpdateAiInsightStatusInput,
} from "./schemas";

// ============================================================================
// NOTIFICATION MUTATIONS
// ============================================================================

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(userId: string, ids?: string[], all?: boolean) {
  if (all) {
    const result = await db
      .update(knosiaNotification)
      .set({ read: true })
      .where(
        and(
          eq(knosiaNotification.userId, userId),
          eq(knosiaNotification.read, false),
        ),
      )
      .returning();

    return result;
  }

  if (ids?.length) {
    const result = await db
      .update(knosiaNotification)
      .set({ read: true })
      .where(
        and(
          eq(knosiaNotification.userId, userId),
          inArray(knosiaNotification.id, ids),
        ),
      )
      .returning();

    return result;
  }

  return [];
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(id: string, userId: string) {
  const [notification] = await db
    .delete(knosiaNotification)
    .where(
      and(
        eq(knosiaNotification.id, id),
        eq(knosiaNotification.userId, userId),
      ),
    )
    .returning();

  return notification ?? null;
}

// ============================================================================
// DIGEST MUTATIONS
// ============================================================================

/**
 * Create a new digest
 */
export async function createDigest(input: CreateDigestInput & { userId: string }) {
  const [digest] = await db
    .insert(knosiaDigest)
    .values({
      id: generateId(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      name: input.name,
      schedule: input.schedule,
      channels: input.channels,
      include: input.include,
      enabled: true,
    })
    .returning();

  return digest;
}

/**
 * Update a digest
 */
export async function updateDigest(id: string, input: UpdateDigestInput, userId: string) {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.schedule !== undefined) updateData.schedule = input.schedule;
  if (input.channels !== undefined) updateData.channels = input.channels;
  if (input.include !== undefined) updateData.include = input.include;
  if (input.enabled !== undefined) updateData.enabled = input.enabled;

  const [digest] = await db
    .update(knosiaDigest)
    .set(updateData)
    .where(
      and(
        eq(knosiaDigest.id, id),
        eq(knosiaDigest.userId, userId),
      ),
    )
    .returning();

  return digest ?? null;
}

/**
 * Delete a digest
 */
export async function deleteDigest(id: string, userId: string) {
  const [digest] = await db
    .delete(knosiaDigest)
    .where(
      and(
        eq(knosiaDigest.id, id),
        eq(knosiaDigest.userId, userId),
      ),
    )
    .returning();

  return digest ?? null;
}

// ============================================================================
// AI INSIGHT MUTATIONS
// ============================================================================

/**
 * Update AI insight status
 */
export async function updateAiInsightStatus(
  id: string,
  input: UpdateAiInsightStatusInput,
  userId: string,
) {
  const updateData: Record<string, unknown> = {
    status: input.status,
  };

  // Track engagement timestamps
  if (input.status === "viewed") {
    updateData.viewedAt = new Date();
  } else if (input.status === "engaged") {
    updateData.engagedAt = new Date();
  } else if (input.status === "dismissed") {
    updateData.dismissedAt = new Date();
  }

  const [insight] = await db
    .update(knosiaAiInsight)
    .set(updateData)
    .where(
      and(
        eq(knosiaAiInsight.id, id),
        eq(knosiaAiInsight.targetUserId, userId),
      ),
    )
    .returning();

  return insight ?? null;
}
