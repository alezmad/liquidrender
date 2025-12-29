# Query Engine ↔ Knosia API Bridge

> Integration guide for connecting the Query Engine to the Knosia API.
> Created: 2025-12-29

---

## Status Overview

| Component | Status | Location |
|-----------|--------|----------|
| Query Engine | ✅ Complete | `packages/liquid-connect/src/query/` |
| Vocabulary Compiler | ✅ Complete | `packages/liquid-connect/src/vocabulary/` |
| UVB (Hard Rules) | ✅ Complete | `packages/liquid-connect/src/uvb/` |
| Knosia API | ⏳ Pending | `packages/api/src/modules/knosia/` |
| Knosia Schema | ⏳ Pending | `packages/db/src/schema/knosia.ts` |

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              KNOSIA API LAYER                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   POST /api/knosia/conversation/query                                        │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  1. LOAD CONTEXT                                                     │   │
│   │     ├── vocabulary_items (org-level)                                 │   │
│   │     ├── user_preferences.aliases (user-level)                        │   │
│   │     └── role_templates (role context)                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                           LIQUID-CONNECT LAYER                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  2. COMPILE VOCABULARY                                               │   │
│   │     compileVocabulary(detectedVocabulary, {                          │   │
│   │       userAliases: user_preferences.aliases,                         │   │
│   │       includeDefaultPatterns: true                                   │   │
│   │     }) → CompiledVocabulary                                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  3. CREATE ENGINE                                                    │   │
│   │     createQueryEngine(compiledVocabulary) → QueryEngine              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  4. PROCESS QUERY                                                    │   │
│   │     engine.query("revenue by region last month") → QueryResult       │   │
│   │       ├── success: true                                              │   │
│   │       ├── lcOutput: "Q @revenue #region ~M-1"                        │   │
│   │       ├── confidence: 0.95                                           │   │
│   │       └── matchedVocabulary: [...]                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  5. COMPILE LC DSL → SQL                                             │   │
│   │     query(lcOutput, semanticLayer, 'postgres') → EmitResult          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Vocabulary Loading (API → Query Engine)

The Knosia API loads vocabulary from the database and transforms it for the Query Engine:

```typescript
// packages/api/src/modules/knosia/conversation/queries.ts

import {
  compileVocabulary,
  createQueryEngine,
  type DetectedVocabulary,
  type CompiledVocabulary
} from '@repo/liquid-connect';

interface QueryContext {
  workspaceId: string;
  userId: string;
  connectionId: string;
}

async function loadQueryContext(ctx: QueryContext): Promise<{
  vocabulary: CompiledVocabulary;
  roleContext: RoleContext;
}> {
  // 1. Load vocabulary items from DB
  const vocabItems = await db.query.vocabularyItems.findMany({
    where: or(
      eq(vocabularyItems.workspaceId, ctx.workspaceId),
      isNull(vocabularyItems.workspaceId) // global items
    )
  });

  // 2. Load user preferences (aliases)
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, ctx.userId)
  });

  // 3. Load role template
  const membership = await db.query.workspaceMemberships.findFirst({
    where: and(
      eq(workspaceMemberships.userId, ctx.userId),
      eq(workspaceMemberships.workspaceId, ctx.workspaceId)
    ),
    with: { roleTemplate: true }
  });

  // 4. Transform to DetectedVocabulary format
  const detected = transformToDetectedVocabulary(vocabItems);

  // 5. Compile with user aliases
  const compiled = compileVocabulary(detected, {
    userAliases: prefs?.aliases ?? {},
    includeDefaultPatterns: true,
    includeGlobalSynonyms: true,
  });

  return {
    vocabulary: compiled,
    roleContext: {
      roleId: membership?.roleTemplate?.id,
      primaryKpis: membership?.roleTemplate?.primaryKpis ?? [],
      defaultTimeRange: membership?.roleTemplate?.defaultTimeRange ?? '~MTD',
      comparisonDefault: membership?.roleTemplate?.comparisonDefault ?? '~M-1',
    }
  };
}
```

### 2. Vocabulary Item Transformation

Map Knosia DB schema to Query Engine types:

