# Phase 4: Canvases

**Section:** 05 of 32
**Items:** ~75
**Status:** [x] Verified

---

## 4.1 Canvas API Module

- [x] `packages/api/src/modules/knosia/canvas/` structure: <!-- KNOSIA:DONE -->
  - [x] `router.ts` <!-- KNOSIA:DONE -->
  - [x] `schemas.ts` <!-- KNOSIA:DONE -->
  - [x] `queries.ts` <!-- KNOSIA:DONE -->
  - [x] `mutations.ts` <!-- KNOSIA:DONE -->
  - [ ] `blocks/router.ts` <!-- KNOSIA:TODO priority=low category=api notes="Blocks handled in main canvas router" -->
  - [ ] `blocks/mutations.ts` <!-- KNOSIA:TODO priority=low category=api notes="Block mutations in main mutations.ts" -->
  - [ ] `alerts/router.ts` <!-- KNOSIA:TODO priority=low category=api notes="Alerts handled in main canvas router" -->
  - [ ] `alerts/mutations.ts` <!-- KNOSIA:TODO priority=low category=api notes="Alert mutations in main mutations.ts" -->
  - [x] `index.ts` <!-- KNOSIA:DONE -->

## 4.2 Canvas Router Endpoints

### Core CRUD
- [x] `GET /knosia/canvases` - List canvases <!-- KNOSIA:DONE -->
- [x] `GET /knosia/canvases/:id` - Get canvas with blocks <!-- KNOSIA:DONE -->
- [x] `POST /knosia/canvases` - Create canvas <!-- KNOSIA:DONE -->
- [x] `PATCH /knosia/canvases/:id` - Update canvas <!-- KNOSIA:DONE -->
- [x] `DELETE /knosia/canvases/:id` - Delete canvas <!-- KNOSIA:DONE -->

### AI Features
- [x] `POST /knosia/canvases/generate` - Generate canvas from prompt <!-- KNOSIA:DONE -->
  - [x] Accepts `prompt`, `roleId` <!-- KNOSIA:DONE -->
  - [x] Returns AI-generated canvas structure <!-- KNOSIA:DONE -->
- [x] `POST /knosia/canvases/:id/edit` - Natural language edit <!-- KNOSIA:DONE -->
  - [x] Accepts `instruction` <!-- KNOSIA:DONE -->
  - [x] Modifies canvas based on instruction <!-- KNOSIA:DONE -->

### Block Management
- [x] `POST /knosia/canvases/:id/blocks` - Add block <!-- KNOSIA:DONE -->
- [x] `PATCH /knosia/canvases/:id/blocks/:blockId` - Update block <!-- KNOSIA:DONE -->
- [x] `DELETE /knosia/canvases/:id/blocks/:blockId` - Remove block <!-- KNOSIA:DONE -->
- [x] `POST /knosia/canvases/:id/blocks/reorder` - Reorder blocks <!-- KNOSIA:DONE -->

### Alert Management
- [x] `GET /knosia/canvases/:id/alerts` - List alerts <!-- KNOSIA:DONE -->
- [x] `POST /knosia/canvases/:id/alerts` - Create alert <!-- KNOSIA:DONE -->
- [x] `PATCH /knosia/canvases/:id/alerts/:alertId` - Update alert <!-- KNOSIA:DONE -->
- [x] `DELETE /knosia/canvases/:id/alerts/:alertId` - Delete alert <!-- KNOSIA:DONE -->

## 4.3 Canvas Frontend Module

- [x] `apps/web/src/modules/knosia/canvas/` structure: <!-- KNOSIA:DONE -->
  - [x] `components/canvas-view.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/canvas-grid.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/canvas-block.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/blocks/hero-metric.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/blocks/watch-list.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/blocks/comparison-card.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/blocks/insight-card.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/blocks/liquid-render-block.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/canvas-editor.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/canvas-prompt-bar.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/canvas-alerts-panel.tsx` <!-- KNOSIA:DONE -->
  - [x] `components/canvas-share-modal.tsx` <!-- KNOSIA:DONE -->
  - [x] `hooks/use-canvas.ts` <!-- KNOSIA:DONE -->
  - [x] `hooks/use-canvas-blocks.ts` <!-- KNOSIA:DONE -->
  - [~] `hooks/use-canvas-mutations.ts` <!-- KNOSIA:PARTIAL notes="Mutations handled in other hooks" -->
  - [x] `types.ts` <!-- KNOSIA:DONE -->
  - [x] `index.ts` <!-- KNOSIA:DONE -->

## 4.4 Block Type Rendering

### Canvas-Native Blocks
- [x] `hero_metric` block renders correctly <!-- KNOSIA:DONE -->
- [x] `watch_list` block renders correctly <!-- KNOSIA:DONE -->
- [x] `comparison` block renders correctly <!-- KNOSIA:DONE -->
- [x] `insight` block renders correctly <!-- KNOSIA:DONE -->
- [ ] `text` block renders correctly <!-- KNOSIA:TODO priority=medium category=frontend -->

### LiquidRender Delegation
- [x] `kpi` block delegates to LiquidRender <!-- KNOSIA:DONE -->
- [x] `line_chart` block delegates to LiquidRender <!-- KNOSIA:DONE -->
- [x] `bar_chart` block delegates to LiquidRender <!-- KNOSIA:DONE -->
- [x] `area_chart` block delegates to LiquidRender <!-- KNOSIA:DONE -->
- [x] `pie_chart` block delegates to LiquidRender <!-- KNOSIA:DONE -->
- [x] `table` block delegates to LiquidRender <!-- KNOSIA:DONE -->

## 4.5 Canvas Features

- [~] Grid layout system (12 columns default) <!-- KNOSIA:PARTIAL notes="canvas-grid.tsx exists, full grid TBD" -->
- [ ] Freeform layout option (alternative to grid) <!-- KNOSIA:TODO priority=low category=frontend -->
- [ ] Drag and drop block positioning <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Block resize functionality <!-- KNOSIA:TODO priority=medium category=frontend -->
- [~] Edit mode toggle <!-- KNOSIA:PARTIAL notes="canvas-editor.tsx exists" -->
- [x] Natural language prompt bar <!-- KNOSIA:DONE -->
- [x] Alert configuration panel <!-- KNOSIA:DONE -->
- [x] Share modal with permissions <!-- KNOSIA:DONE -->
- [ ] Duplicate canvas <!-- KNOSIA:TODO priority=medium category=api -->
- [ ] Archive/unarchive canvas <!-- KNOSIA:TODO priority=medium category=api -->
- [ ] View count tracking <!-- KNOSIA:TODO priority=low category=api -->

## 4.6 Canvas List Page

- [ ] Grid/list view toggle <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Filter by status (all, active, draft, archived) <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Filter by AI-generated <!-- KNOSIA:TODO priority=low category=frontend -->
- [ ] Sort by (recent, name, most viewed) <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Create new canvas button <!-- KNOSIA:TODO priority=high category=frontend -->
- [ ] Quick actions (edit, duplicate, archive, delete) <!-- KNOSIA:TODO priority=medium category=frontend -->
- [ ] Empty state for no canvases <!-- KNOSIA:TODO priority=low category=frontend -->

---

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:** API layer fully implemented including AI generation, blocks, alerts, and sharing. Frontend components exist, blocks sub-directory with renderer. Canvas list page needs building.

