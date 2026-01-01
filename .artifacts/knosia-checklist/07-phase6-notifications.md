# Phase 6: Notifications

**Section:** 07 of 32
**Items:** ~40
**Status:** [x] Verified

---

## 6.1 Notification API

- [x] `packages/api/src/modules/knosia/notification/` module exists <!-- KNOSIA:DONE -->
- [x] `GET /knosia/notifications` - List user notifications <!-- KNOSIA:DONE -->
- [x] `POST /knosia/notifications/:id/read` - Mark as read <!-- KNOSIA:DONE -->
- [x] `POST /knosia/notifications/:id/dismiss` - Dismiss <!-- KNOSIA:DONE -->
- [x] `POST /knosia/notifications/read-all` - Mark all read <!-- KNOSIA:DONE -->

## 6.2 Digest API

- [~] `packages/api/src/modules/knosia/digest/` module exists <!-- KNOSIA:PARTIAL notes="Digest endpoints in notification module, no separate directory" -->
- [x] `GET /knosia/digests` - List user's digests <!-- KNOSIA:DONE notes="GET /knosia/notification/digests" -->
- [x] `POST /knosia/digests` - Create digest <!-- KNOSIA:DONE notes="POST /knosia/notification/digests" -->
- [x] `PATCH /knosia/digests/:id` - Update digest <!-- KNOSIA:DONE notes="PATCH /knosia/notification/digests/:id" -->
- [x] `DELETE /knosia/digests/:id` - Delete digest <!-- KNOSIA:DONE notes="DELETE /knosia/notification/digests/:id" -->
- [x] `POST /knosia/digests/:id/preview` - Preview digest <!-- KNOSIA:DONE notes="POST /knosia/notification/digests/:id/preview" -->

## 6.3 Notification UI

- [x] Bell icon in header with unread count <!-- KNOSIA:DONE notes="NotificationBell component in modules/knosia/notifications" -->
- [x] Notification dropdown/panel <!-- KNOSIA:DONE notes="DropdownMenu-based with ScrollArea" -->
- [x] Notification types displayed correctly: <!-- KNOSIA:DONE notes="Icons mapped per type" -->
  - [x] Alert (threshold crossed) <!-- KNOSIA:DONE -->
  - [x] Mention (@mentioned) <!-- KNOSIA:DONE -->
  - [x] Share (Thread/Canvas shared) <!-- KNOSIA:DONE -->
  - [x] AI Insight (AI found something) <!-- KNOSIA:DONE -->
  - [x] Thread Activity <!-- KNOSIA:DONE -->
  - [x] Digest <!-- KNOSIA:DONE -->
- [x] Mark as read/dismiss actions <!-- KNOSIA:DONE notes="useMarkNotificationRead, useDismissNotification hooks" -->

## 6.4 Digest Configuration

- [ ] Digest creation form <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Schedule selection (cron-based) <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Channel selection (email, slack) <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Content selection (canvases, metrics, alerts, insights) <!-- KNOSIA:TODO priority=medium category=frontend -->
- [x] Digest preview <!-- KNOSIA:DONE notes="API endpoint exists with real data fetching" -->

---

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:** API layer fully implemented (notifications, digests, AI insights all in notification module). Digest preview fetches real canvas/metric/alert/insight data. Frontend notification UI needs building.

