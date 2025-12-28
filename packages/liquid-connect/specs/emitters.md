# Emitters Specification

> One IR, Many SQL Outputs

## Overview

Emitters are the translation layer that transforms LiquidFlow Intermediate Representation (IR) into executable SQL for specific database dialects. This architecture enables LiquidConnect to be truly universal: write your data transformations once as LiquidFlow IR, and emit optimized SQL for any supported database.

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐
│   LiquidFlow    │────▶│   Emitter   │────▶│  Executable SQL  │
│       IR        │     │  (Dialect)  │     │   (DuckDB, etc)  │
└─────────────────┘     └─────────────┘     └──────────────────┘
```

The IR represents **intent** - what transformation you want. The Emitter handles **implementation** - how that transformation is expressed in a specific SQL dialect.

---

## Emitter Interface

### Core Interface

```typescript
interface Emitter {
  /**
   * The SQL dialect this emitter targets.
   * Used for emitter selection and error messages.
   */
  readonly dialect: Dialect;

  /**
   * Capabilities supported by this emitter.
   * Used for validation and feature detection.
   */
  readonly capabilities: EmitterCapabilities;

  /**
   * Transform LiquidFlow IR into executable SQL.
   * This is the primary entry point for code generation.
   */
  emit(flow: LiquidFlow): EmitResult;

  /**
   * Validate that the given flow can be emitted by this dialect.
   * Returns validation errors without attempting emission.
   */
  validate(flow: LiquidFlow): ValidationResult;

  /**
   * Escape an identifier (table name, column name) for this dialect.
   */
  escapeIdentifier(identifier: string): string;

  /**
   * Escape a string literal for this dialect.
   */
  escapeLiteral(value: string): string;
}
```

### Dialect Enumeration

```typescript
type Dialect =
  | 'duckdb'
  | 'trino'
  | 'postgresql'
  | 'clickhouse'
  | 'bigquery'
  | 'snowflake'
  | 'sqlite';
```

### Emitter Capabilities

```typescript
interface EmitterCapabilities {
  /** Supports window functions (ROW_NUMBER, LAG, etc.) */
  windowFunctions: boolean;

  /** Supports Common Table Expressions (WITH clause) */
  cte: boolean;

  /** Supports recursive CTEs */
  recursiveCte: boolean;

  /** Supports LATERAL joins */
  lateralJoin: boolean;

  /** Supports ARRAY types and functions */
  arrays: boolean;

  /** Supports JSON types and functions */
  json: boolean;

  /** Supports STRUCT/ROW types */
  structs: boolean;

  /** Supports UNNEST or equivalent array expansion */
  unnest: boolean;

  /** Supports QUALIFY clause for window function filtering */
  qualify: boolean;

  /** Supports PIVOT/UNPIVOT operations */
  pivot: boolean;

  /** Maximum identifier length (columns, tables) */
  maxIdentifierLength: number;

  /** Supported aggregate functions beyond SQL standard */
  aggregateFunctions: string[];

  /** Supported date/time functions */
  temporalFunctions: string[];

  /** Supports parameterized queries */
  parameterizedQueries: boolean;

  /** Supports EXPLAIN/ANALYZE */
  explainAnalyze: boolean;
}
```

---

## EmitResult Type

Every emission returns a structured result that captures success, failure, and diagnostic information:

```typescript
interface EmitResult {
  /**
   * Whether emission succeeded.
   * If false, `sql` may be undefined or partial.
   */
  success: boolean;

  /**
   * The generated SQL statement(s).
   * May contain multiple statements separated by semicolons.
   */
  sql?: string;

  /**
   * Error that prevented successful emission.
   * Only present when success is false.
   */
  error?: EmitError;

  /**
   * Non-fatal warnings about the emission.
   * The SQL is valid but may have performance or compatibility issues.
   */
  warnings: EmitWarning[];

