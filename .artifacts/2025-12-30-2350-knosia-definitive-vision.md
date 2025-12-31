# Knosia: Definitive Product Vision

> **Your company's shared brain for data.**

---

## Executive Summary

### The Problem Worth Solving

Every company has data. Every company has BI tools. Nobody has solved the **vocabulary problem**.

"Active Users" means different things to Engineering, Product, Sales, and the CEO. "MRR" gets calculated three different ways. "Churn" is a political battlefield. This semantic chaos costs companies millions in miscommunication, wrong decisions, and eroded trust in data.

### The Solution

Knosia becomes the company's **semantic layer** — the single source of truth for what metrics mean, who owns them, and how they're calculated. The conversational interface isn't the product; it's the delivery mechanism for institutional data knowledge.

### Three Pillars

```
┌─────────────────────────────────────────────────────────────────┐
│                     KNOSIA = THREE PILLARS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SEMANTIC LAYER              The single source of truth       │
│     - Metric definitions         for what your data means        │
│     - Ownership & governance                                     │
│     - Version history                                            │
│                                                                  │
│  2. CONVERSATIONAL INTERFACE    Natural language access          │
│     - Ask, don't query           to your data                    │
│     - Follow-up context                                          │
│     - Smart clarification                                        │
│                                                                  │
│  3. LIVING NOTEBOOK             Progressive analysis that        │
│     - Blocks grow as you ask     grows as you explore            │
│     - Snapshot vs Live views                                     │
│     - Shareable & traceable                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Wins

| Competitor Approach | Knosia Approach |
|---------------------|-----------------|
| Build better dashboards | Own where definitions live |
| Add AI chat to BI tools | AI that speaks your vocabulary |
| Role-based permissions | Role-based intelligence |
| Query builders | Conversation with memory |

**Lock-in mechanism:** If Knosia is where metric definitions live, switching costs become prohibitive. Conversation can be replicated; semantic layer cannot.

---

## Market Positioning

### Target Customer

**Primary:** Series A-C SaaS companies (50-500 employees)
- Have data, lack data team
- Executives asking "why doesn't anyone agree on the numbers?"
- Growing fast enough that tribal knowledge is failing

**Secondary:** Data teams at larger companies
- Want to democratize access without losing control
- Need governance without bureaucracy

### Wedge: The 60-Second Briefing

Get value before asking questions:

```
Connect database → 60 seconds → Personalized briefing

"Good morning, Alex. Revenue is up 12% this month.
 One thing to watch: APAC churn spiked 23% yesterday.

 What would you like to explore?"
```

### Pricing Intuition (Validate Later)

| Tier | Price | For |
|------|-------|-----|
| Starter | $99/mo | Solo founders, small teams |
| Team | $499/mo | 5-20 users, 2 connections |
| Business | $1,499/mo | Unlimited users, governance |
| Enterprise | Custom | SSO, audit logs, SLAs |

---

## V1 Scope: Brutal Clarity

### The V1 Promise

**"Replace the weekly exec BI ritual with a conversational notebook that is correct and traceable."**

```
V1 = Connect → Converse → Define → Save → Share
       ↑          ↑          ↑        ↑       ↑
    Postgres   Notebook   Vocabulary  View   Link
    + Stripe   + Blocks   Registry   (Snap   Permission-
                                     /Live)  aware
```

### V1 Explicit Inclusions

| Feature | Scope |
|---------|-------|
| **Connectors** | PostgreSQL + Stripe |
| **Blocks** | 18 components (see below) |
| **Vocabulary** | Metric definitions + owners + versions |
| **Trust layer** | Lineage, assumptions, freshness on every block |
| **Save modes** | Snapshot (frozen) vs Living View (refreshes) |
| **Sharing** | Permission-aware link sharing |
| **Follow-ups** | Time window, dimension breakdown, filtering |
| **Roles** | CEO, Sales, Finance (3 templates) |

### V1 Block Set (18 Components)

| Category | Blocks | Purpose |
|----------|--------|---------|
| **KPIs** | `kpi-card`, `delta-summary` | Single metrics with change |
| **Charts** | `line-chart`, `bar-chart`, `area-chart`, `pie-chart` | Time series, comparisons |
| **Tables** | `data-table`, `list` | Detail views |
| **Layout** | `container`, `grid`, `card`, `stack` | Composition |
| **Feedback** | `alert`, `spinner`, `empty`, `skeleton` | States |
| **Text** | `heading`, `text` | Labels, explanations |

### V1 Explicit Exclusions

| Feature | Why Defer | When |
|---------|-----------|------|
| Voice-first | Nice-to-have, adds complexity | V2 |
| Real-time collaboration | Complex state sync | V3 |
| Embedding | Requires stable API surface | V2 |
| Forecasting/prediction | High risk of wrong answers | V3 |
| Anomaly memory | Needs time-series baselines | V2 |
| Slack bot | Integration overhead | V2 |
| Additional connectors | Focus on depth, not breadth | V2+ |

---

## Architecture

### Shell + Liquid Paradigm

```
┌─────────────────────────────────────────────────────────────────┐
│                     KNOSIA = SHELL + LIQUID                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SHELL (React, fixed):              LIQUID (DSL, AI-generated): │
│  ┌──────────────────┐               ┌──────────────────────┐    │
│  │ • Auth wrapper   │               │ • Briefing layout    │    │
│  │ • Prompt input   │   renders →   │ • KPIs, charts       │    │
│  │ • Canvas frame   │               │ • Tables, cards      │    │
│  │ • Sidebar        │               │ • Any of 18 blocks   │    │
│  │ • Context bar    │               │ • Annotations        │    │
│  └──────────────────┘               └──────────────────────┘    │
│                                                                  │
│  User: "Make that a bar chart"  →  DSL updates  →  Instant      │
│  User: "Add revenue by region"  →  New block    →  <2 seconds   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The Data Flow

