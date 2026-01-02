# Knosia Platform Architecture

**Date:** 2026-01-02
**Status:** Architecture Reference
**Purpose:** Consolidated vision, integration architecture, and implementation roadmap

---

## Executive Summary

Knosia transforms raw business data into actionable knowledge. Connect your database, and within 60 seconds you have a personalized briefing, vocabulary that speaks your language, and AI that understands your business.

The architecture is built on three core packages:
- **LiquidConnect** — Schema extraction, vocabulary detection, query engine, SQL generation
- **LiquidRender** — UI DSL compiler, 77 components, reactive rendering
- **LiquidCode** — Hyper-compressed DSL for surveys, UI, and future workflows

**Key insight:** The hard parts are already built. We need ~700 lines of core glue code to connect them (~1,250 LOC for full implementation including templates, ~2,650 LOC for complete system with UI pages).

---

## Table of Contents

1. [What's Already Built](#1-whats-already-built)
2. [The Integration Architecture](#2-the-integration-architecture)
3. [Vocabulary 3-Level Hierarchy](#3-vocabulary-3-level-hierarchy)
4. [Complete Pipeline Example](#4-complete-pipeline-example-query-to-ui)
5. [The Glue Code](#5-the-glue-code-what-we-need-to-build)
6. [Zero-Code Platform Vision](#6-zero-code-platform-vision)
7. [Knosia Evolution Path](#7-knosia-evolution-path)
8. [Implementation Summary](#8-implementation-summary)

---

## 1. What's Already Built

### LiquidConnect (Data Layer) — Complete

| Component | Status | Description |
|-----------|--------|-------------|
| **UVB Schema Extractor** | ✅ | PostgreSQL, DuckDB adapters |
| **Hard Rules Engine** | ✅ | Entity, metric, dimension detection |
| **NL Query Engine** | ✅ | Natural language → LC DSL |
| **DSL Compiler** | ✅ | Scanner, Parser, AST |
| **Semantic Layer** | ✅ | Registry, YAML loader, validation |
| **Resolver** | ✅ | AST → LiquidFlow IR |
| **SQL Emitters** | ✅ | PostgreSQL, DuckDB, Trino |
| **Query Executor** | ✅ | Execution + Provenance metadata |
| **Vocabulary Compiler** | ✅ | Patterns, synonyms, matching |

### LiquidRender (UI Layer) — Complete

| Component | Status | Description |
|-----------|--------|-------------|
| **UI DSL Compiler** | ✅ | `parseUI()`, `compileUI()`, `roundtripUI()` |
| **LiquidUI Renderer** | ✅ | Schema → React components |
| **77 Component Types** | ✅ | Charts, forms, tables, layouts, etc. |
| **Theme System** | ✅ | Default + TurboStarter themes |
| **Data Binding** | ✅ | `resolveBinding()` for data context |
| **Signal System** | ✅ | Reactive state management |
| **Demo Page** | ✅ | `/demo/liquid-render` |

### LiquidCode (DSL Layer) — Partial

| Component | Status | Description |
|-----------|--------|-------------|
| **Survey Compiler** | ✅ | Complete scanner, parser, emitter |
| **LIQUID-SPEC v4.0** | ✅ | Full specification |
| **UI Compiler** | ✅ | Implemented in LiquidRender |

### Knosia Integration — Partial

| Component | Status | Description |
|-----------|--------|-------------|
| **Database Schema** | ✅ | 26 tables (V1 complete) |
| **Vocabulary API** | ✅ | CRUD + resolution algorithm |
| **Canvas Block** | ✅ | `LiquidRenderBlock` component |
| **Onboarding Flow** | ✅ | Connect → Test → Analysis → Review |

---

## 2. The Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          KNOSIA INTEGRATION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  PHASE 1: SCHEMA EXTRACTION (LiquidConnect UVB)                          │   │
│  │                                                                          │   │
│  │  PostgreSQL ─────► extractSchema() ─────► ExtractedSchema               │   │
│  │                          │                     │                         │   │
│  │                          ▼                     ▼                         │   │
│  │                    applyHardRules() ─────► DetectedVocabulary            │   │
│  │                                              │                           │   │
│  │                                              │  {                        │   │
│  │                                              │    entities: [...],       │   │
│  │                                              │    metrics: [...],        │   │
│  │                                              │    dimensions: [...],     │   │
│  │                                              │    relationships: [...]   │   │
│  │                                              │  }                        │   │
│  └──────────────────────────────────────────────┼───────────────────────────┘   │
│                                                 │                               │
│                   ┌─────────────────────────────┼─────────────────────────┐     │
│                   │                             │                         │     │
│                   ▼                             ▼                         ▼     │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────────┐  │
│  │  GLUE 1: DB Store      │  │  GLUE 2: Semantic      │  │  GLUE 3:         │  │
│  │                        │  │                        │  │  Dashboard Spec  │  │
│  │  DetectedVocabulary    │  │  ResolvedVocabulary    │  │                  │  │
│  │         ↓              │  │         ↓              │  │  BusinessType +  │  │
│  │  knosia_vocabulary_item│  │  SemanticLayer YAML    │  │  MappedKPIs      │  │
│  │  (3-level hierarchy)   │  │  (for query engine)    │  │         ↓        │  │
│  │                        │  │                        │  │  DashboardSpec   │  │
│  └────────────────────────┘  └───────────┬────────────┘  └────────┬─────────┘  │
│                                          │                        │            │
│                                          │                        │            │
│  ┌───────────────────────────────────────┴────────────────────────┴─────────┐  │
│  │  PHASE 2: QUERY EXECUTION (LiquidConnect Engine)                          │  │
│  │                                                                           │  │
│  │  SemanticLayer                                                            │  │
│  │       │                                                                   │  │
│  │       ▼                                                                   │  │
│  │  User Query ──► QueryEngine ──► LC DSL ──► Compiler ──► SQL              │  │
│  │  "Show MRR"      nlQuery()      "mrr"      compile()    SELECT...        │  │
│  │                                                              │            │  │
│  │                                                              ▼            │  │
│  │                                                         executeQuery()    │  │
│  │                                                              │            │  │
│  │                                                              ▼            │  │
│  │                                                         QueryResults     │  │
│  │                                                         { rows: [...] }   │  │
│  └──────────────────────────────────────────────────────────────┬────────────┘  │
│                                                                 │               │
│  ┌──────────────────────────────────────────────────────────────┴────────────┐  │
│  │  PHASE 3: UI RENDERING (LiquidRender)                                     │  │
│  │                                                                           │  │
│  │  DashboardSpec ──► GLUE 4: generateLiquidSchema()                         │  │
│  │                              │                                            │  │
│  │                              ▼                                            │  │
│  │                         LiquidSchema                                      │  │
│  │                         {                                                 │  │
│  │                           layers: [{                                      │  │
│  │                             root: {                                       │  │
│  │                               type: 'kpi',                                │  │
│  │                               binding: { kind: 'field', value: 'mrr' },   │  │
│  │                               label: 'Monthly Recurring Revenue'          │  │
│  │                             }                                             │  │
│  │                           }]                                              │  │
│  │                         }                                                 │  │
│  │                              │                                            │  │
│  │                              ▼                                            │  │
│  │  QueryResults ──────────► LiquidUI ──────────► Rendered Dashboard        │  │
│  │  (as data prop)                                                          │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Vocabulary 3-Level Hierarchy

### The Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ORGANIZATION ─────── "What is true"      (governed)           │
│   workspaceId = NULL                                            │
│         ↓                                                       │
│   WORKSPACE ────────── "What is relevant"  (domain-specific)    │
│   workspaceId = "xxx"                                           │
│         ↓                                                       │
│   USER ─────────────── "What matters to me" (personal)          │
│   Stored in knosia_user_vocabulary_prefs                        │
│                                                                 │
│   Resolution Priority: PRIVATE > WORKSPACE > ORG                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│  knosia_vocabulary_item                                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ORG LEVEL (workspaceId = NULL)                                   │  │
│  │  - MRR (canonical definition)                                     │  │
│  │  - Churn Rate (canonical)                                         │  │
│  │  - Customer (entity)                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  WORKSPACE LEVEL (workspaceId = "ws_sales")                       │  │
│  │  - Pipeline Value (sales-specific)                                │  │
│  │  - Deal Velocity (sales-specific)                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  WORKSPACE LEVEL (workspaceId = "ws_product")                     │  │
│  │  - DAU (product-specific)                                         │  │
│  │  - Feature Adoption (product-specific)                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  knosia_user_vocabulary_prefs                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  USER LEVEL (userId + workspaceId)                                │  │
│  │  - favorites: ["mrr", "churn"]                                    │  │
│  │  - synonyms: { "revenue": "mrr", "arr": "mrr * 12" }              │  │
│  │  - privateVocabulary: [                                           │  │
│  │      { slug: "my_conversion", formula: "deals_won/deals * 100" }  │  │
│  │    ]                                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Resolution Algorithm

```
┌─────────────────────────────────┐
│  THE RESOLUTION LAYER           │
│  (already implemented!)         │
│                                 │
│Org Items ───────►│                                 │
│              │  resolveVocabulary()            │
│Workspace Items ─►│         ↓                       │────► ResolvedVocabulary
│              │  MERGE with priority            │      (unified view)
│User Prefs ──────►│  PRIVATE > WORKSPACE > ORG      │
│              │                                 │
└─────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  Everything downstream uses     │
│  ResolvedVocabulary, NOT raw    │
│  DetectedVocabulary             │
│                                 │
│  • SemanticLayer generation     │
│  • Dashboard generation         │
│  • Query engine context         │
│  • NL query resolution          │
└─────────────────────────────────┘
```

---

## 4. Complete Pipeline Example: Query to UI

### User Input

```
"Show me MRR by month"
```

### Step 1: NL Query Engine

```typescript
import { nlQuery, compileVocabulary } from '@repo/liquid-connect';

const vocab = compileVocabulary(resolvedVocabulary);
const result = nlQuery("Show me MRR by month", vocab);

// Output:
{
  query: "mrr by month",           // Normalized LC DSL
  confidence: 0.95,
  slots: {
    metric: "mrr",
    dimension: "month"
  }
}
```

### Step 2: LC DSL Compiler

```typescript
import { parseToAST } from '@repo/liquid-connect';

const ast = parseToAST("mrr by month");

// Output: QueryNode AST
{
  type: "query",
  metrics: [{ type: "metric", name: "mrr" }],
  dimensions: [{ type: "dimension", name: "month" }],
  filters: [],
  time: null,
  limit: null
}
```

### Step 3: Resolver

```typescript
import { Resolver, createRegistry } from '@repo/liquid-connect';

// SemanticLayer generated from ResolvedVocabulary
const semanticLayer = {
  version: '1.0',
  name: 'saas_metrics',
  sources: {
    subscriptions: { type: 'table', table: 'subscriptions' }
  },
  metrics: {
    mrr: {
      type: 'simple',
      aggregation: 'sum',
      expression: 'subscriptions.amount',
      entity: 'subscriptions',
      timeField: 'created_at'
    }
  },
  dimensions: {
    month: {
      entity: 'subscriptions',
      expression: "DATE_TRUNC('month', subscriptions.created_at)",
      type: 'timestamp',
      isTime: true
    }
  }
};

const registry = createRegistry(semanticLayer);
const resolver = new Resolver(registry);
const resolution = resolver.resolve(ast);

// Output: LiquidFlow IR
{
  version: "1.0",
  type: "metric",
  metrics: [{
    name: "mrr",
    expression: "SUM(subscriptions.amount)",
    aggregation: "sum"
  }],
  dimensions: [{
    name: "month",
    expression: "DATE_TRUNC('month', subscriptions.created_at)"
  }],
  sources: [{
    name: "subscriptions",
    table: "subscriptions"
  }]
}
```

### Step 4: SQL Emitter

```typescript
import { emit } from '@repo/liquid-connect';

const sqlResult = emit(liquidFlow, 'postgres');

// Output:
{
  sql: `
    SELECT
      DATE_TRUNC('month', subscriptions.created_at) AS month,
      SUM(subscriptions.amount) AS mrr
    FROM subscriptions
    GROUP BY DATE_TRUNC('month', subscriptions.created_at)
    ORDER BY month ASC
  `,
  params: []
}
```

### Step 5: Query Executor

```typescript
import { executeQuery } from '@repo/liquid-connect';

const results = await executeQuery(sqlResult.sql, connectionAdapter);

// Output: Query Results
{
  rows: [
    { month: "2024-01-01", mrr: 125000 },
    { month: "2024-02-01", mrr: 132000 },
    { month: "2024-03-01", mrr: 145000 },
    { month: "2024-04-01", mrr: 151000 },
    { month: "2024-05-01", mrr: 168000 },
    { month: "2024-06-01", mrr: 175000 }
  ],
  metadata: {
    executionTime: 45,
    rowCount: 6
  },
  provenance: {
    confidence: 0.95,
    sources: ["subscriptions"],
    freshness: "2 minutes ago"
  }
}
```

### Step 6: LiquidSchema Generation

```typescript
const schema: LiquidSchema = {
  version: "1.0",
  signals: [],
  layers: [{
    id: 0,
    visible: true,
    root: {
      uid: "chart_mrr_by_month",
      type: "line",
      binding: {
        kind: "field",
        value: "rows",
        x: "month",
        y: "mrr"
      },
      label: "MRR by Month",
      style: { color: "blue" }
    }
  }]
};
```

### Step 7: LiquidUI Renderer

```tsx
import { LiquidUI } from '@repo/liquid-render';

<LiquidUI
  schema={schema}
  data={{ rows: results.rows }}
/>
```

### Step 8: Rendered UI

```
┌────────────────────────────────────────────────────────────────────────┐
│  MRR by Month                                                          │
│                                                                        │
│  $175K ┤                                                    ●──────    │
│        │                                              ●─────           │
│  $150K ┤                                    ●─────────                 │
│        │                              ●─────                           │
│  $125K ┤                  ●───────────                                 │
│        │        ●─────────                                             │
│  $100K ┤────────                                                       │
│        └────────┬─────────┬──────────┬──────────┬──────────┬────────   │
│               Jan       Feb        Mar        Apr        May       Jun │
│                                                                        │
│  ✓ 95% confidence  •  Source: subscriptions  •  Updated 2 min ago     │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Binding Flow

```
LiquidSchema                          Data (from query)
─────────────                         ─────────────────
binding: {                            {
  kind: "field",                        rows: [
  value: "rows",  ──────────────────►     { month: "2024-01", mrr: 125000 },
  x: "month",     ──────────────────►     { month: "2024-02", mrr: 132000 },
  y: "mrr"        ──────────────────►     ...
}                                       ]
                                      }
          │
          ▼
    resolveBinding()
          │
          ▼
    LineChart component receives:
    [
      { x: "2024-01", y: 125000 },
      { x: "2024-02", y: 132000 },
      ...
    ]
```

### Code Summary

```typescript
// The complete pipeline in ~20 lines

import { nlQuery, compileVocabulary, compile, emit, executeQuery } from '@repo/liquid-connect';
import { LiquidUI } from '@repo/liquid-render';

// 1. NL → LC DSL
const { query } = nlQuery("Show me MRR by month", compiledVocab);

// 2-4. LC DSL → SQL
const sql = compile(query, semanticLayer, 'postgres');

// 5. Execute
const results = await executeQuery(sql, adapter);

// 6. Generate schema
const schema = generateChartSchema('line', 'rows', 'month', 'mrr', 'MRR by Month');

// 7-8. Render
<LiquidUI schema={schema} data={{ rows: results.rows }} />
```

---

## 5. The Glue Code (What We Need to Build)

### Overview

| From | To | Transformer | Status | LOC |
|------|-----|-------------|--------|-----|
| ExtractedSchema | DetectedVocabulary | `applyHardRules()` | ✅ Built | - |
| DetectedVocabulary | knosia_vocabulary_item | `saveDetectedVocabulary()` | 🆕 Need | ~100 |
| DetectedVocabulary | SemanticLayer | `generateSemanticLayer()` | 🆕 Need | ~150 |
| Schema | BusinessType | `detectBusinessType()` (detector.ts ~200 LOC) | 🆕 Need | ~200 |
| BusinessType + Mapping | DashboardSpec | `generateDashboardSpec()` | 🆕 Need | ~150 |
| DashboardSpec | LiquidSchema | `dashboardSpecToLiquidSchema()` | 🆕 Need | ~100 |
| SemanticLayer + Query | SQL | `query()` / `compile()` | ✅ Built | - |
| SQL | Results | `executeQuery()` | ✅ Built | - |
| LiquidSchema + Data | UI | `<LiquidUI />` | ✅ Built | - |

**Core Glue Code: ~700 LOC**
**Full Implementation (incl. business-types module ~400 LOC + templates ~300 LOC): ~1,250 LOC**
**Complete System (incl. UI pages ~1,400 LOC): ~2,650 LOC**

**Implementation Phases:** See `.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md`
- **Phase 0:** Business type detection (Days 1-2)
- **Phase 1:** Glue code (Days 3-4)
- **Phase 2:** Onboarding enhancements (Days 5-6)
- **Phase 3:** Home & Canvas (Days 7-10)
- **Phase 4:** Polish (Days 11-14)

**Timeline Reference:** Full 14-day implementation breakdown in 1600 doc.

### GLUE 1: DetectedVocabulary → knosia_vocabulary_item

```typescript
async function saveDetectedVocabulary(
  detected: DetectedVocabulary,
  orgId: string,
  workspaceId: string,
  options?: { promoteToOrg?: string[] }
): Promise<void> {
  for (const metric of detected.metrics) {
    await db.insert(knosiaVocabularyItem).values({
      id: generateId(),
      orgId,
      workspaceId,            // WORKSPACE level by default
      canonicalName: metric.suggestedDisplayName ?? metric.name,
      slug: slugify(metric.name),
      type: 'metric',
      definition: {
        formulaSql: `${metric.aggregation}(${metric.table}.${metric.column})`,
        sourceTables: [metric.table],
        sourceColumn: metric.column,
      },
      aggregation: metric.aggregation,
      aggregationConfidence: Math.round(metric.certainty * 100),
      status: metric.certainty >= 0.8 ? 'approved' : 'draft',
    });

    // Optional org-level promotion
    if (options?.promoteToOrg?.includes(metric.name)) {
      await db.insert(knosiaVocabularyItem).values({
        ...sameValues,
        workspaceId: null,    // ORG level
      });
    }
  }
  // Similar for dimensions, entities...
}
```

**Note:** The `aggregationConfidence` field stores detection certainty (0-100) to help users understand which vocabulary items were confidently identified vs. requiring review.

### GLUE 2: ResolvedVocabulary → SemanticLayer

```typescript
async function generateSemanticLayerForUser(
  userId: string,
  workspaceId: string,
  schema: ExtractedSchema
): Promise<SemanticLayer> {
  // Use existing resolution algorithm
  const resolved = await resolveVocabulary(userId, workspaceId);

  return {
    version: '1.0',
    name: `user_${userId}_semantic`,

    sources: Object.fromEntries(
      schema.tables.map(t => [t.name, {
        type: 'table',
        schema: t.schema,
        table: t.name,
        primaryKey: t.primaryKeyColumns,
      }])
    ),

    metrics: Object.fromEntries(
      resolved.items
        .filter(item => item.type === 'metric')
        .map(item => [item.slug, {
          type: 'simple',
          aggregation: item.aggregation?.toLowerCase() ?? 'sum',
          expression: item.definition?.formulaSql,
          entity: item.definition?.sourceTables?.[0],
        }])
    ),

    dimensions: Object.fromEntries(
      resolved.items
        .filter(item => item.type === 'dimension')
        .map(item => [item.slug, {
          entity: item.definition?.sourceTables?.[0],
          expression: item.definition?.formulaSql,
          type: 'string',
        }])
    ),

    relationships: [], // Build from detected relationships
  };
}
```

### GLUE 3: Business Type Detection

**Source of Truth:** See `.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md` for the canonical detection algorithm.

**Canonical BusinessType Enum (9 types total):**
```typescript
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
```

**V1 Scope (4 types):** saas, ecommerce, marketplace, custom
**V2 Scope (5 additional):** fintech, healthcare, edtech, media, logistics

**Template Structure (BusinessTypeTemplate):**
```typescript
interface BusinessTypeTemplate {
  id: BusinessType;
  name: string;
  description: string;
  kpis: {
    primary: KPIDefinition[];    // Core metrics
    secondary: KPIDefinition[];  // Nice-to-have metrics
  };
  entities: EntityExpectation[];
  dashboard: {
    layout: "executive" | "operational" | "detailed";
    sections: DashboardSection[];
  };
  questions: string[];  // Common questions for this business type
}
```

**Example SaaS Template Reference:** See `.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md` lines 489-580 for complete saas.ts template specification.

**File Structure:**
- **detector.ts** (~200 LOC): Pattern matching logic
- **business-types module** (~400 LOC total): signatures.ts, types.ts, templates/, mapper.ts

**Catalog Structure (V1 vs V2):**
```
packages/liquid-connect/src/business-types/
├── catalog/
│   ├── v1/              # V1 templates (4 types)
│   │   ├── saas.ts
│   │   ├── ecommerce.ts
│   │   ├── marketplace.ts
│   │   └── custom.ts
│   └── v2/              # V2 templates (5 additional)
│       ├── fintech.ts
│       ├── healthcare.ts
│       ├── edtech.ts
│       ├── media.ts
│       └── logistics.ts
```

```typescript
type BusinessType = "saas" | "ecommerce" | "marketplace" | "fintech" | "custom";

interface BusinessTypeMatch {
  type: BusinessType;
  confidence: number;
  signals: string[];
}

function detectBusinessType(schema: ExtractedSchema): BusinessTypeMatch {
  const signals: { type: BusinessType; signal: string; weight: number }[] = [];

  // Check table patterns
  for (const table of schema.tables) {
    if (/subscription/i.test(table.name)) {
      signals.push({ type: 'saas', signal: `Table: ${table.name}`, weight: 30 });
    }
    if (/order|product|cart/i.test(table.name)) {
      signals.push({ type: 'ecommerce', signal: `Table: ${table.name}`, weight: 25 });
    }
    // ... more patterns
  }

  // Aggregate by type
  const byType = groupBy(signals, 'type');
  const scores = Object.entries(byType).map(([type, sigs]) => ({
    type: type as BusinessType,
    confidence: Math.min(100, sigs.reduce((sum, s) => sum + s.weight, 0)),
    signals: sigs.map(s => s.signal),
  }));

  return scores.sort((a, b) => b.confidence - a.confidence)[0]
    ?? { type: 'custom', confidence: 0, signals: [] };
}
```

### GLUE 4: DashboardSpec → LiquidSchema

```typescript
function dashboardSpecToLiquidSchema(spec: DashboardSpec): LiquidSchema {
  const blocks: Block[] = [];
  let uid = 0;

  for (const section of spec.sections) {
    // KPI grid
    blocks.push({
      uid: `grid_${uid++}`,
      type: 'grid',
      layout: { columns: section.kpis.length },
      children: section.kpis.map(kpi => ({
        uid: `kpi_${uid++}`,
        type: 'kpi',
        binding: { kind: 'field', value: kpi.binding },
        label: kpi.name,
      })),
    });

    // Chart if present
    if (section.chart) {
      blocks.push({
        uid: `chart_${uid++}`,
        type: section.chart.type,
        binding: {
          kind: 'field',
          value: section.chart.binding,
          x: section.chart.xField,
          y: section.chart.yField,
        },
        label: section.chart.name,
      });
    }
  }

  return {
    version: '1.0',
    signals: [],
    layers: [{
      id: 0,
      visible: true,
      root: { uid: 'root', type: 'container', children: blocks },
    }],
  };
}
```

---

## 6. Zero-Code Platform Vision

### Evolution from Analytics to Full Platform

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         KNOSIA EVOLUTION PATH                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  TODAY (V1): Analytics Platform                                                 │
│  ─────────────────────────────────                                              │
│  • READ operations (SELECT)                                                     │
│  • Dashboards & KPIs                                                            │
│  • Natural language queries                                                     │
│  • Role-based views                                                             │
│                                                                                 │
│                              ↓                                                  │
│                                                                                 │
│  FUTURE (V3+): Zero-Code Business Platform                                      │
│  ─────────────────────────────────────────                                      │
│  • READ + WRITE + DELETE (full CRUD)                                            │
│  • Custom forms & workflows                                                     │
│  • Business rules & validations                                                 │
│  • Automations & triggers                                                       │
│  • Custom applications                                                          │
│  • Multi-tenant white-label                                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### LiquidCode Already Supports Mutations

```
# From LIQUID-SPEC.md - already defined!

Mutation    := Op Target Value?
Op          := '+' | '-' | '~' | '^'
Target      := '@' Ref

# Examples:
+@user { name: "John", email: "j@x.com" }   # INSERT
~@user.123 { name: "Jane" }                  # UPDATE
-@user.123                                    # DELETE
^@order.status "shipped"                      # STATE CHANGE
```

### Full CRUD Application Example

```
# A complete customer management app in DSL

@mode @selected @form

# Header
Hd "Customer Management"

# Toolbar
0 [
  Bt "New" >mode="create"
  Bt "Refresh" >refresh
  In :search <>filter.search
]

# Data Table (READ)
5 :customers [:name :email :status :created_at] >selected ?@mode="list"

# Detail View (READ single)
0 ?@selected [
  8 [
    Tx :.name %lg
    Tx :.email
    Tg :.status
    0 [
      Bt "Edit" >mode="edit"
      Bt "Delete" !delete >confirm
    ]
  ]
]

# Create/Edit Form (WRITE)
0 ?@mode="create"|@mode="edit" [
  6 [
    In :name <>form.name @required
    In :email <>form.email @email
    Sl :status [:options] <>form.status

    0 [
      Bt "Cancel" >mode="list" !reset
      Bt "Save" !submit >+@customers   # ← INSERT mutation
    ]
  ]
]

# Delete Confirmation Modal
/1 9 "Confirm Delete" ?@confirm [
  Tx "Are you sure you want to delete this customer?"
  0 [
    Bt "Cancel" /<
    Bt "Delete" #red >-@customers.@selected /<  # ← DELETE mutation
  ]
]
```

### Zero-Code Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ZERO-CODE PLATFORM ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LIQUID-CONNECT (Extended)                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                        │    │
│  │  Query Engine (TODAY)              Mutation Engine (FUTURE)            │    │
│  │  ─────────────────────             ─────────────────────────           │    │
│  │  • NL → SELECT                     • NL → INSERT/UPDATE/DELETE         │    │
│  │  • Aggregations                    • Validations                       │    │
│  │  • Joins                           • Transactions                      │    │
│  │  • Time intelligence               • Audit trails                      │    │
│  │                                                                        │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │    │
│  │  │  Workflow Engine (FUTURE)                                        │ │    │
│  │  │  • State machines                                                │ │    │
│  │  │  • Triggers (on insert, on update)                               │ │    │
│  │  │  • Scheduled jobs                                                │ │    │
│  │  │  • Webhooks                                                      │ │    │
│  │  └──────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                        │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │    │
│  │  │  Business Rules Engine (FUTURE)                                  │ │    │
│  │  │  • Validation rules                                              │ │    │
│  │  │  • Computed fields                                               │ │    │
│  │  │  • Permission rules                                              │ │    │
│  │  └──────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                        │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  VOCABULARY (Extended)                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                        │    │
│  │  Metrics/Dimensions (TODAY)        Actions/Workflows (FUTURE)          │    │
│  │  ─────────────────────────         ─────────────────────────           │    │
│  │  • "MRR" = SUM(amount)             • "Approve Order" = workflow        │    │
│  │  • "Churn" = formula               • "Send Invoice" = action           │    │
│  │  • "Customer" = entity             • "Onboard Customer" = process      │    │
│  │                                                                        │    │
│  │  Same 3-level governance: ORG → WORKSPACE → USER                       │    │
│  │                                                                        │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  LIQUID-RENDER (Extended)                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                        │    │
│  │  Display Components (TODAY)        App Components (FUTURE)             │    │
│  │  ─────────────────────────         ─────────────────────────           │    │
│  │  • Charts, KPIs, Tables            • Page layouts                      │    │
│  │  • Forms, Inputs                   • Navigation                        │    │
│  │  • Cards, Lists                    • Auth flows                        │    │
│  │                                    • Multi-step wizards                │    │
│  │                                                                        │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │    │
│  │  │  App Builder (FUTURE)                                            │ │    │
│  │  │  • Drag & drop UI builder                                        │ │    │
│  │  │  • Page templates                                                │ │    │
│  │  │  • Component marketplace                                         │ │    │
│  │  └──────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                        │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### The Ultimate Vision

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   "Connect your database, get a complete business application in 60 seconds"   │
│                                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │  Database   │───▶│  Vocabulary │───▶│  Semantic   │───▶│    App      │     │
│   │  Schema     │    │  Detection  │    │   Layer     │    │  Generation │     │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                                   │             │
│                                                                   ▼             │
│   ┌─────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                         │  │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│   │   │Dashboard│  │  CRUD   │  │ Reports │  │Workflows│  │  Admin  │      │  │
│   │   │  Page   │  │  Pages  │  │  Page   │  │  Page   │  │  Page   │      │  │
│   │   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │  │
│   │                                                                         │  │
│   │                    All generated from LiquidCode DSL                    │  │
│   │                    All governed by Vocabulary                           │  │
│   │                    All personalized per user/role                       │  │
│   │                                                                         │  │
│   └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Knosia Evolution Path

| Phase | Capability | Architecture Addition | Timeline |
|-------|------------|----------------------|----------|
| **V1** | Analytics & Dashboards | Query engine, READ only | Now |
| **V2** | Forms & Basic CRUD | Mutation emitters | +2 months |
| **V3** | Workflows & Automation | Workflow engine | +4 months |
| **V4** | Business Rules | Rules engine | +6 months |
| **V5** | App Builder | Visual DSL editor | +9 months |
| **V6** | Marketplace | Component & template sharing | +12 months |

### Why It Scales

1. **DSL is the Foundation** — Adding capabilities = extending grammar, not rebuilding

2. **Vocabulary Governs Everything** — Same 3-level hierarchy for actions, workflows, permissions

3. **Semantic Layer Handles Complexity** — Already abstracts database; same pattern for mutations

4. **Multi-Tenant by Design** — Organizations, workspaces, user preferences already exist

---

## 8. Implementation Summary

### The Leverage Ratio

```
Existing systems:  ~13,000+ LOC (already working)
Core glue code:    ~700 LOC
Full implementation: ~1,250 LOC (incl. templates)
Complete system:   ~2,650 LOC (incl. UI pages)
─────────────────────────────────
Leverage ratio:    18:1 (core glue)
                   10:1 (full implementation)
                   5:1 (complete system)
```

### Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐   │
│  │  UVB    │     │ Vocab   │     │ Query   │     │ Render  │   │
│  │ (built) │────►│ (built) │────►│ (built) │────►│ (built) │   │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘   │
│       │               │               │               │         │
│       └───────────────┴───────────────┴───────────────┘         │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │  700 LOC    │                              │
│                    │  GLUE CODE  │                              │
│                    │  (new)      │                              │
│                    └─────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What 700 LOC Gets You

- **60-second onboarding** → schema to dashboard
- **3-level vocabulary** → org/workspace/user governance
- **Personalized dashboards** → role-aware, favorites-first
- **Natural language queries** → "show me MRR by month"
- **Multi-database** → Postgres, DuckDB, Trino
- **77 component types** → charts, tables, KPIs, forms
- **Scalable to full platform** → CRUD, workflows, apps

---

## Appendix A: Database Schema (V1 Complete)

### 26 Tables

**Platform (2 tables):**
- `knosia_organization` — Top-level org with guest TTL
- `knosia_workspace` — Bounded context with vocabulary

**Connection (3 tables):**
- `knosia_connection` — Database credentials
- `knosia_connection_health` — Status tracking
- `knosia_connection_schema` — Cached schema snapshot
- `knosia_workspace_connection` — Workspace-connection join

**Vocabulary (3 tables):**
- `knosia_vocabulary_item` — Metrics, dimensions, entities (3-level hierarchy)
- `knosia_vocabulary_version` — Version history
- `knosia_user_vocabulary_prefs` — User-level favorites, synonyms, private vocab

**Role (1 table):**
- `knosia_role_template` — Cognitive profiles

**User (2 tables):**
- `knosia_workspace_membership` — User-workspace membership
- `knosia_user_preference` — User settings

**Intelligence (3 tables):**
- `knosia_analysis` — Schema analysis runs
- `knosia_thread` — Conversation sessions (renamed from conversation)
- `knosia_thread_message` — Chat messages
- `knosia_thread_snapshot` — Thread state snapshots

**Governance (1 table):**
- `knosia_mismatch_report` — User-reported vocabulary issues

**Canvas (3 tables):**
- `knosia_canvas` — Interactive dashboards
- `knosia_canvas_block` — Canvas components
- `knosia_canvas_alert` — Threshold alerts

**Collaboration (2 tables):**
- `knosia_comment` — Comments on threads/blocks
- `knosia_activity` — Activity feed

**Notifications (3 tables):**
- `knosia_notification` — User notifications
- `knosia_digest` — Scheduled digest settings
- `knosia_ai_insight` — AI-generated insights

**Scope Badges:**
We chose NOT to add a dedicated `scope` column to `knosia_vocabulary_item`. Instead, scope is derived:
- `workspaceId = NULL` → "org" scope
- `workspaceId != NULL` → "workspace" scope
- User-level items → stored in `knosia_user_vocabulary_prefs.privateVocabulary`

This design avoids redundancy and enforces consistency through database constraints.

---

## References

| Document | Location |
|----------|----------|
| LIQUID-SPEC v4.0 | `packages/liquid-code/specs/LIQUID-SPEC.md` |
| LiquidConnect exports | `packages/liquid-connect/src/index.ts` |
| LiquidRender exports | `packages/liquid-render/src/index.ts` |
| UVB models | `packages/liquid-connect/src/uvb/models.ts` |
| Semantic types | `packages/liquid-connect/src/semantic/types.ts` |
| UI emitter types | `packages/liquid-render/src/compiler/ui-emitter.ts` |
| Vocabulary schema | `packages/db/src/schema/knosia.ts` |
| Canvas block | `apps/web/src/modules/knosia/canvas/components/blocks/liquid-render-block.tsx` |
| Demo page | `apps/web/src/modules/liquid-demo/components/demo-view.tsx` |
| Implementation Plan | `.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md` |
| Glue Blueprint | `.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md` |

---

*This document consolidates the Knosia platform architecture, integration design, and evolution path. Use as the source of truth for implementation decisions.*
