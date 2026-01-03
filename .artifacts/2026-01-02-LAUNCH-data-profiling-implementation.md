# Data Profiling Implementation - Development Launch

**Date:** 2026-01-02
**Status:** READY TO START
**Estimated Duration:** 4.2 hours (with parallelization)

---

## 🎯 Mission

Transform Knosia from a "schema reader" to a "data scientist assistant" by implementing intelligent data profiling that goes beyond table structure to understand:
- **Data freshness** - "Last sale 2 hours ago"
- **Data quality** - "95% complete vs 50% NULL"
- **Business context** - "1.2M transactions, $2.3M revenue"

**Target:** 3-5 minute comprehensive profiling that powers intelligent briefings.

---

## 📚 Critical Context

### What Knosia Is

**Knosia** is the data scientist businesses can't afford, built on LiquidRender. It connects to databases and within 60 seconds provides:
- Personalized briefing
- Business vocabulary (metrics, dimensions, entities)
- AI-powered conversation interface

**Current Capability:** Schema extraction + hard rules detection
**Gap:** No understanding of actual data inside tables
**Solution:** Add 3-tier data profiling system

### Current Architecture

```
packages/liquid-connect/src/uvb/          ← Universal Vocabulary Builder
├── duckdb-adapter.ts                     ← DuckDB Universal Adapter (DONE)
├── models.ts                             ← ExtractedSchema types (DONE)
├── rules.ts                              ← Hard rules detection (DONE)
└── index.ts                              ← Exports

packages/api/src/modules/knosia/
├── analysis/
│   ├── queries.ts                        ← runAnalysis() SSE generator ⚡
│   ├── router.ts                         ← /run endpoint (SSE streaming)
│   └── schemas.ts                        ← Zod schemas
└── connections/                          ← Database connections (DONE)

packages/db/src/schema/knosia.ts          ← 15 tables (V1 foundation) ⚡

apps/web/src/modules/onboarding/          ← Onboarding flow
└── components/analysis-step.tsx          ← Shows SSE progress ⚡
```

**⚡ = Integration points for profiling**

### What Already Works

**Wave 0-2 Complete:**
- ✅ DuckDB Universal Adapter with PostgreSQL scanner
- ✅ Schema extraction (tables, columns, relationships)
- ✅ Hard rules detection (metrics, dimensions, entities)
- ✅ SSE streaming analysis with 5 steps
- ✅ Onboarding flow with progress display
- ✅ 13/13 tests passing (including Knosia DB)

**We're building on a solid foundation.**

---

## 📋 Implementation Plan

### Wave 2.5: Foundation (Core Engine)

**Phase A: Types & Models** - 20 min
- Add `ProfiledSchema`, `TableProfile`, `ColumnProfile` interfaces
- Add `NumericProfile`, `TemporalProfile`, `CategoricalProfile`, `TextProfile`
- Add `ProfileOptions`, `ProfileResult` interfaces
- Location: `packages/liquid-connect/src/uvb/models.ts`

**Phase B: Query Builders** - 15 min (3 PARALLEL agents)
- Agent 1: Tier 1 queries (pg_class, pg_stats statistics)
- Agent 2: Tier 2 queries (TABLESAMPLE + single-pass aggregations)
- Agent 3: Tier 3 queries (detailed statistical profiling)
- Location: `packages/liquid-connect/src/uvb/profiler-queries.ts`

**Phase C: Profiler Engine** - 60 min
- `profileSchema()` - main entry point with 3-tier execution
- `profileTable()` - single table profiling
- `profileTablesInParallel()` - concurrency control (5 concurrent)
- `calculateSampleRate()` - adaptive sampling strategy
- `selectColumnsToProfile()` - intelligent column selection
- Location: `packages/liquid-connect/src/uvb/profiler.ts`

**Phase D: Testing** - 20 min (3 PARALLEL agents)
- Agent 1: Unit tests (helpers, query builders)
- Agent 2: Integration tests (in-memory DuckDB)
- Agent 3: Integration tests (real databases - Knosia, LiquidGym)
- Location: `packages/liquid-connect/src/uvb/__tests__/`

**Wave 2.5 Commit Checkpoints:**
1. "feat(uvb): add data profiling type definitions"
2. "feat(uvb): add profiling SQL query builders"
3. "feat(uvb): implement core profiling engine"
4. "test(uvb): comprehensive profiling test coverage"

