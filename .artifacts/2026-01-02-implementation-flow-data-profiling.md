# Data Profiling Implementation Flow

**Document:** .artifacts/2026-01-02-2245-data-profiling-architecture.md
**Date:** 2026-01-02
**Strategy:** Parallel execution with clear dependency chains

---

## Flow Overview

```
WAVE 2.5: FOUNDATION (Core Engine)
├── Phase A: Types & Models (SEQUENTIAL - foundation)
├── Phase B: Query Builders (3 PARALLEL tasks)
├── Phase C: Profiler Engine (SEQUENTIAL - integrates B)
└── Phase D: Testing (3 PARALLEL tasks)

WAVE 2.6: API & STORAGE (Integration)
├── Phase E: Database Schema (SEQUENTIAL)
└── Phase F: API Integration (2 PARALLEL after E)

WAVE 2.7: UI (User-Facing)
└── Phase G: UI Components (3 PARALLEL tasks)
```

---

## WAVE 2.5: Foundation

### Phase A: Types & Models (SEQUENTIAL)
**Duration:** ~20 minutes
**Dependencies:** None
**Why Sequential:** Everything else depends on these types

```
Task A1: Extend types in models.ts
├─ Add ProfiledSchema interface
├─ Add TableProfile interface
├─ Add ColumnProfile + all sub-profiles
├─ Add ProfileOptions interface
├─ Add ProfileResult interface
└─ Export all new types

Location: packages/liquid-connect/src/uvb/models.ts
Why first: All subsequent code imports these types
```

**Commit Checkpoint:** "feat(uvb): add data profiling type definitions"

---

### Phase B: Query Builders (3 PARALLEL TASKS)

**Duration:** ~45 minutes total (15 min each in parallel = 15 min wall time)
**Dependencies:** Phase A complete
**Parallelization:** Each tier is independent SQL logic

```
┌──────────────────────────────────────────────────────────────┐
│ PARALLEL EXECUTION (3 agents)                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Agent 1: Tier 1 Queries                                     │
│  ├─ buildStatisticsQuery()                                   │
│  ├─ buildTableStatsQuery() (pg_class)                        │
│  └─ buildColumnStatsQuery() (pg_stats)                       │
│                                                              │
│  Agent 2: Tier 2 Queries                                     │
│  ├─ buildSampleProfilingQuery()                              │
│  ├─ buildCardinalityQuery() (HyperLogLog)                    │
│  ├─ buildNullAnalysisQuery()                                 │
│  └─ buildMinMaxQuery()                                       │
│                                                              │
│  Agent 3: Tier 3 Queries                                     │
│  ├─ buildDetailedNumericQuery()                              │
│  ├─ buildDetailedTemporalQuery()                             │
│  ├─ buildDetailedCategoricalQuery()                          │
│  └─ buildDetailedTextQuery()                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Location: packages/liquid-connect/src/uvb/profiler-queries.ts
Output: Single file with all query builders
```

**Instructions for Parallel Agents:**
- Agent 1: Focus on PostgreSQL system catalogs (pg_class, pg_stats)
- Agent 2: Focus on TABLESAMPLE + single-pass aggregations
- Agent 3: Focus on type-specific statistical queries

**Merge Strategy:** All three agents write to `.reports/profiler-queries-tier[1-3].ts`, then merge into single file

**Commit Checkpoint:** "feat(uvb): add profiling SQL query builders"

---

### Phase C: Profiler Engine (SEQUENTIAL)

**Duration:** ~60 minutes
**Dependencies:** Phase B complete (needs query builders)
**Why Sequential:** Complex orchestration logic, needs all queries

```
Task C1: Create profiler.ts
├─ profileSchema() - main entry point
│  ├─ Tier 1: Call statistics queries
│  ├─ Tier 2: Adaptive sampling with calculateSampleRate()
│  ├─ Tier 3: Selective detailed profiling
│  └─ Return ProfileResult with stats
│
├─ profileTable() - single table profiling
├─ profileTablesInParallel() - concurrency control
└─ Helper functions:
   ├─ calculateSampleRate()
   ├─ selectColumnsToProfile()
   ├─ mergeProfiles()
   └─ buildProfileStats()

Location: packages/liquid-connect/src/uvb/profiler.ts
Imports: models.ts, profiler-queries.ts, duckdb-adapter.ts
```