  /**
   * Metadata about the emission process.
   */
  metadata: EmitMetadata;
}

interface EmitError {
  /** Error code for programmatic handling */
  code: EmitErrorCode;

  /** Human-readable error message */
  message: string;

  /** Location in the IR that caused the error */
  location?: IRLocation;

  /** Suggested fix or workaround */
  suggestion?: string;
}

type EmitErrorCode =
  | 'UNSUPPORTED_OPERATION'   // Operation not available in dialect
  | 'UNSUPPORTED_FUNCTION'    // Function not available in dialect
  | 'UNSUPPORTED_TYPE'        // Data type not available in dialect
  | 'IDENTIFIER_TOO_LONG'     // Identifier exceeds dialect limit
  | 'INVALID_SYNTAX'          // IR is malformed
  | 'CIRCULAR_DEPENDENCY'     // CTE references form a cycle
  | 'INTERNAL_ERROR';         // Bug in the emitter

interface EmitWarning {
  /** Warning code for programmatic handling */
  code: EmitWarningCode;

  /** Human-readable warning message */
  message: string;

  /** Location in the IR that triggered the warning */
  location?: IRLocation;
}

type EmitWarningCode =
  | 'PERFORMANCE_HINT'        // Alternative may be faster
  | 'DEPRECATED_FUNCTION'     // Function is deprecated in dialect
  | 'IMPLICIT_CAST'           // Type cast added implicitly
  | 'NULL_SAFETY'             // NULL handling may differ
  | 'APPROXIMATION';          // Exact semantics differ slightly

interface EmitMetadata {
  /** Dialect that was targeted */
  dialect: Dialect;

  /** Emitter version used */
  emitterVersion: string;

  /** Time taken to emit (milliseconds) */
  emitDurationMs: number;

  /** Number of SQL statements generated */
  statementCount: number;

  /** Estimated query complexity (for debugging) */
  complexity: 'simple' | 'moderate' | 'complex';

  /** Features used in the generated SQL */
  featuresUsed: string[];

  /** Tables referenced in the query */
  tablesReferenced: string[];

  /** Columns referenced in the query */
  columnsReferenced: string[];
}

interface IRLocation {
  /** Node ID in the IR graph */
  nodeId: string;

