// KPI Execution Pipeline (Phase 3)
// Recipe → LiquidFlow → SQL → Results
//
// This module provides the complete execution flow for calculated metrics:
// 1. Takes KPI recipes from LLM generation (Phase 1)
// 2. Builds LiquidFlow IR (Phase 2)
// 3. Emits SQL for target dialect (Phase 3)
// 4. Executes and returns results

import {
  buildLiquidFlowFromRecipe,
  buildLiquidFlowsFromRecipes,
  validateRecipeForFlow,
  type CalculatedMetricRecipe,
  type RecipeBuildOptions,
} from '../liquidflow/recipe-builder';

import { emit, type Dialect, type EmitResult } from '../emitters';
import type { LiquidFlow } from '../liquidflow/types';

/**
 * Result of compiling a recipe to SQL
 */
export interface CompiledMetric {
  /** Recipe name */
  name: string;
  /** Original recipe */
  recipe: CalculatedMetricRecipe;
  /** LiquidFlow IR */
  flow: LiquidFlow;
  /** Generated SQL */
  sql: string;
  /** Emit result with debug info */
  emitResult: EmitResult;
  /** Any compilation warnings */
  warnings: string[];
}

/**
 * Result of executing a metric query
 */
export interface MetricExecutionResult {
  /** Metric name */
  name: string;
  /** Computed value */
  value: number | null;
  /** Execution time in ms */
  executionTimeMs: number;
  /** Any execution errors */
  error?: string;
  /** Raw result rows (for debugging) */
  rawRows?: unknown[];
}

/**
 * Options for the KPI execution pipeline
 */
export interface KPIExecutionOptions extends RecipeBuildOptions {
  /** Target database dialect */
  dialect: Dialect;
  /** Whether to include debug info */
  debug?: boolean;
}

/**
 * Compile a single recipe to SQL
 *
 * This is the Phase 2→3 bridge: Recipe → LiquidFlow → SQL
 *
 * @param recipe - KPI recipe from LLM generation
 * @param options - Execution options including dialect
 * @returns Compiled metric with SQL
 */
export function compileRecipeToSQL(
  recipe: CalculatedMetricRecipe,
  options: KPIExecutionOptions
): CompiledMetric {
  const warnings: string[] = [];

  // Validate recipe
  const validation = validateRecipeForFlow(recipe);
  if (!validation.valid) {
    warnings.push(...validation.errors);
  }

  // Build LiquidFlow IR
  const flow = buildLiquidFlowFromRecipe(recipe, {
    schema: options.schema,
    database: options.database,
    timeRange: options.timeRange,
    additionalFilters: options.additionalFilters,
    limit: options.limit,
  });

  // Emit SQL (throws on failure)
  let emitResult: EmitResult;
  try {
    emitResult = emit(flow, options.dialect, {
      debug: options.debug,
    });
  } catch (error) {
    // Create a failed result with the error message
    warnings.push(`SQL emission failed: ${error instanceof Error ? error.message : String(error)}`);
    emitResult = {
      sql: '',
      params: [],
    };
  }

  return {
    name: recipe.name,
    recipe,
    flow,
    sql: emitResult.sql,
    emitResult,
    warnings,
  };
}

/**
 * Compile multiple recipes to SQL (optimized for same-entity batching)
 *
 * @param recipes - Array of KPI recipes
 * @param options - Execution options
 * @returns Array of compiled metrics
 */
export function compileRecipesToSQL(
  recipes: CalculatedMetricRecipe[],
  options: KPIExecutionOptions
): CompiledMetric[] {
  // Filter to only feasible recipes
  const feasibleRecipes = recipes.filter((r) => r.feasible);

  if (feasibleRecipes.length === 0) {
    return [];
  }

  // Build optimized flows (grouped by entity)
  const flows = buildLiquidFlowsFromRecipes(feasibleRecipes, {
    schema: options.schema,
    database: options.database,
    timeRange: options.timeRange,
    additionalFilters: options.additionalFilters,
    limit: options.limit,
  });

  // Map flows back to recipes and emit SQL
  const results: CompiledMetric[] = [];

  // Single recipe flows
  for (const recipe of feasibleRecipes) {
    const flow = buildLiquidFlowFromRecipe(recipe, options);
    const emitResult = emit(flow, options.dialect, { debug: options.debug });
    const validation = validateRecipeForFlow(recipe);

    results.push({
      name: recipe.name,
      recipe,
      flow,
      sql: emitResult.sql,
      emitResult,
      warnings: validation.errors,
    });
  }

  return results;
}

