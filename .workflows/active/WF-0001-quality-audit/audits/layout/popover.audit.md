---
component: Popover
code: Pp
liquid_file: packages/liquid-render/src/renderer/components/popover.tsx
shadcn_ref: popover
auditor: agent
date: 2025-12-25
scores:
  accessibility: 5
  api_design: 5
  design_tokens: 9
  features: 4
  testing: 5
  total: 28
priority: P1
---

# Audit: Popover

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/popover.tsx` |
| shadcn reference | `popover` (via @radix-ui/react-popover) |
| DSL code | `Pp` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (partial)
- [x] Keyboard navigation works (Escape key)
- [ ] Focus management correct (no focus trap, no return focus)
- [ ] Works with screen readers (incorrect role="tooltip")
- [ ] Color contrast meets WCAG AA (uses tokens, should be fine)

### Findings

**liquid-render implementation:**
```typescript
// From popover.tsx lines 106-126
<div data-liquid-type="popover" ref={wrapperRef} style={styles.wrapper}>
  <div
    onClick={toggleOpen}
    style={styles.trigger}
    aria-haspopup="true"
    aria-expanded={isOpen}
    aria-controls={popoverId}
  >
    {children}
  </div>
  {isOpen && (
    <div
      id={popoverId}
      role="tooltip"  // INCORRECT: should be "dialog" for popover
      style={contentStyle}
    >
```

**Issues Found:**
1. **Incorrect ARIA role**: Uses `role="tooltip"` but popovers should use `role="dialog"` since they contain interactive content. Tooltips are for non-interactive, supplementary information.
2. **Missing focus management**: When popover opens, focus should move to the popover content. When closed, focus should return to trigger.
3. **No focus trap**: Interactive content inside popover allows focus to escape.
4. **Trigger is a div with onClick**: Should use a `<button>` element for proper keyboard accessibility (Enter/Space to activate).
5. **Missing `aria-labelledby` or `aria-label`**: Content dialog should have accessible name.

### shadcn Comparison

shadcn uses Radix UI primitives which handle all accessibility automatically:

```typescript
// From shadcn popover.tsx
import * as PopoverPrimitive from "@radix-ui/react-popover"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        // ... rest
      />
    </PopoverPrimitive.Portal>
  )
}
```

**Radix PopoverPrimitive provides:**
- Proper `role="dialog"` on content
- Focus trap inside popover
- Focus returns to trigger on close
- Trigger rendered as button by default
- Proper `aria-expanded`, `aria-haspopup`, `aria-controls`
- Portal rendering to avoid z-index issues

### Score: 5/10

---

## 2. API Design (0-10)

### Checklist
- [x] Props naming matches shadcn patterns (partial - placement vs side/align)
- [ ] Consistent variants across components
- [x] Supports both controlled and uncontrolled modes (StaticPopover has defaultOpen + onOpenChange)
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

```typescript
// Dynamic component (liquid-render)
export function Popover({ block, children }: LiquidComponentProps): React.ReactElement

// Static component (liquid-render)
export interface StaticPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  placement?: PopoverPlacement;  // 'top' | 'bottom' | 'left' | 'right'
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: React.CSSProperties;
}
```

### shadcn Props

```typescript
// shadcn uses Radix primitives with these key props:

// PopoverPrimitive.Root
interface PopoverProps {
  open?: boolean;           // Controlled state
  defaultOpen?: boolean;    // Uncontrolled default
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;          // Whether to render as modal
}

