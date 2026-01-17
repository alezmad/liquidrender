/**
 * KPI Repairer - Escalating Model Repair System
 *
 * Implements the REPAIR phase of Pipeline V2:
 * 1. Try Haiku repair (quick fixes) - up to N attempts
 * 2. If still failing, try Sonnet (rethink approach)
 * 3. If still failing, try Opus (deep reasoning)
 * 4. If all fail, mark as 'needs-review'
 *
 * Each repair attempt is tracked with full tracing for analytics and learning.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ValidationResult,
  RepairAttempt,
  RepairTier,
  KPIResult,
  PipelineConfig,
  PhaseMetrics,
  ExtendedKPISemanticDefinitionType,
} from '../types';
import { MODEL_IDS } from '../orchestrator';
import {
  buildHaikuRepairPrompt,
  buildSonnetRepairPrompt,
  buildOpusRepairPrompt,
  HAIKU_REPAIR_PROMPT_NAME,
  HAIKU_REPAIR_PROMPT_VERSION,
  SONNET_REPAIR_PROMPT_NAME,
  SONNET_REPAIR_PROMPT_VERSION,
  OPUS_REPAIR_PROMPT_NAME,
  OPUS_REPAIR_PROMPT_VERSION,
} from './repair-prompts';
import { createEmitter } from '@repo/liquid-connect';
import { compileKPIFormula, type KPISemanticDefinition } from '@repo/liquid-connect/kpi';

// ============================================================================
// Anthropic Client
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Map pipeline dialect to liquid-connect dialect.
 * Pipeline uses 'postgresql', liquid-connect uses 'postgres'.
 */
function mapDialect(dialect: 'postgresql' | 'mysql' | 'duckdb'): 'postgres' | 'duckdb' {
  if (dialect === 'postgresql') return 'postgres';
  // MySQL support coming soon - for now use postgres as fallback
  if (dialect === 'mysql') return 'postgres';
  return 'duckdb';
}

/**
 * Test if a repaired KPI definition compiles to valid SQL.
 * Uses the same compilation logic as the validate phase.
 */
