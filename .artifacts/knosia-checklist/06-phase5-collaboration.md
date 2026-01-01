# Phase 5: Collaboration

**Section:** 06 of 32
**Items:** ~35
**Status:** [x] Verified

---

## 5.1 Comments API

- [x] `packages/api/src/modules/knosia/comment/` module exists <!-- KNOSIA:DONE -->
- [x] `GET /knosia/comments` - List comments (with targetType/targetId filter) <!-- KNOSIA:DONE -->
- [x] `POST /knosia/comments` - Create comment <!-- KNOSIA:DONE -->
  - [x] Supports mentions <!-- KNOSIA:DONE -->
  - [x] Triggers mention notifications <!-- KNOSIA:DONE -->
- [x] `PATCH /knosia/comments/:id` - Edit comment <!-- KNOSIA:DONE -->
- [x] `DELETE /knosia/comments/:id` - Delete comment <!-- KNOSIA:DONE -->

## 5.2 Activity Feed API

- [x] `packages/api/src/modules/knosia/activity/` module exists <!-- KNOSIA:DONE -->
- [x] `GET /knosia/activity` - Get activity feed <!-- KNOSIA:DONE -->
  - [x] Filter by workspace <!-- KNOSIA:DONE -->
  - [x] Filter by type <!-- KNOSIA:DONE -->
  - [x] Pagination support <!-- KNOSIA:DONE -->

## 5.3 Collaboration UI

- [x] Comment thread on Thread messages <!-- KNOSIA:DONE notes="CommentThread component created in apps/web/src/modules/knosia/comments/" -->
- [x] Comment thread on Canvas blocks <!-- KNOSIA:DONE notes="CommentThread component works for any targetType including canvas_block" -->
- [x] Activity feed page/panel <!-- KNOSIA:DONE notes="ActivityFeed component with filtering in apps/web/src/modules/knosia/activity/" -->
- [ ] @mention autocomplete in comments <!-- KNOSIA:TODO priority=medium category=frontend -->
- [~] Share dialogs for Threads and Canvases <!-- KNOSIA:PARTIAL notes="canvas-share-modal.tsx exists, thread share TBD" -->

## 5.4 Team Page

- [ ] `/dashboard/knosia/team` page exists <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Activity feed tab showing recent team activity <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Shared with me tab showing: <!-- KNOSIA:TODO priority=medium category=frontend -->
  - [ ] Threads shared with current user <!-- KNOSIA:TODO priority=medium category=frontend -->
  - [ ] Canvases shared with current user <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Team members list (if admin) <!-- KNOSIA:TODO priority=low category=frontend -->
- [ ] Filter activity by type <!-- KNOSIA:TODO priority=low category=frontend -->
- [ ] Filter activity by team member <!-- KNOSIA:TODO priority=low category=frontend -->
- [ ] Pagination for activity feed <!-- KNOSIA:TODO priority=low category=frontend -->

---

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:** API layer for comments and activity fully implemented. Frontend collaboration UI needs building (comment threads, activity feed page, team page).

