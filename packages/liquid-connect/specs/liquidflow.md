# LiquidFlow Intermediate Representation Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2024-12-27

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Goals](#2-design-goals)
3. [Core TypeScript Interfaces](#3-core-typescript-interfaces)
4. [JSON Schema](#4-json-schema)
5. [Versioning Strategy](#5-versioning-strategy)
6. [Validation Rules](#6-validation-rules)
7. [Examples](#7-examples)

---

## 1. Overview

LiquidFlow is the **backend-agnostic intermediate representation (IR)** that LiquidConnect compiles semantic layer queries into. It serves as the universal translation layer between high-level metric definitions and the diverse SQL dialects of underlying data warehouses.

### Architecture Position

```
┌─────────────────────────────────────────────────────────────────┐
│                     Semantic Layer (YAML)                       │
│              metrics, entities, dimensions, joins               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LiquidConnect Compiler                       │
│              parse → resolve → optimize → emit IR               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ╔═══════════════════════╗                      │
│                  ║     LiquidFlow IR     ║  ◄── This Spec       │
│                  ╚═══════════════════════╝                      │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  DuckDB  │   │ Postgres │   │  Trino   │
        │  Emitter │   │  Emitter │   │  Emitter │
        └──────────┘   └──────────┘   └──────────┘
              │               │               │
              ▼               ▼               ▼
          SQL Query       SQL Query       SQL Query
```

### What LiquidFlow Represents

A LiquidFlow document is a **complete, self-contained query plan** that captures:

- **What** to compute (metrics with their aggregations)
- **From where** (entities with their sources)
- **How to slice** (dimensions for grouping)
- **What to filter** (filter expressions with full operator support)
- **How to constrain time** (time ranges, periods, durations)
- **How to join** (explicit join specifications)
- **How to order** (sort specifications)
- **How to compare** (period-over-period comparisons)

### Key Principle: Determinism

Given the same LiquidFlow IR, any compliant emitter MUST produce semantically equivalent SQL. The output SQL may differ syntactically (due to dialect differences), but the result set MUST be identical.

---

## 2. Design Goals

### 2.1 Portable

LiquidFlow is designed to be **completely backend-agnostic**. It contains no SQL dialect-specific constructs. Instead, it uses abstract representations that each emitter translates appropriately:

| LiquidFlow Construct | PostgreSQL | DuckDB | Trino |
|---------------------|------------|--------|-------|
| `FilterOp.LIKE` | `LIKE` | `LIKE` | `LIKE` |
| `FilterOp.ILIKE` | `ILIKE` | `ILIKE` | `LOWER(...) LIKE LOWER(...)` |
| `TimeGrain.WEEK` | `DATE_TRUNC('week', ...)` | `DATE_TRUNC('week', ...)` | `DATE_TRUNC('week', ...)` |
| `Aggregation.MEDIAN` | `PERCENTILE_CONT(0.5)` | `MEDIAN(...)` | `APPROX_PERCENTILE(..., 0.5)` |

### 2.2 Serializable

LiquidFlow MUST serialize to **valid JSON**. This enables:

- Storage in databases for query caching
- Transmission over HTTP APIs
- Logging and debugging
- Version control of query plans

```typescript
// Serialize
const json = JSON.stringify(liquidFlow);

// Deserialize
const restored = JSON.parse(json) as LiquidFlow;
```

### 2.3 Versionable

Every LiquidFlow document includes a version identifier following semantic versioning. This enables:

- Backward compatibility detection
- Migration of stored query plans
- Clear breaking change communication

### 2.4 Deterministic

The same semantic query MUST always produce the same LiquidFlow IR. This is achieved by:

- Canonical ordering of array elements (alphabetically by identifier where applicable)
- Normalized filter expressions (CNF form)
- Consistent handling of defaults

---

## 3. Core TypeScript Interfaces

### 3.1 LiquidFlow (Main IR Type)

```typescript
/**
 * LiquidFlow - The complete intermediate representation for a semantic query.
 *
 * This is the root type that represents a fully resolved, executable query plan.
 * It contains all information needed by an emitter to generate backend-specific SQL.
 */
export interface LiquidFlow {
  /**
   * IR format version (semver).
   * Emitters MUST check this before processing.
   */
  readonly version: string;

  /**
   * Unique identifier for this query plan.
   * Used for caching, debugging, and correlation.
   * Format: UUID v4
   */
  readonly id: string;

  /**
   * ISO 8601 timestamp of when this IR was generated.
   */
  readonly generatedAt: string;

  /**
   * Hash of the canonical representation.
   * Used to detect duplicate queries regardless of cosmetic differences.
   * Algorithm: SHA-256 of canonical JSON (sorted keys, no whitespace)
   */
  readonly contentHash: string;

  /**
   * The primary entity being queried.
   * All metrics and dimensions must be reachable from this entity.
   */
  readonly primaryEntity: EntityRef;

  /**
   * Metrics to compute.
   * Order is preserved in output columns.
   * @minItems 1
   */
  readonly metrics: MetricRef[];

  /**
   * Dimensions to group by.
   * Order is preserved in GROUP BY and output columns.
   */
  readonly dimensions: DimensionRef[];

  /**
   * Filter expressions to apply.
   * Combined with AND at the top level.
   */
  readonly filters: FilterExpr[];

  /**
   * Time constraint for the query.
   * Applied to the primary entity's time dimension.
   */
  readonly timeConstraint?: TimeConstraint;

  /**
   * Explicit join specifications.
   * Order determines join execution order.
   */
  readonly joins: JoinSpec[];

  /**
   * Result ordering.
   * Order determines sort priority.
   */
  readonly orderBy: OrderBy[];

  /**
   * Maximum rows to return.
   * Null means no limit.
   */
  readonly limit?: number;

  /**
   * Rows to skip before returning results.
   * Used for pagination.
   */
  readonly offset?: number;

  /**
   * Period-over-period comparison specification.
   */
  readonly compare?: CompareSpec;

  /**
   * Query-level hints for optimization.
   * Emitters MAY use these but are not required to.
   */
  readonly hints?: QueryHints;

  /**
   * Debug metadata.
   * Not used for query execution.
   */
  readonly metadata?: QueryMetadata;
}

/**
 * Optional hints that emitters can use for optimization.
 */
export interface QueryHints {
  /**
   * Hint that the result set is expected to be small.
   * Emitters may skip certain optimizations.
   */
  readonly smallResultSet?: boolean;

  /**
   * Hint that this query is for exploration/preview.
   * Emitters may use approximate algorithms.
   */
  readonly exploratoryQuery?: boolean;

  /**
   * Preferred query timeout in milliseconds.
   */
  readonly timeoutMs?: number;

  /**
   * Custom backend-specific hints.
   */
  readonly custom?: Record<string, unknown>;
}

/**
 * Debug and diagnostic metadata.
 */
export interface QueryMetadata {
  /**
   * Original query source (e.g., API request ID).
   */
  readonly sourceId?: string;

  /**
   * User or service that initiated the query.
   */
  readonly initiator?: string;

  /**
   * Tags for categorization.
   */
  readonly tags?: string[];

  /**
   * Free-form notes.
   */
  readonly notes?: string;
}
```

### 3.2 Reference Types

```typescript
/**
 * Reference to a metric in the semantic layer.
 */
export interface MetricRef {
  /**
   * Fully qualified metric identifier.
   * Format: [namespace.]entity.metric_name
   * Example: "orders.total_revenue", "finance.orders.gross_margin"
   */
  readonly ref: string;

  /**
   * Output column alias.
   * If not provided, derived from ref (last segment).
   */
  readonly alias?: string;

  /**
   * The resolved aggregation type.
   * Populated by the compiler from metric definition.
   */
  readonly aggregation: Aggregation;

  /**
   * The resolved SQL expression.
   * Populated by the compiler from metric definition.
   * Example: "SUM(order_items.quantity * order_items.unit_price)"
   */
  readonly expression: string;

  /**
   * Filters specific to this metric.
   * Applied within the aggregation (e.g., FILTER WHERE in PostgreSQL).
   */
  readonly metricFilters?: FilterExpr[];

  /**
   * Whether this metric requires a window function.
   */
  readonly isWindowFunction?: boolean;

  /**
   * Window specification if this is a window function.
   */
  readonly windowSpec?: WindowSpec;
}

/**
 * Aggregation types supported in LiquidFlow.
 */
export type Aggregation =
  | 'SUM'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'AVG'
  | 'MIN'
  | 'MAX'
  | 'MEDIAN'
  | 'PERCENTILE'
  | 'STDDEV'
  | 'VARIANCE'
  | 'FIRST'
  | 'LAST'
  | 'LIST'
  | 'CUSTOM';

/**
 * Window function specification.
 */
export interface WindowSpec {
  /**
   * Partition columns.
   */
  readonly partitionBy: string[];

  /**
   * Order within partitions.
   */
  readonly orderBy?: OrderBy[];

  /**
   * Frame specification.
   */
  readonly frame?: WindowFrame;
}

/**
 * Window frame specification.
 */
export interface WindowFrame {
  readonly type: 'ROWS' | 'RANGE' | 'GROUPS';
  readonly start: FrameBound;
  readonly end: FrameBound;
}

export interface FrameBound {
  readonly type: 'UNBOUNDED_PRECEDING' | 'CURRENT_ROW' | 'UNBOUNDED_FOLLOWING' | 'OFFSET';
  readonly offset?: number;
  readonly direction?: 'PRECEDING' | 'FOLLOWING';
}

/**
 * Reference to an entity in the semantic layer.
 */
export interface EntityRef {
  /**
   * Fully qualified entity identifier.
   * Format: [namespace.]entity_name
   * Example: "orders", "analytics.daily_orders"
   */
  readonly ref: string;

  /**
   * Table alias for SQL generation.
   */
  readonly alias: string;

  /**
   * The resolved source table or subquery.
   * Populated by the compiler from entity definition.
   */
  readonly source: EntitySource;

  /**
   * Primary key columns.
   */
  readonly primaryKey: string[];

  /**
   * Time dimension column for this entity.
   */
  readonly timeDimension?: string;
}

/**
 * Entity source - either a table or a subquery.
 */
export type EntitySource =
  | { readonly type: 'table'; readonly schema?: string; readonly table: string }
  | { readonly type: 'subquery'; readonly sql: string };

/**
 * Reference to a dimension in the semantic layer.
 */
export interface DimensionRef {
  /**
   * Fully qualified dimension identifier.
   * Format: [namespace.]entity.dimension_name
   * Example: "orders.status", "customers.segment"
   */
  readonly ref: string;

  /**
   * Output column alias.
   */
  readonly alias?: string;

  /**
   * The resolved SQL expression.
   * Populated by the compiler from dimension definition.
   * Example: "customers.country", "DATE_TRUNC('month', orders.created_at)"
   */
  readonly expression: string;

  /**
   * Data type of this dimension.
   */
  readonly dataType: DataType;

  /**
   * For time dimensions, the grain.
   */
  readonly timeGrain?: TimeGrain;

  /**
   * Whether to include in GROUP BY.
   * Usually true, but false for computed display columns.
   */
  readonly groupable: boolean;
}

/**
 * Supported data types for dimensions.
 */
export type DataType =
  | 'STRING'
  | 'INTEGER'
  | 'FLOAT'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'TIMESTAMP'
  | 'TIME'
  | 'JSON'
  | 'ARRAY'
  | 'UNKNOWN';

/**
 * Time granularity levels.
 */
export type TimeGrain =
  | 'SECOND'
  | 'MINUTE'
  | 'HOUR'
  | 'DAY'
  | 'WEEK'
  | 'MONTH'
  | 'QUARTER'
  | 'YEAR';
```

### 3.3 FilterExpr

```typescript
/**
 * Filter expression - represents a predicate in the WHERE clause.
 *
 * FilterExpr is a recursive type that can represent simple comparisons
 * or complex boolean combinations (AND, OR, NOT).
 */
export type FilterExpr = SimpleFilter | CompoundFilter | NotFilter;

/**
 * A simple filter comparing a field to a value.
 */
export interface SimpleFilter {
  readonly type: 'simple';

  /**
   * The field or expression being filtered.
   * Can be a dimension ref or a raw SQL expression.
   */
  readonly field: FilterField;

  /**
   * The comparison operator.
   */
  readonly operator: FilterOperator;

  /**
   * The value(s) to compare against.
   * Type depends on operator:
   * - Comparison ops: single value
   * - IN: array of values
   * - RANGE/BETWEEN: tuple of [start, end]
   */
  readonly value: FilterValue;

  /**
   * Whether the comparison is case-sensitive.
   * Only applies to string operations.
   * @default true
   */
  readonly caseSensitive?: boolean;
}

/**
 * A compound filter combining multiple filters with AND or OR.
 */
export interface CompoundFilter {
  readonly type: 'compound';

  /**
   * The logical operator.
   */
  readonly operator: 'AND' | 'OR';

  /**
   * The child filters.
   * @minItems 2
   */
  readonly filters: FilterExpr[];
}

/**
 * A negation filter.
 */
export interface NotFilter {
  readonly type: 'not';

  /**
   * The filter to negate.
   */
  readonly filter: FilterExpr;
}

/**
 * The field being filtered - either a dimension reference or expression.
 */
export type FilterField =
  | { readonly type: 'dimension'; readonly ref: string }
  | { readonly type: 'expression'; readonly sql: string; readonly dataType: DataType };

/**
 * All supported filter operators.
 */
export type FilterOperator =
  // Equality
  | 'EQ'      // =    Equal
  | 'NEQ'     // !=   Not equal

  // Comparison
  | 'GT'      // >    Greater than
  | 'GTE'     // >=   Greater than or equal
  | 'LT'      // <    Less than
  | 'LTE'     // <=   Less than or equal

  // Pattern matching
  | 'LIKE'    // LIKE pattern (case-sensitive by default)
  | 'ILIKE'   // ILIKE pattern (case-insensitive)
  | 'REGEX'   // Regular expression match

  // Set membership
  | 'IN'      // IN (value1, value2, ...)
  | 'NOT_IN'  // NOT IN (value1, value2, ...)

  // Range
  | 'BETWEEN' // BETWEEN start AND end (inclusive)
  | 'NOT_BETWEEN'

  // Null handling
  | 'IS_NULL'
  | 'IS_NOT_NULL'

  // Array operations (for array-typed columns)
  | 'ARRAY_CONTAINS'
  | 'ARRAY_OVERLAPS'

  // String operations
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'CONTAINS';

/**
 * Filter values - type depends on the operator.
 */
export type FilterValue =
  | ScalarValue
  | ScalarValue[]                  // For IN, NOT_IN
  | [ScalarValue, ScalarValue]     // For BETWEEN, NOT_BETWEEN (range tuple)
  | null;                          // For IS_NULL, IS_NOT_NULL

/**
 * Scalar values that can be used in filters.
 */
export type ScalarValue = string | number | boolean | Date;

/**
 * Type mapping for operators and their expected value types.
 */
export interface FilterOperatorValueTypes {
  EQ: ScalarValue;
  NEQ: ScalarValue;
  GT: number | Date;
  GTE: number | Date;
  LT: number | Date;
  LTE: number | Date;
  LIKE: string;
  ILIKE: string;
  REGEX: string;
  IN: ScalarValue[];
  NOT_IN: ScalarValue[];
  BETWEEN: [ScalarValue, ScalarValue];
  NOT_BETWEEN: [ScalarValue, ScalarValue];
  IS_NULL: null;
  IS_NOT_NULL: null;
  ARRAY_CONTAINS: ScalarValue;
  ARRAY_OVERLAPS: ScalarValue[];
  STARTS_WITH: string;
  ENDS_WITH: string;
  CONTAINS: string;
}
```

### 3.4 TimeConstraint

```typescript
/**
 * Time constraint - specifies how to filter the time dimension.
 *
 * There are four modes:
 * 1. Duration: relative to now (e.g., "last 7 days")
 * 2. Period: calendar period (e.g., "this month", "last quarter")
 * 3. Specific: exact timestamp/date
 * 4. Range: explicit start and end
 */
export type TimeConstraint =
  | DurationTimeConstraint
  | PeriodTimeConstraint
  | SpecificTimeConstraint
  | RangeTimeConstraint;

/**
 * Base properties shared by all time constraints.
 */
interface TimeConstraintBase {
  /**
   * The time dimension to constrain.
   * Must match a time dimension in the query.
   */
  readonly dimension: string;

  /**
   * Timezone for interpreting the constraint.
   * IANA timezone name (e.g., "America/New_York").
   * @default "UTC"
   */
  readonly timezone?: string;
}

/**
 * Duration-based constraint: relative to current time.
 *
 * Examples:
 * - Last 7 days
 * - Last 3 months
 * - Last 52 weeks
 */
export interface DurationTimeConstraint extends TimeConstraintBase {
  readonly type: 'duration';

  /**
   * The duration unit.
   */
  readonly unit: TimeGrain;

  /**
   * The number of units.
   * Must be positive.
   */
  readonly value: number;

  /**
   * Whether to include the current (incomplete) period.
   * @default false
   */
  readonly includeCurrentPeriod?: boolean;

  /**
   * The anchor point for "now".
   * If not provided, uses query execution time.
   * Useful for reproducible queries.
   */
  readonly anchor?: string; // ISO 8601
}

/**
 * Calendar period constraint: aligned to calendar boundaries.
 *
 * Examples:
 * - This month
 * - Last quarter
 * - Previous year
 */
export interface PeriodTimeConstraint extends TimeConstraintBase {
  readonly type: 'period';

  /**
   * The period granularity.
   */
  readonly grain: TimeGrain;

  /**
   * Which period relative to current.
   * 0 = current, -1 = previous, -2 = two periods ago, etc.
   */
  readonly offset: number;

  /**
   * Number of periods to include.
   * @default 1
   */
  readonly count?: number;

  /**
   * The anchor point for "current".
   * If not provided, uses query execution time.
   */
  readonly anchor?: string; // ISO 8601
}

/**
 * Specific point in time constraint.
 *
 * Examples:
 * - A specific date
 * - A specific timestamp
 */
export interface SpecificTimeConstraint extends TimeConstraintBase {
  readonly type: 'specific';

  /**
   * The specific date/time.
   * ISO 8601 format.
   */
  readonly value: string;

  /**
   * How to match the value.
   * 'exact' = match timestamp exactly
   * 'day' = match anywhere in that day
   * 'month' = match anywhere in that month
   * etc.
   * @default 'exact'
   */
  readonly matchGrain?: TimeGrain | 'exact';
}

/**
 * Explicit range constraint.
 *
 * Examples:
 * - 2024-01-01 to 2024-03-31
 * - 2024-01-15T00:00:00Z to 2024-01-15T23:59:59Z
 */
export interface RangeTimeConstraint extends TimeConstraintBase {
  readonly type: 'range';

  /**
   * Start of range (inclusive).
   * ISO 8601 format.
   * Null means unbounded (no lower limit).
   */
  readonly start: string | null;

  /**
   * End of range.
   * ISO 8601 format.
   * Null means unbounded (no upper limit).
   */
  readonly end: string | null;

  /**
   * Whether the end is inclusive.
   * @default true
   */
  readonly endInclusive?: boolean;
}
```

### 3.5 JoinSpec

```typescript
/**
 * Explicit join specification between entities.
 */
export interface JoinSpec {
  /**
   * The entity being joined.
   */
  readonly entity: EntityRef;

  /**
   * Join type.
   */
  readonly type: JoinType;

  /**
   * Join condition.
   * Array of column pairs to join on.
   */
  readonly on: JoinCondition[];

  /**
   * Optional: additional filter to apply during the join.
   * This is different from WHERE - it affects which rows are joined.
   */
  readonly joinFilter?: FilterExpr;

  /**
   * Cardinality hint for optimization.
   */
  readonly cardinality?: JoinCardinality;
}

/**
 * Supported join types.
 */
export type JoinType =
  | 'INNER'
  | 'LEFT'
  | 'RIGHT'
  | 'FULL'
  | 'CROSS';

/**
 * Join condition - a pair of columns/expressions to join on.
 */
export interface JoinCondition {
  /**
   * Column or expression from the left side.
   */
  readonly left: JoinColumn;

  /**
   * Column or expression from the right side.
   */
  readonly right: JoinColumn;

  /**
   * Comparison operator (usually EQ).
   * @default 'EQ'
   */
  readonly operator?: 'EQ' | 'LT' | 'LTE' | 'GT' | 'GTE';
}

/**
 * A column or expression in a join condition.
 */
export type JoinColumn =
  | { readonly type: 'column'; readonly entity: string; readonly column: string }
  | { readonly type: 'expression'; readonly sql: string };

/**
 * Cardinality hints for join optimization.
 */
export interface JoinCardinality {
  readonly left: 'one' | 'many';
  readonly right: 'one' | 'many';
}
```

### 3.6 OrderBy

```typescript
/**
 * Sort specification for result ordering.
 */
export interface OrderBy {
  /**
   * What to sort by - can reference a metric, dimension, or expression.
   */
  readonly field: OrderByField;

  /**
   * Sort direction.
   * @default 'ASC'
   */
  readonly direction?: 'ASC' | 'DESC';

  /**
   * How to handle NULL values.
   * @default 'LAST' for ASC, 'FIRST' for DESC
   */
  readonly nulls?: 'FIRST' | 'LAST';
}

/**
 * Field to sort by.
 */
export type OrderByField =
  | { readonly type: 'metric'; readonly ref: string }
  | { readonly type: 'dimension'; readonly ref: string }
  | { readonly type: 'alias'; readonly name: string }
  | { readonly type: 'expression'; readonly sql: string }
  | { readonly type: 'position'; readonly index: number }; // 1-based column index
```

### 3.7 CompareSpec

```typescript
/**
 * Period-over-period comparison specification.
 *
 * Used to add comparison columns (e.g., "revenue vs last month").
 */
export interface CompareSpec {
  /**
   * What type of comparison.
   */
  readonly type: CompareType;

  /**
   * The metrics to compare.
   * If not specified, all metrics in the query are compared.
   */
  readonly metrics?: string[];

  /**
   * Compare offset - how many periods back.
   * For 'previous_period', this is the number of periods.
   * For 'previous_year', this specifies years.
   */
  readonly offset: number;

  /**
   * What comparison values to include.
   */
  readonly include: CompareInclude;
}

/**
 * Types of period comparison.
 */
export type CompareType =
  | 'previous_period'  // Same duration, previous period
  | 'previous_year'    // Same period, previous year
  | 'custom';          // Custom date range

/**
 * What to include in comparison output.
 */
export interface CompareInclude {
  /**
   * Include the comparison period's absolute value.
   * Column name: {metric}_previous
   */
  readonly absoluteValue: boolean;

  /**
   * Include the absolute difference.
   * Column name: {metric}_diff
   */
  readonly absoluteDifference: boolean;

  /**
   * Include the percentage difference.
   * Column name: {metric}_pct_change
   */
  readonly percentageDifference: boolean;

  /**
   * Include the ratio.
   * Column name: {metric}_ratio
   */
  readonly ratio: boolean;
}
```

---

## 4. JSON Schema

The following JSON Schema validates LiquidFlow documents:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://liquidrender.dev/schemas/liquidflow/v1.0.0.json",
  "title": "LiquidFlow",
  "description": "LiquidFlow Intermediate Representation for semantic layer queries",
  "type": "object",
  "required": [
    "version",
    "id",
    "generatedAt",
    "contentHash",
    "primaryEntity",
    "metrics",
    "dimensions",
    "filters",
    "joins",
    "orderBy"
  ],
  "additionalProperties": false,
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of the IR format"
    },
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this query plan"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of generation"
    },
    "contentHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 hash of canonical representation"
    },
    "primaryEntity": {
      "$ref": "#/definitions/EntityRef"
    },
    "metrics": {
      "type": "array",
      "items": { "$ref": "#/definitions/MetricRef" },
      "minItems": 1
    },
    "dimensions": {
      "type": "array",
      "items": { "$ref": "#/definitions/DimensionRef" }
    },
    "filters": {
      "type": "array",
      "items": { "$ref": "#/definitions/FilterExpr" }
    },
    "timeConstraint": {
      "$ref": "#/definitions/TimeConstraint"
    },
    "joins": {
      "type": "array",
      "items": { "$ref": "#/definitions/JoinSpec" }
    },
    "orderBy": {
      "type": "array",
      "items": { "$ref": "#/definitions/OrderBy" }
    },
    "limit": {
      "type": "integer",
      "minimum": 1
    },
    "offset": {
      "type": "integer",
      "minimum": 0
    },
    "compare": {
      "$ref": "#/definitions/CompareSpec"
    },
    "hints": {
      "$ref": "#/definitions/QueryHints"
    },
    "metadata": {
      "$ref": "#/definitions/QueryMetadata"
    }
  },
  "definitions": {
    "EntityRef": {
      "type": "object",
      "required": ["ref", "alias", "source", "primaryKey"],
      "properties": {
        "ref": { "type": "string" },
        "alias": { "type": "string" },
        "source": { "$ref": "#/definitions/EntitySource" },
        "primaryKey": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "timeDimension": { "type": "string" }
      }
    },
    "EntitySource": {
      "oneOf": [
        {
          "type": "object",
          "required": ["type", "table"],
          "properties": {
            "type": { "const": "table" },
            "schema": { "type": "string" },
            "table": { "type": "string" }
          }
        },
        {
          "type": "object",
          "required": ["type", "sql"],
          "properties": {
            "type": { "const": "subquery" },
            "sql": { "type": "string" }
          }
        }
      ]
    },
    "MetricRef": {
      "type": "object",
      "required": ["ref", "aggregation", "expression"],
      "properties": {
        "ref": { "type": "string" },
        "alias": { "type": "string" },
        "aggregation": { "$ref": "#/definitions/Aggregation" },
        "expression": { "type": "string" },
        "metricFilters": {
          "type": "array",
          "items": { "$ref": "#/definitions/FilterExpr" }
        },
        "isWindowFunction": { "type": "boolean" },
        "windowSpec": { "$ref": "#/definitions/WindowSpec" }
      }
    },
    "Aggregation": {
      "type": "string",
      "enum": [
        "SUM", "COUNT", "COUNT_DISTINCT", "AVG", "MIN", "MAX",
        "MEDIAN", "PERCENTILE", "STDDEV", "VARIANCE",
        "FIRST", "LAST", "LIST", "CUSTOM"
      ]
    },
    "WindowSpec": {
      "type": "object",
      "required": ["partitionBy"],
      "properties": {
        "partitionBy": {
          "type": "array",
          "items": { "type": "string" }
        },
        "orderBy": {
          "type": "array",
          "items": { "$ref": "#/definitions/OrderBy" }
        },
        "frame": { "$ref": "#/definitions/WindowFrame" }
      }
    },
    "WindowFrame": {
      "type": "object",
      "required": ["type", "start", "end"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["ROWS", "RANGE", "GROUPS"]
        },
        "start": { "$ref": "#/definitions/FrameBound" },
        "end": { "$ref": "#/definitions/FrameBound" }
      }
    },
    "FrameBound": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["UNBOUNDED_PRECEDING", "CURRENT_ROW", "UNBOUNDED_FOLLOWING", "OFFSET"]
        },
        "offset": { "type": "integer" },
        "direction": {
          "type": "string",
          "enum": ["PRECEDING", "FOLLOWING"]
        }
      }
    },
    "DimensionRef": {
      "type": "object",
      "required": ["ref", "expression", "dataType", "groupable"],
      "properties": {
        "ref": { "type": "string" },
        "alias": { "type": "string" },
        "expression": { "type": "string" },
        "dataType": { "$ref": "#/definitions/DataType" },
        "timeGrain": { "$ref": "#/definitions/TimeGrain" },
        "groupable": { "type": "boolean" }
      }
    },
    "DataType": {
      "type": "string",
      "enum": [
        "STRING", "INTEGER", "FLOAT", "DECIMAL", "BOOLEAN",
        "DATE", "DATETIME", "TIMESTAMP", "TIME", "JSON", "ARRAY", "UNKNOWN"
      ]
    },
    "TimeGrain": {
      "type": "string",
      "enum": ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]
    },
    "FilterExpr": {
      "oneOf": [
        { "$ref": "#/definitions/SimpleFilter" },
        { "$ref": "#/definitions/CompoundFilter" },
        { "$ref": "#/definitions/NotFilter" }
      ]
    },
    "SimpleFilter": {
      "type": "object",
      "required": ["type", "field", "operator", "value"],
      "properties": {
        "type": { "const": "simple" },
        "field": { "$ref": "#/definitions/FilterField" },
        "operator": { "$ref": "#/definitions/FilterOperator" },
        "value": {},
        "caseSensitive": { "type": "boolean" }
      }
    },
    "CompoundFilter": {
      "type": "object",
      "required": ["type", "operator", "filters"],
      "properties": {
        "type": { "const": "compound" },
        "operator": {
          "type": "string",
          "enum": ["AND", "OR"]
        },
        "filters": {
          "type": "array",
          "items": { "$ref": "#/definitions/FilterExpr" },
          "minItems": 2
        }
      }
    },
    "NotFilter": {
      "type": "object",
      "required": ["type", "filter"],
      "properties": {
        "type": { "const": "not" },
        "filter": { "$ref": "#/definitions/FilterExpr" }
      }
    },
    "FilterField": {
      "oneOf": [
        {
          "type": "object",
          "required": ["type", "ref"],
          "properties": {
            "type": { "const": "dimension" },
            "ref": { "type": "string" }
          }
        },
        {
          "type": "object",
          "required": ["type", "sql", "dataType"],
          "properties": {
            "type": { "const": "expression" },
            "sql": { "type": "string" },
            "dataType": { "$ref": "#/definitions/DataType" }
          }
        }
      ]
    },
    "FilterOperator": {
      "type": "string",
      "enum": [
        "EQ", "NEQ", "GT", "GTE", "LT", "LTE",
        "LIKE", "ILIKE", "REGEX",
        "IN", "NOT_IN",
        "BETWEEN", "NOT_BETWEEN",
        "IS_NULL", "IS_NOT_NULL",
        "ARRAY_CONTAINS", "ARRAY_OVERLAPS",
        "STARTS_WITH", "ENDS_WITH", "CONTAINS"
      ]
    },
    "TimeConstraint": {
      "oneOf": [
        { "$ref": "#/definitions/DurationTimeConstraint" },
        { "$ref": "#/definitions/PeriodTimeConstraint" },
        { "$ref": "#/definitions/SpecificTimeConstraint" },
        { "$ref": "#/definitions/RangeTimeConstraint" }
      ]
    },
    "DurationTimeConstraint": {
      "type": "object",
      "required": ["type", "dimension", "unit", "value"],
      "properties": {
        "type": { "const": "duration" },
        "dimension": { "type": "string" },
        "timezone": { "type": "string" },
        "unit": { "$ref": "#/definitions/TimeGrain" },
        "value": { "type": "integer", "minimum": 1 },
        "includeCurrentPeriod": { "type": "boolean" },
        "anchor": { "type": "string", "format": "date-time" }
      }
    },
    "PeriodTimeConstraint": {
      "type": "object",
      "required": ["type", "dimension", "grain", "offset"],
      "properties": {
        "type": { "const": "period" },
        "dimension": { "type": "string" },
        "timezone": { "type": "string" },
        "grain": { "$ref": "#/definitions/TimeGrain" },
        "offset": { "type": "integer" },
        "count": { "type": "integer", "minimum": 1 },
        "anchor": { "type": "string", "format": "date-time" }
      }
    },
    "SpecificTimeConstraint": {
      "type": "object",
      "required": ["type", "dimension", "value"],
      "properties": {
        "type": { "const": "specific" },
        "dimension": { "type": "string" },
        "timezone": { "type": "string" },
        "value": { "type": "string", "format": "date-time" },
        "matchGrain": {
          "oneOf": [
            { "$ref": "#/definitions/TimeGrain" },
            { "const": "exact" }
          ]
        }
      }
    },
    "RangeTimeConstraint": {
      "type": "object",
      "required": ["type", "dimension", "start", "end"],
      "properties": {
        "type": { "const": "range" },
        "dimension": { "type": "string" },
        "timezone": { "type": "string" },
        "start": {
          "oneOf": [
            { "type": "string", "format": "date-time" },
            { "type": "null" }
          ]
        },
        "end": {
          "oneOf": [
            { "type": "string", "format": "date-time" },
            { "type": "null" }
          ]
        },
        "endInclusive": { "type": "boolean" }
      }
    },
    "JoinSpec": {
      "type": "object",
      "required": ["entity", "type", "on"],
      "properties": {
        "entity": { "$ref": "#/definitions/EntityRef" },
        "type": { "$ref": "#/definitions/JoinType" },
        "on": {
          "type": "array",
          "items": { "$ref": "#/definitions/JoinCondition" },
          "minItems": 1
        },
        "joinFilter": { "$ref": "#/definitions/FilterExpr" },
        "cardinality": { "$ref": "#/definitions/JoinCardinality" }
      }
    },
    "JoinType": {
      "type": "string",
      "enum": ["INNER", "LEFT", "RIGHT", "FULL", "CROSS"]
    },
    "JoinCondition": {
      "type": "object",
      "required": ["left", "right"],
      "properties": {
        "left": { "$ref": "#/definitions/JoinColumn" },
        "right": { "$ref": "#/definitions/JoinColumn" },
        "operator": {
          "type": "string",
          "enum": ["EQ", "LT", "LTE", "GT", "GTE"],
          "default": "EQ"
        }
      }
    },
    "JoinColumn": {
      "oneOf": [
        {
          "type": "object",
          "required": ["type", "entity", "column"],
          "properties": {
            "type": { "const": "column" },
            "entity": { "type": "string" },
            "column": { "type": "string" }
          }
        },
        {
          "type": "object",
          "required": ["type", "sql"],
          "properties": {
            "type": { "const": "expression" },
            "sql": { "type": "string" }
          }
        }
      ]
    },
    "JoinCardinality": {
      "type": "object",
      "required": ["left", "right"],
      "properties": {
        "left": { "type": "string", "enum": ["one", "many"] },
        "right": { "type": "string", "enum": ["one", "many"] }
      }
    },
    "OrderBy": {
      "type": "object",
      "required": ["field"],
      "properties": {
        "field": { "$ref": "#/definitions/OrderByField" },
        "direction": {
          "type": "string",
          "enum": ["ASC", "DESC"],
          "default": "ASC"
        },
        "nulls": {
          "type": "string",
          "enum": ["FIRST", "LAST"]
        }
      }
    },
    "OrderByField": {
      "oneOf": [
        {
          "type": "object",
          "required": ["type", "ref"],
          "properties": {
            "type": { "const": "metric" },
            "ref": { "type": "string" }
          }
        },
        {
          "type": "object",
          "required": ["type", "ref"],
          "properties": {
            "type": { "const": "dimension" },
            "ref": { "type": "string" }
          }
        },
        {
          "type": "object",
          "required": ["type", "name"],
          "properties": {
            "type": { "const": "alias" },
            "name": { "type": "string" }
          }
        },
        {
          "type": "object",
          "required": ["type", "sql"],
          "properties": {
            "type": { "const": "expression" },
            "sql": { "type": "string" }
          }
        },
        {
          "type": "object",
          "required": ["type", "index"],
          "properties": {
            "type": { "const": "position" },
            "index": { "type": "integer", "minimum": 1 }
          }
        }
      ]
    },
    "CompareSpec": {
      "type": "object",
      "required": ["type", "offset", "include"],
      "properties": {
        "type": { "$ref": "#/definitions/CompareType" },
        "metrics": {
          "type": "array",
          "items": { "type": "string" }
        },
        "offset": { "type": "integer", "minimum": 1 },
        "include": { "$ref": "#/definitions/CompareInclude" }
      }
    },
    "CompareType": {
      "type": "string",
      "enum": ["previous_period", "previous_year", "custom"]
    },
    "CompareInclude": {
      "type": "object",
      "required": ["absoluteValue", "absoluteDifference", "percentageDifference", "ratio"],
      "properties": {
        "absoluteValue": { "type": "boolean" },
        "absoluteDifference": { "type": "boolean" },
        "percentageDifference": { "type": "boolean" },
        "ratio": { "type": "boolean" }
      }
    },
    "QueryHints": {
      "type": "object",
      "properties": {
        "smallResultSet": { "type": "boolean" },
        "exploratoryQuery": { "type": "boolean" },
        "timeoutMs": { "type": "integer", "minimum": 1 },
        "custom": { "type": "object" }
      }
    },
    "QueryMetadata": {
      "type": "object",
      "properties": {
        "sourceId": { "type": "string" },
        "initiator": { "type": "string" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "notes": { "type": "string" }
      }
    }
  }
}
```

---

## 5. Versioning Strategy

LiquidFlow uses **Semantic Versioning 2.0.0** (semver) for the IR format.

### Version Format

```
MAJOR.MINOR.PATCH
```

### Version Semantics

| Change Type | Version Bump | Examples |
|------------|--------------|----------|
| **Breaking** | MAJOR | Removing a field, changing field type, renaming required field |
| **Feature** | MINOR | Adding optional field, adding new enum value, adding new type variant |
| **Fix** | PATCH | Documentation fixes, clarifying existing behavior |

### Compatibility Rules

1. **Emitters MUST** check the `version` field before processing
2. **Emitters MUST** support all PATCH versions within their supported MINOR version
3. **Emitters SHOULD** support all MINOR versions within their supported MAJOR version
4. **Emitters MAY** reject documents with unsupported MAJOR versions

### Version Checking

```typescript
import { satisfies, coerce } from 'semver';

