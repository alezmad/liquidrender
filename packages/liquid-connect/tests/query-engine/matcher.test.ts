/**
 * Query Engine Pattern Matcher Tests
 *
 * Comprehensive tests for the pattern matching engine that converts
 * normalized natural language input to LC DSL output.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { match, matchPattern, fillSlots, buildOutput, parseTemplate, getSlotTypes } from '../../src/query/matcher';
import type { CompiledVocabulary, Pattern, MetricSlotEntry, DimensionSlotEntry, SlotEntry } from '../../src/vocabulary/types';
import type { NormalizeResult } from '../../src/query/types';

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Create a mock MetricSlotEntry
 */
function createMetricEntry(
  slug: string,
  canonical: string,
  options: Partial<MetricSlotEntry> = {}
): MetricSlotEntry {
  return {
    slug,
    canonical,
    aliases: [],
    aggregation: 'sum',
    confidence: 100,
    ...options,
  };
}

/**
 * Create a mock DimensionSlotEntry
 */
function createDimensionEntry(
  slug: string,
  canonical: string,
  options: Partial<DimensionSlotEntry> = {}
): DimensionSlotEntry {
  return {
    slug,
    canonical,
    aliases: [],
    safeForGroupBy: true,
    ...options,
  };
}

/**
 * Create a mock SlotEntry (for filters)
 */
function createFilterEntry(
  slug: string,
  canonical: string,
  options: Partial<SlotEntry> = {}
): SlotEntry {
  return {
    slug,
    canonical,
    aliases: [],
    ...options,
  };
}

/**
 * Create a mock Pattern
 */
