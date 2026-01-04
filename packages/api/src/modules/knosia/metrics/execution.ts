import { db } from "@turbostarter/db/server";
import { knosiaCalculatedMetric } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";
import type { ExecuteMetricInput } from "./schemas";
import { getMetric } from "./queries";

export interface ExecutionResult {
  value: number | string;
  formattedValue: string;
  executedAt: string;
  executionTimeMs: number;
  fromCache: boolean;
}

/**
 * Execute a calculated metric and return the result
 *
 * Phase 1 (Current): Returns mock data for testing
 * Phase 2 (Future): Will use LiquidConnect SemanticLayer to execute recipe
 *
 * The execution flow will be:
 * 1. Parse semanticDefinition into SQL query
 * 2. Execute against connection's database via LiquidConnect adapter
 * 3. Format result according to metric's format specification
 * 4. Cache result in lastExecutionResult
 *
 * TODO Phase 2: Implement actual execution using LiquidConnect
 * - Import SemanticLayer from @repo/liquid-connect
 * - Get connection details and create adapter
 * - Execute semantic definition as SQL
 * - Handle errors and validation
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
    const cached = metric.lastExecutionResult as any;
    return {
      value: cached.value ?? 0,
      formattedValue: cached.formattedValue ?? "N/A",
      executedAt: cached.executedAt ?? new Date().toISOString(),
      executionTimeMs: cached.executionTimeMs ?? 0,
      fromCache: true,
    };
  }

  // TODO: Phase 2 - Implement actual execution using LiquidConnect
  // const semanticLayer = new SemanticLayer(connectionString);
  // const result = await semanticLayer.executeMetric(metric.semanticDefinition);

  // For now, return mock data based on metric category
  const mockValue = generateMockValue(metric.category ?? "other");
  const result: ExecutionResult = {
    value: mockValue,
    formattedValue: formatValue(mockValue, metric.category ?? "other"),
    executedAt: new Date().toISOString(),
    executionTimeMs: Math.floor(Math.random() * 200) + 50, // 50-250ms
    fromCache: false,
  };

  // Update cache
  await db
    .update(knosiaCalculatedMetric)
    .set({
      lastExecutionResult: result as any,
      lastExecutedAt: new Date(),
      executionCount: (metric.executionCount ?? 0) + 1,
    })
    .where(eq(knosiaCalculatedMetric.id, metricId));

  return result;
}

/**
 * Generate mock values for testing
 * TODO: Remove in Phase 2
 */
function generateMockValue(category: string): number {
  switch (category) {
    case "revenue":
      return Math.floor(Math.random() * 500000) + 100000; // $100k - $600k
    case "growth":
      return Math.random() * 30 + 5; // 5% - 35%
    case "engagement":
      return Math.floor(Math.random() * 5000) + 1000; // 1k - 6k users
    case "operational":
      return Math.floor(Math.random() * 100) + 10; // 10 - 110
    default:
      return Math.floor(Math.random() * 10000);
  }
}

/**
 * Format values based on category
 * TODO: Use metric's format specification in Phase 2
 */
function formatValue(value: number, category: string): string {
  switch (category) {
    case "revenue":
      return `$${value.toLocaleString()}`;
    case "growth":
      return `${value.toFixed(1)}%`;
    case "engagement":
      return value.toLocaleString();
    default:
      return value.toLocaleString();
  }
}
