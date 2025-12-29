/**
 * Query Engine Module
 *
 * Converts natural language to LC DSL.
 */

// Types
export type {
  QueryContext,
  RoleContext,
  QueryOptions,
  NormalizeResult,
  Substitution,
  MatchResult,
  VocabularyResolution,
  QueryTrace,
  FallbackResult,
  QueryResult,
  QueryErrorCode,
} from './types';

// Normalizer (Wave 2)
export {
  normalize,
  tokenize,
  applySynonyms,
} from './normalizer';

// Matcher (Wave 2)
export {
  match,
  matchPattern,
  fillSlots,
  buildOutput,
} from './matcher';

// Engine (Wave 3)
export { query, createQueryEngine, QueryEngine } from './engine';
