# Phase 2: Calculated Metrics API Module - Implementation Prompt

**Date:** 2026-01-04
**Status:** Ready for Implementation
**Prerequisite:** Phase 1 Complete (Database + SSE Integration)
**Duration:** 2-3 hours

---

## Executive Summary

Build the REST API module for calculated metrics that enables CRUD operations, metric execution (Phase 2 execution wrapper), and integration with the Knosia router. This API will allow the frontend to list, create, update, delete, and execute calculated metrics generated during onboarding or created by users.

**What You're Building:**
- Complete API module following Knosia patterns (`schemas.ts`, `queries.ts`, `mutations.ts`, `router.ts`, `execution.ts`)
- 8 REST endpoints for metric management
- Integration with Knosia router
- Type-safe Zod validation
- Database query layer using Drizzle ORM

---

## Phase 1 Context (What Was Built)

### Database Schema

**Table: `knosia_calculated_metric`** (17 columns)
- **Identity:** `id`, `workspaceId`, `connectionId`
- **Definition:** `name`, `category`, `description`, `semanticDefinition` (JSONB)
- **Metadata:** `confidence`, `feasible`, `source` ("ai_generated" | "user_created")
- **Lineage:** `vocabularyItemIds` (links to base vocabulary)
- **Usage:** `canvasCount`, `executionCount`, `lastExecutedAt`
- **Cached Results:** `lastExecutionResult` (JSONB)
- **Governance:** `status` ("active" | "draft" | "deprecated"), `createdBy`
- **Timestamps:** `createdAt`, `updatedAt`

**Enhanced: `knosia_analysis`** (+2 columns)
- `calculatedMetricsGenerated` (total count)
- `calculatedMetricsFeasible` (feasible count)

### SSE Integration (Step 4.5)

**When:** After Step 4 (hard rules), before Step 5 (enrichment)
**What:** Generates 5-10 KPI recipes using LLM (Haiku model)
**How:** `generateAndStoreCalculatedMetrics()` helper function

**Helper Functions Available:**
```typescript
// Location: packages/api/src/modules/knosia/analysis/calculated-metrics.ts

export async function generateAndStoreCalculatedMetrics(input: {
  detectedVocabulary: DetectedVocabulary;
  profilingData: ProfilingData | null;
  businessType: string;
  extractedSchema: ExtractedSchema;
  connectionId: string;
  workspaceId: string;
  analysisId: string;
}): Promise<{
  totalGenerated: number;
  feasibleCount: number;
  storedCount: number;
  categories: string[];
  metrics: Array<{...}>;
}>;
```

### Semantic Definition Structure

```typescript
// From: packages/ai/src/modules/kpi/types.ts
type SemanticMetricDefinition = {
  type: "simple" | "derived" | "cumulative";
  expression: string;
  aggregation?: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";
  entity?: string;
  timeField?: string;
  timeGranularity?: "hour" | "day" | "week" | "month" | "quarter" | "year";
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  dependencies?: string[];
  label?: string;
  description?: string;
  unit?: string;
  format?: {
    type: "number" | "currency" | "percent" | "duration";
    decimals?: number;
    currency?: string;
    prefix?: string;
    suffix?: string;
  };
};
```

---

## Key Files to Read (In Order)

### 1. Architecture Reference
**File:** `.artifacts/2026-01-04-METRICS-IMPLEMENTATION-V2-ALIGNED.md`
- **Read:** Section "API Design" (lines 759-916)
- **Why:** Complete API design, routes, schemas, and patterns

### 2. Database Schema
**File:** `packages/db/src/schema/knosia.ts`
- **Read:** Lines 455-513 (`knosiaCalculatedMetric` table definition)
- **Read:** Lines 1303-1318 (Zod schemas for the table)
- **Why:** Understanding the data model and available fields

### 3. Existing Module Pattern (Reference Implementation)
**File:** `packages/api/src/modules/knosia/canvas/router.ts`
- **Read:** Entire file (~200 lines)
- **Why:** Perfect example of Knosia module structure with Hono routes

**File:** `packages/api/src/modules/knosia/canvas/queries.ts`
- **Read:** Entire file (~150 lines)
- **Why:** Query patterns using Drizzle ORM

**File:** `packages/api/src/modules/knosia/canvas/mutations.ts`
- **Read:** Lines 1-100 (create/update patterns)
- **Why:** Mutation patterns with proper error handling

**File:** `packages/api/src/modules/knosia/canvas/schemas.ts`
- **Read:** Entire file (~100 lines)
- **Why:** Zod schema patterns for validation

