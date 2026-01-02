# AI Insight Management

**Section:** 15 of 32
**Items:** ~20
**Status:** [ ] Not verified

---

## Insight API Module

- [ ] `packages/api/src/modules/knosia/insight/` module exists
  - [ ] `router.ts`
  - [ ] `schemas.ts`
  - [ ] `queries.ts`
  - [ ] `mutations.ts`
- [ ] `GET /knosia/insights` - List insights (with filters)
- [ ] `GET /knosia/insights/:id` - Get single insight
- [ ] `POST /knosia/insights/:id/view` - Mark as viewed
- [ ] `POST /knosia/insights/:id/engage` - Mark as engaged
- [ ] `POST /knosia/insights/:id/dismiss` - Dismiss insight
- [ ] `POST /knosia/insights/:id/convert-to-thread` - Convert to Thread
  - [ ] Creates new Thread with insight context
  - [ ] Updates insight status to "converted"
  - [ ] Links insight to new Thread

## Insight Generation Service

- [ ] `generateDailyInsights()` function exists
- [ ] Anomaly detection algorithm implemented
- [ ] Pattern detection algorithm implemented
- [ ] Severity scoring implemented
- [ ] Role-based insight filtering (different insights per role)

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

