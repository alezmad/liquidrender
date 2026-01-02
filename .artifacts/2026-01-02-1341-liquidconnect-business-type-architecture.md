# LiquidConnect Business Type Architecture

**Date:** 2026-01-02
**Status:** Technical Architecture
**Integrates with:** `packages/liquid-connect`

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LIQUID-CONNECT TODAY                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   DATABASE                                                          │
│      │                                                              │
│      ▼                                                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  UVB: Schema Extractor                                       │   │
│   │  extractSchema(adapter) → ExtractedSchema                   │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  UVB: Hard Rules Engine                                      │   │
│   │  applyHardRules(schema) → DetectedVocabulary + Confirmations │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  User Confirmations (via API)                                │   │
│   │  Answer questions → Refined vocabulary                       │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Semantic Layer                                              │   │
│   │  Vocabulary → SemanticLayer definition                       │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Query Engine                                                │   │
│   │  NL Query → LiquidFlow IR → SQL                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Gap:** No business type detection. No KPI templates. No dashboard generation.

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LIQUID-CONNECT ENHANCED                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   DATABASE                                                          │
│      │                                                              │
│      ▼                                                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  UVB: Schema Extractor (existing)                            │   │
│   │  extractSchema(adapter) → ExtractedSchema                   │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                   ┌────────────┴────────────┐                       │
│                   │                         │                       │
│                   ▼                         ▼                       │
│   ┌──────────────────────────┐  ┌──────────────────────────────┐   │
│   │  UVB: Hard Rules         │  │  🆕 BUSINESS TYPE DETECTOR   │   │
│   │  (existing)              │  │  detectBusinessType(schema)  │   │
│   │                          │  │  → BusinessTypeMatch[]       │   │
│   └────────────┬─────────────┘  └────────────┬─────────────────┘   │
│                │                             │                      │
│                └──────────────┬──────────────┘                      │
│                               │                                     │
│                               ▼                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  🆕 TEMPLATE MAPPER                                          │   │
│   │  mapToTemplate(detected, businessType) → MappedVocabulary   │   │
│   │                                                              │   │
│   │  - Maps schema columns → template KPIs                       │   │
│   │  - Identifies gaps (template KPI with no schema match)       │   │
│   │  - Flags conflicts (multiple candidates for same KPI)        │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  🆕 ADAPTIVE DECISIONS (replaces simple confirmations)       │   │
│   │  generateDecisions(mapped) → Decision[]                     │   │
│   │                                                              │   │
│   │  Types: confirmation, selection, specification,              │   │
│   │         disambiguation, priority, business_type              │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Semantic Layer (existing, enhanced)                         │   │
│   │  MappedVocabulary → SemanticLayer                           │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  🆕 DASHBOARD GENERATOR                                      │   │
│   │  generateDashboard(semantic, businessType) → DashboardSpec  │   │
│   │                                                              │   │
│   │  - Layout from template                                      │   │
│   │  - KPI cards with live queries                               │   │
│   │  - Charts with time series                                   │   │
│   │  - Suggested questions                                       │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Query Engine (existing)                                     │   │
│   │  NL Query → LiquidFlow IR → SQL                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## New Module: Business Type Detector

**Location:** `packages/liquid-connect/src/business-types/`

### Types

```typescript
// business-types/types.ts

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
  signal: string;        // What we found
  weight: number;        // 0-100
  source: "table" | "column" | "pattern" | "relationship";
}

export interface BusinessTypeMatch {
  type: BusinessType;
  confidence: number;    // 0-100, aggregated from signals
  signals: BusinessTypeSignal[];
  templateId: string;    // Reference to template definition
}

export interface DetectionResult {
  matches: BusinessTypeMatch[];  // Sorted by confidence
  primary: BusinessTypeMatch | null;  // Highest confidence if > threshold
  ambiguous: boolean;  // True if top 2 are within 15% of each other
}
```

### Detection Logic

