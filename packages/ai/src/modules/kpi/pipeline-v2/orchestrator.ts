/**
 * KPI Pipeline V2 Orchestrator
 *
 * Coordinates the cognitive decomposition pipeline:
 * ANALYZE (Code) → PLAN (Opus) → GENERATE (Sonnet, parallel) → VALIDATE (Code) → REPAIR (Escalating)
 *
 * Key principles:
 * 1. Intelligence at the top (Opus planning) prevents expensive repairs
 * 2. Type-specific generation prompts reduce errors
 * 3. Escalating repair (Haiku → Sonnet → Opus) optimizes cost
 */

import { generateId } from '@turbostarter/shared/utils';
import type {
  PipelineInput,
  PipelineOutput,
  PipelineConfig,
  PipelineMetrics,
  PhaseMetrics,
  KPIPlan,
  KPIResult,
  GenerationResult,
  ValidationResult,
  KPIFinalStatus,
  PipelineProgressEvent,
} from './types';
import {
  analyzeSchema,
  analyzeCoverage,
  detectPatterns,
  formatSchemaAnalysisForPrompt,
  formatPatternsForPrompt,
  formatCoverageForPrompt,
  type SchemaAnalysis,
  type CoverageAnalysis,
  type DetectedPattern,
  type TableSchema,
} from '../schema-intelligence';
import { generateKPIs as generateKPIsImpl } from './generate';
import { planKPIs } from './plan';
import { repairKPIs as repairKPIsImpl } from './repair';
import { validateKPIs as validateKPIsImpl } from './validate';

// ============================================================================
// Model Configuration
// ============================================================================

export const MODEL_IDS = {
  // Use Sonnet for planning (Opus may not be available in all accounts)
  plan: 'claude-sonnet-4-5-20250929',
  generate: 'claude-sonnet-4-5-20250929',
  repairHaiku: 'claude-3-5-haiku-20241022',
  repairSonnet: 'claude-sonnet-4-5-20250929',
  repairOpus: 'claude-sonnet-4-5-20250929',  // Fallback to Sonnet if Opus unavailable
} as const;

/**
 * PHASE 2: GENERATE - Use Sonnet with type-specific prompts
 *
 * @param plans - Planned KPIs from PLAN phase
 * @param schemaContext - Schema markdown for prompts
 * @param config - Pipeline configuration
 * @returns Generated DSL definitions
 */
async function generateKPIs(
  plans: KPIPlan[],
  schemaContext: string,
  config: PipelineConfig
): Promise<{ results: GenerationResult[]; metrics: PhaseMetrics }> {
  // Delegate to the generate module implementation
  return generateKPIsImpl(plans, schemaContext, config);
}

/**
 * PHASE 3: VALIDATE - Schema, compile, execute, value checks
 *
 * Validates each KPI through sequential gates:
 * 1. Schema validation (Zod)
 * 2. Compilation (SQL generation)
 * 3. Execution (optional, requires DB connection)
 * 4. Value validation (optional, business sense)
 *
 * @param results - Generated KPIs from GENERATE phase
 * @param config - Pipeline configuration
 * @returns Validation results for each KPI
 */
async function validateKPIs(
  results: GenerationResult[],
  config: PipelineConfig
): Promise<{ validations: ValidationResult[]; metrics: PhaseMetrics }> {
  // Delegate to the validate module implementation
  return validateKPIsImpl(results, config);
}

/**
 * PHASE 4: REPAIR - Escalating model repair
 *
 * Uses three-tier model escalation:
 * - Haiku: Quick syntax fixes (90% of repairs)
 * - Sonnet: Approach rethinking (9% of repairs)
 * - Opus: Deep reasoning for edge cases (1% of repairs)
 *
 * @param failed - Failed validations that need repair
 * @param schemaContext - Schema markdown for repair prompts
 * @param config - Pipeline configuration
 * @returns Repaired KPIs
 */
async function repairKPIs(
  failed: ValidationResult[],
  schemaContext: string,
  config: PipelineConfig
): Promise<{ results: KPIResult[]; metrics: PhaseMetrics }> {
  // Delegate to the repair module implementation
  return repairKPIsImpl(failed, schemaContext, config);
}

// ============================================================================
// Schema Context Builder
// ============================================================================

/**
 * Build combined schema context markdown for LLM prompts.
 *
 * Combines schema analysis, patterns, and coverage into a single
 * markdown document that provides comprehensive context for
 * KPI generation and repair.
 */
function buildSchemaContext(
  schemaAnalysis: SchemaAnalysis,
  coverageAnalysis: CoverageAnalysis,
  patterns: DetectedPattern[]
): string {
  const sections: string[] = [];

  // Add schema analysis
  sections.push(formatSchemaAnalysisForPrompt(schemaAnalysis));

  // Add detected patterns
  if (patterns.length > 0) {
    sections.push(formatPatternsForPrompt(patterns));
  }

  // Add coverage requirements
  sections.push(formatCoverageForPrompt(coverageAnalysis));

  return sections.join('\n\n');
}

