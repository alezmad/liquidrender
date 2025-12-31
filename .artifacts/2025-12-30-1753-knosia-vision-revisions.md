# Knosia Vision Revisions

> **Purpose:** Critical improvements to transform the Knosia vision from ambitious concept to implementable, differentiated product.

---

## Executive Assessment

| Dimension | Current State | Target State |
|-----------|---------------|--------------|
| Vision quality | A- / A | Maintain |
| Execution risk | High | Manageable with scoping |
| Differentiator | Conversation | **Vocabulary (Semantic Layer)** |
| Positioning | "Data scientist you can't afford" | **"Your company's shared brain for data"** |

---

## 1. Strategic Repositioning

### Change the Hero Feature

**Current:** Conversation is the hero feature.

**Revised:** **Vocabulary (Semantic Layer) is the hero feature.** Conversation is the interface.

Why: If Knosia becomes where metric definitions live, churn drops dramatically. Conversation can be replicated; owning the semantic layer cannot.

### New Positioning Line

```
FROM: "The data scientist businesses can't afford, delivered as a conversation."

TO:   "Your company's shared brain for data."
```

Rationale: Shorter, broader, more durable. Emphasizes the institutional memory aspect.

### Update Executive Summary

Add vocabulary as a first-class pillar equal to conversation:

```markdown
### Three Pillars of Knosia

1. **Semantic Layer** — The single source of truth for metric definitions
2. **Conversational Interface** — Natural language access to your data
3. **Living Notebook** — Progressive analysis that grows as you explore
```

---

## 2. New Required Sections

### Section A: Semantic Catalog & Governance

**Add after Section 7 (Data Trust & Transparency)**

```markdown
## Semantic Catalog & Governance

### The Vocabulary Registry

Every metric is a first-class artifact with:

| Field | Purpose |
|-------|---------|
| Name | Human-readable identifier |
| Formula | SQL/calculation definition |
| Owner | Person responsible for accuracy |
| Grain | What level (daily, customer, transaction) |
| Includes/Excludes | What's in/out of the calculation |
| Dependencies | Other metrics/tables required |
| Version | Changelog tracking |
| Status | draft → review → approved → deprecated |

### Governance Workflow

```
Creator proposes metric
       ↓
Owner reviews definition
       ↓
Admin approves for org-wide use
       ↓
Change log records history
       ↓
All users see consistent definition
```

### Conflict Resolution

When two teams define the same metric differently:

1. Support **namespaces**: `Finance.MRR` vs `Product.MRR`
2. Designate one as **canonical** (org-wide default)
3. Show **definition diff** when comparing across boundaries
4. Auto-detect when metrics share name but differ in formula

### Definition Boundary Handling

When a metric definition changes mid-period:

┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Definition boundary detected                                │
│                                                                  │
│  "Active User" changed on Dec 1, 2024:                          │
│  • Before: "Logged in within 30 days"                           │
│  • After: "Performed key action in 30 days"                     │
│                                                                  │
│  Your query spans this boundary.                                │
│  [Show with old definition] [Show with new] [Split at boundary] │
└─────────────────────────────────────────────────────────────────┘
```

### Section B: Execution Model

**Add after Section 17 (Technical Specifications)**

```markdown
## Execution Model

### Performance Targets

| Block Type | p95 Latency Target | Strategy |
|------------|-------------------|----------|
| KPI (single metric) | <500ms | Cache + pre-aggregation |
| Grouped aggregate (bar/pie) | <1s | Semantic cache |
| Time series (line/area) | <1.5s | Incremental materialization |
| Top-N table | <2s | Limit + sample for preview |
| Drill-down table | <3s | Pagination + async load |
| Full data export | Async | Background job + notification |

### Caching Strategy

```
                    ┌─────────────────┐
User Query    ──────│  Semantic Cache │──── Cache hit → Instant
                    └────────┬────────┘
                             │ Miss
                             ▼
                    ┌─────────────────┐
                    │  Query Planner  │──── Check for reusable
                    └────────┬────────┘     prior results
                             │
                             ▼
                    ┌─────────────────┐
                    │  Result Cache   │──── Recent query results
                    └────────┬────────┘
                             │ Miss
                             ▼
                    ┌─────────────────┐
                    │  Pre-aggregates │──── Materialized views
                    └────────┬────────┘
                             │ Miss
                             ▼
                    ┌─────────────────┐
                    │  Live Query     │──── Execute against source
                    └─────────────────┘
```

### Prior-Result Reuse

For follow-up queries, reuse intermediate results:

```
User: "Show me revenue by region"
→ Execute query, cache result set as session_abc_step_1

User: "Now filter to North America"
→ Filter session_abc_step_1, don't re-query source

