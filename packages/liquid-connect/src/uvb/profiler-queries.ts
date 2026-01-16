/**
 * Data Profiling SQL Query Builders
 *
 * Three-tier approach for database profiling:
 * - Tier 1: Database statistics (instant, no table scans)
 * - Tier 2: Smart sampling (fast, adaptive sample rates)
 * - Tier 3: Detailed profiling (selective, expensive)
 *
 * All queries compatible with DuckDB's PostgreSQL scanner.
 */

import type { Table, Column } from './models';

// =============================================================================
// DuckDB Catalog Prefix
// =============================================================================

/**
 * PostgreSQL system catalog prefix for DuckDB's postgres_scanner
 *
 * When PostgreSQL is attached via DuckDB's postgres_scanner, system catalog
 * tables (pg_class, pg_stat_user_tables, etc.) are accessible via:
 * - source_db.pg_catalog.<table_name>
 *
 * This prefix is required for Tier 1 queries that read from system catalogs.
 */
const PG_CATALOG = 'source_db.pg_catalog';

// =============================================================================
// Types
// =============================================================================

/**
 * Result from buildTableStatisticsQuery
 */
export interface TableStatisticsResult {
  row_count_estimate: number;
  table_size_bytes: number;
  last_vacuum: string | null;
  last_analyze: string | null;
}

/**
 * Result from buildColumnStatisticsQuery (per column)
 */
export interface ColumnStatisticsResult {
  column_name: string;
  n_distinct: number | null;
  null_frac: number | null;
  avg_width: number | null;
}

// =============================================================================
// Query Builders
// =============================================================================

/**
 * Build query to fetch table-level statistics from PostgreSQL system catalogs.
 *
 * Returns instant metadata:
 * - Row count estimate (from pg_class.reltuples)
 * - Table size in bytes (from pg_class.relpages * 8192)
 * - Last vacuum timestamp (from pg_stat_user_tables)
 * - Last analyze timestamp (from pg_stat_user_tables)
 *
 * @param tableName - Name of the table (unquoted)
 * @param schemaName - Schema name (default: 'public')
 * @returns SQL query string
 *
 * @example
 * ```typescript
 * const query = buildTableStatisticsQuery('orders', 'public');
 * // Returns query combining pg_class and pg_stat_user_tables
 * ```
 */
export function buildTableStatisticsQuery(
  tableName: string,
  schemaName: string = 'public'
): string {
  return `
WITH table_stats AS (
  SELECT
    c.reltuples::bigint AS row_count_estimate,
    (c.relpages * 8192)::bigint AS table_size_bytes
  FROM ${PG_CATALOG}.pg_class c
  JOIN ${PG_CATALOG}.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '${schemaName}'
    AND c.relname = '${tableName}'
    AND c.relkind = 'r'
),
maintenance_stats AS (
  SELECT
    last_vacuum::text AS last_vacuum,
    last_analyze::text AS last_analyze
  FROM ${PG_CATALOG}.pg_stat_user_tables
  WHERE schemaname = '${schemaName}'
    AND relname = '${tableName}'
)
SELECT
  COALESCE(ts.row_count_estimate, 0) AS row_count_estimate,
  COALESCE(ts.table_size_bytes, 0) AS table_size_bytes,
  ms.last_vacuum,
  ms.last_analyze
FROM table_stats ts
CROSS JOIN maintenance_stats ms;
  `.trim();
}

/**
 * Build query to fetch column-level statistics from pg_stats.
 *
 * Returns statistical metadata for all columns:
 * - n_distinct: Estimated number of distinct values (-1 means all unique)
 * - null_frac: Fraction of rows that are NULL (0.0 to 1.0)
 * - avg_width: Average width in bytes
 *
 * Note: pg_stats may not have data for:
 * - Newly created tables (not yet analyzed)
 * - Very small tables
 * - System tables
 *
 * In these cases, n_distinct, null_frac, and avg_width will be NULL.
 *
 * @param tableName - Name of the table (unquoted)
 * @param schemaName - Schema name (default: 'public')
 * @param columns - Array of column names to profile (all columns if empty)
 * @returns SQL query string
 *
 * @example
 * ```typescript
 * const query = buildColumnStatisticsQuery('users', 'public', ['email', 'created_at']);
 * // Returns stats for email and created_at columns only
 * ```
 */
