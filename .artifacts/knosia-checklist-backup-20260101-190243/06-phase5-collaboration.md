# Phase 5: Collaboration

**Section:** 06 of 32
**Items:** ~35
**Status:** [ ] Not verified

---

## 5.1 Comments API

- [ ] `packages/api/src/modules/knosia/comment/` module exists
- [ ] `GET /knosia/comments` - List comments (with targetType/targetId filter)
- [ ] `POST /knosia/comments` - Create comment
  - [ ] Supports mentions
  - [ ] Triggers mention notifications
- [ ] `PATCH /knosia/comments/:id` - Edit comment
- [ ] `DELETE /knosia/comments/:id` - Delete comment

## 5.2 Activity Feed API

- [ ] `packages/api/src/modules/knosia/activity/` module exists
- [ ] `GET /knosia/activity` - Get activity feed
  - [ ] Filter by workspace
  - [ ] Filter by type
  - [ ] Pagination support

## 5.3 Collaboration UI

- [ ] Comment thread on Thread messages
- [ ] Comment thread on Canvas blocks
- [ ] Activity feed page/panel
- [ ] @mention autocomplete in comments
- [ ] Share dialogs for Threads and Canvases

## 5.4 Team Page

- [ ] `/dashboard/knosia/team` page exists
- [ ] Activity feed tab showing recent team activity
- [ ] Shared with me tab showing:
  - [ ] Threads shared with current user
  - [ ] Canvases shared with current user
- [ ] Team members list (if admin)
- [ ] Filter activity by type
- [ ] Filter activity by team member
- [ ] Pagination for activity feed

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

