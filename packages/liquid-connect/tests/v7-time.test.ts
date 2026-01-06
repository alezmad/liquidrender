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
    test('tokenizes t:30d as DURATION with value "30d"', () => {
      const scanner = new Scanner('Q @revenue t:30d');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('30d');
    });

    test('tokenizes t:6M as DURATION with value "6M"', () => {
      const scanner = new Scanner('Q @revenue t:6M');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('6M');
    });

    test('tokenizes t:1Y as DURATION with value "1Y"', () => {
      const scanner = new Scanner('Q @revenue t:1Y');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('1Y');
    });

    test('tokenizes t:2w as DURATION with value "2w"', () => {
      const scanner = new Scanner('Q @revenue t:2w');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('2w');
    });

    test('tokenizes t:P30d (with P prefix) as DURATION', () => {
      const scanner = new Scanner('Q @revenue t:P30d');
      const tokens = scanner.scan();
      const durationToken = tokens.find(t => t.type === 'DURATION');
      expect(durationToken).toBeDefined();
      expect(durationToken?.value).toBe('P30d');
    });
  });

  describe('Parser', () => {
    test('parses t:30d as Duration with amount=30, unit=d', () => {
      const ast = parseToAST('Q @revenue t:30d');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(30);
      expect(duration.unit).toBe('d');
    });

    test('parses t:6M as Duration with amount=6, unit=m', () => {
      const ast = parseToAST('Q @revenue t:6M');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(6);
      expect(duration.unit).toBe('m');
    });

    test('parses t:1Y as Duration with amount=1, unit=y', () => {
      const ast = parseToAST('Q @revenue t:1Y');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(1);
      expect(duration.unit).toBe('y');
    });

    test('t:30d and t:P30d parse identically', () => {
      const astWithoutP = parseToAST('Q @revenue t:30d');
      const astWithP = parseToAST('Q @revenue t:P30d');

      expect(astWithoutP.time?.kind).toBe('Duration');
      expect(astWithP.time?.kind).toBe('Duration');

      const durationWithoutP = astWithoutP.time as DurationNode;
      const durationWithP = astWithP.time as DurationNode;

      expect(durationWithoutP.amount).toBe(durationWithP.amount);
      expect(durationWithoutP.unit).toBe(durationWithP.unit);
    });

    test('parses t:2w as Duration with amount=2, unit=w', () => {
      const ast = parseToAST('Q @revenue t:2w');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Duration');
      const duration = ast.time as DurationNode;
      expect(duration.amount).toBe(2);
      expect(duration.unit).toBe('w');
    });

    test('parses multi-digit durations correctly (t:365d)', () => {
      const ast = parseToAST('Q @revenue t:365d');
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
    test('tokenizes t:today as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:today');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('today');
    });

    test('tokenizes t:yesterday as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:yesterday');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('yesterday');
    });

    test('tokenizes t:this_week as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:this_week');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('this_week');
    });

    test('tokenizes t:last_week as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:last_week');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('last_week');
    });

    test('tokenizes t:this_month as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:this_month');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('this_month');
    });

    test('tokenizes t:last_month as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:last_month');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('last_month');
    });

    test('tokenizes t:this_quarter as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:this_quarter');
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

    test('tokenizes t:this_year as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:this_year');
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
    test('parses t:today as Period with unit=D, offset=0', () => {
      const ast = parseToAST('Q @revenue t:today');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('D');
      expect(period.offset).toBe(0);
    });

    test('parses t:yesterday as Period with unit=D, offset=-1', () => {
      const ast = parseToAST('Q @revenue t:yesterday');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('D');
      expect(period.offset).toBe(-1);
    });

    test('parses t:this_week as Period with unit=W, offset=0', () => {
      const ast = parseToAST('Q @revenue t:this_week');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('W');
      expect(period.offset).toBe(0);
    });

    test('parses t:last_week as Period with unit=W, offset=-1', () => {
      const ast = parseToAST('Q @revenue t:last_week');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('W');
      expect(period.offset).toBe(-1);
    });

    test('parses t:this_month as Period with unit=M, offset=0', () => {
      const ast = parseToAST('Q @revenue t:this_month');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('M');
      expect(period.offset).toBe(0);
    });

    test('parses t:last_month as Period with unit=M, offset=-1', () => {
      const ast = parseToAST('Q @revenue t:last_month');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('M');
      expect(period.offset).toBe(-1);
    });

    test('parses t:this_quarter as Period with unit=Q, offset=0', () => {
      const ast = parseToAST('Q @revenue t:this_quarter');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('Q');
      expect(period.offset).toBe(0);
    });

    test('parses t:last_quarter as Period with unit=Q, offset=-1', () => {
      const ast = parseToAST('Q @revenue t:last_quarter');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('Q');
      expect(period.offset).toBe(-1);
    });

    test('parses t:this_year as Period with unit=Y, offset=0', () => {
      const ast = parseToAST('Q @revenue t:this_year');
      expect(ast.time).toBeDefined();
      expect(ast.time?.kind).toBe('Period');
      const period = ast.time as PeriodNode;
      expect(period.unit).toBe('Y');
      expect(period.offset).toBe(0);
    });

    test('parses t:last_year as Period with unit=Y, offset=-1', () => {
      const ast = parseToAST('Q @revenue t:last_year');
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
    test('tokenizes t:YTD as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:YTD');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('YTD');
    });

    test('tokenizes t:MTD as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:MTD');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('MTD');
    });

    test('tokenizes t:QTD as TIME_ALIAS', () => {
      const scanner = new Scanner('Q @revenue t:QTD');
      const tokens = scanner.scan();
      const aliasToken = tokens.find(t => t.type === 'TIME_ALIAS');
      expect(aliasToken).toBeDefined();
      expect(aliasToken?.value).toBe('QTD');
    });
  });

  describe('Parser', () => {
    test('parses t:YTD as TimeRange from year start to today', () => {
      const ast = parseToAST('Q @revenue t:YTD');
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

    test('parses t:MTD as TimeRange from month start to today', () => {
      const ast = parseToAST('Q @revenue t:MTD');
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

    test('parses t:QTD as TimeRange from quarter start to today', () => {
      const ast = parseToAST('Q @revenue t:QTD');
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
    const ast = parseToAST('Q @revenue @orders #region t:30d top:10');
    expect(ast.metrics).toHaveLength(2);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.time?.kind).toBe('Duration');
    expect(ast.limit?.value).toBe(10);
  });

  test('full query with time alias and filter', () => {
    const ast = parseToAST('Q @revenue ?active t:last_month');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.filter).toBeDefined();
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(-1);
  });

  test('full query with YTD and order by', () => {
    const ast = parseToAST('Q @revenue #region t:YTD -@revenue');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.time?.kind).toBe('TimeRange');
    expect(ast.orderBy).toHaveLength(1);
    expect(ast.orderBy?.[0].direction).toBe('desc');
  });

  test('query with time alias and comparison', () => {
    const ast = parseToAST('Q @revenue t:this_month vs t:M-1');
    expect(ast.time?.kind).toBe('Period');
    const period = ast.time as PeriodNode;
    expect(period.unit).toBe('M');
    expect(period.offset).toBe(0);
    expect(ast.compare).toBeDefined();
    expect(ast.compare?.period.kind).toBe('Period');
  });

  test('query combining duration with scope pin and time override', () => {
    // Note: Parser expects time (t:7d) before time override (@t:created_at)
    const ast = parseToAST('Q@sales @revenue t:7d @t:created_at');
    expect(ast.scopePin?.entity).toBe('sales');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.time?.kind).toBe('Duration');
    const duration = ast.time as DurationNode;
    expect(duration.amount).toBe(7);
    expect(duration.unit).toBe('d');
    expect(ast.timeOverride?.field).toBe('created_at');
  });

  test('complex query with MTD and explain mode', () => {
    const ast = parseToAST('Q @revenue #region ?active t:MTD !explain');
    expect(ast.metrics).toHaveLength(1);
    expect(ast.dimensions).toHaveLength(1);
    expect(ast.filter).toBeDefined();
    expect(ast.time?.kind).toBe('TimeRange');
    expect(ast.explain).toBe(true);
  });
});
