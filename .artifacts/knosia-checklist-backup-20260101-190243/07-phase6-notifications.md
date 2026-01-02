# Phase 6: Notifications

**Section:** 07 of 32
**Items:** ~40
**Status:** [ ] Not verified

---

## 6.1 Notification API

- [ ] `packages/api/src/modules/knosia/notification/` module exists
- [ ] `GET /knosia/notifications` - List user notifications
- [ ] `POST /knosia/notifications/:id/read` - Mark as read
- [ ] `POST /knosia/notifications/:id/dismiss` - Dismiss
- [ ] `POST /knosia/notifications/read-all` - Mark all read

## 6.2 Digest API

- [ ] `packages/api/src/modules/knosia/digest/` module exists
- [ ] `GET /knosia/digests` - List user's digests
- [ ] `POST /knosia/digests` - Create digest
- [ ] `PATCH /knosia/digests/:id` - Update digest
- [ ] `DELETE /knosia/digests/:id` - Delete digest
- [ ] `POST /knosia/digests/:id/preview` - Preview digest

## 6.3 Notification UI

- [ ] Bell icon in header with unread count
- [ ] Notification dropdown/panel
- [ ] Notification types displayed correctly:
  - [ ] Alert (threshold crossed)
  - [ ] Mention (@mentioned)
  - [ ] Share (Thread/Canvas shared)
  - [ ] AI Insight (AI found something)
  - [ ] Thread Activity
  - [ ] Digest
- [ ] Mark as read/dismiss actions

## 6.4 Digest Configuration

- [ ] Digest creation form
- [ ] Schedule selection (cron-based)
- [ ] Channel selection (email, slack)
- [ ] Content selection (canvases, metrics, alerts, insights)
- [ ] Digest preview

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

