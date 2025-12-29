# LiquidRender Marketing Development Requirements

**Purpose:** Define what needs to be built to launch marketing for LiquidRender, LiquidConnect, and UVB.

---

## Current State

**Existing infrastructure:**
- TurboStarter marketing layout (header, footer, section components)
- Home page with hero, features, testimonials, pricing, FAQ, banner
- Blog, contact, pricing, legal pages
- i18n support via `@turbostarter/i18n`
- shadcn/ui components available

**What we're marketing:**
1. **LiquidRender** — DSL-to-React rendering engine (47 components)
2. **LiquidConnect** — Semantic query language → SQL
3. **UVB** — Universal Vocabulary Builder (60-second semantic layer generation)

---

## Site Architecture

### B2B Site (Primary Domain)

```
/                           → Main landing (product platform)
/products/liquid-render     → UI engine product page
/products/liquid-connect    → Query engine product page
/products/uvb               → Vocabulary builder product page
/solutions/data-teams       → ICP: Internal BI replacement
/solutions/consultants      → ICP: Client dashboard acceleration
/solutions/saas             → ICP: Embedded analytics for products
/demo                       → Interactive demo with sample database
/pricing                    → Existing, needs product-specific tiers
/blog                       → Existing
/contact                    → Existing
```

### B2C Site (Subdomain or Separate Route Group)

```
/start                      → Consumer-focused landing
/start/founders             → Solo founders / small teams
/start/creators             → Analysts, newsletter writers
/start/playground           → Try without signup
/start/pricing              → Self-serve pricing
```

---

## Development Requirements

### 1. Core Marketing Components

**Location:** `apps/web/src/modules/marketing/`

#### 1.1 Product Hero Component

A reusable hero that accepts product-specific content.

```tsx
// modules/marketing/products/product-hero.tsx
interface ProductHeroProps {
  badge?: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  visual: 'code-demo' | 'dashboard-preview' | 'flow-animation';
  visualData?: unknown;
}
```

**Visual options:**
- `code-demo` — Syntax-highlighted DSL with live preview
- `dashboard-preview` — Animated dashboard screenshot
- `flow-animation` — Animated flow diagram (DB → UVB → Query → UI)

#### 1.2 Feature Grid Component

Reusable feature grid with icons and descriptions.

```tsx
// modules/marketing/shared/feature-grid.tsx
interface FeatureGridProps {
  features: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
  }>;
  columns?: 2 | 3 | 4;
}
```

#### 1.3 Comparison Table Component

For competitive positioning.

```tsx
// modules/marketing/shared/comparison-table.tsx
interface ComparisonTableProps {
  competitors: string[];
  features: Array<{
    name: string;
    us: string | boolean;
    them: Record<string, string | boolean>;
  }>;
}
```

#### 1.4 Demo Embed Component

Embeds interactive demo with database connection simulation.

```tsx
// modules/marketing/demo/demo-embed.tsx
interface DemoEmbedProps {
  mode: 'viewer' | 'interactive';
  sampleData?: 'northwind' | 'ecommerce' | 'saas-metrics';
}
```

#### 1.5 ICP Card Component

For solution pages targeting specific personas.

```tsx
// modules/marketing/solutions/icp-card.tsx
interface ICPCardProps {
  persona: string;
  painPoints: string[];
  solution: string;
  testimonial?: { quote: string; author: string; role: string };
  cta: { label: string; href: string };
}
```

---

### 2. Product Pages

#### 2.1 LiquidRender Product Page

**Route:** `/products/liquid-render`

**Content structure:**
1. **Hero** — "Build UIs with 47 characters, not 470 lines"
   - Show DSL → React comparison
   - Live syntax demo

2. **Component Gallery** — Interactive showcase
   - Categorized by type (charts, forms, layout, feedback)
   - Click to see DSL + rendered output

3. **LLM Integration Section** — "Built for AI"
   - Token efficiency stats (3.75x compression)
   - Streaming parser demo
   - Code generation use case

4. **Technical Specs** — Collapsible details
   - Type system (47 types)
   - Signal system (state management)
   - Binding system
   - Modifier system

5. **Integration Guide** — Quick start
   - npm install + basic usage
   - React integration snippet

**Key differentiator:** Show the DSL-to-UI transformation in real-time.

#### 2.2 LiquidConnect Product Page

**Route:** `/products/liquid-connect`

**Content structure:**
1. **Hero** — "Natural language → SQL, without the hallucinations"
   - Show query flow: English → LC → SQL → Results

2. **Determinism Section** — "Same input, same output. Always."
   - Cost comparison (20x reduction vs always-LLM)
   - Latency breakdown (80% <10ms, 15% <20ms, 5% <500ms)

3. **Multi-Database Support** — Emitters
   - DuckDB, PostgreSQL, Trino
   - Future: MySQL, SQLite, BigQuery

4. **Semantic Layer Visualization** — How vocabulary works
   - Entities, metrics, dimensions, filters
   - Relationship graph