function testCompilation(
  kpiDefinition: unknown,
  dialect: 'postgresql' | 'mysql' | 'duckdb',
  schema?: string
): { success: true; sql: string } | { success: false; error: string } {
  try {
    const emitterDialect = mapDialect(dialect);
    const emitter = createEmitter(emitterDialect, { defaultSchema: schema });
    const result = compileKPIFormula(kpiDefinition as KPISemanticDefinition, emitter, {
      quoteIdentifiers: true,
    });

    if (result.success) {
      return { success: true, sql: result.expression };
    }
    return { success: false, error: result.error || 'Unknown compilation error' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse LLM response to extract JSON.
 * Handles markdown code blocks and raw JSON.
 */
function parseRepairResponse(text: string): unknown {
  let jsonText = text.trim();

  // Strip markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonText);
}

// ============================================================================
// Individual Tier Repair Functions
// ============================================================================

interface RepairAttemptResult {
  attempt: RepairAttempt;
  validatedDefinition?: ExtendedKPISemanticDefinitionType;
  compiledSql?: string;
}

/**
 * Attempt repair using Haiku (quick fixes).
 */
async function tryHaikuRepair(
  failed: ValidationResult,
  schemaContext: string,
  config: PipelineConfig
): Promise<RepairAttemptResult> {
  const modelId = config.models?.repairHaiku ?? MODEL_IDS.repairHaiku;
  const prompt = buildHaikuRepairPrompt(failed, schemaContext);
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    });

    const latencyMs = Date.now() - startTime;
    const content = response.content[0];

    if (!content || content.type !== 'text') {
      return {
        attempt: {
          tier: 'haiku',
          model: modelId,
          prompt,
          success: false,
          error: 'No text response from LLM',
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
      };
    }

    const repairedDefinition = parseRepairResponse(content.text) as ExtendedKPISemanticDefinitionType;

    // Check for infeasible response
    if ('infeasible' in repairedDefinition && (repairedDefinition as any).infeasible) {
      return {
        attempt: {
          tier: 'haiku',
          model: modelId,
          prompt,
          repairedDefinition: undefined,
          success: false,
          error: `KPI marked as infeasible: ${(repairedDefinition as any).reason || 'Unknown reason'}`,
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
      };
    }

    // Validate the repaired definition compiles
    const compileResult = testCompilation(repairedDefinition, config.dialect, config.schema);

    if (compileResult.success) {
      if (config.debug) {
        console.log(`[Repair] Haiku fix successful for ${failed.generation.metadata.name}`);
      }
      return {
        attempt: {
          tier: 'haiku',
          model: modelId,
          prompt,
          repairedDefinition,
          success: true,
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
        validatedDefinition: repairedDefinition,
        compiledSql: compileResult.sql,
      };
    }

    // Repair produced invalid output
    return {
      attempt: {
        tier: 'haiku',
        model: modelId,
        prompt,
        repairedDefinition,
        success: false,
        error: `Repaired definition still fails: ${compileResult.error}`,
        latencyMs,
        tokensIn: response.usage?.input_tokens ?? 0,
        tokensOut: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (config.debug) {
      console.error(`[Repair] Haiku failed for ${failed.generation.metadata.name}:`, errorMessage);
    }

    return {
      attempt: {
        tier: 'haiku',
        model: modelId,
        prompt,
        success: false,
        error: errorMessage,
        latencyMs,
        tokensIn: 0,
        tokensOut: 0,
      },
    };
  }
}

/**
 * Attempt repair using Sonnet (rethink approach).
 */
async function trySonnetRepair(
  failed: ValidationResult,
  previousAttempts: RepairAttempt[],
  schemaContext: string,
  config: PipelineConfig
): Promise<RepairAttemptResult> {
  const modelId = config.models?.repairSonnet ?? MODEL_IDS.repairSonnet;
  const prompt = buildSonnetRepairPrompt(failed, previousAttempts, schemaContext);
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    const latencyMs = Date.now() - startTime;
    const content = response.content[0];

    if (!content || content.type !== 'text') {
      return {
        attempt: {
          tier: 'sonnet',
          model: modelId,
          prompt,
          success: false,
          error: 'No text response from LLM',
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
      };
    }

    const repairedDefinition = parseRepairResponse(content.text) as ExtendedKPISemanticDefinitionType;

    // Check for infeasible response
    if ('infeasible' in repairedDefinition && (repairedDefinition as any).infeasible) {
      return {
        attempt: {
          tier: 'sonnet',
          model: modelId,
          prompt,
          repairedDefinition: undefined,
          success: false,
          error: `KPI marked as infeasible: ${(repairedDefinition as any).reason || 'Unknown reason'}`,
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
      };
    }

    // Validate the repaired definition compiles
    const compileResult = testCompilation(repairedDefinition, config.dialect, config.schema);

    if (compileResult.success) {
      if (config.debug) {
        console.log(`[Repair] Sonnet rethink successful for ${failed.generation.metadata.name}`);
      }
      return {
        attempt: {
          tier: 'sonnet',
          model: modelId,
          prompt,
          repairedDefinition,
          success: true,
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
        validatedDefinition: repairedDefinition,
        compiledSql: compileResult.sql,
      };
    }

    return {
      attempt: {
        tier: 'sonnet',
        model: modelId,
        prompt,
        repairedDefinition,
        success: false,
        error: `Repaired definition still fails: ${compileResult.error}`,
        latencyMs,
        tokensIn: response.usage?.input_tokens ?? 0,
        tokensOut: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (config.debug) {
      console.error(`[Repair] Sonnet failed for ${failed.generation.metadata.name}:`, errorMessage);
    }

    return {
      attempt: {
        tier: 'sonnet',
        model: modelId,
        prompt,
        success: false,
        error: errorMessage,
        latencyMs,
        tokensIn: 0,
        tokensOut: 0,
      },
    };
  }
}

/**
 * Attempt repair using Opus (deep reasoning).
 */
async function tryOpusRepair(
  failed: ValidationResult,
  previousAttempts: RepairAttempt[],
  schemaContext: string,
  config: PipelineConfig
): Promise<RepairAttemptResult> {
  const modelId = config.models?.repairOpus ?? MODEL_IDS.repairOpus;
  const prompt = buildOpusRepairPrompt(failed, previousAttempts, schemaContext);
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const latencyMs = Date.now() - startTime;
    const content = response.content[0];

    if (!content || content.type !== 'text') {
      return {
        attempt: {
          tier: 'opus',
          model: modelId,
          prompt,
          success: false,
          error: 'No text response from LLM',
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
      };
    }

    const repairedDefinition = parseRepairResponse(content.text) as ExtendedKPISemanticDefinitionType;

    // Check for infeasible response - Opus can determine a KPI is impossible
    if ('infeasible' in repairedDefinition && (repairedDefinition as any).infeasible) {
      return {
        attempt: {
          tier: 'opus',
          model: modelId,
          prompt,
          repairedDefinition: undefined,
          success: false,
          error: `KPI marked as infeasible: ${(repairedDefinition as any).reason || 'Unknown reason'}`,
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
      };
    }

    // Validate the repaired definition compiles
    const compileResult = testCompilation(repairedDefinition, config.dialect, config.schema);

    if (compileResult.success) {
      if (config.debug) {
        console.log(`[Repair] Opus deep reasoning successful for ${failed.generation.metadata.name}`);
      }
      return {
        attempt: {
          tier: 'opus',
          model: modelId,
          prompt,
          repairedDefinition,
          success: true,
          latencyMs,
          tokensIn: response.usage?.input_tokens ?? 0,
          tokensOut: response.usage?.output_tokens ?? 0,
        },
        validatedDefinition: repairedDefinition,
        compiledSql: compileResult.sql,
      };
    }

    return {
      attempt: {
        tier: 'opus',
        model: modelId,
        prompt,
        repairedDefinition,
        success: false,
        error: `Repaired definition still fails: ${compileResult.error}`,
        latencyMs,
        tokensIn: response.usage?.input_tokens ?? 0,
        tokensOut: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (config.debug) {
      console.error(`[Repair] Opus failed for ${failed.generation.metadata.name}:`, errorMessage);
    }

    return {
      attempt: {
        tier: 'opus',
        model: modelId,
        prompt,
        success: false,
        error: errorMessage,
        latencyMs,
        tokensIn: 0,
        tokensOut: 0,
      },
    };
  }
}

// ============================================================================
// Single KPI Repair Orchestration
// ============================================================================

/**
 * Repair a single failed KPI using escalating model tiers.
 */
async function repairSingleKPI(
  failed: ValidationResult,
  schemaContext: string,
  config: PipelineConfig
): Promise<KPIResult> {
  const startTime = Date.now();
  const attempts: RepairAttempt[] = [];
  const maxHaiku = config.maxRepairAttempts?.haiku ?? 2;
  const maxSonnet = config.maxRepairAttempts?.sonnet ?? 1;
  const maxOpus = config.maxRepairAttempts?.opus ?? 1;

  const kpiName = failed.generation.metadata.name;

  if (config.debug) {
    console.log(`[Repair] Starting repair for: ${kpiName}`);
  }

  // =========================================================================
  // Try Haiku repairs (quick fixes)
  // =========================================================================
  for (let i = 0; i < maxHaiku; i++) {
    if (config.debug) {
      console.log(`[Repair] Haiku attempt ${i + 1}/${maxHaiku} for ${kpiName}`);
    }

    const result = await tryHaikuRepair(failed, schemaContext, config);
    attempts.push(result.attempt);

    if (result.attempt.success && result.validatedDefinition) {
      return {
        status: 'repaired',
        plan: failed.generation.plan,
        definition: result.validatedDefinition,
        sql: result.compiledSql,
        repairAttempts: attempts,
        repairedBy: 'haiku',
        totalLatencyMs: Date.now() - startTime,
      };
    }
  }

  // =========================================================================
  // Try Sonnet repair (rethink approach)
  // =========================================================================
  for (let i = 0; i < maxSonnet; i++) {
    if (config.debug) {
      console.log(`[Repair] Sonnet attempt ${i + 1}/${maxSonnet} for ${kpiName}`);
    }

    const result = await trySonnetRepair(failed, attempts, schemaContext, config);
    attempts.push(result.attempt);

    if (result.attempt.success && result.validatedDefinition) {
      return {
        status: 'repaired',
        plan: failed.generation.plan,
        definition: result.validatedDefinition,
        sql: result.compiledSql,
        repairAttempts: attempts,
        repairedBy: 'sonnet',
        totalLatencyMs: Date.now() - startTime,
      };
    }
  }

  // =========================================================================
  // Try Opus repair (deep reasoning)
  // =========================================================================
  for (let i = 0; i < maxOpus; i++) {
    if (config.debug) {
      console.log(`[Repair] Opus attempt ${i + 1}/${maxOpus} for ${kpiName}`);
    }

    const result = await tryOpusRepair(failed, attempts, schemaContext, config);
    attempts.push(result.attempt);

    if (result.attempt.success && result.validatedDefinition) {
      return {
        status: 'repaired',
        plan: failed.generation.plan,
        definition: result.validatedDefinition,
        sql: result.compiledSql,
        repairAttempts: attempts,
        repairedBy: 'opus',
        totalLatencyMs: Date.now() - startTime,
      };
    }

    // Check if Opus marked as infeasible
    if (result.attempt.error?.includes('marked as infeasible')) {
      return {
        status: 'infeasible',
        plan: failed.generation.plan,
        errors: failed.errors,
        repairAttempts: attempts,
        totalLatencyMs: Date.now() - startTime,
      };
    }
  }

  // =========================================================================
  // All repairs failed - mark for review
  // =========================================================================
  if (config.debug) {
    console.log(`[Repair] All attempts failed for ${kpiName}, marking for review`);
  }

  return {
    status: 'needs-review',
    plan: failed.generation.plan,
    errors: failed.errors,
    repairAttempts: attempts,
    totalLatencyMs: Date.now() - startTime,
  };
}

// ============================================================================
// Main Repair Function (Entry Point)
// ============================================================================

/**
 * Repair multiple failed KPIs using escalating model tiers.
 *
 * For each failed KPI:
 * 1. Try Haiku repair (up to config.maxRepairAttempts.haiku times)
 * 2. If still failing, try Sonnet repair
 * 3. If still failing, try Opus repair
 * 4. If all fail, mark as 'needs-review'
 *
 * @param failed - Array of failed validation results
 * @param schemaContext - Schema markdown for context
 * @param config - Pipeline configuration
 * @returns Repaired KPI results and phase metrics
 */
export async function repairKPIs(
  failed: ValidationResult[],
  schemaContext: string,
  config: PipelineConfig
): Promise<{ results: KPIResult[]; metrics: PhaseMetrics }> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  if (failed.length === 0) {
    return {
      results: [],
      metrics: {
        phase: 'repair',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: 0,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        tokensIn: 0,
        tokensOut: 0,
        models: [],
      },
    };
  }

  if (config.debug) {
    console.log(`[Repair] Starting repair phase for ${failed.length} failed KPIs`);
  }

  // Repair each failed KPI sequentially (to avoid rate limits)
  const results: KPIResult[] = [];
  const modelsUsed = new Set<string>();
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (const failedKPI of failed) {
    const result = await repairSingleKPI(failedKPI, schemaContext, config);
    results.push(result);

    // Aggregate metrics from repair attempts
    for (const attempt of result.repairAttempts) {
      modelsUsed.add(attempt.model);
      totalTokensIn += attempt.tokensIn;
      totalTokensOut += attempt.tokensOut;
    }

    // Progress callback
    if (config.onProgress) {
      const completed = results.length;
      const repaired = results.filter((r) => r.status === 'repaired').length;
      config.onProgress({
        phase: 'repair',
        status: 'started',
        message: `Repaired ${repaired}/${completed} (${failed.length - completed} remaining)`,
        data: {
          kpiName: failedKPI.generation.metadata.name,
          completed,
          total: failed.length,
          progress: Math.round((completed / failed.length) * 100),
        },
      });
    }
  }

  const completedAt = new Date().toISOString();
  const repaired = results.filter((r) => r.status === 'repaired').length;
  const needsReview = results.filter((r) => r.status === 'needs-review').length;
  const infeasible = results.filter((r) => r.status === 'infeasible').length;

  if (config.debug) {
    console.log(
      `[Repair] Completed: ${repaired} repaired, ${needsReview} need review, ${infeasible} infeasible`
    );
  }

  return {
    results,
    metrics: {
      phase: 'repair',
      startedAt,
      completedAt,
      durationMs: Date.now() - startTime,
      itemsProcessed: failed.length,
      itemsSucceeded: repaired,
      itemsFailed: needsReview + infeasible,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      models: Array.from(modelsUsed),
    },
  };
}

// ============================================================================
// Exports for testing
// ============================================================================

export {
  tryHaikuRepair,
  trySonnetRepair,
  tryOpusRepair,
  repairSingleKPI,
  testCompilation,
};
