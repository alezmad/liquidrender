/**
 * Query Engine Patterns
 *
 * Default patterns and time slots for matching natural language to LC DSL.
 *
 * Pattern Templates:
 * - {m} = metric slot
 * - {d} = dimension slot
 * - {t} = time slot
 * - {f} = filter slot
 * - {n} = number slot
 * - {d2} = second dimension slot
 * - {t2} = second time slot (for comparisons)
 *
 * LC DSL Output:
 * - @ = metric prefix
 * - # = dimension prefix
 * - ~ = time prefix
 * - ? = filter prefix
 */

import type { Pattern, SlotType } from './types';

// =============================================================================
// Helper: Create Pattern
// =============================================================================

/**
 * Creates a Pattern object with required fields
 */
export function createPattern(
  id: string,
  template: string,
  output: string,
  priority: number,
  requiredSlots: SlotType[],
  examples?: string[]
): Pattern {
  return {
    id,
    template,
    output,
    priority,
    requiredSlots,
    examples,
  };
}

// =============================================================================
// Time Slots - Natural language to LC time tokens
// =============================================================================

/**
 * Maps natural language time expressions to LC time tokens.
 *
 * Categories:
 * - Relative days: today, yesterday
 * - Relative periods: this week, last month, this quarter, this year
 * - Rolling periods: last N days/weeks/months
 * - Fiscal periods: Q1, Q2, Q3, Q4
 * - Comparisons: vs, compared to
 */
export const TIME_SLOTS: Record<string, string> = {
  // Relative days
  today: 'today',
  yesterday: 'yesterday',
  'day before yesterday': 'D-2',

  // This period
  'this week': 'this_week',
  'this month': 'this_month',
  'this quarter': 'this_quarter',
  'this year': 'this_year',

  // Last period (singular)
  'last week': 'W-1',
  'last month': 'M-1',
  'last quarter': 'Q-1',
  'last year': 'Y-1',

  // Previous period (synonym for last)
  'previous week': 'W-1',
  'previous month': 'M-1',
  'previous quarter': 'Q-1',
  'previous year': 'Y-1',

  // Rolling periods - days
  'last 7 days': 'D-7',
  'last 14 days': 'D-14',
  'last 30 days': 'D-30',
  'last 60 days': 'D-60',
  'last 90 days': 'D-90',
  'past 7 days': 'D-7',
  'past 30 days': 'D-30',
  'past 90 days': 'D-90',

  // Rolling periods - weeks
  'last 2 weeks': 'W-2',
  'last 4 weeks': 'W-4',
  'last 12 weeks': 'W-12',
  'past 4 weeks': 'W-4',

  // Rolling periods - months
  'last 3 months': 'M-3',
  'last 6 months': 'M-6',
  'last 12 months': 'M-12',
  'past 3 months': 'M-3',
  'past 6 months': 'M-6',
  'past 12 months': 'M-12',

  // Rolling periods - years
  'last 2 years': 'Y-2',
  'last 3 years': 'Y-3',
  'last 5 years': 'Y-5',

  // Fiscal quarters
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
  'quarter 1': 'Q1',
  'quarter 2': 'Q2',
  'quarter 3': 'Q3',
  'quarter 4': 'Q4',
  'first quarter': 'Q1',
  'second quarter': 'Q2',
  'third quarter': 'Q3',
  'fourth quarter': 'Q4',

  // Month-to-date, Year-to-date
  mtd: 'MTD',
  ytd: 'YTD',
  qtd: 'QTD',
  wtd: 'WTD',
  'month to date': 'MTD',
  'year to date': 'YTD',
  'quarter to date': 'QTD',
  'week to date': 'WTD',

  // Specific time anchors
  'beginning of year': 'BOY',
  'end of year': 'EOY',
  'beginning of month': 'BOM',
  'end of month': 'EOM',
  'beginning of quarter': 'BOQ',
  'end of quarter': 'EOQ',

  // All time
  'all time': 'all',
  ever: 'all',
  always: 'all',
  total: 'all',
};

// =============================================================================
// Default Patterns - Ordered by priority (higher = try first)
// =============================================================================

