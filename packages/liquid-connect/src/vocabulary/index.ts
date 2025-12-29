/**
 * Vocabulary Module
 *
 * Compiles DetectedVocabulary into patterns for the Query Engine.
 */

// Types
export type {
  SlotEntry,
  MetricSlotEntry,
  DimensionSlotEntry,
  Pattern,
  SlotType,
  SynonymRegistry,
  CompiledVocabulary,
  VocabularyCompilerOptions,
} from './types';

// Patterns (Wave 1)
export {
  DEFAULT_PATTERNS,
  TIME_SLOTS,
  createPattern,
} from './patterns';

// Synonyms (Wave 1)
export {
  GLOBAL_SYNONYMS,
  ACTION_WORDS,
  createSynonymRegistry,
  resolveSynonym,
} from './synonyms';

// Compiler (Wave 3)
export { compileVocabulary, generatePatternsFromVocabulary } from './compiler';
