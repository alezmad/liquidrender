# Briefing Module

Data health metrics and profiling visualization components for Knosia.

## Overview

The briefing module provides components to display data quality, freshness, and health metrics derived from the data profiling analysis.

## Components

### 1. DataHealthCard

High-level overview card showing database health metrics.

**Props:**
- `summary: ProfilingSummary` - Profiling summary data
- `className?: string` - Optional CSS class

**Features:**
- Table count, total rows, data size
- Average rows per table
- Data freshness percentage with visual bar
- Stale table warnings
- Update frequency distribution

**Usage:**
```tsx
import { DataHealthCard } from "~/modules/briefing";

function Dashboard() {
  const { data: summary } = useProfilingSummary(analysisId);

  return <DataHealthCard summary={summary} />;
}
```

### 2. FreshnessIndicator

Visual indicator showing how recent table data is.

**Props:**
- `tableName: string` - Name of the table
- `latestDataAt: string | null` - ISO timestamp of last data update
- `className?: string` - Optional CSS class

**Freshness Levels:**
- **Fresh (green)**: Data updated within 7 days
- **Aging (yellow)**: Data 8-30 days old
- **Stale (red)**: Data >30 days old
- **Unknown (gray)**: No freshness data available

**Usage:**
```tsx
import { FreshnessIndicator } from "~/modules/briefing";

<FreshnessIndicator
  tableName="users"
  latestDataAt="2026-01-01T12:00:00Z"
/>
```

### 3. QualityMetrics

Detailed column-level quality metrics for a specific table.

**Props:**
- `analysisId: string` - Analysis ID
- `tableName: string` - Table to analyze
- `className?: string` - Optional CSS class

**Features:**
- Average completeness score (100% - avg null %)
- Empty column flags (>90% null)
- Sparse column flags (50-90% null)
- Per-column breakdown with:
  - Null percentage
  - Unique value count
  - Visual completeness bar

**Usage:**
```tsx
import { QualityMetrics } from "~/modules/briefing";

<QualityMetrics
  analysisId={analysisId}
  tableName="orders"
/>
```

### 4. BriefingView

Complete example view demonstrating all components together.

**Props:**
- `analysisId: string` - Analysis ID to display

**Usage:**
```tsx
import { BriefingView } from "~/modules/briefing";

export default function Page({ params }: { params: { id: string } }) {
  return <BriefingView analysisId={params.id} />;
}
```

## Hooks

### useProfilingSummary

React Query hook for fetching profiling summary data.

**Parameters:**
- `analysisId: string | null` - Analysis ID (null disables query)

**Returns:**
- Standard React Query result with `ProfilingSummary` data

**Usage:**
```tsx
import { useProfilingSummary } from "~/modules/briefing";

function MyComponent({ analysisId }: { analysisId: string }) {
  const { data, isLoading, error } = useProfilingSummary(analysisId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage />;

  return <DataHealthCard summary={data} />;
}
```

## Types

### ProfilingSummary

```typescript
interface ProfilingSummary {
  analysisId: string;
  tableCount: number;
  totalRows: number;
  totalSizeBytes: number;
  averageRowsPerTable: number;
  tablesWithFreshness: number;
  staleTables: number;
  updateFrequencies: Record<string, number>;
}
```

### FreshnessLevel

```typescript
type FreshnessLevel = "recent" | "stale" | "very-stale" | "unknown";
```

## API Endpoints

Components consume these Knosia API endpoints:

- `GET /api/knosia/analysis/:id/profiling` - Summary metrics
- `GET /api/knosia/analysis/:id/tables/:tableName/profile` - Detailed table profile

## Design Tokens

All components use design tokens from `@turbostarter/ui`:

- No hardcoded colors
- No hardcoded spacing
- Theme-aware (supports dark mode)
- Consistent with TurboStarter design system

## Dependencies

- `@tanstack/react-query` - Data fetching
- `@turbostarter/ui-web` - UI components (Card, Badge, Icons, Skeleton)
- `@turbostarter/api` - API client and utilities

## File Structure

```
briefing/
├── components/
│   ├── data-health-card.tsx      # Main health overview
│   ├── freshness-indicator.tsx   # Data recency indicator
│   ├── quality-metrics.tsx       # Column quality details
│   └── briefing-view.tsx         # Complete example view
├── hooks/
│   └── use-profiling-summary.ts  # Data fetching hook
├── types.ts                      # TypeScript types
├── index.ts                      # Barrel exports
└── README.md                     # This file
```

## Next Steps

To integrate into a page:

1. Create page in `apps/web/src/app/[locale]/dashboard/briefing/[id]/page.tsx`
2. Add route to `config/paths.ts`
3. Add to sidebar menu in dashboard layout
4. Add i18n translations for labels

See `CLAUDE.md` for detailed instructions on adding pages and features.