function createPattern(
  id: string,
  template: string,
  output: string,
  priority: number,
  requiredSlots: Array<'m' | 'd' | 'f' | 't' | 'n' | 'd2' | 't2'>,
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

/**
 * Create a mock NormalizeResult
 */
function createNormalizeResult(input: string): NormalizeResult {
  return {
    original: input,
    normalized: input.toLowerCase().trim(),
    tokens: input.toLowerCase().trim().split(/\s+/),
    substitutions: [],
  };
}

/**
 * Create a mock CompiledVocabulary with given entries
 */
function createMockVocabulary(options: {
  metrics?: MetricSlotEntry[];
  dimensions?: DimensionSlotEntry[];
  filters?: SlotEntry[];
  patterns?: Pattern[];
  synonyms?: {
    global?: Record<string, string>;
    org?: Record<string, string>;
    user?: Record<string, string>;
  };
}): CompiledVocabulary {
  return {
    version: '1.0.0',
    vocabularyId: 'test-vocab',
    compiledAt: new Date(),
    patterns: options.patterns || [],
    slots: {
      m: options.metrics || [],
      d: options.dimensions || [],
      f: options.filters || [],
      t: [], // Time slots are handled by TIME_SLOTS
    },
    synonyms: {
      global: options.synonyms?.global || {},
      org: options.synonyms?.org || {},
      user: options.synonyms?.user || {},
    },
    metricAggregations: {},
    dimensionCardinalities: {},
    safeDimensions: [],
  };
}

// =============================================================================
// Test Vocabulary Setup
// =============================================================================

let testVocabulary: CompiledVocabulary;

beforeEach(() => {
  // Create mock vocabulary with metrics, dimensions, and filters
  testVocabulary = createMockVocabulary({
    metrics: [
      createMetricEntry('revenue', 'Revenue', {
        aliases: ['sales', 'income'],
        abbreviation: 'rev',
      }),
      createMetricEntry('orders', 'Orders', {
        aliases: ['order count', 'num orders'],
        aggregation: 'count',
      }),
    ],
    dimensions: [
      createDimensionEntry('region', 'Region', {
        aliases: ['area', 'territory'],
        cardinality: 50,
      }),
      createDimensionEntry('category', 'Category', {
        aliases: ['cat', 'product category'],
        cardinality: 20,
      }),
    ],
    filters: [
      createFilterEntry('active', 'Active', {
        aliases: ['is active', 'enabled'],
      }),
    ],
    patterns: [
      // Pattern: "{m}" -> "Q @{m}" (metric only)
      createPattern('metric-only', '{m}', 'Q @{m}', 10, ['m'], ['revenue', 'orders']),

      // Pattern: "{m} by {d}" -> "Q @{m} #{d}" (metric + dimension)
      createPattern('metric-by-dim', '{m} by {d}', 'Q @{m} #{d}', 22, ['m', 'd'], [
        'revenue by region',
        'orders by category',
      ]),

      // Pattern: "{m} by {d} {t}" -> "Q @{m} #{d} ~{t}" (metric + dim + time)
      createPattern('metric-dim-time', '{m} by {d} {t}', 'Q @{m} #{d} ~{t}', 32, ['m', 'd', 't'], [
        'revenue by region last month',
        'orders by category this week',
      ]),

      // Pattern: "top {n} {d} by {m}" -> "Q @{m} #{d} top:{n} -@{m}"
      createPattern('top-n-dim-by-metric', 'top {n} {d} by {m}', 'Q @{m} #{d} top:{n} -@{m}', 52, ['n', 'd', 'm'], [
        'top 10 products by revenue',
        'top 5 regions by orders',
      ]),

      // Pattern: "{m} {t}" -> "Q @{m} ~{t}" (metric + time)
      createPattern('metric-time', '{m} {t}', 'Q @{m} ~{t}', 20, ['m', 't'], [
        'revenue last month',
        'orders today',
      ]),

      // Pattern: "{m} where {f}" -> "Q @{m} ?{f}" (metric + filter)
      createPattern('metric-where-filter', '{m} where {f}', 'Q @{m} ?{f}', 20, ['m', 'f'], [
        'revenue where active',
        'orders where active',
      ]),
    ],
    synonyms: {
      global: {
        sales: 'revenue',
        income: 'revenue',
      },
      org: {
        turnover: 'revenue',
      },
      user: {
        'my metric': 'revenue',
      },
    },
  });
});

// =============================================================================
// parseTemplate Tests
// =============================================================================

describe('parseTemplate', () => {
  test('parses single slot template', () => {
    const segments = parseTemplate('{m}');
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: 'slot', value: 'm' });
  });

  test('parses two-slot template with literal', () => {
    const segments = parseTemplate('{m} by {d}');
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: 'slot', value: 'm' });
    expect(segments[1]).toEqual({ type: 'literal', value: ' by ' });
    expect(segments[2]).toEqual({ type: 'slot', value: 'd' });
  });

  test('parses three-slot template', () => {
    const segments = parseTemplate('{m} by {d} {t}');
    // Note: space between {d} and {t} creates a literal segment
    expect(segments).toHaveLength(5);
    expect(segments[0]).toEqual({ type: 'slot', value: 'm' });
    expect(segments[1]).toEqual({ type: 'literal', value: ' by ' });
    expect(segments[2]).toEqual({ type: 'slot', value: 'd' });
    expect(segments[3]).toEqual({ type: 'literal', value: ' ' });
    expect(segments[4]).toEqual({ type: 'slot', value: 't' });
  });

  test('parses template with leading literal', () => {
    const segments = parseTemplate('top {n} {d} by {m}');
    // "top {n} {d} by {m}" -> "top " + {n} + " " + {d} + " by " + {m}
    expect(segments).toHaveLength(6);
    expect(segments[0]).toEqual({ type: 'literal', value: 'top ' });
    expect(segments[1]).toEqual({ type: 'slot', value: 'n' });
    expect(segments[2]).toEqual({ type: 'literal', value: ' ' });
    expect(segments[3]).toEqual({ type: 'slot', value: 'd' });
    expect(segments[4]).toEqual({ type: 'literal', value: ' by ' });
    expect(segments[5]).toEqual({ type: 'slot', value: 'm' });
  });

  test('parses template with trailing literal', () => {
    const segments = parseTemplate('{m} over time');
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: 'slot', value: 'm' });
    expect(segments[1]).toEqual({ type: 'literal', value: ' over time' });
  });

  test('parses complex slot types', () => {
    const segments = parseTemplate('{m} {t} vs {t2}');
    // "{m} {t} vs {t2}" -> {m} + " " + {t} + " vs " + {t2}
    expect(segments).toHaveLength(5);
    expect(segments[0]).toEqual({ type: 'slot', value: 'm' });
    expect(segments[1]).toEqual({ type: 'literal', value: ' ' });
    expect(segments[2]).toEqual({ type: 'slot', value: 't' });
    expect(segments[3]).toEqual({ type: 'literal', value: ' vs ' });
    expect(segments[4]).toEqual({ type: 'slot', value: 't2' });
  });
});

