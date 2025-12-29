/**
 * Vocabulary Types
 *
 * Types for compiled vocabulary used by the Query Engine.
 * Input: DetectedVocabulary from UVB
 * Output: CompiledVocabulary for pattern matching
 */

import type { AggregationType } from '../uvb/models';

// =============================================================================
// Slot Entry - Individual vocabulary item for matching
// =============================================================================

export interface SlotEntry {
  /** Unique identifier (e.g., "mrr", "region") */
  slug: string;

  /** Display name (e.g., "Monthly Recurring Revenue") */
  canonical: string;

  /** Short form (e.g., "MRR") */
  abbreviation?: string;

  /** Alternative names (e.g., ["monthly revenue", "recurring rev"]) */
  aliases: string[];

  /** Source table.column */
  source?: string;
}

// =============================================================================
// Metric Slot - Extended with aggregation metadata
// =============================================================================

export interface MetricSlotEntry extends SlotEntry {
  /** Default aggregation from Hard Rule 3 */
  aggregation: AggregationType;

  /** Confidence from detection (0-100) */
  confidence: number;
}

// =============================================================================
// Dimension Slot - Extended with cardinality metadata
// =============================================================================

export interface DimensionSlotEntry extends SlotEntry {
  /** Cardinality from Hard Rule 7 */
  cardinality?: number;

  /** Safe for GROUP BY (cardinality < 100) */
  safeForGroupBy: boolean;
}

// =============================================================================
// Pattern - Template for matching natural language
// =============================================================================

export interface Pattern {
  /** Unique identifier */
  id: string;

  /** Natural language template with slots: "{m} by {d} {t}" */
  template: string;

  /** LC DSL output template: "Q @{m} #{d} ~{t}" */
  output: string;

  /** Priority for matching (higher = try first) */
  priority: number;

  /** Example queries that match this pattern */
  examples?: string[];

  /** Slot types required by this pattern */
  requiredSlots: SlotType[];
}

export type SlotType = 'm' | 'd' | 'f' | 't' | 'n' | 'd2' | 't2';

// =============================================================================
// Synonym Registry - 3-level resolution
// =============================================================================

export interface SynonymRegistry {
  /** Built-in synonyms (lowest priority) */
  global: Record<string, string>;

  /** Organization-level from vocabulary aliases */
  org: Record<string, string>;

  /** User-level personal aliases (highest priority) */
  user: Record<string, string>;
}

// =============================================================================
// Compiled Vocabulary - Output of vocabulary compiler
// =============================================================================

export interface CompiledVocabulary {
  /** Schema version */
  version: string;

  /** Source vocabulary ID */
  vocabularyId?: string;

  /** Compilation timestamp */
  compiledAt: Date;

  /** Pattern templates for matching */
  patterns: Pattern[];

  /** Slot fillers by type */
  slots: {
    /** Metrics: revenue, orders, aov */
    m: MetricSlotEntry[];

    /** Dimensions: region, category */
    d: DimensionSlotEntry[];

    /** Filters: active, enterprise */
    f: SlotEntry[];

    /** Time periods: built-in + custom */
    t: SlotEntry[];
  };

  /** 3-level synonym registry */
  synonyms: SynonymRegistry;

  /** Quick lookup: slug → aggregation */
  metricAggregations: Record<string, AggregationType>;

  /** Quick lookup: slug → cardinality */
  dimensionCardinalities: Record<string, number>;

  /** Dimensions safe for GROUP BY */
  safeDimensions: string[];
}

// =============================================================================
// Compiler Options
// =============================================================================

export interface VocabularyCompilerOptions {
  /** Include default patterns */
  includeDefaultPatterns?: boolean;

  /** Include global synonyms */
  includeGlobalSynonyms?: boolean;

  /** User aliases to merge */
  userAliases?: Record<string, string>;

  /** Custom patterns to add */
  customPatterns?: Pattern[];
}