**Commit Checkpoint:** "feat(uvb): implement core profiling engine"

---

### Phase D: Testing (3 PARALLEL TASKS)

**Duration:** ~60 minutes total (20 min each in parallel = 20 min wall time)
**Dependencies:** Phase C complete
**Parallelization:** Each test suite is independent

```
┌──────────────────────────────────────────────────────────────┐
│ PARALLEL TESTING (3 agents)                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Agent 1: Unit Tests                                         │
│  ├─ Test calculateSampleRate()                               │
│  ├─ Test selectColumnsToProfile()                            │
│  ├─ Test query builders with mock data                       │
│  └─ Test profile merging logic                               │
│  Location: src/uvb/__tests__/profiler.test.ts               │
│                                                              │
│  Agent 2: Integration - In-Memory DuckDB                     │
│  ├─ Create test data in DuckDB                               │
│  ├─ Test Tier 1 profiling                                    │
│  ├─ Test Tier 2 profiling                                    │
│  ├─ Test Tier 3 profiling                                    │
│  └─ Test parallel execution                                  │
│  Location: src/uvb/__tests__/profiler-integration.test.ts   │
│                                                              │
│  Agent 3: Integration - Real Databases                       │
│  ├─ Test against LiquidGym/pagila                            │
│  ├─ Test against Knosia database                             │
│  ├─ Verify performance targets (<2 min)                      │
│  └─ Test edge cases (empty tables, huge tables)              │
│  Location: src/uvb/__tests__/profiler-real-db.test.ts       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Instructions for Test Agents:**
- All agents use same test data fixtures (define first)
- Agent 2 and 3 can run truly in parallel (different DB instances)
- Each agent writes to separate test file

**Commit Checkpoint:** "test(uvb): comprehensive profiling test coverage"

---

## WAVE 2.6: API & Storage

### Phase E: Database Schema (SEQUENTIAL)

**Duration:** ~30 minutes
**Dependencies:** Wave 2.5 complete
**Why Sequential:** Migration must be clean, single source of truth

```
Task E1: Add profiling tables to Knosia schema
├─ Edit packages/db/src/schema/knosia.ts
│  ├─ Add knosiaTableProfile table
│  ├─ Add knosiaColumnProfile table
│  └─ Add indexes for efficient queries
│
├─ Generate migration
│  └─ pnpm with-env -F @turbostarter/db db:generate
│
└─ Apply migration
   └─ pnpm with-env -F @turbostarter/db db:migrate

Commit: "feat(knosia): add data profiling storage tables"
```

**Commit Checkpoint:** "feat(knosia): add data profiling storage tables"

---

### Phase F: API Integration (SEQUENTIAL - Careful Integration)

**Duration:** ~60 minutes
**Dependencies:** Phase E complete (needs DB schema)
**Why Sequential:** Enhancing existing `runAnalysis()` generator requires careful coordination

```
┌──────────────────────────────────────────────────────────────┐
│ SEQUENTIAL API INTEGRATION (1 agent, multiple commits)       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Task F1: Enhance runAnalysis() Generator                    │
│  ├─ Edit analysis/queries.ts                                 │
│  │  ├─ Add optional profiling parameter                      │
│  │  ├─ Add steps 6-8 to ANALYSIS_STEPS                       │
│  │  ├─ Call profileSchema() from uvb                         │
│  │  ├─ Add storeProfilingResults() helper                    │
│  │  └─ Include profiling summary in completion               │
│  └─ COMMIT: "feat(knosia): add optional profiling to analysis"│
│                                                              │
│  Task F2: Add Profiling Query Functions                      │
│  ├─ Edit analysis/queries.ts (same file)                     │
│  │  ├─ Add getTableProfile()                                 │
│  │  ├─ Add getColumnProfiles()                               │
│  │  └─ Add getProfilingSummary()                             │
│  └─ COMMIT: "feat(knosia): add profiling query functions"    │
│                                                              │
│  Task F3: Update Router                                      │
│  ├─ Edit analysis/router.ts                                  │
│  │  ├─ Add includeDataProfiling param to /run               │
│  │  ├─ Add GET /:id/profiling endpoint                       │
│  │  └─ Add GET /:id/tables/:name/profile endpoint            │
│  ├─ Edit analysis/schemas.ts                                 │
│  │  └─ Add includeDataProfiling to runAnalysisSchema         │
│  └─ COMMIT: "feat(knosia): expose profiling via API"         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Why Sequential:**
- `runAnalysis()` is the core generator - must be enhanced carefully
- Storage helpers depend on profiling types being integrated
- Query functions depend on storage structure
- Router depends on query functions

