/**
 * Universal Vocabulary Builder - Hard Rules Engine
 *
 * 7 deterministic rules for extracting vocabulary from database schemas.
 * Ported from Python validation scripts (validate_ecija.py, validate_hard_rules.py).
 *
 * Rules:
 * 1. Entity Detection - Tables with PKs (excluding junction tables)
 * 2. Junction Detection - Composite PK of 2+ FKs only
 * 3. Relationship Detection - FK constraints
 * 4. Metric Detection - Numeric columns with aggregation patterns
 * 5. Dimension Detection - Short varchar columns with categorical patterns
 * 6. Time Field Detection - Date/timestamp columns
 * 7. Filter Detection - Boolean columns and flag patterns
 */

import type {
  Table,
  Column,
  ExtractedSchema,
  DetectedVocabulary,
  DetectedEntity,
  DetectedMetric,
  DetectedDimension,
  DetectedTimeField,
  DetectedFilter,
  DetectedRelationship,
  Confirmation,
  HardRulesConfig,
  AggregationType,
} from "./models";
import { DEFAULT_HARD_RULES_CONFIG } from "./models";

// =============================================================================
// Helper Functions
// =============================================================================

function isNumericType(dataType: string): boolean {
  const type = dataType.toLowerCase();
  return /^(decimal|numeric|real|double|float|money|integer|int|smallint|bigint|int4|int8|tinyint)/i.test(type);
}

function isDecimalType(dataType: string): boolean {
  const type = dataType.toLowerCase();
  return /^(decimal|numeric|real|double|float|money)/i.test(type);
}

function isIntegerType(dataType: string): boolean {
  const type = dataType.toLowerCase();
  return /^(integer|int|smallint|bigint|int4|int8|tinyint)/i.test(type);
}

function isStringType(dataType: string): boolean {
  const type = dataType.toLowerCase();
  return /^(varchar|character|char|text|string|nvarchar|clob)/i.test(type);
}

function isTemporalType(dataType: string): boolean {
  const type = dataType.toLowerCase();
  return /^(date|timestamp|timestamptz|datetime|time)/i.test(type);
}

function isBooleanType(dataType: string): boolean {
  const type = dataType.toLowerCase();
  return /^(boolean|bool|bit)/i.test(type);
}

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function generateId(...parts: string[]): string {
  return parts
    .map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, "_"))
    .join("_");
}

function toDisplayName(columnName: string): string {
  return columnName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// =============================================================================
// Rule 1 & 2: Entity Detection
// =============================================================================

function isJunctionTable(table: Table): boolean {
  // Junction table = composite PK where ALL PK columns are FKs
  if (table.primaryKeyColumns.length < 2) {
    return false;
  }

  const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column));
  return table.primaryKeyColumns.every((pk) => fkColumns.has(pk));
}

function detectEntities(tables: Table[]): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  for (const table of tables) {
    // Must have a primary key
    if (table.primaryKeyColumns.length === 0) {
      continue;
    }

    // Check if junction table
    const isJunction = isJunctionTable(table);

    entities.push({
      name: table.name,
      table: table.name,
      schema: table.schema,
      primaryKey:
        table.primaryKeyColumns.length === 1
          ? table.primaryKeyColumns[0]
          : table.primaryKeyColumns,
      columnCount: table.columns.length,
      certainty: 1.0,
      isJunction,
    });
  }

  return entities;
}

// =============================================================================
// Rule 3: Relationship Detection
// =============================================================================

