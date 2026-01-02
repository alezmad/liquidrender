# Pre-Existing Requirements

**Section:** 14 of 32
**Items:** ~45
**Status:** [~] Partially verified

---

## DuckDB Integration (Critical Path)

### Phase 3: UVB Integration
- [ ] Refactor `analysis/queries.ts` to use DuckDBAdapter <!-- KNOSIA:TODO priority=high category=integration - Currently uses PostgresAdapter directly -->
- [ ] Remove PostgresAdapter dependency (keep as fallback) <!-- KNOSIA:TODO priority=medium category=refactor - PostgresAdapter is main path -->
- [~] Test with PostgreSQL via `postgres_scanner` <!-- KNOSIA:PARTIAL notes="DuckDBAdapter supports postgres_scanner but not used in analysis yet" -->
- [x] Verify schema extraction works for all supported DB types <!-- KNOSIA:DONE - packages/liquid-connect/src/uvb/adapters/duckdb.ts supports postgres/mysql/sqlite/duckdb/parquet/csv -->

### Phase 4: Query Execution Integration
- [ ] Integrate QueryExecutor with Thread API mutations <!-- KNOSIA:TODO priority=high category=integration - QueryExecutor exists but not wired to Thread -->
- [ ] Add query execution to Thread message flow <!-- KNOSIA:TODO priority=high category=integration - Thread mutations don't run queries -->
- [ ] Handle query results (tables, aggregates) <!-- KNOSIA:TODO priority=high category=integration - Results not processed in Thread -->
- [x] Return provenance metadata with results <!-- KNOSIA:DONE - packages/liquid-connect/src/executor/provenance.ts -->

## Auto Semantic Layer Generation

- [x] Auto-generate semantic YAML from UVB detections <!-- KNOSIA:DONE - packages/api/src/modules/knosia/shared/semantic.ts buildSemanticLayer() -->
- [~] Store semantic layer in `knosia_vocabulary_item` table <!-- KNOSIA:PARTIAL notes="Vocabulary items stored, but not full YAML; rebuilt on demand" -->
- [x] Load semantic layer into registry for resolver <!-- KNOSIA:DONE - packages/liquid-connect/src/semantic/registry.ts -->
- [~] Update vocabulary on re-analysis <!-- KNOSIA:PARTIAL notes="New analysis creates new vocab but doesn't merge with existing" -->

## Vocabulary → Semantic Bridge

- [x] Database-stored vocabulary items sync with compiled vocabulary <!-- KNOSIA:DONE - packages/api/src/modules/knosia/shared/transforms.ts -->
- [~] User confirmations/corrections update semantic layer <!-- KNOSIA:PARTIAL notes="confirmVocabulary() stores confirmations but doesn't rebuild semantic" -->
- [x] Multi-workspace vocabulary isolation <!-- KNOSIA:DONE - workspaceId on vocabulary items ensures isolation -->

## Guest → Registered Conversion

- [x] Hook `convertGuestToRegistered()` in auth signup flow <!-- KNOSIA:DONE - packages/api/src/modules/knosia/organization/mutations.ts -->
- [x] Transfer guest workspace data to registered account <!-- KNOSIA:DONE - convertGuestToRegistered clears isGuest and expiresAt -->
- [x] Add ExpirationBanner to main dashboard layout <!-- KNOSIA:DONE - apps/web/src/modules/onboarding/components/layout/expiration-banner.tsx -->
- [ ] Add "Upgrade" CTA in dashboard for guest users <!-- KNOSIA:TODO priority=low category=ui - Banner exists but dashboard CTA not added -->

## Connections Management Page

- [ ] `/dashboard/knosia/connections` page exists <!-- KNOSIA:TODO priority=medium category=ui - Page not created -->
- [ ] List existing connections with status badges <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Add new connection flow (reuse onboarding components) <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Edit connection (name, credentials) <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Delete connection (with confirmation) <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Connection health indicators (last checked, status) <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Re-test connection button <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Re-analyze connection button <!-- KNOSIA:TODO priority=medium category=ui -->

## Vocabulary Management Page

- [ ] `/dashboard/knosia/vocabulary` page exists <!-- KNOSIA:TODO priority=medium category=ui - Page not created -->
- [ ] List vocabulary items by type (metrics, dimensions, entities) <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Search/filter vocabulary <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Edit vocabulary item definitions <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Add custom vocabulary item <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Delete vocabulary item <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Sync status with source connections <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] Version history per item <!-- KNOSIA:TODO priority=low category=feature - V3 roadmap -->

---

**Verified by:** Claude (Batch F verification)
**Date:** 2026-01-01
**Notes:**
- DuckDB Adapter exists and works for multiple DB types but not integrated into main analysis path
- QueryExecutor with timeout/limits exists but not connected to Thread API
- Semantic layer generation works from vocabulary items on-demand
- Guest conversion and ExpirationBanner are fully implemented
- Connections and Vocabulary management pages are completely missing

**Summary:** 9/32 items complete (28%)
- DONE: 9
- TODO: 19
- PARTIAL: 4