**Critical Notes:**
- ⚠️ `analysis/mutations.ts` DOES NOT EXIST - don't create it
- ✅ Enhance existing `queries.ts::runAnalysis()` generator
- ✅ Profiling is OPT-IN (backward compatible)
- ✅ Default behavior unchanged (5 steps without profiling)

**Commit Checkpoints:**
1. "feat(knosia): add optional profiling to analysis"
2. "feat(knosia): add profiling query functions"
3. "feat(knosia): expose profiling via API"

---

## WAVE 2.7: UI Integration

### Phase G: UI Components (3 PARALLEL TASKS)

**Duration:** ~90 minutes total (30 min each in parallel = 30 min wall time)
**Dependencies:** Wave 2.6 complete (needs API)
**Parallelization:** Each UI feature is independent

```
┌──────────────────────────────────────────────────────────────┐
│ PARALLEL UI DEVELOPMENT (3 agents)                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Agent 1: Onboarding Progress                                │
│  ├─ Update apps/web/src/modules/onboarding/components/      │
│  │  └─ analysis-step.tsx                                     │
│  ├─ Show profiling progress with SSE                         │
│  ├─ Display "Analyzing [table] (5/40)" status                │
│  └─ Show completion with stats                               │
│                                                              │
│  Agent 2: Enhanced Briefing                                  │
│  ├─ Create briefing module components                        │
│  │  ├─ data-health-card.tsx                                  │
│  │  ├─ freshness-indicator.tsx                               │
│  │  └─ quality-metrics.tsx                                   │
│  └─ Update briefing API to use profiled data                 │
│  Location: apps/web/src/modules/briefing/                   │
│                                                              │
│  Agent 3: Data Health Dashboard                              │
│  ├─ Create new dashboard route                               │
│  │  └─ apps/web/src/app/[locale]/dashboard/health/          │
│  ├─ Show table quality metrics                               │
│  ├─ Show freshness timeline                                  │
│  ├─ Flag stale/empty tables                                  │
│  └─ Add to sidebar menu                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Instructions for UI Agents:**
- Reuse existing LiquidRender components (see CLAUDE.md)
- Follow TurboStarter patterns (menu, paths, i18n)
- Use react-query for data fetching

**Commit Checkpoints:**
1. "feat(onboarding): show data profiling progress"
2. "feat(briefing): enhance with profiled data insights"
3. "feat(dashboard): add data health monitoring"

---

## Dependency Graph

```
A (Types) ──────┐
                ├─→ B1 (Tier1) ──┐
                ├─→ B2 (Tier2) ──┼─→ C (Engine) ──┐
                └─→ B3 (Tier3) ──┘                ├─→ D1 (Unit) ──┐
                                                  ├─→ D2 (Integration) ──┼─→ E (Schema) ──┐
                                                  └─→ D3 (Real DB) ──┘                    ├─→ F1 (Mutations) ──┐
                                                                                          └─→ F2 (Queries) ────┼─→ G1 (Onboarding) ──┐
                                                                                                                ├─→ G2 (Briefing) ────┼─→ DONE
                                                                                                                └─→ G3 (Dashboard) ──┘
