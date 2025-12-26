---
component: Badge
code: Bg
liquid_file: packages/liquid-render/src/renderer/components/badge.tsx
shadcn_ref: badge
auditor: agent
date: 2025-12-25
scores:
  accessibility: 4
  api_design: 5
  design_tokens: 7
  features: 5
  testing: 8
  total: 29
priority: P1
---

# Badge Component Audit

## Summary

The liquid-render Badge component is designed for notification overlays (dots, counts) rather than as a general-purpose status badge like shadcn/ui. This design decision leads to significant architectural differences that affect feature parity and accessibility.

---

## 1. Accessibility (Score: 4/10)

### Issues Found

**Missing ARIA attributes:**

| Feature | shadcn/ui | liquid-render |
|---------|-----------|---------------|
| Focus states | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` | None |
| Invalid state | `aria-invalid:ring-destructive/20 aria-invalid:border-destructive` | None |
| Semantic role | Uses `<span>` with accessible slot | Uses `<span>` with data attributes only |

**Code Comparison:**

```tsx
// shadcn/ui - Rich accessibility support
<Comp
  data-slot="badge"
  className={cn(badgeVariants({ variant }), className)}
  {...props}  // Allows aria-* passthrough
/>

// liquid-render - Minimal accessibility
<span
  data-liquid-type="badge"
  data-size={size}
  data-dot={dot.toString()}
  style={badgeStyle}
>
  {displayText}
</span>
```

**Missing:**
- No `role` attribute for screen readers
- No `aria-label` for dot-only badges (critical - they have no text content)
- No focus states for interactive badges
- No keyboard accessibility support
- Cannot pass aria-* props through

**Recommendations:**
1. Add `role="status"` or `role="alert"` for notification badges
2. Add `aria-label` for dot-only badges (e.g., "New notification")
3. Support focus-visible states for clickable/interactive badges
4. Allow aria-* prop passthrough

---

## 2. API Design (Score: 5/10)

### Props Comparison

| Feature | shadcn/ui | liquid-render |
|---------|-----------|---------------|
| variant prop | `default \| secondary \| destructive \| outline` | None (uses color) |
| asChild | Radix Slot pattern | Not supported |
| className | Supported | Not used (inline styles) |
| Spread props | `...props` | Not supported |

**shadcn/ui API:**
```tsx
interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: "default" | "secondary" | "destructive" | "outline";
  asChild?: boolean;
}

// Usage
<Badge variant="destructive">Error</Badge>
<Badge asChild><a href="#">Link Badge</a></Badge>
```

**liquid-render API:**
```tsx
// Main component - DSL-driven
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}

// Static component - Direct usage
interface StaticBadgeProps {
  value?: number | string;
  max?: number;           // Unique feature
  dot?: boolean;          // Unique feature
  size?: 'xs' | 'sm' | 'md';
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}
```

**Key Differences:**
1. **No variant system** - Uses direct color instead of semantic variants
2. **No asChild pattern** - Cannot render as different element
3. **Notification-focused** - `max`, `dot`, `value` are unique features
4. **No prop spreading** - Cannot extend with custom props

**Recommendations:**
1. Add variant prop matching shadcn patterns
2. Consider asChild support for link badges
3. Allow spreading of additional props

---

## 3. Design Tokens (Score: 7/10)

### Token Usage

**Good - Uses tokens from utils.ts:**
```tsx
// Font sizes
fontSize: tokens.fontSize.xs,
fontSize: tokens.fontSize.sm,

// Spacing
padding: dot ? '0' : `0 ${tokens.spacing.xs}`,

// Border radius
borderRadius: tokens.radius.full,

// Colors (via getBlockColor)
backgroundColor: color || tokens.colors.destructive,

// Border uses card color
border: `2px solid ${tokens.colors.card}`,
```

**Issues Found:**

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Hardcoded white | `color: '#ffffff'` | Use `tokens.colors.destructiveForeground` |
| Magic numbers | `minWidth: dot ? '6px' : '14px'` | Define size tokens |
| Inline positions | `top: '-3px'`, `right: '-3px'` | Create position tokens |
| No CSS variables | Direct inline styles | Consider CSS custom properties |

**Code Example - Hardcoded Values:**
```tsx
// Current - hardcoded values
const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  xs: {
    minWidth: dot ? '6px' : '14px',  // Magic number
    height: dot ? '6px' : '14px',    // Magic number
    top: '-3px',                      // Magic number
    right: '-3px',                    // Magic number
  },
  // ...
};

