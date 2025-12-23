---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
inputDocuments:
  - "_bmad-output/analysis/product-brief-liquidrender-2025-12-21.md"
  - "_bmad-output/analysis/brainstorming-gtm-2025-12-21.md"
  - ".mydocs/LIQUIDRENDER-CLAUDE.md"
  - "CLAUDE.md"
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 1
  projectDocs: 2
workflowType: 'prd'
lastStep: 11
project_name: 'liquidrender'
user_name: 'Agutierrez'
date: '2025-12-21'
---

# Product Requirements Document - LiquidRender

**Author:** Agutierrez
**Date:** 2025-12-21

---

## Executive Summary

LiquidRender transforms **any data source** into instant, beautiful dashboards. Ask a question, drop a file, create a survey, or connect your APIs — see a professional dashboard in seconds. No signup required for first use.

The product eliminates the **identity barrier** — the belief that "I'm not a data person." Users have data everywhere. They don't know how to visualize it. LiquidRender removes every obstacle between having data and understanding it.

**Core Promise:** Seconds, not hours. The "holy shit" moment when María sees her ugly Excel become a beautiful dashboard with HER data.

### The Unified Model

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   USER INTENT (prompt, action, or implicit)                 │
│                         │                                   │
│                         ▼                                   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              DATA CONTEXT                           │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│   │  │  Files  │ │ Surveys │ │  APIs   │ │   DBs   │   │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │    LIQUID UI        │                        │
│              │    ENGINE           │                        │
│              └──────────┬──────────┘                        │
│                         │                                   │
│                         ▼                                   │
│              ┌─────────────────────┐                        │
│              │     DASHBOARD       │                        │
│              └─────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**The prompt is the INTENT. The sources are the CONTEXT. Liquid UI resolves both.**

### What Makes This Special

1. **Zero friction entry** — No signup, no setup, no learning curve. Drop file → see magic.
2. **Instant gratification** — Dashboard renders in <10 seconds, not hours of Excel fighting.
3. **Identity shift** — Users realize they ARE data people. They just needed the right tool.
4. **Viral by design** — Users share OUTPUT (dashboards), not the product. Each share is a demo.
5. **Liquid UI paradigm** — AI generates validated schemas, React renders. Never broken code.
6. **Universal data access** — Files, surveys, APIs, databases, MCP — one interface for all.

### PRD Scope: Full Product Roadmap

**This PRD covers the complete LiquidRender vision in 5 phases:**

| Phase | Weeks | Input Sources | Platform | Focus |
|-------|-------|---------------|----------|-------|
| **Phase 1: Core** | 1-4 | 📁 Files (Excel, CSV, JSON) | 🌐 Web | File → Dashboard magic |
| **Phase 2: Survey** | 5-6 | 📋 AI Survey Builder | 🌐 Web | NL → Survey → Dashboard |
| **Phase 3: Connections** | 7-10 | 🔌 APIs, 🗄️ DBs, 🔗 MCP | 🌐 Web | Live data sources |
| **Phase 4: Conversational** | 11-12 | 💬 Natural Language Prompt | 🌐 Web | Ask anything about your data |
| **Phase 5: Mobile** | 13-16 | 📱 View & Share | 📱 iOS/Android | Dashboards on the go |

**Total Timeline:** 16-20 weeks to full multi-platform launch

**Phase 1 MVP Success Gate:** Must validate before proceeding to Phase 2

**Critical Implementation Constraints:**

| Constraint | Requirement | Rationale |
|------------|-------------|-----------|
| **TurboStarter Foundation** | Use existing auth, billing, DB, API patterns | Don't reinvent infrastructure |
| **Liquid UI Extractable** | `packages/liquid-ui/*` must be independently usable | Future npm publish + B2D market |
| **AI Cost Control** | Mandatory caching, token limits, graceful fallbacks | Each render has real $ cost |
| **Schema Validation** | All AI output validated by Zod before render | Reliability by construction |
| **Credits System** | Leverage TurboStarter AI credits pattern | Dashboard generation = X credits |

**User Story Format:**
Each story will include:
- Testable acceptance criteria
- Technical specs (endpoint, schema, component)
- Edge cases documented
- Definition of done

---

## Project Classification

**Technical Type:** Web Application (SaaS)
**Secondary Type:** Developer Tool (`packages/liquid-ui/*`)
**Domain:** General (no regulated industry constraints)
**Complexity:** Medium
**Project Context:** Greenfield on TurboStarter + TurboStarter AI foundation

### Architecture Integration

**What TurboStarter Provides (USE AS-IS):**

| Package | Purpose | LiquidRender Usage |
|---------|---------|-------------------|
| `@turbostarter/auth` | Better Auth | Google OAuth, session management |
| `@turbostarter/db` | Drizzle + PostgreSQL | Extend schema for dashboards |
| `@turbostarter/api` | Hono routers | Add `/api/dashboards/*`, `/api/render/*` |
| `@turbostarter/storage` | S3 presigned URLs | File upload for Excel/CSV/JSON |
| `@turbostarter/billing` | Stripe integration | Dashboard limits per plan |
| `@turbostarter/ui-web` | shadcn/ui components | Dashboard UI composition |
| `@turbostarter/ai` pattern | AI package separation | Model for `packages/liquid-ui/` |

**What LiquidRender Adds (NEW):**

| Package | Purpose | Key Exports | Platform |
|---------|---------|-------------|----------|
| `packages/liquid-ui/core` | Schema types + validation | `LiquidSchema`, `Block`, `Binding` | Shared |
| `packages/liquid-ui/parsers` | File parsing | `parseExcel`, `parseCSV`, `parseJSON` | Web |
| `packages/liquid-ui/catalog` | Component catalog | Charts, KPIs, Tables, Layouts | Shared |
| `packages/liquid-ui/react` | React renderer (web) | `LiquidRenderer`, `BlockRenderer` | Web |
| `packages/liquid-ui/react-native` | React Native renderer | `LiquidRendererNative` | Mobile |
| `packages/liquid-ui/agents` | Mastra agents | Analyzer, Generator, Corrector | Backend |

**Application Structure:**

```
apps/
├── web/                     ← Next.js (TurboStarter)
│   ├── Create dashboards
│   ├── Configure connections
│   └── Full editing capabilities
│
└── mobile/                  ← Expo (TurboStarter Mobile)
    ├── View dashboards
    ├── Share links
    └── Receive push alerts
```

**New Database Schema:**

```
packages/db/src/schema/dashboard.ts
├── dashboard (id, userId, title, schema, fileHash, createdAt, updatedAt)
├── dashboardFile (id, dashboardId, originalName, s3Key, mimeType, size)
└── dashboardCache (fileHash, schema, createdAt, expiresAt)
```

**New API Routes:**

```
packages/api/src/modules/dashboards/router.ts
├── POST   /api/dashboards/upload     → Upload file, get presigned URL
├── POST   /api/dashboards/render     → Generate dashboard from file
├── GET    /api/dashboards/:id        → Get dashboard by ID
├── GET    /api/dashboards            → List user's dashboards
├── POST   /api/dashboards/:id/share  → Generate share link
├── DELETE /api/dashboards/:id        → Delete dashboard
```

**AI Stack:**

| Component | Technology | Purpose |
|-----------|------------|---------|
| Orchestration | Mastra (`@mastra/core`) | Agent workflow coordination |
| Router Model | Claude Haiku | Intent parsing (~100ms) |
| Generator Model | Claude Sonnet | Schema generation (~1500ms) |
| Validation | Zod | LiquidSchema validation |
| Cache | Upstash Redis | Semantic caching by file hash |

---

## Success Criteria

### Strategic Foundation

**The Order of Operations:**
```
LiquidRender (Product) → validates → Liquid UI (Paradigm) → enables → Open Source (Platform)
```

**Why this order:**
1. Liquid UI without proven use case = ignored theory
2. Solo founder needs revenue before open source play
3. The paradigm emerges from solving real problems, not from architecture documents
4. Architecture already supports extraction when the time is right

**This PRD focuses on:** LiquidRender MVP (Week 1-4)
**Liquid UI extraction:** Phase 2 strategic decision (Month 3-4)
**Open source play:** Post-revenue validation (Month 6+)

### User Success

