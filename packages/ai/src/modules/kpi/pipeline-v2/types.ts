/**
 * KPI Pipeline V2 Types
 *
 * Cognitive decomposition architecture:
 * ANALYZE (Code) → PLAN (Opus) → GENERATE (Sonnet, parallel) → VALIDATE (Code) → REPAIR (Escalating)
 */

import type { SchemaAnalysis, CoverageAnalysis, DetectedPattern } from '../schema-intelligence';
import type { ExtendedKPISemanticDefinitionType } from '../types';

// ============================================================================
// KPI Types (for planning)
// ============================================================================

/**
 * The types of KPIs that can be generated.
 * Maps to the extended KPI semantic definition types.
 */
export type KPIType =
  | 'simple'      // Single aggregation (SUM, COUNT, AVG, etc.)
  | 'ratio'       // Numerator / denominator
  | 'derived'     // References other KPIs
  | 'filtered'    // Subquery with groupBy/having
  | 'window'      // Window functions (LAG, running totals)
  | 'case'        // CASE WHEN expressions
  | 'composite';  // Multi-table JOINs

// ============================================================================
// PLAN Phase Types
// ============================================================================

/**
 * Column hints provided by the planning phase.
 * Guides the generation phase on which columns to use.
 */
export interface KPIPlanColumns {
  /** For simple: the expression to aggregate */
  expression?: string;
  /** For simple: aggregation hint (SUM, AVG, COUNT, etc.) */
  aggregation?: string;
  /** For ratio: numerator expression */
  numerator?: string;
  /** For ratio: denominator expression */
  denominator?: string;
  /** For filtered: groupBy field(s) */
  groupBy?: string | string[];
  /** For filtered: HAVING condition */
  having?: string;
  /** For filtered: percentOf expression */
  percentOf?: string;
  /** For window: partition fields */
  partitionBy?: string[];
  /** For window: order fields */
  orderBy?: string[];
  /** For composite: source tables */
  sources?: string[];
  /** Time field for time-series */
  timeField?: string;
  /** Time-series grain (hour, day, week, month, quarter, year) - REQUIRED for Monthly/Daily/Weekly KPIs */
  grain?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  /** Filter conditions */
  filters?: string[];
}

/**
 * Output of PLAN phase - a planned KPI before DSL generation.
 *
 * This is what Opus produces: business reasoning about what KPIs
 * to build and how, without the precise DSL structure.
 */
export interface KPIPlan {
  /** Business-friendly name (e.g., "Average Order Value") */
  name: string;

  /** What this KPI measures */
  description: string;

  /** Why this KPI matters to the business */
  businessValue: string;

  /** The DSL type to use for generation */
  type: KPIType;

  /** Reasoning for why this type was chosen */
  typeRationale: string;

  /** Key columns identified for the KPI */
  columns: KPIPlanColumns;

  /** Source entity (table) */
  entity: string;

  /** Business category */
  category: 'revenue' | 'growth' | 'retention' | 'engagement' | 'efficiency' |
            'fulfillment' | 'inventory' | 'finance' | 'pricing' | 'logistics' |
            'operational' | 'risk' | 'custom';

  /** Display format */
  format?: {
    type: 'number' | 'currency' | 'percent' | 'duration';
    decimals?: number;
    currency?: string;
  };

  /** Planner's confidence in this KPI (0-1) */
  confidence: number;

  /** Optional: aggregation hint from planner */
  aggregation?: string;
}

// ============================================================================
// GENERATE Phase Types
// ============================================================================

/**
 * Output of GENERATE phase - a generated KPI with DSL definition.
 */
export interface GenerationResult {
  /** Original plan this was generated from */
  plan: KPIPlan;

  /** Generated DSL definition */
  definition: ExtendedKPISemanticDefinitionType;

  /** Display metadata */
  metadata: {
    name: string;
    description: string;
    category: string;
    format?: {
      type: 'number' | 'currency' | 'percent' | 'duration';
      decimals?: number;
      currency?: string;
    };
  };

  /** Generation model used */
  model: string;

  /** Prompt template used */
  promptName: string;