// Better - use tokens
const sizeStyles = {
  xs: {
    minWidth: dot ? tokens.spacing.xs : '0.875rem',
    height: dot ? tokens.spacing.xs : '0.875rem',
    // ...
  },
};
```

**Recommendations:**
1. Replace `'#ffffff'` with token reference
2. Define size constants for badge dimensions
3. Use tokens for positioning offsets

---

## 4. Features (Score: 5/10)

### Feature Comparison

| Feature | shadcn/ui | liquid-render | Notes |
|---------|-----------|---------------|-------|
| Variants | 4 (default, secondary, destructive, outline) | 0 | Uses color prop instead |
| Size variants | None (single size) | 3 (xs, sm, md) | liquid-render is better |
| Dot mode | No | Yes | Unique feature |
| Max value | No | Yes (`99+` formatting) | Unique feature |
| Pulse animation | No | Yes | Unique feature |
| Auto-hide for 0 | No | Yes | Unique feature |
| Link support | Yes (asChild) | No | Missing |
| Icon support | Yes (gap, svg sizing) | No | Missing |
| Hover states | Yes | No | Missing |
| Transition | Yes | Partial (pulse only) | Missing hover/focus |

**Unique liquid-render Features:**
```tsx
// Max value formatting
function formatBadgeValue(value, max) {
  if (value > max) return `${max}+`;  // Shows "99+" for >99
}

// Dot-only mode
<Badge dot />  // Small indicator dot

// Pulse animation on value change
useEffect(() => {
  if (prevValueRef.current !== value) {
    setShouldPulse(true);  // Animates on update
  }
}, [value]);

// Auto-hide for zero/empty
if (!shouldShowBadge(value, dot)) {
  return <></>;
}
```

**Missing from shadcn/ui:**
```tsx
// shadcn has icon support with proper sizing
"[&>svg]:size-3 gap-1 [&>svg]:pointer-events-none"

// shadcn has hover states for link badges
"[a&]:hover:bg-primary/90"

// shadcn has outline variant
variant: "outline" // text-foreground with border
```

**Recommendations:**
1. Add semantic variants (default, secondary, destructive, outline)
2. Add icon support with proper sizing
3. Add hover states for interactive badges

---

## 5. Testing (Score: 8/10)

### Test Coverage

**Test file exists:** `/Users/agutierrez/Desktop/liquidrender/packages/liquid-render/tests/badge.test.ts`

**Test Categories:**
- Basic syntax parsing (4 tests)
- Badge placement (3 tests)
- Color variants (3 tests)
- Complex patterns (3 tests)
- Real-world contexts (4 tests)
- Roundtrip tests (5 tests)
- Edge cases (3 tests)
- Error handling (2 tests)
- Value formatting (3 tests)
- Real-world examples (4 tests)

**Total: ~34 tests**

**Well Covered:**
- DSL parsing (`Bg :count`, `Bg "New"`)
- Color modifiers (`#red`, `#blue`)
- Size modifiers (`%sm`, `%lg`)
- Nested badges (`Ic "bell" [Bg :count]`)
- Roundtrip compilation
- Edge cases (whitespace, special chars)

**Missing Tests:**
- Render output testing (component actually renders)
- Accessibility testing (ARIA, roles)
- Pulse animation behavior
- Auto-hide logic
- StaticBadge component
- Max value formatting (`99+`)
- Browser environment check

**Example of Good Test:**
```ts
it('should parse notification bell example', () => {
  const input = 'Ic "bell" [Bg :notifications]';
  const schema = parseUI(input);
  const icon = schema.layers[0].root;
  const badge = icon.children![0];

  expect(icon.type).toBe('icon');
  expect(badge.type).toBe('badge');
  expect(badge.binding?.value).toBe('notifications');
});
```

**Missing Render Test Example:**
```tsx
// Should add tests like:
it('should render badge with correct styles', () => {
  render(<Badge block={mockBlock} data={{ count: 5 }} />);
  const badge = screen.getByTestId('badge');
  expect(badge).toHaveStyle({ backgroundColor: expect.any(String) });
});

it('should hide badge when value is 0', () => {
  render(<Badge block={mockBlock} data={{ count: 0 }} />);
  expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
});
```

---

## Scoring Summary

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Accessibility | 4/10 | No ARIA, no focus states, no role attributes |
| API Design | 5/10 | Different paradigm (notification vs status), no variants |
| Design Tokens | 7/10 | Good token usage but some hardcoded values |
| Features | 5/10 | Unique features but missing variants, icons, hover |
| Testing | 8/10 | Comprehensive parsing tests, missing render tests |
| **Total** | **29/50** | |

---

## Priority Improvements

### P0 - Critical
1. Add `aria-label` for dot-only badges (accessibility violation)
2. Add `role="status"` for screen reader support

### P1 - High
1. Add semantic variants (default, secondary, destructive, outline)
2. Replace hardcoded `#ffffff` with token
3. Add render tests for component behavior

### P2 - Medium
1. Add focus-visible states for interactive badges
2. Add icon support with proper sizing
3. Add asChild pattern for link badges

### P3 - Low
1. Add hover states
2. Consider CSS custom properties over inline styles
3. Add transition tokens for all animations
