/**
 * KPI Recipe Generator
 *
 * Uses LLMs to generate SQL recipes for business KPIs based on available database schema.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  CalculatedMetricRecipe,
  GenerateRecipeRequest,
  GenerateRecipeResponse,
} from "./types";
import { CalculatedMetricRecipeSchema, COMMON_KPIS_BY_BUSINESS_TYPE } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate KPI recipes using Claude
 */
export async function generateKPIRecipes(
  request: GenerateRecipeRequest,
  options: {
    model?: "haiku" | "sonnet";
    maxRecipes?: number;
  } = {}
): Promise<GenerateRecipeResponse> {
  const { model = "haiku", maxRecipes = 10 } = options;

  // Determine which KPIs to generate
  const kpisToGenerate = request.requestedKPIs?.length
    ? request.requestedKPIs
    : request.generateCommonKPIs
      ? COMMON_KPIS_BY_BUSINESS_TYPE[request.businessType]?.slice(0, maxRecipes) || []
      : [];

  if (kpisToGenerate.length === 0) {
    return {
      recipes: [],
      totalGenerated: 0,
      feasibleCount: 0,
      infeasibleCount: 0,
      averageConfidence: 0,
      warnings: ["No KPIs specified and no common KPIs found for business type"],
    };
  }

  // Build schema context for LLM
  const schemaContext = buildSchemaContext(request.vocabularyContext);

  // Generate recipes in parallel (max 5 at a time to avoid rate limits)
  const batchSize = 5;
  const allRecipes: CalculatedMetricRecipe[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < kpisToGenerate.length; i += batchSize) {
    const batch = kpisToGenerate.slice(i, i + batchSize);
    const batchPromises = batch.map((kpiName) =>
      generateSingleRecipe(kpiName, schemaContext, request.businessType, model)
    );

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        allRecipes.push(result.value);
      } else if (result.status === "rejected") {
        warnings.push(`Failed to generate recipe for ${batch[idx]}: ${result.reason}`);
      }
    });
  }

  // Calculate statistics
  const feasibleRecipes = allRecipes.filter((r) => r.feasible);
  const averageConfidence =
    allRecipes.length > 0
      ? allRecipes.reduce((sum, r) => sum + r.confidence, 0) / allRecipes.length
      : 0;

  return {
    recipes: allRecipes,
    totalGenerated: allRecipes.length,
    feasibleCount: feasibleRecipes.length,
    infeasibleCount: allRecipes.length - feasibleRecipes.length,
    averageConfidence,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Generate a single KPI recipe using Claude
 */
async function generateSingleRecipe(
  kpiName: string,
  schemaContext: string,
  businessType: string,
  model: "haiku" | "sonnet"
): Promise<CalculatedMetricRecipe | null> {
  const modelId =
    model === "sonnet"
      ? "claude-sonnet-4-5-20250929"
      : "claude-3-5-haiku-20241022";

  const prompt = `You are a data analyst expert. Generate a database-agnostic semantic metric definition for the following business KPI.

**KPI Name:** ${kpiName}
**Business Type:** ${businessType}

**Available Database Schema:**
${schemaContext}

**Task:**
Generate a semantic metric definition that describes HOW to calculate this KPI, not the actual SQL. LiquidConnect's emitters will generate database-specific SQL from your definition.

**Semantic Metric Types:**
- **simple**: Single aggregation on a column (e.g., SUM(amount), COUNT(*), AVG(price))
- **derived**: Combination of other metrics (e.g., (revenue - cost) / revenue)
- **cumulative**: Running total over time

**Output Format:**
Return ONLY a valid JSON object (no markdown, no explanation):

{
  "name": "Monthly Recurring Revenue",
  "description": "What this metric measures",
  "category": "revenue|growth|retention|engagement|efficiency|custom",

  "semanticDefinition": {
    "type": "simple|derived|cumulative",
    "expression": "column_name or formula",
    "aggregation": "SUM|AVG|COUNT|COUNT_DISTINCT|MIN|MAX (required for simple)",
    "entity": "table_name",
    "timeField": "timestamp_column (optional)",
    "timeGranularity": "month|week|day|hour|quarter|year (optional)",
    "filters": [
      {
        "field": "column_name",
        "operator": "=|!=|>|<|>=|<=|IN|NOT IN|LIKE|IS NULL|IS NOT NULL",
        "value": "filter_value (optional for NULL checks)"
      }
    ],
    "dependencies": ["metric1", "metric2"] (for derived metrics),
    "label": "Display name",
    "description": "What this calculates",
    "unit": "$ or % or users",
    "format": {
      "type": "number|currency|percent|duration",
      "decimals": 2,
      "currency": "USD (for currency)",
      "prefix": "$ (optional)",
      "suffix": "% (optional)"
    }
  },

  "businessType": ["${businessType}"],
  "confidence": 0.95,
  "feasible": true,
  "infeasibilityReason": "Reason if infeasible (optional)",

  "requiredColumns": [
    {
      "tableName": "table_name",
      "columnName": "column_name",
      "purpose": "How this column is used"
    }
  ]
}

**Examples:**

**Simple Metric (MRR):**
{
  "semanticDefinition": {
    "type": "simple",
    "expression": "amount",
    "aggregation": "SUM",
    "entity": "subscriptions",
    "timeField": "created_at",
    "timeGranularity": "month",
    "filters": [
      {"field": "status", "operator": "=", "value": "active"},
      {"field": "type", "operator": "=", "value": "recurring"}
    ],
    "format": {"type": "currency", "decimals": 2, "currency": "USD"}
  }
}

**Derived Metric (Churn Rate):**
{
  "semanticDefinition": {
    "type": "derived",
    "expression": "(churned_count / total_customers) * 100",
    "entity": "customers",
    "dependencies": ["churned_count", "total_customers"],
    "format": {"type": "percent", "decimals": 1}
  }
}

**Important Guidelines:**
- Use column names, NOT SQL syntax (LiquidConnect generates SQL)
- "expression" should be column name for simple metrics (e.g., "amount", not "SUM(amount)")
- For derived metrics, reference other metric names in "dependencies"
- Filters use field names from the entity, not table.column syntax
- Set feasible=false if required columns are missing
- Confidence reflects data availability:
  - 0.9-1.0: All required columns exist with exact semantics
  - 0.7-0.9: Columns exist but may need assumptions
  - 0.5-0.7: Using proxy columns
  - 0.0-0.5: Missing critical data`;

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 2000,
      temperature: 0.2, // Low temperature for more deterministic SQL generation
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (!content) {
      throw new Error("No content in Claude response");
    }

    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse and validate response
    const jsonText = content.text.trim();
    const parsed = JSON.parse(jsonText);

    // Validate against Zod schema
    const validated = CalculatedMetricRecipeSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error(`Failed to generate recipe for ${kpiName}:`, error);
    return null;
  }
}

