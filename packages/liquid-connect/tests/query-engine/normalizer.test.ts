/**
 * Query Normalizer Tests
 *
 * Comprehensive tests for the query normalizer module including:
 * - normalize() - full normalization pipeline
 * - tokenize() - text tokenization
 * - applySynonyms() - synonym substitution with tracking
 */

import { describe, test, expect } from 'vitest';
import {
  normalize,
  tokenize,
  applySynonyms,
  containsSynonym,
  getSubstitutionPreview,
  toLookupKey,
} from '../../src/query/normalizer';
import type { SynonymRegistry } from '../../src/vocabulary/types';

// =============================================================================
// Mock SynonymRegistry Factory
// =============================================================================

/**
 * Create a mock SynonymRegistry for testing.
 * Provides realistic test data for 3-level priority resolution.
 */
function createMockRegistry(
  overrides: Partial<SynonymRegistry> = {}
): SynonymRegistry {
  return {
    global: {
      sales: 'revenue',
      income: 'revenue',
      'last month': '~M-1',
      'this month': '~MTD',
      'last quarter': '~Q-1',
      yesterday: '~D-1',
      today: '~today',
      clients: 'customers',
      geo: 'region',
      ...overrides.global,
    },
    org: {
      arr: 'annual_recurring_revenue',
      mrr: 'monthly_recurring_revenue',
      nps: 'net_promoter_score',
      ...overrides.org,
    },
    user: {
      rev: 'revenue',
      ...overrides.user,
    },
  };
}

/**
 * Create an empty SynonymRegistry for testing without synonyms.
 */
function createEmptyRegistry(): SynonymRegistry {
  return {
    global: {},
    org: {},
    user: {},
  };
}

// =============================================================================
// normalize() Tests
// =============================================================================

