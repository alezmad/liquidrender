# Knosia UX Bible - Knowledge Transfer Guide

*Items to integrate from `knosia-must-have-features.md` into `knosia-ux-bible.md`*

---

## Integration Strategy

**Principle:** Add without disrupting. The Bible's structure is solid — these additions fill gaps, not replace content.

| Integration Type | Approach |
|------------------|----------|
| New section | Add after related content, update TOC |
| Enhancement | Insert into existing section, match voice |
| Appendix | Add at end, reference from relevant sections |

---

## 1. Shell + Liquid Architecture

**Location:** Add to **§2 Core Concepts** after "Key Entities" table

**Why:** This is the technical backbone that enables everything. Currently missing from Bible.

### Content to Add

```markdown
### Technical Architecture

The Shell + Liquid pattern enables AI-driven UI customization:

┌─────────────────────────────────────────────────────────────────────┐
│  SHELL (Fixed React)              │  LIQUID (DSL → LiquidRender)    │
│  ─────────────────────            │  ────────────────────────────   │
│  • Auth, routing, sidebar         │  • Charts, tables, KPIs         │
│  • Input bar, context bar         │  • Any visualization            │
│  • Canvas container               │  • 77 components available      │
│  • Navigation, notifications      │  • Sub-2-second rendering       │
└─────────────────────────────────────────────────────────────────────┘

**Why this matters:**
- Users say "make that a bar chart" and it works
- AI generates DSL, not React code
- Shell provides stability; Liquid provides flexibility
- Enables natural language → visualization pipeline
```

---

## 2. Delta-First Briefing Philosophy

**Location:** Add to **§1 Philosophy** after "Design Principles" table

**Why:** This is a core differentiator. Bible mentions briefings but doesn't emphasize the "what changed" principle.

### Content to Add

```markdown
### Delta-First Philosophy

Traditional BI shows current state. Knosia shows **what changed**.

| Traditional BI | Knosia |
|----------------|--------|
| "Revenue: $2.4M" | "Revenue: $2.4M (+$42K vs typical Tuesday)" |
| Dashboard with 20 charts | "3 things changed since yesterday" |
| User interprets data | Knosia interprets, user validates |
| Charts first | Headlines first, charts on demand |

**Morning briefing pattern:**

"Good morning, Alex"
"Here's what changed since yesterday:"

📈 Revenue +$42K (vs typical Tuesday)
⚠️ Churn spike in APAC (+1.5%)
👥 3 new enterprise leads

**Principle:** Busy executives don't have time to interpret dashboards. Give them headlines, let them drill down.
```

---

## 3. Saved Views: Snapshot vs Living

**Location:** Add as new subsection in **§5 Notebook Experience** after "Block Interactions"

**Why:** This distinction doesn't exist in Bible but is critical for how users save and share work.

### Content to Add

```markdown
### Saved Views

Blocks can be saved in two modes with fundamentally different behaviors:

| Snapshot View | Living View |
|---------------|-------------|
| Freezes data at save moment | Refreshes data on every open |
| "Remember Dec 15 revenue" | "Always show current pipeline" |
| For: board decks, evidence, compliance | For: monitoring, recurring dashboards |
| Shows: "As of Dec 15, 2:30 PM" | Shows: "Last updated: 5 min ago" |

**UX Pattern:**

┌─────────────────────────────────────────────────────────────────────┐
│ 💾 Save View                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  View name: Q4 Revenue Summary                                      │
│                                                                     │
│  Save as:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ○ Snapshot — Data frozen at this moment                     │    │
│  │   "I want to preserve exactly what I see now"               │    │
│  │                                                              │    │
│  │ ● Living — Data refreshes when opened                       │    │
│  │   "I want this to always show current data"                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  [Cancel]                                              [Save View]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

**Use cases:**
- "Show me what I showed the board last quarter" → Snapshot
- "My Monday morning revenue check" → Living
- "Evidence for the audit" → Snapshot
- "Sales pipeline dashboard" → Living
```

---

## 4. Block Linking (Cross-Filtering)

**Location:** Add to **§14 Power User Features** after "Templates"

**Why:** This is a power feature mentioned in must-have but absent from Bible.

### Content to Add

