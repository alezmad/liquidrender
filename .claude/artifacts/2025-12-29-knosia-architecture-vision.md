# Knosia: Architecture Vision

> The Business Operating System - A complete vision for semantic business intelligence.
> Created: 2025-12-29
> Status: Vision Document (Pre-Implementation)

---

## Executive Summary

Knosia is not just a BI tool or chatbot. It's the **semantic layer for the entire organization** — the single source of truth for how a company understands its business.

**Core Problem:** Every company has data and BI tools, but nobody has solved the vocabulary problem. When someone says "Active Users," it means different things to Engineering, Product, Sales, and the CEO. This misalignment costs companies millions.

**Solution:** Knosia becomes the company's brain — establishing shared vocabulary, providing role-aware intelligence, preserving institutional memory, and enabling governance.

---

## The Six Layers of Knosia

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│                         KNOSIA: BUSINESS OPERATING SYSTEM                           │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│   │  SEMANTIC       │  │  INTELLIGENCE   │  │  MEMORY         │  │  GOVERNANCE   │ │
│   │  LAYER          │  │  LAYER          │  │  LAYER          │  │  LAYER        │ │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├───────────────┤ │
│   │ What things     │  │ AI that knows   │  │ Institutional   │  │ Who owns      │ │
│   │ MEAN in this    │  │ YOUR specific   │  │ knowledge that  │  │ which metrics │ │
│   │ company         │  │ business        │  │ persists        │  │ and why       │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│   │  ALIGNMENT      │  │  ONBOARDING     │  │  COLLABORATION  │  │  INTEGRATION  │ │
│   │  LAYER          │  │  LAYER          │  │  LAYER          │  │  LAYER        │ │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├───────────────┤ │
│   │ Teams speak     │  │ New hires learn │  │ Discuss, share, │  │ API, embeds,  │ │
│   │ the same        │  │ the language    │  │ annotate        │  │ Slack, email  │ │
│   │ language        │  │ in days         │  │ together        │  │               │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concept 1: Vocabulary as Living Knowledge

Vocabulary isn't a static dictionary. It's a **versioned, governed, interconnected knowledge graph.**

**Philosophy: 90% Reading, 10% Learning**

The schema already contains what exists (tables, columns, types, FKs). The 7 Hard Rules extract structure deterministically. Only ~10% needs user confirmation (naming, primary time field, ambiguous aggregations). Vocabulary extraction is mostly READING, not ML.

### VocabularyItem Schema

```yaml
VocabularyItem:
  # IDENTITY
  id: uuid
  canonical_name: "Monthly Recurring Revenue"
  abbreviation: "MRR"
  aliases: ["Monthly Revenue", "Subscription Revenue"]
  slug: "mrr"  # for URLs, APIs, referencing
  icon: "trending-up"

  # SEMANTICS
  type: metric | dimension | entity | event
  category: revenue | engagement | acquisition | retention | operations
  direction: higher_is_better | lower_is_better | target_range
  format: currency(USD) | percentage | count | duration | ratio
  grain: daily | weekly | monthly | point_in_time
  sensitivity: public | internal | confidential | pii

  # EXTRACTION METADATA (from 7 Hard Rules)
  aggregation: SUM | AVG | COUNT | MIN | MAX  # Rule 3: metric detection
  aggregation_confidence: 80-100              # certainty from pattern match
  cardinality: number                         # Rule 7: column stats
  safe_for_groupby: boolean                   # cardinality < 100
  is_primary_time: boolean                    # Rule 5: default time anchor
  detected_by_rule: 1-7                       # which rule created this

  # DEFINITION
  description_human: "The predictable revenue we expect each month from active subscriptions"
  formula_human: "SUM of active subscription amounts"
  formula_sql: "SELECT SUM(amount) FROM subscriptions WHERE status = 'active'"
  source_tables: ["subscriptions", "plans", "customers"]
  caveats:
    - "Excludes one-time payments"
    - "USD only, converted at month-end rates"
  example_values:
    low: "$10K"
    typical: "$500K"
    high: "$10M"

  # RELATIONSHIPS (the knowledge graph)
  components: [new_mrr, expansion_mrr, contraction_mrr, churned_mrr]
  derived_from: [arr]  # MRR = ARR / 12
  derives: [arr, cmrr]  # Other metrics that use this
  correlates_with: [active_users, feature_adoption]
  inversely_correlates: [churn_rate]
  often_analyzed_with: [churn, ltv, cac, nrr]

  # JOIN PATHS (from Rule 2: FK detection)
  joins_to:
    - target: customers
      via: customer_id
      type: many_to_one

  # CONTEXT
  when_useful: "Board meetings, investor updates, goal setting"
  when_misleading: "Comparing companies with different billing cycles"
  industry_benchmarks:
    saas_median: "$100K"
    saas_top_quartile: "$1M"
  history: "Adopted Q1 2023, replaced 'Monthly Sales' after Series A"

  # GOVERNANCE
  status: approved | draft | deprecated | archived
  owner:
    team: "Finance"
    steward_user_id: "user_xxx"
  created_by: user_id
  approved_by: user_id
  version: 3
  changelog:
    - version: 3
      date: "2024-06-01"
      author: user_id
      changes: "Added enterprise tier exclusion"
      reason: "Enterprise now billed annually"
  review_schedule: "quarterly"

  # ROLE RELEVANCE (the lens)
  role_relevance:
    ceo:
      priority: primary
      in_briefing: true
      alert_threshold: "±10%"
    vp_sales:
      priority: context
      in_briefing: false
    analyst:
      priority: primary
      show_formula: true
    new_hire:
      learning_order: 1
      explanation_depth: detailed
```

