import {
  createInsertSchema,
  createSelectSchema,
} from "drizzle-zod";
import { z } from "zod";

import {
  knosiaCanvas,
  knosiaCanvasBlock,
  knosiaCanvasAlert,
} from "@turbostarter/db/schema";

import { workspaceIdSchema, knosiaIdSchema } from "../shared-schemas";

// ============================================================================
// BASE SCHEMAS FROM DRIZZLE
// ============================================================================

export const canvasSchema = createSelectSchema(knosiaCanvas);
export const insertCanvasSchema = createInsertSchema(knosiaCanvas);

export const canvasBlockSchema = createSelectSchema(knosiaCanvasBlock);
export const insertCanvasBlockSchema = createInsertSchema(knosiaCanvasBlock);

export const canvasAlertSchema = createSelectSchema(knosiaCanvasAlert);
export const insertCanvasAlertSchema = createInsertSchema(knosiaCanvasAlert);

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const createCanvasInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
});

export const updateCanvasInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  layout: z.object({
    type: z.enum(["grid", "freeform"]),
    columns: z.number().optional(),
    rows: z.number().optional(),
  }).optional(),
});

export const getCanvasesInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  status: z.enum(["draft", "active", "archived"]).optional(),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(20),
});

export const generateCanvasInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  prompt: z.string().min(1).max(2000),
  roleId: knosiaIdSchema.optional(),
});

export const editCanvasInputSchema = z.object({
  instruction: z.string().min(1).max(2000),
});

// ============================================================================
// BLOCK SCHEMAS
// ============================================================================

export const blockConfigSchema = z.object({
  liquidRenderType: z.string().optional(),
  liquidRenderConfig: z.unknown().optional(),
  customStyles: z.record(z.string(), z.string()).optional(),
});

export const positionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
});

export const createBlockInputSchema = z.object({
  canvasId: knosiaIdSchema,
  type: z.enum([
    "kpi", "line_chart", "bar_chart", "area_chart", "pie_chart", "table",
    "hero_metric", "watch_list", "comparison", "insight", "text",
  ]),
  title: z.string().max(255).optional(),
  position: positionSchema,
  config: blockConfigSchema.optional(),
  dataSource: z.object({
    type: z.enum(["vocabulary", "query", "static"]),
    vocabularyId: z.string().optional(),
    sql: z.string().optional(),
    staticData: z.unknown().optional(),
  }).optional(),
});

export const updateBlockInputSchema = z.object({
  title: z.string().max(255).optional(),
  position: positionSchema.optional(),
  config: blockConfigSchema.optional(),
  dataSource: z.object({
    type: z.enum(["vocabulary", "query", "static"]),
    vocabularyId: z.string().optional(),
    sql: z.string().optional(),
    staticData: z.unknown().optional(),
  }).optional(),
  cachedData: z.unknown().optional(),
});

export const reorderBlocksInputSchema = z.object({
  canvasId: knosiaIdSchema,
  blocks: z.array(z.object({
    id: knosiaIdSchema,
    position: positionSchema,
  })),
});

// ============================================================================
// ALERT SCHEMAS
// ============================================================================

export const alertConditionSchema = z.object({
  metric: z.string(),
  operator: z.enum(["gt", "lt", "eq", "gte", "lte", "change_gt", "change_lt"]),
  threshold: z.number(),
  timeWindow: z.string().optional(),
});

export const createAlertInputSchema = z.object({
  canvasId: knosiaIdSchema,
  blockId: knosiaIdSchema.optional(),
  name: z.string().min(1).max(255),
  condition: alertConditionSchema,
  channels: z.array(z.enum(["in_app", "email", "slack"])).default(["in_app"]),
});

export const updateAlertInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  condition: alertConditionSchema.optional(),
  channels: z.array(z.enum(["in_app", "email", "slack"])).optional(),
  enabled: z.boolean().optional(),
});

// ============================================================================
// AI GENERATION SCHEMAS
// ============================================================================

/**
 * Schema for AI-generated block specifications
 */
export const generatedBlockSpecSchema = z.object({
  type: z.enum([
    "kpi", "line_chart", "bar_chart", "area_chart", "pie_chart", "table",
    "hero_metric", "watch_list", "comparison", "insight", "text",
  ]),
  title: z.string(),
  position: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    w: z.number().min(1), // width in columns
    h: z.number().min(1), // height in rows
  }),
  config: z.record(z.string(), z.unknown()).optional(),
  dataSource: z.object({
    type: z.enum(["query", "vocabulary", "static"]),
    vocabularyItemId: z.string().optional(),
    query: z.string().optional(),
  }).optional(),
});

/**
 * Schema for AI edit change specification
 */
export const canvasEditChangeSchema = z.object({
  type: z.enum(["add", "update", "remove"]),
  block: generatedBlockSpecSchema.optional(), // For add
  blockId: z.string().optional(), // For update/remove
  updates: z.object({
    title: z.string().optional(),
    position: z.object({
      x: z.number().min(0).optional(),
      y: z.number().min(0).optional(),
      w: z.number().min(1).optional(),
      h: z.number().min(1).optional(),
    }).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    dataSource: z.object({
      type: z.enum(["query", "vocabulary", "static"]).optional(),
      vocabularyItemId: z.string().optional(),
      query: z.string().optional(),
    }).optional(),
  }).optional(), // For update
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Canvas = z.infer<typeof canvasSchema>;
export type InsertCanvas = z.infer<typeof insertCanvasSchema>;
export type CreateCanvasInput = z.infer<typeof createCanvasInputSchema>;
export type UpdateCanvasInput = z.infer<typeof updateCanvasInputSchema>;
export type GetCanvasesInput = z.infer<typeof getCanvasesInputSchema>;
export type GenerateCanvasInput = z.infer<typeof generateCanvasInputSchema>;
export type EditCanvasInput = z.infer<typeof editCanvasInputSchema>;

export type GeneratedBlockSpec = z.infer<typeof generatedBlockSpecSchema>;
export type CanvasEditChange = z.infer<typeof canvasEditChangeSchema>;

export type CanvasBlock = z.infer<typeof canvasBlockSchema>;
export type InsertCanvasBlock = z.infer<typeof insertCanvasBlockSchema>;
export type CreateBlockInput = z.infer<typeof createBlockInputSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockInputSchema>;
export type ReorderBlocksInput = z.infer<typeof reorderBlocksInputSchema>;

export type CanvasAlert = z.infer<typeof canvasAlertSchema>;
export type InsertCanvasAlert = z.infer<typeof insertCanvasAlertSchema>;
export type CreateAlertInput = z.infer<typeof createAlertInputSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertInputSchema>;
