/**
 * Universal Vocabulary Builder - Data Models
 *
 * Types for schema extraction, hard rules detection, and user confirmation flow.
 */

// =============================================================================
// Schema Types (extracted from database)
// =============================================================================

export interface Column {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull: boolean;
  charMaxLength?: number;
  numericPrecision?: number;
  numericScale?: number;
  references?: ForeignKeyReference;
}

export interface ForeignKeyReference {
  table: string;
  column: string;
}

export interface Table {
  name: string;
  schema: string;
  columns: Column[];
  primaryKeyColumns: string[];
  foreignKeys: ForeignKeyConstraint[];
}

export interface ForeignKeyConstraint {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface ExtractedSchema {
  database: string;
  type: DatabaseType;
  schema: string;
  tables: Table[];
  extractedAt: string;
}

export type DatabaseType = "postgres" | "mysql" | "sqlite" | "duckdb";

// =============================================================================
// Data Profiling Types (actual data analysis)
// =============================================================================

/**
 * ProfiledSchema extends ExtractedSchema with actual data profiling
 * Goes beyond structure to understand data quality, freshness, and business context
 */
export interface ProfiledSchema extends ExtractedSchema {
  // Profiling data
  tableProfiles: Record<string, TableProfile>;
  columnProfiles: Record<string, Record<string, ColumnProfile>>;

  // Profiling metadata
  profiledAt: string;
  profilingDuration: number;
  samplingStrategy: "full" | "adaptive" | "statistics-only";
}

/**
 * TableProfile - comprehensive profiling data for a table
 * Three-tier approach: statistics (instant), sampling (fast), detailed (selective)
 */
export interface TableProfile {
  tableName: string;

  // Tier 1: Database Statistics (always available)
  rowCountEstimate: number; // From pg_class.reltuples
  tableSizeBytes: number; // From pg_class.relpages
  lastVacuum?: Date; // From pg_stat_user_tables
  lastAnalyze?: Date;

  // Tier 2: Sample-based (computed if >0 rows)
  rowCountExact?: number; // Exact count (if sampled or small)
  samplingRate: number; // 1.0 = full scan, 0.01 = 1% sample

  // Data freshness
  latestDataAt?: Date; // MAX of all timestamp columns
  earliestDataAt?: Date; // MIN of all timestamp columns
  dataSpanDays?: number; // Range in days

  // Data quality
  emptyColumnCount: number; // Columns with 100% NULL
  sparseColumnCount: number; // Columns with >50% NULL

  // Tier 3: Detailed (selective)
  updateFrequency?: {
    // Detected from timestamp patterns
    pattern: "realtime" | "hourly" | "daily" | "batch" | "stale";
    confidence: number;
  };
}

/**
 * ColumnProfile - profiling data for a single column
 */
export interface ColumnProfile {
  columnName: string;
  dataType: string;

  // Tier 1: From pg_stats (if available)
  distinctCountEstimate?: number; // n_distinct from pg_stats
  nullFraction?: number; // null_frac from pg_stats
  avgWidth?: number; // avg_width from pg_stats

  // Tier 2: Sample-based
  nullCount: number;
  nullPercentage: number;

  // Type-specific profiling
  numeric?: NumericProfile;
  temporal?: TemporalProfile;
  categorical?: CategoricalProfile;
  text?: TextProfile;
}

/**
 * NumericProfile - statistical profiling for numeric columns
 */
export interface NumericProfile {
  min: number;
  max: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  percentiles?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  zeroCount?: number;
  negativeCount?: number;
  distinctCount?: number; // V2: For cardinality-based metric detection
}

/**
 * TemporalProfile - profiling for date/timestamp columns
 */
export interface TemporalProfile {
  min: Date;
  max: Date;
  spanDays: number;

  // Granularity detection
  hasTime: boolean; // vs date-only
  uniqueDates: number; // Cardinality at date level

  // V2: Data freshness
  daysSinceLatest?: number; // Days since max date (for stale detection)

  // Patterns
  gaps?: Array<{
    // Detected missing date ranges
    start: Date;
    end: Date;
    days: number;
  }>;
}

/**
 * CategoricalProfile - profiling for low-cardinality columns
 */
export interface CategoricalProfile {
  cardinality: number; // Unique values (alias for distinctCount)
  distinctCount?: number; // V2: Consistent naming with NumericProfile

  topValues: Array<{
    // Most common values
    value: unknown;
    count: number;
    percentage: number;
  }>;

  // Flags
  isHighCardinality: boolean; // >1000 unique values
  isLowCardinality: boolean; // <20 unique values
  possiblyUnique: boolean; // cardinality ~= row count
}

/**
 * TextProfile - profiling for text/varchar columns
 */
export interface TextProfile {
  minLength: number;
  maxLength: number;
  avgLength: number;

