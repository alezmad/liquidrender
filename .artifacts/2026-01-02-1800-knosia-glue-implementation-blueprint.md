# Knosia Glue Implementation Blueprint

**Date:** 2026-01-02
**Status:** Implementation Seed Document
**Purpose:** Prompts and interface references for building glue code

---

## Overview

This document defines the **4 glue functions** needed to connect LiquidConnect, LiquidRender, and Knosia's vocabulary system into a working pipeline.

**V1 Scope:** All 4 glue functions are required for the initial release. They enable the full pipeline from database connection to rendered dashboard.

**V2+ Extensions:** Business type templates will expand (adding FinTech, Marketplace, etc.), and template mapping will support user-guided slot correction.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GLUE FUNCTIONS MAP                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  GLUE 1: saveDetectedVocabulary()                                               │
│  DetectedVocabulary → knosia_vocabulary_item (DB)                               │
│                                                                                 │
│  GLUE 2: generateSemanticLayer()                                                │
│  ResolvedVocabulary → SemanticLayer (LiquidConnect format)                      │
│                                                                                 │
│  GLUE 3: detectBusinessType() + generateDashboardSpec()                         │
│  ExtractedSchema + Template → DashboardSpec                                     │
│                                                                                 │
│  GLUE 4: dashboardSpecToLiquidSchema()                                          │
│  DashboardSpec → LiquidSchema (LiquidRender format)                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

**Cross-reference:** These 4 glue functions are implementation targets. For the end-to-end
user flow, see "7-step onboarding pipeline" in `.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md`.
```

---

## GLUE 1: saveDetectedVocabulary()

### Purpose

Transform UVB detection output into Knosia's 3-level vocabulary storage.

### Input Interface (Source)

**File:** `packages/liquid-connect/src/uvb/models.ts`

```typescript
interface DetectedVocabulary {
  entities: DetectedEntity[];
  metrics: DetectedMetric[];
  dimensions: DetectedDimension[];
  timeFields: DetectedTimeField[];
  filters: DetectedFilter[];
  relationships: DetectedRelationship[];
}

interface DetectedMetric {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  aggregation: AggregationType;  // "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX"
  certainty: number;             // 0-1
  suggestedDisplayName?: string;
  expression?: string;
}

interface DetectedDimension {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  cardinality?: number;
  certainty: number;
}

interface DetectedEntity {
  name: string;
  table: string;
  schema: string;
  primaryKey: string | string[];
  columnCount: number;
  certainty: number;
  isJunction: boolean;
}

interface DetectedRelationship {
  id: string;
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  type: RelationshipType;  // "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many"
  via?: string;
  certainty: number;
}
```

### Output Interface (Target)

**File:** `packages/db/src/schema/knosia.ts` (lines 377-470)

```typescript
// knosia_vocabulary_item table
{
  id: text().primaryKey(),
  workspaceId: text() | null,  // NULL = org-level, set = workspace-level
  orgId: text().notNull(),

  // Identity
  canonicalName: text().notNull(),
  abbreviation: text(),
  slug: text().notNull(),
  aliases: jsonb<string[]>().default([]),

  // Classification
  type: enum("metric" | "dimension" | "entity" | "event"),
  category: text(),

  // Definition
  definition: jsonb<{
    descriptionHuman?: string;
    formulaHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
    sourceColumn?: string;
    caveats?: string[];
    exampleValues?: { low?: string; typical?: string; high?: string };
  }>(),

  // Semantics
  semantics: jsonb<{
    direction?: "higher_is_better" | "lower_is_better" | "target_range";
    format?: "currency" | "percentage" | "count" | "duration" | "ratio";
    grain?: "daily" | "weekly" | "monthly" | "point_in_time";
    sensitivity?: "public" | "internal" | "confidential" | "pii";
  }>(),

  // Governance
  status: enum("draft" | "approved" | "deprecated"),
  currentVersion: integer().default(1),

  // Role Suggestions
  suggestedForRoles: jsonb<string[]>(),  // ["strategist", "operator", "analyst", "builder"]

  // Extraction Metadata
  aggregation: enum("SUM" | "AVG" | "COUNT" | "MIN" | "MAX"),
  aggregationConfidence: integer(),
  cardinality: integer(),
  isPrimaryTime: boolean().default(false),
  joinsTo: jsonb<{ target: string; via: string; type: string }[]>(),
}
```

### Implementation Location

**Create:** `packages/api/src/modules/knosia/vocabulary/from-detected.ts`

**Note:** This is a dedicated file, not part of `packages/api/src/modules/knosia/vocabulary/router.ts` or `mutations.ts`. Keep vocabulary I/O operations (CRUD) separate from transformation logic (DetectedVocabulary → DB format).

### Prompt

```
Create a function `saveDetectedVocabulary` that transforms DetectedVocabulary
(from LiquidConnect UVB) into knosia_vocabulary_item rows.