// =============================================================================
// getSlotTypes Tests
// =============================================================================

describe('getSlotTypes', () => {
  test('extracts single slot type', () => {
    const slots = getSlotTypes('{m}');
    expect(slots).toEqual(['m']);
  });

  test('extracts multiple slot types', () => {
    const slots = getSlotTypes('{m} by {d} {t}');
    expect(slots).toEqual(['m', 'd', 't']);
  });

  test('handles d2 slot type', () => {
    const slots = getSlotTypes('{m} by {d} and {d2}');
    expect(slots).toEqual(['m', 'd', 'd2']);
  });

  test('handles t2 slot type', () => {
    const slots = getSlotTypes('{m} {t} vs {t2}');
    expect(slots).toEqual(['m', 't', 't2']);
  });

  test('handles n slot type', () => {
    const slots = getSlotTypes('top {n} {d} by {m}');
    expect(slots).toEqual(['n', 'd', 'm']);
  });

  test('returns empty array for template with no slots', () => {
    const slots = getSlotTypes('show all');
    expect(slots).toEqual([]);
  });
});

// =============================================================================
// matchPattern Tests
// =============================================================================

describe('matchPattern', () => {
  test('matches metric-only pattern "{m}"', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-only')!;
    const result = matchPattern('revenue', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches).toHaveLength(1);
    expect(result.slotMatches![0].slotType).toBe('m');
    expect(result.slotMatches![0].resolvedValue).toBe('revenue');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('matches metric-by-dim pattern "{m} by {d}"', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-by-dim')!;
    const result = matchPattern('revenue by region', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches).toHaveLength(2);
    expect(result.slotMatches![0].slotType).toBe('m');
    expect(result.slotMatches![0].resolvedValue).toBe('revenue');
    expect(result.slotMatches![1].slotType).toBe('d');
    expect(result.slotMatches![1].resolvedValue).toBe('region');
  });

  test('matches metric-dim-time pattern "{m} by {d} {t}"', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-dim-time')!;
    const result = matchPattern('orders by category last month', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches).toHaveLength(3);
    expect(result.slotMatches![0].slotType).toBe('m');
    expect(result.slotMatches![0].resolvedValue).toBe('orders');
    expect(result.slotMatches![1].slotType).toBe('d');
    expect(result.slotMatches![1].resolvedValue).toBe('category');
    expect(result.slotMatches![2].slotType).toBe('t');
    expect(result.slotMatches![2].resolvedValue).toBe('M-1');
  });

  test('matches top-n pattern "top {n} {d} by {m}"', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'top-n-dim-by-metric')!;
    const result = matchPattern('top 10 region by revenue', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches).toHaveLength(3);
    expect(result.slotMatches![0].slotType).toBe('n');
    expect(result.slotMatches![0].resolvedValue).toBe('10');
    expect(result.slotMatches![1].slotType).toBe('d');
    expect(result.slotMatches![1].resolvedValue).toBe('region');
    expect(result.slotMatches![2].slotType).toBe('m');
    expect(result.slotMatches![2].resolvedValue).toBe('revenue');
  });

  test('matches metric via alias', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-only')!;
    const result = matchPattern('sales', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches![0].resolvedValue).toBe('revenue');
    expect(result.confidence).toBeLessThan(1); // Alias match has lower confidence
  });

  test('matches dimension via alias', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-by-dim')!;
    const result = matchPattern('revenue by area', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches![1].resolvedValue).toBe('region');
  });

  test('matches metric via abbreviation', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-only')!;
    const result = matchPattern('rev', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches![0].resolvedValue).toBe('revenue');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test('fails to match unknown metric', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-only')!;
    const result = matchPattern('unknown_metric', pattern, testVocabulary);

    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0);
  });

  test('fails to match incomplete input', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-by-dim')!;
    const result = matchPattern('revenue by', pattern, testVocabulary);

    expect(result.matched).toBe(false);
  });

  test('fails to match extra trailing text', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-only')!;
    const result = matchPattern('revenue extra text', pattern, testVocabulary);

    // Pattern matching fails because there's unmatched trailing text
    expect(result.matched).toBe(false);
    // Remainder may or may not be set depending on where match fails
    expect(result.confidence).toBe(0);
  });

  test('matches word numbers in top-n pattern', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'top-n-dim-by-metric')!;
    const result = matchPattern('top five region by revenue', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches![0].resolvedValue).toBe('5');
    expect(result.slotMatches![0].confidence).toBe(0.95);
  });

  test('matches various time expressions', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-time')!;

    // Test "today"
    const todayResult = matchPattern('revenue today', pattern, testVocabulary);
    expect(todayResult.matched).toBe(true);
    expect(todayResult.slotMatches![1].resolvedValue).toBe('today');

    // Test "this week"
    const thisWeekResult = matchPattern('revenue this week', pattern, testVocabulary);
    expect(thisWeekResult.matched).toBe(true);
    expect(thisWeekResult.slotMatches![1].resolvedValue).toBe('this_week');

    // Test "last quarter"
    const lastQuarterResult = matchPattern('revenue last quarter', pattern, testVocabulary);
    expect(lastQuarterResult.matched).toBe(true);
    expect(lastQuarterResult.slotMatches![1].resolvedValue).toBe('Q-1');

    // Test "ytd"
    const ytdResult = matchPattern('revenue ytd', pattern, testVocabulary);
    expect(ytdResult.matched).toBe(true);
    expect(ytdResult.slotMatches![1].resolvedValue).toBe('YTD');
  });

  test('matches dynamic time patterns like "last 45 days"', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-time')!;
    const result = matchPattern('revenue last 45 days', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches![1].resolvedValue).toBe('D-45');
    expect(result.slotMatches![1].confidence).toBe(0.95);
  });

  test('matches filter slot', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-where-filter')!;
    const result = matchPattern('revenue where active', pattern, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.slotMatches).toHaveLength(2);
    expect(result.slotMatches![1].slotType).toBe('f');
    expect(result.slotMatches![1].resolvedValue).toBe('active');
  });
});

