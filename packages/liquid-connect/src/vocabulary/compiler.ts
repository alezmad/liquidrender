/**
 * Vocabulary Compiler
 *
 * Transforms DetectedVocabulary from UVB into CompiledVocabulary for the Query Engine.
 * This is the bridge between schema detection and natural language processing.
 */

import type { DetectedVocabulary, DetectedMetric, DetectedDimension, DetectedTimeField, DetectedFilter } from '../uvb/models';
import type {
  CompiledVocabulary,
  MetricSlotEntry,
  DimensionSlotEntry,
  SlotEntry,
  Pattern,
  SynonymRegistry,
  VocabularyCompilerOptions,
} from './types';
import { DEFAULT_PATTERNS, TIME_SLOTS } from './patterns';
import { GLOBAL_SYNONYMS, createSynonymRegistry } from './synonyms';

// =============================================================================
// Constants
// =============================================================================

/** Default cardinality threshold for safe GROUP BY dimensions */
const SAFE_CARDINALITY_THRESHOLD = 100;

/** Vocabulary schema version */
const VOCABULARY_VERSION = '1.0.0';

// =============================================================================
// Compiler Entry Point
// =============================================================================

/**
 * Compile DetectedVocabulary into CompiledVocabulary for query engine use.
 *
 * @param detected - DetectedVocabulary from UVB
 * @param options - Compilation options
 * @returns CompiledVocabulary ready for pattern matching
 *
 * @example
 * ```typescript
 * const compiled = compileVocabulary(detected, {
 *   includeDefaultPatterns: true,
 *   userAliases: { 'rev': 'revenue' }
 * });
 * ```
 */
export function compileVocabulary(
  detected: DetectedVocabulary,
  options: VocabularyCompilerOptions = {}
): CompiledVocabulary {
  const {
    includeDefaultPatterns = true,
    includeGlobalSynonyms = true,
    userAliases = {},
    customPatterns = [],
  } = options;

  // Compile slot entries from detected vocabulary
  const metricSlots = compileMetrics(detected.metrics);
  const dimensionSlots = compileDimensions(detected.dimensions);
  const filterSlots = compileFilters(detected.filters);
  const timeSlots = compileTimeFields(detected.timeFields);

  // Build synonym registry from vocabulary aliases
  const orgSynonyms = buildOrgSynonyms(detected);
  const synonyms = createSynonymRegistry(
    includeGlobalSynonyms ? { ...GLOBAL_SYNONYMS, ...orgSynonyms } : orgSynonyms,
    userAliases
  );
  // Correct the structure - global synonyms should be in global, not org
  if (includeGlobalSynonyms) {
    synonyms.global = GLOBAL_SYNONYMS;
    synonyms.org = orgSynonyms;
  }

  // Build patterns
  const patterns: Pattern[] = [];
  if (includeDefaultPatterns) {
    patterns.push(...DEFAULT_PATTERNS);
  }
  patterns.push(...generatePatternsFromVocabulary(detected));
  patterns.push(...customPatterns);

  // Sort patterns by priority (highest first)
  patterns.sort((a, b) => b.priority - a.priority);

  // Build quick lookup maps
  const metricAggregations = buildMetricAggregations(metricSlots);
  const dimensionCardinalities = buildDimensionCardinalities(dimensionSlots);
  const safeDimensions = buildSafeDimensions(dimensionSlots);

  return {
    version: VOCABULARY_VERSION,
    compiledAt: new Date(),
    patterns,
    slots: {
      m: metricSlots,
      d: dimensionSlots,
      f: filterSlots,
      t: timeSlots,
    },
    synonyms,
    metricAggregations,
    dimensionCardinalities,
    safeDimensions,
  };
}

// =============================================================================
// Metric Compilation
// =============================================================================

/**
 * Compile DetectedMetric[] into MetricSlotEntry[]
 */
function compileMetrics(metrics: DetectedMetric[]): MetricSlotEntry[] {
  return metrics.map((metric) => ({
    slug: metric.id,
    canonical: metric.suggestedDisplayName || formatDisplayName(metric.name),
    abbreviation: extractAbbreviation(metric.name),
    aliases: generateMetricAliases(metric),
    source: `${metric.table}.${metric.column}`,
    aggregation: metric.aggregation,
    confidence: metric.certainty,
  }));
}

/**
 * Generate aliases for a metric from its name and column
 */