  /** Human-readable path to the node */
  path: string;
}
```

---

## Dialect Differences

The following table documents key syntactic and semantic differences across supported dialects:

### Date/Time Functions

| Operation | DuckDB | PostgreSQL | Trino | ClickHouse |
|-----------|--------|------------|-------|------------|
| Truncate to day | `DATE_TRUNC('day', ts)` | `DATE_TRUNC('day', ts)` | `DATE_TRUNC('day', ts)` | `toStartOfDay(ts)` |
| Truncate to month | `DATE_TRUNC('month', ts)` | `DATE_TRUNC('month', ts)` | `DATE_TRUNC('month', ts)` | `toStartOfMonth(ts)` |
| Truncate to year | `DATE_TRUNC('year', ts)` | `DATE_TRUNC('year', ts)` | `DATE_TRUNC('year', ts)` | `toStartOfYear(ts)` |
| Extract year | `EXTRACT(YEAR FROM ts)` | `EXTRACT(YEAR FROM ts)` | `EXTRACT(YEAR FROM ts)` | `toYear(ts)` |
| Current timestamp | `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` | `now()` |
| Date difference | `DATE_DIFF('day', a, b)` | `a - b` | `DATE_DIFF('day', a, b)` | `dateDiff('day', a, b)` |
| Add interval | `ts + INTERVAL '1 day'` | `ts + INTERVAL '1 day'` | `ts + INTERVAL '1' DAY` | `addDays(ts, 1)` |

### String Functions

| Operation | DuckDB | PostgreSQL | Trino | ClickHouse |
|-----------|--------|------------|-------|------------|
| Concatenate | `a \|\| b` or `CONCAT(a, b)` | `a \|\| b` or `CONCAT(a, b)` | `CONCAT(a, b)` | `concat(a, b)` |
| Pattern match | `col LIKE '%pat%'` | `col LIKE '%pat%'` | `col LIKE '%pat%'` | `col LIKE '%pat%'` |
| Regex match | `REGEXP_MATCHES(col, pat)` | `col ~ pat` | `REGEXP_LIKE(col, pat)` | `match(col, pat)` |
| Substring | `SUBSTRING(s, start, len)` | `SUBSTRING(s, start, len)` | `SUBSTR(s, start, len)` | `substring(s, start, len)` |
| Trim | `TRIM(s)` | `TRIM(s)` | `TRIM(s)` | `trimBoth(s)` |
| Length | `LENGTH(s)` | `LENGTH(s)` | `LENGTH(s)` | `length(s)` |
| Lower/Upper | `LOWER(s)` / `UPPER(s)` | `LOWER(s)` / `UPPER(s)` | `LOWER(s)` / `UPPER(s)` | `lower(s)` / `upper(s)` |

### NULL Handling

| Operation | DuckDB | PostgreSQL | Trino | ClickHouse |
|-----------|--------|------------|-------|------------|
| Coalesce | `COALESCE(a, b)` | `COALESCE(a, b)` | `COALESCE(a, b)` | `coalesce(a, b)` |
| If null | `IFNULL(a, b)` | `COALESCE(a, b)` | `COALESCE(a, b)` | `ifNull(a, b)` |
| Null-if | `NULLIF(a, b)` | `NULLIF(a, b)` | `NULLIF(a, b)` | `nullIf(a, b)` |
| Is null | `a IS NULL` | `a IS NULL` | `a IS NULL` | `isNull(a)` or `a IS NULL` |
| Is not null | `a IS NOT NULL` | `a IS NOT NULL` | `a IS NOT NULL` | `isNotNull(a)` or `a IS NOT NULL` |

### Type Casting

| Operation | DuckDB | PostgreSQL | Trino | ClickHouse |
|-----------|--------|------------|-------|------------|
| Cast syntax | `CAST(x AS type)` | `CAST(x AS type)` or `x::type` | `CAST(x AS type)` | `CAST(x AS type)` or `toType(x)` |
| To integer | `CAST(x AS INTEGER)` | `x::integer` | `CAST(x AS INTEGER)` | `toInt32(x)` |
| To string | `CAST(x AS VARCHAR)` | `x::text` | `CAST(x AS VARCHAR)` | `toString(x)` |
| To float | `CAST(x AS DOUBLE)` | `x::double precision` | `CAST(x AS DOUBLE)` | `toFloat64(x)` |
| To date | `CAST(x AS DATE)` | `x::date` | `CAST(x AS DATE)` | `toDate(x)` |
| To timestamp | `CAST(x AS TIMESTAMP)` | `x::timestamp` | `CAST(x AS TIMESTAMP)` | `toDateTime(x)` |

### Aggregate Functions

| Operation | DuckDB | PostgreSQL | Trino | ClickHouse |
|-----------|--------|------------|-------|------------|
| Approximate count | `APPROX_COUNT_DISTINCT(x)` | `(requires extension)` | `APPROX_DISTINCT(x)` | `uniq(x)` |
| Percentile | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` | `APPROX_PERCENTILE(x, 0.5)` | `quantile(0.5)(x)` |
| Array agg | `ARRAY_AGG(x)` | `ARRAY_AGG(x)` | `ARRAY_AGG(x)` | `groupArray(x)` |
| String agg | `STRING_AGG(x, ',')` | `STRING_AGG(x, ',')` | `LISTAGG(x, ',')` | `groupConcat(x)` |

### Special Syntax

