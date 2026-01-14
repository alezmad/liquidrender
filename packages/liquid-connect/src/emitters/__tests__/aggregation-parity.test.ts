// Aggregation Parity Tests - All Types × All Dialects
// Production-ready test matrix ensuring all aggregations work correctly across all databases

import { describe, it, expect } from 'vitest';
import { emit, type Dialect } from '../index';
import type { LiquidFlow } from '../../liquidflow/types';
import type { AggregationType } from '../../types';

// All aggregation types from the type definition
const AGGREGATION_TYPES: AggregationType[] = [
  'SUM',
  'COUNT',
  'COUNT_DISTINCT',
  'AVG',
  'MIN',
  'MAX',
  // v2 aggregations
  'MEDIAN',
  'PERCENTILE_25',
  'PERCENTILE_75',
  'PERCENTILE_90',
  'PERCENTILE_95',
  'PERCENTILE_99',
  'STDDEV',
  'VARIANCE',
  'ARRAY_AGG',
  'STRING_AGG',
  // v2.1 aggregations
  'COUNT_IF',
  'SUM_IF',
  'AVG_IF',
  'BOOL_AND',
  'BOOL_OR',
  'EVERY',
  'ANY',
  'FIRST_VALUE',
  'LAST_VALUE',
  'RANK',
  'DENSE_RANK',
  'ROW_NUMBER',
  'NTILE',
];

// All supported dialects
const DIALECTS: Dialect[] = ['postgres', 'duckdb', 'trino'];

/**
 * Create a test LiquidFlow for a specific aggregation type
 */
function createTestFlow(aggregation: AggregationType): LiquidFlow {
  return {
    version: '0.1.0',
    type: 'metric',
    sources: [{ table: 'orders', alias: 'o' }],
    joins: [],
    metrics: [
      {
        ref: 'test_metric',
        alias: 'test_metric',
        expression: 'amount',
        aggregation,
        sourceEntity: 'orders',
        derived: false,
      },
    ],
  };
}

