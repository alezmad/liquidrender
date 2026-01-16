/**
 * Vocabulary Preview - Live Data Execution
 *
 * Executes vocabulary item definitions against the connected database
 * to show real values in the UI.
 *
 * Uses the LiquidFlow → Emitter pipeline for proper SQL generation.
 */

import { eq, and } from "@turbostarter/db";
import {
  knosiaVocabularyItem,
  knosiaWorkspace,
  knosiaWorkspaceConnection,
  knosiaConnection,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { duckdbManager } from "../connections/duckdb-manager";
import {
  createDuckDBEmitter,
  compile,
  emit,
  type LiquidFlow,
  type ResolvedMetric,
  type ResolvedSource,
} from "@repo/liquid-connect";
import { buildSemanticLayer } from "../shared/semantic";

// ============================================================================
// DuckDB Schema Helper
// ============================================================================

/**
 * Get the DuckDB attached database schema name for a connection.
 * DuckDB attaches databases with a prefix like `conn_<id>`, not the original schema name.
 */
function getDuckDBSchema(connectionId: string): string {
  return `conn_${connectionId}`;
}

// ============================================================================
// SQL Syntax Fixes (Legacy Support)
// ============================================================================

/**
 * Fix common SQL syntax issues in legacy KPIs.
 *
 * DuckDB and standard SQL use COUNT(DISTINCT column) syntax,
 * but older LLM-generated KPIs may have COUNT_DISTINCT(column).
 *
 * NEW ARCHITECTURE (2024+):
 * - LLMs now generate DSL definitions with aggregation types (not SQL syntax)
 * - The KPI compiler transforms DSL → dialect-correct SQL via emitters
 * - Example: { aggregation: "COUNT_DISTINCT", expression: "customer_id" }
 *           → COUNT(DISTINCT customer_id) (via DuckDB emitter)
 *
 * This function only exists for backward compatibility with legacy data.
 * New KPIs generated via DSL should never have syntax issues.
 *
 * @deprecated For legacy support only. New KPIs use DSL compiler.
 */
function fixSqlSyntax(sql: string): string {
  // Fix COUNT_DISTINCT(x) -> COUNT(DISTINCT x)
  // Match COUNT_DISTINCT followed by parentheses with content
  return sql.replace(/COUNT_DISTINCT\s*\(([^)]+)\)/gi, "COUNT(DISTINCT $1)");
}

// ============================================================================
// Types
// ============================================================================

export interface PreviewInput {
  /** Vocabulary item slug or ID */
  itemId: string;
  /** Workspace ID for connection lookup */
  workspaceId: string;
}

export interface MetricPreviewResult {
  type: "metric";
  value: number | string | null;
  formattedValue: string;
  trend?: {
    direction: "up" | "down" | "flat";
    percentage: number | null;
  };
}

export interface DimensionPreviewResult {
  type: "dimension";
  sampleValues: string[];
  totalCount: number;
  hasMore: boolean;
}

export interface EntityPreviewResult {
  type: "entity";
  recordCount: number;
  formattedCount: string;
  sampleFields?: string[];
}

export type PreviewResult =
  | MetricPreviewResult
  | DimensionPreviewResult
  | EntityPreviewResult
  | { type: "error"; error: string }
  | { type: "unsupported"; message: string };