### Why This Matters

| Scenario | How Knosia Helps |
|----------|------------------|
| New hire asks "What's MRR?" | Gets rich context, not just a number |
| CEO asks "Why is MRR down?" | Knosia knows to check components (new, expansion, churn) |
| Analyst asks "Show me the SQL" | It's there, version-controlled |
| Someone proposes changing definition | PR workflow, audit trail, approval |
| CFO and VP Sales disagree on number | Single source of truth resolves it |

---

## Core Concept 2: Role as a Cognitive Profile

A Role isn't a job title. It's a **complete model of how someone thinks about the business.**

### Role Schema

```yaml
Role:
  # IDENTITY
  id: uuid
  name: "Growth Leader"
  archetype: Strategist | Operator | Analyst | Builder
  industry_variant: SaaS | Ecommerce | Fintech | Marketplace
  seniority: Executive | Director | Manager | IC

  # COGNITIVE PROFILE
  cognitive_profile:
    time_horizon: weeks | months | quarters | years
    decision_style: data_first | intuition_guided | consensus_driven
    detail_preference: executive_summary | balanced | deep_dive
    comparison_default: WoW | MoM | QoQ | YoY
    uncertainty_tolerance: needs_precision | comfortable_with_estimates

  # METRIC PRIORITIES
  metric_priorities:
    primary_kpis: [mrr, churn, nrr]
    secondary_metrics: [trial_conversion, expansion_rate]
    noise_filter: [technical_metrics, raw_event_counts]
    custom_composites:
      - name: "Growth Score"
        formula: "(mrr_growth * 0.5) + (nrr * 0.3) + (trial_conversion * 0.2)"

  # ALERT THRESHOLDS
  alert_thresholds:
    critical:
      churn: ">5%"
      runway: "<6mo"
      mrr_drop: ">15%"
    warning:
      churn: ">3%"
      mrr_growth: "<5%"
    opportunity:
      nrr: ">120%"
      trial_spike: ">50%"

  # BRIEFING PREFERENCES
  briefing:
    schedule: "daily 8am" | "weekly Monday" | "on-demand"
    tone: concise | narrative | analytical
    include: [anomalies, trends, forecasts, comparisons, actions]
    exclude: [raw_numbers_without_context]
    delivery: [app, email, slack]
    max_length: "3 bullets" | "1 page" | "detailed"

  # QUESTION PATTERNS
  question_patterns:
    frequent:
      - "What's driving [metric] this [period]?"
      - "How does [segment] compare to [segment]?"
      - "What would happen if [scenario]?"
    follow_up_chains:
      - trigger: "churn_up"
        sequence: [by_cohort, by_plan, by_feature, by_acquisition_channel]

  # LEARNING PROFILE
  learning:
    vocabulary_mastery:
      mrr: 100%
      cac: 80%
      magic_number: 20%
    suggested_learning: [ltv, payback_period, rule_of_40]
    onboarding_path: [core_metrics, unit_economics, forecasting]
```

### Role Templates (Pre-built)

| Template | Archetype | Primary Focus | Time Horizon |
|----------|-----------|---------------|--------------|
| **SaaS CEO** | Strategist | MRR, Churn, Runway | Quarters/Years |
| **VP Sales** | Operator | Pipeline, Win Rate, ACV | Months |
| **Product Manager** | Builder | Adoption, Engagement, Retention | Weeks/Months |
| **Data Analyst** | Analyst | All metrics, deep-dive | Flexible |
| **CFO** | Strategist | Unit Economics, Cash Flow | Quarters |
| **Growth Lead** | Operator | Acquisition, Conversion | Weeks |
| **Customer Success** | Operator | NRR, Churn, Health Scores | Months |

### Why This Matters

- AI onboarding asks a few questions, infers the role, personalizes everything
- CEO's briefing is 3 bullets; Analyst's briefing is 3 pages with SQL
- Same data, different presentations, both perfectly suited
- Role templates accelerate setup: "I'm a SaaS CEO" → instant configuration

---

## Core Concept 3: Workspace as Semantic Boundary

