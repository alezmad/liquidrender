# Knosia Calculated Metrics - Complete Implementation Guide

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Ready for Implementation
**Estimated Effort:** 3-5 days (parallel development)

---

## Executive Summary

This document provides a complete, standalone implementation guide for adding **Calculated Metrics** to Knosia. Metrics are AI-generated KPIs (e.g., "Monthly Recurring Revenue") that transform raw vocabulary into business intelligence.

### What We're Building

**Feature:** AI-generated business metrics displayed in Vocabulary page and Canvas
**User Value:** Automatic KPI generation from database schema (no manual SQL)
**Technical Approach:** LLM generates semantic definitions → LiquidConnect executes queries

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Where to show metrics** | Tab in Vocabulary page | Metrics are capabilities (discovery), Canvas is monitoring |
| **Database storage** | New `calculated_metric` table | Different lifecycle from vocabulary items |
| **Generation approach** | During onboarding enrichment | Leverage existing analysis pipeline |
| **Execution approach** | On-demand via LiquidConnect | Database-agnostic, uses existing infrastructure |
| **Caching strategy** | 5-minute TTL in Redis | Balance freshness vs performance |

---

## Table of Contents

1. [Prerequisites: Read Before Starting](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [Frontend Components](#frontend-components)
6. [User Flows](#user-flows)
7. [Implementation Plan (Parallel Paths)](#implementation-plan)
8. [Integration Points](#integration-points)
9. [Testing Strategy](#testing-strategy)
10. [Success Criteria](#success-criteria)

---

## Prerequisites: Read Before Starting {#prerequisites}

### Required Context Documents

Read these documents in order to understand the complete context:

| Document | Purpose | Location |
|----------|---------|----------|
| **Phase 1: Semantic Layer Refactor** | Understanding semantic definitions vs raw SQL | `.artifacts/2026-01-04-semantic-layer-refactor.md` |
| **Phase 2: Execution Implementation** | How recipe execution works via LiquidConnect | `.artifacts/2026-01-04-2030-phase2-calculated-metrics-execution.md` |
| **Phase 1+2 Test Validation** | Validation that Phase 1+2 work end-to-end | `.artifacts/2026-01-04-phase1-phase2-test-validation.md` |
| **Knosia Architecture** | Overall system design and data flow | `.docs/knosia-architecture.md` |
| **Onboarding Flow** | Current onboarding experience | `.artifacts/2025-12-29-0219-knosia-ux-flow-clickthrough.md` |

### Key Existing Files to Review

| File | What to Understand |
|------|-------------------|
| `packages/ai/src/modules/kpi/recipe-generator.ts` | Phase 1 (generation) + Phase 2 (execution) implementation |
| `packages/ai/src/modules/kpi/types.ts` | Type definitions for metrics |
| `packages/api/src/modules/knosia/analysis/calculated-metrics.ts` | Integration with analysis pipeline |
| `packages/api/src/modules/knosia/analysis/queries.ts:530-546` | Where to integrate Phase 3 |
| `packages/db/src/schema/knosia.ts` | Existing Knosia database schema |
| `apps/web/src/modules/onboarding/` | Onboarding UI components |
| `apps/web/src/app/[locale]/dashboard/(user)/vocabulary/page.tsx` | Vocabulary page (where metrics tab goes) |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | Claude Haiku (fast generation, <$0.01 per analysis) |
| **Semantic Layer** | LiquidConnect (database-agnostic query builder) |
| **Query Execution** | DuckDB Universal Adapter (multi-database support) |
| **API** | Hono (tRPC-style routing) |
| **Frontend** | Next.js 15, React 19, TanStack Query |
| **Database** | PostgreSQL 17 (Drizzle ORM) |
| **Caching** | Redis (via `@turbostarter/storage`) |

---

## Architecture Overview {#architecture-overview}

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         User Flow                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. ONBOARDING (Generation)                                   │
│                                                              │
│   User connects database                                    │
│         ↓                                                    │
│   Analysis Pipeline (existing)                              │
│         ├→ Schema extraction                                │
│         ├→ Vocabulary detection                             │
│         └→ Business type classification                     │
│                ↓                                             │
│   enrichVocabularyWithCalculatedMetrics() [NEW]             │
│         ├→ Phase 1: Generate semantic definitions (LLM)     │
│         └→ Store in calculated_metric table                 │
│                ↓                                             │
│   Display in onboarding review                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VOCABULARY PAGE (Discovery)                              │
│                                                              │
│   Tab: Calculated Metrics                                   │
│         ├→ List all metrics for connection                  │
│         ├→ Show formula + source columns                    │
│         └→ Actions: Add to Canvas, View Details             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CANVAS (Monitoring)                                       │
│                                                              │
│   Add Component → Calculated Metrics                        │
│         ↓                                                    │
│   executeRecipeWithCache() [Phase 2]                        │
│         ├→ Build LiquidFlow from semantic definition        │
│         ├→ Generate database-specific SQL (emitters)        │
│         ├→ Execute via DuckDB adapter                       │
│         └→ Cache results (5min TTL)                         │
│                ↓                                             │
│   Display KPI card with value + trend                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
ExtractedSchema (from DB)
         ↓
DetectedVocabulary (profiling + semantic detection)
         ↓
Business Type Classification
         ↓
┌──────────────────────────────────────────┐
│  enrichVocabularyWithCalculatedMetrics() │
│  ├─ Input: vocabulary + business type    │
│  ├─ LLM: Generate semantic definitions   │
│  └─ Output: CalculatedMetricRecipe[]     │
└──────────────────────────────────────────┘
         ↓
Store in calculated_metric table
         ↓
Display in UI (Vocabulary tab + Canvas)
         ↓
User clicks metric
         ↓
┌──────────────────────────────────────────┐
│  executeRecipeWithCache()                │
│  ├─ Load from DB                         │
│  ├─ Build LiquidFlow IR                  │
│  ├─ Generate SQL (postgres/mysql/duckdb)│
│  ├─ Execute query                        │
│  └─ Return results + cache               │
└──────────────────────────────────────────┘
         ↓
Render in Canvas component
```

---

## Database Schema {#database-schema}

### New Table: `calculated_metric`

**File:** `packages/db/src/schema/knosia.ts`

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
  name: text("name").notNull(), // "Monthly Recurring Revenue"
  category: text("category"), // "revenue", "growth", "operational", "engagement"
  description: text("description"), // Human-readable explanation

  // Semantic definition (from Phase 1 - database-agnostic)
  semanticDefinition: jsonb("semantic_definition")
    .notNull()
    .$type<{
      type: "simple" | "derived" | "cumulative";
      expression: string; // Column name or calculation
      aggregation?: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | "COUNT_DISTINCT";
      entity: string; // Table name
      timeField?: string; // For time-series metrics
      timeGranularity?: "day" | "week" | "month" | "quarter" | "year";
      filters?: Array<{
        field: string;
        operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "IN" | "NOT IN" | "LIKE";
        value: string | number | boolean | null;
      }>;
      dependencies?: string[]; // For derived metrics
      format?: {
        type: "number" | "currency" | "percentage" | "duration";
        decimals?: number;
        currency?: string;
      };
    }>(),

  // Generation metadata
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00 - 1.00
  feasible: boolean("feasible").notNull().default(true),
  source: text("source").notNull().default("ai_generated"), // "ai_generated" | "user_created"

  // Vocabulary lineage (which columns does this metric use?)
  vocabularyItemIds: text("vocabulary_item_ids").array(), // references vocabulary_item.id[]

  // Usage tracking
  canvasCount: integer("canvas_count").notNull().default(0), // How many canvases use this
  lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
  executionCount: integer("execution_count").notNull().default(0),

  // Cached execution result (from Phase 2)
  lastExecutionResult: jsonb("last_execution_result")
    .$type<{
      success: boolean;
      value?: number | string; // Latest value
      trend?: "up" | "down" | "flat"; // Compared to previous period
      trendPercentage?: number;
      rowCount?: number;
      executionTimeMs?: number;
      error?: string;
      cachedAt?: string; // ISO timestamp
    }>(),

  // Governance
  status: text("status").notNull().default("active"), // "active" | "draft" | "deprecated"
  createdBy: text("created_by"), // User ID who approved it

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
```

### Migration Script

**File:** `packages/db/migrations/0003_add_calculated_metrics.sql`

```sql
-- Add calculated_metric table
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
  "last_executed_at" TIMESTAMPTZ,
  "execution_count" INTEGER NOT NULL DEFAULT 0,

  "last_execution_result" JSONB,

  "status" TEXT NOT NULL DEFAULT 'active',
  "created_by" TEXT,

  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX "idx_calculated_metric_workspace" ON "knosia"."calculated_metric"("workspace_id");
CREATE INDEX "idx_calculated_metric_connection" ON "knosia"."calculated_metric"("connection_id");
CREATE INDEX "idx_calculated_metric_status" ON "knosia"."calculated_metric"("status");
CREATE INDEX "idx_calculated_metric_category" ON "knosia"."calculated_metric"("category");

-- Index on JSONB for semantic definition queries
CREATE INDEX "idx_calculated_metric_semantic_entity" ON "knosia"."calculated_metric"
  USING GIN ((semantic_definition -> 'entity'));
```

### Enhancing `analysis` Table

**File:** `packages/db/src/schema/knosia.ts`

```typescript
// Add to existing analysis table
export const analysis = pgTable("analysis", {
  // ... existing fields ...

  // NEW: Add calculated metrics count
  calculatedMetricsGenerated: integer("calculated_metrics_generated").default(0),
  calculatedMetricsFeasible: integer("calculated_metrics_feasible").default(0),
});
```

---

## API Design {#api-design}

### Module Structure

**Directory:** `packages/api/src/modules/knosia/metrics/`

```
metrics/
├── router.ts           # API routes
├── schemas.ts          # Zod validation schemas
├── queries.ts          # SELECT operations
├── mutations.ts        # INSERT/UPDATE/DELETE
├── execution.ts        # Recipe execution logic (Phase 2)
└── index.ts            # Barrel exports
```

### API Routes

**File:** `packages/api/src/modules/knosia/metrics/router.ts`

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { enforceAuth, enforceMembership } from "../../../middleware";
import {
  listMetricsSchema,
  getMetricSchema,
  executeMetricSchema,
  createMetricSchema,
  updateMetricSchema,
  deleteMetricSchema,
} from "./schemas";
import {
  listMetrics,
  getMetric,
  getMetricsByConnection,
  getMetricUsage,
} from "./queries";
import {
  createMetric,
  updateMetric,
  deleteMetric,
  updateMetricStatus,
} from "./mutations";
import { executeMetric, executeMetricWithCache } from "./execution";

export const metricsRouter = new Hono()
  // List all metrics for a workspace
  .get(
    "/",
    enforceAuth,
    enforceMembership,
    zValidator("query", listMetricsSchema),
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
    zValidator("param", getMetricSchema),
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
    zValidator("param", getMetricSchema),
    zValidator("json", executeMetricSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const options = c.req.valid("json");

      const result = await executeMetricWithCache(id, options);
      return c.json({ result });
    }
  )

  // Create new metric
  .post(
    "/",
    enforceAuth,
    enforceMembership,
    zValidator("json", createMetricSchema),
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
    zValidator("param", getMetricSchema),
    zValidator("json", updateMetricSchema),
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
    zValidator("param", getMetricSchema),
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
  )

  // Get metric usage (which canvases use this metric)
  .get(
    "/:id/usage",
    enforceAuth,
    enforceMembership,
    zValidator("param", getMetricSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const usage = await getMetricUsage(id);
      return c.json({ usage });
    }
  );
```

### Schemas

**File:** `packages/api/src/modules/knosia/metrics/schemas.ts`

```typescript
import { z } from "zod";

export const semanticDefinitionSchema = z.object({
  type: z.enum(["simple", "derived", "cumulative"]),
  expression: z.string(),
  aggregation: z.enum(["SUM", "AVG", "COUNT", "MIN", "MAX", "COUNT_DISTINCT"]).optional(),
  entity: z.string(),
  timeField: z.string().optional(),
  timeGranularity: z.enum(["day", "week", "month", "quarter", "year"]).optional(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["=", "!=", ">", "<", ">=", "<=", "IN", "NOT IN", "LIKE"]),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })).optional(),
  dependencies: z.array(z.string()).optional(),
  format: z.object({
    type: z.enum(["number", "currency", "percentage", "duration"]),
    decimals: z.number().optional(),
    currency: z.string().optional(),
  }).optional(),
});

export const listMetricsSchema = z.object({
  workspaceId: z.string(),
  connectionId: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["active", "draft", "deprecated"]).optional(),
});

export const getMetricSchema = z.object({
  id: z.string(),
});

export const executeMetricSchema = z.object({
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  additionalFilters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })).optional(),
  limit: z.number().optional(),
  useCache: z.boolean().optional().default(true),
});