```
User Input (text)
       │
       ▼
┌──────────────────┐
│   AI + Context   │ ← Vocabulary, Schema, Role, History
│   (generates)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  DSL Validator   │ ← Deterministic checkpoint
│  + Repair        │   Validates schema, repairs errors
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  LiquidRender    │ ← Deterministic rendering
│  (18 components) │   Always same output for same DSL
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Canvas UI      │ ← User sees visualization
└──────────────────┘
```

### Interface Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [⚙️]                                              Context Bar   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SIDEBAR (240px)      │           CANVAS                         │
│  ┌─────────────────┐  │                                         │
│  │ 📌 Saved Views  │  │   ┌─────────────────────────────────┐   │
│  │    Weekly Rev   │  │   │                                 │   │
│  │    Sales Pipe   │  │   │    Blocks grow progressively    │   │
│  │    + New View   │  │   │    as user asks questions       │   │
│  ├─────────────────┤  │   │                                 │   │
│  │ 💡 Suggested    │  │   │    Jupyter-style notebook       │   │
│  │    (max 1)      │  │   │    experience                   │   │
│  ├─────────────────┤  │   │                                 │   │
│  │ 💬 Sessions     │  │   │                                 │   │
│  │    Today        │  │   └─────────────────────────────────┘   │
│  │    Dec 28       │  │                                         │
│  └─────────────────┘  │                                         │
│                       │                                         │
├───────────────────────┴─────────────────────────────────────────┤
│ [👤]  │  ✨ Ask anything...                            [Send]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Semantic Catalog: The Differentiator

### The Vocabulary Registry

Every metric is a first-class artifact:

| Field | Purpose | Example |
|-------|---------|---------|
| **Name** | Human identifier | Monthly Recurring Revenue |
| **Formula** | SQL/calculation | `SUM(subscriptions.amount) WHERE status = 'active'` |
| **Owner** | Accountable person | Finance Team |
| **Grain** | What level | Monthly, by customer |
| **Includes** | What's in | Active subscriptions |
| **Excludes** | What's out | Trials, refunds, taxes |
| **Version** | Change history | v3.1 (Dec 2024) |
| **Status** | Lifecycle state | `approved` |

### How It Works in Practice

```
┌─────────────────────────────────────────────────────────────────┐
│  MRR: $1.2M  ⓘ                                                  │
│              │                                                   │
│              ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Monthly Recurring Revenue (v3.1)                    │        │
│  │                                                      │        │
│  │  Formula:                                            │        │
│  │  = SUM(plan_amount × quantity)                       │        │
│  │  WHERE subscription.status = 'active'                │        │
│  │                                                      │        │
│  │  Excludes: Trials, refunds, taxes                    │        │
│  │  Owner: @finance-team                                │        │
│  │  Last updated: Dec 1, 2024 by Sarah                  │        │
│  │                                                      │        │
│  │  [View history] [Suggest change]                     │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Governance Workflow

```
User proposes metric
       ↓
Owner reviews definition
       ↓
Admin approves for org-wide use
       ↓
Changelog records: who, what, when, why
       ↓
All users see consistent definition
```

### Conflict Detection

When two teams define the same metric differently:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Definition conflict detected                                │
│                                                                  │
│  "Active User" has 2 definitions:                               │
│                                                                  │
│  Finance.ActiveUser:                                            │
│  "Logged in within 30 days"                                     │
│                                                                  │
│  Product.ActiveUser:                                            │
│  "Performed key action in 30 days"                              │
│                                                                  │
│  Difference: Product excludes login-only users                  │
│  Impact: Product count is 12% lower                             │
│                                                                  │
│  [Use Finance] [Use Product] [Create canonical version]         │
└─────────────────────────────────────────────────────────────────┘
```

### Definition Boundary Handling

When a metric definition changed mid-period:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Definition boundary detected                                │
│                                                                  │
│  "Active User" changed on Dec 1, 2024:                          │
│  • Before: "Logged in within 30 days"                           │
│  • After: "Performed key action in 30 days"                     │
│                                                                  │
│  Your query spans this boundary.                                │
│                                                                  │
│  [Show with old] [Show with new] [Split at boundary]            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Trust: Non-Negotiable