A Workspace isn't a folder. It's a **bounded context with its own vocabulary, permissions, and AI configuration.**

### Workspace Schema

```yaml
Workspace:
  # IDENTITY
  id: uuid
  name: "Revenue Analytics"
  description: "All revenue and subscription metrics"
  slug: "revenue"
  icon: "dollar-sign"

  # DATA SCOPE
  data_scope:
    connections: [postgres_prod, stripe_api, salesforce]
    schema_include:
      - "subscriptions.*"
      - "invoices.*"
      - "customers.*"
    schema_exclude:
      - "*.pii_*"
      - "internal.*"
    row_level_security:
      type: "org_id"
      column: "organization_id"

  # VOCABULARY SCOPE
  vocabulary_scope:
    inherits_from: [org_core_vocabulary]  # Shared definitions
    workspace_vocabulary: [...]            # Domain-specific additions
    vocabulary_overrides: [...]            # Local refinements

  # TEAM & ACCESS
  access:
    visibility: org_wide | team_only | private
    admins: [user_ids]
    editors: [user_ids, role_ids]
    viewers: [user_ids, role_ids, "everyone"]
    guest_access:
      enabled: true
      expires: "30d"

  # DEFAULTS
  defaults:
    comparison_period: MoM
    currency: USD
    timezone: America/New_York
    fiscal_year_start: February

  # AI CONFIGURATION
  ai_config:
    briefing_schedule: "weekdays 8am"
    anomaly_detection:
      enabled: true
      sensitivity: medium
    auto_insights:
      enabled: true
      max_per_day: 5
    proactive_alerts:
      enabled: true
      channels: [email, slack]
```

### Workspace Examples

| Workspace | Connections | Vocabulary Focus | Teams |
|-----------|-------------|------------------|-------|
| **Revenue** | Postgres, Stripe | MRR, ARR, Churn, LTV | Finance, Sales |
| **Product** | Postgres, Amplitude | DAU, Retention, Features | Product, Eng |
| **Growth** | Postgres, GA, Ads | CAC, Conversion, Channels | Marketing, Growth |
| **Executive** | All (read-only) | Aggregated views | Leadership |

### Why This Matters

- Sales team has their workspace with pipeline metrics
- Finance has theirs with revenue recognition rules
- Both inherit core vocabulary (MRR means the same thing)
- But each has domain-specific additions and appropriate access controls
- Executive workspace sees aggregated view across all domains

---

## Core Concept 4: The Personal Layer

On top of shared vocabulary, each user has their **personal relationship with the data.**

### UserPersonalization Schema

```yaml
UserPersonalization:
  user_id: uuid
  workspace_id: uuid

  # FAVORITES
  favorites:
    pinned_metrics: [mrr, churn, active_users]
    pinned_dashboards: [executive_summary, cohort_analysis]
    pinned_queries: ["Show me churn by plan"]
    pinned_filters:
      - segment: "enterprise"
      - period: "last_90d"

  # CUSTOMIZATIONS
  customizations:
    aliases:
      mrr: "My MRR View"
      arr: "Annual Number"
    notes:
      mrr: "Track weekly for board prep"
      churn: "Alert CFO if > 3%"
    hidden: [technical_metric_1, internal_test_data]
    custom_views:
      - name: "My Dashboard"
        config: {...}

  # LEARNING JOURNEY
  learning:
    vocabulary_confidence:
      mrr: 100
      cac: 80
      magic_number: 40
    concepts_learned: [unit_economics, cohort_analysis]
    suggested_next: [ltv_cac_ratio, payback_period]
    onboarding_complete: 75%

  # BEHAVIOR PATTERNS (AI learns this)
  behavior:
    typical_questions:
      - "What's driving..."
      - "Compare X to Y"
    follow_up_patterns:
      - [churn, by_plan, by_feature]
    preferred_visualizations: [line_chart, table]
    active_hours: ["8am-10am", "2pm-4pm"]

  # NOTIFICATIONS
  notifications:
    briefing_time: "8:30am"
    alert_channels: [app, email]
    digest_frequency: daily
    quiet_hours: ["10pm-7am", "weekends"]
```

### Why This Matters

- CEO doesn't see the same interface as Analyst
- Personal favorites persist across sessions
- AI learns how YOU ask questions, adapts over time
- Onboarding tracks what you've learned, suggests what's next
- Each person has a personalized relationship with shared data

---

## Core Concept 5: Institutional Memory

Conversations aren't just logs. They're **searchable, learnable, shareable institutional knowledge.**

### Conversation Schema