---

### Wave 2.6: API & Storage (Integration)

**Phase E: Database Schema** - 30 min
- Add `knosia_table_profile` table (JSONB storage)
- Add `knosia_column_profile` table (JSONB storage)
- Add indexes for efficient queries
- Generate migration
- Apply migration
- Location: `packages/db/src/schema/knosia.ts`

**Phase F: API Integration** - 60 min (SEQUENTIAL - 3 tasks)

**Task F1:** Enhance `runAnalysis()` Generator
- Add optional `includeDataProfiling` parameter
- Add steps 6-8 to `ANALYSIS_STEPS` constant
- Call `profileSchema()` from uvb (conditionally)
- Add `storeProfilingResults()` helper function
- Include profiling summary in completion event
- Location: `packages/api/src/modules/knosia/analysis/queries.ts`

**Task F2:** Add Profiling Query Functions
- Add `getTableProfile(analysisId, tableName)`
- Add `getColumnProfiles(tableProfileId)`
- Add `getProfilingSummary(analysisId)`
- Location: `packages/api/src/modules/knosia/analysis/queries.ts` (same file)

**Task F3:** Update Router & Schemas
- Add `includeDataProfiling` param to `/run` endpoint
- Add `GET /:id/profiling` endpoint
- Add `GET /:id/tables/:tableName/profile` endpoint
- Update `runAnalysisSchema` with profiling option
- Location: `packages/api/src/modules/knosia/analysis/router.ts` + `schemas.ts`

**Wave 2.6 Commit Checkpoints:**
1. "feat(knosia): add data profiling storage tables"
2. "feat(knosia): add optional profiling to analysis"
3. "feat(knosia): add profiling query functions"
4. "feat(knosia): expose profiling via API"

---

### Wave 2.7: UI Integration

**Phase G: UI Components** - 30 min (3 PARALLEL agents)

**Agent 1:** Onboarding Progress
- Update `STEP_LABELS` to include 8 steps (currently 5)
- No changes to SSE handling (already works)
- Location: `apps/web/src/modules/onboarding/components/analysis-step.tsx`

**Agent 2:** Enhanced Briefing
- Create `data-insights.tsx` component
- Fetch profiling summary via API
- Display data freshness, empty tables, stale tables
- Location: `apps/web/src/modules/briefing/components/` (new)

**Agent 3:** Data Health Dashboard
- Create `/dashboard/health` route
- Show table quality metrics
- Show freshness timeline
- Flag stale/empty tables
- Add to sidebar menu
- Location: `apps/web/src/app/[locale]/dashboard/health/` (new)

**Wave 2.7 Commit Checkpoints:**
1. "feat(onboarding): show data profiling progress"
2. "feat(briefing): enhance with profiled data insights"
3. "feat(dashboard): add data health monitoring"

---

## 🔑 Key Design Decisions

### 1. Three-Tier Profiling Strategy

**Tier 1: Database Statistics** (instant - 0.1s per table)
- Use PostgreSQL system catalogs (pg_class, pg_stats)
- Row count estimates, table size, column statistics
- Zero performance impact (metadata only)

**Tier 2: Smart Sampling** (fast - 1-5s per table)
- Adaptive sampling: 1% for large tables, 100% for small
- Single-pass multi-metric computation
- Cardinality, NULL percentage, min/max, data freshness

**Tier 3: Detailed Profiling** (selective - 5-15s per table)
- Top N values, statistical distributions, pattern detection
- Only run on "interesting" tables (detected metrics/dimensions)
- Full quality scoring

**Performance Target:** 3-5 minutes for full database

### 2. Adaptive Sampling Strategy

```typescript
function calculateSampleRate(estimatedRows: number): number {
  if (estimatedRows === 0) return 0;           // Skip empty
  if (estimatedRows < 10000) return 1.0;       // Full scan
  if (estimatedRows < 100000) return 0.1;      // 10%
  if (estimatedRows < 1000000) return 0.01;    // 1%
  return 0.001;                                // 0.1% for huge tables
}
```

### 3. Parallel Processing

- 5 concurrent tables (controlled by semaphore)
- Progressive results via SSE streaming
- Skip empty tables automatically
- Timeout protection (30s per table, 5 min total)

### 4. Backward Compatibility

