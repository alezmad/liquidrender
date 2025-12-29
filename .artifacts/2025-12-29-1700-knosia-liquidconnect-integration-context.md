# Knosia ↔ LiquidConnect Integration Context

> Complete context for implementing the integration between Knosia API and LiquidConnect Query Engine.
> Created: 2025-12-29 17:00
> Status: Ready for implementation

---

## Quick Start

```bash
# Read this file, then start implementation
claude "Read .claude/artifacts/2025-12-29-1700-knosia-liquidconnect-integration-context.md and implement Phase 1"
```

---

## 1. Current State

### LiquidConnect (Complete ✅)

| Component | Location | Status |
|-----------|----------|--------|
| Query Engine | `packages/liquid-connect/src/query/` | ✅ 594 tests |
| Vocabulary Compiler | `packages/liquid-connect/src/vocabulary/` | ✅ Complete |
| UVB (7 Hard Rules) | `packages/liquid-connect/src/uvb/` | ✅ Complete |
| PostgresAdapter | `packages/liquid-connect/src/uvb/adapters/postgres.ts` | ✅ Has query() |
| LC Compiler | `packages/liquid-connect/src/compiler/` | ✅ v7 |
| Emitters | `packages/liquid-connect/src/emitters/` | ✅ postgres, duckdb, trino |

### Knosia API (Stubs ⏳)

| Module | Location | Status |
|--------|----------|--------|
| connections | `packages/api/src/modules/knosia/connections/` | ⏳ Mock |
| analysis | `packages/api/src/modules/knosia/analysis/` | ⏳ Mock |
| vocabulary | `packages/api/src/modules/knosia/vocabulary/` | ⏳ Mock |
| conversation | `packages/api/src/modules/knosia/conversation/` | ⏳ Mock |
| briefing | `packages/api/src/modules/knosia/briefing/` | ⏳ Mock |
| preferences | `packages/api/src/modules/knosia/preferences/` | ✅ Complete |

### Database Schema (Complete ✅)

Location: `packages/db/src/schema/knosia.ts`

Key tables:
- `knosiaConnection` - DB credentials (encrypted)
- `knosiaAnalysis` - Analysis runs, `detectedVocab` jsonb
- `knosiaVocabularyItem` - Confirmed vocabulary
- `knosiaWorkspace` - Needs: `compiledVocabulary`, `semanticLayer`
- `knosiaUserPreference` - Has `aliases` jsonb

---

## 2. Architecture Decisions (Agreed)

### 2.1 Storage Strategy

Store **both** in `knosiaWorkspace`:

```sql
ALTER TABLE knosia_workspace ADD COLUMN compiled_vocabulary jsonb;
ALTER TABLE knosia_workspace ADD COLUMN semantic_layer jsonb;
ALTER TABLE knosia_workspace ADD COLUMN vocabulary_version integer DEFAULT 1;
```

| Column | Type | Purpose |
|--------|------|---------|
| `compiled_vocabulary` | jsonb | For Query Engine (NL → DSL) |
| `semantic_layer` | jsonb | For Compiler (DSL → SQL) |
| `vocabulary_version` | int | Cache invalidation |

### 2.2 Execution Strategy

Use `PostgresAdapter` from UVB for **both** schema extraction AND query execution:

```typescript
import { PostgresAdapter } from '@repo/liquid-connect';

// Same adapter for extraction and queries
const adapter = new PostgresAdapter(config);
await adapter.connect();

// Schema extraction
const schema = await extractSchema(adapter);

// Query execution
const results = await adapter.query<Row>(sql, params);

await adapter.disconnect();
```

### 2.3 User Alias Strategy

Use `engine.queryWithAliases()` with preferences from DB:

```typescript
const prefs = await getUserPreferences(userId, workspaceId);
const result = engine.queryWithAliases(query, prefs?.aliases ?? {});
```

### 2.4 Transformation Pipeline

