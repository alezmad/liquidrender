# Parallel Integration Plan

> **Created:** 2025-12-30
> **Purpose:** Enable parallel development across 3 Claude Code sessions
> **Status:** Ready to execute

---

## Executive Summary

This plan enables **3 parallel development sessions** with minimal merge conflicts by:
1. Confirming shared resources are bootstrapped (✅ already done)
2. Defining strict file ownership per session
3. Establishing merge order

**Estimated wall-clock time:** ~4-5 days (vs ~8 days sequential)

---

## Wave Diagram

```
═══════════════════════════════════════════════════════════════════════════
                        PARALLEL EXECUTION WAVES
═══════════════════════════════════════════════════════════════════════════

Wave 0 [COMPLETE] - Bootstrap shared resources ✅
───────────────────────────────────────────────────────────────────────────
│ ✅ onboarding/types.ts - Role, Confirm, Briefing types exist
│ ✅ paths.ts - All routes defined (role, confirm, ready, knosia.*)
│ ✅ knosia.json - All i18n keys present (role.*, confirm.*, ready.*)
└─────────────────────────────────────────────────────────────────────────
                                   │
                                   ▼
═══════════════════════════════════════════════════════════════════════════
Wave 1 [PARALLEL] - Independent modules (3 sessions) ⚡
═══════════════════════════════════════════════════════════════════════════
     │                    │                    │
     ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Session A  │    │  Session B  │    │  Session C  │
│             │    │             │    │             │
│  ONBOARDING │    │  INFRA      │    │  DASHBOARD  │
│  FLOW       │    │  (DuckDB)   │    │  + GUEST    │
│             │    │             │    │             │
│  ~6h        │    │  ~3-4 days  │    │  ~6h        │
└─────────────┘    └─────────────┘    └─────────────┘
     │                    │                    │
     └────────────────────┼────────────────────┘
                          │
                          ▼
═══════════════════════════════════════════════════════════════════════════
Wave 2 [SEQUENTIAL] - Requires DuckDB (Session B continues)
═══════════════════════════════════════════════════════════════════════════
│
│  ┌──────────────────┐
│  │ Conversation UI  │  (after DuckDB adapter merged)
│  │      ~6h         │
│  └──────────────────┘
│
═══════════════════════════════════════════════════════════════════════════
```

---

## Session Assignments

### Session A: Onboarding Flow (~6h)

**Owner:** Onboarding pages (Role → Confirm → Ready)

**Scope:**
1. Role Selection Page (`/onboarding/role`)
2. Confirmation Questions UI (`/onboarding/confirm`)
3. Ready Screen (`/onboarding/ready`)

**File Ownership (EXCLUSIVE):**
```
apps/web/src/app/[locale]/onboarding/role/
├── page.tsx                    ← CREATE
└── loading.tsx                 ← CREATE (optional)

apps/web/src/app/[locale]/onboarding/confirm/
├── page.tsx                    ← CREATE
└── loading.tsx                 ← CREATE (optional)

apps/web/src/app/[locale]/onboarding/ready/
├── page.tsx                    ← CREATE
└── loading.tsx                 ← CREATE (optional)

apps/web/src/modules/onboarding/components/
├── role/                       ← CREATE directory
│   ├── role-card.tsx
│   ├── role-grid.tsx
│   └── index.ts
├── confirm/                    ← CREATE directory
│   ├── question-card.tsx
│   ├── question-progress.tsx
│   └── index.ts
└── ready/                      ← CREATE directory
    ├── briefing-preview.tsx
    ├── setup-summary.tsx
    └── index.ts
```

**Shared Files (READ ONLY - do not modify):**
- `apps/web/src/modules/onboarding/types.ts` - Types already defined
- `apps/web/src/config/paths.ts` - Routes already defined
- `packages/i18n/src/translations/*/knosia.json` - Keys already defined

**Dependencies:**
- Multi-connection complete ✅
- Types exist ✅
- i18n keys exist ✅

**Execution Order:**
```
Role Selection (2h) → Confirmation (3h) → Ready Screen (1h)
```

---

### Session B: Infrastructure + Conversation (~4-5 days)

**Owner:** DuckDB Adapter + Conversation UI

**Scope:**
1. DuckDB Universal Adapter (3-4 days)
2. Conversation UI (~6h) - after DuckDB