function generateMetricAliases(metric: DetectedMetric): string[] {
  const aliases: string[] = [];
  const name = metric.name.toLowerCase();
  const column = metric.column.toLowerCase();

  // Add snake_case and variations
  if (name !== column) {
    aliases.push(column);
  }

  // Add space-separated version
  const spacedName = name.replace(/_/g, ' ');
  if (spacedName !== name) {
    aliases.push(spacedName);
  }

  // Add common abbreviations
  const abbr = extractAbbreviation(metric.name);
  if (abbr && abbr.length >= 2) {
    aliases.push(abbr.toLowerCase());
  }

  // Add singular/plural variants
  if (name.endsWith('s') && name.length > 3) {
    aliases.push(name.slice(0, -1)); // Remove trailing 's'
  } else if (!name.endsWith('s')) {
    aliases.push(name + 's'); // Add 's' for plural
  }

  return [...new Set(aliases)]; // Deduplicate
}

// =============================================================================
// Dimension Compilation
// =============================================================================

/**
 * Compile DetectedDimension[] into DimensionSlotEntry[]
 */
function compileDimensions(dimensions: DetectedDimension[]): DimensionSlotEntry[] {
  return dimensions.map((dim) => ({
    slug: dim.id,
    canonical: formatDisplayName(dim.name),
    abbreviation: extractAbbreviation(dim.name),
    aliases: generateDimensionAliases(dim),
    source: `${dim.table}.${dim.column}`,
    cardinality: dim.cardinality,
    safeForGroupBy: (dim.cardinality ?? Infinity) < SAFE_CARDINALITY_THRESHOLD,
  }));
}

/**
 * Generate aliases for a dimension
 */
function generateDimensionAliases(dim: DetectedDimension): string[] {
  const aliases: string[] = [];
  const name = dim.name.toLowerCase();
  const column = dim.column.toLowerCase();

  // Add column name if different from display name
  if (name !== column) {
    aliases.push(column);
  }

  // Add space-separated version
  const spacedName = name.replace(/_/g, ' ');
  if (spacedName !== name) {
    aliases.push(spacedName);
  }

  // Add abbreviation
  const abbr = extractAbbreviation(dim.name);
  if (abbr && abbr.length >= 2) {
    aliases.push(abbr.toLowerCase());
  }

  return [...new Set(aliases)];
}

// =============================================================================
// Filter Compilation
// =============================================================================

/**
 * Compile DetectedFilter[] into SlotEntry[]
 */
function compileFilters(filters: DetectedFilter[]): SlotEntry[] {
  return filters.map((filter) => ({
    slug: filter.id,
    canonical: formatDisplayName(filter.name),
    abbreviation: extractAbbreviation(filter.name),
    aliases: generateFilterAliases(filter),
    source: `${filter.table}.${filter.column}`,
  }));
}

/**
 * Generate aliases for a filter
 */
function generateFilterAliases(filter: DetectedFilter): string[] {
  const aliases: string[] = [];
  const name = filter.name.toLowerCase();

  // Handle is_ prefix (is_active → active)
  if (name.startsWith('is_')) {
    aliases.push(name.slice(3));
  }

  // Handle has_ prefix (has_premium → premium)
  if (name.startsWith('has_')) {
    aliases.push(name.slice(4));
  }

  // Space-separated version
  const spacedName = name.replace(/_/g, ' ');
  if (spacedName !== name) {
    aliases.push(spacedName);
  }

  return [...new Set(aliases)];
}

// =============================================================================
// Time Field Compilation
// =============================================================================

/**
 * Compile DetectedTimeField[] into SlotEntry[] + static time slots
 */
function compileTimeFields(timeFields: DetectedTimeField[]): SlotEntry[] {
  const slots: SlotEntry[] = [];

  // Add static time slots from patterns
  for (const [expression, token] of Object.entries(TIME_SLOTS)) {
    slots.push({
      slug: token,
      canonical: expression,
      aliases: [expression],
    });
  }

  // Add dynamic time fields from vocabulary
  for (const field of timeFields) {
    // Skip if this field's canonical name would conflict with static slots
    const canonical = formatDisplayName(field.name);
    const exists = slots.some(
      (s) => s.canonical.toLowerCase() === canonical.toLowerCase()
    );

    if (!exists) {
      slots.push({
        slug: field.id,
        canonical,
        aliases: generateTimeAliases(field),
        source: `${field.table}.${field.column}`,
      });
    }
  }

  return slots;
}

/**
 * Generate aliases for a time field
 */
function generateTimeAliases(field: DetectedTimeField): string[] {
  const aliases: string[] = [];
  const name = field.name.toLowerCase();
  const column = field.column.toLowerCase();

  // Add column name if different
  if (name !== column) {
    aliases.push(column);
  }

  // Space-separated version
  const spacedName = name.replace(/_/g, ' ');
  if (spacedName !== name) {
    aliases.push(spacedName);
  }

  // Common time field variations
  if (name.includes('date') || name.includes('time')) {
    aliases.push(name.replace(/_/g, ' '));
  }

  return [...new Set(aliases)];
}

