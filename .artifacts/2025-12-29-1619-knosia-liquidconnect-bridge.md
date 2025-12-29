# Knosia + LiquidConnect Integration Guide

> Development bridge document for integrating Knosia API V1 with the LiquidConnect query engine.

## Overview

**Knosia** is the API layer that handles user-facing concerns: connections, vocabulary management, conversations, briefings, and preferences.

**LiquidConnect** is the query compilation engine that transforms natural language → DSL → SQL for any database dialect.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            USER INTERFACE                                │
│  (Natural Language Query, Dashboard, Briefings)                          │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                          KNOSIA API V1                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Connections │ │ Vocabulary  │ │Conversation │ │  Briefing   │        │
│  │   Module    │ │   Module    │ │   Module    │ │   Module    │        │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘        │
└─────────┼───────────────┼───────────────┼───────────────┼───────────────┘
          │               │               │               │
          │    ┌──────────▼───────────────▼───────────────▼──────────┐
          │    │              LIQUIDCONNECT ENGINE                    │
          │    │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │
          ▼    │  │  UVB   │→ │Semantic│→ │Compiler│→ │Emitter │     │
     ┌────────┐│  │(Schema)│  │ Layer  │  │  /IR   │  │  (SQL) │     │
     │Database││  └────────┘  └────────┘  └────────┘  └────────┘     │
     │Metadata││                                                      │
     └────────┘└──────────────────────────────────────────────────────┘
```

---

## Current State

### Knosia API V1 (Implemented)

| Module | Status | Integration Point |
|--------|--------|-------------------|
| `connections` | ✅ Complete | Needs real DB adapters |
| `vocabulary` | ✅ Complete | Needs UVB integration |
| `conversation` | ✅ Complete (mock) | Needs Query Engine |
| `briefing` | ✅ Complete (mock) | Needs Analysis Engine |
| `analysis` | ✅ Complete (mock) | Needs UVB integration |
| `preferences` | ✅ Complete | Ready |

### LiquidConnect (Implemented)

| Component | Status | Description |
|-----------|--------|-------------|
| Compiler | ✅ v7 | DSL → AST parsing |
| Semantic Layer | ✅ | Schema definitions |
| Resolver | ✅ | AST → LiquidFlow IR |
| Emitters | ✅ | DuckDB, PostgreSQL, Trino |
| UVB | ✅ | Schema extraction + 7 Hard Rules |
| Vocabulary | ✅ | Pattern compilation |
| Query Engine | ✅ | NL → DSL conversion |

---

## Integration Tasks

### Phase 1: Connection & Schema Extraction

**Goal:** When user adds a connection, extract schema and detect vocabulary.

```
Knosia Connection → LiquidConnect UVB → Detected Vocabulary → Knosia DB
```

#### 1.1 Implement Real Connection Testing

**File:** `packages/api/src/modules/knosia/connections/queries.ts`

```typescript
// Current: stub implementation
// Needed: Use LiquidConnect's PostgresAdapter

import { createPostgresAdapter } from "@repo/liquid-connect";