| Feature | DuckDB | PostgreSQL | Trino | ClickHouse |
|---------|--------|------------|-------|------------|
| Identifier quote | `"identifier"` | `"identifier"` | `"identifier"` | `` `identifier` `` |
| String quote | `'string'` | `'string'` | `'string'` | `'string'` |
| Boolean | `TRUE` / `FALSE` | `TRUE` / `FALSE` | `TRUE` / `FALSE` | `1` / `0` |
| LIMIT syntax | `LIMIT n OFFSET m` | `LIMIT n OFFSET m` | `LIMIT n OFFSET m` | `LIMIT m, n` or `LIMIT n OFFSET m` |
| Sample | `USING SAMPLE 10%` | `TABLESAMPLE SYSTEM(10)` | `TABLESAMPLE SYSTEM(10)` | `SAMPLE 0.1` |

---

## Supported Emitters

### DuckDB (Primary)

**Role:** Primary emitter, PostgreSQL-compatible syntax, local development and testing.

**Capabilities:**
- Full window function support with QUALIFY
- CTEs including recursive
- Arrays, structs, and JSON
- LATERAL joins
- Excellent date/time functions

**Best For:**
- Local development and testing
- File-based data sources (Parquet, CSV, JSON)
- Embedded analytics
- CI/CD pipeline validation

```typescript
import { DuckDBEmitter } from '@liquid/connect';

const emitter = new DuckDBEmitter({
  // DuckDB-specific options
  useParquetOptimizations: true,
  enableSpatialExtension: false,
});

const result = emitter.emit(flow);
```

### Trino

**Role:** Distributed SQL engine for data lake analytics.

**Capabilities:**
- Full window function support
- CTEs (non-recursive preferred)
- Arrays and JSON
- LATERAL joins
- Connector-aware optimizations

**Best For:**
- Data lake queries (S3, HDFS)
- Federated queries across systems
- Large-scale analytics
- Interactive exploration

```typescript
import { TrinoEmitter } from '@liquid/connect';

const emitter = new TrinoEmitter({
  catalog: 'hive',
  schema: 'default',
  // Enable Trino-specific optimizations
  usePushdown: true,
});

const result = emitter.emit(flow);
```

### PostgreSQL

**Role:** Direct connection to PostgreSQL databases.

**Capabilities:**
- Full window function support
- CTEs including recursive
- Arrays and JSON (JSONB)
- LATERAL joins
- Rich extension ecosystem

**Best For:**
- OLTP + analytics hybrid
- PostGIS spatial queries
- TimescaleDB time-series
- Direct database access

```typescript
import { PostgreSQLEmitter } from '@liquid/connect';

const emitter = new PostgreSQLEmitter({
  version: 15, // Target PostgreSQL version
  useJsonb: true,
  // Extension-aware emission
  extensions: ['postgis', 'timescaledb'],
});

const result = emitter.emit(flow);
```

### ClickHouse

**Role:** OLAP database optimized for real-time analytics.

**Capabilities:**
- Limited window functions (improving)
- CTEs supported
- Specialized array functions
- Approximate aggregations
- Materialized views

**Best For:**
- Real-time analytics dashboards
- Time-series data
- Log and event analysis
- High-throughput ingestion

```typescript
import { ClickHouseEmitter } from '@liquid/connect';

const emitter = new ClickHouseEmitter({
  version: '23.8',
  // ClickHouse-specific syntax
  useIfFunctions: true, // Use if() instead of CASE
  useArrayJoin: true,   // Use arrayJoin instead of UNNEST
});

const result = emitter.emit(flow);
```

---

## Parity Testing

Parity testing ensures all emitters produce semantically equivalent results for the same IR input. This is critical for LiquidConnect's universal promise.

### Testing Strategy