```yaml
Conversation:
  # IDENTITY
  id: uuid
  user_id: uuid
  workspace_id: uuid
  title: "Q4 Churn Analysis"  # auto-generated or user-set
  started_at: timestamp
  last_activity: timestamp
  status: active | archived | shared

  # CONTEXT (persists across messages)
  context:
    active_filters:
      - field: "plan"
        operator: "eq"
        value: "enterprise"
    time_range:
      start: "2024-10-01"
      end: "2024-12-31"
    compared_to:
      period: "previous_quarter"
    vocabulary_focus: [churn, retention, cohort]

  # MESSAGES
  messages:
    - id: uuid
      role: user | assistant
      content: "What's driving the churn spike in November?"
      timestamp: timestamp

      # AI metadata
      intent: causal_analysis | data_retrieval | comparison | forecast
      grounding: [vocabulary_item_ids]  # What terms were used
      sql_generated: "SELECT..."        # Transparency
      visualization:
        type: bar
        data: [...]
        config: {...}
      confidence: 0.92

  # OUTCOMES
  outcomes:
    insights_generated:
      - id: uuid
        title: "Enterprise churn driven by feature gap"
        saved: true
    actions_taken:
      - "exported_csv"
      - "shared_with_cfo"
      - "created_alert"
    decisions_made:
      - "Investigate feature X adoption"
    follow_up_scheduled: "2024-01-15"

  # SHARING
  sharing:
    shared_with: [user_ids, team_ids]
    public_link: "https://app.knosia.io/c/abc123"
    comments:
      - user: user_id
        text: "Great analysis, let's discuss Monday"
        timestamp: timestamp
    reactions:
      - user: user_id
        emoji: "👍"

  # LEARNING (AI improves from this)
  learning:
    user_feedback:
      helpful: true
      rating: 5
    corrections:
      - original: "Churn is 5%"
        corrected: "Churn is 5.2% (excluding trials)"
        reason: "Need to exclude trial accounts"
    successful_patterns:
      - query_type: "causal_analysis"
        approach: "segment_by_cohort"
        outcome: "insight_found"
```

### Why This Matters

- "Remember that analysis we did in Q3?" → Searchable
- Share insights with teammates, not screenshots
- AI learns from corrections, gets smarter for everyone
- New hires can browse past analyses to learn company context
- Decisions and their reasoning are preserved

---

## The Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PLATFORM LAYER                                        │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Tenant                                                                            │  │
│  │  ├── type: cloud | on_premise | hybrid                                             │  │
│  │  ├── data_residency: us | eu | customer_infra                                      │  │
│  │  ├── encryption: knosia_managed | customer_managed                                 │  │
│  │  ├── sso_config: { provider, domain }                                              │  │
│  │  └── billing: { plan, usage, limits }                                              │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  ORGANIZATION LAYER                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Organization                                                                      │  │
│  │  ├── identity: { name, domain, industry, size }                                    │  │
│  │  ├── core_vocabulary: [shared across all workspaces]                               │  │
│  │  ├── role_templates: [CEO, VP, PM, Analyst, Custom...]                             │  │
│  │  ├── governance_settings: { approval_required, review_cycle }                      │  │
│  │  └── ai_customization: { tone, industry_context, company_voice }                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┼──────────────────────┐
                     ▼                      ▼                      ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────────┐
│  Workspace: "Revenue"       │ │  Workspace: "Product"       │ │  Workspace: "Executive"     │
│  ├── connections: [...]     │ │  ├── connections: [...]     │ │  ├── inherits from all      │
│  ├── vocabulary: [...]      │ │  ├── vocabulary: [...]      │ │  ├── aggregated views       │
│  ├── teams: [Finance, Sales]│ │  ├── teams: [Product, Eng]  │ │  ├── teams: [Leadership]    │
│  └── ai_config: {...}       │ │  └── ai_config: {...}       │ │  └── ai_config: {...}       │
└─────────────────────────────┘ └─────────────────────────────┘ └─────────────────────────────┘
                     │                      │                      │
                     └──────────────────────┼──────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                     USER LAYER                                           │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  User                                                                              │  │
│  │  ├── identity: { email, name, avatar }                                             │  │
│  │  ├── memberships: [{ workspace_id, role_id, joined_at }]                           │  │
│  │  ├── global_preferences: { theme, timezone, locale }                               │  │
│  │  ├── personalization: [per workspace: favorites, notes, aliases]                   │  │
│  │  ├── conversation_history: [per workspace]                                         │  │
│  │  └── learning_progress: { concepts_mastered, suggested_next }                      │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Full Data Model