function checkVersion(flow: LiquidFlow, supportedRange: string): boolean {
  const version = coerce(flow.version);
  if (!version) {
    throw new Error(`Invalid version format: ${flow.version}`);
  }
  return satisfies(version, supportedRange);
}

// Emitter example
const SUPPORTED_VERSION = '^1.0.0'; // Supports 1.x.x

function emit(flow: LiquidFlow): string {
  if (!checkVersion(flow, SUPPORTED_VERSION)) {
    throw new Error(
      `Unsupported LiquidFlow version: ${flow.version}. ` +
      `This emitter supports: ${SUPPORTED_VERSION}`
    );
  }
  // ... proceed with emission
}
```

### Migration Path

When a MAJOR version change occurs:

1. **Document** all breaking changes in the changelog
2. **Provide** a migration function: `migrate_v1_to_v2(flow: LiquidFlowV1): LiquidFlowV2`
3. **Deprecate** but continue supporting the previous major version for at least 6 months
4. **Warn** when processing deprecated versions

---

## 6. Validation Rules

A LiquidFlow document is **valid** if and only if it passes all of the following validation rules.

### 6.1 Structural Validation

| Rule | Description |
|------|-------------|
| **V-001** | Document MUST conform to the JSON Schema |
| **V-002** | `version` MUST be a valid semver string |
| **V-003** | `id` MUST be a valid UUID v4 |
| **V-004** | `generatedAt` MUST be a valid ISO 8601 timestamp |
| **V-005** | `contentHash` MUST be a 64-character lowercase hex string |

### 6.2 Reference Validation

| Rule | Description |
|------|-------------|
| **V-010** | All dimension refs in `dimensions` MUST be resolvable |
| **V-011** | All metric refs in `metrics` MUST be resolvable |
| **V-012** | All entity refs MUST have valid sources |
| **V-013** | All filter field refs MUST reference valid dimensions or have valid expressions |
| **V-014** | `timeConstraint.dimension` MUST reference a dimension with time data type |

### 6.3 Semantic Validation

| Rule | Description |
|------|-------------|
| **V-020** | At least one metric MUST be present |
| **V-021** | All dimensions MUST be reachable from `primaryEntity` via declared joins |
| **V-022** | All metrics MUST be computable from `primaryEntity` and joined entities |
| **V-023** | Filter operators MUST be compatible with field data types |
| **V-024** | `orderBy` fields MUST reference metrics, dimensions, or valid expressions |

### 6.4 Consistency Validation

| Rule | Description |
|------|-------------|
| **V-030** | `contentHash` MUST match the computed hash of the canonical form |
| **V-031** | Join graph MUST NOT contain cycles |
| **V-032** | All entity aliases MUST be unique within the document |
| **V-033** | Metric/dimension aliases MUST be unique in output |

### 6.5 Type Compatibility

| Filter Operator | Compatible Data Types |
|----------------|----------------------|
| `EQ`, `NEQ` | All types |
| `GT`, `GTE`, `LT`, `LTE` | INTEGER, FLOAT, DECIMAL, DATE, DATETIME, TIMESTAMP, TIME |
| `LIKE`, `ILIKE`, `REGEX`, `STARTS_WITH`, `ENDS_WITH`, `CONTAINS` | STRING |
| `IN`, `NOT_IN` | All types (array of same type) |
| `BETWEEN`, `NOT_BETWEEN` | INTEGER, FLOAT, DECIMAL, DATE, DATETIME, TIMESTAMP |
| `IS_NULL`, `IS_NOT_NULL` | All types |
| `ARRAY_CONTAINS`, `ARRAY_OVERLAPS` | ARRAY |

### 6.6 Validation Implementation

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;        // e.g., "V-020"
  message: string;
  path?: string;       // JSON path to the invalid element
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  severity: 'warning';
}

export function validate(flow: LiquidFlow): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // V-020: At least one metric
  if (flow.metrics.length === 0) {
    errors.push({
      code: 'V-020',
      message: 'At least one metric is required',
      path: '$.metrics',
      severity: 'error'
    });
  }

  // ... additional validation rules

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 7. Examples

### 7.1 Simple Aggregation Query

**Query:** "Total revenue by country for the last 30 days"

```json
{
  "version": "1.0.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "generatedAt": "2024-12-27T10:30:00.000Z",
  "contentHash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
  "primaryEntity": {
    "ref": "orders",
    "alias": "o",
    "source": {
      "type": "table",
      "schema": "analytics",
      "table": "orders"
    },
    "primaryKey": ["order_id"],
    "timeDimension": "created_at"
  },
  "metrics": [
    {
      "ref": "orders.total_revenue",
      "alias": "total_revenue",
      "aggregation": "SUM",
      "expression": "o.quantity * o.unit_price"
    }
  ],
  "dimensions": [
    {
      "ref": "orders.country",
      "alias": "country",
      "expression": "o.country",
      "dataType": "STRING",
      "groupable": true
    }
  ],
  "filters": [],
  "timeConstraint": {
    "type": "duration",
    "dimension": "orders.created_at",
    "unit": "DAY",
    "value": 30,
    "timezone": "UTC"
  },
  "joins": [],
  "orderBy": [
    {
      "field": { "type": "metric", "ref": "orders.total_revenue" },
      "direction": "DESC"
    }
  ],
  "limit": 100
}
```

### 7.2 Multi-Entity Join with Filters

**Query:** "Active customers with their total order value, filtered by premium segment"

```json
{
  "version": "1.0.0",
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "generatedAt": "2024-12-27T10:35:00.000Z",
  "contentHash": "b2c3d4e5f6789012345678901234567890123456789012345678901234abcde",
  "primaryEntity": {
    "ref": "customers",
    "alias": "c",
    "source": {
      "type": "table",
      "schema": "public",
      "table": "customers"
    },
    "primaryKey": ["customer_id"]
  },
  "metrics": [
    {
      "ref": "orders.total_order_value",
      "alias": "total_order_value",
      "aggregation": "SUM",
      "expression": "o.total_amount"
    },
    {
      "ref": "orders.order_count",
      "alias": "order_count",
      "aggregation": "COUNT",
      "expression": "o.order_id"
    }
  ],
  "dimensions": [
    {
      "ref": "customers.customer_name",
      "alias": "customer_name",
      "expression": "c.name",
      "dataType": "STRING",
      "groupable": true
    },
    {
      "ref": "customers.segment",
      "alias": "segment",
      "expression": "c.segment",
      "dataType": "STRING",
      "groupable": true
    }
  ],
  "filters": [
    {
      "type": "simple",
      "field": { "type": "dimension", "ref": "customers.segment" },
      "operator": "EQ",
      "value": "premium"
    },
    {
      "type": "simple",
      "field": { "type": "dimension", "ref": "customers.status" },
      "operator": "EQ",
      "value": "active"
    }
  ],
  "joins": [
    {
      "entity": {
        "ref": "orders",
        "alias": "o",
        "source": {
          "type": "table",
          "schema": "public",
          "table": "orders"
        },
        "primaryKey": ["order_id"],
        "timeDimension": "created_at"
      },
      "type": "LEFT",
      "on": [
        {
          "left": { "type": "column", "entity": "c", "column": "customer_id" },
          "right": { "type": "column", "entity": "o", "column": "customer_id" }
        }
      ],
      "cardinality": { "left": "one", "right": "many" }
    }
  ],
  "orderBy": [
    {
      "field": { "type": "metric", "ref": "orders.total_order_value" },
      "direction": "DESC",
      "nulls": "LAST"
    }
  ],
  "limit": 50
}
```

### 7.3 Complex Filter Expression

**Query:** "Orders with complex filtering: status in ('completed', 'shipped') AND (amount > 100 OR is_priority = true)"

```json
{
  "version": "1.0.0",
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "generatedAt": "2024-12-27T10:40:00.000Z",
  "contentHash": "c3d4e5f6789012345678901234567890123456789012345678901234abcdef",
  "primaryEntity": {
    "ref": "orders",
    "alias": "o",
    "source": {
      "type": "table",
      "schema": "sales",
      "table": "orders"
    },
    "primaryKey": ["order_id"],
    "timeDimension": "created_at"
  },
  "metrics": [
    {
      "ref": "orders.count",
      "alias": "order_count",
      "aggregation": "COUNT",
      "expression": "o.order_id"
    }
  ],
  "dimensions": [
    {
      "ref": "orders.status",
      "alias": "status",
      "expression": "o.status",
      "dataType": "STRING",
      "groupable": true
    }
  ],
  "filters": [
    {
      "type": "compound",
      "operator": "AND",
      "filters": [
        {
          "type": "simple",
          "field": { "type": "dimension", "ref": "orders.status" },
          "operator": "IN",
          "value": ["completed", "shipped"]
        },
        {
          "type": "compound",
          "operator": "OR",
          "filters": [
            {
              "type": "simple",
              "field": { "type": "dimension", "ref": "orders.amount" },
              "operator": "GT",
              "value": 100
            },
            {
              "type": "simple",
              "field": { "type": "dimension", "ref": "orders.is_priority" },
              "operator": "EQ",
              "value": true
            }
          ]
        }
      ]
    }
  ],
  "joins": [],
  "orderBy": []
}
```

### 7.4 Period-over-Period Comparison

**Query:** "Monthly revenue with comparison to previous month"

```json
{
  "version": "1.0.0",
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "generatedAt": "2024-12-27T10:45:00.000Z",
  "contentHash": "d4e5f6789012345678901234567890123456789012345678901234abcdef01",
  "primaryEntity": {
    "ref": "orders",
    "alias": "o",
    "source": {
      "type": "table",
      "schema": "analytics",
      "table": "orders"
    },
    "primaryKey": ["order_id"],
    "timeDimension": "created_at"
  },
  "metrics": [
    {
      "ref": "orders.revenue",
      "alias": "revenue",
      "aggregation": "SUM",
      "expression": "o.total_amount"
    }
  ],
  "dimensions": [
    {
      "ref": "orders.order_month",
      "alias": "order_month",
      "expression": "DATE_TRUNC('month', o.created_at)",
      "dataType": "DATE",
      "timeGrain": "MONTH",
      "groupable": true
    }
  ],
  "filters": [],
  "timeConstraint": {
    "type": "duration",
    "dimension": "orders.created_at",
    "unit": "MONTH",
    "value": 12,
    "timezone": "America/New_York"
  },
  "joins": [],
  "orderBy": [
    {
      "field": { "type": "dimension", "ref": "orders.order_month" },
      "direction": "ASC"
    }
  ],
  "compare": {
    "type": "previous_period",
    "offset": 1,
    "include": {
      "absoluteValue": true,
      "absoluteDifference": true,
      "percentageDifference": true,
      "ratio": false
    }
  }
}
```

### 7.5 Window Function with Running Total

**Query:** "Daily revenue with cumulative running total"

```json
{
  "version": "1.0.0",
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "generatedAt": "2024-12-27T10:50:00.000Z",
  "contentHash": "e5f6789012345678901234567890123456789012345678901234abcdef0123",
  "primaryEntity": {
    "ref": "orders",
    "alias": "o",
    "source": {
      "type": "table",
      "schema": "analytics",
      "table": "orders"
    },
    "primaryKey": ["order_id"],
    "timeDimension": "created_at"
  },
  "metrics": [
    {
      "ref": "orders.daily_revenue",
      "alias": "daily_revenue",
      "aggregation": "SUM",
      "expression": "o.total_amount"
    },
    {
      "ref": "orders.cumulative_revenue",
      "alias": "cumulative_revenue",
      "aggregation": "SUM",
      "expression": "o.total_amount",
      "isWindowFunction": true,
      "windowSpec": {
        "partitionBy": [],
        "orderBy": [
          {
            "field": { "type": "dimension", "ref": "orders.order_date" },
            "direction": "ASC"
          }
        ],
        "frame": {
          "type": "ROWS",
          "start": { "type": "UNBOUNDED_PRECEDING" },
          "end": { "type": "CURRENT_ROW" }
        }
      }
    }
  ],
  "dimensions": [
    {
      "ref": "orders.order_date",
      "alias": "order_date",
      "expression": "DATE(o.created_at)",
      "dataType": "DATE",
      "timeGrain": "DAY",
      "groupable": true
    }
  ],
  "filters": [],
  "timeConstraint": {
    "type": "period",
    "dimension": "orders.created_at",
    "grain": "MONTH",
    "offset": 0,
    "timezone": "UTC"
  },
  "joins": [],
  "orderBy": [
    {
      "field": { "type": "dimension", "ref": "orders.order_date" },
      "direction": "ASC"
    }
  ]
}
```

### 7.6 Pattern Matching with LIKE

**Query:** "Products matching pattern with sales metrics"

```json
{
  "version": "1.0.0",
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "generatedAt": "2024-12-27T10:55:00.000Z",
  "contentHash": "f6789012345678901234567890123456789012345678901234abcdef012345",
  "primaryEntity": {
    "ref": "products",
    "alias": "p",
    "source": {
      "type": "table",
      "schema": "catalog",
      "table": "products"
    },
    "primaryKey": ["product_id"]
  },
  "metrics": [
    {
      "ref": "order_items.units_sold",
      "alias": "units_sold",
      "aggregation": "SUM",
      "expression": "oi.quantity"
    },
    {
      "ref": "order_items.revenue",
      "alias": "revenue",
      "aggregation": "SUM",
      "expression": "oi.quantity * oi.unit_price"
    }
  ],
  "dimensions": [
    {
      "ref": "products.name",
      "alias": "product_name",
      "expression": "p.name",
      "dataType": "STRING",
      "groupable": true
    },
    {
      "ref": "products.category",
      "alias": "category",
      "expression": "p.category",
      "dataType": "STRING",
      "groupable": true
    }
  ],
  "filters": [
    {
      "type": "compound",
      "operator": "OR",
      "filters": [
        {
          "type": "simple",
          "field": { "type": "dimension", "ref": "products.name" },
          "operator": "ILIKE",
          "value": "%wireless%",
          "caseSensitive": false
        },
        {
          "type": "simple",
          "field": { "type": "dimension", "ref": "products.name" },
          "operator": "ILIKE",
          "value": "%bluetooth%",
          "caseSensitive": false
        }
      ]
    }
  ],
  "joins": [
    {
      "entity": {
        "ref": "order_items",
        "alias": "oi",
        "source": {
          "type": "table",
          "schema": "sales",
          "table": "order_items"
        },
        "primaryKey": ["order_item_id"]
      },
      "type": "INNER",
      "on": [
        {
          "left": { "type": "column", "entity": "p", "column": "product_id" },
          "right": { "type": "column", "entity": "oi", "column": "product_id" }
        }
      ],
      "cardinality": { "left": "one", "right": "many" }
    }
  ],
  "orderBy": [
    {
      "field": { "type": "metric", "ref": "order_items.revenue" },
      "direction": "DESC"
    }
  ],
  "limit": 25
}
```

### 7.7 Range Filter with Time Constraint

**Query:** "Orders in specific date range with amount between 50 and 500"

```json
{
  "version": "1.0.0",
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "generatedAt": "2024-12-27T11:00:00.000Z",
  "contentHash": "6789012345678901234567890123456789012345678901234abcdef01234567",
  "primaryEntity": {
    "ref": "orders",
    "alias": "o",
    "source": {
      "type": "table",
      "schema": "sales",
      "table": "orders"
    },
    "primaryKey": ["order_id"],
    "timeDimension": "created_at"
  },
  "metrics": [
    {
      "ref": "orders.count",
      "alias": "order_count",
      "aggregation": "COUNT",
      "expression": "o.order_id"
    },
    {
      "ref": "orders.avg_amount",
      "alias": "avg_order_amount",
      "aggregation": "AVG",
      "expression": "o.total_amount"
    }
  ],
  "dimensions": [
    {
      "ref": "orders.order_date",
      "alias": "order_date",
      "expression": "DATE(o.created_at)",
      "dataType": "DATE",
      "timeGrain": "DAY",
      "groupable": true
    }
  ],
  "filters": [
    {
      "type": "simple",
      "field": { "type": "dimension", "ref": "orders.total_amount" },
      "operator": "BETWEEN",
      "value": [50, 500]
    }
  ],
  "timeConstraint": {
    "type": "range",
    "dimension": "orders.created_at",
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-06-30T23:59:59.999Z",
    "endInclusive": true,
    "timezone": "UTC"
  },
  "joins": [],
  "orderBy": [
    {
      "field": { "type": "dimension", "ref": "orders.order_date" },
      "direction": "ASC"
    }
  ]
}
```

---

## Appendix A: Content Hash Computation

The `contentHash` is computed from the **canonical form** of the LiquidFlow document:

```typescript
import { createHash } from 'crypto';

