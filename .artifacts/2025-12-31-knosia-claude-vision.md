# Knosia: Claude's Independent Vision

*A complete UX vision for Knosia — the proactive data intelligence partner.*

**Author:** Claude (independent vision)
**Date:** 2025-12-31
**Status:** Vision Proposal

---

## Executive Summary

Knosia is not a dashboard tool. Not a chatbot. Not a BI platform.

**Knosia is a proactive intelligence partner** that thinks about your business while you're not looking, and tells you what matters.

### The Core Insight

The market has query tools (you ask, it answers) and dashboard tools (you look, you interpret). Neither solves the real problem:

> Most business users don't know what questions to ask, and don't have time to interpret charts.

**Knosia's differentiation:** It surfaces insights BEFORE you ask.

---

## The Three Surfaces

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Brief]        [Canvases ▼]        [Threads]        [Team]        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    (Current surface content)                        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Ask anything...                                              🎤    │
└─────────────────────────────────────────────────────────────────────┘
```

| Surface | Purpose | Primary Users |
|---------|---------|---------------|
| **Brief** | Daily intelligence — what changed, what matters | Everyone (80% of usage) |
| **Canvases** | Living business views — AI-curated, evolving | Managers, Executives |
| **Threads** | Investigations — persistent explorations | Analysts, Power Users |
| **Team** | Shared knowledge, activity, collaboration | All |

---

## 1. The Brief

**The primary interface for 80% of users.**

The Brief is not a dashboard. It's a personalized intelligence briefing that answers: "What do I need to know right now?"

### Brief Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Good morning, Alex                               Tuesday, Dec 31   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  🔴 ATTENTION REQUIRED                                              │
│                                                                     │
│  APAC churn spiked to 4.2%                                          │
│  I've seen this pattern before — March had similar spike before     │
│  competitor launch. Worth investigating.                            │
│  [Investigate] [Remind me tomorrow] [Dismiss]                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  🟢 ON TRACK                                                        │
│                                                                     │
│  Revenue: $2.4M (+$42K vs typical Tuesday)                          │
│  Pipeline: $8.2M (healthy for Q4 close)                             │
│  Churn (ex-APAC): 2.1% (stable)                                     │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  💡 SOMETHING I'VE BEEN THINKING ABOUT                              │
│                                                                     │
│  Your CAC increased 23% this quarter, but LTV only increased 8%.    │
│  If this trend continues, payback period extends to 18 months.      │
│  [Show me the analysis] [Not relevant] [Watch this metric]          │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📋 YOUR TASKS                                                      │
│                                                                     │
│  □ Review Q4 forecast (Sarah requested)                             │
│  □ Approve pipeline report                                          │
│  □ 2 Threads awaiting your input                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Brief Principles

| Principle | Description |
|-----------|-------------|
| **Delta-first** | Show what CHANGED, not current state |
| **Opinionated** | Knosia interprets; user validates |
| **Role-aware** | CFO sees different things than Sales VP |
| **Actionable** | Every insight has clear next steps |
| **Proactive** | AI surfaces things you didn't ask about |

### Brief Sections

| Section | Content | Frequency |
|---------|---------|-----------|
| **Attention Required** | Anomalies, risks, things that need action | When relevant |
| **On Track** | Key metrics, all healthy | Always |
| **Thinking About** | AI-initiated insights, patterns noticed | 1-2 per day max |
| **Tasks** | Pending actions, requests from team | When present |

---

## 2. Canvases

**Living business views — not static dashboards.**

Canvases are AI-curated, evolving views of business areas. They replace traditional dashboards.

### Canvas vs Dashboard

| Traditional Dashboard | Knosia Canvas |
|-----------------------|---------------|
| You build it manually | AI generates, you refine |
| Static layout | Evolves based on what matters |
| Shows data | Shows data + interpretation |
| You check it | It alerts you when relevant |
| Fixed metrics | Suggests new metrics to watch |

### Default Canvases (Role-Based)

```
Canvases ▼
├── Sales Health          ← AI-generated for Sales roles
├── Finance Overview      ← AI-generated for Finance roles
├── Product Metrics       ← AI-generated for Product roles
├── Pipeline Deep Dive    ← You asked for this, AI built it
└── + Create Canvas
```

### Canvas Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Sales Health Canvas                              Last updated: now │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌─── HERO METRIC ─────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  Pipeline Value: $8.2M                                          ││
│  │  ████████████████████████░░░░░░ 82% of Q4 target                ││
│  │                                                                 ││
│  │  +12% vs last week • On track for $10M                          ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─── BY REGION ───────────┐  ┌─── BY STAGE ───────────────────────┐│
│  │  [chart]                │  │  [chart]                           ││
│  │                         │  │                                    ││
│  │  NA: $4.1M (50%)        │  │  Discovery: $2.1M                  ││
│  │  EMEA: $2.8M (34%)      │  │  Proposal: $3.4M                   ││
│  │  APAC: $1.3M (16%)      │  │  Negotiation: $2.7M                ││
│  └─────────────────────────┘  └────────────────────────────────────┘│
│                                                                     │
│  ┌─── WATCH LIST ──────────────────────────────────────────────────┐│
│  │  ⚠️ 3 deals stalled > 14 days ($1.2M at risk)                   ││
│  │  ⚠️ APAC pipeline down 8% WoW                                   ││
│  │  [Investigate stalled deals]                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  "Add churn by segment" | "Show quarterly" | "Alert if pipeline <$7M"│
└─────────────────────────────────────────────────────────────────────┘
```