### Platform Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      PLATFORM TABLES                                        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  tenants                         organizations                 organization_settings       │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ id: uuid PK             │     │ id: uuid PK             │   │ id: uuid PK             │ │
│  │ name: text              │     │ tenant_id: uuid FK      │   │ org_id: uuid FK         │ │
│  │ slug: text UNIQUE       │     │ name: text              │   │ key: text               │ │
│  │ type: enum              │     │ domain: text            │   │ value: jsonb            │ │
│  │   cloud|on_premise|     │     │ industry: text          │   │ created_at: timestamp   │ │
│  │   hybrid                │     │ size: enum              │   │ updated_at: timestamp   │ │
│  │ data_residency: text    │     │ logo_url: text          │   └─────────────────────────┘ │
│  │ encryption_config: jsonb│     │ ai_config: jsonb        │                              │
│  │ sso_config: jsonb       │     │ governance: jsonb       │                              │
│  │ billing_config: jsonb   │     │ created_at: timestamp   │                              │
│  │ limits: jsonb           │     │ updated_at: timestamp   │                              │
│  │ created_at: timestamp   │     └─────────────────────────┘                              │
│  │ updated_at: timestamp   │                                                              │
│  └─────────────────────────┘                                                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Workspace Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     WORKSPACE TABLES                                        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  workspaces                      workspace_connections          workspace_settings         │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ id: uuid PK             │     │ id: uuid PK             │   │ id: uuid PK             │ │
│  │ org_id: uuid FK         │     │ workspace_id: uuid FK   │   │ workspace_id: uuid FK   │ │
│  │ name: text              │     │ connection_id: uuid FK  │   │ key: text               │ │
│  │ slug: text              │     │ schema_filters: jsonb   │   │ value: jsonb            │ │
│  │ description: text       │     │ created_at: timestamp   │   │ created_at: timestamp   │ │
│  │ icon: text              │     └─────────────────────────┘   └─────────────────────────┘ │
│  │ visibility: enum        │                                                              │
│  │   org_wide|team_only|   │                                                              │
│  │   private               │                                                              │
│  │ defaults: jsonb         │                                                              │
│  │ ai_config: jsonb        │                                                              │
│  │ created_at: timestamp   │                                                              │
│  │ updated_at: timestamp   │                                                              │
│  └─────────────────────────┘                                                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Connection Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CONNECTION TABLES                                        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  connections                     connection_health             connection_schemas          │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ id: uuid PK             │     │ id: uuid PK             │   │ id: uuid PK             │ │
│  │ org_id: uuid FK         │     │ connection_id: uuid FK  │   │ connection_id: uuid FK  │ │
│  │ name: text              │     │ status: enum            │   │ schema_snapshot: jsonb  │ │
│  │ type: enum              │     │   connected|error|stale │   │ tables_count: int       │ │
│  │   postgres|mysql|       │     │ last_check: timestamp   │   │ extracted_at: timestamp │ │
│  │   snowflake|bigquery|   │     │ error_message: text     │   │ version: int            │ │
│  │   redshift|duckdb       │     │ latency_ms: int         │   └─────────────────────────┘ │
│  │ host: text              │     │ uptime_percent: float   │                              │
│  │ port: int               │     └─────────────────────────┘                              │
│  │ database: text          │                                                              │
│  │ schema: text            │                                                              │
│  │ credentials: text       │     # encrypted                                              │
│  │ ssl_enabled: bool       │                                                              │
│  │ created_at: timestamp   │                                                              │
│  │ updated_at: timestamp   │                                                              │
│  └─────────────────────────┘                                                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Vocabulary Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    VOCABULARY TABLES                                        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  vocabulary_items                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ id: uuid PK                                                                          │  │
│  │ workspace_id: uuid FK (nullable - null means org-level)                              │  │
│  │ org_id: uuid FK                                                                      │  │
│  │ canonical_name: text                                                                 │  │
│  │ abbreviation: text                                                                   │  │
│  │ slug: text                                                                           │  │
│  │ aliases: text[]                                                                      │  │
│  │ type: enum (metric|dimension|entity|event)                                           │  │
│  │ category: text                                                                       │  │
│  │ semantics: jsonb { direction, format, grain, sensitivity }                           │  │
│  │ current_version: int                                                                 │  │
│  │ status: enum (approved|draft|deprecated|archived)                                    │  │
│  │ governance: jsonb { owner_team, steward_user_id, review_schedule }                   │  │
│  │ # Extraction metadata (7 Hard Rules)                                                 │  │
│  │ aggregation: enum (SUM|AVG|COUNT|MIN|MAX)                                            │  │
│  │ aggregation_confidence: int                                                          │  │
│  │ cardinality: int                                                                     │  │
│  │ is_primary_time: bool                                                                │  │
│  │ joins_to: jsonb[]                                                                    │  │
│  │ created_at: timestamp                                                                │  │
│  │ updated_at: timestamp                                                                │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                            │
│  vocabulary_versions             vocabulary_relationships      vocabulary_benchmarks       │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ id: uuid PK             │     │ id: uuid PK             │   │ id: uuid PK             │ │
│  │ item_id: uuid FK        │     │ from_item_id: uuid FK   │   │ item_id: uuid FK        │ │
│  │ version: int            │     │ to_item_id: uuid FK     │   │ industry: text          │ │
│  │ definition: jsonb       │     │ relationship_type: enum │   │ segment: text           │ │
│  │   description_human     │     │   component_of|derived| │   │ percentile_25: float    │ │
│  │   formula_human         │     │   correlates|inverse|   │   │ percentile_50: float    │ │
│  │   formula_sql           │     │   analyzed_with         │   │ percentile_75: float    │ │
│  │   source_tables         │     │ strength: float         │   │ source: text            │ │
│  │   caveats               │     │ metadata: jsonb         │   │ updated_at: timestamp   │ │
│  │ created_by: uuid FK     │     │ created_at: timestamp   │   └─────────────────────────┘ │
│  │ approved_by: uuid FK    │     └─────────────────────────┘                              │
│  │ changelog: text         │                                                              │
│  │ created_at: timestamp   │                                                              │
│  └─────────────────────────┘                                                              │
│                                                                                            │
│  vocabulary_role_relevance       vocabulary_changes                                        │
│  ┌─────────────────────────┐     ┌─────────────────────────┐                              │
│  │ id: uuid PK             │     │ id: uuid PK             │                              │
│  │ item_id: uuid FK        │     │ item_id: uuid FK        │                              │
│  │ role_id: uuid FK        │     │ type: enum              │                              │
│  │ priority: enum          │     │   create|update|        │                              │
│  │   primary|secondary|    │     │   deprecate             │                              │
│  │   context|hidden        │     │ proposed_by: uuid FK    │                              │
│  │ in_briefing: bool       │     │ proposed_changes: jsonb │                              │
│  │ alert_config: jsonb     │     │ status: enum            │                              │
│  │ display_config: jsonb   │     │   pending|approved|     │                              │
│  │ created_at: timestamp   │     │   rejected              │                              │
│  └─────────────────────────┘     │ reviewed_by: uuid FK    │                              │
│                                  │ review_notes: text      │                              │
│                                  │ created_at: timestamp   │                              │
│                                  │ resolved_at: timestamp  │                              │
│                                  └─────────────────────────┘                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Role Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ROLE TABLES                                           │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  role_templates                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ id: uuid PK                                                                          │  │
│  │ org_id: uuid FK (nullable - null means global template)                              │  │
│  │ name: text                                                                           │  │
│  │ description: text                                                                    │  │
│  │ archetype: enum (strategist|operator|analyst|builder)                                │  │
│  │ industry_variant: text                                                               │  │
│  │ seniority: enum (executive|director|manager|ic)                                      │  │
│  │ cognitive_profile: jsonb                                                             │  │
│  │   time_horizon, decision_style, detail_preference, comparison_default                │  │
│  │ briefing_config: jsonb                                                               │  │
│  │   schedule, tone, include, exclude, delivery, max_length                             │  │
│  │ question_patterns: jsonb                                                             │  │
│  │ learning_path: jsonb                                                                 │  │
│  │ is_template: bool (true for global, false for org-custom)                            │  │
│  │ created_at: timestamp                                                                │  │
│  │ updated_at: timestamp                                                                │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                            │
│  role_metric_priorities          role_alert_thresholds                                     │
│  ┌─────────────────────────┐     ┌─────────────────────────┐                              │
│  │ id: uuid PK             │     │ id: uuid PK             │                              │
│  │ role_id: uuid FK        │     │ role_id: uuid FK        │                              │
│  │ item_id: uuid FK        │     │ item_id: uuid FK        │                              │
│  │ priority_tier: enum     │     │ severity: enum          │                              │
│  │   primary|secondary|    │     │   critical|warning|     │                              │
│  │   context|hidden        │     │   info|opportunity      │                              │
│  │ in_briefing: bool       │     │ condition: text         │                              │
│  │ display_config: jsonb   │     │ threshold_value: text   │                              │
│  │ created_at: timestamp   │     │ notification: jsonb     │                              │
│  └─────────────────────────┘     │ created_at: timestamp   │                              │
│                                  └─────────────────────────┘                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### User Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       USER TABLES                                           │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  users (existing - extended)     workspace_memberships          user_preferences           │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ id: uuid PK             │     │ id: uuid PK             │   │ id: uuid PK             │ │
│  │ email: text             │     │ user_id: uuid FK        │   │ user_id: uuid FK        │ │
│  │ name: text              │     │ workspace_id: uuid FK   │   │ workspace_id: uuid FK   │ │
│  │ ...existing fields      │     │ role_id: uuid FK        │   │ favorites: jsonb        │ │
│  │                         │     │ permissions: jsonb      │   │ aliases: jsonb          │ │
│  │ # Knosia additions:     │     │ joined_at: timestamp    │   │ notes: jsonb            │ │
│  │ global_prefs: jsonb     │     │ invited_by: uuid FK     │   │ hidden_items: uuid[]    │ │
│  │ onboarding_complete:bool│     │ status: enum            │   │ custom_views: jsonb     │ │
│  └─────────────────────────┘     │   active|invited|       │   │ notification: jsonb     │ │
│                                  │   suspended             │   │ created_at: timestamp   │ │
│                                  └─────────────────────────┘   │ updated_at: timestamp   │ │
│                                                                └─────────────────────────┘ │
│                                                                                            │
│  user_learning                   user_notifications                                        │
│  ┌─────────────────────────┐     ┌─────────────────────────┐                              │
│  │ id: uuid PK             │     │ id: uuid PK             │                              │
│  │ user_id: uuid FK        │     │ user_id: uuid FK        │                              │
│  │ workspace_id: uuid FK   │     │ type: enum              │                              │
│  │ item_id: uuid FK        │     │   briefing|alert|       │                              │
│  │ confidence: int (0-100) │     │   insight|mention       │                              │
│  │ learned_at: timestamp   │     │ channel: enum           │                              │
│  │ last_used: timestamp    │     │   app|email|slack       │                              │
│  └─────────────────────────┘     │ content: jsonb          │                              │
│                                  │ read_at: timestamp      │                              │
│                                  │ created_at: timestamp   │                              │
│                                  └─────────────────────────┘                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Intelligence Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   INTELLIGENCE TABLES                                       │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  analyses                        briefings                      insights                   │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ id: uuid PK             │     │ id: uuid PK             │   │ id: uuid PK             │ │
│  │ connection_id: uuid FK  │     │ user_id: uuid FK        │   │ workspace_id: uuid FK   │ │
│  │ workspace_id: uuid FK   │     │ workspace_id: uuid FK   │   │ type: enum              │ │
│  │ status: enum            │     │ role_id: uuid FK        │   │   anomaly|trend|        │ │
│  │   running|completed|    │     │ generated_at: timestamp │   │   correlation|forecast  │ │
│  │   failed                │     │ content: jsonb          │   │ title: text             │ │
│  │ current_step: int       │     │   greeting              │   │ description: text       │ │
│  │ total_steps: int        │     │   kpis                  │   │ severity: enum          │ │
│  │ summary: jsonb          │     │   alerts                │   │ grounding: jsonb        │ │
│  │ business_type: jsonb    │     │   insights              │   │ affected_items: uuid[]  │ │
│  │ detected_vocab: jsonb   │     │   suggestions           │   │ relevance_by_role: jsonb│ │
│  │ error: jsonb            │     │ delivered_via: text[]   │   │ expires_at: timestamp   │ │
│  │ started_at: timestamp   │     │ opened_at: timestamp    │   │ created_at: timestamp   │ │
│  │ completed_at: timestamp │     │ created_at: timestamp   │   └─────────────────────────┘ │
│  │ created_at: timestamp   │     └─────────────────────────┘                              │
│  └─────────────────────────┘                                                              │
│                                                                                            │
│  conversations                   conversation_messages          conversation_feedback      │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ id: uuid PK             │     │ id: uuid PK             │   │ id: uuid PK             │ │
│  │ user_id: uuid FK        │     │ conversation_id: uuid FK│   │ message_id: uuid FK     │ │
│  │ workspace_id: uuid FK   │     │ role: enum              │   │ user_id: uuid FK        │ │
│  │ title: text             │     │   user|assistant        │   │ helpful: bool           │ │
│  │ context: jsonb          │     │ content: text           │   │ rating: int (1-5)       │ │
│  │   filters               │     │ intent: enum            │   │ correction: jsonb       │ │
│  │   time_range            │     │ grounding: uuid[]       │   │ comment: text           │ │
│  │   vocabulary_focus      │     │ sql_generated: text     │   │ created_at: timestamp   │ │
│  │ status: enum            │     │ visualization: jsonb    │   └─────────────────────────┘ │
│  │   active|archived|      │     │ confidence: float       │                              │
│  │   shared                │     │ created_at: timestamp   │                              │
│  │ sharing: jsonb          │     └─────────────────────────┘                              │
│  │ outcomes: jsonb         │                                                              │
│  │ created_at: timestamp   │                                                              │
│  │ updated_at: timestamp   │                                                              │
│  └─────────────────────────┘                                                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Governance & Audit Tables

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  GOVERNANCE & AUDIT TABLES                                  │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  audit_logs                      mismatch_reports                                          │
│  ┌─────────────────────────┐     ┌─────────────────────────┐                              │
│  │ id: uuid PK             │     │ id: uuid PK             │                              │
│  │ org_id: uuid FK         │     │ item_id: uuid FK        │                              │
│  │ user_id: uuid FK        │     │ user_id: uuid FK        │                              │
│  │ action: text            │     │ workspace_id: uuid FK   │                              │
│  │ resource_type: text     │     │ issue_type: enum        │                              │
│  │ resource_id: uuid       │     │   wrong_mapping|        │                              │
│  │ old_value: jsonb        │     │   wrong_name|missing|   │                              │
│  │ new_value: jsonb        │     │   other                 │                              │
│  │ ip_address: text        │     │ description: text       │                              │
│  │ user_agent: text        │     │ status: enum            │                              │
│  │ created_at: timestamp   │     │   pending|reviewed|     │                              │
│  └─────────────────────────┘     │   resolved|dismissed    │                              │
│                                  │ resolved_by: uuid FK    │                              │
│                                  │ resolution_notes: text  │                              │
│                                  │ created_at: timestamp   │                              │
│                                  │ resolved_at: timestamp  │                              │
│                                  └─────────────────────────┘                              │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Table Summary

