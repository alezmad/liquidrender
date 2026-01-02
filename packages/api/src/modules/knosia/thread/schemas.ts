import { z } from "zod";

import { connectionIdSchema, workspaceIdSchema } from "../shared-schemas";

// ============================================================================
// FILTER SCHEMA
// ============================================================================

export const filterSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]),
  value: z.unknown(),
});

// ============================================================================
// QUERY CONTEXT SCHEMA
// ============================================================================

export const queryContextSchema = z.object({
  pageId: z.string().optional(),
  filters: z.array(filterSchema).optional(),
  previousQueryId: z.string().optional(),
});

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const threadQueryInputSchema = z.object({
  query: z.string().min(1).max(1000),
  connectionId: connectionIdSchema,
  workspaceId: workspaceIdSchema,
  context: queryContextSchema.optional(),
});

export const clarifyInputSchema = z.object({
  queryId: z.string(),
  selectedOptionId: z.string(),
  remember: z.boolean().optional().default(false),
  workspaceId: workspaceIdSchema,
});

export const getThreadInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
});

export const getThreadsInputSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(20),
  status: z.enum(["active", "archived", "shared"]).optional(),
});

export const getThreadMessagesInputSchema = z.object({
  threadId: z.string(),
  userId: z.string(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const archiveThreadInputSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const workspaceIdQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface GroundingPathItem {
  id: string;
  label: string;
  vocabularyItemId: string;
}

export interface Grounding {
  path: GroundingPathItem[];
  interactive: true;
}

export interface VisualizationData {
  type: "bar" | "line" | "table" | "kpi" | "pie";
  title: string;
  data: unknown;
  sql?: string;
  grounding: Grounding;
}

export interface ExplanationFactor {
  title: string;
  description: string;
  grounding: string[];
}

export interface ExplanationData {
  summary: string;
  factors: ExplanationFactor[];
  visualization?: unknown;
}

export interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  preview?: string;
}

export interface ClarificationData {
  question: string;
  options: ClarificationOption[];
  rememberChoice: boolean;
}

export interface ErrorData {
  code?: string;
  message: string;
  alternatives?: string[];
  recoverable?: boolean;
}

export interface AppliedFilter {
  id: string;
  label: string;
  removable: boolean;
}

export interface ThreadResponse {
  queryId: string;
  type: "visualization" | "explanation" | "clarification" | "error";
  visualization?: VisualizationData;
  explanation?: ExplanationData;
  clarification?: ClarificationData;
  error?: ErrorData;
  suggestions: string[];
  appliedFilters: AppliedFilter[];
}

// ============================================================================
// FORK/SNAPSHOT/SHARE SCHEMAS
// ============================================================================

export const forkThreadInputSchema = z.object({
  fromMessageId: z.string().min(1),
  name: z.string().min(1).max(255),
});

export const createSnapshotInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const shareThreadInputSchema = z.object({
  userIds: z.array(z.string()).min(1),
  mode: z.enum(["view", "comment", "edit"]).default("view"),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Filter = z.infer<typeof filterSchema>;
export type QueryContext = z.infer<typeof queryContextSchema>;
export type ThreadQueryInput = z.infer<typeof threadQueryInputSchema>;
export type ClarifyInput = z.infer<typeof clarifyInputSchema>;
export type GetThreadInput = z.infer<typeof getThreadInputSchema>;
export type GetThreadsInput = z.infer<typeof getThreadsInputSchema>;
export type GetThreadMessagesInput = z.infer<typeof getThreadMessagesInputSchema>;
export type ForkThreadInput = z.infer<typeof forkThreadInputSchema>;
export type CreateSnapshotInput = z.infer<typeof createSnapshotInputSchema>;
export type ShareThreadInput = z.infer<typeof shareThreadInputSchema>;
