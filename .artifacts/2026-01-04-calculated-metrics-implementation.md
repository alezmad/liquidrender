# Calculated Metrics Implementation Documentation

**Date:** 2026-01-04
**Phases Completed:** Phase 2 (Backend API), Phase 3 (Frontend Components), TypeScript Error Fixes

---

## Overview

This document covers the implementation of the Calculated Metrics feature for Knosia, including the frontend components (Phase 3) and related TypeScript error fixes for the canvas module.

---

## Phase 3: Calculated Metrics Frontend Components

### Component 1: Onboarding Metrics Section

**File:** `apps/web/src/modules/onboarding/components/review/metrics-section.tsx`

Displays calculated metrics during onboarding review with selection capability.

**Features:**
- Fetches metrics from SSE analysis stream via `useAnalysisStream`
- Groups metrics by category (revenue, growth, engagement, operational)
- Toggle selection with visual feedback
- Shows metric details: name, description, formula, source tables
- Skeleton loading states

**Integration Points:**
- `apps/web/src/modules/onboarding/types.ts` - Added `selectedMetricIds: string[]`
- `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts` - Added `setSelectedMetricIds()`
- `apps/web/src/modules/onboarding/components/review/detection-review.tsx` - Integrated MetricsSection
- `apps/web/src/app/[locale]/onboarding/review/page.tsx` - Added metric selection handling

---

### Component 2: Vocabulary Metrics Tab

**Files Created:**
| File | Purpose |
|------|---------|
| `apps/web/src/modules/knosia/vocabulary/hooks/use-metrics.ts` | TanStack Query hook for fetching metrics |
| `apps/web/src/modules/knosia/vocabulary/components/metric-card.tsx` | Individual metric display card |
| `apps/web/src/modules/knosia/vocabulary/components/metrics-tab.tsx` | Tab container with filtering |
| `apps/web/src/modules/knosia/vocabulary/components/vocabulary-page-content.tsx` | Page layout with tabs |

**Hook: useMetrics**
```typescript
interface UseMetricsOptions {
  workspaceId: string;
  category?: MetricCategory;
  enabled?: boolean;
}

// Returns: { metrics, isLoading, isError, error, refetch }
```

**MetricCard Features:**
- Displays metric name, description, category badge
- Shows formula in code block
- Lists source tables with icons
- Expandable details section

**MetricsTab Features:**
- Category filter dropdown
- Search by name/description
- Empty states for no results
- Skeleton loading grid

---

### Component 3: Canvas Metric KPI Block

**Files Created:**
| File | Purpose |
|------|---------|
| `packages/liquid-render/src/renderer/components/metric-kpi.tsx` | LiquidRender component |
| `apps/web/src/modules/knosia/canvas/components/blocks/metric-kpi-block.tsx` | Canvas block wrapper |

**LiquidRender Component: MetricKPI**
```typescript
interface MetricKPIBlock {
  type: "metric_kpi";
  binding?: string;
  metricId?: string;
  title?: string;
  showFormula?: boolean;
  showTrend?: boolean;
  showSparkline?: boolean;
  comparisonPeriod?: "day" | "week" | "month" | "quarter" | "year";
}
```

**Features:**
- Dynamic value display with trend indicators
- Optional formula tooltip
- Sparkline visualization (placeholder)
- Comparison period badges
- Design token compliance

**Integration:**
- `apps/web/src/modules/knosia/canvas/types.ts` - Added `metric_kpi` to BlockType union
- `apps/web/src/modules/knosia/canvas/components/blocks/block-renderer.tsx` - Added case for metric_kpi
- `apps/web/src/modules/knosia/canvas/components/canvas-block.tsx` - Added icon mapping

---

## Canvas TypeScript Error Fixes

### Problem
Frontend hooks used incorrect API paths and referenced unimplemented V2 routes.

### Solution Pattern
1. **Path corrections** - Fixed mismatched API paths
2. **Type assertions** - Added `as unknown as Type` for schema mismatches
3. **@ts-expect-error** - Documented unimplemented V2 routes

---

### Files Fixed

#### use-canvas.ts
| Before | After |
|--------|-------|
| `api.knosia.canvas[":id"].$get` | `api.knosia.canvas.canvases[":id"].$get` |
| `api.knosia.canvas[":id"].$patch` | `api.knosia.canvas.canvases[":id"].$put` |

