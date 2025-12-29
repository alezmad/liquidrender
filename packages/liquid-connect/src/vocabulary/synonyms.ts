/**
 * Synonyms Module
 *
 * Global synonyms and helper functions for 3-level synonym resolution.
 * Enables natural language variations to map to canonical vocabulary terms.
 */

import type { SynonymRegistry } from './types';

// =============================================================================
// Global Synonyms - Built-in mappings (lowest priority)
// =============================================================================

/**
 * Global synonyms for common terms.
 * Maps natural language variations to canonical vocabulary terms.
 */
export const GLOBAL_SYNONYMS: Record<string, string> = {
  // -------------------------------------------------------------------------
  // Metric Synonyms
  // -------------------------------------------------------------------------

  // Revenue variations
  sales: 'revenue',
  income: 'revenue',
  money: 'revenue',
  earnings: 'revenue',
  proceeds: 'revenue',
  receipts: 'revenue',
  turnover: 'revenue',
  'gross sales': 'revenue',
  'total sales': 'revenue',
  'net sales': 'revenue',

  // Orders/Count variations
  count: 'orders',
  'number of': 'orders',
  'how many': 'orders',
  quantity: 'orders',
  volume: 'orders',
  transactions: 'orders',
  purchases: 'orders',
  'order count': 'orders',
  'transaction count': 'orders',

  // Profit variations
  margin: 'profit',
  'gross profit': 'profit',
  'net profit': 'profit',
  'bottom line': 'profit',
  gains: 'profit',

  // Customer variations
  clients: 'customers',
  users: 'customers',
  buyers: 'customers',
  accounts: 'customers',
  patrons: 'customers',
  subscribers: 'customers',

  // Average Order Value variations
  'average order': 'aov',
  'avg order value': 'aov',
  'average transaction': 'aov',
  'basket size': 'aov',
  'cart value': 'aov',

  // Conversion variations
  'conversion rate': 'conversion',
  cvr: 'conversion',
  'conv rate': 'conversion',

  // -------------------------------------------------------------------------
  // Dimension Synonyms
  // -------------------------------------------------------------------------

  // Region/Geography variations
  geo: 'region',
  geography: 'region',
  area: 'region',
  location: 'region',
  territory: 'region',
  market: 'region',
  zone: 'region',
  country: 'region',
  state: 'region',
  city: 'region',

  // Category variations
  type: 'category',
  segment: 'category',
  classification: 'category',
  group: 'category',
  class: 'category',
  kind: 'category',
  'product type': 'category',
  'product category': 'category',

  // Product variations
  item: 'product',
  sku: 'product',
  goods: 'product',
  merchandise: 'product',
  offering: 'product',

  // Channel variations
  source: 'channel',
  medium: 'channel',
  platform: 'channel',
  'sales channel': 'channel',
  'marketing channel': 'channel',

  // Customer segment variations
  tier: 'segment',
  cohort: 'segment',
  'customer type': 'segment',
  'customer segment': 'segment',
  'user segment': 'segment',

  // -------------------------------------------------------------------------
  // Time Synonyms - Map to LC time tokens
  // -------------------------------------------------------------------------

  // Quarter variations
  'last quarter': '~Q-1',
  'previous quarter': '~Q-1',
  'prior quarter': '~Q-1',
  'past quarter': '~Q-1',
  q1: '~Q1',
  q2: '~Q2',
  q3: '~Q3',
  q4: '~Q4',

  // Month variations
  'this month': '~MTD',
  'current month': '~MTD',
  'last month': '~M-1',
  'previous month': '~M-1',
  'prior month': '~M-1',
  'past month': '~M-1',

  // Year variations
  'this year': '~YTD',
  'current year': '~YTD',
  'last year': '~Y-1',
  'previous year': '~Y-1',
  'prior year': '~Y-1',
  'past year': '~Y-1',

  // Week variations
  'this week': '~WTD',
  'current week': '~WTD',
  'last week': '~W-1',
  'previous week': '~W-1',
  'prior week': '~W-1',
  'past week': '~W-1',

  // Day variations
  today: '~today',
  yesterday: '~D-1',
  'last day': '~D-1',

  // Period abbreviations
  mtd: '~MTD',
  ytd: '~YTD',
  qtd: '~QTD',
  wtd: '~WTD',

  // Relative periods
  'last 7 days': '~D-7',
  'past 7 days': '~D-7',
  'last week period': '~D-7',
  'last 30 days': '~D-30',
  'past 30 days': '~D-30',
  'last 90 days': '~D-90',
  'past 90 days': '~D-90',
  'last 3 months': '~M-3',
  'past 3 months': '~M-3',
  'last 6 months': '~M-6',
  'past 6 months': '~M-6',
  'last 12 months': '~M-12',
  'past 12 months': '~M-12',

  // -------------------------------------------------------------------------
  // Grouping Indicators - Map to dimension marker
  // -------------------------------------------------------------------------

  by: '#',
  per: '#',
  'grouped by': '#',
  'broken down by': '#',
  'split by': '#',
  across: '#',
  for: '#',

  // -------------------------------------------------------------------------
  // Comparison Synonyms
  // -------------------------------------------------------------------------

  versus: 'vs',
  'compared to': 'vs',
  'compared with': 'vs',
  against: 'vs',
  'relative to': 'vs',

  // -------------------------------------------------------------------------
  // Sorting/Ranking Synonyms
  // -------------------------------------------------------------------------

  highest: 'top',
  best: 'top',
  greatest: 'top',
  largest: 'top',
  most: 'top',
  lowest: 'bottom',
  worst: 'bottom',
  smallest: 'bottom',
  least: 'bottom',
  fewest: 'bottom',

  // -------------------------------------------------------------------------
  // Filter Synonyms
  // -------------------------------------------------------------------------

  where: '?',
  when: '?',
  with: '?',
  having: '?',
  'only for': '?',
  'filtered by': '?',
  'limited to': '?',
};

