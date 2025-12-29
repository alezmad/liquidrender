# Knosia: Generative Dashboard Vision

> The dashboard doesn't exist until onboarding creates it.
> The dashboard isn't pages — it's crystallized questions.
> Created: 2025-12-29

---

## The Paradigm Shift

**Traditional BI:**
```
Connect → Build Dashboard → Write Queries → Configure Reports
                ↑
         (weeks of manual work)
```

**Knosia:**
```
Connect → Detect Business → Propose Dashboard → Confirm → Generated
                ↑                    ↑              ↑
         (seconds, AI)     (templates from      (5-10 questions)
                            similar businesses)
```

The dashboard is **not** a fixed UI you build.
The dashboard is **generated** from:
- Your vocabulary (metrics, dimensions, time fields)
- Your business type (SaaS, E-commerce, Healthcare, Marketplace)
- Your role (CEO, Sales, Finance, Operations)
- Collective wisdom (what worked for similar businesses)

---

## The Core Insight

> "Someone already navigated the graph.
> Someone already read the files.
> Someone already figured it out.
> This is the answer they found."

Every new Knosia user benefits from **every previous user**.

When a SaaS company connects their database:
- We've seen 1,000 SaaS databases before
- We know the questions CEOs ask
- We know the dashboards that work
- We propose what already succeeded

**Onboarding isn't configuration. It's pattern matching to crystallized wisdom.**

---

## Business Type Detection

From schema alone, we can infer:

| Pattern | Business Type | Key Entities |
|---------|---------------|--------------|
| `subscriptions`, `mrr`, `churn` | SaaS | Customers, Plans, Revenue |
| `orders`, `products`, `cart` | E-commerce | Customers, Products, Orders |
| `patients`, `appointments`, `providers` | Healthcare | Patients, Providers, Visits |
| `listings`, `buyers`, `sellers` | Marketplace | Users, Listings, Transactions |
| `campaigns`, `leads`, `conversions` | Marketing | Campaigns, Leads, Customers |
| `cases`, `tickets`, `agents` | Support | Tickets, Agents, Customers |
| `trades`, `accounts`, `positions` | Finance | Accounts, Trades, Positions |

**Detection confidence:** 85%+ from schema patterns alone.
**Fallback:** Ask the user in onboarding.

---

## Dashboard Templates by Business Type

### SaaS Template

```yaml
name: "SaaS Executive Dashboard"
pages:
  - title: "Morning Briefing"
    default_query: "briefing"
    sections:
      - KPI cards: "@mrr, @arr, @customers, @churn_rate"
      - Alert: "anomalies in last 7 days"
      - Insight: "top 3 things to know today"

  - title: "Revenue"
    default_query: "@revenue by @month | last 12 months"
    sections:
      - Chart: "MRR trend"
      - Breakdown: "by @plan, by @segment"
      - Cohort: "revenue retention"

  - title: "Customers"
    default_query: "@customers by @signup_month | cohort view"
    sections:
      - Chart: "New vs churned"
      - Table: "At-risk accounts"
      - Metric: "LTV, CAC, LTV/CAC ratio"

  - title: "Product"
    default_query: "@active_users by @feature | last 30 days"
    sections:
      - Chart: "Feature adoption"
      - Table: "Power users"
```

### E-commerce Template

```yaml
name: "E-commerce Dashboard"
pages:
  - title: "Morning Briefing"
    default_query: "briefing"

  - title: "Sales"
    default_query: "@revenue by @day | last 30 days"

  - title: "Products"
    default_query: "@units_sold by @product | top 20"

  - title: "Customers"
    default_query: "@orders by @customer_segment"
```

---

## Pages Are Liquid Interfaces

A "page" in Knosia is not static HTML. It's:

```typescript
interface DashboardPage {
  id: string;
  title: string;
  icon: Icon;

  // The default query that renders when you land on the page
  defaultQuery: string;  // Liquid DSL: "@revenue by @month"

  // Layout hint (auto-detected from query shape)
  layout: "briefing" | "chart" | "table" | "cards" | "mixed";

  // Sections that compose the page
  sections: Section[];

  // The page is ALWAYS a conversation
  // User can ask follow-up questions
  conversationEnabled: true;
}

interface Section {
  type: "kpi" | "chart" | "table" | "insight" | "alert";
  query: string;  // Liquid DSL
  title?: string;
}
```

