import { and, eq, inArray } from "@turbostarter/db";
import {
  knosiaNotification,
  knosiaDigest,
  knosiaAiInsight,
  knosiaThread,
  knosiaThreadMessage,
  knosiaActivity,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type {
  CreateDigestInput,
  UpdateDigestInput,
  UpdateAiInsightStatusInput,
  ConvertInsightToThreadInput,
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

/**
 * Convert an AI insight into a Thread for further exploration.
 * Creates a new Thread with the insight context and an initial AI message.
 */
export async function convertInsightToThread(
  insightId: string,
  input: ConvertInsightToThreadInput,
  userId: string,
) {
  // 1. Get the insight
  const [insight] = await db
    .select()
    .from(knosiaAiInsight)
    .where(eq(knosiaAiInsight.id, insightId))
    .limit(1);

  if (!insight) {
    return { error: "Insight not found" };
  }

  // Check if user has access (either targeted to them or workspace-wide)
  if (insight.targetUserId && insight.targetUserId !== userId) {
    return { error: "Access denied" };
  }

  // Check if already converted
  if (insight.threadId) {
    return { error: "Insight already converted", threadId: insight.threadId };
  }

  // 2. Create the Thread
  const threadId = generateId();
  const threadTitle = input.title || insight.headline;

  const [thread] = await db
    .insert(knosiaThread)
    .values({
      id: threadId,
      userId,
      workspaceId: insight.workspaceId,
      title: threadTitle,
      status: "active",
      // Store insight source in context as vocabulary focus (empty for now)
      context: {
        vocabularyFocus: [],
      },
      isAiInitiated: true,
    })
    .returning();

  // 3. Create initial AI message with insight context
  const evidence = insight.evidence as {
    metric?: string;
    currentValue?: number;
    previousValue?: number;
    changePercent?: number;
    pattern?: string;
  } | null;

  // Format message with evidence details
  let messageContent = `## ${insight.headline}\n\n${insight.explanation}`;
  if (evidence?.metric) {
    messageContent += `\n\n**Metric:** ${evidence.metric}`;
    if (evidence.currentValue !== undefined) {
      messageContent += ` = ${evidence.currentValue}`;
    }
    if (evidence.changePercent !== undefined) {
      messageContent += ` (${evidence.changePercent > 0 ? '+' : ''}${evidence.changePercent}%)`;
    }
  }

  await db.insert(knosiaThreadMessage).values({
    id: generateId(),
    threadId,
    role: "assistant",
    content: messageContent,
    intent: "insight_explanation",
    // grounding expects string[] of vocabulary item IDs - empty for insight conversion
    grounding: [],
  });

  // 4. Update insight status and link to thread
  await db
    .update(knosiaAiInsight)
    .set({
      status: "converted",
      threadId,
    })
    .where(eq(knosiaAiInsight.id, insightId));

  // 5. Log activity
  await db.insert(knosiaActivity).values({
    id: generateId(),
    workspaceId: insight.workspaceId,
    userId, // Activity table uses 'userId' not 'actorId'
    type: "insight_converted",
    targetType: "thread",
    targetId: threadId,
    // metadata expects { sharedWith?, oldValue?, newValue? }
    metadata: {
      oldValue: { insightId: insight.id, headline: insight.headline },
    },
  });

  return { thread };
}
