# Knosia MUST HAVE Features

> Synthesized from Vision Documents: `2025-12-30-1657-knosia-aesthetic-vision.md` and `2025-12-30-1737-knosia-complete-vision.md`

---

## Executive Summary

Knosia's value proposition is clear: **"The data scientist businesses can't afford."** These MUST HAVE features are the minimum viable product that delivers on this promise. Without them, Knosia is just another BI tool.

---

## Tier 1: Non-Negotiable Core (MVP)

These features define Knosia. Without them, we don't ship.

### 1. Natural Language Conversation

**What:** Users ask questions in plain English; Knosia responds with data + insights.

```
User: "Show me revenue by region"
→ Knosia generates visualization instantly

User: "Break that down by product"
→ Knosia understands "that" = previous context
```

**Why Non-Negotiable:**
- This IS the product differentiator
- Removes need for SQL knowledge or query builders
- Enables role-appropriate responses

**Technical Requirement:**
- AI → DSL generation pipeline
- Conversation context tracking (follow-up detection)
- LiquidRender integration for visualization

---

### 2. Shell + Liquid Architecture

**What:** Fixed React shell + AI-generated DSL that renders via LiquidRender (77 components).

```
┌─────────────────────────────────────────────────────────┐
│  SHELL (fixed React)          │  LIQUID (DSL → render)  │
│  • Auth, sidebar, input       │  • Charts, tables       │
│  • Context bar                │  • KPIs, layouts        │
│  • Canvas container           │  • ANY visualization    │
└─────────────────────────────────────────────────────────┘
```

**Why Non-Negotiable:**
- Enables AI to customize UI via natural language
- Sub-2-second rendering
- Users can say "make that a bar chart" and it works

**Technical Requirement:**
- KnosiaShell component wrapping LiquidRender canvas
- DSL generation from AI responses
- Block management (add, remove, reorder)

---

### 3. Delta-First Briefing

**What:** Morning briefing that shows WHAT CHANGED, not just current state.

```
"Good morning, Alex"
"Here's what changed since yesterday:"

📈 Revenue +$42K (vs typical Tuesday)
⚠️ Churn spike in APAC (+1.5%)
👥 3 new enterprise leads
```

**Why Non-Negotiable:**
- This is Knosia's "colleague" identity vs "cockpit" BI tools
- Busy executives don't have time to interpret dashboards
- Headlines over charts

**Technical Requirement:**
- Time-aware greeting component
- Delta calculations (vs yesterday, last week, typical)
- Alert detection and prioritization

---

### 4. Data Freshness & Transparency

**What:** Every number shows its source, assumptions, and how recent it is.

```
MRR: $1.2M
├── Source: Stripe subscriptions
├── Last sync: 5 minutes ago
├── Excludes: Trials, refunds
└── [View calculation]
```

**Why Non-Negotiable:**
- Trust is the foundation of data-driven decisions
- Users must know if data is stale before sharing with board
- Prevents "but my spreadsheet says different" conversations

**Technical Requirement:**
- Data freshness indicator (context bar)
- Vocabulary definitions on hover
- Source attribution on every metric

---

### 5. Session Persistence

**What:** All conversations auto-save. Users can return to any past session.

```
SIDEBAR:
💬 SESSIONS
   Today
   ⭐ Board Prep (starred)
   Dec 27 - Revenue Analysis
   Dec 26 - Churn Deep Dive
   📁 Archived
```

**Why Non-Negotiable:**
- Analysis shouldn't be lost
- Users reference past insights ("what did we find last Tuesday?")
- Foundation for collaboration and sharing

**Technical Requirement:**
- Auto-save on every interaction
- Session list in sidebar
- Star/archive functionality

---

## Tier 2: Core Experience (V1 Complete)

These make Knosia genuinely useful. Ship within 2 weeks of MVP.

### 6. Notebook-Style Block Growth

**What:** Canvas grows as questions are asked. Each block is independent.

```
User: "Show revenue" → Block 1 appears
User: "Add churn" → Block 2 appends below
User: "Compare regions" → Block 3 appends
```

**Why Critical:**
- Progressive disclosure (start simple, add complexity)
- Each block can be saved, exported, pinned independently
- Mimics how analysis actually works

---

### 7. Role-Aware Intelligence

**What:** Same data, different presentation based on who's asking.

| Role | Focus | Metrics | Language |
|------|-------|---------|----------|
| CEO | Strategy | Revenue, runway, churn | "Your business at a glance" |
| Sales | Pipeline | Deals, quota, leads | "Your pipeline this week" |
| Finance | Numbers | ARR, CAC, LTV | "Financial overview" |
| Support | Health | Tickets, CSAT, response time | "Customer health today" |

**Why Critical:**
- One vocabulary, many views
- Executives don't need pipeline details
- Sales doesn't need runway calculations

---

### 8. Saved Views (Snapshot & Living)

**What:** Users can save any block/layout in two modes:

| Snapshot | Living View |
|----------|-------------|
| Freezes data at that moment | Refreshes data on open |
| "Remember Dec 15 revenue" | "Always show current pipeline" |
| Good for: board decks, evidence | Good for: monitoring, dashboards |

**Why Critical:**
- Historical record for compliance
- Recurring dashboards without rebuilding
- "Show me what I showed the board last quarter"

---

### 9. Smart Clarification (Assume + Offer)

**What:** When ambiguous, show best guess and offer alternatives.

```
❌ BAD (blocking):
"Did you mean (A) Revenue (B) Units sold (C) Team performance?"

✅ GOOD (assume + offer):
"Revenue: $1.2M (+12%)"
"Showing revenue. Did you mean something else?"
[Units sold] [Team performance] [This is right ✓]
```

