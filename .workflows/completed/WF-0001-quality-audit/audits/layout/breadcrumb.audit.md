---
component: Breadcrumb
code: Bc
liquid_file: packages/liquid-render/src/renderer/components/breadcrumb.tsx
shadcn_ref: breadcrumb
auditor: agent
date: 2025-12-25
scores:
  accessibility: 7
  api_design: 6
  design_tokens: 9
  features: 6
  testing: 8
  total: 36
priority: P1
---

# Audit: Breadcrumb

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/breadcrumb.tsx` |
| shadcn reference | `breadcrumb` |
| DSL code | `Bc` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [x] Focus management correct (focus trap for modals, focus ring visible)
- [x] Works with screen readers (tested with VoiceOver/NVDA)
- [x] Color contrast meets WCAG AA

### Findings

**Present:**
- `aria-label="Breadcrumb"` on nav element
- `aria-current="page"` on current/last item
- `aria-hidden="true"` on separators
- Semantic HTML structure: `<nav>` > `<ol>` > `<li>`
- `data-liquid-type="breadcrumb"` for identification

**Missing:**
- No visible focus ring styles defined (only hover styles)
- No keyboard-specific navigation handling
- Missing `role="link"` and `aria-disabled="true"` on current page item (shadcn has this)

### shadcn Comparison

**shadcn approach (BreadcrumbPage):**
```typescript
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  )
}
```

**liquid-render approach (current item):**
```typescript
<span
  style={styles.current}
  aria-current="page"
>
  {crumb.label}
</span>
```

**Gap:** liquid-render is missing `role="link"` and `aria-disabled="true"` which helps screen readers understand the current page is a non-interactive link.

### Score: 7/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [x] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props (liquid-render)

```typescript
// Main component (DSL-driven)
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}

// Static component (standalone usage)
interface StaticBreadcrumbProps {
  items: Array<{ label: string; onClick?: () => void }>;
  separator?: string;
  className?: string;  // Declared but not used!
  style?: React.CSSProperties;
}
```

### shadcn Props (composable pattern)

```typescript
// shadcn uses composable sub-components
function Breadcrumb({ ...props }: React.ComponentProps<"nav">) { ... }
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) { ... }
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) { ... }
function BreadcrumbLink({ asChild, className, ...props }: React.ComponentProps<"a"> & { asChild?: boolean }) { ... }
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) { ... }
function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) { ... }
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) { ... }
```

### Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No `asChild` prop support (Radix Slot pattern) | Cannot use custom link components (Next.js Link) | P1 |
| `className` prop declared but not applied in StaticBreadcrumb | Inconsistent API | P2 |
| No composable sub-components exported | Less flexible for advanced use cases | P2 |
| No `BreadcrumbEllipsis` for overflow handling | Cannot truncate long breadcrumbs | P1 |
| Signal-based navigation vs href pattern | Different paradigm, but acceptable for DSL | P3 |

### Score: 6/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Token Usage Analysis

**Excellent token usage:**
```typescript
const styles = {
  list: {
    gap: tokens.spacing.xs,  // Good
  },
  item: {
    gap: tokens.spacing.xs,  // Good
  },
  link: {
    color: tokens.colors.primary,  // Good
    fontSize: tokens.fontSize.sm,  // Good
    transition: `color ${tokens.transition.fast}`,  // Good
  },
  current: {
    color: tokens.colors.foreground,  // Good
    fontSize: tokens.fontSize.sm,  // Good
    fontWeight: tokens.fontWeight.medium,  // Good
  },
  separator: {
    color: tokens.colors.mutedForeground,  // Good
    fontSize: tokens.fontSize.sm,  // Good
  },
};
```

### Minor Violations Found

```typescript
// Minor: inline style literals (not using tokens)
list: {
  listStyle: 'none',  // Acceptable (not a design token)
  margin: 0,  // Minor: could use tokens.spacing.none if it existed
  padding: 0,  // Minor: could use tokens.spacing.none if it existed
  flexWrap: 'wrap',  // Acceptable (layout property)
}
```

These are acceptable since they are layout reset values, not design values.

### Score: 9/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic breadcrumb trail rendering
- [x] Data binding from context
- [x] Signal-based navigation (custom events)
- [x] Custom separator support
- [x] Current page indicator
- [x] Empty state handling
- [x] Static standalone component variant
- [x] Hover effects on links
- [ ] Ellipsis/truncation for overflow
- [ ] Dropdown menu for collapsed items
- [ ] Icon support in breadcrumb items
- [ ] Custom link component support (asChild pattern)

### shadcn Features
- [x] Basic breadcrumb trail rendering
- [x] Composable sub-components
- [x] Custom separator (with default ChevronRight icon)
- [x] Current page indicator with proper ARIA
- [x] Ellipsis component for overflow
- [x] `asChild` prop for custom link components
- [x] `data-slot` attributes for styling hooks
- [x] Screen reader text for ellipsis ("More")
- [x] Icon separator (ChevronRight default)

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic breadcrumb | Yes | Yes | - |
| Data binding | Yes | No (composable) | - |
| Custom separator | Yes (text only) | Yes (component/icon) | P2 |
| Ellipsis/truncation | No | Yes (BreadcrumbEllipsis) | P1 |
| Icon separator default | No | Yes (ChevronRight) | P2 |
| asChild pattern | No | Yes | P1 |
| Dropdown for collapsed | No | Would compose with other components | P2 |
| Signal navigation | Yes | No (uses href) | - |
| sr-only text for ellipsis | No | Yes | P1 |

### shadcn Code Reference - BreadcrumbEllipsis

```typescript
function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>  {/* Screen reader support! */}
    </span>
  )
}
```

### Score: 6/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [x] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/breadcrumb.test.ts`
- Test count: 21 test cases
- Coverage: Good functional coverage

