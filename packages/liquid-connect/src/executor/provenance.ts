/**
 * Provenance Module - Block Trust Metadata
 *
 * Provides provenance metadata for query results so users know:
 * - When data was fetched (freshness)
 * - What tables/sources were used
 * - Confidence level (exact, calculated, estimated, predicted)
 * - Any assumptions made
 */

// =============================================================================
// Types
// =============================================================================

export type ConfidenceLevel = "exact" | "calculated" | "estimated" | "predicted";

export interface ProvenanceSource {
  /** Source name (e.g., "Stripe.subscriptions", "public.orders") */
  name: string;
  /** SQL preview (truncated for display) */
  query?: string;
}

export interface Provenance {
  /** Human-readable freshness string (e.g., "As of Dec 31, 2:30 PM") */
  freshness: string;
  /** List of data sources used */
  sources: ProvenanceSource[];
  /** Assumptions made during query (e.g., ["USD only", "excludes refunds"]) */
  assumptions?: string[];
  /** Confidence level category */
  confidenceLevel: ConfidenceLevel;
  /** Numeric confidence score (0-100) */
  confidenceScore: number;
  /** ISO timestamp of when data was fetched */
  executedAt: string;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number;
}

// =============================================================================
// SQL Pattern Detection
// =============================================================================

/**
 * SQL keywords and patterns that affect confidence scoring
 */