| Category | Tables | Count |
|----------|--------|-------|
| **Platform** | tenants, organizations, organization_settings | 3 |
| **Workspace** | workspaces, workspace_connections, workspace_settings | 3 |
| **Connection** | connections, connection_health, connection_schemas | 3 |
| **Vocabulary** | vocabulary_items, vocabulary_versions, vocabulary_relationships, vocabulary_benchmarks, vocabulary_role_relevance, vocabulary_changes | 6 |
| **Role** | role_templates, role_metric_priorities, role_alert_thresholds | 3 |
| **User** | workspace_memberships, user_preferences, user_learning, user_notifications | 4 |
| **Intelligence** | analyses, briefings, insights, conversations, conversation_messages, conversation_feedback | 6 |
| **Governance** | audit_logs, mismatch_reports | 2 |
| **Total** | | **30** |

---

## Implementation Phases

| Phase | Focus | Tables | Timeline |
|-------|-------|--------|----------|
| **V1: Foundation** | Single-org, core vocabulary, conversations | 15 tables | Now |
| **V2: Multi-Workspace** | Workspace scoping, role templates | +5 tables | +2 months |
| **V3: Governance** | Vocabulary versioning, change proposals, audit | +4 tables | +4 months |
| **V4: Enterprise** | Multi-tenant, SSO, advanced permissions | +3 tables | +6 months |
| **V5: Intelligence** | Benchmarks, proactive insights, learning | +3 tables | +9 months |