/**
 * Build schema context string for LLM prompt
 */
function buildSchemaContext(vocabularyContext: GenerateRecipeRequest["vocabularyContext"]): string {
  const lines: string[] = [];

  vocabularyContext.tables.forEach((table) => {
    lines.push(`\nTable: ${table.name}`);
    lines.push("Columns:");

    table.columns.forEach((col) => {
      const parts = [`  - ${col.name} (${col.type})`];

      if (col.semanticType) {
        parts.push(`[semantic: ${col.semanticType}]`);
      }

      if (col.businessType) {
        parts.push(`[business: ${col.businessType}]`);
      }

      lines.push(parts.join(" "));
    });
  });

  if (vocabularyContext.detectedMetrics?.length) {
    lines.push("\nDetected Metrics:");
    vocabularyContext.detectedMetrics.forEach((m) => lines.push(`  - ${m}`));
  }

  if (vocabularyContext.detectedDimensions?.length) {
    lines.push("\nDetected Dimensions:");
    vocabularyContext.detectedDimensions.forEach((d) => lines.push(`  - ${d}`));
  }

  return lines.join("\n");
}

/**
 * Validate a recipe by checking if required columns exist in schema
 */
export function validateRecipe(
  recipe: CalculatedMetricRecipe,
  vocabularyContext: GenerateRecipeRequest["vocabularyContext"]
): {
  valid: boolean;
  missingColumns: Array<{ table: string; column: string }>;
} {
  const missingColumns: Array<{ table: string; column: string }> = [];

  if (!recipe.requiredColumns) {
    return { valid: true, missingColumns: [] };
  }

  recipe.requiredColumns.forEach((required) => {
    const table = vocabularyContext.tables.find(
      (t) => t.name.toLowerCase() === required.tableName.toLowerCase()
    );

    if (!table) {
      missingColumns.push({
        table: required.tableName,
        column: required.columnName,
      });
      return;
    }

    const column = table.columns.find(
      (c) => c.name.toLowerCase() === required.columnName.toLowerCase()
    );

    if (!column) {
      missingColumns.push({
        table: required.tableName,
        column: required.columnName,
      });
    }
  });

  return {
    valid: missingColumns.length === 0,
    missingColumns,
  };
}

