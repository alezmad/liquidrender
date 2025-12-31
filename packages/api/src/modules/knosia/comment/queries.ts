import { and, desc, eq, count } from "@turbostarter/db";
import { knosiaComment } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { GetCommentsInput } from "./schemas";

// ============================================================================
// COMMENT QUERIES
// ============================================================================

/**
 * Get comments for a target (thread_message, canvas_block, or thread)
 */
export async function getComments(input: GetCommentsInput) {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(knosiaComment.targetType, input.targetType),
    eq(knosiaComment.targetId, input.targetId),
  );

  const data = await db
    .select()
    .from(knosiaComment)
    .where(where)
    .orderBy(desc(knosiaComment.createdAt))
    .limit(input.perPage)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(knosiaComment)
    .where(where)
    .then((res) => res[0]?.count ?? 0);

  return { data, total };
}

/**
 * Get a comment by ID
 */
export async function getComment(id: string) {
  const result = await db
    .select()
    .from(knosiaComment)
    .where(eq(knosiaComment.id, id))
    .limit(1);

  return result[0] ?? null;
}
