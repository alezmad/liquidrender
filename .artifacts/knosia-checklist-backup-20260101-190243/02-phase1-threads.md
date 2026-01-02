# Phase 1: Threads Evolution

**Section:** 02 of 32
**Items:** ~65
**Status:** [ ] Not verified

---

## 1.1 API Module Structure

- [ ] `packages/api/src/modules/knosia/thread/` directory exists
  - [ ] `router.ts`
  - [ ] `schemas.ts`
  - [ ] `queries.ts`
  - [ ] `mutations.ts`
  - [ ] `index.ts`
- [ ] `packages/api/src/modules/knosia/thread-snapshot/` directory exists

## 1.2 Thread Router Endpoints

### Core CRUD
- [ ] `GET /knosia/threads` - List threads
- [ ] `GET /knosia/threads/:id` - Get single thread
- [ ] `POST /knosia/threads` - Create thread
- [ ] `POST /knosia/threads/:id/message` - Add message

### Forking
- [ ] `POST /knosia/threads/:id/fork` - Fork thread from message
  - [ ] Accepts `fromMessageId`, `name`
  - [ ] Returns new forked thread

### Snapshots
- [ ] `POST /knosia/threads/:id/snapshot` - Create snapshot
  - [ ] Accepts `name`, `description`
- [ ] `GET /knosia/threads/:id/snapshots` - List snapshots

### Starring
- [ ] `POST /knosia/threads/:id/star` - Star thread
- [ ] `DELETE /knosia/threads/:id/star` - Unstar thread

### Sharing
- [ ] `POST /knosia/threads/:id/share` - Share thread
  - [ ] Accepts `userIds`, `mode` (view/collaborate)

## 1.3 Frontend Thread Module

- [ ] `apps/web/src/modules/knosia/threads/` directory structure:
  - [ ] `components/thread-view.tsx`
  - [ ] `components/thread-sidebar.tsx`
  - [ ] `components/thread-message.tsx`
  - [ ] `components/block-trust-badge.tsx`
  - [ ] `components/thread-actions.tsx`
  - [ ] `components/snapshot-modal.tsx`
  - [ ] `hooks/use-thread.ts`
  - [ ] `hooks/use-threads-list.ts`
  - [ ] `hooks/use-thread-actions.ts`
  - [ ] `types.ts`
  - [ ] `index.ts`

## 1.4 Thread UI Functionality

- [ ] Thread list displays in sidebar
  - [ ] Starred threads section
  - [ ] AI-created threads section
  - [ ] Recent threads section
- [ ] Thread view shows full conversation
- [ ] Can create new thread
- [ ] Can add messages to thread
- [ ] Can fork thread from any message
- [ ] Can create snapshot of thread
- [ ] Can star/unstar threads
- [ ] Can share thread with other users

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