```typescript
interface ParityTestCase {
  /** Unique identifier for the test case */
  id: string;

  /** Human-readable description */
  description: string;

  /** The LiquidFlow IR to test */
  flow: LiquidFlow;

  /** Test data to load into each database */
  fixtures: TestFixture[];

  /** Expected result (dialect-agnostic) */
  expectedResult: ExpectedResult;

  /** Dialects to test (default: all) */
  dialects?: Dialect[];

  /** Tolerance for numeric comparisons */
  numericTolerance?: number;

  /** Whether row order matters */
  orderMatters?: boolean;
}

interface ParityTestRunner {
  /**
   * Run a single parity test across all specified dialects.
   */
  runTest(testCase: ParityTestCase): Promise<ParityTestResult>;

  /**
   * Run all parity tests in a suite.
   */
  runSuite(suite: ParityTestSuite): Promise<ParitySuiteResult>;

  /**
   * Compare results across dialects.
   */
  compareResults(results: Map<Dialect, QueryResult>): ComparisonResult;
}
```

### Parity Test Execution

```
┌────────────────────────────────────────────────────────────────┐
│                     Parity Test Runner                         │
├────────────────────────────────────────────────────────────────┤
│  1. Load test fixtures into each database                      │
│  2. Emit SQL for each dialect                                  │
│  3. Execute SQL in each database                               │
│  4. Normalize results (types, ordering, nulls)                 │
│  5. Compare results across dialects                            │
│  6. Report discrepancies                                       │
└────────────────────────────────────────────────────────────────┘
```

### Result Normalization

Results must be normalized before comparison to handle dialect differences:

```typescript
interface ResultNormalizer {
  /**
   * Normalize query results for cross-dialect comparison.
   */
  normalize(result: QueryResult, dialect: Dialect): NormalizedResult;
}

interface NormalizedResult {
  /** Column names (lowercased, trimmed) */
  columns: string[];

  /** Row data with normalized types */
  rows: NormalizedRow[];

  /** Metadata about the result */
  metadata: {
    rowCount: number;
    columnTypes: Map<string, NormalizedType>;
  };
}

type NormalizedType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'array'
  | 'object'
  | 'null';
```

### Normalization Rules

| Aspect | Normalization Rule |
|--------|-------------------|
| Column names | Lowercase, trim whitespace |
| String values | UTF-8 normalized, trim trailing whitespace |
| Numeric values | Convert to IEEE 754 double, compare with tolerance |
| Boolean values | Convert to `true` / `false` |
| Date values | Convert to ISO 8601 date string (YYYY-MM-DD) |
| Timestamp values | Convert to ISO 8601 with milliseconds, UTC |
| NULL values | Unified `null` representation |
| Array values | Recursively normalize elements |
| Row ordering | Sort by all columns unless `orderMatters` is true |

### Handling Known Differences

Some differences are expected and acceptable:

```typescript
interface KnownDifference {
  /** Identifier for this known difference */
  id: string;

  /** Why this difference exists */
  reason: string;

  /** Which dialects are affected */
  dialects: Dialect[];

  /** How to detect this difference */
  detector: (a: any, b: any) => boolean;

  /** Whether this is acceptable */
  acceptable: boolean;
}

const KNOWN_DIFFERENCES: KnownDifference[] = [
  {
    id: 'float-precision',
    reason: 'Floating point precision varies across systems',
    dialects: ['all'],
    detector: (a, b) => Math.abs(a - b) < 1e-10,
    acceptable: true,
  },
  {
    id: 'timestamp-precision',
    reason: 'ClickHouse has second precision by default',
    dialects: ['clickhouse'],
    detector: (a, b) => /* timestamp comparison logic */,
    acceptable: true,
  },
];
```

### Continuous Integration

```yaml
# .github/workflows/parity-tests.yml
name: Emitter Parity Tests

on:
  push:
    paths:
      - 'packages/liquid-connect/src/emitters/**'
  pull_request:
    paths:
      - 'packages/liquid-connect/src/emitters/**'

jobs:
  parity:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
      clickhouse:
        image: clickhouse/clickhouse-server:23.8
      trino:
        image: trinodb/trino:latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup DuckDB
        run: |
          pip install duckdb

      - name: Run Parity Tests
        run: |
          npm run test:parity

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: parity-results
          path: coverage/parity/
```

