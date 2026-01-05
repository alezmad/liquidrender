import { z } from "zod";
import { connectionIdSchema, workspaceIdSchema } from "../shared-schemas";

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const listMetricsSchema = z.object({
  workspaceId: workspaceIdSchema.optional(),
  connectionId: connectionIdSchema.optional(),
  category: z.enum(["revenue", "growth", "engagement", "operational", "other"]).optional(),
  status: z.enum(["active", "draft", "deprecated"]).optional(),
});

export const getMetricSchema = z.object({
  id: z.string(),
});

export const executeMetricSchema = z.object({
  useCache: z.boolean().optional().default(true),
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});

export const previewSQLSchema = z.object({
  dialect: z.enum(["postgres", "duckdb", "trino"]).optional().default("postgres"),
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createMetricSchema = z.object({
  workspaceId: workspaceIdSchema,
  connectionId: connectionIdSchema,
  name: z.string().min(1).max(255),
  category: z.enum(["revenue", "growth", "engagement", "operational", "other"]).optional(),
  description: z.string().optional(),
  semanticDefinition: z.object({
    type: z.enum(["simple", "derived", "cumulative"]),
    expression: z.string(),
    aggregation: z.enum(["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX"]).optional(),
    entity: z.string().optional(),
    timeField: z.string().optional(),
    timeGranularity: z.enum(["hour", "day", "week", "month", "quarter", "year"]).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })).optional(),
  }),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(["ai_generated", "user_created"]).default("user_created"),
});

export const updateMetricSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(["revenue", "growth", "engagement", "operational", "other"]).optional(),
  description: z.string().optional(),
  semanticDefinition: z.object({
    type: z.enum(["simple", "derived", "cumulative"]),
    expression: z.string(),
    aggregation: z.enum(["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX"]).optional(),
    entity: z.string().optional(),
    timeField: z.string().optional(),
    timeGranularity: z.enum(["hour", "day", "week", "month", "quarter", "year"]).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })).optional(),
  }).optional(),
  status: z.enum(["active", "draft", "deprecated"]).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListMetricsInput = z.infer<typeof listMetricsSchema>;
export type GetMetricInput = z.infer<typeof getMetricSchema>;
export type ExecuteMetricInput = z.infer<typeof executeMetricSchema>;
export type PreviewSQLInput = z.infer<typeof previewSQLSchema>;
export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;