// ============================================================================
// Progress Reporting
// ============================================================================

function emitProgress(
  config: PipelineConfig,
  event: PipelineProgressEvent
): void {
  if (config.onProgress) {
    config.onProgress(event);
  }
  if (config.debug) {
    console.log(`[V2 Pipeline] ${event.phase}: ${event.status} - ${event.message}`);
  }
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Run the full V2 KPI generation pipeline.
 *
 * @param input - Pipeline input with schema analysis and configuration
 * @returns Pipeline output with all KPI results and metrics
 */
export async function generateKPIsV2(
  input: PipelineInput
): Promise<PipelineOutput> {
  const runId = generateId();
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const { schemaAnalysis, coverageAnalysis, patterns, config, plans: preDefinedPlans } = input;

  // Initialize metrics
  const phases: PipelineMetrics['phases'] = {};
  const allResults: KPIResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // ========================================================================
    // PHASE 1: PLAN (unless pre-defined plans provided)
    // ========================================================================
    let plans: KPIPlan[];

    if (preDefinedPlans && preDefinedPlans.length > 0) {
      emitProgress(config, {
        phase: 'plan',
        status: 'completed',
        message: `Using ${preDefinedPlans.length} pre-defined plans`,
      });
      plans = preDefinedPlans;
    } else if (config.phases?.skipPlan) {
      emitProgress(config, {
        phase: 'plan',
        status: 'completed',
        message: 'Plan phase skipped',
      });
      plans = [];
    } else {
      emitProgress(config, {
        phase: 'plan',
        status: 'started',
        message: 'Planning KPIs with Opus...',
      });

      const planResult = await planKPIs(schemaAnalysis, coverageAnalysis, patterns, config);
      plans = planResult.plans;
      phases.plan = planResult.metrics;

      emitProgress(config, {
        phase: 'plan',
        status: 'completed',
        message: `Planned ${plans.length} KPIs`,
        data: { total: plans.length },
      });
    }

    if (plans.length === 0) {
      warnings.push('No KPIs were planned. Check schema analysis for issues.');
      return buildOutput(allResults, phases, runId, startedAt, errors, warnings);
    }

    // ========================================================================
    // PHASE 2: GENERATE
    // ========================================================================
    emitProgress(config, {
      phase: 'generate',
      status: 'started',
      message: `Generating DSL for ${plans.length} KPIs...`,
      data: { total: plans.length },
    });

    // Build schema context for generation prompts
    const schemaContext = buildSchemaContext(schemaAnalysis, coverageAnalysis, patterns);

    const generateResult = await generateKPIs(plans, schemaContext, config);
    phases.generate = generateResult.metrics;

    emitProgress(config, {
      phase: 'generate',
      status: 'completed',
      message: `Generated ${generateResult.results.length} KPI definitions`,
      data: { completed: generateResult.results.length, total: plans.length },
    });

    if (generateResult.results.length === 0) {
      errors.push('Generation phase produced no results');
      return buildOutput(allResults, phases, runId, startedAt, errors, warnings);
    }

    // ========================================================================
    // PHASE 3: VALIDATE
    // ========================================================================
    if (config.phases?.skipValidate) {
      emitProgress(config, {
        phase: 'validate',
        status: 'completed',
        message: 'Validation phase skipped (dangerous!)',
      });
      warnings.push('Validation was skipped - results may be invalid');

      // Convert all to valid results without validation
      for (const gen of generateResult.results) {
        allResults.push({
          status: 'valid',
          plan: gen.plan,
          definition: gen.definition,
          repairAttempts: [],
          totalLatencyMs: 0,
        });
      }
    } else {
      emitProgress(config, {
        phase: 'validate',
        status: 'started',
        message: `Validating ${generateResult.results.length} KPIs...`,
        data: { total: generateResult.results.length },
      });

      const validateResult = await validateKPIs(generateResult.results, config);
      phases.validate = validateResult.metrics;

      const validResults = validateResult.validations.filter(v => v.valid);
      const failedResults = validateResult.validations.filter(v => !v.valid);

      emitProgress(config, {
        phase: 'validate',
        status: 'completed',
        message: `${validResults.length} valid, ${failedResults.length} need repair`,
        data: { completed: validResults.length, total: validateResult.validations.length },
      });

      // Add valid results
      for (const valid of validResults) {
        allResults.push({
          status: 'valid',
          plan: valid.generation.plan,
          definition: valid.generation.definition,
          sql: valid.executionResult?.sql,
          value: valid.executionResult?.value,
          repairAttempts: [],
          totalLatencyMs: valid.latencyMs,
        });
      }

      // ======================================================================
      // PHASE 4: REPAIR (if needed)
      // ======================================================================
      if (failedResults.length > 0 && !config.phases?.skipRepair) {
        emitProgress(config, {
          phase: 'repair',
          status: 'started',
          message: `Repairing ${failedResults.length} failed KPIs...`,
          data: { total: failedResults.length },
        });

        const repairResult = await repairKPIs(failedResults, schemaContext, config);
        phases.repair = repairResult.metrics;

        allResults.push(...repairResult.results);

        const repaired = repairResult.results.filter(r => r.status === 'repaired').length;
        const needsReview = repairResult.results.filter(r => r.status === 'needs-review').length;

        emitProgress(config, {
          phase: 'repair',
          status: 'completed',
          message: `${repaired} repaired, ${needsReview} need review`,
          data: { completed: repaired, total: failedResults.length },
        });
      } else if (failedResults.length > 0) {
        // Repair skipped - mark all as needs-review
        for (const failed of failedResults) {
          allResults.push({
            status: 'needs-review',
            plan: failed.generation.plan,
            errors: failed.errors,
            repairAttempts: [],
            totalLatencyMs: failed.latencyMs,
          });
        }
        warnings.push(`Repair phase skipped - ${failedResults.length} KPIs marked as needs-review`);
      }
    }

    return buildOutput(allResults, phases, runId, startedAt, errors, warnings);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Pipeline failed: ${errorMessage}`);

    return buildOutput(allResults, phases, runId, startedAt, errors, warnings);
  }
}

// ============================================================================
// Output Builder
// ============================================================================

function buildOutput(
  results: KPIResult[],
  phases: PipelineMetrics['phases'],
  runId: string,
  startedAt: string,
  errors: string[],
  warnings: string[]
): PipelineOutput {
  const completedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - new Date(startedAt).getTime();

  // Group by status
  const byStatus = {
    valid: results.filter(r => r.status === 'valid'),
    repaired: results.filter(r => r.status === 'repaired'),
    needsReview: results.filter(r => r.status === 'needs-review'),
    infeasible: results.filter(r => r.status === 'infeasible'),
  };

  // Calculate summary
  const planned = results.length;
  const validFirstTry = byStatus.valid.length;
  const neededRepair = byStatus.repaired.length + byStatus.needsReview.length;
  const repaired = byStatus.repaired.length;
  const failed = byStatus.needsReview.length;

  // Calculate token usage
  const tokenUsage = {
    totalIn: 0,
    totalOut: 0,
    byModel: {} as Record<string, { in: number; out: number }>,
  };

  for (const phase of Object.values(phases)) {
    if (phase) {
      tokenUsage.totalIn += phase.tokensIn;
      tokenUsage.totalOut += phase.tokensOut;
      for (const model of phase.models) {
        if (!tokenUsage.byModel[model]) {
          tokenUsage.byModel[model] = { in: 0, out: 0 };
        }
        // Note: This is approximate - actual per-model tracking happens in phase implementations
      }
    }
  }

  const metrics: PipelineMetrics = {
    runId,
    startedAt,
    completedAt,
    totalDurationMs,
    phases,
    summary: {
      planned,
      validFirstTry,
      neededRepair,
      repaired,
      failed,
      repairRate: planned > 0 ? neededRepair / planned : 0,
      successRate: planned > 0 ? (validFirstTry + repaired) / planned : 0,
    },
    tokenUsage,
  };

  return {
    results,
    metrics,
    byStatus,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Run ANALYZE phase (Phase 0) to prepare input for the pipeline.
 *
 * This is a convenience function that runs the schema intelligence
 * modules to prepare the PipelineInput.
 */
export async function analyzeForPipeline(
  tables: TableSchema[],
  _businessType: string
): Promise<{
  schemaAnalysis: SchemaAnalysis;
  coverageAnalysis: CoverageAnalysis;
  patterns: DetectedPattern[];
}> {
  // Run schema analysis
  const schemaAnalysis = analyzeSchema(tables);

  // Detect patterns
  const patterns = detectPatterns(tables);

  // Analyze coverage requirements (business type is inferred from schema)
  const coverageAnalysis = analyzeCoverage(schemaAnalysis);

  return {
    schemaAnalysis,
    coverageAnalysis,
    patterns,
  };
}

/**
 * Create default pipeline configuration.
 */
export function createPipelineConfig(
  connectionId: string,
  dialect: 'postgresql' | 'mysql' | 'duckdb',
  businessType: string,
  options?: Partial<PipelineConfig>
): PipelineConfig {
  return {
    connectionId,
    dialect,
    businessType,
    maxKPIs: 20,
    maxRepairAttempts: {
      haiku: 2,
      sonnet: 1,
      opus: 1,
    },
    timeouts: {
      plan: 60000,      // 1 minute
      generate: 120000, // 2 minutes
      validate: 60000,  // 1 minute
      repair: 180000,   // 3 minutes
    },
    debug: false,
    ...options,
  };
}