```typescript
// business-types/detector.ts

import type { ExtractedSchema, Table } from "../uvb/models";
import type { BusinessTypeMatch, DetectionResult, BusinessTypeSignal } from "./types";
import { BUSINESS_TYPE_SIGNATURES } from "./signatures";

export function detectBusinessType(schema: ExtractedSchema): DetectionResult {
  const signals: BusinessTypeSignal[] = [];

  for (const table of schema.tables) {
    // Check table name patterns
    for (const sig of BUSINESS_TYPE_SIGNATURES) {
      if (sig.tablePatterns.some(p => p.test(table.name))) {
        signals.push({
          type: sig.type,
          signal: `Table "${table.name}" matches ${sig.type} pattern`,
          weight: sig.tableWeight,
          source: "table",
        });
      }

      // Check column patterns
      for (const column of table.columns) {
        if (sig.columnPatterns.some(p => p.test(column.name))) {
          signals.push({
            type: sig.type,
            signal: `Column "${table.name}.${column.name}" matches ${sig.type} pattern`,
            weight: sig.columnWeight,
            source: "column",
          });
        }
      }
    }

    // Check relationship patterns (e.g., buyers + sellers = marketplace)
    // ...
  }

  // Aggregate signals by type
  const aggregated = aggregateSignals(signals);

  // Sort by confidence
  const matches = aggregated.sort((a, b) => b.confidence - a.confidence);

  return {
    matches,
    primary: matches[0]?.confidence >= 60 ? matches[0] : null,
    ambiguous: matches.length >= 2 &&
               (matches[0].confidence - matches[1].confidence) < 15,
  };
}
```

### Signatures Definition

```typescript
// business-types/signatures.ts

export interface BusinessTypeSignature {
  type: BusinessType;
  tablePatterns: RegExp[];
  columnPatterns: RegExp[];
  tableWeight: number;
  columnWeight: number;
  requiredSignals?: number;  // Minimum signals to consider
}

export const BUSINESS_TYPE_SIGNATURES: BusinessTypeSignature[] = [
  {
    type: "saas",
    tablePatterns: [
      /subscriptions?/i,
      /plans?/i,
      /licenses?/i,
      /tenants?/i,
      /workspaces?/i,
    ],
    columnPatterns: [
      /mrr/i,
      /arr/i,
      /churn/i,
      /trial/i,
      /subscription/i,
      /plan_id/i,
      /seats/i,
      /usage/i,
    ],
    tableWeight: 30,
    columnWeight: 15,
  },
  {
    type: "ecommerce",
    tablePatterns: [
      /orders?/i,
      /products?/i,
      /carts?/i,
      /inventory/i,
      /shipping/i,
      /line_items?/i,
    ],
    columnPatterns: [
      /sku/i,
      /quantity/i,
      /cart/i,
      /shipping/i,
      /fulfillment/i,
      /stock/i,
    ],
    tableWeight: 25,
    columnWeight: 12,
  },
  {
    type: "marketplace",
    tablePatterns: [
      /buyers?/i,
      /sellers?/i,
      /vendors?/i,
      /merchants?/i,
      /listings?/i,
    ],
    columnPatterns: [
      /commission/i,
      /take_rate/i,
      /seller_id/i,
      /buyer_id/i,
      /vendor_id/i,
    ],
    tableWeight: 40,
    columnWeight: 20,
  },
  {
    type: "fintech",
    tablePatterns: [
      /accounts?/i,
      /transactions?/i,
      /transfers?/i,
      /payments?/i,
      /ledger/i,
      /wallets?/i,
    ],
    columnPatterns: [
      /balance/i,
      /amount/i,
      /credit/i,
      /debit/i,
      /interest/i,
      /fee/i,
    ],
    tableWeight: 30,
    columnWeight: 15,
  },
  // ... more types
];
```

---

## New Module: Business Type Catalog

**Location:** `packages/liquid-connect/src/business-types/catalog/`

### Template Definition

