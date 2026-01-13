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

describe('Aggregation Parity - All Types × All Dialects', () => {
  // Test matrix: 6 aggregation types × 3 dialects = 18 tests
  for (const aggregation of AGGREGATION_TYPES) {
    for (const dialect of DIALECTS) {
      it(`${aggregation} on ${dialect} generates valid SQL`, () => {
        const flow = createTestFlow(aggregation);
        const result = emit(flow, dialect);

        // Must generate SQL
        expect(result.sql).toBeTruthy();
        expect(result.sql).toContain('SELECT');
        expect(result.sql).toContain('FROM');

        // Must contain the aggregation function
        if (aggregation === 'COUNT_DISTINCT') {
          // COUNT_DISTINCT must use COUNT(DISTINCT ...) syntax, not COUNT_DISTINCT()
          expect(result.sql).toMatch(/COUNT\s*\(\s*DISTINCT\s+/i);
          expect(result.sql).not.toMatch(/COUNT_DISTINCT\s*\(/i);
        } else {
          // Other aggregations should appear as function calls
          expect(result.sql.toUpperCase()).toContain(aggregation);
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