### 4. Shared Schemas
**File:** `packages/api/src/modules/knosia/shared-schemas.ts`
- **Read:** Entire file (~50 lines)
- **Why:** Reusable ID schemas (connectionIdSchema, workspaceIdSchema)

### 5. Knosia Router Integration
**File:** `packages/api/src/modules/knosia/router.ts`
- **Read:** Lines 1-50 (router setup and imports)
- **Why:** Where to add the new metrics router

### 6. Phase 1 Helper Functions
**File:** `packages/api/src/modules/knosia/analysis/calculated-metrics.ts`
- **Read:** Lines 330-434 (`generateAndStoreCalculatedMetrics`)
- **Why:** Understand how metrics are created during analysis

### 7. AI Module Types
**File:** `packages/ai/src/modules/kpi/types.ts`
- **Read:** Lines 85-118 (SemanticMetricDefinition)
- **Read:** Lines 120-147 (CalculatedMetricRecipe)
- **Why:** Type definitions for semantic definitions

---

## Module Structure to Create

**Directory:** `packages/api/src/modules/knosia/metrics/`

```
metrics/
├── router.ts           # Hono routes (8 endpoints)
├── schemas.ts          # Zod validation schemas
├── queries.ts          # SELECT operations
├── mutations.ts        # INSERT/UPDATE/DELETE operations
├── execution.ts        # Phase 2 execution wrapper (stub for now)
└── index.ts            # Barrel exports
```

---

## Implementation Requirements

### File 1: `schemas.ts`

**Purpose:** Zod schemas for request validation

```typescript
import { z } from "zod";
import { connectionIdSchema, workspaceIdSchema } from "../shared-schemas";

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const listMetricsSchema = z.object({
  workspaceId: workspaceIdSchema.optional(),
  connectionId: connectionIdSchema.optional(),
  category: z.enum(["revenue", "growth", "engagement", "operational", "other"]).optional(),
  status: z.enum(["active", "draft", "deprecated"]).optional(),
});

export const getMetricSchema = z.object({
  id: z.string(),
});

export const executeMetricSchema = z.object({
  // Phase 2 execution options (stub for now)
  useCache: z.boolean().optional().default(true),
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createMetricSchema = z.object({
  workspaceId: workspaceIdSchema,
  connectionId: connectionIdSchema,
  name: z.string().min(1).max(255),
  category: z.enum(["revenue", "growth", "engagement", "operational", "other"]).optional(),
  description: z.string().optional(),
  semanticDefinition: z.object({
    type: z.enum(["simple", "derived", "cumulative"]),
    expression: z.string(),
    aggregation: z.enum(["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX"]).optional(),
    entity: z.string().optional(),
    timeField: z.string().optional(),
    timeGranularity: z.enum(["hour", "day", "week", "month", "quarter", "year"]).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })).optional(),
  }),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(["ai_generated", "user_created"]).default("user_created"),
});

export const updateMetricSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(["revenue", "growth", "engagement", "operational", "other"]).optional(),
  description: z.string().optional(),
  semanticDefinition: z.object({
    type: z.enum(["simple", "derived", "cumulative"]),
    expression: z.string(),
    aggregation: z.enum(["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX"]).optional(),
    entity: z.string().optional(),
    timeField: z.string().optional(),
    timeGranularity: z.enum(["hour", "day", "week", "month", "quarter", "year"]).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })).optional(),
  }).optional(),
  status: z.enum(["active", "draft", "deprecated"]).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListMetricsInput = z.infer<typeof listMetricsSchema>;
export type GetMetricInput = z.infer<typeof getMetricSchema>;
export type ExecuteMetricInput = z.infer<typeof executeMetricSchema>;
export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;
```

---

### File 2: `queries.ts`

**Purpose:** SELECT operations using Drizzle ORM

**Requirements:**
- `listMetrics()` - List metrics with optional filters
- `getMetric()` - Get single metric by ID
- `getMetricsByConnection()` - Get all metrics for a connection
- Proper error handling
- Return null for not found (not throwing)

**Pattern Reference:**
```typescript
import { eq, and } from "@turbostarter/db";
import { knosiaCalculatedMetric } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import type { ListMetricsInput, GetMetricInput } from "./schemas";

export async function listMetrics(input: ListMetricsInput) {
  const conditions = [];

  if (input.workspaceId) conditions.push(eq(knosiaCalculatedMetric.workspaceId, input.workspaceId));
  if (input.connectionId) conditions.push(eq(knosiaCalculatedMetric.connectionId, input.connectionId));
  if (input.category) conditions.push(eq(knosiaCalculatedMetric.category, input.category));
  if (input.status) conditions.push(eq(knosiaCalculatedMetric.status, input.status));

  return db
    .select()
    .from(knosiaCalculatedMetric)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(knosiaCalculatedMetric.createdAt);
}

export async function getMetric(id: string) {
  const result = await db
    .select()
    .from(knosiaCalculatedMetric)
    .where(eq(knosiaCalculatedMetric.id, id))
    .limit(1);

  return result[0] ?? null;
}

// ... implement getMetricsByConnection()
```