function computeContentHash(flow: LiquidFlow): string {
  // Create a copy without the hash itself
  const { contentHash, id, generatedAt, metadata, hints, ...canonical } = flow;

  // Sort keys recursively and stringify without whitespace
  const canonicalJson = JSON.stringify(canonical, sortKeys, 0);

  // Compute SHA-256
  return createHash('sha256').update(canonicalJson).digest('hex');
}

function sortKeys(key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value)
      .sort()
      .reduce((sorted, k) => {
        sorted[k] = (value as Record<string, unknown>)[k];
        return sorted;
      }, {} as Record<string, unknown>);
  }
  return value;
}
```

---

## Appendix B: Reference Implementation

A TypeScript reference implementation is available in the `@repo/liquid-connect` package:

```typescript
import {
  LiquidFlow,
  validate,
  computeContentHash,
  createLiquidFlow
} from '@repo/liquid-connect/liquidflow';

// Create a new LiquidFlow
const flow = createLiquidFlow({
  primaryEntity: { /* ... */ },
  metrics: [{ /* ... */ }],
  dimensions: [{ /* ... */ }],
  // ...
});

// Validate
const result = validate(flow);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Serialize
const json = JSON.stringify(flow);

// Deserialize and validate
const restored = JSON.parse(json) as LiquidFlow;
const isValid = validate(restored).valid;
```

---

## Changelog

### Version 1.0.0 (2024-12-27)

- Initial release of LiquidFlow IR specification
- Core types: LiquidFlow, MetricRef, EntityRef, DimensionRef
- Filter system with 18 operators
- Time constraint modes: duration, period, specific, range
- Join specifications with cardinality hints
- Period-over-period comparison support
- Window function support
- JSON Schema for validation
- Comprehensive validation rules
