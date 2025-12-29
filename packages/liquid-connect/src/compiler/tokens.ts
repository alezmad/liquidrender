// LiquidConnect Compiler - Token Types
// Defines all tokens recognized by the scanner

import type { Position } from '../types';

/**
 * Token types for LiquidConnect lexer
 */
export type TokenType =
  // Query markers
  | 'QUERY'           // Q

  // Sigils
  | 'METRIC'          // @
  | 'DIMENSION'       // #
  | 'ENTITY'          // .
  | 'FILTER'          // ?
  | 'TIME'            // ~
  | 'SORT_ASC'        // +
  | 'SORT_DESC'       // -

  // Keywords
  | 'TOP'             // top:
  | 'VS'              // vs
  | 'EXPLAIN'         // !explain

  // Enterprise features (v7)
  | 'SCOPE_PIN'       // Q@scope (scope disambiguation)
  | 'TIME_OVERRIDE'   // @t:field (time override)
  | 'PARAMETER'       // $paramName

  // Identifiers and literals
  | 'IDENTIFIER'      // metric_name, entity_name, etc.
  | 'STRING'          // "quoted string"
  | 'NUMBER'          // 123, 45.67
  | 'BOOLEAN'         // true, false

  // Filter operators
  | 'EQUALS'          // =
  | 'NOT_EQUALS'      // !=
  | 'GREATER'         // >
  | 'GREATER_EQ'      // >=
  | 'LESS'            // <
  | 'LESS_EQ'         // <=
  | 'CONTAINS'        // ~~
  | 'IN'              // :[]
  | 'NOT_IN'          // !:[]
  | 'RANGE'           // :[..]
  | 'NULL_CHECK'      // :field! or :field?

  // Boolean operators
  | 'AND'             // &
  | 'OR'              // |
  | 'NOT'             // !

  // Delimiters
  | 'COLON'           // :
  | 'LPAREN'          // (
  | 'RPAREN'          // )
  | 'LBRACKET'        // [
  | 'RBRACKET'        // ]
  | 'COMMA'           // ,
  | 'DOT_DOT'         // ..

  // Time expressions
  | 'DURATION'        // P30d, P6M, 30d, 6M (v7: P optional)
  | 'PERIOD'          // Q-1, M-3, Y, D, W, M, Q
  | 'DATE'            // 2024-01-15
  | 'YEAR_QUARTER'    // 2024-Q3
  | 'YEAR_MONTH'      // 2024-06
  | 'TIME_ALIAS'      // today, yesterday, this_month, last_quarter, YTD, MTD, QTD

  // Special
  | 'WHITESPACE'      // spaces, tabs (usually skipped)
  | 'NEWLINE'         // \n
  | 'COMMENT'         // // comment
  | 'EOF';            // end of input

/**
 * Token with type, value, and position
 */
export interface Token {
  type: TokenType;
  value: string;
  position: Position;
}

/**
 * Check if token is a sigil
 */
export function isSigil(type: TokenType): boolean {
  return ['METRIC', 'DIMENSION', 'ENTITY', 'FILTER', 'TIME', 'SORT_ASC', 'SORT_DESC'].includes(type);
}

/**
 * Check if token is a filter operator
 */
export function isFilterOperator(type: TokenType): boolean {
  return [
    'EQUALS', 'NOT_EQUALS', 'GREATER', 'GREATER_EQ',
    'LESS', 'LESS_EQ', 'CONTAINS', 'IN', 'NOT_IN', 'RANGE', 'NULL_CHECK'
  ].includes(type);
}

/**
 * Check if token is a boolean operator
 */
export function isBooleanOperator(type: TokenType): boolean {
  return ['AND', 'OR', 'NOT'].includes(type);
}

/**
 * Check if token is a time expression
 */
export function isTimeToken(type: TokenType): boolean {
  return ['DURATION', 'PERIOD', 'DATE', 'YEAR_QUARTER', 'YEAR_MONTH', 'TIME_ALIAS'].includes(type);
}

/**
 * v7 Time aliases mapping
 */
export const TIME_ALIASES: Record<string, { period: string; offset?: number }> = {
  // Day aliases
  'today': { period: 'D', offset: 0 },
  'yesterday': { period: 'D', offset: -1 },

  // Week aliases
  'this_week': { period: 'W', offset: 0 },
  'last_week': { period: 'W', offset: -1 },

  // Month aliases
  'this_month': { period: 'M', offset: 0 },
  'last_month': { period: 'M', offset: -1 },

  // Quarter aliases
  'this_quarter': { period: 'Q', offset: 0 },
  'last_quarter': { period: 'Q', offset: -1 },

  // Year aliases
  'this_year': { period: 'Y', offset: 0 },
  'last_year': { period: 'Y', offset: -1 },

  // To-date aliases (ranges)
  'YTD': { period: 'YTD' },
  'MTD': { period: 'MTD' },
  'QTD': { period: 'QTD' },
};

/**
 * Check if identifier is a time alias
 */
export function isTimeAlias(value: string): boolean {
  return value in TIME_ALIASES;
}
