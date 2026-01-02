/**
 * Dashboard Spec Generator
 *
 * Transforms MappingResult (business type + mapped KPIs) into DashboardSpec
 * for rendering.
 *
 * Wave 2, Phase 2.2
 */

import type { MappingResult, MappedKPI, KPIDefinition } from "../business-types/types";
import type { DashboardSpec, DashboardSection, DashboardKPI, DashboardChart } from "./types";

// ============================================================================
// Options
// ============================================================================

export interface GenerateDashboardSpecOptions {
  /**
   * Include KPIs with partial mapping (some slots unmapped)
   * Default: false (only complete KPIs)
   */
  includePartialKPIs?: boolean;

  /**
   * Maximum KPIs per section (prevents overcrowded sections)
   * Default: 8
   */
  maxKPIsPerSection?: number;

  /**
   * Title for the dashboard
   * Default: "{BusinessType} Dashboard"
   */
  title?: string;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate dashboard specification from mapping result
 *
 * @param mapping - Business type mapping with resolved KPIs
 * @param options - Generation options
 * @returns Complete dashboard specification ready for rendering
 */
export function generateDashboardSpec(
  mapping: MappingResult,
  options: GenerateDashboardSpecOptions = {},
): DashboardSpec {
  const {
    includePartialKPIs = false,
    maxKPIsPerSection = 8,
    title,
  } = options;

  const warnings: string[] = [];
  const sections: DashboardSection[] = [];

  // Get executable KPIs (complete, or partial if includePartialKPIs)
  const executableKPIs = mapping.mappedKPIs.filter((mappedKPI) => {
    if (mappedKPI.canExecute && mappedKPI.status === "complete") {
      return true;
    }
    if (includePartialKPIs && mappedKPI.status === "partial") {
      return true;
    }
    return false;
  });

  // Build lookup map for quick access
  const kpiLookup = new Map<string, MappedKPI>();
  executableKPIs.forEach((mk) => {
    kpiLookup.set(mk.kpi.id, mk);
  });

  // Process each section from the template
  for (const templateSection of mapping.template.dashboard.sections) {
    const sectionKPIs: DashboardKPI[] = [];

    // Filter KPIs for this section (only include executable ones)
    for (const kpiId of templateSection.kpis) {
      const mappedKPI = kpiLookup.get(kpiId);

      if (!mappedKPI) {
        // KPI not mapped - add warning if it's a primary KPI
        const originalKPI = findKPI(mapping.template, kpiId);
        if (originalKPI && isInArray(mapping.template.kpis.primary, originalKPI)) {
          warnings.push(`Primary KPI "${originalKPI.name}" could not be mapped`);
        }
        continue;
      }

      // Check confidence (warn if low)
      const avgConfidence = calculateAverageConfidence(mappedKPI);
      if (avgConfidence < 60) {
        warnings.push(
          `Low confidence (${avgConfidence}%) mapping for "${mappedKPI.kpi.name}"`,
        );
      }

      // Add to section
      sectionKPIs.push({
        id: mappedKPI.kpi.id,
        name: mappedKPI.kpi.name,
        slug: mappedKPI.kpi.slug,
        format: mappedKPI.kpi.format,
        query: mappedKPI.kpi.slug, // Simple query: just the slug
        suggestedForRoles: mappedKPI.kpi.suggestedForRoles,
      });

      // Respect maxKPIsPerSection limit
      if (sectionKPIs.length >= maxKPIsPerSection) {
        break;
      }
    }

    // Skip empty sections
    if (sectionKPIs.length === 0) {
      warnings.push(`Section "${templateSection.name}" has no mappable KPIs`);
      continue;
    }

    // Generate chart if section defines one
    let chart: DashboardChart | undefined;
    if (templateSection.chart) {
      const chartKPI = kpiLookup.get(templateSection.chart.metric);

      if (chartKPI) {
        // Check if we have a time dimension (needed for time-series charts)
        const hasTimeDimension = checkForTimeDimension(mapping);

        if (!hasTimeDimension) {
          warnings.push(
            `Chart in "${templateSection.name}" requires time dimension but none found`,
          );
        } else {
          chart = {
            type: templateSection.chart.type,
            title: `${chartKPI.kpi.name} Over Time`,
            binding: chartKPI.kpi.slug,
            xAxis: getTimeDimensionName(templateSection.chart.timeGrain),
            yAxis: chartKPI.kpi.slug,
            query: `${chartKPI.kpi.slug} by ${getTimeDimensionName(templateSection.chart.timeGrain)}`,
          };
        }
      } else {
        warnings.push(
          `Chart metric "${templateSection.chart.metric}" not available in "${templateSection.name}"`,
        );
      }
    }

    // Add section
    sections.push({
      id: templateSection.id,
      name: templateSection.name,
      kpis: sectionKPIs,
      chart,
    });
  }

  // Calculate overall coverage
  const totalKPIs = mapping.template.kpis.primary.length + mapping.template.kpis.secondary.length;
  const mappedCount = executableKPIs.filter((mk) => mk.status === "complete").length;
  const coverage = totalKPIs > 0 ? Math.round((mappedCount / totalKPIs) * 100) : 0;

  // Add warning if coverage is low
  if (coverage < 50) {
    warnings.push(`Low coverage (${coverage}%) - consider manual vocabulary adjustments`);
  }

  return {
    businessType: mapping.businessType,
    title: title || `${capitalizeBusinessType(mapping.businessType)} Dashboard`,
    generatedAt: new Date().toISOString(),
    sections,
    coverage,
    warnings,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Find KPI definition by ID
 */
function findKPI(template: MappingResult["template"], kpiId: string): KPIDefinition | null {
  const allKPIs = [...template.kpis.primary, ...template.kpis.secondary];
  return allKPIs.find((k) => k.id === kpiId) || null;
}

/**
 * Check if KPI is in array (type-safe helper)
 */
function isInArray(arr: KPIDefinition[], kpi: KPIDefinition): boolean {
  return arr.some((k) => k.id === kpi.id);
}

/**
 * Calculate average confidence across all slot mappings
 */
function calculateAverageConfidence(mappedKPI: MappedKPI): number {
  const confidences = mappedKPI.mappings
    .map((m) => m.confidence)
    .filter((c): c is number => c !== undefined);

  if (confidences.length === 0) return 0;

  const sum = confidences.reduce((acc, c) => acc + c, 0);
  return Math.round(sum / confidences.length);
}

/**
 * Check if mapping has a time dimension available
 */
function checkForTimeDimension(mapping: MappingResult): boolean {
  // Look for dimensions with time-related names
  return mapping.mappedKPIs.some((mk) => {
    if (mk.kpi.type !== "dimension") return false;

    const slug = mk.kpi.slug.toLowerCase();
    return (
      slug.includes("date") ||
      slug.includes("time") ||
      slug.includes("month") ||
      slug.includes("year") ||
      slug.includes("quarter") ||
      slug.includes("week") ||
      slug.includes("day")
    );
  });
}

/**
 * Get standard time dimension name based on grain
 */
function getTimeDimensionName(grain: string): string {
  const grainMap: Record<string, string> = {
    day: "date",
    week: "week",
    month: "month",
    quarter: "quarter",
    year: "year",
  };

  return grainMap[grain] || "date";
}

/**
 * Capitalize business type for title
 */
function capitalizeBusinessType(type: string): string {
  if (type === "saas") return "SaaS";
  if (type === "ecommerce") return "E-commerce";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
