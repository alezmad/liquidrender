---
component: BarChart
code: Bc
liquid_file: packages/liquid-render/src/renderer/components/bar-chart.tsx
shadcn_ref: chart
auditor: agent
date: 2025-12-25
scores:
  accessibility: 3
  api_design: 6
  design_tokens: 8
  features: 6
  testing: 0
  total: 23
priority: P1
---

# BarChart Component Audit

## Executive Summary

The liquid-render BarChart component provides basic bar chart functionality using Recharts but lacks the sophisticated wrapper architecture that shadcn/ui provides. The component has decent design token usage but significant gaps in accessibility, theming flexibility, and test coverage.

---

## Score Breakdown

### 1. Accessibility (Score: 3/10)

**Major Issues:**

| Issue | shadcn/ui Pattern | liquid-render Current |
|-------|-------------------|----------------------|
| ARIA labels | Uses context for accessible labels | No ARIA attributes |
| Screen reader | `aria-label` on chart container | No screen reader support |
| Keyboard nav | Inherits from Recharts but wrapped properly | No keyboard handling |
| Focus management | Container is focusable | No focus indicators |

**Code Comparison:**

```tsx
// shadcn/ui - ChartContainer with accessibility
<div
  data-slot="chart"
  data-chart={chartId}
  className={cn("...classes...")}
  {...props}  // allows aria-* props to pass through
>
```

```tsx
// liquid-render - No accessibility attributes
<div data-liquid-type="bar" style={styles.wrapper}>
  {/* No aria-label, role, or other a11y attributes */}
```

**Recommendations:**
- Add `role="img"` and `aria-label` to chart container
- Include `aria-describedby` pointing to a visually hidden description
- Add keyboard navigation for bar selection
- Provide screen reader announcements for data changes

---

### 2. API Design (Score: 6/10)

**Comparison Table:**

| Feature | shadcn/ui | liquid-render |
|---------|-----------|---------------|
| Config object | `ChartConfig` with labels, icons, themes | None - direct props |
| Color theming | Theme-aware via CSS vars | Hardcoded `chartColors` array |
| Context API | `ChartContext` for child components | No context |
| Custom tooltips | `ChartTooltipContent` component | Inline Recharts Tooltip |
| Custom legends | `ChartLegendContent` component | Direct Recharts Legend |

**Code Comparison - Configuration:**

```tsx
// shadcn/ui - Flexible ChartConfig type
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

// Usage
const chartConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
}
```

```tsx
// liquid-render - Simple BarConfig
interface BarConfig {
  dataKey: string;
  fill?: string;
  name?: string;
  stackId?: string;
}
```

**Strengths of liquid-render:**
- Auto-detection of X/Y fields (`detectXYFields`)
- Auto-detection of numeric fields (`detectAllNumericFields`)
- SSR fallback with informative placeholder
- Static variant with explicit props

**Weaknesses:**
- No icon support for legend items
- No theme-aware color switching
- No context for nested components
- Limited customization without editing source

---

### 3. Design Tokens (Score: 8/10)

**Token Usage Analysis:**

| Token Category | Usage | Status |
|---------------|-------|--------|
| Colors | `tokens.colors.border`, `tokens.colors.card`, etc. | Good |
| Spacing | `tokens.spacing.md`, `tokens.spacing.sm` | Good |
| Typography | `tokens.fontSize.base`, `tokens.fontSize.sm` | Good |
| Border radius | `tokens.radius.md` | Good |
| Chart colors | `chartColors` from utils | Good |

**Code Comparison:**

