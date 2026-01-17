# NEXT-STEPS.md

> **Purpose:** Living document tracking immediate implementation priorities.
> **Updated:** 2026-01-17 (Phase 1 quality improvements complete)
> **Rule:** Complete items in order. Check off when done. Add new items at bottom.

**URGENT - START HERE (2026-01-17):**
- 🚀 **KPI Pipeline Phase 2**: Quality improvements (74% → 85% target)
- 📄 **Read First**: `.artifacts/2026-01-17-kpi-pipeline-v2-continuation-prompt.md`
- ✅ **Phase 1 Complete**: 98% execution, 76% value quality
- 🎯 **Phase 2 Goal**: Add time-series detection, grain awareness, semantic validation
- ⏱️ **Estimate**: 4-6 hours (Wave 3 parallel tasks)

**Recent Updates (2026-01-17):**
- ✅ Phase 1 KPI Quality Improvements (commit `ad85dd1`)
- ✅ V1 Validation Integration (execution + value validation)
- ✅ Universal SQL fixes (COUNT_DISTINCT, composite JOINs)
- ✅ Context-aware value validation (B2B vs B2C patterns)
- ✅ Tested on 3 databases (Northwind, Pagila, Chinook)

**Recent Updates (2026-01-03):**
- ✅ Corrected table count: 26 tables (was 15)
- ✅ Moved Canvas API + UI to Completed (production-ready)
- ✅ Moved Thread UI to Completed (production-ready with pages + module)
- ✅ Moved Vocabulary Management to Completed (production-ready)
- ✅ Moved DuckDB Phase 3 to Completed (UVB integration done)
- ✅ Added Multi-Connection Backend Support to queue (UI exists, backend gap)
- ✅ Added V2 Profiling-Enhanced Vocabulary to Completed
- ✅ Connections Management Page implemented (list, add, delete, health status)

---

## Current Implementation

**Next Up:** Multi-Connection Backend Support
- See Queue #1 below (formerly Queue #2)
- Status: ⏳ Ready to start
- UI exists ✅ | Backend single-connection 🚧

**Recent Completions:**
- ✅ Guest → Registered Conversion (auto-conversion + ExpirationBanner + upgrade CTA)
- ✅ Connections Management Page (list, add, delete, health status)
- ✅ Thread UI (production-ready: pages + module + sidebar)
- ✅ Vocabulary Management Page (production-ready)
- ✅ Canvas API + UI (production-ready)
- ✅ DuckDB Phase 3 (UVB integration)
- ✅ V2 Profiling-Enhanced Vocabulary
- ✅ Data Health Dashboard

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

## Infrastructure: DuckDB Universal Adapter

**Architecture Decision:** Use DuckDB as the universal database adapter for both schema extraction AND query execution.

**Implementation Plan:** `.artifacts/2025-12-29-duckdb-universal-adapter-implementation.md`

### Why DuckDB
- Single adapter connects to PostgreSQL, MySQL, SQLite via extensions
- Same engine for UVB (schema extraction) AND query execution
- SQL emitters already exist (DuckDB, Trino, Postgres dialects)
- Future: DuckDB-WASM enables browser-side execution

### DuckDB Adapter Implementation
**Priority:** 🔴 CRITICAL | **Status:** ✅ Phase 1-3 Complete, Phase 4 Queued

```
Phase 1: Core DuckDB Adapter ✅
- [x] Create DuckDBAdapter class in packages/liquid-connect/src/uvb/adapters/duckdb.ts
- [x] Implement connect() with extension loading (postgres_scanner, mysql_scanner, etc.)
- [x] Implement query() for running SQL
- [x] Support PostgreSQL, MySQL, SQLite, DuckDB, Parquet, CSV sources

Phase 2: Query Execution Service ✅
- [x] Create QueryExecutor class in packages/liquid-connect/src/executor/
- [x] Add timeout, maxRows, connection management
- [x] Factory function tests (18 tests)
- [x] SchemaExtractor + DuckDB integration tests (19 tests)
- [x] 78 total DuckDB-related tests (21 adapter + 20 executor + 18 factory + 19 extractor)

Phase 3: Update UVB to Use DuckDB ✅ DONE
- [x] Refactor analysis/queries.ts to use DuckDBAdapter
- [x] Remove PostgresAdapter dependency
- [x] Test with PostgreSQL via postgres_scanner

Phase 4: Conversation Integration (Next)
- [ ] Integrate QueryExecutor with conversation API mutations
- [ ] Update CLAUDE.md architecture diagram
```

**Supported Databases (via DuckDB extensions):**
| Extension | Databases |
|-----------|-----------|
| `postgres_scanner` | PostgreSQL, CockroachDB, Supabase |
| `mysql_scanner` | MySQL, MariaDB, TiDB |
| `sqlite_scanner` | SQLite |
| `httpfs` | Parquet, CSV over HTTP/S3 |

### Auto Semantic Layer Generation
**Priority:** 🟠 HIGH | **Status:** Gap