describe('normalize()', () => {
  describe('action word stripping', () => {
    test('strips "show me" from input', () => {
      const result = normalize('show me revenue');
      expect(result.normalized).toBe('revenue');
    });

    test('strips "what is" from input', () => {
      const result = normalize('what is the revenue');
      expect(result.normalized).toBe('revenue');
    });

    test('strips multiple action words', () => {
      const result = normalize('please show me the total revenue');
      expect(result.normalized).toBe('revenue');
    });

    test('strips "give me" from input', () => {
      const result = normalize('give me orders by region');
      expect(result.normalized).toBe('orders by region');
    });

    test('strips "i want to see" from input', () => {
      const result = normalize('i want to see profit by category');
      expect(result.normalized).toBe('profit by category');
    });

    test('preserves meaningful words after stripping', () => {
      const result = normalize('show me revenue by region last month');
      expect(result.normalized).toBe('revenue by region last month');
    });
  });

  describe('synonym resolution with 3-level priority', () => {
    test('applies global synonyms', () => {
      const registry = createMockRegistry();
      const result = normalize('sales by region', registry);
      expect(result.normalized).toBe('revenue by region');
      expect(result.substitutions).toContainEqual({
        from: 'sales',
        to: 'revenue',
        source: 'global',
      });
    });

    test('applies org synonyms', () => {
      const registry = createMockRegistry();
      const result = normalize('arr by region', registry);
      expect(result.normalized).toBe('annual_recurring_revenue by region');
      expect(result.substitutions).toContainEqual({
        from: 'arr',
        to: 'annual_recurring_revenue',
        source: 'org',
      });
    });

    test('applies user synonyms', () => {
      const registry = createMockRegistry();
      const result = normalize('rev by region', registry);
      expect(result.normalized).toBe('revenue by region');
      expect(result.substitutions).toContainEqual({
        from: 'rev',
        to: 'revenue',
        source: 'user',
      });
    });

    test('user synonyms are applied when defined', () => {
      // User synonyms are processed last, so when ranges are cleared
      // between iterations, they can match and substitute
      const registry: SynonymRegistry = {
        global: {},
        org: {},
        user: { custom: 'user_value' },
      };
      const result = normalize('custom metric', registry);
      expect(result.normalized).toBe('user_value metric');
      expect(result.substitutions).toContainEqual({
        from: 'custom',
        to: 'user_value',
        source: 'user',
      });
    });

    test('org synonyms are applied when defined', () => {
      // Org synonyms are processed after global
      const registry: SynonymRegistry = {
        global: {},
        org: { custom: 'org_value' },
        user: {},
      };
      const result = normalize('custom metric', registry);
      expect(result.normalized).toBe('org_value metric');
      expect(result.substitutions).toContainEqual({
        from: 'custom',
        to: 'org_value',
        source: 'org',
      });
    });

    test('applies multi-word synonyms', () => {
      const registry = createMockRegistry();
      const result = normalize('revenue last month', registry);
      expect(result.normalized).toBe('revenue ~M-1');
      expect(result.substitutions).toContainEqual({
        from: 'last month',
        to: '~M-1',
        source: 'global',
      });
    });
  });

  describe('result structure', () => {
    test('returns original input unchanged', () => {
      const original = 'Show Me Revenue!';
      const result = normalize(original);
      expect(result.original).toBe(original);
    });

    test('returns normalized text', () => {
      const result = normalize('Show Me Revenue!');
      expect(result.normalized).toBe('revenue');
    });

    test('returns tokens array', () => {
      const result = normalize('revenue by region');
      expect(result.tokens).toEqual(['revenue', 'by', 'region']);
    });

    test('returns substitutions array', () => {
      const registry = createMockRegistry();
      const result = normalize('sales by geo', registry);
      expect(result.substitutions).toBeInstanceOf(Array);
      expect(result.substitutions.length).toBe(2);
    });

    test('returns empty substitutions without registry', () => {
      const result = normalize('revenue by region');
      expect(result.substitutions).toEqual([]);
    });
  });

  describe('edge cases', () => {
    test('handles empty input', () => {
      const result = normalize('');
      expect(result.original).toBe('');
      expect(result.normalized).toBe('');
      expect(result.tokens).toEqual([]);
      expect(result.substitutions).toEqual([]);
    });

    test('handles whitespace-only input', () => {
      const result = normalize('   ');
      expect(result.normalized).toBe('');
      expect(result.tokens).toEqual([]);
    });

    test('handles null-ish input', () => {
      const result = normalize(undefined as unknown as string);
      expect(result.normalized).toBe('');
      expect(result.tokens).toEqual([]);
    });

    test('handles special characters', () => {
      const result = normalize('What is the revenue?!');
      expect(result.normalized).toBe('revenue');
    });

    test('handles multiple spaces', () => {
      const result = normalize('revenue    by    region');
      expect(result.normalized).toBe('revenue by region');
      expect(result.tokens).toEqual(['revenue', 'by', 'region']);
    });

    test('preserves word-internal hyphens', () => {
      const result = normalize('month-to-date revenue');
      expect(result.normalized).toBe('month-to-date revenue');
      expect(result.tokens).toContain('month-to-date');
    });

    test('removes standalone hyphens', () => {
      const result = normalize('revenue - orders');
      expect(result.normalized).toBe('revenue orders');
    });

    test('handles mixed case input', () => {
      const result = normalize('SHOW ME Revenue BY Region');
      expect(result.normalized).toBe('revenue by region');
    });

    test('handles punctuation at word boundaries', () => {
      const result = normalize('revenue, orders, and profit.');
      expect(result.normalized).toBe('revenue orders and profit');
    });

    test('handles apostrophes', () => {
      const result = normalize("what's the revenue");
      expect(result.normalized).toBe('revenue');
    });

    test('handles parentheses', () => {
      const result = normalize('revenue (total) by region');
      expect(result.normalized).toBe('revenue by region');
    });

    test('handles brackets', () => {
      const result = normalize('revenue [all] by region');
      expect(result.normalized).toBe('revenue by region');
    });
  });

  describe('complex scenarios', () => {
    test('handles full natural language query', () => {
      const registry = createMockRegistry();
      const result = normalize(
        'Show me sales by geo last month',
        registry
      );
      expect(result.normalized).toBe('revenue by region ~M-1');
    });

    test('handles multiple synonyms in one query', () => {
      const registry = createMockRegistry();
      const result = normalize('sales and income by geo', registry);
      expect(result.normalized).toBe('revenue and revenue by region');
      expect(result.substitutions.length).toBeGreaterThanOrEqual(2);
    });

    test('handles LC DSL markers (lowercased by normalization)', () => {
      // normalize() lowercases the entire input, so ~MTD becomes ~mtd
      const result = normalize('revenue ~MTD');
      expect(result.tokens).toContain('~mtd');
    });
  });
});