### Canvas Customization (Natural Language)

Users customize Canvases through conversation:

| Command | Result |
|---------|--------|
| "Add churn by region" | New chart added |
| "Make revenue the hero metric" | Layout reorganized |
| "Show this quarterly" | Time granularity changed |
| "Alert me if pipeline drops below $7M" | Alert configured |
| "Remove the stage breakdown" | Chart removed |
| "Compare to last quarter" | Comparison overlay added |

### Canvas Alerts

Canvases can proactively notify:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔔 CANVAS ALERTS                                                   │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ☑ Alert if pipeline < $7M                                         │
│  ☑ Alert if any deal stalls > 10 days                              │
│  ☐ Weekly summary every Monday                                      │
│  [+ Add alert]                                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Threads

**Persistent investigations — conversations that matter.**

Threads are ongoing explorations that persist, can be shared, and accumulate knowledge.

### Thread Anatomy

```
┌─────────────────────────────────────────────────────────────────────┐
│  APAC Churn Investigation                                    ⭐ 🔗  │
│  Started Dec 28 • Last active 2h ago • You + Sarah                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  You: Why did APAC churn spike this month?                          │
│                                                                     │
│  ┌─── Knosia ──────────────────────────────────────────────────────┐│
│  │  APAC churn increased from 2.8% → 4.2% in December.             ││
│  │                                                                 ││
│  │  [chart: churn by region, Dec highlighted]                      ││
│  │                                                                 ││
│  │  Three possible factors:                                        ││
│  │  1. Price increase took effect Dec 1 (APAC only)                ││
│  │  2. Competitor launched in Singapore Dec 5                      ││
│  │  3. Support response times increased 40%                        ││
│  │                                                                 ││
│  │  ───────────────────────────────────────────────────────────    ││
│  │  🕐 As of Dec 31, 9:00 AM                                       ││
│  │  📊 Source: Stripe.subscriptions + Zendesk.tickets              ││
│  │  ████████░░ Calculated                                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                           💬 2      │
│                                                                     │
│  You: Dig into the pricing correlation                              │
│                                                                     │
│  ┌─── Knosia ──────────────────────────────────────────────────────┐│
│  │  Strong correlation found (R² = 0.73)...                        ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Ask a follow-up...                                            🎤   │
└─────────────────────────────────────────────────────────────────────┘
```

### Thread Features

