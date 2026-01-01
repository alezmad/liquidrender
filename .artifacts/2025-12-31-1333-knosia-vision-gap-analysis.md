# Knosia Vision Implementation: Gap Analysis

**Date:** 2025-12-31
**Purpose:** Pre-implementation analysis comparing current state to Claude's vision
**Status:** Planning

---

## Executive Summary

The vision introduces a fundamentally different UX paradigm. Current implementation is **query-reactive** (user asks, system answers). Vision is **proactive-first** (system surfaces, user validates).

### Implementation Risk: High
The vision requires:
- New database tables (~8-10 additional)
- New API modules (~5 new routers)
- Significant frontend restructure (3 surfaces vs current 1)
- AI behavior changes (proactive vs reactive)

---

## 1. Architecture Comparison

### Vision's Three Surfaces

| Surface | Vision Purpose | Current State | Gap |
|---------|---------------|---------------|-----|
| **Brief** | Daily intelligence, delta-first | Basic briefing page | Partial - needs AI-initiated insights, attention sections |
| **Canvases** | Living business views | ❌ Not built | Full - new concept |
| **Threads** | Persistent investigations | Conversations exist | Partial - missing forking, snapshots, AI-initiated |

### Current 15 Tables vs Vision Requirements

| Vision Concept | Current Table | Gap |
|----------------|---------------|-----|
| Brief | — | Uses Briefing API, no persistence for AI insights |
| Canvases | — | ❌ Need `knosia_canvas` + `knosia_canvas_block` |
| Threads | `knosia_conversation` | Partial - add forking, snapshots, sharing |
| Block Trust Metadata | `visualization` jsonb in messages | Partial - need full provenance |
| Comments | — | ❌ Need `knosia_comment` |
| Sharing | `sharing` jsonb in conversation | Partial - need full model |
| Notifications | `notification` jsonb in preferences | ❌ Need `knosia_notification` |
| Digests | — | ❌ Need `knosia_digest` |
| AI-Initiated | — | ❌ Need tracking system |
| Team Activity | — | ❌ Need `knosia_activity` |

---

## 2. Database Schema Changes Required

### New Tables Needed

```
NEW TABLES (~8):
├── knosia_canvas           ← Living business view container
├── knosia_canvas_block     ← Individual blocks within canvas
├── knosia_thread_snapshot  ← Frozen Thread states
├── knosia_thread_fork      ← Fork relationships
├── knosia_comment          ← Annotations on blocks/threads
├── knosia_notification     ← User notifications
├── knosia_digest           ← Scheduled digest configs
├── knosia_activity         ← Team activity feed
└── knosia_ai_insight       ← AI-initiated insights tracking
```

### Existing Table Modifications

```sql
-- knosia_conversation: Add Thread-specific fields
ALTER TABLE knosia_conversation ADD COLUMN
  is_ai_initiated BOOLEAN DEFAULT FALSE,
  parent_thread_id TEXT REFERENCES knosia_conversation(id),
  forked_from_message_id TEXT,
  starred BOOLEAN DEFAULT FALSE;

-- knosia_conversation_message: Add Block Trust Metadata
ALTER TABLE knosia_conversation_message ADD COLUMN
  provenance JSONB, -- { source, freshness, assumptions, confidence_level }
  data_sources TEXT[]; -- Array of source identifiers
```

---

## 3. API Modules Required

### New API Modules

| Module | Endpoints | Priority |
|--------|-----------|----------|
| **Canvas** | CRUD, blocks, alerts, share | High |
| **Thread** | Fork, snapshot, share, star | High |
| **Notification** | List, dismiss, configure | Medium |
| **Digest** | Schedule, preview, send | Medium |
| **Activity** | Feed, filter by user/type | Low |

### Existing Module Enhancements

| Module | Changes Needed |
|--------|----------------|
| **Briefing** | Add AI-initiated insights, attention-required section |
| **Conversation** | Support forking, snapshots, AI-initiation |

---

## 4. Frontend Changes

### Current Structure
```
apps/web/src/modules/
├── onboarding/          ← Onboarding flow (complete)
└── knosia/              ← Dashboard module (basic)
    └── components/
        ├── briefing-view.tsx
        └── ask-input.tsx
```

### Required Structure
```
apps/web/src/modules/
├── onboarding/          ← Keep
├── knosia/
│   ├── brief/           ← Brief surface (enhance existing)
│   │   ├── attention-section.tsx
│   │   ├── on-track-section.tsx
│   │   ├── thinking-section.tsx
│   │   └── tasks-section.tsx
│   ├── canvas/          ← NEW: Canvas surface
│   │   ├── canvas-view.tsx
│   │   ├── canvas-block.tsx
│   │   ├── canvas-editor.tsx
│   │   └── canvas-alerts.tsx
│   ├── threads/         ← NEW: Threads surface
│   │   ├── thread-view.tsx
│   │   ├── thread-sidebar.tsx
│   │   ├── thread-message.tsx
│   │   └── block-trust-metadata.tsx
│   └── shared/          ← Shared components
│       ├── prompt-bar.tsx
│       ├── command-palette.tsx
│       └── notification-bell.tsx
```

