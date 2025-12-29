# LiquidConnect System Architecture

**Date:** 2025-12-28
**Status:** Design Complete
**Version:** 1.0

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         LIQUIDCONNECT SYSTEM                                │
│                                                                             │
│  "From any database to natural language queries in 5 minutes"               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 0: Data Sources

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│PostgreSQL│ │  MySQL   │ │ SQLite   │ │ Parquet  │ │   CSV    │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │            │
     └────────────┴────────────┴────────────┴────────────┘
                                │
                                ▼
                    ┌───────────────────┐
                    │   CONNECTION      │
                    │   ADAPTER         │
                    │   (DuckDB? TBD)   │
                    └───────────────────┘
```

**Open Question:** Can DuckDB read schema from attached databases?

---

## Layer 1: Schema Extraction

**Runs:** Once per database connection
**Input:** Database connection
**Output:** Raw schema object

### Schema Reader

```typescript
interface RawSchema {
  tables: {
    name: string;
    columns: Column[];
    primaryKey: string[];
    foreignKeys: ForeignKey[];
  }[];
  statistics: {
    table: string;
    column: string;
    cardinality: number;
    nullCount: number;
    min?: any;
    max?: any;
  }[];
}
```

### Structure Detector

Applies **hard rules** (100% deterministic):

| Rule | Pattern | Output |
|------|---------|--------|
| Entity | Table + PK + not junction | `{ type: 'entity', name }` |
| Relationship | FK constraint | `{ from, to, via }` |
| SUM Metric | DECIMAL + /amount\|total\|price/ | `{ type: 'metric', agg: 'SUM' }` |
| COUNT Metric | INTEGER + is_pk | `{ type: 'metric', agg: 'COUNT' }` |
| Dimension | VARCHAR + cardinality < 100 | `{ type: 'dimension' }` |
| Time Field | DATE/TIMESTAMP | `{ type: 'time' }` |
| Filter | BOOLEAN or {0,1} | `{ type: 'filter' }` |

**Output:** Structure object

```typescript
interface Structure {
  entities: Entity[];
  metricCandidates: MetricCandidate[];
  dimensionCandidates: DimensionCandidate[];
  relationships: Relationship[];
  timeFields: TimeField[];
  filterCandidates: FilterCandidate[];
}
```

---

## Layer 2: User Confirmation

**Runs:** Once per database (30 seconds)
**Input:** Structure object
**Output:** Vocabulary (semantic_layer.yaml)

### Onboarding UI

```
┌─────────────────────────────────────────────────────────────────┐
│  "We found these metrics:"                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  orders.amount  →  @revenue     [rename: ________]  ☑   │    │
│  │  orders.freight →  @shipping    [rename: ________]  ☑   │    │
│  │  COUNT(orders)  →  @orders      [rename: ________]  ☑   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  "Which is your main time field?"                               │
│  ○ orders.created_at                                            │
│  ● orders.order_date  ← user selects                            │
│  ○ orders.shipped_date                                          │
│                                                                 │
│  "Any named filters?"                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  status = 'active'    →  ?active       ☑                │    │
│  │  segment = 'ENT'      →  ?enterprise   ☑                │    │
│  │  amount > [1000]      →  ?high_value   ☑                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                              [CONFIRM]                          │
└─────────────────────────────────────────────────────────────────┘
```

### Vocabulary Output

```yaml
# semantic_layer.yaml
entities:
  orders:
    source: public.orders
    pk: order_id
    time: order_date
  customers:
    source: public.customers
    pk: customer_id

metrics:
  revenue:
    entity: orders
    expr: "SUM(amount)"
  orders:
    entity: orders
    expr: "COUNT(*)"
  aov:
    entity: orders
    expr: "@revenue / @orders"
    derived: true

dimensions:
  region:
    entity: customers
    expr: "region"
  category:
    entity: products
    expr: "category_name"

filters:
  active:
    expr: "status = 'active'"
  enterprise:
    expr: "segment = 'ENT'"
  high_value:
    expr: "amount > 1000"

