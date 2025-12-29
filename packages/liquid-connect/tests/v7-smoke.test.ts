// v7 Compiler Smoke Tests
// Quick verification that all v7 features work end-to-end

import { describe, test, expect } from 'vitest';
import { Scanner, Parser, parseToAST } from '../src/compiler';
import type { QueryNode, DurationNode, PeriodNode } from '../src/compiler/ast';

// =============================================================================
// SCANNER TESTS
// =============================================================================

describe('v7 Scanner', () => {
  test('tokenizes duration without P prefix: ~30d', () => {
    const scanner = new Scanner('Q @revenue ~30d');
    const tokens = scanner.scan();
    const durationToken = tokens.find(t => t.type === 'DURATION');
    expect(durationToken).toBeDefined();
    expect(durationToken?.value).toBe('30d');
  });

  test('tokenizes time alias: ~today', () => {
    const scanner = new Scanner('Q @revenue ~today');
    const tokens = scanner.scan();
    const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
    expect(aliasToken).toBeDefined();
    expect(aliasToken?.value).toBe('today');
  });

  test('tokenizes scope pin: Q@orders', () => {
    const scanner = new Scanner('Q@orders @revenue');
    const tokens = scanner.scan();
    const scopeToken = tokens.find(t => t.type === 'SCOPE_PIN');
    expect(scopeToken).toBeDefined();
    expect(scopeToken?.value).toBe('orders');
  });

  test('tokenizes time override: @t:created_at', () => {
    const scanner = new Scanner('Q @revenue @t:created_at');
    const tokens = scanner.scan();
    const overrideToken = tokens.find(t => t.type === 'TIME_OVERRIDE');
    expect(overrideToken).toBeDefined();
    expect(overrideToken?.value).toBe('created_at');
  });

  test('tokenizes explain mode: !explain', () => {
    const scanner = new Scanner('Q @revenue !explain');
    const tokens = scanner.scan();
    const explainToken = tokens.find(t => t.type === 'EXPLAIN');
    expect(explainToken).toBeDefined();
  });

  test('tokenizes parameter: $region', () => {
    const scanner = new Scanner('Q @revenue ?:country=$region');
    const tokens = scanner.scan();
    const paramToken = tokens.find(t => t.type === 'PARAMETER');
    expect(paramToken).toBeDefined();
    expect(paramToken?.value).toBe('region');
  });
});

// =============================================================================
// PARSER TESTS
// =============================================================================

describe('v7 Parser', () => {
  test('parses duration without P prefix', () => {
    const ast = parseToAST('Q @revenue ~30d');
    expect(ast.time).toBeDefined();
    expect(ast.time?.kind).toBe('Duration');
    const duration = ast.time as DurationNode;
    expect(duration.amount).toBe(30);
    expect(duration.unit).toBe('d');
  });

  test('parses time alias today', () => {
    const ast = parseToAST('Q @revenue ~today');
    expect(ast.time).toBeDefined();
    // Parser converts alias to Period
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('D');
    expect(period.offset).toBe(0);
  });

  test('parses time alias last_month', () => {
    const ast = parseToAST('Q @revenue ~last_month');
    expect(ast.time).toBeDefined();
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(-1);
  });

  test('parses YTD as time range', () => {
    const ast = parseToAST('Q @revenue ~YTD');
    expect(ast.time).toBeDefined();
    expect(ast.time?.kind).toBe('TimeRange');
  });

  test('parses scope pin', () => {
    const ast = parseToAST('Q@orders @revenue');
    expect(ast.scopePin).toBeDefined();
    expect(ast.scopePin?.entity).toBe('orders');
  });

  test('parses time override', () => {
    const ast = parseToAST('Q @revenue @t:signup_date ~30d');
    expect(ast.timeOverride).toBeDefined();
    expect(ast.timeOverride?.field).toBe('signup_date');
  });

  test('parses explain mode', () => {
    const ast = parseToAST('Q @revenue ~30d !explain');
    expect(ast.explain).toBe(true);
  });

  test('parses parameter in filter value', () => {
    const ast = parseToAST('Q @revenue ?:country=$region');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('ExplicitFilter');
  });

  test('throws E104 for implicit AND between filters', () => {
    // Two filters without explicit & should throw E104
    expect(() => {
      parseToAST('Q @revenue ?active ?premium');
    }).toThrow(/E104|Use & between filters/);
  });

  test('allows explicit & between filters', () => {
    const ast = parseToAST('Q @revenue ?active & ?premium');
    expect(ast.filter).toBeDefined();
    expect(ast.filter?.kind).toBe('BinaryFilter');
  });
});

// =============================================================================
// INTEGRATION TESTS (Scanner + Parser)
// =============================================================================

describe('v7 Integration', () => {
  test('full query with v7 features', () => {
    const query = 'Q@sales @revenue @orders #region ?active & ?:country="US" ~last_month top:10 +@revenue';
    const ast = parseToAST(query);

    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.metrics).toHaveLength(2);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.filter?.kind).toBe('BinaryFilter');
    expect(ast.time?.kind).toBe('Period');
    expect(ast.limit?.value).toBe(10);
    expect(ast.orderBy).toHaveLength(1);
  });

  test('query with parameter in limit', () => {
    const ast = parseToAST('Q @revenue top:$count');
    expect(ast.limit).toBeDefined();
    expect(ast.limit?.value).toHaveProperty('kind', 'Parameter');
  });

  test('comparison query with v7 syntax', () => {
    const ast = parseToAST('Q @revenue ~M vs ~M-1');
    expect(ast.time).toBeDefined();
    expect(ast.compare).toBeDefined();
  });
});
