/**
 * Query Engine
 *
 * Main orchestrator for natural language to LC DSL conversion.
 * Coordinates normalization, pattern matching, and result building.
 */

import type {
  QueryContext,
  QueryOptions,
  QueryResult,
  QueryTrace,
  VocabularyResolution,
  NormalizeResult,
  MatchResult,
} from './types';
import type { CompiledVocabulary } from '../vocabulary/types';
import { normalize, applySynonyms } from './normalizer';
import { match } from './matcher';

// =============================================================================
// Query Engine Class
// =============================================================================

/**
 * QueryEngine provides stateful query processing with cached vocabulary.
 *
 * @example
 * ```typescript
 * const engine = new QueryEngine(compiledVocabulary);
 * const result = engine.query('revenue by region last month');
 *
 * if (result.success) {
 *   console.log(result.lcOutput); // "Q @revenue #region ~M-1"
 * }
 * ```
 */
export class QueryEngine {
  private vocabulary: CompiledVocabulary;
  private defaultOptions: QueryOptions;

  constructor(vocabulary: CompiledVocabulary, defaultOptions: QueryOptions = {}) {
    this.vocabulary = vocabulary;
    this.defaultOptions = {
      fuzzyMatching: true,
      fuzzyThreshold: 0.8,
      includeTrace: false,
      strictMode: false,
      ...defaultOptions,
    };
  }

  /**
   * Process a natural language query.
   */
  query(input: string, options?: QueryOptions): QueryResult {
    return query(input, {
      vocabulary: this.vocabulary,
      options: { ...this.defaultOptions, ...options },
    });
  }

  /**
   * Process a query with user-specific aliases.
   */
  queryWithAliases(
    input: string,
    userAliases: Record<string, string>,
    options?: QueryOptions
  ): QueryResult {
    return query(input, {
      vocabulary: this.vocabulary,
      userAliases,
      options: { ...this.defaultOptions, ...options },
    });
  }

  /**
   * Get the underlying vocabulary.
   */
  getVocabulary(): CompiledVocabulary {
    return this.vocabulary;
  }

