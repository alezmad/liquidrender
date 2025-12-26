---
component: LineChart
code: Lc
liquid_file: packages/liquid-render/src/renderer/components/line-chart.tsx
shadcn_ref: chart
auditor: agent
date: 2025-12-25
scores:
  accessibility: 3
  api_design: 6
  design_tokens: 8
  features: 7
  testing: 0
  total: 24
priority: P1
---

# LineChart Component Audit

## Executive Summary

The liquid-render LineChart component is a functional implementation built on Recharts that provides basic charting capabilities. However, it significantly lags behind shadcn/ui's chart component in accessibility, configuration flexibility, and theming architecture. The absence of tests is a critical gap.

---

## 1. Accessibility (Score: 3/10)

### Issues Found

**Missing ARIA Labels:**
The liquid-render component provides no accessibility attributes for screen readers.

```tsx
// liquid-render (current)
<div data-liquid-type="line" style={styles.wrapper}>
  {label && <div style={styles.header}>{label}</div>}
  <ResponsiveContainer width="100%" height={220}>
    <RechartsLineChart data={chartData}>
      // No aria-label, role, or description
    </RechartsLineChart>
  </ResponsiveContainer>
</div>
```

**shadcn/ui Pattern:**
```tsx
// shadcn/ui uses semantic data attributes and accessible structure
<div
  data-slot="chart"
  data-chart={chartId}
  className={cn(
    "[&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden",
    // ... visibility-focused accessibility classes
  )}
>
```

### Recommendations
- Add `role="img"` or `role="figure"` to the chart container
- Implement `aria-label` describing the chart data
- Add `aria-describedby` linking to a data summary for screen readers
- Include keyboard navigation for tooltip interaction

---

## 2. API Design (Score: 6/10)

### Current API

**liquid-render:**
```tsx
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
}

// Static variant
interface StaticLineChartProps {
  data: ChartDataPoint[];
  xKey: string;
  lines: LineConfig[];
  title?: string;
  height?: number;
  style?: React.CSSProperties;
}
```

**shadcn/ui:**
```tsx
// Configuration-driven approach with ChartConfig
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

// Context-based configuration
function ChartContainer({
  id,
  className,
  children,
  config,  // <-- Central configuration object
  ...props
}: ChartContainerProps)
```

### Gaps

| Feature | liquid-render | shadcn/ui |
|---------|--------------|-----------|
| Centralized config | No | Yes (ChartConfig) |
| Theme-aware colors | Partial | Full |
| Label customization | Basic string | ReactNode + icon |
| ID management | Manual | Automatic (useId) |
| Context API | None | Full context system |

### Recommendations
- Implement a `ChartConfig` pattern for declarative configuration
- Use React Context to share configuration across chart elements
- Support ReactNode labels for richer formatting

---

## 3. Design Tokens (Score: 8/10)

### Good Practices

The component correctly uses design tokens from `utils.ts`:

```tsx
// Correct token usage in liquid-render
<CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
<XAxis
  dataKey={xKey}
  tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
  stroke={tokens.colors.border}
/>
<Tooltip
  contentStyle={{
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    fontSize: tokens.fontSize.sm,
  }}
/>
```

### Chart Colors

```tsx
// liquid-render uses static chartColors array
import { chartColors } from './utils';
// chartColors = ['#3b82f6', '#22c55e', '#f59e0b', ...]

stroke={chartColors[i % chartColors.length]}
```

**shadcn/ui Pattern:**
```tsx
// CSS variable-based theming for light/dark mode support
const THEMES = { light: "", dark: ".dark" } as const

// Generates CSS variables dynamically
<style
  dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES)
      .map(([theme, prefix]) => `
        ${prefix} [data-chart=${id}] {
          ${colorConfig.map(([key, itemConfig]) => {
            const color = itemConfig.theme?.[theme] || itemConfig.color
            return color ? `--color-${key}: ${color};` : null
          }).join("\n")}
        }
      `).join("\n"),
  }}
/>
```

### Gaps
- No dark mode support via theme-aware CSS variables
- Chart colors are hardcoded, not themeable
- Missing CSS variable injection pattern

---

## 4. Features (Score: 7/10)

### Feature Comparison