---

## 5. Recommended Implementation Sequence

### Phase 0: Decision Points (BEFORE coding)

**You must decide:**

1. **MVP Scope** - Which surfaces are MVP vs V2?
   - Option A: Brief only (smallest)
   - Option B: Brief + Threads (natural progression)
   - Option C: All three (full vision)

2. **Canvas Paradigm** - How are Canvases built?
   - Option A: Grid-based blocks (like Notion)
   - Option B: Free-form layout (like Miro)
   - Option C: AI-generated templates only

3. **Thread Identity** - Are Threads different from Conversations?
   - Option A: Rename `conversation` → `thread` (breaking change)
   - Option B: Keep both, Threads extend Conversations
   - Option C: Conversations are lightweight, Threads are formal

4. **AI-Initiated Threshold** - When does AI proactively act?
   - What triggers AI-initiated insights?
   - How many per day?
   - User control over AI proactivity?

5. **Block Trust Implementation** - Where does metadata come from?
   - Query execution layer (DuckDB)
   - AI interpretation layer
   - Both?

### Phase 1: Foundation (recommended first)

```
Duration: ~2-3 days

1. Schema migration
   - Add new tables
   - Modify existing tables
   - Test migrations

2. API scaffolding
   - Canvas router (CRUD only)
   - Thread enhancements
   - Notification basics

3. Block Trust Metadata
   - Define provenance schema
   - Wire into query execution
```

### Phase 2: Brief Evolution

```
Duration: ~2-3 days

1. Restructure Brief sections
   - Attention Required
   - On Track
   - AI Thinking
   - Tasks

2. AI-initiated insights
   - Detection logic
   - Presentation UI
   - Dismiss/engage actions
```

### Phase 3: Threads

```
Duration: ~3-4 days

1. Thread UI
   - Message components with trust metadata
   - Sidebar with organization
   - Forking UX

2. Thread features
   - Snapshots (freeze state)
   - Sharing model
   - Comments
```

### Phase 4: Canvases

```
Duration: ~4-5 days

1. Canvas creation
   - AI-generated from prompts
   - Block types (KPI, chart, table, alert)
   - Layout system

2. Canvas features
   - Natural language customization
   - Alerts configuration
   - Share/collaborate
```

---

## 6. Questions to Answer Before Implementation

### Product Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | What's the MVP? Brief-only or Brief+Threads? | Scope |
| 2 | Should we rename Conversations → Threads? | Migration complexity |
| 3 | How opinionated should AI be? | UX design |
| 4 | What triggers AI-initiated insights? | AI development |
| 5 | Should Canvases replace the current dashboard? | Navigation |

### Technical Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Block Trust: Where does confidence come from? | Query layer integration |
| 2 | Canvas blocks: LiquidRender components or new? | Component development |
| 3 | Notifications: Real-time (WebSocket) or polling? | Infrastructure |
| 4 | AI initiation: Background jobs or on-demand? | Backend architecture |

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Define MVP clearly, ship incrementally |
| AI proactivity feels intrusive | Medium | High | User controls, dismiss mechanisms |
| Performance (proactive AI) | Medium | Medium | Rate limits, caching, background jobs |
| Breaking existing flows | Medium | Medium | Feature flags, gradual rollout |

---

## 8. Recommendation

**Start with a Product Decision session:**

Before any code, answer these 5 questions:

1. **MVP Scope**: What ships first?
2. **Naming**: Threads vs Conversations?
3. **AI Proactivity Level**: How bold is Knosia?
4. **Canvas Block Types**: What can go in a Canvas?
5. **Migration Strategy**: Breaking changes or additive?

Then create a detailed implementation spec in `.artifacts/` before coding.

---

## Appendix: Full Vision → Current Mapping

| Vision Feature | Current | Gap Level |
|----------------|---------|-----------|
| Brief - Attention Required | ❌ | 🔴 Full |
| Brief - On Track | ✅ KPIs exist | 🟢 Minor |
| Brief - AI Thinking | ❌ | 🔴 Full |
| Brief - Tasks | ❌ | 🔴 Full |
| Canvases | ❌ | 🔴 Full |
| Canvas - AI generated | ❌ | 🔴 Full |
| Canvas - Natural language edit | ❌ | 🔴 Full |
| Canvas - Alerts | ❌ | 🔴 Full |
| Threads | Conversations (basic) | 🟡 Partial |
| Threads - Forking | ❌ | 🔴 Full |
| Threads - Snapshots | ❌ | 🔴 Full |
| Threads - AI-initiated | ❌ | 🔴 Full |
| Threads - Comments | ❌ | 🔴 Full |
| Block Trust Metadata | `confidence` field only | 🟡 Partial |
| Prompt Bar | Ask input exists | 🟢 Minor |
| Command Palette (⌘K) | ❌ | 🔴 Full |
| Notifications | Preferences only | 🟡 Partial |
| Digests | ❌ | 🔴 Full |
| Team Activity | ❌ | 🔴 Full |
| Vocabulary on-demand | Vocabulary page planned | 🟡 Partial |

---

*End of Gap Analysis*