```yaml
# catalog/saas.yaml

id: saas
name: "SaaS / Subscription"
description: "Software as a Service with recurring revenue"

# Detection hints (used by detector)
detection:
  strongSignals:
    - table: subscriptions
    - column: mrr
    - column: churn
  weakSignals:
    - table: users
    - column: plan_id

# Standard KPIs with formula templates
kpis:
  primary:
    - id: mrr
      name: "Monthly Recurring Revenue"
      slug: mrr
      type: metric
      aggregation: SUM
      format: currency
      direction: higher_is_better
      formula:
        template: "SUM({amount_column})"
        requiredMappings:
          - slot: amount_column
            hint: "subscription amount/price column"
            patterns: [/amount/i, /price/i, /mrr/i, /revenue/i]

    - id: churn_rate
      name: "Churn Rate"
      slug: churn_rate
      type: metric
      aggregation: CUSTOM
      format: percentage
      direction: lower_is_better
      formula:
        template: "COUNT({churned}) / COUNT({total}) * 100"
        requiredMappings:
          - slot: churned
            hint: "churned customers this period"
          - slot: total
            hint: "total customers start of period"

    - id: customer_count
      name: "Total Customers"
      slug: customer_count
      type: metric
      aggregation: COUNT_DISTINCT
      format: number
      direction: higher_is_better
      formula:
        template: "COUNT(DISTINCT {customer_id})"
        requiredMappings:
          - slot: customer_id
            hint: "customer identifier"
            patterns: [/customer_id/i, /user_id/i, /account_id/i]

  secondary:
    - id: arr
      name: "Annual Recurring Revenue"
      derivedFrom: mrr
      formula: "mrr * 12"

    - id: arpu
      name: "Average Revenue Per User"
      formula: "mrr / customer_count"

# Entity expectations
entities:
  - id: customer
    name: "Customer"
    expectedTables: [customers, users, accounts, organizations]
    requiredFields: [id, name, created_at]

  - id: subscription
    name: "Subscription"
    expectedTables: [subscriptions, plans, contracts]
    requiredFields: [customer_id, amount, status, started_at]

# Dashboard template
dashboard:
  layout: "executive"
  sections:
    - name: "Revenue"
      kpis: [mrr, arr, mrr_growth]
      chart:
        type: line
        metric: mrr
        timeGrain: month
        periods: 12

    - name: "Customers"
      kpis: [customer_count, churn_rate, nrr]
      chart:
        type: bar
        metrics: [new_customers, churned_customers]
        timeGrain: month
        periods: 6

    - name: "Efficiency"
      kpis: [cac, ltv, ltv_cac_ratio]

# Common questions for this business type
questions:
  - "What's our MRR?"
  - "How is churn trending?"
  - "Which customers are at risk?"
  - "What's our net revenue retention?"
  - "Show me expansion revenue by segment"
```

### Template Loader

```typescript
// business-types/catalog/loader.ts

import type { BusinessTypeTemplate } from "./types";
import saasTemplate from "./saas.yaml";
import ecommerceTemplate from "./ecommerce.yaml";
// ... more

const TEMPLATES: Record<string, BusinessTypeTemplate> = {
  saas: saasTemplate,
  ecommerce: ecommerceTemplate,
  marketplace: marketplaceTemplate,
  fintech: fintechTemplate,
  healthcare: healthcareTemplate,
  edtech: edtechTemplate,
  media: mediaTemplate,
  logistics: logisticsTemplate,
};

export function getTemplate(type: BusinessType): BusinessTypeTemplate | null {
  return TEMPLATES[type] ?? null;
}

export function getAllTemplates(): BusinessTypeTemplate[] {
  return Object.values(TEMPLATES);
}
```

---

## New Module: Template Mapper

**Location:** `packages/liquid-connect/src/business-types/mapper.ts`