export function buildColumnStatisticsQuery(
  tableName: string,
  schemaName: string = 'public',
  columns: string[] = []
): string {
  const columnFilter = columns.length > 0
    ? `AND s.attname IN (${columns.map(c => `'${c}'`).join(', ')})`
    : '';

  return `
SELECT
  s.attname AS column_name,
  s.n_distinct,
  s.null_frac,
  s.avg_width
FROM ${PG_CATALOG}.pg_stats s
WHERE s.schemaname = '${schemaName}'
  AND s.tablename = '${tableName}'
  ${columnFilter}
ORDER BY s.attname;
  `.trim();
}

/**
 * Build combined query for table + all column statistics in one round-trip.
 *
 * Uses UNION ALL to combine table-level and column-level stats.
 * More efficient than separate queries when profiling entire schema.
 *
 * Result rows:
 * - First row: table statistics (row_type = 'table')
 * - Remaining rows: column statistics (row_type = 'column')
 *
 * @param tableName - Name of the table (unquoted)
 * @param schemaName - Schema name (default: 'public')
 * @param columns - Array of column names (all if empty)
 * @returns SQL query string
 *
 * @example
 * ```typescript
 * const query = buildCombinedStatisticsQuery('products', 'public');
 * // First row: table stats
 * // Subsequent rows: column stats for all columns
 * ```
 */
export function buildCombinedStatisticsQuery(
  tableName: string,
  schemaName: string = 'public',
  columns: string[] = []
): string {
  const columnFilter = columns.length > 0
    ? `AND s.attname IN (${columns.map(c => `'${c}'`).join(', ')})`
    : '';

  return `
-- Table statistics
SELECT
  'table' AS row_type,
  NULL AS column_name,
  c.reltuples::bigint AS row_count_estimate,
  (c.relpages * 8192)::bigint AS table_size_bytes,
  st.last_vacuum::text AS last_vacuum,
  st.last_analyze::text AS last_analyze,
  NULL::numeric AS n_distinct,
  NULL::real AS null_frac,
  NULL::integer AS avg_width
FROM ${PG_CATALOG}.pg_class c
JOIN ${PG_CATALOG}.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN ${PG_CATALOG}.pg_stat_user_tables st
  ON st.schemaname = n.nspname
  AND st.relname = c.relname
WHERE n.nspname = '${schemaName}'
  AND c.relname = '${tableName}'
  AND c.relkind = 'r'

UNION ALL

-- Column statistics
SELECT
  'column' AS row_type,
  s.attname AS column_name,
  NULL AS row_count_estimate,
  NULL AS table_size_bytes,
  NULL AS last_vacuum,
  NULL AS last_analyze,
  s.n_distinct,
  s.null_frac,
  s.avg_width
FROM ${PG_CATALOG}.pg_stats s
WHERE s.schemaname = '${schemaName}'
  AND s.tablename = '${tableName}'
  ${columnFilter}
ORDER BY row_type, column_name;
  `.trim();
}

/**
 * Build query to check if table statistics are stale.
 *
 * Determines if ANALYZE should be run before profiling:
 * - Returns true if last_analyze is NULL or older than threshold
 * - Threshold: 7 days by default
 *
 * @param tableName - Name of the table (unquoted)
 * @param schemaName - Schema name (default: 'public')
 * @param staleDays - Number of days before stats considered stale (default: 7)
 * @returns SQL query string
 *
 * @example
 * ```typescript
 * const query = buildStaleStatsCheckQuery('orders', 'public', 7);
 * // Returns: { is_stale: true/false, days_since_analyze: number }
 * ```
 */
export function buildStaleStatsCheckQuery(
  tableName: string,
  schemaName: string = 'public',
  staleDays: number = 7
): string {
  return `
SELECT
  CASE
    WHEN last_analyze IS NULL THEN true
    WHEN last_analyze < NOW() - INTERVAL '${staleDays} days' THEN true
    ELSE false
  END AS is_stale,
  CASE
    WHEN last_analyze IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (NOW() - last_analyze)) / 86400
  END AS days_since_analyze,
  last_analyze::text AS last_analyze_timestamp
FROM ${PG_CATALOG}.pg_stat_user_tables
WHERE schemaname = '${schemaName}'
  AND relname = '${tableName}';
  `.trim();
}

