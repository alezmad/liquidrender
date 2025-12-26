---
component: Button
code: Bt
liquid_file: packages/liquid-render/src/renderer/components/button.tsx
shadcn_ref: button
auditor: agent-a3
date: 2025-12-25
scores:
  accessibility: 4
  api_design: 6
  design_tokens: 8
  features: 6
  testing: 0
  total: 24
priority: P1
---

# Audit: Button

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/button.tsx` |
| shadcn reference | `button` |
| DSL code | `Bt` |

---

## 1. Accessibility (0-10)

### Checklist
- [ ] ARIA attributes present and correct
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### Findings

**Critical Issues:**

1. **No focus-visible styles**: The button has `outline: 'none'` in the base styles but provides no alternative focus indicator. This makes keyboard navigation impossible to visually track.

2. **No ARIA attributes**: The dynamic `Button` component lacks:
   - `aria-pressed` for toggle buttons (important since component supports `isActive` state via signals)
   - `aria-disabled` for disabled state
   - No role specification (though `<button>` element is used, which is good)

3. **Disabled state handling in dynamic Button**: The main `Button` component does not support the `disabled` prop at all. Only `StaticButton` handles disabled state.

4. **No keyboard activation handling**: While native `<button>` provides Enter/Space activation, there's no prevention of disabled button activation.

### shadcn Comparison

shadcn button includes:
```tsx
// Focus ring with proper visual feedback
"outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

// Disabled state properly handled
"disabled:pointer-events-none disabled:opacity-50"

// ARIA integration for validation states
"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
```

### Score: 4/10

**Rationale**: Uses semantic `<button>` element (good), but lacks focus indicators, disabled state in dynamic component, and ARIA attributes for toggle state.

---

## 2. API Design (0-10)

### Checklist
- [x] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [x] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

```typescript
// Dynamic Button (via block)
interface LiquidComponentProps {
  block: Block;        // Contains: label, action, style.color, style.size, signals.emit
  data: DataContext;
  children?: ReactNode;
  className?: string;
}