User: "Break down by product"
→ Join session_abc_step_1 with product dimension
```

### Cost Controls

| Control | Implementation |
|---------|----------------|
| Row limits | Hard cap per block (10K rows), prompt to aggregate |
| Query timeout | 30s default, user can extend for known-slow queries |
| Concurrent queries | 3 per user, queue additional |
| Cost warnings | Show estimated cost before expensive queries |
| Daily budget | Optional per-workspace spending limit |
```

### Section C: Quality & Evaluation

**Add after Execution Model**

```markdown
## Quality & Evaluation

### Confidence Framework

Confidence is not vibes. It's computed from:

| Source | Weight | Description |
|--------|--------|-------------|
| Data completeness | 25% | % of expected rows present |
| Join ambiguity | 20% | Single vs multiple join paths |
| Freshness | 15% | Time since last sync |
| Sample size | 15% | Statistical significance |
| Schema match | 15% | How well query maps to schema |
| Model uncertainty | 10% | LLM's self-reported confidence |

### Confidence Thresholds

| Level | Bar | Display |
|-------|-----|---------|
| High | ≥85% | Solid bar, no disclaimer |
| Medium | 60-84% | Partial bar, "Based on available data" |
| Low | 40-59% | Dashed bar, "Estimated" |
| Very Low | <40% | Warning, "May be unreliable" |

### "Exact" vs "Estimated" Triggers

**Exact** when:
- Query hits pre-aggregated tables
- All joins are unambiguous
- Data is <24h old
- 100% of expected rows present

**Estimated** when:
- Any join has multiple valid paths
- Data is >7 days old
- Missing >5% of expected rows
- Prediction or extrapolation involved

### Evaluation Harness

```
┌─────────────────────────────────────────────────────────────────┐
│  TEST SUITE                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Golden Queries (50+ hand-verified):                            │
│  • "What's our MRR?" → Expected: $X from Stripe                 │
│  • "Show churn by segment" → Expected: matches Finance report   │
│                                                                  │
│  Metric Parity Tests:                                           │
│  • Compare Knosia output to source-of-truth systems             │
│  • Flag deviations >1%                                          │
│                                                                  │
│  DSL Regression Suite:                                          │
│  • Known queries produce valid DSL                              │
│  • DSL renders without error                                    │
│  • Visual output matches baseline screenshots                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
```

### Section D: Security & Compliance

**Add after Quality & Evaluation**

```markdown
## Security & Compliance

### Data Access Model

```
┌─────────────────────────────────────────────────────────────────┐
│  PERMISSION ENFORCEMENT POINT                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Request                                                    │
│        ↓                                                         │
│  ┌─────────────────┐                                            │
│  │  Knosia Proxy   │ ← Enforces row/column policies             │
│  └────────┬────────┘   BEFORE query reaches warehouse           │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Query Rewriter │ ← Adds WHERE clauses for row-level         │
│  └────────┬────────┘   Removes columns user can't see           │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Warehouse      │ ← May have additional policies             │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Role-Based Intelligence vs Access

| Concern | Role-Based Intelligence | Role-Based Access |
|---------|------------------------|-------------------|
| Purpose | Show relevant content | Prevent unauthorized access |
| Mechanism | Default filters, suggested queries | Query rewriting, column masking |
| Override | User can ask for more | Cannot bypass |
| Example | CEO sees company-wide by default | Salary data masked for non-HR |

**Critical:** LLM must never infer restricted data from aggregates. If Sales can't see salary, Knosia must not calculate revenue-per-employee that would reveal it.

### Audit Requirements

| Event | Logged Fields |
|-------|---------------|
| Query executed | user, query, timestamp, duration, rows returned |
| Data exported | user, format, row count, destination |
| Definition changed | user, metric, old value, new value |
| Permission granted | grantor, grantee, scope |
| Alert triggered | alert type, condition, recipients |

### Data Retention

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Query results | 24h cache | Performance |
| Session history | 90 days | User experience |
| Audit logs | 1 year | Compliance |
| Metric definitions | Forever | Institutional memory |
| Deleted views | 30 days | Recovery |
```

---

## 3. Scope Reduction: The V1 Boundary

### Brutal V1 Definition

**V1 = "Replace the weekly exec BI ritual with a conversational notebook that is correct and traceable."**

```
V1 =  Connect  →  Converse  →  Define  →  Save  →  Share
         ↑           ↑           ↑         ↑         ↑
      Postgres    Notebook    Vocabulary  Snapshot   Link
      + Stripe    + Blocks    Registry    + Living   Permission-
                                          View       aware
```

### V1 Explicit Inclusions