/**
 * Build query to get statistics for all tables in schema.
 *
 * Efficient bulk query for profiling entire schema.
 * Useful for initial scan to determine which tables need detailed profiling.
 *
 * @param schemaName - Schema name (default: 'public')
 * @param excludePatterns - Table name patterns to exclude (optional)
 * @returns SQL query string
 *
 * @example
 * ```typescript
 * const query = buildSchemaStatisticsQuery('public', ['tmp_%', 'test_%']);
 * // Returns stats for all non-temporary tables
 * ```
 */
export function buildSchemaStatisticsQuery(
  schemaName: string = 'public',
  excludePatterns: string[] = []
): string {
  const exclusions = excludePatterns.length > 0
    ? `AND NOT (${excludePatterns.map(p => `c.relname LIKE '${p}'`).join(' OR ')})`
    : '';

  return `
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.reltuples::bigint AS row_count_estimate,
  (c.relpages * 8192)::bigint AS table_size_bytes,
  st.last_vacuum::text AS last_vacuum,
  st.last_analyze::text AS last_analyze,
  st.n_live_tup AS live_tuples,
  st.n_dead_tup AS dead_tuples
FROM ${PG_CATALOG}.pg_class c
JOIN ${PG_CATALOG}.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN ${PG_CATALOG}.pg_stat_user_tables st
  ON st.schemaname = n.nspname
  AND st.relname = c.relname
WHERE n.nspname = '${schemaName}'
  AND c.relkind = 'r'
  ${exclusions}
ORDER BY c.reltuples DESC;
  `.trim();
}

// =============================================================================
// TIER 2: Smart Sampling (Fast)
// =============================================================================


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

// =============================================================================
// TIER 3: Detailed Profiling (Selective)
// =============================================================================

/**
 * Tier 3 Profiling Query Builders
 *
 * Deep statistical analysis queries - expensive, run selectively on "interesting" tables.
 * Uses advanced SQL features: window functions, percentiles, pattern matching.
 *
 * @module profiler-queries-tier3
 */

/**
 * Build query for percentile distribution analysis
 *
 * Returns comprehensive statistical distribution for numeric columns:
 * - Percentiles: p25, p50 (median), p75, p90, p95, p99
 * - Central tendency: mean
 * - Spread: stddev, min, max
 * - Range: max - min
 *
 * @example
 * ```sql
 * -- Result for revenue column:
 * -- mean: 52340, stddev: 18290, min: 0, max: 250000
 * -- p25: 38000, p50: 49500, p75: 65000, p90: 78000, p95: 92000, p99: 145000
 * ```
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name
 * @param columnName - Numeric column to analyze
 * @returns SQL query string for percentile analysis
 */
export function buildPercentileQuery(
  tableName: string,
  schemaName: string,
  columnName: string
): string {
  const quotedTable = `"${schemaName}"."${tableName}"`;
  const quotedColumn = `"${columnName}"`;

  return `
SELECT
  AVG(${quotedColumn}) AS mean,
  STDDEV(${quotedColumn}) AS stddev,
  MIN(${quotedColumn}) AS min,
  MAX(${quotedColumn}) AS max,
  MAX(${quotedColumn}) - MIN(${quotedColumn}) AS range,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${quotedColumn}) AS p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${quotedColumn}) AS p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${quotedColumn}) AS p75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY ${quotedColumn}) AS p90,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${quotedColumn}) AS p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${quotedColumn}) AS p99
FROM ${quotedTable}
WHERE ${quotedColumn} IS NOT NULL;
  `.trim();
}

/**
 * Build query for top values frequency analysis
 *
 * Returns most common values with frequency counts and percentages.
 * Useful for:
 * - Identifying dominant categories
 * - Finding data quality issues (unexpected common values)
 * - Understanding distribution skew
 *
 * @example
 * ```sql
 * -- Result for status column:
 * -- 'active': 8520 (85.2%), 'pending': 980 (9.8%), 'inactive': 500 (5.0%)
 * ```
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name
 * @param columnName - Column to analyze
 * @param limit - Number of top values to return (default: 10)
 * @returns SQL query string for top values analysis
 */
