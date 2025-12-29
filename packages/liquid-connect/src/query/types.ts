/**
 * Query Engine Types
 *
 * Types for natural language to LC DSL conversion.
 */

import type { CompiledVocabulary, Pattern } from '../vocabulary/types';

// =============================================================================
// Query Context - Runtime context for query resolution
// =============================================================================

export interface QueryContext {
  /** Compiled vocabulary with patterns and slots */
  vocabulary: CompiledVocabulary;

  /** User-specific aliases (highest priority) */
  userAliases?: Record<string, string>;

  /** Role context for disambiguation */
  roleContext?: RoleContext;

  /** Options for query processing */
  options?: QueryOptions;
}

// =============================================================================
// Role Context - For ambiguous query resolution
// =============================================================================

export interface RoleContext {
  /** Role identifier */
  roleId: string;

  /** Primary KPIs for "how are we doing" queries */
  primaryKpis: string[];

  /** Default time range (e.g., "~MTD") */
  defaultTimeRange: string;

  /** Default comparison period (e.g., "~compare(M-1)") */
  comparisonDefault: string;

  /** Detail level preference */
  detailLevel: 'summary' | 'detailed';
}

// =============================================================================
// Query Options
// =============================================================================

export interface QueryOptions {
  /** Enable fuzzy matching for typos */
  fuzzyMatching?: boolean;

  /** Fuzzy match threshold (0-1, default 0.8) */
  fuzzyThreshold?: number;

  /** Include trace in result */
  includeTrace?: boolean;

  /** Strict mode - fail if no exact match */
  strictMode?: boolean;
}

// =============================================================================
// Normalization Result
// =============================================================================

export interface NormalizeResult {
  /** Original input */
  original: string;

  /** Normalized text (lowercase, cleaned) */
  normalized: string;

  /** Tokenized words */
  tokens: string[];

  /** Synonym substitutions made */
  substitutions: Substitution[];
}

export interface Substitution {
  /** Original text */
  from: string;

  /** Replacement text */
  to: string;

  /** Source of substitution */
  source: 'user' | 'org' | 'global';
}

// =============================================================================
// Match Result
// =============================================================================

export interface MatchResult {
  /** Whether a pattern matched */
  matched: boolean;

  /** Pattern that matched */
  pattern?: Pattern;

  /** Slot values extracted */
  slots?: Record<string, string>;

  /** Generated LC DSL output */
  lcOutput?: string;

  /** Match confidence (0-1) */
  confidence: number;

  /** How the match was made */
  matchType?: 'exact' | 'fuzzy' | 'partial';
}

// =============================================================================
// Vocabulary Resolution - How each term was resolved
// =============================================================================

export interface VocabularyResolution {
  /** Original term from input */
  term: string;

  /** Resolved LC reference */
  resolved: string;

  /** How it was resolved */
  via: 'user_alias' | 'org_alias' | 'canonical' | 'abbreviation' | 'global_synonym' | 'fuzzy';

  /** Confidence of resolution */
  confidence: number;
}

// =============================================================================
// Query Trace - Full audit trail
// =============================================================================

export interface QueryTrace {
  /** Original input */
  input: string;

  /** Normalization result */
  normalized: NormalizeResult;

  /** Pattern match attempt */
  matchAttempt: MatchResult;

  /** Whether LLM fallback was used */
  fallbackUsed: boolean;

  /** LLM fallback result (if used) */
  fallbackResult?: FallbackResult;

  /** Vocabulary resolutions */
  resolutions: VocabularyResolution[];

  /** Timing breakdown */
  timingMs: {
    normalize: number;
    match: number;
    fallback?: number;
    total: number;
  };
}

// =============================================================================
// Fallback Result (for future LLM integration)
// =============================================================================

export interface FallbackResult {
  /** Generated LC output */
  lcOutput: string;

  /** Confidence (typically 0.7-0.9) */
  confidence: number;

  /** LLM reasoning (optional) */
  reasoning?: string;
}

// =============================================================================
// Query Result - Final output
// =============================================================================

export interface QueryResult {
  /** Whether query succeeded */
  success: boolean;

  /** Generated LC DSL */
  lcOutput?: string;

  /** Overall confidence */
  confidence: number;

  /** How each term was resolved */
  matchedVocabulary?: VocabularyResolution[];

  /** Full trace (if requested) */
  trace?: QueryTrace;

  /** Error message (if failed) */
  error?: string;

  /** Error code (if failed) */
  errorCode?: QueryErrorCode;
}

export type QueryErrorCode =
  | 'NO_MATCH'
  | 'UNKNOWN_METRIC'
  | 'UNKNOWN_DIMENSION'
  | 'UNKNOWN_FILTER'
  | 'INVALID_TIME'
  | 'AMBIGUOUS_QUERY'
  | 'EMPTY_INPUT';
