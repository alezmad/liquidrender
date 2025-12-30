# NEXT-STEPS.md

> **Purpose:** Living document tracking immediate implementation priorities.
> **Updated:** 2025-12-30
> **Rule:** Complete items in order. Check off when done. Add new items at bottom.

---

## Current Implementation

**Next Up:** Conversation UI
- See Queue #1 below
- Status: ⏳ Ready to start

---

## Queue

### 1. Conversation UI
**Priority:** High | **Estimate:** ~6h | **Status:** ⏳ Ready

Chat interface for natural language queries.

**Scope:**
- [ ] Create `apps/web/src/modules/conversation/` module
- [ ] Chat message components (user, assistant, system)
- [ ] Query input with suggested questions
- [ ] Streaming response display (SSE from conversation API)
- [ ] Query result visualization (tables, charts via LiquidRender)
- [ ] Create `/dashboard/knosia/ask` page

**Dependencies:**
- Dashboard Module complete ✅
- Conversation API exists ✅
- Briefing API provides suggested questions ✅

---

### 2. Guest → Registered Conversion
**Priority:** Medium | **Estimate:** ~2h | **Status:** ⏳ Queued

Complete guest-to-registered user flow.

**Scope:**
- [ ] Hook `convertGuestToRegistered()` in auth signup flow
- [ ] Transfer guest workspace data to registered account
- [ ] Add ExpirationBanner to main dashboard layout (not just onboarding)
- [ ] Add "Upgrade" CTA in dashboard for guest users

**Dependencies:**
- Cron cleanup exists ✅ (WF-0021)
- ExpirationBanner component exists ✅

---

### 3. Connections Management Page
**Priority:** Medium | **Estimate:** ~3h | **Status:** ⏳ Queued

Manage database connections from dashboard.

**Scope:**
- [ ] Create `/dashboard/knosia/connections` page
- [ ] List existing connections with status
- [ ] Add new connection flow (reuse onboarding components)
- [ ] Edit/delete connections
- [ ] Connection health indicators

**Dependencies:**
- Connections API exists ✅
- Dashboard layout exists ✅

---

### 4. Vocabulary Management Page
**Priority:** Medium | **Estimate:** ~4h | **Status:** ⏳ Queued

View and edit vocabulary items.

**Scope:**
- [ ] Create `/dashboard/knosia/vocabulary` page
- [ ] List vocabulary items by type (metrics, dimensions, entities)
- [ ] Search/filter vocabulary
- [ ] Edit vocabulary item definitions
- [ ] Sync status with source connections

**Dependencies:**
- Vocabulary API exists ✅
- Dashboard layout exists ✅

---

### 5. DuckDB Phase 3: UVB Integration
**Priority:** High | **Estimate:** ~4h | **Status:** ⏳ Queued

Integrate DuckDB adapter with Universal Vocabulary Builder for schema extraction.

**Scope:**
- [ ] Refactor `analysis/queries.ts` to use DuckDBAdapter
- [ ] Remove PostgresAdapter dependency (keep as fallback)
- [ ] Test with PostgreSQL via `postgres_scanner`
- [ ] Verify schema extraction works for all supported DB types

**Dependencies:**
- DuckDB Adapter Phase 1-2 complete ✅ (WF-0022)

---

### 6. DuckDB Phase 4: Conversation Integration
**Priority:** High | **Estimate:** ~3h | **Status:** ⏳ Queued

Wire QueryExecutor into conversation API for live query execution.

**Scope:**
- [ ] Integrate QueryExecutor with conversation API mutations
- [ ] Add query execution to conversation flow
- [ ] Handle query results (tables, aggregates)
- [ ] Update CLAUDE.md architecture diagram

**Dependencies:**
- DuckDB Phase 3 complete
- Conversation API exists ✅

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
**Priority:** 🔴 CRITICAL | **Status:** ✅ Phase 1-2 Complete (WF-0022)

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

Phase 3: Update UVB to Use DuckDB (Next)
- [ ] Refactor analysis/queries.ts to use DuckDBAdapter
- [ ] Remove PostgresAdapter dependency (keep as fallback)
- [ ] Test with PostgreSQL via postgres_scanner

Phase 4: Conversation Integration
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
| Database Schema (15 tables) | 2025-12-29 | V1 foundation |
| Connections API | 2025-12-29 | CRUD + test |
| Analysis API | 2025-12-29 | SSE streaming |
| Onboarding Connect Flow | 2025-12-29 | Single connection |
| Onboarding Review Flow | 2025-12-29 | Vocabulary display |
| Multi-Connection Onboarding (WF-0020) | 2025-12-30 | Summary screen, add another flow |
| Onboarding Role Selection | 2025-12-30 | 6 role cards, grid layout |
| Onboarding Confirmation Questions | 2025-12-30 | Carousel with skip functionality |
| Onboarding Ready Screen | 2025-12-30 | Briefing preview, dashboard navigation |
| **Dashboard Module (WF-0021)** | 2025-12-30 | Briefing page, KPI grid, alerts, ask input |
| **Guest Cron Cleanup (WF-0021)** | 2025-12-30 | `/api/cron/cleanup-expired-orgs` endpoint |
| **DuckDB Universal Adapter (WF-0022)** | 2025-12-30 | Phase 1-2: Adapter + QueryExecutor + Extractor integration, 78 tests |

---

## Backlog (Not Yet Scoped)

These items are identified but not yet detailed:

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
