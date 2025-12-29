# Knosia Vocabulary Engine Architecture

**Date:** 2025-12-29
**Status:** Design Synthesis
**Supersedes:** All prior vocabulary/UVB documents

---

## Philosophy

```
SCHEMA                    STRUCTURE                 VOCABULARY
(what exists)     →       (what it is)       →      (what it means)
  Certain                   Certain                   ~10% Needs user
  (read)                    (7 hard rules)            (confirm)
```

**90% of vocabulary extraction is READING, not LEARNING.**

The schema already contains:
- What entities exist (tables with PKs)
- How they relate (FKs)
- What's measurable (numeric columns)
- What's categorical (low-cardinality strings)
- What's temporal (date columns)

The only thing we can't read is **MEANING**. And meaning comes from the user, not from ML.

---

## The Determinism Boundary

```
Natural Language → LLM → LiquidConnect → Compiler → SQL
     (fuzzy)            (deterministic)   (deterministic)
                              ↑
                    DETERMINISM BOUNDARY
```

Everything to the right of LiquidConnect is a **pure function**:
- Same LC + same schema + same timestamp = Same SQL (always)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KNOSIA INTERFACE                                   │
│  Briefings • Conversations • Explorations                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KNOSIA BRAIN                                       │
│  Context (role, KPIs) • Memory (queries, preferences) • Reasoning           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VOCABULARY ENGINE                                   │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  EXTRACTION      │  │  RESOLUTION      │  │  QUERY ENGINE    │          │
│  │                  │  │                  │  │                  │          │
│  │  Schema → Rules  │  │  NL → LC Code    │  │  LC → SQL        │          │
│  │  → Vocabulary    │  │  Pattern match   │  │  (Compiler)      │          │
│  │                  │  │  LLM fallback    │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           YOUR DATA                                          │
│  PostgreSQL • MySQL • SQLite • Snowflake • BigQuery • DuckDB                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Status

| Component | Location | Status |
|-----------|----------|--------|
| **LC Compiler** | `packages/liquid-connect/src/compiler/` | ✓ DONE (162 tests) |
| **LC Resolver** | `packages/liquid-connect/src/resolver/` | ✓ DONE |
| **LC Emitters** | `packages/liquid-connect/src/emitters/` | ✓ DONE |
| **UVB Models** | `packages/liquid-connect/src/uvb/models.ts` | ✓ DONE |
| **UVB Rules** | `packages/liquid-connect/src/uvb/rules.ts` | ✓ DONE |
| **UVB Extractor** | `packages/liquid-connect/src/uvb/extractor.ts` | ✓ DONE |
| **Postgres Adapter** | `packages/liquid-connect/src/uvb/adapters/postgres.ts` | ✓ DONE |
| **API Routes** | `packages/api/src/modules/vocabulary/` | PENDING |
| **Onboarding UI** | `apps/web/src/app/[locale]/onboarding/` | PENDING |
| **Pattern Matcher** | `packages/liquid-connect/src/query/matcher.ts` | PENDING |
| **LLM Fallback** | `packages/liquid-connect/src/query/fallback.ts` | PENDING |

---

## The 7 Hard Rules

Validated on: Northwind, Chinook, Pagila, ECIJA (508 tables, multilingual)

### Rule 1: Entity Detection (100% certain)

```typescript
| Condition                          | Result                    |
|------------------------------------|---------------------------|
| Table + single-column PK           | Entity                    |
| Table + composite PK (all FKs)     | Junction table (NOT entity)|
| Table + composite PK (mixed)       | Entity with composite key |
| Table + no PK                      | Log/audit (NOT entity)    |
```

### Rule 2: Relationship Detection (90% certain)

```typescript
| Condition                          | Result                    |
|------------------------------------|---------------------------|
| FK constraint                      | many_to_one relationship  |
| Junction table                     | many_to_many relationship |
```

### Rule 3: Metric Detection (85-100% certain)

```typescript
| Type + Pattern                     | Aggregation | Certainty |
|------------------------------------|-------------|-----------|
| DECIMAL + amount/price/total/cost  | SUM         | 100%      |
| DECIMAL + rate/ratio/percent/avg   | AVG         | 100%      |
| INTEGER + is PK                    | COUNT       | 100%      |
| INTEGER + count/qty/quantity       | SUM         | 100%      |
| DECIMAL + no pattern               | SUM default | 80%       |
```

**Multilingual patterns:** `importe|precio|total|costo|valor|tasa|promedio`

### Rule 4: Dimension Detection (90% certain)

