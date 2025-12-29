# LiquidConnect Arena

**Version**: 0.1.0
**Created**: 2025-12-27
**Objective**: correct
**Status**: Stage 0 (Atoms)

---

## Intent

### Original Intent
> Build a query language for business metrics that compiles to SQL, testing against running infrastructure.

### Elevated Intent
> Build a **universal analytical abstraction layer** — an LLM-native query language that compiles to a portable Analytical Plan, then emits to ANY SQL dialect (DuckDB, Trino, ClickHouse, BigQuery, etc.) with guaranteed cross-engine parity.

---

## Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│  LiquidConnect: The Universal Analytical IR                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Q @revenue #region ?enterprise ~Q-1                                │
│                         │                                           │
│                         ▼                                           │
│              ┌─────────────────────┐                                │
│              │   Analytical Plan   │  ← Portable IR                 │
│              │   (Backend-agnostic)│                                │
│              └─────────────────────┘                                │
│                         │                                           │
│         ┌───────────────┼───────────────┐                           │
│         ▼               ▼               ▼                           │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐                        │
│    │ DuckDB  │    │  Trino  │    │ClickHse │  ...more               │
│    │ Emitter │    │ Emitter │    │ Emitter │                        │
│    └─────────┘    └─────────┘    └─────────┘                        │
│         │               │               │                           │
│         ▼               ▼               ▼                           │
│    DuckDB SQL      Trino SQL     ClickHouse SQL                     │
│                                                                     │
│  GUARANTEE: Same query → Same results across ALL backends           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Three-Layer Compilation

| Layer | Name | Purpose |
|-------|------|---------|
| **L3** | LiquidConnect | Human/LLM query language |
| **L2** | Analytical Plan | Backend-agnostic IR (JSON) |
| **L1** | SQL Emitters | Dialect-specific SQL generation |

### Analytical Plan (The Universal IR)

```json
{
  "version": "0.1.0",
  "type": "metric_query",
  "metrics": [
    {
      "ref": "revenue",
      "aggregation": "SUM",
      "expression": "order_details.unit_price * order_details.quantity * (1 - order_details.discount)"
    }
  ],
  "dimensions": [],
  "filters": [],
  "joins": [],
  "time_constraint": null,
  "order": [],
  "limit": null
}
```

### Emitter Interface

Each emitter must implement:

```
emit(plan: AnalyticalPlan, dialect: string) → SQL string
```

Emitters handle dialect-specific:
- Date/time functions
- String functions
- NULL handling
- Type casting
- JOIN syntax variations

---

## Evolution Stages

| Stage | Features | Success Criteria |
|-------|----------|------------------|
| **0: Atoms** | `Q @metric`, `Q .entity` | Parse, plan, emit, execute |
| **1: Dimensions** | `+ #dimension` | GROUP BY across all backends |
| **2: Filters** | `+ ?filter` | WHERE with closed vocabulary |
| **3: Time** | `+ ~time` | Temporal expressions portable |
| **4: Sort/Limit** | `+ top:N ±sort` | ORDER BY + LIMIT |
| **5: Compare** | `+ vs period` | Period comparison windows |
| **6: Advanced** | Parameters, governance | Production features |

### Stage Gate Criteria

To advance from Stage N to Stage N+1:
1. 100% of Stage N examples pass
2. ALL emitters produce valid SQL
3. Cross-engine parity: identical results
4. No open findings

---

## Stage 0: Atoms

### Syntax

```
Q @metric          # Aggregate query (returns single value)
Q .entity          # Entity query (returns list of records)
```

### Sigils

| Sigil | Meaning | Example |
|-------|---------|---------|
| `Q` | Query marker | `Q @revenue` |
| `@` | Metric (aggregation) | `@revenue`, `@orders` |
| `.` | Entity (record listing) | `.customers`, `.orders` |

### Grammar (EBNF)

```ebnf
query         = "Q" ( metric_query | entity_query ) ;
metric_query  = metric ;
entity_query  = entity ;
metric        = "@" identifier ;
entity        = "." identifier ;
identifier    = letter { letter | digit | "_" } ;
```

---

## Examples (Stage 0)

