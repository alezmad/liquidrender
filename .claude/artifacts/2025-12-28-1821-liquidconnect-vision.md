# LiquidConnect Vision

**Date:** 2025-12-28
**Status:** Crystallized
**Version:** 1.0

---

## The Problem

```
INTENT                           SQL
-----                           ----
Fuzzy                           Precise
Contextual                      Explicit
Ambiguous                       Deterministic
Human                           Machine

GAP: Where errors happen, where LLMs hallucinate
```

---

## The Core Insight

**Intent CAN be deterministic** if:

1. **Vocabulary is closed** - Only known terms allowed
2. **Grammar is constrained** - Simple, unambiguous syntax
3. **Context is explicit** - Timestamp, user, defaults provided

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   LiquidConnect IS deterministic intent.                        │
│                                                                 │
│   It's not "compressed SQL" — it's crystallized thought.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

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

## The Architecture Layers

### Layer 1: LiquidConnect Syntax (FIXED)

```
Q @metric #dimension ?filter ~time top:N ±sort vs period
```

| Sigil | Meaning | Example |
|-------|---------|---------|
| `Q` | Query marker | `Q @revenue` |
| `@` | Metric | `@revenue @orders` |
| `#` | Dimension | `#region #category` |
| `.` | Entity | `.customers .orders` |
| `?` | Filter | `?enterprise ?:status="active"` |
| `~` | Time | `~Q-1 ~30d ~YTD` |
| `top:` | Limit | `top:10` |
| `+-` | Sort | `-@revenue +#name` |
| `vs` | Compare | `~Q vs Q-1` |

### Layer 2: Vocabulary (PER BUSINESS)

```yaml
metrics:
  revenue: { entity: orders, expr: "SUM(amount)" }
  orders: { entity: orders, expr: "COUNT(*)" }
dimensions:
  region: { entity: customers, expr: "region" }
filters:
  enterprise: { expr: "segment = 'ENT'" }
```

---

## The Universal Process

**Don't build vocabularies per client. Build the PROCESS that generates them.**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   OLD: Schema → [ML/Evolution] → Vocabulary                     │
│        "Learn per client" (expensive, non-deterministic)        │
│                                                                 │
│   NEW: Schema → [Hard Rules] → Structure                        │
│        Structure + User → [Confirm] → Vocabulary                │
│        "Read schema, confirm semantics" (instant, deterministic)│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hard Rules (100% Certain)

These are **definitional truths**, not heuristics:

| Rule | Input | Output | Certainty |
|------|-------|--------|-----------|
| Table + PK + not junction → Entity | Schema | `.entity` | 100% |
| FK constraint → Relationship | Schema | `→` join | 100% |
| DECIMAL + amount/price/total → SUM metric | Type + name | `@metric` | 100% |
| INTEGER + is_pk → COUNT metric | Type + constraint | `@count` | 100% |
| VARCHAR + low cardinality → Dimension | Type + stats | `#dim` | 100% |
| DATE/TIMESTAMP → Time field | Type | `@time` | 100% |
| BOOLEAN → Filter | Type | `?filter` | 100% |

**90% of vocabulary extraction is READING, not LEARNING.**

---

## What Needs User Confirmation (~10%)

| Question | Why Uncertain | How to Resolve |
|----------|---------------|----------------|
| What to call this metric? | Preference | User renames |
| Which is primary time field? | Business logic | User picks |
| What threshold for "high value"? | Business rule | User sets |
| SUM or AVG this column? | Semantic meaning | User confirms |

**30 seconds of user input, not ML training.**

---

## Schema-Compiled Parser

**The schema defines a FINITE grammar.** A finite grammar can be parsed, not generated.

```
Schema with:                    Generates:
- 5 entities                    - Pattern templates
- 10 metrics                    - Slot fillers
- 8 dimensions                  - Synonym map
- 5 filters                     - LLM fallback prompt
```

**Query-time behavior:**

| Query Type | Approach | Latency | Cost |
|------------|----------|---------|------|
| 80% simple | Pattern match | <10ms | $0 |
| 15% synonyms | Lookup table | <20ms | $0 |
| 5% complex | LLM fallback | <500ms | $0.005 |

**20x cost reduction vs always-LLM.**

---

## The Product

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   The product is NOT LiquidConnect the language.                │
│                                                                 │
│   The product is the MACHINE that makes LiquidConnect           │
│   work for anyone in 5 minutes.                                 │
│                                                                 │
│   1. Connect database (30 sec)                                  │
│   2. Read schema → extract structure (automatic)                │
│   3. User confirms names (30 sec)                               │
│   4. System ready                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## LiquidGym's Role

**NOT:** Evolve vocabularies per client (expensive, non-deterministic)

**YES:**
1. Validate hard rules work across 7 diverse DB schemas
2. Find edge cases in extraction rules
3. Evolve pattern templates for NL→LC matching
4. Build synonym database
5. Optimize LLM fallback prompts

The 7 databases are **test cases**, not products.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Onboarding time | <5 minutes |
| Query accuracy | >95% (pattern match) |
| LLM usage | <20% of queries |
| Cost per query | <$0.001 average |
| Latency | <100ms average |

---

## Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   The schema already contains:                                  │
│     • What entities exist (tables with PKs)                     │
│     • How they relate (FKs)                                     │
│     • What's measurable (numeric columns)                       │
│     • What's categorical (low-cardinality strings)              │
│     • What's temporal (date columns)                            │
│                                                                 │
│   The only thing we can't read is MEANING.                      │
│   And meaning comes from the user, not from ML.                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