// =============================================================================
// tokenize() Tests
// =============================================================================

describe('tokenize()', () => {
  describe('basic tokenization', () => {
    test('splits on single whitespace', () => {
      const tokens = tokenize('revenue by region');
      expect(tokens).toEqual(['revenue', 'by', 'region']);
    });

    test('splits on multiple whitespace', () => {
      const tokens = tokenize('revenue   by   region');
      expect(tokens).toEqual(['revenue', 'by', 'region']);
    });

    test('splits on tabs', () => {
      const tokens = tokenize('revenue\tby\tregion');
      expect(tokens).toEqual(['revenue', 'by', 'region']);
    });

    test('splits on mixed whitespace', () => {
      const tokens = tokenize('revenue \t by  \n region');
      expect(tokens).toEqual(['revenue', 'by', 'region']);
    });
  });

  describe('punctuation handling', () => {
    test('handles trailing punctuation (already cleaned by normalize)', () => {
      // tokenize receives already-cleaned text from normalize
      const tokens = tokenize('revenue orders profit');
      expect(tokens).toEqual(['revenue', 'orders', 'profit']);
    });

    test('preserves hyphenated words', () => {
      const tokens = tokenize('month-to-date profit');
      expect(tokens).toEqual(['month-to-date', 'profit']);
    });

    test('preserves LC DSL markers', () => {
      const tokens = tokenize('revenue ~M-1 #region');
      expect(tokens).toEqual(['revenue', '~M-1', '#region']);
    });
  });

  describe('edge cases', () => {
    test('handles empty string', () => {
      const tokens = tokenize('');
      expect(tokens).toEqual([]);
    });

    test('handles whitespace-only string', () => {
      const tokens = tokenize('   ');
      expect(tokens).toEqual([]);
    });

    test('handles single token', () => {
      const tokens = tokenize('revenue');
      expect(tokens).toEqual(['revenue']);
    });

    test('trims leading whitespace', () => {
      const tokens = tokenize('  revenue by region');
      expect(tokens).toEqual(['revenue', 'by', 'region']);
    });

    test('trims trailing whitespace', () => {
      const tokens = tokenize('revenue by region  ');
      expect(tokens).toEqual(['revenue', 'by', 'region']);
    });

    test('filters out empty tokens', () => {
      const tokens = tokenize('revenue  by  region');
      expect(tokens).not.toContain('');
    });
  });

  describe('multi-word time expressions', () => {
    // Note: These are preserved because they've already been
    // processed by applySynonyms before tokenize is called
    test('tokenizes LC time markers', () => {
      const tokens = tokenize('revenue ~MTD');
      expect(tokens).toContain('~MTD');
    });

    test('tokenizes offset time markers', () => {
      const tokens = tokenize('revenue ~M-1');
      expect(tokens).toContain('~M-1');
    });

    test('tokenizes duration markers', () => {
      const tokens = tokenize('revenue ~30d');
      expect(tokens).toContain('~30d');
    });
  });
});

// =============================================================================
// applySynonyms() Tests
// =============================================================================