| Feature | Included | Description |
|---------|----------|-------------|
| **Block Trust Metadata** | ✅ Yes | Every response shows source, freshness, confidence |
| **Comments** | ✅ Yes | Lightweight annotations, @mentions |
| **Sharing** | ✅ Yes | Private, View-only, or Collaborative |
| **Forking** | ✅ Yes | Explore different directions from any point |
| **Snapshots** | ✅ Yes | Freeze Thread state for record/evidence |
| **AI-Initiated** | ✅ Yes | Knosia can start Threads proactively |
| **Block Versioning** | ❌ No | Conversations flow forward |
| **Block Reordering** | ❌ No | Linear by design |

### Thread Sidebar

```
┌─────────────────────────────────────────────────────────────────────┐
│  THREADS                                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⭐ STARRED                                                         │
│  ├── APAC Churn Investigation                            (active)  │
│  └── Q4 Revenue Forecast                                           │
│                                                                     │
│  🤖 AI-CREATED                                                      │
│  ├── "Why December looks different"        ← AI noticed something  │
│  └── "CAC trend worth watching"            ← AI started this       │
│                                                                     │
│  🕐 RECENT                                                          │
│  ├── Sales pipeline review                                         │
│  ├── Pricing impact analysis                                       │
│  └── Competitor comparison                                         │
│                                                                     │
│  📂 FOLDERS                                                         │
│  ├── Board Materials/                                              │
│  ├── Monthly Reviews/                                              │
│  └── + New folder                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Forking (Not Branching)

Forks create independent explorations from any point:

```
Thread: APAC Churn Investigation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶
    Q1      Q2      Q3
    │       │       │
    │       │       └─── 🍴 Fork: "Competitor angle" (Sarah)
    │       │
    │       └─── 📸 Snapshot: "Pre-pricing hypothesis"
    │
    └─── 📸 Snapshot: "Board meeting evidence"
```

- **Snapshots** = Frozen views of the past (read-only, immutable)
- **Forks** = New explorations from any point (independent Threads)

### Thread → Canvas Graduation

When a Thread produces stable insights, it can become a Canvas:

```
┌─────────────────────────────────────────────────────────────────────┐
│  This Thread has produced 3 stable findings:                       │
│                                                                     │
│  ☑ APAC churn correlation with pricing (R² = 0.73)                 │
│  ☑ Churn by region breakdown                                        │
│  ☑ Support response time impact                                     │
│                                                                     │
│  [Create Canvas from findings]  [Keep as Thread]                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Block Trust Metadata

**Every AI response MUST show provenance.**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Revenue this month: $2.4M (+12% MoM)                               │
│                                                                     │
│  [chart: monthly revenue trend]                                     │
│                                                                     │
│  ───────────────────────────────────────────────────────────────    │
│  🕐 As of Dec 31, 2:30 PM                                           │
│  📊 Source: Stripe.subscriptions → filter(active) → sum(amount)    │
│  ⚠️ Assumptions: USD only, excludes refunds                         │
│  ████████████░░ Exact (direct from source)                          │
│  ───────────────────────────────────────────────────────────────    │
│  [View query] [Refresh] [Report issue]                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Confidence Levels

| Level | Visual | Meaning |
|-------|--------|---------|
| **Exact** | ██████████ | Direct from source, no transformation |
| **Calculated** | ████████░░ | Derived from exact data |
| **Estimated** | ██████░░░░ | Uses sampling or approximation |
| **Predicted** | ████░░░░░░ | ML/AI forecast |

---

## 5. The Prompt Bar