export interface PreviewResponse {
  itemId: string;
  itemType: string;
  result: PreviewResult;
  executedAt: string;
  executionTimeMs: number;
  cached: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatMetricValue(
  value: number | null,
  category: string | null
): string {
  if (value === null) return "N/A";

  // Format based on category hints
  if (category?.toLowerCase().includes("revenue") ||
      category?.toLowerCase().includes("sales") ||
      category?.toLowerCase().includes("price")) {
    return `$${formatNumber(value)}`;
  }

  if (category?.toLowerCase().includes("percent") ||
      category?.toLowerCase().includes("rate") ||
      category?.toLowerCase().includes("ratio")) {
    return `${value.toFixed(1)}%`;
  }

  return formatNumber(value);
}

// ============================================================================
// Main Preview Function
// ============================================================================

/**
 * Preview a vocabulary item by executing its definition against the database
 */
export async function previewVocabularyItem(
  input: PreviewInput
): Promise<PreviewResponse> {
  const startTime = Date.now();

  try {
    // 1. Get the vocabulary item
    const item = await db.query.knosiaVocabularyItem.findFirst({
      where: eq(knosiaVocabularyItem.id, input.itemId),
    });

    if (!item) {
      return {
        itemId: input.itemId,
        itemType: "unknown",
        result: { type: "error", error: "Vocabulary item not found" },
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        cached: false,
      };
    }

    // 2. Get workspace to find orgId
    const workspace = await db.query.knosiaWorkspace.findFirst({
      where: eq(knosiaWorkspace.id, input.workspaceId),
    });

    if (!workspace) {
      return {
        itemId: input.itemId,
        itemType: item.type,
        result: { type: "error", error: "Workspace not found" },
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        cached: false,
      };
    }

    // 3. Get connection for the workspace
    const workspaceConnection = await db
      .select({
        connectionId: knosiaWorkspaceConnection.connectionId,
      })
      .from(knosiaWorkspaceConnection)
      .where(eq(knosiaWorkspaceConnection.workspaceId, input.workspaceId))
      .limit(1);

    if (!workspaceConnection.length) {
      return {
        itemId: input.itemId,
        itemType: item.type,
        result: { type: "error", error: "No database connection found" },
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        cached: false,
      };
    }

    // Safe to use non-null assertion since we already checked workspaceConnection.length above
    const connection = await db.query.knosiaConnection.findFirst({
      where: eq(knosiaConnection.id, workspaceConnection[0]!.connectionId),
    });

    if (!connection) {
      return {
        itemId: input.itemId,
        itemType: item.type,
        result: { type: "error", error: "Connection not found" },
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        cached: false,
      };
    }

    // 4. Fetch all vocabulary items for the workspace (needed for KPI resolution)
    const vocabularyItems = await db.query.knosiaVocabularyItem.findMany({
      where: eq(knosiaVocabularyItem.workspaceId, input.workspaceId),
    });

    // 5. Execute preview based on item type
    const definition = item.definition as {
      descriptionHuman?: string;
      formulaSql?: string;
      formulaHuman?: string;
      sourceTables?: string[];
      sourceColumn?: string;
    } | null;

    let result: PreviewResult;

    try {
      const adapter = await duckdbManager.getAdapter(connection);

      // Use DuckDB attached schema name instead of connection.schema
      const duckdbSchema = getDuckDBSchema(connection.id);

      switch (item.type) {
        case "kpi":
          // KPIs use full compiler pipeline for metric reference resolution
          result = await executeKPIPreview(adapter, item, workspace, vocabularyItems, connection);
          break;
        case "measure":
        case "metric":
          result = await executeMetricPreview(adapter, item, definition, duckdbSchema);
          break;

        case "dimension":
          result = await executeDimensionPreview(adapter, item, definition, duckdbSchema);
          break;

        case "entity":
          result = await executeEntityPreview(adapter, item, definition, duckdbSchema);
          break;

        case "event":
          result = await executeEventPreview(adapter, item, definition, duckdbSchema);
          break;

        default:
          result = { type: "unsupported", message: `Preview not available for type: ${item.type}` };
      }

      duckdbManager.release(connection.id);
    } catch (queryError) {
      duckdbManager.release(connection.id);
      result = {
        type: "error",
        error: queryError instanceof Error ? queryError.message : "Query execution failed",
      };
    }

    return {
      itemId: input.itemId,
      itemType: item.type,
      result,
      executedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      cached: false,
    };
  } catch (error) {
    return {
      itemId: input.itemId,
      itemType: "unknown",
      result: {
        type: "error",
        error: error instanceof Error ? error.message : "Preview failed",
      },
      executedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      cached: false,
    };
  }
}

// ============================================================================
// Type-specific Execution
// ============================================================================

interface DuckDBAdapter {
  query<T>(sql: string): Promise<T[]>;
}

async function executeMetricPreview(
  adapter: DuckDBAdapter,
  item: typeof knosiaVocabularyItem.$inferSelect,
  definition: { formulaSql?: string; sourceTables?: string[] } | null,
  schema: string | null
): Promise<PreviewResult> {
  const formulaSql = definition?.formulaSql;
  const sourceTable = definition?.sourceTables?.[0];

  if (!formulaSql || !sourceTable) {
    // Fallback: try simple count if we have source table
    if (sourceTable) {
      return executeCountFallback(adapter, sourceTable, schema, item.category);
    }
    return { type: "error", error: "No formula or source table available for this metric" };
  }

  // Check if formulaSql is already a complete query
  if (formulaSql.trim().toLowerCase().startsWith("select")) {
    return executeRawSql(adapter, formulaSql, item.category);
  }

  // Build LiquidFlow from vocabulary definition and use emitter
  try {
    const rawSql = buildMetricSqlViaEmitter(formulaSql, sourceTable, schema, item.slug);
    const sql = fixSqlSyntax(rawSql);
    const rows = await adapter.query<Record<string, unknown>>(sql);
    const value = extractMetricValue(rows[0]);

    return {
      type: "metric",
      value,
      formattedValue: typeof value === "number"
        ? formatMetricValue(value, item.category)
        : value ?? "N/A",
    };
  } catch (error) {
    return {
      type: "error",
      error: `Query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Execute KPI preview using the full compiler pipeline.
 *
 * KPIs are composite metrics that reference other metrics (e.g., revenue_per_visitor = total_revenue / total_visitors).
 * They require the full compile pipeline to resolve @metric references.
 *
 * Pipeline: DSL Query → SemanticLayer → Resolver → LiquidFlow → Emitter → SQL
 */
async function executeKPIPreview(
  adapter: DuckDBAdapter,
  item: typeof knosiaVocabularyItem.$inferSelect,
  workspace: typeof knosiaWorkspace.$inferSelect,
  vocabularyItems: (typeof knosiaVocabularyItem.$inferSelect)[],
  connection: typeof knosiaConnection.$inferSelect
): Promise<PreviewResult> {
  try {
    // 1. Build SemanticLayer from workspace vocabulary
    // Pass duckdbSchema for proper table references in attached database
    const duckdbSchema = getDuckDBSchema(connection.id);
    const semanticLayer = buildSemanticLayer({
      workspace,
      vocabularyItems,
      connection,
      duckdbSchema,
    });

    // 2. Compile DSL query for the KPI
    // The DSL syntax is: Q @metric_slug
    const dslQuery = `Q @${item.slug}`;

    let flow: LiquidFlow;
    try {
      flow = compile(dslQuery, semanticLayer);
    } catch (compileError) {
      // Compilation failed - check if dependencies are missing
      const definition = item.definition as { formulaSql?: string; sourceTables?: string[]; metricDependencies?: string[] } | null;
      const dependencies = definition?.metricDependencies ?? [];

      // Check if this KPI has metric dependencies that don't exist
      const missingDeps = dependencies.filter(dep => !semanticLayer.metrics?.[dep]);

      if (missingDeps.length > 0) {
        return {
          type: "error",
          error: `KPI references undefined metrics: ${missingDeps.join(", ")}. These base metrics need to be defined first.`,
        };
      }

      return {
        type: "error",
        error: `KPI compilation failed: ${compileError instanceof Error ? compileError.message : "Unknown error"}`,
      };
    }

    // Validate flow has sources
    if (!flow.sources || flow.sources.length === 0) {
      return {
        type: "error",
        error: "KPI could not resolve source tables. Check that base metrics have valid source definitions.",
      };
    }

    // Check for cross-entity KPIs that require JOINs (not yet supported in preview)
    const definition = item.definition as { sourceTables?: string[] } | null;
    const sourceTables = definition?.sourceTables ?? [];
    if (sourceTables.length > 1) {
      return {
        type: "unsupported",
        message: `Cross-table KPI: requires JOIN between ${sourceTables.join(" and ")}. Preview not yet supported for multi-table KPIs.`,
      };
    }

    // 3. Emit SQL via DuckDB emitter (reuse duckdbSchema from semantic layer)
    const emitter = createDuckDBEmitter({
      parameterized: false,
      prettyPrint: false,
      defaultSchema: duckdbSchema,
    });

    const emitResult = emitter.emit(flow);

    // 4. Execute the generated SQL (with syntax fixes for legacy KPIs)
    const sql = fixSqlSyntax(emitResult.sql);
    const rows = await adapter.query<Record<string, unknown>>(sql);
    const value = extractMetricValue(rows[0]);

    return {
      type: "metric",
      value,
      formattedValue: typeof value === "number"
        ? formatMetricValue(value, item.category)
        : value ?? "N/A",
    };
  } catch (error) {
    return {
      type: "error",
      error: `KPI preview failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Build SQL for metric preview using the LiquidFlow → Emitter pipeline.
 *
 * The vocabulary's formulaSql already contains the aggregation (e.g., "SUM(unit_price * quantity)"),
 * so we use `derived: true` to pass it through the emitter without re-wrapping.
 */
function buildMetricSqlViaEmitter(
  formulaSql: string,
  sourceTable: string,
  schema: string | null,
  slug: string
): string {
  // Build source
  const source: ResolvedSource = {
    alias: sourceTable,
    table: sourceTable,
    schema: schema ?? undefined,
  };

  // Build metric - use derived:true since formulaSql already has aggregation
  // Extract aggregation type for metadata (emitter won't use it for derived)
  const aggregationType = extractAggregationType(formulaSql);

  const metric: ResolvedMetric = {
    ref: slug,
    alias: "value",
    aggregation: aggregationType,
    expression: formulaSql,
    sourceEntity: sourceTable,
    derived: true, // Critical: expression already contains aggregation
  };

  // Build LiquidFlow
  const flow: LiquidFlow = {
    version: "1.0",
    type: "metric",
    sources: [source],
    joins: [],
    metrics: [metric],
    dimensions: [],
    filters: [],
    limit: 1,
  };

  // Emit SQL via DuckDB emitter
  const emitter = createDuckDBEmitter({
    parameterized: false, // Preview doesn't need prepared statements
    prettyPrint: false,
    defaultSchema: schema ?? undefined,
  });

  const result = emitter.emit(flow);
  return result.sql;
}

/**
 * Extract aggregation type from formula for metadata.
 * The emitter won't use this for derived metrics, but it's required in the type.
 */
function extractAggregationType(formula: string): "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX" {
  const normalized = formula.toUpperCase();
  if (normalized.includes("SUM(")) return "SUM";
  if (normalized.includes("AVG(")) return "AVG";
  if (normalized.includes("COUNT(DISTINCT")) return "COUNT_DISTINCT";
  if (normalized.includes("COUNT(")) return "COUNT";
  if (normalized.includes("MIN(")) return "MIN";
  if (normalized.includes("MAX(")) return "MAX";
  return "SUM"; // Default fallback
}

/**
 * Fallback: execute simple COUNT(*) when no formula is available
 */
async function executeCountFallback(
  adapter: DuckDBAdapter,
  sourceTable: string,
  schema: string | null,
  category: string | null
): Promise<PreviewResult> {
  const tableName = schema ? `"${schema}"."${sourceTable}"` : `"${sourceTable}"`;
  const sql = `SELECT COUNT(*) as value FROM ${tableName}`;

  try {
    const rows = await adapter.query<{ value: number }>(sql);
    const value = rows[0]?.value ?? null;
    return {
      type: "metric",
      value,
      formattedValue: formatMetricValue(value, category),
    };
  } catch {
    return { type: "error", error: "No formula available for this metric" };
  }
}

/**
 * Execute raw SQL query (for complete SELECT statements)
 */
async function executeRawSql(
  adapter: DuckDBAdapter,
  rawSql: string,
  category: string | null
): Promise<PreviewResult> {
  try {
    const sql = fixSqlSyntax(rawSql);
    const rows = await adapter.query<Record<string, unknown>>(sql);
    const value = extractMetricValue(rows[0]);

    return {
      type: "metric",
      value,
      formattedValue: typeof value === "number"
        ? formatMetricValue(value, category)
        : value ?? "N/A",
    };
  } catch (error) {
    return {
      type: "error",
      error: `Query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Extract numeric or string value from query result row
 */
function extractMetricValue(row: Record<string, unknown> | undefined): number | string | null {
  if (!row) return null;

  for (const v of Object.values(row)) {
    if (typeof v === "number") {
      return v;
    } else if (typeof v === "string") {
      const parsed = parseFloat(v);
      if (!isNaN(parsed)) {
        return parsed;
      }
      return v;
    }
  }
  return null;
}

async function executeDimensionPreview(
  adapter: DuckDBAdapter,
  item: typeof knosiaVocabularyItem.$inferSelect,
  definition: { sourceTables?: string[]; sourceColumn?: string } | null,
  schema: string | null
): Promise<PreviewResult> {
  const sourceTable = definition?.sourceTables?.[0];

  if (!sourceTable) {
    return { type: "error", error: "No source table defined for this dimension" };
  }

  // Use slug as column name, or sourceColumn if defined
  const columnName = definition?.sourceColumn || item.slug.replace(/-/g, "_");
  const tableName = schema ? `${schema}.${sourceTable}` : sourceTable;

  try {
    // Get sample distinct values
    const sampleSql = `
      SELECT DISTINCT "${columnName}" as value
      FROM ${tableName}
      WHERE "${columnName}" IS NOT NULL
      LIMIT 10
    `;

    const sampleRows = await adapter.query<{ value: unknown }>(sampleSql);
    const sampleValues = sampleRows
      .map((r) => String(r.value))
      .filter((v) => v !== "null" && v !== "undefined");

    // Get total count
    const countSql = `
      SELECT COUNT(DISTINCT "${columnName}") as total
      FROM ${tableName}
      WHERE "${columnName}" IS NOT NULL
    `;

    const countRows = await adapter.query<{ total: number }>(countSql);
    const totalCount = countRows[0]?.total ?? 0;

    return {
      type: "dimension",
      sampleValues,
      totalCount,
      hasMore: totalCount > 10,
    };
  } catch (error) {
    return {
      type: "error",
      error: `Query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function executeEntityPreview(
  adapter: DuckDBAdapter,
  item: typeof knosiaVocabularyItem.$inferSelect,
  definition: { sourceTables?: string[] } | null,
  schema: string | null
): Promise<PreviewResult> {
  const sourceTable = definition?.sourceTables?.[0];

  if (!sourceTable) {
    return { type: "error", error: "No source table defined for this entity" };
  }

  const tableName = schema ? `${schema}.${sourceTable}` : sourceTable;

  try {
    // Get record count
    const countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
    const countRows = await adapter.query<{ total: number }>(countSql);
    const recordCount = countRows[0]?.total ?? 0;

    return {
      type: "entity",
      recordCount,
      formattedCount: formatNumber(recordCount),
    };
  } catch (error) {
    return {
      type: "error",
      error: `Query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function executeEventPreview(
  adapter: DuckDBAdapter,
  item: typeof knosiaVocabularyItem.$inferSelect,
  definition: { sourceTables?: string[] } | null,
  schema: string | null
): Promise<PreviewResult> {
  // Events are similar to entities - show count
  return executeEntityPreview(adapter, item, definition, schema);
}