export function buildTopValuesQuery(
  tableName: string,
  schemaName: string,
  columnName: string,
  limit: number = 10
): string {
  const quotedTable = `"${schemaName}"."${tableName}"`;
  const quotedColumn = `"${columnName}"`;

  return `
WITH total_count AS (
  SELECT COUNT(*) AS total FROM ${quotedTable}
),
value_counts AS (
  SELECT
    ${quotedColumn} AS value,
    COUNT(*) AS frequency
  FROM ${quotedTable}
  WHERE ${quotedColumn} IS NOT NULL
  GROUP BY ${quotedColumn}
)
SELECT
  value,
  frequency,
  ROUND(100.0 * frequency / total_count.total, 2) AS percentage
FROM value_counts
CROSS JOIN total_count
ORDER BY frequency DESC
LIMIT ${limit};
  `.trim();
}

/**
 * Build query for pattern detection in text columns
 *
 * Detects common data patterns:
 * - Email addresses (contains @domain.tld)
 * - URLs (http/https protocols)
 * - Phone numbers (various formats)
 * - UUIDs (standard format)
 * - JSON (objects/arrays)
 *
 * Also provides length statistics to understand string distribution.
 *
 * @example
 * ```sql
 * -- Result for contact_info column:
 * -- email_count: 4520, url_count: 0, phone_count: 180, uuid_count: 0, json_count: 0
 * -- min_length: 8, max_length: 254, avg_length: 42.3
 * ```
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name
 * @param columnName - Text column to analyze
 * @returns SQL query string for pattern detection
 */
export function buildPatternDetectionQuery(
  tableName: string,
  schemaName: string,
  columnName: string
): string {
  const quotedTable = `"${schemaName}"."${tableName}"`;
  const quotedColumn = `"${columnName}"`;

  return `
SELECT
  COUNT(*) FILTER (
    WHERE ${quotedColumn} ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
  ) AS email_count,
  COUNT(*) FILTER (
    WHERE ${quotedColumn} ~ '^https?://[^\s]+'
  ) AS url_count,
  COUNT(*) FILTER (
    WHERE ${quotedColumn} ~ '^\+?[1-9]\d{1,14}$|^\(\d{3}\)\s?\d{3}-?\d{4}$|^\d{3}-\d{3}-\d{4}$'
  ) AS phone_count,
  COUNT(*) FILTER (
    WHERE ${quotedColumn} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) AS uuid_count,
  COUNT(*) FILTER (
    WHERE ${quotedColumn} ~ '^\s*[\{\[]'
  ) AS json_count,
  MIN(LENGTH(${quotedColumn})) AS min_length,
  MAX(LENGTH(${quotedColumn})) AS max_length,
  ROUND(AVG(LENGTH(${quotedColumn})), 2) AS avg_length
FROM ${quotedTable}
WHERE ${quotedColumn} IS NOT NULL;
  `.trim();
}

/**
 * Build query for temporal gap detection
 *
 * Finds significant gaps (>7 days) in date sequences.
 * Useful for:
 * - Detecting data pipeline failures
 * - Finding historical data holes
 * - Understanding data collection patterns
 *
 * Uses LEAD window function to compare consecutive records.
 *
 * @example
 * ```sql
 * -- Result for created_at column:
 * -- Gap 1: 2024-03-15 to 2024-03-28 (13 days)
 * -- Gap 2: 2024-06-10 to 2024-07-02 (22 days)
 * ```
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name
 * @param columnName - Date/timestamp column to analyze
 * @returns SQL query string for gap detection
 */
export function buildTemporalGapQuery(
  tableName: string,
  schemaName: string,
  columnName: string
): string {
  const quotedTable = `"${schemaName}"."${tableName}"`;
  const quotedColumn = `"${columnName}"`;

  return `
WITH ordered_dates AS (
  SELECT
    ${quotedColumn} AS current_date,
    LEAD(${quotedColumn}) OVER (ORDER BY ${quotedColumn}) AS next_date
  FROM ${quotedTable}
  WHERE ${quotedColumn} IS NOT NULL
),
gaps AS (
  SELECT
    current_date AS gap_start,
    next_date AS gap_end,
    DATE_DIFF('day', current_date, next_date) AS gap_days
  FROM ordered_dates
  WHERE next_date IS NOT NULL
    AND DATE_DIFF('day', current_date, next_date) > 7
)
SELECT
  gap_start,
  gap_end,
  gap_days
FROM gaps
ORDER BY gap_start;
  `.trim();
}

