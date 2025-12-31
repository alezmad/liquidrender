import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { knosiaNotification, knosiaDigest, knosiaAiInsight } from "@turbostarter/db/schema";

import { workspaceIdSchema, knosiaIdSchema } from "../shared-schemas";

// ============================================================================
// BASE SCHEMAS FROM DRIZZLE
// ============================================================================

export const notificationSchema = createSelectSchema(knosiaNotification);
export const insertNotificationSchema = createInsertSchema(knosiaNotification);

export const digestSchema = createSelectSchema(knosiaDigest);
export const insertDigestSchema = createInsertSchema(knosiaDigest);

export const aiInsightSchema = createSelectSchema(knosiaAiInsight);
export const insertAiInsightSchema = createInsertSchema(knosiaAiInsight);

// ============================================================================
// NOTIFICATION INPUT SCHEMAS
// ============================================================================

export const getNotificationsInputSchema = z.object({
  workspaceId: workspaceIdSchema.optional(),
  unreadOnly: z.boolean().default(false),
  type: z.enum(["alert", "mention", "share", "ai_insight", "thread_activity", "digest"]).optional(),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(50),
});

export const markNotificationReadInputSchema = z.object({
  ids: z.array(knosiaIdSchema).optional(),
  all: z.boolean().optional(),
});

// ============================================================================
// DIGEST INPUT SCHEMAS
// ============================================================================

export const createDigestInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(255),
  schedule: z.string().min(1), // Cron expression
  channels: z.array(z.enum(["email", "slack"])).default(["email"]),
  include: z.object({
    canvasIds: z.array(knosiaIdSchema).optional(),
    metrics: z.array(z.string()).optional(),
    includeAlerts: z.boolean().optional(),
    includeInsights: z.boolean().optional(),
    includeThreadActivity: z.boolean().optional(),
  }).optional(),
});

export const updateDigestInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  schedule: z.string().min(1).optional(), // Cron expression
  channels: z.array(z.enum(["email", "slack"])).optional(),
  include: z.object({
    canvasIds: z.array(knosiaIdSchema).optional(),
    metrics: z.array(z.string()).optional(),
    includeAlerts: z.boolean().optional(),
    includeInsights: z.boolean().optional(),
    includeThreadActivity: z.boolean().optional(),
  }).optional(),
  enabled: z.boolean().optional(),
});

// ============================================================================
// AI INSIGHT INPUT SCHEMAS
// ============================================================================

export const getAiInsightsInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  status: z.enum(["pending", "viewed", "engaged", "dismissed", "converted"]).optional(),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(20),
});

export const updateAiInsightStatusInputSchema = z.object({
  status: z.enum(["pending", "viewed", "engaged", "dismissed", "converted"]),
});

// Query schemas for zValidator
export const getAiInsightsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  status: z.enum(["pending", "viewed", "engaged", "dismissed", "converted"]).optional(),
  page: z.string().optional(),
  perPage: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type GetNotificationsInput = z.infer<typeof getNotificationsInputSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadInputSchema>;

export type Digest = z.infer<typeof digestSchema>;
export type InsertDigest = z.infer<typeof insertDigestSchema>;
export type CreateDigestInput = z.infer<typeof createDigestInputSchema>;
export type UpdateDigestInput = z.infer<typeof updateDigestInputSchema>;

export type AiInsight = z.infer<typeof aiInsightSchema>;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type GetAiInsightsInput = z.infer<typeof getAiInsightsInputSchema>;
export type UpdateAiInsightStatusInput = z.infer<typeof updateAiInsightStatusInputSchema>;
