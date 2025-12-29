/**
 * Query Normalizer
 *
 * Handles text normalization and synonym resolution for the Query Engine.
 * Converts natural language input into normalized tokens ready for pattern matching.
 *
 * Key responsibilities:
 * - Lowercase and clean input text
 * - Remove punctuation while preserving word-internal hyphens
 * - Collapse whitespace
 * - Apply 3-level synonym substitution (user > org > global)
 * - Track all substitutions for transparency
 */

import type { SynonymRegistry } from '../vocabulary/types';
import type { NormalizeResult, Substitution } from './types';
import { stripActionWords } from '../vocabulary/synonyms';

// =============================================================================
// Constants
// =============================================================================

/**
 * Regex to match punctuation except hyphens within words.
 * Preserves: word-internal hyphens (e.g., "month-to-date")
 * Removes: all other punctuation (periods, commas, question marks, etc.)
 */
const PUNCTUATION_REGEX = /[^\w\s-]|(?<=\s)-|-(?=\s)|^-|-$/g;

/**
 * Regex to collapse multiple whitespace characters into a single space.
 */
const WHITESPACE_REGEX = /\s+/g;

// =============================================================================
// Main Normalize Function
// =============================================================================

/**
 * Normalize input text for pattern matching.
 *
 * Performs the following transformations in order:
 * 1. Strip action words ("show me", "what is", etc.)
 * 2. Lowercase the input
 * 3. Remove punctuation (preserving word-internal hyphens)
 * 4. Collapse whitespace
 * 5. Apply synonym substitutions (longest match first)
 *
 * @param input - Raw natural language input from user
 * @param synonyms - Optional SynonymRegistry for substitutions
 * @returns NormalizeResult with original, normalized text, tokens, and substitutions
 *
 * @example
 * ```typescript
 * const registry: SynonymRegistry = {
 *   global: { 'sales': 'revenue', 'last month': '~M-1' },
 *   org: { 'arr': 'annual_recurring_revenue' },
 *   user: {}
 * };
 *
 * const result = normalize("Show me sales last month!", registry);
 * // result = {
 * //   original: "Show me sales last month!",
 * //   normalized: "revenue ~M-1",
 * //   tokens: ["revenue", "~M-1"],
 * //   substitutions: [
 * //     { from: "sales", to: "revenue", source: "global" },
 * //     { from: "last month", to: "~M-1", source: "global" }
 * //   ]
 * // }
 * ```
 */
export function normalize(
  input: string,
  synonyms?: SynonymRegistry
): NormalizeResult {
  // Handle empty input
  if (!input || input.trim().length === 0) {
    return {
      original: input || '',
      normalized: '',
      tokens: [],
      substitutions: [],
    };
  }

  const original = input;

  // Step 1: Strip action words first
  let text = stripActionWords(input);

  // Step 2: Lowercase
  text = text.toLowerCase();

  // Step 3: Remove punctuation (preserve word-internal hyphens)
  text = cleanPunctuation(text);

  // Step 4: Collapse whitespace
  text = collapseWhitespace(text);

  // Step 5: Apply synonyms if registry provided
  let substitutions: Substitution[] = [];
  if (synonyms) {
    const synonymResult = applySynonyms(text, synonyms);
    text = synonymResult.text;
    substitutions = synonymResult.substitutions;
  }

  // Step 6: Tokenize
  const tokens = tokenize(text);

  return {
    original,
    normalized: text,
    tokens,
    substitutions,
  };
}

// =============================================================================
// Tokenization
// =============================================================================

/**
 * Split text into tokens.
 *
 * Splits on whitespace and filters out empty strings.
 * Preserves hyphenated words and LC DSL markers (e.g., ~M-1, #region).
 *
 * @param text - Normalized text to tokenize
 * @returns Array of non-empty tokens
 *
 * @example
 * ```typescript
 * tokenize("revenue by region ~M-1");
 * // Returns: ["revenue", "by", "region", "~M-1"]
 *
 * tokenize("month-to-date profit");
 * // Returns: ["month-to-date", "profit"]
 * ```
 */
export function tokenize(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  return text
    .trim()
    .split(WHITESPACE_REGEX)
    .filter((token) => token.length > 0);
}

// =============================================================================
// Synonym Application
// =============================================================================

/**
 * Apply 3-level synonym resolution to text.
 *
 * Resolution priority (highest to lowest):
 * 1. User synonyms - Personal aliases
 * 2. Org synonyms - Organization vocabulary
 * 3. Global synonyms - Built-in mappings
 *
 * Uses longest-match-first strategy to handle multi-word synonyms correctly.
 * For example, "last quarter" should match before "last" alone.
 *
 * @param text - Text to apply synonyms to
 * @param registry - SynonymRegistry with user, org, and global synonyms
 * @returns Object with transformed text and list of substitutions made
 *
 * @example
 * ```typescript
 * const registry: SynonymRegistry = {
 *   global: { 'sales': 'revenue' },
 *   org: { 'sales': 'org_sales' },
 *   user: { 'sales': 'my_revenue' }
 * };
 *
 * applySynonyms("sales by region", registry);
 * // Returns: {
 * //   text: "my_revenue by region",
 * //   substitutions: [{ from: "sales", to: "my_revenue", source: "user" }]
 * // }
 * ```
 */