  patterns?: {
    // Pattern detection
    email: number; // Count of email-like values
    url: number;
    phone: number;
    uuid: number;
    json: number;
  };

  topValues?: Array<{
    // Sample values
    value: string;
    count: number;
  }>;
}

/**
 * ProfileOptions - configuration for profiling operations
 */
export interface ProfileOptions {
  // Sampling
  maxSampleRows?: number; // Default: 100,000
  minSampleRate?: number; // Default: 0.01 (1%)

  // Tiers
  enableTier1?: boolean; // Default: true (statistics)
  enableTier2?: boolean; // Default: true (sampling)
  enableTier3?: boolean; // Default: false (detailed)

  // Concurrency
  maxConcurrentTables?: number; // Default: 5

  // Selective profiling
  includePatterns?: string[]; // Only profile tables matching regex
  excludePatterns?: string[]; // Skip tables matching regex

  // Performance limits
  timeoutPerTable?: number; // Default: 30000ms
  totalTimeout?: number; // Default: 300000ms (5 min)
}

/**
 * ProfileResult - result of profiling operation
 */
export interface ProfileResult {
  schema: ProfiledSchema;
  stats: {
    tablesProfiled: number;
    tablesSkipped: number;
    totalDuration: number;
    tier1Duration: number;
    tier2Duration: number;
    tier3Duration: number;
  };
  warnings: Array<{
    table: string;
    message: string;
  }>;
}

/**
 * ProfilingData - profiling data extracted from ProfiledSchema
 * Passed to applyHardRules() for enhanced vocabulary detection
 */
export interface ProfilingData {
  // Table-level profiling
  tableProfiles: Record<string, TableProfile>;

  // Column-level profiling (indexed by table.column)
  columnProfiles: Record<string, ColumnProfile>;

  // Profiling metadata
  profiledAt: string;
  samplingStrategy: "full" | "adaptive" | "statistics-only";
}

/**
 * Extract profiling data from ProfiledSchema for applyHardRules()
 */
export function extractProfilingData(profiledSchema: ProfiledSchema): ProfilingData {
  const columnProfiles: Record<string, ColumnProfile> = {};

  // Flatten column profiles to tableName.columnName keys
  for (const [tableName, columns] of Object.entries(profiledSchema.columnProfiles)) {
    for (const [columnName, profile] of Object.entries(columns)) {
      const key = `${tableName}.${columnName}`;
      columnProfiles[key] = profile;
    }
  }

  return {
    tableProfiles: profiledSchema.tableProfiles,
    columnProfiles,
    profiledAt: profiledSchema.profiledAt,
    samplingStrategy: profiledSchema.samplingStrategy,
  };
}

// =============================================================================
// Detection Types (output of hard rules)
// =============================================================================

export interface DetectedEntity {
  name: string;
  table: string;
  schema: string;
  primaryKey: string | string[];
  columnCount: number;
  certainty: number;
  isJunction: boolean;
}

export interface DetectedMetric {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  aggregation: AggregationType;
  certainty: number;
  suggestedDisplayName?: string;
  expression?: string;
}

export type AggregationType = "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";

// Note: This type is also exported from the main index to avoid conflicts
// with the resolver's AggregationType. Use UVB-specific imports when needed.

export interface DetectedDimension {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  cardinality?: number;
  certainty: number;
  // V2: Profiling-enhanced fields
  type?: "categorical" | "free-text" | "enum";
}

export interface DetectedTimeField {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  isPrimaryCandidate: boolean;
  certainty: number;
  // V2: Profiling-enhanced fields
  isStale?: boolean;
  daysSinceLatest?: number;
}

export interface DetectedFilter {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  certainty: number;
  expression?: string;
}

export interface DetectedRelationship {
  id: string;
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  type: RelationshipType;
  via?: string;
  certainty: number;
}

export type RelationshipType = "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";

export interface DetectedRequiredField {
  id: string;
  table: string;
  column: string;
  nullPercentage: number;
  certainty: number;
  suggestedDisplayName: string;
}

export interface DetectedEnumField {
  id: string;
  table: string;
  column: string;
  dataType: string;
  distinctCount: number;
  topValues: Array<{ value: string; count: number; percentage: number }>;
  certainty: number;
  suggestedDisplayName: string;
}

export interface DetectedVocabulary {
  entities: DetectedEntity[];
  metrics: DetectedMetric[];
  dimensions: DetectedDimension[];
  timeFields: DetectedTimeField[];
  filters: DetectedFilter[];
  relationships: DetectedRelationship[];
  // V2: Profiling-enhanced detections
  requiredFields?: DetectedRequiredField[];
  enumFields?: DetectedEnumField[];
}

// =============================================================================
// Confirmation Types (questions for user)
// =============================================================================

export interface SelectOneConfirmation {
  id: string;
  type: "select_one";
  question: string;
  context?: string;
  options: SelectOption[];
  defaultValue?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  recommended?: boolean;
}

export interface RenameConfirmation {
  id: string;
  type: "rename";
  question: string;
  context?: string;
  currentValue: string;
  suggestion?: string;
}

export interface ClassifyConfirmation {
  id: string;
  type: "classify";
  question: string;
  context?: string;
  options: ClassifyOption[];
}

export interface ClassifyOption {
  value: "metric" | "dimension" | "skip";
  label: string;
}

export type Confirmation = SelectOneConfirmation | RenameConfirmation | ClassifyConfirmation;

export interface ConfirmationAnswers {
  [confirmationId: string]: string | string[];
}

// =============================================================================
// Vocabulary Draft (complete output)
// =============================================================================

export interface SchemaInfo {
  database: string;
  type: DatabaseType;
  schema: string;
  tables: number;
  extractedAt: string;
}

export interface VocabularyDraft {
  schema: SchemaInfo;
  detected: DetectedVocabulary;
  confirmations: Confirmation[];
}

// =============================================================================
// Extraction Options
// =============================================================================

export interface ExtractionOptions {
  schema?: string;
  excludeTables?: string[];
  includeTables?: string[];
  excludePatterns?: RegExp[];
}

// =============================================================================
// Hard Rules Configuration
// =============================================================================

export interface HardRulesConfig {
  // Metric detection patterns
  metricNamePatterns: RegExp[];
  metricTypes: string[];
  countMetricTypes: string[];