5. **Integration with UVB** — Cross-sell
   - "Auto-generate your semantic layer with UVB"

**Key differentiator:** The determinism boundary visualization.

#### 2.3 UVB Product Page

**Route:** `/products/uvb`

**Content structure:**
1. **Hero** — "60 seconds from database to dashboard"
   - Animated timeline: Connect → Extract → Confirm → Query

2. **The 7 Rules Section** — How it works
   - Visual explanation of each hard rule
   - "No ML training required"

3. **Validation Stats** — Proof it works
   - Tested on Northwind, Chinook, Pagila, ECIJA (508 tables)
   - 90% accuracy from schema alone

4. **Live Demo** — The 60-second experience
   - Connect sample database
   - Watch extraction happen
   - Answer 3 confirmation questions
   - Ask a natural language query

5. **Enterprise Scale** — "Works on 500+ table databases"
   - ECIJA case study (508 tables, 326 metrics, 543 dimensions)

**Key differentiator:** The interactive 60-second demo is the entire sales pitch.

---

### 3. Solution Pages

#### 3.1 For Data Teams

**Route:** `/solutions/data-teams`

**Target ICP:** Internal BI teams at 50-500 employee companies

**Pain points to address:**
- "Every dashboard request takes a week"
- "We're the bottleneck for business questions"
- "We can't hire fast enough"

**Content:**
1. Problem visualization — The request queue
2. Solution — Self-serve for business users
3. How it works — 3-step process
4. ROI calculator — Time saved per analyst
5. Testimonial (if available) or use case scenario
6. CTA — Schedule demo

#### 3.2 For Consultants

**Route:** `/solutions/consultants`

**Target ICP:** Analytics consulting firms

**Pain points to address:**
- "Every client database is different"
- "We rebuild semantic layers from scratch each time"
- "Can't scale beyond 10-15 consultants"

**Content:**
1. Problem — The per-client customization trap
2. Solution — UVB generates vocabulary in 60 seconds
3. Workflow — Connect client DB → Auto-generate → Deliver dashboards
4. Margin improvement — More projects, less implementation
5. Case study scenario
6. CTA — Partner program

#### 3.3 For SaaS Products

**Route:** `/solutions/saas`

**Target ICP:** SaaS products adding analytics features

**Pain points to address:**
- "Building analytics distracts from core product"
- "Each enterprise customer wants custom dashboards"
- "We need embeddable, white-label solution"

**Content:**
1. Problem — Build vs buy for analytics
2. Solution — Embed LiquidRender
3. Architecture — How embedding works
4. Multi-tenant support — Per-customer vocabularies
5. API documentation preview
6. CTA — Technical consultation

---

### 4. B2C Pages

#### 4.1 Consumer Landing

**Route:** `/start`

**Simpler messaging:**
- "Ask your database anything"
- "No SQL. No setup. No waiting."

**Minimal structure:**
1. Hero — Single value prop
2. 3-step visual — Connect → Ask → See
3. Social proof — User count or testimonial
4. Pricing preview — $29/mo starting
5. CTA — Start free

#### 4.2 For Founders

**Route:** `/start/founders`

**Target:** Solo founders, small teams (1-5)

**Message:** "You built the product. We built the analytics."

**Content:**
1. Empathy — "You're wearing too many hats"
2. Solution — Analytics without the analyst
3. Use cases — Revenue tracking, user behavior, churn analysis
4. Integration — Works with your existing database
5. Pricing — Starter tier details
6. CTA — Connect your database

#### 4.3 For Creators

**Route:** `/start/creators`

**Target:** Newsletter writers, analysts, researchers

**Message:** "Dataset to chart in 30 seconds"

**Content:**
1. Problem — "Visualization takes longer than analysis"
2. Solution — Drop data, ask questions, export charts
3. Export options — PNG, SVG, embed code
4. Examples — Sample visualizations
5. Pricing — Creator tier
6. CTA — Try with sample data

#### 4.4 Playground

**Route:** `/start/playground`

**Purpose:** Try without signup

**Implementation:**
- Pre-loaded sample databases (Northwind, mock SaaS metrics)
- Limited to 10 queries per session
- Upgrade prompt after limit
- No account required

---

### 5. Interactive Demo

**Route:** `/demo`

**The most important marketing asset.** This is the 60-second experience.

**Implementation requirements:**

1. **Sample Database Selector**
   - Northwind (classic, relatable)
   - E-commerce (orders, products, customers)
   - SaaS Metrics (MRR, churn, users)

2. **Connection Simulation**
   - Show "connecting" animation
   - Display extracted schema

3. **UVB Extraction Visualization**
   - Tables appearing with detected types
   - Metrics, dimensions, filters highlighting
   - Progress indicator

4. **Confirmation UI**
   - 3 questions maximum
   - "What's your primary time field?"
   - "What do you call [metric]?"
   - Skip option for defaults