```typescript
// packages/api/src/modules/knosia/conversation/transforms.ts

import type {
  DetectedVocabulary,
  DetectedMetric,
  DetectedDimension,
  DetectedFilter,
  DetectedTimeField
} from '@repo/liquid-connect';

interface KnosiaVocabularyItem {
  id: string;
  slug: string;
  canonicalName: string;
  abbreviation: string | null;
  aliases: string[];
  type: 'metric' | 'dimension' | 'entity' | 'time_field' | 'filter';
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | null;
  cardinality: number | null;
  isPrimaryTime: boolean;
  sourceTable: string;
  sourceColumn: string;
  certainty: number;
}

export function transformToDetectedVocabulary(
  items: KnosiaVocabularyItem[]
): DetectedVocabulary {
  return {
    entities: [], // Not used by Query Engine directly
    metrics: items
      .filter(i => i.type === 'metric')
      .map(toDetectedMetric),
    dimensions: items
      .filter(i => i.type === 'dimension')
      .map(toDetectedDimension),
    timeFields: items
      .filter(i => i.type === 'time_field')
      .map(toDetectedTimeField),
    filters: items
      .filter(i => i.type === 'filter')
      .map(toDetectedFilter),
    relationships: [], // Loaded separately if needed
  };
}

function toDetectedMetric(item: KnosiaVocabularyItem): DetectedMetric {
  return {
    id: item.slug,
    name: item.slug,
    table: item.sourceTable,
    column: item.sourceColumn,
    dataType: 'decimal', // Inferred from type
    aggregation: item.aggregation ?? 'SUM',
    certainty: item.certainty,
    suggestedDisplayName: item.canonicalName,
  };
}

function toDetectedDimension(item: KnosiaVocabularyItem): DetectedDimension {
  return {
    id: item.slug,
    name: item.slug,
    table: item.sourceTable,
    column: item.sourceColumn,
    dataType: 'varchar',
    cardinality: item.cardinality ?? undefined,
    certainty: item.certainty,
  };
}

function toDetectedTimeField(item: KnosiaVocabularyItem): DetectedTimeField {
  return {
    id: item.slug,
    name: item.slug,
    table: item.sourceTable,
    column: item.sourceColumn,
    dataType: 'timestamp',
    isPrimaryCandidate: item.isPrimaryTime,
    certainty: item.certainty,
  };
}

function toDetectedFilter(item: KnosiaVocabularyItem): DetectedFilter {
  return {
    id: item.slug,
    name: item.slug,
    table: item.sourceTable,
    column: item.sourceColumn,
    dataType: 'boolean',
    certainty: item.certainty,
  };
}
```

### 3. Conversation Query Handler

The main endpoint that uses the Query Engine:

```typescript
// packages/api/src/modules/knosia/conversation/router.ts

import { Hono } from 'hono';
import { z } from 'zod';
import {
  createQueryEngine,
  query as compileToSql,
  type NLQueryResult
} from '@repo/liquid-connect';

const querySchema = z.object({
  query: z.string().min(1).max(1000),
  connectionId: z.string().uuid(),
  context: z.object({
    pageId: z.string().optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains']),
      value: z.unknown(),
    })).optional(),
    previousQueryId: z.string().optional(),
  }).optional(),
});

export const conversationRouter = new Hono()
  .post('/query', enforceAuth, validate('json', querySchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('user').id;

    // 1. Load query context
    const { vocabulary, roleContext } = await loadQueryContext({
      workspaceId: getWorkspaceId(c),
      userId,
      connectionId: input.connectionId,
    });

    // 2. Create query engine
    const engine = createQueryEngine(vocabulary, {
      includeTrace: true,
      fuzzyMatching: true,
      fuzzyThreshold: 0.8,
    });

    // 3. Process natural language query
    const nlResult = engine.query(input.query);

    if (!nlResult.success) {
      // Handle no-match case
      return c.json({
        queryId: generateId(),
        type: 'error',
        error: {
          message: formatErrorMessage(nlResult.errorCode),
          alternatives: generateAlternatives(input.query, vocabulary),
        },
        suggestions: [],
        appliedFilters: [],
      }, 200);
    }

    // 4. Load semantic layer for SQL compilation
    const semanticLayer = await loadSemanticLayer(input.connectionId);

    // 5. Compile LC DSL to SQL
    const sqlResult = compileToSql(
      nlResult.lcOutput!,
      semanticLayer,
      'postgres'
    );

    // 6. Execute query (if needed)
    const data = await executeQuery(input.connectionId, sqlResult.sql, sqlResult.params);

    // 7. Build response
    return c.json({
      queryId: generateId(),
      type: 'visualization',
      visualization: {
        type: inferChartType(nlResult, data),
        title: generateTitle(input.query, nlResult),
        data,
        grounding: buildGrounding(nlResult.matchedVocabulary),
      },
      suggestions: generateSuggestions(nlResult, roleContext),
      appliedFilters: extractFilters(nlResult),
    }, 200);
  });
```

