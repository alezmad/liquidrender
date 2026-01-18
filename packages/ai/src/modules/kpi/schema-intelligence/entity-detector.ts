/**
 * Schema Entity Detector
 *
 * Analyzes database schema to understand business structure:
 * - Transaction tables (orders, invoices, rentals)
 * - Entity tables (customers, products, employees)
 * - Dimension/lookup tables (categories, regions, statuses)
 * - Metrics (numeric columns worth measuring)
 * - Dimensions (categorical columns for breakdowns)
 * - Inferred business domain
 */

import type { TableSchema, ProfilingData } from "./pattern-detector";

// ============================================================================
// Types
// ============================================================================

export type TableType = "transaction" | "entity" | "dimension" | "junction" | "lookup";

export type ColumnMetricType = "currency" | "quantity" | "rate" | "duration" | "count" | "numeric";

export type BusinessDomain = "commerce" | "saas" | "logistics" | "media" | "finance" | "healthcare" | "generic";

export interface DetectedEntity {
  name: string;
  type: TableType;
  primaryKey?: string;
  rowCount?: number;
  foreignKeys: Array<{
    column: string;
    referencesTable: string;
  }>;
  // What this entity represents
  businessMeaning?: string;
}

export interface DetectedMetric {
  table: string;
  column: string;
  type: ColumnMetricType;
  expression?: string; // e.g., "unit_price * quantity"
  suggestedAggregations: string[];
  suggestedName: string; // Human-friendly name
}

export interface DetectedDimension {
  table: string;
  column: string;
  cardinality: number;
  isHierarchical: boolean;
  referencedTable?: string;
  suggestedName: string;
}

export interface DetectedTimeField {
  table: string;
  column: string;
  granularity: "date" | "datetime" | "timestamp";
  isPrimary: boolean;
  role?: "transaction" | "deadline" | "completion" | "created" | "updated";
}

export interface InferredDomain {
  type: BusinessDomain;
  confidence: number;
  signals: string[];
}

export interface SchemaAnalysis {
  entities: DetectedEntity[];
  metrics: DetectedMetric[];
  dimensions: DetectedDimension[];
  timeFields: DetectedTimeField[];
  inferredDomain: InferredDomain;
  // Primary transaction table (most important for KPIs)
  primaryTransactionTable?: string;
}

// ============================================================================
// Main Entry Point
// ============================================================================

export function analyzeSchema(
  tables: TableSchema[],
  profiling?: ProfilingData
): SchemaAnalysis {
  const entities = detectEntities(tables, profiling);
  const metrics = detectMetrics(tables, entities);
  const dimensions = detectDimensions(tables, entities, profiling);
  const timeFields = detectTimeFields(tables, entities);
  const inferredDomain = inferBusinessDomain(tables, entities);

  // Find primary transaction table
  const transactionTables = entities.filter(e => e.type === "transaction");
  const sortedTransactions = transactionTables.sort((a, b) => (b.rowCount || 0) - (a.rowCount || 0));
  const primaryTransactionTable = sortedTransactions[0]?.name;

  return {
    entities,
    metrics,
    dimensions,
    timeFields,
    inferredDomain,
    primaryTransactionTable,
  };
}

// ============================================================================
// Entity Detection
// ============================================================================

function detectEntities(tables: TableSchema[], profiling?: ProfilingData): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  for (const table of tables) {
    const entity = classifyTable(table, tables, profiling);
    entities.push(entity);
  }

  return entities;
}

function classifyTable(
  table: TableSchema,
  allTables: TableSchema[],
  profiling?: ProfilingData
): DetectedEntity {
  const foreignKeys = table.columns
    .filter(c => c.isForeignKey && c.referencedTable)
    .map(c => ({
      column: c.name,
      referencesTable: c.referencedTable!,
    }));

  const rowCount = profiling?.tables.get(table.name)?.rowCount;
  const dateColumns = table.columns.filter(c =>
    c.type.toLowerCase().includes("date") || c.type.toLowerCase().includes("timestamp")
  );
  const numericColumns = table.columns.filter(c =>
    c.type.toLowerCase().match(/int|float|decimal|numeric|money|double|real/)
  );

  // Classification heuristics
  let type: TableType = "entity";

  // Transaction table indicators
  const transactionPatterns = /orders?|invoices?|transactions?|payments?|rentals?|sales?|bookings?|shipments?/i;
  const hasTransactionName = transactionPatterns.test(table.name);
  const hasManyFKs = foreignKeys.length >= 2;
  const hasDateField = dateColumns.length > 0;
  const hasNumericMetrics = numericColumns.length > 0;

  if (hasTransactionName || (hasManyFKs && hasDateField && hasNumericMetrics)) {
    type = "transaction";
  }

  // Junction table (many-to-many)
  if (foreignKeys.length >= 2 && table.columns.length <= 4) {
    type = "junction";
  }

  // Dimension/lookup table indicators
  const dimensionPatterns = /categories?|types?|statuses?|regions?|countries?|genres?|departments?/i;
  if (dimensionPatterns.test(table.name)) {
    type = "dimension";
  }

  // Small reference tables are lookups
  if (rowCount && rowCount < 50 && foreignKeys.length === 0) {
    type = "lookup";
  }

  // Entity tables (master data)
  const entityPatterns = /customers?|users?|employees?|products?|items?|films?|albums?|artists?|suppliers?|vendors?/i;
  if (entityPatterns.test(table.name) && type !== "transaction") {
    type = "entity";
  }

  // Business meaning
  const businessMeaning = inferTableMeaning(table.name, type);

  return {
    name: table.name,
    type,
    primaryKey: table.primaryKey,
    rowCount,
    foreignKeys,
    businessMeaning,
  };
}