---

## Adding New Emitters

Follow this step-by-step guide to add support for a new SQL dialect.

### Step 1: Research the Dialect

Before writing code, document the dialect's characteristics:

```markdown
# Dialect Research: [Name]

## Basic Information
- Official documentation URL:
- Version targeting:
- SQL standard compliance level:

## Identifier Quoting
- Quote character:
- Case sensitivity:
- Maximum identifier length:

## Type System
- Integer types:
- Float types:
- String types:
- Date/time types:
- Boolean representation:
- Array support:
- JSON support:

## Syntax Variations
- CTE support:
- Window function support:
- QUALIFY clause:
- LATERAL join:
- UNNEST/array expansion:

## Function Mapping
- Date truncation:
- String concatenation:
- NULL handling:
- Type casting:
- Aggregate functions:
```

### Step 2: Define Capabilities

Create the capabilities definition:

```typescript
// src/emitters/[dialect]/capabilities.ts

import { EmitterCapabilities } from '../types';

export const MY_DIALECT_CAPABILITIES: EmitterCapabilities = {
  windowFunctions: true,
  cte: true,
  recursiveCte: false,
  lateralJoin: false,
  arrays: true,
  json: true,
  structs: false,
  unnest: true,
  qualify: false,
  pivot: false,
  maxIdentifierLength: 128,
  aggregateFunctions: [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    // dialect-specific aggregates
  ],
  temporalFunctions: [
    'DATE_TRUNC', 'EXTRACT', 'DATE_ADD',
    // dialect-specific functions
  ],
  parameterizedQueries: true,
  explainAnalyze: true,
};
```

### Step 3: Implement the Base Emitter

```typescript
// src/emitters/[dialect]/emitter.ts

import { Emitter, EmitResult, LiquidFlow, Dialect } from '../types';
import { MY_DIALECT_CAPABILITIES } from './capabilities';
import { BaseEmitter } from '../base';

export class MyDialectEmitter extends BaseEmitter implements Emitter {
  readonly dialect: Dialect = 'mydialect';
  readonly capabilities = MY_DIALECT_CAPABILITIES;

  constructor(private options: MyDialectOptions = {}) {
    super();
  }

  emit(flow: LiquidFlow): EmitResult {
    const startTime = Date.now();
    const warnings: EmitWarning[] = [];

    try {
      // Validate before emission
      const validation = this.validate(flow);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors[0],
          warnings: [],
          metadata: this.buildMetadata(startTime, flow),
        };
      }

      // Emit SQL
      const sql = this.emitFlow(flow, warnings);

      return {
        success: true,
        sql,
        warnings,
        metadata: this.buildMetadata(startTime, flow),
      };
    } catch (error) {
      return {
        success: false,
        error: this.wrapError(error),
        warnings,
        metadata: this.buildMetadata(startTime, flow),
      };
    }
  }

  // Implement dialect-specific escaping
  escapeIdentifier(identifier: string): string {
    // Example: double-quote escaping
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  escapeLiteral(value: string): string {
    // Example: single-quote escaping
    return `'${value.replace(/'/g, "''")}'`;
  }

  // Override specific emission methods
  protected emitDateTrunc(unit: string, expr: string): string {
    // Dialect-specific date truncation
    return `DATE_TRUNC('${unit}', ${expr})`;
  }

  protected emitCoalesce(exprs: string[]): string {
    return `COALESCE(${exprs.join(', ')})`;
  }

  // ... more dialect-specific overrides
}
```

### Step 4: Implement Function Mappings

```typescript
// src/emitters/[dialect]/functions.ts

import { FunctionMapper } from '../types';

