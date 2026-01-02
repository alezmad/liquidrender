/**
 * Generic/Custom Business Type Template
 *
 * Fallback template for unrecognized schemas or user-selected custom type.
 * Provides minimal KPIs and dashboard based on detected tables.
 */

import type {
  BusinessTypeTemplate,
  KPIDefinition,
  DashboardSection,
  EntityExpectation,
} from "../types";

// Primary KPIs (minimal)
const recordCountKPI: KPIDefinition = {
  id: "generic_record_count",
  name: "Total Records",
  slug: "record_count",
  type: "metric",
  aggregation: "COUNT",
  format: "number",
  direction: "higher_is_better",
  formula: {
    template: "COUNT(*) FROM {largest_table}",
    requiredMappings: [
      {
        slot: "largest_table",
        hint: "largest/primary table in schema",
        patterns: [/.*/], // Match any table
      },
    ],
  },
  suggestedForRoles: ["executive", "product"],
};

const growthRateKPI: KPIDefinition = {
  id: "generic_growth_rate",
  name: "Growth Rate",
  slug: "growth_rate",
  type: "metric",
  aggregation: "AVG",
  format: "percentage",
  direction: "higher_is_better",
  formula: {
    template:
      "(COUNT(*) FROM {largest_table} WHERE {time_column} >= {current_period_start} - COUNT(*) FROM {largest_table} WHERE {time_column} < {current_period_start}) / COUNT(*) FROM {largest_table} WHERE {time_column} < {current_period_start} * 100",
    requiredMappings: [
      {
        slot: "largest_table",
        hint: "largest/primary table in schema",
        patterns: [/.*/],
      },
      {
        slot: "time_column",
        hint: "timestamp/date column for growth calculation",
        patterns: [
          /created_at/i,
          /\bdate\b/i,
          /\btime\b/i,
          /updated_at/i,
          /timestamp/i,
        ],
      },
      {
        slot: "current_period_start",
        hint: "start of current period (auto-calculated)",
        patterns: [/.*/],
      },
    ],
  },
  suggestedForRoles: ["executive", "product"],
};

// Entity expectations (none required for generic)
const entities: EntityExpectation[] = [];

// Dashboard sections (minimal)
const overviewSection: DashboardSection = {
  id: "generic_overview",
  name: "Overview",
  kpis: ["generic_record_count", "generic_growth_rate"],
  chart: {
    type: "line",
    metric: "generic_record_count",
    timeGrain: "day",
    periods: 30,
  },
};

// Template definition
export const genericTemplate: BusinessTypeTemplate = {
  id: "custom",
  name: "Custom/Generic",
  description:
    "Fallback template for custom or unrecognized business types. Provides basic metrics based on detected schema.",
  kpis: {
    primary: [recordCountKPI, growthRateKPI],
    secondary: [],
  },
  entities,
  dashboard: {
    layout: "executive",
    sections: [overviewSection],
  },
  questions: [
    "How many total records do we have?",
    "What's our growth rate?",
    "Show me trends over time",
  ],
};