Requirements:
1. Accept DetectedVocabulary, orgId, workspaceId, and optional config
2. Save all metrics as type="metric" vocabulary items
3. Save all dimensions as type="dimension" vocabulary items
4. Save all entities as type="entity" vocabulary items
5. Generate slugs using slugify (lowercase, hyphenated)
6. Set status="approved" if certainty >= 0.8, else "draft"
7. Map aggregation types directly (SUM, AVG, COUNT, etc.)
8. Store source table and column in definition.sourceTables and definition.sourceColumn
9. Generate formulaSql from aggregation + table.column
10. Use generateId() from @turbostarter/shared/utils for IDs
11. Handle conflicts (existing slugs) by appending _2, _3, etc.
12. Return summary: { metrics: number, dimensions: number, entities: number }

Reference files:
- Input types: packages/liquid-connect/src/uvb/models.ts
- Output schema: packages/db/src/schema/knosia.ts (knosiaVocabularyItem)
- ID generation: import { generateId } from "@turbostarter/shared/utils"
- DB operations: import { db } from "@turbostarter/db/server"
```

### Function Signature

```typescript
interface SaveDetectedVocabularyOptions {
  // If true, also save high-certainty items at org level (workspaceId = null)
  // DEFAULT BEHAVIOR: DetectedVocabulary items are saved to org-level (workspaceId = NULL)
  // unless promoteHighCertaintyToOrg is explicitly set to false
  promoteHighCertaintyToOrg?: boolean;  // Default true
  certaintyThreshold?: number;  // Default 0.8
  // Skip items that already exist (by slug)
  skipExisting?: boolean;
}

interface SaveDetectedVocabularyResult {
  metrics: { created: number; skipped: number };
  dimensions: { created: number; skipped: number };
  entities: { created: number; skipped: number };
  errors: Array<{ item: string; error: string }>;
}

async function saveDetectedVocabulary(
  detected: DetectedVocabulary,
  orgId: string,
  workspaceId: string,
  options?: SaveDetectedVocabularyOptions
): Promise<SaveDetectedVocabularyResult>
```

---

## GLUE 2: generateSemanticLayer()

### Purpose

Transform resolved vocabulary (merged 3 levels) into LiquidConnect SemanticLayer format for query execution.

### Input Interface (Source)

**File:** `packages/api/src/modules/knosia/vocabulary/resolution.ts`

```typescript
interface ResolvedVocabulary {
  items: ResolvedVocabularyItem[];
  bySlug: Map<string, ResolvedVocabularyItem>;
  favorites: string[];
  recentlyUsed: { slug: string; lastUsedAt: string; useCount: number }[];
  synonyms: Record<string, string>;
}

interface ResolvedVocabularyItem {
  id: string;
  slug: string;
  canonicalName: string;
  abbreviation: string | null;
  type: "metric" | "dimension" | "entity" | "event";
  category: string | null;
  scope: "org" | "workspace" | "private";
  definition: VocabularyDefinition | null;
  suggestedForRoles: string[] | null;
  status?: "draft" | "approved" | "deprecated";
  aggregation?: string;
  isFavorite: boolean;
  recentlyUsedAt: string | null;
  useCount: number;
}

