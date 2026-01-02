# Navigation & Routing

**Section:** 08 of 32
**Items:** ~25
**Status:** [x] Verified

---

## Header

- [ ] Header displays: Knosia logo, Brief, Canvases, Threads, Team <!-- KNOSIA:TODO priority=medium category=ui notes="No Team in header, sidebar-based navigation instead" -->
- [ ] Notification bell with unread count <!-- KNOSIA:TODO priority=medium category=ui -->
- [~] User avatar with dropdown <!-- KNOSIA:PARTIAL notes="User avatar exists in DashboardSidebar but not header" -->
- [~] Settings gear icon <!-- KNOSIA:PARTIAL notes="Settings in sidebar menu, not header" -->

## Routes

- [x] `/dashboard/knosia/` → Brief (default) <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/page.tsx" -->
- [ ] `/dashboard/knosia/brief` → Brief <!-- KNOSIA:TODO priority=low category=routing notes="No separate /brief route, index serves as briefing" -->
- [x] `/dashboard/knosia/canvases` → Canvas list <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/canvas/page.tsx (uses /canvas not /canvases)" -->
- [ ] `/dashboard/knosia/canvases/new` → Create new canvas <!-- KNOSIA:TODO priority=medium category=routing notes="No dedicated new page, creation via sidebar button" -->
- [x] `/dashboard/knosia/canvases/:id` → Single canvas view <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/canvas/[id]/page.tsx" -->
- [ ] `/dashboard/knosia/canvases/:id/edit` → Canvas edit mode <!-- KNOSIA:TODO priority=medium category=routing notes="No separate edit route, editing inline" -->
- [x] `/dashboard/knosia/threads` → Thread list with sidebar <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/threads/page.tsx" -->
- [ ] `/dashboard/knosia/threads/new` → Start new thread <!-- KNOSIA:TODO priority=medium category=routing notes="No dedicated new page, creation via sidebar button" -->
- [x] `/dashboard/knosia/threads/:id` → Single thread <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/threads/[id]/page.tsx" -->
- [ ] `/dashboard/knosia/team` → Team activity + shared <!-- KNOSIA:TODO priority=high category=ui -->
- [ ] `/dashboard/knosia/team/activity` → Activity feed <!-- KNOSIA:TODO priority=high category=ui -->
- [ ] `/dashboard/knosia/team/shared` → Shared with me <!-- KNOSIA:TODO priority=high category=ui -->
- [ ] `/dashboard/knosia/connections` → Connections management <!-- KNOSIA:TODO priority=high category=ui notes="Route defined in paths.ts but no page exists" -->
- [x] `/dashboard/knosia/vocabulary` → Vocabulary management <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/vocabulary/page.tsx" -->
- [x] `/dashboard/knosia/settings` → User preferences <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/settings/page.tsx" -->
- [ ] `/dashboard/knosia/settings/notifications` → Notification settings <!-- KNOSIA:TODO priority=medium category=ui -->
- [ ] `/dashboard/knosia/settings/digests` → Digest configuration <!-- KNOSIA:TODO priority=low category=ui -->

## Path Configuration

- [x] All routes defined in `apps/web/src/config/paths.ts` <!-- KNOSIA:DONE notes="knosia.* routes defined including canvas, threads" -->
- [x] Sidebar menu configured in layout <!-- KNOSIA:DONE notes="apps/web/src/app/[locale]/dashboard/(user)/layout.tsx has menu config" -->
- [x] i18n translations for all navigation items <!-- KNOSIA:DONE notes="knosia.json has sidebar.* translations, common.json has canvases/threads" -->

---

**Verified by:** Claude AI
**Date:** 2026-01-01
**Notes:**
- Navigation uses sidebar-based approach rather than header navigation
- Team routes (activity, shared) not implemented
- Connections page missing despite route being defined
- Canvas/Thread creation handled via sidebar buttons rather than dedicated routes