/**
 * Build query for update frequency pattern analysis
 *
 * Analyzes timestamp distribution to detect update patterns:
 * - Realtime: consistent sub-hour intervals (streaming data)
 * - Hourly: records cluster on hour boundaries (scheduled jobs)
 * - Daily: records cluster on date boundaries (batch ETL)
 * - Batch: large gaps followed by bursts (manual imports)
 * - Stale: no recent data (pipeline failure)
 *
 * Uses statistical analysis of intervals between consecutive records.
 *
 * @example
 * ```sql
 * -- Result for updated_at column:
 * -- pattern: 'hourly', avg_interval_minutes: 62.3, stddev_minutes: 8.4
 * -- last_update: '2024-12-30 14:00:00', hours_since_last: 2.5
 * -- cluster_on_hours: true, cluster_on_days: false
 * ```
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name
 * @param timestampColumn - Timestamp column to analyze
 * @returns SQL query string for update frequency analysis
 */
export function buildUpdateFrequencyQuery(
  tableName: string,
  schemaName: string,
  timestampColumn: string
): string {
  const quotedTable = `"${schemaName}"."${tableName}"`;
  const quotedColumn = `"${timestampColumn}"`;

  return `
WITH intervals AS (
  SELECT
    ${quotedColumn} AS current_time,
    LEAD(${quotedColumn}) OVER (ORDER BY ${quotedColumn}) AS next_time,
    DATE_DIFF('minute', ${quotedColumn}, LEAD(${quotedColumn}) OVER (ORDER BY ${quotedColumn})) AS interval_minutes
  FROM ${quotedTable}
  WHERE ${quotedColumn} IS NOT NULL
),
stats AS (
  SELECT
    COUNT(*) AS total_intervals,
    AVG(interval_minutes) AS avg_interval_minutes,
    STDDEV(interval_minutes) AS stddev_interval_minutes,
    MIN(interval_minutes) AS min_interval_minutes,
    MAX(interval_minutes) AS max_interval_minutes,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY interval_minutes) AS median_interval_minutes
  FROM intervals
  WHERE interval_minutes IS NOT NULL
),
time_clustering AS (
  SELECT
    -- Check if records cluster on hour boundaries (e.g., 00, 15, 30, 45 minutes)
    COUNT(*) FILTER (WHERE EXTRACT(MINUTE FROM ${quotedColumn}) IN (0, 15, 30, 45)) AS hour_cluster_count,
    -- Check if records cluster on day boundaries (midnight)
    COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM ${quotedColumn}) = 0 AND EXTRACT(MINUTE FROM ${quotedColumn}) = 0) AS day_cluster_count,
    COUNT(*) AS total_count
  FROM ${quotedTable}
  WHERE ${quotedColumn} IS NOT NULL
),
recency AS (
  SELECT
    MAX(${quotedColumn}) AS last_update,
    DATE_DIFF('hour', MAX(${quotedColumn}), CURRENT_TIMESTAMP) AS hours_since_last
  FROM ${quotedTable}
  WHERE ${quotedColumn} IS NOT NULL
)
SELECT
  -- Interval statistics
  stats.avg_interval_minutes,
  stats.stddev_interval_minutes,
  stats.min_interval_minutes,
  stats.max_interval_minutes,
  stats.median_interval_minutes,

  -- Pattern detection
  CASE
    WHEN stats.avg_interval_minutes < 60 AND stats.stddev_interval_minutes < 30 THEN 'realtime'
    WHEN time_clustering.hour_cluster_count > time_clustering.total_count * 0.8 THEN 'hourly'
    WHEN time_clustering.day_cluster_count > time_clustering.total_count * 0.8 THEN 'daily'
    WHEN stats.stddev_interval_minutes > stats.avg_interval_minutes * 2 THEN 'batch'
    WHEN recency.hours_since_last > 168 THEN 'stale'
    ELSE 'irregular'
  END AS update_pattern,

  -- Clustering indicators
  ROUND(100.0 * time_clustering.hour_cluster_count / time_clustering.total_count, 2) AS hour_cluster_percentage,
  ROUND(100.0 * time_clustering.day_cluster_count / time_clustering.total_count, 2) AS day_cluster_percentage,

  -- Recency
  recency.last_update,
  recency.hours_since_last
FROM stats
CROSS JOIN time_clustering
CROSS JOIN recency;
  `.trim();
}