interface VocabularyDefinition {
  descriptionHuman?: string;
  formulaHuman?: string;
  formulaSql?: string;
  sourceTables?: string[];
  sourceColumn?: string;
}
```

Also needs schema info:

**File:** `packages/liquid-connect/src/uvb/models.ts`

```typescript
interface ExtractedSchema {
  database: string;
  type: DatabaseType;
  schema: string;
  tables: Table[];
  extractedAt: string;
}

interface Table {
  name: string;
  schema: string;
  columns: Column[];
  primaryKeyColumns: string[];
  foreignKeys: ForeignKeyConstraint[];
}
```

### Output Interface (Target)

**File:** `packages/liquid-connect/src/semantic/types.ts`

```typescript
interface SemanticLayer {
  version: string;
  name: string;
  description?: string;
  sources: Record<string, SourceDefinition>;
  entities: Record<string, EntityDefinition>;
  metrics: Record<string, MetricDefinition>;
  dimensions: Record<string, DimensionDefinition>;
  filters?: Record<string, FilterDefinition>;
  relationships?: RelationshipDefinition[];
}

interface SourceDefinition {
  type: 'table' | 'view' | 'subquery';
  database?: string;
  schema?: string;
  table?: string;
  primaryKey?: string[];
}

interface MetricDefinition {
  type: 'simple' | 'derived' | 'cumulative';
  aggregation?: AggregationType;
  expression: string;
  entity: string;
  timeField?: string;
  description?: string;
  label?: string;
  format?: MetricFormat;
}

interface DimensionDefinition {
  entity: string;
  expression: string;
  type: FieldType;
  description?: string;
  label?: string;
  isTime?: boolean;
  granularities?: TimeGranularity[];
}

interface EntityDefinition {
  source: string;
  description?: string;
  label?: string;
  primaryKey: string;
  fields: Record<string, FieldDefinition>;
  defaultTimeField?: string;
}
```

### Implementation Location

**Create:** `packages/liquid-connect/src/semantic/from-vocabulary.ts`

### Prompt

```
Create a function `generateSemanticLayer` that transforms ResolvedVocabulary
and ExtractedSchema into a SemanticLayer for LiquidConnect query execution.

Requirements:
1. Accept ResolvedVocabulary and ExtractedSchema
2. Generate sources from schema.tables
3. Generate entities from vocabulary items where type="entity"
4. Generate metrics from vocabulary items where type="metric"
   - Use definition.formulaSql as expression
   - Map aggregation field to SemanticLayer aggregation
   - Set entity from definition.sourceTables[0]
5. Generate dimensions from vocabulary items where type="dimension"
   - Use definition.sourceColumn for expression
   - Detect isTime from data type patterns
6. Include user's private vocabulary (scope="private") as derived metrics
7. Map user synonyms to metric aliases for query resolution
8. Generate relationships from schema foreign keys
9. Return valid SemanticLayer that passes validateSemanticLayer()

Reference files:
- Input (vocabulary): packages/api/src/modules/knosia/vocabulary/resolution.ts
- Input (schema): packages/liquid-connect/src/uvb/models.ts
- Output: packages/liquid-connect/src/semantic/types.ts
- Validation: import { validateSemanticLayer } from './index'
```

### Function Signature

```typescript
interface GenerateSemanticLayerOptions {
  // Include deprecated items
  includeDeprecated?: boolean;
  // Include draft items
  includeDrafts?: boolean;
  // Name for the semantic layer
  name?: string;
}