---

## Query Engine Exports (What's Available)

### From `@repo/liquid-connect`

```typescript
// Vocabulary Compilation
export { compileVocabulary, generatePatternsFromVocabulary } from './vocabulary';

// Types
export type {
  CompiledVocabulary,
  MetricSlotEntry,
  DimensionSlotEntry,
  SlotEntry,
  Pattern,
  SynonymRegistry,
  VocabularyCompilerOptions,
} from './vocabulary';

// Query Engine
export {
  query as nlQuery,         // Low-level function
  createQueryEngine,        // Factory function
  QueryEngine,              // Class for stateful use
} from './query';

// Types
export type {
  QueryContext,
  QueryResult as NLQueryResult,
  QueryOptions as NLQueryOptions,
  QueryTrace,
  VocabularyResolution,
  NormalizeResult,
  MatchResult,
} from './query';

// UVB (for schema analysis)
export type { DetectedVocabulary, DetectedMetric, ... } from './uvb';
```

---

## Implementation Checklist

### Knosia API Implementation (Pending)

```
packages/api/src/modules/knosia/
├── connections/           ← DB connections (test, create, list, delete)
│   ├── router.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── schemas.ts
├── analysis/              ← Schema analysis (SSE stream)
│   ├── router.ts          ← Uses: @repo/liquid-connect UVB
│   ├── queries.ts
│   └── schemas.ts
├── vocabulary/            ← Vocabulary CRUD
│   ├── router.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── schemas.ts
├── briefing/              ← Daily KPIs/insights
│   ├── router.ts          ← Uses: Query Engine for metrics
│   ├── queries.ts
│   └── schemas.ts
├── conversation/          ← NL queries ⭐ MAIN INTEGRATION
│   ├── router.ts          ← Uses: Query Engine
│   ├── queries.ts         ← loadQueryContext, transformToDetectedVocabulary
│   ├── transforms.ts      ← KnosiaVocabularyItem → DetectedVocabulary
│   └── schemas.ts
└── preferences/           ← User settings
    ├── router.ts
    ├── queries.ts
    └── schemas.ts
```

### Database Schema (Pending)

```
packages/db/src/schema/knosia.ts

Tables needed:
├── knosia_connections           ← Store DB credentials (encrypted)
├── knosia_analyses              ← Analysis run history
├── knosia_vocabulary_items      ← Detected vocabulary ⭐
├── knosia_vocabulary_versions   ← Version history
├── knosia_user_preferences      ← User aliases, settings
├── knosia_role_templates        ← CEO, Analyst, etc.
├── knosia_workspaces            ← Bounded contexts
├── knosia_workspace_memberships ← User-workspace-role
├── knosia_conversations         ← Query history
└── knosia_mismatch_reports      ← Vocabulary feedback
```

---

## Key Integration Patterns

### Pattern 1: Caching Compiled Vocabulary

Avoid recompiling on every request:

```typescript
// Use Redis or in-memory cache
const vocabularyCache = new Map<string, {
  compiled: CompiledVocabulary;
  compiledAt: Date;
  version: string;
}>();

async function getCompiledVocabulary(workspaceId: string): Promise<CompiledVocabulary> {
  const cached = vocabularyCache.get(workspaceId);
  const currentVersion = await db.query.vocabularyVersions.findFirst({
    where: eq(vocabularyVersions.workspaceId, workspaceId),
    orderBy: desc(vocabularyVersions.createdAt),
  });

  if (cached && cached.version === currentVersion?.id) {
    return cached.compiled;
  }

  // Recompile
  const items = await loadVocabularyItems(workspaceId);
  const compiled = compileVocabulary(transformToDetectedVocabulary(items));

  vocabularyCache.set(workspaceId, {
    compiled,
    compiledAt: new Date(),
    version: currentVersion?.id ?? 'initial',
  });

  return compiled;
}
```

### Pattern 2: User Alias Hot-Reload

Apply user aliases without recompiling base vocabulary:

