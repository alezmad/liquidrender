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
  KPIRecipe,
} from "./types";
import { CalculatedMetricRecipeSchema, KPIRecipeSchema, COMMON_KPIS_BY_BUSINESS_TYPE, type KPISemanticDefinitionType } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Input type for generateKPIRecipes - allows optional fields that have defaults
 */
export type GenerateRecipeInput = Omit<GenerateRecipeRequest, "useSchemaFirstGeneration" | "generateCommonKPIs"> & {
  useSchemaFirstGeneration?: boolean;
  generateCommonKPIs?: boolean;
};

/**
 * Generate KPI recipes using Claude
 *
 * Supports two modes:
 * 1. Schema-First (recommended): Ask "what KPIs can you calculate from these columns?"
 * 2. Legacy: Given a list of KPI names, try to map them to the schema
 */
export async function generateKPIRecipes(
  input: GenerateRecipeInput,
  options: {
    model?: "haiku" | "sonnet";
    maxRecipes?: number;
  } = {}
): Promise<GenerateRecipeResponse> {
  const { model = "haiku", maxRecipes = 20 } = options;

  // Apply defaults
  const request: GenerateRecipeRequest = {
    ...input,
    useSchemaFirstGeneration: input.useSchemaFirstGeneration ?? false,
    generateCommonKPIs: input.generateCommonKPIs ?? true,
  };

  // Use schema-first generation if enabled (recommended)
  if (request.useSchemaFirstGeneration) {
    return generateSchemaFirstKPIs(request, model, maxRecipes);
  }

  // Legacy mode: generate from predefined KPI list
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
 * Convert new KPIRecipe (DSL format) to legacy CalculatedMetricRecipe format.
 *
 * This enables backward compatibility while we transition to the DSL approach.
 * The DSL definition is preserved in semanticDefinition.kpiDefinition for
 * downstream compilation by the KPI compiler.
 */
function convertKPIRecipeToLegacy(recipe: KPIRecipe): CalculatedMetricRecipe {
  const { kpiDefinition } = recipe;

  // Build legacy semanticDefinition from DSL definition
  // The expression field stores a placeholder - actual SQL is compiled later
  let expression: string;
  let aggregation: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX" | undefined;

  if (kpiDefinition.type === "simple") {
    // Simple KPI: aggregation(expression)
    expression = kpiDefinition.expression;
    aggregation = kpiDefinition.aggregation;
  } else if (kpiDefinition.type === "ratio") {
    // Ratio KPI: Placeholder - will be compiled by KPI compiler
    // Store a human-readable formula representation
    const numExpr = kpiDefinition.numerator.expression;
    const denomExpr = kpiDefinition.denominator.expression;
    expression = `(${kpiDefinition.numerator.aggregation}(${numExpr})) / (${kpiDefinition.denominator.aggregation}(${denomExpr}))`;
    if (kpiDefinition.multiplier) {
      expression = `(${expression}) * ${kpiDefinition.multiplier}`;
    }
    // No single aggregation for ratio KPIs
    aggregation = undefined;
  } else if (kpiDefinition.type === "derived") {
    // Derived KPI: expression with @metric references
    expression = kpiDefinition.expression;
    aggregation = undefined;
  } else {
    expression = "";
    aggregation = undefined;
  }

  // Build filters array
  const filters = "filters" in kpiDefinition ? kpiDefinition.filters : undefined;

  // Build dependencies list (for derived KPIs)
  const dependencies = kpiDefinition.type === "derived" ? kpiDefinition.dependencies : undefined;

  return {
    name: recipe.name,
    description: recipe.description,
    category: recipe.category as "revenue" | "growth" | "retention" | "engagement" | "efficiency" | "custom",
    semanticDefinition: {
      type: kpiDefinition.type === "ratio" ? "simple" : kpiDefinition.type, // Map ratio to simple for legacy
      expression,
      aggregation,
      entity: kpiDefinition.entity,
      timeField: kpiDefinition.timeField,
      filters,
      dependencies,
      description: recipe.description,
      format: recipe.format,
      // CRITICAL: Store original DSL definition for compilation
      // @ts-expect-error - Adding custom property for DSL compilation
      _kpiDefinition: kpiDefinition,
    },
    businessType: recipe.businessType,
    confidence: recipe.confidence,
    feasible: recipe.feasible,
    infeasibilityReason: recipe.infeasibilityReason,
    requiredColumns: recipe.requiredColumns,
  };
}

/**
 * Hybrid KPI Generation with DSL Output
 *
 * Combines business relevance with schema feasibility using DSL definitions:
 * 1. Start with KPIs that MATTER for this business type
 * 2. Check which can be calculated from the available schema
 * 3. Discover unique KPIs the data enables
 * 4. Output structured DSL definitions (not raw SQL)
 *
 * The DSL definitions are compiled to SQL by the KPI compiler using
 * dialect-specific emitters (DuckDB, PostgreSQL, etc.).
 *
 * Benefits:
 * - Business-meaningful KPIs (not just technically possible)
 * - 100% feasibility (constrained to actual columns)
 * - Dialect-agnostic output (no SQL syntax errors)
 * - Discovery of unique insights from the data
 */
async function generateSchemaFirstKPIs(
  request: GenerateRecipeRequest,
  model: "haiku" | "sonnet",
  maxRecipes: number
): Promise<GenerateRecipeResponse> {
  const modelId =
    model === "sonnet"
      ? "claude-sonnet-4-5-20250929"
      : "claude-3-5-haiku-20241022";

  // Use pre-formatted enriched schema if available
  const schemaMarkdown =
    request.vocabularyContext.enrichedSchemaMarkdown ||
    buildSchemaContext(request.vocabularyContext);

  // Get business-relevant KPIs for this type
  const businessKPIs = COMMON_KPIS_BY_BUSINESS_TYPE[request.businessType] || [];
  const priorityKPIs = businessKPIs.slice(0, 15); // Top priority KPIs for this business

  const prompt = `You are a senior data analyst helping a ${request.businessType} business understand their data.

## Your Mission
Generate the most BUSINESS-VALUABLE KPIs possible from the available data. Focus on metrics that executives, managers, and analysts actually use to make decisions.

## Business Context: ${request.businessType.toUpperCase()}

For a ${request.businessType} business, these KPIs typically matter most:
${priorityKPIs.map((kpi, i) => `${i + 1}. ${kpi}`).join("\n")}

## Available Data
${schemaMarkdown}

## Task

**Part 1: Priority KPIs (${Math.min(maxRecipes - 5, 15)} KPIs)**
From the priority list above, identify which KPIs can be calculated from the available data.

**Part 2: Data-Driven Discovery (up to 5 KPIs)**
Based on the unique columns available, suggest additional KPIs that would be valuable for this business but aren't in the standard list.

## Output Format: DSL Definitions

Return a JSON array. Each KPI uses a **structured definition** (NOT raw SQL).

### KPI Definition Types:

**1. Simple KPI** - Single aggregation:
{
  "name": "Total Revenue",
  "description": "Total revenue from all orders",
  "category": "revenue",
  "kpiDefinition": {
    "type": "simple",
    "aggregation": "SUM",
    "expression": "unit_price * quantity",
    "entity": "order_details",
    "timeField": "order_date"
  },
  "format": {"type": "currency", "decimals": 2},
  "businessType": ["${request.businessType}"],
  "confidence": 0.95,
  "feasible": true,
  "requiredColumns": [{"tableName": "order_details", "columnName": "unit_price", "purpose": "price component"}]
}

**2. Ratio KPI** - Numerator / Denominator (use for averages, rates, percentages):
{
  "name": "Average Order Value",
  "description": "Average revenue per order",
  "category": "revenue",
  "kpiDefinition": {
    "type": "ratio",
    "numerator": {"aggregation": "SUM", "expression": "unit_price * quantity"},
    "denominator": {"aggregation": "COUNT_DISTINCT", "expression": "order_id"},
    "entity": "order_details",
    "timeField": "order_date"
  },
  "format": {"type": "currency", "decimals": 2},
  "businessType": ["${request.businessType}"],
  "confidence": 0.95,
  "feasible": true,
  "requiredColumns": [...]
}

**3. Percentage KPI** - Use ratio with multiplier:
{
  "name": "Discount Rate",
  "description": "Percentage of revenue discounted",
  "category": "finance",
  "kpiDefinition": {
    "type": "ratio",
    "numerator": {"aggregation": "SUM", "expression": "discount"},
    "denominator": {"aggregation": "SUM", "expression": "unit_price * quantity"},
    "multiplier": 100,
    "entity": "order_details"
  },
  "format": {"type": "percent", "decimals": 1},
  ...
}

**4. Filtered KPI** - Conditional aggregation with subquery:
{
  "name": "Repeat Purchase Rate",
  "description": "Percentage of customers with more than one order",
  "category": "retention",
  "kpiDefinition": {
    "type": "filtered",
    "aggregation": "COUNT_DISTINCT",
    "expression": "customer_id",
    "subquery": {
      "groupBy": "customer_id",
      "having": "COUNT(*) > 1"
    },
    "percentOf": "customer_id",
    "entity": "orders"
  },
  "format": {"type": "percent", "decimals": 1},
  ...
}
Note: Use "percentOf" when the KPI is a percentage (filtered / total * 100). The value should be the same expression being counted.

**5. Window KPI** - Running totals, period comparisons:
{
  "name": "Month-over-Month Growth",
  "description": "Percentage growth compared to previous month",
  "category": "growth",
  "kpiDefinition": {
    "type": "window",
    "aggregation": "SUM",
    "expression": "revenue",
    "window": {
      "partitionBy": [],
      "orderBy": [{"field": "month", "direction": "asc"}],
      "lag": {"offset": 1}
    },
    "outputExpression": "(current - lag) / NULLIF(lag, 0) * 100",
    "entity": "monthly_revenue"
  },
  ...
}

**6. Case KPI** - Conditional value aggregation:
{
  "name": "Premium Revenue",
  "description": "Revenue from premium category only",
  "category": "revenue",
  "kpiDefinition": {
    "type": "case",
    "aggregation": "SUM",
    "cases": [
      {"when": "category = 'premium'", "then": "amount"},
      {"else": "0"}
    ],
    "entity": "orders"
  },
  ...
}

**7. Composite KPI** - Multi-table joins:
{
  "name": "Revenue per Segment",
  "description": "Total revenue grouped by customer segment",
  "category": "revenue",
  "kpiDefinition": {
    "type": "composite",
    "aggregation": "SUM",
    "expression": "o.amount",
    "sources": [
      {"alias": "o", "table": "orders"},
      {"alias": "c", "table": "customers", "join": {"type": "LEFT", "on": "o.customer_id = c.id"}}
    ],
    "groupBy": ["c.segment"],
    "entity": "orders"
  },
  ...
}

## CRITICAL RULES

1. **NEVER write SQL syntax** - Use structured definitions only
   - WRONG: "expression": "COUNT(DISTINCT customer_id)"
   - RIGHT: "aggregation": "COUNT_DISTINCT", "expression": "customer_id"

2. **expression = column(s) only** - No SQL functions in expressions
   - WRONG: "expression": "SUM(price) / COUNT(*)"
   - RIGHT: Use "type": "ratio" with numerator/denominator

3. **Aggregation types** (all converted to correct SQL by compiler):
   - Basic: SUM, COUNT, COUNT_DISTINCT, AVG, MIN, MAX
   - Statistical: MEDIAN, PERCENTILE_25, PERCENTILE_75, PERCENTILE_90, PERCENTILE_95, PERCENTILE_99, STDDEV, VARIANCE
   - Array: ARRAY_AGG, STRING_AGG

4. **ONLY use columns from the schema** - never invent column names

5. **Use exact column names** from the schema

6. **Confidence scoring**:
   - 0.9-1.0: Perfect data fit
   - 0.7-0.9: Good fit with minor assumptions
   - 0.5-0.7: Proxy calculation

7. **Skip if not feasible** - don't force KPIs that can't be calculated

8. **Choose simplest type** - Prefer in this order: simple > ratio > filtered > window > case > composite
   - Only use advanced types when simpler types cannot express the metric

9. **Window KPIs require pre-aggregated data** - Window functions work best with time-series tables or views that already have period-level aggregation

## Quality Check
Before finalizing each KPI:
- Is the definition type correct (simple vs ratio vs filtered vs window vs case vs composite)?
- Are all column names from the schema?
- Would an executive find this actionable?

Return ONLY a valid JSON array. No markdown, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== "text") {
      throw new Error("No text content in response");
    }

    // Parse JSON array from response
    const jsonText = content.text.trim();
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new Error("Expected JSON array of KPIs");
    }

    // Validate each recipe using new KPIRecipeSchema (DSL format)
    // Then convert to legacy format for backward compatibility
    const recipes: CalculatedMetricRecipe[] = [];
    const warnings: string[] = [];

    for (const item of parsed) {
      try {
        // Validate against new DSL-based schema
        const validated = KPIRecipeSchema.parse(item);

        // Convert to legacy format for backward compatibility
        const legacyRecipe = convertKPIRecipeToLegacy(validated);
        recipes.push(legacyRecipe);
      } catch (e) {
        const itemName = (item as { name?: string })?.name ?? "unknown";
        warnings.push(`Invalid recipe "${itemName}": ${e}`);
      }
    }

    // Calculate statistics
    const feasibleRecipes = recipes.filter((r) => r.feasible);
    const averageConfidence =
      recipes.length > 0
        ? recipes.reduce((sum, r) => sum + r.confidence, 0) / recipes.length
        : 0;

    console.log(`[SchemaFirstKPI] Generated ${recipes.length} KPIs (${feasibleRecipes.length} feasible)`);

    return {
      recipes,
      totalGenerated: recipes.length,
      feasibleCount: feasibleRecipes.length,
      infeasibleCount: recipes.length - feasibleRecipes.length,
      averageConfidence,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("[SchemaFirstKPI] Generation failed:", error);
    return {
      recipes: [],
      totalGenerated: 0,
      feasibleCount: 0,
      infeasibleCount: 0,
      averageConfidence: 0,
      warnings: [`Schema-first generation failed: ${error}`],
    };
  }
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