### V1 Tables (15)

```
organizations
workspaces
workspace_connections
connections
connection_health
connection_schemas
vocabulary_items
vocabulary_versions
role_templates
workspace_memberships
user_preferences
analyses
conversations
conversation_messages
mismatch_reports
```

---

## Full Vision Features

| Feature | Description | Phase |
|---------|-------------|-------|
| **Vocabulary Governance** | PRs for metric changes, approval workflows, audit trail | V3 |
| **Metric Lineage** | Trace any number back to source tables, transformations | V2 |
| **Cross-Company Benchmarks** | "Your churn is 3%, similar SaaS companies: 5%" (anonymized) | V5 |
| **Scenario Modeling** | "What if churn increased to 7%?" with downstream effects | V3 |
| **Goal Tracking** | "80% to Q4 MRR target, need $200K more" | V2 |
| **Collaborative Analysis** | Share, comment, react, fork analyses | V2 |
| **Role-Based Onboarding** | New CFO gets finance-focused learning path | V2 |
| **Proactive Insights** | AI surfaces anomalies before you ask | V5 |
| **Embeddable Widgets** | Knosia metrics in Slack, email, Notion | V4 |
| **API Access** | Other tools query Knosia's vocabulary | V3 |
| **Mobile Briefings** | Morning summary on your phone | V3 |
| **Voice Interface** | "Hey Knosia, how's revenue this week?" | V5 |
| **SSO & SCIM** | Enterprise identity management | V4 |
| **Data Residency** | EU, US, or on-premise deployment | V4 |
| **Custom Encryption** | Customer-managed encryption keys | V4 |