export function applySynonyms(
  text: string,
  registry: SynonymRegistry
): { text: string; substitutions: Substitution[] } {
  if (!text || text.trim().length === 0) {
    return { text: '', substitutions: [] };
  }

  const substitutions: Substitution[] = [];
  let result = text;

  // Build combined synonym map with source tracking
  // Process in priority order: user > org > global
  // Later entries override earlier ones, but we process from global up
  // so user has final say
  const synonymEntries: Array<{
    from: string;
    to: string;
    source: 'user' | 'org' | 'global';
  }> = [];

  // Add global synonyms (lowest priority)
  for (const [from, to] of Object.entries(registry.global)) {
    synonymEntries.push({ from: from.toLowerCase(), to, source: 'global' });
  }

  // Add org synonyms (medium priority) - will override global if same key
  for (const [from, to] of Object.entries(registry.org)) {
    synonymEntries.push({ from: from.toLowerCase(), to, source: 'org' });
  }

  // Add user synonyms (highest priority) - will override both
  for (const [from, to] of Object.entries(registry.user)) {
    synonymEntries.push({ from: from.toLowerCase(), to, source: 'user' });
  }

  // Sort by length (longest first) for proper multi-word matching
  synonymEntries.sort((a, b) => b.from.length - a.from.length);

  // Track which positions have been substituted to avoid double-substitution
  const substitutedRanges: Array<{ start: number; end: number }> = [];

  // Apply each synonym
  for (const entry of synonymEntries) {
    const pattern = escapeRegex(entry.from);

    // Use word boundary matching for safety
    // But be careful with special characters like ~ and #
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');

    let match: RegExpExecArray | null;
    const newResult: string[] = [];
    let lastIndex = 0;

    // Reset regex state
    regex.lastIndex = 0;

    while ((match = regex.exec(result)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // Check if this range overlaps with already substituted ranges
      const overlaps = substitutedRanges.some(
        (range) => matchStart < range.end && matchEnd > range.start
      );

      if (!overlaps) {
        // Add text before match
        newResult.push(result.slice(lastIndex, matchStart));
        // Add substitution
        newResult.push(entry.to);

        // Track substitution
        substitutions.push({
          from: match[0],
          to: entry.to,
          source: entry.source,
        });

        // Track substituted range (adjust for new position)
        substitutedRanges.push({
          start: matchStart,
          end: matchEnd,
        });

        lastIndex = matchEnd;
      }
    }

    // Add remaining text
    newResult.push(result.slice(lastIndex));
    result = newResult.join('');

    // Recalculate ranges for next iteration (positions may have shifted)
    // This is a simplification - for complex cases, we'd need proper offset tracking
    substitutedRanges.length = 0;
  }

  return {
    text: collapseWhitespace(result.trim()),
    substitutions,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clean punctuation from text while preserving word-internal hyphens.
 *
 * @param text - Text to clean
 * @returns Text with punctuation removed
 *
 * @example
 * ```typescript
 * cleanPunctuation("What's the revenue?");
 * // Returns: "Whats the revenue"
 *
 * cleanPunctuation("month-to-date");
 * // Returns: "month-to-date"
 *
 * cleanPunctuation("sales - revenue");
 * // Returns: "sales  revenue"
 * ```
 */
function cleanPunctuation(text: string): string {
  // First pass: remove obvious punctuation
  let result = text.replace(/[.,!?;:'"()\[\]{}]/g, ' ');

  // Second pass: handle hyphens
  // Keep hyphens that are between word characters
  // Remove standalone hyphens or hyphens at word boundaries
  result = result.replace(/(\s)-+(\s)|^-+|-+$|(\s)-+|-+(\s)/g, ' ');

  return result;
}

/**
 * Collapse multiple whitespace characters into a single space.
 *
 * @param text - Text to clean
 * @returns Text with collapsed whitespace
 */
function collapseWhitespace(text: string): string {
  return text.replace(WHITESPACE_REGEX, ' ').trim();
}

/**
 * Escape special regex characters in a string.
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if text contains any synonym from the registry.
 *
 * Useful for quick checks before full normalization.
 *
 * @param text - Text to check
 * @param registry - SynonymRegistry to search
 * @returns True if any synonym matches
 */
export function containsSynonym(
  text: string,
  registry: SynonymRegistry
): boolean {
  const lowerText = text.toLowerCase();

  // Check all levels
  for (const synonymMap of [registry.user, registry.org, registry.global]) {
    for (const key of Object.keys(synonymMap)) {
      if (lowerText.includes(key.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all unique substitutions that would be made for a text.
 *
 * Does not actually modify the text - just reports what would change.
 *
 * @param text - Text to analyze
 * @param registry - SynonymRegistry to use
 * @returns Array of potential substitutions
 */
export function getSubstitutionPreview(
  text: string,
  registry: SynonymRegistry
): Substitution[] {
  const { substitutions } = applySynonyms(text.toLowerCase(), registry);
  return substitutions;
}

/**
 * Create a normalized lookup key from text.
 *
 * Useful for consistent key generation in caches and lookups.
 *
 * @param text - Text to convert to lookup key
 * @returns Normalized lowercase key with spaces replaced by underscores
 */
export function toLookupKey(text: string): string {
  return collapseWhitespace(text.toLowerCase().trim()).replace(/\s+/g, '_');
}