const SQL_PATTERNS = {
  // High confidence reducers
  join: /\bJOIN\b/gi,
  leftJoin: /\bLEFT\s+(?:OUTER\s+)?JOIN\b/gi,
  rightJoin: /\bRIGHT\s+(?:OUTER\s+)?JOIN\b/gi,
  fullJoin: /\bFULL\s+(?:OUTER\s+)?JOIN\b/gi,
  crossJoin: /\bCROSS\s+JOIN\b/gi,

  // Aggregations (calculated)
  aggregations: /\b(SUM|AVG|COUNT|MIN|MAX|STDDEV|VARIANCE)\s*\(/gi,
  groupBy: /\bGROUP\s+BY\b/gi,
  having: /\bHAVING\b/gi,

  // Estimation indicators
  sample: /\bTABLESAMPLE\b|\bSAMPLE\b/gi,
  limit: /\bLIMIT\s+\d+/gi,
  approximate: /\bAPPROX_|APPROX\b/gi,

  // Window functions (calculated)
  window: /\bOVER\s*\(/gi,

  // Subqueries (calculated)
  subquery: /\(\s*SELECT\b/gi,

  // CTE (calculated)
  cte: /\bWITH\s+\w+\s+AS\s*\(/gi,

  // Set operations (calculated)
  union: /\bUNION\b/gi,
  intersect: /\bINTERSECT\b/gi,
  except: /\bEXCEPT\b/gi,

  // Prediction/ML indicators
  predict: /\bPREDICT\b|\bML\.|_MODEL\b/gi,
} as const;

/**
 * Count pattern matches in SQL
 */
function countMatches(sql: string, pattern: RegExp): number {
  const matches = sql.match(pattern);
  return matches ? matches.length : 0;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculate confidence level and score based on query complexity
 *
 * Confidence Heuristics:
 * - Direct SELECT from single table = exact (95-100)
 * - JOINs = calculated (80-94)
 * - Aggregations with GROUP BY = calculated (75-89)
 * - SAMPLE or LIMIT with extrapolation = estimated (50-74)
 * - ML predictions = predicted (30-49)
 */
export function calculateConfidence(
  query: string,
  sources: string[]
): ConfidenceResult {
  const sql = query.toUpperCase();

  // Check for ML/prediction patterns first (lowest confidence)
  if (countMatches(sql, SQL_PATTERNS.predict) > 0) {
    return { level: "predicted", score: 40 };
  }

  // Check for sampling/approximation (estimated)
  const hasSample = countMatches(sql, SQL_PATTERNS.sample) > 0;
  const hasApprox = countMatches(sql, SQL_PATTERNS.approximate) > 0;
  if (hasSample || hasApprox) {
    const score = hasSample && hasApprox ? 55 : 65;
    return { level: "estimated", score };
  }

  // Count complexity factors
  const joinCount =
    countMatches(sql, SQL_PATTERNS.join) +
    countMatches(sql, SQL_PATTERNS.leftJoin) +
    countMatches(sql, SQL_PATTERNS.rightJoin) +
    countMatches(sql, SQL_PATTERNS.fullJoin) +
    countMatches(sql, SQL_PATTERNS.crossJoin);

  const hasAggregations = countMatches(sql, SQL_PATTERNS.aggregations) > 0;
  const hasGroupBy = countMatches(sql, SQL_PATTERNS.groupBy) > 0;
  const hasHaving = countMatches(sql, SQL_PATTERNS.having) > 0;
  const hasWindow = countMatches(sql, SQL_PATTERNS.window) > 0;
  const hasSubquery = countMatches(sql, SQL_PATTERNS.subquery) > 0;
  const hasCTE = countMatches(sql, SQL_PATTERNS.cte) > 0;
  const hasSetOps =
    countMatches(sql, SQL_PATTERNS.union) > 0 ||
    countMatches(sql, SQL_PATTERNS.intersect) > 0 ||
    countMatches(sql, SQL_PATTERNS.except) > 0;

  // Calculate base score starting from 100
  let score = 100;

  // Deduct for complexity factors
  score -= joinCount * 3; // Each join reduces by 3
  if (hasAggregations) score -= 5;
  if (hasGroupBy) score -= 5;
  if (hasHaving) score -= 3;
  if (hasWindow) score -= 5;
  if (hasSubquery) score -= 7;
  if (hasCTE) score -= 3;
  if (hasSetOps) score -= 5;

  // Multiple sources reduce confidence
  if (sources.length > 1) {
    score -= (sources.length - 1) * 2;
  }

  // Ensure score stays in valid range
  score = Math.max(30, Math.min(100, score));

  // Determine level based on score and patterns
  let level: ConfidenceLevel;

  if (score >= 95 && joinCount === 0 && !hasAggregations && !hasGroupBy) {
    level = "exact";
  } else if (score >= 75) {
    level = "calculated";
  } else if (score >= 50) {
    level = "estimated";
  } else {
    level = "predicted";
  }

  return { level, score };
}

/**
 * Format a date as a human-readable freshness string
 * Examples: "As of Dec 31, 2:30 PM", "As of Jan 1, 9:15 AM"
 */
export function formatFreshness(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours || 12; // Handle midnight (0 -> 12)

  const minutesStr = minutes.toString().padStart(2, "0");

  return `As of ${month} ${day}, ${hours}:${minutesStr} ${ampm}`;
}

/**
 * Truncate a SQL query for display
 * @param query - The SQL query to truncate
 * @param maxLength - Maximum length (default: 100)
 */
export function truncateQuery(query: string, maxLength: number = 100): string {
  // Normalize whitespace
  const normalized = query.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.substring(0, maxLength - 3) + "...";
}

/**
 * Extract table names from SQL query
 * Returns qualified names like "schema.table" when available
 */
export function extractTablesFromQuery(query: string): string[] {
  const tables = new Set<string>();

  // Match FROM and JOIN clauses
  // Pattern handles: FROM table, FROM schema.table, JOIN table, etc.
  const fromJoinPattern =
    /(?:FROM|JOIN)\s+(?:"?(\w+)"?\.)?(?:"?(\w+)"?)(?:\s+(?:AS\s+)?(?:"?\w+"?))?/gi;

  let match;
  while ((match = fromJoinPattern.exec(query)) !== null) {
    const schema = match[1];
    const table = match[2];

    if (table && !isReservedWord(table)) {
      const qualifiedName = schema ? `${schema}.${table}` : table;
      tables.add(qualifiedName);
    }
  }

  return Array.from(tables);
}

/**
 * Check if a word is a SQL reserved word (not a table name)
 */
function isReservedWord(word: string): boolean {
  const reserved = new Set([
    "SELECT",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "NOT",
    "IN",
    "IS",
    "NULL",
    "TRUE",
    "FALSE",
    "AS",
    "ON",
    "USING",
    "NATURAL",
    "INNER",
    "OUTER",
    "LEFT",
    "RIGHT",
    "FULL",
    "CROSS",
    "JOIN",
    "GROUP",
    "BY",
    "HAVING",
    "ORDER",
    "ASC",
    "DESC",
    "LIMIT",
    "OFFSET",
    "UNION",
    "INTERSECT",
    "EXCEPT",
    "ALL",
    "DISTINCT",
    "WITH",
    "RECURSIVE",
  ]);
  return reserved.has(word.toUpperCase());
}

/**
 * Detect common assumptions based on query patterns
 */
export function detectAssumptions(query: string): string[] {
  const assumptions: string[] = [];
  const sql = query.toUpperCase();

  // Currency assumptions
  if (
    sql.includes("CURRENCY") ||
    sql.includes("USD") ||
    sql.includes("AMOUNT")
  ) {
    if (!sql.includes("CURRENCY =") && !sql.includes("CONVERT")) {
      assumptions.push("Assumes single currency (no conversion)");
    }
  }

  // Time zone assumptions
  if (sql.includes("TIMESTAMP") || sql.includes("DATE")) {
    if (!sql.includes("TIMEZONE") && !sql.includes("AT TIME ZONE")) {
      assumptions.push("Uses database timezone");
    }
  }

  // Null handling
  if (
    sql.includes("COALESCE") ||
    sql.includes("IFNULL") ||
    sql.includes("NVL")
  ) {
    assumptions.push("Null values replaced with defaults");
  }

  // Exclusions from WHERE clause
  if (sql.includes("STATUS") && sql.includes("!=")) {
    assumptions.push("Excludes certain status values");
  }

  if (sql.includes("REFUND") && sql.includes("NOT")) {
    assumptions.push("Excludes refunds");
  }

  if (sql.includes("TEST") && sql.includes("NOT")) {
    assumptions.push("Excludes test data");
  }

  // Sampling
  if (sql.includes("SAMPLE") || sql.includes("TABLESAMPLE")) {
    assumptions.push("Based on sampled data");
  }

  // Limit without full data
  if (sql.includes("LIMIT") && sql.includes("ORDER BY")) {
    assumptions.push("Top N results only");
  }

  return assumptions;
}

/**
 * Generate complete provenance metadata for a query result
 *
 * @param query - The executed SQL query
 * @param tables - Table names used (can be provided or auto-extracted)
 * @param executedAt - When the query was executed
 * @param customAssumptions - Additional assumptions to include
 */
export function generateProvenance(
  query: string,
  tables: string[],
  executedAt: Date,
  customAssumptions?: string[]
): Provenance {
  // Extract tables if not provided
  const sourceTables =
    tables.length > 0 ? tables : extractTablesFromQuery(query);

  // Build sources with truncated query preview
  const sources: ProvenanceSource[] = sourceTables.map((table) => ({
    name: table,
    query: truncateQuery(query, 80),
  }));

  // If no tables found, add a generic source
  if (sources.length === 0) {
    sources.push({
      name: "Query result",
      query: truncateQuery(query, 80),
    });
  }

  // Calculate confidence
  const confidence = calculateConfidence(query, sourceTables);

  // Detect and merge assumptions
  const detectedAssumptions = detectAssumptions(query);
  const allAssumptions = customAssumptions
    ? [...new Set([...detectedAssumptions, ...customAssumptions])]
    : detectedAssumptions;

  return {
    freshness: formatFreshness(executedAt),
    sources,
    assumptions: allAssumptions.length > 0 ? allAssumptions : undefined,
    confidenceLevel: confidence.level,
    confidenceScore: confidence.score,
    executedAt: executedAt.toISOString(),
  };
}

// =============================================================================
// Helper Functions for UI Display
// =============================================================================

/**
 * Get a human-readable description of confidence level
 */
export function getConfidenceLevelDescription(level: ConfidenceLevel): string {
  switch (level) {
    case "exact":
      return "Exact value from source data";
    case "calculated":
      return "Calculated from source data";
    case "estimated":
      return "Estimated based on samples";
    case "predicted":
      return "Predicted using statistical models";
  }
}

/**
 * Get confidence level color for UI display
 */
export function getConfidenceLevelColor(level: ConfidenceLevel): string {
  switch (level) {
    case "exact":
      return "#22c55e"; // green-500
    case "calculated":
      return "#3b82f6"; // blue-500
    case "estimated":
      return "#f59e0b"; // amber-500
    case "predicted":
      return "#ef4444"; // red-500
  }
}

/**
 * Format confidence score for display (e.g., "95%")
 */
export function formatConfidenceScore(score: number): string {
  return `${Math.round(score)}%`;
}

export default {
  calculateConfidence,
  generateProvenance,
  formatFreshness,
  truncateQuery,
  extractTablesFromQuery,
  detectAssumptions,
  getConfidenceLevelDescription,
  getConfidenceLevelColor,
  formatConfidenceScore,
};
