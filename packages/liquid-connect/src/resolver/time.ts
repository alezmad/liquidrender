// Resolver - Time Resolution
// Converts time AST nodes to concrete date ranges

import type {
  TimeNode,
  DurationNode,
  PeriodNode,
  SpecificDateNode,
  TimeRangeNode,
} from '../compiler/ast';
import type { ResolverContext, ResolvedTimeRange, ResolverError } from './types';

/**
 * Resolve a time node to concrete date range
 */
export function resolveTime(
  node: TimeNode,
  timeField: string,
  context: ResolverContext
): { range?: ResolvedTimeRange; error?: ResolverError } {
  try {
    switch (node.kind) {
      case 'Duration':
        return { range: resolveDuration(node, timeField, context) };
      case 'Period':
        return { range: resolvePeriod(node, timeField, context) };
      case 'SpecificDate':
        return { range: resolveSpecificDate(node, timeField, context) };
      case 'TimeRange':
        return { range: resolveTimeRange(node, timeField, context) };
      default:
        return {
          error: {
            code: 'E401',
            message: `Unknown time node kind: ${(node as TimeNode).kind}`,
            span: node.span,
          },
        };
    }
  } catch (err) {
    return {
      error: {
        code: 'E401',
        message: err instanceof Error ? err.message : 'Invalid time expression',
        span: node.span,
      },
    };
  }
}

/**
 * Resolve duration: ~P30d -> last 30 days from now
 */
function resolveDuration(
  node: DurationNode,
  timeField: string,
  context: ResolverContext
): ResolvedTimeRange {
  const now = context.now;
  const end = startOfDay(now);
  const start = subtractDuration(end, node.amount, node.unit);

  return {
    start: formatDate(start),
    end: formatDate(end),
    field: timeField,
    expression: `P${node.amount}${node.unit}`,
  };
}

/**
 * Resolve calendar period: ~Q-1 -> previous quarter
 */
function resolvePeriod(
  node: PeriodNode,
  timeField: string,
  context: ResolverContext
): ResolvedTimeRange {
  const now = context.now;
  let start: Date;
  let end: Date;

  switch (node.unit) {
    case 'D': {
      // Day
      const base = addDays(startOfDay(now), node.offset);
      start = base;
      end = addDays(base, 1);
      break;
    }

    case 'W': {
      // Week (Monday-based)
      const currentWeekStart = startOfWeek(now);
      start = addDays(currentWeekStart, node.offset * 7);
      end = addDays(start, 7);
      break;
    }

    case 'M': {
      // Month
      const currentMonthStart = startOfMonth(now);
      start = addMonths(currentMonthStart, node.offset);
      end = addMonths(start, 1);
      break;
    }

    case 'Q': {
      // Quarter
      const currentQuarterStart = startOfQuarter(now);
      start = addQuarters(currentQuarterStart, node.offset);
      end = addQuarters(start, 1);
      break;
    }

    case 'Y': {
      // Year
      const currentYearStart = startOfYear(now);
      start = addYears(currentYearStart, node.offset);
      end = addYears(start, 1);
      break;
    }

    default:
      throw new Error(`Unknown period unit: ${node.unit}`);
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
    field: timeField,
    expression: `${node.unit}${node.offset >= 0 ? '+' : ''}${node.offset}`,
  };
}

/**
 * Resolve specific date: ~2024-Q3 -> Q3 2024
 */
function resolveSpecificDate(
  node: SpecificDateNode,
  timeField: string,
  context: ResolverContext
): ResolvedTimeRange {
  let start: Date;
  let end: Date;
  let expression: string;

  if (node.day !== undefined && node.month !== undefined) {
    // Full date: 2024-06-15
    start = new Date(Date.UTC(node.year, node.month - 1, node.day));
    end = addDays(start, 1);
    expression = `${node.year}-${pad(node.month)}-${pad(node.day)}`;
  } else if (node.month !== undefined) {
    // Year-month: 2024-06
    start = new Date(Date.UTC(node.year, node.month - 1, 1));
    end = addMonths(start, 1);
    expression = `${node.year}-${pad(node.month)}`;
  } else if (node.quarter !== undefined) {
    // Year-quarter: 2024-Q3
    const quarterMonth = (node.quarter - 1) * 3;
    start = new Date(Date.UTC(node.year, quarterMonth, 1));
    end = addMonths(start, 3);
    expression = `${node.year}-Q${node.quarter}`;
  } else {
    // Year only: 2024
    start = new Date(Date.UTC(node.year, 0, 1));
    end = addYears(start, 1);
    expression = `${node.year}`;
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
    field: timeField,
    expression,
  };
}

/**
 * Resolve time range: ~[Q-4..Q-1]
 */
function resolveTimeRange(
  node: TimeRangeNode,
  timeField: string,
  context: ResolverContext
): ResolvedTimeRange {
  const fromResult = resolveTime(node.from, timeField, context);
  const toResult = resolveTime(node.to, timeField, context);

  if (fromResult.error) throw new Error(fromResult.error.message);
  if (toResult.error) throw new Error(toResult.error.message);

  return {
    start: fromResult.range!.start,
    end: toResult.range!.end,
    field: timeField,
    expression: `[${fromResult.range!.expression}..${toResult.range!.expression}]`,
  };
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getUTCDay();
  // Adjust to Monday (day 1), treating Sunday as 7
  const diff = day === 0 ? 6 : day - 1;
  return addDays(d, -diff);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfQuarter(date: Date): Date {
  const month = date.getUTCMonth();
  const quarterMonth = Math.floor(month / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1));
}

function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function addQuarters(date: Date, quarters: number): Date {
  return addMonths(date, quarters * 3);
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function subtractDuration(date: Date, amount: number, unit: 'd' | 'w' | 'M' | 'Y'): Date {
  switch (unit) {
    case 'd':
      return addDays(date, -amount);
    case 'w':
      return addDays(date, -amount * 7);
    case 'M':
      return addMonths(date, -amount);
    case 'Y':
      return addYears(date, -amount);
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Get comparison period for "vs" clause
 */
export function getComparisonPeriod(
  basePeriod: ResolvedTimeRange,
  compareNode: TimeNode,
  context: ResolverContext
): { range?: ResolvedTimeRange; error?: ResolverError } {
  return resolveTime(compareNode, basePeriod.field, context);
}
