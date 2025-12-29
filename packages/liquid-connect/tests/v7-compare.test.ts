// v7 Comparison Column Tests
// Comprehensive tests for v7 comparison features

import { describe, test, expect } from 'vitest';
import { parseToAST } from '../src/compiler';
import type { CompareNode, PeriodNode, DurationNode, TimeRangeNode } from '../src/compiler/ast';

// =============================================================================
// BASIC COMPARISON PARSING
// =============================================================================

describe('Basic Comparison Parsing', () => {
  test('Q @revenue ~M vs ~M-1 parses compare node', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-1');
    expect(ast.compare).toBeDefined();
    expect(ast.compare?.kind).toBe('Compare');
  });

  test('compare has period property', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-1');
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    expect(compare.period).toBeDefined();
    expect(compare.period.kind).toBe('Period');
    const period = compare.period as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(-1);
  });

  test('vs ~Q-1 quarter comparison', () => {
    const ast = parseToAST('Q @revenue ~Q vs ~Q-1');
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;
    expect(period.kind).toBe('Period');
    expect(period.unit).toBe('Q');
    expect(period.offset).toBe(-1);
  });

  test('vs ~Y-1 year comparison', () => {
    const ast = parseToAST('Q @revenue ~Y vs ~Y-1');
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;
    expect(period.kind).toBe('Period');
    expect(period.unit).toBe('Y');
    expect(period.offset).toBe(-1);
  });

  test('vs ~W-1 week comparison', () => {
    const ast = parseToAST('Q @revenue ~W vs ~W-1');
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;
    expect(period.kind).toBe('Period');
    expect(period.unit).toBe('W');
    expect(period.offset).toBe(-1);
  });

  test('vs ~D-1 day comparison', () => {
    const ast = parseToAST('Q @revenue ~D vs ~D-1');
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;
    expect(period.kind).toBe('Period');
    expect(period.unit).toBe('D');
    expect(period.offset).toBe(-1);
  });

  test('compare with deeper offset: ~M-3', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-3');
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(-3);
  });

  test('compare with ~Q-4 (4 quarters back)', () => {
    const ast = parseToAST('Q @revenue ~Q vs ~Q-4');
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;
    expect(period.unit).toBe('Q');
    expect(period.offset).toBe(-4);
  });
});

// =============================================================================
// COMPARISON WITH V7 TIME SYNTAX
// =============================================================================

