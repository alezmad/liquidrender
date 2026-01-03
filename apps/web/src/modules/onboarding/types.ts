/**
 * Knosia Onboarding Types
 *
 * Frontend types for the onboarding flow.
 */

// =============================================================================
// DATABASE CONNECTION TYPES
// =============================================================================

/** Database types supported by Knosia */
export type ConnectionType =
  | "postgres"
  | "mysql"
  | "snowflake"
  | "bigquery"
  | "redshift"
  | "duckdb";

/** Connection health status */
export type ConnectionStatus = "connected" | "error" | "stale";

/** Database type with display info for UI */
export interface DatabaseOption {
  id: ConnectionType;
  label: string;
  icon: string;
  defaultPort?: number;
}

/** Connection form field values */
export interface ConnectionFormValues {
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema?: string;
  ssl?: boolean;
}

/** Connection test result */
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  latencyMs?: number;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/** Connection with health info */
export interface ConnectionWithHealth {
  id: string;
  orgId: string;
  name: string;
  type: ConnectionType;
  host: string;
  port: number | null;
  database: string;
  schema: string | null;
  sslEnabled: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  health: {
    status: ConnectionStatus;
    lastCheck: Date | null;
    errorMessage: string | null;
    latencyMs: number | null;
  } | null;
}

// =============================================================================
// ONBOARDING STEP TYPES
// =============================================================================

/** Onboarding route steps */
export type OnboardingStep =
  | "connect"
  | "review"
  | "role"
  | "confirm"
  | "ready";

/** Step configuration for progress indicator */
export interface OnboardingStepConfig {
  id: OnboardingStep;
  label: string;
  path: string;
}

// =============================================================================
// ANALYSIS SSE TYPES
// =============================================================================

/** SSE step event from analysis */
export interface StepEvent {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  status: "started" | "completed";
  label: string;
  detail?: string;
}

/** SSE complete event from analysis */
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
  confirmations?: unknown[];
  profiling?: {
    tablesProfiled: number;
    tablesSkipped: number;
    duration: number;
    tier1Duration: number;
    tier2Duration: number;
  };
}

/** SSE error event from analysis */
export interface ErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
}

/** Union type for all SSE events */
export type AnalysisSSEEvent =
  | { event: "step"; data: StepEvent }
  | { event: "complete"; data: CompleteEvent }
  | { event: "error"; data: ErrorEvent };

// =============================================================================
// ANALYSIS PROGRESS TYPES
// =============================================================================

/** Analysis step for progress display */
export interface AnalysisStep {
  id: number;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  detail?: string;
}

/** Analysis progress state */
export interface AnalysisProgress {
  steps: AnalysisStep[];
  currentStep: number;
  isComplete: boolean;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

/** Detected business type from analysis */
export interface DetectedBusinessType {
  detected: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ type: string; confidence: number }>;
}

/** Analysis summary */
export interface AnalysisSummary {
  tables: number;
  metrics: number;
  dimensions: number;
  entities: string[];
}

/** Analysis result after completion */
export interface AnalysisResult {
  analysisId: string;
  summary: AnalysisSummary;
  businessType: DetectedBusinessType;
  confirmations?: VocabularyConfirmation[];
  profiling?: {
    tablesProfiled: number;
    tablesSkipped: number;
    duration: number;
    tier1Duration: number;
    tier2Duration: number;
  };
}

// =============================================================================
// ROLE SELECTION TYPES
// =============================================================================

/** User role for personalization */
export type UserRole =
  | "executive"
  | "finance"
  | "sales"
  | "marketing"
  | "product"
  | "support";

/** Role option with display info */
export interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
  icon?: string;
}

// =============================================================================
// VOCABULARY CONFIRMATION TYPES
// =============================================================================

/** Category for grouping confirmation questions */
export type ConfirmationCategory = "revenue" | "customers" | "time" | "other";

/** Option in a confirmation question */
export interface ConfirmationOption {
  id: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

/** A vocabulary confirmation question */
export interface VocabularyConfirmation {
  id: string;
  question: string;
  category: ConfirmationCategory;
  options: ConfirmationOption[];
  currentValue?: string;
}

/** User's answer to a confirmation question */
export interface ConfirmationAnswer {
  questionId: string;
  selectedOptionId: string;
  customValue?: string;
}

// =============================================================================
// ONBOARDING STATE
// =============================================================================

/** Progress stored in localStorage for session continuity */
export interface OnboardingProgress {
  /** Legacy single connection - keep for backward compatibility */
  connectionId: string | null;

  /** Multi-connection support */
  connectionIds: string[];
  primaryConnectionId: string | null;

  analysisId: string | null;
  workspaceId: string | null;
  selectedRole: UserRole | null;
  answers: ConfirmationAnswer[];
  completedSteps: OnboardingStep[];
}

/** Default empty progress state */
export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  connectionId: null,
  connectionIds: [],
  primaryConnectionId: null,
  analysisId: null,
  workspaceId: null,
  selectedRole: null,
  answers: [],
  completedSteps: [],
};

// =============================================================================
// CONNECTION SUMMARY TYPES (for multi-connection display)
// =============================================================================

/** Connection summary for display in summary screen */
export interface ConnectionSummary {
  id: string;
  type: ConnectionType;
  name: string;
  host: string;
  port: number;
  database: string;
  tablesCount: number;
  status: "connected" | "error";
  connectedAt: Date;
}

/** Storage key for onboarding progress */
export const ONBOARDING_STORAGE_KEY = "knosia-onboarding";

// =============================================================================
// BRIEFING PREVIEW TYPES (for ready step)
// =============================================================================

/** KPI item for briefing preview */
export interface BriefingKPI {
  id: string;
  label: string;
  value: string;
  trend?: {
    direction: "up" | "down" | "flat";
    value: string;
    isPositive: boolean;
  };
}

/** Alert item for briefing preview */
export interface BriefingAlert {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
}

/** Briefing preview data for ready step */
export interface BriefingPreview {
  greeting: string;
  kpis: BriefingKPI[];
  alerts: BriefingAlert[];
}