/**
 * Convert recipe to LiquidConnect MetricDefinition
 * This is used to add the metric to the semantic layer
 */
export function recipeToMetricDefinition(
  recipe: CalculatedMetricRecipe
): any {
  // Returns a MetricDefinition that can be added to LiquidConnect's SemanticLayer
  return {
    type: recipe.semanticDefinition.type,
    aggregation: recipe.semanticDefinition.aggregation,
    expression: recipe.semanticDefinition.expression,
    entity: recipe.semanticDefinition.entity,
    timeField: recipe.semanticDefinition.timeField,
    description: recipe.semanticDefinition.description,
    label: recipe.semanticDefinition.label,
    unit: recipe.semanticDefinition.unit,
    format: recipe.semanticDefinition.format,
    dependencies: recipe.semanticDefinition.dependencies,
    requiredFilters: recipe.semanticDefinition.filters?.map(f =>
      `${f.field} ${f.operator} ${f.value !== undefined ? f.value : ''}`
    ),
  };
}

/**
 * Execute a recipe with caching support (5-minute TTL)
 *
 * Checks cache first, then executes if needed.
 * Cache key format: `calculated-metric:{recipeName}:{connectionId}:{hash}`
 *
 * @param recipe - The calculated metric recipe to execute
 * @param options - Execution options including connection details
 * @returns Query results with metric values (includes `cached` field)
 */
export async function executeRecipeWithCache(
  recipe: CalculatedMetricRecipe,
  options: Parameters<typeof executeRecipe>[1]
): Promise<{
  success: boolean;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  sql: string;
  executionTimeMs: number;
  error?: string;
  cached: boolean;
}> {
  // Generate cache key from recipe + connection + filters
  const cacheKey = generateCacheKey(recipe, options);

  // Note: Caching is not implemented yet - would require @turbostarter/storage
  // For now, always execute fresh
  const result = await executeRecipe(recipe, options);
  return { ...result, cached: false };
}

/**
 * Generate cache key for a recipe execution
 */
function generateCacheKey(
  recipe: CalculatedMetricRecipe,
  options: Parameters<typeof executeRecipe>[1]
): string {
  // Hash the options to create a deterministic key
  const hashInput = JSON.stringify({
    recipeName: recipe.name,
    connectionId: options.connection.id,
    timeRange: options.timeRange,
    filters: options.additionalFilters,
    limit: options.limit,
  });

  // Simple hash function (for cache key - not cryptographic)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const chr = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return `calculated-metric:${recipe.name}:${options.connection.id}:${Math.abs(hash)}`;
}

/**
 * Execute a recipe by generating SQL and running it via DuckDB adapter
 *
 * Architecture:
 * 1. Build LiquidFlow from recipe's semantic definition
 * 2. Use appropriate emitter to generate database-specific SQL
 * 3. Execute SQL via DuckDB adapter
 * 4. Return results
 *
 * Note: Use `executeRecipeWithCache()` for automatic caching support.
 *
 * @param recipe - The calculated metric recipe to execute
 * @param options - Execution options including connection details
 * @returns Query results with metric values
 */