```typescript
// business-types/mapper.ts

import type { DetectedVocabulary, DetectedMetric } from "../uvb/models";
import type { BusinessTypeTemplate, KPIDefinition, MappingResult } from "./types";

export interface SlotMapping {
  slot: string;           // Template slot name (e.g., "amount_column")
  mappedTo: string | null; // Schema reference (e.g., "subscriptions.amount")
  confidence: number;
  alternatives: string[]; // Other candidates
  source: "auto" | "user";
}

export interface MappedKPI {
  kpi: KPIDefinition;
  mappings: SlotMapping[];
  status: "complete" | "partial" | "unmapped";
  generatedFormula: string | null;
  canExecute: boolean;
}

export interface MappingResult {
  businessType: BusinessType;
  template: BusinessTypeTemplate;
  mappedKPIs: MappedKPI[];
  unmappedKPIs: KPIDefinition[];
  extraMetrics: DetectedMetric[];  // Schema metrics not in template
  conflicts: MappingConflict[];
  coverage: number;  // 0-100, how much of template is mapped
}

export function mapToTemplate(
  detected: DetectedVocabulary,
  template: BusinessTypeTemplate
): MappingResult {
  const mappedKPIs: MappedKPI[] = [];
  const unmappedKPIs: KPIDefinition[] = [];
  const conflicts: MappingConflict[] = [];

  for (const kpi of [...template.kpis.primary, ...template.kpis.secondary]) {
    const mappings: SlotMapping[] = [];

    for (const required of kpi.formula.requiredMappings ?? []) {
      // Find candidates from detected vocabulary
      const candidates = findCandidates(detected, required.patterns, required.hint);

      if (candidates.length === 0) {
        mappings.push({
          slot: required.slot,
          mappedTo: null,
          confidence: 0,
          alternatives: [],
          source: "auto",
        });
      } else if (candidates.length === 1) {
        mappings.push({
          slot: required.slot,
          mappedTo: candidates[0].ref,
          confidence: candidates[0].confidence,
          alternatives: [],
          source: "auto",
        });
      } else {
        // Multiple candidates - conflict
        conflicts.push({
          kpiId: kpi.id,
          slot: required.slot,
          candidates: candidates.map(c => c.ref),
        });

        mappings.push({
          slot: required.slot,
          mappedTo: candidates[0].ref,  // Best guess
          confidence: candidates[0].confidence * 0.7,  // Reduced confidence
          alternatives: candidates.slice(1).map(c => c.ref),
          source: "auto",
        });
      }
    }

    const allMapped = mappings.every(m => m.mappedTo !== null);
    const partialMapped = mappings.some(m => m.mappedTo !== null);

    mappedKPIs.push({
      kpi,
      mappings,
      status: allMapped ? "complete" : partialMapped ? "partial" : "unmapped",
      generatedFormula: allMapped ? generateFormula(kpi.formula.template, mappings) : null,
      canExecute: allMapped,
    });
  }

  // Find extra metrics (in schema but not in template)
  const templateMetricIds = new Set(template.kpis.primary.map(k => k.id));
  const extraMetrics = detected.metrics.filter(m =>
    !templateMetricIds.has(m.id) && m.certainty >= 0.7
  );

  const coverage = (mappedKPIs.filter(k => k.status === "complete").length /
                   mappedKPIs.length) * 100;

  return {
    businessType: template.id,
    template,
    mappedKPIs,
    unmappedKPIs: mappedKPIs.filter(k => k.status === "unmapped").map(k => k.kpi),
    extraMetrics,
    conflicts,
    coverage,
  };
}
```

---

## New Module: Dashboard Generator

**Location:** `packages/liquid-connect/src/dashboard/`

```typescript
// dashboard/generator.ts

import type { MappingResult, MappedKPI } from "../business-types/mapper";
import type { SemanticLayer } from "../semantic";
import type { BusinessTypeTemplate } from "../business-types/types";

export interface DashboardKPI {
  id: string;
  name: string;
  value: unknown;        // Actual value from query
  format: string;
  query: string;         // LiquidConnect query string
  sql: string;           // Generated SQL
  trend?: {
    direction: "up" | "down" | "flat";
    percentage: number;
    comparedTo: string;
  };
}

export interface DashboardSection {
  name: string;
  kpis: DashboardKPI[];
  chart?: {
    type: "line" | "bar" | "area" | "pie";
    query: string;
    sql: string;
  };
}

export interface DashboardSpec {
  businessType: string;
  title: string;
  generatedAt: string;
  sections: DashboardSection[];
  suggestedQuestions: string[];
  coverage: number;
  warnings: string[];
}

export function generateDashboard(
  mapping: MappingResult,
  semantic: SemanticLayer
): DashboardSpec {
  const template = mapping.template;
  const sections: DashboardSection[] = [];

  for (const sectionDef of template.dashboard.sections) {
    const sectionKPIs: DashboardKPI[] = [];

    for (const kpiId of sectionDef.kpis) {
      const mapped = mapping.mappedKPIs.find(k => k.kpi.id === kpiId);

      if (mapped?.canExecute) {
        // Generate LiquidConnect query
        const lcQuery = generateLCQuery(mapped);

        sectionKPIs.push({
          id: mapped.kpi.id,
          name: mapped.kpi.name,
          value: null,  // Filled by executor
          format: mapped.kpi.format,
          query: lcQuery,
          sql: "", // Will be generated by emitter
        });
      }
    }

    sections.push({
      name: sectionDef.name,
      kpis: sectionKPIs,
      chart: sectionDef.chart ? {
        type: sectionDef.chart.type,
        query: generateChartQuery(sectionDef.chart, mapping),
        sql: "",
      } : undefined,
    });
  }

  return {
    businessType: mapping.businessType,
    title: `${template.name} Dashboard`,
    generatedAt: new Date().toISOString(),
    sections,
    suggestedQuestions: template.questions,
    coverage: mapping.coverage,
    warnings: generateWarnings(mapping),
  };
}
```