**Additional Changes:**
- Added `expectedVersion` for optimistic concurrency control
- Added type assertion for `CanvasWithDetails`
- Transformed frontend `name` → API `title`

#### use-canvases-list.ts
| Before | After |
|--------|-------|
| Generic canvas endpoint | `api.knosia.canvas.workspaces[":workspaceId"].canvases.$get` |

**Create Mutation Payload:**
```typescript
{
  workspaceId,
  title: input.name,        // Frontend uses 'name'
  scope: "private",
  schema: { version: "1.0", layers: [] }
}
```

#### canvas-view.tsx
Added `@ts-expect-error` for:
- `canvases[":id"].edit.$post` (V2)
- `canvases[":canvasId"].alerts.$post` (V2)

#### canvas-share-modal.tsx
Added `@ts-expect-error` for:
- `canvases[":canvasId"].collaborators.$get` (V2)
- `canvases[":canvasId"].share.$post` (V2)

Fixed implicit any type in collaborators map callback.

#### use-canvas-blocks.ts
Added `@ts-expect-error` for all block operations:
- `blocks.$post` (create)
- `blocks[":blockId"].$patch` (update)
- `blocks[":blockId"].$delete` (delete)
- `blocks.reorder.$post` (reorder)

#### use-share.ts
Added `@ts-expect-error` for:
- `canvases[":canvasId"].share.$post` (canvas sharing)

#### canvas-block.tsx
Added icon mapping:
```typescript
metric_kpi: "BarChart3"
```

---

### V2 Feature Hooks (Commented Routes)

These hooks reference backend routes that are planned but not yet implemented:

| File | Route | Feature |
|------|-------|---------|
| `use-activity.ts` | `api.knosia.activity.$get` | Activity feed |
| `use-comments.ts` | `api.knosia.comment.*` | Comments (4 operations) |
| `use-search.ts` | `api.knosia.search.$get` | Global search |

All use the pattern:
```typescript
// @ts-expect-error - Route not yet implemented in backend (V2 feature)
const res = await api.knosia.route.$method({...});
```

---

## Icon Fixes

Changed deprecated/incorrect icon names:
| Before | After |
|--------|-------|
| `Icons.BarChart` | `Icons.BarChart3` |
| `Icons.Clock` | `Icons.ClockFading` |
| `Icons.Pencil` | `Icons.Edit` |
| `Icons.MoreVertical` | `Icons.EllipsisVertical` |

---

## API Routes Reference

### Implemented Canvas Routes
```
GET    /knosia/canvas                              # List all canvases
GET    /knosia/canvas/workspaces/:workspaceId/canvases  # List workspace canvases
POST   /knosia/canvas/canvases                     # Create canvas
GET    /knosia/canvas/canvases/:id                 # Get canvas
PUT    /knosia/canvas/canvases/:id                 # Update canvas
DELETE /knosia/canvas/canvases/:id                 # Delete canvas
```

### V2 Routes (Not Yet Implemented)
```
POST   /knosia/canvas/canvases/:id/edit            # Real-time editing
POST   /knosia/canvas/canvases/:canvasId/alerts    # Canvas alerts
GET    /knosia/canvas/canvases/:canvasId/collaborators  # Get collaborators
POST   /knosia/canvas/canvases/:canvasId/share     # Share canvas
POST   /knosia/canvas/canvases/:canvasId/blocks    # Create block
PATCH  /knosia/canvas/canvases/:canvasId/blocks/:blockId  # Update block
DELETE /knosia/canvas/canvases/:canvasId/blocks/:blockId  # Delete block
POST   /knosia/canvas/canvases/:canvasId/blocks/reorder   # Reorder blocks
GET    /knosia/activity                            # Activity feed
*      /knosia/comment                             # Comments CRUD
GET    /knosia/search                              # Global search
```

---

## Verification

Typecheck passed with no errors:
```bash
pnpm --filter web typecheck
# > tsc --noEmit (success)
```

---

## Next Steps

1. **Implement V2 Backend Routes** - Activity, Comments, Search, Canvas blocks
2. **Remove @ts-expect-error** - As routes become available
3. **Add Tests** - Unit tests for new components
4. **Sparkline Implementation** - Complete MetricKPI sparkline chart
5. **Real-time Canvas Editing** - WebSocket/SSE integration