```tsx
// liquid-render - Good token usage
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

```tsx
// shadcn/ui - CSS class-based theming
className={cn(
  "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
  "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
  // ...
)}
```

**Minor Issue:**
- Hardcoded `fontSize: 12` in some places instead of `tokens.fontSize.xs`
- Could benefit from CSS variable injection like shadcn's `ChartStyle` component

---

### 4. Features (Score: 6/10)

**Feature Parity Matrix:**

| Feature | shadcn/ui | liquid-render | Gap |
|---------|-----------|---------------|-----|
| Responsive container | Yes | Yes | None |
| Tooltips | Custom component | Styled Recharts | Minor |
| Legends | Custom component | Styled Recharts | Minor |
| Stacked bars | Via config | `stacked` prop in Static | Minor |
| Grouped bars | Via config | Auto (multiple numeric fields) | None |
| Dark mode | Theme-aware colors | CSS variable fallbacks | Moderate |
| Custom formatters | Yes | Limited | Moderate |
| Icons in legend | Yes | No | Significant |
| Animated transitions | Via Recharts | Via Recharts | None |
| Click handlers | Passthrough | Not exposed | Significant |
| Empty state | N/A | Yes - "No data available" | Advantage |
| SSR support | N/A | Yes - placeholder | Advantage |

**Code Comparison - Tooltip:**

```tsx
// shadcn/ui - Highly customizable tooltip
function ChartTooltipContent({
  active,
  payload,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  formatter,
  // ... many options
}) {
  // Complex rendering with config lookup
}
```

```tsx
// liquid-render - Basic styling only
<Tooltip
  contentStyle={{
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    // ...
  }}
  cursor={{ fill: tokens.colors.muted }}
/>
```

**Unique liquid-render Features:**
- Automatic field detection for quick prototyping
- `fieldToLabel()` auto-formatting for human-readable labels
- SSR-safe placeholder rendering

---

### 5. Testing (Score: 0/10)

**Test File Status:** NOT FOUND

No test file exists at `packages/liquid-render/tests/bar-chart.test.ts`

**Required Test Coverage:**

1. **Rendering tests:**
   - Empty data handling
   - Single bar rendering
   - Multiple bars (grouped)
   - Stacked bars (via StaticBarChart)

2. **Data binding tests:**
   - Explicit x/y binding
   - Auto-detection fallback
   - Array data resolution

3. **SSR tests:**
   - Placeholder rendering when `isBrowser` is false

4. **Accessibility tests:**
   - ARIA attributes present
   - Keyboard navigation (once implemented)

---

## Priority Recommendations

### P0 - Critical (Before Production)

1. **Add test file** - Create comprehensive tests for bar-chart.tsx
2. **Add ARIA labels** - Minimum `role="img"` and `aria-label`

### P1 - High Priority

3. **Add ChartConfig-style API** - Enable label/icon/theme configuration
4. **Implement click handlers** - Expose bar click events for interactivity
5. **Replace hardcoded font sizes** - Use `tokens.fontSize.xs` consistently

### P2 - Medium Priority

6. **Add custom tooltip component** - Match shadcn's flexibility
7. **Add keyboard navigation** - Enable focus and selection of bars
8. **Theme-aware color injection** - Add `ChartStyle`-like CSS var injection

### P3 - Nice to Have

9. **Icon support in legends** - Match shadcn feature
10. **Custom formatter support** - For value/label formatting

---

## Code Quality Notes

**Strengths:**
- Clean separation with TypeScript interfaces
- Good use of `useMemo` for expensive computations
- Proper SSR handling with `isBrowser` check
- Both dynamic (`BarChartComponent`) and static (`StaticBarChart`) variants

**Weaknesses:**
- No JSDoc comments on functions
- Some magic numbers (e.g., `height={220}`, `radius={[4, 4, 0, 0]}`)
- Missing error boundaries for chart rendering failures

---

## Final Assessment

The BarChart component is functional but immature compared to shadcn/ui's chart wrapper. The primary gaps are in accessibility (no ARIA support) and testing (no test file). The design token usage is solid, and the auto-detection features are a nice addition for AI-generated UIs. Priority should be given to creating tests and adding basic accessibility before enhancing features.

**Total Score: 23/50 (46%)**