```
knosiaVocabularyItem[]
    ↓
transformToDetectedVocabulary()
    ↓
DetectedVocabulary
    ↓
compileVocabulary()
    ↓
CompiledVocabulary  →  store in workspace.compiledVocabulary
                    →  createQueryEngine()
```

---

## 3. Type Mappings

### 3.1 knosiaVocabularyItem → DetectedMetric

```typescript
function toDetectedMetric(item: KnosiaVocabularyItem): DetectedMetric {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,
    name: item.slug,
    table: def.sourceTables?.[0] ?? '',
    column: def.sourceColumn ?? item.slug,  // NOT formulaSql
    dataType: 'decimal',
    aggregation: item.aggregation ?? 'SUM',
    certainty: item.aggregationConfidence ?? 80,
    suggestedDisplayName: item.canonicalName,
    expression: def.formulaSql,  // Only for computed metrics
  };
}
```

### 3.2 knosiaVocabularyItem → DetectedDimension

```typescript
function toDetectedDimension(item: KnosiaVocabularyItem): DetectedDimension {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,
    name: item.slug,
    table: def.sourceTables?.[0] ?? '',
    column: def.sourceColumn ?? item.slug,
    dataType: 'varchar',
    cardinality: item.cardinality ?? undefined,
    certainty: item.aggregationConfidence ?? 80,
  };
}
```

### 3.3 knosiaVocabularyItem → DetectedTimeField

```typescript
function toDetectedTimeField(item: KnosiaVocabularyItem): DetectedTimeField {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,
    name: item.slug,
    table: def.sourceTables?.[0] ?? '',
    column: def.sourceColumn ?? item.slug,
    dataType: 'timestamp',
    isPrimaryCandidate: item.isPrimaryTime ?? false,
    certainty: item.aggregationConfidence ?? 80,
  };
}
```

### 3.4 knosiaVocabularyItem → DetectedFilter

```typescript
function toDetectedFilter(item: KnosiaVocabularyItem): DetectedFilter {
  const def = item.definition as VocabDefinition;
  return {
    id: item.slug,
    name: item.slug,
    table: def.sourceTables?.[0] ?? '',
    column: def.sourceColumn ?? item.slug,
    dataType: 'boolean',
    certainty: item.aggregationConfidence ?? 80,
  };
}
```

### 3.5 Full Transform Function

```typescript
// packages/api/src/modules/knosia/shared/transforms.ts

import type {
  DetectedVocabulary,
  DetectedMetric,
  DetectedDimension,
  DetectedTimeField,
  DetectedFilter,
} from '@repo/liquid-connect';

export function transformToDetectedVocabulary(
  items: SelectKnosiaVocabularyItem[]
): DetectedVocabulary {
  return {
    entities: [],  // Not used by Query Engine
    metrics: items.filter(i => i.type === 'metric').map(toDetectedMetric),
    dimensions: items.filter(i => i.type === 'dimension').map(toDetectedDimension),
    timeFields: items.filter(i => i.type === 'time_field').map(toDetectedTimeField),
    filters: items.filter(i => i.type === 'filter').map(toDetectedFilter),
    relationships: [],  // Handled by SemanticLayer
  };
}
```

---

## 4. Implementation Phases

### Phase 1: Schema Extraction (analysis module)

**File:** `packages/api/src/modules/knosia/analysis/mutations.ts`

```typescript
import {
  PostgresAdapter,
  extractSchema,
  applyHardRules,
} from '@repo/liquid-connect';

export async function runAnalysis(input: RunAnalysisInput) {
  const connection = await getConnection(input.connectionId);

  const adapter = new PostgresAdapter({
    host: connection.host,
    port: connection.port ?? 5432,
    database: connection.database,
    user: decrypt(connection.credentials).username,
    password: decrypt(connection.credentials).password,
    ssl: connection.sslEnabled,
  });

  await adapter.connect();
  try {
    // Extract schema
    const schema = await extractSchema(adapter, {
      schema: connection.schema ?? 'public'
    });

    // Apply 7 Hard Rules
    const { detected, confirmations } = applyHardRules(schema);

    // Store results
    await db.update(knosiaAnalysis).set({
      status: 'completed',
      detectedVocab: detected,
      summary: {
        tables: schema.tables.length,
        metrics: detected.metrics.length,
        dimensions: detected.dimensions.length,
        timeFields: detected.timeFields.length,
        filters: detected.filters.length,
      },
    }).where(eq(knosiaAnalysis.id, input.analysisId));

    return { analysisId: input.analysisId, confirmations };
  } finally {
    await adapter.disconnect();
  }
}
```

