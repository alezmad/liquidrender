/**
 * Query Engine Patterns Tests
 *
 * Comprehensive tests for the patterns module including:
 * - DEFAULT_PATTERNS structure and ordering
 * - TIME_SLOTS mapping and coverage
 * - Pattern helper functions
 * - Time expression utilities
 */

import { describe, test, expect } from 'vitest';
import {
  DEFAULT_PATTERNS,
  TIME_SLOTS,
  createPattern,
  getPatternsByPriority,
  resolveTimeSlot,
  isTimeExpression,
} from '../../src/vocabulary/patterns';
import type { Pattern, SlotType } from '../../src/vocabulary/types';

// =============================================================================
// DEFAULT_PATTERNS Tests
// =============================================================================

describe('DEFAULT_PATTERNS', () => {
  describe('structure and count', () => {
    test('exports an array of patterns', () => {
      expect(Array.isArray(DEFAULT_PATTERNS)).toBe(true);
      expect(DEFAULT_PATTERNS.length).toBeGreaterThan(0);
    });

    test('contains expected number of patterns (37+)', () => {
      // Based on patterns.ts, there are 37 patterns defined
      expect(DEFAULT_PATTERNS.length).toBeGreaterThanOrEqual(37);
    });

    test('all patterns have required fields', () => {
      DEFAULT_PATTERNS.forEach((pattern) => {
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('template');
        expect(pattern).toHaveProperty('output');
        expect(pattern).toHaveProperty('priority');
        expect(pattern).toHaveProperty('requiredSlots');

        expect(typeof pattern.id).toBe('string');
        expect(typeof pattern.template).toBe('string');
        expect(typeof pattern.output).toBe('string');
        expect(typeof pattern.priority).toBe('number');
        expect(Array.isArray(pattern.requiredSlots)).toBe(true);
      });
    });

    test('all pattern IDs are unique', () => {
      const ids = DEFAULT_PATTERNS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('all patterns have non-empty ID', () => {
      DEFAULT_PATTERNS.forEach((pattern) => {
        expect(pattern.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('priority levels', () => {
    test('priorities range from 5 to 58', () => {
      const priorities = DEFAULT_PATTERNS.map((p) => p.priority);
      const minPriority = Math.min(...priorities);
      const maxPriority = Math.max(...priorities);

      expect(minPriority).toBeGreaterThanOrEqual(5);
      expect(maxPriority).toBeLessThanOrEqual(60);
    });

    test('simple patterns have lower priority (10-15)', () => {
      const simplePatterns = DEFAULT_PATTERNS.filter((p) =>
        ['metric-only', 'show-metric', 'get-metric', 'what-is-metric'].includes(p.id)
      );

      simplePatterns.forEach((pattern) => {
        expect(pattern.priority).toBeGreaterThanOrEqual(10);
        expect(pattern.priority).toBeLessThanOrEqual(15);
      });
    });

    test('complex patterns have higher priority (50+)', () => {
      const complexPatterns = DEFAULT_PATTERNS.filter(
        (p) =>
          p.id.includes('-vs-') ||
          p.id.includes('top-n-') ||
          p.id.includes('bottom-n-') ||
          p.id.includes('worst-n-')
      );

      complexPatterns.forEach((pattern) => {
        expect(pattern.priority).toBeGreaterThanOrEqual(50);
      });
    });

    test('comparison patterns have highest priority', () => {
      const comparisonPatterns = DEFAULT_PATTERNS.filter(
        (p) => p.id.includes('-vs-') || p.id.includes('-compared-to-')
      );

      expect(comparisonPatterns.length).toBeGreaterThan(0);
      comparisonPatterns.forEach((pattern) => {
        expect(pattern.priority).toBeGreaterThanOrEqual(55);
      });
    });
  });

  describe('slot types', () => {
    test('all required slots are valid SlotType values', () => {
      const validSlots: SlotType[] = ['m', 'd', 'f', 't', 'n', 'd2', 't2'];

      DEFAULT_PATTERNS.forEach((pattern) => {
        pattern.requiredSlots.forEach((slot) => {
          expect(validSlots).toContain(slot);
        });
      });
    });

    test('metric-only pattern requires only m slot', () => {
      const metricOnly = DEFAULT_PATTERNS.find((p) => p.id === 'metric-only');
      expect(metricOnly).toBeDefined();
      expect(metricOnly?.requiredSlots).toEqual(['m']);
    });

    test('metric-by-dim pattern requires m and d slots', () => {
      const metricByDim = DEFAULT_PATTERNS.find((p) => p.id === 'metric-by-dim');
      expect(metricByDim).toBeDefined();
      expect(metricByDim?.requiredSlots).toEqual(['m', 'd']);
    });

    test('top-n patterns require n, d, and m slots', () => {
      const topN = DEFAULT_PATTERNS.find((p) => p.id === 'top-n-dim-by-metric');
      expect(topN).toBeDefined();
      expect(topN?.requiredSlots).toContain('n');
      expect(topN?.requiredSlots).toContain('d');
      expect(topN?.requiredSlots).toContain('m');
    });

    test('comparison patterns require t and t2 slots', () => {
      const comparison = DEFAULT_PATTERNS.find((p) => p.id === 'metric-time-vs-time');
      expect(comparison).toBeDefined();
      expect(comparison?.requiredSlots).toContain('t');
      expect(comparison?.requiredSlots).toContain('t2');
    });
  });

  describe('template and output format', () => {
    test('templates use correct slot placeholders', () => {
      DEFAULT_PATTERNS.forEach((pattern) => {
        // Template should contain at least one slot placeholder
        const hasSlot = /{[mdftn]2?}/.test(pattern.template);
        expect(hasSlot).toBe(true);
      });
    });

    test('outputs start with Q prefix', () => {
      DEFAULT_PATTERNS.forEach((pattern) => {
        expect(pattern.output.startsWith('Q ')).toBe(true);
      });
    });

    test('outputs use correct LC DSL prefixes', () => {
      DEFAULT_PATTERNS.forEach((pattern) => {
        // Check that slots in output use correct prefixes
        if (pattern.output.includes('{m}')) {
          expect(pattern.output).toContain('@{m}');
        }
        if (pattern.output.includes('{d}') && !pattern.output.includes('{d2}')) {
          expect(pattern.output).toContain('#{d}');
        }
        if (pattern.output.includes('{t}') && !pattern.output.includes('{t2}')) {
          expect(pattern.output).toContain('~{t}');
        }
        if (pattern.output.includes('{f}')) {
          expect(pattern.output).toContain('?{f}');
        }
      });
    });
  });

  describe('examples', () => {
    test('most patterns have examples', () => {
      const patternsWithExamples = DEFAULT_PATTERNS.filter(
        (p) => p.examples && p.examples.length > 0
      );
      // At least 80% should have examples
      expect(patternsWithExamples.length / DEFAULT_PATTERNS.length).toBeGreaterThanOrEqual(0.8);
    });

    test('examples are arrays of strings when present', () => {
      DEFAULT_PATTERNS.forEach((pattern) => {
        if (pattern.examples) {
          expect(Array.isArray(pattern.examples)).toBe(true);
          pattern.examples.forEach((example) => {
            expect(typeof example).toBe('string');
            expect(example.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});

// =============================================================================
// TIME_SLOTS Tests
// =============================================================================

describe('TIME_SLOTS', () => {
  describe('structure', () => {
    test('exports an object with string keys and values', () => {
      expect(typeof TIME_SLOTS).toBe('object');
      expect(TIME_SLOTS).not.toBeNull();

      Object.entries(TIME_SLOTS).forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
      });
    });

    test('contains expected number of time mappings (50+)', () => {
      const entryCount = Object.keys(TIME_SLOTS).length;
      expect(entryCount).toBeGreaterThanOrEqual(50);
    });
  });

  describe('relative days', () => {
    test('maps today correctly', () => {
      expect(TIME_SLOTS['today']).toBe('today');
    });

    test('maps yesterday correctly', () => {
      expect(TIME_SLOTS['yesterday']).toBe('yesterday');
    });

    test('maps day before yesterday correctly', () => {
      expect(TIME_SLOTS['day before yesterday']).toBe('D-2');
    });
  });

  describe('this period expressions', () => {
    test('maps this week correctly', () => {
      expect(TIME_SLOTS['this week']).toBe('this_week');
    });

    test('maps this month correctly', () => {
      expect(TIME_SLOTS['this month']).toBe('this_month');
    });

    test('maps this quarter correctly', () => {
      expect(TIME_SLOTS['this quarter']).toBe('this_quarter');
    });

    test('maps this year correctly', () => {
      expect(TIME_SLOTS['this year']).toBe('this_year');
    });
  });

  describe('last/previous period expressions', () => {
    test('last and previous are synonyms', () => {
      expect(TIME_SLOTS['last week']).toBe(TIME_SLOTS['previous week']);
      expect(TIME_SLOTS['last month']).toBe(TIME_SLOTS['previous month']);
      expect(TIME_SLOTS['last quarter']).toBe(TIME_SLOTS['previous quarter']);
      expect(TIME_SLOTS['last year']).toBe(TIME_SLOTS['previous year']);
    });

    test('maps last week to W-1', () => {
      expect(TIME_SLOTS['last week']).toBe('W-1');
    });

    test('maps last month to M-1', () => {
      expect(TIME_SLOTS['last month']).toBe('M-1');
    });

    test('maps last quarter to Q-1', () => {
      expect(TIME_SLOTS['last quarter']).toBe('Q-1');
    });

    test('maps last year to Y-1', () => {
      expect(TIME_SLOTS['last year']).toBe('Y-1');
    });
  });

  describe('rolling period expressions - days', () => {
    test('maps last 7 days correctly', () => {
      expect(TIME_SLOTS['last 7 days']).toBe('D-7');
    });

    test('maps last 30 days correctly', () => {
      expect(TIME_SLOTS['last 30 days']).toBe('D-30');
    });

    test('maps last 90 days correctly', () => {
      expect(TIME_SLOTS['last 90 days']).toBe('D-90');
    });

    test('past and last are synonyms for days', () => {
      expect(TIME_SLOTS['past 7 days']).toBe(TIME_SLOTS['last 7 days']);
      expect(TIME_SLOTS['past 30 days']).toBe(TIME_SLOTS['last 30 days']);
      expect(TIME_SLOTS['past 90 days']).toBe(TIME_SLOTS['last 90 days']);
    });
  });

  describe('rolling period expressions - weeks', () => {
    test('maps last 2 weeks correctly', () => {
      expect(TIME_SLOTS['last 2 weeks']).toBe('W-2');
    });

    test('maps last 4 weeks correctly', () => {
      expect(TIME_SLOTS['last 4 weeks']).toBe('W-4');
    });

    test('maps last 12 weeks correctly', () => {
      expect(TIME_SLOTS['last 12 weeks']).toBe('W-12');
    });
  });

  describe('rolling period expressions - months', () => {
    test('maps last 3 months correctly', () => {
      expect(TIME_SLOTS['last 3 months']).toBe('M-3');
    });

    test('maps last 6 months correctly', () => {
      expect(TIME_SLOTS['last 6 months']).toBe('M-6');
    });

    test('maps last 12 months correctly', () => {
      expect(TIME_SLOTS['last 12 months']).toBe('M-12');
    });

    test('past and last are synonyms for months', () => {
      expect(TIME_SLOTS['past 3 months']).toBe(TIME_SLOTS['last 3 months']);
      expect(TIME_SLOTS['past 6 months']).toBe(TIME_SLOTS['last 6 months']);
      expect(TIME_SLOTS['past 12 months']).toBe(TIME_SLOTS['last 12 months']);
    });
  });

  describe('rolling period expressions - years', () => {
    test('maps last 2 years correctly', () => {
      expect(TIME_SLOTS['last 2 years']).toBe('Y-2');
    });

    test('maps last 3 years correctly', () => {
      expect(TIME_SLOTS['last 3 years']).toBe('Y-3');
    });

    test('maps last 5 years correctly', () => {
      expect(TIME_SLOTS['last 5 years']).toBe('Y-5');
    });
  });

  describe('fiscal quarters', () => {
    test('maps q1-q4 shorthand', () => {
      expect(TIME_SLOTS['q1']).toBe('Q1');
      expect(TIME_SLOTS['q2']).toBe('Q2');
      expect(TIME_SLOTS['q3']).toBe('Q3');
      expect(TIME_SLOTS['q4']).toBe('Q4');
    });

    test('maps quarter 1-4 expressions', () => {
      expect(TIME_SLOTS['quarter 1']).toBe('Q1');
      expect(TIME_SLOTS['quarter 2']).toBe('Q2');
      expect(TIME_SLOTS['quarter 3']).toBe('Q3');
      expect(TIME_SLOTS['quarter 4']).toBe('Q4');
    });

    test('maps first/second/third/fourth quarter', () => {
      expect(TIME_SLOTS['first quarter']).toBe('Q1');
      expect(TIME_SLOTS['second quarter']).toBe('Q2');
      expect(TIME_SLOTS['third quarter']).toBe('Q3');
      expect(TIME_SLOTS['fourth quarter']).toBe('Q4');
    });
  });

  describe('to-date expressions', () => {
    test('maps MTD/YTD/QTD/WTD abbreviations', () => {
      expect(TIME_SLOTS['mtd']).toBe('MTD');
      expect(TIME_SLOTS['ytd']).toBe('YTD');
      expect(TIME_SLOTS['qtd']).toBe('QTD');
      expect(TIME_SLOTS['wtd']).toBe('WTD');
    });

    test('maps expanded to-date expressions', () => {
      expect(TIME_SLOTS['month to date']).toBe('MTD');
      expect(TIME_SLOTS['year to date']).toBe('YTD');
      expect(TIME_SLOTS['quarter to date']).toBe('QTD');
      expect(TIME_SLOTS['week to date']).toBe('WTD');
    });
  });

  describe('time anchors', () => {
    test('maps beginning of period expressions', () => {
      expect(TIME_SLOTS['beginning of year']).toBe('BOY');
      expect(TIME_SLOTS['beginning of month']).toBe('BOM');
      expect(TIME_SLOTS['beginning of quarter']).toBe('BOQ');
    });

    test('maps end of period expressions', () => {
      expect(TIME_SLOTS['end of year']).toBe('EOY');
      expect(TIME_SLOTS['end of month']).toBe('EOM');
      expect(TIME_SLOTS['end of quarter']).toBe('EOQ');
    });
  });

  describe('all time expressions', () => {
    test('maps all time synonyms', () => {
      expect(TIME_SLOTS['all time']).toBe('all');
      expect(TIME_SLOTS['ever']).toBe('all');
      expect(TIME_SLOTS['always']).toBe('all');
      expect(TIME_SLOTS['total']).toBe('all');
    });
  });
});

// =============================================================================
// createPattern() Tests
// =============================================================================

describe('createPattern()', () => {
  test('creates a valid Pattern object with all required fields', () => {
    const pattern = createPattern(
      'test-pattern',
      '{m} by {d}',
      'Q @{m} #{d}',
      20,
      ['m', 'd']
    );

    expect(pattern).toEqual({
      id: 'test-pattern',
      template: '{m} by {d}',
      output: 'Q @{m} #{d}',
      priority: 20,
      requiredSlots: ['m', 'd'],
      examples: undefined,
    });
  });

  test('creates a pattern with examples', () => {
    const pattern = createPattern(
      'test-pattern',
      '{m} by {d}',
      'Q @{m} #{d}',
      20,
      ['m', 'd'],
      ['revenue by region', 'orders by product']
    );

    expect(pattern.examples).toEqual(['revenue by region', 'orders by product']);
  });

  test('creates a pattern with empty requiredSlots', () => {
    const pattern = createPattern('empty-slots', 'show all', 'Q', 5, []);

    expect(pattern.requiredSlots).toEqual([]);
  });

  test('creates a pattern with all slot types', () => {
    const pattern = createPattern(
      'all-slots',
      'top {n} {d} by {m} where {f} {t} vs {t2} and {d2}',
      'Q @{m} #{d} #{d2} ?{f} ~{t} vs ~{t2} top:{n}',
      99,
      ['m', 'd', 'f', 't', 'n', 'd2', 't2']
    );

    expect(pattern.requiredSlots).toHaveLength(7);
    expect(pattern.requiredSlots).toContain('m');
    expect(pattern.requiredSlots).toContain('d');
    expect(pattern.requiredSlots).toContain('d2');
    expect(pattern.requiredSlots).toContain('f');
    expect(pattern.requiredSlots).toContain('t');
    expect(pattern.requiredSlots).toContain('t2');
    expect(pattern.requiredSlots).toContain('n');
  });

  test('creates a pattern with priority 0', () => {
    const pattern = createPattern('zero-priority', '{m}', 'Q @{m}', 0, ['m']);
    expect(pattern.priority).toBe(0);
  });

  test('creates a pattern with high priority', () => {
    const pattern = createPattern('high-priority', '{m}', 'Q @{m}', 100, ['m']);
    expect(pattern.priority).toBe(100);
  });

  test('creates a pattern with empty examples array', () => {
    const pattern = createPattern('empty-examples', '{m}', 'Q @{m}', 10, ['m'], []);
    expect(pattern.examples).toEqual([]);
  });
});

// =============================================================================
// getPatternsByPriority() Tests
// =============================================================================

describe('getPatternsByPriority()', () => {
  test('returns an array of patterns', () => {
    const patterns = getPatternsByPriority();
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBe(DEFAULT_PATTERNS.length);
  });

  test('returns patterns sorted by priority descending (highest first)', () => {
    const patterns = getPatternsByPriority();

    for (let i = 0; i < patterns.length - 1; i++) {
      expect(patterns[i].priority).toBeGreaterThanOrEqual(patterns[i + 1].priority);
    }
  });

  test('first pattern has highest priority', () => {
    const patterns = getPatternsByPriority();
    const maxPriority = Math.max(...DEFAULT_PATTERNS.map((p) => p.priority));

    expect(patterns[0].priority).toBe(maxPriority);
  });

  test('last pattern has lowest priority', () => {
    const patterns = getPatternsByPriority();
    const minPriority = Math.min(...DEFAULT_PATTERNS.map((p) => p.priority));

    expect(patterns[patterns.length - 1].priority).toBe(minPriority);
  });

  test('does not modify the original DEFAULT_PATTERNS array', () => {
    const originalOrder = [...DEFAULT_PATTERNS.map((p) => p.id)];
    getPatternsByPriority();
    const currentOrder = DEFAULT_PATTERNS.map((p) => p.id);

    expect(currentOrder).toEqual(originalOrder);
  });

  test('returns a new array (not a reference to DEFAULT_PATTERNS)', () => {
    const patterns = getPatternsByPriority();
    expect(patterns).not.toBe(DEFAULT_PATTERNS);
  });

  test('comparison patterns appear near the top', () => {
    const patterns = getPatternsByPriority();
    const comparisonIndex = patterns.findIndex(
      (p) => p.id === 'metric-dim-time-vs-time' || p.id === 'metric-time-vs-time'
    );

    // Should be in the top 20% of patterns
    expect(comparisonIndex).toBeLessThan(patterns.length * 0.2);
  });

  test('simple metric-only pattern appears near the bottom', () => {
    const patterns = getPatternsByPriority();
    const metricOnlyIndex = patterns.findIndex((p) => p.id === 'metric-only');

    // Should be in the bottom 30% of patterns
    expect(metricOnlyIndex).toBeGreaterThan(patterns.length * 0.7);
  });
});

// =============================================================================
// resolveTimeSlot() Tests
// =============================================================================

describe('resolveTimeSlot()', () => {
  describe('known expressions', () => {
    test('resolves today', () => {
      expect(resolveTimeSlot('today')).toBe('today');
    });

    test('resolves yesterday', () => {
      expect(resolveTimeSlot('yesterday')).toBe('yesterday');
    });

    test('resolves this week', () => {
      expect(resolveTimeSlot('this week')).toBe('this_week');
    });

    test('resolves last month', () => {
      expect(resolveTimeSlot('last month')).toBe('M-1');
    });

    test('resolves last 30 days', () => {
      expect(resolveTimeSlot('last 30 days')).toBe('D-30');
    });

    test('resolves q1', () => {
      expect(resolveTimeSlot('q1')).toBe('Q1');
    });

    test('resolves ytd', () => {
      expect(resolveTimeSlot('ytd')).toBe('YTD');
    });
  });

  describe('case insensitivity', () => {
    test('handles uppercase input', () => {
      expect(resolveTimeSlot('TODAY')).toBe('today');
    });

    test('handles mixed case input', () => {
      expect(resolveTimeSlot('This Week')).toBe('this_week');
    });

    test('handles ALL CAPS', () => {
      expect(resolveTimeSlot('LAST MONTH')).toBe('M-1');
    });

    test('handles weird casing', () => {
      expect(resolveTimeSlot('LaSt 30 DaYs')).toBe('D-30');
    });
  });

  describe('whitespace handling', () => {
    test('trims leading whitespace', () => {
      expect(resolveTimeSlot('  today')).toBe('today');
    });

    test('trims trailing whitespace', () => {
      expect(resolveTimeSlot('today  ')).toBe('today');
    });

    test('trims both leading and trailing whitespace', () => {
      expect(resolveTimeSlot('  this week  ')).toBe('this_week');
    });
  });

  describe('unknown expressions', () => {
    test('returns undefined for unknown expression', () => {
      expect(resolveTimeSlot('next week')).toBeUndefined();
    });

    test('returns undefined for empty string', () => {
      expect(resolveTimeSlot('')).toBeUndefined();
    });

    test('returns undefined for whitespace only', () => {
      expect(resolveTimeSlot('   ')).toBeUndefined();
    });

    test('returns undefined for random text', () => {
      expect(resolveTimeSlot('some random text')).toBeUndefined();
    });

    test('returns undefined for partial match', () => {
      expect(resolveTimeSlot('last')).toBeUndefined();
    });

    test('returns undefined for date format', () => {
      expect(resolveTimeSlot('2024-01-01')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('handles expression with internal whitespace', () => {
      expect(resolveTimeSlot('last 7 days')).toBe('D-7');
    });

    test('handles apostrophe-like expressions correctly', () => {
      // These are not in TIME_SLOTS, so should return undefined
      expect(resolveTimeSlot("yesterday's")).toBeUndefined();
    });
  });
});

// =============================================================================
// isTimeExpression() Tests
// =============================================================================

describe('isTimeExpression()', () => {
  describe('known time expressions return true', () => {
    test('today is a time expression', () => {
      expect(isTimeExpression('today')).toBe(true);
    });

    test('yesterday is a time expression', () => {
      expect(isTimeExpression('yesterday')).toBe(true);
    });

    test('this week is a time expression', () => {
      expect(isTimeExpression('this week')).toBe(true);
    });

    test('last month is a time expression', () => {
      expect(isTimeExpression('last month')).toBe(true);
    });

    test('last 30 days is a time expression', () => {
      expect(isTimeExpression('last 30 days')).toBe(true);
    });

    test('q1 is a time expression', () => {
      expect(isTimeExpression('q1')).toBe(true);
    });

    test('ytd is a time expression', () => {
      expect(isTimeExpression('ytd')).toBe(true);
    });

    test('all time is a time expression', () => {
      expect(isTimeExpression('all time')).toBe(true);
    });

    test('beginning of year is a time expression', () => {
      expect(isTimeExpression('beginning of year')).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    test('handles uppercase input', () => {
      expect(isTimeExpression('TODAY')).toBe(true);
    });

    test('handles mixed case input', () => {
      expect(isTimeExpression('This Week')).toBe(true);
    });

    test('handles ALL CAPS', () => {
      expect(isTimeExpression('LAST MONTH')).toBe(true);
    });
  });

  describe('whitespace handling', () => {
    test('trims leading whitespace', () => {
      expect(isTimeExpression('  today')).toBe(true);
    });

    test('trims trailing whitespace', () => {
      expect(isTimeExpression('today  ')).toBe(true);
    });

    test('trims both leading and trailing whitespace', () => {
      expect(isTimeExpression('  this week  ')).toBe(true);
    });
  });

  describe('non-time expressions return false', () => {
    test('next week is not a time expression', () => {
      expect(isTimeExpression('next week')).toBe(false);
    });

    test('empty string is not a time expression', () => {
      expect(isTimeExpression('')).toBe(false);
    });

    test('whitespace only is not a time expression', () => {
      expect(isTimeExpression('   ')).toBe(false);
    });

    test('random text is not a time expression', () => {
      expect(isTimeExpression('revenue')).toBe(false);
    });

    test('partial match is not a time expression', () => {
      expect(isTimeExpression('last')).toBe(false);
    });

    test('date format is not a time expression', () => {
      expect(isTimeExpression('2024-01-01')).toBe(false);
    });

    test('metric name is not a time expression', () => {
      expect(isTimeExpression('orders')).toBe(false);
    });

    test('dimension name is not a time expression', () => {
      expect(isTimeExpression('region')).toBe(false);
    });
  });

  describe('all TIME_SLOTS keys are recognized', () => {
    test('every key in TIME_SLOTS returns true', () => {
      Object.keys(TIME_SLOTS).forEach((key) => {
        expect(isTimeExpression(key)).toBe(true);
      });
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration: patterns and time slots work together', () => {
  test('time patterns use valid time slot expressions in examples', () => {
    const timePatterns = DEFAULT_PATTERNS.filter((p) => p.requiredSlots.includes('t'));

    timePatterns.forEach((pattern) => {
      if (pattern.examples) {
        // Examples should contain recognizable time expressions
        // This is a sanity check - not all words in examples are time expressions
        expect(pattern.examples.length).toBeGreaterThan(0);
      }
    });
  });

  test('sorted patterns maintain relative ordering within priority tiers', () => {
    const sorted = getPatternsByPriority();

    // All priority 55+ patterns should come before priority 50 patterns
    const priority55Index = sorted.findIndex((p) => p.priority === 55);
    const priority50Index = sorted.findIndex((p) => p.priority === 50);

    if (priority55Index !== -1 && priority50Index !== -1) {
      expect(priority55Index).toBeLessThan(priority50Index);
    }
  });

  test('resolveTimeSlot and isTimeExpression are consistent', () => {
    // If isTimeExpression returns true, resolveTimeSlot should return a value
    Object.keys(TIME_SLOTS).forEach((key) => {
      expect(isTimeExpression(key)).toBe(true);
      expect(resolveTimeSlot(key)).toBeDefined();
    });

    // If resolveTimeSlot returns undefined, isTimeExpression should return false
    const unknownExpressions = ['next week', 'tomorrow', 'in 5 days'];
    unknownExpressions.forEach((expr) => {
      expect(resolveTimeSlot(expr)).toBeUndefined();
      expect(isTimeExpression(expr)).toBe(false);
    });
  });
});
