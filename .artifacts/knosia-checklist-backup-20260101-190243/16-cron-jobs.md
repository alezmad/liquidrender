# Background Jobs

**Section:** 16 of 32
**Items:** ~20
**Status:** [ ] Not verified

---

## Alert Checking

- [ ] Cron job or event-driven alert evaluation
- [ ] Check Canvas alert conditions against current data
- [ ] Trigger notifications when thresholds crossed
- [ ] Rate limiting to prevent notification spam
- [ ] Update `last_triggered_at` on alert

## Digest Sending

- [ ] Cron job for scheduled digest delivery
- [ ] Query digests where `next_send_at <= now()`
- [ ] Generate digest content based on `include` config
- [ ] Send via configured channels (email, slack)
- [ ] Update `last_sent_at` and `next_send_at`

## Daily Insight Generation

- [ ] Cron job for daily insight generation
- [ ] Run per workspace with active connections
- [ ] Respect user's AI proactivity preference
- [ ] Generate max insights based on setting (balanced = 2-3)

## Guest Organization Cleanup

- [ ] Cron job exists (`/api/cron/cleanup-expired-orgs`) ✅
- [ ] Deletes guest orgs past TTL (7 days)
- [ ] Cascades to all related data

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