describe('applySynonyms()', () => {
  describe('substitution tracking', () => {
    test('tracks global substitutions', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('sales by region', registry);
      expect(result.substitutions).toContainEqual({
        from: 'sales',
        to: 'revenue',
        source: 'global',
      });
    });

    test('tracks org substitutions', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('arr by region', registry);
      expect(result.substitutions).toContainEqual({
        from: 'arr',
        to: 'annual_recurring_revenue',
        source: 'org',
      });
    });

    test('tracks user substitutions', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('rev by region', registry);
      expect(result.substitutions).toContainEqual({
        from: 'rev',
        to: 'revenue',
        source: 'user',
      });
    });

    test('tracks multiple substitutions', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('sales and clients', registry);
      expect(result.substitutions.length).toBe(2);
      expect(result.substitutions).toContainEqual({
        from: 'sales',
        to: 'revenue',
        source: 'global',
      });
      expect(result.substitutions).toContainEqual({
        from: 'clients',
        to: 'customers',
        source: 'global',
      });
    });
  });

  describe('text transformation', () => {
    test('returns modified text', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('sales by region', registry);
      expect(result.text).toBe('revenue by region');
    });

    test('handles multi-word synonyms', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('revenue last month', registry);
      expect(result.text).toBe('revenue ~M-1');
    });

    test('preserves non-synonym words', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('profit by category', registry);
      expect(result.text).toBe('profit by category');
    });

    test('handles case insensitivity for synonym keys', () => {
      // applySynonyms uses case-insensitive matching for finding synonyms
      // but only replaces the matched word, not the entire text
      const registry = createMockRegistry();
      const result = applySynonyms('SALES by REGION', registry);
      // SALES is matched and replaced with 'revenue', but REGION remains as-is
      // because 'region' is not a synonym key in our mock (it's a value)
      expect(result.text).toBe('revenue by REGION');
      expect(result.substitutions).toContainEqual({
        from: 'SALES',
        to: 'revenue',
        source: 'global',
      });
    });
  });

  describe('priority resolution', () => {
    test('user level synonyms are applied', () => {
      // When only user synonyms are defined, they are applied
      const registry: SynonymRegistry = {
        global: {},
        org: {},
        user: { test: 'user_result' },
      };
      const result = applySynonyms('test metric', registry);
      expect(result.text).toBe('user_result metric');
      expect(result.substitutions[0].source).toBe('user');
    });

    test('org level synonyms are applied', () => {
      // When only org synonyms are defined, they are applied
      const registry: SynonymRegistry = {
        global: {},
        org: { test: 'org_result' },
        user: {},
      };
      const result = applySynonyms('test metric', registry);
      expect(result.text).toBe('org_result metric');
      expect(result.substitutions[0].source).toBe('org');
    });

    test('global level synonyms are applied', () => {
      // When only global synonyms are defined, they are applied
      const registry: SynonymRegistry = {
        global: { test: 'global_result' },
        org: {},
        user: {},
      };
      const result = applySynonyms('test metric', registry);
      expect(result.text).toBe('global_result metric');
      expect(result.substitutions[0].source).toBe('global');
    });

    test('tracks substitution source correctly', () => {
      // Each substitution should track which level it came from
      const registry: SynonymRegistry = {
        global: { alpha: 'global_alpha' },
        org: { beta: 'org_beta' },
        user: { gamma: 'user_gamma' },
      };
      const result = applySynonyms('alpha beta gamma', registry);
      expect(result.substitutions).toContainEqual({
        from: 'alpha',
        to: 'global_alpha',
        source: 'global',
      });
      expect(result.substitutions).toContainEqual({
        from: 'beta',
        to: 'org_beta',
        source: 'org',
      });
      expect(result.substitutions).toContainEqual({
        from: 'gamma',
        to: 'user_gamma',
        source: 'user',
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty text', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('', registry);
      expect(result.text).toBe('');
      expect(result.substitutions).toEqual([]);
    });

    test('handles whitespace-only text', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('   ', registry);
      expect(result.text).toBe('');
      expect(result.substitutions).toEqual([]);
    });

    test('handles empty registry', () => {
      const registry = createEmptyRegistry();
      const result = applySynonyms('sales by region', registry);
      expect(result.text).toBe('sales by region');
      expect(result.substitutions).toEqual([]);
    });

    test('handles no matches', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('xyz abc def', registry);
      expect(result.text).toBe('xyz abc def');
      expect(result.substitutions).toEqual([]);
    });

    test('uses longest match first', () => {
      const registry: SynonymRegistry = {
        global: {
          last: 'previous',
          'last month': '~M-1',
        },
        org: {},
        user: {},
      };
      const result = applySynonyms('revenue last month', registry);
      // Should match "last month" not just "last"
      expect(result.text).toBe('revenue ~M-1');
    });

    test('handles word boundaries correctly', () => {
      const registry: SynonymRegistry = {
        global: { 'or': 'OR_RESULT' },
        org: {},
        user: {},
      };
      // "or" should not match inside "orders"
      const result = applySynonyms('orders by region', registry);
      expect(result.text).toBe('orders by region');
    });
  });

  describe('return structure', () => {
    test('returns object with text and substitutions', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('sales', registry);
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('substitutions');
    });

    test('substitution has from, to, and source', () => {
      const registry = createMockRegistry();
      const result = applySynonyms('sales', registry);
      const sub = result.substitutions[0];
      expect(sub).toHaveProperty('from');
      expect(sub).toHaveProperty('to');
      expect(sub).toHaveProperty('source');
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('containsSynonym()', () => {
  test('returns true when synonym exists at user level', () => {
    const registry = createMockRegistry();
    expect(containsSynonym('rev', registry)).toBe(true);
  });

  test('returns true when synonym exists at org level', () => {
    const registry = createMockRegistry();
    expect(containsSynonym('arr', registry)).toBe(true);
  });

  test('returns true when synonym exists at global level', () => {
    const registry = createMockRegistry();
    expect(containsSynonym('sales', registry)).toBe(true);
  });

  test('returns false when synonym does not exist', () => {
    const registry = createMockRegistry();
    expect(containsSynonym('xyz123', registry)).toBe(false);
  });

  test('handles case insensitivity', () => {
    const registry = createMockRegistry();
    expect(containsSynonym('SALES', registry)).toBe(true);
  });

  test('handles multi-word synonyms', () => {
    const registry = createMockRegistry();
    expect(containsSynonym('revenue last month here', registry)).toBe(true);
  });
});

describe('getSubstitutionPreview()', () => {
  test('returns substitutions without modifying text', () => {
    const registry = createMockRegistry();
    const preview = getSubstitutionPreview('sales by region', registry);
    expect(preview).toContainEqual({
      from: 'sales',
      to: 'revenue',
      source: 'global',
    });
  });

  test('returns empty array when no substitutions', () => {
    const registry = createMockRegistry();
    const preview = getSubstitutionPreview('xyz by abc', registry);
    expect(preview).toEqual([]);
  });

  test('handles multiple substitutions', () => {
    const registry = createMockRegistry();
    const preview = getSubstitutionPreview('sales and income', registry);
    expect(preview.length).toBeGreaterThan(1);
  });
});

describe('toLookupKey()', () => {
  test('converts to lowercase', () => {
    expect(toLookupKey('Revenue')).toBe('revenue');
  });

  test('replaces spaces with underscores', () => {
    expect(toLookupKey('monthly revenue')).toBe('monthly_revenue');
  });

  test('trims whitespace', () => {
    expect(toLookupKey('  revenue  ')).toBe('revenue');
  });

  test('collapses multiple spaces', () => {
    expect(toLookupKey('monthly   recurring   revenue')).toBe(
      'monthly_recurring_revenue'
    );
  });

  test('handles mixed case and spaces', () => {
    expect(toLookupKey('Monthly Recurring Revenue')).toBe(
      'monthly_recurring_revenue'
    );
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Normalizer Integration', () => {
  test('full pipeline: action words + synonyms + tokenization', () => {
    const registry = createMockRegistry();
    const result = normalize(
      'Please show me sales by geo last month',
      registry
    );

    expect(result.original).toBe('Please show me sales by geo last month');
    expect(result.normalized).toBe('revenue by region ~M-1');
    expect(result.tokens).toEqual(['revenue', 'by', 'region', '~M-1']);
    expect(result.substitutions.length).toBe(3);
  });

  test('preserves LC DSL syntax through normalization (lowercased)', () => {
    // normalize() lowercases everything, so LC DSL markers become lowercase
    const result = normalize('@revenue #region ~MTD');
    expect(result.tokens).toContain('@revenue');
    expect(result.tokens).toContain('#region');
    expect(result.tokens).toContain('~mtd'); // lowercased by normalize
  });

  test('handles real-world query patterns', () => {
    const registry = createMockRegistry();

    // Pattern: metric by dimension time
    const result1 = normalize('show me sales by geo last quarter', registry);
    expect(result1.normalized).toContain('revenue');
    expect(result1.normalized).toContain('region');
    expect(result1.normalized).toContain('~Q-1');

    // Pattern: what is metric
    const result2 = normalize("what's the income yesterday", registry);
    expect(result2.normalized).toContain('revenue');
    expect(result2.normalized).toContain('~D-1');
  });

  test('handles enterprise vocabulary (org level)', () => {
    const registry = createMockRegistry();
    const result = normalize('show me mrr and arr by region', registry);
    expect(result.normalized).toContain('monthly_recurring_revenue');
    expect(result.normalized).toContain('annual_recurring_revenue');
  });
});