export const createMetricSchema = z.object({
  workspaceId: z.string(),
  connectionId: z.string(),
  name: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  semanticDefinition: semanticDefinitionSchema,
  confidence: z.number().min(0).max(1).optional(),
  feasible: z.boolean().optional().default(true),
  source: z.enum(["ai_generated", "user_created"]).optional().default("user_created"),
});

export const updateMetricSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  semanticDefinition: semanticDefinitionSchema.optional(),
  status: z.enum(["active", "draft", "deprecated"]).optional(),
});

export const deleteMetricSchema = z.object({
  id: z.string(),
});
```

### Queries

**File:** `packages/api/src/modules/knosia/metrics/queries.ts`

```typescript
import { db } from "@turbostarter/db/server";
import { calculatedMetric } from "@turbostarter/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function listMetrics(params: {
  workspaceId: string;
  connectionId?: string;
  category?: string;
  status?: string;
}) {
  const conditions = [eq(calculatedMetric.workspaceId, params.workspaceId)];

  if (params.connectionId) {
    conditions.push(eq(calculatedMetric.connectionId, params.connectionId));
  }
  if (params.category) {
    conditions.push(eq(calculatedMetric.category, params.category));
  }
  if (params.status) {
    conditions.push(eq(calculatedMetric.status, params.status));
  }

  return db
    .select()
    .from(calculatedMetric)
    .where(and(...conditions))
    .orderBy(calculatedMetric.category, calculatedMetric.name);
}

