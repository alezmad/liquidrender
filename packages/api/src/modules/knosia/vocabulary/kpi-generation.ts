/**
 * KPI Generation for Vocabulary
 *
 * Generates KPI recipes and stores them as vocabulary items (type='kpi').
 * This replaces the old calculated-metrics approach by using unified vocabulary.
 *
 * KPIs are business-meaningful formulas like:
 * - GMV = SUM(unit_price * quantity)
 * - Net Revenue = SUM((price * qty) * (1 - discount))
 * - On-Time Delivery Rate = on_time_orders / total_orders * 100
 *
 * Architecture:
 * - Phase 1: LLM generates semantic metric definitions
 * - Phase 2: Definitions saved to knosiaVocabularyItem (type='kpi')
 * - Phase 3: LiquidConnect emitters compile to database-specific SQL
 */

import type {
  DetectedVocabulary,
  ExtractedSchema,
  ProfilingData,
} from "@repo/liquid-connect/uvb";
import {
  compileKPIFormula,
  type KPISemanticDefinition,
  type KPIFilter,
  type SimpleKPIDefinition,
  isDerivedKPI,
  isFilteredKPI,
} from "@repo/liquid-connect/kpi";
import { createEmitter, type Dialect } from "@repo/liquid-connect";
import { generateKPIRecipes, type GenerateRecipeInput } from "@turbostarter/ai/kpi";
import type { CalculatedMetricRecipe, FailedRecipe, GenerationStats } from "@turbostarter/ai/kpi";
import { VALUE_VALIDATION_PROMPT, type KPIValueValidation } from "@turbostarter/ai/kpi/prompts";
import { db } from "@turbostarter/db/server";
import { knosiaVocabularyItem } from "@turbostarter/db/schema/knosia";
import { generateId } from "@turbostarter/shared/utils";
import { recordRepair } from "./repair-training";
import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// Types
// ============================================================================

/**
 * Quality score for a KPI - helps users understand reliability
 */
export interface KPIQualityScore {
  /** Overall quality score (0-100) - weighted average of dimensions */
  overall: number;
  /** How well does the available data match what's needed? (0-100) */
  dataFit: number;
  /** Is this a standard/important KPI for this business type? (0-100) */
  businessRelevance: number;
  /** How reliable is the calculation formula? (0-100) */
  calculationConfidence: number;
  /** Can decisions be made from this metric? (0-100) */
  actionability: number;
  /** Based on profiling - nulls, freshness, completeness (0-100) */
  dataQuality: number;
  /** Warning flags for the user */
  flags: KPIQualityFlag[];
}

export type KPIQualityFlag =
  | "proxy_calculation"    // Using approximate data
  | "high_null_rate"       // >10% nulls in source columns
  | "stale_data"           // Data hasn't been updated recently
  | "low_coverage"         // Only covers subset of business
  | "complex_formula"      // Multi-step calculation, more error-prone
  | "missing_time_field"   // Can't do time-series analysis
  | "low_cardinality"      // Few unique values, less meaningful
  | "derived_metric";      // Depends on other metrics

interface GenerateAndStoreKPIsInput {
  detectedVocabulary: DetectedVocabulary;
  profilingData: ProfilingData | null;
  businessType: string;
  extractedSchema: ExtractedSchema;
  orgId: string;
  workspaceId: string;
  /** Optional: Connection details for value validation (executes KPIs against real data) */
  connection?: {
    connectionString: string;
    defaultSchema?: string;
    type: "postgres" | "mysql" | "duckdb";
  };
}

interface GenerateAndStoreKPIsResult {
  totalGenerated: number;
  feasibleCount: number;
  storedCount: number;
  failedCount: number;
  categories: string[];
  kpis: Array<{
    id: string;
    name: string;
    category: string;
    confidence: number | null;
    qualityScore: KPIQualityScore;
  }>;
  generationStats?: GenerationStats;
  /** Value validation stats (only if connection provided) */
  valueValidation?: {
    executed: number;
    valid: number;
    suspicious: number;
    invalid: number;
    executionErrors: number;
  };
}

/**
 * Semantic role for a column - determines how it can be used in KPIs
 */
type SemanticRole =
  | "measure" // Numeric values that can be summed/averaged (e.g., price, quantity)
  | "id" // Unique identifier (e.g., order_id, customer_id)
  | "foreign_key" // Reference to another table's ID
  | "date" // Timestamp/date for time-series grouping
  | "dimension" // Categorical values for grouping/filtering
  | "boolean" // True/false flags
  | "text"; // Free-form text (usually not aggregatable)

/**
 * Aggregation hint for a column - suggests how to aggregate
 */
type AggregationHint =
  | "SUM" // For additive measures (revenue, quantity)
  | "AVG" // For rate-like measures (price, discount)
  | "COUNT_DISTINCT" // For counting unique values (customers, orders)
  | "COUNT" // For counting rows
  | "MIN" // For date/numeric ranges
  | "MAX" // For date/numeric ranges
  | null; // Don't aggregate (IDs, text)

/**
 * Enriched column with semantic intelligence
 */
