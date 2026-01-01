# Search Functionality

**Section:** 18 of 32
**Items:** ~15
**Status:** [ ] Not Implemented

---

## Thread Search

- [ ] Search threads by title <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Search threads by message content <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Filter by starred <!-- KNOSIA:TODO priority=low category=feature -->
- [ ] Filter by AI-initiated <!-- KNOSIA:TODO priority=low category=feature -->
- [ ] Filter by date range <!-- KNOSIA:TODO priority=low category=feature -->
- [ ] Sort options (recent, starred first, etc.) <!-- KNOSIA:TODO priority=low category=feature notes="Only archive toggle exists in ThreadSidebar" -->

## Canvas Search

- [ ] Search canvases by name <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Search canvases by description <!-- KNOSIA:TODO priority=medium category=feature -->
- [ ] Filter by status (draft, active, archived) <!-- KNOSIA:TODO priority=low category=feature notes="Only archive toggle exists in CanvasSidebar" -->
- [ ] Filter by AI-generated <!-- KNOSIA:TODO priority=low category=feature -->
- [ ] Sort options (recent, most viewed, etc.) <!-- KNOSIA:TODO priority=low category=feature -->

## Global Search

- [x] Unified search across Threads, Canvases, Vocabulary <!-- KNOSIA:DONE notes="GET /knosia/search API endpoint" -->
- [x] Search results grouped by type <!-- KNOSIA:DONE notes="Returns counts per type and sorted results" -->
- [x] Quick navigation to result <!-- KNOSIA:DONE notes="Each result includes link to target" -->

---

**Verified by:** Claude AI
**Date:** 2026-01-01
**Notes:**
- No search functionality currently implemented in Knosia modules
- Thread and Canvas sidebars only have archive/active toggle, no search or filtering
- Global search (cmd+k style) not implemented
- Would need API endpoints for search and frontend search components