```

**Legend:**
- `──→` Sequential dependency
- Vertical alignment = Parallel execution opportunity

---

## Time Estimates

| Wave | Phase | Tasks | Sequential Time | Parallel Time | Speedup |
|------|-------|-------|-----------------|---------------|---------|
| 2.5  | A     | 1     | 20 min          | 20 min        | 1x      |
| 2.5  | B     | 3     | 45 min          | 15 min        | 3x      |
| 2.5  | C     | 1     | 60 min          | 60 min        | 1x      |
| 2.5  | D     | 3     | 60 min          | 20 min        | 3x      |
| 2.6  | E     | 1     | 30 min          | 30 min        | 1x      |
| 2.6  | F     | 3     | 60 min          | 60 min        | 1x      |
| 2.7  | G     | 3     | 90 min          | 30 min        | 3x      |
| **TOTAL** |   | **15** | **410 min** | **250 min** | **1.6x** |

**Wall Time:** ~4.2 hours with parallelization vs ~6.8 hours sequential

---

## Execution Commands

### Wave 2.5: Foundation

```bash
# Phase A: Types (SEQUENTIAL)
# [Manual implementation in models.ts]

# Phase B: Query Builders (PARALLEL - 3 agents)
# Use Task tool with 3 parallel agents, each writes to .reports/

# Phase C: Profiler Engine (SEQUENTIAL)
# [Manual implementation in profiler.ts]

# Phase D: Testing (PARALLEL - 3 agents)
# Use Task tool with 3 parallel agents
pnpm --filter @repo/liquid-connect test  # After all agents complete
```

### Wave 2.6: API & Storage

```bash
# Phase E: Database Schema (SEQUENTIAL)
pnpm with-env -F @turbostarter/db db:generate
pnpm with-env -F @turbostarter/db db:migrate

# Phase F: API Integration (SEQUENTIAL - careful enhancement)
# Task F1: Enhance runAnalysis()
# Task F2: Add query functions
# Task F3: Update router + schemas
pnpm --filter @turbostarter/api typecheck  # Verify after each task
```

### Wave 2.7: UI Integration

```bash
# Phase G: UI Components (PARALLEL - 3 agents)
# Use Task tool with 3 parallel agents
pnpm --filter web typecheck  # Verify
pnpm dev  # Test locally
```

---

## Success Criteria

### Wave 2.5 Complete
- ✅ All types defined in models.ts
- ✅ All query builders in profiler-queries.ts
- ✅ Core profiler.ts implemented
- ✅ 13/13 tests passing (unit + integration)
- ✅ Knosia DB profiles in <2 minutes

### Wave 2.6 Complete
- ✅ Migration applied successfully
- ✅ analyzeConnection() includes profiling
- ✅ Profile results stored in DB
- ✅ API endpoints return profile data

### Wave 2.7 Complete
- ✅ Onboarding shows profiling progress
- ✅ Briefing displays profiled insights
- ✅ Data health dashboard accessible
- ✅ All UI properly i18n'd

---

## Risk Mitigation

### Parallel Execution Risks

**Risk:** Merge conflicts in shared files
**Mitigation:**
- Phase B: Each agent writes to separate report file, merge manually
- Phase F: Agents work on different functions, sequential commits
- Phase G: Completely separate modules, no conflicts

**Risk:** Test flakiness with parallel DB access
**Mitigation:**
- Phase D agents use separate DB instances
- Agent 1: Pure unit tests (no DB)
- Agent 2: In-memory DuckDB (isolated)
- Agent 3: Real DB with unique connection strings

**Risk:** API changes break UI mid-development
**Mitigation:**
- Complete Wave 2.6 fully before starting Wave 2.7
- Define API contract in advance (TypeScript types)
- UI agents mock API responses until Wave 2.6 done

---

## Next Steps

**Ready to proceed?** Confirm:
1. ✅ You've reviewed the flow structure
2. ✅ You understand the parallel execution strategy
3. ✅ You're ready to start with **Phase A: Types & Models**

**Then we execute:**
```
Phase A → Commit → Phase B (3 parallel) → Commit → Phase C → Commit → ...
```

**Estimated completion:** 3.7 hours (with parallelization)