---

### File 3: `mutations.ts`

**Purpose:** INSERT/UPDATE/DELETE operations

**Requirements:**
- `createMetric()` - Create new metric (user or AI generated)
- `updateMetric()` - Update existing metric
- `deleteMetric()` - Soft delete (set status to deprecated) or hard delete
- Use `generateId()` from `@turbostarter/shared/utils`
- Update `updatedAt` timestamp
- Validate workspace/connection exists

**Pattern Reference:**
```typescript
import { eq } from "@turbostarter/db";
import { knosiaCalculatedMetric } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";
import type { CreateMetricInput, UpdateMetricInput } from "./schemas";

export async function createMetric(input: CreateMetricInput) {
  const metricId = generateId();

  const result = await db
    .insert(knosiaCalculatedMetric)
    .values({
      id: metricId,
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      name: input.name,
      category: input.category ?? "other",
      description: input.description ?? null,
      semanticDefinition: input.semanticDefinition as any, // JSONB type assertion
      confidence: input.confidence?.toString() ?? null,
      feasible: true,
      source: input.source,
      vocabularyItemIds: [],
      canvasCount: 0,
      executionCount: 0,
      status: "active",
    })
    .returning();

  return result[0];
}

export async function updateMetric(id: string, input: UpdateMetricInput) {
  const result = await db
    .update(knosiaCalculatedMetric)
    .set({
      ...input,
      semanticDefinition: input.semanticDefinition as any, // JSONB type assertion
      updatedAt: new Date(),
    })
    .where(eq(knosiaCalculatedMetric.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteMetric(id: string, hard = false) {
  if (hard) {
    await db
      .delete(knosiaCalculatedMetric)
      .where(eq(knosiaCalculatedMetric.id, id));
    return true;
  }

  // Soft delete: set status to deprecated
  await db
    .update(knosiaCalculatedMetric)
    .set({ status: "deprecated", updatedAt: new Date() })
    .where(eq(knosiaCalculatedMetric.id, id));

  return true;
}
```

---

### File 4: `execution.ts`

**Purpose:** Phase 2 execution wrapper (stub for now)

**Requirements:**
- Stub implementation that returns mock data
- Add TODO comment for Phase 2 implementation
- Cache-aware (check `lastExecutionResult`)
- Return formatted values

```typescript
import type { ExecuteMetricInput } from "./schemas";
import { getMetric } from "./queries";
import { db } from "@turbostarter/db/server";
import { knosiaCalculatedMetric } from "@turbostarter/db/schema";
import { eq } from "@turbostarter/db";

export interface ExecutionResult {
  value: number | string;
  formattedValue: string;
  executedAt: string;
  executionTimeMs: number;
  fromCache: boolean;
}

/**
 * Execute a calculated metric and return the result
 *
 * Phase 1 (Current): Returns mock data for testing
 * Phase 2 (Future): Will use LiquidConnect SemanticLayer to execute recipe
 */
export async function executeMetricWithCache(
  metricId: string,
  options: ExecuteMetricInput = {}
): Promise<ExecutionResult> {
  const metric = await getMetric(metricId);

  if (!metric) {
    throw new Error(`Metric not found: ${metricId}`);
  }

  // Check cache if enabled
  if (options.useCache && metric.lastExecutionResult) {
    return {
      ...(metric.lastExecutionResult as ExecutionResult),
      fromCache: true,
    };
  }

  // TODO: Phase 2 - Implement actual execution using LiquidConnect
  // const semanticLayer = new SemanticLayer(connectionString);
  // const result = await semanticLayer.executeMetric(metric.semanticDefinition);

  // For now, return mock data
  const mockValue = Math.floor(Math.random() * 100000);
  const result: ExecutionResult = {
    value: mockValue,
    formattedValue: `$${mockValue.toLocaleString()}`,
    executedAt: new Date().toISOString(),
    executionTimeMs: 125,
    fromCache: false,
  };

  // Update cache
  await db
    .update(knosiaCalculatedMetric)
    .set({
      lastExecutionResult: result as any,
      lastExecutedAt: new Date(),
      executionCount: (metric.executionCount ?? 0) + 1,
    })
    .where(eq(knosiaCalculatedMetric.id, metricId));

  return result;
}
```

