import { z } from "zod";

import { connectionIdSchema, workspaceIdSchema } from "../shared-schemas";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const runAnalysisSchema = z.object({
  connectionId: connectionIdSchema,
  workspaceId: workspaceIdSchema.optional(),
  includeDataProfiling: z.boolean().optional().default(false),
});

export const triggerAnalysisInputSchema = z.object({
  connectionId: connectionIdSchema,
  workspaceId: workspaceIdSchema,
});

export const getAnalysisSchema = z.object({
  id: z.string(),
});

export const getTableProfileSchema = z.object({
  analysisId: z.string(),
  tableName: z.string(),
});

export const getProfilingSummarySchema = z.object({
  id: z.string(),
});

// ============================================================================
// SSE EVENT TYPES
// ============================================================================

export interface StepEvent {
  step: 1 | 2 | 3 | 4 | 4.5 | 5 | 6 | 7 | 8;
  status: "started" | "completed" | "warning";
  label: string;
  detail?: string;
  metrics?: {
    total: number;
    feasible: number;
    stored?: number; // Number of KPIs stored in vocabulary
    categories: string[];
    valueValidation?: {
      executed: number;
      valid: number;
      suspicious: number;
      invalid: number;
      executionErrors: number;
    };
  };
}

export interface CompleteEvent {
  analysisId: string;
  summary: {
    tables: number;
    metrics: number;
    dimensions: number;
    entities: string[];
  };
  businessType: {
    detected: string;
    confidence: number;
    reasoning: string;
    alternatives: Array<{ type: string; confidence: number }>;
  };
  confirmations?: unknown[]; // UVB confirmation questions for user
  profiling?: {
    tablesProfiled: number;
    tablesSkipped: number;
    duration: number;
    tier1Duration: number;
    tier2Duration: number;
  };
  querySuggestions?: {
    starterQuestions: Array<{
      question: string;
      category: string;
      difficulty: string;
      insight: string;
    }>;
    kpiQuestions: string[];
    trendQuestions: string[];
    breakdownQuestions: string[];
  };
  llmEnriched?: boolean; // Flag to indicate LLM enrichment was successful
  quickPreviewComplete?: boolean; // Flag to indicate quick preview done, background enrichment running
  backgroundEnrichmentPending?: number; // Number of fields still being enriched in background
}

export interface ErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface BackgroundEnrichmentEvent {
  totalFieldsEnriched: number;
  quickPreviewCount: number;
  backgroundEnrichCount: number;
}

// Union type for all SSE events
export type AnalysisSSEEvent =
  | { event: "step"; data: StepEvent }
  | { event: "complete"; data: CompleteEvent }
  | { event: "background_complete"; data: BackgroundEnrichmentEvent }
  | { event: "error"; data: ErrorEvent };

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RunAnalysisInput = z.infer<typeof runAnalysisSchema>;
export type GetAnalysisInput = z.infer<typeof getAnalysisSchema>;
export type GetTableProfileInput = z.infer<typeof getTableProfileSchema>;
export type GetProfilingSummaryInput = z.infer<typeof getProfilingSummarySchema>;
export type TriggerAnalysisInput = z.infer<typeof triggerAnalysisInputSchema>;
