import { eq } from "@turbostarter/db";
import { knosiaComment, knosiaNotification, user } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type { CreateCommentInput, UpdateCommentInput, Comment } from "./schemas";

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
export async function updateComment(id: string, input: UpdateCommentInput, _userId: string) {
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

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Notify mentioned users about a comment
 */
export async function notifyMentions(
  mentionedUserIds: string[],
  comment: Comment,
  authorId: string
): Promise<void> {
  // Get author name
  const [author] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, authorId))
    .limit(1);

  const authorName = author?.name ?? "Someone";

  // Insert notifications for each mentioned user
  for (const userId of mentionedUserIds) {
    // Don't notify yourself
    if (userId === authorId) continue;

    await db.insert(knosiaNotification).values({
      id: generateId(),
      userId,
      type: "mention",
      title: `${authorName} mentioned you`,
      body: truncate(comment.content, 100),
      sourceType: comment.targetType,
      sourceId: comment.targetId,
    });
  }
}