export const testDatabaseConnection = async (input: TestConnectionInput) => {
  const adapter = createPostgresAdapter({
    host: input.host,
    port: input.port,
    database: input.database,
    user: input.username,
    password: input.password,
    ssl: input.sslEnabled,
  });

  try {
    await adapter.connect();
    const latency = await adapter.ping();
    await adapter.disconnect();

    return {
      success: true,
      message: `Connected to ${input.type} database`,
      latencyMs: latency,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};
```

#### 1.2 Run Schema Extraction on Analysis

**File:** `packages/api/src/modules/knosia/analysis/mutations.ts`

```typescript
import {
  createPostgresAdapter,
  extractSchema,
  applyHardRules,
} from "@repo/liquid-connect";

export const runAnalysis = async (input: RunAnalysisInput) => {
  // 1. Get connection details
  const connection = await getConnection({ id: input.connectionId, orgId });

  // 2. Create adapter
  const adapter = createPostgresAdapter(buildConnectionString(connection));

  // 3. Extract schema
  const schema = await extractSchema(adapter);

  // 4. Apply 7 Hard Rules
  const { detected, confirmations } = applyHardRules(schema);

  // 5. Store in knosiaAnalysis.detectedVocab
  await db.update(knosiaAnalysis)
    .set({
      status: "completed",
      detectedVocab: {
        entities: detected.entities,
        metrics: detected.metrics,
        dimensions: detected.dimensions,
        timeFields: detected.timeFields,
        filters: detected.filters,
        relationships: detected.relationships,
      },
      summary: {
        tables: schema.tables.length,
        metrics: detected.metrics.length,
        dimensions: detected.dimensions.length,
      },
    })
    .where(eq(knosiaAnalysis.id, analysisId));

  return { analysisId, confirmations };
};
```

### Phase 2: Vocabulary Confirmation → Semantic Layer

**Goal:** Convert confirmed vocabulary to LiquidConnect SemanticLayer.

```
Confirmed Vocabulary → knosiaVocabularyItem → SemanticLayer YAML
```

#### 2.1 Generate Semantic Layer from Vocabulary

**New File:** `packages/api/src/modules/knosia/vocabulary/semantic.ts`

```typescript
import type { SemanticLayer } from "@repo/liquid-connect";

export function generateSemanticLayer(
  workspaceId: string,
  vocabularyItems: SelectKnosiaVocabularyItem[],
  connections: SelectKnosiaConnection[],
): SemanticLayer {
  const entities: Record<string, EntityDefinition> = {};
  const metrics: Record<string, MetricDefinition> = {};
  const dimensions: Record<string, DimensionDefinition> = {};

  // Group by type
  for (const item of vocabularyItems) {
    const def = item.definition as VocabDefinition;

    switch (item.type) {
      case "entity":
        entities[item.slug] = {
          source: def.sourceTables?.[0] ?? "unknown",
          primaryKey: "id", // from schema
          timeField: item.isPrimaryTime ? item.slug : undefined,
          fields: {}, // populated from schema
        };
        break;

      case "metric":
        metrics[item.slug] = {
          type: "simple",
          aggregation: item.aggregation ?? "SUM",
          expression: def.formulaSql ?? item.slug,
          entity: def.sourceTables?.[0] ?? "unknown",
        };
        break;

      case "dimension":
        dimensions[item.slug] = {
          entity: def.sourceTables?.[0] ?? "unknown",
          expression: def.formulaSql ?? item.slug,
          type: "string",
        };
        break;
    }
  }

  // Build sources from connections
  const sources: Record<string, SourceDefinition> = {};
  for (const conn of connections) {
    sources[conn.name] = {
      type: conn.type,
      schema: conn.schema ?? "public",
      connection_ref: `connection:${conn.id}`,
    };
  }

  return {
    version: "1.0",
    name: `workspace_${workspaceId}`,
    sources,
    entities,
    metrics,
    dimensions,
  };
}
```

#### 2.2 Store Semantic Layer in Workspace

Add to `knosiaWorkspace` table:

```typescript
// In schema/knosia.ts
export const knosiaWorkspace = pgTable("knosia_workspace", {
  // ... existing fields
  semanticLayer: jsonb().$type<SemanticLayer>(),
  semanticLayerVersion: integer().default(1),
  semanticLayerUpdatedAt: timestamp(),
});
```

### Phase 3: Query Engine Integration

**Goal:** Process natural language queries through LiquidConnect.

```
User Query → Knosia API → LiquidConnect Query Engine → SQL → Execute → Response
```

#### 3.1 Update Conversation Query Processing

**File:** `packages/api/src/modules/knosia/conversation/queries.ts`

```typescript
import {
  createQueryEngine,
  compile,
  emit,
  type QueryResult,
} from "@repo/liquid-connect";

export const processQuery = async (
  input: ConversationQueryInput & { userId: string },
) => {
  // 1. Get workspace semantic layer
  const workspace = await getWorkspace(input.workspaceId);
  const semanticLayer = workspace.semanticLayer;

  if (!semanticLayer) {
    return generateClarificationResponse(
      "No vocabulary configured. Please run analysis first.",
    );
  }

  // 2. Create query engine with compiled vocabulary
  const engine = createQueryEngine(semanticLayer);

  // 3. Process natural language query
  const nlResult = await engine.query(input.query);

  if (!nlResult.success) {
    // Need clarification
    return generateClarificationFromNL(nlResult);
  }

  // 4. Compile DSL to LiquidFlow IR
  const compileResult = compile(nlResult.output!, semanticLayer);

  if (!compileResult.success) {
    return generateErrorResponse(compileResult.errors);
  }

  // 5. Emit SQL for target database
  const connection = await getWorkspaceConnection(input.workspaceId);
  const dialect = mapConnectionTypeToDialect(connection.type);
  const sql = emit(compileResult.flow!, dialect);

  // 6. Execute query
  const adapter = createAdapter(connection);
  const results = await adapter.execute(sql.sql, sql.params);

  // 7. Build visualization response
  return buildVisualizationResponse({
    queryId: crypto.randomUUID(),
    query: input.query,
    dsl: nlResult.output!,
    sql: sql.sql,
    results,
    grounding: extractGrounding(compileResult.flow!),
  });
};
```

#### 3.2 SQL Execution Layer

**New File:** `packages/api/src/modules/knosia/shared/execution.ts`

```typescript
import {
  createPostgresAdapter,
  createDuckDBAdapter,
} from "@repo/liquid-connect";

export async function executeQuery(
  connection: SelectKnosiaConnection,
  sql: string,
  params: unknown[],
): Promise<QueryResults> {
  const adapter = createAdapterForConnection(connection);

  try {
    await adapter.connect();
    const results = await adapter.query(sql, params);
    return {
      success: true,
      rows: results.rows,
      columns: results.columns,
      rowCount: results.rowCount,
    };
  } finally {
    await adapter.disconnect();
  }
}

function createAdapterForConnection(connection: SelectKnosiaConnection) {
  switch (connection.type) {
    case "postgres":
      return createPostgresAdapter({
        host: connection.host,
        port: connection.port ?? 5432,
        database: connection.database,
        user: decryptCredentials(connection.credentials).username,
        password: decryptCredentials(connection.credentials).password,
      });
    case "duckdb":
      return createDuckDBAdapter({ path: connection.database });
    // ... other dialects
    default:
      throw new Error(`Unsupported connection type: ${connection.type}`);
  }
}
```

### Phase 4: Briefing Generation

**Goal:** Generate AI-powered briefings from query results.

```
Scheduled Trigger → Run Key Queries → LLM Analysis → Briefing Response
```

#### 4.1 Briefing Query Runner

**File:** `packages/api/src/modules/knosia/briefing/queries.ts`

```typescript
export async function generateBriefing(
  workspaceId: string,
  userId: string,
): Promise<BriefingResponse> {
  // 1. Get user preferences and role
  const preferences = await getUserPreferences(userId, workspaceId);
  const role = await getUserRole(userId, workspaceId);

  // 2. Get pinned metrics
  const pinnedMetrics = preferences.favorites?.pinnedMetrics ?? [];

  // 3. Run queries for each metric
  const kpis: BriefingKPI[] = [];
  for (const metricSlug of pinnedMetrics) {
    const result = await processQuery({
      query: `Q @${metricSlug} ~7d`,
      workspaceId,
      userId,
    });

    kpis.push(transformToKPI(result, metricSlug));
  }

  // 4. Detect anomalies
  const alerts = await detectAnomalies(workspaceId, kpis);

  // 5. Generate AI insights
  const insights = await generateInsights(kpis, alerts, role);

  return {
    generatedAt: new Date().toISOString(),
    period: { start: "...", end: "..." },
    kpis,
    alerts,
    insights,
    suggestedActions: generateActions(alerts, role),
  };
}
```

---

## Data Flow Diagrams

### Connection Setup Flow

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  User adds     │────▶│  Knosia API    │────▶│  Store in      │
│  connection    │     │  /connections  │     │  knosiaConn    │
└────────────────┘     └────────────────┘     └───────┬────────┘
                                                      │
                                                      ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Store vocab   │◀────│  Apply 7 Hard  │◀────│  Run UVB       │
│  items in DB   │     │  Rules         │     │  extraction    │
└────────────────┘     └────────────────┘     └────────────────┘
```

### Query Processing Flow

```
┌──────────────┐
│ "Show me     │
│  revenue by  │
│  region"     │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Query Engine │────▶│ DSL Output:  │
│ (NL → DSL)   │     │ Q @revenue   │
└──────────────┘     │ #region      │
                     └──────┬───────┘
                            │
       ┌────────────────────┘
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Compiler    │────▶│  Resolver    │────▶│  LiquidFlow  │
│  (DSL→AST)   │     │  (AST→IR)    │     │  IR          │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
       ┌──────────────────────────────────────────┘
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Emitter     │────▶│  Execute     │────▶│  Visualize   │
│  (IR→SQL)    │     │  on DB       │     │  Response    │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Type Mappings

### Knosia → LiquidConnect

| Knosia Type | LiquidConnect Type | Notes |
|-------------|-------------------|-------|
| `knosiaVocabularyItem.type = "metric"` | `MetricDefinition` | Maps aggregation |
| `knosiaVocabularyItem.type = "dimension"` | `DimensionDefinition` | Maps expression |
| `knosiaVocabularyItem.type = "entity"` | `EntityDefinition` | Maps to source |
| `knosiaConnection.type` | `EmitterDialect` | postgres, duckdb, etc. |
| `knosiaAnalysis.detectedVocab` | `DetectedVocabulary` | From UVB |

### LiquidConnect → Knosia

| LiquidConnect Type | Knosia Storage | Notes |
|-------------------|----------------|-------|
| `SemanticLayer` | `knosiaWorkspace.semanticLayer` | JSON column |
| `LiquidFlow` | `knosiaConversationMessage.sqlGenerated` | For debugging |
| `EmitResult.sql` | Execute directly | Not stored |
| `QueryResult` | `knosiaConversationMessage.visualization` | Chart data |

---

## API Endpoints After Integration

### Connections

```
POST /api/knosia/connections/test
  → Uses LiquidConnect PostgresAdapter

POST /api/knosia/connections
  → Triggers schema extraction via UVB
```

### Analysis

```
POST /api/knosia/analysis/run
  → Runs UVB schema extraction
  → Applies 7 Hard Rules
  → Returns confirmation questions

GET /api/knosia/analysis/:id
  → Returns detected vocabulary
```

### Vocabulary

```
POST /api/knosia/vocabulary/confirm
  → Saves confirmed items to knosiaVocabularyItem
  → Regenerates SemanticLayer
  → Stores in workspace

GET /api/knosia/vocabulary
  → Returns vocabulary for workspace
```

### Conversation

```
POST /api/knosia/conversation/query
  → Processes through Query Engine
  → Compiles to SQL
  → Executes and returns visualization

POST /api/knosia/conversation/clarify
  → Handles disambiguation
  → Optionally stores preference
```

### Briefing

```
GET /api/knosia/briefing
  → Runs pinned metric queries
  → Generates AI insights
  → Returns formatted briefing
```

---

## Implementation Priority

### Wave 1: Core Integration (Week 1-2)
1. Real connection testing with PostgresAdapter
2. Schema extraction with UVB
3. Store detected vocabulary

### Wave 2: Query Pipeline (Week 2-3)
1. Semantic layer generation
2. Query engine integration
3. SQL execution layer

### Wave 3: Intelligence (Week 3-4)
1. Briefing generation
2. Anomaly detection
3. AI insight generation

### Wave 4: Polish (Week 4+)
1. Caching layer
2. Query optimization
3. Error handling improvements

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/api/src/modules/knosia/connections/queries.ts` | Real connection testing |
| `packages/api/src/modules/knosia/analysis/mutations.ts` | UVB integration |
| `packages/api/src/modules/knosia/vocabulary/semantic.ts` | NEW: Semantic layer generation |
| `packages/api/src/modules/knosia/conversation/queries.ts` | Query engine integration |
| `packages/api/src/modules/knosia/briefing/queries.ts` | Real briefing generation |
| `packages/api/src/modules/knosia/shared/execution.ts` | NEW: SQL execution |
| `packages/db/src/schema/knosia.ts` | Add semanticLayer to workspace |

---

## Testing Strategy

### Unit Tests
- Semantic layer generation from vocabulary items
- Type mappings between systems
- DSL compilation with workspace vocabulary

### Integration Tests
- Full query pipeline: NL → visualization
- Connection + extraction + vocabulary flow
- Briefing generation with real data

### E2E Tests
- User adds connection → gets vocabulary suggestions
- User asks question → gets chart response
- User opens briefing → sees KPIs

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# LiquidConnect
LIQUIDCONNECT_CACHE_TTL=3600
LIQUIDCONNECT_MAX_QUERY_TIME=30000

# AI (for briefings)
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
```

---

## Related Documentation

- `packages/liquid-connect/specs/SPEC-v7-SYNTHESIS.md` - LiquidConnect spec
- `packages/liquid-connect/specs/UNIVERSAL-VOCABULARY-BUILDER.md` - UVB spec
- `packages/api/src/modules/knosia/` - Knosia API modules
- `packages/db/src/schema/knosia.ts` - Database schema
