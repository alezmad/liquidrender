# Phase 1: Threads Evolution

**Section:** 02 of 32
**Items:** ~65
**Status:** [x] Verified

---

## 1.1 API Module Structure

- [x] `packages/api/src/modules/knosia/thread/` directory exists <!-- KNOSIA:DONE -->
  - [x] `router.ts` <!-- KNOSIA:DONE -->
  - [x] `schemas.ts` <!-- KNOSIA:DONE -->
  - [x] `queries.ts` <!-- KNOSIA:DONE -->
  - [x] `mutations.ts` <!-- KNOSIA:DONE -->
  - [x] `index.ts` <!-- KNOSIA:DONE -->
- [ ] `packages/api/src/modules/knosia/thread-snapshot/` directory exists <!-- KNOSIA:TODO priority=low category=api notes="Snapshots handled in thread module directly" -->

## 1.2 Thread Router Endpoints

### Core CRUD
- [x] `GET /knosia/threads` - List threads <!-- KNOSIA:DONE -->
- [x] `GET /knosia/threads/:id` - Get single thread <!-- KNOSIA:DONE -->
- [~] `POST /knosia/threads` - Create thread <!-- KNOSIA:PARTIAL notes="Threads created via /query endpoint, no direct POST /threads" -->
- [~] `POST /knosia/threads/:id/message` - Add message <!-- KNOSIA:PARTIAL notes="Messages added via /query and /clarify endpoints" -->

### Forking
- [x] `POST /knosia/threads/:id/fork` - Fork thread from message <!-- KNOSIA:DONE -->
  - [x] Accepts `fromMessageId`, `name` <!-- KNOSIA:DONE -->
  - [x] Returns new forked thread <!-- KNOSIA:DONE -->

### Snapshots
- [x] `POST /knosia/threads/:id/snapshot` - Create snapshot <!-- KNOSIA:DONE -->
  - [x] Accepts `name`, `description` <!-- KNOSIA:DONE -->
- [x] `GET /knosia/threads/:id/snapshots` - List snapshots <!-- KNOSIA:DONE -->

### Starring
- [x] `POST /knosia/threads/:id/star` - Star thread <!-- KNOSIA:DONE -->
- [x] `DELETE /knosia/threads/:id/star` - Unstar thread <!-- KNOSIA:DONE -->

### Sharing
- [x] `POST /knosia/threads/:id/share` - Share thread <!-- KNOSIA:DONE -->
  - [x] Accepts `userIds`, `mode` (view/collaborate) <!-- KNOSIA:DONE -->

## 1.3 Frontend Thread Module

- [x] `apps/web/src/modules/knosia/threads/` directory structure: <!-- KNOSIA:DONE -->
  - [x] `components/thread-view.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/thread-sidebar.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/thread-message.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/block-trust-badge.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/thread-actions.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/snapshot-modal.tsx` <!-- KNOSIA:DONE -->
  - [x] `hooks/use-thread.ts` <!-- KNOSIA:DONE -->
  - [x] `hooks/use-threads-list.ts` <!-- KNOSIA:DONE -->
  - [x] `hooks/use-thread-actions.ts` <!-- KNOSIA:DONE -->
  - [x] `types.ts` <!-- KNOSIA:DONE -->
  - [x] `index.ts` <!-- KNOSIA:DONE -->

## 1.4 Thread UI Functionality

- [~] Thread list displays in sidebar <!-- KNOSIA:PARTIAL notes="ThreadSidebar component exists, UI wiring TBD" -->
  - [ ] Starred threads section <!-- KNOSIA:TODO priority=medium category=frontend -->
  - [ ] AI-created threads section <!-- KNOSIA:TODO priority=medium category=frontend -->
  - [ ] Recent threads section <!-- KNOSIA:TODO priority=medium category=frontend -->
- [~] Thread view shows full conversation <!-- KNOSIA:PARTIAL notes="ThreadView component exists" -->
- [ ] Can create new thread <!-- KNOSIA:TODO priority=high category=frontend -->
- [ ] Can add messages to thread <!-- KNOSIA:TODO priority=high category=frontend -->
- [~] Can fork thread from any message <!-- KNOSIA:PARTIAL notes="API ready, UI integration TBD" -->
- [~] Can create snapshot of thread <!-- KNOSIA:PARTIAL notes="API ready, SnapshotModal exists" -->
- [~] Can star/unstar threads <!-- KNOSIA:PARTIAL notes="API ready, UI wiring TBD" -->
- [~] Can share thread with other users <!-- KNOSIA:PARTIAL notes="API ready, UI wiring TBD" -->

---

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:** API layer fully implemented. Frontend components exist but need wiring to pages. Query-based thread creation rather than direct POST.

