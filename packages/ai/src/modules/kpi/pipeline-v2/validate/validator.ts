/**
 * KPI Pipeline V2 - VALIDATE Phase
 *
 * Sequential validation gates:
 * 1. Schema Validation - Required fields present per type
 * 2. Compilation - Produces valid SQL via compileKPIFormula()
 * 3. Execution (optional) - Runs without error against real DB
 * 4. Value Validation (optional) - Result makes business sense
 */

import { createEmitter } from '@repo/liquid-connect';
import { compileKPIFormula, type KPISemanticDefinition } from '@repo/liquid-connect/kpi';
import { ExtendedKPISemanticDefinitionSchema } from '../../types';
import type {
  GenerationResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  PhaseMetrics,
  PipelineConfig,
} from '../types';

// ============================================================================
// Dialect Mapping
// ============================================================================

/**
 * Map pipeline dialect to liquid-connect emitter dialect
 */
function mapDialect(dialect: PipelineConfig['dialect']): 'postgres' | 'duckdb' {
  switch (dialect) {
    case 'postgresql':
      return 'postgres';
    case 'mysql':
      // MySQL uses similar syntax to postgres for our purposes
      return 'postgres';
    case 'duckdb':
      return 'duckdb';
    default:
      return 'duckdb';
  }
}

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * Validate KPI definition against Zod schema
 */
