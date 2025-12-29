// LiquidFlow - Type Definitions
// The portable intermediate representation

import type {
  FilterOperator,
  BooleanOperator,
  SortDirection,
  QueryType,
  AggregationType,
  FieldType,
} from '../types';

/**
 * LiquidFlow - The Universal Analytical IR
 *
 * Backend-agnostic representation of a query that can be
 * emitted to any SQL dialect (DuckDB, Trino, PostgreSQL, etc.)
 */
export interface LiquidFlow {
  /** IR version for compatibility */
  version: string;

  /** Query type: metric aggregation or entity listing */
  type: QueryType;

  /** Metrics to compute (for metric queries) */
  metrics?: ResolvedMetric[];

  /** Entity to list (for entity queries) */
  entity?: ResolvedEntity;

  /** Dimensions for grouping */
  dimensions?: ResolvedDimension[];

  /** Filter predicates */
  filters?: ResolvedFilter[];

  /** Time constraint */
  time?: ResolvedTime;

  /** Result ordering */
  orderBy?: ResolvedOrderBy[];

  /** Result limit */
  limit?: number;

  /** Period comparison */
  compare?: ResolvedCompare;

  /** Resolved data sources */
  sources: ResolvedSource[];

  /** Required joins */
  joins: ResolvedJoin[];

  /** Query metadata */
  metadata?: FlowMetadata;

  /** v7: Explain mode - include query plan details */
  explain?: boolean;
}

// =============================================================================
// RESOLVED TYPES (after semantic resolution)
// =============================================================================

/**
 * Resolved metric with expression
 */
export interface ResolvedMetric {
  /** Reference name from semantic layer */
  ref: string;

  /** Display alias */
  alias: string;

  /** Aggregation function */
  aggregation: AggregationType;

  /** SQL expression to compute */
  expression: string;

  /** Source entity for this metric */
  sourceEntity: string;

  /** Time field for temporal constraints */
  timeField?: string;

  /** Whether this is a derived metric */
  derived: boolean;
}

/**
 * Resolved entity for listing
 */
export interface ResolvedEntity {
  /** Reference name from semantic layer */
  ref: string;

  /** Physical table name */
  table: string;

  /** Schema name */
  schema?: string;

  /** Fields to select */
  fields: ResolvedField[];
}

/**
 * Resolved field
 */
export interface ResolvedField {
  /** Field name */
  name: string;

  /** Display alias */
  alias: string;

  /** Physical column */
  column: string;

  /** Data type */
  type: FieldType;
}

/**
 * Resolved dimension for grouping
 */
export interface ResolvedDimension {
  /** Reference name from semantic layer */
  ref: string;

  /** Display alias */
  alias: string;

  /** SQL expression or column */
  expression: string;

  /** Source entity */
  sourceEntity: string;

  /** Data type */
  type: FieldType;
}

/**
 * Resolved filter predicate
 */
export interface ResolvedFilter {
  /** Filter type */
  type: 'predicate' | 'compound';

  /** For predicate filters */
  field?: string;
  operator?: FilterOperator;
  value?: unknown;

  /** For compound filters */
  booleanOp?: BooleanOperator;
  left?: ResolvedFilter;
  right?: ResolvedFilter;

  /** Original named filter (if any) */
  namedFilter?: string;
}

/**
 * Resolved time constraint
 */
export interface ResolvedTime {
  /** Field to apply time constraint */
  field: string;

  /** Start of time range (ISO date) */
  start: string;

  /** End of time range (ISO date) */
  end: string;

  /** Original time expression */
  expression: string;
}

/**
 * Resolved order by clause
 */
export interface ResolvedOrderBy {
  /** Expression to sort by */
  expression: string;

  /** Sort direction */
  direction: SortDirection;

  /** Whether this is a metric, dimension, or field */
  type: 'metric' | 'dimension' | 'field';
}

/**
 * Resolved comparison
 */
export interface ResolvedCompare {
  /** Base period start/end */
  basePeriod: {
    start: string;
    end: string;
  };

  /** Comparison period start/end */
  comparePeriod: {
    start: string;
    end: string;
  };

  /** Computed columns to add */
  computedColumns: string[];
}

/**
 * Resolved data source
 */
export interface ResolvedSource {
  /** Source alias */
  alias: string;

  /** Physical table/view */
  table: string;

  /** Schema */
  schema?: string;

  /** Database/catalog */
  database?: string;
}

/**
 * Resolved join
 */
export interface ResolvedJoin {
  /** Join type */
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

  /** Left table alias */
  leftAlias: string;

  /** Right table alias */
  rightAlias: string;

  /** Right table */
  rightTable: string;

  /** Join condition */
  on: string;
}

/**
 * Query metadata
 */
export interface FlowMetadata {
  /** Original query string */
  originalQuery?: string;

  /** Compilation timestamp */
  compiledAt: string;

  /** Compiler version */
  compilerVersion: string;

  /** Semantic layer version */
  semanticVersion?: string;

  /** Estimated complexity (for query planning) */
  complexity?: number;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation result for LiquidFlow
 */
export interface FlowValidation {
  valid: boolean;
  errors: FlowValidationError[];
  warnings: FlowValidationWarning[];
}

export interface FlowValidationError {
  path: string;
  message: string;
}

export interface FlowValidationWarning {
  path: string;
  message: string;
}