---

## Integration: Updated UVB Pipeline

```typescript
// uvb/index.ts (updated exports)

// Existing exports
export { extractSchema, applyHardRules, ... };

// New exports
export {
  detectBusinessType,
  getTemplate,
  mapToTemplate,
  generateDashboard,
  type BusinessType,
  type BusinessTypeMatch,
  type MappingResult,
  type DashboardSpec,
} from "../business-types";

// Convenience pipeline function
export async function analyzeDatabase(
  adapter: DatabaseAdapter,
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  // 1. Extract schema
  const schema = await extractSchema(adapter, options?.extraction);

  // 2. Detect business type
  const businessType = detectBusinessType(schema);

  // 3. Apply hard rules
  const { detected, confirmations, stats } = applyHardRules(schema);

  // 4. Map to template (if business type detected)
  let mapping: MappingResult | null = null;
  if (businessType.primary) {
    const template = getTemplate(businessType.primary.type);
    if (template) {
      mapping = mapToTemplate(detected, template);
    }
  }

  // 5. Generate adaptive decisions
  const decisions = generateDecisions({
    detected,
    businessType,
    mapping,
    confirmations,
  });

  return {
    schema,
    businessType,
    detected,
    mapping,
    decisions,
    stats,
  };
}
```

---

## API Integration

```typescript
// packages/api/src/modules/knosia/analysis/mutations.ts (enhanced)

export async function runAnalysis(input: RunAnalysisInput) {
  const adapter = createAdapter(connection);

  // Use the new pipeline
  const result = await analyzeDatabase(adapter, {
    extraction: { schema: connection.schema },
  });

  // Store results
  await db.insert(knosiaAnalysis).values({
    id: generateId(),
    connectionId: input.connectionId,
    status: "completed",

    // New fields
    businessType: result.businessType.primary?.type ?? null,
    businessTypeConfidence: result.businessType.primary?.confidence ?? null,
    mappingCoverage: result.mapping?.coverage ?? null,

    // Existing
    schemaSnapshot: result.schema,
    detectedVocabulary: result.detected,

    // New
    templateMapping: result.mapping,
    decisions: result.decisions,
  });

  // Generate preview dashboard if business type detected
  if (result.mapping && result.mapping.coverage >= 50) {
    const semantic = buildSemanticLayer(result.detected, result.mapping);
    const dashboard = generateDashboard(result.mapping, semantic);

    // Store dashboard preview
    await db.insert(knosiaDashboardPreview).values({
      analysisId: analysisId,
      spec: dashboard,
    });
  }

  return { analysisId, result };
}
```

---

## File Structure

```
packages/liquid-connect/src/
├── business-types/
│   ├── index.ts              # Module exports
│   ├── types.ts              # Type definitions
│   ├── detector.ts           # Business type detection
│   ├── signatures.ts         # Detection patterns
│   ├── mapper.ts             # Template → schema mapping
│   ├── decisions.ts          # Adaptive decision generation
│   └── catalog/
│       ├── index.ts          # Catalog loader
│       ├── types.ts          # Template types
│       ├── saas.yaml         # SaaS template
│       ├── ecommerce.yaml    # E-commerce template
│       ├── marketplace.yaml  # Marketplace template
│       ├── fintech.yaml      # FinTech template
│       └── ...
├── dashboard/
│   ├── index.ts
│   ├── generator.ts          # Dashboard spec generator
│   ├── queries.ts            # LiquidConnect query builders
│   └── types.ts
├── uvb/                      # Existing (unchanged)
├── semantic/                 # Existing (unchanged)
├── query/                    # Existing (unchanged)
├── emitters/                 # Existing (unchanged)
└── index.ts                  # Updated with new exports
```

---

## Summary

The architecture adds **4 new capabilities** to LiquidConnect:

1. **Business Type Detector** - Schema patterns → SaaS/Ecommerce/etc
2. **Business Type Catalog** - YAML templates with KPIs and formulas
3. **Template Mapper** - Match schema columns to template slots
4. **Dashboard Generator** - Produce ready-to-render dashboard specs

These integrate cleanly with existing UVB and semantic layer, producing:
- **Faster onboarding** - Template provides structure
- **Better defaults** - KPIs pre-defined per business type
- **Immediate value** - Dashboard with real data in 60 seconds
- **Clear customization** - User refines mappings, not builds from scratch

---

*Next: Implement business-types module starting with detector and SaaS template*