function detectRelationships(tables: Table[]): DetectedRelationship[] {
  const relationships: DetectedRelationship[] = [];
  const junctionTables = new Set(
    tables.filter(isJunctionTable).map((t) => t.name)
  );

  // Direct FK relationships
  for (const table of tables) {
    if (junctionTables.has(table.name)) {
      continue; // Handle junctions separately
    }

    for (const fk of table.foreignKeys) {
      relationships.push({
        id: generateId(table.name, fk.column, fk.referencedTable),
        from: { entity: table.name, field: fk.column },
        to: { entity: fk.referencedTable, field: fk.referencedColumn },
        type: "many_to_one",
        certainty: 1.0,
      });
    }
  }

  // Many-to-many via junction tables
  for (const table of tables) {
    if (!junctionTables.has(table.name)) {
      continue;
    }

    if (table.foreignKeys.length >= 2) {
      const [fk1, fk2] = table.foreignKeys;
      relationships.push({
        id: generateId(fk1.referencedTable, "via", table.name, fk2.referencedTable),
        from: { entity: fk1.referencedTable, field: fk1.referencedColumn },
        to: { entity: fk2.referencedTable, field: fk2.referencedColumn },
        type: "many_to_many",
        via: table.name,
        certainty: 1.0,
      });
    }
  }

  return relationships;
}

// =============================================================================
// Rule 4: Metric Detection
// =============================================================================

function detectMetric(
  column: Column,
  tableName: string,
  config: HardRulesConfig
): DetectedMetric | null {
  // Skip PK and FK columns
  if (column.isPrimaryKey || column.isForeignKey) {
    return null;
  }

  // Skip ID-like columns
  if (column.name.endsWith("_id") || column.name.toLowerCase() === "id") {
    return null;
  }

  const colLower = column.name.toLowerCase();
  const typeLower = column.dataType.toLowerCase();

  // Check if decimal/money type (always a metric candidate)
  const isDecimal = isDecimalType(typeLower);

  // Check if integer with metric name pattern
  const isInteger = isIntegerType(typeLower);
  const hasMetricName = matchesAnyPattern(colLower, config.metricNamePatterns);

  if (!isDecimal && !(isInteger && hasMetricName)) {
    return null;
  }

  // Determine aggregation type
  let aggregation: AggregationType = "SUM";
  let certainty = 0.8;

  // Check for AVG patterns
  if (/rate|ratio|percent|average|avg|score|rating/i.test(colLower)) {
    aggregation = "AVG";
    certainty = 1.0;
  } else if (hasMetricName) {
    aggregation = "SUM";
    certainty = 1.0;
  }

  return {
    id: generateId(tableName, column.name),
    name: column.name,
    table: tableName,
    column: column.name,
    dataType: column.dataType,
    aggregation,
    certainty,
    suggestedDisplayName: toDisplayName(column.name),
    expression: `${aggregation}(${tableName}.${column.name})`,
  };
}

function detectMetrics(tables: Table[], config: HardRulesConfig): DetectedMetric[] {
  const metrics: DetectedMetric[] = [];

  for (const table of tables) {
    // Skip junction tables
    if (isJunctionTable(table)) {
      continue;
    }

    for (const column of table.columns) {
      const metric = detectMetric(column, table.name, config);
      if (metric) {
        metrics.push(metric);
      }
    }

    // Add COUNT metric for entity (from PK)
    if (table.primaryKeyColumns.length > 0) {
      const pkColumn = table.primaryKeyColumns[0];
      metrics.push({
        id: generateId(table.name, "count"),
        name: `${table.name}_count`,
        table: table.name,
        column: pkColumn,
        dataType: "integer",
        aggregation: "COUNT_DISTINCT",
        certainty: 1.0,
        suggestedDisplayName: `${toDisplayName(table.name)} Count`,
        expression: `COUNT(DISTINCT ${table.name}.${pkColumn})`,
      });
    }
  }

  return metrics;
}

// =============================================================================
// Rule 5: Dimension Detection
// =============================================================================

function detectDimension(
  column: Column,
  tableName: string,
  config: HardRulesConfig
): DetectedDimension | null {
  // Skip PK and FK columns
  if (column.isPrimaryKey || column.isForeignKey) {
    return null;
  }

  // Must be string type
  if (!isStringType(column.dataType)) {
    return null;
  }

  const colLower = column.name.toLowerCase();

  // Skip long text fields (descriptions, notes, etc.)
  if (matchesAnyPattern(colLower, config.dimensionExcludePatterns)) {
    return null;
  }

  // Check length constraint
  const hasGoodLength =
    column.charMaxLength !== undefined &&
    column.charMaxLength <= config.dimensionMaxLength;

  // Check name pattern
  const hasGoodName = matchesAnyPattern(colLower, config.dimensionNamePatterns);

  if (!hasGoodLength && !hasGoodName) {
    return null;
  }

  return {
    id: generateId(tableName, column.name),
    name: column.name,
    table: tableName,
    column: column.name,
    dataType: column.dataType,
    certainty: hasGoodName ? 1.0 : 0.9,
  };
}

