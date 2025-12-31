import { knosiaActivity } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

// ============================================================================
// ACTIVITY MUTATIONS
// ============================================================================

type ActivityType =
  | "thread_created"
  | "thread_shared"
  | "canvas_created"
  | "canvas_shared"
  | "canvas_updated"
  | "comment_added"
  | "insight_converted";

interface CreateActivityInput {
  workspaceId: string;
  userId: string;
  type: ActivityType;
  targetType: "thread" | "canvas" | "comment" | "insight";
  targetId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an activity entry
 * This is typically called internally when actions occur
 */
export async function createActivity(input: CreateActivityInput) {
  const [activity] = await db
    .insert(knosiaActivity)
    .values({
      id: generateId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    })
    .returning();

  return activity;
}