**Why Critical:**
- Don't block the user with modals
- Fast path for 80% of questions
- Easy correction for 20%

---

### 10. Floating Prompt Input

**What:** Input always visible at bottom of screen. Supports text + voice.

```
┌─────────────────────────────────────────────────────────┐
│  ✨ Ask anything...                              [🎤]  │
│                                                         │
│  💡 Suggested: [Pipeline status] [Churn by segment]    │
└─────────────────────────────────────────────────────────┘
```

**Why Critical:**
- Always accessible = lower friction
- Suggested questions reduce cognitive load
- Voice-first option for hands-free

---

## Tier 3: Delighters (V2+)

These make Knosia irreplaceable. Plan but don't block launch.

### 11. Anomaly Detection + Proactive Alerts

**What:** Knosia notices unusual patterns and surfaces them proactively.

```
💡 SUGGESTED (sidebar):
"Revenue dropped 8% - unusual for Tuesday"
[View] [Dismiss]
```

**Why Important (but not blocking):**
- Differentiator: don't wait for users to ask
- Requires historical pattern learning
- Max 1-2 nudges (not spammy)

---

### 12. Block Linking

**What:** Click a region on one chart, all linked charts filter to that region.

```
User clicks "North America" on Revenue chart
→ Customer Table filters to NA
→ Churn Trend filters to NA
```

**Why Important (but not blocking):**
- Power user feature
- Requires coordination between blocks
- Can ship without linking initially

---

### 13. Export + Share

**What:** Export blocks as PDF/PNG/CSV. Share views with teammates.

```
Share options:
• Link (recipient sees their permission-filtered version)
• Fork (recipient gets editable copy)
• Export (PDF, PNG, Slides, Excel)
```

**Why Important (but not blocking):**
- Enables board decks, reports
- Must respect permissions
- Can use simple screenshot initially

---

### 14. Scheduled Digests

**What:** "Send me a summary every Monday at 8am"

```
📅 Scheduled: Weekly Digest
When: Mondays at 8:00 AM
What: Your pinned KPIs + week-over-week changes
Where: Email + Slack #ceo-updates
```

**Why Important (but not blocking):**
- Knosia comes to YOU (proactive)
- Requires email/Slack integrations
- Can be Phase 2 feature

---

### 15. Voice Input

**What:** Tap microphone, speak question, get answer.

**Why Important (but not blocking):**
- Mobile-first, hands-free
- Differentiator for executives on-the-go
- Requires speech-to-text integration

---

### 16. What-If Scenarios

**What:** "What if churn dropped 2%?" → AI models the impact.

```
🔮 Scenario: Churn reduced from 4.2% → 2.2%

Impact over 12 months:
• Retained customers: +847
• Additional ARR: +$1.2M
• LTV improvement: +18%
```

**Why Important (but not blocking):**
- Advanced analysis feature
- Requires scenario modeling engine
- Power user / executive feature

---

## Priority Matrix

| Feature | Tier | Phase | Effort | Impact |
|---------|------|-------|--------|--------|
| Natural Language Conversation | 1 | MVP | High | Critical |
| Shell + Liquid Architecture | 1 | MVP | High | Critical |
| Delta-First Briefing | 1 | MVP | Medium | Critical |
| Data Freshness & Transparency | 1 | MVP | Medium | Critical |
| Session Persistence | 1 | MVP | Medium | Critical |
| Notebook Block Growth | 2 | V1 | Medium | High |
| Role-Aware Intelligence | 2 | V1 | Medium | High |
| Saved Views | 2 | V1 | Medium | High |
| Smart Clarification | 2 | V1 | Low | High |
| Floating Prompt | 2 | V1 | Low | High |
| Anomaly Detection | 3 | V2 | High | Medium |
| Block Linking | 3 | V2 | Medium | Medium |
| Export + Share | 3 | V2 | Medium | Medium |
| Scheduled Digests | 3 | V2 | High | Medium |
| Voice Input | 3 | V2 | Medium | Medium |
| What-If Scenarios | 3 | V3 | High | Medium |

---

## Implementation Order

### Week 1-2: MVP Core
1. KnosiaShell + Sidebar + Canvas (layout)
2. Floating PromptInput
3. AI → DSL → LiquidRender pipeline
4. Basic conversation (no context tracking yet)

### Week 3-4: Notebook Experience
5. Block append/management
6. Session auto-save + list
7. Delta-first briefing component
8. Data freshness indicator

### Week 5-6: Intelligence
9. Follow-up detection (conversation context)
10. Smart clarification UI
11. Vocabulary definitions on hover
12. Role-aware defaults

### Week 7-8: Persistence
13. Saved Views (Snapshot vs Living)
14. Star/archive sessions
15. Block menu (save, export, pin)

### Week 9+: Delighters
16. Export (PDF, PNG)
17. Share links
18. Anomaly detection
19. Voice input
20. Scheduled digests

---

## Success Criteria

| Metric | MVP Target | V1 Target |
|--------|------------|-----------|
| Time to first insight | < 10 seconds | < 5 seconds |
| Questions per session | ≥ 1 | ≥ 3 |
| Return users (weekly) | > 30% | > 60% |
| Session save rate | 100% (auto) | 100% (auto) |

---

## What We're NOT Building (Yet)

- Real-time collaboration (multi-cursor editing)
- Custom SQL mode
- White-label embedding
- Mobile native app (responsive web first)
- Third-party marketplace integrations

These are V3+ features. Focus on the core conversation experience first.

---

*Document created: 2025-12-31*
*Source: Vision documents from 2025-12-30*
