# Knosia Calculated Metrics - Architecture-Aligned Implementation Plan

**Version:** 2.0 (Architecture-Aligned)
**Date:** 2026-01-04
**Status:** Ready for Implementation
**Replaces:** `2026-01-04-METRICS-IMPLEMENTATION-GUIDE.md` (V1)

---

## What Changed from V1

**Key Corrections:**
1. ✅ **Integration Point:** Metrics generate DURING SSE analysis stream (Step 4.5), not post-analysis
2. ✅ **Profiling Usage:** Uses V2 profiling data to inform LLM (20% accuracy boost)
3. ✅ **Pipeline Flow:** Fits into existing `analyzeConnection()` SSE stream
4. ✅ **Vocabulary Distinction:** Calculated metrics are DERIVED from base vocabulary (different tables)
5. ✅ **Architecture Patterns:** Follows exact module structure from 26-table reference

**What Stayed the Same:**
- ✅ UX decision: Metrics tab in Vocabulary page (validated)
- ✅ Phase 1 + Phase 2 implementation (semantic definitions + execution)
- ✅ Database-agnostic approach via LiquidConnect
- ✅ 3-5 day parallel development plan

---

## Executive Summary

**What We're Building:** AI-generated business KPIs that transform base vocabulary into calculated metrics (e.g., "MRR = SUM(amount) WHERE status='active'")

**Key Insight:** Vocabulary contains BASE metrics (`amount`, `quantity`), Calculated Metrics are DERIVED KPIs (`Monthly Recurring Revenue`, `Customer Acquisition Cost`)

