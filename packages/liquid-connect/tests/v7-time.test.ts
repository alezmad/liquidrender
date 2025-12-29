// v7 Time Feature Integration Tests
// Comprehensive tests for v7 time features: duration, aliases, to-date ranges

import { describe, test, expect } from 'vitest';
import { Scanner, parseToAST } from '../src/compiler';
import type { DurationNode, PeriodNode, TimeRangeNode } from '../src/compiler/ast';

// =============================================================================
// 1. DURATION WITHOUT P PREFIX
// =============================================================================

describe('v7 Duration without P prefix', () => {
  describe('Scanner', () => {
    test('tokenizes ~30d as DURATION with value "30d"', () => {
      const scanner = new Scanner('Q @revenue ~30d');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('30d');
    });

    test('tokenizes ~6M as DURATION with value "6M"', () => {
      const scanner = new Scanner('Q @revenue ~6M');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('6M');
    });

    test('tokenizes ~1Y as DURATION with value "1Y"', () => {
      const scanner = new Scanner('Q @revenue ~1Y');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('1Y');
    });

    test('tokenizes ~2w as DURATION with value "2w"', () => {
      const scanner = new Scanner('Q @revenue ~2w');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('2w');
    });

    test('tokenizes ~P30d (with P prefix) as DURATION', () => {
      const scanner = new Scanner('Q @revenue ~P30d');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('P30d');
    });
  });

  describe('Parser', () => {
    test('parses ~30d as Duration with amount=30, unit=d', () => {
      const ast = parseToAST('Q @revenue ~30d');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(30);
      expect(duration.unit).toBe('d');
    });

    test('parses ~6M as Duration with amount=6, unit=m', () => {
      const ast = parseToAST('Q @revenue ~6M');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(6);
      expect(duration.unit).toBe('m');
    });

    test('parses ~1Y as Duration with amount=1, unit=y', () => {
      const ast = parseToAST('Q @revenue ~1Y');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(1);
      expect(duration.unit).toBe('y');
    });

    test('~30d and ~P30d parse identically', () => {
      const astWithoutP = parseToAST('Q @revenue ~30d');
      const astWithP = parseToAST('Q @revenue ~P30d');

      expect(astWithoutP.time?.kind).toBe('Duration');
      expect(astWithP.time?.kind).toBe('Duration');

      const durationWithoutP = astWithoutP.time as DurationNode;
      const durationWithP = astWithP.time as DurationNode;

      expect(durationWithoutP.amount).toBe(durationWithP.amount);
      expect(durationWithoutP.unit).toBe(durationWithP.unit);
    });

    test('parses ~2w as Duration with amount=2, unit=w', () => {
      const ast = parseToAST('Q @revenue ~2w');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(2);
      expect(duration.unit).toBe('w');
    });

    test('parses multi-digit durations correctly (~365d)', () => {
      const ast = parseToAST('Q @revenue ~365d');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(365);
      expect(duration.unit).toBe('d');
    });
  });
});

// =============================================================================
// 2. TIME ALIASES
// =============================================================================

describe('v7 Time Aliases', () => {
  describe('Scanner', () => {
    test('tokenizes ~today as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~today');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('today');
    });

    test('tokenizes ~yesterday as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~yesterday');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('yesterday');
    });

    test('tokenizes ~this_week as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~this_week');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('this_week');
    });

    test('tokenizes ~last_week as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~last_week');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('last_week');
    });

    test('tokenizes ~this_month as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~this_month');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('this_month');
    });

    test('tokenizes ~last_month as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~last_month');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('last_month');
    });

    test('tokenizes ~this_quarter as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~this_quarter');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('this_quarter');
    });

    test('tokenizes ~last_quarter as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~last_quarter');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('last_quarter');
    });

    test('tokenizes ~this_year as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~this_year');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('this_year');
    });

    test('tokenizes ~last_year as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~last_year');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('last_year');
    });
  });

  describe('Parser', () => {
    test('parses ~today as Period with unit=D, offset=0', () => {
      const ast = parseToAST('Q @revenue ~today');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('D');
      expect(period.offset).toBe(0);
    });

    test('parses ~yesterday as Period with unit=D, offset=-1', () => {
      const ast = parseToAST('Q @revenue ~yesterday');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('D');
      expect(period.offset).toBe(-1);
    });

    test('parses ~this_week as Period with unit=W, offset=0', () => {
      const ast = parseToAST('Q @revenue ~this_week');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('W');
      expect(period.offset).toBe(0);
    });

    test('parses ~last_week as Period with unit=W, offset=-1', () => {
      const ast = parseToAST('Q @revenue ~last_week');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('W');
      expect(period.offset).toBe(-1);
    });

    test('parses ~this_month as Period with unit=M, offset=0', () => {
      const ast = parseToAST('Q @revenue ~this_month');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('M');
      expect(period.offset).toBe(0);
    });

    test('parses ~last_month as Period with unit=M, offset=-1', () => {
      const ast = parseToAST('Q @revenue ~last_month');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('M');
      expect(period.offset).toBe(-1);
    });

    test('parses ~this_quarter as Period with unit=Q, offset=0', () => {
      const ast = parseToAST('Q @revenue ~this_quarter');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('Q');
      expect(period.offset).toBe(0);
    });

    test('parses ~last_quarter as Period with unit=Q, offset=-1', () => {
      const ast = parseToAST('Q @revenue ~last_quarter');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('Q');
      expect(period.offset).toBe(-1);
    });

    test('parses ~this_year as Period with unit=Y, offset=0', () => {
      const ast = parseToAST('Q @revenue ~this_year');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('Y');
      expect(period.offset).toBe(0);
    });

    test('parses ~last_year as Period with unit=Y, offset=-1', () => {
      const ast = parseToAST('Q @revenue ~last_year');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('Y');
      expect(period.offset).toBe(-1);
    });
  });
});