/**
 * Default patterns for matching natural language queries to LC DSL.
 *
 * Priority levels:
 * - 10: Simple single-slot patterns
 * - 20: Two-slot patterns
 * - 30: Three-slot patterns
 * - 40: Four-slot patterns (complex queries)
 * - 50+: Special patterns (top N, comparisons)
 */
export const DEFAULT_PATTERNS: Pattern[] = [
  // ==========================================================================
  // Priority 50+: Complex patterns (try first)
  // ==========================================================================

  // Comparison patterns (vs, compared to)
  createPattern(
    'metric-time-vs-time',
    '{m} {t} vs {t2}',
    'Q @{m} ~{t} vs ~{t2}',
    55,
    ['m', 't', 't2'],
    ['revenue last month vs last year', 'sales this quarter vs last quarter']
  ),

  createPattern(
    'metric-time-compared-to-time',
    '{m} {t} compared to {t2}',
    'Q @{m} ~{t} vs ~{t2}',
    55,
    ['m', 't', 't2'],
    ['orders this week compared to last week', 'mrr this month compared to last month']
  ),

  createPattern(
    'metric-dim-time-vs-time',
    '{m} by {d} {t} vs {t2}',
    'Q @{m} #{d} ~{t} vs ~{t2}',
    58,
    ['m', 'd', 't', 't2'],
    ['revenue by region last month vs last year']
  ),

  // Top N patterns
  createPattern(
    'top-n-dim-by-metric',
    'top {n} {d} by {m}',
    'Q @{m} #{d} top:{n} -@{m}',
    52,
    ['n', 'd', 'm'],
    ['top 10 products by revenue', 'top 5 regions by orders']
  ),

  createPattern(
    'top-n-dim-by-metric-time',
    'top {n} {d} by {m} {t}',
    'Q @{m} #{d} ~{t} top:{n} -@{m}',
    55,
    ['n', 'd', 'm', 't'],
    ['top 10 products by revenue last month', 'top 5 customers by orders this year']
  ),

  createPattern(
    'bottom-n-dim-by-metric',
    'bottom {n} {d} by {m}',
    'Q @{m} #{d} top:{n} +@{m}',
    52,
    ['n', 'd', 'm'],
    ['bottom 10 products by sales', 'bottom 5 regions by revenue']
  ),

  createPattern(
    'worst-n-dim-by-metric',
    'worst {n} {d} by {m}',
    'Q @{m} #{d} top:{n} +@{m}',
    52,
    ['n', 'd', 'm'],
    ['worst 10 products by margin', 'worst 5 regions by conversion']
  ),

  // ==========================================================================
  // Priority 40: Four-slot patterns
  // ==========================================================================

  createPattern(
    'metric-dim-filter-time',
    '{m} by {d} where {f} {t}',
    'Q @{m} #{d} ?{f} ~{t}',
    42,
    ['m', 'd', 'f', 't'],
    ['revenue by region where active last month', 'orders by category where enterprise this quarter']
  ),

  createPattern(
    'metric-dim-time-filter',
    '{m} by {d} {t} where {f}',
    'Q @{m} #{d} ~{t} ?{f}',
    42,
    ['m', 'd', 't', 'f'],
    ['revenue by product last month where active']
  ),

  createPattern(
    'metric-dim-for-filter-time',
    '{m} by {d} for {f} {t}',
    'Q @{m} #{d} ?{f} ~{t}',
    42,
    ['m', 'd', 'f', 't'],
    ['revenue by region for enterprise last year']
  ),

  // ==========================================================================
  // Priority 30: Three-slot patterns
  // ==========================================================================

  // Metric + Dimension + Time
  createPattern(
    'metric-dim-time',
    '{m} by {d} {t}',
    'Q @{m} #{d} ~{t}',
    32,
    ['m', 'd', 't'],
    ['revenue by region last month', 'orders by product this week', 'sales by category last quarter']
  ),

  createPattern(
    'metric-time-by-dim',
    '{m} {t} by {d}',
    'Q @{m} #{d} ~{t}',
    32,
    ['m', 't', 'd'],
    ['revenue last month by region', 'orders this week by product']
  ),

  // Metric + Dimension + Filter
  createPattern(
    'metric-dim-filter',
    '{m} by {d} where {f}',
    'Q @{m} #{d} ?{f}',
    30,
    ['m', 'd', 'f'],
    ['revenue by region where active', 'orders by category where enterprise']
  ),

  createPattern(
    'metric-dim-for-filter',
    '{m} by {d} for {f}',
    'Q @{m} #{d} ?{f}',
    30,
    ['m', 'd', 'f'],
    ['revenue by region for enterprise', 'orders by product for premium']
  ),

  // Metric + Filter + Time
  createPattern(
    'metric-filter-time',
    '{m} where {f} {t}',
    'Q @{m} ?{f} ~{t}',
    30,
    ['m', 'f', 't'],
    ['revenue where active last month', 'orders where enterprise this quarter']
  ),

  createPattern(
    'metric-for-filter-time',
    '{m} for {f} {t}',
    'Q @{m} ?{f} ~{t}',
    30,
    ['m', 'f', 't'],
    ['revenue for enterprise last quarter', 'orders for premium this year']
  ),

  // Metric + Two Dimensions (breakdown)
  createPattern(
    'metric-dim1-dim2',
    '{m} by {d} and {d2}',
    'Q @{m} #{d} #{d2}',
    30,
    ['m', 'd', 'd2'],
    ['revenue by region and product', 'orders by category and month']
  ),

  createPattern(
    'metric-dim1-then-dim2',
    '{m} by {d} then {d2}',
    'Q @{m} #{d} #{d2}',
    30,
    ['m', 'd', 'd2'],
    ['revenue by region then product', 'sales by year then quarter']
  ),

  // ==========================================================================
  // Priority 20: Two-slot patterns
  // ==========================================================================

  // Metric + Dimension
  createPattern(
    'metric-by-dim',
    '{m} by {d}',
    'Q @{m} #{d}',
    22,
    ['m', 'd'],
    ['revenue by region', 'orders by product', 'sales by category', 'mrr by customer']
  ),

  createPattern(
    'metric-per-dim',
    '{m} per {d}',
    'Q @{m} #{d}',
    22,
    ['m', 'd'],
    ['revenue per region', 'orders per customer', 'sales per product']
  ),

  createPattern(
    'metric-across-dim',
    '{m} across {d}',
    'Q @{m} #{d}',
    22,
    ['m', 'd'],
    ['revenue across regions', 'sales across categories']
  ),

  createPattern(
    'metric-breakdown-dim',
    '{m} breakdown by {d}',
    'Q @{m} #{d}',
    22,
    ['m', 'd'],
    ['revenue breakdown by region', 'orders breakdown by product']
  ),

  createPattern(
    'metric-grouped-by-dim',
    '{m} grouped by {d}',
    'Q @{m} #{d}',
    22,
    ['m', 'd'],
    ['revenue grouped by region', 'sales grouped by month']
  ),

  // Metric + Time
  createPattern(
    'metric-time',
    '{m} {t}',
    'Q @{m} ~{t}',
    20,
    ['m', 't'],
    ['revenue last month', 'orders today', 'sales this quarter', 'mrr last year']
  ),

  createPattern(
    'metric-for-time',
    '{m} for {t}',
    'Q @{m} ~{t}',
    20,
    ['m', 't'],
    ['revenue for last month', 'orders for this week']
  ),

  createPattern(
    'metric-in-time',
    '{m} in {t}',
    'Q @{m} ~{t}',
    20,
    ['m', 't'],
    ['revenue in q1', 'orders in last quarter']
  ),

  createPattern(
    'metric-during-time',
    '{m} during {t}',
    'Q @{m} ~{t}',
    20,
    ['m', 't'],
    ['revenue during last month', 'sales during this quarter']
  ),

  // Metric + Filter
  createPattern(
    'metric-where-filter',
    '{m} where {f}',
    'Q @{m} ?{f}',
    20,
    ['m', 'f'],
    ['revenue where active', 'orders where enterprise', 'sales where premium']
  ),

  createPattern(
    'metric-for-filter',
    '{m} for {f}',
    'Q @{m} ?{f}',
    20,
    ['m', 'f'],
    ['revenue for enterprise', 'orders for premium customers']
  ),

  createPattern(
    'metric-filter-only',
    '{f} {m}',
    'Q @{m} ?{f}',
    18,
    ['f', 'm'],
    ['active revenue', 'enterprise orders', 'premium sales']
  ),

  // ==========================================================================
  // Priority 10: Simple single-slot patterns
  // ==========================================================================

  // Single metric (most basic)
  createPattern(
    'metric-only',
    '{m}',
    'Q @{m}',
    10,
    ['m'],
    ['revenue', 'orders', 'sales', 'mrr', 'aov', 'conversion rate']
  ),

  createPattern(
    'show-metric',
    'show {m}',
    'Q @{m}',
    12,
    ['m'],
    ['show revenue', 'show orders', 'show mrr']
  ),

  createPattern(
    'get-metric',
    'get {m}',
    'Q @{m}',
    12,
    ['m'],
    ['get revenue', 'get total orders', 'get mrr']
  ),

  createPattern(
    'what-is-metric',
    'what is {m}',
    'Q @{m}',
    12,
    ['m'],
    ['what is revenue', 'what is mrr', 'what is the total orders']
  ),

  createPattern(
    'whats-metric',
    "what's {m}",
    'Q @{m}',
    12,
    ['m'],
    ["what's revenue", "what's the mrr"]
  ),

  createPattern(
    'total-metric',
    'total {m}',
    'Q @{m}',
    12,
    ['m'],
    ['total revenue', 'total orders', 'total sales']
  ),

  createPattern(
    'how-much-metric',
    'how much {m}',
    'Q @{m}',
    12,
    ['m'],
    ['how much revenue', 'how much in orders']
  ),

  createPattern(
    'how-many-metric',
    'how many {m}',
    'Q @{m}',
    12,
    ['m'],
    ['how many orders', 'how many customers', 'how many sales']
  ),

  // ==========================================================================
  // Priority 5: Trend and growth patterns
  // ==========================================================================

  createPattern(
    'metric-trend-time',
    '{m} trend {t}',
    'Q @{m} ~{t} trend',
    25,
    ['m', 't'],
    ['revenue trend last 12 months', 'orders trend this year']
  ),

  createPattern(
    'metric-over-time',
    '{m} over time',
    'Q @{m} trend',
    15,
    ['m'],
    ['revenue over time', 'orders over time', 'mrr over time']
  ),

  createPattern(
    'metric-growth-time',
    '{m} growth {t}',
    'Q @{m} ~{t} growth',
    25,
    ['m', 't'],
    ['revenue growth last quarter', 'mrr growth this year']
  ),

  createPattern(
    'metric-change-time',
    '{m} change {t}',
    'Q @{m} ~{t} change',
    25,
    ['m', 't'],
    ['revenue change last month', 'orders change this week']
  ),
];

