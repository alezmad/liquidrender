# Real-Time & Email

**Section:** 19 of 32
**Items:** ~15
**Status:** [~] Partially verified

---

## SSE/WebSocket Support

- [x] Thread message streaming (SSE exists) <!-- KNOSIA:DONE - packages/api/src/modules/knosia/analysis/router.ts uses streamSSE -->
- [ ] Canvas block data refresh <!-- KNOSIA:TODO priority=medium category=realtime - No canvas block refresh SSE -->
- [ ] Notification push <!-- KNOSIA:TODO priority=medium category=realtime - No notification push -->
- [ ] Collaboration presence (who's viewing) <!-- KNOSIA:TODO priority=low category=realtime - V3+ feature -->

---

## Email Templates

### Notification Emails

- [ ] Alert triggered email template <!-- KNOSIA:TODO priority=medium category=email - No Knosia email templates exist -->
- [ ] Mention notification email template <!-- KNOSIA:TODO priority=medium category=email -->
- [ ] Share notification email template <!-- KNOSIA:TODO priority=medium category=email -->
- [ ] AI insight email template <!-- KNOSIA:TODO priority=low category=email - V3+ feature -->

### Digest Emails

- [ ] Daily digest email template <!-- KNOSIA:TODO priority=medium category=email -->
- [ ] Weekly digest email template <!-- KNOSIA:TODO priority=medium category=email -->
- [ ] Custom schedule digest template <!-- KNOSIA:TODO priority=low category=email -->
- [ ] Includes: KPIs, alerts, insights, activity <!-- KNOSIA:TODO priority=medium category=email -->

---

**Verified by:** Claude (Batch F verification)
**Date:** 2026-01-01
**Notes:**
- SSE streaming is implemented for analysis (schema extraction process)
- Analysis router uses Hono's streamSSE helper for real-time updates
- No Knosia-specific email templates exist yet
- Existing email templates are for auth (magic link, reset password, etc.)
- Email template location: packages/email/src/templates/

**Summary:** 1/12 items complete (8%)
- DONE: 1
- TODO: 11
- PARTIAL: 0