function generateSemanticLayer(
  resolved: ResolvedVocabulary,
  schema: ExtractedSchema,
  options?: GenerateSemanticLayerOptions
): SemanticLayer
```

---

## GLUE 3: detectBusinessType() + generateDashboardSpec()

### Purpose

Detect business type from schema patterns and generate a dashboard specification using templates.

### Part A: detectBusinessType()

#### Input Interface

**File:** `packages/liquid-connect/src/uvb/models.ts`

```typescript
interface ExtractedSchema {
  database: string;
  type: DatabaseType;
  schema: string;
  tables: Table[];
  extractedAt: string;
}
```

#### Output Interface

**Create:** `packages/liquid-connect/src/business-types/types.ts`

```typescript
// Canonical BusinessType enum - shared across detection, templates, and dashboard generation
// V1 implementation: saas, ecommerce
// V2+ roadmap: marketplace, fintech, healthcare, edtech, media, logistics
type BusinessType =
  | "saas"
  | "ecommerce"
  | "marketplace"
  | "fintech"
  | "healthcare"
  | "edtech"
  | "media"
  | "logistics"
  | "custom";

interface BusinessTypeSignal {
  type: BusinessType;
  signal: string;        // What we found
  weight: number;        // 0-100
  source: "table" | "column" | "pattern" | "relationship";
}

interface BusinessTypeMatch {
  type: BusinessType;
  confidence: number;    // 0-100, aggregated from signals
  signals: BusinessTypeSignal[];
}

interface DetectionResult {
  matches: BusinessTypeMatch[];  // Sorted by confidence
  primary: BusinessTypeMatch | null;  // Highest confidence if > threshold
  ambiguous: boolean;  // True if top 2 are within 15% of each other
}
```

#### Implementation Location

**Create:** `packages/liquid-connect/src/business-types/detector.ts`

#### Prompt

```
Create a function `detectBusinessType` that analyzes a database schema
and returns the most likely business type(s).

Requirements:
1. Accept ExtractedSchema
2. Check table names against business type patterns:
   - SaaS: subscriptions, plans, licenses, tenants, workspaces
   - E-commerce: orders, products, carts, inventory, shipping
   - Marketplace: buyers, sellers, vendors, merchants, listings
   - FinTech: accounts, transactions, transfers, payments, ledger
3. Check column names for signals:
   - SaaS: mrr, arr, churn, trial, subscription, plan_id, seats
   - E-commerce: sku, quantity, cart, shipping, fulfillment
   - Marketplace: commission, take_rate, seller_id, buyer_id
   - FinTech: balance, amount, credit, debit, interest, fee
4. Weight table matches higher than column matches
5. Aggregate signals into confidence scores per business type
6. Return sorted matches with primary selection if confidence > 60
7. Flag as ambiguous if top 2 are within 15 points

Reference files:
- Input: packages/liquid-connect/src/uvb/models.ts (ExtractedSchema)
- Pattern reference: packages/liquid-connect/src/uvb/rules.ts (similar pattern matching)
```

### Part B: Business Type Templates

#### Template Format

**Create:** `packages/liquid-connect/src/business-types/templates/saas.ts`

```typescript
interface BusinessTypeTemplate {
  id: BusinessType;
  name: string;
  description: string;

  // KPIs with formula templates
  kpis: {
    primary: KPIDefinition[];
    secondary: KPIDefinition[];
  };

  // Expected entities
  entities: EntityExpectation[];

  // Dashboard layout
  dashboard: {
    layout: "executive" | "operational" | "detailed";
    sections: DashboardSection[];
  };

  // Common questions for this business type
  questions: string[];
}

interface KPIDefinition {
  id: string;
  name: string;
  slug: string;
  type: "metric" | "dimension";
  aggregation?: string;
  format: "currency" | "percentage" | "number" | "duration";
  direction: "higher_is_better" | "lower_is_better" | "target_range";
  formula: {
    template: string;  // e.g., "SUM({amount_column})"
    requiredMappings: SlotMapping[];
  };
  suggestedForRoles?: string[];
}

interface SlotMapping {
  slot: string;           // e.g., "amount_column"
  hint: string;           // e.g., "subscription amount/price column"
  patterns: RegExp[];     // e.g., [/amount/i, /price/i, /mrr/i]
}

interface DashboardSection {
  name: string;
  kpis: string[];  // KPI IDs
  chart?: {
    type: "line" | "bar" | "area" | "pie";
    metric: string;
    timeGrain: "day" | "week" | "month";
    periods: number;
  };
}
```

#### Prompt for SaaS Template

```
Create the SaaS business type template with:

Primary KPIs:
- MRR (Monthly Recurring Revenue): SUM(amount) where status=active
- Churn Rate: churned_customers / total_customers * 100
- Customer Count: COUNT(DISTINCT customer_id)
- ARPU (Average Revenue Per User): MRR / customer_count
- NRR (Net Revenue Retention): (start_mrr + expansion - contraction - churn) / start_mrr

Secondary KPIs:
- ARR: MRR * 12
- Trial Conversion Rate
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)

Dashboard sections:
1. Revenue: MRR, ARR, MRR growth chart
2. Customers: Customer count, Churn rate, Cohort chart
3. Efficiency: ARPU, LTV/CAC ratio

Common questions:
- "What's our MRR?"
- "How is churn trending?"
- "Which customers are at risk?"
- "Show me expansion revenue"

Reference the KPIDefinition interface and include formula templates with
slot mappings for schema columns.
```

### Part C: generateDashboardSpec()

#### Input Interface

```typescript
interface MappingResult {
  businessType: BusinessType;
  template: BusinessTypeTemplate;
  mappedKPIs: MappedKPI[];
  unmappedKPIs: KPIDefinition[];
  coverage: number;  // 0-100
}

interface MappedKPI {
  kpi: KPIDefinition;
  mappings: SlotMapping[];
  status: "complete" | "partial" | "unmapped";
  generatedFormula: string | null;
  canExecute: boolean;
}
```

#### Output Interface

**Create:** `packages/liquid-connect/src/dashboard/types.ts`

```typescript
interface DashboardSpec {
  businessType: string;
  title: string;
  generatedAt: string;
  sections: DashboardSection[];
  coverage: number;
  warnings: string[];
}

interface DashboardSection {
  id: string;
  name: string;
  kpis: DashboardKPI[];
  chart?: DashboardChart;
}

interface DashboardKPI {
  id: string;
  name: string;
  slug: string;              // For data binding
  format: string;
  query: string;             // LC DSL query
  suggestedForRoles?: string[];
  isFavorite?: boolean;
}

interface DashboardChart {
  type: "line" | "bar" | "area" | "pie";
  title: string;
  binding: string;           // Field name for data
  xAxis: string;
  yAxis: string;
  query: string;             // LC DSL query
}
```

#### Implementation Location

**Create:** `packages/liquid-connect/src/dashboard/generator.ts`

#### Prompt

```
Create a function `generateDashboardSpec` that produces a dashboard specification
from business type detection and template mapping.

Requirements:
1. Accept MappingResult (business type + mapped KPIs)
2. Use template.dashboard.sections as layout guide
3. For each section:
   - Include only KPIs that canExecute=true
   - Generate LC DSL query for each KPI (just the slug for simple metrics)
   - Generate chart query if section has chart definition
4. Calculate coverage: mapped KPIs / total KPIs * 100
5. Generate warnings for:
   - Unmapped primary KPIs
   - Low confidence mappings
   - Missing time dimension for charts
6. Include suggestedForRoles from KPI definitions
7. Return DashboardSpec ready for UI generation

Reference files:
- Template types: packages/liquid-connect/src/business-types/templates/types.ts
- Output types: packages/liquid-connect/src/dashboard/types.ts
```

### Function Signatures

```typescript
// Detector
function detectBusinessType(schema: ExtractedSchema): DetectionResult

// Template mapper
function mapToTemplate(
  detected: DetectedVocabulary,
  template: BusinessTypeTemplate
): MappingResult

// Dashboard generator
function generateDashboardSpec(
  mapping: MappingResult,
  options?: {
    includePartialKPIs?: boolean;
    maxKPIsPerSection?: number;
  }
): DashboardSpec
```

---

## GLUE 4: dashboardSpecToLiquidSchema()

### Purpose

Transform a DashboardSpec into LiquidSchema for rendering with LiquidUI.

### Input Interface (Source)

From GLUE 3:

```typescript
interface DashboardSpec {
  businessType: string;
  title: string;
  sections: DashboardSection[];
}