UVB detects vocabulary (metrics, dimensions, entities) but doesn't:
- [ ] Auto-generate semantic YAML from detections
- [ ] Store semantic layer in `knosia_vocabulary_item` table
- [ ] Load semantic layer into registry for resolver

Currently requires manual YAML creation.

### Vocabulary → Semantic Bridge
**Priority:** 🟡 MEDIUM | **Status:** Partial

The compiled vocabulary (for NL queries) doesn't auto-sync with:
- [ ] Database-stored vocabulary items
- [ ] User confirmations/corrections
- [ ] Multi-workspace vocabulary isolation

---

## Completed

| Item | Completed | Notes |
|------|-----------|-------|
| **Database Schema (26 tables)** | 2025-12-29 | V1 foundation (15) + V2 enhancements (11) |
| Connections API | 2025-12-29 | CRUD + test |
| Analysis API | 2025-12-29 | SSE streaming |
| Onboarding Connect Flow | 2025-12-29 | Single connection |
| Onboarding Review Flow | 2025-12-29 | Vocabulary display |
| Multi-Connection Onboarding UI (WF-0020) | 2025-12-30 | Summary screen, add another flow (UI only, backend single connection) |
| Onboarding Role Selection | 2025-12-30 | 6 role cards, grid layout |
| Onboarding Confirmation Questions | 2025-12-30 | Carousel with skip functionality |
| Onboarding Ready Screen | 2025-12-30 | Briefing preview, dashboard navigation |
| **Dashboard Module (WF-0021)** | 2025-12-30 | Briefing page, KPI grid, alerts, ask input |
| **Canvas API** | 2026-01-03 | Production-ready: CRUD + versioning + permissions (942 lines) |
| **Canvas UI** | 2026-01-03 | CanvasView, CanvasSidebar, list/detail pages |
| **Thread UI** | 2026-01-03 | ThreadView, ThreadSidebar, ThreadMessage, list/detail pages, sidebar menu |
| **Vocabulary Management Page** | 2026-01-03 | VocabularyBrowser, page, sidebar menu |
| **Connections Management Page** | 2026-01-03 | ConnectionsView, list/detail, add/delete, health status |
| **Guest Cron Cleanup (WF-0021)** | 2025-12-30 | `/api/cron/cleanup-expired-orgs` endpoint |
| **DuckDB Universal Adapter (WF-0022)** | 2025-12-30 | Phase 1-2: Adapter + QueryExecutor + Extractor integration, 78 tests |
| **DuckDB Phase 3 (UVB Integration)** | 2026-01-03 | analysis/queries.ts uses DuckDBUniversalAdapter |
| **Real Database Integration Tests** | 2026-01-02 | 13 tests passing: Pagila, Chinook, Northwind, Knosia |
| **Wave 2 Reverse Engineering Pipeline** | 2026-01-02 | DB → Vocabulary → SemanticLayer → Dashboard, validated against real schemas |
| **Data Profiling (Wave 2.5-2.7)** | 2026-01-03 | Three-tier profiling (stats/sampling/detailed), 163 tests, API integration, UI components, data health dashboard |
| **V2 Profiling-Enhanced Vocabulary** | 2026-01-03 | 20% accuracy improvement via cardinality/null% analysis (8/8 tests) |
| **Guest → Registered Conversion** | 2026-01-03 | Auto-conversion in getOrCreateKnosiaOrg(), ExpirationBanner in dashboard layout, upgrade CTA in action bar |

---

## Backlog (Not Yet Scoped)

These items are identified but not yet detailed:

- [ ] **Global Notification System (V3+)** - Persistent SSE connection for server-pushed notifications
  - Current: Task-specific SSE (opens during analysis, closes after completion)
  - Vision: Persistent SSE in dashboard layout for real-time notifications
  - Features: Toast notifications, modals, alerts, AI insights, background job completion
  - Architecture: Global notification stream (`/api/notifications/stream`), reconnection management, notification queue
  - Benefits: Server can push notifications anytime (background enrichment, AI insights ready, data quality alerts, etc.)
  - Related: Currently using one-off SSE for background vocabulary enrichment (closes after `background_complete` event)
- [ ] Web App Component Testing (vitest + @testing-library/react)
- [ ] Vocabulary Governance UI (V3 roadmap)
- [ ] Multi-workspace support
- [ ] Connection health monitoring dashboard
- [ ] Proactive Insights (V5 roadmap)
- [ ] Mobile app onboarding
- [ ] Federated query support (Trino runtime integration)
- [ ] Settings page (`/dashboard/knosia/settings`)

---

## Notes

### Implementation Strategy
- Complete items in order
- Each item is a separate commit/PR
- Test each flow before moving to next
- Refer to vision docs in `.artifacts/` for detailed UX specs

### Quick Links
- Architecture Vision: `.artifacts/2025-12-29-1355-knosia-architecture-vision.md`
- UX Flow Spec: `.artifacts/2025-12-29-0219-knosia-ux-flow-clickthrough.md`
- Multi-Connection Spec: `.artifacts/2025-12-29-progressive-connection-implementation.md`
- **DuckDB Adapter Plan: `.artifacts/2025-12-29-duckdb-universal-adapter-implementation.md`**