---

### File 5: `router.ts`

**Purpose:** Hono REST API routes

**Requirements:**
- 8 endpoints (GET list, GET by ID, POST create, PATCH update, DELETE, POST execute, GET by connection)
- Use middleware: `enforceAuth`, `enforceMembership`
- Use `zValidator` for input validation
- Proper error responses (404, 400, 500)
- JSON responses

**Pattern Reference:**
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
      const query = c.req.valid("query");
      const metrics = await listMetrics(query);
      return c.json({ metrics });
    }
  )

  // Get single metric
  .get(
    "/:id",
    enforceAuth,
    enforceMembership,
    async (c) => {
      const id = c.req.param("id");
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
    zValidator("json", schemas.executeMetricSchema),
    async (c) => {
      const id = c.req.param("id");
      const options = c.req.valid("json");

      try {
        const result = await executeMetricWithCache(id, options);
        return c.json({ result });
      } catch (error) {
        return c.json({
          error: error instanceof Error ? error.message : "Execution failed"
        }, 500);
      }
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
    zValidator("json", schemas.updateMetricSchema),
    async (c) => {
      const id = c.req.param("id");
      const data = c.req.valid("json");

      const metric = await updateMetric(id, data);

      if (!metric) {
        return c.json({ error: "Metric not found" }, 404);
      }

      return c.json({ metric });
    }
  )

  // Delete metric
  .delete(
    "/:id",
    enforceAuth,
    enforceMembership,
    async (c) => {
      const id = c.req.param("id");
      await deleteMetric(id, false); // Soft delete by default
      return c.json({ success: true });
    }
  )

  // Get metrics by connection (for Vocabulary page)
  .get(
    "/connection/:connectionId",
    enforceAuth,
    enforceMembership,
    async (c) => {
      const connectionId = c.req.param("connectionId");
      const metrics = await listMetrics({ connectionId });
      return c.json({ metrics });
    }
  );
```

---

### File 6: `index.ts`

**Purpose:** Barrel exports

```typescript
export * from "./router";
export * from "./schemas";
export * from "./queries";
export * from "./mutations";
export * from "./execution";
```

---

### File 7: Integration with Knosia Router

**File:** `packages/api/src/modules/knosia/router.ts`

**Change Required:**
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
  .route("/metrics", metricsRouter); // NEW LINE
```

---

## Testing Requirements

### Manual Testing (via Postman/curl)

**1. List Metrics**
```bash
GET /api/knosia/metrics?connectionId={connectionId}
Authorization: Bearer {token}
```

**2. Get Single Metric**
```bash
GET /api/knosia/metrics/{metricId}
Authorization: Bearer {token}
```

**3. Create Metric**
```bash
POST /api/knosia/metrics
Authorization: Bearer {token}
Content-Type: application/json

{
  "workspaceId": "ws_123",
  "connectionId": "conn_456",
  "name": "Test Revenue",
  "category": "revenue",
  "description": "Total revenue for testing",
  "semanticDefinition": {
    "type": "simple",
    "expression": "amount",
    "aggregation": "SUM",
    "entity": "orders"
  },
  "source": "user_created"
}
```

**4. Execute Metric**
```bash
POST /api/knosia/metrics/{metricId}/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "useCache": true
}
```

**5. Update Metric**
```bash
PATCH /api/knosia/metrics/{metricId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Test Revenue",
  "status": "active"
}
```

**6. Delete Metric**
```bash
DELETE /api/knosia/metrics/{metricId}
Authorization: Bearer {token}
```

---

## Success Criteria

### Functional Requirements
- ✅ All 8 endpoints working and returning expected responses
- ✅ Metrics created during onboarding are retrievable via API
- ✅ User can create new metrics via POST endpoint
- ✅ User can update existing metrics
- ✅ User can delete metrics (soft delete)
- ✅ Execute endpoint returns mock data (stub for Phase 2)
- ✅ Proper error handling (404, 400, 500)

### Code Quality Requirements
- ✅ TypeScript compiles with zero errors
- ✅ Follows Knosia module structure exactly
- ✅ Uses Drizzle ORM for all database operations
- ✅ Proper Zod validation on all endpoints
- ✅ Middleware applied correctly (auth, membership)
- ✅ JSONB type assertions used for `semanticDefinition`

### Integration Requirements
- ✅ Router integrated into `knosiaRouter`
- ✅ Routes accessible at `/api/knosia/metrics/*`
- ✅ Works with existing auth middleware
- ✅ Can query metrics generated during onboarding

---

## Common Patterns to Follow

### 1. Error Handling
```typescript
if (!metric) {
  return c.json({ error: "Metric not found" }, 404);
}
```

### 2. Drizzle WHERE Conditions
```typescript
const conditions = [];
if (input.status) conditions.push(eq(table.status, input.status));

.where(conditions.length > 0 ? and(...conditions) : undefined)
```

### 3. JSONB Type Assertions
```typescript
semanticDefinition: input.semanticDefinition as any
```

### 4. Timestamp Updates
```typescript
.set({ ...input, updatedAt: new Date() })
```

### 5. ID Generation
```typescript
import { generateId } from "@turbostarter/shared/utils";
const id = generateId(); // NOT UUID
```

---

## Key Design Decisions

### 1. Why Separate Table?
- Base vocabulary: Auto-detected from schema (read-only except aliases)
- Calculated metrics: User-creatable, editable, deletable (different lifecycle)

### 2. Why Soft Delete?
- Metrics may be referenced in canvases/threads
- Keep history for auditing
- Can be restored if needed

### 3. Why Mock Execution?
- Phase 2 execution requires LiquidConnect SemanticLayer integration
- Mock allows frontend development to proceed in parallel
- Proper interface contract is established

### 4. Why JSONB for semanticDefinition?
- Flexible schema (different metric types have different fields)
- Database-agnostic (works across PostgreSQL, MySQL, DuckDB)
- Aligns with LiquidConnect MetricDefinition structure

---

## Documentation References

### Knosia Architecture
- **File:** `.docs/knosia-architecture.md`
- **Section:** "API Modules" and "Database Schema"

### TurboStarter Framework
- **File:** `.context/turbostarter-framework-context/index.md`
- **Section:** "API Development" and "Middleware"

### Claude.md Instructions
- **File:** `CLAUDE.md`
- **Section:** "Creating API Endpoints" (lines 173-200)

---

## Commit Message Template

```
feat(knosia): implement calculated metrics API module (Phase 2)

Complete REST API for calculated metrics CRUD and execution.

API Module Structure:
- schemas.ts: Zod validation (list, get, create, update, execute)
- queries.ts: SELECT operations (listMetrics, getMetric, getMetricsByConnection)
- mutations.ts: INSERT/UPDATE/DELETE (createMetric, updateMetric, deleteMetric)
- execution.ts: Metric execution wrapper (Phase 2 stub with mock data)
- router.ts: 8 Hono endpoints with auth middleware
- index.ts: Barrel exports

Endpoints:
- GET    /api/knosia/metrics - List metrics with filters
- GET    /api/knosia/metrics/:id - Get single metric
- POST   /api/knosia/metrics - Create new metric
- PATCH  /api/knosia/metrics/:id - Update metric
- DELETE /api/knosia/metrics/:id - Delete metric (soft delete)
- POST   /api/knosia/metrics/:id/execute - Execute metric (get value)
- GET    /api/knosia/metrics/connection/:connectionId - Get by connection

Integration:
- Added metricsRouter to knosiaRouter
- Routes accessible at /api/knosia/metrics/*
- Works with existing auth middleware

Testing:
- All endpoints tested via Postman
- CRUD operations working correctly
- Execution returns mock data (ready for Phase 2)

Next: Frontend components (Phase 3)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Quick Start Checklist

Before starting:
- [ ] Read `.artifacts/2026-01-04-METRICS-IMPLEMENTATION-V2-ALIGNED.md` (API Design section)
- [ ] Read `packages/api/src/modules/knosia/canvas/router.ts` (reference pattern)
- [ ] Read `packages/db/src/schema/knosia.ts` (lines 455-513)
- [ ] Verify Phase 1 complete: `git log --oneline | grep "calculated metrics"`

Implementation order:
1. [ ] Create `metrics/schemas.ts` (Zod validation)
2. [ ] Create `metrics/queries.ts` (SELECT operations)
3. [ ] Create `metrics/mutations.ts` (INSERT/UPDATE/DELETE)
4. [ ] Create `metrics/execution.ts` (Phase 2 stub)
5. [ ] Create `metrics/router.ts` (Hono routes)
6. [ ] Create `metrics/index.ts` (barrel exports)
7. [ ] Update `knosia/router.ts` (add metricsRouter)
8. [ ] Test all endpoints via Postman
9. [ ] TypeScript compilation check
10. [ ] Commit with template message

---

**END OF PROMPT**