**The "Holy Shit" Moment:**
María drops her ugly Excel at 11:47 PM. Two seconds later, a beautiful dashboard appears with HER data. She says "No fucking way." She tries a second file. The magic is real.

**User Success Indicators:**

| Indicator | Metric | Target |
|-----------|--------|--------|
| **Instant gratification** | Time to first dashboard | <10 seconds |
| **Trust confirmed** | Second file upload rate | >40% within session |
| **Pride in output** | Dashboard shared externally | >15% of dashboards |
| **Return value** | Day 7 active return | >20% of registered users |
| **Worth paying** | Upgrade to paid tier | >5% of registered users |

**What "Success" Means:**

| Persona | Success Statement | Observable Behavior |
|---------|-------------------|---------------------|
| **María** | "I sent it to my boss in 5 minutes instead of 3 hours" | Shares dashboard + goes to bed |
| **Diego** | "My client said it looks very professional" | Creates dashboards for multiple clients |

### Business Success

**8-Week MVP Launch Targets (Hard Numbers):**

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Dashboards Created** | 1,000 | Core activation — product is being used |
| **Registered Users** | 300+ | 30% registration rate = value proven |
| **Dashboards Shared** | 150+ | 15% share = viral loop functioning |
| **Day 7 Retention** | 60+ users | 20% return = sticky value |
| **Paying Users** | 50 | Revenue validated — real money exchanged |
| **MRR** | €500+ | Sustainable unit economics possible |

**Decision Points:**

| Outcome | Signal | Action |
|---------|--------|--------|
| 4-5/5 targets hit | Product-market fit signal | Proceed to Phase 2 (connections, voice) |
| 2-3/5 targets hit | Core value exists, needs tuning | Iterate on conversion, share rate |
| <2/5 targets hit | Fundamental issue | Pause, investigate, potentially pivot |

**12-Month Vision:**
- 50,000+ dashboards created
- 10,000+ registered users
- 2,000+ paying users
- B2B connections marketplace revenue
- Team of 2-3

### Technical Success

**Core Technical Requirements:**

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **Dashboard Generation Success** | >80% of uploads | Valid dashboard / total uploads |
| **Generation Time** | <10 seconds p95 | Time from file drop to rendered dashboard |
| **Schema Validation** | 100% | All AI output passes Zod validation |
| **Cache Hit Rate** | >30% | Semantic cache for repeated file patterns |
| **API Availability** | >99.5% | Uptime during launch window |

**Cost Control:**

| Constraint | Limit | Rationale |
|------------|-------|-----------|
| **AI cost per dashboard** | <$0.05 | Sustainable at free tier |
| **Token budget per generation** | <8K tokens | Cost + latency control |
| **Cache TTL** | 24 hours | Balance freshness vs cost |
| **Free tier dashboards** | 5/month | Conversion trigger |

**Error Handling:**

| Scenario | Response | User Message |
|----------|----------|--------------|
| Unparseable file | Graceful rejection | "We couldn't read this file. Try CSV or simpler Excel." |
| AI generation failure | Retry with Corrector agent | Transparent retry, no user action |
| Validation failure | Fallback to safe template | Still shows something useful |
| Rate limit | Queue with ETA | "High demand. Your dashboard will be ready in ~30s" |

### Measurable Outcomes

**North Star Metric: Dashboards Shared**

Why this metric:
- Shared = Created (activation happened)
- Shared = Liked (user proud of output)
- Shared = Viral (others see and ask "how?")
- Shared = Value (María got boss approval, Diego won client)

**Leading vs Lagging:**

| Type | Metric | Frequency |
|------|--------|-----------|
| **Leading** | First dashboard success rate | Daily |
| **Leading** | Time to dashboard | Per request |
| **Leading** | Second file rate | Daily |
| **Lagging** | Share rate | Weekly |
| **Lagging** | Day 7 retention | Weekly |
| **Lagging** | Paid conversion | Weekly |

**Anti-Vanity Metrics (What We Ignore):**
- Twitter followers
- Page views
- Time on page
- NPS scores
- Feature usage analytics

---

## Product Scope

### Phase 1: Core MVP (Week 1-4) — Files → Dashboard

**The Golden Rule:** First make María say "wow" with an Excel. THEN show her she can also connect Stripe. Not the other way around.

**Phase 1 Feature Set:**

| Feature | Week | Why Essential |
|---------|------|---------------|
| File parsing (Excel/CSV/JSON) | 1 | Core input |
| LiquidSchema + component catalog | 1 | Render engine |
| AI dashboard generation | 2 | Core magic |
| Landing page + drop zone | 3 | User entry |
| Dashboard viewer + share link | 3 | Core output + viral |
| Google OAuth + save dashboards | 4 | Retention |
| Free tier limits | 4 | Conversion trigger |

**Phase 1 Success Gate:**
```
Excel → Parse → AI → Schema → Render → Share
           ↓
        <10 seconds
           ↓
        María says "holy shit"
```

**Must validate Phase 1 before proceeding. Decision point at Week 4.**

---

### Phase 2: AI Survey Builder (Week 5-6) — Survey → Dashboard

**New Input Source:** Natural language → AI generates survey → Collect responses → Dashboard

**Phase 2 Feature Set:**

| Feature | Week | Why Essential |
|---------|------|---------------|
| AI Survey Generator agent | 5 | NL → GraphSurvey schema |
| Survey preview + editing | 5 | User refinement |
| Survey distribution (shareable link) | 5 | Response collection |
| Response → ParsedData adapter | 6 | Bridge to existing engine |
| Survey-optimized dashboard templates | 6 | NPS gauges, word clouds |
| Multi-respondent aggregation | 6 | Comparative insights |

**Leverages Existing:**
- SurveyEngine (GraphSurvey schema, 25+ question types, conditional logic)
- LiquidSchema renderer from Phase 1
- Share link infrastructure from Phase 1

**Phase 2 Success Gate:**
```
"Create a customer satisfaction survey" → AI generates → Collect responses → Dashboard
```

---

### Phase 3: Live Connections (Week 7-10) — APIs + DBs + MCP → Dashboard

**New Input Sources:** OAuth APIs, Database connections, MCP servers

**Phase 3 Feature Set:**

| Feature | Week | Why Essential |
|---------|------|---------------|
| OAuth flow for APIs (Stripe first) | 7 | Zero-friction connection |
| Secure credential storage | 7 | Trust + compliance |
| API → ParsedData adapter | 7-8 | Bridge to engine |
| Database connection (PostgreSQL) | 8-9 | Enterprise use case |
| AI → SQL generation | 9 | Natural language queries |
| MCP client implementation | 9-10 | Any data source |
| Multi-source dashboard | 10 | Cross-source insights |
| Scheduled refresh | 10 | Live dashboards |

**Phase 3 Success Gate:**
```
Connect Stripe → "Show me MRR by month" → Live dashboard with auto-refresh
```

---

### Phase 4: Conversational Interface (Week 11-12) — Ask → Dashboard

**New Input Source:** Natural language prompts as primary entry point

**Phase 4 Feature Set:**

| Feature | Week | Why Essential |
|---------|------|---------------|
| Conversational UI (chat interface) | 11 | Primary entry point |
| Intent parsing from NL | 11 | Understand what user wants |
| Context awareness (available sources) | 11 | Know what data exists |
| Multi-turn conversation | 12 | Refine dashboards iteratively |
| Dashboard mutation from chat | 12 | Add/remove/modify via prompt |
| Cross-source queries from prompt | 12 | "Compare Stripe revenue with targets sheet" |

**Phase 4 Success Gate:**
```
"How's our revenue this month vs last?" → Identifies Stripe → Fetches data → Dashboard
"Break it down by pricing tier" → Updates existing dashboard
```

---

### Phase 5: Mobile App (Week 13-16) — View & Share on the Go

**New Platform:** iOS and Android native apps via Expo (TurboStarter Mobile)

**Phase 5 Feature Set:**

| Feature | Week | Why Essential |
|---------|------|---------------|
| Mobile dashboard viewer | 13 | Core mobile experience |
| Dashboard list + search | 13 | Find dashboards quickly |
| Responsive chart rendering | 13-14 | Charts work on mobile screens |
| Share from mobile | 14 | Quick sharing in meetings |
| Offline dashboard caching | 14-15 | View without connection |
| Push notifications for alerts | 15-16 | Metrics come to you |
| Deep linking | 16 | Tap notification → specific dashboard |

