# Phase 4: Canvases

**Section:** 05 of 32
**Items:** ~75
**Status:** [ ] Not verified

---

## 4.1 Canvas API Module

- [ ] `packages/api/src/modules/knosia/canvas/` structure:
  - [ ] `router.ts`
  - [ ] `schemas.ts`
  - [ ] `queries.ts`
  - [ ] `mutations.ts`
  - [ ] `blocks/router.ts`
  - [ ] `blocks/mutations.ts`
  - [ ] `alerts/router.ts`
  - [ ] `alerts/mutations.ts`
  - [ ] `index.ts`

## 4.2 Canvas Router Endpoints

### Core CRUD
- [ ] `GET /knosia/canvases` - List canvases
- [ ] `GET /knosia/canvases/:id` - Get canvas with blocks
- [ ] `POST /knosia/canvases` - Create canvas
- [ ] `PATCH /knosia/canvases/:id` - Update canvas
- [ ] `DELETE /knosia/canvases/:id` - Delete canvas

### AI Features
- [ ] `POST /knosia/canvases/generate` - Generate canvas from prompt
  - [ ] Accepts `prompt`, `roleId`
  - [ ] Returns AI-generated canvas structure
- [ ] `POST /knosia/canvases/:id/edit` - Natural language edit
  - [ ] Accepts `instruction`
  - [ ] Modifies canvas based on instruction

### Block Management
- [ ] `POST /knosia/canvases/:id/blocks` - Add block
- [ ] `PATCH /knosia/canvases/:id/blocks/:blockId` - Update block
- [ ] `DELETE /knosia/canvases/:id/blocks/:blockId` - Remove block
- [ ] `POST /knosia/canvases/:id/blocks/reorder` - Reorder blocks

### Alert Management
- [ ] `GET /knosia/canvases/:id/alerts` - List alerts
- [ ] `POST /knosia/canvases/:id/alerts` - Create alert
- [ ] `PATCH /knosia/canvases/:id/alerts/:alertId` - Update alert
- [ ] `DELETE /knosia/canvases/:id/alerts/:alertId` - Delete alert

## 4.3 Canvas Frontend Module

- [ ] `apps/web/src/modules/knosia/canvas/` structure:
  - [ ] `components/canvas-view.tsx`
  - [ ] `components/canvas-grid.tsx`
  - [ ] `components/canvas-block.tsx`
  - [ ] `components/blocks/hero-metric.tsx`
  - [ ] `components/blocks/watch-list.tsx`
  - [ ] `components/blocks/comparison-card.tsx`
  - [ ] `components/blocks/insight-card.tsx`
  - [ ] `components/blocks/liquid-render-block.tsx`
  - [ ] `components/canvas-editor.tsx`
  - [ ] `components/canvas-prompt-bar.tsx`
  - [ ] `components/canvas-alerts-panel.tsx`
  - [ ] `components/canvas-share-modal.tsx`
  - [ ] `hooks/use-canvas.ts`
  - [ ] `hooks/use-canvas-blocks.ts`
  - [ ] `hooks/use-canvas-mutations.ts`
  - [ ] `types.ts`
  - [ ] `index.ts`

## 4.4 Block Type Rendering

### Canvas-Native Blocks
- [ ] `hero_metric` block renders correctly
- [ ] `watch_list` block renders correctly
- [ ] `comparison` block renders correctly
- [ ] `insight` block renders correctly
- [ ] `text` block renders correctly

### LiquidRender Delegation
- [ ] `kpi` block delegates to LiquidRender
- [ ] `line_chart` block delegates to LiquidRender
- [ ] `bar_chart` block delegates to LiquidRender
- [ ] `area_chart` block delegates to LiquidRender
- [ ] `pie_chart` block delegates to LiquidRender
- [ ] `table` block delegates to LiquidRender

## 4.5 Canvas Features

- [ ] Grid layout system (12 columns default)
- [ ] Freeform layout option (alternative to grid)
- [ ] Drag and drop block positioning
- [ ] Block resize functionality
- [ ] Edit mode toggle
- [ ] Natural language prompt bar
- [ ] Alert configuration panel
- [ ] Share modal with permissions
- [ ] Duplicate canvas
- [ ] Archive/unarchive canvas
- [ ] View count tracking

## 4.6 Canvas List Page

- [ ] Grid/list view toggle
- [ ] Filter by status (all, active, draft, archived)
- [ ] Filter by AI-generated
- [ ] Sort by (recent, name, most viewed)
- [ ] Create new canvas button
- [ ] Quick actions (edit, duplicate, archive, delete)
- [ ] Empty state for no canvases

---

**Verified by:** _______________
**Date:** _______________
**Notes:**