relationships:
  - from: orders
    to: customers
    via: customer_id
  - from: orders
    to: products
    via: product_id
```

---

## Layer 3: Vocabulary Compiler

**Runs:** Once per vocabulary change
**Input:** semantic_layer.yaml
**Output:** Parser + Validator + LLM Prompt

### Generated Components

#### 1. Pattern Templates

```typescript
const patterns = [
  { nl: "total {m}", lc: "Q @{m}" },
  { nl: "{m}", lc: "Q @{m}" },
  { nl: "{m} by {d}", lc: "Q @{m} #{d}" },
  { nl: "{m} by {d} by {d2}", lc: "Q @{m} #{d} #{d2}" },
  { nl: "top {n} {d} by {m}", lc: "Q @{m} #{d} top:{n} -@{m}" },
  { nl: "{m} for {f}", lc: "Q @{m} ?{f}" },
  { nl: "{m} {t}", lc: "Q @{m} ~{t}" },
  { nl: "{m} by {d} for {f} {t}", lc: "Q @{m} #{d} ?{f} ~{t}" },
  { nl: "{m} {t} vs {t2}", lc: "Q @{m} ~{t} vs {t2}" },
];
```

#### 2. Slot Fillers

```typescript
const slots = {
  m: ["revenue", "orders", "aov"],           // metrics
  d: ["region", "category", "customer"],      // dimensions
  f: ["active", "enterprise", "high_value"],  // filters
  t: ["today", "yesterday", "this week", "this month",
      "this quarter", "this year", "last week", "last month",
      "last quarter", "last year", "Q-1", "M-1", "Y-1"],
  n: /\d+/,  // any number
};
```

#### 3. Synonym Map

```typescript
const synonyms = {
  // Metric synonyms
  "money": "revenue", "sales": "revenue", "income": "revenue",
  "count": "orders", "total orders": "orders",

  // Dimension synonyms
  "geo": "region", "geography": "region", "area": "region",

  // Time synonyms
  "MTD": "this month", "YTD": "this year", "QTD": "this quarter",
  "prior quarter": "last quarter", "previous month": "last month",
};
```

#### 4. LLM Fallback Prompt

```
Generate LiquidConnect query. Output ONLY the query starting with Q.

VOCABULARY:
Metrics: @revenue @orders @aov
Dimensions: #region #category #customer
Filters: ?active ?enterprise ?high_value
Time: ~today ~this_month ~Q-1 ~M-1

SYNTAX:
Q @metric #dim ?filter ~time top:N ±sort vs period

EXAMPLES:
"revenue" → Q @revenue
"revenue by region" → Q @revenue #region
"top 10 customers" → Q @revenue #customer top:10 -@revenue
"enterprise last quarter" → Q @revenue ?enterprise ~Q-1

Question: {user_input}
```

#### 5. Validator

```typescript
function validate(lc: string, vocabulary: Vocabulary): ValidationResult {
  const ast = parse(lc);

  // Check all metrics exist
  for (const metric of ast.metrics) {
    if (!vocabulary.metrics[metric]) {
      return { valid: false, error: `Unknown metric: @${metric}` };
    }
  }

  // Check all dimensions exist
  for (const dim of ast.dimensions) {
    if (!vocabulary.dimensions[dim]) {
      return { valid: false, error: `Unknown dimension: #${dim}` };
    }
  }

  // Check relationships exist for required joins
  // ...

  return { valid: true };
}
```

---

## Layer 4: Query Engine

**Runs:** Per user query
**Input:** Natural language question
**Output:** SQL results

### Flow

```
User: "revenue by region last quarter"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: PATTERN MATCHER                                        │
│  ────────────────────────                                       │
│  Input: "revenue by region last quarter"                        │
│  Normalize: lowercase, remove punctuation                       │
│  Match: "{m} by {d} {t}"                                        │
│  Slots: m=revenue, d=region, t=last quarter                     │
│  Output: Q @revenue #region ~Q-1                                │
│                                                                 │
│  MATCHED? ──YES──→ Skip to Step 3                               │
│     │                                                           │
│     NO (5% of queries)                                          │
│     ▼                                                           │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: LLM FALLBACK                                           │
│  ────────────────────                                           │
│  Prompt: vocabulary + examples + user input                     │
│  Model: Fast/cheap (e.g., Claude Haiku)                         │
│  Output: Q @revenue #region ~Q-1                                │
│                                                                 │
│  Invalid output? Retry with error feedback (max 2 retries)      │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: VALIDATOR                                              │
│  ────────────────                                               │
│  Check: All terms exist in vocabulary                           │
│  Check: Grammar is valid                                        │
│  Check: Relationships exist for joins                           │
│  Output: Validated LC                                           │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: LC COMPILER (existing, stages 0-9 complete)            │
│  ─────────────────────────────────────────────────              │
│  Scanner → Parser → AST                                         │
│  Resolver → LiquidFlow IR                                       │
│  Emitter → SQL                                                  │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: SQL EXECUTOR                                           │
│  ────────────────────                                           │
│  Execute: Against source DB or DuckDB federation                │
│  Return: Results + metadata                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Summary