| Feature | liquid-render | shadcn/ui |
|---------|--------------|-----------|
| Responsive container | Yes | Yes |
| Tooltip | Yes (basic) | Yes (enhanced) |
| Legend | Yes (basic) | Yes (customizable) |
| Multi-line support | Yes | Yes |
| Auto field detection | Yes | No (explicit) |
| SSR fallback | Yes | N/A |
| Empty state | Yes | N/A |
| Dark mode | No | Yes |
| Custom tooltip content | No | Yes (ChartTooltipContent) |
| Custom legend content | No | Yes (ChartLegendContent) |
| Indicator styles | No | Yes (dot/line/dashed) |
| Icon support | No | Yes |

### liquid-render Strengths

**Auto-detection of data fields:**
```tsx
function detectXYFields(data: ChartDataPoint[]): { x: string; y: string } {
  // Intelligently finds x (string/date) and y (numeric) fields
  const xField = keys.find(k => typeof val === 'string' || val instanceof Date);
  const yField = keys.find(k => isNumeric(val) && k !== xField);
  return { x: xField, y: yField };
}
```

**SSR handling:**
```tsx
if (!isBrowser) {
  return (
    <div data-liquid-type="line" style={styles.wrapper}>
      <div style={styles.placeholder}>
        [Line chart - {chartData.length} points]
      </div>
    </div>
  );
}
```

### shadcn/ui Advantages

**Enhanced tooltip with indicators:**
```tsx
function ChartTooltipContent({
  indicator = "dot",  // "dot" | "line" | "dashed"
  hideLabel = false,
  hideIndicator = false,
  // ...
}) {
  return (
    <div className="...">
      {!hideIndicator && (
        <div
          className={cn({
            "h-2.5 w-2.5": indicator === "dot",
            "w-1": indicator === "line",
            "w-0 border-[1.5px] border-dashed": indicator === "dashed",
          })}
          style={{ "--color-bg": indicatorColor }}
        />
      )}
    </div>
  );
}
```

---

## 5. Testing (Score: 0/10)

### Current State

**No test file found at:**
- `packages/liquid-render/tests/line-chart.test.ts`
- `packages/liquid-render/tests/line-chart.test.tsx`

### Required Test Coverage

```typescript
// Recommended test structure
describe('LineChart', () => {
  describe('Rendering', () => {
    it('renders with valid data');
    it('renders empty state when no data');
    it('renders SSR fallback on server');
    it('includes data-liquid-type attribute');
  });

  describe('Data Handling', () => {
    it('auto-detects x and y fields');
    it('supports explicit x/y binding');
    it('renders multiple lines for multi-field data');
    it('handles null/undefined values gracefully');
  });

  describe('Styling', () => {
    it('applies design tokens correctly');
    it('uses chartColors for lines');
    it('renders title when label provided');
  });

  describe('StaticLineChart', () => {
    it('renders with explicit line configuration');
    it('supports custom height');
    it('applies custom styles');
  });
});
```

---

## Priority Improvements

### P0 - Critical
1. **Add comprehensive test suite** - 0 coverage is unacceptable
2. **Add basic accessibility** - `aria-label`, `role="img"`

### P1 - High
3. **Implement ChartConfig pattern** for declarative configuration
4. **Add dark mode support** via CSS variable theming
5. **Enhanced tooltip** with customizable content

### P2 - Medium
6. **Keyboard navigation** for tooltips
7. **Screen reader data summary**
8. **Icon support** in legends

---

## Code Comparison Summary

### Container Pattern

```tsx
// liquid-render - Inline styles, no context
<div data-liquid-type="line" style={styles.wrapper}>
  <ResponsiveContainer width="100%" height={220}>
    <RechartsLineChart data={chartData}>
      ...
    </RechartsLineChart>
  </ResponsiveContainer>
</div>

// shadcn/ui - Context + CSS variable injection
<ChartContext.Provider value={{ config }}>
  <div data-slot="chart" data-chart={chartId} className={cn(...)}>
    <ChartStyle id={chartId} config={config} />
    <RechartsPrimitive.ResponsiveContainer>
      {children}
    </RechartsPrimitive.ResponsiveContainer>
  </div>
</ChartContext.Provider>
```

### Theming Architecture

```tsx
// liquid-render - Static colors
stroke={chartColors[0]} // '#3b82f6'

// shadcn/ui - Theme-aware CSS variables
style={{ "--color-bg": indicatorColor }}
// Plus dynamic style injection for light/dark themes
```

---

## Final Score: 24/50

| Dimension | Score | Weight |
|-----------|-------|--------|
| Accessibility | 3 | Critical |
| API Design | 6 | High |
| Design Tokens | 8 | Medium |
| Features | 7 | Medium |
| Testing | 0 | Critical |

**Priority: P1** - Requires immediate attention for accessibility and testing gaps.
