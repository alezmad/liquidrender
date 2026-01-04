# Phase 3: Calculated Metrics Frontend Components - Implementation Prompt

**Date:** 2026-01-04
**Status:** Ready for Implementation
**Prerequisites:** Phase 1 (Database + SSE) + Phase 2 (API Module) Complete
**Duration:** 4-6 hours
**Developer:** Frontend (React/Next.js experience required)

---

## Executive Summary

Build the frontend components that display and interact with calculated metrics generated during onboarding or created by users. This includes three main UI surfaces: onboarding review, vocabulary metrics tab, and canvas KPI cards.

**What You're Building:**
1. **Onboarding Metrics Section** - Display AI-generated metrics during onboarding review
2. **Vocabulary Metrics Tab** - Browse, edit, and manage metrics for a connection
3. **Canvas Metric KPI Card** - Render executable metrics on canvases

**Tech Stack:** Next.js 15, React 19, TanStack Query, Zod, TurboStarter UI components

---

## Table of Contents

1. [Phase 1 + 2 Recap](#phase-1-2-recap)
2. [Key Files to Read](#key-files-to-read)
3. [Architecture Context](#architecture-context)
4. [Component 1: Onboarding Metrics Section](#component-1-onboarding-metrics-section)
5. [Component 2: Vocabulary Metrics Tab](#component-2-vocabulary-metrics-tab)
6. [Component 3: Canvas Metric KPI Card](#component-3-canvas-metric-kpi-card)
7. [API Integration Patterns](#api-integration-patterns)
8. [Testing Strategy](#testing-strategy)
9. [Success Criteria](#success-criteria)

---

## Phase 1 + 2 Recap {#phase-1-2-recap}

### What Was Built (Phase 1: Database + SSE)

**Database Schema** (`packages/db/src/schema/knosia.ts:455-513`):
- Table: `knosia_calculated_metric` (17 columns)
- Fields: id, workspaceId, connectionId, name, category, description, semanticDefinition (JSONB)
- Metadata: confidence, feasible, source, vocabularyItemIds
- Usage tracking: canvasCount, executionCount, lastExecutedAt, lastExecutionResult
- Status: active, draft, deprecated

**SSE Integration** (`packages/api/src/modules/knosia/analysis/queries.ts`):
- Step 4.5: Generate calculated metrics during onboarding
- Generates 5-10 KPI recipes using LLM (Haiku model)
- Uses profiling data to inform generation (20% accuracy boost)
- Stores metrics in database automatically

### What Was Built (Phase 2: API Module)

**REST API** (`packages/api/src/modules/knosia/metrics/`):
- 8 endpoints at `/api/knosia/metrics/*`
- CRUD operations (create, read, update, delete)
- Execute endpoint (mock data for now)
- Type-safe Zod validation
- Cache-aware execution

**Key API Endpoints:**
```typescript
GET    /api/knosia/metrics                     // List with filters
GET    /api/knosia/metrics/:id                 // Get single metric
POST   /api/knosia/metrics/:id/execute         // Execute metric
POST   /api/knosia/metrics                     // Create metric
PATCH  /api/knosia/metrics/:id                 // Update metric
DELETE /api/knosia/metrics/:id                 // Delete metric
GET    /api/knosia/metrics/connection/:id      // Get by connection
```

**Semantic Definition Structure:**
```typescript
{
  type: "simple" | "derived" | "cumulative";
  expression: string;                   // e.g., "amount"
  aggregation?: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";
  entity?: string;                      // e.g., "subscriptions"
  timeField?: string;                   // e.g., "created_at"
  timeGranularity?: "hour" | "day" | "week" | "month" | "quarter" | "year";
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  format?: {
    type: "number" | "currency" | "percent" | "duration";
    decimals?: number;
    currency?: string;
    prefix?: string;
    suffix?: string;
  };
}
```

---

## Key Files to Read {#key-files-to-read}

### Read These Files IN ORDER (Critical Path)

#### 1. Architecture & Design Documents

**File:** `.artifacts/2026-01-04-METRICS-IMPLEMENTATION-V2-ALIGNED.md`
- **Read:** Section "Frontend Components" (lines 920-940)
- **Why:** Complete UX design and component specifications

**File:** `.docs/knosia-architecture.md`
- **Read:** Sections on "Onboarding Flow" and "Vocabulary Page"
- **Why:** Understand where metrics fit in the user journey

#### 2. Database Schema & Types

**File:** `packages/db/src/schema/knosia.ts`
- **Read:** Lines 455-513 (knosiaCalculatedMetric table)
- **Read:** Lines 1303-1318 (Zod schemas)
- **Why:** Understanding the data model you'll be displaying

#### 3. API Module (Your Backend Interface)

**File:** `packages/api/src/modules/knosia/metrics/schemas.ts`
- **Read:** Entire file (~80 lines)
- **Why:** Request/response types for API calls

**File:** `packages/api/src/modules/knosia/metrics/execution.ts`
- **Read:** Lines 7-13 (ExecutionResult interface)
- **Why:** Understanding metric execution response format

#### 4. Existing Frontend Patterns (Reference Implementations)

**File:** `apps/web/src/modules/onboarding/components/review/briefing-section.tsx`
- **Read:** Entire file (~150 lines)
- **Why:** Pattern for onboarding review sections

**File:** `apps/web/src/modules/vocabulary/components/vocabulary-overview.tsx`
- **Read:** Entire file (~200 lines)
- **Why:** Pattern for vocabulary tabs and data display

**File:** `apps/web/src/modules/canvas/components/canvas-editor.tsx`
- **Read:** Lines 1-100 (component structure)
- **Why:** How canvas components are rendered

#### 5. TurboStarter UI Components

**File:** `packages/ui-web/src/components/ui/`
- **Scan:** Available components (Button, Card, Badge, Tabs, etc.)
- **Why:** You'll use these for UI building blocks

**File:** `CLAUDE.md`
- **Read:** Section "Form Patterns" (lines 235-250)
- **Read:** Section "Available Packages" (lines 295-310)
- **Why:** UI component usage patterns

#### 6. API Client Patterns

**File:** `apps/web/src/lib/api/client.ts`
- **Read:** Entire file (~50 lines)
- **Why:** How to make API calls with proper types

**File:** `apps/web/src/modules/vocabulary/hooks/use-vocabulary.ts`
- **Read:** Entire file (~80 lines)
- **Why:** Pattern for data fetching hooks using TanStack Query

#### 7. LiquidRender Integration (For Canvas KPI Card)

**File:** `packages/liquid-render/src/renderer/components/kpi-card.tsx`
- **Read:** Entire file (~150 lines)
- **Why:** Existing KPI card component to extend

**File:** `packages/liquid-render/src/renderer/components/utils.ts`
- **Read:** Lines 1-100 (design tokens, formatting utilities)
- **Why:** Never hardcode colors/spacing - use design tokens

#### 8. Onboarding State Management

**File:** `apps/web/src/modules/onboarding/store/onboarding-store.ts`
- **Read:** Entire file (~200 lines)
- **Why:** Understanding onboarding state flow

---

## Architecture Context {#architecture-context}

### Where Metrics Appear in User Journey

```
1. Onboarding (Step 5: Review)
   └─ MetricsSection shows AI-generated metrics
   └─ User can select metrics to add to canvas

2. Vocabulary Page
   └─ New "Metrics" tab (alongside Overview, Semantic, Lineage)
   └─ Browse, edit, create metrics

3. Canvas
   └─ Metric KPI cards render live values
   └─ Execute on load, cache results
```

### Component Hierarchy

```
apps/web/src/modules/
├── onboarding/
│   └── components/review/
│       └── metrics-section.tsx         # NEW (Component 1)
│
├── vocabulary/
│   └── components/
│       ├── metrics-tab.tsx             # NEW (Component 2)
│       └── metric-card.tsx             # NEW (supporting component)
│
└── canvas/
    └── components/
        └── metric-kpi-renderer.tsx     # NEW (Component 3)

packages/liquid-render/src/renderer/components/
└── metric-kpi.tsx                      # NEW (LiquidRender component)
```

---

## Component 1: Onboarding Metrics Section {#component-1-onboarding-metrics-section}

### Location & Purpose

**File to Create:** `apps/web/src/modules/onboarding/components/review/metrics-section.tsx`

**Purpose:** Display AI-generated metrics during onboarding Step 5 (Review), allowing users to preview and select metrics to add to their initial canvas.

### Design Specification

**Visual Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Calculated Business Metrics                        │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ We identified 6 key metrics based on your data:    │
│                                                     │
│ ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│ │ 💰 MRR       │  │ 📈 Growth    │  │ 👥 Users  │ │
│ │ $45,231      │  │ 12.3%        │  │ 1,234     │ │
│ │ ☑ Add to...  │  │ ☐ Add to...  │  │ ☑ Add... │ │
│ └──────────────┘  └──────────────┘  └───────────┘ │
│                                                     │
│ ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│ │ ...          │  │ ...          │  │ ...       │ │
│ └──────────────┘  └──────────────┘  └───────────┘ │
│                                                     │
│ [Create Custom Metric]                             │
└─────────────────────────────────────────────────────┘
```

### Implementation Requirements

**Inputs:**
```typescript
interface MetricsSectionProps {
  connectionId: string;
  workspaceId: string;
  onMetricsSelected: (metricIds: string[]) => void;
}
```

**Data Fetching:**
```typescript
// Hook to fetch metrics
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { handle } from "hono/client";

const { data: metrics, isLoading } = useQuery({
  queryKey: ["metrics", connectionId],
  queryFn: handle(api.knosia.metrics.connection[":connectionId"].$get),
  // Pass connectionId as path param
});
```

**State Management:**
```typescript
const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());

// Auto-select top 3 metrics by confidence
useEffect(() => {
  if (metrics && metrics.length > 0) {
    const top3 = metrics
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 3)
      .map(m => m.id);
    setSelectedMetrics(new Set(top3));
  }
}, [metrics]);
```

**Metric Card Component:**
```typescript
interface MetricCardProps {
  metric: CalculatedMetric;
  isSelected: boolean;
  onToggle: () => void;
  executionResult?: ExecutionResult;
}

// Each card shows:
// - Category icon (💰 revenue, 📈 growth, 👥 engagement, ⚙️ operational)
// - Metric name
// - Mock value from execution result
// - Checkbox "Add to canvas"
// - Confidence badge if < 0.8
```

**Category Icons:**
```typescript
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "revenue": return "💰";
    case "growth": return "📈";
    case "engagement": return "👥";
    case "operational": return "⚙️";
    default: return "📊";
  }
};
```

**UI Components to Use:**
- `Card` from `@turbostarter/ui-web` for metric cards
- `Checkbox` for selection
- `Badge` for confidence display
- `Button` for "Create Custom Metric"
- `Skeleton` for loading states

### Integration with Onboarding Flow

**Where to Add:**
```typescript
// File: apps/web/src/modules/onboarding/components/review/index.tsx

import { MetricsSection } from "./metrics-section";

// Add after BriefingSection, before action buttons
<MetricsSection
  connectionId={progress.connectionId!}
  workspaceId={progress.workspaceId!}
  onMetricsSelected={(ids) => {
    // Store selected metric IDs in onboarding state
    updateProgress({ selectedMetricIds: ids });
  }}
/>
```

**Onboarding State Update:**
```typescript
// File: apps/web/src/modules/onboarding/store/onboarding-store.ts

// Add to OnboardingProgress interface
interface OnboardingProgress {
  // ... existing fields
  selectedMetricIds?: string[];
}
```

### Error Handling

```typescript
if (error) {
  return (
    <Card className="p-6">
      <p className="text-destructive">
        Failed to load metrics. Please refresh or continue without metrics.
      </p>
    </Card>
  );
}

if (!metrics || metrics.length === 0) {
  return (
    <Card className="p-6">
      <p className="text-muted-foreground">
        No metrics were generated for this connection. You can create custom metrics later.
      </p>
    </Card>
  );
}
```

---

## Component 2: Vocabulary Metrics Tab {#component-2-vocabulary-metrics-tab}

### Location & Purpose

**File to Create:** `apps/web/src/modules/vocabulary/components/metrics-tab.tsx`

**Purpose:** Browse, search, edit, and manage all calculated metrics for a connection. Primary interface for metric management after onboarding.

### Design Specification

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Metrics (18)                                    [+ Create]  │
│ ───────────────────────────────────────────────────────────│
│                                                             │
│ [Search...] [Category: All ▼] [Status: Active ▼]          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 💰 Monthly Recurring Revenue                           ││
│ │ SUM(amount) from subscriptions where status='active'   ││
│ │ Confidence: 95% • Last run: 2 min ago • Used in 3 ...  ││
│ │ [Execute] [Edit] [•••]                                 ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📈 Month-over-Month Growth                             ││
│ │ ...                                                     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Requirements

**Hook for Data Fetching:**
```typescript
// File: apps/web/src/modules/vocabulary/hooks/use-metrics.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { handle } from "hono/client";

export function useMetrics(connectionId: string, filters?: {
  category?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["metrics", connectionId, filters],
    queryFn: () => handle(api.knosia.metrics.$get)({
      query: {
        connectionId,
        ...filters,
      },
    }),
  });
}

export function useExecuteMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ metricId, useCache }: { metricId: string; useCache: boolean }) => {
      return handle(api.knosia.metrics[":id"].execute.$post)({
        param: { id: metricId },
        json: { useCache },
      });
    },
    onSuccess: () => {
      // Invalidate metrics cache
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      metricId,
      data
    }: {
      metricId: string;
      data: UpdateMetricInput
    }) => {
      return handle(api.knosia.metrics[":id"].$patch)({
        param: { id: metricId },
        json: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
  });
}

export function useDeleteMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metricId: string) => {
      return handle(api.knosia.metrics[":id"].$delete)({
        param: { id: metricId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
  });
}
```

**Main Component Structure:**
```typescript
// File: apps/web/src/modules/vocabulary/components/metrics-tab.tsx

export function MetricsTab({ connectionId }: { connectionId: string }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>("active");

  const { data: metrics, isLoading } = useMetrics(connectionId, {
    category: categoryFilter,
    status: statusFilter,
  });

  const executeMetric = useExecuteMetric();

  // Filter by search locally (client-side)
  const filteredMetrics = useMemo(() => {
    if (!metrics) return [];
    return metrics.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [metrics, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Input
            placeholder="Search metrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
          />

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined}>All</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => {/* Open create dialog */}}>
          <Plus className="mr-2 h-4 w-4" />
          Create Metric
        </Button>
      </div>

      {/* Metric List */}
      <div className="space-y-3">
        {filteredMetrics.map(metric => (
          <MetricCard
            key={metric.id}
            metric={metric}
            onExecute={() => executeMetric.mutate({
              metricId: metric.id,
              useCache: true
            })}
          />
        ))}
      </div>
    </div>
  );
}
```

**Metric Card Component:**
```typescript
// File: apps/web/src/modules/vocabulary/components/metric-card.tsx

interface MetricCardProps {
  metric: CalculatedMetric;
  onExecute: () => void;
}

export function MetricCard({ metric, onExecute }: MetricCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {getCategoryIcon(metric.category)}
            </span>
            <h3 className="font-semibold text-lg">{metric.name}</h3>
            {metric.confidence && metric.confidence < 0.8 && (
              <Badge variant="warning">
                {Math.round(metric.confidence * 100)}% confidence
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {formatSemanticDefinition(metric.semanticDefinition)}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {metric.lastExecutedAt && (
              <span>Last run: {formatRelativeTime(metric.lastExecutedAt)}</span>
            )}
            {metric.canvasCount > 0 && (
              <span>Used in {metric.canvasCount} canvases</span>
            )}
            <span>Source: {metric.source === "ai_generated" ? "AI" : "User"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExecute}
          >
            Execute
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* Open edit dialog */}}
          >
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDetails(!showDetails)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Add to Canvas</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 p-3 bg-muted rounded-md">
          <pre className="text-xs">
            {JSON.stringify(metric.semanticDefinition, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

// Helper: Format semantic definition into human-readable text
function formatSemanticDefinition(def: any): string {
  const parts = [];

  if (def.aggregation && def.expression) {
    parts.push(`${def.aggregation}(${def.expression})`);
  }

  if (def.entity) {
    parts.push(`from ${def.entity}`);
  }

  if (def.filters && def.filters.length > 0) {
    const filterStr = def.filters
      .map((f: any) => `${f.field} ${f.operator} ${f.value}`)
      .join(", ");
    parts.push(`where ${filterStr}`);
  }

  if (def.timeGranularity) {
    parts.push(`by ${def.timeGranularity}`);
  }

  return parts.join(" ");
}
```

### Integration with Vocabulary Page

**File to Modify:** `apps/web/src/modules/vocabulary/components/vocabulary-layout.tsx`

```typescript
import { MetricsTab } from "./metrics-tab";

// Add new tab to tabs array
const tabs = [
  { id: "overview", label: "Overview", icon: <LayoutGrid /> },
  { id: "semantic", label: "Semantic", icon: <BookOpen /> },
  { id: "metrics", label: "Metrics", icon: <BarChart /> },  // NEW
  { id: "lineage", label: "Lineage", icon: <GitBranch /> },
];

// Add tab panel
{activeTab === "metrics" && (
  <MetricsTab connectionId={connectionId} />
)}
```

---

## Component 3: Canvas Metric KPI Card {#component-3-canvas-metric-kpi-card}

### Location & Purpose

**Files to Create:**
1. `apps/web/src/modules/canvas/components/metric-kpi-renderer.tsx` (React wrapper)
2. `packages/liquid-render/src/renderer/components/metric-kpi.tsx` (LiquidRender component)

**Purpose:** Render calculated metrics as executable KPI cards on canvases. Fetch and display live metric values.

### Design Specification

**Visual Layout:**
```
┌────────────────────────┐
│ Monthly Recurring R... │  ← Metric name (truncated)
│                        │
│      $45,231          │  ← Formatted value (large)
│                        │
│ ↑ 12.3% vs last month │  ← Trend (if available)
│                        │
│ Updated 2 min ago     │  ← Last execution time
└────────────────────────┘
```

### LiquidRender Component

**File:** `packages/liquid-render/src/renderer/components/metric-kpi.tsx`

```typescript
import React, { useEffect, useState } from "react";
import type { LiquidComponentProps } from "./utils";
import { tokens, cardStyles, mergeStyles } from "./utils";
import { resolveBinding } from "../data-context";

interface MetricKPIBlock {
  type: "metricKPI";
  metricId: string;          // ID of calculated metric
  showTrend?: boolean;       // Show trend indicator
  refreshInterval?: number;  // Auto-refresh in seconds (0 = manual only)
}

export function MetricKPI({ block, data }: LiquidComponentProps<MetricKPIBlock>) {
  const [value, setValue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch metric execution result
    // In real implementation, this would call the API
    // For now, use mock data from context
    const mockResult = data?.metrics?.[block.metricId];

    if (mockResult) {
      setValue(mockResult);
      setIsLoading(false);
    } else {
      setError("Metric not found");
      setIsLoading(false);
    }
  }, [block.metricId, data]);

  const styles = {
    container: mergeStyles(cardStyles.base, {
      padding: tokens.spacing.lg,
      display: "flex",
      flexDirection: "column" as const,
      gap: tokens.spacing.md,
      minHeight: "160px",
    }),
    title: {
      fontSize: tokens.fontSize.sm,
      fontWeight: tokens.fontWeight.medium,
      color: tokens.colors.foreground,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    value: {
      fontSize: tokens.fontSize["4xl"],
      fontWeight: tokens.fontWeight.bold,
      color: tokens.colors.foreground,
      lineHeight: 1,
    },
    trend: {
      fontSize: tokens.fontSize.sm,
      color: tokens.colors.muted,
    },
    timestamp: {
      fontSize: tokens.fontSize.xs,
      color: tokens.colors.muted,
      marginTop: "auto",
    },
  };

  if (isLoading) {
    return (
      <div data-liquid-type="metricKPI" style={styles.container}>
        <div style={{ ...styles.title, opacity: 0.5 }}>Loading...</div>
        <div style={{ ...styles.value, opacity: 0.5 }}>—</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-liquid-type="metricKPI" style={styles.container}>
        <div style={{ ...styles.title, color: tokens.colors.destructive }}>
          Error
        </div>
        <div style={{ ...styles.value, fontSize: tokens.fontSize.sm }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div data-liquid-type="metricKPI" style={styles.container}>
      <div style={styles.title}>{value.name}</div>

      <div style={styles.value}>{value.formattedValue}</div>

      {block.showTrend && value.trend && (
        <div style={styles.trend}>
          {value.trend > 0 ? "↑" : "↓"} {Math.abs(value.trend)}% vs last period
        </div>
      )}

      <div style={styles.timestamp}>
        Updated {formatRelativeTime(value.executedAt)}
      </div>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}
```

**Register Component:**
```typescript
// File: packages/liquid-render/src/renderer/components/index.ts

export { MetricKPI } from "./metric-kpi";

// Add to component registry
export const componentRegistry = {
  // ... existing components
  metricKPI: MetricKPI,
};
```

### React Wrapper (Canvas Integration)

**File:** `apps/web/src/modules/canvas/components/metric-kpi-renderer.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { handle } from "hono/client";

interface MetricKPIRendererProps {
  metricId: string;
  showTrend?: boolean;
  refreshInterval?: number;
}

export function MetricKPIRenderer({
  metricId,
  showTrend = true,
  refreshInterval = 0,
}: MetricKPIRendererProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["metric-execution", metricId],
    queryFn: () => handle(api.knosia.metrics[":id"].execute.$post)({
      param: { id: metricId },
      json: { useCache: true },
    }),
    refetchInterval: refreshInterval > 0 ? refreshInterval * 1000 : false,
  });

  if (isLoading) {
    return <div className="animate-pulse bg-muted h-40 rounded-lg" />;
  }

  // Render using LiquidRender MetricKPI component
  // This will be integrated into the canvas rendering system
  return (
    <div className="metric-kpi-wrapper">
      {/* LiquidRender will handle this */}
      {result && <div>{result.formattedValue}</div>}
    </div>
  );
}
```

---

## API Integration Patterns {#api-integration-patterns}

### Setting Up API Client

**File:** `apps/web/src/lib/api/client.ts` (should already exist)

```typescript
import { hc } from "hono/client";
import type { AppType } from "@turbostarter/api";

export const api = hc<AppType>("/api");

// Helper for handling API responses
export async function handle<T>(promise: Promise<Response>): Promise<T> {
  const res = await promise;
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "API request failed");
  }
  return res.json();
}
```

### TanStack Query Setup

**File:** `apps/web/src/app/[locale]/providers.tsx` (should already exist)

Ensure QueryClientProvider is set up:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.Node }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Common Query Patterns

**Fetch Metrics:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["metrics", connectionId],
  queryFn: () => handle(api.knosia.metrics.$get({
    query: { connectionId },
  })),
});
```

**Execute Metric:**
```typescript
const executeMutation = useMutation({
  mutationFn: (metricId: string) =>
    handle(api.knosia.metrics[":id"].execute.$post({
      param: { id: metricId },
      json: { useCache: true },
    })),
  onSuccess: (data) => {
    console.log("Execution result:", data);
  },
});

executeMutation.mutate(metricId);
```

**Update Metric:**
```typescript
const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: UpdateMetricInput }) =>
    handle(api.knosia.metrics[":id"].$patch({
      param: { id },
      json: data,
    })),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["metrics"] });
  },
});
```

---

## Testing Strategy {#testing-strategy}

### Manual Testing Checklist

**Onboarding Metrics Section:**
- [ ] Metrics load during onboarding Step 5
- [ ] Top 3 metrics auto-selected by confidence
- [ ] Selection toggles work correctly
- [ ] Selected metrics stored in onboarding state
- [ ] "Create Custom Metric" button appears
- [ ] Loading states display correctly
- [ ] Error states handle gracefully

**Vocabulary Metrics Tab:**
- [ ] Metrics list loads for connection
- [ ] Search filters metrics by name
- [ ] Category filter works
- [ ] Status filter works (active/draft/deprecated)
- [ ] Execute button triggers metric execution
- [ ] Edit button opens edit dialog (stub OK for now)
- [ ] Delete menu item appears
- [ ] Confidence badges show for low-confidence metrics
- [ ] Last execution time displays correctly

**Canvas Metric KPI Card:**
- [ ] Metric KPI renders on canvas
- [ ] Value fetches and displays
- [ ] Formatted value matches category (currency, percent, etc.)
- [ ] Trend indicator shows if enabled
- [ ] Last updated time displays
- [ ] Loading state shows while fetching
- [ ] Error state shows if metric not found

### TypeScript Validation

```bash
# Run from project root
pnpm typecheck

# Should show zero errors in:
# - apps/web/src/modules/onboarding/components/review/metrics-section.tsx
# - apps/web/src/modules/vocabulary/components/metrics-tab.tsx
# - packages/liquid-render/src/renderer/components/metric-kpi.tsx
```

### Browser Testing

**Test in:**
- Chrome (latest)
- Safari (latest)
- Firefox (latest)

**Responsive:**
- Desktop (1920x1080)
- Tablet (768px width)
- Mobile (375px width)

---

## Success Criteria {#success-criteria}

### Functional Requirements

- ✅ Onboarding shows metrics generated during analysis
- ✅ Users can select metrics to add to canvas
- ✅ Vocabulary tab displays all metrics for connection
- ✅ Search, filter, and sort work correctly
- ✅ Execute button fetches live metric values
- ✅ Canvas renders metric KPI cards
- ✅ All three components integrate with API

### UX Requirements

- ✅ Loading states prevent layout shift
- ✅ Error states provide clear messaging
- ✅ Confidence badges warn about low-confidence metrics
- ✅ Icons match category semantics
- ✅ Responsive design works on mobile
- ✅ Accessibility: keyboard navigation works

### Code Quality Requirements

- ✅ Zero TypeScript errors
- ✅ Follows TurboStarter patterns
- ✅ Uses design tokens (no hardcoded colors)
- ✅ TanStack Query for data fetching
- ✅ Proper error boundaries
- ✅ Loading states with Skeleton components

---

## Common Pitfalls to Avoid

### 1. Hardcoding Styles
❌ **WRONG:**
```typescript
<div style={{ color: "#0a0a0a", padding: "16px" }}>
```

✅ **CORRECT:**
```typescript
<div style={{ color: tokens.colors.foreground, padding: tokens.spacing.md }}>
```

### 2. Not Using TanStack Query
❌ **WRONG:**
```typescript
useEffect(() => {
  fetch("/api/knosia/metrics")
    .then(res => res.json())
    .then(setMetrics);
}, []);
```

✅ **CORRECT:**
```typescript
const { data: metrics } = useQuery({
  queryKey: ["metrics", connectionId],
  queryFn: () => handle(api.knosia.metrics.$get({ query: { connectionId } })),
});
```

### 3. Missing Error States
❌ **WRONG:**
```typescript
if (isLoading) return <Skeleton />;
return <MetricsList metrics={data} />;
```

✅ **CORRECT:**
```typescript
if (isLoading) return <Skeleton />;
if (error) return <ErrorState message={error.message} />;
if (!data || data.length === 0) return <EmptyState />;
return <MetricsList metrics={data} />;
```

### 4. Not Invalidating Cache
❌ **WRONG:**
```typescript
const deleteMutation = useMutation({
  mutationFn: deleteMetric,
  // No onSuccess - stale data remains
});
```

✅ **CORRECT:**
```typescript
const deleteMutation = useMutation({
  mutationFn: deleteMetric,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["metrics"] });
  },
});
```

---

## Implementation Checklist

### Preparation
- [ ] Read all key files listed in "Key Files to Read"
- [ ] Understand Phase 1 + 2 implementation
- [ ] Review TurboStarter UI components available
- [ ] Set up dev environment with hot reload

### Component 1: Onboarding Metrics Section
- [ ] Create `metrics-section.tsx`
- [ ] Implement data fetching with useQuery
- [ ] Create metric card component
- [ ] Add category icons
- [ ] Implement selection state
- [ ] Integrate with onboarding flow
- [ ] Add loading/error states
- [ ] Test in browser

### Component 2: Vocabulary Metrics Tab
- [ ] Create `use-metrics.ts` hook
- [ ] Create `metrics-tab.tsx`
- [ ] Create `metric-card.tsx`
- [ ] Implement search filter
- [ ] Implement category/status filters
- [ ] Add execute button handler
- [ ] Add edit/delete actions (stubs OK)
- [ ] Integrate with vocabulary layout
- [ ] Test all filters work

### Component 3: Canvas Metric KPI Card
- [ ] Create LiquidRender `metric-kpi.tsx`
- [ ] Add to component registry
- [ ] Create React wrapper component
- [ ] Implement value formatting
- [ ] Add trend indicator (optional)
- [ ] Test on canvas
- [ ] Verify auto-refresh works

### Testing & Polish
- [ ] Run TypeScript checks
- [ ] Test all components in browser
- [ ] Check responsive design
- [ ] Verify accessibility (keyboard nav)
- [ ] Test error states
- [ ] Test loading states
- [ ] Test with mock data

### Commit
- [ ] Review all changes
- [ ] Create atomic commits
- [ ] Write descriptive commit messages
- [ ] Push to remote

---

## Commit Message Template

```
feat(knosia): implement calculated metrics frontend components (Phase 3)

Complete UI for displaying and managing calculated metrics across onboarding,
vocabulary, and canvas.

Components Created:
- onboarding/components/review/metrics-section.tsx
  - Display AI-generated metrics during onboarding
  - Auto-select top 3 by confidence
  - Selection state for canvas addition

- vocabulary/components/metrics-tab.tsx
  - Browse and manage all metrics
  - Search, filter (category, status)
  - Execute, edit, delete actions

- vocabulary/components/metric-card.tsx
  - Metric display with semantic definition
  - Confidence badges, usage stats
  - Action buttons (execute, edit, delete)

- vocabulary/hooks/use-metrics.ts
  - TanStack Query hooks for CRUD
  - useMetrics, useExecuteMetric, useUpdateMetric, useDeleteMetric

- liquid-render/components/metric-kpi.tsx
  - LiquidRender component for canvas KPIs
  - Live value display with formatting
  - Trend indicators, last updated time

- canvas/components/metric-kpi-renderer.tsx
  - React wrapper for canvas integration
  - Auto-refresh support

Integration:
- Onboarding flow updated with metrics section
- Vocabulary page adds "Metrics" tab
- LiquidRender component registry updated

Features:
- Type-safe API integration with Hono client
- TanStack Query for data fetching and caching
- Search and multi-filter support
- Category icons (💰📈👥⚙️)
- Confidence badges for low-confidence metrics
- Loading and error states
- Responsive design

Technical:
- Uses TurboStarter design tokens (no hardcoded styles)
- Follows existing module patterns
- Zero TypeScript errors
- Accessibility support (keyboard navigation)

Testing:
- Manual tested in Chrome/Safari/Firefox
- Responsive on desktop/tablet/mobile
- All API integrations verified

Next Steps:
- Create/Edit metric dialogs (future)
- Real-time execution (Phase 2 backend)
- Trend calculation and visualization

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

**END OF PROMPT**