### Example 1: Total Revenue

**LiquidConnect**: `Q @revenue`

**Analytical Plan**:
```json
{
  "version": "0.1.0",
  "type": "metric_query",
  "metrics": [{"ref": "revenue"}],
  "dimensions": [],
  "filters": [],
  "time_constraint": null
}
```

**DuckDB SQL**:
```sql
SELECT SUM(od.unit_price * od.quantity * (1 - od.discount)) AS revenue
FROM order_details od
```

**Trino SQL**:
```sql
SELECT SUM(od.unit_price * od.quantity * (1 - od.discount)) AS revenue
FROM northwind.public.order_details od
```

### Example 2: Order Count

**LiquidConnect**: `Q @orders`

**Analytical Plan**:
```json
{
  "version": "0.1.0",
  "type": "metric_query",
  "metrics": [{"ref": "orders"}],
  "dimensions": [],
  "filters": [],
  "time_constraint": null
}
```

**DuckDB SQL**:
```sql
SELECT COUNT(DISTINCT order_id) AS orders
FROM orders
```

### Example 3: Customer List

**LiquidConnect**: `Q .customers`

**Analytical Plan**:
```json
{
  "version": "0.1.0",
  "type": "entity_query",
  "entity": {"ref": "customers"},
  "dimensions": [],
  "filters": [],
  "time_constraint": null
}
```

**DuckDB SQL**:
```sql
SELECT customer_id, company_name, contact_name, country
FROM customers
```

---

## Error Cases (Stage 0)

| Input | Error Code | Message |
|-------|------------|---------|
| `@revenue` | E101 | Query must start with 'Q' |
| `Q @profit` | E201 | Unknown metric: 'profit' |
| `Q .products` | E202 | Unknown entity: 'products' |
| `Q revenue` | E102 | Expected '@' or '.' after 'Q' |

---

## Test Infrastructure

### Available Engines

| Engine | Port | Status | Use For |
|--------|------|--------|---------|
| PostgreSQL | 5433 | ✅ Running | Source data (Northwind) |
| DuckDB | embedded | ✅ Available | Primary dev/test emitter |
| Trino | 8084 | ⚠️ Stopped | Enterprise emitter |
| ClickHouse | 8123 | ✅ Running | OLAP emitter |
| MySQL | 3306 | ✅ Running | Cross-engine validation |
| StarRocks | 9030 | ✅ Running | Cross-engine validation |
| TimescaleDB | 5434 | ✅ Running | Time-series validation |

### Validation Flow

```
For each example:
  1. Parse LiquidConnect → AST
  2. Resolve → Analytical Plan
  3. For each emitter:
     a. Emit → SQL
     b. Execute → Results
  4. Compare all results
  5. If match → add to canon
  6. If mismatch → create finding
```

---

## Pivot Triggers

| Condition | Action |
|-----------|--------|
| Emitter divergence > 5% | Investigate dialect gaps |
| Cannot express pattern in IR | Extend Analytical Plan |
| Performance > 10x slower | Add optimization hints |
| LLM generation accuracy < 95% | Simplify syntax |

---

## Files

```
arenas/liquidconnect/
├── SEED.md                 # This file
├── semantic.yaml           # Northwind semantic layer
├── state.yaml              # Current evolution state
├── samples.jsonl           # Canon (proven examples)
├── findings.json           # Current findings
├── .context/
│   └── SUMMARY.md          # AI context summary
├── emitters/
│   ├── duckdb.md           # DuckDB emitter spec
│   ├── trino.md            # Trino emitter spec
│   └── interface.md        # Emitter interface contract
└── tests/
    ├── stage0/             # Stage 0 test cases
    └── parity/             # Cross-engine parity tests
```

---

## Next Steps

1. **Define semantic layer** for Northwind (metrics, entities, fields)
2. **Implement parser** for Stage 0 grammar
3. **Implement DuckDB emitter** (first backend)
4. **Implement Trino emitter** (second backend)
5. **Run parity tests** on Stage 0 examples
6. **Gate to Stage 1** when 100% parity achieved

---

*The journey to universal analytics begins with a single query.*