**Every page is interactive:**

```
┌────────────────────────────────────────────────────────────────┐
│  Revenue Overview                                              │
│                                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │   $2.3M    │ │    +8%     │ │  $180K     │ │   12%      │  │
│  │    MRR     │ │    WoW     │ │   New      │ │   Churn    │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     📈 MRR Trend (Last 12 Months)                      │   │
│  │                                                         │   │
│  │     [Chart visualization]                               │   │
│  │                                                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  Ask anything...                                               │
│  ▌                                                             │
│                                                                │
│  Try: "Break down by plan" • "Show enterprise only" • "Why?"  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

When user types "Break down by plan":
- Query becomes: `@revenue by @plan by @month | last 12 months`
- Chart updates in-place
- Page remembers this preference

---

## Role-Based Dashboard Generation

The same vocabulary generates different dashboards for different roles:

| Role | Focus | Default Pages |
|------|-------|---------------|
| **CEO** | High-level health | Briefing, Revenue, Customers, Forecast |
| **CFO** | Financial metrics | Revenue, Costs, Margins, Runway |
| **Sales** | Pipeline & deals | Pipeline, Deals, Reps, Quota |
| **Marketing** | Campaigns & leads | Campaigns, Leads, Attribution, CAC |
| **Product** | Usage & adoption | Features, Users, Retention, NPS |
| **Support** | Tickets & CSAT | Tickets, Response Time, CSAT, Agents |

**Onboarding question:** "What's your primary role?"

---

## The Onboarding Flow (Revised)

### Step 1: Connect
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Connect your data                                          │
│  30 seconds to insights                                     │
│                                                             │
│  [PostgreSQL]  [Snowflake]  [BigQuery]  [MySQL]            │
│                                                             │
│  Connection string: [________________________]              │
│                                                             │
│  [Connect]                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Detect (Automatic)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Analyzing your data...                                     │
│                                                             │
│  ✓ Found 127 tables                                         │
│  ✓ Detected 89 metrics, 156 dimensions                      │
│  ✓ Identified business type: SaaS                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  I see you're running a SaaS business.               │   │
│  │                                                       │   │
│  │  I found:                                             │   │
│  │  • Subscription & billing data                        │   │
│  │  • Customer lifecycle events                          │   │
│  │  • Product usage metrics                              │   │
│  │                                                       │   │
│  │  Is this correct?                                     │   │
│  │                                                       │   │
│  │  [Yes, SaaS] [No, something else ▼]                  │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Role Selection
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  What's your primary focus?                                 │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │     👔      │ │     💰      │ │     📈      │           │
│  │  Executive  │ │   Finance   │ │    Sales    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │     📣      │ │     🔧      │ │     🎧      │           │
│  │  Marketing  │ │   Product   │ │   Support   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  (This helps us show you the most relevant insights)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Dashboard Proposal
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Here's your personalized dashboard                         │
│                                                             │
│  Based on: SaaS + Executive role                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PAGES                                               │   │
│  │                                                       │   │
│  │  ☀️ Morning Briefing          [Edit] [Remove]        │   │
│  │     "What you need to know today"                     │   │
│  │                                                       │   │
│  │  📈 Revenue                   [Edit] [Remove]        │   │
│  │     "@revenue by @month"                              │   │
│  │                                                       │   │
│  │  👥 Customers                 [Edit] [Remove]        │   │
│  │     "@customers by @segment"                          │   │
│  │                                                       │   │
│  │  📊 Product Usage             [Edit] [Remove]        │   │
│  │     "@active_users by @feature"                       │   │
│  │                                                       │   │
│  │  [+ Add page]                                         │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Looks good, continue]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 5: Vocabulary Confirmation (5-10 questions)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Quick confirmations                                        │
│  Help me understand your business better                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  1. What's your primary revenue metric?               │   │
│  │                                                       │   │
│  │     ○ monthly_recurring_revenue (MRR)    ← Suggested  │   │
│  │     ○ total_contract_value (TCV)                      │   │
│  │     ○ annual_recurring_revenue (ARR)                  │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  2. Primary date field for orders?                    │   │
│  │                                                       │   │
│  │     ○ created_at                        ← Suggested   │   │
│  │     ○ subscription_start_date                         │   │
│  │     ○ invoice_date                                    │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Question 2 of 6                              [Continue →]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: First Briefing
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Your first briefing is ready                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  Good morning.                                        │   │
│  │                                                       │   │
│  │  Here's what I found in your data:                    │   │
│  │                                                       │   │
│  │  📈 MRR: $2.3M (+8% WoW)                             │   │
│  │     Enterprise segment driving growth (+23%)          │   │
│  │                                                       │   │
│  │  ⚠️ Churn spiked to 4.2% (normally 2.8%)             │   │
│  │     12 accounts churned, all on Legacy plan           │   │
│  │                                                       │   │
│  │  💡 Customers using Feature X have 3x lower churn     │   │
│  │     Only 23% of Enterprise have enabled it            │   │
│  │                                                       │   │
│  │  Ask me anything...                                   │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Go to Dashboard]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Dashboard Customization

Users can always customize:

### Add a Page
```
"Add a page for tracking support tickets"