/**
 * Build query for cardinality distribution analysis
 *
 * Analyzes cardinality patterns to understand column characteristics:
 * - Very low cardinality: likely boolean or status field
 * - Low cardinality: likely category or enum
 * - Medium cardinality: could be useful for grouping/filtering
 * - High cardinality: likely identifier or unique field
 *
 * Returns cardinality ratio (unique values / total rows).
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name
 * @param columnName - Column to analyze
 * @returns SQL query string for cardinality analysis
 */
export function buildCardinalityDistributionQuery(
  tableName: string,
  schemaName: string,
  columnName: string
): string {
  const quotedTable = `"${schemaName}"."${tableName}"`;
  const quotedColumn = `"${columnName}"`;

  return `
WITH stats AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT ${quotedColumn}) AS unique_values,
    COUNT(*) - COUNT(${quotedColumn}) AS null_count
  FROM ${quotedTable}
)
SELECT
  total_rows,
  unique_values,
  null_count,
  ROUND(100.0 * unique_values / NULLIF(total_rows, 0), 2) AS cardinality_ratio,
  CASE
    WHEN unique_values = 1 THEN 'constant'
    WHEN unique_values <= 2 THEN 'binary'
    WHEN unique_values <= 10 THEN 'very_low'
    WHEN unique_values <= 50 THEN 'low'
    WHEN unique_values <= 1000 THEN 'medium'
    WHEN ROUND(100.0 * unique_values / NULLIF(total_rows, 0), 2) > 95 THEN 'unique'
    ELSE 'high'
  END AS cardinality_category
FROM stats;
  `.trim();
}

/**
 * Export all query builder functions
 */
export const tier3Queries = {
  percentile: buildPercentileQuery,
  topValues: buildTopValuesQuery,
  patternDetection: buildPatternDetectionQuery,
  temporalGaps: buildTemporalGapQuery,
  updateFrequency: buildUpdateFrequencyQuery,
  cardinalityDistribution: buildCardinalityDistributionQuery,
} as const;

// =============================================================================
// DuckDB SUMMARIZE - Universal Profiling (Works for ALL databases)
// =============================================================================

/**
 * DuckDB SUMMARIZE result structure
 *
 * SUMMARIZE returns one row per column with comprehensive statistics.
 * Works across ALL databases via DuckDB scanners (postgres, mysql, sqlite).
 */
export interface SummarizeResult {
  column_name: string;
  column_type: string;
  min: string | null;
  max: string | null;
  approx_unique: number;
  avg: number | null;
  std: number | null;
  q25: number | null;
  q50: number | null;
  q75: number | null;
  count: number;
  null_percentage: number;
}

/**
 * Build DuckDB SUMMARIZE query for universal database profiling
 *
 * DuckDB's SUMMARIZE command provides comprehensive column statistics:
 * - count: Non-null row count
 * - null_percentage: Percentage of NULL values
 * - approx_unique: Approximate distinct count (cardinality)
 * - min/max: Value range
 * - avg/std: Mean and standard deviation (numeric columns)
 * - q25/q50/q75: Quartiles (numeric columns)
 *
 * **Key advantage**: Works for ALL databases via DuckDB scanners!
 * - PostgreSQL via postgres_scanner ✅
 * - MySQL via mysql_scanner ✅
 * - SQLite via sqlite_scanner ✅
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name (default: 'public')
 * @param attachedDbName - DuckDB attached database name (default: 'source_db')
 * @returns SQL query string for SUMMARIZE
 *
 * @example
 * ```typescript
 * const query = buildSummarizeQuery('orders', 'public');
 * // Returns: SUMMARIZE source_db."public"."orders"
 *
 * // Result columns:
 * // column_name | column_type | min | max | approx_unique | avg | std | q25 | q50 | q75 | count | null_percentage
 * ```
 */
