// LiquidConnect Compiler - AST Types
// Abstract Syntax Tree node definitions

import type { Span, FilterOperator, BooleanOperator, SortDirection, QueryType } from '../types';

/**
 * Base AST node interface
 */
export interface ASTNode {
  kind: string;
  span?: Span;
}

// =============================================================================
// QUERY NODES
// =============================================================================

/**
 * Root query node
 */
export interface QueryNode extends ASTNode {
  kind: 'Query';
  type: QueryType;
  metrics?: MetricNode[];
  entity?: EntityNode;
  dimensions?: DimensionNode[];
  filter?: FilterExprNode;
  time?: TimeNode;
  limit?: LimitNode;
  orderBy?: OrderByNode[];
  compare?: CompareNode;
}

/**
 * Metric reference: @revenue
 */
export interface MetricNode extends ASTNode {
  kind: 'Metric';
  name: string;
}

/**
 * Entity reference: .customers
 */
export interface EntityNode extends ASTNode {
  kind: 'Entity';
  name: string;
}

/**
 * Dimension reference: #region
 */
export interface DimensionNode extends ASTNode {
  kind: 'Dimension';
  name: string;
}

// =============================================================================
// FILTER NODES
// =============================================================================

/**
 * Filter expression (can be composite)
 */
export type FilterExprNode =
  | NamedFilterNode
  | ExplicitFilterNode
  | BinaryFilterNode
  | UnaryFilterNode
  | GroupedFilterNode;

/**
 * Named filter: ?enterprise
 */
export interface NamedFilterNode extends ASTNode {
  kind: 'NamedFilter';
  name: string;
  negated: boolean;
}

/**
 * Explicit filter: ?:segment="ENT"
 */
export interface ExplicitFilterNode extends ASTNode {
  kind: 'ExplicitFilter';
  field: string;
  operator: FilterOperator;
  value: ValueNode;
  negated: boolean;
}

/**
 * Binary filter: expr & expr, expr | expr
 */
export interface BinaryFilterNode extends ASTNode {
  kind: 'BinaryFilter';
  operator: BooleanOperator;
  left: FilterExprNode;
  right: FilterExprNode;
}

/**
 * Unary filter: !expr
 */
export interface UnaryFilterNode extends ASTNode {
  kind: 'UnaryFilter';
  operator: 'NOT';
  operand: FilterExprNode;
}

/**
 * Grouped filter: (expr)
 */
export interface GroupedFilterNode extends ASTNode {
  kind: 'GroupedFilter';
  expression: FilterExprNode;
}

// =============================================================================
// VALUE NODES
// =============================================================================

export type ValueNode =
  | StringValueNode
  | NumberValueNode
  | BooleanValueNode
  | ArrayValueNode
  | RangeValueNode
  | ParameterNode;

export interface StringValueNode extends ASTNode {
  kind: 'StringValue';
  value: string;
}

export interface NumberValueNode extends ASTNode {
  kind: 'NumberValue';
  value: number;
}

export interface BooleanValueNode extends ASTNode {
  kind: 'BooleanValue';
  value: boolean;
}

export interface ArrayValueNode extends ASTNode {
  kind: 'ArrayValue';
  values: ValueNode[];
}

export interface RangeValueNode extends ASTNode {
  kind: 'RangeValue';
  from: ValueNode;
  to: ValueNode;
}

export interface ParameterNode extends ASTNode {
  kind: 'Parameter';
  name: string;
}

// =============================================================================
// TIME NODES
// =============================================================================

export type TimeNode =
  | DurationNode
  | PeriodNode
  | SpecificDateNode
  | TimeRangeNode;

/**
 * Duration: ~P30d, ~P6M
 */
export interface DurationNode extends ASTNode {
  kind: 'Duration';
  amount: number;
  unit: 'd' | 'w' | 'M' | 'Y';
}

/**
 * Calendar period: ~Q-1, ~M-3, ~Y
 */
export interface PeriodNode extends ASTNode {
  kind: 'Period';
  unit: 'D' | 'W' | 'M' | 'Q' | 'Y';
  offset: number; // 0 = current, -1 = previous, etc.
}

/**
 * Specific date: ~2024, ~2024-Q3, ~2024-06, ~2024-06-15
 */
export interface SpecificDateNode extends ASTNode {
  kind: 'SpecificDate';
  year: number;
  quarter?: number;
  month?: number;
  day?: number;
}

/**
 * Time range: ~[Q-4..Q-1]
 */
export interface TimeRangeNode extends ASTNode {
  kind: 'TimeRange';
  from: TimeNode;
  to: TimeNode;
}

// =============================================================================
// SORT AND LIMIT NODES
// =============================================================================

/**
 * Limit: top:10
 */
export interface LimitNode extends ASTNode {
  kind: 'Limit';
  value: number | ParameterNode;
}

/**
 * Order by: -@revenue, +#region
 */
export interface OrderByNode extends ASTNode {
  kind: 'OrderBy';
  target: MetricNode | DimensionNode | FieldRefNode;
  direction: SortDirection;
}

/**
 * Field reference for entity sort: +:name
 */
export interface FieldRefNode extends ASTNode {
  kind: 'FieldRef';
  name: string;
}

// =============================================================================
// COMPARE NODE
// =============================================================================

/**
 * Comparison: vs Q-4
 */
export interface CompareNode extends ASTNode {
  kind: 'Compare';
  period: TimeNode;
}