// =============================================================================
// Action Words - Phrases to strip from input
// =============================================================================

/**
 * Action words and phrases to strip from natural language input.
 * These add no semantic value for query parsing.
 */
export const ACTION_WORDS: string[] = [
  // Request phrases
  'show me',
  'show',
  'tell me',
  'give me',
  'get me',
  'fetch me',
  'display',
  'present',
  'list',
  'retrieve',
  'pull up',
  'bring up',
  'look up',

  // Question phrases
  'what is',
  "what's",
  'what are',
  'what were',
  'how much',
  'how many',
  'can you show',
  'can you tell',
  'could you show',
  'could you tell',
  'would you show',
  'i want to see',
  'i want to know',
  'i need to see',
  'i need to know',
  'let me see',

  // Filler phrases
  'please',
  'the',
  'a',
  'an',
  'of',
  'my',
  'our',
  'all',
  'total',
  'overall',

  // Action verbs (standalone)
  'get',
  'find',
  'see',
  'view',
  'check',
  'report',
  'analyze',
  'calculate',
  'compute',
];

// =============================================================================
// Synonym Registry Factory
// =============================================================================

/**
 * Create a SynonymRegistry combining global, org, and user synonyms.
 *
 * @param orgSynonyms - Organization-level synonyms from vocabulary aliases
 * @param userSynonyms - User-level personal aliases (highest priority)
 * @returns Combined SynonymRegistry with 3-level resolution
 *
 * @example
 * ```typescript
 * const registry = createSynonymRegistry(
 *   { 'mrr': 'monthly_recurring_revenue' },  // org
 *   { 'rev': 'revenue' }                      // user
 * );
 * ```
 */
export function createSynonymRegistry(
  orgSynonyms: Record<string, string> = {},
  userSynonyms: Record<string, string> = {}
): SynonymRegistry {
  return {
    global: { ...GLOBAL_SYNONYMS },
    org: { ...orgSynonyms },
    user: { ...userSynonyms },
  };
}