describe('Comparison with v7 Time Syntax', () => {
  test('~last_month vs ~M-2 alias with comparison', () => {
    const ast = parseToAST('Q @revenue ~last_month vs ~M-2');

    // Base period should be last_month (converted to Period)
    expect(ast.time).toBeDefined();
    expect(ast.time?.kind).toBe('Period');
    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.unit).toBe('M');
    expect(basePeriod.offset).toBe(-1);

    // Compare period should be M-2
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.unit).toBe('M');
    expect(comparePeriod.offset).toBe(-2);
  });

  test('~30d vs ~P30d duration comparison', () => {
    const ast = parseToAST('Q @revenue ~30d vs ~P30d');

    // Base period should be 30d duration (v7 syntax without P)
    expect(ast.time).toBeDefined();
    expect(ast.time?.kind).toBe('Duration');
    const baseDuration = ast.time as DurationNode;
    expect(baseDuration.amount).toBe(30);
    expect(baseDuration.unit).toBe('d');

    // Compare period should be P30d duration (classic syntax with P)
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    expect(compare.period.kind).toBe('Duration');
    const compareDuration = compare.period as DurationNode;
    expect(compareDuration.amount).toBe(30);
    expect(compareDuration.unit).toBe('d');
  });

  test('~this_quarter vs ~last_quarter alias to alias', () => {
    const ast = parseToAST('Q @revenue ~this_quarter vs ~last_quarter');

    // Base period should be this_quarter
    expect(ast.time).toBeDefined();
    expect(ast.time?.kind).toBe('Period');
    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.unit).toBe('Q');
    expect(basePeriod.offset).toBe(0);

    // Compare period should be last_quarter
    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.kind).toBe('Period');
    expect(comparePeriod.unit).toBe('Q');
    expect(comparePeriod.offset).toBe(-1);
  });

  test('~this_month vs ~last_month alias comparison', () => {
    const ast = parseToAST('Q @revenue ~this_month vs ~last_month');

    expect(ast.time).toBeDefined();
    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.unit).toBe('M');
    expect(basePeriod.offset).toBe(0);

    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.unit).toBe('M');
    expect(comparePeriod.offset).toBe(-1);
  });

  test('~this_year vs ~last_year alias comparison', () => {
    const ast = parseToAST('Q @revenue ~this_year vs ~last_year');

    expect(ast.time).toBeDefined();
    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.unit).toBe('Y');
    expect(basePeriod.offset).toBe(0);

    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.unit).toBe('Y');
    expect(comparePeriod.offset).toBe(-1);
  });

  test('~this_week vs ~last_week alias comparison', () => {
    const ast = parseToAST('Q @revenue ~this_week vs ~last_week');

    expect(ast.time).toBeDefined();
    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.unit).toBe('W');
    expect(basePeriod.offset).toBe(0);

    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.unit).toBe('W');
    expect(comparePeriod.offset).toBe(-1);
  });

  test('~today vs ~yesterday alias comparison', () => {
    const ast = parseToAST('Q @revenue ~today vs ~yesterday');

    expect(ast.time).toBeDefined();
    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.unit).toBe('D');
    expect(basePeriod.offset).toBe(0);

    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.unit).toBe('D');
    expect(comparePeriod.offset).toBe(-1);
  });

  test('~7d vs ~14d duration comparison', () => {
    const ast = parseToAST('Q @revenue ~7d vs ~14d');

    expect(ast.time).toBeDefined();
    const baseDuration = ast.time as DurationNode;
    expect(baseDuration.amount).toBe(7);
    expect(baseDuration.unit).toBe('d');

    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const compareDuration = compare.period as DurationNode;
    expect(compareDuration.amount).toBe(14);
    expect(compareDuration.unit).toBe('d');
  });

  test('~6M vs ~12M month duration comparison', () => {
    const ast = parseToAST('Q @revenue ~6M vs ~12M');

    expect(ast.time).toBeDefined();
    const baseDuration = ast.time as DurationNode;
    expect(baseDuration.amount).toBe(6);

    expect(ast.compare).toBeDefined();
    const compare = ast.compare as CompareNode;
    const compareDuration = compare.period as DurationNode;
    expect(compareDuration.amount).toBe(12);
  });
});

// =============================================================================
// COMPARISON COLUMN NAMING (V7)
// =============================================================================

describe('Comparison Column Naming (v7)', () => {
  // Note: These tests verify the AST structure. The resolver generates the actual
  // column names (_compare, _delta, _pct) based on the CompareNode.
  // Full resolver tests would require a mock semantic layer.

  test('CompareNode has correct structure for column name generation', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-1');
    expect(ast.compare).toBeDefined();
    expect(ast.compare?.kind).toBe('Compare');
    expect(ast.compare?.period).toBeDefined();

    // The CompareNode provides the basis for generating v7 column names:
    // - _compare: the comparison period value
    // - _delta: difference between base and compare
    // - _pct: percentage change
  });

  test('CompareNode period has offset for computing delta', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-1');
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;

    // The offset tells the resolver how far back to look
    expect(period.offset).toBe(-1);
    // This enables computation of _delta and _pct columns
  });

  test('CompareNode with quarter offset', () => {
    const ast = parseToAST('Q @revenue ~Q vs ~Q-4');
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;

    // Quarter-over-quarter comparison 4 quarters back
    expect(period.unit).toBe('Q');
    expect(period.offset).toBe(-4);
  });

  test('CompareNode with year offset', () => {
    const ast = parseToAST('Q @revenue ~Y vs ~Y-1');
    const compare = ast.compare as CompareNode;
    const period = compare.period as PeriodNode;

    // Year-over-year comparison
    expect(period.unit).toBe('Y');
    expect(period.offset).toBe(-1);
  });

  test('CompareNode with duration provides absolute offset', () => {
    const ast = parseToAST('Q @revenue ~30d vs ~60d');
    const compare = ast.compare as CompareNode;
    const duration = compare.period as DurationNode;

    // Duration comparison - 60 days for the compare period
    expect(duration.kind).toBe('Duration');
    expect(duration.amount).toBe(60);
    expect(duration.unit).toBe('d');
  });
});

// =============================================================================
// COMPARISON WITH OTHER QUERY FEATURES
// =============================================================================

