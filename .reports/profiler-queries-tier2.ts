/**
 * Tier 2 Profiling Query Builders
 *
 * Fast sample-based analysis using adaptive sampling strategy:
 * - 1% sample for large tables (>100k rows)
 * - 100% for small tables (<10k rows)
 * - Single-pass multi-metric computation for efficiency
 */

import type { Table, Column } from '../packages/liquid-connect/src/uvb/models';

// =============================================================================
// Result Type Definitions
// =============================================================================

/**
 * Result from sample profiling query (all metrics in single pass)
 */
export interface SampleProfilingResult {
  columnName: string;
  columnType: string;

  // Basic metrics (all columns)
  nullCount: number;
  nullPercentage: number;
  cardinality: number;

  // Numeric metrics
  numericMin?: number;
  numericMax?: number;
  numericAvg?: number;
  numericStdDev?: number;

  // Temporal metrics
  temporalMin?: Date;
  temporalMax?: Date;
  temporalSpanDays?: number;

  // Text metrics
  textMinLength?: number;
  textMaxLength?: number;
  textAvgLength?: number;
}

/**
 * Result from freshness query (data span analysis)
 */
export interface FreshnessResult {
  columnName: string;
  earliestTimestamp: Date;
  latestTimestamp: Date;
  spanDays: number;
}

/**
 * Result from cardinality query
 */