**File Ownership (EXCLUSIVE):**
```
packages/liquid-connect/src/uvb/adapters/
├── duckdb.ts                   ← CREATE (main adapter)
├── index.ts                    ← MODIFY (export duckdb)
└── types.ts                    ← MODIFY (adapter interface)

packages/liquid-connect/src/executor/
├── query-executor.ts           ← CREATE
├── timeout.ts                  ← CREATE
└── index.ts                    ← CREATE

apps/web/src/modules/conversation/
├── components/
│   ├── chat-message.tsx        ← CREATE
│   ├── query-input.tsx         ← CREATE
│   ├── result-table.tsx        ← CREATE
│   └── index.ts                ← CREATE
├── hooks/
│   ├── use-conversation.ts     ← CREATE
│   └── index.ts                ← CREATE
├── types.ts                    ← CREATE
└── index.ts                    ← CREATE

apps/web/src/app/[locale]/dashboard/knosia/ask/
├── page.tsx                    ← CREATE
└── loading.tsx                 ← CREATE
```

**Shared Files (READ ONLY):**
- `packages/i18n/src/translations/*/knosia.json` - conversation.* keys exist

**Phase 1 (DuckDB):** Days 1-3
```
Day 1: Core DuckDBAdapter class
Day 2: QueryExecutor service
Day 3: Integration + tests
```

**Phase 2 (Conversation UI):** Day 4
```
After DuckDB merged: Build conversation module
```

---

### Session C: Dashboard + Guest Infrastructure (~6h)

**Owner:** Dashboard module + Guest workspace completion

**Scope:**
1. Dashboard Module (~4h)
2. Guest Workspace Infrastructure (~2h)

**File Ownership (EXCLUSIVE):**
```
apps/web/src/modules/dashboard/
├── components/
│   ├── briefing-card.tsx       ← CREATE
│   ├── kpi-grid.tsx            ← CREATE
│   ├── alert-list.tsx          ← CREATE
│   ├── ask-input.tsx           ← CREATE
│   └── index.ts                ← CREATE
├── hooks/
│   ├── use-briefing.ts         ← CREATE
│   └── index.ts                ← CREATE
├── types.ts                    ← CREATE
└── index.ts                    ← CREATE

apps/web/src/app/[locale]/dashboard/knosia/
├── page.tsx                    ← CREATE (briefing landing)
└── layout.tsx                  ← CREATE (knosia layout with sidebar)

apps/web/src/app/[locale]/dashboard/knosia/briefing/
└── page.tsx                    ← CREATE

# Guest Infrastructure
apps/web/src/app/api/cron/
└── cleanup-expired-orgs/
    └── route.ts                ← CREATE

apps/web/src/modules/onboarding/components/layout/
└── expiration-banner.tsx       ← EXISTS (may need main app integration)
```

**Shared Files (COORDINATE):**
- `apps/web/src/app/[locale]/layout.tsx` - May need ExpirationBanner (coordinate with Session A)

**Execution Order:**
```
Dashboard Module (4h) → Guest Infrastructure (2h)
```

---

## Shared Resources Status

### Types (`apps/web/src/modules/onboarding/types.ts`)

| Type | Status | Used By |
|------|--------|---------|
| `OnboardingStep` | ✅ Defined | Session A |
| `UserRole` | ✅ Defined | Session A |
| `RoleOption` | ✅ Defined | Session A |
| `VocabularyConfirmation` | ✅ Defined | Session A |
| `ConfirmationAnswer` | ✅ Defined | Session A |
| `BriefingPreview` | ✅ Defined | Session A, C |
| `OnboardingProgress` | ✅ Defined | Session A |

### Paths (`apps/web/src/config/paths.ts`)

| Path | Status | Used By |
|------|--------|---------|
| `onboarding.role` | ✅ `/onboarding/role` | Session A |
| `onboarding.confirm` | ✅ `/onboarding/confirm` | Session A |
| `onboarding.ready` | ✅ `/onboarding/ready` | Session A |
| `knosia.index` | ✅ `/dashboard/knosia` | Session C |
| `knosia.briefing` | ✅ `/dashboard/knosia/briefing` | Session C |
| `knosia.ask` | ✅ `/dashboard/knosia/ask` | Session B |

### i18n Keys (`packages/i18n/src/translations/*/knosia.json`)

| Namespace | Status | Used By |
|-----------|--------|---------|
| `onboarding.role.*` | ✅ Defined | Session A |
| `onboarding.confirm.*` | ✅ Defined | Session A |
| `onboarding.ready.*` | ✅ Defined | Session A |
| `briefing.*` | ✅ Defined | Session C |
| `conversation.*` | ✅ Defined | Session B |
| `guest.warning.*` | ✅ Defined | Session C |

---

## Merge Strategy