function inferTableMeaning(tableName: string, type: TableType): string {
  const name = tableName.toLowerCase();

  // Common patterns
  if (/order/.test(name)) return "Customer orders/purchases";
  if (/customer/.test(name)) return "Customer master data";
  if (/product/.test(name)) return "Product catalog";
  if (/employee/.test(name)) return "Employee/staff records";
  if (/invoice/.test(name)) return "Invoice/billing records";
  if (/payment/.test(name)) return "Payment transactions";
  if (/categor/.test(name)) return "Category classification";
  if (/rental/.test(name)) return "Rental transactions";
  if (/film/.test(name)) return "Film/movie catalog";
  if (/track/.test(name)) return "Track/song records";

  return type === "transaction" ? "Business transaction" : "Reference data";
}

// ============================================================================
// Metric Detection
// ============================================================================

function detectMetrics(tables: TableSchema[], entities: DetectedEntity[]): DetectedMetric[] {
  const metrics: DetectedMetric[] = [];

  for (const table of tables) {
    const entity = entities.find(e => e.name === table.name);
    if (!entity || entity.type === "lookup") continue;

    for (const column of table.columns) {
      const metric = classifyMetric(table.name, column, entity);
      if (metric) {
        metrics.push(metric);
      }
    }

    // Detect composite metrics (e.g., unit_price * quantity)
    const compositeMetric = detectCompositeMetric(table, entity);
    if (compositeMetric) {
      metrics.push(compositeMetric);
    }
  }

  return metrics;
}

function classifyMetric(
  tableName: string,
  column: { name: string; type: string },
  entity: DetectedEntity
): DetectedMetric | null {
  // Skip non-numeric columns
  if (!column.type.toLowerCase().match(/int|float|decimal|numeric|money|double|real/)) {
    return null;
  }

  // Skip ID columns
  if (/_id$/i.test(column.name) || column.name.toLowerCase() === "id") {
    return null;
  }

  // Classify by column name patterns
  const name = column.name.toLowerCase();
  let type: ColumnMetricType = "numeric";
  let suggestedAggregations: string[] = ["SUM", "AVG"];
  let suggestedName = toTitleCase(column.name);

  // Currency patterns
  if (/price|amount|cost|revenue|total|fee|charge|salary|budget/i.test(name)) {
    type = "currency";
    suggestedAggregations = ["SUM", "AVG", "MIN", "MAX"];
    if (/unit.?price/i.test(name)) suggestedName = "Unit Price";
    if (/total/i.test(name)) suggestedName = "Total Amount";
  }

  // Quantity patterns
  if (/quantity|qty|count|units|stock|inventory/i.test(name)) {
    type = "quantity";
    suggestedAggregations = ["SUM", "AVG", "MIN", "MAX"];
    suggestedName = "Quantity";
  }

  // Rate/percentage patterns
  if (/rate|percent|ratio|discount/i.test(name)) {
    type = "rate";
    suggestedAggregations = ["AVG", "MIN", "MAX"];
    suggestedName = toTitleCase(column.name);
  }

  // Duration patterns
  if (/duration|days|hours|minutes|length/i.test(name)) {
    type = "duration";
    suggestedAggregations = ["AVG", "SUM", "MIN", "MAX"];
  }

  // Only include metrics from transaction or entity tables
  if (entity.type !== "transaction" && entity.type !== "entity") {
    return null;
  }

  return {
    table: tableName,
    column: column.name,
    type,
    suggestedAggregations,
    suggestedName,
  };
}