**Default behavior unchanged:**
```typescript
runAnalysis(connectionId)  // 5 steps, no profiling
```

**Opt-in profiling:**
```typescript
runAnalysis(connectionId, { includeDataProfiling: true })  // 8 steps with profiling
```

### 5. Storage Strategy

**JSONB for flexibility:**
- `knosia_table_profile.profile` stores entire `TableProfile` object
- `knosia_column_profile.profile` stores entire `ColumnProfile` object
- Easy to query with PostgreSQL JSON operators
- Schema evolution without migrations

---

## 📖 Reference Documents

**Must Read Before Starting:**

1. **Architecture Vision**
   - `.artifacts/2026-01-02-2245-data-profiling-architecture.md`
   - Full technical specification with types, interfaces, examples

2. **Implementation Flow**
   - `.artifacts/2026-01-02-implementation-flow-data-profiling.md`
   - Detailed phase breakdown, parallel execution strategy

3. **Integration Assessment**
   - `.artifacts/2026-01-02-knosia-profiling-integration-assessment.md`
   - How profiling integrates with existing Knosia code

4. **Project Instructions**
   - `CLAUDE.md`
   - Project patterns, conventions, tool usage

**Key Code References:**

- Current analysis flow: `packages/api/src/modules/knosia/analysis/queries.ts:66-373`
- DuckDB adapter: `packages/liquid-connect/src/uvb/duckdb-adapter.ts`
- Hard rules: `packages/liquid-connect/src/uvb/rules.ts`
- Knosia schema: `packages/db/src/schema/knosia.ts`

---

## ✅ Success Criteria

### Technical Metrics

**Wave 2.5 Complete:**
- ✅ All types defined and exported from `models.ts`
- ✅ All query builders implemented in `profiler-queries.ts`
- ✅ Core profiler engine in `profiler.ts` with all functions
- ✅ 13+ tests passing (unit + integration)
- ✅ Knosia DB (40 tables) profiles in <2 minutes
- ✅ Pagila DB (22 tables) profiles in <1 minute

**Wave 2.6 Complete:**
- ✅ Migration applied successfully (no errors)
- ✅ `runAnalysis()` accepts `includeDataProfiling` parameter
- ✅ Profile results stored in database
- ✅ API endpoints return profile data
- ✅ Profiling is OPT-IN (default = false)
- ✅ Type checking passes: `pnpm --filter @turbostarter/api typecheck`

**Wave 2.7 Complete:**
- ✅ Onboarding shows 8 steps when profiling enabled
- ✅ Briefing displays profiled insights
- ✅ Data health dashboard accessible
- ✅ All UI properly internationalized
- ✅ Type checking passes: `pnpm --filter web typecheck`

### Product Metrics

**User Experience:**
- ✅ Briefing mentions data freshness ("2 hours ago")
- ✅ Briefing shows business context ("1.2M transactions, $2.3M revenue")
- ✅ Empty/stale tables automatically flagged
- ✅ Progress display updates smoothly during profiling

**Business Impact:**
- ✅ "Wow factor" in demo - shows understanding beyond schema
- ✅ Reduces time-to-first-query from 10 min to <2 min
- ✅ Eliminates "which tables should I look at?" confusion

---

## 🚀 Execution Strategy

### Parallel Execution Points

**Phase B: 3 PARALLEL agents** (Query Builders)
- Each agent writes to `.reports/profiler-queries-tier[1-3].ts`
- Master agent merges into single `profiler-queries.ts`
- Coordination: Each tier is independent SQL logic

**Phase D: 3 PARALLEL agents** (Testing)
- Agent 1: Unit tests (no DB dependencies)
- Agent 2: Integration with in-memory DuckDB
- Agent 3: Integration with real databases
- Coordination: Separate test files, different DB instances

**Phase G: 3 PARALLEL agents** (UI)
- Agent 1: Onboarding module
- Agent 2: Briefing module
- Agent 3: Dashboard module
- Coordination: Completely separate modules, no conflicts

### Sequential Execution Points

**Phase A:** Foundation types (everything depends on this)
**Phase C:** Profiler engine (integrates all query builders)
**Phase E:** Database schema (migration must be clean)
**Phase F:** API integration (careful enhancement of existing generator)

### Commit Discipline

