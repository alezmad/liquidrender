// Semantic Layer - Type Definitions
// YAML-based semantic model for LiquidConnect

import type { FilterOperator, AggregationType, FieldType } from '../types';

// =============================================================================
// SEMANTIC LAYER ROOT
// =============================================================================

/**
 * The complete semantic layer definition
 */
export interface SemanticLayer {
  /** Semantic layer version */
  version: string;

  /** Layer name */
  name: string;

  /** Optional description */
  description?: string;

  /** Data sources */
  sources: Record<string, SourceDefinition>;

  /** Entity definitions */
  entities: Record<string, EntityDefinition>;

  /** Metric definitions */
  metrics: Record<string, MetricDefinition>;

  /** Dimension definitions */
  dimensions: Record<string, DimensionDefinition>;

  /** Named filter definitions */
  filters?: Record<string, FilterDefinition>;

  /** Relationship definitions */
  relationships?: RelationshipDefinition[];
}

// =============================================================================
// DATA SOURCES
// =============================================================================

/**
 * Data source definition
 */
export interface SourceDefinition {
  /** Source type */
  type: 'table' | 'view' | 'subquery';

  /** Database/catalog name */
  database?: string;

  /** Schema name */
  schema?: string;

  /** Table or view name */
  table?: string;

  /** Subquery SQL (for type: 'subquery') */
  sql?: string;

  /** Source description */
  description?: string;

  /** Primary key columns */
  primaryKey?: string[];

  /** Freshness configuration */
  freshness?: FreshnessConfig;
}

/**
 * Data freshness configuration
 */
export interface FreshnessConfig {
  /** Freshness check field */
  field: string;

  /** Warning threshold */
  warnAfter: string;

  /** Error threshold */
  errorAfter: string;
}

// =============================================================================
// ENTITIES
// =============================================================================

/**
 * Entity definition (for entity listings)
 */
export interface EntityDefinition {
  /** Source reference */
  source: string;

  /** Entity description */
  description?: string;

  /** Display name */
  label?: string;

  /** Primary key field */
  primaryKey: string;

  /** Entity fields */
  fields: Record<string, FieldDefinition>;

  /** Default time field for this entity */
  defaultTimeField?: string;

  /** Entity-level filters */
  filters?: string[];
}

/**
 * Field definition
 */
export interface FieldDefinition {
  /** Column name in source */
  column: string;

  /** Data type */
  type: FieldType;

  /** Field description */
  description?: string;

  /** Display label */
  label?: string;

  /** Whether this field is hidden from listings */
  hidden?: boolean;
}

// =============================================================================
// METRICS
// =============================================================================

/**
 * Metric definition
 */
export interface MetricDefinition {
  /** Metric type */
  type: 'simple' | 'derived' | 'cumulative';

  /** Aggregation function (for simple metrics) */
  aggregation?: AggregationType;

  /** SQL expression */
  expression: string;

  /** Source entity */
  entity: string;

  /** Time field for temporal constraints */
  timeField?: string;

  /** Metric description */
  description?: string;

  /** Display label */
  label?: string;

  /** Unit of measurement */
  unit?: string;

  /** Formatting hints */
  format?: MetricFormat;

  /** Dependencies (for derived metrics) */
  dependencies?: string[];

  /** Filter requirements */
  requiredFilters?: string[];
}

/**
 * Metric formatting hints
 */
export interface MetricFormat {
  /** Format type */
  type: 'number' | 'currency' | 'percent' | 'duration';

  /** Decimal places */
  decimals?: number;

  /** Currency code (for currency type) */
  currency?: string;

  /** Prefix */
  prefix?: string;

  /** Suffix */
  suffix?: string;
}

// =============================================================================
// DIMENSIONS
// =============================================================================

/**
 * Dimension definition
 */
export interface DimensionDefinition {
  /** Source entity */
  entity: string;

  /** SQL expression or column */
  expression: string;

  /** Data type */
  type: FieldType;

  /** Dimension description */
  description?: string;

  /** Display label */
  label?: string;

  /** Whether this is a time dimension */
  isTime?: boolean;

  /** Time granularity options (for time dimensions) */
  granularities?: TimeGranularity[];

  /** Cardinality hint */
  cardinality?: 'low' | 'medium' | 'high' | 'unique';
}

/**
 * Time granularity
 */
export type TimeGranularity =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

// =============================================================================
// FILTERS
// =============================================================================

/**
 * Named filter definition
 */
export interface FilterDefinition {
  /** Filter description */
  description?: string;

  /** Filter condition */
  condition: FilterCondition;
}

/**
 * Filter condition
 */
export interface FilterCondition {
  /** Field to filter on */
  field: string;

  /** Comparison operator */
  operator: FilterOperator;

  /** Filter value */
  value: unknown;

  /** Source entity for the field */
  entity?: string;
}

// =============================================================================
// RELATIONSHIPS
// =============================================================================

/**
 * Relationship between entities
 */
export interface RelationshipDefinition {
  /** Relationship name */
  name: string;

  /** Left entity */
  from: string;

  /** Right entity */
  to: string;

  /** Join type */
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';

  /** Join condition */
  join: JoinCondition;

  /** Relationship description */
  description?: string;
}

/**
 * Join condition
 */
export interface JoinCondition {
  /** Left field */
  leftField: string;

  /** Right field */
  rightField: string;

  /** SQL join type */
  joinType?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

// =============================================================================
// REGISTRY TYPES
// =============================================================================

/**
 * Resolved reference from the registry
 */
export interface ResolvedReference {
  /** Reference type */
  type: 'metric' | 'entity' | 'dimension' | 'filter';

  /** Reference name */
  name: string;

  /** Resolved definition */
  definition: MetricDefinition | EntityDefinition | DimensionDefinition | FilterDefinition;

  /** Source information */
  source: SourceDefinition;

  /** Source alias */
  sourceAlias: string;
}

/**
 * Resolution error
 */
export interface ResolutionError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Reference that failed to resolve */
  reference: string;

  /** Suggestions for fixing */
  suggestions?: string[];
}

/**
 * Resolution result
 */
export interface ResolutionResult<T> {
  /** Whether resolution succeeded */
  success: boolean;

  /** Resolved value (if successful) */
  value?: T;

  /** Error (if failed) */
  error?: ResolutionError;
}
