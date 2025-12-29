# Knosia ↔ LiquidConnect Integration Context

> Self-contained context document for implementing the integration.
> Created: 2025-12-29 16:30

---

## Executive Summary

**Goal:** Connect Knosia API (user-facing layer) with LiquidConnect (query compilation engine) to enable natural language → SQL query execution.

**Current State:**
- ✅ Knosia API V1 complete (6 modules, 15 DB tables, 317 tests)
- ✅ LiquidConnect Query Engine complete (NL → DSL)
- ✅ LiquidConnect Compiler complete (DSL → SQL)
- ⏳ Integration layer needed

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NATURAL LANGUAGE INPUT                          │
│                    "Show me revenue by region last month"               │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            KNOSIA API                                    │
│  POST /api/knosia/conversation/query                                     │
│                                                                          │
│  1. Load CompiledVocabulary from workspace (cached)                      │
│  2. Load user aliases from preferences                                   │
│  3. Call Query Engine with aliases                                       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LIQUIDCONNECT QUERY ENGINE                          │
│  createQueryEngine(compiledVocabulary)                                   │
│  engine.queryWithAliases(input, userAliases)                             │
│                                                                          │
│  Output: "Q @revenue #region ~M-1"                                       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LIQUIDCONNECT COMPILER                              │
│  1. Parse DSL → AST                                                      │
│  2. Resolve AST → LiquidFlow IR (uses SemanticLayer)                     │
│  3. Emit IR → SQL (PostgreSQL dialect)                                   │
│                                                                          │
│  Output: SELECT region, SUM(amount) FROM orders WHERE ...                │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SQL EXECUTION                                    │
│  PostgresAdapter.query(sql, params)                                      │
│  → Returns data rows                                                     │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION RESPONSE                              │
│  { type: 'bar', data: [...], grounding: [...] }                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions (Confirmed)

### 1. Storage Strategy

| What | Where | Why |
|------|-------|-----|
| `CompiledVocabulary` | `knosiaWorkspace.compiledVocabulary` (jsonb) | Cached, fast lookup |
| `SemanticLayer` | Generated on-the-fly | Requires schema + vocabulary, larger |
| `vocabularyVersion` | `knosiaWorkspace.compiledVocabularyVersion` | Cache invalidation |

### 2. SQL Execution

**Use existing `PostgresAdapter` from UVB** - it already has `query()` method:

```typescript
// packages/liquid-connect/src/uvb/adapters/postgres.ts
class PostgresAdapter implements DatabaseAdapter {
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  async query<T>(sql: string, params?: unknown[]): Promise<T[]>  // ← Reuse this!
}
```

### 3. Separation of Concerns

```
@repo/liquid-connect    →  Pure transformation (no I/O, no credentials)
packages/api/knosia     →  Execution (credentials, DB connections, caching)
```

### 4. Relationships Flow

```
Relationships DON'T go through Query Engine
They go through: SemanticLayer → Resolver → Emitter

Query Engine just outputs: Q @revenue #customer_region
Resolver figures out joins from SemanticLayer.relationships
```

---

## Type Transformations

### knosiaVocabularyItem → DetectedMetric

```typescript
function toDetectedMetric(item: KnosiaVocabularyItem): DetectedMetric {
  const def = item.definition as VocabDefinition;

  return {
    id: item.slug,                              // slug as ID
    name: item.slug,                            // internal name
    table: def?.sourceTables?.[0] ?? 'unknown', // source table
    column: def?.sourceColumn ?? item.slug,     // DB column (NOT formulaSql)
    dataType: 'decimal',                        // inferred
    aggregation: item.aggregation ?? 'SUM',
    certainty: item.aggregationConfidence ?? 80,
    suggestedDisplayName: item.canonicalName,
    expression: def?.formulaSql,                // only for computed metrics
  };
}
```

### knosiaVocabularyItem → DetectedDimension