### Phase 2: Vocabulary Compilation (vocabulary module)

**File:** `packages/api/src/modules/knosia/vocabulary/mutations.ts`

```typescript
import { compileVocabulary } from '@repo/liquid-connect';
import { transformToDetectedVocabulary } from '../shared/transforms';

export async function confirmVocabulary(input: ConfirmVocabularyInput) {
  // 1. Save confirmed items
  await saveVocabularyItems(input.items);

  // 2. Load all vocabulary for workspace
  const items = await db.query.knosiaVocabularyItem.findMany({
    where: eq(knosiaVocabularyItem.workspaceId, input.workspaceId),
  });

  // 3. Transform to DetectedVocabulary
  const detected = transformToDetectedVocabulary(items);

  // 4. Compile vocabulary
  const compiled = compileVocabulary(detected, {
    includeDefaultPatterns: true,
    includeGlobalSynonyms: true,
  });

  // 5. Store in workspace
  await db.update(knosiaWorkspace).set({
    compiledVocabulary: compiled,
    vocabularyVersion: sql`vocabulary_version + 1`,
  }).where(eq(knosiaWorkspace.id, input.workspaceId));

  return { success: true, vocabularyVersion: compiled.version };
}
```

### Phase 3: Query Processing (conversation module)

**File:** `packages/api/src/modules/knosia/conversation/queries.ts`

```typescript
import {
  createQueryEngine,
  PostgresAdapter,
  compile,
  emit,
  type CompiledVocabulary,
  type NLQueryResult,
} from '@repo/liquid-connect';

export async function processQuery(input: ConversationQueryInput) {
  // 1. Load workspace with compiled vocabulary
  const workspace = await db.query.knosiaWorkspace.findFirst({
    where: eq(knosiaWorkspace.id, input.workspaceId),
  });

  if (!workspace?.compiledVocabulary) {
    return {
      type: 'error',
      error: { message: 'No vocabulary configured. Run analysis first.' },
    };
  }

  // 2. Load user preferences
  const prefs = await db.query.knosiaUserPreference.findFirst({
    where: and(
      eq(knosiaUserPreference.userId, input.userId),
      eq(knosiaUserPreference.workspaceId, input.workspaceId),
    ),
  });

  // 3. Create query engine
  const engine = createQueryEngine(
    workspace.compiledVocabulary as CompiledVocabulary,
    { includeTrace: true, fuzzyMatching: true }
  );

  // 4. Process query with user aliases
  const nlResult = engine.queryWithAliases(
    input.query,
    prefs?.aliases ?? {}
  );

  if (!nlResult.success) {
    return {
      type: 'clarification',
      clarification: {
        question: "I couldn't understand that. Did you mean:",
        options: generateSuggestions(nlResult, workspace.compiledVocabulary),
      },
    };
  }

  // 5. Compile DSL to SQL
  const semanticLayer = workspace.semanticLayer;
  const compileResult = compile(nlResult.lcOutput!, semanticLayer);

  if (!compileResult.success) {
    return {
      type: 'error',
      error: { message: compileResult.errors[0]?.message ?? 'Compilation failed' },
    };
  }

  // 6. Emit SQL
  const connection = await getWorkspaceConnection(input.workspaceId);
  const sqlResult = emit(compileResult.flow!, mapDialect(connection.type));

  // 7. Execute query
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

    // 8. Build response
    return {
      queryId: generateId(),
      type: 'visualization',
      visualization: {
        type: inferChartType(nlResult, data),
        title: input.query,
        data,
        grounding: buildGrounding(nlResult.matchedVocabulary),
      },
      suggestions: generateFollowUps(nlResult),
    };
  } finally {
    await adapter.disconnect();
  }
}
```