function validateSchema(definition: unknown): {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const result = ExtendedKPISemanticDefinitionSchema.safeParse(definition);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        stage: 'schema',
        code: `SCHEMA_${issue.code.toUpperCase()}`,
        message: issue.message,
        context: {
          field: issue.path.join('.'),
          expected: String(issue.code),
        },
      });
    }
  }

  // Additional semantic checks
  if (result.success) {
    const def = result.data;

    // Check for filtered KPIs with percent format but no percentOf
    if (
      def.type === 'filtered' &&
      'subquery' in def &&
      !('percentOf' in def && def.percentOf)
    ) {
      warnings.push({
        code: 'FILTERED_NO_PERCENT_OF',
        message: 'Filtered KPI without percentOf will return raw count, not percentage',
        suggestion: 'Add percentOf field if this should be a percentage metric',
      });
    }

    // Check for filtered KPIs with percentOf mismatch
    if (
      def.type === 'filtered' &&
      'subquery' in def &&
      'percentOf' in def &&
      def.percentOf &&
      'expression' in def &&
      def.expression !== def.percentOf
    ) {
      errors.push({
        stage: 'schema',
        code: 'GRAIN_MISMATCH_PERCENT_OF',
        message: `Filtered KPI percentOf field "${def.percentOf}" does not match expression "${def.expression}"`,
        context: {
          field: 'percentOf',
          expected: String(def.expression),
          actual: String(def.percentOf),
        },
      });
    }

    // Check for ratio KPIs with potential division by zero
    if (def.type === 'ratio') {
      warnings.push({
        code: 'RATIO_DIV_ZERO_RISK',
        message: 'Ratio KPIs may return NULL if denominator is zero',
        suggestion: 'Consider adding NULLIF or COALESCE handling',
      });
    }

    // Check for ratio KPIs with grain mismatch (different entities)
    if (def.type === 'ratio' && 'numerator' in def && 'denominator' in def) {
      const numEntity = (def.numerator as any)?.entity;
      const denEntity = (def.denominator as any)?.entity;

      // If both have entity specified and they differ, it's a grain mismatch
      if (numEntity && denEntity && numEntity !== denEntity) {
        warnings.push({
          code: 'GRAIN_MISMATCH_RATIO',
          message: `Ratio KPI numerator uses entity "${numEntity}" but denominator uses "${denEntity}" - possible grain mismatch`,
          suggestion: 'Ensure both aggregations are at the same grain. Use DISTINCT aggregations if needed.',
        });
      }
    }

  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Semantic Validation (KPI Name + Definition)
// ============================================================================

/**
 * Validate semantic consistency between KPI name and definition
 * This requires access to both the plan (name) and definition
 */
function validateSemantics(result: GenerationResult): {
  warnings: ValidationWarning[];
} {
  const warnings: ValidationWarning[] = [];
  const kpiName = result.plan.name;
  const def = result.definition;

  if (!def) {
    return { warnings };
  }

  // Check for time-series KPIs missing timeField
  const hasTimeKeywords = /monthly|daily|weekly|quarterly|trend/i.test(kpiName);
  const hasTimeField = 'timeField' in def && def.timeField;

  if (hasTimeKeywords && !hasTimeField) {
    warnings.push({
      code: 'TIME_SERIES_MISSING_TIME_FIELD',
      message: `KPI name "${kpiName}" suggests time-series aggregation but definition is missing timeField`,
      suggestion: 'Add timeField to enable proper temporal grouping (otherwise "Monthly Revenue" = "Total Revenue")',
    });
  }

  return { warnings };
}

// ============================================================================
// Compilation Validation
// ============================================================================

/**
 * Test if a KPI definition compiles to valid SQL
 */
function validateCompilation(
  definition: unknown,
  dialect: PipelineConfig['dialect']
): {
  valid: boolean;
  sql?: string;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  try {
    const emitterDialect = mapDialect(dialect);
    const emitter = createEmitter(emitterDialect, { defaultSchema: undefined });

    const result = compileKPIFormula(definition as KPISemanticDefinition, emitter, {
      quoteIdentifiers: true,
    });

    if (result.success) {
      return {
        valid: true,
        sql: result.expression,
        errors: [],
      };
    }

    errors.push({
      stage: 'compile',
      code: 'COMPILE_FAILED',
      message: result.error || 'Unknown compilation error',
      context: {
        sql: result.expression,
      },
    });

    return { valid: false, errors };
  } catch (error) {
    errors.push({
      stage: 'compile',
      code: 'COMPILE_EXCEPTION',
      message: error instanceof Error ? error.message : String(error),
    });

    return { valid: false, errors };
  }
}

// ============================================================================
// Main Validator
// ============================================================================

/**
 * Validate a single generation result through all gates.
 */
function validateSingle(
  result: GenerationResult,
  config: PipelineConfig
): ValidationResult {
  const startTime = Date.now();
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // Gate 1: Schema Validation
  const schemaResult = validateSchema(result.definition);
  allErrors.push(...schemaResult.errors);
  allWarnings.push(...schemaResult.warnings);

  if (!schemaResult.valid) {
    return {
      valid: false,
      generation: result,
      errors: allErrors,
      warnings: allWarnings,
      latencyMs: Date.now() - startTime,
    };
  }

  // Gate 1.5: Semantic Validation (name + definition consistency)
  const semanticResult = validateSemantics(result);
  allWarnings.push(...semanticResult.warnings);

  // Gate 2: Compilation
  const compileResult = validateCompilation(result.definition, config.dialect);
  allErrors.push(...compileResult.errors);

  if (!compileResult.valid) {
    return {
      valid: false,
      generation: result,
      errors: allErrors,
      warnings: allWarnings,
      latencyMs: Date.now() - startTime,
    };
  }

  // Gate 3: Execution (skipped for now - requires DB connection)
  // TODO: Implement optional execution validation
  // This would run the SQL against the actual database

  // Gate 4: Value Validation (skipped for now)
  // TODO: Implement business sense checks
  // - Is the value reasonable for this KPI type?
  // - Are there obvious data quality issues?

  return {
    valid: true,
    generation: result,
    errors: allErrors,
    warnings: allWarnings,
    executionResult: {
      value: null, // Would be populated if we executed
      sql: compileResult.sql!,
    },
    latencyMs: Date.now() - startTime,
  };
}

/**
 * PHASE 3: VALIDATE - Validate all generated KPIs
 *
 * Runs each KPI through validation gates:
 * 1. Schema validation (Zod)
 * 2. Compilation (SQL generation)
 * 3. Execution (optional, requires DB)
 * 4. Value validation (optional, business sense)
 */
export async function validateKPIs(
  results: GenerationResult[],
  config: PipelineConfig
): Promise<{ validations: ValidationResult[]; metrics: PhaseMetrics }> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const validations: ValidationResult[] = [];

  for (const result of results) {
    const validation = validateSingle(result, config);
    validations.push(validation);
  }

  const completedAt = new Date().toISOString();
  const succeeded = validations.filter(v => v.valid).length;

  return {
    validations,
    metrics: {
      phase: 'validate',
      startedAt,
      completedAt,
      durationMs: Date.now() - startTime,
      itemsProcessed: results.length,
      itemsSucceeded: succeeded,
      itemsFailed: results.length - succeeded,
      tokensIn: 0,
      tokensOut: 0,
      models: [],
    },
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

export { validateSchema, validateCompilation, validateSingle };