```typescript
function toDetectedDimension(item: KnosiaVocabularyItem): DetectedDimension {
  const def = item.definition as VocabDefinition;

  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? 'unknown',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'varchar',
    cardinality: item.cardinality ?? undefined,
    certainty: item.aggregationConfidence ?? 80,
  };
}
```

### Building SemanticLayer (on-the-fly)

```typescript
function buildSemanticLayer(
  vocabularyItems: KnosiaVocabularyItem[],
  connectionSchema: ConnectionSchema,
  connection: KnosiaConnection
): SemanticLayer {
  // Sources from connection
  const sources: Record<string, SourceDefinition> = {
    [connection.name]: {
      type: connection.type,
      schema: connection.schema ?? 'public',
    }
  };

  // Entities from schema tables
  const entities: Record<string, EntityDefinition> = {};
  for (const table of connectionSchema.tables) {
    entities[table.name] = {
      source: connection.name,
      primaryKey: table.primaryKey ?? 'id',
      fields: Object.fromEntries(
        table.columns.map(col => [col.name, { column: col.name, type: col.type }])
      ),
    };
  }

  // Metrics from vocabulary
  const metrics: Record<string, MetricDefinition> = {};
  for (const item of vocabularyItems.filter(i => i.type === 'metric')) {
    const def = item.definition as VocabDefinition;
    metrics[item.slug] = {
      type: 'simple',
      aggregation: item.aggregation ?? 'SUM',
      expression: def?.formulaSql ?? def?.sourceColumn ?? item.slug,
      entity: def?.sourceTables?.[0] ?? 'unknown',
    };
  }

  // Dimensions from vocabulary
  const dimensions: Record<string, DimensionDefinition> = {};
  for (const item of vocabularyItems.filter(i => i.type === 'dimension')) {
    const def = item.definition as VocabDefinition;
    dimensions[item.slug] = {
      entity: def?.sourceTables?.[0] ?? 'unknown',
      expression: def?.sourceColumn ?? item.slug,
      type: 'string',
    };
  }

  // Relationships from vocabulary joinsTo
  const relationships: RelationshipDefinition[] = vocabularyItems
    .filter(item => item.joinsTo?.length)
    .flatMap(item => (item.joinsTo ?? []).map(join => ({
      from: { entity: item.slug, field: join.via },
      to: { entity: join.target, field: 'id' },
      type: join.type,
    })));

  return {
    version: '1.0',
    name: `workspace_${connection.id}`,
    sources,
    entities,
    metrics,
    dimensions,
    relationships,
  };
}
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `packages/api/src/modules/knosia/shared/transforms.ts` | Type transformations |
| `packages/api/src/modules/knosia/shared/execution.ts` | SQL execution with PostgresAdapter |
| `packages/api/src/modules/knosia/shared/semantic.ts` | SemanticLayer generation |

### Modify

| File | Changes |
|------|---------|
| `packages/api/src/modules/knosia/conversation/queries.ts` | Replace mocks with real Query Engine |
| `packages/api/src/modules/knosia/analysis/mutations.ts` | Wire up UVB schema extraction |
| `packages/api/src/modules/knosia/vocabulary/mutations.ts` | Recompile vocabulary on confirm |
| `packages/db/src/schema/knosia.ts` | Add `compiledVocabulary` to workspace |

---

## Implementation Code

### 1. Shared Transforms (`shared/transforms.ts`)

```typescript
import type {
  DetectedVocabulary,
  DetectedMetric,
  DetectedDimension,
  DetectedTimeField,
  DetectedFilter,
} from '@repo/liquid-connect';
import type { SelectKnosiaVocabularyItem } from '@turbostarter/db/schema';

interface VocabDefinition {
  sourceColumn?: string;
  sourceTables?: string[];
  formulaSql?: string;
  descriptionHuman?: string;
}

