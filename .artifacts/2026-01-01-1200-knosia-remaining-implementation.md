# Knosia Remaining Implementation Spec

**Date:** 2026-01-01
**Status:** Ready for Implementation
**Estimated Effort:** ~8 hours

---

## Overview

Gap analysis of `2025-12-31-1338-knosia-vision-implementation-spec.md` revealed 3 areas needing completion:

1. **Canvas Block Type Components** (~4h)
2. **AI Insight Real Data Queries** (~2h)
3. **Canvas Collaboration UI** (~2h)

---

## 1. Canvas Block Type Components

### Current State
- Only `block-renderer.tsx` exists in `apps/web/src/modules/knosia/canvas/components/blocks/`
- Block renderer likely handles type switching but individual components not implemented

### Required Components

#### 1.1 `hero-metric.tsx` (~45min)
Large single-value display for KPIs.

```typescript
// apps/web/src/modules/knosia/canvas/components/blocks/hero-metric.tsx

interface HeroMetricBlockProps {
  block: CanvasBlock;
  data: {
    value: number | string;
    label: string;
    change?: number;        // % change from previous period
    changeDirection?: 'up' | 'down' | 'neutral';
    sparkline?: number[];   // Mini trend line
  };
}

// Features:
// - Large centered value with label
// - Optional delta badge (green/red based on direction)
// - Optional sparkline below value
// - Configurable: showChange, showSparkline, valueFormat
```

#### 1.2 `watch-list.tsx` (~45min)
Multi-metric monitoring list.

```typescript
// apps/web/src/modules/knosia/canvas/components/blocks/watch-list.tsx

interface WatchListBlockProps {
  block: CanvasBlock;
  data: Array<{
    id: string;
    name: string;
    value: number | string;
    threshold?: { min?: number; max?: number };
    status: 'normal' | 'warning' | 'critical';
  }>;
}

// Features:
// - Compact list with status indicators
// - Click to drill down
// - Threshold-based coloring
// - Sortable by value or status
```

#### 1.3 `comparison-card.tsx` (~45min)
Side-by-side or period-over-period comparison.

```typescript
// apps/web/src/modules/knosia/canvas/components/blocks/comparison-card.tsx

interface ComparisonCardBlockProps {
  block: CanvasBlock;
  data: {
    items: Array<{
      label: string;
      current: number;
      previous: number;
      change: number;
    }>;
    mode: 'side-by-side' | 'stacked';
  };
}

// Features:
// - Visual comparison bars
// - Percentage change indicators
// - Configurable comparison periods
```

#### 1.4 `insight-card.tsx` (~30min)
AI-generated insight display.

```typescript
// apps/web/src/modules/knosia/canvas/components/blocks/insight-card.tsx

interface InsightCardBlockProps {
  block: CanvasBlock;
  data: {
    headline: string;
    explanation: string;
    severity: 'info' | 'warning' | 'critical';
    evidence?: {
      metric: string;
      value: number;
      change: number;
    };
    actions?: Array<{ label: string; action: string }>;
  };
}

// Features:
// - Severity-based styling
// - Collapsible explanation
// - Action buttons for follow-up
```

#### 1.5 `liquid-render-block.tsx` (~45min)
Delegation to LiquidRender components.

```typescript
// apps/web/src/modules/knosia/canvas/components/blocks/liquid-render-block.tsx

import { LiquidRender } from '@repo/liquid-render';

interface LiquidRenderBlockProps {
  block: CanvasBlock;
  data: unknown;
}

// Features:
// - Maps block.config.chartType to LiquidRender component
// - Transforms block.dataSource results to LiquidRender format
// - Handles loading/error states
// - Supports all 77 LiquidRender components
```

#### 1.6 Update `block-renderer.tsx`

```typescript
// Ensure delegation to new block types:

switch (block.type) {
  case 'hero_metric':
    return <HeroMetricBlock block={block} data={data} />;
  case 'watch_list':
    return <WatchListBlock block={block} data={data} />;
  case 'comparison':
    return <ComparisonCardBlock block={block} data={data} />;
  case 'insight':
    return <InsightCardBlock block={block} data={data} />;
  case 'chart':
  case 'table':
  case 'visualization':
    return <LiquidRenderBlock block={block} data={data} />;
  default:
    return <EmptyBlock message={`Unknown block type: ${block.type}`} />;
}
```

---

## 2. AI Insight Real Data Queries

### Current State
`packages/api/src/modules/knosia/insight/mutations.ts` has:
- Complete structure for insight generation
- TODO placeholders at lines 144-191 using simulated data

### Required Changes