// =============================================================================
// 3. TO-DATE RANGES (YTD, MTD, QTD)
// =============================================================================

describe('v7 To-Date Ranges', () => {
  describe('Scanner', () => {
    test('tokenizes ~YTD as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~YTD');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('YTD');
    });

    test('tokenizes ~MTD as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~MTD');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('MTD');
    });

    test('tokenizes ~QTD as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue ~QTD');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('QTD');
    });
  });

  describe('Parser', () => {
    test('parses ~YTD as TimeRange from year start to today', () => {
      const ast = parseToAST('Q @revenue ~YTD');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('TimeRange');
      const range = ast.time as TimeRangeNode;

      // From: start of current year
      expect(range.from.kind).toBe('Period');
      const fromPeriod = range.from as PeriodNode;
      expect(fromPeriod.unit).toBe('Y');
      expect(fromPeriod.offset).toBe(0);

      // To: today
      expect(range.to.kind).toBe('Period');
      const toPeriod = range.to as PeriodNode;
      expect(toPeriod.unit).toBe('D');
      expect(toPeriod.offset).toBe(0);
    });

    test('parses ~MTD as TimeRange from month start to today', () => {
      const ast = parseToAST('Q @revenue ~MTD');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('TimeRange');
      const range = ast.time as TimeRangeNode;

      // From: start of current month
      expect(range.from.kind).toBe('Period');
      const fromPeriod = range.from as PeriodNode;
      expect(fromPeriod.unit).toBe('M');
      expect(fromPeriod.offset).toBe(0);

      // To: today
      expect(range.to.kind).toBe('Period');
      const toPeriod = range.to as PeriodNode;
      expect(toPeriod.unit).toBe('D');
      expect(toPeriod.offset).toBe(0);
    });

    test('parses ~QTD as TimeRange from quarter start to today', () => {
      const ast = parseToAST('Q @revenue ~QTD');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('TimeRange');
      const range = ast.time as TimeRangeNode;

      // From: start of current quarter
      expect(range.from.kind).toBe('Period');
      const fromPeriod = range.from as PeriodNode;
      expect(fromPeriod.unit).toBe('Q');
      expect(fromPeriod.offset).toBe(0);

      // To: today
      expect(range.to.kind).toBe('Period');
      const toPeriod = range.to as PeriodNode;
      expect(toPeriod.unit).toBe('D');
      expect(toPeriod.offset).toBe(0);
    });
  });
});

// =============================================================================
// 4. INTEGRATION TESTS (Full Pipeline)
// =============================================================================

describe('v7 Time Features Integration', () => {
  test('full query with duration and dimensions', () => {
    const ast = parseToAST('Q @revenue @orders #region ~30d top:10');
    expect(ast.metrics).toHaveLength(2);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.time?.kind).toBe('Duration');
    expect(ast.limit?.value).toBe(10);
  });

  test('full query with time alias and filter', () => {
    const ast = parseToAST('Q @revenue ?active ~last_month');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.filter).toBeDefined();
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(-1);
  });

  test('full query with YTD and order by', () => {
    const ast = parseToAST('Q @revenue #region ~YTD -@revenue');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.time?.kind).toBe('TimeRange');
    expect(ast.orderBy).toHaveLength(1);
    expect(ast.orderBy?.[0].direction).toBe('desc');
  });

  test('query with time alias and comparison', () => {
    const ast = parseToAST('Q @revenue ~this_month vs ~M-1');
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(0);
    expect(ast.compare).toBeDefined();
    expect(ast.compare?.period.kind).toBe('Period');
  });

  test('query combining duration with scope pin and time override', () => {
    // Note: Parser expects time (~7d) before time override (@t:created_at)
    const ast = parseToAST('Q@sales @revenue ~7d @t:created_at');
    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.time?.kind).toBe('Duration');
    const duration = ast.time as DurationNode;
    expect(duration.amount).toBe(7);
    expect(duration.unit).toBe('d');
    expect(ast.timeOverride?.field).toBe('created_at');
  });

  test('complex query with MTD and explain mode', () => {
    const ast = parseToAST('Q @revenue #region ?active ~MTD !explain');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.filter).toBeDefined();
    expect(ast.time?.kind).toBe('TimeRange');
    expect(ast.explain).toBe(true);
  });
});