// =============================================================================
// Synonym Resolution
// =============================================================================

/**
 * Resolve a term using 3-level priority synonym lookup.
 *
 * Priority order:
 * 1. User synonyms (highest priority)
 * 2. Organization synonyms
 * 3. Global synonyms (lowest priority)
 *
 * @param term - The term to resolve
 * @param registry - The SynonymRegistry to search
 * @returns The resolved term, or the original if no match found
 *
 * @example
 * ```typescript
 * const registry = createSynonymRegistry(
 *   { 'sales': 'total_sales' },   // org overrides global
 *   { 'sales': 'my_sales' }       // user overrides org
 * );
 *
 * resolveSynonym('sales', registry);  // Returns 'my_sales' (user wins)
 * resolveSynonym('income', registry); // Returns 'revenue' (global)
 * resolveSynonym('xyz', registry);    // Returns 'xyz' (no match)
 * ```
 */
export function resolveSynonym(
  term: string,
  registry: SynonymRegistry
): string {
  // Normalize term for lookup
  const normalizedTerm = term.toLowerCase().trim();

  // Check user first (highest priority)
  if (normalizedTerm in registry.user) {
    return registry.user[normalizedTerm];
  }

  // Check org second
  if (normalizedTerm in registry.org) {
    return registry.org[normalizedTerm];
  }

  // Check global last (lowest priority)
  if (normalizedTerm in registry.global) {
    return registry.global[normalizedTerm];
  }

  // No match - return original term
  return term;
}

/**
 * Resolve all synonyms in a list of tokens.
 *
 * @param tokens - Array of tokens to resolve
 * @param registry - The SynonymRegistry to use
 * @returns Array of resolved tokens
 */
export function resolveAllSynonyms(
  tokens: string[],
  registry: SynonymRegistry
): string[] {
  return tokens.map((token) => resolveSynonym(token, registry));
}

/**
 * Strip action words from input text.
 *
 * @param input - The input text to clean
 * @returns Input with action words removed
 *
 * @example
 * ```typescript
 * stripActionWords('show me revenue by region');
 * // Returns 'revenue by region'
 *
 * stripActionWords("what's the total sales last month");
 * // Returns 'sales last month'
 * ```
 */
export function stripActionWords(input: string): string {
  let result = input.toLowerCase().trim();

  // Sort by length (longest first) to avoid partial matches
  const sortedActionWords = [...ACTION_WORDS].sort(
    (a, b) => b.length - a.length
  );

  for (const phrase of sortedActionWords) {
    // Use word boundaries for single words, direct match for phrases
    if (phrase.includes(' ')) {
      result = result.replace(new RegExp(phrase, 'gi'), ' ');
    } else {
      result = result.replace(new RegExp(`\\b${phrase}\\b`, 'gi'), ' ');
    }
  }

  // Clean up whitespace
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Check if a term has a synonym in the registry.
 *
 * @param term - The term to check
 * @param registry - The SynonymRegistry to search
 * @returns True if a synonym exists at any level
 */
export function hasSynonym(term: string, registry: SynonymRegistry): boolean {
  const normalizedTerm = term.toLowerCase().trim();
  return (
    normalizedTerm in registry.user ||
    normalizedTerm in registry.org ||
    normalizedTerm in registry.global
  );
}

/**
 * Get the source level of a synonym resolution.
 *
 * @param term - The term to check
 * @param registry - The SynonymRegistry to search
 * @returns The level where the synonym was found, or null if not found
 */
export function getSynonymSource(
  term: string,
  registry: SynonymRegistry
): 'user' | 'org' | 'global' | null {
  const normalizedTerm = term.toLowerCase().trim();

  if (normalizedTerm in registry.user) {
    return 'user';
  }
  if (normalizedTerm in registry.org) {
    return 'org';
  }
  if (normalizedTerm in registry.global) {
    return 'global';
  }

  return null;
}
