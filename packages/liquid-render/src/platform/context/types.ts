// LiquidConnect Context Types
// ============================================================================
// Core type definitions for the enterprise data context system
// ============================================================================

/**
 * Supported data source types
 */
export type SourceType =
  | 'postgres'
  | 'mysql'
  | 'sqlite'
  | 'mssql'
  | 'mongodb'
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'rest'
  | 'graphql';

/**
 * Connection status for a data source
 */
export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'syncing';

/**
 * Data source registration
 */
export interface DataSource {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of data source */
  type: SourceType;
  /** Connection string or configuration (encrypted at rest) */
  connection: string;
  /** Current status */
  status: ConnectionStatus;
  /** Last successful sync */
  lastSync?: Date;
  /** Error message if status is 'error' */
  error?: string;
  /** Metadata about the source */
  meta?: Record<string, unknown>;
}

/**
 * Asset types within a data source
 */
export type AssetType =
  | 'table'
  | 'view'
  | 'sheet'      // For XLSX
  | 'endpoint'   // For REST/GraphQL
  | 'collection' // For MongoDB
  | 'file';      // For CSV/JSON

/**
 * A data asset (table, sheet, endpoint, etc.)
 */
export interface DataAsset {
  /** Unique identifier */
  id: string;
  /** Parent source ID */
  sourceId: string;
  /** Asset name */
  name: string;
  /** Full path (e.g., "postgres:mydb/public/orders") */
  path: string;
  /** Type of asset */
  type: AssetType;
  /** Approximate row count */
  rowCount?: number;
  /** Schema hash for change detection */
  schemaHash?: string;
  /** Human-readable description (can be AI-generated) */
  description?: string;
  /** Last introspection time */
  introspectedAt?: Date;
}

/**
 * Column role classification
 * Determines how the column should be used in visualizations
 */
export type ColumnRole =
  | 'identifier'    // Primary key, unique IDs
  | 'foreign_key'   // References another table
  | 'metric'        // Numeric value to aggregate (SUM, AVG, etc.)
  | 'dimension'     // Categorical value to group by
  | 'temporal'      // Date/time for time series
  | 'text'          // Free-form text (descriptions, notes)
  | 'contact'       // Email, phone, address
  | 'geospatial'    // Latitude, longitude, coordinates
  | 'boolean'       // True/false flags
  | 'json'          // Nested JSON data
  | 'unknown';      // Could not classify

/**
 * Column statistics for profiling
 */
export interface ColumnStats {
  /** Number of distinct values */
  distinctCount: number;
  /** Percentage of null values (0-1) */
  nullRate: number;
  /** For numeric: minimum value */
  min?: number;
  /** For numeric: maximum value */
  max?: number;
  /** For numeric: mean value */
  mean?: number;
  /** For numeric: median value */
  median?: number;
  /** For text: average length */
  avgLength?: number;
  /** For temporal: earliest date */
  minDate?: string;
  /** For temporal: latest date */
  maxDate?: string;
  /** Top N most frequent values */
  topValues?: Array<{ value: unknown; count: number }>;
}

/**
 * A column within a data asset
 */
export interface DataColumn {
  /** Unique identifier */
  id: string;
  /** Parent asset ID */
  assetId: string;
  /** Column name */
  name: string;
  /** Database/source data type */
  sourceType: string;
  /** Normalized data type */
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'binary';
  /** Inferred role */
  role: ColumnRole;
  /** Confidence in role classification (0-1) */
  roleConfidence: number;
  /** Is this column nullable? */
  nullable: boolean;
  /** Is this a primary key? */
  isPrimaryKey: boolean;
  /** Reference to another column (for foreign keys) */
  references?: {
    assetId: string;
    columnId: string;
  };
  /** Column statistics */
  stats?: ColumnStats;
  /** Sample values */
  samples: unknown[];
  /** Human-readable description */
  description?: string;
  /** Unit of measurement (for metrics) */
  unit?: string;
  /** Display format hint */
  format?: string;
}

/**
 * Relationship type between assets
 */
export type RelationshipType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many';

/**
 * How the relationship was discovered
 */
export type RelationshipSource =
  | 'foreign_key'      // Explicit FK constraint
  | 'inferred_name'    // Column name pattern (e.g., customer_id → customers.id)
  | 'inferred_value'   // Value matching analysis
  | 'manual';          // User-defined

/**
 * A relationship between two columns
 */
