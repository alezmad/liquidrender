---
component: Switch
code: Sw
liquid_file: packages/liquid-render/src/renderer/components/switch.tsx
shadcn_ref: switch
auditor: agent
date: 2025-12-25
scores:
  accessibility: 7
  api_design: 6
  design_tokens: 8
  features: 5
  testing: 6
  total: 32
priority: P1
---

# Audit: Switch

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/switch.tsx` |
| shadcn reference | `switch` |
| DSL code | `Sw` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (`role="switch"`, `aria-checked`)
- [x] Keyboard navigation works (Tab works via native checkbox)
- [x] Focus management correct (visually hidden input receives focus)
- [ ] Works with screen readers (partially - uses native checkbox semantics)
- [ ] Color contrast meets WCAG AA (not verified - depends on theme tokens)

### Findings

**Positive:**
- Uses native `<input type="checkbox">` with `role="switch"` which is correct
- Has `aria-checked` attribute that reflects state
- StaticSwitch includes `aria-disabled` attribute
- Uses `htmlFor` to properly associate label with input

**liquid-render implementation:**
```tsx
<input
  id={switchId}
  type="checkbox"
  role="switch"
  checked={isChecked}
  onChange={handleChange}
  style={styles.input}
  aria-checked={isChecked}
/>
```

**Issues:**
1. Main `Switch` component is missing `aria-disabled` when disabled (though it doesn't support disabled prop)
2. No visible focus ring - the input is visually hidden but there's no focus indicator on the track
3. Missing `aria-describedby` for additional help text
4. The visually hidden input technique is correct but no focus styling on the visual elements

### shadcn Comparison

**shadcn implementation:**
```tsx
<SwitchPrimitive.Root
  data-slot="switch"
  className={cn(
    "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {...props}
>
```

shadcn uses:
- Radix primitives for complete accessibility
- `focus-visible:ring-[3px]` for visible focus state
- `disabled:cursor-not-allowed disabled:opacity-50` for disabled states
- `data-[state=checked]` and `data-[state=unchecked]` for state styling

### Score: 7/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

**Dynamic Switch (for LiquidUI renderer):**
```typescript
// Uses LiquidComponentProps interface
export interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}
```

**StaticSwitch (standalone usage):**
```typescript
export interface StaticSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;  // Note: className is defined but never used in JSX
  style?: React.CSSProperties;
}
```

**Unused SwitchProps interface:**
```typescript
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}
```

### shadcn Props
```typescript
// shadcn extends Radix Switch primitives
React.ComponentProps<typeof SwitchPrimitive.Root>

// Which includes:
interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  required?: boolean;
  onCheckedChange?(checked: boolean): void;
  disabled?: boolean;
  value?: string;
  name?: string;
  // Plus all standard HTML button attributes
}
```

### Gaps

1. **Missing `defaultChecked`** - No uncontrolled mode support
2. **Missing `name` and `value`** - Cannot be used in native forms
3. **Missing `required`** - No form validation integration
4. **Missing `onCheckedChange`** - Using `onChange` which is non-standard for a switch
5. **`className` prop defined but not used** in StaticSwitch
6. **Missing `asChild`** - Cannot compose with other elements
7. **Duplicate interfaces** - `SwitchProps` is defined but never used
8. **Main Switch lacks `disabled` prop** - Only StaticSwitch supports it

### Score: 6/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [ ] Uses `tokens.spacing.*` (some hardcoded px values)
- [x] Uses `tokens.radius.*` (uses tokens.radius.full)
- [x] Uses `tokens.fontSize.*` (uses tokens.fontSize.sm)
- [x] Uses `tokens.shadow.*` (uses tokens.shadow.sm)

### Violations Found

```typescript
// Hardcoded dimensions (could use tokens.spacing)
track: {
  width: '2.75rem', // 44px - should be a token
  height: '1.5rem', // 24px - should be a token
}

thumb: {
  top: '2px',      // Hardcoded
  left: '2px',     // Hardcoded
  width: '1rem',   // Could be tokens.spacing.md
  height: '1rem',  // Could be tokens.spacing.md
}

thumbChecked: {
  transform: 'translateX(1.25rem)', // 20px - hardcoded calc
}

// Hardcoded opacity
wrapperDisabled: {
  opacity: 0.5,  // Should be a token like tokens.opacity.disabled
}
```

### Positive Token Usage

```typescript
// Colors - all using tokens
backgroundColor: tokens.colors.input,
borderRadius: tokens.radius.full,
transition: `background-color ${tokens.transition.normal}`,
border: `2px solid ${tokens.colors.border}`,
backgroundColor: tokens.colors.primary,
boxShadow: tokens.shadow.sm,
fontSize: tokens.fontSize.sm,
color: tokens.colors.foreground,
fontWeight: tokens.fontWeight.medium,
gap: tokens.spacing.sm,
```

### Score: 8/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic toggle on/off
- [x] Label text
- [x] Binding to data fields
- [x] Signal emission on change
- [x] Signal receive for visibility
- [x] Disabled state (StaticSwitch only)
- [ ] Size variants
- [ ] Color variants
- [ ] Loading state
- [ ] Required indicator
- [ ] Error state
- [ ] Form integration (name, value)
- [ ] Uncontrolled mode

### shadcn Features
- [x] Basic toggle on/off
- [x] Controlled mode (checked, onCheckedChange)
- [x] Uncontrolled mode (defaultChecked)
- [x] Disabled state
- [x] Focus visible ring
- [x] Form integration (name, value)
- [x] Required attribute
- [x] Dark mode support
- [x] Composable with asChild
- [x] Full Radix accessibility primitives
- [ ] Size variants (not built-in, but easily added)
- [ ] Color variants (not built-in, but easily added)

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Toggle on/off | Yes | Yes | - |
| Label | Yes | External | - |
| Disabled | StaticSwitch only | Yes | P1 |
| Focus ring | No | Yes | P0 |
| Form integration | No | Yes | P1 |
| Uncontrolled mode | No | Yes | P2 |
| Required | No | Yes | P2 |
| Dark mode | Via tokens | Built-in | - |
| Loading state | No | No | P3 |
| Size variants | No | No | P2 |

### Score: 5/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (nested bindings, literal bindings)
- [ ] Covers error states
- [ ] Accessibility tests
- [ ] Render/interaction tests
- [ ] Tests for StaticSwitch

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/switch.test.ts`
- Test count: 7 tests in 4 describe blocks
- Coverage: DSL parsing only