// Static Button
interface StaticButtonProps {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;     // Declared but not used
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';
```

### shadcn Props

```typescript
interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  asChild?: boolean;  // Slot pattern for composition
}
```

### Gaps

1. **Missing `link` variant**: shadcn includes a `link` variant for text-link-styled buttons
2. **Missing `icon` sizes**: No icon-specific sizes (`icon`, `icon-sm`, `icon-lg`)
3. **No `asChild` pattern**: Cannot compose button behavior onto custom elements
4. **`className` prop declared but unused** in `StaticButton`
5. **Dynamic Button lacks disabled support**: The `disabled` prop is only available on `StaticButton`
6. **No `type` prop exposure**: Cannot set `type="submit"` or `type="reset"`

### Score: 6/10

**Rationale**: Good TypeScript types and variant naming consistency. Missing link variant, icon sizes, asChild composition pattern, and className is unused.

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

```typescript
// In button.tsx line 67-68 - hardcoded box-shadow in active state
if (isActive) {
  return mergeStyles(base, {
    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`,  // VIOLATION: hardcoded shadow
    transform: 'translateY(1px)',
  });
}

// In button.tsx line 148 - hardcoded opacity for disabled
disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}  // VIOLATION: hardcoded opacity
```

### Token Usage (Positive Findings)

The component properly delegates to `buttonStyles()` in `utils.ts` which uses tokens correctly:

```typescript
// utils.ts buttonStyles() properly uses:
backgroundColor: tokens.colors.primary,
color: tokens.colors.primaryForeground,
borderRadius: tokens.radius.md,
fontWeight: tokens.fontWeight.medium,
transition: `all ${tokens.transition.fast}`,
fontSize: tokens.fontSize.xs | tokens.fontSize.sm | tokens.fontSize.base
```

### Score: 8/10

**Rationale**: Excellent delegation to `buttonStyles()` utility which uses tokens. Two minor violations for hardcoded box-shadow in active state and hardcoded opacity for disabled.

---

## 4. Features (0-10)

### liquid-render Features
- [x] Default variant
- [x] Destructive variant
- [x] Secondary variant
- [x] Outline variant
- [x] Ghost variant
- [ ] Link variant
- [x] Sizes: sm, md, lg
- [ ] Icon sizes
- [x] Signal emission on click
- [x] Active state visualization (via signals)
- [ ] Loading state
- [ ] Icon support (leading/trailing)
- [x] Static variant for standalone use

### shadcn Features
- [x] Default variant
- [x] Destructive variant
- [x] Secondary variant
- [x] Outline variant
- [x] Ghost variant
- [x] Link variant
- [x] Sizes: default, sm, lg
- [x] Icon sizes: icon, icon-sm, icon-lg
- [x] asChild composition pattern
- [x] Data attributes for variant/size (data-slot, data-variant, data-size)
- [ ] Loading state (not built-in, but easy to compose)

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| link variant | - | Yes | P2 |
| icon sizes | - | Yes | P2 |
| asChild pattern | - | Yes | P1 |
| Loading state | - | - | P2 |
| Leading/trailing icons | - | Partial | P2 |
| Signal emission | Yes | - | - |
| Active state (signal-driven) | Yes | - | - |
| data-variant attribute | - | Yes | P2 |
| data-size attribute | - | Yes | P2 |

### Score: 6/10

**Rationale**: Has core variants and sizes. Unique signal integration is valuable. Missing link variant, icon sizes, asChild composition, and data attributes for styling/testing.

---

## 5. Testing (0-10)

### Checklist
- [ ] Unit tests exist
- [ ] Covers happy path
- [ ] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)

### Current Test Coverage
- Tests file: **none**
- Test count: 0
- Coverage: 0%

### Missing Tests

1. **Rendering tests**:
   - Renders with default variant
   - Renders each variant correctly
   - Renders each size correctly
   - Renders children content
   - Renders label when no children

2. **Interaction tests**:
   - onClick fires when clicked
   - Signal emission works correctly
   - Does not fire when disabled
   - Active state reflects signal state

3. **Accessibility tests**:
   - Has correct role
   - Keyboard activation (Enter, Space)
   - Focus visible
   - Disabled state announced

4. **Edge cases**:
   - Empty label
   - Very long label
   - No action provided
   - Invalid color maps to default

### Score: 0/10

**Rationale**: No test file exists for the button component.

---

## Overall Score: 24/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 4/10 | High | Missing focus styles, ARIA, disabled in dynamic |
| API Design | 6/10 | Medium | Good types, missing link/icon variants |
| Design Tokens | 8/10 | Medium | Excellent token usage via utils |
| Features | 6/10 | Low | Core features present, missing composition |
| Testing | 0/10 | Medium | No tests exist |
| **Total** | **24/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)

1. **Add focus-visible styles**: Replace `outline: 'none'` with proper focus ring styling
   ```typescript
   // In buttonStyles() or component
   ':focus-visible': {
     outline: `2px solid ${tokens.colors.ring}`,
     outlineOffset: '2px',
   }
   ```
   Note: Since inline styles can't handle pseudo-selectors, consider adding a CSS class or using a focus state.

2. **Add disabled support to dynamic Button**: Currently only `StaticButton` supports disabled state
   ```typescript
   // Add to Button component
   const disabled = block.disabled || false;
   ```

### P1 - Important (Next Sprint)

1. **Add ARIA attributes for toggle buttons**: When button has signal emission, add `aria-pressed`
   ```typescript
   aria-pressed={emitSignal?.name ? isActive : undefined}
   ```

2. **Add link variant**: Align with shadcn for text-link-styled buttons

3. **Create button.test.ts**: Minimum test coverage for:
   - All variants render correctly
   - Click handlers fire
   - Signal emission works
   - Disabled state prevents clicks

4. **Add data-variant and data-size attributes**: For consistent styling/testing
   ```typescript
   data-variant={variant}
   data-size={buttonSize}
   ```

### P2 - Nice to Have (Backlog)

1. **Add icon sizes**: `icon`, `icon-sm`, `icon-lg` for icon-only buttons
2. **Add asChild pattern**: Using `@radix-ui/react-slot` for composition
3. **Add loading state support**: Optional loading spinner with disabled interaction
4. **Replace hardcoded values**:
   - `boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'` should use token
   - `opacity: 0.5` for disabled should use token
5. **Use className prop**: Currently declared but not applied in `StaticButton`

---

## Action Items for WF-0002

- [ ] Add focus-visible ring styling (requires CSS class or focus state management)
- [ ] Add `disabled` prop support to dynamic `Button` component
- [ ] Add `aria-pressed` for signal-emitting buttons
- [ ] Add `data-variant` and `data-size` attributes
- [ ] Create `packages/liquid-render/tests/button.test.ts` with basic coverage
- [ ] Add `link` variant to `ButtonVariant` type
- [ ] Replace hardcoded `boxShadow` and `opacity` with design tokens
