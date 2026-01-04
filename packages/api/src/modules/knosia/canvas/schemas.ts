import { z } from "zod";

// LiquidSchema validation (simplified - full validation in liquid-render)
export const liquidSchemaSchema = z.object({
  version: z.string(),
  layers: z.array(z.any()),
});

// Canvas scope
export const canvasScopeSchema = z.enum(["private", "workspace"]);

// Create canvas input
export const createCanvasInputSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(255),
  scope: canvasScopeSchema,
  schema: liquidSchemaSchema,
});

export type CreateCanvasInput = z.infer<typeof createCanvasInputSchema>;

// Update canvas input
export const updateCanvasInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  schema: liquidSchemaSchema.optional(),
  expectedVersion: z.number().int().positive(),
  changeSummary: z.string().max(500).optional(),
});

export type UpdateCanvasInput = z.infer<typeof updateCanvasInputSchema>;

// Change scope input
export const changeScopeInputSchema = z.object({
  scope: z.literal("workspace"),
});

export type ChangeScopeInput = z.infer<typeof changeScopeInputSchema>;

// List canvases query
export const listCanvasesQuerySchema = z.object({
  scope: canvasScopeSchema.optional(),
  includeDeleted: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

export type ListCanvasesQuery = z.infer<typeof listCanvasesQuerySchema>;

// List versions query
export const listVersionsQuerySchema = z.object({
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(50))
    .optional()
    .default("50"),
});

export type ListVersionsQuery = z.infer<typeof listVersionsQuerySchema>;