  // Dimension detection
  dimensionMaxLength: number;
  dimensionNamePatterns: RegExp[];
  dimensionExcludePatterns: RegExp[];

  // Time field detection
  timeTypes: string[];
  timeAuditPatterns: RegExp[];
  primaryTimePatterns: RegExp[];

  // Filter detection
  filterTypes: string[];
  filterNamePatterns: RegExp[];
}

export const DEFAULT_HARD_RULES_CONFIG: HardRulesConfig = {
  // Metric name patterns (English + Spanish)
  metricNamePatterns: [
    /amount/i,
    /price/i,
    /total/i,
    /cost/i,
    /rate/i,
    /fee/i,
    /quantity/i,
    /qty/i,
    /count/i,
    /sum/i,
    /revenue/i,
    /sales/i,
    /balance/i,
    /discount/i,
    /hours/i,
    /horas/i,
    /importe/i,
    /valor/i,
    /saldo/i,
    /coste/i,
    /precio/i,
    /tarifa/i,
    /freight/i,
    /units/i,
  ],

  // Types that indicate metrics
  metricTypes: ["decimal", "numeric", "real", "double", "float", "money"],
  countMetricTypes: ["integer", "int", "smallint", "bigint", "int4", "int8"],

  // Dimension configuration
  dimensionMaxLength: 100,
  dimensionNamePatterns: [
    /name/i,
    /nombre/i,
    /tipo/i,
    /type/i,
    /status/i,
    /estado/i,
    /category/i,
    /categoria/i,
    /code/i,
    /codigo/i,
    /title/i,
    /titulo/i,
    /region/i,
    /country/i,
    /city/i,
    /segment/i,
    /tier/i,
    /level/i,
    /class/i,
    /group/i,
    /kind/i,
    /mode/i,
  ],
  dimensionExcludePatterns: [
    /desc/i,
    /note/i,
    /comment/i,
    /observ/i,
    /content/i,
    /body/i,
    /html/i,
    /json/i,
    /path/i,
    /url/i,
    /email/i,
    /phone/i,
    /address/i,
    /direccion/i,
  ],

  // Time field configuration
  timeTypes: ["date", "timestamp", "timestamptz", "datetime", "time"],
  timeAuditPatterns: [
    /created/i,
    /updated/i,
    /modified/i,
    /last_update/i,
    /fecha_creacion/i,
    /fecha_modificacion/i,
    /date_joined/i,
    /_at$/i,
  ],
  primaryTimePatterns: [
    /^date$/i,
    /^fecha$/i,
    /order_date/i,
    /fecha_operacion/i,
    /transaction_date/i,
    /invoice_date/i,
    /ship_date/i,
    /fecha_factura/i,
  ],

  // Filter configuration
  filterTypes: ["boolean", "bool"],
  filterNamePatterns: [/^is_/i, /^has_/i, /^can_/i, /activo/i, /active/i, /enabled/i, /visible/i, /deleted/i, /archived/i],
};