```markdown
### Block Linking

Link blocks so interactions in one affect others — like Tableau cross-filtering.

**Example:**

┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─── Revenue by Region ────────┐  ┌─── Customers ────────────────┐ │
│  │                              │  │                              │ │
│  │  [NA] [EMEA] [APAC ←click]   │  │  Filtered to: APAC           │ │
│  │       ▲                      │  │                              │ │
│  │       └── User clicks APAC   │  │  • Acme Corp (Singapore)     │ │
│  │                              │  │  • DataTech (Tokyo)          │ │
│  │                              │  │  • CloudCo (Sydney)          │ │
│  └──────────────────────────────┘  └──────────────────────────────┘ │
│                              🔗 Linked                               │
│                                                                     │
│  ┌─── Churn Trend ──────────────────────────────────────────────┐   │
│  │  [chart filtered to APAC data]                                │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

**Link management:**

| Action | Result |
|--------|--------|
| Right-click block → "Link to..." | Select blocks to link |
| Click linked element | All linked blocks filter |
| Click elsewhere / "Clear filter" | Reset all linked blocks |
| 🔗 indicator | Shows block is part of a link group |

**Implementation note:** V2+ feature. Requires coordination layer between blocks.
```

---

## 5. Scheduled Digests

**Location:** Add to **§9 Notifications** after "Slack Integration"

**Why:** Proactive delivery is mentioned in must-have but not detailed in Bible.

### Content to Add

```markdown
### Scheduled Digests

Knosia comes to you — proactive delivery of insights on your schedule.

**Setup UI:**

┌─────────────────────────────────────────────────────────────────────┐
│ 📅 Schedule a Digest                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Name: Weekly Revenue Summary                                       │
│                                                                     │
│  When:                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Every [Monday ▼] at [8:00 AM ▼]                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  What to include:                                                   │
│  ☑ Pinned KPIs (Revenue, Churn, Pipeline)                          │
│  ☑ Week-over-week changes                                           │
│  ☐ Anomalies detected                                               │
│  ☐ Team activity summary                                            │
│                                                                     │
│  Deliver to:                                                        │
│  ☑ Email                                                            │
│  ☑ Slack: #ceo-updates                                              │
│  ☐ In-app only                                                      │
│                                                                     │
│  [Cancel]                                        [Create Schedule]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

**Digest example (email/Slack):**

┌─────────────────────────────────────────────────────────────────────┐
│ 📊 Weekly Revenue Summary                          Monday, 8:00 AM  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Hey Alex, here's your weekly summary:                              │
│                                                                     │
│  **Revenue:** $2.4M (+12% WoW) ✓                                    │
│  **Pipeline:** $8.2M (+3% WoW)                                      │
│  **Churn:** 2.1% (stable)                                           │
│                                                                     │
│  ⚠️ 1 thing to watch:                                               │
│  APAC churn trending up (now 4.2%)                                  │
│                                                                     │
│  [Open in Knosia] [Reply to investigate]                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

**Implementation note:** V2 feature. Requires email service + Slack integration.
```

---

## 6. What-If Scenarios

**Location:** Add to **§19 Intelligence & Learning** after "Goal Awareness"

**Why:** Scenario modeling is a key intelligence feature not covered in Bible.

### Content to Add

```markdown
### What-If Scenarios

Beyond reporting what happened — model what could happen.

**Example interaction:**

┌─────────────────────────────────────────────────────────────────────┐
│  Q: "What if we reduced churn by 2%?"                               │
│                                                                     │
│  🤖 Modeling scenario: Churn reduced from 4.2% → 2.2%               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  🔮 Projected Impact (12 months)                                ││
│  │                                                                 ││
│  │  Retained customers:    +847                                    ││
│  │  Additional ARR:        +$1.2M                                  ││
│  │  LTV improvement:       +18%                                    ││
│  │  CAC payback:           -2.3 months                             ││
│  │                                                                 ││
│  │  [chart: projected revenue with/without churn reduction]        ││
│  │                                                                 ││
│  │  Assumptions:                                                   ││
│  │  • Current ARPU: $142/mo                                        ││
│  │  • Avg customer lifetime: 28 months                             ││
│  │  • No change to acquisition rate                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  [Adjust assumptions] [Compare scenarios] [Save this scenario]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

**Scenario types:**

| Type | Example | Complexity |
|------|---------|------------|
| Single variable | "What if churn dropped 2%?" | Low |
| Multi-variable | "What if churn dropped AND we raised prices 10%?" | Medium |
| Time-based | "What if we hit $5M ARR by Q2?" | Medium |
| Comparative | "Scenario A vs Scenario B vs Current" | High |

**Implementation note:** V3+ feature. Requires financial modeling engine.
```