export function transformToDetectedVocabulary(
  items: SelectKnosiaVocabularyItem[]
): DetectedVocabulary {
  return {
    entities: [], // Not needed for Query Engine
    metrics: items.filter(i => i.type === 'metric').map(toDetectedMetric),
    dimensions: items.filter(i => i.type === 'dimension').map(toDetectedDimension),
    timeFields: items.filter(i => i.isPrimaryTime).map(toDetectedTimeField),
    filters: items.filter(i => i.type === 'entity' && i.cardinality && i.cardinality < 10).map(toDetectedFilter),
    relationships: [], // Handled in SemanticLayer
  };
}

function toDetectedMetric(item: SelectKnosiaVocabularyItem): DetectedMetric {
  const def = item.definition as VocabDefinition | null;
  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? 'unknown',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'decimal',
    aggregation: item.aggregation ?? 'SUM',
    certainty: item.aggregationConfidence ?? 80,
    suggestedDisplayName: item.canonicalName,
    expression: def?.formulaSql,
  };
}

function toDetectedDimension(item: SelectKnosiaVocabularyItem): DetectedDimension {
  const def = item.definition as VocabDefinition | null;
  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? 'unknown',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'varchar',
    cardinality: item.cardinality ?? undefined,
    certainty: item.aggregationConfidence ?? 80,
  };
}

function toDetectedTimeField(item: SelectKnosiaVocabularyItem): DetectedTimeField {
  const def = item.definition as VocabDefinition | null;
  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? 'unknown',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'timestamp',
    isPrimaryCandidate: item.isPrimaryTime ?? false,
    certainty: item.aggregationConfidence ?? 80,
  };
}

function toDetectedFilter(item: SelectKnosiaVocabularyItem): DetectedFilter {
  const def = item.definition as VocabDefinition | null;
  return {
    id: item.slug,
    name: item.slug,
    table: def?.sourceTables?.[0] ?? 'unknown',
    column: def?.sourceColumn ?? item.slug,
    dataType: 'boolean',
    certainty: item.aggregationConfidence ?? 80,
  };
}
```

### 2. SQL Execution (`shared/execution.ts`)

```typescript
import { PostgresAdapter } from '@repo/liquid-connect/uvb/adapters';
import type { SelectKnosiaConnection } from '@turbostarter/db/schema';

interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export async function executeQuery<T = Record<string, unknown>>(
  connection: SelectKnosiaConnection,
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  // Decrypt credentials (implement based on your encryption strategy)
  const credentials = decryptCredentials(connection.credentials);

  const adapter = new PostgresAdapter({
    host: connection.host,
    port: connection.port ?? 5432,
    database: connection.database,
    user: credentials.username,
    password: credentials.password,
    ssl: connection.sslEnabled ? { rejectUnauthorized: false } : false,
  });

  await adapter.connect();
  try {
    const rows = await adapter.query<T>(sql, params);
    return { rows, rowCount: rows.length };
  } finally {
    await adapter.disconnect();
  }
}

function decryptCredentials(encrypted: string | null): { username: string; password: string } {
  // TODO: Implement actual decryption
  // For now, assume JSON stored
  if (!encrypted) {
    return { username: '', password: '' };
  }
  try {
    return JSON.parse(encrypted);
  } catch {
    return { username: '', password: '' };
  }
}
```

### 3. Updated Conversation Query (`conversation/queries.ts`)

```typescript
import { eq, and } from '@turbostarter/db';
import {
  knosiaWorkspace,
  knosiaUserPreference,
  knosiaConversation,
  knosiaConversationMessage,
  knosiaVocabularyItem,
  knosiaConnection,
  knosiaWorkspaceConnection,
} from '@turbostarter/db/schema';
import { db } from '@turbostarter/db/server';

import {
  createQueryEngine,
  query as compileToSql,
  compileVocabulary,
  type CompiledVocabulary,
  type SemanticLayer,
  type NLQueryResult,
} from '@repo/liquid-connect';