export async function getMetric(id: string) {
  const [metric] = await db
    .select()
    .from(calculatedMetric)
    .where(eq(calculatedMetric.id, id))
    .limit(1);

  return metric;
}

export async function getMetricsByConnection(connectionId: string) {
  return db
    .select()
    .from(calculatedMetric)
    .where(eq(calculatedMetric.connectionId, connectionId))
    .orderBy(calculatedMetric.category, calculatedMetric.name);
}

export async function getMetricUsage(id: string) {
  const metric = await getMetric(id);
  if (!metric) {
    throw new Error("Metric not found");
  }

  // TODO: Query canvas_version table to find canvases using this metric
  // For now, return the count stored in the metric
  return {
    canvasCount: metric.canvasCount,
    executionCount: metric.executionCount,
    lastExecutedAt: metric.lastExecutedAt,
  };
}
```

### Mutations

**File:** `packages/api/src/modules/knosia/metrics/mutations.ts`

```typescript
import { db } from "@turbostarter/db/server";
import { calculatedMetric } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@turbostarter/shared/utils";

export async function createMetric(data: {
  workspaceId: string;
  connectionId: string;
  name: string;
  category?: string;
  description?: string;
  semanticDefinition: any;
  confidence?: number;
  feasible?: boolean;
  source?: "ai_generated" | "user_created";
}) {
  const [metric] = await db
    .insert(calculatedMetric)
    .values({
      id: generateId(),
      ...data,
    })
    .returning();

  return metric;
}

export async function updateMetric(
  id: string,
  data: {
    name?: string;
    category?: string;
    description?: string;
    semanticDefinition?: any;
    status?: "active" | "draft" | "deprecated";
  }
) {
  const [metric] = await db
    .update(calculatedMetric)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(calculatedMetric.id, id))
    .returning();

  return metric;
}

export async function deleteMetric(id: string) {
  await db
    .delete(calculatedMetric)
    .where(eq(calculatedMetric.id, id));
}

export async function updateMetricStatus(
  id: string,
  status: "active" | "draft" | "deprecated"
) {
  return updateMetric(id, { status });
}

export async function incrementMetricUsage(id: string) {
  const metric = await db
    .select()
    .from(calculatedMetric)
    .where(eq(calculatedMetric.id, id))
    .limit(1);

  if (!metric[0]) {
    throw new Error("Metric not found");
  }

  const [updated] = await db
    .update(calculatedMetric)
    .set({
      executionCount: metric[0].executionCount + 1,
      lastExecutedAt: new Date(),
    })
    .where(eq(calculatedMetric.id, id))
    .returning();

  return updated;
}
```

### Execution Logic (Phase 2)

**File:** `packages/api/src/modules/knosia/metrics/execution.ts`

```typescript
import { executeRecipe, executeRecipeWithCache } from "@turbostarter/ai/kpi";
import { getMetric, incrementMetricUsage } from "./queries";
import { db } from "@turbostarter/db/server";
import { connection } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";

export async function executeMetric(
  metricId: string,
  options: {
    timeRange?: { start: string; end: string };
    additionalFilters?: Array<{ field: string; operator: string; value: any }>;
    limit?: number;
  }
) {
  // Get metric definition
  const metric = await getMetric(metricId);
  if (!metric) {
    throw new Error("Metric not found");
  }

  // Get connection details
  const [conn] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, metric.connectionId))
    .limit(1);

  if (!conn) {
    throw new Error("Connection not found");
  }

  // Build recipe object
  const recipe = {
    name: metric.name,
    semanticDefinition: metric.semanticDefinition,
    confidence: metric.confidence ? parseFloat(metric.confidence) : 1.0,
    feasible: metric.feasible,
  };

  // Execute via Phase 2
  const result = await executeRecipe(recipe, {
    connection: {
      id: conn.id,
      type: conn.type as "postgres" | "mysql" | "duckdb",
      connectionString: conn.connectionString,
      defaultSchema: conn.schema || "public",
    },
    timeRange: options.timeRange,
    additionalFilters: options.additionalFilters,
    limit: options.limit,
  });

  // Update execution tracking
  await incrementMetricUsage(metricId);

  return result;
}