| Component | Purpose | Runs | Status |
|-----------|---------|------|--------|
| Connection Adapter | Connect to any DB | Once/DB | TBD |
| Schema Reader | Extract schema metadata | Once/DB | To build |
| Structure Detector | Hard rules → candidates | Once/DB | To build |
| Onboarding UI | User confirmation | Once/DB | To build |
| Vocabulary Compiler | Generate parser/validator | Once/vocab | To build |
| Pattern Matcher | NL → LC (no LLM) | Per query | To build |
| LLM Fallback | Complex queries | ~5% queries | To build |
| Validator | Reject invalid LC | Per query | To build |
| LC Compiler | LC → SQL | Per query | **DONE** |
| SQL Executor | Run SQL | Per query | Trivial |

---

## Performance Characteristics

| Metric | Target | Notes |
|--------|--------|-------|
| Pattern match latency | <10ms | No network, no LLM |
| LLM fallback latency | <500ms | Claude Haiku |
| Average latency | <50ms | 80% pattern match |
| Pattern match rate | >80% | Goal: minimize LLM usage |
| Cost per query | <$0.001 | Mostly free (pattern match) |

---

## Implementation Phases

### Phase 1: Validate Assumptions ← CURRENT
- Test DuckDB schema reading
- Verify hard rules on 7 DBs
- Confirm pattern matching feasibility

### Phase 2: Schema → Structure
- Build Schema Reader
- Build Structure Detector
- Test on all 7 infra DBs

### Phase 3: Vocabulary Compiler
- Pattern template generator
- Synonym map builder
- LLM prompt generator
- Validator

### Phase 4: Query Engine
- Pattern Matcher
- LLM fallback integration
- End-to-end pipeline

### Phase 5: Onboarding UI
- Web interface for confirmation
- Vocabulary storage/versioning
- Multi-tenant support

---

## Open Questions

| Question | Options | Impact |
|----------|---------|--------|
| DuckDB for schema? | DuckDB / Native drivers | Architecture simplicity |
| DuckDB for execution? | DuckDB federation / Direct | Performance vs features |
| LLM model? | Haiku / GPT-4-mini / Local | Cost vs accuracy |
| UI framework? | React / Svelte / CLI only | Development speed |

---

## File Locations

```
liquid-connect/
├── src/
│   ├── compiler/          # DONE - LC → AST
│   ├── resolver/          # DONE - AST → LiquidFlow
│   ├── emitters/          # DONE - LiquidFlow → SQL
│   ├── schema/            # TO BUILD - Schema extraction
│   │   ├── reader.ts
│   │   └── detector.ts
│   ├── vocabulary/        # TO BUILD - Vocab compilation
│   │   ├── compiler.ts
│   │   └── validator.ts
│   └── query/             # TO BUILD - Query engine
│       ├── matcher.ts
│       └── fallback.ts
└── specs/
    ├── language.md        # DONE - LC syntax
    ├── liquidflow.md      # DONE - IR spec
    └── vocabulary.md      # TO WRITE - Vocab format
```
