import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { knosiaComment } from "@turbostarter/db/schema";

import { knosiaIdSchema } from "../shared-schemas";

// ============================================================================
// BASE SCHEMAS FROM DRIZZLE
// ============================================================================

export const commentSchema = createSelectSchema(knosiaComment);
export const insertCommentSchema = createInsertSchema(knosiaComment);

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const getCommentsInputSchema = z.object({
  targetType: z.enum(["thread_message", "canvas_block", "thread"]),
  targetId: knosiaIdSchema,
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(50),
});

export const createCommentInputSchema = z.object({
  targetType: z.enum(["thread_message", "canvas_block", "thread"]),
  targetId: knosiaIdSchema,
  content: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
});

export const updateCommentInputSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Comment = z.infer<typeof commentSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsInputSchema>;
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;