export interface CardinalityResult {
  columnName: string;
  distinctCount: number;
  estimatedCardinality: number; // Adjusted for sample rate
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escape SQL identifier (table/column name) for safe query construction
 */
function escapeIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Classify column into profiling category based on data type
 */
function classifyColumn(column: Column): 'numeric' | 'temporal' | 'text' | 'other' {
  const type = column.dataType.toLowerCase();

  // Numeric types
  if (type.includes('int') || type.includes('decimal') || type.includes('numeric') ||
      type.includes('real') || type.includes('double') || type.includes('float') ||
      type.includes('money')) {
    return 'numeric';
  }

  // Temporal types
  if (type.includes('date') || type.includes('time')) {
    return 'temporal';
  }

  // Text types
  if (type.includes('char') || type.includes('text') || type.includes('string') ||
      type.includes('varchar')) {
    return 'text';
  }

  return 'other';
}

/**
 * Get columns by type category
 */
function getColumnsByType(table: Table, type: 'numeric' | 'temporal' | 'text'): Column[] {
  return table.columns.filter(col => classifyColumn(col) === type);
}

// =============================================================================
// Query Builders
// =============================================================================

/**
 * Build comprehensive sample profiling query (single-pass, all metrics)
 *
 * Uses TABLESAMPLE for large tables, computes all metrics in one scan:
 * - Row count (from sample)
 * - NULL counts and percentages
 * - Cardinality (COUNT DISTINCT) per column
 * - Min/Max for numeric and temporal columns
 * - Basic statistics (AVG, STDDEV) for numeric columns
 * - Length statistics for text columns
 *
 * @example
 * ```sql
 * WITH sample_data AS (
 *   SELECT * FROM orders TABLESAMPLE BERNOULLI (1.0)
 * ),
 * row_count AS (
 *   SELECT COUNT(*) as total FROM sample_data
 * ),
 * numeric_stats AS (
 *   SELECT
 *     'total_amount' as column_name,
 *     'numeric' as column_type,
 *     COUNT(*) FILTER (WHERE total_amount IS NULL) as null_count,
 *     COUNT(DISTINCT total_amount) as cardinality,
 *     MIN(total_amount) as min_value,
 *     MAX(total_amount) as max_value,
 *     AVG(total_amount) as avg_value,
 *     STDDEV(total_amount) as stddev_value
 *   FROM sample_data
 * ),
 * -- ... more CTEs for temporal, text columns
 * combined AS (
 *   SELECT * FROM numeric_stats
 *   UNION ALL SELECT * FROM temporal_stats
 *   UNION ALL SELECT * FROM text_stats
 * )
 * SELECT
 *   c.*,
 *   (c.null_count::FLOAT / NULLIF(rc.total, 0) * 100) as null_percentage
 * FROM combined c
 * CROSS JOIN row_count rc
 * ```
 */
export function buildSampleProfilingQuery(table: Table, sampleRate: number): string {
  const tableName = `${escapeIdentifier(table.schema)}.${escapeIdentifier(table.name)}`;
  const samplePercent = sampleRate * 100;

  // Classify columns
  const numericCols = getColumnsByType(table, 'numeric');
  const temporalCols = getColumnsByType(table, 'temporal');
  const textCols = getColumnsByType(table, 'text');

  // Build sampling CTE
  const sampleCTE = `
  sample_data AS (
    SELECT * FROM ${tableName}
    ${samplePercent < 100 ? `TABLESAMPLE BERNOULLI (${samplePercent})` : ''}
  ),
  row_count AS (
    SELECT COUNT(*) as total FROM sample_data
  )`;

  // Build numeric stats CTE
  const numericStats = numericCols.length > 0 ? `,
  numeric_stats AS (
    ${numericCols.map((col, idx) => `
    ${idx > 0 ? 'UNION ALL' : ''}
    SELECT
      '${col.name}' as column_name,
      'numeric' as column_type,
      COUNT(*) FILTER (WHERE ${escapeIdentifier(col.name)} IS NULL) as null_count,
      COUNT(DISTINCT ${escapeIdentifier(col.name)}) as cardinality,
      MIN(${escapeIdentifier(col.name)})::DOUBLE as min_value,
      MAX(${escapeIdentifier(col.name)})::DOUBLE as max_value,
      AVG(${escapeIdentifier(col.name)})::DOUBLE as avg_value,
      STDDEV(${escapeIdentifier(col.name)})::DOUBLE as stddev_value,
      NULL::DOUBLE as text_min_length,
      NULL::DOUBLE as text_max_length,
      NULL::DOUBLE as text_avg_length
    FROM sample_data`).join('')}
  )` : '';

  // Build temporal stats CTE
  const temporalStats = temporalCols.length > 0 ? `,
  temporal_stats AS (
    ${temporalCols.map((col, idx) => `
    ${idx > 0 ? 'UNION ALL' : ''}
    SELECT
      '${col.name}' as column_name,
      'temporal' as column_type,
      COUNT(*) FILTER (WHERE ${escapeIdentifier(col.name)} IS NULL) as null_count,
      COUNT(DISTINCT ${escapeIdentifier(col.name)}) as cardinality,
      MIN(${escapeIdentifier(col.name)})::TIMESTAMP as min_value,
      MAX(${escapeIdentifier(col.name)})::TIMESTAMP as max_value,
      NULL::DOUBLE as avg_value,
      NULL::DOUBLE as stddev_value,
      NULL::DOUBLE as text_min_length,
      NULL::DOUBLE as text_max_length,
      NULL::DOUBLE as text_avg_length
    FROM sample_data`).join('')}
  )` : '';

  // Build text stats CTE
  const textStats = textCols.length > 0 ? `,
  text_stats AS (
    ${textCols.map((col, idx) => `
    ${idx > 0 ? 'UNION ALL' : ''}
    SELECT
      '${col.name}' as column_name,
      'text' as column_type,
      COUNT(*) FILTER (WHERE ${escapeIdentifier(col.name)} IS NULL) as null_count,
      COUNT(DISTINCT ${escapeIdentifier(col.name)}) as cardinality,
      NULL::DOUBLE as min_value,
      NULL::DOUBLE as max_value,
      NULL::DOUBLE as avg_value,
      NULL::DOUBLE as stddev_value,
      MIN(LENGTH(${escapeIdentifier(col.name)}))::DOUBLE as text_min_length,
      MAX(LENGTH(${escapeIdentifier(col.name)}))::DOUBLE as text_max_length,
      AVG(LENGTH(${escapeIdentifier(col.name)}))::DOUBLE as text_avg_length
    FROM sample_data`).join('')}
  )` : '';

  // Combine all CTEs
  const allCTEs = [sampleCTE, numericStats, temporalStats, textStats]
    .filter(Boolean)
    .join('');

  // Handle empty table case
  if (numericCols.length === 0 && temporalCols.length === 0 && textCols.length === 0) {
    return `
    WITH row_count AS (
      SELECT COUNT(*) as total FROM ${tableName}
      ${samplePercent < 100 ? `TABLESAMPLE BERNOULLI (${samplePercent})` : ''}
    )
    SELECT
      'no_columns' as column_name,
      'empty' as column_type,
      0 as null_count,
      0 as cardinality,
      NULL::DOUBLE as min_value,
      NULL::DOUBLE as max_value,
      NULL::DOUBLE as avg_value,
      NULL::DOUBLE as stddev_value,
      NULL::DOUBLE as text_min_length,
      NULL::DOUBLE as text_max_length,
      NULL::DOUBLE as text_avg_length,
      0.0 as null_percentage,
      rc.total as sample_row_count
    FROM row_count rc
    WHERE FALSE
    `.trim();
  }

  // Build final query
  const unionParts = [];
  if (numericCols.length > 0) unionParts.push('numeric_stats');
  if (temporalCols.length > 0) unionParts.push('temporal_stats');
  if (textCols.length > 0) unionParts.push('text_stats');

  return `
  WITH ${allCTEs},
  combined AS (
    ${unionParts.map((part, idx) =>
      `${idx > 0 ? 'UNION ALL ' : ''}SELECT * FROM ${part}`
    ).join('\n    ')}
  )
  SELECT
    c.column_name,
    c.column_type,
    c.null_count,
    c.cardinality,
    c.min_value as numeric_min,
    c.max_value as numeric_max,
    c.avg_value as numeric_avg,
    c.stddev_value as numeric_stddev,
    CASE
      WHEN c.column_type = 'temporal' THEN c.min_value
      ELSE NULL
    END as temporal_min,
    CASE
      WHEN c.column_type = 'temporal' THEN c.max_value
      ELSE NULL
    END as temporal_max,
    c.text_min_length,
    c.text_max_length,
    c.text_avg_length,
    (c.null_count::FLOAT / NULLIF(rc.total, 0) * 100) as null_percentage,
    rc.total as sample_row_count
  FROM combined c
  CROSS JOIN row_count rc
  ORDER BY c.column_name
  `.trim();
}

/**
 * Build freshness query (data span analysis)
 *
 * Computes MIN/MAX across all timestamp columns to determine:
 * - Earliest data point
 * - Latest data point
 * - Overall data span in days
 *
 * @example
 * ```sql
 * SELECT
 *   'created_at' as column_name,
 *   MIN(created_at) as earliest_timestamp,
 *   MAX(created_at) as latest_timestamp,
 *   DATE_DIFF('day', MIN(created_at), MAX(created_at)) as span_days
 * FROM orders
 * GROUP BY 1
 * UNION ALL
 * SELECT
 *   'updated_at' as column_name,
 *   MIN(updated_at) as earliest_timestamp,
 *   MAX(updated_at) as latest_timestamp,
 *   DATE_DIFF('day', MIN(updated_at), MAX(updated_at)) as span_days
 * FROM orders
 * GROUP BY 1
 * ```
 */
export function buildFreshnessQuery(table: Table, timestampColumns: string[]): string {
  const tableName = `${escapeIdentifier(table.schema)}.${escapeIdentifier(table.name)}`;

  if (timestampColumns.length === 0) {
    return `
    SELECT
      'no_timestamps' as column_name,
      NULL::TIMESTAMP as earliest_timestamp,
      NULL::TIMESTAMP as latest_timestamp,
      0 as span_days
    WHERE FALSE
    `.trim();
  }

  const queries = timestampColumns.map((colName, idx) => {
    const escapedCol = escapeIdentifier(colName);
    return `
    ${idx > 0 ? 'UNION ALL' : ''}
    SELECT
      '${colName}' as column_name,
      MIN(${escapedCol})::TIMESTAMP as earliest_timestamp,
      MAX(${escapedCol})::TIMESTAMP as latest_timestamp,
      DATE_DIFF('day', MIN(${escapedCol}), MAX(${escapedCol})) as span_days
    FROM ${tableName}
    WHERE ${escapedCol} IS NOT NULL`;
  });

  return queries.join('\n').trim();
}

/**
 * Build cardinality query for specific columns
 *
 * Computes COUNT(DISTINCT) for specified columns using sampling.
 * Results are adjusted for sample rate to estimate full table cardinality.
 *
 * @example
 * ```sql
 * WITH sample_data AS (
 *   SELECT * FROM orders TABLESAMPLE BERNOULLI (1.0)
 * ),
 * row_count AS (
 *   SELECT COUNT(*) as sampled, 1000000 as estimated_total FROM sample_data
 * )
 * SELECT
 *   'customer_id' as column_name,
 *   COUNT(DISTINCT customer_id) as distinct_count,
 *   (COUNT(DISTINCT customer_id)::FLOAT / rc.sampled * rc.estimated_total) as estimated_cardinality
 * FROM sample_data
 * CROSS JOIN row_count rc
 * UNION ALL
 * SELECT
 *   'product_id' as column_name,
 *   COUNT(DISTINCT product_id) as distinct_count,
 *   (COUNT(DISTINCT product_id)::FLOAT / rc.sampled * rc.estimated_total) as estimated_cardinality
 * FROM sample_data
 * CROSS JOIN row_count rc
 * ```
 */
export function buildCardinalityQuery(
  table: Table,
  columns: string[],
  sampleRate: number
): string {
  const tableName = `${escapeIdentifier(table.schema)}.${escapeIdentifier(table.name)}`;
  const samplePercent = sampleRate * 100;

  if (columns.length === 0) {
    return `
    SELECT
      'no_columns' as column_name,
      0 as distinct_count,
      0.0 as estimated_cardinality
    WHERE FALSE
    `.trim();
  }

  const sampleCTE = `
  WITH sample_data AS (
    SELECT * FROM ${tableName}
    ${samplePercent < 100 ? `TABLESAMPLE BERNOULLI (${samplePercent})` : ''}
  ),
  row_count AS (
    SELECT
      COUNT(*) as sampled,
      COUNT(*)::FLOAT / ${sampleRate} as estimated_total
    FROM sample_data
  )`;

  const queries = columns.map((colName, idx) => {
    const escapedCol = escapeIdentifier(colName);
    return `
    ${idx > 0 ? 'UNION ALL' : ''}
    SELECT
      '${colName}' as column_name,
      COUNT(DISTINCT ${escapedCol}) as distinct_count,
      CASE
        WHEN rc.sampled = 0 THEN 0
        ELSE (COUNT(DISTINCT ${escapedCol})::FLOAT / NULLIF(rc.sampled, 0) * rc.estimated_total)
      END as estimated_cardinality
    FROM sample_data
    CROSS JOIN row_count rc`;
  });

  return `
  ${sampleCTE}
  ${queries.join('\n')}
  `.trim();
}

// =============================================================================
// Utility: Determine Sample Rate
// =============================================================================

/**
 * Determine appropriate sample rate based on table size
 *
 * Strategy:
 * - Tables < 10k rows: 100% (full scan)
 * - Tables 10k-100k: 10% sample
 * - Tables > 100k: 1% sample
 *
 * @param estimatedRowCount - Estimated row count from Tier 1 stats
 * @returns Sample rate between 0.01 and 1.0
 */
export function determineAdaptiveSampleRate(estimatedRowCount: number): number {
  if (estimatedRowCount < 10_000) {
    return 1.0; // Full scan for small tables
  } else if (estimatedRowCount < 100_000) {
    return 0.1; // 10% sample for medium tables
  } else {
    return 0.01; // 1% sample for large tables
  }
}

/**
 * Check if table is empty before attempting profiling
 *
 * @example
 * ```sql
 * SELECT COUNT(*) as row_count FROM orders LIMIT 1
 * ```
 */
export function buildRowCountCheckQuery(table: Table): string {
  const tableName = `${escapeIdentifier(table.schema)}.${escapeIdentifier(table.name)}`;
  return `SELECT COUNT(*) as row_count FROM ${tableName} LIMIT 1`;
}
