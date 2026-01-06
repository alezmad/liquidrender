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
 * DSL operators - token-efficient syntax for LLM generation
 * These are what LLMs write in LiquidConnect queries
 */
export type DslOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | '~'       // contains (maps to LIKE with wildcards)
  | '!~'      // not contains
  | 'in'      // in list
  | '!in'     // not in list
  | 'null'    // is null
  | '!null'   // is not null
  | 'range';  // between

/**
 * SQL operators - what the emitter uses to generate SQL
 * Resolver maps DslOperator → SqlOperator
 */
export type SqlOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN';

/**
 * Filter operators - alias for backwards compatibility
 * @deprecated Use DslOperator for parser/AST, SqlOperator for emitter
 */
export type FilterOperator = SqlOperator;

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