### Merge Order

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MERGE ORDER (to minimize conflicts)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Session A (Onboarding) - FIRST                                      │
│     └── Likely to finish first (~6h)                                    │
│     └── No dependencies on other sessions                               │
│                                                                          │
│  2. Session C (Dashboard + Guest) - SECOND                              │
│     └── Also ~6h, independent of Session A files                        │
│     └── May need minor i18n additions (add, don't modify)               │
│                                                                          │
│  3. Session B (DuckDB) - THIRD                                          │
│     └── Longest running (~3-4 days)                                     │
│     └── Entirely in packages/liquid-connect (no conflicts)              │
│                                                                          │
│  4. Session B (Conversation UI) - FOURTH                                │
│     └── After DuckDB merged                                             │
│     └── After Dashboard merged (uses knosia layout)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Rules

1. **i18n files:** ADD keys only, never modify existing keys
2. **Barrel files (index.ts):** Each session adds own exports, merge manually if conflict
3. **types.ts:** READ ONLY - all types pre-defined
4. **paths.ts:** READ ONLY - all routes pre-defined

---

## Launch Commands

### Session A: Onboarding Flow
```bash
# In fresh Claude Code session:
# Copy this context:

Working on: Onboarding Flow (Role → Confirm → Ready)
Time estimate: ~6h
File ownership: apps/web/src/app/[locale]/onboarding/{role,confirm,ready}/
                apps/web/src/modules/onboarding/components/{role,confirm,ready}/

DO NOT MODIFY:
- types.ts (use existing types)
- paths.ts (routes exist)
- knosia.json (i18n keys exist)

Start with: Role Selection Page
Then: Confirmation Questions UI
Then: Ready Screen
```

### Session B: Infrastructure
```bash
# In fresh Claude Code session:
# Copy this context:

Working on: DuckDB Universal Adapter + Conversation UI
Time estimate: ~4-5 days
File ownership: packages/liquid-connect/src/uvb/adapters/
                packages/liquid-connect/src/executor/
                apps/web/src/modules/conversation/

Phase 1 (Days 1-3): DuckDB Adapter
Phase 2 (Day 4): Conversation UI (after DuckDB works)

Reference: .artifacts/2025-12-29-duckdb-universal-adapter-implementation.md
```

### Session C: Dashboard + Guest
```bash
# In fresh Claude Code session:
# Copy this context:

Working on: Dashboard Module + Guest Workspace Infrastructure
Time estimate: ~6h
File ownership: apps/web/src/modules/dashboard/
                apps/web/src/app/[locale]/dashboard/knosia/
                apps/web/src/app/api/cron/cleanup-expired-orgs/

Start with: Dashboard Module (briefing page)
Then: Guest Infrastructure (cron job, auth hook)

DO NOT MODIFY:
- knosia.json (i18n keys exist)
- ExpirationBanner (already exists in onboarding module)
```

---

## Validation Checklist

### Before Starting Parallel Sessions

- [x] Types bootstrapped in `onboarding/types.ts`
- [x] Paths defined in `paths.ts`
- [x] i18n keys defined in `knosia.json`
- [x] No uncommitted changes in shared files
- [ ] Each session has clear file ownership

### Before Merging

- [ ] Session A: All 3 onboarding pages render
- [ ] Session B: DuckDB connects to postgres via extension
- [ ] Session C: Dashboard shows mock briefing data
- [ ] No TypeScript errors in any session
- [ ] Run `pnpm build` successfully

### After All Merges

- [ ] Full flow works: Connect → Review → Role → Confirm → Ready → Dashboard
- [ ] Conversation UI can execute queries via DuckDB
- [ ] Guest expiration banner shows in dashboard
- [ ] Cron endpoint responds

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| i18n merge conflicts | Low | Keys pre-defined, add-only policy |
| Type mismatches | Low | Types pre-defined, read-only policy |
| Layout conflicts | Medium | Session C owns knosia layout exclusively |
| DuckDB blocks Conversation | Expected | Conversation UI waits for DuckDB merge |

---

## Timeline

```
Day 1:
├── Session A: Role + Confirm pages (5h)
├── Session B: DuckDB core adapter
└── Session C: Dashboard module (4h)

Day 2:
├── Session A: Ready page + merge (1h) ← MERGE #1
├── Session B: QueryExecutor service
└── Session C: Guest infra + merge (2h) ← MERGE #2

Day 3:
└── Session B: DuckDB integration + tests

Day 4:
└── Session B: DuckDB merge ← MERGE #3

Day 5:
└── Session B: Conversation UI + merge ← MERGE #4 (DONE)
```

**Total wall-clock:** ~5 days
**Sequential equivalent:** ~8+ days
**Savings:** ~40% faster
