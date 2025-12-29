# Knosia ↔ LiquidConnect Integration

> **FINAL** unified context document for implementation.
> This is the single source of truth for Knosia API development.
> Updated: 2025-12-29 18:00

---

## Quick Start

```bash
# Start implementation
claude "Read .claude/artifacts/2025-12-29-1715-FINAL-knosia-liquidconnect-integration.md and implement Phase 1"
```

**Who implements:** Knosia API Agent (LiquidConnect is complete library)

**What to build:** Wire Knosia API modules to consume LiquidConnect exports

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Current State](#current-state)
3. [TurboStarter Patterns](#turbostarter-patterns)
4. [Knosia Database Schema](#knosia-database-schema)
5. [Architecture Decisions](#architecture-decisions)
6. [Data Transformation Pipeline](#data-transformation-pipeline)
7. [Type Mappings](#type-mappings)
8. [Implementation Phases](#implementation-phases)
9. [Files Summary](#files-summary)
10. [Testing Checklist](#testing-checklist)
11. [Environment](#environment)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    "Show me revenue by region last month"               │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                           KNOSIA API LAYER                               │
│  packages/api/src/modules/knosia/                                        │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ connections/ │  │  analysis/   │  │ vocabulary/  │  │conversation/ │ │
│  │ Test + CRUD  │  │ UVB extract  │  │   Compile    │  │ Query Engine │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      @repo/liquid-connect (Library)                      │
│  packages/liquid-connect/src/                                            │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │PostgresAdapter│  │extractSchema │  │compileVocab  │  │ QueryEngine  │ │
│  │   .query()   │  │applyHardRules│  │  ulary()     │  │.queryWith    │ │
│  │   .connect() │  │              │  │              │  │  Aliases()   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   compile()  │  │   emit()     │  │ SemanticLayer│   594 tests ✅    │
│  │  DSL → AST   │  │  IR → SQL    │  │  definitions │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Current State

### LiquidConnect ✅ COMPLETE

| Component | Status | Tests |
|-----------|--------|-------|
| Query Engine | ✅ | 594 |
| Vocabulary Compiler | ✅ | included |
| UVB (7 Hard Rules) | ✅ | included |
| PostgresAdapter | ✅ | has query() |
| LC Compiler (DSL→SQL) | ✅ v7 | included |
| Emitters (postgres/duckdb/trino) | ✅ | included |

### Knosia API ⏳ STUBS (needs implementation)

| Module | Status | Work Needed |
|--------|--------|-------------|
| connections | ⏳ Mock | Use PostgresAdapter |
| analysis | ⏳ Mock | Call extractSchema + applyHardRules |
| vocabulary | ⏳ Mock | Call compileVocabulary |
| conversation | ⏳ Mock | Call createQueryEngine |
| briefing | ⏳ Mock | Query pinned metrics |
| preferences | ✅ Done | - |

### Database Schema ✅ COMPLETE (needs 1 migration)

15 tables in `packages/db/src/schema/knosia.ts`

**Migration needed:** Add `compiledVocabulary` + `vocabularyVersion` columns to `knosiaWorkspace`

---

## TurboStarter Patterns

### API Structure (Hono)

TurboStarter uses Hono for type-safe APIs. All endpoints in `packages/api/src/modules/`.

```
packages/api/src/modules/knosia/
├── router.ts              # Main router, aggregates sub-routers
├── connections/
│   ├── router.ts          # Sub-router for /connections/*
│   ├── queries.ts         # GET handlers
│   ├── mutations.ts       # POST/PUT/DELETE handlers
│   └── schema.ts          # Zod validation schemas
├── analysis/
│   ├── router.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── schema.ts
├── vocabulary/
│   ├── router.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── schema.ts
├── conversation/
│   ├── router.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── schema.ts
└── shared/
    ├── transforms.ts      # Type transformations
    └── semantic.ts        # SemanticLayer builder
```

### Router Pattern

```typescript
// modules/knosia/connections/router.ts
import { Hono } from "hono";
import { enforceAuth, validate } from "../../../middleware";
import { testConnection, createConnection } from "./mutations";
import { getConnections, getConnection } from "./queries";
import { testConnectionSchema, createConnectionSchema } from "./schema";

export const connectionsRouter = new Hono()
  // GET /connections
  .get("/", enforceAuth, (c) => getConnections(c.var.user.id))
  // GET /connections/:id
  .get("/:id", enforceAuth, (c) => getConnection(c.req.param("id")))
  // POST /connections/test
  .post("/test", enforceAuth, validate("json", testConnectionSchema), (c) =>
    testConnection(c.req.valid("json"))
  )
  // POST /connections
  .post("/", enforceAuth, validate("json", createConnectionSchema), (c) =>
    createConnection(c.var.user.id, c.req.valid("json"))
  );
```

### Main Router Registration

```typescript
// modules/knosia/router.ts
import { Hono } from "hono";
import { connectionsRouter } from "./connections/router";
import { analysisRouter } from "./analysis/router";
import { vocabularyRouter } from "./vocabulary/router";
import { conversationRouter } from "./conversation/router";

export const knosiaRouter = new Hono()
  .route("/connections", connectionsRouter)
  .route("/analysis", analysisRouter)
  .route("/vocabulary", vocabularyRouter)
  .route("/conversation", conversationRouter);

// Then in packages/api/src/index.ts:
// .route("/knosia", knosiaRouter)
```

### Authentication Middleware

```typescript
// Always use enforceAuth for protected routes
import { enforceAuth } from "../../middleware";

// Access authenticated user via c.var.user
export const getConnections = async (userId: string) => {
  // userId comes from c.var.user.id
};
```

### Validation with Zod

```typescript
// modules/knosia/connections/schema.ts
import { z } from "zod";

export const testConnectionSchema = z.object({
  type: z.enum(["postgres", "mysql", "snowflake", "bigquery", "redshift", "duckdb"]),
  host: z.string().min(1),
  port: z.number().optional().default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  sslEnabled: z.boolean().optional().default(true),
});

export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
```

### Database Access

```typescript
// Use Drizzle ORM
import { db } from "@turbostarter/db/server";
import { knosiaConnection, knosiaWorkspace } from "@turbostarter/db/schema";
import { eq, and } from "drizzle-orm";

// Query example
const connections = await db.query.knosiaConnection.findMany({
  where: eq(knosiaConnection.orgId, orgId),
});

// Insert example
await db.insert(knosiaConnection).values({
  orgId,
  name: input.name,
  type: input.type,
  // ...
});

// Update example
await db.update(knosiaWorkspace)
  .set({ compiledVocabulary: compiled })
  .where(eq(knosiaWorkspace.id, workspaceId));
```

### Migrations

```bash
# After schema changes, generate migration
pnpm with-env turbo db:generate

# Apply migration
pnpm with-env pnpm --filter @turbostarter/db db:migrate

# For development only - push directly (dangerous)
pnpm with-env pnpm --filter @turbostarter/db db:push
```

---

## Knosia Database Schema

### Tables Overview (15 tables)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PLATFORM LAYER                                 │
│  ┌─────────────────────┐                                                │
│  │ knosiaOrganization  │ ← Top-level org entity                         │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│  ┌──────────▼──────────┐     ┌─────────────────────┐                    │
│  │   knosiaWorkspace   │────▶│ knosiaRoleTemplate  │                    │
│  └──────────┬──────────┘     └─────────────────────┘                    │
│             │                                                            │
└─────────────┼───────────────────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────────────────┐
│                          CONNECTION LAYER                                │
│  ┌─────────────────────┐     ┌─────────────────────────┐                │
│  │   knosiaConnection  │────▶│ knosiaConnectionHealth  │                │
│  └──────────┬──────────┘     └─────────────────────────┘                │
│             │                                                            │
│             ├───────────────▶┌─────────────────────────┐                │
│             │                │ knosiaConnectionSchema  │                │
│             │                └─────────────────────────┘                │
│             │                                                            │
│  ┌──────────▼──────────────┐                                            │
│  │knosiaWorkspaceConnection│ ← Junction table                           │
│  └─────────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          VOCABULARY LAYER                                │
│  ┌─────────────────────────┐     ┌─────────────────────────┐            │
│  │  knosiaVocabularyItem   │────▶│ knosiaVocabularyVersion │            │
│  └─────────────────────────┘     └─────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            USER LAYER                                    │
│  ┌───────────────────────────┐     ┌─────────────────────────┐          │
│  │ knosiaWorkspaceMembership │     │  knosiaUserPreference   │          │
│  └───────────────────────────┘     └─────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        INTELLIGENCE LAYER                                │
│  ┌─────────────────────┐     ┌─────────────────────┐                    │
│  │    knosiaAnalysis   │     │  knosiaConversation │                    │
│  └─────────────────────┘     └──────────┬──────────┘                    │
│                                         │                                │
│                              ┌──────────▼──────────────┐                │
│                              │knosiaConversationMessage│                │
│                              └─────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         GOVERNANCE LAYER                                 │
│  ┌─────────────────────────┐                                            │
│  │  knosiaMismatchReport   │                                            │
│  └─────────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Tables Detail

#### knosiaWorkspace

```typescript
export const knosiaWorkspace = pgTable("knosia_workspace", {
  id: text().primaryKey().$defaultFn(generateId),
  orgId: text().references(() => knosiaOrganization.id).notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  description: text(),
  icon: text(),
  visibility: knosiaWorkspaceVisibilityEnum().default("org_wide"),
  defaults: jsonb().$type<{
    comparisonPeriod?: "WoW" | "MoM" | "QoQ" | "YoY";
    currency?: string;
    timezone?: string;
    fiscalYearStart?: string;
  }>(),
  aiConfig: jsonb().$type<{...}>(),
  // ⚠️ MISSING - Add in migration:
  // compiledVocabulary: jsonb().$type<CompiledVocabulary>(),
  // vocabularyVersion: integer().default(1),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().$onUpdate(() => new Date()),
});
```

#### knosiaVocabularyItem

```typescript
export const knosiaVocabularyItem = pgTable("knosia_vocabulary_item", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text().references(() => knosiaWorkspace.id),
  orgId: text().references(() => knosiaOrganization.id).notNull(),
  canonicalName: text().notNull(),          // "Total Revenue"
  abbreviation: text(),                      // "Rev"
  slug: text().notNull(),                    // "total_revenue"
  aliases: jsonb().$type<string[]>(),        // ["revenue", "sales"]
  type: knosiaVocabularyTypeEnum().notNull(), // metric|dimension|entity|event
  category: text(),
  semantics: jsonb().$type<{
    direction?: "higher_is_better" | "lower_is_better" | "target_range";
    format?: "currency" | "percentage" | "count" | "duration" | "ratio";
    grain?: "daily" | "weekly" | "monthly" | "point_in_time";
    sensitivity?: "public" | "internal" | "confidential" | "pii";
  }>(),
  // UVB extraction metadata
  aggregation: knosiaAggregationEnum(),       // SUM|AVG|COUNT|MIN|MAX
  aggregationConfidence: integer(),           // 0-100
  cardinality: integer(),
  isPrimaryTime: boolean().default(false),
  joinsTo: jsonb().$type<{
    target: string;
    via: string;
    type: "many_to_one" | "one_to_many" | "many_to_many";
  }[]>(),
  // Definition
  definition: jsonb().$type<{
    descriptionHuman?: string;
    formulaHuman?: string;
    formulaSql?: string;      // For computed metrics
    sourceTables?: string[];
    sourceColumn?: string;    // For simple column mappings
    caveats?: string[];
    exampleValues?: { low?: string; typical?: string; high?: string };
  }>(),
  status: knosiaVocabularyStatusEnum().default("draft"),
  currentVersion: integer().default(1),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().$onUpdate(() => new Date()),
});
```

#### knosiaUserPreference

```typescript
export const knosiaUserPreference = pgTable("knosia_user_preference", {
  id: text().primaryKey().$defaultFn(generateId),
  userId: text().references(() => user.id).notNull(),
  workspaceId: text().references(() => knosiaWorkspace.id).notNull(),
  favorites: jsonb().$type<{
    pinnedMetrics?: string[];
    pinnedDashboards?: string[];
    pinnedQueries?: string[];
    pinnedFilters?: { field: string; value: unknown }[];
  }>(),
  aliases: jsonb().$type<Record<string, string>>(), // ← Used by Query Engine!
  notes: jsonb().$type<Record<string, string>>(),
  hiddenItems: jsonb().$type<string[]>(),
  notification: jsonb().$type<{...}>(),
  comparisonPeriod: text().default("MoM"),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().$onUpdate(() => new Date()),
});
```

#### knosiaAnalysis

```typescript
export const knosiaAnalysis = pgTable("knosia_analysis", {
  id: text().primaryKey().$defaultFn(generateId),
  connectionId: text().references(() => knosiaConnection.id).notNull(),
  workspaceId: text().references(() => knosiaWorkspace.id),
  status: knosiaAnalysisStatusEnum().default("running"), // running|completed|failed
  currentStep: integer().default(0),
  totalSteps: integer().default(5),
  summary: jsonb().$type<{
    tables?: number;
    metrics?: number;
    dimensions?: number;
    entities?: string[];
  }>(),
  detectedVocab: jsonb().$type<{  // ← UVB output stored here
    entities?: unknown[];
    metrics?: unknown[];
    dimensions?: unknown[];
    timeFields?: unknown[];
    filters?: unknown[];
    relationships?: unknown[];
  }>(),
  error: jsonb().$type<{ code?: string; message?: string; details?: string }>(),
  startedAt: timestamp().notNull().defaultNow(),
  completedAt: timestamp(),
});
```

### Enums Reference

```typescript
// Connection types
knosiaConnectionTypeEnum: "postgres" | "mysql" | "snowflake" | "bigquery" | "redshift" | "duckdb"

// Vocabulary types
knosiaVocabularyTypeEnum: "metric" | "dimension" | "entity" | "event"

// Aggregations
knosiaAggregationEnum: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX"

// Statuses
knosiaAnalysisStatusEnum: "running" | "completed" | "failed"
knosiaVocabularyStatusEnum: "approved" | "draft" | "deprecated" | "archived"
knosiaConnectionStatusEnum: "connected" | "error" | "stale"
```

### Required Migration

```typescript
// Add to knosiaWorkspace table
compiledVocabulary: jsonb().$type<CompiledVocabulary>(),
vocabularyVersion: integer().default(1),
```

```sql
-- Migration SQL
ALTER TABLE knosia_workspace
  ADD COLUMN compiled_vocabulary jsonb,
  ADD COLUMN vocabulary_version integer DEFAULT 1;
```

---

## Architecture Decisions

### 1. Storage Strategy

| What | Where | Cached? |
|------|-------|---------|
| CompiledVocabulary | `knosiaWorkspace.compiledVocabulary` | ✅ Yes |
| SemanticLayer | Generated on-the-fly | No |
| User Aliases | `knosiaUserPreference.aliases` | Per-request |
| Detected Vocab | `knosiaAnalysis.detectedVocab` | Per-analysis |

**Reasoning:** CompiledVocabulary is smaller, changes rarely. SemanticLayer needs fresh schema data.

### 2. Execution Strategy

**Use PostgresAdapter for BOTH extraction AND queries:**

```typescript
import { PostgresAdapter } from '@repo/liquid-connect';

const adapter = new PostgresAdapter(config);
await adapter.connect();

// Schema extraction (analysis module)
const schema = await extractSchema(adapter);

// Query execution (conversation module)
const rows = await adapter.query<T>(sql, params);

await adapter.disconnect();
```

### 3. User Alias Strategy

```typescript
const prefs = await getUserPreferences(userId, workspaceId);
const result = engine.queryWithAliases(query, prefs?.aliases ?? {});
```

### 4. Relationship Strategy

Relationships DON'T flow through Query Engine. They flow through:
```
SemanticLayer.relationships → Resolver → Emitter → JOIN SQL
```

Query Engine just outputs: `Q @revenue #customer_region`
Resolver figures out the join path.

---

## Data Transformation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KNOSIA DATABASE                                  │
│                                                                          │
│  knosiaVocabularyItem[]                                                  │
│    { slug, canonicalName, type, aggregation, definition, ... }           │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   transformToDetectedVocabulary()                        │
│                   (packages/api/.../shared/transforms.ts)                │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DetectedVocabulary                                │
│  { metrics: DetectedMetric[], dimensions: DetectedDimension[], ... }     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        compileVocabulary()                               │
│                        (@repo/liquid-connect)                            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       CompiledVocabulary                                 │
│  → Store in knosiaWorkspace.compiledVocabulary                           │
│  → Pass to createQueryEngine()                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Type Mappings

### knosiaVocabularyItem → DetectedMetric

```typescript
function toDetectedMetric(item: SelectKnosiaVocabularyItem): DetectedMetric {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,                              // slug as ID
    name: item.slug,                            // internal name
    table: def?.sourceTables?.[0] ?? '',        // source table
    column: def?.sourceColumn ?? item.slug,     // DB column (NOT formulaSql!)
    dataType: 'decimal',
    aggregation: item.aggregation ?? 'SUM',
    certainty: item.aggregationConfidence ?? 80,
    suggestedDisplayName: item.canonicalName,
    expression: def?.formulaSql,                // ONLY for computed metrics
  };
}
```

**Critical:** `column` = DB column name, `expression` = computed formula

### knosiaVocabularyItem → DetectedDimension

```typescript
function toDetectedDimension(item: SelectKnosiaVocabularyItem): DetectedDimension {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? '',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'varchar',
    cardinality: item.cardinality ?? undefined,
    certainty: item.aggregationConfidence ?? 80,
  };
}
```

### Full Transform Function

```typescript
// packages/api/src/modules/knosia/shared/transforms.ts

import type {
  DetectedVocabulary,
  DetectedMetric,
  DetectedDimension,
  DetectedTimeField,
  DetectedFilter,
} from '@repo/liquid-connect';
import type { SelectKnosiaVocabularyItem } from '@turbostarter/db/schema';

interface VocabDefinition {
  descriptionHuman?: string;
  formulaHuman?: string;
  formulaSql?: string;
  sourceTables?: string[];
  sourceColumn?: string;
  caveats?: string[];
}

export function transformToDetectedVocabulary(
  items: SelectKnosiaVocabularyItem[]
): DetectedVocabulary {
  return {
    entities: [],  // Not used by Query Engine
    metrics: items.filter(i => i.type === 'metric').map(toDetectedMetric),
    dimensions: items.filter(i => i.type === 'dimension').map(toDetectedDimension),
    timeFields: items.filter(i => i.isPrimaryTime).map(toDetectedTimeField),
    filters: items.filter(i => i.type === 'filter').map(toDetectedFilter),
    relationships: [],  // Handled by SemanticLayer in Resolver
  };
}

function toDetectedTimeField(item: SelectKnosiaVocabularyItem): DetectedTimeField {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? '',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'timestamp',
    isPrimary: item.isPrimaryTime ?? false,
    certainty: item.aggregationConfidence ?? 80,
  };
}

function toDetectedFilter(item: SelectKnosiaVocabularyItem): DetectedFilter {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? '',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'boolean',
    certainty: item.aggregationConfidence ?? 80,
  };
}
```

---

## Implementation Phases

### Phase 1: Connection Testing
**File:** `packages/api/src/modules/knosia/connections/mutations.ts`

```typescript
import { PostgresAdapter } from '@repo/liquid-connect';

export async function testDatabaseConnection(input: TestConnectionInput) {
  const adapter = new PostgresAdapter({
    host: input.host,
    port: input.port ?? 5432,
    database: input.database,
    user: input.username,
    password: input.password,
    ssl: input.sslEnabled,
  });

  const startTime = Date.now();
  try {
    await adapter.connect();
    await adapter.query('SELECT 1');
    const latencyMs = Date.now() - startTime;
    await adapter.disconnect();

    return { success: true, message: `Connected to ${input.type}`, latencyMs };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
```

### Phase 2: Schema Extraction
**File:** `packages/api/src/modules/knosia/analysis/mutations.ts`

```typescript
import { PostgresAdapter, extractSchema, applyHardRules } from '@repo/liquid-connect';
import { db } from '@turbostarter/db/server';
import { knosiaAnalysis, knosiaConnection } from '@turbostarter/db/schema';
import { eq } from 'drizzle-orm';

export async function runAnalysis(input: RunAnalysisInput) {
  const connection = await db.query.knosiaConnection.findFirst({
    where: eq(knosiaConnection.id, input.connectionId),
  });

  if (!connection) throw new Error('Connection not found');

  const adapter = new PostgresAdapter({
    host: connection.host,
    port: connection.port ?? 5432,
    database: connection.database,
    user: decrypt(connection.credentials).username,
    password: decrypt(connection.credentials).password,
  });

  await adapter.connect();
  try {
    const schema = await extractSchema(adapter, { schema: connection.schema ?? 'public' });
    const { detected, confirmations } = applyHardRules(schema);

    await db.update(knosiaAnalysis).set({
      status: 'completed',
      detectedVocab: detected,
      summary: {
        tables: schema.tables.length,
        metrics: detected.metrics.length,
        dimensions: detected.dimensions.length,
      },
      completedAt: new Date(),
    }).where(eq(knosiaAnalysis.id, input.analysisId));

    return { analysisId: input.analysisId, confirmations };
  } finally {
    await adapter.disconnect();
  }
}
```

### Phase 3: Vocabulary Compilation
**File:** `packages/api/src/modules/knosia/vocabulary/mutations.ts`

```typescript
import { compileVocabulary } from '@repo/liquid-connect';
import { transformToDetectedVocabulary } from '../shared/transforms';
import { db } from '@turbostarter/db/server';
import { knosiaWorkspace, knosiaVocabularyItem } from '@turbostarter/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function confirmVocabulary(input: ConfirmVocabularyInput) {
  // Save confirmed items
  await saveVocabularyItems(input.items);

  // Load all vocabulary
  const items = await db.query.knosiaVocabularyItem.findMany({
    where: eq(knosiaVocabularyItem.workspaceId, input.workspaceId),
  });

  // Transform and compile
  const detected = transformToDetectedVocabulary(items);
  const compiled = compileVocabulary(detected, {
    includeDefaultPatterns: true,
    includeGlobalSynonyms: true,
  });

  // Cache in workspace
  await db.update(knosiaWorkspace).set({
    compiledVocabulary: compiled,
    vocabularyVersion: sql`vocabulary_version + 1`,
  }).where(eq(knosiaWorkspace.id, input.workspaceId));

  return { success: true };
}
```

### Phase 4: Query Processing
**File:** `packages/api/src/modules/knosia/conversation/queries.ts`

```typescript
import {
  createQueryEngine,
  PostgresAdapter,
  compile,
  emit,
  type CompiledVocabulary,
} from '@repo/liquid-connect';
import { db } from '@turbostarter/db/server';
import {
  knosiaWorkspace,
  knosiaUserPreference,
  knosiaConnection,
} from '@turbostarter/db/schema';
import { eq, and } from 'drizzle-orm';

export async function processQuery(input: ConversationQueryInput) {
  // 1. Load workspace vocabulary (cached)
  const workspace = await db.query.knosiaWorkspace.findFirst({
    where: eq(knosiaWorkspace.id, input.workspaceId),
  });

  if (!workspace?.compiledVocabulary) {
    return { type: 'error', error: { message: 'No vocabulary. Run analysis first.' } };
  }

  // 2. Get user aliases
  const prefs = await db.query.knosiaUserPreference.findFirst({
    where: and(
      eq(knosiaUserPreference.userId, input.userId),
      eq(knosiaUserPreference.workspaceId, input.workspaceId),
    ),
  });

  // 3. Query Engine: NL → DSL
  const engine = createQueryEngine(workspace.compiledVocabulary as CompiledVocabulary);
  const nlResult = engine.queryWithAliases(input.query, prefs?.aliases ?? {});

  if (!nlResult.success) {
    return {
      type: 'clarification',
      clarification: {
        message: nlResult.error,
        suggestions: nlResult.suggestions,
      },
    };
  }

  // 4. Compiler: DSL → SQL
  const semanticLayer = buildSemanticLayer(workspace); // Generated on-the-fly
  const compileResult = compile(nlResult.lcOutput!, semanticLayer);

  if (!compileResult.success) {
    return { type: 'error', error: { message: compileResult.error } };
  }

  const sqlResult = emit(compileResult.flow!, 'postgres');

  // 5. Execute SQL
  const connection = await getWorkspaceConnection(input.workspaceId);
  const adapter = new PostgresAdapter({
    host: connection.host,
    port: connection.port ?? 5432,
    database: connection.database,
    user: decrypt(connection.credentials).username,
    password: decrypt(connection.credentials).password,
  });

  await adapter.connect();
  try {
    const data = await adapter.query(sqlResult.sql, sqlResult.params);
    return {
      type: 'visualization',
      visualization: {
        type: inferChartType(nlResult),
        data,
        sql: sqlResult.sql,
      },
    };
  } finally {
    await adapter.disconnect();
  }
}
```

---

## Files Summary

### Create

| File | Purpose |
|------|---------|
| `packages/api/src/modules/knosia/router.ts` | Main Knosia router |
| `packages/api/src/modules/knosia/shared/transforms.ts` | Type transformations |
| `packages/api/src/modules/knosia/shared/semantic.ts` | SemanticLayer builder |
| `packages/api/src/modules/knosia/connections/router.ts` | Connections sub-router |
| `packages/api/src/modules/knosia/connections/queries.ts` | GET handlers |
| `packages/api/src/modules/knosia/connections/mutations.ts` | POST handlers |
| `packages/api/src/modules/knosia/connections/schema.ts` | Zod schemas |
| `packages/api/src/modules/knosia/analysis/router.ts` | Analysis sub-router |
| `packages/api/src/modules/knosia/analysis/mutations.ts` | Analysis handlers |
| `packages/api/src/modules/knosia/vocabulary/router.ts` | Vocabulary sub-router |
| `packages/api/src/modules/knosia/vocabulary/mutations.ts` | Vocabulary handlers |
| `packages/api/src/modules/knosia/conversation/router.ts` | Conversation sub-router |
| `packages/api/src/modules/knosia/conversation/queries.ts` | Query processing |

### Modify

| File | Changes |
|------|---------|
| `packages/api/src/index.ts` | Add `.route("/knosia", knosiaRouter)` |
| `packages/db/src/schema/knosia.ts` | Add `compiledVocabulary`, `vocabularyVersion` columns |

### Migration

```sql
ALTER TABLE knosia_workspace
  ADD COLUMN compiled_vocabulary jsonb,
  ADD COLUMN vocabulary_version integer DEFAULT 1;
```

---

## Imports Reference

```typescript
// Query Engine (NL → DSL)
import {
  createQueryEngine,
  compileVocabulary,
  type CompiledVocabulary,
  type NLQueryResult,
} from '@repo/liquid-connect';

// UVB (Schema Extraction)
import {
  PostgresAdapter,
  extractSchema,
  applyHardRules,
  type DetectedVocabulary,
  type DetectedMetric,
  type DetectedDimension,
} from '@repo/liquid-connect';

// Compiler (DSL → SQL)
import {
  compile,
  emit,
  type SemanticLayer,
  type EmitResult,
} from '@repo/liquid-connect';

// Database
import { db } from '@turbostarter/db/server';
import {
  knosiaWorkspace,
  knosiaConnection,
  knosiaAnalysis,
  knosiaVocabularyItem,
  knosiaUserPreference,
  type SelectKnosiaVocabularyItem,
} from '@turbostarter/db/schema';
import { eq, and, sql } from 'drizzle-orm';
```

---

## Testing Checklist

```
□ Unit: transformToDetectedVocabulary() maps correctly
□ Unit: compileVocabulary() produces valid output
□ Integration: PostgresAdapter connects and queries
□ Integration: extractSchema + applyHardRules work
□ Integration: Full pipeline NL → SQL → data
□ E2E: Add connection → analyze → confirm → query
```

---

## Environment

```bash
# Database (knosia-db-1 container)
DATABASE_URL="postgresql://turbostarter:turbostarter@localhost:5440/core"

# Docker
docker compose up -d  # Port 5440
```

---

## Quick Commands

```bash
# Build liquid-connect first
pnpm --filter "@repo/liquid-connect" build

# Run Knosia tests
pnpm --filter @turbostarter/api test -- --run src/modules/knosia

# Type check
pnpm --filter @turbostarter/api typecheck

# Generate migration
pnpm with-env turbo db:generate

# Apply migration
pnpm with-env pnpm --filter @turbostarter/db db:migrate
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `.cognitive/sessions/knosia-vocabulary.md` | Knosia product vision |
| `.cognitive/sessions/atoms/uvb-hard-rules.yaml` | UVB 7 rules reference |
| `.cognitive/sessions/atoms/liquidrender-vision.yaml` | LiquidRender vision |
| `packages/liquid-connect/specs/UNIVERSAL-VOCABULARY-BUILDER.md` | UVB spec |

---

*Ready for implementation. Start with Phase 1: Connection Testing.*
