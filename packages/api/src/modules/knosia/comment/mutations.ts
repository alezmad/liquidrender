import { eq } from "@turbostarter/db";
import { knosiaComment } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type { CreateCommentInput, UpdateCommentInput } from "./schemas";

// ============================================================================
// COMMENT MUTATIONS
// ============================================================================

/**
 * Create a new comment
 */
export async function createComment(input: CreateCommentInput & { userId: string }) {
  const [comment] = await db
    .insert(knosiaComment)
    .values({
      id: generateId(),
      targetType: input.targetType,
      targetId: input.targetId,
      content: input.content,
      userId: input.userId,
      mentions: input.mentions,
    })
    .returning();

  return comment;
}

/**
 * Update a comment
 */
export async function updateComment(id: string, input: UpdateCommentInput, userId: string) {
  const [comment] = await db
    .update(knosiaComment)
    .set({
      content: input.content,
      updatedAt: new Date(),
    })
    .where(
      eq(knosiaComment.id, id),
      // Note: Access check (userId match) should be done in router
    )
    .returning();

  return comment ?? null;
}

/**
 * Delete a comment
 */
export async function deleteComment(id: string, userId: string) {
  const [comment] = await db
    .delete(knosiaComment)
    .where(eq(knosiaComment.id, id))
    .returning();

  return comment ?? null;
}