// =============================================================================
// fillSlots Tests
// =============================================================================

describe('fillSlots', () => {
  test('fills single metric slot', () => {
    const slotMatches = [
      {
        slotType: 'm' as const,
        matchedText: 'revenue',
        resolvedValue: 'revenue',
        confidence: 1,
      },
    ];

    const slots = fillSlots(slotMatches, testVocabulary);
    expect(slots).toEqual({ m: 'revenue' });
  });

  test('fills multiple slots', () => {
    const slotMatches = [
      {
        slotType: 'm' as const,
        matchedText: 'revenue',
        resolvedValue: 'revenue',
        confidence: 1,
      },
      {
        slotType: 'd' as const,
        matchedText: 'region',
        resolvedValue: 'region',
        confidence: 1,
      },
      {
        slotType: 't' as const,
        matchedText: 'last month',
        resolvedValue: 'M-1',
        confidence: 1,
      },
    ];

    const slots = fillSlots(slotMatches, testVocabulary);
    expect(slots).toEqual({
      m: 'revenue',
      d: 'region',
      t: 'M-1',
    });
  });

  test('fills number slot', () => {
    const slotMatches = [
      {
        slotType: 'n' as const,
        matchedText: '10',
        resolvedValue: '10',
        confidence: 1,
      },
      {
        slotType: 'd' as const,
        matchedText: 'region',
        resolvedValue: 'region',
        confidence: 1,
      },
      {
        slotType: 'm' as const,
        matchedText: 'revenue',
        resolvedValue: 'revenue',
        confidence: 1,
      },
    ];

    const slots = fillSlots(slotMatches, testVocabulary);
    expect(slots).toEqual({
      n: '10',
      d: 'region',
      m: 'revenue',
    });
  });

  test('fills d2 slot separately from d', () => {
    const slotMatches = [
      {
        slotType: 'm' as const,
        matchedText: 'revenue',
        resolvedValue: 'revenue',
        confidence: 1,
      },
      {
        slotType: 'd' as const,
        matchedText: 'region',
        resolvedValue: 'region',
        confidence: 1,
      },
      {
        slotType: 'd2' as const,
        matchedText: 'category',
        resolvedValue: 'category',
        confidence: 1,
      },
    ];

    const slots = fillSlots(slotMatches, testVocabulary);
    expect(slots).toEqual({
      m: 'revenue',
      d: 'region',
      d2: 'category',
    });
  });

  test('fills t2 slot for comparisons', () => {
    const slotMatches = [
      {
        slotType: 'm' as const,
        matchedText: 'revenue',
        resolvedValue: 'revenue',
        confidence: 1,
      },
      {
        slotType: 't' as const,
        matchedText: 'this month',
        resolvedValue: 'this_month',
        confidence: 1,
      },
      {
        slotType: 't2' as const,
        matchedText: 'last month',
        resolvedValue: 'M-1',
        confidence: 1,
      },
    ];

    const slots = fillSlots(slotMatches, testVocabulary);
    expect(slots).toEqual({
      m: 'revenue',
      t: 'this_month',
      t2: 'M-1',
    });
  });

  test('returns empty object for empty slot matches', () => {
    const slots = fillSlots([], testVocabulary);
    expect(slots).toEqual({});
  });
});

