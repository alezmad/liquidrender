// LiquidConnect - Shared Types
// Core type definitions used across all modules

/**
 * Source position for error reporting
 */
export interface Position {
  line: number;
  column: number;
  offset: number;
}

/**
 * Span of source code
 */
export interface Span {
  start: Position;
  end: Position;
}

/**
 * Field types supported in semantic layer
 */
export type FieldType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'json';

/**
 * Aggregation functions
 */
export type AggregationType =
  | 'SUM'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'AVG'
  | 'MIN'
  | 'MAX';

/**
 * Filter operators
 */
export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | '~~'      // contains
  | '!~~'     // not contains
  | 'in'
  | '!in'
  | 'range'
  | 'null'
  | '!null'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN';

/**
 * Boolean operators for filter composition
 */
export type BooleanOperator = 'AND' | 'OR' | 'NOT';

/**
 * Time period units
 */
export type TimeUnit = 'd' | 'w' | 'M' | 'Q' | 'Y';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Query type
 */
export type QueryType = 'metric' | 'entity';

/**
 * Generic result type
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };
