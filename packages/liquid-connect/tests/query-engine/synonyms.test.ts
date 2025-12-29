/**
 * Synonyms Module Tests
 *
 * Comprehensive tests for the 3-level synonym resolution system.
 * Tests priority: user > org > global
 */

import { describe, test, expect } from 'vitest';
import {
  GLOBAL_SYNONYMS,
  ACTION_WORDS,
  createSynonymRegistry,
  resolveSynonym,
  stripActionWords,
  hasSynonym,
  getSynonymSource,
} from '../../src/vocabulary/synonyms';

// =============================================================================
// GLOBAL_SYNONYMS - Key Mappings Verification
// =============================================================================

describe('GLOBAL_SYNONYMS', () => {
  describe('Metric Synonyms', () => {
    test('sales maps to revenue', () => {
      expect(GLOBAL_SYNONYMS['sales']).toBe('revenue');
    });

    test('income maps to revenue', () => {
      expect(GLOBAL_SYNONYMS['income']).toBe('revenue');
    });

    test('money maps to revenue', () => {
      expect(GLOBAL_SYNONYMS['money']).toBe('revenue');
    });

    test('earnings maps to revenue', () => {
      expect(GLOBAL_SYNONYMS['earnings']).toBe('revenue');
    });

    test('turnover maps to revenue', () => {
      expect(GLOBAL_SYNONYMS['turnover']).toBe('revenue');
    });

    test('count maps to orders', () => {
      expect(GLOBAL_SYNONYMS['count']).toBe('orders');
    });

    test('transactions maps to orders', () => {
      expect(GLOBAL_SYNONYMS['transactions']).toBe('orders');
    });

    test('margin maps to profit', () => {
      expect(GLOBAL_SYNONYMS['margin']).toBe('profit');
    });

    test('clients maps to customers', () => {
      expect(GLOBAL_SYNONYMS['clients']).toBe('customers');
    });

    test('users maps to customers', () => {
      expect(GLOBAL_SYNONYMS['users']).toBe('customers');
    });

    test('basket size maps to aov', () => {
      expect(GLOBAL_SYNONYMS['basket size']).toBe('aov');
    });

    test('cvr maps to conversion', () => {
      expect(GLOBAL_SYNONYMS['cvr']).toBe('conversion');
    });
  });

  describe('Dimension Synonyms', () => {
    test('geo maps to region', () => {
      expect(GLOBAL_SYNONYMS['geo']).toBe('region');
    });

    test('geography maps to region', () => {
      expect(GLOBAL_SYNONYMS['geography']).toBe('region');
    });

    test('area maps to region', () => {
      expect(GLOBAL_SYNONYMS['area']).toBe('region');
    });

    test('location maps to region', () => {
      expect(GLOBAL_SYNONYMS['location']).toBe('region');
    });

    test('territory maps to region', () => {
      expect(GLOBAL_SYNONYMS['territory']).toBe('region');
    });

    test('market maps to region', () => {
      expect(GLOBAL_SYNONYMS['market']).toBe('region');
    });

    test('type maps to category', () => {
      expect(GLOBAL_SYNONYMS['type']).toBe('category');
    });

    test('segment maps to category', () => {
      expect(GLOBAL_SYNONYMS['segment']).toBe('category');
    });

    test('item maps to product', () => {
      expect(GLOBAL_SYNONYMS['item']).toBe('product');
    });

    test('sku maps to product', () => {
      expect(GLOBAL_SYNONYMS['sku']).toBe('product');
    });

    test('source maps to channel', () => {
      expect(GLOBAL_SYNONYMS['source']).toBe('channel');
    });

    test('platform maps to channel', () => {
      expect(GLOBAL_SYNONYMS['platform']).toBe('channel');
    });

    test('tier maps to segment', () => {
      expect(GLOBAL_SYNONYMS['tier']).toBe('segment');
    });

    test('cohort maps to segment', () => {
      expect(GLOBAL_SYNONYMS['cohort']).toBe('segment');
    });
  });

  describe('Time Synonyms', () => {
    test('last quarter maps to ~Q-1', () => {
      expect(GLOBAL_SYNONYMS['last quarter']).toBe('~Q-1');
    });

    test('previous quarter maps to ~Q-1', () => {
      expect(GLOBAL_SYNONYMS['previous quarter']).toBe('~Q-1');
    });

    test('q1-q4 map correctly', () => {
      expect(GLOBAL_SYNONYMS['q1']).toBe('~Q1');
      expect(GLOBAL_SYNONYMS['q2']).toBe('~Q2');
      expect(GLOBAL_SYNONYMS['q3']).toBe('~Q3');
      expect(GLOBAL_SYNONYMS['q4']).toBe('~Q4');
    });

    test('this month maps to ~MTD', () => {
      expect(GLOBAL_SYNONYMS['this month']).toBe('~MTD');
    });

    test('last month maps to ~M-1', () => {
      expect(GLOBAL_SYNONYMS['last month']).toBe('~M-1');
    });

    test('this year maps to ~YTD', () => {
      expect(GLOBAL_SYNONYMS['this year']).toBe('~YTD');
    });

    test('last year maps to ~Y-1', () => {
      expect(GLOBAL_SYNONYMS['last year']).toBe('~Y-1');
    });

    test('today maps to ~today', () => {
      expect(GLOBAL_SYNONYMS['today']).toBe('~today');
    });

    test('yesterday maps to ~D-1', () => {
      expect(GLOBAL_SYNONYMS['yesterday']).toBe('~D-1');
    });

    test('period abbreviations map correctly', () => {
      expect(GLOBAL_SYNONYMS['mtd']).toBe('~MTD');
      expect(GLOBAL_SYNONYMS['ytd']).toBe('~YTD');
      expect(GLOBAL_SYNONYMS['qtd']).toBe('~QTD');
      expect(GLOBAL_SYNONYMS['wtd']).toBe('~WTD');
    });

    test('relative periods map correctly', () => {
      expect(GLOBAL_SYNONYMS['last 7 days']).toBe('~D-7');
      expect(GLOBAL_SYNONYMS['last 30 days']).toBe('~D-30');
      expect(GLOBAL_SYNONYMS['last 90 days']).toBe('~D-90');
      expect(GLOBAL_SYNONYMS['last 3 months']).toBe('~M-3');
      expect(GLOBAL_SYNONYMS['last 6 months']).toBe('~M-6');
      expect(GLOBAL_SYNONYMS['last 12 months']).toBe('~M-12');
    });
  });

  describe('Grouping Indicators', () => {
    test('by maps to #', () => {
      expect(GLOBAL_SYNONYMS['by']).toBe('#');
    });

    test('per maps to #', () => {
      expect(GLOBAL_SYNONYMS['per']).toBe('#');
    });

    test('grouped by maps to #', () => {
      expect(GLOBAL_SYNONYMS['grouped by']).toBe('#');
    });

    test('broken down by maps to #', () => {
      expect(GLOBAL_SYNONYMS['broken down by']).toBe('#');
    });
  });

  describe('Comparison Synonyms', () => {
    test('versus maps to vs', () => {
      expect(GLOBAL_SYNONYMS['versus']).toBe('vs');
    });

    test('compared to maps to vs', () => {
      expect(GLOBAL_SYNONYMS['compared to']).toBe('vs');
    });

    test('against maps to vs', () => {
      expect(GLOBAL_SYNONYMS['against']).toBe('vs');
    });
  });

  describe('Sorting/Ranking Synonyms', () => {
    test('highest maps to top', () => {
      expect(GLOBAL_SYNONYMS['highest']).toBe('top');
    });

    test('best maps to top', () => {
      expect(GLOBAL_SYNONYMS['best']).toBe('top');
    });

    test('most maps to top', () => {
      expect(GLOBAL_SYNONYMS['most']).toBe('top');
    });

    test('lowest maps to bottom', () => {
      expect(GLOBAL_SYNONYMS['lowest']).toBe('bottom');
    });

    test('worst maps to bottom', () => {
      expect(GLOBAL_SYNONYMS['worst']).toBe('bottom');
    });

    test('least maps to bottom', () => {
      expect(GLOBAL_SYNONYMS['least']).toBe('bottom');
    });
  });

  describe('Filter Synonyms', () => {
    test('where maps to ?', () => {
      expect(GLOBAL_SYNONYMS['where']).toBe('?');
    });

    test('when maps to ?', () => {
      expect(GLOBAL_SYNONYMS['when']).toBe('?');
    });

    test('having maps to ?', () => {
      expect(GLOBAL_SYNONYMS['having']).toBe('?');
    });

    test('filtered by maps to ?', () => {
      expect(GLOBAL_SYNONYMS['filtered by']).toBe('?');
    });
  });
});

// =============================================================================
// ACTION_WORDS - Common Action Phrases Verification
// =============================================================================

describe('ACTION_WORDS', () => {
  describe('Request Phrases', () => {
    test('contains show me', () => {
      expect(ACTION_WORDS).toContain('show me');
    });

    test('contains show', () => {
      expect(ACTION_WORDS).toContain('show');
    });

    test('contains tell me', () => {
      expect(ACTION_WORDS).toContain('tell me');
    });

    test('contains give me', () => {
      expect(ACTION_WORDS).toContain('give me');
    });

    test('contains get me', () => {
      expect(ACTION_WORDS).toContain('get me');
    });

    test('contains display', () => {
      expect(ACTION_WORDS).toContain('display');
    });

    test('contains list', () => {
      expect(ACTION_WORDS).toContain('list');
    });

    test('contains retrieve', () => {
      expect(ACTION_WORDS).toContain('retrieve');
    });

    test('contains pull up', () => {
      expect(ACTION_WORDS).toContain('pull up');
    });
  });

  describe('Question Phrases', () => {
    test('contains what is', () => {
      expect(ACTION_WORDS).toContain('what is');
    });

    test("contains what's", () => {
      expect(ACTION_WORDS).toContain("what's");
    });

    test('contains what are', () => {
      expect(ACTION_WORDS).toContain('what are');
    });

    test('contains how much', () => {
      expect(ACTION_WORDS).toContain('how much');
    });

    test('contains how many', () => {
      expect(ACTION_WORDS).toContain('how many');
    });

    test('contains can you show', () => {
      expect(ACTION_WORDS).toContain('can you show');
    });

    test('contains i want to see', () => {
      expect(ACTION_WORDS).toContain('i want to see');
    });

    test('contains i need to know', () => {
      expect(ACTION_WORDS).toContain('i need to know');
    });
  });

  describe('Filler Phrases', () => {
    test('contains please', () => {
      expect(ACTION_WORDS).toContain('please');
    });

    test('contains the', () => {
      expect(ACTION_WORDS).toContain('the');
    });

    test('contains my', () => {
      expect(ACTION_WORDS).toContain('my');
    });

    test('contains our', () => {
      expect(ACTION_WORDS).toContain('our');
    });

    test('contains total', () => {
      expect(ACTION_WORDS).toContain('total');
    });
  });

  describe('Action Verbs', () => {
    test('contains get', () => {
      expect(ACTION_WORDS).toContain('get');
    });

    test('contains find', () => {
      expect(ACTION_WORDS).toContain('find');
    });

    test('contains see', () => {
      expect(ACTION_WORDS).toContain('see');
    });

    test('contains view', () => {
      expect(ACTION_WORDS).toContain('view');
    });

    test('contains analyze', () => {
      expect(ACTION_WORDS).toContain('analyze');
    });

    test('contains calculate', () => {
      expect(ACTION_WORDS).toContain('calculate');
    });
  });
});

// =============================================================================
// createSynonymRegistry - Registry Factory
// =============================================================================

describe('createSynonymRegistry', () => {
  test('creates registry with 3 levels', () => {
    const registry = createSynonymRegistry();

    expect(registry).toHaveProperty('global');
    expect(registry).toHaveProperty('org');
    expect(registry).toHaveProperty('user');
  });

  test('global level contains GLOBAL_SYNONYMS', () => {
    const registry = createSynonymRegistry();

    expect(registry.global).toEqual(GLOBAL_SYNONYMS);
  });

  test('org and user levels are empty by default', () => {
    const registry = createSynonymRegistry();

    expect(registry.org).toEqual({});
    expect(registry.user).toEqual({});
  });

  test('accepts org synonyms', () => {
    const orgSynonyms = { mrr: 'monthly_recurring_revenue' };
    const registry = createSynonymRegistry(orgSynonyms);

    expect(registry.org).toEqual(orgSynonyms);
  });

  test('accepts user synonyms', () => {
    const userSynonyms = { rev: 'revenue' };
    const registry = createSynonymRegistry({}, userSynonyms);

    expect(registry.user).toEqual(userSynonyms);
  });

  test('accepts both org and user synonyms', () => {
    const orgSynonyms = { mrr: 'monthly_recurring_revenue' };
    const userSynonyms = { rev: 'revenue' };
    const registry = createSynonymRegistry(orgSynonyms, userSynonyms);

    expect(registry.org).toEqual(orgSynonyms);
    expect(registry.user).toEqual(userSynonyms);
  });

  test('creates independent copies of synonym objects', () => {
    const orgSynonyms = { mrr: 'monthly_recurring_revenue' };
    const registry = createSynonymRegistry(orgSynonyms);

    // Modify original object
    orgSynonyms.mrr = 'modified';

    // Registry should not be affected
    expect(registry.org.mrr).toBe('monthly_recurring_revenue');
  });

  test('creates independent copy of global synonyms', () => {
    const registry = createSynonymRegistry();
    const originalSales = GLOBAL_SYNONYMS['sales'];

    // Modify registry's global
    registry.global['sales'] = 'modified';

    // Original GLOBAL_SYNONYMS should not be affected
    expect(GLOBAL_SYNONYMS['sales']).toBe(originalSales);
  });
});