### Every Number Has Lineage

```
User: "Where does this MRR number come from?"

┌─────────────────────────────────────────────────────────────────┐
│  MRR: $1,247,832                                                │
│                                                                  │
│  📍 Lineage:                                                    │
│                                                                  │
│  Stripe.subscriptions                                           │
│       ↓ filter: status = 'active'                               │
│       ↓ join: customers (for currency)                          │
│       ↓ sum: plan_amount × quantity                             │
│       ↓ convert: USD (rate from Dec 28)                         │
│  = $1,247,832                                                   │
│                                                                  │
│  [View SQL] [View sample data]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Assumptions Are Visible

```
┌─────────────────────────────────────────────────────────────────┐
│  Revenue YTD: $4.2M                                             │
│                                                                  │
│  📋 Assumptions:                                                │
│  • Currency: All converted to USD (today's rate)                │
│  • Date range: Jan 1 - Dec 28, 2024                             │
│  • Includes: Subscriptions + one-time                           │
│  • Excludes: Refunds, chargebacks, taxes                        │
│                                                                  │
│  [Change assumptions]                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Confidence Framework

Confidence is computed, not vibes:

| Source | Weight | Description |
|--------|--------|-------------|
| Data completeness | 25% | % of expected rows present |
| Join ambiguity | 20% | Single vs multiple join paths |
| Freshness | 15% | Time since last sync |
| Sample size | 15% | Statistical significance |
| Schema match | 15% | How well query maps to schema |
| Model uncertainty | 10% | LLM's self-reported confidence |

**Display thresholds:**

| Level | Bar | Display |
|-------|-----|---------|
| High | ≥85% | Solid bar, no disclaimer |
| Medium | 60-84% | Partial bar, "Based on available data" |
| Low | 40-59% | Dashed bar, "Estimated" |
| Very Low | <40% | Warning, "May be unreliable" |

### Data Freshness (Context Bar)

```
┌─────────────────────────────────────────────────────────────────┐
│  Data as of: Dec 28, 2:30 PM  •  Postgres: Live                 │
│                               •  Stripe: 5 min ago              │
│                               •  HubSpot: 2 hours ago ⚠️        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conversation System

### Follow-Up Detection

```
User: "Show me revenue"              → Fresh query
                                       AI shows revenue KPI

User: "Break that by region"         → Follow-up detected
                                       "that" = revenue from last turn

User: "Focus on North America"       → Follow-up detected
                                       AI filters to NA

User: "Now show me churn"            → Fresh query detected
                                       New topic, clears context
```

### Smart Clarification: Assume + Offer

Don't block. Assume the most likely answer and offer alternatives:

```
❌ BAD (blocking):
"Did you mean: (A) Revenue (B) Units sold (C) Team performance?"

✅ GOOD (assume + offer):
┌─────────────────────────────────────────────────────────────────┐
│  Revenue: $1.2M (+12% this month)                               │
│  [chart]                                                        │
│                                                                  │
│  Showing revenue. Did you mean something else?                  │
│  [Units sold] [Team performance] [This is right ✓]              │
└─────────────────────────────────────────────────────────────────┘
```

### Drill-Down Breadcrumbs

Never lose your analysis path:

```
Revenue → by Region → North America → by Product → Enterprise
   ↑          ↑            ↑              ↑            ↑
[click]    [click]      [click]        [click]     [current]
```

---

## Personalization

### Role-Aware Intelligence

Same data, different presentation:

```
CEO VIEW:                              SALES VIEW:
┌────────────────────────────┐         ┌────────────────────────────┐
│ Good morning, Alex         │         │ Good morning, Sarah        │
│                            │         │                            │
│ Company Performance        │         │ Your Pipeline              │
│ • Revenue: $1.2M (+12%)    │         │ • Quota: $200K / $180K     │
│ • Runway: 18 months        │         │ • Closing this week: 3     │
│ • Key risk: APAC churn     │         │ • At risk: Acme Corp       │
└────────────────────────────┘         └────────────────────────────┘
```

### Time-Aware Defaults

```
MORNING (8 AM):
"Good morning, Alex. Here's what happened overnight..."

END OF DAY (5 PM):
"Wrapping up. Today's summary: Revenue $87K (best Tuesday this quarter)..."

MONDAY MORNING:
"Week ahead. Last week: $412K revenue. This week: 3 renewal calls..."
```

### Goal Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│  Q4 Revenue Goal: $5M                                           │
│  ████████████░░░░░░░░ 62% ($3.1M)                               │
│                                                                  │
│  ⏱️ 23 days remaining                                           │
│  📈 Need $82K/day to hit goal (currently $71K/day)              │
│                                                                  │
│  "At current pace, you'll finish at $4.7M (94%)"                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Execution Model

### Performance Targets

| Block Type | p95 Target | Strategy |
|------------|------------|----------|
| KPI (single metric) | <500ms | Cache + pre-aggregation |
| Grouped aggregate | <1s | Semantic cache |
| Time series | <1.5s | Incremental materialization |
| Top-N table | <2s | Limit + sample for preview |
| Drill-down table | <3s | Pagination + async load |
| Full export | Async | Background job + notification |

### Caching Strategy

```
                    ┌─────────────────┐
User Query    ──────│  Semantic Cache │──── Cache hit → Instant
                    └────────┬────────┘
                             │ Miss
                             ▼
                    ┌─────────────────┐
                    │  Result Cache   │──── Recent query results
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
→ Execute query, cache as session_step_1

User: "Now filter to North America"
→ Filter session_step_1, don't re-query source

User: "Break down by product"
→ Join session_step_1 with product dimension
```

### Cost Controls

| Control | Implementation |
|---------|----------------|
| Row limits | 10K rows per block, prompt to aggregate |
| Query timeout | 30s default |
| Concurrent queries | 3 per user, queue additional |
| Cost warnings | Show estimated cost before expensive queries |

---

## Security & Permissions

### Permission Enforcement Point

```
User Request
       ↓
┌─────────────────┐
│  Knosia Proxy   │ ← Enforces row/column policies
└────────┬────────┘   BEFORE query reaches warehouse
         │
         ▼
┌─────────────────┐
│  Query Rewriter │ ← Adds WHERE clauses for row-level
└────────┬────────┘   Removes columns user can't see
         │
         ▼
┌─────────────────┐
│  Warehouse      │
└─────────────────┘
```

### Role-Based Intelligence vs Access

| Concern | Role-Based Intelligence | Role-Based Access |
|---------|------------------------|-------------------|
| Purpose | Show relevant content | Prevent unauthorized access |
| Mechanism | Default filters, suggestions | Query rewriting, masking |
| Override | User can ask for more | Cannot bypass |
| Example | CEO sees company-wide default | Salary masked for non-HR |

### Audit Requirements

| Event | Logged |
|-------|--------|
| Query executed | user, query, timestamp, duration, rows |
| Data exported | user, format, row count |
| Definition changed | user, metric, old → new |
| Permission granted | grantor, grantee, scope |

---

## Implementation Roadmap (8 Weeks)

### Phase 1: Foundation + Vocabulary (Weeks 1-2)

**Goal:** Shell + Canvas + Semantic Catalog MVP

| Task | Priority |
|------|----------|
| KnosiaShell, Sidebar, Canvas components | P0 |
| Floating PromptInput | P0 |
| DSL → LiquidRender flow | P0 |
| Vocabulary registry schema + API | P0 |
| Metric definition CRUD | P0 |
| Owner assignment + basic changelog | P1 |
| Vocabulary hover cards | P1 |

**Deliverable:** Users can ask questions, see visualizations, and view metric definitions.

### Phase 2: Notebook + Trust (Weeks 3-4)

**Goal:** Progressive blocks + transparency

| Task | Priority |
|------|----------|
| Block append/remove logic | P0 |
| Session auto-save (localStorage + API) | P0 |
| Block menu (save, pin, export) | P0 |
| Lineage display per block | P0 |
| Assumptions surfacing | P1 |
| Data freshness indicator (context bar) | P1 |
| Confidence bar | P1 |
| Session list in sidebar | P1 |

**Deliverable:** Full notebook experience with trust indicators.

### Phase 3: Intelligence (Weeks 5-6)

**Goal:** Smart, conservative features

| Task | Priority |
|------|----------|
| Delta-first briefing | P0 |
| Follow-up detection | P0 |
| Smart clarification (assume + offer) | P0 |
| Role templates (CEO, Sales, Finance) | P1 |
| Suggested questions | P1 |
| Definition boundary warnings | P1 |
| Goal tracking | P2 |

**Deliverable:** Knosia feels intelligent and personalized.

### Phase 4: Save + Share (Weeks 7-8)

**Goal:** Persistence and collaboration

| Task | Priority |
|------|----------|
| Snapshot vs Living View save | P0 |
| Views list in sidebar | P0 |
| Permission-aware sharing | P0 |
| Share link generation | P0 |
| Export (PDF, PNG) | P1 |
| Basic audit log | P1 |
| Polish + bug fixes | P0 |

**Deliverable:** Production-ready V1.

---

## Success Metrics

### V1 Launch Criteria

| Metric | Target |
|--------|--------|
| Golden query accuracy | >95% match Finance-verified numbers |
| p95 KPI latency | <500ms |
| p95 chart latency | <2s |
| Session save reliability | >99.9% |
| First value time | <60 seconds from connect |
| User can define metric | <2 minutes |

### 30-Day Post-Launch

| Metric | Target | Why |
|--------|--------|-----|
| DAU/MAU | >40% | Stickiness |
| Sessions/user/week | >5 | Habit formation |
| Metrics defined/workspace | >10 | Vocabulary adoption |
| Share links created | >1/user | Collaboration |
| Churn | <5% | Product-market fit |

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Hero feature** | Semantic Layer | Lock-in > chat (replicable) |
| **V1 Connectors** | Postgres + Stripe | Depth > breadth |
| **V1 Blocks** | 18 components | Focus on quality |
| **V1 Timeline** | 8 weeks | Ship fast, iterate |
| **Clarification style** | Assume + offer | Never block user |
| **Confidence** | Computed, visible | Trust through transparency |
| **Permissions** | Knosia proxy | Single enforcement point |
| **Caching** | Semantic + result | <500ms for KPIs |
| **Voice input** | V2 | Focus on core first |
| **Real-time collab** | V3 | Complex, not MVP |

---

## What V2+ Looks Like

| Version | Focus |
|---------|-------|
| **V2** | Voice input, Slack bot, MySQL/BigQuery, Anomaly detection |
| **V3** | Real-time collaboration, Embedding, Prediction/forecasting |
| **V4** | Vocabulary governance (PR workflows), Custom alerting rules |
| **V5** | Proactive insights, Meeting mode, Cross-org vocabulary sharing |

---

## Appendix: Technical Architecture

### Component Structure

```
apps/web/src/modules/knosia/
├── components/
│   ├── layout/
│   │   ├── shell.tsx           # Main wrapper
│   │   ├── sidebar.tsx         # Left sidebar
│   │   ├── canvas.tsx          # Main content area
│   │   └── context-bar.tsx     # Data freshness
│   │
│   ├── input/
│   │   └── prompt-input.tsx    # Floating text input
│   │
│   ├── canvas/
│   │   ├── liquid-zone.tsx     # LiquidRender container
│   │   ├── block.tsx           # Single block wrapper
│   │   ├── block-menu.tsx      # Block actions
│   │   └── breadcrumbs.tsx     # Navigation trail
│   │
│   ├── sidebar/
│   │   ├── saved-views.tsx     # Pinned views
│   │   ├── suggestions.tsx     # AI nudges (max 1)
│   │   └── sessions.tsx        # Conversation history
│   │
│   ├── vocabulary/
│   │   ├── definition-card.tsx # Metric hover card
│   │   └── definition-form.tsx # Create/edit metric
│   │
│   └── trust/
│       ├── lineage.tsx         # Data lineage display
│       ├── assumptions.tsx     # Assumptions list
│       └── confidence.tsx      # Confidence bar
│
├── hooks/
│   ├── use-knosia-session.ts   # Session state
│   ├── use-notebook.ts         # Block management
│   └── use-vocabulary.ts       # Metric definitions
│
└── types.ts                    # TypeScript definitions
```

### Database Schema (Knosia-specific additions)

```sql
-- Vocabulary (the differentiator)
knosia_vocabulary_item (
  id, workspace_id, name, formula, owner_id,
  grain, includes, excludes, status, version
)

knosia_vocabulary_version (
  id, item_id, version, changed_by, changed_at,
  old_value, new_value, reason
)

-- Sessions & Views
knosia_session (
  id, workspace_id, user_id, created_at,
  is_starred, is_archived
)

knosia_view (
  id, workspace_id, user_id, name,
  type, -- 'snapshot' | 'living'
  dsl, data, -- data null for living views
  query_id, created_at
)

-- Trust layer
knosia_query_audit (
  id, user_id, query, dsl, duration_ms,
  rows_returned, created_at
)
```

---

## Appendix: Design System

### Visual Philosophy

**"Colleague, not Cockpit"** — Knosia should feel like a conversation with a knowledgeable peer, not a traditional BI dashboard covered in controls and filters.

| Traditional BI | Knosia |
|----------------|--------|
| Control-heavy toolbars | Floating conversational input |
| Grid of widgets | Progressive notebook flow |
| Manual refresh buttons | Always-live with freshness indicators |
| Settings modals | Inline configuration |

### Emotional Journey Arc

Design for emotional progression through each session:

```
😴 Tired      → 😊 Welcomed    → 🤔 Informed    → 😮 Alerted     → 💪 Empowered
"Another     → "Knosia       → "I understand  → "I didn't     → "I know what
dashboard"     gets me"         the situation"   know that!"     to do now"
```

### Color System (CSS Custom Properties)

```css
:root {
  /* Data Freshness Indicators */
  --knosia-fresh: hsl(142 76% 36%);          /* Green - current (<5 min) */
  --knosia-recent: hsl(142 76% 36% / 0.9);   /* Green fade - (<30 min) */
  --knosia-aging: hsl(38 92% 50%);           /* Amber - getting old (>1 hr) */
  --knosia-stale: hsl(0 84% 60%);            /* Red - outdated (>24 hr) */

  /* Role Accent Colors */
  --knosia-role-executive: hsl(239 84% 67%); /* Indigo */
  --knosia-role-finance: hsl(160 84% 39%);   /* Emerald */
  --knosia-role-sales: hsl(38 92% 50%);      /* Amber */
  --knosia-role-marketing: hsl(328 85% 46%); /* Pink */
  --knosia-role-product: hsl(263 70% 58%);   /* Violet */
  --knosia-role-support: hsl(187 92% 41%);   /* Cyan */

  /* Confidence Indicators */
  --knosia-confidence-high: hsl(142 76% 36%);
  --knosia-confidence-medium: hsl(38 92% 50%);
  --knosia-confidence-low: hsl(0 84% 60%);

  /* Semantic Colors */
  --knosia-insight: hsl(217 91% 60%);        /* Blue - new insight */
  --knosia-warning: hsl(38 92% 50%);         /* Amber - attention needed */
  --knosia-success: hsl(142 76% 36%);        /* Green - positive */
  --knosia-error: hsl(0 84% 60%);            /* Red - problem */
}
```

### Typography Hierarchy

```
Level           | Classes                                    | Usage
----------------|-------------------------------------------|------------------
Greeting        | text-2xl md:text-3xl lg:text-4xl          | "Good morning, Alex"
                | font-medium tracking-tight                 |
----------------|-------------------------------------------|------------------
Section Heading | text-xl md:text-2xl font-semibold         | "Your Pipeline"
----------------|-------------------------------------------|------------------
Card Heading    | text-lg font-semibold                     | "Revenue Overview"
----------------|-------------------------------------------|------------------
Body            | text-base font-normal                     | Explanations
                | text-muted-foreground                      |
----------------|-------------------------------------------|------------------
KPI Value       | text-3xl font-bold tabular-nums           | "$1,247,832"
                | tracking-tight                             |
----------------|-------------------------------------------|------------------
KPI Label       | text-sm text-muted-foreground             | "Monthly Revenue"
----------------|-------------------------------------------|------------------
Delta           | text-sm font-medium                       | "+12.3%"
                | text-green-600 / text-red-600              |
----------------|-------------------------------------------|------------------
Timestamp       | text-xs font-medium                       | "Updated 5m ago"
                | text-muted-foreground                      |
```

### Layout Specifications

```
┌─────────────────────────────────────────────────────────────────┐
│                     max-w-2xl mx-auto                           │
│                     ← Content centered, not full-width →        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sidebar: w-60 (240px)                                          │
│  Canvas: flex-1                                                  │
│  Block gaps: gap-4 (16px)                                       │
│  Card padding: p-4 (16px)                                       │
│  Canvas bottom padding: pb-32 (128px for floating input)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Conversation Bubble Patterns

```tsx
// User message - right aligned, primary color
const userBubble = `
  ml-auto max-w-[80%]
  rounded-2xl rounded-br-sm
  bg-primary text-primary-foreground
  p-4 shadow-sm
`;

// Knosia response - left aligned, muted background
const knosiaBubble = `
  mr-auto max-w-[80%]
  rounded-2xl rounded-bl-sm
  bg-muted
  p-4 shadow-sm
`;

// Floating input container
const floatingInput = `
  fixed bottom-0 left-0 right-0
  p-4 pb-6
  bg-gradient-to-t from-background via-background to-transparent
`;

// Input field itself
const promptInput = `
  w-full max-w-2xl mx-auto
  rounded-full
  bg-muted/80 backdrop-blur-sm
  border border-border/50
  px-6 py-4
  focus:ring-2 focus:ring-primary/20
`;
```

### Block Styling Patterns

```tsx
// Standard block wrapper
const blockWrapper = `
  rounded-xl
  border border-border
  bg-card
  p-4
  transition-shadow
  hover:shadow-md
`;

// Block header with actions
const blockHeader = `
  flex items-center justify-between
  pb-3 mb-3
  border-b border-border/50
`;

// Block menu (three dots)
const blockMenu = `
  opacity-0 group-hover:opacity-100
  transition-opacity
`;
```

### Trust Indicator Styling

```tsx
// Confidence bar
const confidenceBar = {
  high: "h-1.5 rounded-full bg-green-500 w-full",
  medium: "h-1.5 rounded-full bg-amber-500 w-3/4",
  low: "h-1.5 rounded-full bg-red-500 w-1/2 border-dashed border",
};

// Freshness badge
const freshnessBadge = {
  fresh: "text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700",
  aging: "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700",
  stale: "text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700",
};
```

### Animation & Micro-interactions

```tsx
// Smooth block appearance
const blockEnter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
};

// Loading states
const pulseAnimation = "animate-pulse bg-muted rounded";

// Hover elevation
const hoverLift = "transition-transform hover:-translate-y-0.5 hover:shadow-lg";
```

### Responsive Breakpoints

```
Mobile (< 640px):
- Sidebar hidden, hamburger menu
- Single column layout
- Floating input full-width with padding

Tablet (640px - 1024px):
- Sidebar collapsible
- Two-column grids allowed
- Input centered at max-w-xl

Desktop (> 1024px):
- Sidebar always visible
- Full layout as designed
- Input centered at max-w-2xl
```

### Knosia-Specific Spacing

```css
:root {
  --knosia-content-max-width: 48rem;     /* max-w-2xl equivalent */
  --knosia-content-padding: 1rem;        /* Mobile padding */
  --knosia-floating-input-height: 5rem;  /* Input container height */
}

@media (min-width: 768px) {
  :root {
    --knosia-content-padding: 2rem;      /* Desktop padding */
  }
}
```

### Role-Aware Greeting Subtitles

| Role | Greeting Subtitle | Default KPI Focus |
|------|-------------------|-------------------|
| Executive | "Your business at a glance" | Revenue, Runway, Key Risks |
| Sales | "Your pipeline this week" | Pipeline, Quota, At-Risk Deals |
| Finance | "Numbers that matter today" | MRR, Burn Rate, Collections |
| Support | "Customer health today" | CSAT, Tickets, Response Time |
| Product | "What users are telling you" | Activation, Feature Usage, NPS |
| Marketing | "Campaign performance" | CAC, Leads, Conversion |

### Insight Card Anatomy

```typescript
interface InsightCard {
  id: string;
  headline: string;              // "Pipeline is $2.4M"
  context: string;               // "Up 18% from last Monday"
  sentiment: 'positive' | 'negative' | 'neutral';
  sparklineData?: number[];      // Optional mini trend line
  action?: {
    label: string;               // "View deals"
    href: string;                // "/knosia/ask?q=..."
  };
}
```

**Sentiment-to-Color Mapping:**
```tsx
const sentimentColors = {
  positive: "text-green-600 dark:text-green-400",
  negative: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
};
```

### Alert Card Patterns

```typescript
interface AlertCard {
  id: string;
  severity: 'warning' | 'critical';
  message: string;               // "Acme Corp deal stuck 12 days"
  action: {
    label: string;               // "View deal"
    query: string;               // Pre-filled question for Ask page
  };
}
```

**Severity Styling:**
```tsx
const severityStyles = {
  warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
  critical: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
};
```

### Data Freshness Display

```typescript
interface DataFreshness {
  lastUpdated: string;           // ISO timestamp
  sources: Array<{
    name: string;                // "PostgreSQL", "Stripe"
    lastSync: string;            // ISO timestamp
    status: 'live' | 'recent' | 'stale';
  }>;
}
```

**Freshness Thresholds:**
| Status | Time Since Sync | Display |
|--------|-----------------|---------|
| `live` | < 5 minutes | Green dot, "Live" |
| `recent` | 5 min - 1 hour | Green dot, "X min ago" |
| `aging` | 1 - 24 hours | Amber dot, "X hours ago" |
| `stale` | > 24 hours | Red dot, "X days ago ⚠️" |

### Suggested Questions Per Role

```typescript
const roleSuggestions: Record<Role, string[]> = {
  executive: [
    "How are we tracking against Q4 goals?",
    "What's our biggest risk this week?",
    "Show me revenue by segment",
  ],
  sales: [
    "Which deals are at risk?",
    "Show my pipeline by stage",
    "Who's closest to quota?",
  ],
  finance: [
    "What's our burn rate trend?",
    "Show collections aging",
    "MRR breakdown by plan",
  ],
  support: [
    "Which customers have open escalations?",
    "Show ticket volume this week",
    "CSAT trend by product",
  ],
  product: [
    "Which features have low adoption?",
    "Show activation funnel",
    "NPS by user segment",
  ],
  marketing: [
    "Campaign ROI this month",
    "Lead quality by source",
    "CAC trend",
  ],
};
```

### Qualitative UX Success Criteria

| Goal | Indicator |
|------|-----------|
| **"My data analyst"** | Users describe Knosia as a person, not a tool |
| **Briefing = informed** | Users feel caught up after 10 seconds, no clicks needed |
| **Natural follow-ups** | Users ask 2+ questions per session without friction |
| **Role relevance** | Users never manually filter to "their" data |
| **Trust through transparency** | Users cite lineage/assumptions when sharing insights |

### Ambient Nudges (Sidebar Suggestions)

```
┌─────────────────────────────────┐
│ 💡 Suggested                    │
│                                 │
│    Revenue dropped 8% - check?  │
│    [View] [Dismiss]             │
│                                 │
└─────────────────────────────────┘
```

**Nudge Rules:**
| Rule | Rationale |
|------|-----------|
| Maximum 1-2 at a time | Avoid overwhelming |
| Easy dismiss (one click) | Respect user attention |
| Never blocks UI | Suggestions, not interruptions |
| Learns what you ignore | Reduces noise over time |
| Prioritizes by impact | Most significant anomalies first |

### Data Quality Alerts

Proactive surfacing of data issues:

```
┌─────────────────────────────────────────────────────────────────┐
│  🧹 Data Quality Alert                                          │
│                                                                  │
│  I found potential issues:                                       │
│  • 47 duplicate customers (same email, different IDs)            │
│  • 12 subscriptions with $0 amount (test data?)                  │
│  • 3 customers with future created_at dates                      │
│                                                                  │
│  Impact on your metrics:                                         │
│  • Customer count: inflated by ~2%                               │
│  • MRR: unaffected                                               │
│                                                                  │
│  [Review] [Ignore for now] [Auto-clean]                          │
└─────────────────────────────────────────────────────────────────┘
```

### Query Cost Awareness

Protect users from expensive operations:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ This is a large query                                        │
│                                                                  │
│  Estimated:                                                      │
│  • Rows: ~4.2 million                                            │
│  • Time: 30-45 seconds                                           │
│                                                                  │
│  Suggestions:                                                    │
│  • Add a filter (region, product, customer type)                 │
│  • Use aggregated view instead (much faster)                     │
│  • Sample 10% of data for exploration                            │
│                                                                  │
│  [Run anyway] [Add filter] [Use aggregate]                       │
└─────────────────────────────────────────────────────────────────┘
```

### Incremental Complexity Pattern

**Start simple, add depth on demand:**

```
User: "Show me revenue"
→ Single KPI: Revenue: $1.2M

User: "Break it down"
→ Adds bar chart by default dimension (region)

User: "Add trends"
→ Adds sparkline showing last 12 months

User: "Compare to last year"
→ Splits into current vs prior year

User: "Add forecast"
→ Extends chart with projection
```

**Rule:** Each follow-up adds ONE layer. User controls complexity. Never overwhelm with multi-dimensional views unprompted.

### Empty States

When no data or first-time use:

```tsx
const emptyStates = {
  noBriefing: {
    icon: "☀️",
    headline: "Your briefing is warming up",
    context: "Connect a data source to see your personalized insights",
    action: { label: "Connect data", href: "/onboarding/connect" },
  },
  noConversations: {
    icon: "💬",
    headline: "Start a conversation",
    context: "Ask anything about your data in plain English",
    suggestions: ["Show me revenue", "Who are my top customers?"],
  },
  noResults: {
    icon: "🔍",
    headline: "No results found",
    context: "Try a different question or check your filters",
    action: { label: "Clear filters", onClick: clearFilters },
  },
};
```

### Loading States

Progressive disclosure during data fetch:

```
PHASE 1 (0-200ms): Nothing (avoid flicker)
PHASE 2 (200ms-1s): Skeleton with pulse animation
PHASE 3 (1s+): Skeleton + "Still working..." text
PHASE 4 (5s+): Skeleton + "Taking longer than usual" + cancel option
```

```tsx
const loadingText = {
  quick: null,                           // < 1s
  normal: "Analyzing your data...",      // 1-5s
  slow: "Still working on this...",      // 5-15s
  veryLong: "This is taking longer than usual. [Cancel]", // > 15s
};
```

### Error States

Human-readable errors with recovery paths:

```tsx
const errorPatterns = {
  connectionFailed: {
    headline: "Can't reach your database",
    context: "Check that credentials are correct and the database is accessible",
    actions: ["Test connection", "Edit credentials", "Contact support"],
  },
  queryTimeout: {
    headline: "Query took too long",
    context: "Try narrowing your question or adding filters",
    actions: ["Try again", "Add filters", "Use sampling"],
  },
  permissionDenied: {
    headline: "You don't have access to this data",
    context: "Ask your admin for access to the required tables",
    actions: ["Request access", "Try different question"],
  },
};
```

---

## Appendix: UX Patterns Deferred to V2+

*These patterns from the complete vision are intentionally excluded from V1 to maintain focus, but should be considered for future versions.*

### V2: Enhanced Intelligence
- **Linked Blocks** — Synchronized filtering across visualizations
- **Conversation Templates** — Role/industry-specific analysis frameworks
- **Smart Abbreviations** — AI learns company-specific terms (e.g., "ARR" → "Annual Recurring Revenue")
- **Anomaly Memory** — Learns baseline patterns to detect anomalies

### V3: Collaboration
- **Session Handoff** — Pass analysis to colleagues with context
- **Collaborative Annotations** — Team notes on visualizations
- **Real-time Cursors** — See where teammates are exploring

### V4: Governance
- **Vocabulary PRs** — Propose, review, approve metric changes
- **Definition Approval Workflow** — Multi-step approval for sensitive metrics
- **Audit Dashboard** — Visual view of all query activity

### V5: Proactive Intelligence
- **Scheduled Briefings** — Daily/weekly email summaries
- **Alert Actions** — Not just notify, enable action (Create task, Draft email)
- **Meeting Mode** — Optimized for screen sharing during calls
- **Cross-org Vocabulary Sharing** — Share metric definitions across workspaces

---

*This document supersedes all previous Knosia vision documents. Implementation should follow the 8-week roadmap with weekly check-ins against success metrics.*