export const FUNCTION_MAP: FunctionMapper = {
  // Scalar functions
  'lower': (args) => `LOWER(${args[0]})`,
  'upper': (args) => `UPPER(${args[0]})`,
  'concat': (args) => args.join(' || '),

  // Aggregate functions
  'count_distinct': (args) => `COUNT(DISTINCT ${args[0]})`,
  'array_agg': (args) => `ARRAY_AGG(${args[0]})`,

  // Date functions
  'date_trunc': (args) => `DATE_TRUNC(${args[0]}, ${args[1]})`,
  'date_diff': (args) => `DATE_DIFF(${args[0]}, ${args[1]}, ${args[2]})`,

  // Type conversions
  'to_string': (args) => `CAST(${args[0]} AS VARCHAR)`,
  'to_integer': (args) => `CAST(${args[0]} AS INTEGER)`,
};
```

### Step 5: Add Parity Tests

```typescript
// src/emitters/[dialect]/__tests__/parity.test.ts

import { ParityTestRunner } from '../../../testing';
import { MyDialectEmitter } from '../emitter';
import { CORE_PARITY_TESTS } from '../../../testing/core-tests';

describe('MyDialect Parity', () => {
  const runner = new ParityTestRunner({
    emitters: {
      mydialect: new MyDialectEmitter(),
      duckdb: new DuckDBEmitter(), // Reference implementation
    },
  });

  CORE_PARITY_TESTS.forEach((testCase) => {
    it(`${testCase.id}: ${testCase.description}`, async () => {
      const result = await runner.runTest(testCase);
      expect(result.isParity).toBe(true);
    });
  });
});
```

### Step 6: Register the Emitter

```typescript
// src/emitters/index.ts

import { MyDialectEmitter } from './mydialect';

export const EMITTER_REGISTRY: Record<Dialect, EmitterConstructor> = {
  duckdb: DuckDBEmitter,
  trino: TrinoEmitter,
  postgresql: PostgreSQLEmitter,
  clickhouse: ClickHouseEmitter,
  mydialect: MyDialectEmitter, // Add new emitter
};

export function createEmitter(dialect: Dialect, options?: any): Emitter {
  const Constructor = EMITTER_REGISTRY[dialect];
  if (!Constructor) {
    throw new Error(`Unknown dialect: ${dialect}`);
  }
  return new Constructor(options);
}
```

### Step 7: Document the Emitter

Add documentation to this specification:

1. Update the Dialect Differences tables
2. Add a section under Supported Emitters
3. Document any dialect-specific limitations or features
4. Add integration test instructions

### Emitter Checklist

Before submitting a new emitter, verify:

- [ ] All core IR nodes can be emitted
- [ ] Identifier escaping is correct
- [ ] String literal escaping is correct
- [ ] Parity tests pass against DuckDB reference
- [ ] Known differences are documented
- [ ] Capabilities are accurately defined
- [ ] Error messages are helpful
- [ ] Performance is acceptable for large IR graphs
- [ ] Documentation is complete

---

## Architecture Notes

### Why Emitters, Not Transpilation

Emitters perform one-way transformation from IR to SQL. This is intentional:

1. **Simplicity:** No need to handle arbitrary SQL input
2. **Correctness:** IR is validated before emission
3. **Optimization:** Emitters can apply dialect-specific optimizations
4. **Consistency:** Same IR always produces predictable SQL

### Emitter Composition

Emitters can be composed for complex scenarios:

```typescript
// Multi-dialect emission for hybrid deployments
const results = await Promise.all([
  duckdbEmitter.emit(flow),    // For testing
  trinoEmitter.emit(flow),     // For production
  postgresEmitter.emit(flow),  // For caching layer
]);
```

### Future Directions

1. **Cost-based optimization:** Use database statistics to optimize emitted SQL
2. **Pushdown hints:** Emit hints for filter/projection pushdown
3. **Adaptive emission:** Learn from query feedback to improve emission
4. **Streaming support:** Emit for streaming SQL engines (Flink SQL, ksqlDB)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial specification |
