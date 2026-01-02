import { z } from "zod";

import { connectionIdSchema } from "../shared-schemas";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const runAnalysisSchema = z.object({
  connectionId: connectionIdSchema,
});

export const getAnalysisSchema = z.object({
  id: z.string(),
});

// ============================================================================
// SSE EVENT TYPES
// ============================================================================

export interface StepEvent {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  status: "started" | "completed";
  label: string;
  detail?: string;
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
}

export interface ErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
}

// Union type for all SSE events
export type AnalysisSSEEvent =
  | { event: "step"; data: StepEvent }
  | { event: "complete"; data: CompleteEvent }
  | { event: "error"; data: ErrorEvent };

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RunAnalysisInput = z.infer<typeof runAnalysisSchema>;
export type GetAnalysisInput = z.infer<typeof getAnalysisSchema>;
