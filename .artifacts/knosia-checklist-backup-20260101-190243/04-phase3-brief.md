# Phase 3: Brief Enhancement

**Section:** 04 of 32
**Items:** ~30
**Status:** [ ] Not verified

---

## 3.1 Brief Module Structure

- [ ] `apps/web/src/modules/knosia/brief/` directory:
  - [ ] `components/brief-view.tsx`
  - [ ] `components/attention-section.tsx`
  - [ ] `components/on-track-section.tsx`
  - [ ] `components/thinking-section.tsx`
  - [ ] `components/tasks-section.tsx`
  - [ ] `components/insight-card.tsx`
  - [ ] `hooks/use-brief-data.ts`
  - [ ] `index.ts`

## 3.2 Brief Sections

- [ ] Attention section (red) shows:
  - [ ] Anomalies
  - [ ] Declining metrics
  - [ ] Risks/alerts
- [ ] On Track section (green) shows:
  - [ ] Healthy metrics
  - [ ] Positive trends
- [ ] Thinking section shows:
  - [ ] AI observations/insights
  - [ ] Pattern detections
- [ ] Tasks section shows:
  - [ ] Pending user actions

## 3.3 AI Insight Generation

- [ ] `generateDailyInsights()` function implemented
- [ ] Anomaly detection working
- [ ] Pattern finding working
- [ ] Max 2-3 insights per day (balanced setting)
- [ ] Insights stored in `knosia_ai_insight` table

## 3.4 Briefing API

- [ ] `GET /knosia/briefing` returns:
  - [ ] `greeting` (personalized)
  - [ ] `attention` (array of items)
  - [ ] `onTrack` (array of items)
  - [ ] `thinking` (array of insights)
  - [ ] `tasks` (array of pending actions)

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