function detectCompositeMetric(table: TableSchema, entity: DetectedEntity): DetectedMetric | null {
  // Look for unit_price * quantity pattern (common in order details)
  const priceCol = table.columns.find(c => /unit.?price|price/i.test(c.name));
  const qtyCol = table.columns.find(c => /quantity|qty/i.test(c.name));

  if (priceCol && qtyCol && entity.type === "transaction") {
    return {
      table: table.name,
      column: `${priceCol.name} * ${qtyCol.name}`,
      type: "currency",
      expression: `${priceCol.name} * ${qtyCol.name}`,
      suggestedAggregations: ["SUM", "AVG"],
      suggestedName: "Revenue",
    };
  }

  return null;
}

// ============================================================================
// Dimension Detection
// ============================================================================

function detectDimensions(
  tables: TableSchema[],
  entities: DetectedEntity[],
  profiling?: ProfilingData
): DetectedDimension[] {
  const dimensions: DetectedDimension[] = [];

  for (const table of tables) {
    const entity = entities.find(e => e.name === table.name);
    if (!entity) continue;

    // Foreign keys are dimensions (e.g., category_id → categories)
    for (const fk of entity.foreignKeys) {
      const referencedEntity = entities.find(e => e.name === fk.referencesTable);
      if (referencedEntity && (referencedEntity.type === "dimension" || referencedEntity.type === "entity")) {
        dimensions.push({
          table: table.name,
          column: fk.column,
          cardinality: referencedEntity.rowCount || 100,
          isHierarchical: false,
          referencedTable: fk.referencesTable,
          suggestedName: toTitleCase(fk.referencesTable.replace(/_/g, " ")),
        });
      }
    }

    // String columns with low cardinality are dimensions
    for (const column of table.columns) {
      if (!column.type.toLowerCase().match(/varchar|text|char|string/)) continue;
      if (/_id$/i.test(column.name)) continue;

      const colProfile = profiling?.tables.get(table.name)?.columns.get(column.name);
      const cardinality = colProfile?.distinctCount || 100;

      // Low cardinality string columns are dimensions
      if (cardinality < 100) {
        // Skip if it's likely a name/description field
        if (/name|description|title|address|email|phone/i.test(column.name)) continue;

        dimensions.push({
          table: table.name,
          column: column.name,
          cardinality,
          isHierarchical: false,
          suggestedName: toTitleCase(column.name.replace(/_/g, " ")),
        });
      }
    }
  }

  return dimensions;
}

// ============================================================================
// Time Field Detection
// ============================================================================

function detectTimeFields(tables: TableSchema[], entities: DetectedEntity[]): DetectedTimeField[] {
  const timeFields: DetectedTimeField[] = [];

  for (const table of tables) {
    const entity = entities.find(e => e.name === table.name);
    if (!entity) continue;

    const dateColumns = table.columns.filter(c =>
      c.type.toLowerCase().includes("date") || c.type.toLowerCase().includes("timestamp")
    );

    for (const column of dateColumns) {
      const name = column.name.toLowerCase();
      let role: DetectedTimeField["role"] = undefined;
      let isPrimary = false;

      // Determine role
      if (/order.?date|transaction.?date|invoice.?date|rental.?date|sale.?date/i.test(name)) {
        role = "transaction";
        isPrimary = entity.type === "transaction";
      } else if (/required|due|deadline|expected/i.test(name)) {
        role = "deadline";
      } else if (/shipped|completed|returned|delivered/i.test(name)) {
        role = "completion";
      } else if (/created|create/i.test(name)) {
        role = "created";
      } else if (/updated|modified/i.test(name)) {
        role = "updated";
      }

      // First date field in transaction table is likely primary
      if (entity.type === "transaction" && timeFields.filter(t => t.table === table.name).length === 0) {
        isPrimary = true;
      }

      timeFields.push({
        table: table.name,
        column: column.name,
        granularity: column.type.toLowerCase().includes("timestamp") ? "timestamp" : "date",
        isPrimary,
        role,
      });
    }
  }

  return timeFields;
}

// ============================================================================
// Business Domain Inference
// ============================================================================

