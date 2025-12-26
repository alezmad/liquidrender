---
component: PieChart
code: Pc
liquid_file: packages/liquid-render/src/renderer/components/pie-chart.tsx
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

# PieChart Component Audit

## Executive Summary

The PieChart component provides basic pie/donut chart functionality using Recharts but lacks significant accessibility features compared to the shadcn/ui chart patterns. The component correctly uses design tokens and provides reasonable feature coverage, but has no test coverage.

---

## 1. Accessibility (Score: 3/10)

### Issues Found

**Missing ARIA attributes:**
- No `role="img"` or `aria-label` on the chart container
- No accessible descriptions for screen readers
- No keyboard navigation support for chart segments

**shadcn/ui Pattern:**
```tsx
// shadcn provides data-slot and data-chart attributes for accessibility
<div
  data-slot="chart"
  data-chart={chartId}
  className={cn(...)}
>
```

**liquid-render Pattern:**
```tsx
// Only uses data-liquid-type, no accessibility attributes
<div data-liquid-type="pie" style={styles.wrapper}>
```

### Recommendations
- Add `role="img"` and `aria-label` to chart container
- Provide `aria-describedby` linking to a screen-reader-only description
- Add keyboard focus indicators for interactive elements
- Consider adding a visually hidden table representation of data

---

## 2. API Design (Score: 6/10)

### Comparison

**shadcn/ui ChartConfig Pattern:**
```tsx
// Declarative configuration with labels and theme support
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

// Usage with ChartContainer context
<ChartContainer config={chartConfig}>
  <PieChart>...</PieChart>
</ChartContainer>
```

**liquid-render Pattern:**
```tsx
// Props-based configuration
interface StaticPieChartProps {
  data: ChartDataPoint[];
  nameKey: string;
  valueKey: string;
  title?: string;
  height?: number;
  innerRadius?: number;
  colors?: string[];
  style?: React.CSSProperties;
}
```

### Strengths
- Auto-detection of name/value fields (`detectNameValueFields`)
- Dual API: Dynamic (`PieChartComponent`) and Static (`StaticPieChart`)
- Convenient `DonutChart` variant

### Weaknesses
- No context-based configuration like shadcn
- No support for custom icons per segment
- No theme-aware color configuration
- Limited customization options (no animationBegin, animationDuration, etc.)

---

## 3. Design Tokens (Score: 8/10)

### Strengths

The component correctly uses tokens from `utils.ts`:

```tsx
// Correct token usage
const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    minHeight: '280px',
  }),
  header: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  },
};

// Tooltip styling with tokens
<Tooltip
  contentStyle={{
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    fontSize: tokens.fontSize.sm,
  }}
/>
```

### Issues

**Hardcoded values found:**
```tsx
// Line 107-108: Hardcoded white color for labels
<text
  fill="white"  // Should use tokens.colors.primaryForeground or similar
  ...
>
```

**Chart colors are static:**
```tsx
// Uses chartColors array from utils.ts (good)
// But no support for CSS variable-based theming like shadcn
fill={chartColors[index % chartColors.length]}
```

**shadcn/ui theming approach:**
```tsx
// Dynamic CSS variable injection for theme support
const ChartStyle = ({ id, config }) => {
  return (
    <style dangerouslySetInnerHTML={{
      __html: Object.entries(THEMES).map(([theme, prefix]) => `
        ${prefix} [data-chart=${id}] {
          --color-${key}: ${color};
        }
      `).join("\n"),
    }} />
  )
}
```

---

## 4. Features (Score: 7/10)

### Feature Comparison

| Feature | shadcn/ui | liquid-render | Status |
|---------|-----------|---------------|--------|
| Responsive container | Yes | Yes | Complete |
| Tooltips | ChartTooltip/ChartTooltipContent | Basic Tooltip | Partial |
| Legend | ChartLegend/ChartLegendContent | Basic Legend | Partial |
| Donut mode | Via innerRadius | DonutChart variant | Complete |
| Custom labels | Via config | renderCustomLabel | Complete |
| Theme support | Light/dark via CSS vars | Static colors | Missing |
| Icon support | Per-segment icons | None | Missing |
| Context API | ChartContext | None | Missing |
| SSR fallback | N/A | Yes | Bonus |
| Empty state | N/A | Yes | Bonus |

### Implemented Features
- Responsive container with `ResponsiveContainer`
- Basic tooltip with styled content
- Legend display
- Donut chart variant via `innerRadius` prop
- Custom percentage labels on slices
- SSR fallback placeholder
- Empty data state handling
- Auto-detection of data keys

### Missing Features
- Custom tooltip content component (shadcn provides `ChartTooltipContent`)
- Custom legend component (shadcn provides `ChartLegendContent`)
- Per-segment icons
- Dark/light theme switching
- Animation customization
- Click handlers for segments
- Active segment highlighting

---

## 5. Testing (Score: 0/10)

### Status
**No test file found** at `packages/liquid-render/tests/pie-chart.test.ts`

### Required Test Coverage
- Rendering with valid data
- Empty data state
- SSR fallback behavior
- Custom nameKey/valueKey props
- DonutChart variant
- Color customization
- Title rendering
- Auto-detection of data fields

---

## Summary Table

| Dimension | Score | Notes |
|-----------|-------|-------|
| Accessibility | 3/10 | Missing ARIA, keyboard nav, screen reader support |
| API Design | 6/10 | Functional but lacks shadcn's context/config pattern |
| Design Tokens | 8/10 | Good token usage with minor hardcoded values |
| Features | 7/10 | Core features present, missing advanced features |
| Testing | 0/10 | No test file exists |
| **Total** | **24/50** | **Priority: P1** |

---

## Recommended Actions

### High Priority (P1)
1. Add accessibility attributes (role, aria-label, aria-describedby)
2. Create test file with basic coverage
3. Replace hardcoded `fill="white"` with token

### Medium Priority (P2)
4. Implement ChartConfig-style API for consistency with shadcn
5. Add custom tooltip/legend components
6. Support dark/light theme via CSS variables

### Low Priority (P3)
7. Add segment click handlers
8. Implement active segment highlighting
9. Add animation customization props