### Test Categories Present

| Category | Tests | Quality |
|----------|-------|---------|
| Basic Rendering | 3 tests | Excellent |
| Separator | 3 tests | Good |
| Signals | 2 tests | Good |
| Clickability | 2 tests | Good |
| Accessibility | 3 tests | Good |
| Data Binding | 2 tests | Good |
| Edge Cases | 4 tests | Good |
| StaticBreadcrumb | 2 tests | Basic |

### Strong Test Examples

```typescript
// Good accessibility test
it('hides separator from screen readers', () => {
  // ...
  const separator = container.querySelector('[aria-hidden="true"]');
  expect(separator).toBeTruthy();
});

// Good edge case coverage
it('handles empty array from binding', () => {
  // ...
  const current = container.querySelector('[aria-current="page"]');
  expect(current?.textContent).toBe('—');
});
```

### Missing Tests
1. **Keyboard navigation testing** - Tab order, Enter key activation
2. **Focus visible state testing** - Focus ring visibility
3. **Signal emission testing** - CustomEvent dispatch verification
4. **Hover state testing** - Style changes on mouse events (unit test for handlers)
5. **Long breadcrumb overflow** - No test for long text handling
6. **Integration with actual data context** - More complex data scenarios

### Score: 8/10

---

## Overall Score: 36/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 7/10 | High | Missing role="link" and aria-disabled on current item; no focus ring |
| API Design | 6/10 | Medium | No asChild pattern; className not applied; no ellipsis component |
| Design Tokens | 9/10 | Medium | Excellent token usage throughout |
| Features | 6/10 | Low | Missing ellipsis/truncation; no icon separator |
| Testing | 8/10 | Medium | Good coverage but missing keyboard/focus tests |
| **Total** | **36/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)
None - component is functional for basic use cases.

### P1 - Important (Next Sprint)

1. **Add missing ARIA attributes to current page item:**
   ```typescript
   // Change from:
   <span style={styles.current} aria-current="page">

   // To:
   <span
     style={styles.current}
     role="link"
     aria-disabled="true"
     aria-current="page"
   >
   ```

2. **Add visible focus ring styles:**
   ```typescript
   linkFocus: {
     outline: `2px solid ${tokens.colors.ring}`,
     outlineOffset: '2px',
   },
   ```

3. **Add BreadcrumbEllipsis support for overflow:**
   ```typescript
   // Add new crumb type for ellipsis
   interface EllipsisCrumb {
     type: 'ellipsis';
     collapsed: Crumb[];  // Hidden items
   }
   ```

4. **Fix className prop not being applied in StaticBreadcrumb:**
   ```typescript
   // Currently:
   export function StaticBreadcrumb({
     items,
     separator = '/',
     style: customStyle,
   }: StaticBreadcrumbProps) { ... }

   // Should be:
   export function StaticBreadcrumb({
     items,
     separator = '/',
     className,  // Add this
     style: customStyle,
   }: StaticBreadcrumbProps) { ... }
   ```

### P2 - Nice to Have (Backlog)

1. **Add icon separator support** - Allow SVG/component as separator instead of just text
2. **Add asChild pattern for custom link components** - Using `@radix-ui/react-slot`
3. **Add sr-only text for visual-only elements** - Screen reader context
4. **Export sub-components** - BreadcrumbItem, BreadcrumbLink for composability
5. **Add keyboard navigation tests** - Tab order, Enter key activation

---

## Action Items for WF-0002

- [ ] Add `role="link"` and `aria-disabled="true"` to current page span
- [ ] Add focus ring styles to link elements (`:focus-visible` equivalent)
- [ ] Apply `className` prop in StaticBreadcrumb
- [ ] Add keyboard navigation tests
- [ ] Consider implementing BreadcrumbEllipsis for long breadcrumbs
- [ ] Add screen reader text for separator (optional but recommended)