**Universal input — always present, context-aware.**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Ask anything...                                              🎤 ⌘K │
└─────────────────────────────────────────────────────────────────────┘
```

The prompt bar knows where you are:

| Context | Behavior |
|---------|----------|
| On Brief | Quick questions, start new Thread |
| On Canvas | Customize canvas, ask about visible data |
| In Thread | Continue conversation, follow-up questions |
| Global (⌘K) | Search, navigate, quick answers |

### Prompt Examples

```
"What's our churn rate?"                    → Quick answer
"Why did revenue drop last week?"           → Starts Thread
"Add pipeline by stage to this canvas"      → Modifies Canvas
"Show me Sarah's APAC analysis"             → Navigation
"Create a Finance canvas"                   → Creates Canvas
"Remind me about this tomorrow"             → Sets reminder
```

---

## 6. AI-Initiated Actions

**Knosia doesn't just respond — it initiates.**

### AI Can Start Threads

```
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 AI-CREATED THREAD                                               │
│                                                                     │
│  "I noticed your CAC increased 23% but LTV only 8%"                │
│                                                                     │
│  I started investigating this pattern. Here's what I found so far: │
│                                                                     │
│  [View Thread] [Dismiss] [Don't track this]                        │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Can Suggest Canvas Updates

```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 SUGGESTION                                                      │
│                                                                     │
│  You've asked about APAC churn 5 times this week.                  │
│  Want me to add it to your Sales Canvas?                           │
│                                                                     │
│  [Yes, add it] [No thanks] [Remind me later]                       │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Remembers Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ APAC churn spiked to 4.2%                                       │
│                                                                     │
│  🤖 I've seen this pattern before.                                  │
│                                                                     │
│  Similar event: March 2024                                          │
│  • APAC churn hit 4.5%                                              │
│  • Root cause: Competitor launched in Singapore                     │
│  • Resolution: Pricing adjustment + feature push                    │
│  • Recovery: 6 weeks                                                │
│                                                                     │
│  [Compare to March] [Start investigation]                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Collaboration

### Sharing Model

| Mode | Description | Use Case |
|------|-------------|----------|
| **Private** | Only you can see | Personal exploration |
| **View-only** | Others see, can't edit | "Look what I found" |
| **Collaborative** | Others can contribute | Team investigation |

### Comments

Lightweight annotations on any block:

```
┌─────────────────────────────────────────────────────────────────────┐
│  💬 2 comments                                                      │
│  ───────────────────────────────────────────────────────────────    │
│  Sarah: This matches what Singapore team reported                   │
│  You: @Mike can you verify the support ticket data?                │
│  ───────────────────────────────────────────────────────────────    │
│  Add comment...                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Team Activity

```
┌─────────────────────────────────────────────────────────────────────┐
│  TEAM                                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  RECENT ACTIVITY                                                    │
│  ├── Sarah shared "APAC Churn Analysis"                  2h ago    │
│  ├── Mike commented on your Pipeline Thread              3h ago    │
│  └── Finance Canvas updated with new metrics            yesterday  │
│                                                                     │
│  SHARED WITH YOU                                                    │
│  ├── Q4 Forecast (Sarah) — needs your review                       │
│  └── Competitor Analysis (Mike) — view only                        │
│                                                                     │
│  TEAM CANVASES                                                      │
│  ├── Executive Dashboard                                           │
│  ├── Sales Shared View                                             │
│  └── + Create shared canvas                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Notifications & Digests

### Notification Types

| Type | Trigger | Channel |
|------|---------|---------|
| **Alert** | Canvas threshold crossed | In-app, Slack, Email |
| **Mention** | @you in comment | In-app, Slack |
| **Share** | Thread/Canvas shared with you | In-app |
| **AI Insight** | Knosia found something | In-app (Brief) |

### Scheduled Digests

```
┌─────────────────────────────────────────────────────────────────────┐
│  📅 SCHEDULED DIGESTS                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Weekly Revenue Summary                                             │
│  Every Monday at 8:00 AM → Email + Slack                           │
│  [Edit] [Pause] [Delete]                                           │
│                                                                     │
│  Daily Pipeline Check                                               │
│  Every day at 9:00 AM → Slack only                                 │
│  [Edit] [Pause] [Delete]                                           │
│                                                                     │
│  [+ Create digest]                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Navigation

### Header

```
┌─────────────────────────────────────────────────────────────────────┐
│  🧠 Knosia   [Brief] [Canvases ▼] [Threads] [Team]      🔔 👤 ⚙️   │
└─────────────────────────────────────────────────────────────────────┘
```

### Global Search (⌘K)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Search Knosia...                                          ⌘K   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  APAC churn                                                         │
│                                                                     │
│  THREADS                                                            │
│  ├── APAC Churn Investigation                          2 hours ago │
│  └── Q3 Regional Analysis (mentions APAC churn)        Last week   │
│                                                                     │
│  CANVASES                                                           │
│  └── Sales Health (contains APAC metrics)                          │
│                                                                     │
│  QUICK ANSWER                                                       │
│  └── Current APAC churn: 4.2% (up from 2.8%)                       │
│                                                                     │
│  [Ask as new question →]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Vocabulary Layer

**The semantic foundation that makes everything work.**

### What Vocabulary Solves

"Active Users" means different things to different teams:
- Engineering: Users with sessions in last 24h
- Product: Users who completed core action in last 7d
- Sales: Users on paid plans with login in last 30d

Knosia establishes **shared definitions**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  MRR (Monthly Recurring Revenue)                                    │
│  ───────────────────────────────────────────────────────────────    │
│                                                                     │
│  Formula: SUM(subscription.amount) WHERE status = 'active'          │
│                                                                     │
│  Source: Stripe subscriptions table                                 │
│  Owner: Finance Team                                                │
│  Last updated: Dec 15, 2025                                         │
│                                                                     │
│  ⚠️ Note: Excludes pilot customers per Finance policy               │
│                                                                     │
│  [View usage history] [Suggest correction]                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Vocabulary On-Demand

Click any metric to see its definition:

```
Pipeline Value: $8.2M
       ▲
       └── Click to see definition
```

---

## 11. Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Proactive > Reactive** | Knosia comes to you with insights |
| **Headlines > Charts** | Tell me what it means first |
| **Conversation > Forms** | Natural language everywhere |
| **Memory > Amnesia** | Remember context, build knowledge |
| **Opinion > Neutrality** | Knosia has a point of view |
| **Simple > Complete** | 3 surfaces, not 10 |

### What Makes This New (But Familiar)

**Familiar patterns borrowed:**
- Brief → Like morning news briefing (Axios, The Skimm)
- Canvases → Like Notion databases, but AI-generated
- Threads → Like Slack threads, but for data
- Prompt bar → Like Spotlight / Command-K

**New patterns introduced:**
- AI creates artifacts proactively
- Business vocabulary as semantic layer
- Delta-first thinking (what changed > what is)
- Thread → Canvas graduation

---

## 12. What Knosia Is NOT

### Explicit Boundaries

| Feature | Status | Rationale |
|---------|--------|-----------|
| Custom SQL mode | ❌ Never | Defeats natural language purpose |
| Dashboard builder | ❌ Never | Canvases replace this paradigm |
| Real-time multi-cursor | ❌ V4+ | Complexity vs value |
| White-label embedding | ❌ V3+ | Enterprise feature |
| Mobile native app | ❌ V4+ | Responsive web first |

### Philosophical Boundaries

| Knosia IS | Knosia IS NOT |
|-----------|---------------|
| A thinking partner | A query builder |
| Conversational | Form-based |
| Opinionated | Neutral |
| Proactive | Reactive only |
| Role-aware | One-size-fits-all |

---

## 13. Success Metrics

### Product Metrics

| Metric | MVP | V1 | V2 |
|--------|-----|----|----|
| Time to first insight | < 10s | < 5s | < 3s |
| Brief opens per user/day | ≥ 1 | ≥ 2 | ≥ 3 |
| Threads started per week | ≥ 2 | ≥ 5 | ≥ 10 |
| AI-initiated insight engagement | > 20% | > 40% | > 60% |

### Experience Quality

| Metric | Target |
|--------|--------|
| Query accuracy (first try) | > 85% |
| Brief load time | < 2 seconds |
| Clarification rate | < 20% |

---

## Summary

Knosia's value proposition:

> **Stop interpreting dashboards. Start receiving intelligence.**

The three surfaces:
1. **Brief** — What you need to know (80% of usage)
2. **Canvases** — Living views you customize (replacing dashboards)
3. **Threads** — Investigations that persist (replacing notebooks)

The key differentiators:
1. AI is proactive, not just reactive
2. Delta-first: what changed, not what is
3. Role-aware personalization
4. Vocabulary as semantic foundation
5. Memory and pattern recognition

---

*End of Claude's Independent Vision*