export async function executeMetricWithCacheWrapper(
  metricId: string,
  options: {
    timeRange?: { start: string; end: string };
    additionalFilters?: Array<{ field: string; operator: string; value: any }>;
    limit?: number;
    useCache?: boolean;
  }
) {
  if (!options.useCache) {
    return executeMetric(metricId, options);
  }

  // Get metric definition
  const metric = await getMetric(metricId);
  if (!metric) {
    throw new Error("Metric not found");
  }

  // Get connection details
  const [conn] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, metric.connectionId))
    .limit(1);

  if (!conn) {
    throw new Error("Connection not found");
  }

  // Build recipe object
  const recipe = {
    name: metric.name,
    semanticDefinition: metric.semanticDefinition,
    confidence: metric.confidence ? parseFloat(metric.confidence) : 1.0,
    feasible: metric.feasible,
  };

  // Execute with cache via Phase 2
  const result = await executeRecipeWithCache(recipe, {
    connection: {
      id: conn.id,
      type: conn.type as "postgres" | "mysql" | "duckdb",
      connectionString: conn.connectionString,
      defaultSchema: conn.schema || "public",
    },
    timeRange: options.timeRange,
    additionalFilters: options.additionalFilters,
    limit: options.limit,
  });

  // Update execution tracking if not from cache
  if (!result.cached) {
    await incrementMetricUsage(metricId);
  }

  return result;
}
```

### Integration with Knosia Router

**File:** `packages/api/src/modules/knosia/router.ts`

```typescript
import { metricsRouter } from "./metrics";

export const knosiaRouter = new Hono()
  .route("/connections", connectionsRouter)
  .route("/analysis", analysisRouter)
  .route("/canvas", canvasRouter)
  .route("/threads", threadsRouter)
  .route("/metrics", metricsRouter); // NEW
```

---

## Frontend Components {#frontend-components}

### Directory Structure

```
apps/web/src/modules/
├── onboarding/
│   └── components/
│       └── review/
│           ├── metrics-section.tsx      # NEW: Show metrics during review
│           └── metric-card.tsx          # NEW: Individual metric card
│
├── vocabulary/
│   ├── components/
│   │   ├── metrics-tab.tsx              # NEW: Metrics tab content
│   │   ├── metric-list.tsx              # NEW: List of metrics
│   │   ├── metric-detail-dialog.tsx     # NEW: Metric details modal
│   │   └── add-to-canvas-button.tsx     # NEW: Add metric to canvas
│   └── hooks/
│       └── use-metrics.ts               # NEW: Metrics data fetching
│
└── canvas/
    └── components/
        ├── add-component-dropdown.tsx   # ENHANCE: Add metrics option
        └── metric-kpi-card.tsx          # NEW: KPI card for canvas
```

### Onboarding: Metrics Section

**File:** `apps/web/src/modules/onboarding/components/review/metrics-section.tsx`

```typescript
"use client";

import { Card } from "@turbostarter/ui-web/card";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import { Checkbox } from "@turbostarter/ui-web/checkbox";
import { useState } from "react";
import type { CalculatedMetricRecipe } from "@turbostarter/ai/kpi";

interface MetricsSectionProps {
  metrics: CalculatedMetricRecipe[];
  onAddToCanvas?: (metricIds: string[]) => void;
}