/**
 * Execute a compiled metric against a database
 *
 * This is a template function - actual execution depends on the database driver.
 * Use this as a guide for implementing database-specific executors.
 *
 * @param compiled - Compiled metric with SQL
 * @param executor - Database query executor function
 * @returns Execution result with value
 */
export async function executeCompiledMetric(
  compiled: CompiledMetric,
  executor: (sql: string) => Promise<{ rows: unknown[]; executionTimeMs: number }>
): Promise<MetricExecutionResult> {
  const startTime = Date.now();

  try {
    // Check if SQL was generated (empty SQL means emit failed)
    if (!compiled.sql) {
      return {
        name: compiled.name,
        value: null,
        executionTimeMs: 0,
        error: `Compilation failed: ${compiled.warnings.join(', ')}`,
      };
    }

    const { rows, executionTimeMs } = await executor(compiled.sql);

    // Extract value from first row
    // Assumes the query returns a single row with the metric value
    let value: number | null = null;
    if (rows.length > 0) {
      const firstRow = rows[0] as Record<string, unknown>;
      // Try to find the metric value in the row
      const valueKey = Object.keys(firstRow).find(
        (k) => k.toLowerCase().includes(compiled.name.toLowerCase().replace(/[^a-z]/g, '')) ||
          k === 'value' ||
          k === 'result' ||
          k === compiled.recipe.semanticDefinition.expression
      );

      if (valueKey) {
        const rawValue = firstRow[valueKey];
        value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
        if (isNaN(value)) value = null;
      } else {
        // Take first numeric value
        for (const v of Object.values(firstRow)) {
          if (typeof v === 'number') {
            value = v;
            break;
          }
        }
      }
    }

    return {
      name: compiled.name,
      value,
      executionTimeMs,
      rawRows: rows,
    };
  } catch (error) {
    return {
      name: compiled.name,
      value: null,
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Full pipeline: Compile and execute a recipe
 *
 * @param recipe - KPI recipe
 * @param options - Execution options
 * @param executor - Database query executor
 * @returns Execution result
 */
export async function executeRecipe(
  recipe: CalculatedMetricRecipe,
  options: KPIExecutionOptions,
  executor: (sql: string) => Promise<{ rows: unknown[]; executionTimeMs: number }>
): Promise<MetricExecutionResult> {
  const compiled = compileRecipeToSQL(recipe, options);
  return executeCompiledMetric(compiled, executor);
}

/**
 * Execute multiple recipes in parallel
 *
 * @param recipes - Array of KPI recipes
 * @param options - Execution options
 * @param executor - Database query executor
 * @returns Array of execution results
 */
export async function executeRecipes(
  recipes: CalculatedMetricRecipe[],
  options: KPIExecutionOptions,
  executor: (sql: string) => Promise<{ rows: unknown[]; executionTimeMs: number }>
): Promise<MetricExecutionResult[]> {
  const compiled = compileRecipesToSQL(recipes, options);

  // Execute in parallel for better performance
  const results = await Promise.all(
    compiled.map((c) => executeCompiledMetric(c, executor))
  );

  return results;
}

/**
 * Get a preview of the SQL that would be generated for a recipe
 * Useful for debugging and user inspection
 */
export function previewRecipeSQL(
  recipe: CalculatedMetricRecipe,
  dialect: Dialect = 'postgres'
): { sql: string; flow: LiquidFlow; warnings: string[] } {
  const compiled = compileRecipeToSQL(recipe, { dialect });
  return {
    sql: compiled.sql,
    flow: compiled.flow,
    warnings: compiled.warnings,
  };
}