export function buildSummarizeQuery(
  tableName: string,
  schemaName: string = 'public',
  attachedDbName: string = 'source_db'
): string {
  return `SUMMARIZE ${attachedDbName}."${schemaName}"."${tableName}"`;
}

/**
 * Build query to get row count using DuckDB
 *
 * Simple COUNT(*) query that works across all databases.
 * Used as a lightweight alternative when only row count is needed.
 *
 * @param tableName - Name of the table
 * @param schemaName - Schema name (default: 'public')
 * @param attachedDbName - DuckDB attached database name (default: 'source_db')
 * @returns SQL query string for row count
 */
export function buildDuckDBRowCountQuery(
  tableName: string,
  schemaName: string = 'public',
  attachedDbName: string = 'source_db'
): string {
  return `SELECT COUNT(*) as row_count FROM ${attachedDbName}."${schemaName}"."${tableName}"`;
}

/**
 * Parse SUMMARIZE results into TableProfile and ColumnProfiles
 *
 * Transforms DuckDB SUMMARIZE output into our profiling data structures.
 *
 * @param summarizeResults - Array of SummarizeResult from DuckDB
 * @param tableName - Name of the table being profiled
 * @returns Object containing tableProfile and columnProfiles
 */
/**
 * Convert DuckDB decimal value to number
 * DuckDB returns decimals as { width, scale, value } where value is BigInt
 * The actual number is value / 10^scale
 */
function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;

  // Handle DuckDBDecimalValue: { width, scale, value: BigInt }
  if (typeof val === 'object' && val !== null && 'scale' in val && 'value' in val) {
    const decimalVal = val as { width: number; scale: number; value: bigint };
    const divisor = Math.pow(10, decimalVal.scale);
    return Number(decimalVal.value) / divisor;
  }

  // Handle BigInt
  if (typeof val === 'bigint') {
    return Number(val);
  }

  // Handle number
  if (typeof val === 'number') {
    return val;
  }

  // Handle string
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Convert DuckDB value to number or null
 */
function toNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined) return null;

  // Handle DuckDBDecimalValue
  if (typeof val === 'object' && val !== null && 'scale' in val && 'value' in val) {
    const decimalVal = val as { width: number; scale: number; value: bigint };
    const divisor = Math.pow(10, decimalVal.scale);
    return Number(decimalVal.value) / divisor;
  }

  // Handle BigInt
  if (typeof val === 'bigint') {
    return Number(val);
  }

  // Handle number
  if (typeof val === 'number') {
    return val;
  }

  // Handle string
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function parseSummarizeResults(
  summarizeResults: SummarizeResult[],
  tableName: string
): {
  rowCount: number;
  columnStats: Map<string, {
    nullPercentage: number;
    distinctCount: number;
    min: string | null;
    max: string | null;
    avg: number | null;
    std: number | null;
    q25: number | null;
    q50: number | null;
    q75: number | null;
    dataType: string;
  }>;
} {
  // Row count is the same for all columns (use first column's count)
  // Note: DuckDB may return BigInt for count
  const rowCount = summarizeResults.length > 0
    ? toNumber(summarizeResults[0].count)
    : 0;

  const columnStats = new Map<string, {
    nullPercentage: number;
    distinctCount: number;
    min: string | null;
    max: string | null;
    avg: number | null;
    std: number | null;
    q25: number | null;
    q50: number | null;
    q75: number | null;
    dataType: string;
  }>();

  for (const row of summarizeResults) {
    columnStats.set(row.column_name, {
      // DuckDB returns null_percentage as DuckDBDecimalValue { width, scale, value }
      nullPercentage: toNumber(row.null_percentage),
      // DuckDB may return BigInt for approx_unique
      distinctCount: toNumber(row.approx_unique),
      min: row.min,
      max: row.max,
      avg: toNumberOrNull(row.avg),
      std: toNumberOrNull(row.std),
      q25: toNumberOrNull(row.q25),
      q50: toNumberOrNull(row.q50),
      q75: toNumberOrNull(row.q75),
      dataType: row.column_type ?? 'unknown',
    });
  }

  return { rowCount, columnStats };
}