### Phase 4: Connection Testing (connections module)

**File:** `packages/api/src/modules/knosia/connections/queries.ts`

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

    // Quick health check
    await adapter.query('SELECT 1');

    const latencyMs = Date.now() - startTime;

    await adapter.disconnect();

    return {
      success: true,
      message: `Connected to ${input.type} database`,
      latencyMs,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: mapErrorCode(error),
        message: formatUserMessage(error),
        details: error.message,
      },
    };
  }
}
```

---

## 5. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `packages/api/src/modules/knosia/shared/transforms.ts` | Type transformations |
| `packages/api/src/modules/knosia/shared/execution.ts` | Query execution helpers |

### Modify Files

| File | Changes |
|------|---------|
| `packages/api/src/modules/knosia/analysis/mutations.ts` | Add UVB integration |
| `packages/api/src/modules/knosia/vocabulary/mutations.ts` | Add vocabulary compilation |
| `packages/api/src/modules/knosia/conversation/queries.ts` | Add query engine integration |
| `packages/api/src/modules/knosia/connections/queries.ts` | Add real connection testing |
| `packages/db/src/schema/knosia.ts` | Add workspace columns |

### Schema Migration

```sql
-- packages/db/migrations/XXXX_add_workspace_vocabulary.sql

ALTER TABLE knosia_workspace
  ADD COLUMN compiled_vocabulary jsonb,
  ADD COLUMN semantic_layer jsonb,
  ADD COLUMN vocabulary_version integer DEFAULT 1;
```

---

## 6. Imports Reference

```typescript
// From @repo/liquid-connect

// Query Engine
import {
  createQueryEngine,
  QueryEngine,
  compileVocabulary,
  type CompiledVocabulary,
  type NLQueryResult,
  type NLQueryOptions,
} from '@repo/liquid-connect';

// UVB
import {
  PostgresAdapter,
  extractSchema,
  applyHardRules,
  type DetectedVocabulary,
  type DetectedMetric,
  type DetectedDimension,
  type DetectedTimeField,
  type DetectedFilter,
} from '@repo/liquid-connect';

// Compiler
import {
  compile,
  emit,
  type SemanticLayer,
  type LiquidFlow,
  type EmitResult,
} from '@repo/liquid-connect';
```

---

## 7. Testing Checklist

### Unit Tests

- [ ] `transformToDetectedVocabulary()` correctly maps types
- [ ] `compileVocabulary()` produces valid CompiledVocabulary
- [ ] Query Engine processes sample queries

### Integration Tests

- [ ] Connection test with real PostgreSQL
- [ ] Schema extraction + Hard Rules
- [ ] Full query pipeline: NL → SQL → results
- [ ] User alias resolution

### E2E Tests

- [ ] Add connection → run analysis → confirm vocabulary → query
- [ ] Briefing generation with real data

---

## 8. Related Documents

| Document | Purpose |
|----------|---------|
| `2025-12-29-1445-query-engine-knosia-bridge.md` | Query Engine perspective |
| `2025-12-29-1619-knosia-liquidconnect-bridge.md` | API perspective |
| `2025-12-29-0315-knosia-api-contract-spec.md` | Full API specs |
| `packages/liquid-connect/tests/query-engine/` | 594 Query Engine tests |

---

## 9. Quick Commands

```bash
# Build liquid-connect
pnpm --filter "@repo/liquid-connect" build

# Run query engine tests
cd packages/liquid-connect && npx vitest run tests/query-engine/

# Generate migration
cd packages/db && pnpm drizzle-kit generate

# Start API dev server
pnpm --filter "@repo/api" dev
```

---

*Ready for implementation. Start with Phase 1: Schema Extraction.*