**After each phase:**
1. Run type checking
2. Run tests (if applicable)
3. Create commit with descriptive message
4. Verify rollback safety

**Total commits:** 11 (provides fine-grained rollback points)

---

## 🎬 Starting Commands

### Setup Verification

```bash
# Verify current working directory
pwd
# Should be: /Users/agutierrez/Desktop/liquidrender

# Check git status
git status
# Should show: clean working directory or expected changes

# Verify dependencies
pnpm install

# Verify tests pass (baseline)
pnpm --filter @repo/liquid-connect test
```

### Wave 2.5: Start Phase A

```bash
# Open models.ts for editing
code packages/liquid-connect/src/uvb/models.ts

# Reference types from architecture doc:
# - ProfiledSchema (extends ExtractedSchema)
# - TableProfile (with tier 1, 2, 3 fields)
# - ColumnProfile (with type-specific sub-profiles)
# - NumericProfile, TemporalProfile, CategoricalProfile, TextProfile
# - ProfileOptions, ProfileResult
```

**After Phase A completion:**
```bash
pnpm --filter @repo/liquid-connect typecheck
git add packages/liquid-connect/src/uvb/models.ts
git commit -m "feat(uvb): add data profiling type definitions"
```

---

## ⚠️ Critical Warnings

### DO NOT:
- ❌ Create `analysis/mutations.ts` (doesn't exist, shouldn't exist)
- ❌ Break existing `runAnalysis()` behavior (must remain backward compatible)
- ❌ Use hardcoded colors/spacing in UI (use design tokens)
- ❌ Skip type checking after changes
- ❌ Batch unrelated changes in single commit

### DO:
- ✅ Read architecture doc before starting each phase
- ✅ Check existing code patterns in Knosia
- ✅ Use `generateId()` from `@turbostarter/shared/utils` (NOT UUID)
- ✅ Import types from `@repo/liquid-connect/uvb` in API code
- ✅ Test against real databases (Knosia DB, LiquidGym)
- ✅ Verify profiling is OPT-IN (default false)

---

## 📊 Progress Tracking

### Wave 2.5: Foundation
- [ ] Phase A: Types & Models (20 min)
- [ ] Phase B: Query Builders (15 min, 3 parallel)
- [ ] Phase C: Profiler Engine (60 min)
- [ ] Phase D: Testing (20 min, 3 parallel)

### Wave 2.6: API & Storage
- [ ] Phase E: Database Schema (30 min)
- [ ] Phase F1: Enhance runAnalysis() (20 min)
- [ ] Phase F2: Add Query Functions (20 min)
- [ ] Phase F3: Update Router (20 min)

### Wave 2.7: UI Integration
- [ ] Phase G1: Onboarding Progress (10 min)
- [ ] Phase G2: Enhanced Briefing (10 min)
- [ ] Phase G3: Data Health Dashboard (10 min)

**Total Estimated:** 4.2 hours

---

## 🎯 Ready to Launch?

**Pre-flight Checklist:**
- ✅ Read architecture vision (`.artifacts/2026-01-02-2245-data-profiling-architecture.md`)
- ✅ Understand integration points (`.artifacts/2026-01-02-knosia-profiling-integration-assessment.md`)
- ✅ Review implementation flow (`.artifacts/2026-01-02-implementation-flow-data-profiling.md`)
- ✅ Verify environment setup (`pnpm install`, tests pass)
- ✅ Clean git state (no unexpected changes)

**First Action:**
```bash
# Start Wave 2.5, Phase A: Types & Models
# Edit: packages/liquid-connect/src/uvb/models.ts
# Add: ProfiledSchema and all profiling type definitions
```

**Questions Before Starting?**
- Clarify any technical decisions
- Review any integration points
- Confirm parallel execution strategy
- Validate commit checkpoints

---

## 📞 Support Resources

**Architecture Questions:** See `.artifacts/2026-01-02-2245-data-profiling-architecture.md`
**Integration Questions:** See `.artifacts/2026-01-02-knosia-profiling-integration-assessment.md`
**Project Patterns:** See `CLAUDE.md`
**Existing Code:** See reference locations above

**Test Databases:**
- Knosia DB: 40 tables (connection in `knosia_connection` table)
- LiquidGym/pagila: 22 tables (sample data for testing)

---

**LET'S BUILD THE DATA SCIENTIST ASSISTANT! 🚀**