function inferBusinessDomain(tables: TableSchema[], entities: DetectedEntity[]): InferredDomain {
  const signals: string[] = [];
  const tableNames = tables.map(t => t.name.toLowerCase()).join(" ");

  // Commerce signals
  const commerceScore = countMatches(tableNames, [
    "order", "product", "customer", "cart", "invoice", "payment", "category", "supplier"
  ]);
  if (commerceScore >= 3) signals.push(`Commerce tables: ${commerceScore} matches`);

  // SaaS signals
  const saasScore = countMatches(tableNames, [
    "subscription", "plan", "user", "tenant", "feature", "usage", "billing"
  ]);
  if (saasScore >= 2) signals.push(`SaaS tables: ${saasScore} matches`);

  // Media signals
  const mediaScore = countMatches(tableNames, [
    "film", "movie", "track", "album", "artist", "playlist", "rental", "genre"
  ]);
  if (mediaScore >= 2) signals.push(`Media tables: ${mediaScore} matches`);

  // Logistics signals
  const logisticsScore = countMatches(tableNames, [
    "shipment", "delivery", "warehouse", "inventory", "carrier", "route"
  ]);
  if (logisticsScore >= 2) signals.push(`Logistics tables: ${logisticsScore} matches`);

  // Finance signals
  const financeScore = countMatches(tableNames, [
    "account", "transaction", "ledger", "journal", "balance", "budget"
  ]);
  if (financeScore >= 2) signals.push(`Finance tables: ${financeScore} matches`);

  // Determine winner
  const scores = [
    { type: "commerce" as BusinessDomain, score: commerceScore },
    { type: "saas" as BusinessDomain, score: saasScore },
    { type: "media" as BusinessDomain, score: mediaScore },
    { type: "logistics" as BusinessDomain, score: logisticsScore },
    { type: "finance" as BusinessDomain, score: financeScore },
  ];

  const sortedScores = scores.sort((a, b) => b.score - a.score);
  const best = sortedScores[0]!; // Always has at least one element
  const confidence = best.score >= 4 ? 0.95 : best.score >= 3 ? 0.85 : best.score >= 2 ? 0.7 : 0.5;

  return {
    type: best.score >= 2 ? best.type : "generic",
    confidence,
    signals,
  };
}

function countMatches(text: string, patterns: string[]): number {
  return patterns.filter(p => text.includes(p)).length;
}

// ============================================================================
// Formatting for Prompt
// ============================================================================

export function formatSchemaAnalysisForPrompt(analysis: SchemaAnalysis): string {
  const lines: string[] = [];

  lines.push("## SCHEMA ANALYSIS RESULTS");
  lines.push("");

  // Business domain
  lines.push(`**Detected Business Domain**: ${analysis.inferredDomain.type.toUpperCase()} (confidence: ${(analysis.inferredDomain.confidence * 100).toFixed(0)}%)`);
  if (analysis.inferredDomain.signals.length > 0) {
    lines.push(`- Signals: ${analysis.inferredDomain.signals.join(", ")}`);
  }
  lines.push("");

  // Transaction tables
  const transactions = analysis.entities.filter(e => e.type === "transaction");
  if (transactions.length > 0) {
    lines.push("**Transaction Tables** (PRIMARY for KPIs):");
    for (const t of transactions) {
      const fks = t.foreignKeys.map(f => f.referencesTable).join(", ");
      lines.push(`- ${t.name}${t.rowCount ? ` (${t.rowCount} rows)` : ""}: ${t.businessMeaning || ""}`);
      if (fks) lines.push(`  Links to: ${fks}`);
    }
    lines.push("");
  }

  // Entity tables
  const entities = analysis.entities.filter(e => e.type === "entity");
  if (entities.length > 0) {
    lines.push("**Entity Tables** (Master Data):");
    for (const e of entities) {
      lines.push(`- ${e.name}${e.rowCount ? ` (${e.rowCount} rows)` : ""}: ${e.businessMeaning || ""}`);
    }
    lines.push("");
  }

  // Metrics
  if (analysis.metrics.length > 0) {
    lines.push("**Available Metrics** (can be aggregated):");
    for (const m of analysis.metrics) {
      const expr = m.expression || m.column;
      lines.push(`- ${m.table}.${expr} → ${m.suggestedName} (${m.suggestedAggregations.join(", ")})`);
    }
    lines.push("");
  }

  // Dimensions
  if (analysis.dimensions.length > 0) {
    lines.push("**Available Dimensions** (for breakdowns - USE THESE!):");
    for (const d of analysis.dimensions) {
      const via = d.referencedTable ? ` [VIA ${d.referencedTable} table]` : "";
      lines.push(`- ${d.table}.${d.column} → ${d.suggestedName} (${d.cardinality} values)${via}`);
    }
    lines.push("");
  }

  // Time fields
  if (analysis.timeFields.length > 0) {
    lines.push("**Time Fields** (for trends and filtering):");
    for (const t of analysis.timeFields) {
      const primary = t.isPrimary ? " [PRIMARY]" : "";
      const role = t.role ? ` (${t.role})` : "";
      lines.push(`- ${t.table}.${t.column}${role}${primary}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================================
// Utilities
// ============================================================================

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}