export interface Relationship {
  /** Unique identifier */
  id: string;
  /** Source column ID */
  fromColumnId: string;
  /** Target column ID */
  toColumnId: string;
  /** Type of relationship */
  type: RelationshipType;
  /** How it was discovered */
  source: RelationshipSource;
  /** Confidence in the relationship (0-1) */
  confidence: number;
  /** Optional join condition for complex relationships */
  joinCondition?: string;
}

// ============================================================================
// Semantic Layer Types
// ============================================================================

/**
 * A semantic metric definition
 * Maps business terms to calculations
 */
export interface Metric {
  /** Unique identifier */
  id: string;
  /** Business term (e.g., "revenue", "conversion rate") */
  name: string;
  /** Alternative names/aliases */
  aliases: string[];
  /** SQL or calculation expression */
  expression: string;
  /** Referenced column IDs */
  columnIds: string[];
  /** Unit of measurement */
  unit?: 'currency' | 'percent' | 'count' | 'duration' | string;
  /** Aggregation type */
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count' | 'custom';
  /** Description for LLM */
  description: string;
  /** Suggested visualization component */
  suggestedComponent?: string;
}

/**
 * A semantic dimension definition
 * Categorical attributes for grouping/filtering
 */
export interface Dimension {
  /** Unique identifier */
  id: string;
  /** Business term */
  name: string;
  /** Alternative names/aliases */
  aliases: string[];
  /** Referenced column ID */
  columnId: string;
  /** Type of dimension */
  type: 'categorical' | 'temporal' | 'hierarchical' | 'geographic';
  /** For temporal: supported granularities */
  granularities?: Array<'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'>;
  /** For hierarchical: parent-child relationships */
  hierarchy?: string[];
  /** Known/expected values */
  values?: string[];
  /** Description for LLM */
  description: string;
}

/**
 * Business vocabulary term
 * Maps user language to technical terms
 */
export interface VocabularyTerm {
  /** The term users might say */
  term: string;
  /** What it maps to (metric ID, dimension ID, or expression) */
  maps_to: string;
  /** Type of mapping */
  type: 'metric' | 'dimension' | 'filter' | 'expression';
  /** Example usage */
  examples?: string[];
}

/**
 * Common query pattern
 * Pre-defined templates for frequent questions
 */
export interface QueryPattern {
  /** Pattern name */
  name: string;
  /** Example natural language queries */
  examples: string[];
  /** Required metric IDs */
  metrics: string[];
  /** Required dimension IDs */
  dimensions: string[];
  /** Filters to apply */
  filters?: Array<{
    dimension: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
    value: unknown;
  }>;
  /** Suggested visualization */
  visualization: string;
  /** DSL template */
  dslTemplate?: string;
}

// ============================================================================
// Complete Context
// ============================================================================

/**
 * Complete LiquidConnect context
 * This is the full data model that powers LLM understanding
 */
export interface LiquidContext {
  /** Schema version */
  version: number;
  /** Context ID */
  id: string;
  /** When this context was generated */
  generatedAt: Date;

  // Data Manifest
  sources: DataSource[];
  assets: DataAsset[];
  columns: DataColumn[];
  relationships: Relationship[];

  // Semantic Layer
  metrics: Metric[];
  dimensions: Dimension[];
  vocabulary: VocabularyTerm[];
  patterns: QueryPattern[];

  // Metadata
  meta?: {
    totalRows?: number;
    totalColumns?: number;
    introspectionDuration?: number;
  };
}

/**
 * Serializable context for LLM consumption
 * A condensed, token-efficient representation
 */
export interface LLMContext {
  /** Brief summary */
  summary: string;

  /** Available data bindings */
  bindings: Array<{
    id: string;
    name: string;
    description: string;
    type: 'metric' | 'dimension' | 'table' | 'timeseries';
    samples?: unknown[];
  }>;

  /** Known metrics */
  metrics: Array<{
    name: string;
    aliases: string[];
    expression: string;
    unit?: string;
  }>;

  /** Known dimensions */
  dimensions: Array<{
    name: string;
    type: string;
    values?: string[];
  }>;

  /** Joinable relationships */
  relationships: Array<{
    from: string;
    to: string;
    type: string;
  }>;

  /** Business vocabulary */
  vocabulary: Record<string, string>;

  /** Example queries */
  examples: Array<{
    query: string;
    dsl: string;
  }>;
}