// =============================================================================
// buildOutput Tests
// =============================================================================

describe('buildOutput', () => {
  test('builds metric-only output "Q @{m}"', () => {
    const output = buildOutput('Q @{m}', { m: 'revenue' });
    expect(output).toBe('Q @revenue');
  });

  test('builds metric-dimension output "Q @{m} #{d}"', () => {
    const output = buildOutput('Q @{m} #{d}', { m: 'revenue', d: 'region' });
    expect(output).toBe('Q @revenue #region');
  });

  test('builds metric-dim-time output "Q @{m} #{d} ~{t}"', () => {
    const output = buildOutput('Q @{m} #{d} ~{t}', {
      m: 'revenue',
      d: 'region',
      t: 'M-1',
    });
    expect(output).toBe('Q @revenue #region ~M-1');
  });

  test('builds top-n output "Q @{m} #{d} top:{n} -@{m}"', () => {
    const output = buildOutput('Q @{m} #{d} top:{n} -@{m}', {
      m: 'revenue',
      d: 'region',
      n: '10',
    });
    expect(output).toBe('Q @revenue #region top:10 -@revenue');
  });

  test('builds comparison output "Q @{m} ~{t} vs ~{t2}"', () => {
    const output = buildOutput('Q @{m} ~{t} vs ~{t2}', {
      m: 'revenue',
      t: 'this_month',
      t2: 'M-1',
    });
    expect(output).toBe('Q @revenue ~this_month vs ~M-1');
  });

  test('builds output with filter "Q @{m} ?{f}"', () => {
    const output = buildOutput('Q @{m} ?{f}', {
      m: 'revenue',
      f: 'active',
    });
    expect(output).toBe('Q @revenue ?active');
  });

  test('builds two-dimension output "Q @{m} #{d} #{d2}"', () => {
    const output = buildOutput('Q @{m} #{d} #{d2}', {
      m: 'revenue',
      d: 'region',
      d2: 'category',
    });
    expect(output).toBe('Q @revenue #region #category');
  });

  test('handles multiple occurrences of same slot', () => {
    const output = buildOutput('Q @{m} top:5 -@{m}', { m: 'revenue' });
    expect(output).toBe('Q @revenue top:5 -@revenue');
  });

  test('leaves unmatched placeholders unchanged', () => {
    const output = buildOutput('Q @{m} #{d}', { m: 'revenue' });
    expect(output).toBe('Q @revenue #{d}');
  });

  test('handles empty slots object', () => {
    const output = buildOutput('Q @{m}', {});
    expect(output).toBe('Q @{m}');
  });

  test('handles special characters in slot values', () => {
    const output = buildOutput('Q @{m}', { m: 'revenue-total' });
    expect(output).toBe('Q @revenue-total');
  });
});

