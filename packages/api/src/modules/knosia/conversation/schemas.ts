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

export const conversationQueryInputSchema = z.object({
  query: z.string().min(1).max(1000),
  connectionId: connectionIdSchema,
  workspaceId: workspaceIdSchema,
  context: queryContextSchema.optional(),
});

export const clarifyInputSchema = z.object({
  queryId: z.string(),
  selectedOptionId: z.string(),
  remember: z.boolean().optional().default(false),
});

export const getConversationInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
});

export const getConversationsInputSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(20),
  status: z.enum(["active", "archived", "shared"]).optional(),
});

export const getConversationMessagesInputSchema = z.object({
  conversationId: z.string(),
  userId: z.string(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
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

export interface ConversationResponse {
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
// TYPE EXPORTS
// ============================================================================

export type Filter = z.infer<typeof filterSchema>;
export type QueryContext = z.infer<typeof queryContextSchema>;
export type ConversationQueryInput = z.infer<typeof conversationQueryInputSchema>;
export type ClarifyInput = z.infer<typeof clarifyInputSchema>;
export type GetConversationInput = z.infer<typeof getConversationInputSchema>;
export type GetConversationsInput = z.infer<typeof getConversationsInputSchema>;
export type GetConversationMessagesInput = z.infer<typeof getConversationMessagesInputSchema>;
