/**
 * Metric Execution Pipeline (Phase 3)
 *
 * Integrates with @repo/liquid-connect to:
 * 1. Convert stored semantic definitions to LiquidFlow IR
 * 2. Emit SQL for target database dialect
 * 3. Execute via DuckDB adapter
 * 4. Cache and return results
 */

import { db } from "@turbostarter/db/server";
import { knosiaCalculatedMetric, knosiaConnection } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";
import {
  compileRecipeToSQL,
  previewRecipeSQL,
  type CalculatedMetricRecipe,
  type Dialect,
} from "@repo/liquid-connect";
import type { ExecuteMetricInput } from "./schemas";
import { getMetric } from "./queries";
import { duckdbManager } from "../connections/duckdb-manager";

// =============================================================================
// TYPES
// =============================================================================

export interface ExecutionResult {
  value: number | string | null;
  formattedValue: string;
  executedAt: string;
  executionTimeMs: number;
  fromCache: boolean;
  sql?: string;
  error?: string;
  warnings?: string[];
}

export interface SQLPreviewResult {
  metricId: string;
  name: string;
  sql: string;
  dialect: Dialect;
  warnings: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert database metric to CalculatedMetricRecipe format
 */
function metricToRecipe(metric: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  semanticDefinition: unknown;
  confidence: string | null;
  feasible: boolean;
}): CalculatedMetricRecipe {
  const semanticDef = metric.semanticDefinition as CalculatedMetricRecipe["semanticDefinition"];

  return {
    name: metric.name,
    description: metric.description ?? "",
    category: (metric.category as CalculatedMetricRecipe["category"]) ?? "custom",
    businessType: [], // Not stored in DB, but not needed for execution
    semanticDefinition: semanticDef,
    confidence: metric.confidence ? parseFloat(metric.confidence) : 0.8,
    feasible: metric.feasible,
  };
}

/**
 * Determine dialect from connection type
 */
function connectionTypeToDialect(type: string): Dialect {
  switch (type) {
    case "postgres":
      return "postgres";
    case "mysql":
      return "postgres"; // MySQL uses similar syntax, postgres emitter works
    case "duckdb":
      return "duckdb";
    default:
      return "postgres";
  }
}

/**
 * Format metric value based on semantic definition format
 */