| Feature | Scope |
|---------|-------|
| Connectors | Postgres + Stripe |
| Blocks | ~20 components (see below) |
| Vocabulary | Metric definitions + owners + versioning + changelog |
| Trust layer | Lineage, assumptions, freshness on every block |
| Save modes | Snapshot vs Living View |
| Sharing | Permission-aware link sharing |
| Follow-ups | Time window, dimension breakdown, filtering only |
| Roles | CEO, Sales, Finance (3 templates) |

### V1 MVP Block Set (~20 instead of 77)

| Category | Blocks |
|----------|--------|
| KPIs | `kpi-card`, `delta-summary` |
| Charts | `line-chart`, `bar-chart`, `area-chart`, `pie-chart` |
| Tables | `data-table`, `list` |
| Comparison | `comparison-table` |
| Layout | `container`, `grid`, `card`, `stack` |
| Feedback | `alert`, `spinner`, `empty` |
| Text | `heading`, `text`, `annotation` |
| Input | `button` (for actions) |

### V1 Explicit Exclusions (Defer to V2+)

| Feature | Why Defer |
|---------|-----------|
| Voice-first | Nice-to-have, adds complexity |
| Real-time collaboration | Complex state sync |
| Embedding | Requires stable API surface |
| Advanced scenario math | Needs reliable base metrics first |
| Anomaly memory | Requires feature store, time-series baselines |
| Narrative generation | Needs trust/explainability first |
| Forecasting/prediction | High risk of wrong answers |
| Slack bot | Integration overhead |
| Meeting mode | Polish feature |
| Mobile-optimized | Can work in responsive mode |

---

## 4. Architecture Clarifications

### LiquidDSL Contract

**Add to Technical Specifications:**

```typescript
// DSL Version (for backward compatibility)
interface LiquidDSL {
  version: "1.0";
  type: BlockType;
  // ... rest of schema
}

// Validation rules
const DSL_VALIDATION = {
  maxDepth: 5,           // No infinitely nested components
  maxBlocks: 50,         // Per session/view
  requiredFields: ['type', 'version'],
  allowedTypes: MVP_BLOCK_SET,
};

// Safety: Components declare allowed data shapes
interface BlockManifest {
  type: string;
  requiredData: ZodSchema;
  optionalData?: ZodSchema;
  maxRows?: number;
}
```

### AI → DSL → Render Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  DETERMINISTIC RENDERING GUARANTEE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Query                                                      │
│       ↓                                                          │
│  ┌─────────────────┐                                            │
│  │  LLM Proposes   │ ← Probabilistic (may have errors)          │
│  │  DSL            │                                            │
│  └────────┬────────┘                                            │
│           ↓                                                      │
│  ┌─────────────────┐                                            │
│  │  DSL Validator  │ ← Deterministic checkpoint                 │
│  │  + Repair       │   - Validates against schema               │
│  └────────┬────────┘   - Repairs common errors                  │
│           ↓            - Rejects invalid DSL                    │
│  ┌─────────────────┐                                            │
│  │  LiquidRender   │ ← Deterministic rendering                  │
│  └────────┬────────┘   - Always produces same output            │
│           ↓            - Never crashes on valid DSL             │
│  ┌─────────────────┐                                            │
│  │  Canvas UI      │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Risk Mitigations

### Risk 1: Hallucinated SQL/Joins

**Mitigation:**

```
┌─────────────────────────────────────────────────────────────────┐
│  SEMANTIC GRAPH ENFORCEMENT                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Maintain explicit join graph:                               │
│     customers --[1:N]--> orders --[1:N]--> line_items           │
│                                                                  │
│  2. Only allow declared join paths                              │
│                                                                  │
│  3. Always surface grain in output:                             │
│     "Revenue by region, monthly, based on invoices,             │
│      excluding refunds"                                          │
│                                                                  │
│  4. Query plan preview for ambiguous queries:                   │
│     "I'll join customers → orders → products.                   │
│      This gives one row per order line item.                    │
│      Is that the grain you want?"                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Risk 2: Definition Drift/Politics

**Mitigation:**

```
┌─────────────────────────────────────────────────────────────────┐
│  VOCABULARY GOVERNANCE                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Require owners + approval for org-wide changes              │
│                                                                  │
│  2. Support namespaces:                                         │
│     Finance.MRR vs Product.MRR vs Canonical.MRR                 │
│                                                                  │
│  3. Auto-detect conflicts:                                      │
│     "Two metrics named 'Active Users' with different formulas.  │
│      Finance: logged in 30d                                     │
│      Product: performed action 30d                              │
│      Want to reconcile?"                                        │
│                                                                  │
│  4. Changelog everything:                                       │
│     Who changed what, when, why                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Risk 3: Trust Collapse from One Bad Answer

**Mitigation:**

