# Phase 2: Block Trust Metadata

**Section:** 03 of 32
**Items:** ~25
**Status:** [x] Verified

---

## 2.1 Provenance Generation

- [x] `QueryExecutor` returns provenance metadata <!-- KNOSIA:DONE -->
  - [x] Freshness timestamp <!-- KNOSIA:DONE --> (formatFreshness in provenance.ts)
  - [x] Source table/query identification <!-- KNOSIA:DONE --> (extractTablesFromQuery in provenance.ts)
  - [x] Confidence calculation implemented <!-- KNOSIA:DONE --> (calculateConfidence in provenance.ts)
- [x] Confidence level heuristics: <!-- KNOSIA:DONE -->
  - [x] Direct SELECT = exact (100) <!-- KNOSIA:DONE --> (score 95-100 for simple queries)
  - [x] JOINs/aggregations = calculated (80-90) <!-- KNOSIA:DONE --> (score 75-94)
  - [x] SAMPLE/LIMIT extrapolation = estimated (60-70) <!-- KNOSIA:DONE --> (score 50-74)
  - [x] ML predictions = predicted (40-60) <!-- KNOSIA:DONE --> (score 30-49)

## 2.2 Trust Badge Component

- [x] `BlockTrustBadge` component exists <!-- KNOSIA:DONE --> (apps/web/src/modules/knosia/threads/components/block-trust-badge.tsx)
- [~] Displays confidence level visually (bars/colors) <!-- KNOSIA:PARTIAL notes="Uses color coding but no bars/visual indicator" -->
- [x] Shows freshness on hover <!-- KNOSIA:DONE --> (via lastVerified in tooltip)
- [~] Shows sources on hover <!-- KNOSIA:PARTIAL notes="Shows vocabularyItemIds count, not full source list" -->
- [ ] Shows assumptions (if any) on hover <!-- KNOSIA:TODO priority=3 category=ui --> (assumptions field exists in provenance.ts but not displayed in badge)
- [~] Color coding: <!-- KNOSIA:PARTIAL notes="Uses different scheme than specified" -->
  - [~] exact = green <!-- KNOSIA:PARTIAL notes="Uses high/medium/low instead of exact/calculated/estimated/predicted" -->
  - [~] calculated = blue <!-- KNOSIA:PARTIAL notes="Badge uses provenance types: vocabulary/derived/ai_generated/user_defined" -->
  - [~] estimated = yellow <!-- KNOSIA:PARTIAL notes="Color scheme is green/yellow/red for high/medium/low confidence" -->
  - [~] predicted = orange <!-- KNOSIA:PARTIAL notes="provenance.ts has correct colors, badge uses different scheme" -->

## 2.3 Integration

- [x] All Thread messages with data show trust badge <!-- KNOSIA:DONE --> (thread-message.tsx line 69-71)
- [ ] All Canvas blocks with data show trust badge <!-- KNOSIA:TODO priority=2 category=ui --> (canvas-block.tsx has no trust badge integration)
- [~] Provenance stored in database with messages <!-- KNOSIA:PARTIAL notes="ThreadMessage type has provenance field, storage not verified" -->

---

**Verified by:** Claude Agent (Batch C)
**Date:** 2026-01-01
**Notes:**
- Provenance generation in `packages/liquid-connect/src/executor/provenance.ts` is comprehensive with all confidence levels
- Trust badge exists but uses a different confidence scheme (high/medium/low + provenance types) vs the specified (exact/calculated/estimated/predicted)
- Thread messages integrate trust badge, Canvas blocks do NOT
- The `provenance.ts` file has `getConfidenceLevelColor()` with exact/calculated/estimated/predicted but `block-trust-badge.tsx` uses a different approach