```typescript
| Condition                          | Certainty |
|------------------------------------|-----------|
| ENUM type                          | 100%      |
| VARCHAR + status/type/category     | 100%      |
| VARCHAR + cardinality < 100        | 95%       |
| VARCHAR + cardinality 100-1000     | 75%       |
| VARCHAR + cardinality > 1000       | 0%        |
```

### Rule 5: Time Field Detection (95% certain)

```typescript
| Type                               | Priority  |
|------------------------------------|-----------|
| DATE/TIMESTAMP                     | 100%      |
| Pattern: created_at, order_date    | Primary   |
| Pattern: updated_at, modified_at   | Skip (audit) |
```

### Rule 6: Filter Detection (100% certain)

```typescript
| Condition                          | Result    |
|------------------------------------|-----------|
| BOOLEAN type                       | Filter    |
| is_/has_/can_ prefix               | Filter    |
| _active/_enabled/_deleted suffix   | Filter    |
| INTEGER with only 0/1 values       | Filter    |
```

### Rule 7: Cardinality Threshold

```
< 100      → Dimension (safe for GROUP BY)
100-1000   → Maybe dimension (user confirms)
> 1000     → Not dimension (would explode UI)
```

---

## Data Types

### VocabularyDraft (Output of extraction)

```typescript
interface VocabularyDraft {
  version: "1.0";
  extractedAt: Date;
  source: {
    connectionId: string;
    adapter: "postgres" | "mysql" | "sqlite" | "duckdb";
    schema?: string;
  };
  entities: EntityDraft[];
  relationships: RelationshipDraft[];
  metrics: MetricDraft[];
  dimensions: DimensionDraft[];
  timeFields: TimeFieldDraft[];
  filters: FilterDraft[];
}
```

### DetectedVocabulary (After user confirmation)

```typescript
interface DetectedVocabulary {
  version: "1.0";
  confirmedAt: Date;
  entities: Entity[];
  relationships: Relationship[];
  metrics: Metric[];
  dimensions: Dimension[];
  timeField: TimeField;  // Single primary time field
  filters: Filter[];
  synonyms?: SynonymMap;
  derivedMetrics?: DerivedMetric[];
}
```

---

## Onboarding Flow

**Target: 60 seconds total**

```
/onboarding/
├── /connect       ← 30 sec: Database connection
├── /vocabulary    ← 5 sec: Auto-extraction (background)
├── /confirm       ← 30 sec: Answer 5-10 questions
└── /ready         ← First briefing preview
```

### Step 1: Connect (30 sec)

```
┌─────────────────────────────────────────────────────────────────┐
│  Connect your database                                          │
│                                                                 │
│  [PostgreSQL] [MySQL] [Snowflake] [BigQuery] [DuckDB]          │
│                                                                 │
│  Connection string: [________________________]                  │
│                                                                 │
│  [Test Connection]  [Continue →]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Vocabulary Extraction (5 sec, automatic)

```
┌─────────────────────────────────────────────────────────────────┐
│  Understanding your data...                                     │
│                                                                 │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░  35%                        │
│                                                                 │
│  Found so far:                                                  │
│  • 12 entities                                                  │
│  • 8 metrics                                                    │
│  • 15 dimensions                                                │
│  • 3 time fields                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 3: Confirm (30 sec)

**Only surfaces at friction points:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Quick setup (5 questions)                                      │
│                                                                 │
│  1. Which is your primary date field?                           │
│     ○ orders.created_at                                         │
│     ● orders.order_date  ← user selects                         │
│     ○ orders.shipped_date                                       │
│                                                                 │
│  2. What do you call this? (orders.amount)                      │
│     [revenue_________]                                          │
│                                                                 │
│  3. Is this a SUM or AVG? (orders.unit_price)                   │
│     ● SUM  ○ AVG                                                │
│                                                                 │
│  [← Back]                           [Continue →] [Skip All]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 4: Ready

```
┌─────────────────────────────────────────────────────────────────┐
│  Your vocabulary is ready                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  @revenue @orders @aov @shipping                        │   │
│  │  #region #category #customer #status                    │   │
│  │  ?active ?enterprise ?high_value                        │   │
│  │  ~today ~this_month ~Q-1                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Try asking: "revenue by region this quarter"                   │
│                                                                 │
│  [Go to Briefing →]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Routes

### Vocabulary Module

```
POST /api/vocabulary/extract
  Input: { connectionId: string, schema?: string }
  Output: { draft: VocabularyDraft }
  Time: ~5 seconds

POST /api/vocabulary/validate
  Input: { draft: VocabularyDraft }
  Output: { valid: boolean, errors?: ValidationError[] }

POST /api/vocabulary/confirm
  Input: {
    draft: VocabularyDraft,
    confirmations: Confirmation[]
  }
  Output: { vocabulary: DetectedVocabulary }