```typescript
async function processQuery(query: string, userId: string, workspaceId: string) {
  // Get base compiled vocabulary (cached)
  const baseVocabulary = await getCompiledVocabulary(workspaceId);

  // Get user's personal aliases
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  // Create engine with user aliases injected
  const engine = createQueryEngine(baseVocabulary);
  return engine.queryWithAliases(query, prefs?.aliases ?? {});
}
```

### Pattern 3: Role-Based Query Defaults

Inject role context for ambiguous queries:

```typescript
function handleAmbiguousQuery(
  query: string,
  roleContext: RoleContext,
  vocabulary: CompiledVocabulary
): string {
  // "how are we doing" → use role's primary KPIs
  if (isGenericStatusQuery(query)) {
    const metrics = roleContext.primaryKpis
      .slice(0, 3)
      .map(k => `@${k}`)
      .join(' ');
    return `Q ${metrics} ${roleContext.defaultTimeRange}`;
  }

  // Fall back to standard matching
  const engine = createQueryEngine(vocabulary);
  const result = engine.query(query);
  return result.lcOutput ?? '';
}
```

---

## Error Handling

### Query Engine Errors → API Responses

```typescript
function mapQueryErrorToResponse(result: NLQueryResult): ConversationResponse {
  if (result.success) {
    throw new Error('Expected error result');
  }

  switch (result.errorCode) {
    case 'EMPTY_INPUT':
      return {
        type: 'error',
        error: {
          message: 'Please enter a question about your data.',
          alternatives: [],
        },
      };

    case 'NO_MATCH':
      return {
        type: 'clarification',
        clarification: {
          question: "I'm not sure what you're asking for. Did you mean:",
          options: generateSuggestions(result.trace),
          rememberChoice: false,
        },
      };

    default:
      return {
        type: 'error',
        error: {
          message: 'Something went wrong processing your query.',
          alternatives: ['Show me revenue', 'What is MRR'],
        },
      };
  }
}
```

---

## Testing Integration

```typescript
// packages/api/tests/knosia/conversation.test.ts

import { describe, test, expect, beforeAll } from 'vitest';
import { createTestVocabulary, createQueryEngine } from '@repo/liquid-connect';

describe('Knosia Conversation API', () => {
  let vocabulary: CompiledVocabulary;

  beforeAll(async () => {
    // Seed test vocabulary
    vocabulary = createTestVocabulary();
  });

  test('processes simple metric query', async () => {
    const engine = createQueryEngine(vocabulary);
    const result = engine.query('revenue');

    expect(result.success).toBe(true);
    expect(result.lcOutput).toBe('Q @revenue');
  });

  test('resolves user aliases', async () => {
    const engine = createQueryEngine(vocabulary);
    const result = engine.queryWithAliases('my number', { 'my number': 'mrr' });

    expect(result.success).toBe(true);
    expect(result.lcOutput).toContain('@mrr');
  });

  test('handles unknown queries gracefully', async () => {
    const engine = createQueryEngine(vocabulary);
    const result = engine.query('xyzzy foo bar');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NO_MATCH');
  });
});
```

---

## Summary: Next Steps

1. **Implement Knosia DB Schema** (`packages/db/src/schema/knosia.ts`)
   - Core tables: connections, analyses, vocabulary_items, preferences
   - Relationships: workspaces, memberships, role_templates

2. **Create Conversation Module** (`packages/api/src/modules/knosia/conversation/`)
   - `queries.ts`: loadQueryContext, transformToDetectedVocabulary
   - `router.ts`: POST /query, POST /clarify endpoints

3. **Wire Up Vocabulary Loading**
   - Transform Knosia vocabulary_items → DetectedVocabulary
   - Compile with user aliases
   - Cache compiled vocabulary per workspace

4. **Add Integration Tests**
   - Query processing with real vocabulary
   - User alias resolution
   - Error handling paths

---

## File References

| Document | Purpose |
|----------|---------|
| `2025-12-29-knosia-api-contract-spec.md` | Full API endpoint specs |
| `2025-12-29-query-engine-vocabulary-bridge.md` | 3-level resolution details |
| `2025-12-29-knosia-implementation-launcher.md` | Quick start for API impl |
| `packages/liquid-connect/src/vocabulary/` | Query Engine vocabulary code |
| `packages/liquid-connect/src/query/` | Query Engine processing code |

---

*Ready for Knosia API implementation.*
