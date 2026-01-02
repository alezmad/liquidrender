/**
 * Template Mapper
 *
 * Maps BusinessTypeTemplate slots to actual schema columns from DetectedVocabulary.
 * Produces MappingResult with fully resolved SQL formulas for executable KPIs.
 */

import type {
  BusinessTypeTemplate,
  KPIDefinition,
  MappedKPI,
  MappingResult,
  SlotMapping,
} from "./types";
import type { DetectedMetric, DetectedVocabulary } from "../uvb/models";

// =============================================================================
// Pattern Matching
// =============================================================================

interface MatchCandidate {
  metric: DetectedMetric;
  confidence: number;
}

/**
 * Find best metric match for a slot mapping
 */
function findBestMatch(
  slot: SlotMapping,
  metrics: DetectedMetric[],
): MatchCandidate | null {
  const candidates: MatchCandidate[] = [];

  for (const metric of metrics) {
    let confidence = 0;

    // Test against all patterns
    for (const pattern of slot.patterns) {
      const nameMatch = pattern.test(metric.name);
      const columnMatch = pattern.test(metric.column);

      if (nameMatch && columnMatch) {
        confidence = 90; // Both name and column match
        break;
      } else if (nameMatch) {
        confidence = Math.max(confidence, 80); // Name match only
      } else if (columnMatch) {
        confidence = Math.max(confidence, 70); // Column match only
      }
    }

    // Boost confidence for exact aggregation match
    if (confidence > 0 && slot.hint.toLowerCase().includes("sum") && metric.aggregation === "SUM") {
      confidence = Math.min(100, confidence + 10);
    } else if (confidence > 0 && slot.hint.toLowerCase().includes("count") && metric.aggregation === "COUNT") {
      confidence = Math.min(100, confidence + 10);
    } else if (confidence > 0 && slot.hint.toLowerCase().includes("avg") && metric.aggregation === "AVG") {
      confidence = Math.min(100, confidence + 10);
    }

    if (confidence > 0) {
      candidates.push({ metric, confidence });
    }
  }

  if (candidates.length === 0) return null;

  // Return highest confidence match
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0];
}

/**
 * Validate that metric aggregation is compatible with KPI
 */
function isAggregationCompatible(
  metric: DetectedMetric,
  kpi: KPIDefinition,
): boolean {
  if (!kpi.aggregation) return true; // No specific requirement

  // Exact match is always compatible
  if (metric.aggregation === kpi.aggregation) return true;

  // COUNT can substitute for COUNT_DISTINCT in many cases
  if (kpi.aggregation === "COUNT_DISTINCT" && metric.aggregation === "COUNT") {
    return true;
  }

  // SUM and AVG are sometimes interchangeable for rates
  if (
    (kpi.aggregation === "SUM" && metric.aggregation === "AVG") ||
    (kpi.aggregation === "AVG" && metric.aggregation === "SUM")
  ) {
    return true;
  }

  return false;
}

// =============================================================================
// KPI Mapping
// =============================================================================

/**
 * Map a single KPI to detected metrics
 */
function mapKPI(
  kpi: KPIDefinition,
  vocabulary: DetectedVocabulary,
): MappedKPI {
  const mappedSlots: SlotMapping[] = [];
  let mappedCount = 0;

  // Try to map each required slot
  for (const slot of kpi.formula.requiredMappings) {
    const match = findBestMatch(slot, vocabulary.metrics);

    const mappedSlot: SlotMapping = { ...slot };

    if (match && isAggregationCompatible(match.metric, kpi)) {
      mappedSlot.mappedTo = `${match.metric.table}.${match.metric.column}`;
      mappedSlot.confidence = match.confidence;
      mappedCount++;
    }

    mappedSlots.push(mappedSlot);
  }

  // Determine status
  const totalSlots = kpi.formula.requiredMappings.length;
  let status: "complete" | "partial" | "unmapped";

  if (mappedCount === totalSlots) {
    status = "complete";
  } else if (mappedCount > 0) {
    status = "partial";
  } else {
    status = "unmapped";
  }

  // Generate formula if complete
  let generatedFormula: string | null = null;
  let canExecute = false;

  if (status === "complete") {
    generatedFormula = kpi.formula.template;

    for (const slot of mappedSlots) {
      if (slot.mappedTo) {
        const placeholder = `{${slot.slot}}`;
        generatedFormula = generatedFormula.replace(placeholder, slot.mappedTo);
      }
    }

    // Check if formula still has unresolved placeholders
    canExecute = !generatedFormula.includes("{");
  }

  return {
    kpi,
    mappings: mappedSlots,
    status,
    generatedFormula,
    canExecute,
  };
}

// =============================================================================
// Main Mapper
// =============================================================================

/**
 * Map template to detected vocabulary
 *
 * @param vocabulary - Detected vocabulary from UVB
 * @param template - Business type template to map
 * @returns Mapping result with all KPIs mapped
 */
export function mapToTemplate(
  vocabulary: DetectedVocabulary,
  template: BusinessTypeTemplate,
): MappingResult {
  const allKPIs = [...template.kpis.primary, ...template.kpis.secondary];
  const mappedKPIs: MappedKPI[] = [];
  const unmappedKPIs: KPIDefinition[] = [];

  for (const kpi of allKPIs) {
    const mapped = mapKPI(kpi, vocabulary);

    if (mapped.status === "unmapped") {
      unmappedKPIs.push(kpi);
    } else {
      mappedKPIs.push(mapped);
    }
  }

  // Calculate coverage (complete KPIs / total KPIs * 100)
  const completeKPIs = mappedKPIs.filter((k) => k.status === "complete");
  const coverage =
    allKPIs.length > 0 ? Math.round((completeKPIs.length / allKPIs.length) * 100) : 0;

  return {
    businessType: template.id,
    template,
    mappedKPIs,
    unmappedKPIs,
    coverage,
  };
}