// =============================================================================
// Synonym Building
// =============================================================================

/**
 * Build org-level synonyms from detected vocabulary aliases
 */
function buildOrgSynonyms(detected: DetectedVocabulary): Record<string, string> {
  const synonyms: Record<string, string> = {};

  // Add metric aliases
  for (const metric of detected.metrics) {
    const slug = metric.id;

    // Map suggested display name to slug
    if (metric.suggestedDisplayName) {
      const normalized = metric.suggestedDisplayName.toLowerCase();
      if (normalized !== slug) {
        synonyms[normalized] = slug;
      }
    }

    // Map column name to slug
    const column = metric.column.toLowerCase();
    if (column !== slug) {
      synonyms[column] = slug;
    }
  }

  // Add dimension aliases
  for (const dim of detected.dimensions) {
    const slug = dim.id;
    const column = dim.column.toLowerCase();
    if (column !== slug) {
      synonyms[column] = slug;
    }
  }

  // Add filter aliases
  for (const filter of detected.filters) {
    const slug = filter.id;
    const name = filter.name.toLowerCase();

    // Handle is_/has_ prefix mappings
    if (name.startsWith('is_')) {
      synonyms[name.slice(3)] = slug;
    }
    if (name.startsWith('has_')) {
      synonyms[name.slice(4)] = slug;
    }
  }

  return synonyms;
}

// =============================================================================
// Pattern Generation
// =============================================================================

/**
 * Generate vocabulary-specific patterns from detected items.
 * These complement the default patterns with organization-specific queries.
 */
export function generatePatternsFromVocabulary(
  detected: DetectedVocabulary
): Pattern[] {
  const patterns: Pattern[] = [];

  // Generate patterns for high-confidence metrics
  const primaryMetrics = detected.metrics
    .filter((m) => m.certainty >= 80)
    .slice(0, 5); // Top 5 primary metrics

  for (const metric of primaryMetrics) {
    const metricName = metric.name.toLowerCase().replace(/_/g, ' ');

    // "show [metric_name]" → Q @[metric_id]
    patterns.push({
      id: `vocab-${metric.id}-simple`,
      template: metricName,
      output: `Q @${metric.id}`,
      priority: 15, // Slightly higher than generic metric-only
      requiredSlots: ['m'],
      examples: [metricName],
    });
  }

  // Generate patterns for primary time fields
  const primaryTimeField = detected.timeFields.find((t) => t.isPrimaryCandidate);
  if (primaryTimeField) {
    const timeFieldName = primaryTimeField.name.toLowerCase().replace(/_/g, ' ');

    // Add time field as default for ambiguous time references
    patterns.push({
      id: `vocab-primary-time`,
      template: `{m} over ${timeFieldName}`,
      output: `Q @{m} #{${primaryTimeField.id}} trend`,
      priority: 26,
      requiredSlots: ['m'],
      examples: [`revenue over ${timeFieldName}`],
    });
  }

  return patterns;
}

// =============================================================================
// Quick Lookup Builders
// =============================================================================

/**
 * Build metric slug → aggregation lookup
 */
function buildMetricAggregations(
  metrics: MetricSlotEntry[]
): Record<string, import('../uvb/models').AggregationType> {
  const lookup: Record<string, import('../uvb/models').AggregationType> = {};
  for (const metric of metrics) {
    lookup[metric.slug] = metric.aggregation;
  }
  return lookup;
}

/**
 * Build dimension slug → cardinality lookup
 */
function buildDimensionCardinalities(
  dimensions: DimensionSlotEntry[]
): Record<string, number> {
  const lookup: Record<string, number> = {};
  for (const dim of dimensions) {
    if (dim.cardinality !== undefined) {
      lookup[dim.slug] = dim.cardinality;
    }
  }
  return lookup;
}

/**
 * Build list of safe-for-GROUP-BY dimension slugs
 */
function buildSafeDimensions(dimensions: DimensionSlotEntry[]): string[] {
  return dimensions.filter((d) => d.safeForGroupBy).map((d) => d.slug);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a snake_case name as Title Case display name
 */
function formatDisplayName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Extract abbreviation from a name (e.g., "monthly_recurring_revenue" → "MRR")
 */
function extractAbbreviation(name: string): string | undefined {
  const words = name.split(/[_\s]+/);
  if (words.length < 2) {
    return undefined;
  }

  const abbr = words.map((w) => w.charAt(0).toUpperCase()).join('');
  return abbr.length >= 2 && abbr.length <= 5 ? abbr : undefined;
}
