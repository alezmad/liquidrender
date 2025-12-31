# Knosia: Complete Product Vision

> **The data scientist businesses can't afford, delivered as a conversation.**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Philosophy](#2-design-philosophy)
3. [Architecture: Shell + Liquid](#3-architecture-shell--liquid)
4. [Interface Structure](#4-interface-structure)
5. [The Notebook Paradigm](#5-the-notebook-paradigm)
6. [Intelligence Layer](#6-intelligence-layer)
7. [Data Trust & Transparency](#7-data-trust--transparency)
8. [Conversation System](#8-conversation-system)
9. [Personalization Engine](#9-personalization-engine)
10. [Collaboration & Sharing](#10-collaboration--sharing)
11. [Actions & Automation](#11-actions--automation)
12. [Multi-Modal Experience](#12-multi-modal-experience)
13. [Learning & Adaptation](#13-learning--adaptation)
14. [User Journeys](#14-user-journeys)
15. [Screen Specifications](#15-screen-specifications)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Technical Specifications](#17-technical-specifications)

---

## 1. Executive Summary

### What Knosia Is

Knosia transforms raw business data into actionable knowledge through conversation. Connect your database, and within 60 seconds you have a personalized briefing, vocabulary that speaks your language, and AI that understands your business.

### The Core Problem

Every company has data and BI tools, but nobody has solved the vocabulary problem. "Active Users" means different things to Engineering, Product, Sales, and the CEO. This misalignment costs companies millions in miscommunication, wrong decisions, and lost trust in data.

### The Solution

Knosia becomes the company's semantic layer — establishing shared vocabulary, providing role-aware intelligence, and enabling conversation-driven analytics. It's not a dashboard you stare at; it's a colleague you talk to.

### Key Differentiators

| Traditional BI | Knosia |
|----------------|--------|
| Static dashboards | Living, conversational workspace |
| Query builders | Natural language |
| Role-based permissions | Role-based intelligence |
| Manual reports | Proactive insights |
| Data visualization | Data + context + action |
| Learn the tool | Tool learns you |

---

## 2. Design Philosophy

### Colleague, Not Cockpit

Traditional BI tools are **cockpits** — dense control panels where you're the pilot, responsible for monitoring dozens of gauges and making sense of it all.

Knosia is a **colleague** — someone who prepared for your meeting, knows what you care about, and speaks your language. You don't interrogate Knosia; you have a conversation.

```
COCKPIT MENTALITY:                    COLLEAGUE MENTALITY:
┌────────────────────────────┐        ┌────────────────────────────┐
│ [chart] [chart] [chart]    │        │                            │
│ [chart] [KPI] [KPI] [KPI]  │        │  "Good morning, Alex.      │
│ [table with 15 columns]    │        │   Revenue is up 12%.       │
│ [filter] [filter] [filter] │        │   One thing to watch:      │
│ [more charts]              │        │   APAC churn is spiking."  │
│                            │        │                            │
│ "Figure it out yourself"   │        │  "What would you like to   │
│                            │        │   explore?"                │
└────────────────────────────┘        └────────────────────────────┘
```

### Design Principles

1. **Delta-First** — Show what changed, not just what is
2. **Conversation Over Configuration** — Talk, don't click through menus
3. **Progressive Disclosure** — Start simple, add complexity on demand
4. **Transparency By Default** — Every number can be explained and traced
5. **Action-Oriented** — Don't just inform, enable action
6. **Ambient Intelligence** — Surface insights proactively, not intrusively
7. **Role-Aware** — Same data, different lens based on who's looking
8. **Memory** — Remember context, learn preferences, improve over time

### Visual Identity

```
COLORS:
────────────────────────────────────────────────────────────────
Background (primary):    #0A0A0B    Near-black with warmth
Background (elevated):   #141415    Cards, sidebars
Background (hover):      #1C1C1E    Interactive states

Foreground (primary):    #FAFAFA    Main text
Foreground (muted):      #71717A    Secondary text
Foreground (subtle):     #52525B    Tertiary, timestamps

Accent (warm):           #E5C07B    Headlines, KPIs — approachable amber
Accent (success):        #98C379    Positive trends — sage green
Accent (warning):        #E5C07B    Attention needed — amber
Accent (danger):         #E06C75    Critical alerts — soft red
Accent (info):           #61AFEF    Links, actions — calm blue

TYPOGRAPHY:
────────────────────────────────────────────────────────────────
Font Family:             Geist (body), Geist Mono (numbers, code)
Headline:                28-32px, weight 600, tracking -0.02em
KPI Value:               48-64px, weight 700, Geist Mono
Body:                    14-16px, weight 400, line-height 1.6
Caption:                 12px, weight 400, muted foreground

SPACING:
────────────────────────────────────────────────────────────────
Base unit:               4px
Content padding:         24px (desktop), 16px (mobile)
Card padding:            20px
Block gap:               16px
Section gap:             32px
```

---

## 3. Architecture: Shell + Liquid

### The Paradigm Shift

Knosia's interface is not traditionally built. It's divided into two layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                     KNOSIA = SHELL + LIQUID                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SHELL (React, fixed):              LIQUID (DSL, malleable):    │
│  ┌──────────────────┐               ┌──────────────────────┐    │
│  │ • Auth wrapper   │               │ • Briefing layout    │    │
│  │ • Voice input    │   renders →   │ • KPIs, charts       │    │
│  │ • Render canvas  │               │ • Tables, lists      │    │
│  │ • Context bar    │               │ • Navigation items   │    │
│  │ • Sidebar frame  │               │ • ANY of 77 blocks   │    │
│  └──────────────────┘               └──────────────────────┘    │
│                                                                  │
│  User: "Make that a bar chart"  →  DSL updates  →  Instant      │
│  User: "Add revenue by region"  →  New block    →  <2 seconds   │
│  User: "Simplify this view"     →  Layout shift →  Done         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Matters

1. **User Customization Without Code** — Users reshape their interface via voice
2. **Sub-2-Second Rendering** — LiquidRender generates visualizations instantly
3. **Saveable Views** — DSL can be stored, versioned, shared
4. **AI-Native** — AI generates DSL, which renders to UI

### The Data Flow

```
Voice/Text Input
       │
       ▼
┌──────────────────┐
│   AI + Context   │ ← Vocabulary, Schema, Role, History
│   (generates)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   DSL (JSON)     │ ← Declarative UI specification
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  LiquidRender    │ ← 77 components available
│  (renders)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Canvas UI      │ ← User sees visualization
└──────────────────┘
         │
         ▼
   User can save as:
   • Snapshot (DSL + frozen data)
   • Living View (DSL + live query)
```

---

## 4. Interface Structure

### The Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [⚙️]                                                    Config │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SIDEBAR              │           CANVAS                         │
│  ┌─────────────────┐  │                                         │
│  │ 📌 Saved Views  │  │   ┌─────────────────────────────────┐   │
│  │    Weekly Rev   │  │   │                                 │   │
│  │    Sales Pipe   │  │   │    LiquidRender blocks grow     │   │
│  │    + New View   │  │   │    here as user asks questions  │   │
│  ├─────────────────┤  │   │                                 │   │
│  │ 💡 Suggested    │  │   │    Jupyter-style progressive    │   │
│  │    (1 nudge)    │  │   │    notebook experience          │   │
│  ├─────────────────┤  │   │                                 │   │
│  │ 💬 Sessions     │  │   │                                 │   │
│  │    Today        │  │   │                                 │   │
│  │    ⭐ Starred   │  │   └─────────────────────────────────┘   │
│  │    📁 Archived  │  │                                         │
│  │    Dec 28       │  │                                         │
│  │    Dec 27       │  │                                         │
│  └─────────────────┘  │                                         │
│                       │                                         │
├───────────────────────┴─────────────────────────────────────────┤
│ [👤]  │  ✨ Ask anything...                            [🎤]     │
└─────────────────────────────────────────────────────────────────┘
```

### Fixed Elements (Shell)

| Element | Position | Purpose |
|---------|----------|---------|
| **Config Button** | Top right | Settings, connections, profile |
| **Avatar** | Bottom left | User profile, quick actions |
| **Prompt Input** | Bottom center, floating | Text/voice input, always accessible |
| **Sidebar** | Left | Saved views, sessions, suggestions |
| **Context Bar** | Top of canvas | Data freshness, connection status |
| **Canvas** | Center | LiquidRender output zone |

### Sidebar Sections

```
┌─────────────────────────────────────┐
│ 📌 SAVED VIEWS                      │  ← User-created dashboards
│    Drag to reorder, always on top   │     (Living Views or Snapshots)
│                                     │
├─────────────────────────────────────┤
│ 💡 SUGGESTED                        │  ← AI-surfaced nudges
│    Max 1-2, easily dismissible      │     "Revenue dropped 8%"
│    Non-intrusive ambient intel      │
│                                     │
├─────────────────────────────────────┤
│ 💬 CONVERSATIONS                    │  ← Session history
│    Grouped by date                  │     Can be starred or archived
│    Searchable semantically          │     Always present at bottom
│    Cannot be hidden                 │
└─────────────────────────────────────┘
```

### The Floating Prompt

The prompt input is multi-modal:

```
┌────────────────────────────────────────────────────────────────┐
│  ✨ Ask anything...                                       [🎤] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  💡 Suggested questions:                                       │
│  • "How are we tracking against Q4 goals?"                     │
│  • "What changed since last week?"                             │
│  • "Show me the pipeline"                                      │
│                                                                │
│  🕐 Recent:                                                    │
│  • "Break down churn by segment"                               │
│  • "Revenue by region"                                         │
│                                                                │
│  ⌨️ Commands: /clear /export /share /schedule                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Input Modes:**
- **Natural language** — "Show me revenue by region"
- **Voice** — Hands-free operation via microphone
- **Commands** — `/clear`, `/export`, `/share`, `/schedule`
- **Follow-ups** — "Now break that down by product"

---

## 5. The Notebook Paradigm

### Progressive Growth

Unlike static dashboards, Knosia's canvas grows as you ask questions:

```
START:
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                     Good morning, Alex                           │
│               Here's what changed since Tuesday:                 │
│                                                                  │
│            📈 Revenue +12%    👥 3 new leads                     │
│                                                                  │
│                    ✨ Ask anything...                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

AFTER "Show me revenue by region":
┌─────────────────────────────────────────────────────────────────┐
│  Revenue by Region                                    [⋮ menu]  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   [Bar Chart]                           │    │
│  │   NA ████████████████████ $1.2M                         │    │
│  │   EMEA ██████████████ $890K                             │    │
│  │   APAC ████████ $450K                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                    ✨ Ask anything...                            │
└─────────────────────────────────────────────────────────────────┘

AFTER "Add customer count":
┌─────────────────────────────────────────────────────────────────┐
│  Revenue by Region                                    [⋮ menu]  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   [Bar Chart]                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Customer Count by Region                             [⋮ menu]  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   [Data Table]                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ... blocks continue to grow ...                                │
│                                                                  │
│                    ✨ Ask anything...                            │
└─────────────────────────────────────────────────────────────────┘
```

### Block Behaviors

Every block in the notebook has behaviors:

```
┌────────────────────────────────────────────────────────────────┐
│  📊 Revenue by Region                                  [⋮]     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    [Visualization]                        │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  Block Menu (⋮):                                               │
│                                                                │
│  📸 Save as Snapshot    → Freeze this data forever             │
│  🔄 Save as Living View → Keep data fresh                      │
│  📌 Pin to Top          → Survives notebook clear              │
│  🔗 Link Blocks         → Filter together                      │
│  💬 Add Annotation      → "This spike was Black Friday"        │
│  ⏰ Schedule Refresh    → "Update every Monday"                │
│  📤 Export              → PDF, PNG, Excel, Slides              │
│  🗑️ Remove              → Delete from notebook                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Snapshot vs Living View

Users can save blocks in two modes:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO SAVE MODES                                │
├────────────────────────────────┬────────────────────────────────┤
│      📸 SNAPSHOT               │      🔄 LIVING VIEW            │
├────────────────────────────────┼────────────────────────────────┤
│  Saves: DSL + DATA             │  Saves: DSL only               │
│  Data: Frozen at that moment   │  Data: Refreshes on open       │
│                                │                                │
│  Use case:                     │  Use case:                     │
│  • "Remember Dec 15 revenue"   │  • "Always show current rev"   │
│  • "This spike was Black Fri"  │  • "My weekly dashboard"       │
│  • "Evidence for the board"    │  • "Monitor churn daily"       │
│                                │                                │
│  Annotations make sense ✓      │  Annotations may go stale      │
│                                │                                │
│  Good for: historical record,  │  Good for: monitoring,         │
│  compliance, comparisons       │  dashboards, recurring views   │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│  STORED AS:                                                      │
│                                                                  │
│  Snapshot:                                                       │
│  {                                                               │
│    type: "snapshot",                                             │
│    dsl: { type: "bar-chart", ... },                              │
│    data: [{ region: "NA", revenue: 1200000 }, ...], // frozen    │
│    createdAt: "2024-12-15",                                      │
│    annotation: "Black Friday spike"                              │
│  }                                                               │
│                                                                  │
│  Living View:                                                    │
│  {                                                               │
│    type: "view",                                                 │
│    dsl: { type: "bar-chart", ... },                              │
│    queryId: "revenue-by-region", // re-executes on load          │
│    createdAt: "2024-12-15"                                       │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Linked Blocks

Blocks can be linked for synchronized filtering:

```
User clicks "North America" on Region chart
       │
       ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Revenue by Region│ ──→ │ Customer Table   │ ──→ │ Churn Trend      │
│ [NA highlighted] │     │ [filtered to NA] │     │ [filtered to NA] │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        🔗 Linked                🔗 Linked              🔗 Linked

Visual indicator shows which blocks are "in sync"
User controls which blocks link to which
```

### Session Auto-Save

Every notebook session is automatically saved:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sessions are automatically saved.                               │
│                                                                  │
│  • Every block added/modified → saved                           │
│  • Every conversation turn → saved                               │
│  • Can clear notebook but session persists                       │
│                                                                  │
│  User can:                                                       │
│  • ⭐ Star a session (important, keep forever)                  │
│  • 📁 Archive a session (hide from main list)                   │
│  • 🔍 Search sessions semantically                               │
│  • 🔄 Reopen any past session                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Intelligence Layer

### Anomaly Memory

Knosia remembers past anomalies and connects patterns:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Revenue dropped 15% this week                               │
│                                                                  │
│  🧠 I've seen this pattern before:                               │
│                                                                  │
│  • March 2024: Similar drop                                      │
│    Cause: Billing system bug                                     │
│    Resolution: Engineering fix, 3 days to recover                │
│                                                                  │
│  • December 2023: Similar drop                                   │
│    Cause: Holiday seasonality (expected)                         │
│    Resolution: None needed                                       │
│                                                                  │
│  Want me to check if this matches either pattern?                │
│  [Check billing] [Compare to seasonality] [Something else]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Correlation Surfacing

Knosia notices relationships you didn't ask about:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Your churn analysis                                          │
│  [chart showing churn over time]                                 │
│                                                                  │
│  💡 I noticed something:                                         │
│                                                                  │
│  Churn correlates strongly (r=0.73) with:                        │
│  • Support ticket volume (2-week lag)                            │
│  • Time since last product update                                │
│                                                                  │
│  This might explain the Q3 spike.                                │
│                                                                  │
│  Want me to explore either connection?                           │
│  [Support tickets] [Product updates] [Ignore]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Predictive Alerts

Alert BEFORE things go wrong, not after:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔮 Predictive Alert                                             │
│                                                                  │
│  At current churn trajectory:                                    │
│  You'll breach your 5% threshold in 6 days                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐         │
│  │          [Trend chart with projection]              │         │
│  │  ────actual────••••••predicted••••••                │         │
│  │                         ↑ breach point              │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                  │
│  Top contributors:                                               │
│  • SMB segment churn accelerating                                │
│  • 2 enterprise accounts showing signals                         │
│                                                                  │
│  [Investigate now] [Snooze] [Adjust threshold]                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Reverse Analysis ("What Would Cause...")

Think backwards from outcomes to causes:

```
User: "What would cause revenue to drop 20%?"

┌─────────────────────────────────────────────────────────────────┐
│  🔍 Reverse Analysis: Revenue -20%                               │
│                                                                  │
│  Top factors that could cause this:                              │
│                                                                  │
│  1. Churn increases to 8% (currently 4.2%)                       │
│     Probability: Medium (happened in Q2 2023)                    │
│                                                                  │
│  2. Enterprise deals slip (3+ to next quarter)                   │
│     Probability: Low (pipeline looks healthy)                    │
│                                                                  │
│  3. Pricing change backlash                                      │
│     Probability: Unknown (no planned changes)                    │
│                                                                  │
│  4. Top 10 customer churns (34% of revenue)                      │
│     Probability: Monitor Acme Corp (weak signals)                │
│                                                                  │
│  [Deep dive on any] [Set up monitoring alerts]                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "Why Didn't We Hit Goal?" Analysis

Not just "we missed" but decomposition of WHY:

```
User: "Why didn't we hit our Q3 revenue goal?"

┌─────────────────────────────────────────────────────────────────┐
│  🎯 Goal Gap Analysis: Q3 Revenue                                │
│                                                                  │
│  Target: $3.5M    Actual: $3.1M    Gap: -$400K                   │
│                                                                  │
│  Breakdown of the gap:                                           │
│                                                                  │
│  -$180K  Enterprise deals slipped to Q4                          │
│          (Acme, GlobalCorp delayed signature)                    │
│                                                                  │
│  -$120K  Higher than expected churn                              │
│          (SMB segment, 23 customers)                             │
│                                                                  │
│  -$65K   APAC underperformance                                   │
│          (Currency headwinds + delayed expansion)                │
│                                                                  │
│  -$35K   Unplanned pricing discounts                             │
│                                                                  │
│  [Deep dive on any] [Compare to Q2 gap analysis]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "What If" Hypotheticals

Model the future, not just report the past:

```
User: "What if we reduced churn by 2%?"

┌─────────────────────────────────────────────────────────────────┐
│  🔮 Scenario: Churn reduced from 4.2% → 2.2%                     │
│                                                                  │
│  Impact over 12 months:                                          │
│  • Retained customers: +847                                      │
│  • Additional ARR: +$1.2M                                        │
│  • LTV improvement: +18%                                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐         │
│  │   [Projection chart: current vs scenario]           │         │
│  │   ────current────                                   │         │
│  │   ••••scenario••••                                  │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                  │
│  [Save scenario] [Compare to other scenarios]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Ambient Nudges

Proactive but non-intrusive intelligence:

```
SIDEBAR:
┌─────────────────────────────────────┐
│ 📌 Saved Views                      │
├─────────────────────────────────────┤
│ 💡 Suggested                        │
│                                     │
│    Revenue dropped 8% - check?      │
│    [View] [Dismiss]                 │
│                                     │
├─────────────────────────────────────┤
│ 💬 Sessions                         │
└─────────────────────────────────────┘

RULES:
• Maximum 1-2 nudges at a time
• Easy dismiss (one click)
• Never blocks the UI
• Learns what you ignore
• Prioritizes by impact
```

---

## 7. Data Trust & Transparency

### Data Lineage

Every number can be traced to its source:

```
User: "Where does this MRR number come from?"

┌─────────────────────────────────────────────────────────────────┐
│  MRR: $1,247,832                                                 │
│                                                                  │
│  📍 Lineage:                                                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐         │
│  │  Stripe.subscriptions                               │         │
│  │       ↓ filter: status = 'active'                   │         │
│  │       ↓ join: customers (for currency)              │         │
│  │       ↓ sum: plan_amount × quantity                 │         │
│  │       ↓ convert: USD (rate from Dec 28)             │         │
│  │  = $1,247,832                                       │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                  │
│  [View SQL] [View raw data sample]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Assumption Surfacing

Every answer shows its assumptions:

```
┌─────────────────────────────────────────────────────────────────┐
│  Revenue YTD: $4.2M                                              │
│                                                                  │
│  📋 Assumptions in this number:                                  │
│                                                                  │
│  • Currency: All converted to USD (today's rate)                 │
│  • Date range: Jan 1 - Dec 28, 2024                              │
│  • Includes: Subscriptions + one-time purchases                  │
│  • Excludes: Refunds, chargebacks, taxes                         │
│                                                                  │
│  [Change assumptions] [Show with different config]               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Confidence Indicators

Not all answers are equally certain:

```
┌─────────────────────────────────────────────────────────────────┐
│  "What's our CAC?"                                               │
│                                                                  │
│  CAC: $142         ████████████ High confidence                  │
│  (exact calculation from Stripe + HubSpot)                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  "What will churn be next month?"                                │
│                                                                  │
│  Predicted: 4.2%   ████░░░░░░░░ Estimated                        │
│  (based on historical patterns, ±1.5%)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Quality Alerts

Knosia proactively surfaces data issues:

```
┌─────────────────────────────────────────────────────────────────┐
│  🧹 Data Quality Alert                                           │
│                                                                  │
│  I found potential issues:                                       │
│                                                                  │
│  • 47 duplicate customers (same email, different IDs)            │
│  • 12 subscriptions with $0 amount (test data?)                  │
│  • 3 customers with future created_at dates                      │
│                                                                  │
│  Impact on your metrics:                                         │
│  • Customer count: inflated by ~2%                               │
│  • MRR: unaffected (dupes have no subscriptions)                 │
│                                                                  │
│  [Review duplicates] [Ignore for now] [Auto-clean]               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Freshness

Always know how current your data is:

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTEXT BAR (top of canvas):                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Data as of: Dec 28, 2:30 PM  •  Stripe: 5 min ago          │ │
│  │                               •  Postgres: Live              │ │
│  │                               •  HubSpot: 2 hours ago ⚠️     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ⚠️ indicates data may be stale                                  │
│  Click any source to see last sync details                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vocabulary Definitions On-Demand

Every metric can explain itself:

```
┌─────────────────────────────────────────────────────────────────┐
│  MRR: $1.2M  ⓘ                                                   │
│              │                                                   │
│              ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐         │
│  │  Monthly Recurring Revenue                          │         │
│  │                                                     │         │
│  │  Formula:                                           │         │
│  │  = Active subscriptions × plan price                │         │
│  │                                                     │         │
│  │  Excludes:                                          │         │
│  │  • One-time purchases                               │         │
│  │  • Refunds and chargebacks                          │         │
│  │                                                     │         │
│  │  Source: Stripe + manual adjustments                │         │
│  │  Owner: Finance team                                │         │
│  │  Last updated: Dec 1, 2024                          │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vocabulary Changelog

Track when definitions change:

```
┌─────────────────────────────────────────────────────────────────┐
│  ℹ️ "Active User" definition changed                             │
│                                                                  │
│  Before (until Dec 1):                                           │
│  "Any user who logged in within 30 days"                         │
│                                                                  │
│  After (Dec 1+):                                                 │
│  "Any user who performed a key action in 30 days"                │
│                                                                  │
│  Impact: -12% apparent active users                              │
│  Changed by: Product team                                        │
│                                                                  │
│  ⚠️ Comparing data across this boundary may be misleading.       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Query Cost Awareness

Protect users from expensive queries:

```
User: "Show me all transactions for the last 3 years"

┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ This is a large query                                        │
│                                                                  │
│  Estimated:                                                      │
│  • Rows: ~4.2 million                                            │
│  • Time: 30-45 seconds                                           │
│  • Cost: ~$0.12 (BigQuery)                                       │
│                                                                  │
│  Suggestions:                                                    │
│  • Add a filter (region, product, customer type)                 │
│  • Use aggregated view instead (much faster)                     │
│  • Sample 10% of data for exploration                            │
│                                                                  │
│  [Run anyway] [Add filter] [Use aggregate]                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Conversation System

### Follow-Up Detection

Knosia understands conversational context:

```
CONVERSATION FLOW:
────────────────────────────────────────────────────────────────────
User: "Show me revenue"              → Fresh query
                                       AI shows revenue KPI

User: "Break that by region"         → Follow-up detected
                                       "that" = revenue from last turn
                                       AI adds regional breakdown

User: "Focus on North America"       → Follow-up detected
                                       Context: revenue by region
                                       AI filters to NA

User: "Now show me churn"            → Fresh query detected
                                       New topic, clears context
                                       AI starts fresh with churn

User: "Why is it spiking?"           → Follow-up detected
                                       "it" = churn from last turn
                                       AI analyzes churn spike
────────────────────────────────────────────────────────────────────
```

### Smart Clarification

When ambiguous, assume and offer correction (don't block):

```
User: "Show me sales"

❌ BAD (blocking):
┌─────────────────────────────────────────────────────────────────┐
│  Did you mean:                                                   │
│  (A) Revenue                                                     │
│  (B) Units sold                                                  │
│  (C) Sales team performance                                      │
└─────────────────────────────────────────────────────────────────┘

✅ GOOD (assume + offer):
┌─────────────────────────────────────────────────────────────────┐
│  Revenue: $1.2M (+12% this month)                                │
│  [chart]                                                         │
│                                                                  │
│  Showing revenue. Did you mean something else?                   │
│  [Units sold] [Team performance] [This is right ✓]               │
└─────────────────────────────────────────────────────────────────┘
```

### Semantic History Search

All conversations are searchable by meaning:

```
User: "When did we discuss pricing changes?"

┌─────────────────────────────────────────────────────────────────┐
│  🔍 Found 4 conversations about pricing:                         │
│                                                                  │
│  Dec 15 - "What if we raised enterprise 10%?"                    │
│  Result: Impact simulation showing +$200K ARR                    │
│  [Reopen this session]                                           │
│                                                                  │
│  Nov 3 - "Compare our pricing to competitors"                    │
│  Result: Analysis showing 15% below market average               │
│  [Reopen this session]                                           │
│                                                                  │
│  Oct 22 - "Show pricing tier conversion rates"                   │
│  Result: 34% upgrade from Basic to Pro                           │
│  [Reopen this session]                                           │
│                                                                  │
│  [Search for something else]                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Conversation Templates

Start with proven analysis frameworks:

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Start from Template                                          │
│                                                                  │
│  Popular for your role (CEO):                                    │
│  • Board Meeting Prep (financials + risks + asks)                │
│  • Weekly Business Review (KPIs + trends + outliers)             │
│  • Investor Update (growth + runway + milestones)                │
│                                                                  │
│  Popular for your industry (SaaS):                               │
│  • SaaS Metrics Deep Dive (MRR, churn, LTV, CAC)                 │
│  • Cohort Analysis (retention by signup month)                   │
│  • Pipeline Review (stage, probability, timing)                  │
│                                                                  │
│  [Start from template] [Create my own template]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Drill-Down Breadcrumbs

Never lose your analysis path:

```
┌─────────────────────────────────────────────────────────────────┐
│  BREADCRUMB TRAIL:                                               │
│                                                                  │
│  Revenue → by Region → North America → by Product → Enterprise   │
│     ↑          ↑            ↑              ↑            ↑        │
│  [click]    [click]      [click]        [click]     [current]    │
│                                                                  │
│  User can click any step to go back to that view                 │
│  Full context preserved at each level                            │
│                                                                  │
│  [Back to: by Product] [Back to: by Region] [Start over]         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Incremental Complexity

Start simple, add depth on demand:

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

Each step adds ONE layer. User controls complexity.
```

---

## 9. Personalization Engine

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
│                            │         │                            │
│ What changed overnight:    │         │ Your hot leads:            │
│ • 3 enterprise signups     │         │ • GlobalCorp (demo today)  │
│ • Board meeting tomorrow   │         │ • TechStart (proposal out) │
└────────────────────────────┘         └────────────────────────────┘
```

### Role Simulation

Leaders can see what their team sees:

```
User (CEO): "Show me what the Sales team sees"

┌─────────────────────────────────────────────────────────────────┐
│  👁️ Viewing as: Sales Role                                       │
│                                                                  │
│  Differences from your view:                                     │
│  ┌──────────────────────┬──────────────────────┐                 │
│  │  Your view           │  Sales view          │                 │
│  ├──────────────────────┼──────────────────────┤                 │
│  │  All regions         │  Their region only   │                 │
│  │  All metrics         │  Pipeline, quota     │                 │
│  │  Raw financials      │  Masked salary data  │                 │
│  └──────────────────────┴──────────────────────┘                 │
│                                                                  │
│  Currently showing Sales perspective:                            │
│  [Dashboard renders with Sales filters]                          │
│                                                                  │
│  [Back to my view] [Compare side-by-side]                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Time-Aware Defaults

Different content based on WHEN you're looking:

```
MORNING (8 AM):
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, Alex ☀️                                           │
│  Here's what happened overnight:                                 │
│  • 3 new enterprise signups                                      │
│  • Revenue: $42K (above average Tuesday)                         │
│  • No anomalies detected                                         │
└─────────────────────────────────────────────────────────────────┘

END OF DAY (5 PM):
┌─────────────────────────────────────────────────────────────────┐
│  Wrapping up, Alex 🌙                                            │
│  Today's summary:                                                │
│  • Revenue: $87K (best Tuesday this quarter)                     │
│  • 2 deals closed, 1 churned                                     │
│  • Tomorrow: Board meeting at 10 AM                              │
│  [Set up board prep view?]                                       │
└─────────────────────────────────────────────────────────────────┘

MONDAY MORNING:
┌─────────────────────────────────────────────────────────────────┐
│  Week ahead, Alex 📅                                             │
│  Last week: Revenue $412K, Churn 4.1%                            │
│  This week: 3 renewal calls, 1 QBR                               │
│  Focus: Enterprise pipeline (2 deals at risk)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Goal Tracking

Data without context is noise. Track against targets:

```
┌─────────────────────────────────────────────────────────────────┐
│  Q4 Revenue Goal: $5M                                            │
│  ████████████░░░░░░░░ 62% ($3.1M)                                │
│                                                                  │
│  ⏱️ 23 days remaining                                            │
│  📈 Need $82K/day to hit goal (currently $71K/day)               │
│                                                                  │
│  "At current pace, you'll finish at $4.7M (94%)"                 │
│                                                                  │
│  [Adjust goal] [See breakdown] [What would it take?]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Suggested Questions

Personalized based on role + history:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Ask anything...                                              │
│                                                                  │
│  💡 Suggested for you (CEO):                                     │
│  • "How are we tracking against Q4 goals?"                       │
│  • "What's our runway at current burn?"                          │
│  • "Compare this month to last year"                             │
│                                                                  │
│  🕐 You recently asked:                                          │
│  • "Break down churn by segment"                                 │
│  • "Show enterprise pipeline"                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Custom Metrics via Voice

Create new metrics without code:

```
User: "Create a metric called 'health score'"

Knosia: What should health score include?

User: "NPS times retention rate divided by support tickets"

┌─────────────────────────────────────────────────────────────────┐
│  📐 New Metric: Health Score                                     │
│                                                                  │
│  Formula: (NPS × Retention Rate) / Support Tickets               │
│                                                                  │
│  Interpretation:                                                 │
│  • Higher = healthier customer                                   │
│  • Range: 0-100 (normalized)                                     │
│                                                                  │
│  Sample calculation:                                             │
│  Customer "Acme": (72 × 0.94) / 3 = 22.6                         │
│                                                                  │
│  [Save to vocabulary] [Test on more data] [Adjust formula]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Abbreviations

Knosia learns your company's language:

```
User: "Show me ARR"
→ Knosia shows Annual Recurring Revenue (known term)

User: "What's the TTV for enterprise?"
→ Knosia: "I don't know 'TTV' yet. Is it:
          • Time to Value
          • Total Transaction Volume
          • Something else?"

User: "Time to value"

┌─────────────────────────────────────────────────────────────────┐
│  📝 Learned: TTV = Time to Value                                 │
│  I'll remember this for future questions.                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Collaboration & Sharing

### Share Modes

Multiple ways to share:

```
┌─────────────────────────────────────────────────────────────────┐
│  📤 Share Options                                                │
│                                                                  │
│  Share link                                                      │
│  → Recipient sees YOUR view with THEIR permissions               │
│  → Data filtered to what they can access                         │
│  → Read-only by default                                          │
│                                                                  │
│  Fork                                                            │
│  → Recipient gets a copy they can modify                         │
│  → Changes don't affect your original                            │
│                                                                  │
│  Collaborate (coming soon)                                       │
│  → Both edit the same view in real-time                          │
│  → See each other's cursors and changes                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Permission-Aware Sharing

When you share, recipients see only what they're allowed to:

```
User (CEO): "Share my revenue dashboard with Sarah (Sales)"

┌─────────────────────────────────────────────────────────────────┐
│  📤 Sharing with Sarah (Sales Lead)                              │
│                                                                  │
│  Sarah will see:                                                 │
│  ✅ Revenue metrics (company-wide)                               │
│  ✅ Sales pipeline (her region)                                  │
│  ⚠️ Salary data (masked - no permission)                         │
│  ⚠️ Other regions (filtered out)                                 │
│                                                                  │
│  [Send anyway] [Customize what to share] [Cancel]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Permission-Aware Honesty

When users lack access, explain why:

```
┌─────────────────────────────────────────────────────────────────┐
│  Revenue by Employee                                             │
│                                                                  │
│  🔒 Partial data shown                                           │
│                                                                  │
│  You can see: Your team (Sales West)                             │
│  Hidden: Other regions (requires Manager+ role)                  │
│                                                                  │
│  [Request access] [Show what I can see]                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Session Handoff

Pass analysis to a colleague:

```
User: "Continue this analysis with Sarah"

┌─────────────────────────────────────────────────────────────────┐
│  🤝 Session Handoff                                              │
│                                                                  │
│  Sharing with: Sarah (Sales Lead)                                │
│                                                                  │
│  Include in handoff:                                             │
│  ☑️ Current notebook (4 blocks)                                  │
│  ☑️ Conversation context                                         │
│  ☐ My annotations (private)                                      │
│                                                                  │
│  Sarah will see:                                                 │
│  • Your analysis path                                            │
│  • Filtered to her permissions                                   │
│  • Can continue where you left off                               │
│                                                                  │
│  [Send handoff link] [Start live collaboration]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Collaborative Annotations

Team members can add notes everyone sees:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Revenue by Region                                            │
│  [chart with spike in December]                                  │
│                                                                  │
│  💬 Annotations:                                                 │
│                                                                  │
│  Alex (Dec 15): "This spike was Black Friday promo"              │
│  Sarah (Dec 18): "Confirmed - 40% of spike was promo codes"      │
│  Finance Bot (Dec 20): "Promo impact: $124K one-time"            │
│                                                                  │
│  [Add annotation]                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Audit Log

Complete visibility into who accessed what:

```
┌─────────────────────────────────────────────────────────────────┐
│  📜 Audit Log                                                    │
│                                                                  │
│  Dec 28, 3:42 PM - Sarah (Sales)                                 │
│  Query: "Show me deals closing this month"                       │
│  Result: 12 deals, $840K pipeline                                │
│  [View session]                                                  │
│                                                                  │
│  Dec 28, 2:15 PM - Alex (CEO)                                    │
│  Query: "What's our runway?"                                     │
│  Result: 18 months at current burn                               │
│  [View session]                                                  │
│                                                                  │
│  Dec 28, 11:30 AM - Finance Bot (Scheduled)                      │
│  Query: Weekly revenue digest                                    │
│  Result: Sent to #finance-updates                                │
│                                                                  │
│  [Filter by user] [Filter by date] [Export]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Actions & Automation

### Alerts with Actions

Don't just notify — enable action:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Alert: Enterprise churn risk detected                        │
│                                                                  │
│  Acme Corp showing churn signals:                                │
│  • No login in 14 days                                           │
│  • 3 support tickets (billing complaints)                        │
│  • Contract renewal in 45 days                                   │
│                                                                  │
│  Quick actions:                                                  │
│  [Create task in Asana]                                          │
│  [Draft email to account manager]                                │
│  [Schedule QBR call]                                             │
│  [Add to at-risk list]                                           │
│                                                                  │
│  [Dismiss] [Snooze 1 week]                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Alerts (Learning, Not Static)

```
❌ Traditional: "Alert when revenue < $50K/day"
   (Fires constantly during holidays, misses subtle drops)

✅ Knosia: "Alert when revenue is unusual"
   - Learns daily/weekly/seasonal patterns
   - Adjusts for known events (holidays, launches)
   - Alerts on ACTUAL anomalies, not arbitrary thresholds
```

### Scheduled Digests

Knosia comes to you:

```
User: "Send me a weekly summary every Monday"

┌─────────────────────────────────────────────────────────────────┐
│  📅 Scheduled: Weekly Digest                                     │
│                                                                  │
│  When: Mondays at 8:00 AM                                        │
│  What: Your pinned KPIs + week-over-week changes                 │
│  Where: Email + Slack #ceo-updates                               │
│                                                                  │
│  Preview of next digest:                                         │
│  "Week of Dec 30: Revenue $412K (+8%), Churn 4.1%               │
│   (-0.3%), 12 new enterprise leads..."                           │
│                                                                  │
│  [Edit schedule] [Preview full digest] [Cancel]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Block Actions

Every visualization has action options:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Revenue by Region                                            │
│  [chart renders here]                                            │
├─────────────────────────────────────────────────────────────────┤
│  📤 Share   📅 Schedule   📄 Export   🔗 Embed                   │
└─────────────────────────────────────────────────────────────────┘
```

### Export with Context

Exports include the story, not just the picture:

```
┌─────────────────────────────────────────────────────────────────┐
│  📤 Export Options                                               │
│                                                                  │
│  Include in export:                                              │
│  ☑️ The visualization                                            │
│  ☑️ The question asked ("Show revenue by region")                │
│  ☑️ Data freshness ("As of Dec 28, 2:30 PM")                     │
│  ☑️ Assumptions and definitions                                  │
│  ☐ Underlying data (CSV attachment)                              │
│  ☐ SQL query used                                                │
│                                                                  │
│  Format: [PDF] [PNG] [Slides] [Excel]                            │
│                                                                  │
│  [Export] [Schedule recurring export]                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Narrative Generation

Turn data into documents:

```
User: "Write me a summary for the board meeting"

┌─────────────────────────────────────────────────────────────────┐
│  📄 Q4 Executive Summary                                         │
│  Generated from your current dashboard                           │
│                                                                  │
│  "Revenue grew 12% QoQ to $3.1M, driven primarily by             │
│   enterprise expansion in North America (+34%). Churn            │
│   increased slightly to 4.2%, concentrated in the SMB            │
│   segment. Key risk: APAC performance declined 8% due            │
│   to currency headwinds.                                         │
│                                                                  │
│   Recommendation: Investigate APAC pricing strategy              │
│   before Q1 planning."                                           │
│                                                                  │
│  [Edit] [Export PDF] [Send to #board-updates]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Storytelling

Connect blocks into narrative flow:

```
User: "Tell the story of our Q4"

┌─────────────────────────────────────────────────────────────────┐
│  📖 Q4 Story                                                     │
│                                                                  │
│  Chapter 1: The Setup                                            │
│  "We entered Q4 with momentum: 12% Q3 growth..."                 │
│  [Revenue trend chart]                                           │
│                                                                  │
│  Chapter 2: The Challenge                                        │
│  "Mid-October, churn spiked in SMB segment..."                   │
│  [Churn by segment chart]                                        │
│                                                                  │
│  Chapter 3: The Response                                         │
│  "We launched retention campaigns, reducing..."                  │
│  [Campaign impact chart]                                         │
│                                                                  │
│  Chapter 4: The Outcome                                          │
│  "Despite headwinds, we closed at $3.4M..."                      │
│  [Final metrics summary]                                         │
│                                                                  │
│  [Export as presentation] [Edit narrative]                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Slack/Teams Integration

Full Knosia power without leaving chat:

```
SLACK:
┌─────────────────────────────────────────────────────────────────┐
│  @knosia what's our MRR?                                         │
│                                                                  │
│  Knosia: MRR is $1.24M (+3% this month)                          │
│  [View in Knosia] [Break down by segment]                        │
│                                                                  │
│  @knosia send weekly revenue to this channel                     │
│                                                                  │
│  Knosia: ✅ Scheduled: Revenue summary                           │
│          Every Monday at 9 AM to #sales-updates                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Embedding

Put Knosia views inside your product:

```
User: "Embed this revenue chart in our customer portal"

┌─────────────────────────────────────────────────────────────────┐
│  🔗 Embed Code Generated                                         │
│                                                                  │
│  <iframe src="knosia.app/embed/abc123"                           │
│          data-customer="{{customer_id}}">                        │
│  </iframe>                                                       │
│                                                                  │
│  Security:                                                       │
│  • Filtered to viewing customer's data only                      │
│  • Read-only (no voice/chat)                                     │
│  • Refreshes every 15 minutes                                    │
│                                                                  │
│  [Copy code] [Customize appearance] [Set filters]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Multi-Modal Experience

### Voice-First

The prompt accepts voice naturally:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎤 Listening...                                                 │
│                                                                  │
│  "Show me revenue by region for the last quarter"                │
│                                                                  │
│  [Processing...]                                                 │
│                                                                  │
│  ✅ Understood: Revenue by region, Q4 2024                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Meeting Mode

One command transforms UI for presentations:

```
User: "I'm presenting to the board"

┌─────────────────────────────────────────────────────────────────┐
│  🎯 MEETING MODE ACTIVATED                                       │
│                                                                  │
│  Changes applied:                                                │
│  • Larger fonts, high contrast                                   │
│  • Animations disabled                                           │
│  • Voice input paused (no accidental triggers)                   │
│  • Simplified tooltips                                           │
│  • "Presenter view" with speaker notes                           │
│                                                                  │
│  Your pinned views are ready:                                    │
│  [Q4 Revenue] [Churn Analysis] [Pipeline]                        │
│                                                                  │
│  [Exit meeting mode]                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Adaptation

Same DSL, different rendering:

```
DESKTOP:                              MOBILE:
┌────────────────────────────┐        ┌──────────────────┐
│ [chart] [chart] [chart]    │        │ MRR: $1.2M ↑12%  │
│ [table with 10 columns]    │   →    │ Churn: 3.2% ↓    │
│ [KPI row with 5 metrics]   │        │ [tap for more]   │
│ [detailed breakdown]       │        │                  │
└────────────────────────────┘        │ Quick actions:   │
                                      │ [Ask] [Saved]    │
                                      └──────────────────┘

Mobile prioritizes:
• Headline KPIs first
• Charts are expandable
• Tables become cards
• Voice input prominent
```

### Cross-Device Continuity

Seamless handoff between devices:

```
DESKTOP (2:30 PM):
User starts analysis: "Show me revenue by region"
Adds a chart, pins it, starts drilling into APAC...

MOBILE (2:45 PM, walking to meeting):
┌────────────────────────────────────┐
│ Continue where you left off?       │
│                                    │
│ "APAC Revenue Analysis"            │
│ 3 blocks, last edit: 2:42 PM       │
│                                    │
│ [Continue] [Start fresh]           │
└────────────────────────────────────┘

Analysis state syncs across all devices.
```

### The Universal Comparison

Any two things, side by side:

```
User: "Compare Q3 to Q4"
User: "Compare North America to EMEA"
User: "Compare this year to last year"
User: "Compare our churn to industry benchmark"

ALL produce:
┌─────────────────────────────────────────────────────────────────┐
│  ⚖️ Comparison: [Thing A] vs [Thing B]                           │
│                                                                  │
│  Metric         [A]        [B]       Change                      │
│  ─────────────────────────────────────────────                   │
│  Revenue        $3.1M      $3.4M     +9.7% ✅                    │
│  Churn          3.8%       4.2%      +0.4% ⚠️                    │
│  NPS            72         68        -4 pts ⚠️                   │
│                                                                  │
│  [Dig into differences] [Export comparison]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Time Travel

Any view can be time-shifted:

```
User: "Show me this same view but for Q3"

┌─────────────────────────────────────────────────────────────────┐
│  📊 Revenue by Region                                            │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │ Current (Q4)        │    │ Q3 2024             │             │
│  │ [bar chart]         │    │ [bar chart]         │             │
│  └─────────────────────┘    └─────────────────────┘             │
│                                                                  │
│  Same DSL, different time window.                                │
│  [Show delta] [Animate transition] [Pick different period]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Learning & Adaptation

### Teach Mode

Corrections train Knosia:

```
Knosia: "Your MRR is $1.2M"
User: "That's wrong, MRR should exclude pilot customers"

┌─────────────────────────────────────────────────────────────────┐
│  📝 Learning from your correction                                │
│                                                                  │
│  You said: MRR should exclude pilot customers                    │
│                                                                  │
│  I'll update the vocabulary:                                     │
│  MRR = Active subscriptions − pilot customers                    │
│                                                                  │
│  Apply to:                                                       │
│  ○ Just this conversation                                        │
│  ○ All my future queries                                         │
│  ● Organization-wide (requires approval)                         │
│                                                                  │
│  [Confirm] [Edit definition] [Cancel]                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Abbreviation Learning

Knosia learns company jargon:

```
OVER TIME:
────────────────────────────────────────────────────────────────────
Day 1:  User says "TTV" → Knosia asks "what's TTV?"
        User: "Time to Value"
        Knosia: ✅ Learned

Day 5:  User says "TTV" → Knosia knows it's Time to Value

Day 20: New employee asks "TTV" → Knosia shows definition
        "TTV = Time to Value (learned from Alex on Dec 1)"
────────────────────────────────────────────────────────────────────
```

### Alert Learning

Knosia learns what matters to you:

```
OVER TIME:
────────────────────────────────────────────────────────────────────
Alert: "Revenue dropped 5%"
User: [Dismisses]

Alert: "Revenue dropped 5%"
User: [Dismisses]

Alert: "Revenue dropped 5%"
User: [Dismisses]

Knosia: "You've dismissed revenue alerts 3 times.
         Should I only alert for drops > 10%?"
         [Yes, update threshold] [No, keep alerting]
────────────────────────────────────────────────────────────────────
```

### Preference Memory

Knosia remembers how you like things:

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 What I've learned about you:                                 │
│                                                                  │
│  Visualizations:                                                 │
│  • You prefer bar charts over pie charts                         │
│  • You usually want YoY comparisons                              │
│  • You like metrics rounded to thousands                         │
│                                                                  │
│  Interests:                                                      │
│  • You check churn metrics every Monday                          │
│  • You care most about enterprise segment                        │
│  • You rarely look at marketing metrics                          │
│                                                                  │
│  [Edit preferences] [Reset learning]                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 14. User Journeys

### Journey 1: First-Time User

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    Welcome to Knosia, Alex                       │
│                                                                  │
│   I've connected to your Postgres database and                   │
│   analyzed 47 tables. Here's what I understand:                  │
│                                                                  │
│   📊 You track: customers, orders, subscriptions                 │
│   💰 Key metrics: revenue, MRR, churn                            │
│   👥 Teams: 12 users across 3 roles                              │
│                                                                  │
│   Your role: CEO                                                 │
│                                                                  │
│   Want me to build your first briefing?                          │
│   [Yes, suggest a dashboard] [Let me ask something]              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼ User clicks "Yes, suggest a dashboard"

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Here's a CEO briefing based on your data:                      │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  MRR: $1.2M        Churn: 4.2%        NPS: 72          │    │
│   │  ↑ 8% this month   ↑ 0.3%             ↓ 2 pts          │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  [Revenue trend - 12 months]                            │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│   Want to modify this? Just ask.                                 │
│   [Save as my default view] [Add more metrics] [Start over]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 2: Morning Briefing (Returning User)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    Good morning, Alex ☀️                         │
│              Here's what changed since yesterday:                │
│                                                                  │
│    📈 Revenue +$42K        👥 3 new enterprise leads             │
│    ⚠️ Churn spike in APAC  📅 Board meeting tomorrow             │
│                                                                  │
│    💡 I noticed: APAC churn is 2x other regions.                 │
│       This started 2 weeks ago. Worth investigating?             │
│       [Yes, show me] [Dismiss]                                   │
│                                                                  │
│              ┌───────────────────────────────────┐               │
│              │ ✨ What would you like to explore? │               │
│              └───────────────────────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼ User: "Show me the APAC situation"

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   APAC Churn Analysis                                            │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  [Churn trend chart - APAC vs Others]                   │    │
│   │  APAC: ████████████ 8.2%                                │    │
│   │  Others: ████ 3.1%                                      │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│   Top churn reasons (from support tickets):                      │
│   1. Pricing (42%) - "Too expensive in local currency"           │
│   2. Competition (31%) - "Switched to LocalCompetitor"           │
│   3. Support (27%) - "Response times too slow"                   │
│                                                                  │
│   [Dig into pricing] [See competitor analysis] [Export for board]│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 3: Deep Analysis Session

```
User: "I need to prepare for the board meeting tomorrow"

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   📋 Board Meeting Prep                                          │
│   Using your saved template: "Quarterly Board Review"            │
│                                                                  │
│   Section 1: Financial Overview                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Revenue: $3.4M (Q4)     vs Goal: $3.5M (97%)           │    │
│   │  [Waterfall chart showing gap drivers]                  │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│   Section 2: Key Risks                                           │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  1. APAC churn (addressed above)                        │    │
│   │  2. Enterprise pipeline slippage (2 deals at risk)      │    │
│   │  3. Runway: 18 months (healthy)                         │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│   Section 3: Asks                                                │
│   What do you want to request from the board?                    │
│   [Add ask] [Skip this section]                                  │
│                                                                  │
│   [Export as slides] [Practice with me] [Save for tomorrow]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼ User: "Add a slide about needing budget for APAC support team"

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Section 3: Asks (updated)                                      │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Ask #1: APAC Support Investment                        │    │
│   │                                                         │    │
│   │  Problem: APAC churn is 2x other regions                │    │
│   │  Root cause: Support response times (12h vs 2h target)  │    │
│   │  Ask: $150K budget for 3 APAC support hires             │    │
│   │  Expected impact: Reduce churn to 4%, save $400K ARR    │    │
│   │                                                         │    │
│   │  [Edit] [Add supporting data] [Remove]                  │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│   I drafted this based on your earlier APAC analysis.            │
│   Want me to strengthen the business case?                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Journey 4: Quick Question (Mobile)

```
MOBILE - Walking to meeting

┌──────────────────────────────────┐
│                                  │
│  [🎤] Tap to ask                 │
│                                  │
│  User taps, speaks:              │
│  "What's our MRR?"               │
│                                  │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│                                  │
│  MRR                             │
│  $1.24M                          │
│  ↑ 3% this month                 │
│                                  │
│  [More detail] [By segment]      │
│                                  │
│  Recent questions:               │
│  • Pipeline status               │
│  • Churn by region               │
│                                  │
│  [🎤]                            │
│                                  │
└──────────────────────────────────┘

Fast answer, minimal UI, voice-first.
```

---

## 15. Screen Specifications

### Briefing Screen (Default View)

```
┌─────────────────────────────────────────────────────────────────┐
│  [≡]                    KNOSIA                           [⚙️]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SIDEBAR              │                                         │
│  ┌─────────────────┐  │     Good morning, Alex                  │
│  │ 📌 SAVED VIEWS  │  │     Here's what changed since Tuesday:  │
│  │    Weekly Rev   │  │                                         │
│  │    Pipeline     │  │   ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │    Board Prep   │  │   │ Revenue │ │ Churn   │ │ Leads   │   │
│  │    + New        │  │   │ $1.2M   │ │ 4.2%    │ │ 47      │   │
│  ├─────────────────┤  │   │ ↑ 12%   │ │ ↑ 0.3%  │ │ ↑ 8     │   │
│  │ 💡 SUGGESTED    │  │   └─────────┘ └─────────┘ └─────────┘   │
│  │   Check APAC    │  │                                         │
│  │   [View][✕]     │  │   💡 APAC churn spiked 2x - investigate? │
│  ├─────────────────┤  │   [Yes] [Dismiss]                       │
│  │ 💬 SESSIONS     │  │                                         │
│  │   Today         │  │                                         │
│  │   ⭐ Board Prep │  │                                         │
│  │   Dec 27        │  │                                         │
│  │   Dec 26        │  │                                         │
│  │   📁 Archived   │  │                                         │
│  └─────────────────┘  │                                         │
│                       │                                         │
├───────────────────────┴─────────────────────────────────────────┤
│  [👤]  │  ✨ What would you like to explore?            [🎤]    │
└─────────────────────────────────────────────────────────────────┘

SPECIFICATIONS:
• Sidebar: 280px fixed width, collapsible on mobile
• KPI Cards: 3-4 per row, responsive grid
• Greeting: Time-aware, personalized
• Nudge: Max 1, prominent but dismissible
• Input: Floating, 48px height, always visible
```

### Analysis Screen (After Questions)

```
┌─────────────────────────────────────────────────────────────────┐
│  [≡]                    KNOSIA                           [⚙️]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SIDEBAR              │  BREADCRUMBS:                           │
│  ┌─────────────────┐  │  Revenue → by Region → APAC             │
│  │ 📌 SAVED VIEWS  │  │                                         │
│  │    ...          │  │  ┌───────────────────────────────────┐  │
│  ├─────────────────┤  │  │ 📌 APAC Revenue          [⋮ menu] │  │
│  │ 💡 SUGGESTED    │  │  │                                   │  │
│  │    ...          │  │  │   [Bar Chart]                     │  │
│  ├─────────────────┤  │  │                                   │  │
│  │ 💬 SESSIONS     │  │  └───────────────────────────────────┘  │
│  │   ● Current     │  │                                         │
│  │     "APAC..."   │  │  ┌───────────────────────────────────┐  │
│  │   Today         │  │  │ Churn by Segment           [⋮]    │  │
│  │   Dec 27        │  │  │                                   │  │
│  │   ...           │  │  │   [Stacked Bar]                   │  │
│  └─────────────────┘  │  │                                   │  │
│                       │  └───────────────────────────────────┘  │
│                       │                                         │
│                       │  ┌───────────────────────────────────┐  │
│                       │  │ Customer List              [⋮]    │  │
│                       │  │                                   │  │
│                       │  │   [Data Table]                    │  │
│                       │  │                                   │  │
│                       │  └───────────────────────────────────┘  │
│                       │                                         │
├───────────────────────┴─────────────────────────────────────────┤
│  [👤]  │  ✨ Now show me the support ticket trends      [🎤]    │
└─────────────────────────────────────────────────────────────────┘

SPECIFICATIONS:
• Blocks: Stack vertically, 16px gap
• Block header: Title + menu button
• Block menu: Save, pin, link, export, remove
• Canvas: Scrollable, blocks grow infinitely
• Current session: Highlighted in sidebar
```

### Saved View Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  [≡]                    KNOSIA                           [⚙️]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SIDEBAR              │  📌 Weekly Revenue Dashboard             │
│  ┌─────────────────┐  │  Last updated: Live • Shared with: Team │
│  │ 📌 SAVED VIEWS  │  │                                         │
│  │  ● Weekly Rev   │  │  ┌───────────────────────────────────┐  │
│  │    Pipeline     │  │  │ Revenue Trend                     │  │
│  │    Board Prep   │  │  │   [Line Chart - 12 months]        │  │
│  │    + New        │  │  └───────────────────────────────────┘  │
│  ├─────────────────┤  │                                         │
│  │ 💬 SESSIONS     │  │  ┌─────────────────┐ ┌─────────────────┐│
│  │   ...           │  │  │ By Region       │ │ By Product      ││
│  └─────────────────┘  │  │  [Bar Chart]    │ │  [Pie Chart]    ││
│                       │  └─────────────────┘ └─────────────────┘│
│                       │                                         │
│                       │  ┌───────────────────────────────────┐  │
│                       │  │ Top 10 Customers                  │  │
│                       │  │   [Data Table]                    │  │
│                       │  └───────────────────────────────────┘  │
│                       │                                         │
│                       │  [Edit layout] [Share] [Schedule]       │
│                       │                                         │
├───────────────────────┴─────────────────────────────────────────┤
│  [👤]  │  ✨ Add comparison to last year                [🎤]    │
└─────────────────────────────────────────────────────────────────┘

SPECIFICATIONS:
• Living Views: Data refreshes automatically
• Snapshots: Show "As of [date]" badge
• Edit mode: Drag to reorder, resize blocks
• Sharing: Permission-aware preview
```

---

## 16. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Shell structure + basic LiquidRender integration

| Task | Files | Priority |
|------|-------|----------|
| Create KnosiaShell component | `apps/web/src/modules/knosia/components/layout/shell.tsx` | P0 |
| Create KnosiaSidebar | `apps/web/src/modules/knosia/components/layout/sidebar.tsx` | P0 |
| Create KnosiaCanvas | `apps/web/src/modules/knosia/components/layout/canvas.tsx` | P0 |
| Create floating PromptInput | `apps/web/src/modules/knosia/components/input/prompt-input.tsx` | P0 |
| Integrate LiquidRender | `apps/web/src/modules/knosia/components/canvas/liquid-zone.tsx` | P0 |
| Wire up basic DSL flow | AI → DSL → LiquidUI → Canvas | P0 |
| Refactor Knosia layout | `apps/web/src/app/[locale]/dashboard/knosia/layout.tsx` | P0 |

**Deliverable:** Users can type a question, AI generates DSL, LiquidRender displays visualization.

### Phase 2: Notebook Experience (Weeks 3-4)

**Goal:** Progressive block growth + session management

| Task | Files | Priority |
|------|-------|----------|
| Block append logic | Canvas state management | P0 |
| Block menu (save, pin, export) | `components/canvas/block-menu.tsx` | P0 |
| Session auto-save | API + localStorage hybrid | P0 |
| Session list in sidebar | Sidebar sessions section | P0 |
| Star/archive sessions | Session actions | P1 |
| Snapshot vs Living View | Save modal + DB schema | P1 |
| Block linking | Filter propagation | P2 |

**Deliverable:** Full notebook experience with persistent sessions.

### Phase 3: Intelligence (Weeks 5-6)

**Goal:** Smart features that make Knosia irreplaceable

| Task | Files | Priority |
|------|-------|----------|
| Delta-first briefing | Briefing component + API | P0 |
| Follow-up detection | Conversation context tracking | P0 |
| Vocabulary definitions | Hover cards + API | P1 |
| Smart clarification | Assume + offer UI | P1 |
| Data freshness indicator | Context bar component | P1 |
| Suggested questions | Prompt suggestions API | P2 |
| Anomaly detection | Background analysis job | P2 |

**Deliverable:** Knosia feels intelligent and proactive.

### Phase 4: Personalization (Weeks 7-8)

**Goal:** Role-aware, time-aware, user-specific experience

| Task | Files | Priority |
|------|-------|----------|
| Role-based defaults | User preferences + API | P0 |
| Time-aware greetings | Briefing logic | P0 |
| Goal tracking | Goals schema + UI | P1 |
| Custom metrics | Vocabulary creation flow | P1 |
| Saved views (Living) | Views schema + UI | P1 |
| Abbreviation learning | Vocabulary learning | P2 |
| Alert preferences | Alert settings UI | P2 |

**Deliverable:** Knosia feels personalized to each user.

### Phase 5: Collaboration & Actions (Weeks 9-10)

**Goal:** Sharing, exports, integrations

| Task | Files | Priority |
|------|-------|----------|
| Share links | Sharing API + UI | P0 |
| Permission-aware sharing | Permission checks | P0 |
| Export (PDF, PNG) | Export service | P1 |
| Session handoff | Handoff flow | P1 |
| Scheduled digests | Scheduler + email | P2 |
| Slack integration | Slack app | P2 |
| Embedding | Embed endpoint | P3 |

**Deliverable:** Knosia is a collaboration tool, not just individual.

### Phase 6: Polish & Scale (Weeks 11-12)

**Goal:** Performance, mobile, advanced features

| Task | Files | Priority |
|------|-------|----------|
| Mobile responsive | All layout components | P0 |
| Voice input | Voice component | P1 |
| Meeting mode | UI mode toggle | P1 |
| Cross-device sync | Sync service | P2 |
| Audit log | Audit schema + UI | P2 |
| What-if scenarios | Scenario engine | P3 |
| Narrative generation | Story builder | P3 |

**Deliverable:** Production-ready Knosia.

---

## 17. Technical Specifications

### Component Architecture

```
apps/web/src/modules/knosia/
├── components/
│   ├── layout/
│   │   ├── shell.tsx           # Main wrapper
│   │   ├── sidebar.tsx         # Left sidebar
│   │   ├── canvas.tsx          # Main content area
│   │   └── context-bar.tsx     # Data freshness indicator
│   │
│   ├── input/
│   │   ├── prompt-input.tsx    # Floating text input
│   │   ├── voice-button.tsx    # Microphone toggle
│   │   └── suggestions.tsx     # Question suggestions
│   │
│   ├── canvas/
│   │   ├── liquid-zone.tsx     # LiquidRender container
│   │   ├── block.tsx           # Single block wrapper
│   │   ├── block-menu.tsx      # Block actions menu
│   │   └── breadcrumbs.tsx     # Navigation trail
│   │
│   ├── sidebar/
│   │   ├── saved-views.tsx     # Pinned views list
│   │   ├── suggestions.tsx     # AI nudges
│   │   └── sessions.tsx        # Conversation history
│   │
│   ├── briefing/
│   │   ├── greeting.tsx        # Time-aware hello
│   │   ├── delta-summary.tsx   # What changed
│   │   └── kpi-cluster.tsx     # Key metrics
│   │
│   └── modals/
│       ├── save-modal.tsx      # Snapshot vs Living
│       ├── share-modal.tsx     # Sharing options
│       └── export-modal.tsx    # Export options
│
├── hooks/
│   ├── use-knosia-session.ts   # Session state
│   ├── use-notebook.ts         # Block management
│   ├── use-dsl-generator.ts    # AI → DSL
│   └── use-conversation.ts     # Context tracking
│
├── types.ts                    # TypeScript definitions
└── index.ts                    # Barrel exports
```

### Key TypeScript Types

```typescript
// Block Types
type BlockSaveMode = "snapshot" | "living";

interface KnosiaBlock {
  id: string;
  dsl: LiquidDSL;
  data?: unknown;           // Frozen data (snapshot only)
  queryId?: string;         // Query reference (living only)
  mode: BlockSaveMode;
  pinned: boolean;
  linkedTo?: string[];      // Block IDs for filter sync
  annotation?: string;
  createdAt: Date;
}

// Session Types
interface KnosiaSession {
  id: string;
  userId: string;
  workspaceId: string;
  blocks: KnosiaBlock[];
  conversation: ConversationTurn[];
  starred: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  dslGenerated?: LiquidDSL;
  timestamp: Date;
}

// Saved View Types
interface SavedView {
  id: string;
  name: string;
  userId: string;
  workspaceId: string;
  blocks: KnosiaBlock[];
  sharedWith?: string[];    // User IDs
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Intelligence Types
interface Nudge {
  id: string;
  type: "anomaly" | "suggestion" | "reminder";
  title: string;
  description: string;
  action?: {
    label: string;
    query: string;
  };
  dismissedAt?: Date;
}

interface Goal {
  id: string;
  name: string;
  metric: string;
  target: number;
  deadline: Date;
  currentValue: number;
  onTrack: boolean;
}
```

### CSS Custom Properties

```css
:root {
  /* Knosia Theme */
  --knosia-bg: #0A0A0B;
  --knosia-bg-elevated: #141415;
  --knosia-bg-hover: #1C1C1E;

  --knosia-fg: #FAFAFA;
  --knosia-fg-muted: #71717A;
  --knosia-fg-subtle: #52525B;

  --knosia-accent-warm: #E5C07B;
  --knosia-accent-success: #98C379;
  --knosia-accent-warning: #E5C07B;
  --knosia-accent-danger: #E06C75;
  --knosia-accent-info: #61AFEF;

  --knosia-border: #27272A;
  --knosia-border-hover: #3F3F46;

  /* Layout */
  --knosia-sidebar-width: 280px;
  --knosia-input-height: 48px;
  --knosia-block-gap: 16px;
  --knosia-content-padding: 24px;

  /* Typography */
  --knosia-font-sans: 'Geist', system-ui, sans-serif;
  --knosia-font-mono: 'Geist Mono', monospace;
}
```

### API Contracts

```typescript
// Generate DSL from natural language
POST /api/knosia/generate
Request: {
  query: string;
  sessionId: string;
  context?: ConversationTurn[];
}
Response: {
  dsl: LiquidDSL;
  data: unknown;
  confidence: number;
  clarification?: {
    question: string;
    options: string[];
  };
}

// Save session
POST /api/knosia/sessions
Request: {
  workspaceId: string;
  blocks: KnosiaBlock[];
  conversation: ConversationTurn[];
}
Response: {
  id: string;
  createdAt: Date;
}

// Get briefing
GET /api/knosia/briefing?workspaceId={id}&role={role}
Response: {
  greeting: string;
  deltas: Delta[];
  kpis: KPI[];
  nudges: Nudge[];
}

// Save view
POST /api/knosia/views
Request: {
  name: string;
  workspaceId: string;
  blocks: KnosiaBlock[];
  isPublic: boolean;
}
Response: {
  id: string;
  shareUrl: string;
}
```

---

## Summary

Knosia is not a dashboard. It's a **conversational workspace** that:

1. **Speaks your language** — learns vocabulary, abbreviations, preferences
2. **Shows what matters** — delta-first, role-aware, goal-oriented
3. **Grows with you** — Jupyter-style notebook that expands as you explore
4. **Remembers everything** — sessions, snapshots, semantic search
5. **Takes action** — not just insights, but exports, alerts, integrations
6. **Earns trust** — transparent lineage, assumptions, confidence levels

The entire UI is powered by **LiquidRender**, making it:
- Instantly customizable via voice
- Sub-2-second rendering
- Saveable and shareable as DSL
- Future-proof for new visualization types

This is the vision. Implementation begins with the Shell + Canvas foundation, then layers intelligence, personalization, and collaboration on top.

---

*Document version: 1.0*
*Created: December 30, 2024*
*Author: Claude + Alex*