  /**
   * Update the vocabulary (for hot-reloading).
   */
  updateVocabulary(vocabulary: CompiledVocabulary): void {
    this.vocabulary = vocabulary;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a QueryEngine instance with compiled vocabulary.
 *
 * @param vocabulary - CompiledVocabulary from vocabulary compiler
 * @param options - Default query options
 * @returns QueryEngine instance
 *
 * @example
 * ```typescript
 * const engine = createQueryEngine(compiled, { includeTrace: true });
 * const result = engine.query('revenue by region');
 * ```
 */
export function createQueryEngine(
  vocabulary: CompiledVocabulary,
  options?: QueryOptions
): QueryEngine {
  return new QueryEngine(vocabulary, options);
}

// =============================================================================
// Main Query Function
// =============================================================================

/**
 * Process a natural language query and convert to LC DSL.
 *
 * This is the main entry point for query processing. It:
 * 1. Normalizes the input text
 * 2. Applies synonym resolution
 * 3. Matches against vocabulary patterns
 * 4. Returns LC DSL output with confidence scoring
 *
 * @param input - Natural language query
 * @param context - Query context with vocabulary and options
 * @returns QueryResult with LC DSL output or error
 *
 * @example
 * ```typescript
 * const result = query('revenue by region last month', {
 *   vocabulary: compiled,
 *   options: { includeTrace: true }
 * });
 *
 * if (result.success) {
 *   console.log(result.lcOutput);  // "Q @revenue #region ~M-1"
 *   console.log(result.confidence); // 0.95
 * }
 * ```
 */
export function query(input: string, context: QueryContext): QueryResult {
  const startTime = Date.now();
  const { vocabulary, userAliases, options = {} } = context;

  // Validate input
  if (!input || typeof input !== 'string') {
    return {
      success: false,
      confidence: 0,
      error: 'Empty or invalid input',
      errorCode: 'EMPTY_INPUT',
    };
  }

  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    return {
      success: false,
      confidence: 0,
      error: 'Empty input after trimming',
      errorCode: 'EMPTY_INPUT',
    };
  }

  // Merge user aliases into vocabulary synonyms
  const effectiveVocabulary = userAliases
    ? mergeUserAliases(vocabulary, userAliases)
    : vocabulary;

  // Step 1: Normalize input
  const normalizeStart = Date.now();
  const normalized = normalize(trimmedInput, effectiveVocabulary.synonyms);
  const normalizeTime = Date.now() - normalizeStart;

  // Step 2: Pattern matching
  const matchStart = Date.now();
  const matchResult = match(normalized, effectiveVocabulary);
  const matchTime = Date.now() - matchStart;

  // Step 3: Build result
  const totalTime = Date.now() - startTime;

  if (matchResult.matched && matchResult.lcOutput) {
    // Success case
    const result: QueryResult = {
      success: true,
      lcOutput: matchResult.lcOutput,
      confidence: matchResult.confidence,
      matchedVocabulary: buildVocabularyResolutions(
        normalized,
        matchResult,
        effectiveVocabulary
      ),
    };

    // Add trace if requested
    if (options.includeTrace) {
      result.trace = buildTrace(
        input,
        normalized,
        matchResult,
        normalizeTime,
        matchTime,
        totalTime
      );
    }

    return result;
  }

  // No match case
  if (options.strictMode) {
    return {
      success: false,
      confidence: 0,
      error: 'No pattern matched in strict mode',
      errorCode: 'NO_MATCH',
      trace: options.includeTrace
        ? buildTrace(input, normalized, matchResult, normalizeTime, matchTime, totalTime)
        : undefined,
    };
  }

  // Attempt fuzzy fallback
  if (options.fuzzyMatching) {
    const fuzzyResult = attemptFuzzyMatch(normalized, effectiveVocabulary, options);
    if (fuzzyResult.matched) {
      return {
        success: true,
        lcOutput: fuzzyResult.lcOutput,
        confidence: fuzzyResult.confidence,
        matchedVocabulary: buildVocabularyResolutions(
          normalized,
          fuzzyResult,
          effectiveVocabulary
        ),
        trace: options.includeTrace
          ? buildTrace(input, normalized, fuzzyResult, normalizeTime, matchTime, totalTime)
          : undefined,
      };
    }
  }

  // Final failure
  return {
    success: false,
    confidence: 0,
    error: 'No pattern matched and fuzzy matching failed',
    errorCode: 'NO_MATCH',
    trace: options.includeTrace
      ? buildTrace(input, normalized, matchResult, normalizeTime, matchTime, totalTime)
      : undefined,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Merge user aliases into vocabulary synonyms.
 */
function mergeUserAliases(
  vocabulary: CompiledVocabulary,
  userAliases: Record<string, string>
): CompiledVocabulary {
  return {
    ...vocabulary,
    synonyms: {
      ...vocabulary.synonyms,
      user: { ...vocabulary.synonyms.user, ...userAliases },
    },
  };
}

/**
 * Build vocabulary resolutions showing how each term was matched.
 */
function buildVocabularyResolutions(
  normalized: NormalizeResult,
  matchResult: MatchResult,
  vocabulary: CompiledVocabulary
): VocabularyResolution[] {
  const resolutions: VocabularyResolution[] = [];

  // Track substitutions from normalization
  for (const sub of normalized.substitutions) {
    resolutions.push({
      term: sub.from,
      resolved: sub.to,
      via: sub.source === 'user' ? 'user_alias' : sub.source === 'org' ? 'org_alias' : 'global_synonym',
      confidence: 1.0,
    });
  }

  // Track slot matches
  if (matchResult.slots) {
    for (const [slotType, value] of Object.entries(matchResult.slots)) {
      // Find matching slot entry
      const slotKey = slotType as 'm' | 'd' | 'f' | 't';
      const slotEntries = vocabulary.slots[slotKey];
      if (slotEntries) {
        const entry = slotEntries.find(
          (e) =>
            e.slug === value ||
            e.canonical.toLowerCase() === value.toLowerCase() ||
            e.aliases.some((a) => a.toLowerCase() === value.toLowerCase())
        );

        if (entry) {
          resolutions.push({
            term: value,
            resolved: entry.slug,
            via: 'canonical',
            confidence: matchResult.confidence,
          });
        }
      }
    }
  }

  return resolutions;
}

/**
 * Build a full query trace for debugging.
 */
function buildTrace(
  input: string,
  normalized: NormalizeResult,
  matchResult: MatchResult,
  normalizeTime: number,
  matchTime: number,
  totalTime: number
): QueryTrace {
  return {
    input,
    normalized,
    matchAttempt: matchResult,
    fallbackUsed: false,
    resolutions: [],
    timingMs: {
      normalize: normalizeTime,
      match: matchTime,
      total: totalTime,
    },
  };
}

/**
 * Attempt fuzzy matching with relaxed constraints.
 */
function attemptFuzzyMatch(
  normalized: NormalizeResult,
  vocabulary: CompiledVocabulary,
  options: QueryOptions
): MatchResult {
  const threshold = options.fuzzyThreshold ?? 0.8;

  // Try partial token matching
  const tokens = normalized.tokens;
  if (tokens.length === 0) {
    return { matched: false, confidence: 0 };
  }

  // Try matching just the metric (single token)
  for (const token of tokens) {
    const metricMatch = findFuzzyMetric(token, vocabulary, threshold);
    if (metricMatch) {
      return {
        matched: true,
        lcOutput: `Q @${metricMatch.slug}`,
        confidence: metricMatch.confidence * 0.9, // Penalty for fuzzy
        matchType: 'fuzzy',
        slots: { m: metricMatch.slug },
      };
    }
  }

  // Try finding metric + dimension pair
  for (let i = 0; i < tokens.length; i++) {
    const metricMatch = findFuzzyMetric(tokens[i], vocabulary, threshold);
    if (metricMatch) {
      for (let j = 0; j < tokens.length; j++) {
        if (i !== j) {
          const dimMatch = findFuzzyDimension(tokens[j], vocabulary, threshold);
          if (dimMatch) {
            return {
              matched: true,
              lcOutput: `Q @${metricMatch.slug} #${dimMatch.slug}`,
              confidence: Math.min(metricMatch.confidence, dimMatch.confidence) * 0.85,
              matchType: 'fuzzy',
              slots: { m: metricMatch.slug, d: dimMatch.slug },
            };
          }
        }
      }
    }
  }

  return { matched: false, confidence: 0 };
}

/**
 * Find a fuzzy metric match.
 */
function findFuzzyMetric(
  token: string,
  vocabulary: CompiledVocabulary,
  threshold: number
): { slug: string; confidence: number } | null {
  const normalizedToken = token.toLowerCase();

  for (const metric of vocabulary.slots.m) {
    // Exact match on slug
    if (metric.slug.toLowerCase() === normalizedToken) {
      return { slug: metric.slug, confidence: 1.0 };
    }

    // Exact match on canonical
    if (metric.canonical.toLowerCase() === normalizedToken) {
      return { slug: metric.slug, confidence: 0.98 };
    }

    // Exact match on alias
    if (metric.aliases.some((a) => a.toLowerCase() === normalizedToken)) {
      return { slug: metric.slug, confidence: 0.95 };
    }

    // Prefix match
    if (metric.slug.toLowerCase().startsWith(normalizedToken) && normalizedToken.length >= 3) {
      const similarity = normalizedToken.length / metric.slug.length;
      if (similarity >= threshold) {
        return { slug: metric.slug, confidence: similarity };
      }
    }

    // Abbreviation match
    if (metric.abbreviation?.toLowerCase() === normalizedToken) {
      return { slug: metric.slug, confidence: 0.92 };
    }
  }

  return null;
}

/**
 * Find a fuzzy dimension match.
 */
function findFuzzyDimension(
  token: string,
  vocabulary: CompiledVocabulary,
  threshold: number
): { slug: string; confidence: number } | null {
  const normalizedToken = token.toLowerCase();

  for (const dim of vocabulary.slots.d) {
    // Exact match on slug
    if (dim.slug.toLowerCase() === normalizedToken) {
      return { slug: dim.slug, confidence: 1.0 };
    }

    // Exact match on canonical
    if (dim.canonical.toLowerCase() === normalizedToken) {
      return { slug: dim.slug, confidence: 0.98 };
    }

    // Exact match on alias
    if (dim.aliases.some((a) => a.toLowerCase() === normalizedToken)) {
      return { slug: dim.slug, confidence: 0.95 };
    }

    // Prefix match
    if (dim.slug.toLowerCase().startsWith(normalizedToken) && normalizedToken.length >= 3) {
      const similarity = normalizedToken.length / dim.slug.length;
      if (similarity >= threshold) {
        return { slug: dim.slug, confidence: similarity };
      }
    }
  }

  return null;
}