POST /api/vocabulary/save
  Input: { vocabulary: DetectedVocabulary }
  Output: { vocabularyId: string }

GET /api/vocabulary/:id
  Output: { vocabulary: DetectedVocabulary }

POST /api/vocabulary/:id/refresh
  Detects schema drift, returns changes
```

---

## File Structure

```
packages/liquid-connect/src/
├── compiler/          ✓ LC → AST (162 tests)
├── resolver/          ✓ AST → LiquidFlow
├── emitters/          ✓ LiquidFlow → SQL
├── uvb/               ✓ Universal Vocabulary Builder
│   ├── models.ts      ✓ VocabularyDraft, DetectedVocabulary
│   ├── rules.ts       ✓ 7 hard rules
│   ├── extractor.ts   ✓ Schema extraction
│   └── adapters/
│       ├── postgres.ts ✓ PostgreSQL
│       ├── mysql.ts    PENDING
│       ├── sqlite.ts   PENDING
│       └── duckdb.ts   PENDING
├── vocabulary/        PENDING - Vocab compilation
│   ├── compiler.ts    Generates patterns, slots, synonyms
│   └── validator.ts   Validates LC against vocabulary
└── query/             PENDING - Query engine
    ├── matcher.ts     NL → LC (pattern match, 80%)
    └── fallback.ts    NL → LC (LLM, 20%)

packages/api/src/modules/
└── vocabulary/        PENDING
    ├── router.ts
    ├── queries.ts
    ├── mutations.ts
    └── schema.ts

apps/web/src/app/[locale]/
└── onboarding/        PENDING
    ├── connect/
    ├── vocabulary/
    ├── confirm/
    └── ready/
```

---

## Query-Time Flow

```
User: "revenue by region last quarter"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: PATTERN MATCHER (80% of queries)                       │
│  ────────────────────────                                       │
│  Input: "revenue by region last quarter"                        │
│  Match: "{m} by {d} {t}"                                        │
│  Slots: m=revenue, d=region, t=last quarter                     │
│  Output: Q @revenue #region ~Q-1                                │
│                                                                 │
│  MATCHED? ──YES──→ Skip to Step 3                               │
│     │                                                           │
│     NO (20% of queries)                                         │
│     ▼                                                           │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: LLM FALLBACK (Claude Haiku)                            │
│  ────────────────────                                           │
│  Prompt: vocabulary + examples + user input                     │
│  Output: Q @revenue #region ~Q-1                                │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: VALIDATOR                                              │
│  Check: All terms exist in vocabulary                           │
│  Check: Grammar is valid                                        │
│  Check: Relationships exist for joins                           │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: LC COMPILER (existing, complete)                       │
│  Scanner → Parser → AST → Resolver → Emitter → SQL              │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: EXECUTE                                                │
│  Run SQL → Return results + metadata                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Onboarding time | < 60 seconds |
| Pattern match latency | < 10ms |
| LLM fallback latency | < 500ms |
| Average query latency | < 50ms |
| Pattern match rate | > 80% |
| Cost per query | < $0.001 average |

---

## Risk Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Cache hit < 80% | Medium | Early metrics, adjust thresholds |
| Onboarding > 60s | Medium | Aggressive UX testing |
| Schema drift | Medium | Incremental detection, guided migration |
| Multilingual gaps | Low | Pattern validation on ECIJA + expansion |

---

## Implementation Order

### Phase 1: API Routes (Current)
1. Create `packages/api/src/modules/vocabulary/` module
2. Implement extract → validate → confirm → save flow
3. Connect to existing UVB backend

### Phase 2: Onboarding UI
1. Create `/onboarding/` routes
2. Build connect wizard
3. Build confirmation wizard
4. Integration test end-to-end

### Phase 3: Query Engine
1. Pattern matcher (80% coverage)
2. LLM fallback (20%)
3. Validator integration

### Phase 4: Vocabulary Compiler
1. Pattern template generator
2. Synonym map builder
3. LLM prompt generator

---

## References

| Document | Purpose |
|----------|---------|
| `.cognitive/sessions/atoms/uvb-hard-rules.yaml` | Rule validation data |
| `packages/liquid-connect/specs/UNIVERSAL-VOCABULARY-BUILDER.md` | UVB spec |
| `packages/liquid-connect/specs/UVB-INTEGRATION-DESIGN.md` | UI patterns |
| `.claude/artifacts/2025-12-28-2254-liquidrender-vision.md` | Product vision |
| `.claude/artifacts/2025-12-29-knosia-auth-dashboard-ui.md` | Auth/dashboard UI |

---

*Synthesized from all prior architecture documents | 2025-12-29*