interface DashboardSection {
  id: string;
  name: string;
  kpis: DashboardKPI[];
  chart?: DashboardChart;
}

interface DashboardKPI {
  id: string;
  name: string;
  slug: string;
  format: string;
  query: string;
}

interface DashboardChart {
  type: "line" | "bar" | "area" | "pie";
  title: string;
  binding: string;
  xAxis: string;
  yAxis: string;
}
```

### Output Interface (Target)

**File:** `packages/liquid-render/src/compiler/ui-emitter.ts`

```typescript
interface LiquidSchema {
  version: '1.0';
  signals: Signal[];
  layers: Layer[];
}

interface Signal {
  name: string;
}

interface Layer {
  id: number;
  visible: boolean;
  root: Block;
}

interface Block {
  uid: string;
  type: string;
  binding?: Binding;
  label?: string;
  layout?: Layout;
  signals?: SignalBinding;
  condition?: Condition;
  style?: Style;
  action?: string;
  children?: Block[];
  columns?: string[];
}

interface Binding {
  kind: 'indexed' | 'field' | 'computed' | 'literal' | 'iterator' | 'indexRef';
  value: string | number[];
  x?: string;
  y?: string;
}

interface Layout {
  priority?: number | string;
  flex?: string;
  span?: number | string;
  columns?: number | 'auto' | 'auto-fit' | 'auto-fill';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}
```

### Implementation Location

**Create:** `packages/liquid-render/src/dashboard/schema-generator.ts`

### Prompt

```
Create a function `dashboardSpecToLiquidSchema` that converts a DashboardSpec
into a LiquidSchema for rendering with LiquidUI.

Requirements:
1. Accept DashboardSpec
2. Create a single layer (id: 0, visible: true)
3. Create root container block with children for each section
4. For each section:
   a. Create a heading block with section.name
   b. Create a grid block for KPIs:
      - columns = number of KPIs (max 4)
      - gap = "md"
   c. For each KPI, create a "kpi" block:
      - type: "kpi"
      - binding: { kind: "field", value: kpi.slug }
      - label: kpi.name
   d. If section has chart:
      - type: chart.type (line, bar, area, pie)
      - binding: { kind: "field", value: chart.binding, x: chart.xAxis, y: chart.yAxis }
      - label: chart.title
5. Generate unique uids: `${sectionId}_${blockType}_${index}`
6. Return valid LiquidSchema

Reference files:
- Output types: packages/liquid-render/src/compiler/ui-emitter.ts
- Example usage: apps/web/src/modules/knosia/canvas/components/blocks/liquid-render-block.tsx
- Renderer: packages/liquid-render/src/renderer/LiquidUI.tsx
```

### Function Signature

```typescript
interface SchemaGeneratorOptions {
  // Maximum KPIs per row in grid
  maxKPIsPerRow?: number;  // Default 4
  // Include section headers
  includeSectionHeaders?: boolean;  // Default true
  // Gap size between elements
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // Default 'md'
}

function dashboardSpecToLiquidSchema(
  spec: DashboardSpec,
  options?: SchemaGeneratorOptions
): LiquidSchema
```

### Example Output

```typescript
// Input
const spec: DashboardSpec = {
  businessType: "saas",
  title: "SaaS Dashboard",
  sections: [
    {
      id: "revenue",
      name: "Revenue",
      kpis: [
        { id: "mrr", name: "MRR", slug: "mrr", format: "currency", query: "mrr" },
        { id: "arr", name: "ARR", slug: "arr", format: "currency", query: "arr" },
      ],
      chart: {
        type: "line",
        title: "MRR Trend",
        binding: "mrr_trend",
        xAxis: "month",
        yAxis: "mrr"
      }
    }
  ]
};

