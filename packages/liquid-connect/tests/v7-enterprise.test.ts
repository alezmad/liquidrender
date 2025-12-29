// v7 Enterprise Feature Tests
// Comprehensive tests for scope pins, time override, and explain mode

import { describe, test, expect } from 'vitest';
import { parseToAST } from '../src/compiler';
import type { QueryNode, PeriodNode } from '../src/compiler/ast';

// =============================================================================
// SCOPE PINS (Q@entity)
// =============================================================================

describe('Scope Pins (Q@entity)', () => {
  test('Q@orders @revenue parses with scopePin.entity = "orders"', () => {
    const ast = parseToAST('Q@orders @revenue');
    expect(ast.scopePin).toBeDefined();
    expect(ast.scopePin?.kind).toBe('ScopePin');
    expect(ast.scopePin?.entity).toBe('orders');
  });

  test('Q@sales @revenue #region scope pin with dimensions', () => {
    const ast = parseToAST('Q@sales @revenue #region');
    expect(ast.scopePin).toBeDefined();
    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.metrics?.[0].name).toBe('revenue');
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.dimensions?.[0].name).toBe('region');
  });

  test('scope pin appears in AST correctly', () => {
    const ast = parseToAST('Q@customers @count');
    expect(ast.kind).toBe('Query');
    expect(ast.scopePin).toBeDefined();
    expect(ast.scopePin?.kind).toBe('ScopePin');
    expect(ast.scopePin?.entity).toBe('customers');
  });

  test('scope pin with multiple metrics', () => {
    const ast = parseToAST('Q@transactions @revenue @count');
    expect(ast.scopePin?.entity).toBe('transactions');
    expect(ast.metrics).toHaveLength(2);
  });

  test('scope pin with filters', () => {
    const ast = parseToAST('Q@orders @revenue ?active');
    expect(ast.scopePin?.entity).toBe('orders');
    expect(ast.filter).toBeDefined();
  });
});

// =============================================================================
// TIME OVERRIDE (@t:field)
// =============================================================================

describe('Time Override (@t:field)', () => {
  test('Q @revenue ~30d @t:created_at parses timeOverride', () => {
    const ast = parseToAST('Q @revenue ~30d @t:created_at');
    expect(ast.timeOverride).toBeDefined();
    expect(ast.timeOverride?.kind).toBe('TimeOverride');
    expect(ast.timeOverride?.field).toBe('created_at');
    expect(ast.time).toBeDefined();
  });

  test('@t:signup_date extracts field name correctly', () => {
    const ast = parseToAST('Q @users @t:signup_date');
    expect(ast.timeOverride).toBeDefined();
    expect(ast.timeOverride?.field).toBe('signup_date');
  });

  test('time override appears in AST', () => {
    const ast = parseToAST('Q @revenue ~7d @t:order_date');
    expect(ast.kind).toBe('Query');
    expect(ast.timeOverride).toBeDefined();
    expect(ast.timeOverride?.kind).toBe('TimeOverride');
    expect(ast.timeOverride?.field).toBe('order_date');
  });

  test('time override with period time', () => {
    const ast = parseToAST('Q @revenue ~M @t:completed_at');
    expect(ast.timeOverride?.field).toBe('completed_at');
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('M');
  });

  test('time override with dimensions', () => {
    const ast = parseToAST('Q @revenue #region ~30d @t:shipped_at');
    expect(ast.timeOverride?.field).toBe('shipped_at');
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.dimensions?.[0].name).toBe('region');
  });
});

// =============================================================================
// EXPLAIN MODE (!explain)
// =============================================================================

describe('Explain Mode (!explain)', () => {
  test('Q @revenue ~30d !explain sets explain: true', () => {
    const ast = parseToAST('Q @revenue ~30d !explain');
    expect(ast.explain).toBe(true);
  });

  test('!explain at end of query works', () => {
    const ast = parseToAST('Q @revenue #region ?active !explain');
    expect(ast.explain).toBe(true);
    expect(ast.metrics).toHaveLength(1);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.filter).toBeDefined();
  });

  test('explain flag propagates to AST', () => {
    const ast = parseToAST('Q @count !explain');
    expect(ast.kind).toBe('Query');
    expect(ast.explain).toBe(true);
  });

  test('explain with complex query', () => {
    const ast = parseToAST('Q @revenue @orders #region #product ?active ~M top:10 !explain');
    expect(ast.explain).toBe(true);
    expect(ast.metrics).toHaveLength(2);
    expect(ast.dimensions).toHaveLength(2);
    expect(ast.filter).toBeDefined();
    expect(ast.time).toBeDefined();
    expect(ast.limit).toBeDefined();
  });

  test('query without explain has explain undefined or false', () => {
    const ast = parseToAST('Q @revenue ~30d');
    expect(ast.explain).toBeFalsy();
  });
});

// =============================================================================
// COMBINED ENTERPRISE FEATURES
// =============================================================================

describe('Combined Enterprise Features', () => {
  test('Q@sales @revenue ~last_month @t:order_date !explain all features together', () => {
    const ast = parseToAST('Q@sales @revenue ~last_month @t:order_date !explain');

    // Scope pin
    expect(ast.scopePin).toBeDefined();
    expect(ast.scopePin?.entity).toBe('sales');

    // Metric
    expect(ast.metrics).toHaveLength(1);
    expect(ast.metrics?.[0].name).toBe('revenue');

    // Time (last_month -> Period with offset -1)
    expect(ast.time).toBeDefined();
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(-1);

    // Time override
    expect(ast.timeOverride).toBeDefined();
    expect(ast.timeOverride?.field).toBe('order_date');

    // Explain
    expect(ast.explain).toBe(true);
  });

  test('all enterprise features with filters and dimensions', () => {
    const ast = parseToAST('Q@transactions @revenue @count #region #product ?active & ?premium ~30d @t:created_at top:100 !explain');

    expect(ast.scopePin?.entity).toBe('transactions');
    expect(ast.metrics).toHaveLength(2);
    expect(ast.dimensions).toHaveLength(2);
    expect(ast.filter?.kind).toBe('BinaryFilter');
    expect(ast.time?.kind).toBe('Duration');
    expect(ast.timeOverride?.field).toBe('created_at');
    expect(ast.limit?.value).toBe(100);
    expect(ast.explain).toBe(true);
  });

  test('scope pin with time override without explicit time', () => {
    const ast = parseToAST('Q@orders @revenue @t:shipped_date');
    expect(ast.scopePin?.entity).toBe('orders');
    expect(ast.timeOverride?.field).toBe('shipped_date');
    expect(ast.time).toBeUndefined();
  });

  test('enterprise features with comparison', () => {
    const ast = parseToAST('Q@sales @revenue ~M @t:order_date vs ~M-1 !explain');
    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.time).toBeDefined();
    expect(ast.timeOverride?.field).toBe('order_date');
    expect(ast.compare).toBeDefined();
    expect(ast.explain).toBe(true);
  });

  test('enterprise features with order by', () => {
    const ast = parseToAST('Q@sales @revenue ~30d @t:order_date -@revenue !explain');
    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.timeOverride?.field).toBe('order_date');
    expect(ast.orderBy).toHaveLength(1);
    expect(ast.orderBy?.[0].direction).toBe('desc');
    expect(ast.explain).toBe(true);
  });
});