// =============================================================================
// match() Integration Tests
// =============================================================================

describe('match', () => {
  describe('successful matches', () => {
    test('returns matched=true with pattern, slots, lcOutput, confidence for metric-only', () => {
      const normalized = createNormalizeResult('revenue');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern).toBeDefined();
      expect(result.pattern!.id).toBe('metric-only');
      expect(result.slots).toEqual({ m: 'revenue' });
      expect(result.lcOutput).toBe('Q @revenue');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchType).toBe('exact');
    });

    test('returns matched=true for metric-by-dim pattern', () => {
      const normalized = createNormalizeResult('orders by category');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('metric-by-dim');
      expect(result.slots).toEqual({ m: 'orders', d: 'category' });
      expect(result.lcOutput).toBe('Q @orders #category');
    });

    test('returns matched=true for metric-dim-time pattern', () => {
      const normalized = createNormalizeResult('revenue by region last month');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('metric-dim-time');
      expect(result.slots).toEqual({ m: 'revenue', d: 'region', t: 'M-1' });
      expect(result.lcOutput).toBe('Q @revenue #region ~M-1');
    });

    test('returns matched=true for top-n pattern', () => {
      const normalized = createNormalizeResult('top 10 region by revenue');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('top-n-dim-by-metric');
      expect(result.slots).toEqual({ n: '10', d: 'region', m: 'revenue' });
      expect(result.lcOutput).toBe('Q @revenue #region top:10 -@revenue');
    });

    test('returns matched=true for metric with time', () => {
      const normalized = createNormalizeResult('orders today');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('metric-time');
      expect(result.slots).toEqual({ m: 'orders', t: 'today' });
      expect(result.lcOutput).toBe('Q @orders ~today');
    });

    test('returns matched=true for metric with filter', () => {
      const normalized = createNormalizeResult('revenue where active');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('metric-where-filter');
      expect(result.slots).toEqual({ m: 'revenue', f: 'active' });
      expect(result.lcOutput).toBe('Q @revenue ?active');
    });
  });

  describe('failed matches', () => {
    test('returns matched=false when no pattern matches', () => {
      const normalized = createNormalizeResult('completely unknown query');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.pattern).toBeUndefined();
      expect(result.slots).toBeUndefined();
      expect(result.lcOutput).toBeUndefined();
    });

    test('returns matched=false for partial input', () => {
      const normalized = createNormalizeResult('revenue by');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(false);
    });

    test('returns matched=false for unknown metric', () => {
      const normalized = createNormalizeResult('profit by region');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(false);
    });

    test('returns matched=false for unknown dimension', () => {
      const normalized = createNormalizeResult('revenue by country');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(false);
    });
  });

  describe('priority ordering', () => {
    test('prioritizes higher priority patterns over lower ones', () => {
      // "top 5 region by revenue" should match top-n (priority 52) not metric-only (priority 10)
      const normalized = createNormalizeResult('top 5 region by revenue');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('top-n-dim-by-metric');
      expect(result.pattern!.priority).toBe(52);
    });

    test('matches metric-dim-time (priority 32) over metric-by-dim (priority 22)', () => {
      const normalized = createNormalizeResult('revenue by region last month');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('metric-dim-time');
      expect(result.pattern!.priority).toBe(32);
    });

    test('falls back to lower priority pattern when higher priority fails', () => {
      // "revenue" can only match metric-only (priority 10)
      const normalized = createNormalizeResult('revenue');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.pattern!.id).toBe('metric-only');
      expect(result.pattern!.priority).toBe(10);
    });
  });

  describe('synonym resolution', () => {
    test('matches via global synonym', () => {
      const normalized = createNormalizeResult('sales by region');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.slots!.m).toBe('revenue'); // "sales" resolved to "revenue"
    });

    test('matches via org synonym', () => {
      const vocabWithOrgSynonym = createMockVocabulary({
        metrics: [createMetricEntry('revenue', 'Revenue')],
        dimensions: [createDimensionEntry('region', 'Region')],
        patterns: [createPattern('metric-by-dim', '{m} by {d}', 'Q @{m} #{d}', 22, ['m', 'd'])],
        synonyms: {
          org: { turnover: 'revenue' },
          global: {},
          user: {},
        },
      });

      const normalized = createNormalizeResult('turnover by region');
      const result = match(normalized, vocabWithOrgSynonym);

      expect(result.matched).toBe(true);
      expect(result.slots!.m).toBe('revenue');
    });

    test('matches via user synonym with highest priority', () => {
      const vocabWithUserSynonym = createMockVocabulary({
        metrics: [createMetricEntry('revenue', 'Revenue')],
        patterns: [createPattern('metric-only', '{m}', 'Q @{m}', 10, ['m'])],
        synonyms: {
          user: { 'my metric': 'revenue' },
          org: {},
          global: {},
        },
      });

      const normalized = createNormalizeResult('my metric');
      const result = match(normalized, vocabWithUserSynonym);

      expect(result.matched).toBe(true);
      expect(result.slots!.m).toBe('revenue');
    });
  });

  describe('confidence scores', () => {
    test('returns high confidence for exact slug match', () => {
      const normalized = createNormalizeResult('revenue');
      const result = match(normalized, testVocabulary);

      expect(result.confidence).toBe(1);
    });

    test('returns lower confidence for alias match', () => {
      const normalized = createNormalizeResult('sales');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.confidence).toBeLessThan(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('returns appropriate confidence for abbreviation match', () => {
      const normalized = createNormalizeResult('rev');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('returns appropriate confidence for word number match', () => {
      const normalized = createNormalizeResult('top ten region by revenue');
      const result = match(normalized, testVocabulary);

      expect(result.matched).toBe(true);
      // Confidence should be average of all slot matches
      expect(result.confidence).toBeLessThan(1);
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('edge cases', () => {
  test('handles empty input', () => {
    const normalized = createNormalizeResult('');
    const result = match(normalized, testVocabulary);

    expect(result.matched).toBe(false);
  });

  test('handles whitespace-only input', () => {
    const normalized = createNormalizeResult('   ');
    const result = match(normalized, testVocabulary);

    expect(result.matched).toBe(false);
  });

  test('handles input with extra whitespace', () => {
    const normalized = createNormalizeResult('  revenue   by   region  ');
    const result = match(normalized, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.lcOutput).toBe('Q @revenue #region');
  });

  test('handles case-insensitive matching', () => {
    const normalized = createNormalizeResult('REVENUE BY REGION');
    const result = match(normalized, testVocabulary);

    expect(result.matched).toBe(true);
    expect(result.lcOutput).toBe('Q @revenue #region');
  });

  test('handles vocabulary with no patterns', () => {
    const emptyVocab = createMockVocabulary({
      metrics: [createMetricEntry('revenue', 'Revenue')],
      patterns: [],
    });

    const normalized = createNormalizeResult('revenue');
    const result = match(normalized, emptyVocab);

    expect(result.matched).toBe(false);
  });

  test('handles vocabulary with no slot entries', () => {
    const emptySlotVocab = createMockVocabulary({
      metrics: [],
      dimensions: [],
      patterns: [createPattern('metric-only', '{m}', 'Q @{m}', 10, ['m'])],
    });

    const normalized = createNormalizeResult('revenue');
    const result = match(normalized, emptySlotVocab);

    expect(result.matched).toBe(false);
  });

  test('handles dynamic time patterns with different units', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-time')!;

    // Days
    const daysResult = matchPattern('revenue last 30 days', pattern, testVocabulary);
    expect(daysResult.matched).toBe(true);
    expect(daysResult.slotMatches![1].resolvedValue).toBe('D-30');

    // Weeks
    const weeksResult = matchPattern('revenue last 4 weeks', pattern, testVocabulary);
    expect(weeksResult.matched).toBe(true);
    expect(weeksResult.slotMatches![1].resolvedValue).toBe('W-4');

    // Months
    const monthsResult = matchPattern('revenue last 6 months', pattern, testVocabulary);
    expect(monthsResult.matched).toBe(true);
    expect(monthsResult.slotMatches![1].resolvedValue).toBe('M-6');

    // Years
    const yearsResult = matchPattern('revenue last 2 years', pattern, testVocabulary);
    expect(yearsResult.matched).toBe(true);
    expect(yearsResult.slotMatches![1].resolvedValue).toBe('Y-2');

    // Quarters
    const quartersResult = matchPattern('revenue last 3 quarters', pattern, testVocabulary);
    expect(quartersResult.matched).toBe(true);
    expect(quartersResult.slotMatches![1].resolvedValue).toBe('Q-3');
  });

  test('handles "past" as synonym for "last" in time patterns', () => {
    const pattern = testVocabulary.patterns.find((p) => p.id === 'metric-time')!;

    const result = matchPattern('revenue past 30 days', pattern, testVocabulary);
    expect(result.matched).toBe(true);
    expect(result.slotMatches![1].resolvedValue).toBe('D-30');
  });
});

// =============================================================================
// Complex Pattern Scenarios
// =============================================================================

describe('complex pattern scenarios', () => {
  test('handles filter alias matching', () => {
    const vocabWithFilterAliases = createMockVocabulary({
      metrics: [createMetricEntry('revenue', 'Revenue')],
      filters: [
        createFilterEntry('active', 'Active', {
          aliases: ['is active', 'enabled', 'live'],
        }),
      ],
      patterns: [createPattern('metric-where-filter', '{m} where {f}', 'Q @{m} ?{f}', 20, ['m', 'f'])],
    });

    const normalized = createNormalizeResult('revenue where enabled');
    const result = match(normalized, vocabWithFilterAliases);

    expect(result.matched).toBe(true);
    expect(result.slots!.f).toBe('active');
  });

  test('handles multi-word dimension names', () => {
    const vocabWithMultiWord = createMockVocabulary({
      metrics: [createMetricEntry('revenue', 'Revenue')],
      dimensions: [
        createDimensionEntry('product_category', 'Product Category', {
          aliases: ['product cat', 'category'],
        }),
      ],
      patterns: [createPattern('metric-by-dim', '{m} by {d}', 'Q @{m} #{d}', 22, ['m', 'd'])],
    });

    const normalized = createNormalizeResult('revenue by product category');
    const result = match(normalized, vocabWithMultiWord);

    expect(result.matched).toBe(true);
    expect(result.slots!.d).toBe('product_category');
  });

  test('handles multiple patterns with same template but different priorities', () => {
    const vocabWithDuplicates = createMockVocabulary({
      metrics: [createMetricEntry('revenue', 'Revenue')],
      dimensions: [createDimensionEntry('region', 'Region')],
      patterns: [
        createPattern('metric-by-dim-high', '{m} by {d}', 'Q @{m} #{d} !priority', 50, ['m', 'd']),
        createPattern('metric-by-dim-low', '{m} by {d}', 'Q @{m} #{d}', 22, ['m', 'd']),
      ],
    });

    const normalized = createNormalizeResult('revenue by region');
    const result = match(normalized, vocabWithDuplicates);

    expect(result.matched).toBe(true);
    expect(result.pattern!.id).toBe('metric-by-dim-high');
    expect(result.lcOutput).toBe('Q @revenue #region !priority');
  });
});