// PopoverPrimitive.Content
interface PopoverContentProps {
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  arrowPadding?: number;
  avoidCollisions?: boolean;
  collisionBoundary?: Element | Element[];
  collisionPadding?: number | Partial<Record<Side, number>>;
  sticky?: 'partial' | 'always';
  hideWhenDetached?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void;
  onFocusOutside?: (event: FocusOutsideEvent) => void;
  onInteractOutside?: (event: PointerDownOutsideEvent | FocusOutsideEvent) => void;
  forceMount?: true;
  // ...many more
}
```

### Gaps

| Prop | liquid-render | shadcn/Radix | Priority |
|------|---------------|--------------|----------|
| `open` (controlled) | Missing | Yes | P1 |
| `modal` | Missing | Yes | P2 |
| `side` + `align` | `placement` (simpler) | Both | P2 |
| `sideOffset` | Fixed margin via CSS | Configurable | P2 |
| `avoidCollisions` | Missing | Yes | P1 |
| `collisionBoundary` | Missing | Yes | P2 |
| `onEscapeKeyDown` | Internal only | Exposed callback | P3 |
| `onPointerDownOutside` | Internal only | Exposed callback | P3 |
| `forceMount` | Missing | Yes | P3 |

**Notable Issues:**
1. No fully controlled mode (`open` prop) - only `defaultOpen` with `onOpenChange`
2. No collision detection - popover can overflow viewport
3. Limited positioning - only 4 placements vs shadcn's 12 (4 sides x 3 alignments)

### Score: 5/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [ ] Uses `tokens.fontSize.*` (no font size usage - acceptable for this component)
- [x] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

```typescript
// Only minor violations found:

// Line 39 - Hardcoded minWidth
minWidth: '12rem',

// Lines 48-55 - Hardcoded arrow dimensions (acceptable for CSS triangle)
width: 0,
height: 0,
borderLeft: '6px solid transparent',
borderRight: '6px solid transparent',
borderBottom: `6px solid ${tokens.colors.border}`,

// Line 38 - Hardcoded z-index
zIndex: 50,
```

**Good Token Usage:**
```typescript
// Lines 31-36 - Proper token usage
marginTop: tokens.spacing.xs,
padding: tokens.spacing.md,
backgroundColor: tokens.colors.card,
border: `1px solid ${tokens.colors.border}`,
borderRadius: tokens.radius.md,
boxShadow: tokens.shadow.md,
```

### Score: 9/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic popover toggle on click
- [x] Click outside to close
- [x] Escape key to close
- [x] 4-direction placement (top, bottom, left, right)
- [x] Arrow/pointer indicator
- [x] Custom styling support
- [x] onOpenChange callback

### shadcn Features
- [x] Basic popover toggle
- [x] Click outside to close
- [x] Escape key to close
- [x] 12-position placement (4 sides x 3 alignments)
- [x] Portal rendering (avoids z-index issues)
- [x] Collision detection and avoidance
- [x] Focus management (trap + return)
- [x] Animation support (enter/exit)
- [x] Controlled + uncontrolled modes
- [x] Modal mode option
- [x] Anchor element support
- [x] Custom offset configuration

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic open/close | Yes | Yes | - |
| Click outside close | Yes | Yes | - |
| Escape key close | Yes | Yes | - |
| Arrow indicator | Yes | No (optional) | - |
| Portal rendering | No | Yes | P1 |
| Collision avoidance | No | Yes | P1 |
| Focus management | No | Yes | P1 |
| Animations | No | Yes | P2 |
| Controlled mode | Partial | Full | P1 |
| Alignment options | No | Yes (start/center/end) | P2 |
| Modal mode | No | Yes | P3 |
| Anchor element | No | Yes | P3 |
| Custom offsets | No | Yes | P2 |

**Key Missing Features:**
1. **Portal rendering**: Without portal, popover can be clipped by overflow:hidden parents
2. **Collision detection**: Popover can render off-screen with no repositioning
3. **Focus management**: Critical for accessibility
4. **Animations**: Expected by modern UI standards

### Score: 4/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (nested popover, trigger-only)
- [ ] Covers error states
- [ ] Accessibility tests
- [x] Roundtrip tests (DSL parsing)

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/popover.test.ts`
- Test count: 10 tests
- Coverage: Parsing/compilation focused

### Test Analysis

