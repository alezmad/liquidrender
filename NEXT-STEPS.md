# NEXT-STEPS.md

> **Purpose:** Living document tracking immediate implementation priorities.
> **Updated:** 2026-01-18 (Phase 2 fixes complete, compiler gap identified)
> **Rule:** Complete items in order. Check off when done. Add new items at bottom.

**URGENT - START HERE (2026-01-18):**
- 🔴 **KPI Compiler: Add Time-Series Support** - CRITICAL for Phase 2 completion
- 📄 **Read First**: `.artifacts/2026-01-18-phase-2-final-diagnosis.md`
- ✅ **Phase 2 Prompt Fixes**: Complete (PLAN v1.1.0, GENERATE prompts updated, value-validation v1.4.0)
- ⚠️ **Blocker**: Compiler missing time-series GROUP BY support
- 🎯 **Impact**: +14% quality improvement (72% → 86%) once compiler fixed
- 📊 **Current**: 72% combined quality (+5% from Phase 2 baseline, -13% from target)

**Phase 2 Results Summary:**
- ✅ Chinook +15% (digital goods business type prevents false positives)
- ✅ Pagila +20% (filtered KPI bug fixed, Repeat Customer Rate correct)
- ❌ Northwind -19% (time-series regression due to compiler gap)
- **Overall: +5%** but time-series KPIs still broken

**Recent Discoveries (2026-01-18):**
- Fixed 2 major bugs: digital goods validation, filtered KPI percentage calculation
- Found 2 prompt gaps: PLAN prompt missing timeField schema, GENERATE prompts not passing hints
- **Critical**: Compiler has NO support for time-series GROUP BY aggregation
- Time-series KPIs compile but don't execute correctly (Monthly = Total)

---

## Current Implementation

**Next Up:** Time-Series Compiler Support
- **Priority**: 🔴 CRITICAL | **Estimate**: ~3-4h
- **Status**: ⏳ Ready to start

### What Needs to Be Done

Add time-series aggregation support to liquid-connect KPI compiler:

1. **Detect time-series KPIs** in compileSimpleKPI()
   - Check if definition has timeField
   - Infer grain from KPI name (Monthly → month, Daily → day, etc.)

2. **Generate time-series SQL**
   ```sql
   SELECT
     DATE_TRUNC('month', timeField) AS period,
     SUM(expression) AS value
   FROM table
   GROUP BY DATE_TRUNC('month', timeField)
   ORDER BY period
   ```

3. **Support multiple grains**
   - day, week, month, quarter, year
   - Use dialect-specific DATE_TRUNC functions

4. **Update types and tests**
   - Add TimeSeriesGrain type to types.ts
   - Add time-series compilation tests to compiler.test.ts

**Files to Modify:**
- `packages/liquid-connect/src/kpi/compiler.ts` - add compileTimeSeriesKPI()
- `packages/liquid-connect/src/kpi/types.ts` - add TimeSeriesGrain type
- `packages/liquid-connect/src/kpi/__tests__/compiler.test.ts` - add tests

**Expected Impact:**
- Northwind: 68% → 85% (+17%)
- Pagila: 87% → 93% (+6%)
- Chinook: 62% → 80% (+18%)
- **Average: 72% → 86%** (+14%, exceeds 85% target)

---

**Recent Completions:**
- ✅ Phase 2 Wave 3 Implementation (pattern detection, grain awareness, semantic validation)
- ✅ Phase 2 Wave 4 Testing (all 3 databases tested, regression diagnosed)
- ✅ Phase 2 Fixes (digital goods type, filtered KPI bug, prompt gaps)
- ✅ Comprehensive diagnosis report (phase-2-final-diagnosis.md)

---

## Queue

### 1. Multi-Connection Backend Support
**Priority:** High | **Estimate:** ~4h | **Status:** ⏳ Queued

Enable backend to support multiple connections per workspace (UI already exists).

**Scope:**
- [ ] Change `knosiaWorkspace.connectionId` to `connectionIds[]` array (schema migration)
- [ ] Update analysis API to accept `connectionId` (not use workspace.connectionId)
- [ ] Update vocabulary detection to specify source connection
- [ ] Update canvas generation to work with multi-connection vocabulary
- [ ] Ensure onboarding "Add Another" flow actually creates multiple connections

**Dependencies:**
- Multi-connection onboarding UI exists ✅
- Workspace auto-creation exists ✅

**Note:** UI already supports adding multiple connections, but backend only stores one `connectionId` per workspace.

---

### 2. DuckDB Phase 4: Thread Query Execution
**Priority:** High | **Estimate:** ~3h | **Status:** ⏳ Queued

Wire QueryExecutor into thread API for live query execution.

**Scope:**
- [ ] Integrate QueryExecutor with thread API mutations
- [ ] Add query execution to processQuery() flow
- [ ] Handle query results (tables, aggregates)
- [ ] Update CLAUDE.md architecture diagram

**Dependencies:**
- DuckDB Phase 3 complete ✅
- Thread API exists ✅ (`/api/knosia/thread/*`)

---

## Completed

| Item | Completed | Notes |
|------|-----------|-------|
| **Phase 2 Prompt Fixes** | 2026-01-18 | PLAN v1.1.0, GENERATE prompts, value-validation v1.4.0 |
| **Phase 2 Bug Fixes** | 2026-01-18 | Digital goods type, filtered KPI percentage calculation |
| **Phase 2 Wave 4 Testing** | 2026-01-18 | All 3 databases tested, compiler gap identified |
| **Phase 2 Wave 3 Implementation** | 2026-01-18 | Time-series detection, grain awareness, semantic validation |
| **Database Schema (26 tables)** | 2025-12-29 | V1 foundation (15) + V2 enhancements (11) |
| Connections API | 2025-12-29 | CRUD + test |
| Analysis API | 2025-12-29 | SSE streaming |
| (... previous items omitted for brevity ...) |

---

## Quick Links
- **Phase 2 Diagnosis**: `.artifacts/2026-01-18-phase-2-final-diagnosis.md`
- **Phase 2 Test Results**: `.artifacts/2026-01-18-phase-2-test-results.md`
- Architecture Vision: `.artifacts/2025-12-29-1355-knosia-architecture-vision.md`
- UX Flow Spec: `.artifacts/2025-12-29-0219-knosia-ux-flow-clickthrough.md`
- DuckDB Adapter Plan: `.artifacts/2025-12-29-duckdb-universal-adapter-implementation.md`