---

## Key Design Decisions

### 1. Vocabulary Scoping

- **Org-level vocabulary**: Shared definitions (MRR, Churn)
- **Workspace-level vocabulary**: Domain-specific (Pipeline Stage, Feature Adoption)
- **User personalization**: Favorites, aliases, notes (never changes the definition)

### 2. Role Philosophy

- **Global templates**: Pre-built roles (SaaS CEO, VP Sales)
- **Org templates**: Company-specific roles (our Growth Lead)
- **User assignment**: Each user has one role per workspace

### 3. Multi-Tenancy

- **Cloud**: Multi-tenant, shared infrastructure
- **On-premise**: Single-tenant, customer infrastructure
- **Hybrid**: Cloud control plane, on-premise data plane

### 4. AI Configuration

- Each org can customize AI tone, industry context
- Each workspace has its own briefing schedule
- Each role has different alert thresholds

### 5. Governance

- Vocabulary changes require approval (configurable)
- Audit trail for all changes
- Version history with rollback capability

---

## Next Steps

1. **Review this vision** - Does it align with your product direction?
2. **Define V1 scope** - Which tables are essential for launch?
3. **Create workflow** - Implement the data model and API
4. **Build AI onboarding** - Role inference and vocabulary setup

---

*This document represents the full architectural vision for Knosia. Implementation will be phased according to product priorities.*
