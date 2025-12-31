import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { knosiaActivity } from "@turbostarter/db/schema";

import { workspaceIdSchema } from "../shared-schemas";

// ============================================================================
// BASE SCHEMAS FROM DRIZZLE
// ============================================================================

export const activitySchema = createSelectSchema(knosiaActivity);
export const insertActivitySchema = createInsertSchema(knosiaActivity);

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const getActivityFeedInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  type: z.enum([
    "thread_created",
    "thread_shared",
    "canvas_created",
    "canvas_shared",
    "canvas_updated",
    "comment_added",
    "insight_converted",
  ]).optional(),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(50),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Activity = z.infer<typeof activitySchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type GetActivityFeedInput = z.infer<typeof getActivityFeedInputSchema>;