// Mapping of aggregation types to expected SQL patterns per dialect
// Some dialects use different function names (e.g., MEDIAN → PERCENTILE_CONT on PostgreSQL)
const EXPECTED_SQL_PATTERNS: Record<AggregationType, Record<Dialect, RegExp | null>> = {
  SUM: { postgres: /SUM\s*\(/i, duckdb: /SUM\s*\(/i, trino: /SUM\s*\(/i },
  COUNT: { postgres: /COUNT\s*\(/i, duckdb: /COUNT\s*\(/i, trino: /COUNT\s*\(/i },
  COUNT_DISTINCT: { postgres: /COUNT\s*\(\s*DISTINCT/i, duckdb: /COUNT\s*\(\s*DISTINCT/i, trino: /COUNT\s*\(\s*DISTINCT/i },
  AVG: { postgres: /AVG\s*\(/i, duckdb: /AVG\s*\(/i, trino: /AVG\s*\(/i },
  MIN: { postgres: /MIN\s*\(/i, duckdb: /MIN\s*\(/i, trino: /MIN\s*\(/i },
  MAX: { postgres: /MAX\s*\(/i, duckdb: /MAX\s*\(/i, trino: /MAX\s*\(/i },
  // MEDIAN uses PERCENTILE_CONT(0.5) on PostgreSQL, native MEDIAN on DuckDB, not supported on Trino
  MEDIAN: { postgres: /PERCENTILE_CONT\s*\(\s*0\.5\s*\)/i, duckdb: /MEDIAN\s*\(/i, trino: null },
  // PERCENTILE_* all use PERCENTILE_CONT with the appropriate value
  PERCENTILE_25: { postgres: /PERCENTILE_CONT\s*\(\s*0\.25\s*\)/i, duckdb: /PERCENTILE_CONT\s*\(\s*0\.25\s*\)/i, trino: null },
  PERCENTILE_75: { postgres: /PERCENTILE_CONT\s*\(\s*0\.75\s*\)/i, duckdb: /PERCENTILE_CONT\s*\(\s*0\.75\s*\)/i, trino: null },
  PERCENTILE_90: { postgres: /PERCENTILE_CONT\s*\(\s*0\.9\s*\)/i, duckdb: /PERCENTILE_CONT\s*\(\s*0\.9\s*\)/i, trino: null },
  PERCENTILE_95: { postgres: /PERCENTILE_CONT\s*\(\s*0\.95\s*\)/i, duckdb: /PERCENTILE_CONT\s*\(\s*0\.95\s*\)/i, trino: null },
  PERCENTILE_99: { postgres: /PERCENTILE_CONT\s*\(\s*0\.99\s*\)/i, duckdb: /PERCENTILE_CONT\s*\(\s*0\.99\s*\)/i, trino: null },
  // STDDEV uses STDDEV_SAMP on PostgreSQL/DuckDB
  STDDEV: { postgres: /STDDEV_SAMP\s*\(/i, duckdb: /STDDEV_SAMP\s*\(/i, trino: /STDDEV_SAMP\s*\(/i },
  // VARIANCE uses VAR_SAMP on PostgreSQL/DuckDB
  VARIANCE: { postgres: /VAR_SAMP\s*\(/i, duckdb: /VAR_SAMP\s*\(/i, trino: /VAR_SAMP\s*\(/i },
  ARRAY_AGG: { postgres: /ARRAY_AGG\s*\(/i, duckdb: /ARRAY_AGG\s*\(/i, trino: /ARRAY_AGG\s*\(/i },
  STRING_AGG: { postgres: /STRING_AGG\s*\(/i, duckdb: /STRING_AGG\s*\(/i, trino: /LISTAGG\s*\(/i },
  // v2.1 conditional aggregations (use CASE WHEN internally)
  COUNT_IF: { postgres: /SUM\s*\(\s*CASE\s+WHEN/i, duckdb: /SUM\s*\(\s*CASE\s+WHEN/i, trino: /SUM\s*\(\s*CASE\s+WHEN/i },
  SUM_IF: { postgres: /SUM\s*\(\s*CASE\s+WHEN/i, duckdb: /SUM\s*\(\s*CASE\s+WHEN/i, trino: /SUM\s*\(\s*CASE\s+WHEN/i },
  AVG_IF: { postgres: /AVG\s*\(\s*CASE\s+WHEN/i, duckdb: /AVG\s*\(\s*CASE\s+WHEN/i, trino: /AVG\s*\(\s*CASE\s+WHEN/i },
  // v2.1 boolean aggregations
  BOOL_AND: { postgres: /BOOL_AND\s*\(/i, duckdb: /BOOL_AND\s*\(/i, trino: /BOOL_AND\s*\(/i },
  BOOL_OR: { postgres: /BOOL_OR\s*\(/i, duckdb: /BOOL_OR\s*\(/i, trino: /BOOL_OR\s*\(/i },
  EVERY: { postgres: /EVERY\s*\(/i, duckdb: /BOOL_AND\s*\(/i, trino: /EVERY\s*\(/i },
  ANY: { postgres: /ANY\s*\(/i, duckdb: /BOOL_OR\s*\(/i, trino: /ANY_VALUE\s*\(/i },
  // v2.1 positional aggregations (window functions)
  FIRST_VALUE: { postgres: /FIRST_VALUE\s*\(/i, duckdb: /FIRST_VALUE\s*\(/i, trino: /FIRST_VALUE\s*\(/i },
  LAST_VALUE: { postgres: /LAST_VALUE\s*\(/i, duckdb: /LAST_VALUE\s*\(/i, trino: /LAST_VALUE\s*\(/i },
  // v2.1 ranking functions (window functions)
  RANK: { postgres: /RANK\s*\(\s*\)/i, duckdb: /RANK\s*\(\s*\)/i, trino: /RANK\s*\(\s*\)/i },
  DENSE_RANK: { postgres: /DENSE_RANK\s*\(\s*\)/i, duckdb: /DENSE_RANK\s*\(\s*\)/i, trino: /DENSE_RANK\s*\(\s*\)/i },
  ROW_NUMBER: { postgres: /ROW_NUMBER\s*\(\s*\)/i, duckdb: /ROW_NUMBER\s*\(\s*\)/i, trino: /ROW_NUMBER\s*\(\s*\)/i },
  NTILE: { postgres: /NTILE\s*\(/i, duckdb: /NTILE\s*\(/i, trino: /NTILE\s*\(/i },
};

describe('Aggregation Parity - All Types × All Dialects', () => {
  // Test matrix: 16 aggregation types × 3 dialects = 48 tests
  for (const aggregation of AGGREGATION_TYPES) {
    for (const dialect of DIALECTS) {
      const expectedPattern = EXPECTED_SQL_PATTERNS[aggregation][dialect];

      if (expectedPattern === null) {
        // Skip unsupported aggregations on certain dialects
        it.skip(`${aggregation} on ${dialect} (not supported)`, () => {});
        continue;
      }

      it(`${aggregation} on ${dialect} generates valid SQL`, () => {
        const flow = createTestFlow(aggregation);
        const result = emit(flow, dialect);

        // Must generate SQL
        expect(result.sql).toBeTruthy();
        expect(result.sql).toContain('SELECT');
        expect(result.sql).toContain('FROM');

        // Must contain the expected SQL pattern for this aggregation/dialect
        expect(result.sql).toMatch(expectedPattern);

        // COUNT_DISTINCT must NOT use invalid syntax
        if (aggregation === 'COUNT_DISTINCT') {
          expect(result.sql).not.toMatch(/COUNT_DISTINCT\s*\(/i);
        }
      });
    }
  }
});

describe('COUNT_DISTINCT SQL Syntax Validation', () => {
  // This is the critical bug that was fixed - verify it never regresses
  for (const dialect of DIALECTS) {
    it(`${dialect}: COUNT_DISTINCT uses COUNT(DISTINCT ...) not COUNT_DISTINCT()`, () => {
      const flow = createTestFlow('COUNT_DISTINCT');
      const result = emit(flow, dialect);

      // Must use valid SQL syntax: COUNT(DISTINCT field)
      expect(result.sql).toMatch(/COUNT\s*\(\s*DISTINCT\s+/i);

      // Must NOT use invalid syntax: COUNT_DISTINCT(field)
      expect(result.sql).not.toMatch(/COUNT_DISTINCT\s*\(/i);
    });
  }
});

describe('Aggregation Function SQL Output', () => {
  it('SUM generates SUM(expression)', () => {
    const result = emit(createTestFlow('SUM'), 'postgres');
    expect(result.sql).toMatch(/SUM\s*\(\s*amount\s*\)/i);
  });

  it('AVG generates AVG(expression)', () => {
    const result = emit(createTestFlow('AVG'), 'postgres');
    expect(result.sql).toMatch(/AVG\s*\(\s*amount\s*\)/i);
  });

  it('COUNT generates COUNT(expression)', () => {
    const result = emit(createTestFlow('COUNT'), 'postgres');
    expect(result.sql).toMatch(/COUNT\s*\(\s*amount\s*\)/i);
  });

  it('MIN generates MIN(expression)', () => {
    const result = emit(createTestFlow('MIN'), 'postgres');
    expect(result.sql).toMatch(/MIN\s*\(\s*amount\s*\)/i);
  });

  it('MAX generates MAX(expression)', () => {
    const result = emit(createTestFlow('MAX'), 'postgres');
    expect(result.sql).toMatch(/MAX\s*\(\s*amount\s*\)/i);
  });
});

describe('Dialect-Specific COUNT_DISTINCT', () => {
  it('PostgreSQL uses COUNT(DISTINCT field)', () => {
    const result = emit(createTestFlow('COUNT_DISTINCT'), 'postgres');
    expect(result.sql).toContain('COUNT(DISTINCT amount)');
  });

  it('DuckDB uses COUNT(DISTINCT field)', () => {
    const result = emit(createTestFlow('COUNT_DISTINCT'), 'duckdb');
    expect(result.sql).toContain('COUNT(DISTINCT amount)');
  });

  it('Trino uses COUNT(DISTINCT field)', () => {
    const result = emit(createTestFlow('COUNT_DISTINCT'), 'trino');
    expect(result.sql).toContain('COUNT(DISTINCT amount)');
  });
});

describe('Type Safety - Exhaustive Coverage', () => {
  // This test verifies that all AggregationType values are handled
  // If a new aggregation type is added to the union, this test will catch it
  it('all AggregationType values are covered', () => {
    // This function should compile without errors
    // TypeScript will fail at compile time if we miss a case
    function testAllAggregations(agg: AggregationType): boolean {
      switch (agg) {
        case 'SUM':
        case 'COUNT':
        case 'COUNT_DISTINCT':
        case 'AVG':
        case 'MIN':
        case 'MAX':
        // v2 aggregations
        case 'MEDIAN':
        case 'PERCENTILE_25':
        case 'PERCENTILE_75':
        case 'PERCENTILE_90':
        case 'PERCENTILE_95':
        case 'PERCENTILE_99':
        case 'STDDEV':
        case 'VARIANCE':
        case 'ARRAY_AGG':
        case 'STRING_AGG':
        // v2.1 conditional aggregations
        case 'COUNT_IF':
        case 'SUM_IF':
        case 'AVG_IF':
        // v2.1 boolean aggregations
        case 'BOOL_AND':
        case 'BOOL_OR':
        case 'EVERY':
        case 'ANY':
        // v2.1 positional aggregations
        case 'FIRST_VALUE':
        case 'LAST_VALUE':
        // v2.1 ranking functions
        case 'RANK':
        case 'DENSE_RANK':
        case 'ROW_NUMBER':
        case 'NTILE':
          return true;
        default:
          // This line should never be reached if all cases are handled
          // TypeScript will error here if a new case is added to AggregationType
          const _exhaustiveCheck: never = agg;
          return _exhaustiveCheck;
      }
    }

    // Verify all known types work
    for (const agg of AGGREGATION_TYPES) {
      expect(testAllAggregations(agg)).toBe(true);
    }
  });
});