5. **Query Interface**
   - Natural language input
   - Show LC translation
   - Show SQL output
   - Render result with LiquidRender

6. **Result Actions**
   - Copy as image
   - Embed code
   - Share link
   - "Sign up to save"

**Technical notes:**
- Can run client-side with DuckDB WASM for demo
- Pre-compute vocabulary for sample databases
- Cache query results for common questions

---

### 6. Content Updates to Existing Pages

#### 6.1 Home Page (`/`)

**Changes needed:**
- Update hero copy to platform positioning
- Replace generic features with product-specific
- Add product cards linking to `/products/*`
- Update testimonials (or remove if none yet)
- Adjust pricing preview for product tiers

#### 6.2 Pricing Page (`/pricing`)

**Changes needed:**
- Add product-based tiers:
  - **Starter** ($29/mo) — 1 database, 1000 queries/mo
  - **Pro** ($99/mo) — 5 databases, unlimited queries
  - **Team** ($299/mo) — Unlimited databases, team features
  - **Enterprise** (custom) — Self-hosted, SLA, support
- Feature comparison matrix
- FAQ updates

---

### 7. Assets Required

#### 7.1 Visual Assets

| Asset | Purpose | Format |
|-------|---------|--------|
| Product logos | Each product page | SVG |
| Hero screenshots | Dark/light mode | WebP |
| Demo animations | 60-second flow | Lottie or video |
| Architecture diagrams | Technical sections | SVG |
| Comparison charts | Competitive positioning | SVG |

#### 7.2 Copy Requirements

| Page | Word count | Tone |
|------|------------|------|
| Home hero | 50-75 | Bold, confident |
| Product pages | 500-800 each | Technical but accessible |
| Solution pages | 400-600 each | Empathetic, problem-focused |
| B2C pages | 200-400 each | Simple, direct |

#### 7.3 Social Proof

**Options if no testimonials yet:**
- GitHub stars / downloads (if open source)
- "Trusted by X developers"
- Beta user logos (with permission)
- Technical validation stats ("Tested on 500+ table databases")

---

### 8. Technical Implementation Notes

#### 8.1 Routing Structure

```
apps/web/src/app/[locale]/(marketing)/
├── page.tsx                    # Home (update existing)
├── products/
│   ├── liquid-render/page.tsx
│   ├── liquid-connect/page.tsx
│   └── uvb/page.tsx
├── solutions/
│   ├── data-teams/page.tsx
│   ├── consultants/page.tsx
│   └── saas/page.tsx
├── demo/page.tsx
├── start/
│   ├── page.tsx               # B2C landing
│   ├── founders/page.tsx
│   ├── creators/page.tsx
│   └── playground/page.tsx
├── pricing/page.tsx           # Update existing
└── ... (existing pages)
```

#### 8.2 Shared Modules

```
apps/web/src/modules/marketing/
├── products/
│   ├── product-hero.tsx
│   ├── component-gallery.tsx
│   ├── code-demo.tsx
│   └── tech-specs.tsx
├── solutions/
│   ├── icp-card.tsx
│   ├── pain-point-list.tsx
│   └── roi-calculator.tsx
├── demo/
│   ├── demo-embed.tsx
│   ├── database-selector.tsx
│   ├── extraction-visualizer.tsx
│   ├── confirmation-wizard.tsx
│   └── query-interface.tsx
├── shared/
│   ├── feature-grid.tsx
│   ├── comparison-table.tsx
│   ├── social-proof.tsx
│   └── stats-bar.tsx
└── home/                      # Existing, update
```

#### 8.3 i18n Considerations

All marketing copy should go through translation keys:
- `marketing:products.liquidRender.hero.title`
- `marketing:solutions.dataTeams.painPoints.0`
- etc.

Start with English, structure for future localization.

---

### 9. Priority Order

**High impact, build first:**
1. Interactive demo (`/demo`) — This sells the product
2. UVB product page — The differentiator
3. Home page updates — First impression

**Medium impact, build second:**
4. LiquidRender product page
5. LiquidConnect product page
6. Pricing updates

**Lower impact, build third:**
7. Solution pages (data-teams, consultants, saas)
8. B2C pages (/start/*)

**Rationale:** The demo is the conversion engine. Everything else drives traffic to it.

---

### 10. Success Metrics

**Not dates — outcomes to measure:**

- Demo completion rate (started → finished 60-second flow)
- Demo → signup conversion
- Page engagement (scroll depth, time on page)
- CTA click-through rates
- Query attempts in playground

---

## Summary

The marketing site needs 15 new pages and ~10 new components. The highest-impact asset is the interactive demo — it demonstrates the core value proposition (60 seconds to queryable database) in a way that words cannot.

The B2B site targets data teams, consultants, and SaaS products with solution-specific messaging. The B2C site targets founders and creators with simplified messaging and self-serve pricing.

All pages should funnel toward the demo experience.