describe('Comparison with Other Query Features', () => {
  test('comparison with dimensions', () => {
    const ast = parseToAST('Q @revenue #region ~M vs ~M-1');

    expect(ast.metrics).toHaveLength(1);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.time).toBeDefined();
    expect(ast.compare).toBeDefined();
  });

  test('comparison with multiple metrics', () => {
    const ast = parseToAST('Q @revenue @orders ~Q vs ~Q-1');

    expect(ast.metrics).toHaveLength(2);
    expect(ast.compare).toBeDefined();
  });

  test('comparison with filters', () => {
    const ast = parseToAST('Q @revenue ?active ~M vs ~M-1');

    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('NamedFilter');
    expect(ast.compare).toBeDefined();
  });

  test('comparison with explicit filter', () => {
    const ast = parseToAST('Q @revenue ?:country="US" ~M vs ~M-1');

    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('ExplicitFilter');
    expect(ast.compare).toBeDefined();
  });

  test('comparison with limit', () => {
    // Parser expects order: time -> limit -> orderBy -> compare
    const ast = parseToAST('Q @revenue #region ~M top:10 vs ~M-1');

    expect(ast.limit).toBeDefined();
    expect(ast.limit?.value).toBe(10);
    expect(ast.compare).toBeDefined();
  });

  test('comparison with order by', () => {
    // Parser expects order: time -> limit -> orderBy -> compare
    const ast = parseToAST('Q @revenue #region ~M -@revenue vs ~M-1');

    expect(ast.orderBy).toHaveLength(1);
    expect(ast.orderBy?.[0]?.direction).toBe('desc');
    expect(ast.compare).toBeDefined();
  });

  test('comparison with scope pin (v7)', () => {
    const ast = parseToAST('Q@sales @revenue ~M vs ~M-1');

    expect(ast.scopePin).toBeDefined();
    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.compare).toBeDefined();
  });

  test('comparison with time override (v7)', () => {
    // Parser expects order: time -> timeOverride -> limit -> orderBy -> compare
    const ast = parseToAST('Q @revenue ~M @t:created_at vs ~M-1');

    expect(ast.timeOverride).toBeDefined();
    expect(ast.timeOverride?.field).toBe('created_at');
    expect(ast.compare).toBeDefined();
  });

  test('comparison with explain mode (v7)', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-1 !explain');

    expect(ast.explain).toBe(true);
    expect(ast.compare).toBeDefined();
  });

  test('full query with all v7 features including comparison', () => {
    // Parser expects order: metrics -> dimensions -> filter -> time -> timeOverride -> limit -> orderBy -> compare -> explain
    const query = 'Q@sales @revenue @orders #region ?active & ?:country="US" ~last_month top:10 -@revenue vs ~M-2';
    const ast = parseToAST(query);

    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.metrics).toHaveLength(2);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.filter?.kind).toBe('BinaryFilter');
    expect(ast.time?.kind).toBe('Period');
    expect(ast.compare).toBeDefined();
    expect(ast.limit?.value).toBe(10);
    expect(ast.orderBy).toHaveLength(1);
  });
});

// =============================================================================
// COMPARISON EDGE CASES
// =============================================================================

describe('Comparison Edge Cases', () => {
  test('comparison without explicit base time uses current period', () => {
    // When base time is ~M (current month) and compare is ~M-1
    const ast = parseToAST('Q @revenue ~M vs ~M-1');

    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.offset).toBe(0); // Current period

    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.offset).toBe(-1); // Previous period
  });

  test('comparison period matches base period unit type', () => {
    const ast = parseToAST('Q @revenue ~Q vs ~Q-1');

    const basePeriod = ast.time as PeriodNode;
    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;

    // Both should be quarters
    expect(basePeriod.unit).toBe('Q');
    expect(comparePeriod.unit).toBe('Q');
  });

  test('comparison with different period types', () => {
    // Month vs Quarter - this is valid syntax, resolver handles semantics
    const ast = parseToAST('Q @revenue ~M vs ~Q-1');

    const basePeriod = ast.time as PeriodNode;
    expect(basePeriod.unit).toBe('M');

    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.unit).toBe('Q');
  });

  test('comparison with zero offset', () => {
    // Comparing to current period (same as base) - valid syntax
    const ast = parseToAST('Q @revenue ~M vs ~M');

    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.offset).toBe(0);
  });

  test('comparison with large offset', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-12');

    const compare = ast.compare as CompareNode;
    const comparePeriod = compare.period as PeriodNode;
    expect(comparePeriod.offset).toBe(-12);
  });
});