export function MetricsSection({ metrics, onAddToCanvas }: MetricsSectionProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());

  const groupedMetrics = metrics.reduce((acc, metric) => {
    const category = metric.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, CalculatedMetricRecipe[]>);

  const handleToggle = (metricId: string) => {
    setSelectedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    onAddToCanvas?.(Array.from(selectedMetrics));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Calculated Metrics</h3>
          <p className="text-sm text-muted-foreground">
            AI-generated KPIs based on your data structure
          </p>
        </div>
        {selectedMetrics.size > 0 && (
          <Button onClick={handleAddSelected}>
            Add {selectedMetrics.size} to Canvas
          </Button>
        )}
      </div>

      {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
        <div key={category}>
          <h4 className="text-sm font-medium mb-3">{category} Metrics</h4>
          <div className="grid gap-3">
            {categoryMetrics.map((metric) => (
              <Card key={metric.name} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedMetrics.has(metric.name)}
                    onCheckedChange={() => handleToggle(metric.name)}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{metric.name}</span>
                      <Badge variant={metric.feasible ? "default" : "secondary"}>
                        {metric.feasible ? "Ready" : "Needs Review"}
                      </Badge>
                      {metric.confidence && (
                        <Badge variant="outline">
                          {Math.round(metric.confidence * 100)}% confidence
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <span className="font-medium">Formula:</span>{" "}
                        {metric.semanticDefinition.aggregation}(
                        {metric.semanticDefinition.expression})
                        {metric.semanticDefinition.filters?.length
                          ? ` WHERE ${metric.semanticDefinition.filters
                              .map((f) => `${f.field} ${f.operator} ${f.value}`)
                              .join(" AND ")}`
                          : ""}
                      </div>
                      <div>
                        <span className="font-medium">Source:</span>{" "}
                        {metric.semanticDefinition.entity}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Vocabulary: Metrics Tab

**File:** `apps/web/src/modules/vocabulary/components/metrics-tab.tsx`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { handle } from "@/lib/handle";
import { Card } from "@turbostarter/ui-web/card";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import { MetricDetailDialog } from "./metric-detail-dialog";
import { AddToCanvasButton } from "./add-to-canvas-button";
import { useState } from "react";

interface MetricsTabProps {
  connectionId: string;
  workspaceId: string;
}

export function MetricsTab({ connectionId, workspaceId }: MetricsTabProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["metrics", connectionId],
    queryFn: handle(
      api.metrics.connection[":connectionId"].$get,
      { param: { connectionId } }
    ),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const metrics = data?.metrics || [];

  if (metrics.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          No calculated metrics found for this connection.
        </p>
        <Button variant="outline">Generate Metrics</Button>
      </Card>
    );
  }

  // Group by category
  const grouped = metrics.reduce((acc, metric) => {
    const category = metric.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, typeof metrics>);

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, categoryMetrics]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4">{category} Metrics</h3>
          <div className="grid gap-4">
            {categoryMetrics.map((metric) => (
              <Card key={metric.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{metric.name}</h4>
                      <Badge variant={metric.status === "active" ? "default" : "secondary"}>
                        {metric.status}
                      </Badge>
                      {metric.confidence && (
                        <Badge variant="outline">
                          {Math.round(parseFloat(metric.confidence) * 100)}% confidence
                        </Badge>
                      )}
                    </div>

                    {metric.description && (
                      <p className="text-sm text-muted-foreground">
                        {metric.description}
                      </p>
                    )}

                    <div className="text-sm space-y-1">
                      <div className="flex gap-2">
                        <span className="font-medium">Formula:</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">
                          {metric.semanticDefinition.aggregation}(
                          {metric.semanticDefinition.expression})
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium">Entity:</span>
                        <span className="text-muted-foreground">
                          {metric.semanticDefinition.entity}
                        </span>
                      </div>
                      {metric.semanticDefinition.filters?.length > 0 && (
                        <div className="flex gap-2">
                          <span className="font-medium">Filters:</span>
                          <span className="text-muted-foreground">
                            {metric.semanticDefinition.filters.length} condition(s)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Used in {metric.canvasCount} canvas(es)</span>
                      <span>•</span>
                      <span>Executed {metric.executionCount} times</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMetric(metric.id)}
                    >
                      Details
                    </Button>
                    <AddToCanvasButton metricId={metric.id} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {selectedMetric && (
        <MetricDetailDialog
          metricId={selectedMetric}
          open={!!selectedMetric}
          onOpenChange={(open) => !open && setSelectedMetric(null)}
        />
      )}
    </div>
  );
}
```

### Vocabulary Page: Add Metrics Tab

**File:** `apps/web/src/app/[locale]/dashboard/(user)/vocabulary/page.tsx`

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@turbostarter/ui-web/tabs";
import { MetricsTab } from "@/modules/vocabulary/components/metrics-tab";

export default function VocabularyPage() {
  // ... existing code ...

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="semantic">Semantic Layer</TabsTrigger>
        <TabsTrigger value="metrics">Calculated Metrics</TabsTrigger> {/* NEW */}
      </TabsList>

      <TabsContent value="overview">
        {/* Existing overview content */}
      </TabsContent>

      <TabsContent value="semantic">
        {/* Existing semantic layer content */}
      </TabsContent>

      <TabsContent value="metrics">
        <MetricsTab
          connectionId={currentConnectionId}
          workspaceId={workspaceId}
        />
      </TabsContent>
    </Tabs>
  );
}
```

### Canvas: Metric KPI Card

**File:** `apps/web/src/modules/canvas/components/metric-kpi-card.tsx`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { handle } from "@/lib/handle";
import { Card } from "@turbostarter/ui-web/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@turbostarter/ui-web/skeleton";

interface MetricKPICardProps {
  metricId: string;
  timeRange?: { start: string; end: string };
}

export function MetricKPICard({ metricId, timeRange }: MetricKPICardProps) {
  const { data: metric } = useQuery({
    queryKey: ["metric", metricId],
    queryFn: handle(api.metrics[":id"].$get, { param: { id: metricId } }),
  });

  const { data: execution, isLoading } = useQuery({
    queryKey: ["metric-execution", metricId, timeRange],
    queryFn: handle(
      api.metrics[":id"].execute.$post,
      {
        param: { id: metricId },
        json: { timeRange, useCache: true },
      }
    ),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (!metric) return null;

  const result = execution?.result;
  const value = result?.rows?.[0]?.value || 0;
  const trend = result?.trend || "flat";
  const trendPercentage = result?.trendPercentage || 0;

  const TrendIcon =
    trend === "up" ? TrendingUp :
    trend === "down" ? TrendingDown :
    Minus;

  const trendColor =
    trend === "up" ? "text-green-600" :
    trend === "down" ? "text-red-600" :
    "text-gray-600";

  return (
    <Card className="p-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {metric.metric.name}
        </h3>

        {isLoading ? (
          <Skeleton className="h-10 w-32" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatValue(value, metric.metric.semanticDefinition.format)}
            </span>
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(trendPercentage).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {result?.error && (
          <p className="text-sm text-destructive">{result.error}</p>
        )}
      </div>
    </Card>
  );
}

function formatValue(value: any, format?: any) {
  if (!format) return value;

  if (format.type === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: format.currency || "USD",
      minimumFractionDigits: format.decimals || 0,
      maximumFractionDigits: format.decimals || 0,
    }).format(value);
  }

  if (format.type === "percentage") {
    return `${value.toFixed(format.decimals || 1)}%`;
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: format.decimals || 0,
    maximumFractionDigits: format.decimals || 0,
  });
}
```

---

## User Flows {#user-flows}

### Flow 1: Onboarding (Generation)

```
1. User connects database
2. Analysis pipeline runs:
   ├─ Extract schema
   ├─ Detect vocabulary
   ├─ Classify business type
   └─ enrichVocabularyWithCalculatedMetrics()
       ├─ Generate 5-10 KPI recipes via LLM
       └─ Store in calculated_metric table
3. Onboarding Review page shows:
   ├─ Vocabulary summary
   └─ Calculated Metrics section
       ├─ Grouped by category
       ├─ Checkbox to select
       └─ "Add to Canvas" button
4. User selects metrics → Creates canvas with metric components
```

### Flow 2: Vocabulary Discovery

```
1. User navigates to Vocabulary page
2. Clicks "Calculated Metrics" tab
3. Sees list of metrics grouped by category:
   ├─ Revenue Metrics
   ├─ Growth Metrics
   └─ Operational Metrics
4. Each metric shows:
   ├─ Name + status badge
   ├─ Formula (semantic definition)
   ├─ Source entity
   ├─ Usage count
   └─ Actions: View Details, Add to Canvas
5. User clicks "View Details":
   ├─ Opens modal with full definition
   ├─ Shows vocabulary lineage
   └─ Displays recent execution results
```

### Flow 3: Canvas Monitoring

```
1. User opens existing canvas
2. Canvas displays metric KPI cards
3. Each card shows:
   ├─ Metric name
   ├─ Current value (formatted)
   ├─ Trend indicator (↗ +8%)
   └─ Auto-refreshes every 5 minutes
4. User clicks metric card:
   ├─ Opens popover with formula
   ├─ "View in Vocabulary" link
   └─ Time range selector
```

### Flow 4: Adding Metric to Canvas

```
1. User in Canvas editing mode
2. Clicks "Add Component" dropdown
3. Selects "Calculated Metrics" section
4. Sees list of available metrics
5. Clicks metric → Adds KPI card to canvas
6. Card immediately executes metric and displays value
```

### Flow 5: Thread-Based Metric Creation

```
1. User in Thread: "Calculate customer acquisition cost"
2. AI analyzes request:
   ├─ Identifies required columns
   ├─ Generates semantic definition
   └─ Creates metric in calculated_metric table
3. AI responds: "Created CAC metric. View in Vocabulary or add to Canvas?"
4. User clicks "Add to Canvas"
5. Canvas updates with new KPI card
```

---

## Implementation Plan (Parallel Paths) {#implementation-plan}

### Overview

**Total Effort:** 3-5 days with 2-3 developers working in parallel
**Critical Path:** Database → API → Integration
**Parallel Paths:** Frontend components can be built simultaneously

### Phase 1: Foundation (Day 1)

**Dependencies:** None
**Developers:** 1 backend

#### Tasks

1. **Database Schema**
   - [ ] Add `calculated_metric` table to `packages/db/src/schema/knosia.ts`
   - [ ] Create migration `0003_add_calculated_metrics.sql`
   - [ ] Run migration: `pnpm with-env -F @turbostarter/db db:migrate`
   - [ ] Verify schema in Drizzle Studio
   - **Files:** `packages/db/src/schema/knosia.ts`, migration file
   - **Test:** Insert test metric manually

2. **API Module Setup**
   - [ ] Create `packages/api/src/modules/knosia/metrics/` directory
   - [ ] Implement schemas (`schemas.ts`)
   - [ ] Implement queries (`queries.ts`)
   - [ ] Implement mutations (`mutations.ts`)
   - [ ] Implement execution (`execution.ts`)
   - [ ] Create router (`router.ts`)
   - [ ] Integrate with Knosia router
   - **Files:** All files in `metrics/` directory
   - **Test:** Hit endpoints via Postman/curl

---

### Phase 2: Integration (Day 2)

**Dependencies:** Phase 1 complete
**Developers:** 1 backend

#### Tasks

1. **Onboarding Integration**
   - [ ] Update `enrichVocabularyWithCalculatedMetrics()` to store in DB
   - [ ] Modify `runEnrichment()` to call storage function
   - [ ] Update analysis result to include metric count
   - **Files:**
     - `packages/api/src/modules/knosia/analysis/calculated-metrics.ts`
     - `packages/api/src/modules/knosia/analysis/queries.ts:530-546`
   - **Test:** Run onboarding, verify metrics in DB

2. **Caching Layer**
   - [ ] Add Redis cache to `executeRecipeWithCache()`
   - [ ] Implement cache key generation
   - [ ] Add TTL configuration (5 minutes)
   - **Files:** `packages/api/src/modules/knosia/metrics/execution.ts`
   - **Test:** Execute metric twice, verify cache hit

---

### Phase 3A: Frontend - Vocabulary (Day 2-3, Parallel)

**Dependencies:** Phase 1 API
**Developers:** 1 frontend

#### Tasks

1. **Vocabulary Metrics Tab**
   - [ ] Create `MetricsTab` component
   - [ ] Create `MetricList` component
   - [ ] Create `MetricDetailDialog` component
   - [ ] Create `AddToCanvasButton` component
   - [ ] Add tab to Vocabulary page
   - [ ] Create `use-metrics` hook for data fetching
   - **Files:**
     - `apps/web/src/modules/vocabulary/components/metrics-tab.tsx`
     - `apps/web/src/modules/vocabulary/hooks/use-metrics.ts`
     - `apps/web/src/app/[locale]/dashboard/(user)/vocabulary/page.tsx`
   - **Test:** Navigate to Vocabulary → Metrics tab, see list

2. **Styling & UX Polish**
   - [ ] Implement category grouping
   - [ ] Add loading states (Skeleton)
   - [ ] Add empty state ("No metrics")
   - [ ] Add search/filter functionality
   - **Test:** Visual QA

---

### Phase 3B: Frontend - Onboarding (Day 2-3, Parallel)

**Dependencies:** Phase 1 API
**Developers:** 1 frontend (can be same as 3A after tab complete)

#### Tasks

1. **Onboarding Metrics Section**
   - [ ] Create `MetricsSection` component
   - [ ] Create `MetricCard` component
   - [ ] Integrate into onboarding review step
   - [ ] Implement "Add to Canvas" flow
   - **Files:**
     - `apps/web/src/modules/onboarding/components/review/metrics-section.tsx`
     - `apps/web/src/modules/onboarding/components/review/metric-card.tsx`
   - **Test:** Complete onboarding, see metrics section

2. **Canvas Integration Prep**
   - [ ] Design metric component schema for canvas
   - [ ] Update canvas generation to include selected metrics
   - **Files:** `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts`
   - **Test:** Select metrics → Create canvas → Verify components

---

### Phase 4: Canvas Components (Day 3-4)

**Dependencies:** Phase 2, Phase 3A/3B
**Developers:** 1 frontend

#### Tasks

1. **Metric KPI Card**
   - [ ] Create `MetricKPICard` component
   - [ ] Implement value formatting (currency, percentage, etc.)
   - [ ] Add trend indicators
   - [ ] Implement auto-refresh (5min interval)
   - [ ] Add click handler (show formula popover)
   - **Files:** `apps/web/src/modules/canvas/components/metric-kpi-card.tsx`
   - **Test:** Add metric to canvas, verify display + refresh

2. **Add Component Dropdown**
   - [ ] Enhance dropdown to show "Calculated Metrics" section
   - [ ] Fetch available metrics
   - [ ] Implement add-to-canvas action
   - **Files:** `apps/web/src/modules/canvas/components/add-component-dropdown.tsx`
   - **Test:** Canvas edit mode → Add Component → Select metric

3. **LiquidRender Integration**
   - [ ] Create `MetricKPI` LiquidRender component
   - [ ] Add to component registry
   - [ ] Implement data binding for metric execution
   - **Files:**
     - `packages/liquid-render/src/renderer/components/MetricKPI.tsx`
     - `packages/liquid-render/src/renderer/component-registry.tsx`
   - **Test:** Render canvas JSON with metric component

---

### Phase 5: Testing & Polish (Day 4-5)

**Dependencies:** All previous phases
**Developers:** All (rotate)

#### Tasks

1. **End-to-End Testing**
   - [ ] Test full onboarding flow with metric generation
   - [ ] Test vocabulary tab browsing
   - [ ] Test canvas rendering with metrics
   - [ ] Test metric execution caching
   - [ ] Test error handling (invalid metrics, connection failures)

2. **Performance Optimization**
   - [ ] Verify query performance (<300ms)
   - [ ] Verify cache hit rate (>80%)
   - [ ] Optimize metric list queries (pagination if needed)
   - [ ] Add database indexes if missing

3. **Documentation**
   - [ ] Update API documentation
   - [ ] Create user guide for metrics
   - [ ] Document troubleshooting steps

---

## Integration Points {#integration-points}

### Critical Dependencies

| Integration Point | File | Lines | What to Change |
|-------------------|------|-------|----------------|
| **Analysis Pipeline** | `packages/api/src/modules/knosia/analysis/queries.ts` | 530-546 | Add metric storage after generation |
| **Onboarding State** | `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts` | Multiple | Add selectedMetrics to state |
| **Canvas Generation** | `apps/web/src/modules/onboarding/hooks/use-create-canvas.ts` | Multiple | Include metric components |
| **LiquidRender Registry** | `packages/liquid-render/src/renderer/component-registry.tsx` | Registry object | Add MetricKPI component |
| **Knosia Router** | `packages/api/src/modules/knosia/router.ts` | Route definitions | Add /metrics routes |

### Analysis Pipeline Integration (Critical)

**File:** `packages/api/src/modules/knosia/analysis/queries.ts:530-546`

**Current Code:**
```typescript
// Phase 1: Generate recipes
calculatedMetricsResult = await enrichVocabularyWithCalculatedMetrics(
  quickEnrichedVocab,
  schema,
  businessType.detected,
  { maxRecipes: 10, model: "haiku", enabled: true }
);

// TODO Phase 2: Store in database
// TODO Phase 3: Execute recipes
```

**New Code:**
```typescript
// Phase 1: Generate recipes
calculatedMetricsResult = await enrichVocabularyWithCalculatedMetrics(
  quickEnrichedVocab,
  schema,
  businessType.detected,
  { maxRecipes: 10, model: "haiku", enabled: true }
);

// Phase 2: Store in database
const storedMetrics = [];
for (const recipe of calculatedMetricsResult.enrichedVocabulary.calculatedMetrics) {
  if (!recipe.feasible || (recipe.confidence && recipe.confidence < 0.7)) continue;

  const metric = await createMetric({
    workspaceId: workspaceId,
    connectionId: connectionId,
    name: recipe.name,
    category: categorizeMetric(recipe.name), // Helper function
    semanticDefinition: recipe.semanticDefinition,
    confidence: recipe.confidence,
    feasible: recipe.feasible,
    source: "ai_generated",
  });

  storedMetrics.push(metric);
}

// Update analysis result
await db
  .update(analysis)
  .set({
    calculatedMetricsGenerated: calculatedMetricsResult.totalGenerated,
    calculatedMetricsFeasible: calculatedMetricsResult.feasibleCount,
  })
  .where(eq(analysis.id, analysisId));
```

### Onboarding State Integration

**File:** `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts`

**Add to state:**
```typescript
interface OnboardingProgress {
  // ... existing fields ...
  selectedMetrics?: string[]; // NEW: Metric IDs to add to canvas
}
```

**Add action:**
```typescript
const toggleMetric = (metricId: string) => {
  setProgress((prev) => {
    const selected = prev.selectedMetrics || [];
    return {
      ...prev,
      selectedMetrics: selected.includes(metricId)
        ? selected.filter(id => id !== metricId)
        : [...selected, metricId],
    };
  });
};
```

### Canvas Generation Integration

**File:** `apps/web/src/modules/onboarding/hooks/use-create-canvas.ts`

**Enhance canvas creation:**
```typescript
const createCanvas = async () => {
  const { selectedMetrics } = progress;

  // Generate canvas components
  const components = [
    // ... existing components ...

    // Add metric components
    ...(selectedMetrics || []).map((metricId, index) => ({
      type: "MetricKPI",
      binding: { metricId },
      layout: {
        x: index * 300,
        y: 0,
        width: 280,
        height: 150,
      },
    })),
  ];

  // Create canvas
  const canvas = await api.canvas.$post({
    json: {
      workspaceId,
      connectionId,
      name: "Overview Dashboard",
      components,
    },
  });

  return canvas;
};
```

---

## Testing Strategy {#testing-strategy}

### Unit Tests

**Location:** `packages/ai/src/modules/kpi/__tests__/`

- [x] Phase 1 generation (existing)
- [x] Phase 2 execution (existing)
- [ ] Metric categorization helper
- [ ] Cache key generation
- [ ] Value formatting

**Location:** `packages/api/src/modules/knosia/metrics/__tests__/`

- [ ] Metric CRUD operations
- [ ] Metric execution with different databases
- [ ] Error handling (invalid recipes)
- [ ] Cache behavior

### Integration Tests

**Location:** `packages/api/src/modules/knosia/__tests__/`

- [ ] End-to-end: Onboarding → Metric generation → Storage
- [ ] End-to-end: Fetch metrics → Execute → Display results
- [ ] Multi-database execution (PostgreSQL, MySQL, DuckDB)

### E2E Tests

**Location:** `apps/web/e2e/`

- [ ] Onboarding with metrics
- [ ] Vocabulary metrics tab navigation
- [ ] Adding metric to canvas
- [ ] Metric auto-refresh

### Manual Testing Checklist

**Onboarding:**
- [ ] Metrics appear in review step
- [ ] Selection works correctly
- [ ] "Add to Canvas" creates metric components

**Vocabulary:**
- [ ] Metrics tab loads data
- [ ] Grouping by category works
- [ ] Detail dialog shows full definition
- [ ] "Add to Canvas" button works

**Canvas:**
- [ ] Metric KPI cards render
- [ ] Values display correctly (currency, percentage)
- [ ] Trend indicators accurate
- [ ] Auto-refresh works (wait 5min)
- [ ] Error states display properly

**Performance:**
- [ ] Metric execution < 300ms
- [ ] Cache hit rate > 80%
- [ ] Page load times < 2s

---

## Success Criteria {#success-criteria}

### Functional Requirements

- [ ] **Generation:** 5-10 metrics generated during onboarding
- [ ] **Storage:** Metrics stored in calculated_metric table
- [ ] **Display:** Metrics visible in Vocabulary tab
- [ ] **Execution:** Metrics execute via Phase 2 pipeline
- [ ] **Caching:** Results cached for 5 minutes
- [ ] **Multi-DB:** Works for PostgreSQL, MySQL, DuckDB
- [ ] **Canvas:** Metrics render as KPI cards
- [ ] **Auto-refresh:** Canvas metrics refresh every 5 minutes

### Performance Requirements

- [ ] **Generation:** < 10 seconds for 10 metrics (Haiku)
- [ ] **Execution:** < 300ms per metric (cached)
- [ ] **Cache Hit Rate:** > 80% for repeated queries
- [ ] **Page Load:** Vocabulary tab < 2 seconds
- [ ] **API Response:** < 100ms for metric list

### User Experience Requirements

- [ ] **Onboarding:** Metrics section clear and actionable
- [ ] **Vocabulary:** Easy to browse and understand metrics
- [ ] **Canvas:** Values formatted correctly (currency, %)
- [ ] **Errors:** Graceful failure with helpful messages
- [ ] **Loading:** Skeleton loaders during async operations

### Code Quality Requirements

- [ ] **Type Safety:** All types defined with Zod + TypeScript
- [ ] **Error Handling:** All API calls wrapped in try/catch
- [ ] **Testing:** 80% code coverage for new modules
- [ ] **Documentation:** All public functions documented
- [ ] **Accessibility:** WCAG AA compliance

---

## Rollout Plan

### Week 1: Internal Testing
- Deploy to staging environment
- Test with internal team (5-10 users)
- Gather feedback on UX
- Fix critical bugs

### Week 2: Beta Release
- Deploy to production with feature flag
- Enable for 10% of workspaces
- Monitor error rates and performance
- Iterate based on feedback

### Week 3: General Availability
- Enable for all workspaces
- Announce in changelog
- Create video tutorial
- Monitor adoption metrics

---

## Troubleshooting

### Common Issues

**Metrics not appearing in Vocabulary:**
- Check analysis completed successfully
- Verify metrics stored in DB: `SELECT * FROM knosia.calculated_metric`
- Check connection_id matches current connection

**Metric execution fails:**
- Verify connection string valid
- Check LiquidConnect emitter for database type
- Review DuckDB adapter logs
- Validate semantic definition schema

**Cache not working:**
- Verify Redis connection
- Check cache key generation
- Review TTL configuration
- Monitor cache hit/miss metrics

**Low confidence scores:**
- Review vocabulary quality (profiling data)
- Check business type classification
- Verify LLM prompt tuning
- Consider running enrichment again

---

## Appendix

### Helper Functions

**File:** `packages/api/src/modules/knosia/metrics/helpers.ts`

```typescript
export function categorizeMetric(name: string): string {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("revenue") || lowerName.includes("sales") || lowerName.includes("mrr")) {
    return "revenue";
  }
  if (lowerName.includes("growth") || lowerName.includes("churn") || lowerName.includes("retention")) {
    return "growth";
  }
  if (lowerName.includes("active") || lowerName.includes("usage") || lowerName.includes("engagement")) {
    return "engagement";
  }
  if (lowerName.includes("cost") || lowerName.includes("efficiency") || lowerName.includes("time")) {
    return "operational";
  }

  return "other";
}

export function generateCacheKey(params: {
  metricId: string;
  timeRange?: { start: string; end: string };
  filters?: any[];
}): string {
  const hash = createHash("md5")
    .update(JSON.stringify(params))
    .digest("hex");
  return `metric:${params.metricId}:${hash}`;
}
```

### SQL Queries for Debugging

```sql
-- List all metrics for a workspace
SELECT
  cm.id,
  cm.name,
  cm.category,
  cm.status,
  cm.confidence,
  cm.canvas_count,
  cm.execution_count,
  c.name as connection_name
FROM knosia.calculated_metric cm
JOIN knosia.connection c ON c.id = cm.connection_id
WHERE cm.workspace_id = 'workspace_id_here'
ORDER BY cm.category, cm.name;

-- Find unused metrics
SELECT id, name, canvas_count, execution_count
FROM knosia.calculated_metric
WHERE canvas_count = 0 AND execution_count = 0;

-- Metrics by category
SELECT category, COUNT(*) as count
FROM knosia.calculated_metric
GROUP BY category
ORDER BY count DESC;
```

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-04 | 1.0 | Initial implementation guide |

---

## Document Metadata

**Author:** Claude (Anthropic)
**Reviewers:** TBD
**Approved By:** TBD
**Next Review:** After implementation complete
