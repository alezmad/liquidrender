/**
 * LiquidSchema Generator
 *
 * Transforms DashboardSpec into LiquidSchema for rendering.
 *
 * Wave 2, Phase 2.3
 */

import type { LiquidSchema, Block, Layer } from "../compiler/ui-emitter";

// ============================================================================
// Mirrored Types
// ============================================================================
// Mirrored from packages/liquid-connect/src/dashboard/types.ts
// to avoid circular dependency (liquid-render cannot import from liquid-connect)

export interface DashboardSpec {
  businessType: string;
  title: string;
  generatedAt: string;
  sections: DashboardSection[];
  coverage: number;
  warnings: string[];
}

export interface DashboardSection {
  id: string;
  name: string;
  kpis: DashboardKPI[];
  chart?: DashboardChart;
}

export interface DashboardKPI {
  id: string;
  name: string;
  slug: string;
  format: string;
  query: string;
  suggestedForRoles?: string[];
  isFavorite?: boolean;
}

export interface DashboardChart {
  type: "line" | "bar" | "area" | "pie";
  title: string;
  binding: string;
  xAxis: string;
  yAxis: string;
  query: string;
}

// ============================================================================
// Options
// ============================================================================

export interface SchemaGeneratorOptions {
  /**
   * Maximum KPIs per row in grid layout
   * Default: 4
   */
  maxKPIsPerRow?: number;

  /**
   * Include section heading blocks
   * Default: true
   */
  includeSectionHeaders?: boolean;

  /**
   * Grid gap size
   * Default: 'md'
   */
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Convert DashboardSpec to LiquidSchema for rendering
 *
 * @param spec - Dashboard specification from business type mapping
 * @param options - Schema generation options
 * @returns LiquidSchema ready for LiquidRender
 */
export function dashboardSpecToLiquidSchema(
  spec: DashboardSpec,
  options: SchemaGeneratorOptions = {},
): LiquidSchema {
  const { maxKPIsPerRow = 4, includeSectionHeaders = true, gap = "md" } = options;

  const rootChildren: Block[] = [];

  // Process each section
  for (const section of spec.sections) {
    // Add section heading (optional)
    if (includeSectionHeaders) {
      rootChildren.push({
        uid: `${section.id}_heading`,
        type: "heading",
        binding: {
          kind: "literal",
          value: section.name,
        },
        label: section.name,
      });
    }

    // Create grid for KPIs
    if (section.kpis.length > 0) {
      const columns = Math.min(section.kpis.length, maxKPIsPerRow);

      const kpiBlocks: Block[] = section.kpis.map((kpi: DashboardKPI) => ({
        uid: `${section.id}_kpi_${sanitizeForUID(kpi.slug)}`,
        type: "kpi",
        binding: {
          kind: "field",
          value: kpi.slug,
        },
        label: kpi.name,
      }));

      rootChildren.push({
        uid: `${section.id}_kpis`,
        type: "grid",
        layout: {
          columns,
          gap,
        },
        children: kpiBlocks,
      });
    }

    // Add chart if section defines one
    if (section.chart) {
      rootChildren.push({
        uid: `${section.id}_chart`,
        type: section.chart.type,
        binding: {
          kind: "field",
          value: section.chart.binding,
          x: section.chart.xAxis,
          y: section.chart.yAxis,
        },
        label: section.chart.title,
      });
    }
  }

  // Create single layer with root container
  const layer: Layer = {
    id: 0,
    visible: true,
    root: {
      uid: "root",
      type: "container",
      children: rootChildren,
    },
  };

  return {
    version: "1.0",
    signals: [],
    layers: [layer],
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Sanitize string for use in UID (replace non-alphanumeric with underscore)
 */
function sanitizeForUID(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}