### Test Summary

**What is tested:**
```typescript
// Basic parsing
it('should parse a simple switch with label')
it('should parse switch without label')
it('should parse switch with signal emission')

// Container usage
it('should parse multiple switches in a container')

// Edge cases
it('should handle switch with nested field binding')
it('should handle switch with literal binding')

// Layer visibility
it('should parse switch with signal-based visibility')
```

**What is NOT tested:**
1. React component rendering (Switch/StaticSwitch)
2. Toggle interaction and state changes
3. onChange callback behavior
4. Disabled state behavior
5. Keyboard navigation
6. Focus management
7. ARIA attribute correctness in DOM
8. Signal emission behavior
9. Data binding resolution
10. Style application

### Missing Tests

1. **Render tests** - No tests verify the component actually renders correctly
2. **Interaction tests** - No tests for clicking/toggling behavior
3. **StaticSwitch** - No tests at all for the standalone component
4. **Accessibility tests** - Should verify ARIA attributes and keyboard nav
5. **Integration tests** - Component within LiquidUI context

### Score: 6/10

---

## Overall Score: 32/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 7/10 | High | Missing focus ring, has good ARIA basics |
| API Design | 6/10 | Medium | Props inconsistencies, unused interfaces |
| Design Tokens | 8/10 | Medium | Good usage, minor hardcoded values |
| Features | 5/10 | Low | Missing form integration, disabled on main |
| Testing | 6/10 | Medium | Only DSL parsing tested, no render tests |
| **Total** | **32/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)

1. **Add visible focus ring**: Currently focus state is invisible. Users cannot see when the switch has focus.
   ```typescript
   // Add focus styles to track
   trackFocused: {
     outline: `2px solid ${tokens.colors.ring}`,
     outlineOffset: '2px',
   }
   ```

2. **Add disabled prop to main Switch**: The dynamic Switch component cannot be disabled, only StaticSwitch can.

### P1 - Important (Next Sprint)

1. **Fix className prop**: `className` is in StaticSwitchProps but never applied to the component.
   ```typescript
   // Current - className not used
   export function StaticSwitch({
     className,  // Unused!
     ...
   })
   ```

2. **Add form integration props**: Add `name`, `value`, and `required` props for form usage.

3. **Remove unused SwitchProps interface**: Clean up dead code.

4. **Add render tests**: Test that components render and behave correctly, not just DSL parsing.

### P2 - Nice to Have (Backlog)

1. **Support uncontrolled mode**: Add `defaultChecked` prop for simpler usage.

2. **Add size variants**: Consider `sm`, `md`, `lg` sizes to match other form components.

3. **Replace hardcoded dimensions**: Move track/thumb dimensions to design tokens.

4. **Add loading state**: For async operations that affect the switch state.

5. **Consider Radix primitives**: For complete accessibility compliance, consider wrapping Radix Switch like shadcn does.

---

## Action Items for WF-0002

- [ ] Add focus-visible styling to track element
- [ ] Add `disabled` prop to main Switch component
- [ ] Apply `className` prop in StaticSwitch JSX
- [ ] Remove unused `SwitchProps` interface
- [ ] Add form props: `name`, `value`, `required`
- [ ] Create render tests for Switch and StaticSwitch
- [ ] Create accessibility tests (ARIA, keyboard nav)
- [ ] Move hardcoded dimensions to design tokens
- [ ] Add `defaultChecked` for uncontrolled mode

---

## Code Comparison Summary

### shadcn Switch (using Radix)
```tsx
<SwitchPrimitive.Root
  data-slot="switch"
  className={cn(
    "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {...props}
>
  <SwitchPrimitive.Thumb
    data-slot="switch-thumb"
    className={cn(
      "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
    )}
  />
</SwitchPrimitive.Root>
```

### liquid-render Switch (custom implementation)
```tsx
<label
  data-liquid-type="switch"
  htmlFor={switchId}
  style={wrapperStyle}
>
  <input
    id={switchId}
    type="checkbox"
    role="switch"
    checked={isChecked}
    onChange={handleChange}
    style={styles.input}
    aria-checked={isChecked}
  />
  <span style={trackStyle}>
    <span style={thumbStyle} />
  </span>
  {label && <span style={styles.label}>{label}</span>}
</label>
```

**Key Architectural Differences:**
1. shadcn uses Radix primitives; liquid-render uses native checkbox
2. shadcn uses Tailwind classes; liquid-render uses inline styles with tokens
3. shadcn has built-in focus-visible; liquid-render lacks focus styling
4. shadcn uses data attributes for state; liquid-render uses inline style merging
5. liquid-render includes label inside component; shadcn expects external label