**Architecture Fit:**
```
SSE Analysis Stream (analyzeConnection)
├─ Step 3: Detect business type
├─ Step 3.5: Profile schema (V2) → ProfilingData
├─ Step 4: Apply hard rules → DetectedVocabulary (BASE metrics)
├─ Step 4.5: Generate calculated metrics (NEW) → CalculatedMetric[] (DERIVED KPIs)
│    ├─ Input: DetectedVocabulary + ProfilingData + BusinessType
│    ├─ LLM generates semantic definitions
│    └─ Store in calculated_metric table
├─ Step 5: Generate vocabulary summary
└─ Step 6-8: Profiling UI steps
```

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Integration](#architecture-integration)
3. [Base vs Calculated Metrics](#base-vs-calculated-metrics)
4. [SSE Stream Integration](#sse-stream-integration)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Frontend Components](#frontend-components)
8. [Implementation Plan](#implementation-plan)
9. [Testing Strategy](#testing-strategy)
10. [Success Criteria](#success-criteria)

---

## Prerequisites {#prerequisites}

### Required Reading (In Order)

| Document | What to Understand | Location |
|----------|-------------------|----------|
| **Knosia Architecture** | Complete system design, 26 tables, SSE stream | `.docs/knosia-architecture.md` |
| **Phase 1: Semantic Layer** | Why semantic definitions vs raw SQL | `.artifacts/2026-01-04-semantic-layer-refactor.md` |
| **Phase 2: Execution** | How recipe execution works | `.artifacts/2026-01-04-2030-phase2-calculated-metrics-execution.md` |
| **Phase 1+2 Validation** | Test results proving Phase 1+2 work | `.artifacts/2026-01-04-phase1-phase2-test-validation.md` |

### Key Architecture Files to Review

| File | What to Understand |
|------|-------------------|
| `packages/api/src/modules/knosia/analysis/queries.ts` | SSE stream, where to integrate (lines 351-450) |
| `packages/api/src/modules/knosia/analysis/calculated-metrics.ts` | Existing Phase 1 implementation |
| `packages/liquid-connect/src/uvb/rules.ts` | How profiling enhances vocabulary detection |
| `packages/liquid-connect/src/uvb/models.ts` | ProfilingData structure (line 281) |
| `packages/db/src/schema/knosia.ts` | 26 existing tables |
| `packages/ai/src/modules/kpi/recipe-generator.ts` | Phase 1+2 implementation (tested) |

---

## Architecture Integration {#architecture-integration}

### Current Knosia Pipeline (V1 + V2 Profiling)

```
┌──────────────────────────────────────────────────────────────┐
│ SSE Analysis Stream: analyzeConnection()                     │
│ File: packages/api/src/modules/knosia/analysis/queries.ts   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Step 1: Connect to database                                 │
│   └─ DuckDBUniversalAdapter.connect()                       │
│                                                              │
│ Step 2: Extract schema                                      │
│   └─ extractSchema() → ExtractedSchema                      │
│                                                              │
│ Step 3: Detect business type                                │
│   └─ detectBusinessType() → "SaaS" | "E-commerce" | ...     │
│                                                              │
│ Step 3.5: Profile schema (V2 - always runs)                 │
│   ├─ profileSchema(adapter, schema)                         │
│   ├─ extractProfilingData(profiledSchema)                   │
│   └─ Returns: ProfilingData                                 │
│       ├─ cardinality per column                             │
│       ├─ null percentage                                    │
│       ├─ data freshness                                     │
│       └─ distinct values (for enums)                        │
│                                                              │
│ Step 4: Apply hard rules (WITH profiling data)              │
│   ├─ applyHardRules(schema, { profilingData })              │
│   └─ Returns: DetectedVocabulary                            │
│       ├─ metrics: ["amount", "quantity", "price"]           │
│       ├─ dimensions: ["status", "customer_id"]              │
│       ├─ entities: ["subscriptions", "customers"]           │
│       └─ timeFields: ["created_at", "updated_at"]           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### NEW: Step 4.5 Integration

```
┌──────────────────────────────────────────────────────────────┐
│ Step 4.5: Generate Calculated Metrics (NEW)                 │
│ File: packages/api/src/modules/knosia/analysis/queries.ts   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Function: generateAndStoreCalculatedMetrics()                │
│                                                              │
│ Input:                                                       │
│   ├─ detectedVocabulary (from Step 4)                       │
│   ├─ profilingData (from Step 3.5)                          │
│   ├─ businessType (from Step 3)                             │
│   ├─ extractedSchema (from Step 2)                          │
│   ├─ connectionId                                            │
│   └─ workspaceId                                             │
│                                                              │
│ Flow:                                                        │
│   1. Build enhanced vocabulary context:                     │
│      ├─ Base metrics from detectedVocabulary                │
│      ├─ Profiling insights (high-cardinality columns)       │
│      ├─ Enum fields (for smart filters)                     │
│      └─ Required fields (for validation warnings)           │
│                                                              │
│   2. Call enrichVocabularyWithCalculatedMetrics():          │
│      ├─ LLM generates 5-10 KPI recipes                      │
│      ├─ Uses profiling to avoid bad metrics                 │
│      ├─ Example: Skips high-cardinality IDs as metrics      │
│      └─ Returns: CalculatedMetricRecipe[]                   │
│                                                              │
│   3. Filter and store recipes:                              │
│      ├─ Filter: feasible=true, confidence>0.7               │
│      ├─ Categorize: "revenue", "growth", "operational"      │
│      ├─ Store in calculated_metric table                    │
│      └─ Link to vocabulary items (lineage tracking)         │
│                                                              │
│   4. Update analysis record:                                │
│      ├─ calculatedMetricsGenerated: 8                       │
│      ├─ calculatedMetricsFeasible: 6                        │
│      └─ SSE event: "step" (calculated metrics generated)    │
│                                                              │
│ Output:                                                      │
│   └─ storedMetrics: CalculatedMetric[] (DB records)         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Complete Augmented Flow

```
Step 1: Connect → Step 2: Extract → Step 3: Business Type
                                              ↓
                                   Step 3.5: Profile (V2)
                                              ↓
                                   Step 4: Hard Rules (BASE vocabulary)
                                              ↓
                         Step 4.5: Generate Calculated Metrics (NEW - DERIVED KPIs)
                                              ↓
                                   Step 5: Vocabulary Summary
                                              ↓
                                   Step 6-8: Profiling UI
```

---

## Base vs Calculated Metrics {#base-vs-calculated-metrics}

### Understanding the Distinction

**This is critical to understand:**

| Aspect | Base Metrics (Vocabulary) | Calculated Metrics (NEW) |
|--------|--------------------------|--------------------------|
| **Source** | Detected from schema | Generated by LLM |
| **Table** | `knosiaVocabularyItem` | `calculatedMetric` |
| **Example** | `amount` (column) | `Monthly Recurring Revenue` (KPI) |
| **Definition** | `{ column: "amount", aggregation: "SUM" }` | `{ expression: "amount", aggregation: "SUM", filters: [...] }` |
| **When Created** | Step 4 (applyHardRules) | Step 4.5 (LLM generation) |
| **Complexity** | Simple (1:1 with columns) | Complex (formulas, filters, conditions) |
| **User Edits** | Alias only | Full definition |

### Example Comparison

**Base Metric (from Vocabulary):**
```json
{
  "id": "voc_123",
  "type": "metric",
  "name": "amount",
  "table": "subscriptions",
  "column": "amount",
  "dataType": "DECIMAL",
  "aggregation": "SUM",
  "semanticType": "measure"
}
```

**Calculated Metric (DERIVED from base):**
```json
{
  "id": "calc_456",
  "name": "Monthly Recurring Revenue",
  "category": "revenue",
  "semanticDefinition": {
    "type": "simple",
    "expression": "amount",  // ← References base metric
    "aggregation": "SUM",
    "entity": "subscriptions",
    "timeField": "created_at",
    "timeGranularity": "month",
    "filters": [
      { "field": "status", "operator": "=", "value": "active" },
      { "field": "type", "operator": "=", "value": "recurring" }
    ],
    "format": { "type": "currency", "currency": "USD" }
  },
  "vocabularyItemIds": ["voc_123"],  // ← Lineage to base metric
  "confidence": 0.95,
  "feasible": true
}
```

### Why Separate Tables?

1. **Different Lifecycle:**
   - Base: Changes with schema migrations
   - Calculated: Changes with business logic

2. **Different Permissions:**
   - Base: Auto-detected (read-only except aliases)
   - Calculated: User-creatable, editable, deletable

3. **Different UI:**
   - Base: In Vocabulary Overview/Semantic tabs
   - Calculated: In Vocabulary Metrics tab

4. **Different Features:**
   - Base: No execution (just definitions)
   - Calculated: Executable (Phase 2), cacheable, trendable

---

## SSE Stream Integration {#sse-stream-integration}

### Current SSE Events (8 steps)

**File:** `packages/api/src/modules/knosia/analysis/queries.ts:185-260`

```typescript
// Existing events
{ event: "step", data: { step: 1, status: "started", label: "Connecting..." } }
{ event: "step", data: { step: 2, status: "completed", label: "Schema extracted" } }
{ event: "step", data: { step: 3, status: "completed", label: "Business type detected" } }
{ event: "step", data: { step: 3.5, status: "completed", label: "Data profiled" } }
{ event: "step", data: { step: 4, status: "completed", label: "Vocabulary detected" } }
```

### NEW: Step 4.5 Events

```typescript
// NEW event (after Step 4, before Step 5)
{
  event: "step",
  data: {
    step: 4.5,
    status: "started",
    label: "Generating business metrics",
    detail: "Analyzing vocabulary to generate calculated KPIs..."
  }
}

// On completion
{
  event: "step",
  data: {
    step: 4.5,
    status: "completed",
    label: "Metrics generated",
    detail: `Generated 8 calculated metrics (6 feasible)`,
    metrics: {
      total: 8,
      feasible: 6,
      categories: ["revenue", "growth", "operational"]
    }
  }
}

// On error (graceful degradation - analysis continues)
{
  event: "step",
  data: {
    step: 4.5,
    status: "warning",
    label: "Metric generation skipped",
    detail: "LLM unavailable, continuing without calculated metrics"
  }
}
```

### Implementation Code

**File:** `packages/api/src/modules/knosia/analysis/queries.ts` (insert after line 420)

```typescript
// Step 4 completed: detectedVocabulary available
yield createSSEEvent("step", {
  step: 4,
  status: "completed",
  label: "Vocabulary detected",
  detail: `Found ${detectedVocabulary.metrics.length} metrics, ${detectedVocabulary.dimensions.length} dimensions`,
});

// ────────────────────────────────────────────────────────────────
// NEW: Step 4.5 - Generate Calculated Metrics
// ────────────────────────────────────────────────────────────────

yield createSSEEvent("step", {
  step: 4.5,
  status: "started",
  label: "Generating business metrics",
  detail: "Analyzing vocabulary to generate calculated KPIs...",
});

try {
  const calculatedMetricsResult = await generateAndStoreCalculatedMetrics({
    detectedVocabulary,
    profilingData,
    businessType: businessTypeResult.detected,
    extractedSchema: schema,
    connectionId,
    workspaceId,
    analysisId,
  });

  // Update analysis record
  await db
    .update(knosiaAnalysis)
    .set({
      calculatedMetricsGenerated: calculatedMetricsResult.totalGenerated,
      calculatedMetricsFeasible: calculatedMetricsResult.feasibleCount,
    })
    .where(eq(knosiaAnalysis.id, analysisId));

  yield createSSEEvent("step", {
    step: 4.5,
    status: "completed",
    label: "Metrics generated",
    detail: `Generated ${calculatedMetricsResult.totalGenerated} calculated metrics (${calculatedMetricsResult.feasibleCount} feasible)`,
    metrics: {
      total: calculatedMetricsResult.totalGenerated,
      feasible: calculatedMetricsResult.feasibleCount,
      categories: calculatedMetricsResult.categories,
    },
  });
} catch (error) {
  // Graceful degradation: analysis continues without calculated metrics
  console.error("Failed to generate calculated metrics:", error);

  yield createSSEEvent("step", {
    step: 4.5,
    status: "warning",
    label: "Metric generation skipped",
    detail: error instanceof Error ? error.message : "LLM unavailable",
  });
}

// Continue with Step 5...
yield createSSEEvent("step", {
  step: 5,
  status: "started",
  label: "Generating vocabulary summary",
});
```

### Helper Function: `generateAndStoreCalculatedMetrics()`

**File:** `packages/api/src/modules/knosia/analysis/calculated-metrics.ts` (NEW function)

```typescript
import { enrichVocabularyWithCalculatedMetrics } from "@turbostarter/ai/kpi";
import { createMetric } from "../metrics/mutations";
import type { DetectedVocabulary, ProfilingData } from "@repo/liquid-connect/uvb";

interface GenerateAndStoreInput {
  detectedVocabulary: DetectedVocabulary;
  profilingData: ProfilingData;
  businessType: string;
  extractedSchema: ExtractedSchema;
  connectionId: string;
  workspaceId: string;
  analysisId: string;
}

export async function generateAndStoreCalculatedMetrics(
  input: GenerateAndStoreInput
) {
  const {
    detectedVocabulary,
    profilingData,
    businessType,
    extractedSchema,
    connectionId,
    workspaceId,
  } = input;

  // Build enhanced vocabulary context (uses profiling insights)
  const vocabularyContext = buildEnhancedVocabularyContext(
    detectedVocabulary,
    profilingData,
    extractedSchema
  );

  // Generate recipes via LLM (Phase 1)
  const result = await enrichVocabularyWithCalculatedMetrics(
    vocabularyContext,
    extractedSchema,
    businessType,
    {
      maxRecipes: 10,
      model: "haiku", // Fast + cheap for onboarding
      enabled: true,
    }
  );

  // Filter feasible recipes with good confidence
  const feasibleRecipes = result.enrichedVocabulary.calculatedMetrics.filter(
    (recipe) => recipe.feasible && (recipe.confidence ?? 0) >= 0.7
  );

  // Store in database
  const storedMetrics = [];
  for (const recipe of feasibleRecipes) {
    const metric = await createMetric({
      workspaceId,
      connectionId,
      name: recipe.name,
      category: categorizeMetric(recipe.name),
      description: generateDescription(recipe),
      semanticDefinition: recipe.semanticDefinition,
      confidence: recipe.confidence,
      feasible: recipe.feasible,
      source: "ai_generated",
      vocabularyItemIds: extractVocabularyLineage(recipe, detectedVocabulary),
    });

    storedMetrics.push(metric);
  }

  // Categorize for summary
  const categories = [...new Set(storedMetrics.map((m) => m.category).filter(Boolean))];

  return {
    totalGenerated: result.totalGenerated,
    feasibleCount: feasibleRecipes.length,
    storedCount: storedMetrics.length,
    categories,
    metrics: storedMetrics,
  };
}

// Helper: Build enhanced context using profiling insights
function buildEnhancedVocabularyContext(
  vocabulary: DetectedVocabulary,
  profiling: ProfilingData,
  schema: ExtractedSchema
) {
  // Extract profiling insights
  const highCardinalityColumns = Object.entries(profiling.columnStats || {})
    .filter(([_, stats]) => stats.cardinality && stats.cardinality / (stats.rowCount || 1) > 0.9)
    .map(([col]) => col);

  const enumColumns = Object.entries(profiling.columnStats || {})
    .filter(([_, stats]) =>
      stats.distinctValues &&
      stats.distinctValues.length < 100 &&
      (stats.coverage ?? 0) > 0.8
    )
    .map(([col, stats]) => ({
      column: col,
      values: stats.distinctValues,
    }));

  const requiredFields = Object.entries(profiling.columnStats || {})
    .filter(([_, stats]) => (stats.nullPercentage ?? 100) < 5)
    .map(([col]) => col);

  return {
    tables: vocabulary.entities.map((entity) => ({
      name: entity.name,
      columns: schema.tables
        .find((t) => t.name === entity.name)
        ?.columns.map((col) => ({
          name: col.name,
          type: col.dataType,
          semanticType: getSemanticType(col.name, vocabulary),
        })) || [],
    })),
    detectedMetrics: vocabulary.metrics.map((m) => m.name),
    detectedDimensions: vocabulary.dimensions.map((d) => d.name),

    // NEW: Profiling insights for smarter generation
    profilingInsights: {
      highCardinalityColumns, // LLM should avoid using these as metrics
      enumColumns,            // Good for filters
      requiredFields,         // Good for validation warnings
    },
  };
}

// Helper: Categorize metric based on name
function categorizeMetric(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("revenue") || lower.includes("sales") || lower.includes("mrr") || lower.includes("arr")) {
    return "revenue";
  }
  if (lower.includes("growth") || lower.includes("churn") || lower.includes("retention") || lower.includes("acquisition")) {
    return "growth";
  }
  if (lower.includes("active") || lower.includes("usage") || lower.includes("engagement") || lower.includes("dau") || lower.includes("mau")) {
    return "engagement";
  }
  if (lower.includes("cost") || lower.includes("efficiency") || lower.includes("time") || lower.includes("duration")) {
    return "operational";
  }

  return "other";
}

// Helper: Generate human-readable description
function generateDescription(recipe: CalculatedMetricRecipe): string {
  const { semanticDefinition } = recipe;
  const parts = [];

  // Aggregation + expression
  if (semanticDefinition.aggregation && semanticDefinition.expression) {
    parts.push(`${semanticDefinition.aggregation}(${semanticDefinition.expression})`);
  }

  // Entity
  if (semanticDefinition.entity) {
    parts.push(`from ${semanticDefinition.entity}`);
  }

  // Filters
  if (semanticDefinition.filters && semanticDefinition.filters.length > 0) {
    const filterDesc = semanticDefinition.filters
      .map((f) => `${f.field} ${f.operator} ${f.value}`)
      .join(", ");
    parts.push(`where ${filterDesc}`);
  }

  // Time granularity
  if (semanticDefinition.timeGranularity) {
    parts.push(`grouped by ${semanticDefinition.timeGranularity}`);
  }

  return parts.join(" ");
}

// Helper: Extract vocabulary lineage
function extractVocabularyLineage(
  recipe: CalculatedMetricRecipe,
  vocabulary: DetectedVocabulary
): string[] {
  const { semanticDefinition } = recipe;
  const lineage: string[] = [];

  // Find base metric referenced in expression
  const baseMetric = vocabulary.metrics.find(
    (m) => m.name === semanticDefinition.expression || m.column === semanticDefinition.expression
  );
  if (baseMetric?.id) {
    lineage.push(baseMetric.id);
  }

  // Find dimensions used in filters
  if (semanticDefinition.filters) {
    for (const filter of semanticDefinition.filters) {
      const dimension = vocabulary.dimensions.find(
        (d) => d.name === filter.field || d.column === filter.field
      );
      if (dimension?.id) {
        lineage.push(dimension.id);
      }
    }
  }

  return lineage;
}
```

---

## Database Schema {#database-schema}

### New Table: `calculated_metric`

**File:** `packages/db/src/schema/knosia.ts` (add after `vocabularyVersion`)

```typescript
export const calculatedMetric = pgTable("calculated_metric", {
  // Identity
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  connectionId: text("connection_id")
    .notNull()
    .references(() => connection.id, { onDelete: "cascade" }),

  // Metric definition
  name: text("name").notNull(),
  category: text("category"), // "revenue", "growth", "operational", "engagement"
  description: text("description"),

  // Semantic definition (from Phase 1)
  semanticDefinition: jsonb("semantic_definition")
    .notNull()
    .$type<SemanticMetricDefinition>(),

  // Generation metadata
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  feasible: boolean("feasible").notNull().default(true),
  source: text("source").notNull().default("ai_generated"), // "ai_generated" | "user_created"

  // Vocabulary lineage
  vocabularyItemIds: text("vocabulary_item_ids").array(),

  // Usage tracking
  canvasCount: integer("canvas_count").notNull().default(0),
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),

  // Cached execution result
  lastExecutionResult: jsonb("last_execution_result")
    .$type<ExecutionResult>(),

  // Governance
  status: text("status").notNull().default("active"), // "active" | "draft" | "deprecated"
  createdBy: text("created_by"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calculatedMetricRelations = relations(calculatedMetric, ({ one }) => ({
  workspace: one(workspace, {
    fields: [calculatedMetric.workspaceId],
    references: [workspace.id],
  }),
  connection: one(connection, {
    fields: [calculatedMetric.connectionId],
    references: [connection.id],
  }),
}));

// Type exports
export type CalculatedMetric = typeof calculatedMetric.$inferSelect;
export type NewCalculatedMetric = typeof calculatedMetric.$inferInsert;
```

### Enhance `analysis` Table

**File:** `packages/db/src/schema/knosia.ts` (modify existing `analysis` table)

```typescript
export const analysis = pgTable("analysis", {
  // ... existing fields ...

  // NEW: Calculated metrics tracking
  calculatedMetricsGenerated: integer("calculated_metrics_generated").default(0),
  calculatedMetricsFeasible: integer("calculated_metrics_feasible").default(0),
});
```

### Migration Script

**File:** `packages/db/migrations/0003_add_calculated_metrics.sql`

```sql
-- Add calculated metrics table
CREATE TABLE "knosia"."calculated_metric" (
  "id" TEXT PRIMARY KEY,
  "workspace_id" TEXT NOT NULL REFERENCES "knosia"."workspace"("id") ON DELETE CASCADE,
  "connection_id" TEXT NOT NULL REFERENCES "knosia"."connection"("id") ON DELETE CASCADE,

  "name" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,

  "semantic_definition" JSONB NOT NULL,

  "confidence" DECIMAL(3, 2),
  "feasible" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT NOT NULL DEFAULT 'ai_generated',

  "vocabulary_item_ids" TEXT[],

  "canvas_count" INTEGER NOT NULL DEFAULT 0,
  "execution_count" INTEGER NOT NULL DEFAULT 0,
  "last_executed_at" TIMESTAMPTZ,

  "last_execution_result" JSONB,

  "status" TEXT NOT NULL DEFAULT 'active',
  "created_by" TEXT,

  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX "idx_calculated_metric_workspace" ON "knosia"."calculated_metric"("workspace_id");
CREATE INDEX "idx_calculated_metric_connection" ON "knosia"."calculated_metric"("connection_id");
CREATE INDEX "idx_calculated_metric_status" ON "knosia"."calculated_metric"("status");
CREATE INDEX "idx_calculated_metric_category" ON "knosia"."calculated_metric"("category");

-- JSONB index for entity queries
CREATE INDEX "idx_calculated_metric_semantic_entity" ON "knosia"."calculated_metric"
  USING GIN ((semantic_definition -> 'entity'));

-- Add columns to analysis table
ALTER TABLE "knosia"."analysis"
  ADD COLUMN "calculated_metrics_generated" INTEGER DEFAULT 0,
  ADD COLUMN "calculated_metrics_feasible" INTEGER DEFAULT 0;
```

---

## API Design {#api-design}

### Module Structure (Follows Knosia Pattern)

**Directory:** `packages/api/src/modules/knosia/metrics/`

```
metrics/
├── router.ts           # API routes (Hono)
├── schemas.ts          # Zod validation
├── queries.ts          # SELECT operations
├── mutations.ts        # INSERT/UPDATE/DELETE
├── execution.ts        # Phase 2 execution wrapper
└── index.ts            # Barrel exports
```

### API Routes

**File:** `packages/api/src/modules/knosia/metrics/router.ts`

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { enforceAuth, enforceMembership } from "../../../middleware";
import {
  listMetrics,
  getMetric,
  getMetricsByConnection,
} from "./queries";
import {
  createMetric,
  updateMetric,
  deleteMetric,
} from "./mutations";
import { executeMetricWithCache } from "./execution";
import * as schemas from "./schemas";

export const metricsRouter = new Hono()
  // List metrics for workspace/connection
  .get(
    "/",
    enforceAuth,
    enforceMembership,
    zValidator("query", schemas.listMetricsSchema),
    async (c) => {
      const { workspaceId, connectionId, category, status } = c.req.valid("query");
      const metrics = await listMetrics({ workspaceId, connectionId, category, status });
      return c.json({ metrics });
    }
  )

  // Get single metric
  .get(
    "/:id",
    enforceAuth,
    enforceMembership,
    zValidator("param", schemas.getMetricSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const metric = await getMetric(id);
      if (!metric) {
        return c.json({ error: "Metric not found" }, 404);
      }
      return c.json({ metric });
    }
  )

  // Execute metric (get current value)
  .post(
    "/:id/execute",
    enforceAuth,
    enforceMembership,
    zValidator("param", schemas.getMetricSchema),
    zValidator("json", schemas.executeMetricSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const options = c.req.valid("json");

      const result = await executeMetricWithCache(id, options);
      return c.json({ result });
    }
  )

  // Create metric (user-created)
  .post(
    "/",
    enforceAuth,
    enforceMembership,
    zValidator("json", schemas.createMetricSchema),
    async (c) => {
      const data = c.req.valid("json");
      const metric = await createMetric(data);
      return c.json({ metric }, 201);
    }
  )

  // Update metric
  .patch(
    "/:id",
    enforceAuth,
    enforceMembership,
    zValidator("param", schemas.getMetricSchema),
    zValidator("json", schemas.updateMetricSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const metric = await updateMetric(id, data);
      return c.json({ metric });
    }
  )

  // Delete metric
  .delete(
    "/:id",
    enforceAuth,
    enforceMembership,
    zValidator("param", schemas.getMetricSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await deleteMetric(id);
      return c.json({ success: true });
    }
  )

  // Get metrics by connection (for Vocabulary page)
  .get(
    "/connection/:connectionId",
    enforceAuth,
    enforceMembership,
    async (c) => {
      const { connectionId } = c.req.param();
      const metrics = await getMetricsByConnection(connectionId);
      return c.json({ metrics });
    }
  );
```

### Integration with Knosia Router

**File:** `packages/api/src/modules/knosia/router.ts`

```typescript
import { metricsRouter } from "./metrics";

export const knosiaRouter = new Hono()
  .route("/organization", organizationRouter)
  .route("/connections", connectionsRouter)
  .route("/analysis", analysisRouter)
  .route("/vocabulary", vocabularyRouter)
  .route("/canvas", canvasRouter)
  .route("/thread", threadsRouter)
  .route("/briefing", briefingRouter)
  .route("/preferences", preferencesRouter)
  .route("/notification", notificationRouter)
  .route("/metrics", metricsRouter); // NEW
```

---

## Frontend Components {#frontend-components}

*[Same as V1 - UX decisions unchanged]*

### Directory Structure

```
apps/web/src/modules/
├── onboarding/
│   └── components/review/
│       └── metrics-section.tsx      # NEW
│
├── vocabulary/
│   └── components/
│       └── metrics-tab.tsx          # NEW
│
└── canvas/
    └── components/
        └── metric-kpi-card.tsx      # NEW
```

*[See V1 guide for complete component implementations]*

---

## Implementation Plan {#implementation-plan}

### Phase 1: SSE Integration (Day 1) - CRITICAL PATH

**Developer:** 1 backend (most experienced with SSE)
**Dependencies:** None

#### Tasks

1. **Modify SSE Stream**
   - [ ] File: `packages/api/src/modules/knosia/analysis/queries.ts:420`
   - [ ] Add Step 4.5 event emission (started/completed/warning)
   - [ ] Call `generateAndStoreCalculatedMetrics()`
   - [ ] Update analysis record with metrics count
   - [ ] Handle graceful degradation (LLM failures)
   - **Test:** Run analysis stream, verify Step 4.5 appears in SSE

2. **Create Helper Function**
   - [ ] File: `packages/api/src/modules/knosia/analysis/calculated-metrics.ts`
   - [ ] Implement `generateAndStoreCalculatedMetrics()`
   - [ ] Implement `buildEnhancedVocabularyContext()` (uses profiling)
   - [ ] Implement helper functions (categorize, description, lineage)
   - **Test:** Unit test with sample vocabulary + profiling data

3. **Database Migration**
   - [ ] Create `0003_add_calculated_metrics.sql`
   - [ ] Add `calculated_metric` table
   - [ ] Enhance `analysis` table (2 new columns)
   - [ ] Run migration: `pnpm with-env -F @turbostarter/db db:migrate`
   - **Test:** Verify schema in Drizzle Studio

---

### Phase 2: API Module (Day 1-2) - PARALLEL with Phase 1

**Developer:** 1 backend
**Dependencies:** Database schema (Phase 1, task 3)

#### Tasks

1. **Create Metrics Module**
   - [ ] Directory: `packages/api/src/modules/knosia/metrics/`
   - [ ] Implement `schemas.ts` (Zod validation)
   - [ ] Implement `queries.ts` (list, get, getByConnection)
   - [ ] Implement `mutations.ts` (create, update, delete)
   - [ ] Implement `execution.ts` (wrapper for Phase 2)
   - [ ] Implement `router.ts` (Hono routes)
   - **Test:** Hit endpoints via Postman

2. **Router Integration**
   - [ ] File: `packages/api/src/modules/knosia/router.ts`
   - [ ] Add `.route("/metrics", metricsRouter)`
   - **Test:** Verify routes appear in API docs

---

### Phase 3: Frontend (Day 2-3) - PARALLEL

**Developer:** 1 frontend
**Dependencies:** API routes (Phase 2)

#### Tasks

1. **Onboarding Integration**
   - [ ] Create `MetricsSection` component
   - [ ] Display metrics from analysis result
   - [ ] "Add to Canvas" selection
   - **Test:** Complete onboarding, see metrics

2. **Vocabulary Metrics Tab**
   - [ ] Create `MetricsTab` component
   - [ ] Create `use-metrics` hook
   - [ ] Add tab to Vocabulary page
   - **Test:** Navigate to tab, see metric list

3. **Canvas Integration**
   - [ ] Create `MetricKPICard` component
   - [ ] LiquidRender `MetricKPI` component
   - [ ] Add to component registry
   - **Test:** Add metric to canvas, see value

---

### Phase 4: Testing & Polish (Day 4-5)

**Developer:** All

#### Tasks

1. **End-to-End Testing**
   - [ ] Complete onboarding with metrics generation
   - [ ] Verify SSE stream shows Step 4.5
   - [ ] Check metrics stored in DB
   - [ ] Test Vocabulary tab browsing
   - [ ] Test Canvas rendering

2. **Performance Validation**
   - [ ] Metric generation < 10 seconds
   - [ ] Step 4.5 doesn't block analysis completion
   - [ ] Graceful degradation works (LLM timeout)

3. **Documentation**
   - [ ] Update architecture doc with Step 4.5
   - [ ] Document helper functions
   - [ ] Create troubleshooting guide

---

## Testing Strategy {#testing-strategy}

### Critical Integration Tests

**File:** `packages/api/src/modules/knosia/__tests__/analysis-metrics-e2e.test.ts` (NEW)

```typescript
describe("Analysis with Calculated Metrics", () => {
  it("should generate metrics during SSE stream", async () => {
    // Setup: connection + schema
    const { connectionId, workspaceId } = await setupTestConnection();

    // Start SSE stream
    const events = [];
    for await (const event of analyzeConnection(connectionId, true)) {
      events.push(event);
    }

    // Verify Step 4.5 executed
    const step4_5 = events.find((e) => e.data.step === 4.5);
    expect(step4_5).toBeDefined();
    expect(step4_5.data.status).toBe("completed");

    // Verify metrics stored
    const metrics = await getMetricsByConnection(connectionId);
    expect(metrics.length).toBeGreaterThan(0);
  });

  it("should use profiling data for smarter generation", async () => {
    // Test that high-cardinality columns are NOT used as metrics
    // Test that enum columns ARE suggested for filters
  });

  it("should gracefully degrade on LLM failure", async () => {
    // Mock LLM timeout
    // Verify Step 4.5 emits "warning"
    // Verify analysis continues to Step 5
  });
});
```

---

## Success Criteria {#success-criteria}

### Functional Requirements

- [ ] Step 4.5 appears in SSE stream
- [ ] 5-10 metrics generated during onboarding
- [ ] Metrics stored in `calculated_metric` table
- [ ] Vocabulary tab shows metrics
- [ ] Canvas can render metric KPI cards
- [ ] Profiling data influences generation (no high-cardinality metrics)

### Performance Requirements

- [ ] Step 4.5 completes in < 10 seconds
- [ ] Metric execution < 300ms (cached)
- [ ] Graceful degradation on LLM timeout

### UX Requirements

- [ ] Metrics visible during onboarding review
- [ ] Vocabulary tab easy to navigate
- [ ] Canvas KPI cards formatted correctly

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-04 | Initial guide (incorrect integration) |
| 2.0 | 2026-01-04 | Architecture-aligned (SSE integration, profiling usage) |

---

**END OF IMPLEMENTATION PLAN**