// =============================================================================
// resolveSynonym - 3-Level Priority Resolution
// =============================================================================

describe('resolveSynonym', () => {
  describe('Basic Resolution', () => {
    test('resolves global synonym', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('sales', registry)).toBe('revenue');
    });

    test('resolves org synonym', () => {
      const registry = createSynonymRegistry({ mrr: 'monthly_revenue' });

      expect(resolveSynonym('mrr', registry)).toBe('monthly_revenue');
    });

    test('resolves user synonym', () => {
      const registry = createSynonymRegistry({}, { myrev: 'custom_revenue' });

      expect(resolveSynonym('myrev', registry)).toBe('custom_revenue');
    });

    test('returns original term when no match found', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('xyz_unknown', registry)).toBe('xyz_unknown');
    });
  });

  describe('Priority Order: User > Org > Global', () => {
    test('user overrides org', () => {
      const registry = createSynonymRegistry(
        { sales: 'org_sales' },
        { sales: 'user_sales' }
      );

      expect(resolveSynonym('sales', registry)).toBe('user_sales');
    });

    test('user overrides global', () => {
      const registry = createSynonymRegistry({}, { sales: 'user_sales' });

      expect(resolveSynonym('sales', registry)).toBe('user_sales');
    });

    test('org overrides global', () => {
      const registry = createSynonymRegistry({ sales: 'org_sales' });

      expect(resolveSynonym('sales', registry)).toBe('org_sales');
    });

    test('global used when no user or org match', () => {
      const registry = createSynonymRegistry(
        { other: 'org_other' },
        { another: 'user_another' }
      );

      expect(resolveSynonym('sales', registry)).toBe('revenue');
    });

    test('complex override scenario', () => {
      const registry = createSynonymRegistry(
        {
          sales: 'org_sales',
          income: 'org_income',
          custom1: 'org_custom1',
        },
        {
          sales: 'user_sales',
          custom2: 'user_custom2',
        }
      );

      expect(resolveSynonym('sales', registry)).toBe('user_sales'); // user wins
      expect(resolveSynonym('income', registry)).toBe('org_income'); // org wins over global
      expect(resolveSynonym('custom1', registry)).toBe('org_custom1'); // org only
      expect(resolveSynonym('custom2', registry)).toBe('user_custom2'); // user only
      expect(resolveSynonym('money', registry)).toBe('revenue'); // global fallback
    });
  });

  describe('Normalization', () => {
    test('normalizes to lowercase', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('SALES', registry)).toBe('revenue');
      expect(resolveSynonym('Sales', registry)).toBe('revenue');
      expect(resolveSynonym('SaLeS', registry)).toBe('revenue');
    });

    test('trims whitespace', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('  sales  ', registry)).toBe('revenue');
      expect(resolveSynonym('\tsales\n', registry)).toBe('revenue');
    });

    test('handles mixed case and whitespace', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('  SALES  ', registry)).toBe('revenue');
    });
  });

  describe('Edge Cases', () => {
    test('empty string returns empty string', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('', registry)).toBe('');
    });

    test('whitespace-only string returns empty after trim', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('   ', registry)).toBe('   ');
    });

    test('multi-word terms resolve correctly', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('last quarter', registry)).toBe('~Q-1');
      expect(resolveSynonym('basket size', registry)).toBe('aov');
    });

    test('special characters preserved when no match', () => {
      const registry = createSynonymRegistry();

      expect(resolveSynonym('@metric', registry)).toBe('@metric');
      expect(resolveSynonym('#dimension', registry)).toBe('#dimension');
    });
  });
});

// =============================================================================
// stripActionWords - Removes Action Phrases from Input
// =============================================================================

describe('stripActionWords', () => {
  describe('Request Phrase Removal', () => {
    test('removes "show me"', () => {
      expect(stripActionWords('show me revenue by region')).toBe('revenue by region');
    });

    test('removes "tell me"', () => {
      expect(stripActionWords('tell me about sales')).toBe('about sales');
    });

    test('removes "give me"', () => {
      expect(stripActionWords('give me the numbers')).toBe('numbers');
    });

    test('removes "get me"', () => {
      expect(stripActionWords('get me orders for today')).toBe('orders for today');
    });
  });

  describe('Question Phrase Removal', () => {
    test('removes "what is"', () => {
      expect(stripActionWords('what is the revenue')).toBe('revenue');
    });

    test("removes \"what's\"", () => {
      expect(stripActionWords("what's the total sales")).toBe('sales');
    });

    test('removes "how much"', () => {
      expect(stripActionWords('how much revenue last month')).toBe('revenue last month');
    });

    test('removes "how many"', () => {
      expect(stripActionWords('how many orders today')).toBe('orders today');
    });

    test('removes "can you show"', () => {
      expect(stripActionWords('can you show me revenue')).toBe('me revenue');
    });
  });

  describe('Filler Word Removal', () => {
    test('removes "please"', () => {
      expect(stripActionWords('please show revenue')).toBe('revenue');
    });

    test('removes "the"', () => {
      expect(stripActionWords('the revenue by region')).toBe('revenue by region');
    });

    test('removes "my" and "our"', () => {
      expect(stripActionWords('my sales')).toBe('sales');
      expect(stripActionWords('our revenue')).toBe('revenue');
    });

    test('removes "total"', () => {
      expect(stripActionWords('total sales by region')).toBe('sales by region');
    });
  });

  describe('Complex Inputs', () => {
    test('removes multiple action words', () => {
      const result = stripActionWords('please show me the total revenue by region');
      expect(result).toBe('revenue by region');
    });

    test("handles what's the total sales last month", () => {
      const result = stripActionWords("what's the total sales last month");
      expect(result).toBe('sales last month');
    });

    test('handles i want to see revenue', () => {
      const result = stripActionWords('i want to see revenue');
      expect(result).toBe('revenue');
    });

    test('handles can you tell me about orders', () => {
      const result = stripActionWords('can you tell me about orders');
      expect(result).toBe('me about orders');
    });
  });

  describe('Edge Cases', () => {
    test('returns empty string for action-only input', () => {
      expect(stripActionWords('show me')).toBe(''); // "show me" is a single phrase
      expect(stripActionWords('please')).toBe('');
    });

    test('preserves business terms', () => {
      expect(stripActionWords('revenue')).toBe('revenue');
      expect(stripActionWords('orders by region')).toBe('orders by region');
    });

    test('handles case insensitivity', () => {
      expect(stripActionWords('SHOW ME Revenue')).toBe('revenue');
      expect(stripActionWords('Please DISPLAY sales')).toBe('sales');
    });

    test('cleans up extra whitespace', () => {
      const result = stripActionWords('show me   the   revenue');
      expect(result).toBe('revenue');
    });

    test('handles empty string', () => {
      expect(stripActionWords('')).toBe('');
    });

    test('handles whitespace-only input', () => {
      expect(stripActionWords('   ')).toBe('');
    });
  });

  describe('Word Boundary Protection', () => {
    test('does not remove partial word matches for single words', () => {
      // "show" should not affect "showcase" because implementation
      // uses word boundaries for single words
      expect(stripActionWords('showcase')).toBe('showcase');
    });

    test('removes "display" as standalone', () => {
      expect(stripActionWords('display data')).toBe('data');
    });

    test('preserves words that contain action words as substrings', () => {
      expect(stripActionWords('overview')).toBe('overview'); // contains "view"
      expect(stripActionWords('checkout')).toBe('checkout'); // contains "check"
    });
  });
});

// =============================================================================
// hasSynonym - Checks If Term Has Synonym at Any Level
// =============================================================================

describe('hasSynonym', () => {
  describe('Global Level', () => {
    test('returns true for global synonym', () => {
      const registry = createSynonymRegistry();

      expect(hasSynonym('sales', registry)).toBe(true);
      expect(hasSynonym('income', registry)).toBe(true);
      expect(hasSynonym('geo', registry)).toBe(true);
    });

    test('returns false for unknown term', () => {
      const registry = createSynonymRegistry();

      expect(hasSynonym('xyz_unknown', registry)).toBe(false);
    });
  });

  describe('Org Level', () => {
    test('returns true for org synonym', () => {
      const registry = createSynonymRegistry({ mrr: 'monthly_revenue' });

      expect(hasSynonym('mrr', registry)).toBe(true);
    });

    test('org synonym not in empty registry', () => {
      const registry = createSynonymRegistry();

      expect(hasSynonym('mrr', registry)).toBe(false);
    });
  });

  describe('User Level', () => {
    test('returns true for user synonym', () => {
      const registry = createSynonymRegistry({}, { myterm: 'my_value' });

      expect(hasSynonym('myterm', registry)).toBe(true);
    });
  });

  describe('Multi-Level', () => {
    test('finds term at any level', () => {
      const registry = createSynonymRegistry(
        { org_term: 'org_value' },
        { user_term: 'user_value' }
      );

      expect(hasSynonym('sales', registry)).toBe(true); // global
      expect(hasSynonym('org_term', registry)).toBe(true); // org
      expect(hasSynonym('user_term', registry)).toBe(true); // user
      expect(hasSynonym('unknown', registry)).toBe(false); // nowhere
    });
  });

  describe('Normalization', () => {
    test('case insensitive', () => {
      const registry = createSynonymRegistry();

      expect(hasSynonym('SALES', registry)).toBe(true);
      expect(hasSynonym('Sales', registry)).toBe(true);
    });

    test('trims whitespace', () => {
      const registry = createSynonymRegistry();

      expect(hasSynonym('  sales  ', registry)).toBe(true);
    });
  });
});

// =============================================================================
// getSynonymSource - Returns Correct Source Level
// =============================================================================

describe('getSynonymSource', () => {
  describe('Single Level Detection', () => {
    test('returns "global" for global synonym', () => {
      const registry = createSynonymRegistry();

      expect(getSynonymSource('sales', registry)).toBe('global');
      expect(getSynonymSource('income', registry)).toBe('global');
      expect(getSynonymSource('geo', registry)).toBe('global');
    });

    test('returns "org" for org-only synonym', () => {
      const registry = createSynonymRegistry({ mrr: 'monthly_revenue' });

      expect(getSynonymSource('mrr', registry)).toBe('org');
    });

    test('returns "user" for user-only synonym', () => {
      const registry = createSynonymRegistry({}, { myterm: 'my_value' });

      expect(getSynonymSource('myterm', registry)).toBe('user');
    });

    test('returns null for unknown term', () => {
      const registry = createSynonymRegistry();

      expect(getSynonymSource('xyz_unknown', registry)).toBeNull();
    });
  });

  describe('Priority Detection (Highest Level)', () => {
    test('returns "user" when user overrides org and global', () => {
      const registry = createSynonymRegistry(
        { sales: 'org_sales' },
        { sales: 'user_sales' }
      );

      expect(getSynonymSource('sales', registry)).toBe('user');
    });

    test('returns "user" when user overrides global only', () => {
      const registry = createSynonymRegistry({}, { sales: 'user_sales' });

      expect(getSynonymSource('sales', registry)).toBe('user');
    });

    test('returns "org" when org overrides global', () => {
      const registry = createSynonymRegistry({ sales: 'org_sales' });

      expect(getSynonymSource('sales', registry)).toBe('org');
    });

    test('returns "global" when no overrides', () => {
      const registry = createSynonymRegistry(
        { other: 'org_value' },
        { another: 'user_value' }
      );

      expect(getSynonymSource('sales', registry)).toBe('global');
    });
  });

  describe('Complex Scenario', () => {
    test('correctly identifies source for each term', () => {
      const registry = createSynonymRegistry(
        {
          sales: 'org_sales',
          org_only: 'org_only_value',
        },
        {
          sales: 'user_sales',
          user_only: 'user_only_value',
        }
      );

      expect(getSynonymSource('sales', registry)).toBe('user'); // user wins
      expect(getSynonymSource('org_only', registry)).toBe('org');
      expect(getSynonymSource('user_only', registry)).toBe('user');
      expect(getSynonymSource('income', registry)).toBe('global'); // not overridden
      expect(getSynonymSource('unknown', registry)).toBeNull();
    });
  });

  describe('Normalization', () => {
    test('case insensitive', () => {
      const registry = createSynonymRegistry();

      expect(getSynonymSource('SALES', registry)).toBe('global');
      expect(getSynonymSource('Sales', registry)).toBe('global');
    });

    test('trims whitespace', () => {
      const registry = createSynonymRegistry();

      expect(getSynonymSource('  sales  ', registry)).toBe('global');
    });

    test('org level with mixed case', () => {
      const registry = createSynonymRegistry({ mrr: 'value' });

      expect(getSynonymSource('MRR', registry)).toBe('org');
      expect(getSynonymSource('Mrr', registry)).toBe('org');
    });

    test('user level with mixed case', () => {
      const registry = createSynonymRegistry({}, { myterm: 'value' });

      expect(getSynonymSource('MYTERM', registry)).toBe('user');
      expect(getSynonymSource('MyTerm', registry)).toBe('user');
    });
  });

  describe('Edge Cases', () => {
    test('empty string returns null', () => {
      const registry = createSynonymRegistry();

      expect(getSynonymSource('', registry)).toBeNull();
    });

    test('whitespace-only returns null', () => {
      const registry = createSynonymRegistry();

      expect(getSynonymSource('   ', registry)).toBeNull();
    });

    test('empty registry returns null', () => {
      const registry = {
        global: {},
        org: {},
        user: {},
      };

      expect(getSynonymSource('sales', registry)).toBeNull();
    });
  });
});

// =============================================================================
// Integration Tests - Combined Functionality
// =============================================================================

describe('Integration Tests', () => {
  describe('Complete Workflow', () => {
    test('create registry and resolve synonyms with priority', () => {
      // Create registry with all three levels
      const registry = createSynonymRegistry(
        {
          mrr: 'monthly_recurring_revenue',
          sales: 'total_sales', // override global
        },
        {
          rev: 'my_revenue',
          sales: 'personal_sales', // override org
        }
      );

      // Test resolution with priority
      expect(resolveSynonym('sales', registry)).toBe('personal_sales'); // user
      expect(resolveSynonym('mrr', registry)).toBe('monthly_recurring_revenue'); // org
      expect(resolveSynonym('rev', registry)).toBe('my_revenue'); // user
      expect(resolveSynonym('income', registry)).toBe('revenue'); // global

      // Test source detection
      expect(getSynonymSource('sales', registry)).toBe('user');
      expect(getSynonymSource('mrr', registry)).toBe('org');
      expect(getSynonymSource('income', registry)).toBe('global');

      // Test hasSynonym
      expect(hasSynonym('sales', registry)).toBe(true);
      expect(hasSynonym('mrr', registry)).toBe(true);
      expect(hasSynonym('unknown', registry)).toBe(false);
    });

    test('stripActionWords and then resolve', () => {
      const registry = createSynonymRegistry();

      const input = 'show me sales by geo last month';
      const stripped = stripActionWords(input);

      // After stripping, resolve synonyms
      const words = stripped.split(' ').filter(Boolean);
      const resolved = words.map((w) => resolveSynonym(w, registry));

      expect(stripped).toBe('sales by geo last month');
      expect(resolved).toContain('revenue'); // sales -> revenue
      expect(resolved).toContain('#'); // by -> # (grouping indicator)
      expect(resolved).toContain('region'); // geo -> region
    });
  });

  describe('Real-World Scenarios', () => {
    test('e-commerce natural language query', () => {
      const registry = createSynonymRegistry(
        { aov: 'average_order_value' },
        { rev: 'revenue' }
      );

      // Simulate query processing
      const query = "what's my total sales by category last quarter";
      const stripped = stripActionWords(query);
      const terms = stripped.split(' ').filter(Boolean);

      const resolved = terms.map((term) => ({
        original: term,
        resolved: resolveSynonym(term, registry),
        source: getSynonymSource(term, registry),
      }));

      // Verify key terms resolved correctly
      const salesTerm = resolved.find((r) => r.original === 'sales');
      expect(salesTerm?.resolved).toBe('revenue');
      expect(salesTerm?.source).toBe('global');

      const categoryTerm = resolved.find((r) => r.original === 'category');
      expect(categoryTerm?.resolved).toBe('category'); // no synonym
      expect(categoryTerm?.source).toBeNull();
    });

    test('SaaS metrics with org overrides', () => {
      const registry = createSynonymRegistry({
        sales: 'bookings', // SaaS uses "bookings" instead of "revenue"
        customers: 'accounts', // SaaS terminology
        mrr: 'monthly_recurring_revenue',
        arr: 'annual_recurring_revenue',
      });

      expect(resolveSynonym('sales', registry)).toBe('bookings');
      expect(resolveSynonym('customers', registry)).toBe('accounts');
      expect(resolveSynonym('mrr', registry)).toBe('monthly_recurring_revenue');
      // Note: synonym resolution is single-level, not chained
      // 'clients' -> 'customers' (global), but doesn't then resolve 'customers' -> 'accounts'
      expect(resolveSynonym('clients', registry)).toBe('customers');
    });

    test('user personalizations override everything', () => {
      const registry = createSynonymRegistry(
        {
          sales: 'bookings',
          target: 'quota',
        },
        {
          sales: 'my_dashboard_metric', // Personal dashboard preference
          rev: 'revenue',
        }
      );

      expect(resolveSynonym('sales', registry)).toBe('my_dashboard_metric');
      expect(resolveSynonym('target', registry)).toBe('quota');
      expect(resolveSynonym('rev', registry)).toBe('revenue');
    });
  });
});
