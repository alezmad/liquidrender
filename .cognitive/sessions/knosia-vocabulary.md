# Knosia - Vocabulary Session

> Cognitive context for semantic layer vocabulary generation through onboarding.
> Created: 2025-12-29
> Domain: knosia.com

## Brand Identity

**Name:** Knosia (Know + Gnosis)
**Tagline:** Know what matters.
**Subline:** Your business, briefed daily.

---

## The Product Vision

**Knosia is NOT a BI tool. It's an AI data scientist that lives inside your company.**

The vocabulary is **invisible infrastructure** - auto-discovered, continuously learning. Users never see:
- Vocabulary extraction
- Schema syncing
- Metric inference

They just see: **intelligence delivered.**

```
Day 1: Connect database → "I understand your business"
Day 7: "I noticed you check revenue by region every Monday"
Day 30: "Your board meeting is tomorrow, I prepared your briefing"
Day 90: "⚠️ Unusual pattern detected - support tickets up 340%"
```

**Reference:** `.claude/artifacts/2025-12-28-2254-liquidrender-vision.md`

---

## Current State

### LiquidConnect v7 Compiler: COMPLETE
- All 162 tests passing
- Scanner, Parser, Resolver, Emitters all v7 compatible
- See: `.workflows/active/WF-008-liquidconnect-v7/SESSION-HANDOFF.md`

### Universal Vocabulary Builder (UVB): BACKEND DONE, UI PENDING

**Completed:**
```
packages/liquid-connect/src/uvb/
├── index.ts       ✓  Public exports
├── models.ts      ✓  All types (VocabularyDraft, Confirmations, etc.)
├── rules.ts       ✓  7 hard rules engine (entity, metric, dimension, time, filter detection)
├── extractor.ts   ✓  Schema extraction (information_schema queries)
└── adapters/
    ├── index.ts   ✓  Adapter exports
    └── postgres.ts ✓  PostgreSQL adapter
```

**Not Started:**
- API routes (`packages/api/src/modules/vocabulary/`)
- React wizard UI (`apps/web/src/modules/vocabulary/`)
- Database table for saving vocabularies

---

## The Product Vision

```
Schema → [Hard Rules] → Structure → [User Confirms] → Vocabulary
         (automatic)                  (30 seconds)
```

**Key insight:** 90% of vocabulary extraction is READING schema metadata, not learning from data.

### 7 Hard Rules (all implemented in `rules.ts`)

1. **Entity Detection** - Tables with PKs
2. **Junction Detection** - Composite PK of 2+ FKs
3. **Relationship Detection** - FK constraints
4. **Metric Detection** - Numeric columns with SUM/AVG patterns
5. **Dimension Detection** - Short varchar with categorical patterns
6. **Time Field Detection** - Date/timestamp columns
7. **Filter Detection** - Boolean columns and flags

---

## Next Steps: Onboarding Wizard

### Phase 1: API Routes
```
packages/api/src/modules/vocabulary/
├── router.ts    POST /extract, /validate, /save
├── service.ts   Business logic
└── schema.ts    Zod validation
```

### Phase 2: React UI (Vocabulary Wizard)
```
apps/web/src/modules/vocabulary/
├── components/
│   ├── vocabulary-wizard.tsx    Main container with Tabs
│   └── steps/
│       ├── connect-step.tsx     Database connection form
│       ├── review-step.tsx      DataTables for entities/metrics/dimensions
│       ├── confirm-step.tsx     Answer 5-10 questions
│       └── save-step.tsx        Save and download
├── hooks/
│   └── use-extract-vocabulary.ts
└── api.ts
```

### Phase 3: Integration
- Save vocabularies to database
- Load vocabulary for query execution
- Connect to LiquidConnect query engine

---

## Key Files Reference

| Purpose | Location |
|---------|----------|
| **Architecture (Master)** | `.claude/artifacts/2025-12-29-vocabulary-engine-architecture.md` ✓ |
| **Marketing Pages** | `apps/web/src/modules/marketing/knosia/` ✓ |
| Auth/Dashboard UI | `.claude/artifacts/2025-12-29-knosia-auth-dashboard-ui.md` |
| UVB Backend | `packages/liquid-connect/src/uvb/` |
| Hard Rules Atom | `.cognitive/sessions/atoms/uvb-hard-rules.yaml` |
| v7 Compiler | `packages/liquid-connect/src/compiler/` |

---

## Usage Example (Backend Ready)

```typescript
import { createPostgresAdapter, extractSchema, applyHardRules } from '@repo/liquid-connect/uvb'

// 1. Create adapter
const adapter = createPostgresAdapter('postgresql://user:pass@host:5432/mydb')

// 2. Extract schema
const schema = await extractSchema(adapter, { schema: 'public' })

// 3. Apply hard rules
const { detected, confirmations, stats } = applyHardRules(schema)

console.log(`Detected: ${stats.entities} entities, ${stats.metrics} metrics`)
// Detected: 50 entities, 120 metrics
```

---

## Onboarding Philosophy

The vocabulary surfaces **only at friction points**:

**Ambiguity:**
```
"Show me conversion rate"
→ "I found 3 metrics. Which one: Trial→Paid, Visitor→Signup, or Lead→Customer?"
→ [Remembers preference for next time]
```

**Missing Definition:**
```
"Show me healthy accounts"
→ "I don't know what 'healthy' means for your business. How would you define it?"
→ [Learns the definition]
```

**Drift Detection:**
```
"Your database schema changed. New columns: orders.discount_code, orders.discount_amount"
→ "I've added 'discount amount' as a metric. Track discount codes as dimension?"
```

---

## Success Criteria

1. Connect database: 30 seconds
2. Extract structure: 5 seconds (automatic)
3. Confirm names: 30 seconds (5-10 questions)
4. Ready to query: Total ~60 seconds

---

## Knosia Intelligence Stack

```
KNOSIA INTERFACE (Briefings, Conversations, Explorations)
        ↓
KNOSIA BRAIN (Context, Memory, Reasoning)
        ↓
LIQUID CONNECT ← WE ARE HERE (Vocabulary, Resolution, Query Engine)
        ↓
YOUR DATA (PostgreSQL, Snowflake, BigQuery, etc.)
```

The UVB is the foundation that enables everything above it.

---

## Marketing Components (Built)

```
apps/web/src/modules/marketing/knosia/
├── hero.tsx              ✓  Briefing preview mockup
├── how-it-works.tsx      ✓  3-step process (30s + 30s + auto)
├── three-modes.tsx       ✓  Proactive/Conversational/Exploratory
├── competitor-map.tsx    ✓  2D positioning chart
├── learning-journey.tsx  ✓  Day 1→365 timeline
├── vocabulary-section.tsx ✓  Auto-discovery, friction-only UI
├── final-cta.tsx         ✓  Early access CTA
├── copy.ts               ✓  All marketing copy
├── types.ts              ✓  TypeScript interfaces
└── index.ts              ✓  Barrel exports
```