interface EnrichedColumn {
  name: string;
  type: string;
  semanticRole: SemanticRole;
  aggregationHint: AggregationHint;
  statistics?: {
    min?: number | string;
    max?: number | string;
    mean?: number;
    distinctCount?: number;
    nullPercentage?: number;
    topValues?: Array<{ value: unknown; percentage: number }>;
  };
  // Original vocabulary classification if available
  isDetectedMetric?: boolean;
  isDetectedDimension?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Common patterns for identifying column roles by name
 */
const ID_PATTERNS = [/_id$/, /^id$/, /_key$/, /^pk_/, /_pk$/];
const DATE_PATTERNS = [/_date$/, /_at$/, /^date_/, /timestamp/, /created/, /updated/, /modified/];
const BOOLEAN_PATTERNS = [/^is_/, /^has_/, /^can_/, /^should_/, /discontinued/, /active/, /enabled/];
const ADDITIVE_MEASURE_PATTERNS = [/quantity/, /amount/, /total/, /count/, /units/, /freight/, /cost/];
const RATE_MEASURE_PATTERNS = [/price/, /rate/, /discount/, /percentage/, /ratio/, /margin/];

/**
 * Determine semantic role for a column based on type, name, and profiling data
 */
function determineSemanticRole(
  columnName: string,
  dataType: string,
  profile: import("@repo/liquid-connect/uvb").ColumnProfile | undefined,
  tableName: string,
  tableRowCount: number,
  vocabulary: DetectedVocabulary
): { role: SemanticRole; aggregationHint: AggregationHint } {
  const nameLower = columnName.toLowerCase();
  const typeLower = dataType.toLowerCase();

  // Check if vocabulary already classified this column
  const isMetric = vocabulary.metrics?.some(
    (m) => m.table === tableName && m.column === columnName
  );
  const isDimension = vocabulary.dimensions?.some(
    (d) => d.table === tableName && d.column === columnName
  );

  // 1. Date/timestamp columns → role: date
  if (
    typeLower.includes("timestamp") ||
    typeLower.includes("date") ||
    DATE_PATTERNS.some((p) => p.test(nameLower))
  ) {
    return { role: "date", aggregationHint: null };
  }

  // 2. Boolean columns → role: boolean
  if (
    typeLower === "boolean" ||
    typeLower === "bool" ||
    BOOLEAN_PATTERNS.some((p) => p.test(nameLower))
  ) {
    return { role: "boolean", aggregationHint: "COUNT" };
  }

  // 3. ID detection (high cardinality + naming pattern)
  const isIdByName = ID_PATTERNS.some((p) => p.test(nameLower));
  const distinctCount = profile?.numeric?.distinctCount ?? profile?.categorical?.cardinality;
  const uniquenessRatio = distinctCount && tableRowCount > 0
    ? distinctCount / tableRowCount
    : 0;

  // Primary key: unique for every row
  if (isIdByName && uniquenessRatio > 0.9) {
    return { role: "id", aggregationHint: null };
  }

  // Foreign key: ID pattern but not unique (references another table)
  if (isIdByName && uniquenessRatio < 0.9) {
    return { role: "foreign_key", aggregationHint: "COUNT_DISTINCT" };
  }

  // 4. Numeric columns: measure vs dimension
  if (
    typeLower.includes("int") ||
    typeLower.includes("decimal") ||
    typeLower.includes("numeric") ||
    typeLower.includes("float") ||
    typeLower.includes("double") ||
    typeLower.includes("real") ||
    typeLower.includes("money")
  ) {
    // If vocabulary detected as metric, trust it
    if (isMetric) {
      // Determine SUM vs AVG based on name patterns
      if (RATE_MEASURE_PATTERNS.some((p) => p.test(nameLower))) {
        return { role: "measure", aggregationHint: "AVG" };
      }
      return { role: "measure", aggregationHint: "SUM" };
    }

    // High cardinality numeric that's not an ID → measure
    if (distinctCount && distinctCount > 20) {
      if (RATE_MEASURE_PATTERNS.some((p) => p.test(nameLower))) {
        return { role: "measure", aggregationHint: "AVG" };
      }
      if (ADDITIVE_MEASURE_PATTERNS.some((p) => p.test(nameLower))) {
        return { role: "measure", aggregationHint: "SUM" };
      }
      // Default to SUM for unknown numeric measures
      return { role: "measure", aggregationHint: "SUM" };
    }

    // Low cardinality numeric → dimension (e.g., status codes, ratings)
    if (distinctCount && distinctCount <= 20) {
      return { role: "dimension", aggregationHint: null };
    }

    // Unknown cardinality → assume measure
    return { role: "measure", aggregationHint: "SUM" };
  }

  // 5. Text/varchar columns: dimension vs text
  if (
    typeLower.includes("varchar") ||
    typeLower.includes("char") ||
    typeLower.includes("text") ||
    typeLower.includes("string")
  ) {
    // If vocabulary detected as dimension, trust it
    if (isDimension) {
      return { role: "dimension", aggregationHint: null };
    }

    // Low cardinality text → dimension (good for grouping)
    if (distinctCount && distinctCount <= 100) {
      return { role: "dimension", aggregationHint: null };
    }

    // High cardinality text → free text (not good for aggregation)
    if (distinctCount && distinctCount > 100) {
      return { role: "text", aggregationHint: null };
    }

    // Unknown → default to dimension
    return { role: "dimension", aggregationHint: null };
  }

  // 6. Default fallback
  return { role: "text", aggregationHint: null };
}

/**
 * Enrich a column with semantic intelligence using profiling data
 */
function enrichColumn(
  columnName: string,
  dataType: string,
  tableName: string,
  tableRowCount: number,
  profile: import("@repo/liquid-connect/uvb").ColumnProfile | undefined,
  vocabulary: DetectedVocabulary
): EnrichedColumn {
  const { role, aggregationHint } = determineSemanticRole(
    columnName,
    dataType,
    profile,
    tableName,
    tableRowCount,
    vocabulary
  );

  const enriched: EnrichedColumn = {
    name: columnName,
    type: dataType,
    semanticRole: role,
    aggregationHint,
  };

  // Add statistics from profiling
  if (profile) {
    enriched.statistics = {
      nullPercentage: profile.nullPercentage,
      distinctCount:
        profile.numeric?.distinctCount ??
        profile.categorical?.cardinality ??
        profile.distinctCountEstimate ??
        undefined,
    };

    // Add numeric statistics
    if (profile.numeric) {
      enriched.statistics.min = profile.numeric.min;
      enriched.statistics.max = profile.numeric.max;
      enriched.statistics.mean = profile.numeric.mean;
    }

    // Add temporal statistics
    if (profile.temporal) {
      enriched.statistics.min = profile.temporal.min.toISOString().split("T")[0];
      enriched.statistics.max = profile.temporal.max.toISOString().split("T")[0];
    }

    // Add top values for dimensions
    if (profile.categorical?.topValues && role === "dimension") {
      enriched.statistics.topValues = profile.categorical.topValues
        .slice(0, 5)
        .map((v) => ({ value: v.value, percentage: v.percentage }));
    }
  }

  // Mark if detected by vocabulary rules
  enriched.isDetectedMetric = vocabulary.metrics?.some(
    (m) => m.table === tableName && m.column === columnName
  );
  enriched.isDetectedDimension = vocabulary.dimensions?.some(
    (d) => d.table === tableName && d.column === columnName
  );

  return enriched;
}

/**
 * Build schema-first context with enriched columns for KPI generation
 *
 * This produces a context that tells the LLM exactly what columns exist
 * with their semantic roles and statistics, enabling schema-first KPI discovery.
 */
function buildEnrichedSchemaContext(
  schema: ExtractedSchema,
  vocabulary: DetectedVocabulary,
  profilingData: ProfilingData | null
): {
  tables: Array<{
    name: string;
    rowCount: number;
    columns: EnrichedColumn[];
  }>;
  summary: {
    totalTables: number;
    totalMeasures: number;
    totalDimensions: number;
    totalDateFields: number;
  };
} {
  const tables: Array<{
    name: string;
    rowCount: number;
    columns: EnrichedColumn[];
  }> = [];

  let totalMeasures = 0;
  let totalDimensions = 0;
  let totalDateFields = 0;

  for (const table of schema.tables) {
    const tableProfile = profilingData?.tableProfiles[table.name];
    const rowCount = tableProfile?.rowCountExact ?? tableProfile?.rowCountEstimate ?? 0;

    const enrichedColumns: EnrichedColumn[] = [];

    for (const col of table.columns) {
      const profileKey = `${table.name}.${col.name}`;
      const colProfile = profilingData?.columnProfiles[profileKey];

      const enriched = enrichColumn(
        col.name,
        col.dataType,
        table.name,
        rowCount,
        colProfile,
        vocabulary
      );

      enrichedColumns.push(enriched);

      // Update summary counts
      if (enriched.semanticRole === "measure") totalMeasures++;
      if (enriched.semanticRole === "dimension") totalDimensions++;
      if (enriched.semanticRole === "date") totalDateFields++;
    }

    tables.push({
      name: table.name,
      rowCount,
      columns: enrichedColumns,
    });
  }

  return {
    tables,
    summary: {
      totalTables: tables.length,
      totalMeasures,
      totalDimensions,
      totalDateFields,
    },
  };
}

/**
 * Format enriched schema as markdown table for LLM prompt
 */
function formatEnrichedSchemaForPrompt(
  enrichedSchema: ReturnType<typeof buildEnrichedSchemaContext>
): string {
  const lines: string[] = [];

  for (const table of enrichedSchema.tables) {
    lines.push(`### Table: ${table.name} (${table.rowCount.toLocaleString()} rows)`);
    lines.push("| Column | Type | Role | Aggregation | Stats |");
    lines.push("|--------|------|------|-------------|-------|");

    for (const col of table.columns) {
      const stats = col.statistics;
      let statsStr = "";

      if (stats) {
        const parts: string[] = [];

        if (stats.distinctCount !== undefined) {
          parts.push(`${stats.distinctCount} unique`);
        }
        if (stats.nullPercentage !== undefined && stats.nullPercentage > 0) {
          parts.push(`${stats.nullPercentage.toFixed(0)}% null`);
        }
        if (stats.min !== undefined && stats.max !== undefined) {
          parts.push(`${stats.min} to ${stats.max}`);
        }
        if (stats.mean !== undefined) {
          parts.push(`avg: ${stats.mean.toFixed(2)}`);
        }

        statsStr = parts.join(", ");
      }

      lines.push(
        `| ${col.name} | ${col.type} | ${col.semanticRole} | ${col.aggregationHint ?? "-"} | ${statsStr || "-"} |`
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Convert enriched schema to vocabulary context for KPI generation
 * This bridges the new enriched format to the existing API contract
 */
function enrichedSchemaToVocabularyContext(
  enrichedSchema: ReturnType<typeof buildEnrichedSchemaContext>,
  vocabulary: DetectedVocabulary
): GenerateRecipeInput["vocabularyContext"] {
  return {
    tables: enrichedSchema.tables.map((table) => ({
      name: table.name,
      rowCount: table.rowCount,
      columns: table.columns.map((col) => ({
        name: col.name,
        type: col.type,
        semanticType: col.semanticRole === "measure" ? "measure" : col.semanticRole === "dimension" ? "dimension" : undefined,
        semanticRole: col.semanticRole,
        aggregationHint: col.aggregationHint,
        statistics: col.statistics,
      })),
    })),
    detectedMetrics: vocabulary.metrics?.map((m) => m.name) || [],
    detectedDimensions: vocabulary.dimensions?.map((d) => d.name) || [],
    // NEW: Pass enriched schema markdown for schema-first prompt
    enrichedSchemaMarkdown: formatEnrichedSchemaForPrompt(enrichedSchema),
  };
}

/**
 * Categorize KPI based on name/description patterns
 */
function categorizeKPI(name: string): string {
  const lower = name.toLowerCase();

  if (
    lower.includes("revenue") ||
    lower.includes("sales") ||
    lower.includes("mrr") ||
    lower.includes("arr") ||
    lower.includes("gmv")
  ) {
    return "revenue";
  }
  if (
    lower.includes("growth") ||
    lower.includes("churn") ||
    lower.includes("retention") ||
    lower.includes("acquisition") ||
    lower.includes("repeat")
  ) {
    return "growth";
  }
  if (
    lower.includes("active") ||
    lower.includes("usage") ||
    lower.includes("engagement") ||
    lower.includes("dau") ||
    lower.includes("mau")
  ) {
    return "engagement";
  }
  if (
    lower.includes("delivery") ||
    lower.includes("shipping") ||
    lower.includes("fulfillment") ||
    lower.includes("on-time") ||
    lower.includes("shipped")
  ) {
    return "fulfillment";
  }
  if (
    lower.includes("inventory") ||
    lower.includes("stock") ||
    lower.includes("reorder") ||
    lower.includes("turnover") ||
    lower.includes("coverage")
  ) {
    return "inventory";
  }
  if (lower.includes("freight") || lower.includes("logistics") || lower.includes("transport")) {
    return "logistics";
  }
  if (lower.includes("discount") || lower.includes("margin") || lower.includes("profit")) {
    return "finance";
  }
  if (
    lower.includes("cost") ||
    lower.includes("efficiency") ||
    lower.includes("time") ||
    lower.includes("duration") ||
    lower.includes("per employee") ||
    lower.includes("per order")
  ) {
    return "operational";
  }
  if (
    lower.includes("concentration") ||
    lower.includes("top customer") ||
    lower.includes("risk")
  ) {
    return "risk";
  }

  return "other";
}

/**
 * Generate slug from name
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Extract vocabulary lineage from recipe
 */
function extractVocabularyLineage(
  recipe: CalculatedMetricRecipe,
  vocabulary: DetectedVocabulary
): string[] {
  const { semanticDefinition } = recipe;
  const lineage: string[] = [];

  // Find base metric referenced in expression
  const baseMetric = vocabulary.metrics?.find(
    (m) =>
      m.name === semanticDefinition.expression ||
      m.column === semanticDefinition.expression
  );
  if (baseMetric?.id) {
    lineage.push(baseMetric.id);
  }

  // Find dimensions used in filters
  if (semanticDefinition.filters) {
    for (const filter of semanticDefinition.filters) {
      const dimension = vocabulary.dimensions?.find(
        (d) => d.name === filter.field || d.column === filter.field
      );
      if (dimension?.id) {
        lineage.push(dimension.id);
      }
    }
  }

  return lineage;
}

/**
 * Find actual source table(s) for a KPI recipe.
 *
 * Priority order:
 * 1. Use `semanticDefinition.entity` from LLM (most reliable - LLM explicitly specified the table)
 * 2. Use `requiredColumns` to find tables (LLM listed which columns are needed)
 * 3. Fall back to formula parsing (least reliable)
 *
 * KPI formulas like "unit_price * quantity" need their source table resolved
 * so the semantic layer can properly compile them.
 */
function findSourceTablesForRecipe(
  recipe: CalculatedMetricRecipe,
  schema: ExtractedSchema,
  vocabulary: DetectedVocabulary
): string[] {
  const { semanticDefinition, requiredColumns } = recipe;

  // Build set of valid table names from schema (case-insensitive lookup)
  const validTableNames = new Set(schema.tables.map((t) => t.name.toLowerCase()));
  const tableNameMap = new Map(schema.tables.map((t) => [t.name.toLowerCase(), t.name]));

  // 1. Primary: Use semanticDefinition.entity if it's a valid table
  if (semanticDefinition.entity) {
    const entityLower = semanticDefinition.entity.toLowerCase();
    const actualTableName = tableNameMap.get(entityLower);
    if (actualTableName) {
      return [actualTableName];
    }
  }

  // 2. Secondary: Use requiredColumns to find tables
  if (requiredColumns && requiredColumns.length > 0) {
    const tablesFromColumns = new Set<string>();

    for (const req of requiredColumns) {
      const tableLower = req.tableName.toLowerCase();
      const actualTableName = tableNameMap.get(tableLower);
      if (actualTableName) {
        // Verify the column exists in this table
        const schemaTable = schema.tables.find((t) => t.name === actualTableName);
        const columnExists = schemaTable?.columns.some(
          (c) => c.name.toLowerCase() === req.columnName.toLowerCase()
        );
        if (columnExists) {
          tablesFromColumns.add(actualTableName);
        }
      }
    }

    if (tablesFromColumns.size > 0) {
      return [...tablesFromColumns];
    }
  }

  // 3. Fallback: Parse the formula to find column matches
  const formula = semanticDefinition.expression;
  return findSourceTablesFromFormula(formula, schema, vocabulary);
}

/**
 * Parse a formula string to find matching source tables.
 * This is the fallback method when entity/requiredColumns aren't available.
 */
function findSourceTablesFromFormula(
  formula: string,
  schema: ExtractedSchema,
  vocabulary: DetectedVocabulary
): string[] {
  // Extract potential column/identifier names from formula
  // Match word characters that could be column names (excluding SQL keywords)
  const sqlKeywords = new Set([
    "sum", "avg", "count", "min", "max", "case", "when", "then", "else", "end",
    "and", "or", "not", "null", "true", "false", "as", "from", "where", "group",
    "by", "having", "order", "limit", "offset", "distinct", "all", "between",
    "in", "like", "is", "cast", "coalesce", "nullif", "if", "over", "partition",
  ]);

  const identifiers = formula
    .toLowerCase()
    .match(/\b[a-z_][a-z0-9_]*\b/g)
    ?.filter((id) => !sqlKeywords.has(id)) ?? [];

  if (identifiers.length === 0) return [];

  // Build column-to-table map from schema
  const columnToTables = new Map<string, string[]>();
  for (const table of schema.tables) {
    for (const col of table.columns) {
      const colLower = col.name.toLowerCase();
      const existing = columnToTables.get(colLower) ?? [];
      existing.push(table.name);
      columnToTables.set(colLower, existing);
    }
  }

  // Also check vocabulary metrics for their source tables
  const metricToTable = new Map<string, string>();
  for (const metric of vocabulary.metrics ?? []) {
    metricToTable.set(slugify(metric.name), metric.table);
    metricToTable.set(metric.column.toLowerCase(), metric.table);
  }

  // Count how many formula identifiers each table contains
  const tableMatchCounts = new Map<string, number>();

  for (const id of identifiers) {
    // First check if it's a known metric
    const metricTable = metricToTable.get(id);
    if (metricTable) {
      tableMatchCounts.set(metricTable, (tableMatchCounts.get(metricTable) ?? 0) + 1);
      continue;
    }

    // Then check schema columns
    const tables = columnToTables.get(id);
    if (tables) {
      for (const t of tables) {
        tableMatchCounts.set(t, (tableMatchCounts.get(t) ?? 0) + 1);
      }
    }
  }

  if (tableMatchCounts.size === 0) return [];

  // If only one table matches, use it
  if (tableMatchCounts.size === 1) {
    return [...tableMatchCounts.keys()];
  }

  // Multiple tables match - pick the one with most column matches
  // This helps resolve ambiguous columns like 'id' that exist in many tables
  const sortedTables = [...tableMatchCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([table]) => table);

  // Return the best match (most columns found)
  const bestTable = sortedTables[0];
  return bestTable ? [bestTable] : [];
}

// ============================================================================
// DSL Compilation
// ============================================================================

/**
 * Options for KPI compilation
 */
interface CompileKPIOptions {
  /** Database dialect (default: duckdb) */
  dialect?: Dialect;
  /** Schema prefix for table references */
  schema?: string;
  /** Metric expressions map for derived KPIs (maps metric slug to compiled expression) */
  metricExpressions?: Record<string, string>;
}

/**
 * Compile a KPI DSL definition to SQL using dialect-specific emitters.
 *
 * This is the key function that eliminates dialect-specific SQL errors.
 * The DSL definition uses aggregation types like "COUNT_DISTINCT" which
 * the emitter converts to correct SQL like "COUNT(DISTINCT x)".
 *
 * @param kpiDefinition - The DSL definition from LLM
 * @param options - Compilation options (dialect, schema, metric expressions)
 * @returns Compiled SQL expression or null if compilation fails
 */
function compileKPIToSQL(
  kpiDefinition: KPISemanticDefinition,
  options: CompileKPIOptions = {}
): { expression: string; sql: string } | null {
  const { dialect = "duckdb", schema, metricExpressions } = options;

  try {
    const emitter = createEmitter(dialect, { defaultSchema: schema });

    const result = compileKPIFormula(kpiDefinition, emitter, {
      schema,
      quoteIdentifiers: true,
      metricExpressions, // Pass metric expressions for derived KPIs
    });

    if (!result.success) {
      console.error(`[KPI Compilation] Failed for ${kpiDefinition.entity}:`, result.error);
      return null;
    }

    return {
      expression: result.expression,
      sql: result.sql,
    };
  } catch (error) {
    console.error("[KPI Compilation] Error:", error);
    return null;
  }
}

/**
 * Extract DSL definition from a recipe.
 *
 * Checks for _kpiDefinition (new DSL format) stored by recipe-generator.
 * Falls back to inferring DSL from semanticDefinition for legacy recipes.
 */
function extractKPIDefinition(recipe: CalculatedMetricRecipe): KPISemanticDefinition | null {
  // New DSL format: _kpiDefinition is stored in semanticDefinition
  const kpiDef = (recipe.semanticDefinition as any)?._kpiDefinition;

  if (kpiDef && typeof kpiDef === "object" && "type" in kpiDef) {
    return kpiDef as KPISemanticDefinition;
  }

  // Check if semanticDefinition itself is a KPI definition (e.g., from V2 pipeline)
  if (
    recipe.semanticDefinition &&
    typeof recipe.semanticDefinition === "object" &&
    "type" in recipe.semanticDefinition &&
    "entity" in recipe.semanticDefinition
  ) {
    return recipe.semanticDefinition as KPISemanticDefinition;
  }

  // Fallback: Infer DSL from legacy semanticDefinition
  // This ensures older recipes still get compiled correctly
  const { expression, aggregation, entity, filters } = recipe.semanticDefinition;

  if (!entity || !expression) {
    return null;
  }

  // Convert legacy format to DSL
  // Legacy format uses raw expression + aggregation type
  const legacyAggregation = aggregation?.toUpperCase() as
    | "SUM"
    | "COUNT"
    | "COUNT_DISTINCT"
    | "AVG"
    | "MIN"
    | "MAX"
    | undefined;

  if (!legacyAggregation) {
    // No aggregation specified - try to infer from expression
    // If expression contains "/" it might be a ratio
    if (expression.includes("/")) {
      // Can't reliably infer ratio structure from string
      return null;
    }
    // Default to a simple KPI with the expression as-is
    return {
      type: "simple",
      aggregation: "SUM",
      expression,
      entity,
      filters: filters?.map((f) => ({
        field: f.field,
        operator: f.operator as KPIFilter["operator"],
        value: f.value,
      })),
    };
  }

  return {
    type: "simple",
    aggregation: legacyAggregation,
    expression,
    entity,
    filters: filters?.map((f) => ({
      field: f.field,
      operator: f.operator as KPIFilter["operator"],
      value: f.value,
    })),
  };
}

// ============================================================================
// Quality Scoring
// ============================================================================

/**
 * Priority KPIs by business type - these get higher business relevance scores
 */
const PRIORITY_KPIS: Record<string, string[]> = {
  ecommerce: [
    "gmv", "gross_merchandise_value", "revenue", "aov", "average_order_value",
    "customer_acquisition_cost", "cac", "lifetime_value", "ltv", "clv",
    "conversion_rate", "cart_abandonment", "repeat_purchase_rate",
  ],
  saas: [
    "mrr", "monthly_recurring_revenue", "arr", "annual_recurring_revenue",
    "churn_rate", "customer_churn", "revenue_churn", "net_revenue_retention",
    "nrr", "arpu", "average_revenue_per_user", "cac", "ltv",
  ],
  retail: [
    "sales_per_sqft", "inventory_turnover", "gross_margin", "shrinkage_rate",
    "average_transaction_value", "items_per_transaction", "conversion_rate",
  ],
  distribution: [
    "on_time_delivery", "fill_rate", "freight_cost", "order_cycle_time",
    "inventory_turns", "days_sales_outstanding",
  ],
  general: [
    "revenue", "total_sales", "customer_count", "order_count",
    "average_order_value", "profit_margin",
  ],
};

/**
 * Calculate quality score for a KPI based on multiple dimensions
 */
function calculateKPIQualityScore(
  recipe: CalculatedMetricRecipe,
  sourceTables: string[],
  enrichedSchema: ReturnType<typeof buildEnrichedSchemaContext>,
  profilingData: ProfilingData | null,
  businessType: string
): KPIQualityScore {
  const flags: KPIQualityFlag[] = [];
  const { semanticDefinition, confidence, requiredColumns } = recipe;

  // 1. Data Fit Score (0-100)
  // How well do the available columns match what's needed?
  let dataFit = 100;
  if (requiredColumns && requiredColumns.length > 0) {
    // Check how many required columns actually exist
    const existingColumns = new Set<string>();
    for (const table of enrichedSchema.tables) {
      for (const col of table.columns) {
        existingColumns.add(`${table.name.toLowerCase()}.${col.name.toLowerCase()}`);
      }
    }

    let foundColumns = 0;
    for (const req of requiredColumns) {
      const key = `${req.tableName.toLowerCase()}.${req.columnName.toLowerCase()}`;
      if (existingColumns.has(key)) {
        foundColumns++;
      }
    }
    dataFit = Math.round((foundColumns / requiredColumns.length) * 100);
  }

  if (sourceTables.length === 0) {
    dataFit = Math.max(dataFit - 30, 0);
    flags.push("proxy_calculation");
  }

  // 2. Business Relevance Score (0-100)
  // Is this a standard/important KPI for the business type?
  const kpiSlug = slugify(recipe.name);
  const priorityList = PRIORITY_KPIS[businessType.toLowerCase()] ?? PRIORITY_KPIS.general ?? [];

  let businessRelevance = 60; // Default for detected KPIs
  if (priorityList.some((p) => kpiSlug.includes(p) || p.includes(kpiSlug))) {
    businessRelevance = 95; // High priority KPI for this business type
  } else if (recipe.category && ["revenue", "growth", "engagement"].includes(recipe.category)) {
    businessRelevance = 80; // Important category
  }

  // 3. Calculation Confidence (0-100)
  // How reliable is the formula? Based on LLM confidence + complexity
  let calculationConfidence = Math.round((confidence ?? 0.7) * 100);

  // Penalize complex formulas
  const formula = semanticDefinition.expression ?? "";
  const complexityIndicators = ["/", "CASE", "WHEN", "IIF", "NULLIF", "COALESCE"];
  const complexity = complexityIndicators.filter((ind) =>
    formula.toUpperCase().includes(ind)
  ).length;

  if (complexity >= 2) {
    calculationConfidence = Math.max(calculationConfidence - 15, 50);
    flags.push("complex_formula");
  }

  // Derived metrics have lower confidence (depends on other KPIs)
  if (semanticDefinition.dependencies && semanticDefinition.dependencies.length > 0) {
    calculationConfidence = Math.max(calculationConfidence - 10, 50);
    flags.push("derived_metric");
  }

  // 4. Actionability Score (0-100)
  // Can decisions be made from this metric?
  let actionability = 75; // Default

  // KPIs with time field enable trends = more actionable
  if (semanticDefinition.timeField) {
    actionability += 15;
  } else {
    flags.push("missing_time_field");
  }

  // KPIs with filters enable drill-down = more actionable
  if (semanticDefinition.filters && semanticDefinition.filters.length > 0) {
    actionability += 10;
  }

  // Rate/percentage KPIs are generally more actionable than raw counts
  const isRateKPI = recipe.name.toLowerCase().includes("rate") ||
    recipe.name.toLowerCase().includes("%") ||
    recipe.name.toLowerCase().includes("ratio");
  if (isRateKPI) {
    actionability += 5;
  }

  actionability = Math.min(actionability, 100);

  // 5. Data Quality Score (0-100)
  // Based on profiling - nulls, freshness, completeness
  let dataQuality = 85; // Default when no profiling

  if (profilingData && sourceTables.length > 0) {
    // Check null rates for source table columns
    let totalNullRate = 0;
    let checkedColumns = 0;

    for (const tableName of sourceTables) {
      const tableProfile = profilingData.tableProfiles[tableName];
      if (!tableProfile) continue;

      // Check columns used in formula
      for (const req of requiredColumns ?? []) {
        if (req.tableName.toLowerCase() !== tableName.toLowerCase()) continue;

        const profileKey = `${tableName}.${req.columnName}`;
        const colProfile = profilingData.columnProfiles[profileKey];

        if (colProfile?.nullPercentage !== undefined) {
          totalNullRate += colProfile.nullPercentage;
          checkedColumns++;
        }
      }
    }

    if (checkedColumns > 0) {
      const avgNullRate = totalNullRate / checkedColumns;
      if (avgNullRate > 10) {
        dataQuality -= Math.min(avgNullRate, 50);
        flags.push("high_null_rate");
      }
    }

    // Check temporal freshness if there's a date field
    if (semanticDefinition.timeField) {
      for (const tableName of sourceTables) {
        const profileKey = `${tableName}.${semanticDefinition.timeField}`;
        const colProfile = profilingData.columnProfiles[profileKey];

        if (colProfile?.temporal?.max) {
          const lastDate = new Date(colProfile.temporal.max);
          const daysSinceUpdate = Math.floor(
            (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceUpdate > 30) {
            dataQuality -= 20;
            flags.push("stale_data");
          }
        }
      }
    }
  }

  dataQuality = Math.max(dataQuality, 0);

  // Calculate overall score (weighted average)
  // Weights: dataFit 25%, businessRelevance 20%, calculationConfidence 25%, actionability 15%, dataQuality 15%
  const overall = Math.round(
    dataFit * 0.25 +
    businessRelevance * 0.20 +
    calculationConfidence * 0.25 +
    actionability * 0.15 +
    dataQuality * 0.15
  );

  return {
    overall,
    dataFit,
    businessRelevance,
    calculationConfidence,
    actionability,
    dataQuality,
    flags,
  };
}

// ============================================================================
// Value Validation
// ============================================================================

/**
 * Result of executing and validating a KPI against real data
 */
export interface KPIExecutionResult {
  kpiName: string;
  kpiSlug: string;
  value: number | string | null;
  sql: string;
  executionTimeMs: number;
  error?: string;
  validation?: KPIValueValidation;
}

/**
 * Build SQL query from a KPI's semantic definition
 *
 * This mirrors the logic in test-pipeline-with-validation.ts
 * to generate executable SQL from the semantic definition.
 */
/**
 * Convert aggregation type to SQL function.
 * Handles COUNT_DISTINCT → COUNT(DISTINCT x) conversion for SQL compatibility.
 */
function aggregationToSQL(aggregation: string, expression: string): string {
  if (aggregation === 'COUNT_DISTINCT') {
    return `COUNT(DISTINCT ${expression})`;
  }
  return `${aggregation}(${expression})`;
}

function buildKPISQL(
  semanticDef: CalculatedMetricRecipe["semanticDefinition"],
  schema?: string
): string {
  const schemaPrefix = schema ? `"source_db"."${schema}".` : `"source_db".`;
  const entity = `${schemaPrefix}"${semanticDef.entity}"`;

  // If aggregation is defined and type is simple
  if (semanticDef.aggregation && semanticDef.type === "simple") {
    return `SELECT ${aggregationToSQL(semanticDef.aggregation, semanticDef.expression)} AS value FROM ${entity}`;
  }

  // For ratio types with numerator/denominator
  const def = semanticDef as any;
  if (def.type === "ratio" && def.numerator && def.denominator) {
    const num = aggregationToSQL(def.numerator.aggregation, def.numerator.expression);
    const den = aggregationToSQL(def.denominator.aggregation, def.denominator.expression);
    const multiplier = def.multiplier || 1;
    return `SELECT (CAST(${num} AS FLOAT) / NULLIF(${den}, 0)) * ${multiplier} AS value FROM ${entity}`;
  }

  // For filtered types with subquery (groupBy/having)
  if (def.type === "filtered" && def.subquery) {
    const agg = def.aggregation || "COUNT_DISTINCT";
    const aggSQL = aggregationToSQL(agg, def.expression);

    // Build the filtered subquery
    const groupByFields = Array.isArray(def.subquery.groupBy)
      ? def.subquery.groupBy.join(', ')
      : def.subquery.groupBy;

    const subqueryEntity = def.subquery.subqueryEntity
      ? `${schemaPrefix}"${def.subquery.subqueryEntity}"`
      : entity;

    const subquery = `SELECT ${groupByFields} FROM ${subqueryEntity} GROUP BY ${groupByFields} HAVING ${def.subquery.having}`;

    // If percentOf is specified, calculate percentage
    if (def.percentOf) {
      const totalAgg = aggregationToSQL(agg, def.percentOf);
      return `SELECT (CAST(${aggSQL} AS FLOAT) / NULLIF(${totalAgg}, 0)) * 100 AS value FROM ${entity} WHERE ${def.expression} IN (${subquery})`;
    }

    // Otherwise just count the filtered entities
    return `SELECT ${aggSQL} AS value FROM ${entity} WHERE ${def.expression} IN (${subquery})`;
  }

  // For composite types with sources (multi-table joins)
  if (def.type === "composite" && def.sources && Array.isArray(def.sources)) {
    // Build FROM clause with joins
    const firstSource = def.sources[0];
    const firstTable = firstSource.schema
      ? `${schemaPrefix}"${firstSource.schema}"."${firstSource.table}"`
      : `${schemaPrefix}"${firstSource.table}"`;
    let fromClause = `${firstTable} AS "${firstSource.alias}"`;

    // Add JOIN clauses for additional sources
    for (let i = 1; i < def.sources.length; i++) {
      const source = def.sources[i];
      const table = source.schema
        ? `${schemaPrefix}"${source.schema}"."${source.table}"`
        : `${schemaPrefix}"${source.table}"`;
      const joinType = source.join?.type || 'INNER';
      fromClause += ` ${joinType} JOIN ${table} AS "${source.alias}"`;
      if (source.join?.on) {
        fromClause += ` ON ${source.join.on}`;
      }
    }

    // Build aggregation with expression
    const agg = def.aggregation || "SUM";
    const aggSQL = aggregationToSQL(agg, def.expression);

    // Build GROUP BY if specified
    const groupBy = def.groupBy && def.groupBy.length > 0
      ? ` GROUP BY ${def.groupBy.join(', ')}`
      : '';

    return `SELECT ${aggSQL} AS value FROM ${fromClause}${groupBy}`;
  }

  // If expression already contains SQL aggregations
  if (semanticDef.expression && /\b(SUM|COUNT|AVG|MIN|MAX)\s*\(/i.test(semanticDef.expression)) {
    let expr = semanticDef.expression
      .replace(/COUNT_DISTINCT\(([^)]+)\)/gi, "COUNT(DISTINCT $1)")
      .replace(/count_distinct\(([^)]+)\)/gi, "COUNT(DISTINCT $1)");
    return `SELECT ${expr} AS value FROM ${entity}`;
  }

  // Fallback: try to build a simple query
  const agg = semanticDef.aggregation || "SUM";
  return `SELECT ${aggregationToSQL(agg, semanticDef.expression)} AS value FROM ${entity}`;
}

/**
 * Execute KPIs against real data and validate values using LLM
 *
 * This is the value validation step that:
 * 1. Executes each KPI against the database
 * 2. Uses LLM to check if values make business sense
 * 3. Returns validation results to flag suspicious/invalid KPIs
 *
 * @param recipes - Validated recipes to execute
 * @param connection - Database connection details
 * @param businessType - Business context for validation
 * @returns Execution and validation results
 */
export async function validateKPIValues(
  recipes: Array<{ recipe: CalculatedMetricRecipe; sourceTables: string[] }>,
  connection: NonNullable<GenerateAndStoreKPIsInput["connection"]>,
  businessType: string
): Promise<{
  results: KPIExecutionResult[];
  stats: NonNullable<GenerateAndStoreKPIsResult["valueValidation"]>;
}> {
  const { DuckDBUniversalAdapter } = await import("@repo/liquid-connect/uvb");

  const results: KPIExecutionResult[] = [];
  let executionErrors = 0;

  // Execute each KPI
  const adapter = new DuckDBUniversalAdapter();
  await adapter.connect(connection.connectionString);

  try {
    for (const { recipe } of recipes) {
      const startTime = Date.now();
      const slug = slugify(recipe.name);
      let sql = "";

      try {
        // Phase 1: Build SQL (may throw on invalid semanticDefinition)
        // Try to use DSL compiler first (supports time-series, grain, etc.)
        const kpiDefinition = extractKPIDefinition(recipe);
        if (kpiDefinition) {
          const compiled = compileKPIToSQL(kpiDefinition, {
            dialect: "duckdb",
            // Don't pass schema to compiler - we'll add source_db prefix manually
          });
          if (compiled?.sql) {
            // Add DuckDB source_db prefix for tables
            // Compiler generates: FROM "entity" or FROM "schema"."entity"
            // DuckDB needs: FROM "source_db"."schema"."entity" or FROM "source_db"."entity"
            const schemaPrefix = connection.defaultSchema ? `"source_db"."${connection.defaultSchema}".` : `"source_db".`;
            sql = compiled.sql.replace(/FROM "(\w+)"/g, `FROM ${schemaPrefix}"$1"`);
          } else {
            sql = buildKPISQL(recipe.semanticDefinition, connection.defaultSchema);
          }
        } else {
          // Fallback to legacy SQL builder for old-style recipes
          sql = buildKPISQL(recipe.semanticDefinition, connection.defaultSchema);
        }

        // Phase 2: Execute SQL (may throw on invalid query or connection issues)
        const rows = await adapter.query<{ value: unknown }>(sql);
        const rawValue = rows[0]?.value ?? null;

        // Convert BigInt to Number if needed
        const value = typeof rawValue === "bigint" ? Number(rawValue) : rawValue;

        results.push({
          kpiName: recipe.name,
          kpiSlug: slug,
          value: value as number | string | null,
          sql,
          executionTimeMs: Date.now() - startTime,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Categorize error type for better debugging
        const errorType = sql
          ? errorMsg.includes("syntax")
            ? "[SQL_SYNTAX]"
            : errorMsg.includes("not exist") || errorMsg.includes("not found")
              ? "[SCHEMA_ERROR]"
              : "[EXECUTION]"
          : "[BUILD_FAILED]";

        results.push({
          kpiName: recipe.name,
          kpiSlug: slug,
          value: null,
          sql, // Preserve SQL even on execution failure for debugging
          executionTimeMs: Date.now() - startTime,
          error: `${errorType} ${errorMsg.substring(0, 180)}`,
        });
        executionErrors++;
      }
    }
  } finally {
    await adapter.disconnect();
  }

  // Filter to successful executions for LLM validation
  const successfulResults = results.filter((r) => r.value !== null && !r.error);

  // LLM Value Validation
  let validCount = 0;
  let suspiciousCount = 0;
  let invalidCount = 0;

  if (successfulResults.length > 0 && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const prompt = VALUE_VALIDATION_PROMPT.render({
        businessType,
        kpiResults: successfulResults.map((r) => ({
          name: r.kpiName,
          description: "", // Could pull from recipe if needed
          value: r.value,
          sql: r.sql,
        })),
      });

      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content && content.type === "text") {
        try {
          const validations = JSON.parse(content.text) as KPIValueValidation[];

          // Attach validations to results
          for (const validation of validations) {
            const result = results.find((r) => r.kpiName === validation.kpiName);
            if (result) {
              result.validation = validation;

              // Count by status
              if (validation.status === "VALID") validCount++;
              else if (validation.status === "SUSPICIOUS") suspiciousCount++;
              else invalidCount++;
            }
          }

          console.log(
            `[KPIGeneration] Value validation: ${validCount} valid, ${suspiciousCount} suspicious, ${invalidCount} invalid`
          );
        } catch (parseError) {
          console.warn("[KPIGeneration] Failed to parse LLM validation response:", parseError);
        }
      }
    } catch (llmError) {
      console.warn("[KPIGeneration] LLM value validation failed:", llmError);
    }
  }

  return {
    results,
    stats: {
      executed: results.length,
      valid: validCount,
      suspicious: suspiciousCount,
      invalid: invalidCount,
      executionErrors,
    },
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate and store KPIs as vocabulary items
 *
 * This is called during Step 4.5 of the analysis pipeline.
 * KPIs are stored in knosiaVocabularyItem with type='kpi'.
 */
export async function generateAndStoreKPIs(
  input: GenerateAndStoreKPIsInput
): Promise<GenerateAndStoreKPIsResult> {
  const {
    detectedVocabulary,
    profilingData,
    businessType,
    extractedSchema,
    orgId,
    workspaceId,
    connection,
  } = input;

  // Skip if no ANTHROPIC_API_KEY
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[KPIGeneration] Skipping: API key missing");
    return {
      totalGenerated: 0,
      feasibleCount: 0,
      storedCount: 0,
      failedCount: 0,
      categories: [],
      kpis: [],
    };
  }

  try {
    console.log(`[KPIGeneration] Generating KPIs for business type: ${businessType}`);

    // Build enriched schema context with semantic roles and statistics
    const enrichedSchema = buildEnrichedSchemaContext(
      extractedSchema,
      detectedVocabulary,
      profilingData
    );

    console.log(`[KPIGeneration] Schema analysis:`, enrichedSchema.summary);

    // Convert to vocabulary context for recipe generation
    const vocabularyContext = enrichedSchemaToVocabularyContext(
      enrichedSchema,
      detectedVocabulary
    );

    // Generate KPI recipes via LLM using schema-first approach
    const request: GenerateRecipeInput = {
      businessType: businessType.toLowerCase().replace(/[^a-z]/g, ""),
      vocabularyContext,
      // Use schema-first generation instead of generic KPI list
      useSchemaFirstGeneration: true,
    };

    const response = await generateKPIRecipes(request, {
      model: "haiku",
      maxRecipes: 50,
    });

    console.log(`[KPIGeneration] Generated ${response.totalGenerated} recipes:`, {
      feasible: response.feasibleCount,
      infeasible: response.infeasibleCount,
      avgConfidence: response.averageConfidence.toFixed(2),
      stats: response.generationStats,
    });

    // Record repairs for training data collection
    await recordRepairsForTraining(response.recipes, response.failedRecipes ?? [], workspaceId);

    // Store failed KPIs for situational awareness
    const failedRecipes = response.failedRecipes ?? [];
    let storedFailedCount = 0;

    if (failedRecipes.length > 0) {
      console.log(`[KPIGeneration] Storing ${failedRecipes.length} failed KPIs for tracking`);

      // Cast validation log to match schema type
      type ValidationLogEntry = {
        timestamp: string;
        attempt: number;
        stage: "parse" | "schema" | "compile" | "execute" | "repair";
        errorType?: string;
        error?: string;
        action?: string;
        llmModel?: string;
        result?: "success" | "failed" | "fixed";
        changes?: string;
      };

      for (const failed of failedRecipes) {
        try {
          const kpiId = generateId();

          const typedValidationLog = failed.validationLog.map((log) => ({
            timestamp: log.timestamp,
            attempt: log.attempt,
            stage: log.stage as ValidationLogEntry["stage"],
            error: log.error,
            llmModel: log.model,
            result: log.result as ValidationLogEntry["result"],
          }));

          // Calculate max attempt number from logs
          const maxAttempt = Math.max(...failed.validationLog.map((log) => log.attempt), 0);

          // Add timestamp to slug to avoid conflicts with previously failed KPIs
          const uniqueSlug = `${slugify(failed.name)}_failed_${Date.now()}`;

          await db.insert(knosiaVocabularyItem).values({
            id: kpiId,
            orgId,
            workspaceId,
            canonicalName: failed.name,
            slug: uniqueSlug,
            type: "kpi",
            category: "unknown",
            status: "draft", // Not approved - needs attention
            definition: {
              descriptionHuman: `Failed to generate: ${failed.lastError}`,
              caveats: [`Failed at ${failed.failureStage} stage`],
            },
            formulaSql: null,
            formulaHuman: null,
            confidence: null,
            feasible: false,
            source: "ai_generated",
            // Validation tracking - this is the key data
            validationStatus: "failed",
            validationErrorType: failed.failureStage === "schema" ? "schema_error" : "compile_error",
            validationError: JSON.stringify({
              lastError: failed.lastError,
              failureStage: failed.failureStage,
              originalDefinition: failed.originalDefinition,
            }),
            validationAttempts: maxAttempt,
            validationLog: typedValidationLog,
          });

          storedFailedCount++;
        } catch (insertError) {
          // Log but don't fail the whole generation
          console.error(`[KPIGeneration] Failed to store failed KPI "${failed.name}":`, insertError);
        }
      }

      console.log(`[KPIGeneration] Stored ${storedFailedCount}/${failedRecipes.length} failed KPIs`);
    }

    // Filter feasible recipes with high confidence
    const feasibleRecipes = response.recipes.filter(
      (r) => r.feasible && (r.confidence ?? 0) >= 0.7
    );

    // Build set of existing metric slugs for dependency validation
    const existingMetricSlugs = new Set(
      detectedVocabulary.metrics?.map((m) => slugify(m.name)) ?? []
    );

    // Build metric expressions map for derived KPIs
    // This maps metric slugs to their compiled expressions
    const metricExpressions: Record<string, string> = {};
    for (const metric of detectedVocabulary.metrics ?? []) {
      const slug = slugify(metric.name);
      // Use the metric's expression if available, otherwise build from aggregation + column
      if (metric.expression) {
        metricExpressions[slug] = metric.expression;
      } else if (metric.aggregation && metric.column) {
        // Build expression from aggregation + column
        metricExpressions[slug] = `${metric.aggregation}(${metric.column})`;
      }
    }

    // Validate KPIs: check dependencies AND source table resolution
    // KPIs without valid source tables will fail at preview time
    const validatedRecipes: Array<{
      recipe: CalculatedMetricRecipe;
      sourceTables: string[];
      qualityScore: KPIQualityScore;
    }> = [];

    let skippedDependencies = 0;
    let skippedSourceTables = 0;

    for (const recipe of feasibleRecipes) {
      const dependencies = recipe.semanticDefinition.dependencies ?? [];

      // Check if all dependencies exist as metrics (for derived KPIs)
      if (dependencies.length > 0) {
        const missingDeps = dependencies.filter(
          (dep) => !existingMetricSlugs.has(slugify(dep))
        );

        if (missingDeps.length > 0) {
          console.log(
            `[KPIGeneration] Skipping "${recipe.name}" - missing dependencies: ${missingDeps.join(", ")}`
          );
          skippedDependencies++;
          continue;
        }
      }

      // CRITICAL: Resolve source tables using improved logic
      // This ensures KPIs can be executed against the database
      const sourceTables = findSourceTablesForRecipe(recipe, extractedSchema, detectedVocabulary);

      if (sourceTables.length === 0) {
        console.log(
          `[KPIGeneration] Skipping "${recipe.name}" - could not resolve source tables for formula: ${recipe.semanticDefinition.expression}`
        );
        skippedSourceTables++;
        continue;
      }

      // Calculate quality score for this KPI
      const qualityScore = calculateKPIQualityScore(
        recipe,
        sourceTables,
        enrichedSchema,
        profilingData,
        businessType
      );

      validatedRecipes.push({ recipe, sourceTables, qualityScore });
    }

    console.log(
      `[KPIGeneration] Validated ${validatedRecipes.length}/${feasibleRecipes.length} KPIs:`,
      {
        valid: validatedRecipes.length,
        skippedDependencies,
        skippedSourceTables,
      }
    );

    // =========================================================================
    // VALUE VALIDATION (Optional - requires connection)
    // =========================================================================
    let valueValidationResults: KPIExecutionResult[] = [];
    let valueValidationStats: GenerateAndStoreKPIsResult["valueValidation"];

    if (connection && validatedRecipes.length > 0) {
      console.log(`[KPIGeneration] Running value validation against ${connection.type} database...`);

      const valueValidation = await validateKPIValues(
        validatedRecipes,
        connection,
        businessType
      );

      valueValidationResults = valueValidation.results;
      valueValidationStats = valueValidation.stats;

      console.log(`[KPIGeneration] Value validation complete:`, valueValidationStats);
    }

    // Store KPIs in vocabulary table
    const storedKPIs: GenerateAndStoreKPIsResult["kpis"] = [];

    for (const { recipe, sourceTables, qualityScore } of validatedRecipes) {
      const kpiId = generateId();
      const category = categorizeKPI(recipe.name);
      const sourceVocabularyIds = extractVocabularyLineage(recipe, detectedVocabulary);

      const metricDependencies = recipe.semanticDefinition.dependencies ?? [];

      // Extract DSL definition and compile to SQL
      const kpiDefinition = extractKPIDefinition(recipe);
      let formulaSql: string;
      let formulaExpression: string | undefined;
      let compilationValid = false;

      if (kpiDefinition) {
        // Check if this is a derived KPI that needs metric expressions
        const needsMetricExpressions = isDerivedKPI(kpiDefinition);

        // Compile with dialect-specific emitter and metric expressions
        const compiled = compileKPIToSQL(kpiDefinition, {
          dialect: "duckdb", // Default for preview; can be changed per connection
          metricExpressions: needsMetricExpressions ? metricExpressions : undefined,
        });

        if (compiled) {
          // IMPORTANT: SemanticLayer expects expression (aggregation only), not full SQL
          formulaSql = compiled.expression;
          formulaExpression = compiled.expression;
          compilationValid = true;

          // Track this KPI's expression for subsequent derived KPIs
          const kpiSlug = slugify(recipe.name);
          metricExpressions[kpiSlug] = compiled.expression;

          console.log(`[KPIGeneration] Compiled "${recipe.name}": ${formulaExpression}`);
        } else {
          // Compilation failed - fall back to legacy expression
          console.warn(`[KPIGeneration] Compilation failed for "${recipe.name}", using legacy expression`);
          formulaSql = recipe.semanticDefinition.expression;
          formulaExpression = recipe.semanticDefinition.expression;
        }

        // Validate filters at generation time (if present)
        // All KPI types can have optional filters through the base interface
        if (kpiDefinition.filters?.length && !compilationValid) {
          console.warn(`[KPIGeneration] Filter validation failed for "${recipe.name}"`);
        }
      } else {
        // Legacy: use raw expression from semanticDefinition
        formulaSql = recipe.semanticDefinition.expression;
        formulaExpression = recipe.semanticDefinition.expression;
      }

      // Determine validation status based on whether kpiDefinition exists and compiled
      // KPIs from the new pipeline are pre-validated; legacy KPIs need validation
      const hasValidDefinition = kpiDefinition !== null && formulaExpression !== null;

      // Check for value validation results
      const valueResult = valueValidationResults.find((r) => r.kpiSlug === slugify(recipe.name));
      const valueValidation = valueResult?.validation;

      // Determine final validation status using DB enum values
      // DB schema: "pending" | "validating" | "validated" | "failing" | "repairing" | "failed"
      // Value validation results are stored in validationError JSON field
      let validationStatus: "pending" | "validating" | "validated" | "failing" | "repairing" | "failed";
      let validationErrorType: "parse_error" | "schema_error" | "compile_error" | "sql_error" | null = null;

      if (valueValidation?.status === "INVALID") {
        // Value is clearly wrong - mark as failed
        validationStatus = "failed";
        validationErrorType = "sql_error"; // Closest match for value issues
      } else if (valueValidation?.status === "SUSPICIOUS") {
        // Value is suspicious but might be valid - mark as validated with warning in validationError
        validationStatus = "validated";
        // No error type - warning stored in validationError JSON
      } else if (hasValidDefinition) {
        validationStatus = "validated";
      } else {
        validationStatus = "pending";
      }

      // Build validation log with value validation step if present
      // Note: Using DB schema types for stage ("parse" | "schema" | "compile" | "execute" | "repair")
      // and result ("success" | "failed" | "fixed")
      type ValidationLogEntry = {
        timestamp: string;
        attempt: number;
        stage: "parse" | "schema" | "compile" | "execute" | "repair";
        errorType?: string;
        error?: string;
        action?: string;
        llmModel?: string;
        result?: "success" | "failed" | "fixed";
        changes?: string;
      };

      const validationLog: ValidationLogEntry[] = hasValidDefinition
        ? [{ timestamp: new Date().toISOString(), attempt: 1, stage: "compile", result: "success" }]
        : [];

      if (valueResult) {
        // Log the execution step
        validationLog.push({
          timestamp: new Date().toISOString(),
          attempt: 1,
          stage: "execute",
          result: valueResult.error ? "failed" : "success",
          error: valueResult.error,
        });

        // Log value validation result (using "execute" stage with action field for details)
        if (valueValidation) {
          // Map LLM validation status to DB result type
          const valueCheckResult: "success" | "failed" =
            valueValidation.status === "INVALID" ? "failed" : "success";

          validationLog.push({
            timestamp: new Date().toISOString(),
            attempt: 2, // Different attempt number to distinguish from execution
            stage: "execute", // Using execute since it's runtime validation
            result: valueCheckResult,
            action: `value_validation: ${valueValidation.status}`,
            error: valueValidation.status !== "VALID" ? valueValidation.reasoning : undefined,
          });
        }
      }

      await db.insert(knosiaVocabularyItem).values({
        id: kpiId,
        orgId,
        workspaceId,
        canonicalName: recipe.name,
        slug: slugify(recipe.name),
        type: "kpi",
        category,
        status: "approved",
        // Definition for rich metadata
        // sourceTables = actual database tables the formula operates on (REQUIRED)
        // metricDependencies = metric slugs this KPI references (for lineage)
        // qualityScore = multi-dimensional quality assessment for the KPI
        // kpiDefinition = original DSL for re-compilation if needed
        definition: {
          descriptionHuman: recipe.semanticDefinition.description,
          formulaHuman: recipe.semanticDefinition.description,
          formulaSql,
          formulaExpression, // Compiled aggregation expression
          sourceTables, // Always present - validated above
          metricDependencies: metricDependencies.length > 0 ? metricDependencies : undefined,
          qualityScore, // Quality scoring for user visibility
          kpiDefinition: kpiDefinition ?? undefined, // Store DSL for re-compilation
        },
        // KPI-specific fields
        formulaSql,
        formulaHuman: recipe.semanticDefinition.description,
        confidence: recipe.confidence?.toString() ?? null,
        feasible: recipe.feasible,
        source: "ai_generated",
        sourceVocabularyIds,
        executionCount: 0,
        // Validation tracking
        validationStatus,
        validationErrorType,
        validationAttempts: validationLog.length,
        validatedAt: validationLog.length > 0 ? new Date() : null,
        validationLog,
        // Store computed value if available (for debugging/display)
        // Note: Use replacer to handle BigInt values from COUNT queries
        validationError: valueValidation
          ? JSON.stringify(
              {
                computedValue: valueResult?.value,
                status: valueValidation.status,
                reasoning: valueValidation.reasoning,
                suggestedFix: valueValidation.suggestedFix,
              },
              (_, v) => (typeof v === "bigint" ? Number(v) : v)
            )
          : null,
      });

      storedKPIs.push({
        id: kpiId,
        name: recipe.name,
        category,
        confidence: recipe.confidence ?? null,
        qualityScore,
      });
    }

    // Categorize for summary
    const categories = [...new Set(storedKPIs.map((k) => k.category).filter(Boolean))];

    console.log(`[KPIGeneration] Stored ${storedKPIs.length} KPIs in vocabulary table`);

    return {
      totalGenerated: response.totalGenerated,
      feasibleCount: response.feasibleCount,
      storedCount: storedKPIs.length,
      failedCount: storedFailedCount,
      categories,
      kpis: storedKPIs,
      generationStats: response.generationStats,
      valueValidation: valueValidationStats,
    };
  } catch (error) {
    console.error("[KPIGeneration] Failed to generate KPIs:", error);
    return {
      totalGenerated: 0,
      feasibleCount: 0,
      storedCount: 0,
      failedCount: 0,
      categories: [],
      kpis: [],
    };
  }
}

// ============================================================================
// Repair Training Data Collection
// ============================================================================

/**
 * Record all repair attempts from generated recipes for training data
 */
async function recordRepairsForTraining(
  successfulRecipes: CalculatedMetricRecipe[],
  failedRecipes: FailedRecipe[],
  workspaceId?: string
): Promise<void> {
  let recordedCount = 0;

  // Process successful recipes - these had repairs that worked
  for (const recipe of successfulRecipes) {
    if (!recipe.validationLog) continue;

    // Extract kpiDefinition from semanticDefinition._kpiDefinition
    const semanticDef = recipe.semanticDefinition as Record<string, unknown>;
    const kpiDef = (semanticDef?._kpiDefinition ?? {}) as { type?: string; entity?: string; aggregation?: string };

    const repairLogs = recipe.validationLog.filter(
      (log) => log.stage === "repair"
    );

    for (const log of repairLogs) {
      // Find the compile error that triggered this repair
      const compileError = recipe.validationLog.find(
        (l) => l.stage === "compile" && l.attempt === log.attempt && l.error
      );

      if (!compileError?.error) continue;

      try {
        // rawOutput might be a string or already parsed object
        let repairedDef = log.rawOutput;
        if (typeof repairedDef === "string") {
          try {
            repairedDef = JSON.parse(repairedDef);
          } catch {
            // Keep as string if not valid JSON
          }
        }

        await recordRepair({
          workspaceId,
          errorType: "compile_error",
          errorMessage: compileError.error,
          originalDefinition: log.rawInput ?? compileError.rawInput ?? {},
          repairedDefinition: repairedDef,
          kpiType: kpiDef.type,
          kpiCategory: recipe.category,
          entityType: kpiDef.entity,
          aggregationType: kpiDef.aggregation,
          repairModel: log.model ?? "unknown",
          repairSuccess: log.result === "fixed",
          repairLatencyMs: log.latencyMs,
          repairTokensIn: log.tokensIn,
          repairTokensOut: log.tokensOut,
        });
        recordedCount++;
      } catch (err) {
        console.warn("[KPIGeneration] Failed to record repair:", err);
      }
    }
  }

  // Process failed recipes - these had repairs that didn't work
  for (const recipe of failedRecipes) {
    if (!recipe.validationLog) continue;

    // For failed recipes, originalDefinition contains the raw KPI definition
    const kpiDef = (recipe.originalDefinition ?? {}) as { type?: string; entity?: string };

    const repairLogs = recipe.validationLog.filter(
      (log) => log.stage === "repair"
    );

    for (const log of repairLogs) {
      // Find the error that triggered this repair
      const errorLog = recipe.validationLog.find(
        (l) =>
          (l.stage === "compile" || l.stage === "schema") &&
          l.attempt === log.attempt &&
          l.error
      );

      if (!errorLog?.error) continue;

      try {
        // rawOutput might be a string or already parsed object
        let repairedDef = log.rawOutput;
        if (typeof repairedDef === "string") {
          try {
            repairedDef = JSON.parse(repairedDef);
          } catch {
            // Keep as string if not valid JSON
          }
        }

        await recordRepair({
          workspaceId,
          errorType: errorLog.stage === "schema" ? "schema_error" : "compile_error",
          errorMessage: errorLog.error,
          originalDefinition: log.rawInput ?? errorLog.rawInput ?? {},
          repairedDefinition: repairedDef,
          kpiType: kpiDef.type,
          entityType: kpiDef.entity,
          repairModel: log.model ?? "unknown",
          repairSuccess: log.result === "fixed",
          repairLatencyMs: log.latencyMs,
          repairTokensIn: log.tokensIn,
          repairTokensOut: log.tokensOut,
        });
        recordedCount++;
      } catch (err) {
        console.warn("[KPIGeneration] Failed to record repair:", err);
      }
    }
  }

  if (recordedCount > 0) {
    console.log(`[KPIGeneration] Recorded ${recordedCount} repairs for training`);
  }
}
