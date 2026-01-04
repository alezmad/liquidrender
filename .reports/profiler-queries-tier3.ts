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