  /** Prompt version */
  promptVersion: string;

  /** Generation latency in ms */
  latencyMs: number;

  /** Tokens used */
  tokensIn: number;
  tokensOut: number;
}

// ============================================================================
// VALIDATE Phase Types
// ============================================================================

/**
 * Validation error with context for repair.
 */
export interface ValidationError {
  /** Stage where validation failed */
  stage: 'schema' | 'compile' | 'execute' | 'value';

  /** Error code for categorization */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional context for repair */
  context?: {
    /** Field that failed validation */
    field?: string;
    /** Expected value or pattern */
    expected?: string;
    /** Actual value received */
    actual?: string;
    /** SQL that failed (for compile/execute) */
    sql?: string;
    /** Database error (for execute) */
    dbError?: string;
  };
}

/**
 * Validation warning (non-fatal issue).
 */
export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Output of VALIDATE phase.
 */
export interface ValidationResult {
  /** Whether all validation passed */
  valid: boolean;

  /** The generated result being validated */
  generation: GenerationResult;

  /** Errors that must be fixed */
  errors: ValidationError[];

  /** Warnings (non-fatal) */
  warnings: ValidationWarning[];

  /** If executed successfully, the result value */
  executionResult?: {
    value: unknown;
    rowCount?: number;
    sql: string;
  };

  /** Validation latency in ms */
  latencyMs: number;
}

// ============================================================================
// REPAIR Phase Types
// ============================================================================

/**
 * Repair model tier.
 */
export type RepairTier = 'haiku' | 'sonnet' | 'opus';

/**
 * A single repair attempt.
 */
export interface RepairAttempt {
  /** Which tier was used */
  tier: RepairTier;

  /** Model ID used */
  model: string;

  /** Prompt used for repair */
  prompt: string;

  /** The repaired definition (if successful) */
  repairedDefinition?: ExtendedKPISemanticDefinitionType;

  /** Whether this attempt succeeded */
  success: boolean;

  /** Error if repair failed */
  error?: string;

  /** Latency in ms */
  latencyMs: number;

  /** Tokens used */
  tokensIn: number;
  tokensOut: number;
}

/**
 * Final status of a KPI after repair attempts.
 */
export type KPIFinalStatus =
  | 'valid'           // Passed validation on first try
  | 'repaired'        // Failed initially but repaired
  | 'needs-review'    // All repair attempts failed
  | 'infeasible';     // Cannot be calculated from schema

/**
 * Complete result for a single KPI after all phases.
 */
export interface KPIResult {
  /** Final status */
  status: KPIFinalStatus;

  /** Original plan */
  plan: KPIPlan;

  /** Final definition (if valid or repaired) */
  definition?: ExtendedKPISemanticDefinitionType;

  /** Final compiled SQL (if valid or repaired) */
  sql?: string;

  /** Execution result (if valid or repaired) */
  value?: unknown;

  /** Validation errors (if needs-review) */
  errors?: ValidationError[];

  /** Repair attempts made */
  repairAttempts: RepairAttempt[];

  /** Which tier successfully repaired (if repaired) */
  repairedBy?: RepairTier;

  /** Total time for this KPI through all phases */
  totalLatencyMs: number;
}

// ============================================================================
// Pipeline Configuration
// ============================================================================

/**
 * Configuration for pipeline execution.
 */
export interface PipelineConfig {
  /** Connection ID for database access */
  connectionId: string;

  /** Schema name (optional) */
  schema?: string;

  /** Database dialect */
  dialect: 'postgresql' | 'mysql' | 'duckdb';

  /** Business type for KPI suggestions */
  businessType: string;

  /** Maximum KPIs to plan */
  maxKPIs?: number;

  /** Enable/disable specific phases */
  phases?: {
    /** Skip PLAN phase (provide plans directly) */
    skipPlan?: boolean;
    /** Skip VALIDATE phase (dangerous) */
    skipValidate?: boolean;
    /** Skip REPAIR phase */
    skipRepair?: boolean;
  };

  /** Model overrides */
  models?: {
    plan?: string;
    generate?: string;
    repairHaiku?: string;
    repairSonnet?: string;
    repairOpus?: string;
  };

