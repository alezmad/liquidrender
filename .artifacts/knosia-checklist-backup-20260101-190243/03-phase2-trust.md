# Phase 2: Block Trust Metadata

**Section:** 03 of 32
**Items:** ~25
**Status:** [ ] Not verified

---

## 2.1 Provenance Generation

- [ ] `QueryExecutor` returns provenance metadata
  - [ ] Freshness timestamp
  - [ ] Source table/query identification
  - [ ] Confidence calculation implemented
- [ ] Confidence level heuristics:
  - [ ] Direct SELECT = exact (100)
  - [ ] JOINs/aggregations = calculated (80-90)
  - [ ] SAMPLE/LIMIT extrapolation = estimated (60-70)
  - [ ] ML predictions = predicted (40-60)

## 2.2 Trust Badge Component

- [ ] `BlockTrustBadge` component exists
- [ ] Displays confidence level visually (bars/colors)
- [ ] Shows freshness on hover
- [ ] Shows sources on hover
- [ ] Shows assumptions (if any) on hover
- [ ] Color coding:
  - [ ] exact = green
  - [ ] calculated = blue
  - [ ] estimated = yellow
  - [ ] predicted = orange

## 2.3 Integration

- [ ] All Thread messages with data show trust badge
- [ ] All Canvas blocks with data show trust badge
- [ ] Provenance stored in database with messages

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