// Output
const schema: LiquidSchema = {
  version: "1.0",
  signals: [],
  layers: [{
    id: 0,
    visible: true,
    root: {
      uid: "root",
      type: "container",
      children: [
        // Section: Revenue
        {
          uid: "revenue_heading",
          type: "heading",
          binding: { kind: "literal", value: "Revenue" },
          label: "Revenue"
        },
        {
          uid: "revenue_kpis",
          type: "grid",
          layout: { columns: 2, gap: "md" },
          children: [
            {
              uid: "revenue_kpi_mrr",
              type: "kpi",
              binding: { kind: "field", value: "mrr" },
              label: "MRR"
            },
            {
              uid: "revenue_kpi_arr",
              type: "kpi",
              binding: { kind: "field", value: "arr" },
              label: "ARR"
            }
          ]
        },
        {
          uid: "revenue_chart",
          type: "line",
          binding: { kind: "field", value: "mrr_trend", x: "month", y: "mrr" },
          label: "MRR Trend"
        }
      ]
    }
  }]
};
```

---

## Integration: Full Pipeline Function

### Implementation Location

**Create:** `packages/api/src/modules/knosia/pipeline/index.ts`

### Prompt

```
Create a function `runKnosiaPipeline` that orchestrates the full flow
from database connection to rendered dashboard.

Requirements:
1. Accept connectionId, userId, workspaceId
2. Execute in order (see Phase 0-4 breakdown in 1600-knosia-consolidated-implementation.md):
   a. Get connection details from DB
   b. Create database adapter (PostgresAdapter or DuckDBAdapter)
   c. Run extractSchema()
   d. Run applyHardRules() → DetectedVocabulary
   e. Run detectBusinessType() → BusinessType
   f. Run saveDetectedVocabulary() → store to DB
   g. Run resolveVocabulary() → ResolvedVocabulary
   h. Run generateSemanticLayer() → SemanticLayer
   i. Run mapToTemplate() → MappingResult (if business type detected)
   j. Run generateDashboardSpec() → DashboardSpec
   k. Run dashboardSpecToLiquidSchema() → LiquidSchema
3. Store analysis results in knosia_analysis table
4. Store dashboard spec in knosia_workspace or return directly
5. Return pipeline result with all intermediate outputs for debugging

**Phase mapping reference:**
- Phase 0: Steps a-c (connection + extraction)
- Phase 1: Steps d-f (vocabulary detection + storage)
- Phase 2: Steps g-h (vocabulary resolution + semantic layer)
- Phase 3: Steps i-j (business type detection + dashboard spec)
- Phase 4: Step k (LiquidSchema generation)

Reference all glue functions created above plus:
- Adapter creation: packages/liquid-connect/src/uvb/adapters/
- Schema extraction: packages/liquid-connect/src/uvb/extractor.ts
- Hard rules: packages/liquid-connect/src/uvb/rules.ts
- Vocabulary resolution: packages/api/src/modules/knosia/vocabulary/resolution.ts
```

### Function Signature

```typescript
interface PipelineOptions {
  // Skip steps
  skipSaveVocabulary?: boolean;
  skipDashboardGeneration?: boolean;
  // Business type override (skip detection)
  forceBusinessType?: BusinessType;
  // Return intermediate results for debugging
  debug?: boolean;
}

interface PipelineResult {
  success: boolean;
  analysisId: string;

  // Core outputs
  businessType: BusinessType | null;
  businessTypeConfidence: number;
  vocabularyStats: { metrics: number; dimensions: number; entities: number };
  dashboardSpec: DashboardSpec | null;
  liquidSchema: LiquidSchema | null;

  // Warnings and errors
  warnings: string[];
  errors: string[];

  // Debug outputs (if options.debug = true)
  debug?: {
    extractedSchema: ExtractedSchema;
    detectedVocabulary: DetectedVocabulary;
    resolvedVocabulary: ResolvedVocabulary;
    semanticLayer: SemanticLayer;
    mappingResult: MappingResult;
  };
}