```typescript
// Current tests focus on DSL parsing:
describe('Basic Popover Parsing', () => {
  it('should parse popover with trigger and content', () => {
    const input = 'Pp [Bt "Info", Tx "More details"]';
    const schema = parseUI(input);
    // ...
  });
});

describe('Popover Roundtrip', () => {
  it('should roundtrip basic popover', () => {
    const input = 'Pp [Bt "Info", Tx "Details"]';
    const schema = parseUI(input);
    const result = roundtripUI(schema);
    expect(result.isEquivalent).toBe(true);
  });
});
```

### Missing Tests
1. **React rendering tests**: No tests for actual React component behavior
2. **Interaction tests**: Click to open/close, escape key, click outside
3. **Accessibility tests**: ARIA attributes, focus management
4. **Placement tests**: Different `placement` values render correctly
5. **Callback tests**: `onOpenChange` called with correct values
6. **Edge case rendering**: Empty content, very long content, nested popovers

### Score: 5/10

---

## Overall Score: 28/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 5/10 | High | Wrong ARIA role, no focus management |
| API Design | 5/10 | Medium | Missing controlled mode, limited positioning |
| Design Tokens | 9/10 | Medium | Excellent token usage, minor hardcoded values |
| Features | 4/10 | Low | Missing portal, collision detection, animations |
| Testing | 5/10 | Medium | DSL tests only, no React component tests |
| **Total** | **28/50** | | Functional but needs significant improvements |

---

## Recommendations

### P0 - Critical (Blocks Release)
1. **Fix ARIA role**: Change `role="tooltip"` to `role="dialog"` for interactive popover content
2. **Add focus management**: Focus should move to popover on open, return to trigger on close

### P1 - Important (Next Sprint)
1. **Add portal rendering**: Render popover in a portal to avoid z-index and overflow clipping issues
2. **Add collision detection**: Reposition popover when it would overflow viewport
3. **Support fully controlled mode**: Add `open` prop alongside `defaultOpen`
4. **Make trigger accessible**: Use `<button>` element or add `role="button"` + `tabIndex={0}` + keyboard handlers
5. **Add React component tests**: Test actual rendering, interactions, and callbacks

### P2 - Nice to Have (Backlog)
1. **Add alignment options**: Support `align="start" | "center" | "end"` for each side
2. **Add animations**: Entry/exit animations like shadcn
3. **Add modal mode**: Optional focus trap with backdrop
4. **Add custom offset props**: `sideOffset`, `alignOffset` configuration
5. **Consider Radix adoption**: Using @radix-ui/react-popover would solve most issues

---

## Action Items for WF-0002

- [ ] Change `role="tooltip"` to `role="dialog"` with proper `aria-labelledby`
- [ ] Implement focus trap using `@floating-ui/react` or custom focus management
- [ ] Add `open` prop for fully controlled mode
- [ ] Wrap popover content in React portal
- [ ] Convert trigger div to button element
- [ ] Add React component tests for StaticPopover
- [ ] Consider migrating to @radix-ui/react-popover for full accessibility compliance

---

## Code Comparison Summary

### Trigger Implementation

**liquid-render (problematic):**
```typescript
<div
  onClick={toggleOpen}
  style={styles.trigger}
  aria-haspopup="true"
  aria-expanded={isOpen}
  aria-controls={popoverId}
>
  {children}
</div>
```

**shadcn/Radix (accessible):**
```typescript
<PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
// Radix renders an accessible <button> with all proper ARIA
```

### Content Implementation

**liquid-render (basic):**
```typescript
{isOpen && (
  <div
    id={popoverId}
    role="tooltip"  // Wrong role
    style={contentStyle}
  >
    <div style={styles.arrow} />
    {children}
  </div>
)}
```

**shadcn/Radix (full-featured):**
```typescript
<PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
    data-slot="popover-content"
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "bg-popover text-popover-foreground",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2",
      // ... position-aware animations
      "z-50 w-72 rounded-md border p-4 shadow-md outline-hidden",
      className
    )}
    {...props}
  />
</PopoverPrimitive.Portal>
```
