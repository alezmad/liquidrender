# Testing

**Section:** 11 of 32
**Items:** ~30
**Status:** [x] Verified

---

## Unit Tests

- [~] Thread API queries/mutations tested <!-- KNOSIA:PARTIAL notes="No thread-specific tests, but general schema tests exist" -->
- [~] Canvas API queries/mutations tested <!-- KNOSIA:PARTIAL notes="No canvas-specific tests" -->
- [x] Provenance calculation tested <!-- KNOSIA:DONE notes="liquid-connect/src/executor/__tests__/executor.test.ts exists" -->
- [~] AI insight generation tested <!-- KNOSIA:PARTIAL notes="No insight-specific tests" -->

## Integration Tests

- [ ] Full Thread flow (create -> message -> fork) <!-- KNOSIA:TODO priority=2 category=testing notes="No integration tests for Thread flow" -->
- [ ] Full Canvas flow (create -> add blocks -> edit) <!-- KNOSIA:TODO priority=2 category=testing notes="No integration tests for Canvas flow" -->
- [ ] Notification flow (action -> notification -> view) <!-- KNOSIA:TODO priority=2 category=testing notes="No integration tests for notifications" -->
- [ ] Digest generation and preview <!-- KNOSIA:TODO priority=2 category=testing notes="No integration tests for digests" -->

## E2E Tests

- [~] Onboarding -> Brief flow <!-- KNOSIA:PARTIAL notes="No Knosia-specific E2E, but LiquidRender has components.spec.ts" -->
- [ ] Brief -> Thread creation <!-- KNOSIA:TODO priority=2 category=testing notes="No E2E tests for Thread flow" -->
- [ ] Canvas creation and editing <!-- KNOSIA:TODO priority=2 category=testing notes="No E2E tests for Canvas" -->
- [ ] Sharing and collaboration <!-- KNOSIA:TODO priority=2 category=testing notes="No E2E tests for sharing" -->

## Manual QA

- [ ] All happy paths verified <!-- KNOSIA:TODO priority=2 category=testing notes="No QA checklist executed" -->
- [ ] Edge cases tested (empty states, errors) <!-- KNOSIA:TODO priority=2 category=testing notes="No edge case testing" -->
- [ ] Mobile testing complete <!-- KNOSIA:TODO priority=2 category=testing notes="No mobile testing - frontend not built" -->
- [ ] Cross-browser testing complete <!-- KNOSIA:TODO priority=2 category=testing notes="No cross-browser testing" -->

---

**Verified by:** Claude Opus 4.5
**Date:** 2026-01-01
**Notes:**

Summary:
- DONE: 1 item
- PARTIAL: 5 items
- TODO: 10 items

Existing Knosia API test files found:
1. `packages/api/src/modules/knosia/connections/schemas.test.ts`
2. `packages/api/src/modules/knosia/shared/transforms.test.ts`
3. `packages/api/src/modules/knosia/shared/semantic.test.ts`
4. `packages/api/src/modules/knosia/preferences/schemas.test.ts`
5. `packages/api/src/modules/knosia/analysis/schemas.test.ts`
6. `packages/api/src/modules/knosia/briefing/schemas.test.ts`
7. `packages/api/src/modules/knosia/vocabulary/test/schemas.test.ts`

Related test files:
- `packages/liquid-connect/src/executor/__tests__/executor.test.ts` - QueryExecutor tests
- `packages/liquid-connect/src/uvb/__tests__/extractor-duckdb.test.ts` - DuckDB adapter
- `packages/liquid-render/e2e/components.spec.ts` - LiquidRender E2E
- `packages/liquid-render/e2e/a11y-audit.spec.ts` - Accessibility tests

Key gaps:
1. No Thread/Canvas integration tests
2. No notification flow tests
3. No Knosia-specific E2E tests
4. Schema validation tests exist but no API route tests
5. Manual QA not executed