async function runKnosiaPipeline(
  connectionId: string,
  userId: string,
  workspaceId: string,
  options?: PipelineOptions
): Promise<PipelineResult>
```

---

## File Structure

```
packages/
├── liquid-connect/src/
│   ├── business-types/
│   │   ├── index.ts              # Exports
│   │   ├── types.ts              # BusinessType, DetectionResult
│   │   ├── detector.ts           # detectBusinessType() ← GLUE 3A
│   │   ├── signatures.ts         # Detection patterns
│   │   └── templates/
│   │       ├── index.ts          # Template loader
│   │       ├── types.ts          # Template interfaces
│   │       ├── saas.ts           # SaaS template
│   │       └── ecommerce.ts      # E-commerce template
│   ├── dashboard/
│   │   ├── index.ts              # Exports
│   │   ├── types.ts              # DashboardSpec types
│   │   ├── generator.ts          # generateDashboardSpec() ← GLUE 3C
│   │   └── mapper.ts             # mapToTemplate() ← GLUE 3B
│   └── semantic/
│       └── from-vocabulary.ts    # generateSemanticLayer() ← GLUE 2
│
├── liquid-render/src/
│   └── dashboard/
│       ├── index.ts              # Exports
│       └── schema-generator.ts   # dashboardSpecToLiquidSchema() ← GLUE 4
│
└── api/src/modules/knosia/
    ├── vocabulary/
    │   └── from-detected.ts      # saveDetectedVocabulary() ← GLUE 1
    └── pipeline/
        └── index.ts              # runKnosiaPipeline() ← Integration
```

---

## Testing Strategy

### Unit Tests

```typescript
// packages/liquid-connect/src/business-types/__tests__/detector.test.ts
describe('detectBusinessType', () => {
  it('detects SaaS from subscriptions table', () => {
    const schema = createMockSchema(['subscriptions', 'plans', 'users']);
    const result = detectBusinessType(schema);
    expect(result.primary?.type).toBe('saas');
    expect(result.primary?.confidence).toBeGreaterThan(60);
  });

  it('detects e-commerce from orders and products', () => {
    const schema = createMockSchema(['orders', 'products', 'customers']);
    const result = detectBusinessType(schema);
    expect(result.primary?.type).toBe('ecommerce');
  });

  it('returns ambiguous when signals are mixed', () => {
    const schema = createMockSchema(['subscriptions', 'orders', 'products']);
    const result = detectBusinessType(schema);
    expect(result.ambiguous).toBe(true);
  });
});
```

### Integration Tests

```typescript
// packages/api/src/modules/knosia/pipeline/__tests__/pipeline.test.ts
describe('runKnosiaPipeline', () => {
  it('completes full pipeline for SaaS database', async () => {
    const result = await runKnosiaPipeline(
      testConnectionId,
      testUserId,
      testWorkspaceId,
      { debug: true }
    );

    expect(result.success).toBe(true);
    expect(result.businessType).toBe('saas');
    expect(result.dashboardSpec).not.toBeNull();
    expect(result.liquidSchema).not.toBeNull();
    expect(result.vocabularyStats.metrics).toBeGreaterThan(0);
  });
});
```

---

## Summary

| Glue | Function | Location | LOC Est |
|------|----------|----------|---------|
| 1 | `saveDetectedVocabulary()` | `api/modules/knosia/vocabulary/from-detected.ts` | ~100 |
| 2 | `generateSemanticLayer()` | `liquid-connect/src/semantic/from-vocabulary.ts` | ~150 |
| 3A | `detectBusinessType()` | `liquid-connect/src/business-types/detector.ts` | ~200 |
| 3B | `mapToTemplate()` | `liquid-connect/src/dashboard/mapper.ts` | ~150 |
| 3C | `generateDashboardSpec()` | `liquid-connect/src/dashboard/generator.ts` | ~100 |
| 4 | `dashboardSpecToLiquidSchema()` | `liquid-render/src/dashboard/schema-generator.ts` | ~100 |
| INT | `runKnosiaPipeline()` | `api/modules/knosia/pipeline/index.ts` | ~150 |
| | **Total** | | **~950 LOC** |

Plus templates (~300 LOC) = **~1,250 LOC total**

**Timeline reference:** See `.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md` for estimated development time per phase.

---

*End of Glue Implementation Blueprint*
