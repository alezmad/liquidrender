# Pre-Existing Requirements

**Section:** 14 of 32
**Items:** ~45
**Status:** [ ] Not verified

---

## DuckDB Integration (Critical Path)

### Phase 3: UVB Integration
- [ ] Refactor `analysis/queries.ts` to use DuckDBAdapter
- [ ] Remove PostgresAdapter dependency (keep as fallback)
- [ ] Test with PostgreSQL via `postgres_scanner`
- [ ] Verify schema extraction works for all supported DB types

### Phase 4: Query Execution Integration
- [ ] Integrate QueryExecutor with Thread API mutations
- [ ] Add query execution to Thread message flow
- [ ] Handle query results (tables, aggregates)
- [ ] Return provenance metadata with results

## Auto Semantic Layer Generation

- [ ] Auto-generate semantic YAML from UVB detections
- [ ] Store semantic layer in `knosia_vocabulary_item` table
- [ ] Load semantic layer into registry for resolver
- [ ] Update vocabulary on re-analysis

## Vocabulary → Semantic Bridge

- [ ] Database-stored vocabulary items sync with compiled vocabulary
- [ ] User confirmations/corrections update semantic layer
- [ ] Multi-workspace vocabulary isolation

## Guest → Registered Conversion

- [ ] Hook `convertGuestToRegistered()` in auth signup flow
- [ ] Transfer guest workspace data to registered account
- [ ] Add ExpirationBanner to main dashboard layout
- [ ] Add "Upgrade" CTA in dashboard for guest users

## Connections Management Page

- [ ] `/dashboard/knosia/connections` page exists
- [ ] List existing connections with status badges
- [ ] Add new connection flow (reuse onboarding components)
- [ ] Edit connection (name, credentials)
- [ ] Delete connection (with confirmation)
- [ ] Connection health indicators (last checked, status)
- [ ] Re-test connection button
- [ ] Re-analyze connection button

## Vocabulary Management Page

- [ ] `/dashboard/knosia/vocabulary` page exists
- [ ] List vocabulary items by type (metrics, dimensions, entities)
- [ ] Search/filter vocabulary
- [ ] Edit vocabulary item definitions
- [ ] Add custom vocabulary item
- [ ] Delete vocabulary item
- [ ] Sync status with source connections
- [ ] Version history per item

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

