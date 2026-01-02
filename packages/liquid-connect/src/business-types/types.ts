/**
 * Business Type System
 *
 * Canonical enum and detection interfaces used across:
 * - Detection (wave-1)
 * - Templates (wave-1)
 * - Dashboard generation (wave-2)
 */

// V1: saas, ecommerce, custom
// V2+: marketplace, fintech, healthcare, edtech, media, logistics
export type BusinessType =
  | "saas"
  | "ecommerce"
  | "marketplace"
  | "fintech"
  | "healthcare"
  | "edtech"
  | "media"
  | "logistics"
  | "custom";

export interface BusinessTypeSignal {
  type: BusinessType;
  signal: string; // What we found (e.g., "subscriptions table")
  weight: number; // 0-100
  source: "table" | "column" | "pattern" | "relationship";
}

export interface BusinessTypeMatch {
  type: BusinessType;
  confidence: number; // 0-100, aggregated from signals
  signals: BusinessTypeSignal[];
  templateId: string;
}

export interface DetectionResult {
  matches: BusinessTypeMatch[]; // Sorted by confidence desc
  primary: BusinessTypeMatch | null; // Highest if > threshold
  ambiguous: boolean; // True if top 2 within 15% of each other
}

// Slot mapping for template → schema binding
export interface SlotMapping {
  slot: string; // e.g., "amount_column"
  hint: string; // e.g., "subscription amount/price column"
  patterns: RegExp[]; // e.g., [/amount/i, /price/i, /mrr/i]
  mappedTo?: string; // Actual column found (set by mapper)
  confidence?: number; // 0-100
}

// Template definition
export interface BusinessTypeTemplate {
  id: BusinessType;
  name: string;
  description: string;
  kpis: {
    primary: KPIDefinition[];
    secondary: KPIDefinition[];
  };
  entities: EntityExpectation[];
  dashboard: {
    layout: "executive" | "operational" | "detailed";
    sections: DashboardSection[];
  };
  questions: string[]; // Common questions for this business type
}

export interface KPIDefinition {
  id: string;
  name: string;
  slug: string;
  type: "metric" | "dimension";
  aggregation?: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";
  format: "currency" | "percentage" | "number" | "duration";
  direction: "higher_is_better" | "lower_is_better" | "target_range";
  formula: {
    template: string; // e.g., "SUM({amount_column}) WHERE status = 'active'"
    requiredMappings: SlotMapping[];
  };
  suggestedForRoles?: string[];
}

export interface EntityExpectation {
  name: string;
  required: boolean;
  patterns: RegExp[];
}

export interface DashboardSection {
  id: string;
  name: string;
  kpis: string[]; // KPI IDs from template
  chart?: {
    type: "line" | "bar" | "area" | "pie";
    metric: string; // KPI ID
    timeGrain: "day" | "week" | "month" | "quarter" | "year";
    periods: number;
  };
}

// Mapping result (detection → template application)
export interface MappingResult {
  businessType: BusinessType;
  template: BusinessTypeTemplate;
  mappedKPIs: MappedKPI[];
  unmappedKPIs: KPIDefinition[];
  coverage: number; // 0-100
}

export interface MappedKPI {
  kpi: KPIDefinition;
  mappings: SlotMapping[]; // With mappedTo filled in
  status: "complete" | "partial" | "unmapped";
  generatedFormula: string | null; // Fully resolved SQL
  canExecute: boolean;
}
