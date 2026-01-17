/**
 * KPI Pipeline V2
 *
 * Cognitive decomposition architecture for KPI generation:
 * ANALYZE (Code) → PLAN (Opus) → GENERATE (Sonnet, parallel) → VALIDATE (Code) → REPAIR (Escalating)
 *
 * @example
 * ```typescript
 * import {
 *   generateKPIsV2,
 *   analyzeForPipeline,
 *   createPipelineConfig,
 * } from './pipeline-v2';
 *
 * // Phase 0: Analyze schema
 * const { schemaAnalysis, coverageAnalysis, patterns } = await analyzeForPipeline(tables, 'ecommerce');
 *
 * // Run pipeline
 * const output = await generateKPIsV2({
 *   schemaAnalysis,
 *   coverageAnalysis,
 *   patterns,
 *   config: createPipelineConfig(connectionId, 'postgresql', 'ecommerce'),
 * });
 *
 * // Results
 * console.log(`Valid: ${output.byStatus.valid.length}`);
 * console.log(`Repaired: ${output.byStatus.repaired.length}`);
 * console.log(`Needs Review: ${output.byStatus.needsReview.length}`);
 * ```
 */

// Main orchestrator
export {
  generateKPIsV2,
  analyzeForPipeline,
  createPipelineConfig,
  MODEL_IDS,
} from './orchestrator';

// Plan phase
export {
  planKPIs,
  KPI_PLAN_PROMPT,
  PLAN_PROMPT_NAME,
  PLAN_PROMPT_VERSION,
  parseKPIPlanResponse,
} from './plan';

// Validate phase
export {
  validateKPIs,
  validateSchema,
  validateCompilation,
  validateSingle,
} from './validate';

// Repair phase
export {
  repairKPIs,
  tryHaikuRepair,
  trySonnetRepair,
  tryOpusRepair,
  repairSingleKPI,
  testCompilation,
  buildHaikuRepairPrompt,
  buildSonnetRepairPrompt,
  buildOpusRepairPrompt,
  HAIKU_REPAIR_PROMPT_NAME,
  HAIKU_REPAIR_PROMPT_VERSION,
  SONNET_REPAIR_PROMPT_NAME,
  SONNET_REPAIR_PROMPT_VERSION,
  OPUS_REPAIR_PROMPT_NAME,
  OPUS_REPAIR_PROMPT_VERSION,
  REPAIR_PROMPTS_CHANGELOG,
} from './repair';

// Types
export type {
  // Plan phase
  KPIType,
  KPIPlan,
  KPIPlanColumns,

  // Generate phase
  GenerationResult,

  // Validate phase
  ValidationResult,
  ValidationError,
  ValidationWarning,

  // Repair phase
  RepairTier,
  RepairAttempt,

  // Results
  KPIFinalStatus,
  KPIResult,

  // Configuration
  PipelineConfig,

  // Metrics
  PipelineMetrics,
  PhaseMetrics,
  PipelineProgressEvent,

  // Input/Output
  PipelineInput,
  PipelineOutput,
} from './types';