import { transformToDetectedVocabulary } from '../shared/transforms';
import { buildSemanticLayer } from '../shared/semantic';
import { executeQuery } from '../shared/execution';

import type { ConversationQueryInput, ConversationResponse } from './schemas';

export async function processQuery(
  input: ConversationQueryInput & { userId: string }
): Promise<{ conversation: typeof knosiaConversation.$inferSelect; response: ConversationResponse }> {
  const queryId = crypto.randomUUID();

  // 1. Load workspace with cached vocabulary
  const workspace = await db.query.knosiaWorkspace.findFirst({
    where: eq(knosiaWorkspace.id, input.workspaceId),
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  // 2. Get or compile vocabulary
  let compiled = workspace.compiledVocabulary as CompiledVocabulary | null;

  if (!compiled) {
    // Compile vocabulary if not cached
    const vocabItems = await db.query.knosiaVocabularyItem.findMany({
      where: eq(knosiaVocabularyItem.workspaceId, input.workspaceId),
    });

    const detected = transformToDetectedVocabulary(vocabItems);
    compiled = compileVocabulary(detected);

    // Cache it
    await db.update(knosiaWorkspace)
      .set({ compiledVocabulary: compiled })
      .where(eq(knosiaWorkspace.id, input.workspaceId));
  }

  // 3. Get user aliases
  const prefs = await db.query.knosiaUserPreference.findFirst({
    where: and(
      eq(knosiaUserPreference.userId, input.userId),
      eq(knosiaUserPreference.workspaceId, input.workspaceId),
    ),
  });
  const userAliases = (prefs?.aliases as Record<string, string>) ?? {};

  // 4. Process NL query through Query Engine
  const engine = createQueryEngine(compiled);
  const nlResult = engine.queryWithAliases(input.query, userAliases);

  if (!nlResult.success) {
    return buildClarificationResponse(queryId, input, nlResult);
  }

  // 5. Get connection for SQL compilation
  const workspaceConnection = await db.query.knosiaWorkspaceConnection.findFirst({
    where: eq(knosiaWorkspaceConnection.workspaceId, input.workspaceId),
    with: { connection: true },
  });

  if (!workspaceConnection?.connection) {
    throw new Error('No connection configured for workspace');
  }

  // 6. Build SemanticLayer and compile to SQL
  const vocabItems = await db.query.knosiaVocabularyItem.findMany({
    where: eq(knosiaVocabularyItem.workspaceId, input.workspaceId),
  });

  const semantic = buildSemanticLayer(vocabItems, workspaceConnection.connection);
  const sqlResult = compileToSql(nlResult.lcOutput!, semantic, 'postgres');

  // 7. Execute SQL
  const data = await executeQuery(workspaceConnection.connection, sqlResult.sql, sqlResult.params);

  // 8. Build visualization response
  const response = buildVisualizationResponse(queryId, input.query, nlResult, data);

  // 9. Store conversation and messages
  const conversation = await storeConversation(input, response);

  return { conversation, response };
}

function buildVisualizationResponse(
  queryId: string,
  query: string,
  nlResult: NLQueryResult,
  data: { rows: unknown[]; rowCount: number }
): ConversationResponse {
  // Infer chart type from query and data
  const vizType = inferChartType(nlResult, data);

  return {
    queryId,
    type: 'visualization',
    visualization: {
      type: vizType,
      title: generateTitle(query, nlResult),
      data: transformDataForChart(data, vizType),
      grounding: {
        path: nlResult.matchedVocabulary?.map(v => ({
          id: v.resolved,
          label: v.term,
          vocabularyItemId: v.resolved,
        })) ?? [],
        interactive: true,
      },
    },
    suggestions: generateSuggestions(nlResult),
    appliedFilters: [],
  };
}

function inferChartType(nlResult: NLQueryResult, data: { rows: unknown[] }): 'bar' | 'line' | 'kpi' | 'table' {
  const output = nlResult.lcOutput ?? '';

  // KPI for single metric, no dimension
  if (!output.includes('#') && data.rows.length === 1) {
    return 'kpi';
  }

  // Line for time-based queries
  if (output.includes('~') && output.includes('#')) {
    return 'line';
  }

  // Bar for dimension grouping
  if (output.includes('#')) {
    return 'bar';
  }

  return 'table';
}

function generateTitle(query: string, nlResult: NLQueryResult): string {
  // Use matched vocabulary to build title
  const metrics = nlResult.matchedVocabulary?.filter(v => v.via === 'canonical') ?? [];
  if (metrics.length > 0) {
    return metrics.map(m => m.term).join(', ');
  }
  return query.slice(0, 50);
}

function transformDataForChart(data: { rows: unknown[] }, type: string): unknown {
  // Transform raw SQL results into chart-friendly format
  // Implementation depends on chart library
  return data.rows;
}

function generateSuggestions(nlResult: NLQueryResult): string[] {
  // Generate follow-up suggestions based on query
  return [
    'Break this down by region',
    'Compare to last period',
    'Show top 10',
  ];
}
```

### 4. Schema Update (`packages/db/src/schema/knosia.ts`)

Add to `knosiaWorkspace` table:

```typescript
export const knosiaWorkspace = pgTable("knosia_workspace", {
  // ... existing fields ...

  // NEW: Cached compiled vocabulary for Query Engine
  compiledVocabulary: jsonb().$type<import('@repo/liquid-connect').CompiledVocabulary>(),
  compiledVocabularyVersion: integer().default(1),
  compiledVocabularyUpdatedAt: timestamp(),
});
```

---

## Exports Needed from LiquidConnect

Verify these are exported from `@repo/liquid-connect`:

```typescript
// Query Engine
export { createQueryEngine, QueryEngine } from './query';
export type { NLQueryResult, QueryContext, CompiledVocabulary } from './query';

// Vocabulary Compiler
export { compileVocabulary } from './vocabulary';
export type { DetectedVocabulary, DetectedMetric, DetectedDimension } from './uvb';

// Compiler (DSL → SQL)
export { query, compile } from './index';  // End-to-end: DSL → SQL
export type { SemanticLayer, EmitResult } from './semantic';

// Adapters (for execution)
export { PostgresAdapter } from './uvb/adapters';
```

---

## Testing Checklist

```
□ Unit: transformToDetectedVocabulary() with real vocabulary items
□ Unit: buildSemanticLayer() generates valid structure
□ Integration: Query Engine processes NL → DSL correctly
□ Integration: Compiler generates valid SQL
□ Integration: PostgresAdapter executes SQL and returns results
□ E2E: Full flow from NL input to visualization response
```

---

## Environment Requirements

```bash
# Database (Knosia)
DATABASE_URL="postgresql://turbostarter:turbostarter@localhost:5440/core"

# Docker container running
docker compose up -d  # knosia-db-1 on port 5440
```

---

## Quick Start Commands

```bash
# Run tests
pnpm --filter @turbostarter/api test -- --run src/modules/knosia

# Type check
pnpm --filter @turbostarter/api typecheck

# Build liquid-connect (if modified)
pnpm --filter @repo/liquid-connect build
```

---

## File References

| Document | Location |
|----------|----------|
| Knosia DB Schema | `packages/db/src/schema/knosia.ts` |
| Knosia API Modules | `packages/api/src/modules/knosia/` |
| LiquidConnect Query Engine | `packages/liquid-connect/src/query/` |
| LiquidConnect Vocabulary | `packages/liquid-connect/src/vocabulary/` |
| LiquidConnect UVB | `packages/liquid-connect/src/uvb/` |
| PostgresAdapter | `packages/liquid-connect/src/uvb/adapters/postgres.ts` |

---

*Ready for implementation.*