// =============================================================================
// Pattern Lookup Utilities
// =============================================================================

/**
 * Get patterns sorted by priority (highest first)
 */
export function getPatternsByPriority(): Pattern[] {
  return [...DEFAULT_PATTERNS].sort((a, b) => b.priority - a.priority);
}

/**
 * Get patterns that match specific slot types
 */
export function getPatternsForSlots(slots: SlotType[]): Pattern[] {
  return DEFAULT_PATTERNS.filter((pattern) =>
    slots.every((slot) => pattern.requiredSlots.includes(slot))
  );
}

/**
 * Get patterns by ID prefix
 */
export function getPatternsByIdPrefix(prefix: string): Pattern[] {
  return DEFAULT_PATTERNS.filter((pattern) => pattern.id.startsWith(prefix));
}

/**
 * Find a pattern by exact ID
 */
export function getPatternById(id: string): Pattern | undefined {
  return DEFAULT_PATTERNS.find((pattern) => pattern.id === id);
}

/**
 * Get all time slot keys (normalized to lowercase)
 */
export function getTimeSlotKeys(): string[] {
  return Object.keys(TIME_SLOTS);
}

/**
 * Resolve a natural language time expression to LC token
 */
export function resolveTimeSlot(expression: string): string | undefined {
  const normalized = expression.toLowerCase().trim();
  return TIME_SLOTS[normalized];
}

/**
 * Check if a string matches a known time expression
 */
export function isTimeExpression(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return normalized in TIME_SLOTS;
}
