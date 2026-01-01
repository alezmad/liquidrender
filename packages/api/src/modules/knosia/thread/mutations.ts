import { and, eq, lte } from "@turbostarter/db";
import {
  knosiaThread,
  knosiaThreadMessage,
  knosiaThreadSnapshot,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type { ForkThreadInput, CreateSnapshotInput, ShareThreadInput } from "./schemas";

// ============================================================================
// FORK THREAD
// ============================================================================

/**
 * Fork a thread from a specific message.
 * Creates a new thread with all messages up to and including the specified message.
 */
export async function forkThread(
  threadId: string,
  input: ForkThreadInput,
  userId: string,
) {
  // 1. Get original thread
  const originalThread = await db
    .select()
    .from(knosiaThread)
    .where(and(eq(knosiaThread.id, threadId), eq(knosiaThread.userId, userId)))
    .limit(1);

  if (!originalThread[0]) {
    return null;
  }

  // 2. Get the source message to find its timestamp
  const sourceMessage = await db
    .select()
    .from(knosiaThreadMessage)
    .where(
      and(
        eq(knosiaThreadMessage.id, input.fromMessageId),
        eq(knosiaThreadMessage.threadId, threadId),
      ),
    )
    .limit(1);

  if (!sourceMessage[0]) {
    return null;
  }

  // 3. Get all messages up to and including the source message
  const messagesToCopy = await db
    .select()
    .from(knosiaThreadMessage)
    .where(
      and(
        eq(knosiaThreadMessage.threadId, threadId),
        lte(knosiaThreadMessage.createdAt, sourceMessage[0].createdAt),
      ),
    )
    .orderBy(knosiaThreadMessage.createdAt);

  // 4. Create new forked thread
  const [forkedThread] = await db
    .insert(knosiaThread)
    .values({
      id: generateId(),
      userId,
      workspaceId: originalThread[0].workspaceId,
      title: input.name,
      context: originalThread[0].context,
      status: "active",
      parentThreadId: threadId,
      forkedFromMessageId: input.fromMessageId,
    })
    .returning();

  // 5. Copy messages to new thread
  if (messagesToCopy.length > 0) {
    await db.insert(knosiaThreadMessage).values(
      messagesToCopy.map((msg) => ({
        id: generateId(),
        threadId: forkedThread!.id,
        role: msg.role,
        content: msg.content,
        intent: msg.intent,
        grounding: msg.grounding,
        sqlGenerated: msg.sqlGenerated,
        visualization: msg.visualization,
        confidence: msg.confidence,
        provenance: msg.provenance,
      })),
    );
  }

  return forkedThread;
}

// ============================================================================
// THREAD SNAPSHOT
// ============================================================================

/**
 * Create a snapshot of a thread's current state.
 * Snapshots are frozen copies for reference/sharing.
 */
export async function createThreadSnapshot(
  threadId: string,
  input: CreateSnapshotInput,
  userId: string,
) {
  // 1. Verify user owns thread
  const thread = await db
    .select()
    .from(knosiaThread)
    .where(and(eq(knosiaThread.id, threadId), eq(knosiaThread.userId, userId)))
    .limit(1);

  if (!thread[0]) {
    return null;
  }

  // 2. Get all messages
  const messages = await db
    .select()
    .from(knosiaThreadMessage)
    .where(eq(knosiaThreadMessage.threadId, threadId))
    .orderBy(knosiaThreadMessage.createdAt);

  // 3. Create snapshot
  const [snapshot] = await db
    .insert(knosiaThreadSnapshot)
    .values({
      id: generateId(),
      threadId,
      name: input.name,
      description: input.description,
      messageCount: messages.length,
      snapshotData: {
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          intent: m.intent,
          visualization: m.visualization,
          createdAt: m.createdAt,
        })),
        context: thread[0].context,
      },
      createdBy: userId,
    })
    .returning();

  return snapshot;
}

// ============================================================================
// STAR/UNSTAR THREAD
// ============================================================================

/**
 * Star a thread for quick access.
 */
export async function starThread(threadId: string, userId: string) {
  const result = await db
    .update(knosiaThread)
    .set({ starred: true })
    .where(and(eq(knosiaThread.id, threadId), eq(knosiaThread.userId, userId)))
    .returning();

  return result[0] ?? null;
}

/**
 * Unstar a thread.
 */
export async function unstarThread(threadId: string, userId: string) {
  const result = await db
    .update(knosiaThread)
    .set({ starred: false })
    .where(and(eq(knosiaThread.id, threadId), eq(knosiaThread.userId, userId)))
    .returning();

  return result[0] ?? null;
}

// ============================================================================
// SHARE THREAD
// ============================================================================

/**
 * Share a thread with other users.
 * Updates the sharing metadata and optionally changes status.
 */
export async function shareThread(
  threadId: string,
  input: ShareThreadInput,
  userId: string,
) {
  // 1. Verify user owns thread
  const thread = await db
    .select()
    .from(knosiaThread)
    .where(and(eq(knosiaThread.id, threadId), eq(knosiaThread.userId, userId)))
    .limit(1);

  if (!thread[0]) {
    return null;
  }

  // 2. Get existing sharing data
  const existingSharing = (thread[0].sharing ?? {}) as {
    sharedWith?: string[];
    publicLink?: string;
  };

  // 3. Merge with new shares
  const sharedWithSet = new Set([
    ...(existingSharing.sharedWith ?? []),
    ...input.userIds,
  ]);

  // 4. Update thread
  const [updated] = await db
    .update(knosiaThread)
    .set({
      status: "shared",
      sharing: {
        ...existingSharing,
        sharedWith: Array.from(sharedWithSet),
      },
    })
    .where(eq(knosiaThread.id, threadId))
    .returning();

  return {
    success: true,
    sharedWith: Array.from(sharedWithSet),
    mode: input.mode,
    thread: updated,
  };
}