export async function executeRecipe(
  recipe: CalculatedMetricRecipe,
  options: {
    /** Connection details for query execution */
    connection: {
      id: string;
      type: "postgres" | "mysql" | "duckdb";
      connectionString: string;
      defaultSchema?: string;
    };
    /** Time range for metric calculation (optional) */
    timeRange?: {
      start: string; // ISO date
      end: string; // ISO date
    };
    /** Additional filters to apply (optional) */
    additionalFilters?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    /** Limit number of results (optional) */
    limit?: number;
  }
): Promise<{
  success: boolean;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  sql: string;
  executionTimeMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Import dependencies (dynamic to avoid circular deps)
    const { LiquidFlowBuilder } = await import("@repo/liquid-connect");
    const { createEmitter } = await import("@repo/liquid-connect");
    const { DuckDBUniversalAdapter } = await import("@repo/liquid-connect/uvb");

    const { semanticDefinition } = recipe;

    // Step 1: Build LiquidFlow from semantic definition
    const builder = LiquidFlowBuilder.metricQuery();

    // Add source
    builder.source({
      alias: "main",
      table: semanticDefinition.entity,
      schema: options.connection.defaultSchema || "public",
    });

    // Add metric
    builder.metric({
      ref: recipe.name,
      alias: recipe.name.toLowerCase().replace(/\s+/g, "_"),
      aggregation: semanticDefinition.aggregation!,
      expression: semanticDefinition.expression,
      sourceEntity: semanticDefinition.entity,
      timeField: semanticDefinition.timeField,
      derived: semanticDefinition.type === "derived",
    });

    // Add time dimension if timeField exists
    if (semanticDefinition.timeField && semanticDefinition.timeGranularity) {
      const timeExpr = generateTimeTrunc(
        semanticDefinition.timeField,
        semanticDefinition.timeGranularity,
        options.connection.type
      );

      builder.dimension({
        ref: "time_period",
        alias: "time_period",
        expression: timeExpr,
        sourceEntity: semanticDefinition.entity,
        type: "timestamp",
      });
    }

    // Add time range filter if provided
    if (options.timeRange && semanticDefinition.timeField) {
      builder.time({
        field: semanticDefinition.timeField,
        start: options.timeRange.start,
        end: options.timeRange.end,
        expression: `${semanticDefinition.timeField} BETWEEN '${options.timeRange.start}' AND '${options.timeRange.end}'`,
      });
    }

    // Add filters from semantic definition
    if (semanticDefinition.filters?.length) {
      for (const filter of semanticDefinition.filters) {
        builder.filter({
          field: filter.field,
          operator: filter.operator as any,
          value: filter.value,
        });
      }
    }

    // Add additional filters
    if (options.additionalFilters?.length) {
      for (const filter of options.additionalFilters) {
        builder.filter({
          field: filter.field,
          operator: filter.operator as any,
          value: filter.value,
        });
      }
    }

    // Add limit
    if (options.limit) {
      builder.limit(options.limit);
    }

    // Build LiquidFlow
    const flow = builder.build();

    // Step 2: Generate SQL using appropriate emitter
    const dialect = options.connection.type === "mysql" ? "duckdb" : options.connection.type;
    const emitter = createEmitter(dialect as any, {
      defaultSchema: options.connection.defaultSchema,
    });

    const emitResult = emitter.emit(flow);
    const sql = emitResult.sql;

    // Step 3: Execute via DuckDB adapter
    const adapter = new DuckDBUniversalAdapter();
    await adapter.connect(options.connection.connectionString);

    try {
      const rows = await adapter.query(sql, emitResult.params);

      return {
        success: true,
        rows: rows as Array<Record<string, unknown>>,
        rowCount: rows.length,
        sql,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      await adapter.disconnect();
    }
  } catch (error) {
    return {
      success: false,
      rows: [],
      rowCount: 0,
      sql: "",
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate time truncation expression for different databases
 */
function generateTimeTrunc(
  field: string,
  granularity: string,
  dbType: "postgres" | "mysql" | "duckdb"
): string {
  if (dbType === "postgres" || dbType === "duckdb") {
    return `DATE_TRUNC('${granularity}', ${field})`;
  }

  // MySQL
  switch (granularity) {
    case "year":
      return `DATE_FORMAT(${field}, '%Y-01-01')`;
    case "month":
      return `DATE_FORMAT(${field}, '%Y-%m-01')`;
    case "week":
      return `DATE_FORMAT(${field}, '%Y-%m-%d')`;
    case "day":
      return `DATE_FORMAT(${field}, '%Y-%m-%d')`;
    case "hour":
      return `DATE_FORMAT(${field}, '%Y-%m-%d %H:00:00')`;
    default:
      return field;
  }
}