```
┌─────────────────────────────────────────────────────────────────┐
│  CONSERVATIVE DEFAULTS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Default to "I can answer X but not Y" over guessing         │
│                                                                  │
│  2. Always provide escape hatches:                              │
│     [Show raw sample]  [View SQL]  [Reproduce in warehouse]     │
│                                                                  │
│  3. Data health banner when issues detected:                    │
│     "⚠️ Data may be incomplete: Stripe sync failed 2h ago"       │
│                                                                  │
│  4. Confidence is visible, not hidden                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Risk 4: Performance Death Spiral

**Mitigation:**

```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTION GUARDRAILS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Prior-result reuse (materialize intermediate tables)        │
│                                                                  │
│  2. Hard row limits per block:                                  │
│     >10K rows → "This is a lot of data. Want to:                │
│                  [Aggregate] [Sample] [Export async]"           │
│                                                                  │
│  3. Query cost warnings before execution                        │
│                                                                  │
│  4. Async for heavy operations with progress indicator          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Roadmap Revision

### Revised Phase Plan (8 weeks, not 12)

| Phase | Weeks | Focus | Deliverable |
|-------|-------|-------|-------------|
| 1 | 1-2 | **Foundation + Vocabulary** | Shell + Canvas + Semantic Catalog MVP |
| 2 | 3-4 | **Notebook + Trust** | Blocks, sessions, lineage, assumptions |
| 3 | 5-6 | **Intelligence (Conservative)** | Delta briefing, follow-ups, smart clarification |
| 4 | 7-8 | **Save + Share** | Snapshot/Living, permission-aware sharing |

**Key change:** Vocabulary moves to Phase 1 (not Phase 3+). Trust primitives move to Phase 2 (not Phase 6).

### Week-by-Week Detail

**Phase 1: Foundation + Vocabulary (Weeks 1-2)**

```
Week 1:
- KnosiaShell, Sidebar, Canvas components
- Floating PromptInput
- Basic DSL → LiquidRender flow
- Vocabulary registry schema + API

Week 2:
- Metric definition CRUD
- Owner assignment
- Basic changelog
- Vocabulary hover cards in UI
```

**Phase 2: Notebook + Trust (Weeks 3-4)**

```
Week 3:
- Block append/remove logic
- Session auto-save (localStorage + API)
- Block menu (save, pin, export)
- Lineage display per block

Week 4:
- Assumptions surfacing
- Data freshness indicator
- Confidence bar (basic version)
- Session list in sidebar
```

**Phase 3: Intelligence — Conservative (Weeks 5-6)**

```
Week 5:
- Delta-first briefing
- Follow-up detection (time, dimension, filter)
- Smart clarification (assume + offer)

Week 6:
- Role templates (CEO, Sales, Finance)
- Suggested questions
- Definition boundary warnings
```

**Phase 4: Save + Share (Weeks 7-8)**

```
Week 7:
- Snapshot vs Living View save
- Views list in sidebar
- Permission-aware sharing preview

Week 8:
- Share link generation
- Export (PDF, PNG)
- Audit log (basic)
- Polish + bug fixes
```

---

## 7. Questions to Answer Before Building

### Semantic Source

> **Q:** What is the canonical semantic source: dbt metrics? Knosia's own registry? Both?

**Recommended answer:** Knosia's own registry as primary, with optional dbt import for teams already using it.

### Core Entities

> **Q:** What is the minimum set of entities you model?

**Recommended:** Start with SaaS basics:
- Customer
- Subscription
- Invoice
- Payment
- Plan/Product

### Identity Resolution

> **Q:** How do you handle multi-source identity resolution (Stripe customer <-> internal account)?

**Recommended:** V1 uses explicit foreign key mappings configured during connection setup. V2+ adds fuzzy matching.

### Permission Enforcement Point

> **Q:** Where do you enforce permissions: warehouse policies, Knosia proxy, or both?

**Recommended:** Knosia proxy (query rewriting) as primary. Warehouse policies as defense-in-depth.

### Latency Targets

> **Q:** What's the p95 latency target for each block type?

**Recommended:** See Execution Model section above.

---

## 8. Success Metrics

### V1 Launch Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Golden query accuracy | >95% | Match Finance-verified numbers |
| p95 KPI latency | <500ms | Application metrics |
| p95 chart latency | <2s | Application metrics |
| Session save reliability | >99.9% | No data loss |
| User can define metric | <2 min | User testing |
| First value time | <60s | Onboarding analytics |

### 30-Day Post-Launch

| Metric | Target | Why |
|--------|--------|-----|
| DAU/MAU | >40% | Stickiness |
| Avg sessions/user/week | >5 | Habit formation |
| Metrics defined per workspace | >10 | Vocabulary adoption |
| Share links created | >1/user | Collaboration |
| Churn | <5% | Product-market fit signal |

---

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-30 | Initial revision recommendations |

---

*This document should be used alongside the main Knosia Complete Vision to guide implementation priorities and architectural decisions.*