function detectDimensions(tables: Table[], config: HardRulesConfig): DetectedDimension[] {
  const dimensions: DetectedDimension[] = [];

  for (const table of tables) {
    if (isJunctionTable(table)) {
      continue;
    }

    for (const column of table.columns) {
      const dimension = detectDimension(column, table.name, config);
      if (dimension) {
        dimensions.push(dimension);
      }
    }
  }

  return dimensions;
}

// =============================================================================
// Rule 6: Time Field Detection
// =============================================================================

function detectTimeField(
  column: Column,
  tableName: string,
  config: HardRulesConfig
): DetectedTimeField | null {
  // Must be temporal type
  if (!isTemporalType(column.dataType)) {
    return null;
  }

  const colLower = column.name.toLowerCase();

  // Skip audit columns (created_at, updated_at, etc.)
  const isAuditColumn = matchesAnyPattern(colLower, config.timeAuditPatterns);

  // Check if primary time candidate
  const isPrimaryCandidate =
    !isAuditColumn && matchesAnyPattern(colLower, config.primaryTimePatterns);

  // Still include audit columns but mark them
  return {
    id: generateId(tableName, column.name),
    name: column.name,
    table: tableName,
    column: column.name,
    dataType: column.dataType,
    isPrimaryCandidate,
    certainty: isPrimaryCandidate ? 1.0 : isAuditColumn ? 0.3 : 0.7,
  };
}

function detectTimeFields(tables: Table[], config: HardRulesConfig): DetectedTimeField[] {
  const timeFields: DetectedTimeField[] = [];

  for (const table of tables) {
    if (isJunctionTable(table)) {
      continue;
    }

    for (const column of table.columns) {
      const timeField = detectTimeField(column, table.name, config);
      if (timeField) {
        timeFields.push(timeField);
      }
    }
  }

  // Sort by certainty (primary candidates first)
  return timeFields.sort((a, b) => b.certainty - a.certainty);
}

// =============================================================================
// Rule 7: Filter Detection
// =============================================================================

function detectFilter(
  column: Column,
  tableName: string,
  config: HardRulesConfig
): DetectedFilter | null {
  const colLower = column.name.toLowerCase();
  const typeLower = column.dataType.toLowerCase();

  // Boolean type
  const isBoolean = isBooleanType(typeLower);

  // Filter name pattern (is_, has_, active, etc.)
  const hasFilterName = matchesAnyPattern(colLower, config.filterNamePatterns);

  if (!isBoolean && !hasFilterName) {
    return null;
  }

  return {
    id: generateId(tableName, column.name),
    name: column.name,
    table: tableName,
    column: column.name,
    dataType: column.dataType,
    certainty: 1.0,
    expression: `${tableName}.${column.name} = true`,
  };
}

function detectFilters(tables: Table[], config: HardRulesConfig): DetectedFilter[] {
  const filters: DetectedFilter[] = [];

  for (const table of tables) {
    if (isJunctionTable(table)) {
      continue;
    }

    for (const column of table.columns) {
      const filter = detectFilter(column, table.name, config);
      if (filter) {
        filters.push(filter);
      }
    }
  }

  return filters;
}

// =============================================================================
// Confirmation Generation
// =============================================================================