function formatMetricValue(
  value: number | null,
  semanticDef: CalculatedMetricRecipe["semanticDefinition"],
  category: string | null
): string {
  if (value === null) return "N/A";

  const format = semanticDef.format;

  if (format) {
    const decimals = format.decimals ?? 0;
    const formatted = value.toFixed(decimals);

    switch (format.type) {
      case "currency":
        const symbol = format.currency === "USD" ? "$" : format.currency ?? "$";
        return `${symbol}${parseFloat(formatted).toLocaleString()}`;
      case "percent":
        return `${formatted}%`;
      case "number":
        return parseFloat(formatted).toLocaleString();
      default:
        return formatted;
    }
  }

  // Fallback based on category
  switch (category) {
    case "revenue":
      return `$${value.toLocaleString()}`;
    case "growth":
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Execute a calculated metric using the Phase 3 pipeline
 *
 * Flow:
 * 1. Get metric from database
 * 2. Get connection details
 * 3. Convert to CalculatedMetricRecipe
 * 4. Compile to SQL using LiquidConnect
 * 5. Execute via DuckDB adapter
 * 6. Cache and return result
 */
export async function executeMetricWithCache(
  metricId: string,
  options: ExecuteMetricInput = { useCache: true },
): Promise<ExecutionResult> {
  const metric = await getMetric(metricId);

  if (!metric) {
    throw new Error(`Metric not found: ${metricId}`);
  }

  // Check cache if enabled
  if (options.useCache && metric.lastExecutionResult) {
    const cached = metric.lastExecutionResult as ExecutionResult;
    return {
      value: cached.value ?? null,
      formattedValue: cached.formattedValue ?? "N/A",
      executedAt: cached.executedAt ?? new Date().toISOString(),
      executionTimeMs: cached.executionTimeMs ?? 0,
      fromCache: true,
      sql: cached.sql,
    };
  }

  // Get connection details
  const [connection] = await db
    .select()
    .from(knosiaConnection)
    .where(eq(knosiaConnection.id, metric.connectionId))
    .limit(1);

  if (!connection) {
    throw new Error(`Connection not found: ${metric.connectionId}`);
  }

  // Convert to recipe format
  const recipe = metricToRecipe(metric);
  const dialect = connectionTypeToDialect(connection.type);

  // Compile to SQL - only include timeRange if both start and end are provided
  const timeRangeOpt = options.timeRange?.start && options.timeRange?.end
    ? { start: options.timeRange.start, end: options.timeRange.end }
    : undefined;

  const compiled = compileRecipeToSQL(recipe, {
    dialect,
    schema: connection.schema ?? undefined,
    timeRange: timeRangeOpt,
  });

  // Check for compilation errors
  if (!compiled.sql) {
    const result: ExecutionResult = {
      value: null,
      formattedValue: "N/A",
      executedAt: new Date().toISOString(),
      executionTimeMs: 0,
      fromCache: false,
      error: `Compilation failed: ${compiled.warnings.join(", ")}`,
      warnings: compiled.warnings,
    };
    return result;
  }

  // Execute via DuckDB adapter
  let executionResult: ExecutionResult;

  try {
    const adapter = await duckdbManager.getAdapter(connection);
    const startTime = Date.now();

    const rows = await adapter.query<Record<string, unknown>>(compiled.sql);
    const executionTimeMs = Date.now() - startTime;

    // Extract value from first row
    let value: number | null = null;
    const firstRow = rows[0];
    if (firstRow) {
      // Find the metric value in the row
      for (const v of Object.values(firstRow)) {
        if (typeof v === "number") {
          value = v;
          break;
        } else if (typeof v === "string" && !isNaN(parseFloat(v))) {
          value = parseFloat(v);
          break;
        }
      }
    }

    executionResult = {
      value,
      formattedValue: formatMetricValue(
        value,
        recipe.semanticDefinition,
        metric.category
      ),
      executedAt: new Date().toISOString(),
      executionTimeMs,
      fromCache: false,
      sql: compiled.sql,
      warnings: compiled.warnings.length > 0 ? compiled.warnings : undefined,
    };

    // Release adapter
    duckdbManager.release(connection.id);
  } catch (error) {
    executionResult = {
      value: null,
      formattedValue: "N/A",
      executedAt: new Date().toISOString(),
      executionTimeMs: 0,
      fromCache: false,
      sql: compiled.sql,
      error: error instanceof Error ? error.message : String(error),
      warnings: compiled.warnings.length > 0 ? compiled.warnings : undefined,
    };

    // Still release adapter on error
    duckdbManager.release(connection.id);
  }

  // Update cache and execution stats
  await db
    .update(knosiaCalculatedMetric)
    .set({
      lastExecutionResult: executionResult as unknown as Record<string, unknown>,
      lastExecutedAt: new Date(),
      executionCount: (metric.executionCount ?? 0) + 1,
    })
    .where(eq(knosiaCalculatedMetric.id, metricId));

  return executionResult;
}

/**
 * Preview SQL for a metric without executing
 *
 * Useful for debugging and user inspection
 */
export async function previewMetricSQL(
  metricId: string,
  dialect: Dialect = "postgres",
  timeRange?: { start?: string; end?: string }
): Promise<SQLPreviewResult> {
  const metric = await getMetric(metricId);

  if (!metric) {
    throw new Error(`Metric not found: ${metricId}`);
  }

  // Get connection for schema info
  const [connection] = await db
    .select()
    .from(knosiaConnection)
    .where(eq(knosiaConnection.id, metric.connectionId))
    .limit(1);

  // Convert to recipe format
  const recipe = metricToRecipe(metric);

  // Use connection's dialect if available
  const targetDialect = connection
    ? connectionTypeToDialect(connection.type)
    : dialect;

  // Convert timeRange to required format if both fields are provided
  const timeRangeOpt = timeRange?.start && timeRange?.end
    ? { start: timeRange.start, end: timeRange.end }
    : undefined;

  // Compile to SQL (without executing)
  const compiled = compileRecipeToSQL(recipe, {
    dialect: targetDialect,
    schema: connection?.schema ?? undefined,
    timeRange: timeRangeOpt,
  });

  return {
    metricId,
    name: metric.name,
    sql: compiled.sql || "-- SQL generation failed",
    dialect: targetDialect,
    warnings: compiled.warnings,
  };
}

/**
 * Execute multiple metrics in batch
 *
 * Optimizes by grouping metrics by connection
 */
export async function executeMetricsBatch(
  metricIds: string[],
  options: { timeRange?: { start?: string; end?: string } } = {}
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  // Execute sequentially for now
  // TODO: Optimize by grouping by connection and using parallel execution
  for (const metricId of metricIds) {
    try {
      const result = await executeMetricWithCache(metricId, {
        useCache: false,
        timeRange: options.timeRange,
      });
      results.push(result);
    } catch (error) {
      results.push({
        value: null,
        formattedValue: "N/A",
        executedAt: new Date().toISOString(),
        executionTimeMs: 0,
        fromCache: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