**Mobile Platform Strategy:**

| Platform | Approach | Technology |
|----------|----------|------------|
| **Web** | Create, Connect, Manage | Next.js (primary) |
| **Mobile** | View, Share, Receive Alerts | Expo React Native |
| **Shared** | LiquidSchema, Components | packages/liquid-ui/* |

**What Mobile Does NOT Do (MVP):**
- Create dashboards (web only)
- Upload files (web only)
- Create surveys (web only)
- Configure connections (web only)

**Phase 5 Success Gate:**
```
Diego in client meeting → Opens app → Shows live dashboard → Client impressed
María on subway → Shares dashboard link → Boss happy before she arrives at office
Tomás gets push notification → Taps → Sees churn dashboard → Takes action
```

---

### Full Vision: The Universal Data Interface

**Landing Page Evolution:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           What do you want to see?                          │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  "Show me revenue trends by month"                  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   Or start with your data:                                  │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │ 📁 Drop  │  │ 📋 Survey│  │ 🔌 Connect│  │ 🗄️ Query │   │
│   │  File    │  │  Create  │  │   API    │  │   DB     │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Input Types Summary:**

| Input Type | UX Action | Phase | Platform | Example |
|------------|-----------|-------|----------|---------|
| **File** | Drag & drop | 1 | Web | Drop Excel |
| **Survey** | Create flow | 2 | Web | "Create a survey about..." |
| **API** | OAuth connect | 3 | Web | Connect Stripe |
| **Database** | Connection string | 3 | Web | Connect PostgreSQL |
| **MCP** | Server config | 3 | Web | Add Notion server |
| **Prompt** | Text input | 4 | Web | "Show me revenue by region" |
| **Mobile View** | Tap dashboard | 5 | Mobile | View client metrics on-the-go |
| **Push Alert** | Notification | 5 | Mobile | "⚠️ Churn exceeded 5%" |
| **Voice** | Speech input | Future | Both | 🎤 "What's my churn rate?" |

**The Paradigm:**
> Liquid UI is bigger than LiquidRender.
> Today: files → dashboards
> Tomorrow: any intent → any interface

---

## User Journeys

### Journey 1: María Santos — The Midnight Dashboard (Phase 1: File → Dashboard)

María is a 32-year-old Marketing Coordinator at a B2B SaaS startup. Tonight, like many nights, she's staring at an Excel spreadsheet at 11:47 PM. Her VP needs the Q4 performance report for tomorrow's board meeting. The data is there—Google Ads spend, LinkedIn impressions, HubSpot conversions—but it's ugly. Rows and columns that mean nothing to anyone but her.

She's tried making it "pretty" before. Three hours with Excel charts. Still ugly. She Googled "make Excel dashboard" once and found a 45-minute YouTube tutorial she closed after 3 minutes. She's not "a data person." She just needs to go to bed.

Frustrated, she types "Excel to dashboard fast" into Google. She clicks on LiquidRender. The page says "Drop any file." She thinks "yeah, right" but drags her Excel anyway.

Two seconds later, her screen transforms. KPIs at the top—total spend, conversion rate, cost per lead—with little green arrows showing trends. Below that, a bar chart of spend by channel. A line chart showing conversions over time. A clean table with the raw data. All of it using HER numbers. She recognizes the $47,231 in Google Ads. She sees the 2.3% conversion rate she calculated manually last week.

"No fucking way."

She clicks around. Everything works. She drags another file—last quarter's report—just to make sure it wasn't luck. Same magic. This is real.

She clicks "Share", gets a link, sends it to her VP with "Q4 Report attached", and goes to bed. Tomorrow morning, she'll have an email: "Great job, María. This looks very professional."

**Requirements Revealed:**
- Zero-friction file upload (drag-and-drop)
- Sub-10-second AI dashboard generation
- Automatic KPI extraction with trend indicators
- Chart type selection (bar, line, pie)
- Clean data table formatting
- One-click shareable link generation
- No signup required for first dashboard

---

### Journey 2: María Santos v2 — The Customer Feedback Survey (Phase 2: Survey → Dashboard)

Three months later, María faces a different challenge. Her VP wants to understand customer satisfaction before the annual planning meeting. "Get me some feedback from our top 20 clients," he says. "Nothing fancy, just what they think about the product."

María has done this before—Google Forms, export to Excel, spend hours trying to make sense of the responses. But this time, she remembers LiquidRender.

She goes to liquidrender.com and notices something new: "Drop a file" AND "Create a survey." She clicks "Create a survey" and types what she needs: "Customer satisfaction survey for B2B SaaS clients. Want to know: overall satisfaction, likelihood to recommend, top feature requests, and any complaints."

In seconds, a professional survey appears. NPS question with the 0-10 scale. Multiple choice for satisfaction. Open text for feature requests. Rating scale for support quality. It even has conditional logic—if someone rates below 6, it asks "What would need to change?"

María adjusts one question, adds her company logo, and copies the survey link. She sends it to the 20 clients with a personal note.

A week later, 18 responses are in. María clicks "View Results" and sees not just a summary but a full dashboard: NPS score of 47 (with industry comparison), satisfaction breakdown by category, word cloud of feature requests, and a list of the 3 clients who rated low with their specific feedback.

She presents this at the planning meeting. Her VP says: "This is exactly what we needed. Can we do this quarterly?"

María smiles. She's not just a marketing coordinator anymore. She's the person who gets answers.

**Requirements Revealed:**
- Natural language survey creation
- AI-generated question types (NPS, rating, multiple choice, open text)
- Conditional logic suggestions
- Survey customization (branding, question editing)
- Survey distribution (shareable link)
- Response collection and storage
- Automatic survey results → dashboard transformation
- Survey-specific visualizations (NPS gauge, word clouds, response breakdown)

---

### Journey 3: Diego Fernández — The Client Proposal (Phase 2: Survey + Branding)

Diego is an independent digital marketing consultant. He's pitching a new client—a mid-size e-commerce company that's not sure if they need his services. The decision-maker wants "proof" that Diego can deliver insights.

Diego has an idea. Instead of promising insights, he'll demonstrate them.

He creates a quick survey on LiquidRender: "E-commerce marketing health check. We'll ask your team 10 questions about your current marketing efforts and show you exactly where the gaps are."

The survey includes questions about current channels, budget allocation, biggest challenges, and satisfaction with results. Diego sends it to the 5 key stakeholders at the prospect company.

Three days later, he has responses. He clicks "Generate Dashboard" and LiquidRender creates a "Marketing Health Assessment" dashboard:
- Overall health score: 62/100
- Channel effectiveness radar chart showing paid ads are overinvested while email is underutilized
- Alignment matrix showing the team disagrees on priorities
- Top 3 opportunities highlighted with specific recommendations

Diego presents this in the pitch meeting. The prospect sees their own data, their own gaps, visualized professionally. The dashboard includes "Powered by LiquidRender" but Diego's logo is prominent.

He closes the deal that week. The prospect says: "You showed us our problems before we even hired you. That's impressive."

Diego upgrades to Pro. The white-label feature alone pays for itself in the first client.

**Requirements Revealed:**
- Survey templates for common use cases
- Multi-respondent aggregation
- Comparative visualizations (radar charts, alignment matrices)
- Calculated scores and recommendations (AI-generated insights)
- White-label branding (Pro feature)
- Professional export/presentation mode

---

### Journey 4: Carlos (The Colleague) — Viral Loop (Phase 1: Share Experience)

Carlos is a data analyst at María's company. He receives an email with a link: "Check out the Q4 report."

He clicks the link expecting the usual ugly Excel screenshot or a PDF of charts. Instead, he sees a professional dashboard. Interactive. Clean. The data is correct—he can tell because he helped María pull some of those numbers.

At the bottom, small text: "Made with LiquidRender."

Carlos clicks it. He's taken to a landing page. "Drop any file. See what it means."

Carlos is skeptical—he's a "data person," he knows how much work goes into dashboards. But he's curious. He drags a CSV he's been meaning to visualize for a side project.

Four seconds later, his data is a dashboard. Clean. Professional. With charts he would have spent an hour configuring in Python.

"Huh."

Carlos doesn't need LiquidRender for his main job—he has Tableau, Python, the whole stack. But for quick visualizations? For sharing with non-technical stakeholders? For that side project he never has time for?

He signs up. He tells two colleagues. The viral loop continues.

**Requirements Revealed:**
- Beautiful shared dashboard experience (no login required to view)
- Subtle but visible attribution ("Made with LiquidRender")
- Attribution links to landing page
- Compelling first-use experience for skeptical users
- Value for technical users (speed, convenience)

---

### Journey 5: Admin Elena — Platform Health (Internal: All Phases)

Elena works at LiquidRender (internal). She needs to understand platform health: Are dashboards rendering successfully? Which files fail most often? Are there cost overruns on AI generation?

She opens the internal admin dashboard (also built with LiquidRender, obviously). She sees:
- Render success rate: 87%
- Failed renders by file type: Excel macros cause 60% of failures
- AI cost per render: $0.032 (under budget)
- Queue depth: 2 requests (healthy)
- Cache hit rate: 45% (saving costs)

She notices Excel macro failures are spiking. She adds a note: "Consider better error messaging for macro-heavy files."

This is the product monitoring itself—using its own technology to ensure quality.

**Requirements Revealed:**
- Admin dashboard (internal)
- Render success/failure tracking
- Cost monitoring per generation
- Error categorization by file type
- Cache performance metrics
- Queue health monitoring

---

### Journey 6: Tomás — Stripe Revenue Dashboard (Phase 3: API Connection)

Tomás is a 28-year-old technical founder of a SaaS in early stage. He has Stripe with revenue data but lives in the Stripe dashboard that's limited. He wants a custom dashboard without hiring an analyst or spending hours in Metabase.

He arrives at LiquidRender and sees "Connect your data." He selects Stripe, completes OAuth in 2 clicks.

LiquidRender shows: "What do you want to see?"

Tomás types: "Monthly recurring revenue, churn rate, and top customers by lifetime value"

5 seconds later: Dashboard with MRR trend, churn gauge, and table of top customers.

He shares it with his investors: "Here's our metrics dashboard"

**"Holy shit" moment:** "I spent 2 minutes getting the dashboard I've wanted for 6 months"

**Requirements Revealed:**
- OAuth flow for Stripe
- Secure credential storage
- API data fetching
- Real-time or scheduled refresh
- Pre-built Stripe data transformations

---

### Journey 7: Lucía — PostgreSQL Operations Dashboard (Phase 3: DB Connection)

Lucía is a 35-year-old Operations Manager at a logistics company. She has a PostgreSQL database with order data, shipments, delivery times. She needs dashboards for her team but IT takes weeks on any request.

She connects her PostgreSQL (connection string + credentials). LiquidRender shows the schema: available tables.

Lucía types: "Orders per day, average delivery time, and pending orders by region"

LiquidRender generates query + dashboard. Dashboard auto-updates every hour. Lucía shares with her team: each one sees their region's data.

**"Holy shit" moment:** "This would have taken 3 IT tickets and 2 months of waiting"

**Requirements Revealed:**
- Secure credential storage (encrypted)
- Connection pooling
- Schema introspection
- AI → SQL generation
- Scheduled refresh
- Row-level security (by region)

---

### Journey 8: Andrea — Multi-Source Dashboard (Phase 3: MCP + Combined)

Andrea is a 30-year-old Growth Lead at a startup. She needs a dashboard that combines: Stripe (revenue), PostgreSQL (user activity), Google Sheets (manual targets), and HubSpot (leads).

She connects 4 sources in LiquidRender.

She types: "Show me revenue vs target, active users trend, and conversion from lead to paid"

LiquidRender:
- Fetches revenue from Stripe
- Queries users from PostgreSQL
- Reads targets from Google Sheets
- Gets leads from HubSpot via MCP

Generates a unified dashboard with data from all 4 sources.

She presents at the weekly: "Here's our growth dashboard"

**"Holy shit" moment:** "Before I had 4 tabs open and did calculations in my head. Now everything is in one place."

**Requirements Revealed:**
- Multi-source connections
- MCP client implementation
- Data normalization across sources
- Cross-source calculations
- Unified refresh strategy

---

### Journey 9: Alex — The Conversational Dashboard (Phase 4: Natural Language)

Alex is a 29-year-old Product Manager. He has LiquidRender with Stripe and PostgreSQL connected. He doesn't want to navigate menus. He just wants to ask.

He opens LiquidRender. Sees the prominent prompt bar.

Types: "How's our revenue doing this month compared to last month?"

LiquidRender:
- Identifies intent: temporal revenue comparison
- Identifies source: Stripe (has revenue data)
- Generates query to Stripe API
- Creates comparative dashboard

Alex sees: Current MRR vs previous, delta %, trend chart.

Alex continues: "Break it down by pricing tier"

Dashboard updates with breakdown by tier.

Alex: "Add our user signups from the database"

LiquidRender adds PostgreSQL data to existing dashboard.

**"Holy shit" moment:** "It's like talking to an analyst who knows all my data"

**Requirements Revealed:**
- Conversational UI (chat-like interface)
- Intent parsing from natural language
- Context awareness (what sources user has)
- Multi-turn conversation (refine dashboard iteratively)
- Cross-source queries from prompt
- Dashboard mutation (add/remove/modify from chat)

---

### Journey 10: Diego on the Go — Mobile Client Meeting (Mobile: View)

Diego is in a client meeting. The client asks: "How are our metrics doing this month?"

**Before LiquidRender Mobile:**
> "Let me check when I get back to the office..."

**With LiquidRender Mobile:**
1. Diego opens the app on his iPhone
2. Sees his list of client dashboards
3. Taps "Client X - Monthly Metrics"
4. Dashboard loads with real-time data (connected to client's Stripe)
5. Shows his phone to the client: "Here you go. MRR up 12%."
6. Client: "Wow, this is very convenient."

**"Holy shit" moment:** "I have all my client dashboards in my pocket"

**Requirements Revealed:**
- Mobile app for iOS and Android
- Dashboard list view
- Real-time data sync
- Responsive dashboard rendering on mobile
- Offline viewing capability (cached dashboards)

---

### Journey 11: María's Morning Commute — Mobile Quick Share (Mobile: Share)

María is on the subway to work. Her boss texted last night asking for the Q4 numbers.

**With LiquidRender Mobile:**
1. Opens the app, sees the dashboard she created last night
2. Verifies everything looks correct
3. Taps "Share" → copies link
4. Sends the link via Slack from her phone
5. Arrives at the office with the problem already solved

**"Holy shit" moment:** "I handled a work request before even getting to my desk"

**Requirements Revealed:**
- Quick access to recent dashboards
- Share functionality on mobile
- Deep linking to specific dashboards
- Sync between web and mobile

---

### Journey 12: Tomás — Churn Alert Push Notification (Mobile: Alerts)

Tomás configured an alert: "Notify me if churn exceeds 5%"

**The Experience:**
1. 3 PM: Push notification arrives: "⚠️ Churn Alert: 5.2% this month"
2. Tomás taps the notification, app opens directly to the churn dashboard
3. Sees breakdown by cohort
4. Identifies the problem: a specific pricing tier has elevated churn
5. Takes immediate action from anywhere

**"Holy shit" moment:** "My business metrics come to me, I don't have to hunt for them"

**Requirements Revealed:**
- Push notifications for configured alerts
- Deep linking to specific dashboards from notifications
- Background data sync for alert checking
- Alert configuration UI (web, viewable on mobile)

---

### Journey Requirements Summary

| Journey | User Type | Entry Point | Phase | Platform | Key Requirements |
|---------|-----------|-------------|-------|----------|------------------|
| María v1 | Primary (Professional) | File Drop | 1 | Web | File parsing, AI generation, share links |
| María v2 | Primary (Professional) | Survey Create | 2 | Web | NL survey, response collection, survey→dashboard |
| Diego | Primary (Consultant) | Survey + Brand | 2 | Web | Templates, white-label, calculated scores |
| Carlos | Secondary (Viral) | Shared Link | 1 | Web | Attribution, compelling view, easy conversion |
| Admin Elena | Internal | Admin Panel | All | Web | Metrics, monitoring, cost control |
| Tomás | Primary (Founder) | API Connect | 3 | Web | OAuth, Stripe integration, refresh |
| Lucía | Primary (Ops) | DB Connect | 3 | Web | PostgreSQL, SQL generation, row security |
| Andrea | Power User | Multi-source | 3 | Web | MCP, data normalization, cross-source |
| Alex | Power User | Prompt | 4 | Web | Conversational UI, multi-turn, context aware |
| Diego Mobile | Primary (Consultant) | Mobile App | 5 | **Mobile** | View dashboards, client meetings |
| María Mobile | Primary (Professional) | Mobile App | 5 | **Mobile** | Quick share, on-the-go access |
| Tomás Mobile | Primary (Founder) | Push Alert | 5 | **Mobile** | Notifications, deep linking, alerts |

**Coverage Achieved:**
- ✅ Phase 1: Primary User File (María v1), Viral Loop (Carlos)
- ✅ Phase 2: Survey Success (María v2), Survey Power User (Diego)
- ✅ Phase 3: API (Tomás), Database (Lucía), Multi-source (Andrea)
- ✅ Phase 4: Conversational (Alex)
- ✅ Phase 5: Mobile View (Diego), Mobile Share (María), Mobile Alerts (Tomás)
- ✅ Internal: Platform Health (Elena)

---

## Domain Strategy

### Platform Architecture

LiquidRender is a **horizontal platform** with **verticalized solutions**.

```
┌─────────────────────────────────────────────────────────────┐
│                    VERTICAL SOLUTIONS                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  SaaS    │  │Marketing │  │E-commerce│  │  HR/Ops  │    │
│  │ Metrics  │  │Analytics │  │  Intel   │  │ People   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    HORIZONTAL CORE                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LIQUID UI ENGINE                        │    │
│  │  • Universal schema rendering                        │    │
│  │  • Generic data connectors                           │    │
│  │  • Natural language understanding                    │    │
│  │  • Component catalog                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Core (Horizontal)

The horizontal layer is **domain-agnostic** and provides:

| Component | Purpose | Reusability |
|-----------|---------|-------------|
| Liquid UI Engine | Schema → UI rendering | 100% shared |
| Generic Connectors | File, API, DB, MCP adapters | 100% shared |
| Natural Language Layer | Intent parsing + query generation | 90% shared, 10% tuned |
| Component Catalog | Charts, KPIs, Tables, Layouts | 100% shared |
| Share Infrastructure | Links, embedding, attribution | 100% shared |

### Verticals (Segmented)

Each vertical is a **thin layer** on top of the horizontal core:

| Vertical Component | What It Contains | Effort to Add |
|--------------------|------------------|---------------|
| Landing Page | Vertical-specific copy, testimonials, examples | 1-2 days |
| Template Dashboards | 2-3 pre-built dashboards for common use cases | 2-3 days |
| AI Prompt Tuning | Domain terminology, metric definitions, best practices | 1 day |
| Priority Connectors | Pre-configured integrations for the vertical | Varies |
| Example Datasets | Demo data that feels real to the persona | 1 day |

### MVP Verticals (Phase 1-3)

#### 1. SaaS Metrics (Tomás Persona)

**Target:** Founders, Product Managers, Investors

**Key Metrics:**
- MRR / ARR trends
- Churn rate (monthly, annual)
- LTV / CAC ratio
- Cohort retention
- Revenue by plan tier

**Priority Connectors:**
- Stripe (primary)
- Paddle, Chargebee (secondary)
- PostgreSQL (user data)

**Template Dashboards:**
- "Investor Update Dashboard"
- "SaaS Health Score"
- "Cohort Analysis"

---

#### 2. Marketing Analytics (María Persona)

**Target:** Marketing Coordinators, Growth Leads, CMOs

**Key Metrics:**
- Campaign ROI
- Channel attribution
- CAC by source
- Conversion funnel
- Content performance

**Priority Connectors:**
- Google Ads
- Meta Ads
- LinkedIn Ads
- HubSpot / Salesforce
- Google Analytics

**Template Dashboards:**
- "Monthly Marketing Report"
- "Campaign Performance"
- "Attribution Overview"

---

### Future Verticals (Phase 4+)

| Vertical | Target Persona | Key Connectors | Timeline |
|----------|----------------|----------------|----------|
| **E-commerce** | Shopify store owners | Shopify, WooCommerce, Stripe | Month 4-5 |
| **HR / People Ops** | HR Managers, CHROs | BambooHR, Workday, surveys | Month 5-6 |
| **Finance** | CFOs, Controllers | QuickBooks, Xero, banks | Month 6-7 |
| **Healthcare** | Clinic admins, Patient Experience | EHR systems, surveys | Month 8+ |
| **Education** | School admins, EdTech | LMS systems, student data | Month 8+ |

### Vertical Implementation Pattern

Each new vertical follows a standardized checklist:

```markdown
## Vertical: [Name]

### Launch Checklist
- [ ] Landing page with vertical-specific copy
- [ ] Hero example dashboard (screenshot + live demo)
- [ ] 2-3 template dashboards
- [ ] AI prompt tuning for domain terminology
- [ ] Priority connectors pre-configured
- [ ] Example datasets for demo
- [ ] 3 customer testimonials (or beta feedback)
- [ ] SEO keywords targeted

### Success Metrics
- [ ] Vertical landing page → signup conversion >5%
- [ ] Template usage rate >30% for vertical users
- [ ] Vertical-specific NPS >40
```

### Vertical Strategy Implications

**For MVP (Phase 1-2):**
- Generic landing page only
- No vertical-specific templates yet
- AI understands general data, not domain-specific

**For Phase 3:**
- Launch SaaS Metrics vertical (Stripe is primary connector anyway)
- Marketing Analytics vertical (María is primary persona anyway)

**For Phase 4+:**
- Vertical expansion becomes a growth lever
- Each vertical = new TAM segment
- Vertical templates reduce AI generation cost (cache hits)

**Key Insight:**
> The horizontal platform is the moat. The verticals are the go-to-market wedges.
> Build the engine once. Sell it a hundred ways.

---

## Innovation & Novel Patterns

### The Liquid UI Paradigm

LiquidRender introduces a fundamentally new approach to interface generation:

```
┌─────────────────────────────────────────────────────────────┐
│                    TRADITIONAL APPROACH                      │
│                                                             │
│   Intent → AI → Code → (breaks) → Debug → Render            │
│                                                             │
│   Problem: AI-generated code is unreliable, hard to fix     │
├─────────────────────────────────────────────────────────────┤
│                    LIQUID UI APPROACH                        │
│                                                             │
│   Intent → AI → Schema → Validate → Render                  │
│                    ↓         ↓                              │
│                 (Zod)    (Always works)                     │
│                                                             │
│   Innovation: AI generates DATA, not CODE                   │
└─────────────────────────────────────────────────────────────┘
```

**Why This Matters:**
- AI is good at structured data generation
- AI is bad at syntactically correct code
- Zod validation catches 100% of schema errors before render
- React components are pre-built and tested — never broken
- Result: Reliability by construction, not by debugging

### Detected Innovation Areas

| Innovation | Description | Novelty Level |
|------------|-------------|---------------|
| **Schema-First AI** | AI generates validated JSON schemas, not raw code | High — Novel pattern |
| **Intent → Interface** | Natural language directly to rendered UI | High — Emerging field |
| **Universal Data Abstraction** | Files, APIs, DBs, MCP all become "ParsedData" | Medium — Novel combination |
| **Identity Transformation** | Product eliminates "I'm not a data person" barrier | Medium — UX innovation |
| **Viral Output** | Users share dashboards, each share is a demo | Medium — GTM innovation |

### The Core Innovation: LiquidSchema

LiquidSchema is the contract between AI and UI:

```typescript
interface LiquidSchema {
  version: "1.0";
  title: string;
  layout: LayoutBlock;
  blocks: Block[];
  bindings: Binding[];
  data: ParsedData;
}
```

**Why It's Innovative:**

1. **Declarative, not imperative** — Schema says WHAT, renderer decides HOW
2. **Validated at the boundary** — Zod schema catches all AI errors
3. **Composable** — Blocks can be nested, reused, extended
4. **Portable** — Same schema renders on web, mobile, PDF (future)
5. **Cacheable** — Identical data → identical schema → skip AI call

### Market Context & Competitive Landscape

| Competitor | Approach | Why LiquidRender is Different |
|------------|----------|------------------------------|
| **Tableau / Power BI** | Learn the tool, build manually | We eliminate the learning curve entirely |
| **ChatGPT + Code Interpreter** | AI generates Python code | Code breaks; our schemas never break |
| **Metabase / Superset** | Connect DB, write SQL | We generate SQL from natural language |
| **Google Data Studio** | Template-based, manual config | We auto-generate from any data source |
| **Julius AI** | Chat-based data analysis | We output shareable dashboards, not chat responses |

**Gap in the Market:**
No product delivers instant, beautiful, shareable visualization without requiring the user to learn anything or write any code.

### Validation Approach

**How We Validate the Innovation Works:**

| Validation | Method | Success Signal |
|------------|--------|----------------|
| **Schema reliability** | 100% Zod validation pass rate | Zero broken dashboards in production |
| **AI generation quality** | >80% first-attempt success rate | <20% need Corrector agent |
| **User acceptance** | Second file upload rate >40% | Users trust it's not luck |
| **Market fit** | Share rate >15% | Users proud enough to show others |
| **Developer adoption** | npm package downloads (Phase 2) | B2D market validates paradigm |

**Proof Points to Collect:**
- [ ] 1,000 dashboards generated without UI errors
- [ ] Average generation time <10 seconds
- [ ] Cache hit rate >30% (schemas are predictable)
- [ ] User quote: "I can't believe this works"

### Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **AI generates invalid schema** | Medium | High | Zod validation + Corrector agent retry |
| **Schema can't express user intent** | Low | High | Extensible component catalog, feedback loop |
| **Performance at scale** | Medium | Medium | Caching, queue management, CDN for static assets |
| **Competitor copies approach** | Medium | Low | Execution speed, network effects from viral sharing |
| **AI costs unsustainable** | Medium | High | Aggressive caching, token limits, tiered usage |

**Fallback Strategy:**
If AI generation fails after retry:
1. Show graceful error with specific feedback
2. Offer template-based fallback ("Choose a dashboard type")
3. Log failure for model improvement
4. Never show broken UI — always valid schema or nothing

### Innovation Implications for PRD

**Features that depend on innovation:**

| Feature | Innovation Dependency | Risk Level |
|---------|----------------------|------------|
| AI dashboard generation | Schema-first approach | Core — must work |
| Sub-10-second render | AI speed + caching | High priority |
| Any data source → dashboard | Universal ParsedData abstraction | Core — must work |
| Natural language queries | Intent → Schema mapping | Phase 4 dependent |
| Liquid UI npm package | Schema portability | Phase 2 strategic |

**What We're NOT Innovating:**
- Auth, billing, storage — use TurboStarter
- File parsing — use established libraries (xlsx, papaparse)
- Chart rendering — use Recharts/Tremor
- AI infrastructure — use Mastra + Anthropic

> **Principle:** Innovate only where it creates differentiation. Use boring technology everywhere else.

---

## Project Type Specific Requirements

### Platform Classification

LiquidRender is a **multi-platform product** combining three project types:

| Type | Classification | Platform | Phase |
|------|----------------|----------|-------|
| **Web Application** | Primary | Next.js (TurboStarter) | 1-4 |
| **Mobile Application** | Secondary | Expo (TurboStarter Mobile) | 5 |
| **Developer Tool** | Strategic | npm packages | 2+ |

### Web Application Requirements

**Technical Stack (TurboStarter Foundation):**

| Layer | Technology | Decision |
|-------|------------|----------|
| Framework | Next.js 14+ | App Router, Server Components |
| Styling | Tailwind CSS + shadcn/ui | TurboStarter default |
| State | React Query + Zustand | TurboStarter pattern |
| API | Hono | TurboStarter API layer |
| Database | PostgreSQL + Drizzle | TurboStarter ORM |
| Auth | Better Auth | TurboStarter auth |
| Hosting | Vercel | Default deployment |

**Browser Support:**

| Browser | Support Level |
|---------|---------------|
| Chrome (last 2 versions) | Full |
| Firefox (last 2 versions) | Full |
| Safari (last 2 versions) | Full |
| Edge (last 2 versions) | Full |
| IE11 | Not supported |
| Mobile browsers | Full (responsive) |

**SEO Strategy:**

| Page Type | SEO Approach |
|-----------|--------------|
| Landing page | Full SSR, meta tags, structured data |
| Marketing pages | SSR, blog posts indexed |
| Dashboard app | No indexing (authenticated) |
| Shared dashboards | Optional meta tags, og:image |

**Performance Targets:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP | <2.5s | Landing page |
| FID | <100ms | Interactive elements |
| CLS | <0.1 | Layout stability |
| Dashboard load | <3s | Cached dashboard |
| AI generation | <10s | P95 latency |

**Accessibility:**

| Standard | Target | Notes |
|----------|--------|-------|
| WCAG | 2.1 AA | Minimum compliance |
| Keyboard nav | Full | All interactive elements |
| Screen readers | Compatible | ARIA labels on charts |
| Color contrast | 4.5:1 | Text, 3:1 for large text |

### Mobile Application Requirements

**Technical Stack (TurboStarter Mobile):**

| Layer | Technology | Decision |
|-------|------------|----------|
| Framework | Expo SDK 52+ | Managed workflow, New Architecture |
| UI | Uniwind + React Native Reusables | Tailwind CSS with headless components |
| Navigation | Expo Router | File-based routing |
| State | React Query + Zustand | Shared with web |
| API | Same backend | Reuse Hono API |
| Auth | Better Auth | Shared sessions |
| Push | Expo Push + FCM/APNs | Native notifications |

**Project Structure:**

```
apps/mobile/
├── src/
│   ├── app/           # Expo Router screens
│   ├── components/    # Mobile-specific components
│   │   └── ui/        # React Native Reusables (shadcn-like)
│   └── lib/           # Utilities
└── app.config.ts      # Expo config
```

**UI Component Strategy:**

- **Uniwind**: Tailwind CSS for React Native (class-based styling)
- **React Native Reusables**: Copy/paste primitives styled with Uniwind
- **Universal Components**: Leverage `@rn-primitives/*` for accessible base components
- **Dark Mode**: Automatic via `useColorScheme()` + CSS variables

**Platform Support:**

| Platform | Minimum Version | Notes |
|----------|-----------------|-------|
| iOS | 14.0+ | iPhone, iPad |
| Android | API 24+ (7.0) | Phones, tablets |

**Device Permissions:**

| Permission | Usage | Required |
|------------|-------|----------|
| Internet | API calls | Yes |
| Push Notifications | Alerts | Optional |
| Camera | Future: scan QR | No (MVP) |
| Storage | Offline cache | Yes |

**Offline Capabilities:**

| Feature | Offline Support | Sync Strategy |
|---------|-----------------|---------------|
| View cached dashboards | ✅ | Background sync when online |
| View dashboard list | ✅ | Cache with TTL |
| Share links | ❌ | Requires connection |
| Push notifications | N/A | Requires connection to receive |
| Live data refresh | ❌ | Requires connection |

**App Store Compliance:**

| Requirement | Approach |
|-------------|----------|
| Privacy Policy | Required, link in app |
| Data handling | GDPR-compliant |
| In-app purchases | Use Stripe web, not IAP |
| Content guidelines | No user-generated offensive content |

### Developer Tool Requirements (Liquid UI Packages)

**Package Distribution:**

| Package | Registry | Audience |
|---------|----------|----------|
| `@liquidrender/core` | npm | All developers |
| `@liquidrender/react` | npm | React developers |
| `@liquidrender/react-native` | npm | Mobile developers |

**Language Support:**

| Language | Support Level |
|----------|---------------|
| TypeScript | First-class (source language) |
| JavaScript | Transpiled, full support |
| Other | Not in MVP |

**Installation Methods:**

```bash
# npm
npm install @liquidrender/core @liquidrender/react

# pnpm (monorepo)
pnpm add @liquidrender/core @liquidrender/react

# yarn
yarn add @liquidrender/core @liquidrender/react
```

**API Surface:**

| Export | Type | Description |
|--------|------|-------------|
| `LiquidSchema` | Type | Core schema interface |
| `LiquidRenderer` | Component | Main render component |
| `validateSchema` | Function | Zod validation |
| `parseFile` | Function | File → ParsedData |
| `BlockRegistry` | Object | Component catalog |

**Documentation:**

| Doc Type | Location | Phase |
|----------|----------|-------|
| README | Each package | MVP |
| API Reference | JSDoc + generated | MVP |
| Examples | `/examples` folder | MVP |
| Full docs site | docs.liquidrender.com | Phase 2 |

### Shared Component Catalog

Components must work across web and mobile with consistent theming:

| Component | Web (React) | Mobile (RN) | Notes |
|-----------|-------------|-------------|-------|
| BarChart | Recharts | Victory Native | Same schema, different renderer |
| LineChart | Recharts | Victory Native | |
| PieChart | Recharts | Victory Native | |
| KPICard | shadcn/ui | React Native Reusables | Uniwind for shared Tailwind classes |
| DataTable | TanStack Table | RN FlatList + Reusables | Different but compatible |
| Layout Grid | CSS Grid | Flexbox | Platform-specific |
| Button | shadcn/ui | @rn-primitives/slot | Accessible, styled with Tailwind |
| Card | shadcn/ui | React Native Reusables | CSS variables for theming |

**Design Token Strategy:**

```typescript
// packages/liquid-ui/core/tokens.ts
export const tokens = {
  colors: {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  // ... shared across platforms
};
```

### Real-Time Requirements

| Feature | Real-Time Need | Implementation |
|---------|----------------|----------------|
| Dashboard view | No (refresh on demand) | React Query refetch |
| Live connections | Yes (scheduled) | Background job + webhook |
| Alerts | Near real-time | Push notifications |
| Multi-user edit | No (single owner) | N/A for MVP |

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP
- Build the foundation (Liquid UI paradigm) that enables all future input sources
- Phase 1 proves the core magic: File → Dashboard in <10 seconds
- Each phase adds input sources to the same rendering engine

**Resource Requirements:**

| Phase | Team | Key Skills | Duration |
|-------|------|------------|----------|
| Phase 1: Core | 1 solo founder | Full-stack, AI integration, product | 4 weeks |
| Phase 2: Survey | 1 solo founder | Reuse SurveyEngine, extend UI | 2 weeks |
| Phase 3: Connections | 1 solo founder | OAuth, DB, MCP integration | 4 weeks |
| Phase 4: Conversational | 1 solo founder | LLM orchestration, UX | 2 weeks |
| Phase 5: Mobile | 1 solo founder | React Native, Expo | 4 weeks |

**Critical Assumption:** Solo founder velocity is sustained. If blocked, prioritize Phase 1 perfection over Phase 2 start.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1: María — First Dashboard (the "holy shit" moment)
- Journey 2: María — Comes Back (retention validation)
- Journey 3: Diego — Client Deliverable (professional use case)
- Journey 4: Carlos — Hits the Wall (conversion trigger via viral loop)

**Must-Have Capabilities:**

| Capability | Why Essential | Week |
|------------|---------------|------|
| File parsing (Excel, CSV, JSON) | Core input source | 1 |
| LiquidSchema + Zod validation | Reliability by construction | 1 |
| Component catalog (5-7 blocks) | Render variety | 1 |
| AI dashboard generation (Mastra + Claude) | Core magic | 2 |
| Semantic cache (Upstash Redis) | Cost + speed | 2 |
| Landing page with drop zone | User entry | 3 |
| Dashboard viewer + share link | Core output + viral | 3 |
| Google OAuth | Retention (save dashboards) | 4 |
| Free tier limits (5/month) | Conversion trigger | 4 |

**Explicitly NOT in Phase 1:**
- Survey creation (Phase 2)
- API/DB connections (Phase 3)
- Conversational interface (Phase 4)
- Mobile app (Phase 5)
- Voice input (Future)
- Team collaboration (Future)
- Custom themes (Future)

### Post-MVP Features

**Phase 2 (Week 5-6): Survey → Dashboard**
- AI Survey Generator agent
- Survey distribution + response collection
- Response → ParsedData adapter
- Survey-optimized templates (NPS gauge, word cloud)

**Phase 3 (Week 7-10): Connections → Dashboard**
- OAuth API integration (Stripe first)
- Database connections (PostgreSQL)
- MCP client implementation
- Multi-source dashboards
- Scheduled refresh

**Phase 4 (Week 11-12): Conversational Interface**
- Chat-based dashboard creation
- Intent parsing from natural language
- Context-aware multi-turn conversation
- Dashboard mutation via prompt

**Phase 5 (Week 13-16): Mobile Platform**
- iOS + Android app (Expo)
- Dashboard viewing + sharing
- Offline caching
- Push notifications for alerts

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI generation fails >20% | Medium | High | Corrector agent + fallback templates |
| Schema validation blocks renders | Low | High | Pre-validated template library |
| File parsing edge cases | High | Medium | Clear error messages, supported formats list |
| Cost per dashboard > $0.10 | Medium | Medium | Aggressive caching, token limits |

**Market Risks:**

| Risk | Probability | Impact | Validation Approach |
|------|-------------|--------|---------------------|
| Users don't share dashboards | Medium | High | A/B test share prompts, incentives |
| "Holy shit" moment doesn't convert | Medium | High | Test signup triggers, free tier limits |
| Diego persona doesn't exist | Low | High | Outreach to 5 freelancers Week 1 |
| Price sensitivity on B2C | High | Medium | Generous free tier, low entry price |

**Resource Risks:**

| Risk | Probability | Impact | Contingency |
|------|-------------|--------|-------------|
| Solo founder burnout | Medium | Critical | Strict 4-week sprints, clear scope cuts |
| Feature creep | High | Medium | Phase gates are HARD gates |
| Technical debt | Medium | Medium | Architecture doc before Week 1 code |

**Minimum Viable Team:**
- **Phase 1-4:** 1 solo founder (full-stack + AI + product)
- **Phase 5 (optional):** Consider contract React Native developer if velocity drops

**Scope Cut Priority:**
If behind schedule, cut in this order:
1. Voice input (already Future)
2. MCP integration (keep Stripe + PostgreSQL)
3. Push notifications (keep offline caching)
4. Multi-source dashboards (keep single-source)

### Phase Gate Decisions

| Gate | Checkpoint | Pass Criteria | Fail Action |
|------|------------|---------------|-------------|
| **Phase 1 → 2** | Week 4 | >100 dashboards, >30 users, >10 shares | Iterate on core, don't proceed |
| **Phase 2 → 3** | Week 6 | Survey adoption >20% of active users | Evaluate survey PMF |
| **Phase 3 → 4** | Week 10 | >50 connected data sources | Focus on connection quality |
| **Phase 4 → 5** | Week 12 | Conversational used >30% of sessions | Evaluate mobile necessity |
| **Launch** | Week 16-20 | 1,000 dashboards, 300 users, €500 MRR | Celebrate or iterate |

---

## Functional Requirements

### Data Input & Parsing

- FR1: Users can upload files via drag-and-drop without authentication
- FR2: System can parse Excel files (.xlsx, .xls) and extract tabular data
- FR3: System can parse CSV files and extract tabular data
- FR4: System can parse JSON files and extract structured data
- FR5: System can detect column types (numeric, date, text, currency) from parsed data
- FR6: Users can view parsing errors with actionable feedback when files fail

### Dashboard Generation

- FR7: System can generate a dashboard schema from parsed data using AI
- FR8: System can validate all AI-generated schemas before rendering
- FR9: System can render dashboards from validated LiquidSchema
- FR10: Users can view automatically extracted KPIs with trend indicators
- FR11: Users can view generated charts (bar, line, pie) based on data patterns
- FR12: Users can view formatted data tables within dashboards
- FR13: System can retry failed AI generations with a Corrector agent
- FR14: System can provide template-based fallback when AI generation fails

### AI-Assisted Input

- FR15: Users can provide a natural language prompt alongside file upload to guide dashboard generation

### Dashboard Visualization

- FR16: System can render Mermaid diagrams (flowcharts, sequence, gantt) within dashboards

### Dashboard Management

- FR17: Users can view their list of created dashboards
- FR18: Users can view a specific dashboard by ID
- FR19: Users can delete their own dashboards
- FR20: Users can see dashboard creation timestamp and last updated time
- FR21: Authenticated users can save dashboards to their account

### Sharing & Viral Loop

- FR22: Users can generate a shareable link for any dashboard
- FR23: Recipients can view shared dashboards without authentication
- FR24: Shared dashboards display attribution ("Made with LiquidRender")
- FR25: Attribution links direct viewers to the landing page

### User Authentication & Accounts

- FR26: Users can sign up and sign in using Google OAuth
- FR27: Users can view their account information
- FR28: Users can sign out of their account
- FR29: System can associate dashboards with authenticated user accounts

### Subscription & Billing

- FR30: Users can view their current subscription tier and limits
- FR31: Users can upgrade from free to paid subscription
- FR32: Free tier users can create up to 5 dashboards per month
- FR33: System can enforce dashboard creation limits per subscription tier
- FR34: Users can manage their billing information via Stripe

### Survey Creation (Phase 2)

- FR35: Users can create surveys using natural language descriptions
- FR36: System can generate survey questions from natural language input
- FR37: Users can preview and edit AI-generated survey questions
- FR38: Users can add conditional logic to survey questions
- FR39: Users can customize survey branding (logo, colors)
- FR40: Users can generate shareable survey distribution links
- FR41: Respondents can complete surveys without authentication
- FR42: System can collect and store survey responses
- FR43: System can transform survey responses into dashboard-compatible data
- FR44: Users can view survey-specific visualizations (NPS gauge, word clouds)

### API Connections (Phase 3)

- FR45: Users can connect Stripe accounts via OAuth
- FR46: Users can connect PostgreSQL databases via connection string
- FR47: System can securely store connection credentials (encrypted)
- FR48: System can fetch data from connected Stripe accounts
- FR49: System can execute queries against connected PostgreSQL databases
- FR50: System can generate SQL queries from natural language input
- FR51: Users can configure scheduled data refresh intervals
- FR52: System can refresh dashboard data on configured schedules

### MCP Integration (Phase 3)

- FR53: Users can configure MCP server connections
- FR54: System can fetch data from MCP-compatible data sources
- FR55: Users can combine data from multiple sources in a single dashboard

### Conversational Interface (Phase 4)

- FR56: Users can enter natural language prompts to create dashboards
- FR57: System can parse user intent from natural language input
- FR58: System can identify relevant data sources for user queries
- FR59: Users can refine dashboards through multi-turn conversation
- FR60: Users can modify existing dashboards via conversational commands

### Mobile Viewing (Phase 5)

- FR61: Mobile users can view their list of dashboards
- FR62: Mobile users can view individual dashboards with responsive layout
- FR63: Mobile users can search and filter their dashboards
- FR64: Mobile users can share dashboard links from the app
- FR65: System can cache dashboards for offline mobile viewing
- FR66: System can sync dashboard changes between web and mobile

### Push Notifications & Alerts (Phase 5)

- FR67: Users can configure metric-based alert thresholds
- FR68: System can monitor connected data sources for alert conditions
- FR69: System can send push notifications when alerts trigger
- FR70: Mobile users can tap notifications to navigate directly to dashboards

### White-Label & Professional Features (Pro)

- FR71: Pro users can customize dashboard branding (remove attribution)
- FR72: Pro users can export dashboards in presentation formats
- FR73: Pro users can access premium dashboard templates

### Platform Administration (Internal)

- FR74: Admins can view dashboard generation success/failure rates
- FR75: Admins can view AI generation costs per render
- FR76: Admins can view cache performance metrics
- FR77: Admins can view error categorization by file type
- FR78: Admins can view system queue health

### Caching & Cost Control

- FR79: System can cache generated schemas by file content hash
- FR80: System can serve cached schemas for repeated file patterns
- FR81: System can enforce token limits on AI generation requests

### Voice Interface (Future)

- FR82: System can provide voice response summarizing dashboard contents
- FR83: Users can interact with dashboards via voice commands

## Non-Functional Requirements

### Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| NFR-P1: Dashboard generation latency | <10 seconds P95 | Time from file drop to rendered dashboard |
| NFR-P2: Schema caching hit rate | >60% after 30 days | Cache hits / total requests |
| NFR-P3: UI interaction responsiveness | <100ms | Time to visual feedback on user actions |
| NFR-P4: File upload processing | <3 seconds for 10MB | Time from upload complete to parsing done |
| NFR-P5: API data refresh | <5 seconds | Time to fetch and re-render connected source |
| NFR-P6: Mobile app launch | <2 seconds | Cold start to dashboard list visible |
| NFR-P7: Concurrent AI requests | 50 simultaneous | Load testing benchmark |

### Security

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| NFR-S1: Data encryption at rest | AES-256 | User files and credentials protection |
| NFR-S2: Data encryption in transit | TLS 1.3 | All API and webhook traffic |
| NFR-S3: Credential storage | Encrypted vault (Infisical) | API keys, OAuth tokens, DB strings |
| NFR-S4: Authentication | Google OAuth 2.0 | No password storage liability |
| NFR-S5: Session management | JWT with 7-day refresh | Stateless, revocable tokens |
| NFR-S6: File validation | Type, size, content scanning | Prevent malicious uploads |
| NFR-S7: SQL injection prevention | Parameterized queries only | Database connection security |
| NFR-S8: Rate limiting | 100 req/min unauthenticated | Abuse prevention |
| NFR-S9: Audit logging | All admin actions, auth events | Compliance and debugging |

### Scalability

| Requirement | Target | Phase |
|-------------|--------|-------|
| NFR-SC1: User capacity | 10,000 monthly active users | Phase 1-2 |
| NFR-SC2: Dashboard storage | 50 dashboards per free user | All phases |
| NFR-SC3: Concurrent connections | 1,000 simultaneous | Phase 3+ |
| NFR-SC4: Data source connections | 10 per user (Pro) | Phase 3 |
| NFR-SC5: Horizontal scaling | Serverless auto-scale | Architecture requirement |

### Reliability

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| NFR-R1: System availability | 99.5% uptime | Monthly SLA |
| NFR-R2: Dashboard rendering success | >95% | Successful renders / attempts |
| NFR-R3: Data persistence | Zero data loss | Backup and recovery testing |
| NFR-R4: Graceful degradation | Core features during partial outage | Fallback to cached schemas |
| NFR-R5: Error recovery | Auto-retry with exponential backoff | Failed AI/API calls |

### Accessibility

| Requirement | Target | Standard |
|-------------|--------|----------|
| NFR-A1: Web accessibility | WCAG 2.1 Level AA | Legal compliance |
| NFR-A2: Keyboard navigation | Full dashboard interaction | Inclusive design |
| NFR-A3: Screen reader support | All dashboard elements labeled | ARIA compliance |
| NFR-A4: Color contrast | 4.5:1 minimum | Chart and UI readability |
| NFR-A5: Mobile accessibility | iOS/Android native patterns | Platform guidelines |
| NFR-A6: Reduced motion | Respect prefers-reduced-motion | User preference |

### Cost Control

| Requirement | Target | Mechanism |
|-------------|--------|-----------|
| NFR-C1: AI cost per dashboard | <$0.05 average | Token limits + caching |
| NFR-C2: Cache effectiveness | 60% cost reduction | Schema reuse |
| NFR-C3: Free tier sustainability | <$0.25 per free user/month | Limit enforcement |
| NFR-C4: Infrastructure efficiency | Serverless + edge caching | Vercel + Upstash |
| NFR-C5: Cost visibility | Real-time per-render tracking | Admin dashboard |

### Maintainability

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| NFR-M1: Code coverage | >80% for core functions | Vitest + Playwright |
| NFR-M2: Type safety | 100% TypeScript strict | No `any` types in core |
| NFR-M3: Documentation | All public APIs documented | TSDoc + README per package |
| NFR-M4: Deployment frequency | Multiple times daily | CI/CD automation |
| NFR-M5: Schema evolution | Backward compatible versions | LiquidSchema versioning |

### Mobile-Specific

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| NFR-MB1: Offline viewing | Last 10 dashboards cached | Connectivity resilience |
| NFR-MB2: Battery efficiency | <5% drain per hour active | Background optimization |
| NFR-MB3: App size | <50MB initial download | App Store optimization |
| NFR-MB4: Push notification delivery | >95% within 60 seconds | Alert reliability |
| NFR-MB5: Biometric auth | FaceID/TouchID support | Premium security option |