function generateConfirmations(detected: DetectedVocabulary): Confirmation[] {
  const confirmations: Confirmation[] = [];

  // 1. Primary time field selection (per major entity)
  const tablesWithTimeFields = new Map<string, DetectedTimeField[]>();
  for (const tf of detected.timeFields) {
    if (!tablesWithTimeFields.has(tf.table)) {
      tablesWithTimeFields.set(tf.table, []);
    }
    tablesWithTimeFields.get(tf.table)!.push(tf);
  }

  // Only ask for tables with multiple time field candidates
  for (const [tableName, timeFields] of tablesWithTimeFields) {
    const candidates = timeFields.filter((tf) => tf.certainty >= 0.5);
    if (candidates.length > 1) {
      confirmations.push({
        id: `primary_time_${tableName}`,
        type: "select_one",
        question: `Primary time field for '${tableName}'?`,
        context: "Used for default date filtering and time series analysis",
        options: candidates.map((tf) => ({
          value: tf.column,
          label: tf.column,
          recommended: tf.isPrimaryCandidate,
        })),
        defaultValue: candidates.find((tf) => tf.isPrimaryCandidate)?.column,
      });
    }
  }

  // 2. Metric naming for Spanish/non-English columns
  const nonEnglishMetrics = detected.metrics.filter((m) => {
    const name = m.name.toLowerCase();
    return /importe|valor|cantidad|precio|coste|saldo|horas|tarifa/i.test(name);
  });

  for (const metric of nonEnglishMetrics.slice(0, 3)) {
    confirmations.push({
      id: `rename_${metric.id}`,
      type: "rename",
      question: `Display name for '@${metric.name}'?`,
      context: `Column: ${metric.table}.${metric.column} (${metric.dataType})`,
      currentValue: metric.name,
      suggestion: metric.suggestedDisplayName,
    });
  }

  // 3. Ambiguous metrics (low certainty)
  const ambiguousMetrics = detected.metrics.filter(
    (m) => m.certainty < 1.0 && m.aggregation === "SUM"
  );

  for (const metric of ambiguousMetrics.slice(0, 2)) {
    confirmations.push({
      id: `classify_${metric.id}`,
      type: "classify",
      question: `How should '${metric.name}' be used?`,
      context: `Column: ${metric.table}.${metric.column} (${metric.dataType})`,
      options: [
        { value: "metric", label: "Sum/aggregate this field" },
        { value: "dimension", label: "Group by this field" },
        { value: "skip", label: "Ignore this field" },
      ],
    });
  }

  // Limit to ~5-10 questions total
  return confirmations.slice(0, 10);
}

// =============================================================================
// Main Function
// =============================================================================

export interface ApplyHardRulesResult {
  detected: DetectedVocabulary;
  confirmations: Confirmation[];
  stats: {
    tables: number;
    entities: number;
    junctionTables: number;
    metrics: number;
    dimensions: number;
    timeFields: number;
    filters: number;
    relationships: number;
  };
}

export function applyHardRules(
  schema: ExtractedSchema,
  config: HardRulesConfig = DEFAULT_HARD_RULES_CONFIG
): ApplyHardRulesResult {
  const entities = detectEntities(schema.tables);
  const relationships = detectRelationships(schema.tables);
  const metrics = detectMetrics(schema.tables, config);
  const dimensions = detectDimensions(schema.tables, config);
  const timeFields = detectTimeFields(schema.tables, config);
  const filters = detectFilters(schema.tables, config);

  const detected: DetectedVocabulary = {
    entities: entities.filter((e) => !e.isJunction),
    metrics,
    dimensions,
    timeFields,
    filters,
    relationships,
  };

  const confirmations = generateConfirmations(detected);

  return {
    detected,
    confirmations,
    stats: {
      tables: schema.tables.length,
      entities: entities.filter((e) => !e.isJunction).length,
      junctionTables: entities.filter((e) => e.isJunction).length,
      metrics: metrics.length,
      dimensions: dimensions.length,
      timeFields: timeFields.length,
      filters: filters.length,
      relationships: relationships.length,
    },
  };
}

// Re-export helpers for testing
export {
  isJunctionTable,
  detectEntities,
  detectRelationships,
  detectMetrics,
  detectDimensions,
  detectTimeFields,
  detectFilters,
  generateConfirmations,
};