---

## 7. Success Criteria (Appendix)

**Location:** Add as **Appendix B** after Design Tokens

**Why:** Concrete metrics help measure if we're building the right thing.

### Content to Add

```markdown
## Appendix B: Success Criteria

### Product Metrics

| Metric | MVP Target | V1 Target | V2 Target |
|--------|------------|-----------|-----------|
| Time to first insight | < 10 seconds | < 5 seconds | < 3 seconds |
| Questions per session | ≥ 1 | ≥ 3 | ≥ 5 |
| Return users (weekly) | > 30% | > 60% | > 75% |
| Session save rate | 100% (auto) | 100% (auto) | 100% (auto) |
| NPS | > 20 | > 40 | > 50 |

### Experience Quality

| Aspect | Target |
|--------|--------|
| Query accuracy | > 85% correct on first try |
| Clarification rate | < 20% of queries need clarification |
| Error rate | < 5% of queries fail |
| Load time (briefing) | < 2 seconds |
| Load time (complex query) | < 5 seconds |

### Engagement Signals

| Signal | Healthy | Concerning |
|--------|---------|------------|
| Avg session length | 5-15 min | < 2 min or > 30 min |
| Questions per session | 3-10 | < 1 |
| Return within 48h | > 50% | < 25% |
| Notebook creation | > 1/week/user | 0 |
| Collaboration (comments, shares) | Growing | Flat or declining |
```

---

## 8. Scope Boundaries (Appendix)

**Location:** Add as **Appendix C** after Success Criteria

**Why:** Explicit "what we're NOT building" prevents scope creep and sets expectations.

### Content to Add

```markdown
## Appendix C: Scope Boundaries

### What Knosia Is NOT (V1-V2)

These are explicitly out of scope for early versions:

| Feature | Why Not Now | When Maybe |
|---------|-------------|------------|
| Real-time collaboration (multi-cursor) | Complexity vs value | V4+ |
| Custom SQL mode | Defeats natural language purpose | Maybe never |
| White-label embedding | Enterprise feature, not MVP | V3+ |
| Mobile native app | Responsive web first | V4+ |
| Third-party marketplace | Focus on core experience | V5+ |
| Multi-database joins | Technical complexity | V3+ |
| Custom visualizations | 77 components should suffice | V4+ |

### Philosophical Boundaries

| Knosia IS | Knosia IS NOT |
|-----------|---------------|
| A thinking partner | A query builder |
| Conversational | Form-based |
| Opinionated (assumes + offers) | Neutral (asks everything) |
| Proactive (surfaces insights) | Reactive only |
| Role-aware | One-size-fits-all |
| Collaborative | Single-player |

### When to Say No

Before adding a feature, ask:
1. Does it serve the "data scientist you can't afford" promise?
2. Can it be achieved through conversation instead of UI?
3. Does it help 80% of users or just 5%?
4. Does it make the product simpler or more complex?

If answers are No, No, 5%, More complex → Don't build it.
```

---

## Integration Checklist

After adding all content:

- [ ] Update Table of Contents in §0 with new subsections
- [ ] Renumber appendices if needed (current: A = Design Tokens)
- [ ] Search for any cross-references that need updating
- [ ] Verify wireframe ASCII art renders correctly
- [ ] Check that voice/tone matches existing Bible style

---

## TOC Updates Required

Add these to the Table of Contents:

```markdown
2. [Core Concepts](#2-core-concepts)
   - [Technical Architecture](#technical-architecture)  ← NEW
...
5. [Notebook Experience](#5-notebook-experience)
   ...
   - [Saved Views](#saved-views)  ← NEW
...
9. [Notifications](#9-notifications)
   ...
   - [Scheduled Digests](#scheduled-digests)  ← NEW
...
14. [Power User Features](#14-power-user-features)
    ...
    - [Block Linking](#block-linking)  ← NEW
...
19. [Intelligence & Learning](#19-intelligence--learning)
    ...
    - [What-If Scenarios](#what-if-scenarios)  ← NEW
...
21. [Appendix B: Success Criteria](#appendix-b-success-criteria)  ← NEW
22. [Appendix C: Scope Boundaries](#appendix-c-scope-boundaries)  ← NEW
```

---

*Transfer document created: 2025-12-31*
*Source: knosia-must-have-features.md → knosia-ux-bible.md*