  /** Maximum repair attempts per tier */
  maxRepairAttempts?: {
    haiku?: number;
    sonnet?: number;
    opus?: number;
  };

  /** Timeout settings (ms) */
  timeouts?: {
    plan?: number;
    generate?: number;
    validate?: number;
    repair?: number;
  };

  /** Enable debug logging */
  debug?: boolean;

  /** Callback for progress updates */
  onProgress?: (event: PipelineProgressEvent) => void;
}

// ============================================================================
// Pipeline Metrics & Events
// ============================================================================

/**
 * Progress event for real-time updates.
 */
export interface PipelineProgressEvent {
  phase: 'analyze' | 'plan' | 'generate' | 'validate' | 'repair';
  status: 'started' | 'completed' | 'failed';
  message: string;
  data?: {
    kpiName?: string;
    progress?: number;  // 0-100
    total?: number;
    completed?: number;
  };
}

/**
 * Metrics for a single phase.
 */
export interface PhaseMetrics {
  /** Phase name */
  phase: string;

  /** Start time (ISO string) */
  startedAt: string;

  /** End time (ISO string) */
  completedAt: string;

  /** Duration in ms */
  durationMs: number;

  /** Items processed */
  itemsProcessed: number;

  /** Items that succeeded */
  itemsSucceeded: number;

  /** Items that failed */
  itemsFailed: number;

  /** Total tokens in */
  tokensIn: number;

  /** Total tokens out */
  tokensOut: number;

  /** Model(s) used */
  models: string[];
}

/**
 * Complete pipeline metrics.
 */
export interface PipelineMetrics {
  /** Pipeline run ID */
  runId: string;

  /** Start time */
  startedAt: string;

  /** End time */
  completedAt: string;

  /** Total duration */
  totalDurationMs: number;

  /** Per-phase metrics */
  phases: {
    analyze?: PhaseMetrics;
    plan?: PhaseMetrics;
    generate?: PhaseMetrics;
    validate?: PhaseMetrics;
    repair?: PhaseMetrics;
  };

  /** Summary statistics */
  summary: {
    /** Total KPIs planned */
    planned: number;
    /** KPIs that passed validation first try */
    validFirstTry: number;
    /** KPIs that needed repair */
    neededRepair: number;
    /** KPIs successfully repaired */
    repaired: number;
    /** KPIs that failed all repair attempts */
    failed: number;
    /** Repair rate (neededRepair / planned) */
    repairRate: number;
    /** Success rate ((validFirstTry + repaired) / planned) */
    successRate: number;
  };

  /** Token usage totals */
  tokenUsage: {
    totalIn: number;
    totalOut: number;
    byModel: Record<string, { in: number; out: number }>;
  };
}

// ============================================================================
// Pipeline Input/Output
// ============================================================================

/**
 * Input to the V2 pipeline.
 */
export interface PipelineInput {
  /** Schema analysis from Phase 0 (ANALYZE) */
  schemaAnalysis: SchemaAnalysis;

  /** Coverage analysis */
  coverageAnalysis: CoverageAnalysis;

  /** Detected patterns */
  patterns: DetectedPattern[];

  /** Pipeline configuration */
  config: PipelineConfig;

  /** Optional: pre-defined plans (skips PLAN phase) */
  plans?: KPIPlan[];
}

/**
 * Output from the V2 pipeline.
 */
export interface PipelineOutput {
  /** All KPI results */
  results: KPIResult[];

  /** Pipeline metrics */
  metrics: PipelineMetrics;

  /** Grouped by status for easy access */
  byStatus: {
    valid: KPIResult[];
    repaired: KPIResult[];
    needsReview: KPIResult[];
    infeasible: KPIResult[];
  };

  /** Any pipeline-level errors */
  errors?: string[];

  /** Any pipeline-level warnings */
  warnings?: string[];
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type {
  SchemaAnalysis,
  CoverageAnalysis,
  DetectedPattern,
} from '../schema-intelligence';

export type {
  ExtendedKPISemanticDefinitionType,
} from '../types';