#### 2.1 Replace `detectAnomalies()` (~1h)

```typescript
// packages/api/src/modules/knosia/insight/mutations.ts

async function detectAnomalies(
  workspaceId: string,
  metrics: MetricDefinition[],
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];

  // Get active connections for workspace
  const connections = await getWorkspaceConnections(workspaceId);
  if (connections.length === 0) return insights;

  for (const metric of metrics) {
    // Execute metric query against data source
    const result = await executeMetricQuery({
      connectionId: connections[0].id,
      metric,
      period: 'last_7_days',
      comparePeriod: 'previous_7_days',
    });

    if (!result) continue;

    // Calculate statistical anomaly
    const { mean, stdDev } = calculateStats(result.historicalValues);
    const zScore = (result.currentValue - mean) / stdDev;

    // Flag if outside 2 standard deviations
    if (Math.abs(zScore) > 2) {
      const changePercent = ((result.currentValue - result.previousValue) / result.previousValue) * 100;

      insights.push({
        headline: `${zScore > 0 ? 'Unusual spike' : 'Unusual drop'} in ${metric.canonicalName}`,
        explanation: `${metric.canonicalName} is ${Math.abs(zScore).toFixed(1)} standard deviations ${zScore > 0 ? 'above' : 'below'} the 30-day average. Current value: ${result.currentValue}, Average: ${mean.toFixed(2)}.`,
        evidence: {
          metric: metric.slug,
          currentValue: result.currentValue,
          previousValue: result.previousValue,
          changePercent,
          pattern: zScore > 0 ? 'spike' : 'drop',
          zScore,
        },
        severity: Math.abs(zScore) > 3 ? 'critical' : 'warning',
        category: 'anomaly',
      });
    }
  }

  return insights;
}
```

#### 2.2 Replace `detectPatterns()` (~1h)

```typescript
async function detectPatterns(
  workspaceId: string,
  metrics: MetricDefinition[],
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];

  const connections = await getWorkspaceConnections(workspaceId);
  if (connections.length === 0) return insights;

  // Get time series data for all metrics
  const timeSeries = await Promise.all(
    metrics.slice(0, 5).map(async (metric) => ({
      metric,
      data: await executeTimeSeriesQuery({
        connectionId: connections[0].id,
        metric,
        period: 'last_30_days',
        granularity: 'daily',
      }),
    }))
  );

  // Detect correlations between metrics
  for (let i = 0; i < timeSeries.length; i++) {
    for (let j = i + 1; j < timeSeries.length; j++) {
      const seriesA = timeSeries[i];
      const seriesB = timeSeries[j];

      if (!seriesA?.data || !seriesB?.data) continue;

      const correlation = calculatePearsonCorrelation(
        seriesA.data.values,
        seriesB.data.values,
      );

      // Report strong correlations (|r| > 0.7)
      if (Math.abs(correlation) > 0.7) {
        insights.push({
          headline: `${seriesA.metric.canonicalName} ${correlation > 0 ? 'moves with' : 'inversely tracks'} ${seriesB.metric.canonicalName}`,
          explanation: `Analysis of the last 30 days shows a ${correlation > 0 ? 'positive' : 'negative'} correlation (r=${correlation.toFixed(2)}) between these metrics. Changes in one often ${correlation > 0 ? 'accompany' : 'oppose'} changes in the other.`,
          evidence: {
            metric: seriesA.metric.slug,
            currentValue: correlation,
            pattern: `correlated_with:${seriesB.metric.slug}`,
            correlationStrength: Math.abs(correlation) > 0.9 ? 'very_strong' : 'strong',
          },
          severity: 'info',
          category: 'correlation',
        });
      }
    }
  }

  // Detect trends
  for (const series of timeSeries) {
    if (!series?.data) continue;

    const trend = calculateLinearTrend(series.data.values);

    // Report significant trends (>10% change over period)
    if (Math.abs(trend.percentChange) > 10) {
      insights.push({
        headline: `${series.metric.canonicalName} is ${trend.direction === 'up' ? 'trending upward' : 'declining'}`,
        explanation: `Over the last 30 days, ${series.metric.canonicalName} has ${trend.direction === 'up' ? 'increased' : 'decreased'} by ${Math.abs(trend.percentChange).toFixed(1)}%. This represents a consistent ${trend.direction}ward trend.`,
        evidence: {
          metric: series.metric.slug,
          currentValue: series.data.values[series.data.values.length - 1],
          previousValue: series.data.values[0],
          changePercent: trend.percentChange,
          pattern: `trend_${trend.direction}`,
        },
        severity: Math.abs(trend.percentChange) > 25 ? 'warning' : 'info',
        category: 'trend',
      });
    }
  }

  return insights;
}
```