→ Creates page with:
   title: "Support"
   default_query: "@tickets by @status | last 30 days"
   sections: [volume chart, response time, CSAT]
```

### Modify a Page
```
"Change Revenue page to show weekly instead of monthly"

→ Updates default_query: "@revenue by @week | last 12 weeks"
```

### Reorder Pages
Drag and drop in sidebar settings.

### Add Sections
```
"Add a table of at-risk accounts to the Customers page"

→ Adds section:
   type: "table"
   query: "@customers where @health_score < 50 | top 20"
```

### Remove Pages
Click remove, or "Remove the Product page, I don't need it"

---

## The Living Dashboard

The dashboard **evolves**:

| Day | Evolution |
|-----|-----------|
| **Day 1** | Template dashboard generated from business type + role |
| **Day 7** | "You check revenue by region every Monday. Add to briefing?" |
| **Day 14** | Reorders sidebar based on most-visited pages |
| **Day 30** | "You never visit Product page. Hide it?" |
| **Day 90** | Surfaces correlations: "Deals close faster when demo happens within 48hrs" |
| **Day 365** | Full institutional memory: "This is similar to the Q3 incident..." |

---

## Technical Architecture

### Dashboard Definition (stored per user)

```typescript
interface UserDashboard {
  id: string;
  userId: string;
  organizationId?: string;

  // Detected/confirmed during onboarding
  businessType: BusinessType;
  userRole: UserRole;

  // Generated pages
  pages: DashboardPage[];

  // Sidebar order
  pageOrder: string[];

  // Hidden pages (can be restored)
  hiddenPages: string[];

  // User preferences learned over time
  preferences: {
    defaultTimeRange: string;
    preferredChartType: string;
    // ... learned from behavior
  };

  // Vocabulary reference
  vocabularyId: string;
}
```

### Page Rendering

```typescript
// Each page is a Liquid Interface
function DashboardPage({ page }: { page: DashboardPage }) {
  const [query, setQuery] = useState(page.defaultQuery);
  const { data, isLoading } = useLiquidQuery(query);

  return (
    <div>
      <PageHeader title={page.title} />

      {/* Rendered sections based on query result shape */}
      <DynamicLayout data={data} layout={page.layout}>
        {page.sections.map(section => (
          <Section key={section.id} section={section} />
        ))}
      </DynamicLayout>

      {/* Always present: conversation interface */}
      <LiquidInput
        placeholder="Ask anything..."
        onSubmit={(newQuery) => setQuery(newQuery)}
        suggestions={generateSuggestions(data)}
      />
    </div>
  );
}
```

---

## The Vision, Crystallized

> **Knosia doesn't give you a dashboard.**
> **Knosia gives you a data scientist who already built your dashboard.**

1. Connect once
2. We detect your business
3. We propose what worked for similar businesses
4. You confirm in 60 seconds
5. Your personalized dashboard generates itself
6. Every page is a conversation
7. It learns and evolves every day

**The dashboard is not the product.**
**The intelligence is the product.**
**The dashboard is just how it manifests.**

---

## Next Implementation Steps

1. **Business Type Detector** - Schema pattern matching to business types
2. **Dashboard Templates** - YAML definitions for each business type + role
3. **Dashboard Generator** - Template + vocabulary → pages
4. **Dynamic Page Renderer** - Query → layout → visualization
5. **Preference Learner** - Track behavior, suggest optimizations
6. **Template Marketplace** - Share dashboards that work across companies

---

*This is Knosia. Know what matters.*
