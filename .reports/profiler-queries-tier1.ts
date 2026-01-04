/**
 * Tier 1 Profiling Query Builders
 *
 * Query builders for PostgreSQL database statistics profiling.
 * Tier 1 uses system catalogs (pg_class, pg_stats, pg_stat_user_tables)
 * for instant metadata without scanning table data.
 *
 * All queries are compatible with DuckDB's PostgreSQL scanner.
 */

import type { Table, Column } from '../packages/liquid-connect/src/uvb/models';

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
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '${schemaName}'
    AND c.relname = '${tableName}'
    AND c.relkind = 'r'
),
maintenance_stats AS (
  SELECT
    last_vacuum::text AS last_vacuum,
    last_analyze::text AS last_analyze
  FROM pg_stat_user_tables
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
FROM pg_stats s
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
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables st
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
FROM pg_stats s
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
FROM pg_stat_user_tables
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
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables st
  ON st.schemaname = n.nspname
  AND st.relname = c.relname
WHERE n.nspname = '${schemaName}'
  AND c.relkind = 'r'
  ${exclusions}
ORDER BY c.reltuples DESC;
  `.trim();
}

// =============================================================================
// Exports
// =============================================================================

export {
  buildTableStatisticsQuery,
  buildColumnStatisticsQuery,
  buildCombinedStatisticsQuery,
  buildStaleStatsCheckQuery,
  buildSchemaStatisticsQuery,
};
