/**
 * Knosia → LiquidConnect Type Transformations
 *
 * Transforms Knosia vocabulary items (from DB) to DetectedVocabulary (for LC compiler)
 */

import type {
  DetectedVocabulary,
  DetectedMetric,
  DetectedDimension,
  DetectedTimeField,
  DetectedFilter,
  AggregationType,
} from "@repo/liquid-connect/uvb";

import type { SelectKnosiaVocabularyItem } from "@turbostarter/db/schema";

// =============================================================================
// Internal Types
// =============================================================================

interface VocabDefinition {
  descriptionHuman?: string;
  formulaHuman?: string;
  formulaSql?: string;
  sourceTables?: string[];
  sourceColumn?: string;
  caveats?: string[];
  exampleValues?: { low?: string; typical?: string; high?: string };
}

// =============================================================================
// Main Transform Function
// =============================================================================

/**
 * Transform Knosia vocabulary items to DetectedVocabulary for LC compiler
 */
export function transformToDetectedVocabulary(
  items: SelectKnosiaVocabularyItem[]
): DetectedVocabulary {
  return {
    entities: [], // Not used by Query Engine (handled by SemanticLayer)
    metrics: items.filter((i) => i.type === "metric").map(toDetectedMetric),
    dimensions: items
      .filter((i) => i.type === "dimension")
      .map(toDetectedDimension),
    timeFields: items.filter((i) => i.isPrimaryTime).map(toDetectedTimeField),
    filters: items.filter((i) => i.type === "event").map(toDetectedFilter), // 'event' type used for filters
    relationships: [], // Handled by SemanticLayer in Resolver
  };
}

// =============================================================================
// Metric Transform
// =============================================================================

function toDetectedMetric(item: SelectKnosiaVocabularyItem): DetectedMetric {
  const def = item.definition as VocabDefinition | null;

  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? "",
    column: def?.sourceColumn ?? item.slug, // DB column (NOT formulaSql!)
    dataType: "decimal",
    aggregation: mapAggregation(item.aggregation),
    certainty: item.aggregationConfidence ?? 80,
    suggestedDisplayName: item.canonicalName,
    expression: def?.formulaSql, // ONLY for computed metrics
  };
}

// =============================================================================
// Dimension Transform
// =============================================================================

function toDetectedDimension(
  item: SelectKnosiaVocabularyItem
): DetectedDimension {
  const def = item.definition as VocabDefinition | null;

  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? "",
    column: def?.sourceColumn ?? item.slug,
    dataType: "varchar",
    cardinality: item.cardinality ?? undefined,
    certainty: item.aggregationConfidence ?? 80,
  };
}

// =============================================================================
// Time Field Transform
// =============================================================================

function toDetectedTimeField(
  item: SelectKnosiaVocabularyItem
): DetectedTimeField {
  const def = item.definition as VocabDefinition | null;

  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? "",
    column: def?.sourceColumn ?? item.slug,
    dataType: "timestamp",
    isPrimaryCandidate: item.isPrimaryTime ?? false,
    certainty: item.aggregationConfidence ?? 80,
  };
}

// =============================================================================
// Filter Transform
// =============================================================================

function toDetectedFilter(item: SelectKnosiaVocabularyItem): DetectedFilter {
  const def = item.definition as VocabDefinition | null;

  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? "",
    column: def?.sourceColumn ?? item.slug,
    dataType: "boolean",
    certainty: item.aggregationConfidence ?? 80,
    expression: def?.formulaSql,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map Knosia aggregation enum to UVB AggregationType
 */
function mapAggregation(agg: string | null): AggregationType {
  switch (agg) {
    case "SUM":
      return "SUM";
    case "AVG":
      return "AVG";
    case "COUNT":
      return "COUNT";
    case "MIN":
      return "MIN";
    case "MAX":
      return "MAX";
    default:
      return "SUM"; // Default to SUM for metrics
  }
}