#### 2.3 Helper Functions Needed

```typescript
// packages/api/src/modules/knosia/insight/helpers.ts

export function calculateStats(values: number[]): { mean: number; stdDev: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenom = 0;
  let yDenom = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xDenom += xDiff * xDiff;
    yDenom += yDiff * yDiff;
  }

  return numerator / Math.sqrt(xDenom * yDenom);
}

export function calculateLinearTrend(values: number[]): {
  direction: 'up' | 'down' | 'flat';
  percentChange: number;
  slope: number;
} {
  const n = values.length;
  if (n < 2) return { direction: 'flat', percentChange: 0, slope: 0 };

  // Linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const firstValue = values[0] || 1;
  const lastValue = values[n - 1] || 0;
  const percentChange = ((lastValue - firstValue) / Math.abs(firstValue)) * 100;

  return {
    direction: slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat',
    percentChange,
    slope,
  };
}
```

---

## 3. Canvas Collaboration UI

### 3.1 `canvas-alerts-panel.tsx` (~1h)

```typescript
// apps/web/src/modules/knosia/canvas/components/canvas-alerts-panel.tsx

interface CanvasAlertsPanelProps {
  canvasId: string;
  alerts: CanvasAlert[];
  onCreateAlert: () => void;
  onEditAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
}

// Features:
// - List of configured alerts for canvas
// - Alert status indicators (active, triggered, paused)
// - Quick actions: enable/disable, edit, delete
// - "Add Alert" button opening config modal
// - Filter by status, severity
// - Shows last triggered time and frequency

// Alert config includes:
// - Metric/block to monitor
// - Condition (>, <, =, change %)
// - Threshold value
// - Notification channels (email, in-app, webhook)
// - Frequency limits (max 1 per hour, etc.)
```

### 3.2 `canvas-share-modal.tsx` (~1h)

```typescript
// apps/web/src/modules/knosia/canvas/components/canvas-share-modal.tsx

interface CanvasShareModalProps {
  canvas: Canvas;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Features:
// - User/email search with autocomplete
// - Permission levels: view, comment, edit
// - Copy shareable link
// - Link settings (public/private, expiration)
// - Current collaborators list with role management
// - Bulk invite via email list
// - Integration with workspace members

// Shares table reference:
// - Already have sharing in thread API (shareThread in mutations.ts)
// - Reuse pattern for canvas: POST /:id/share
```

---

## Implementation Order

### Wave 1: Core Blocks (~2h)
1. `hero-metric.tsx`
2. `watch-list.tsx`
3. `liquid-render-block.tsx`
4. Update `block-renderer.tsx`

### Wave 2: Extended Blocks + Insights (~3h)
1. `comparison-card.tsx`
2. `insight-card.tsx`
3. `insight/helpers.ts` (statistical functions)
4. Update `detectAnomalies()` and `detectPatterns()`

### Wave 3: Collaboration (~2h)
1. `canvas-alerts-panel.tsx`
2. `canvas-share-modal.tsx`

### Wave 4: Integration (~1h)
1. Wire alerts panel into canvas view
2. Wire share modal into canvas header
3. Test insight generation with real connections

---

## Testing Checklist

- [ ] Hero metric renders with sparkline
- [ ] Watch list shows threshold violations correctly
- [ ] Comparison card handles negative changes
- [ ] Insight card actions trigger correctly
- [ ] LiquidRender block delegates to correct component type
- [ ] Anomaly detection fires on real data spikes
- [ ] Correlation detection finds related metrics
- [ ] Trend detection identifies 30-day patterns
- [ ] Alerts panel CRUD operations work
- [ ] Share modal permission levels apply correctly
- [ ] Canvas collaborators can view/edit based on permissions

---

## Files to Create/Modify

### New Files
```
apps/web/src/modules/knosia/canvas/components/blocks/
├── hero-metric.tsx
├── watch-list.tsx
├── comparison-card.tsx
├── insight-card.tsx
└── liquid-render-block.tsx

apps/web/src/modules/knosia/canvas/components/
├── canvas-alerts-panel.tsx
└── canvas-share-modal.tsx

packages/api/src/modules/knosia/insight/
└── helpers.ts
```

### Modified Files
```
apps/web/src/modules/knosia/canvas/components/blocks/block-renderer.tsx
apps/web/src/modules/knosia/canvas/components/canvas-view.tsx
packages/api/src/modules/knosia/insight/mutations.ts
```
