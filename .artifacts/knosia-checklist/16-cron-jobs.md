# Background Jobs

**Section:** 16 of 32
**Items:** ~20
**Status:** [~] Partially verified

---

## Alert Checking

- [ ] Cron job or event-driven alert evaluation <!-- KNOSIA:TODO priority=high category=cron - No alert checking cron -->
- [ ] Check Canvas alert conditions against current data <!-- KNOSIA:TODO priority=high category=feature -->
- [ ] Trigger notifications when thresholds crossed <!-- KNOSIA:TODO priority=high category=feature -->
- [ ] Rate limiting to prevent notification spam <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Update `last_triggered_at` on alert <!-- KNOSIA:TODO priority=medium category=feature -->

## Digest Sending

- [ ] Cron job for scheduled digest delivery <!-- KNOSIA:TODO priority=medium category=cron -->
- [ ] Query digests where `next_send_at <= now()` <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Generate digest content based on `include` config <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Send via configured channels (email, slack) <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Update `last_sent_at` and `next_send_at` <!-- KNOSIA:TODO priority=medium category=feature -->

## Daily Insight Generation

- [ ] Cron job for daily insight generation <!-- KNOSIA:TODO priority=low category=cron - V3+ feature -->
- [ ] Run per workspace with active connections <!-- KNOSIA:TODO priority=low category=feature -->
- [ ] Respect user's AI proactivity preference <!-- KNOSIA:TODO priority=low category=feature -->
- [ ] Generate max insights based on setting (balanced = 2-3) <!-- KNOSIA:TODO priority=low category=feature -->

## Guest Organization Cleanup

- [x] Cron job exists (`/api/cron/cleanup-expired-orgs`) <!-- KNOSIA:DONE - apps/web/src/app/api/cron/cleanup-expired-orgs/route.ts -->
- [x] Deletes guest orgs past TTL (7 days) <!-- KNOSIA:DONE - Uses isGuest=true AND expiresAt < now() -->
- [x] Cascades to all related data <!-- KNOSIA:DONE - Hard delete with cascade via DB constraints -->

---

**Verified by:** Claude (Batch F verification)
**Date:** 2026-01-01
**Notes:**
- Only guest organization cleanup cron is implemented
- Alert checking, digest sending, and insight generation crons are not implemented
- Cron security is handled via CRON_SECRET in the cleanup endpoint
- Future crons should follow the same pattern (apps/web/src/app/api/cron/[job-name]/route.ts)

**Summary:** 3/17 items complete (18%)
- DONE: 3
- TODO: 14
- PARTIAL: 0
