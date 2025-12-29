# Knosia API Implementation Launcher

> Paste this entire file into a fresh Claude Code session to start implementation.

---

## Prompt

```
I'm implementing the Knosia API - a business intelligence semantic layer.

READ THESE FILES IN ORDER:
1. .claude/artifacts/2025-12-29-knosia-architecture-vision.md (full vision - 30 tables)
2. .claude/artifacts/2025-12-29-0315-knosia-api-contract-spec.md (API endpoints)
3. .claude/artifacts/2025-12-29-query-engine-vocabulary-bridge.md (Query Engine integration)

EXISTING CODE TO REFERENCE:
- packages/api/src/modules/vocabulary/ (existing pattern)
- packages/api/src/middleware.ts (auth middleware)
- packages/db/src/schema/vocabulary.ts (existing schema pattern)

SCOPE: V1 Foundation (15 tables, 6 API modules)

Create a workflow proposal for implementing:
1. Database schema (packages/db/src/schema/knosia.ts)
2. API modules (packages/api/src/modules/knosia/*)
   - connections/
   - analysis/
   - vocabulary/
   - briefing/
   - conversation/
   - preferences/

Use /workflow:create after reading the context.
```

---

## Quick Context (if you don't want to read all files)

### What is Knosia?

Business Operating System - semantic layer for organizations:
- **Vocabulary**: Shared definitions (MRR, Churn) extracted from databases
- **Roles**: Cognitive profiles (CEO sees different briefing than Analyst)
- **Workspaces**: Bounded contexts (Revenue team vs Product team)
- **Conversations**: Natural language → SQL via LC DSL

### The 7 Hard Rules

Vocabulary extraction is 90% deterministic:

| Rule | Detects | Output |
|------|---------|--------|
| 1 | Table + PK | Entity |
| 2 | FK constraint | Relationship |
| 3 | DECIMAL + pattern | Metric + aggregation |
| 4 | Low cardinality | Dimension |
| 5 | DATE + pattern | Time field |
| 6 | BOOLEAN/is_/has_ | Filter |
| 7 | Cardinality < 100 | Safe for GROUP BY |

### V1 Tables (15)

```
organizations          workspaces              workspace_connections
connections            connection_health       connection_schemas
vocabulary_items       vocabulary_versions     role_templates
workspace_memberships  user_preferences        analyses
conversations          conversation_messages   mismatch_reports
```

### V1 API Modules (6)

| Module | Endpoints | Purpose |
|--------|-----------|---------|
| connections | POST /test, POST /, GET /, DELETE /:id | DB connections |
| analysis | GET /run (SSE) | Schema analysis |
| vocabulary | GET /:id, POST /confirm, POST /report-mismatch | Vocabulary |
| briefing | GET / | Daily KPIs/insights |
| conversation | POST /query, POST /clarify | NL queries |
| preferences | GET /, PATCH / | User settings |

### Key Patterns

**Router pattern** (from existing vocabulary module):
```typescript
export const featureRouter = new Hono<{ Variables: { user: User } }>()
  .use(enforceAuth)
  .get("/", async (c) => { ... })
  .post("/", async (c) => { ... });
```

**Schema pattern** (from existing vocabulary schema):
```typescript
export const myTable = pgTable("my_table", {
  id: text().primaryKey().$defaultFn(generateId),
  userId: text().references(() => user.id, { onDelete: "cascade" }),
  data: jsonb().$type<MyType>(),
  createdAt: timestamp().notNull().defaultNow(),
});
```

### VocabularyItem Key Fields

```typescript
{
  slug: "mrr",
  canonical_name: "Monthly Recurring Revenue",
  type: "metric",
  aggregation: "SUM",           // from Rule 3
  cardinality: null,            // metrics don't have this
  is_primary_time: false,
  joins_to: [{ target: "customers", via: "customer_id" }],
  role_relevance: { ceo: { priority: "primary" } }
}
```

---

## Files Reference

| File | Content | Tokens |
|------|---------|--------|
| `knosia-architecture-vision.md` | Full data model, 30 tables | ~8k |
| `knosia-api-contract-spec.md` | All endpoints, request/response | ~4k |
| `query-engine-vocabulary-bridge.md` | Query Engine integration | ~3k |
| `vocabulary-engine-architecture.md` | 7 Hard Rules detail | ~3k |

---

## Implementation Order

1. **Wave 0**: Database schema + barrel exports
2. **Wave 1**: 6 API modules in parallel
3. **Wave 2**: Router registration + integration
4. **Wave 3**: Validation + TypeScript check

Estimated: 7-10 min wall clock with parallel agents.
