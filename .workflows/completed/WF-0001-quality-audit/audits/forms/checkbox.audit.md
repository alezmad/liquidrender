---
component: Checkbox
code: Ck
liquid_file: packages/liquid-render/src/renderer/components/checkbox.tsx
shadcn_ref: checkbox
auditor: agent
date: 2025-12-25
scores:
  accessibility: 6
  api_design: 7
  design_tokens: 9
  features: 6
  testing: 5
  total: 33
priority: P1
---

# Audit: Checkbox

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/checkbox.tsx` |
| shadcn reference | `checkbox` |
| DSL code | `Ck` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (`aria-checked`, `aria-invalid`, `aria-describedby`)
- [x] Keyboard navigation works (Space, Enter supported)
- [ ] Focus management correct (focus ring not consistently visible via CSS)
- [ ] Works with screen readers (missing `role` attribute on custom visual)
- [ ] Color contrast meets WCAG AA (relies on CSS variables)

### Findings

**Present:**
- Uses `aria-checked={checked}` on the hidden input
- Uses `aria-invalid={hasError}` in StaticCheckbox
- Uses `aria-describedby` to link to error message
- Keyboard handlers for Space and Enter keys
- Generates unique IDs with `generateId('checkbox')`
- Uses `role="alert"` on error messages

**Missing/Issues:**
1. **Focus ring not visible**: The hidden input (`opacity: 0`) receives focus but no visible focus ring is shown on the custom checkmark
2. **Redundant tabIndex on label**: Both the label (`tabIndex={0}`) and hidden input receive focus, causing double focus stops
3. **No `data-state` attribute**: shadcn uses `data-[state=checked]` for styling, liquid-render doesn't expose state via data attributes
4. **SVG icon missing accessible properties**: The CheckIcon SVG lacks `aria-hidden="true"`

### shadcn Comparison

**shadcn checkbox.tsx:**
```tsx
<CheckboxPrimitive.Root
  data-slot="checkbox"
  className={cn(
    "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary
     data-[state=checked]:text-primary-foreground
     focus-visible:border-ring focus-visible:ring-ring/50
     aria-invalid:ring-destructive/20
     disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {...props}
>
  <CheckboxPrimitive.Indicator
    data-slot="checkbox-indicator"
    className="grid place-content-center text-current transition-none"
  >
    <CheckIcon className="size-3.5" />
  </CheckboxPrimitive.Indicator>
</CheckboxPrimitive.Root>
```

shadcn advantages:
- Uses Radix UI primitives which handle all ARIA automatically
- `focus-visible:ring-ring/50` provides visible focus ring
- Uses `data-[state=checked]` for CSS state styling
- `peer` class enables sibling-based styling
- `aria-invalid:ring-destructive/20` for error states via CSS

### Score: 6/10

---

## 2. API Design (0-10)

### Checklist
- [x] Props naming matches shadcn patterns (checked, disabled, etc.)
- [ ] Consistent variants across components (no variant prop)
- [x] Supports both controlled and uncontrolled modes (StaticCheckbox only)
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

**Block-based Checkbox (LiquidComponentProps):**
```typescript
export function Checkbox({ block, data }: LiquidComponentProps): React.ReactElement
// Internal state derived from: block.binding, block.label, block.signals
```

**StaticCheckbox (CheckboxProps):**
```typescript
export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
  id?: string;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  style?: React.CSSProperties;
}
```

### shadcn Props

```typescript
// shadcn extends Radix UI CheckboxPrimitive.Root props:
React.ComponentProps<typeof CheckboxPrimitive.Root>

// Radix props include:
interface CheckboxProps {
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  // Plus all standard HTML attributes via ComponentProps
}
```

### Gaps

| Prop | liquid-render | shadcn | Notes |
|------|---------------|--------|-------|
| `checked` | `boolean` | `boolean \| 'indeterminate'` | Missing indeterminate support |
| `onChange` | `(checked: boolean) => void` | Uses `onCheckedChange` | Different naming |
| `required` | Missing | Present | Form validation support |
| `name` | Missing | Present | Form submission support |
| `value` | Missing | Present | Form value support |
| `className` | Missing | Present | Custom CSS class support |
| `asChild` | Missing | Present | Radix composition pattern |
| `ref` | Missing | Present | Not using forwardRef |

**Missing Critical Features:**
1. **No `ref` forwarding** - Can't access underlying input imperatively
2. **No `name`/`value` props** - Can't use in standard HTML forms
3. **No `required` prop** - No native form validation
4. **No `indeterminate` state** - Can't show partial selection

### Score: 7/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (N/A - no shadows used)

### Violations Found

```typescript
// Line 30-34: Hardcoded pixel values for box sizes
const sizeConfig: Record<CheckboxSize, { box: number; fontSize: string }> = {
  sm: { box: 16, fontSize: tokens.fontSize.xs },  // 16 is hardcoded
  md: { box: 20, fontSize: tokens.fontSize.md },  // 20 is hardcoded
  lg: { box: 24, fontSize: tokens.fontSize.base }, // 24 is hardcoded
};

// Line 81: Border width hardcoded
border: `2px solid ${...}` // 2px is hardcoded

// Line 114-115: SVG attributes hardcoded
strokeWidth="3"
```

**Token Usage Analysis:**
- Colors: All use `tokens.colors.*` - GOOD
- Spacing: Uses `tokens.spacing.*` for gaps - GOOD
- Radius: Uses `tokens.radius.sm` - GOOD
- Font sizes: Uses `tokens.fontSize.*` - GOOD
- Transitions: Uses `tokens.transition.fast` - GOOD

The hardcoded values (16, 20, 24 for box sizes) are intentional sizing for the checkbox box itself, not spacing violations. These are appropriate design decisions.

### Score: 9/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Checked state management
- [x] Disabled state
- [x] Label support
- [x] Error state with message display
- [x] Three size variants (sm, md, lg)
- [x] Controlled/uncontrolled modes (StaticCheckbox)
- [x] Signal emission on change
- [x] Data binding from context
- [x] Custom styling via `style` prop
- [ ] Indeterminate state
- [ ] Form integration (name, value, required)
- [ ] Forward ref

### shadcn Features
- [x] Checked state management
- [x] Disabled state
- [ ] Built-in label (uses separate Label component)
- [x] Indeterminate state
- [x] Form integration (name, value, required)
- [x] Forward ref
- [x] CSS variable theming
- [x] data-state attributes for CSS styling
- [x] Focus visible ring
- [x] Composable via asChild

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic checked/unchecked | Yes | Yes | - |
| Disabled state | Yes | Yes | - |
| Indeterminate state | No | Yes | P1 |
| Form integration (name/value) | No | Yes | P1 |
| forwardRef | No | Yes | P1 |
| Built-in label | Yes | No (separate) | - |
| Size variants | Yes (3) | No (fixed) | - |
| Error state display | Yes | No (external) | - |
| Signal emission | Yes | No | - |
| Data binding | Yes | No | - |
| data-state attribute | No | Yes | P2 |
| asChild pattern | No | Yes | P2 |

**liquid-render Unique Strengths:**
- Built-in label rendering
- Size variants (sm/md/lg)
- Error message display
- DSL signal integration
- Data context binding

**shadcn Advantages:**
- Radix UI accessibility primitives
- Indeterminate state for tree selections
- Standard form element behavior
- Better composability

### Score: 6/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path (parsing, roundtrip)
- [x] Covers edge cases (checkbox without label)
- [ ] Covers error states
- [ ] Accessibility tests
- [ ] Component render tests (only DSL parsing)
- [ ] Interaction tests (click, keyboard)

### Current Test Coverage

- Tests file: `packages/liquid-render/tests/checkbox.test.ts`
- Test count: 9 tests
- Coverage: DSL parsing only (no React component testing)

### Test Categories Present

| Category | Count | Description |
|----------|-------|-------------|
| Basic Parsing | 3 | Parse checkbox with/without label, with signals |
| Roundtrip | 3 | Verify parse-emit equivalence |
| Multiple Checkboxes | 2 | Parse/roundtrip array of checkboxes |
| Container Context | 2 | Checkbox inside containers |

### Missing Tests

**Component Render Tests (missing entirely):**
```typescript
// Not tested:
- StaticCheckbox rendering with various props
- Controlled vs uncontrolled behavior
- disabled prop behavior
- error prop display
- size variants (sm, md, lg)
- Focus/blur behavior
```

**Interaction Tests (missing entirely):**
```typescript
// Not tested:
- Click to toggle
- Keyboard navigation (Space, Enter)
- onChange callback invocation
- Signal emission on change
```

**Accessibility Tests (missing entirely):**
```typescript
// Not tested:
- aria-checked updates
- aria-invalid with error prop
- aria-describedby links to error
- Screen reader announcements
```

### Score: 5/10

---

## Overall Score: 33/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 6/10 | High | Missing focus ring, double focus stop |
| API Design | 7/10 | Medium | Missing indeterminate, form props, ref |
| Design Tokens | 9/10 | Medium | Excellent token usage |
| Features | 6/10 | Low | Missing indeterminate, form integration |
| Testing | 5/10 | Medium | Only DSL parsing, no React/a11y tests |
| **Total** | **33/50** | | P1 - Important improvements needed |

---

## Recommendations

### P0 - Critical (Blocks Release)

None - component is functional for basic use cases.

### P1 - Important (Next Sprint)

1. **Fix double focus stop**: Remove `tabIndex={0}` from label, let the hidden input handle focus
   ```typescript
   // Current:
   <label tabIndex={0} onKeyDown={handleKeyDown}>

   // Recommended:
   <label>
     <input onKeyDown={handleKeyDown} />
   </label>
   ```

2. **Add visible focus ring**: Style the custom checkmark when input is focused
   ```typescript
   checkmark: (checked: boolean, focused: boolean) => ({
     // Add:
     boxShadow: focused ? `0 0 0 2px ${tokens.colors.ring}` : undefined,
   })
   ```

3. **Add forwardRef support**: Allow parent components to access the input
   ```typescript
   export const StaticCheckbox = React.forwardRef<HTMLInputElement, CheckboxProps>(...)
   ```

4. **Add form integration props**: `name`, `value`, `required`
   ```typescript
   interface CheckboxProps {
     // Add:
     name?: string;
     value?: string;
     required?: boolean;
   }
   ```

5. **Add indeterminate state**: Support partial selection in tree structures
   ```typescript
   checked?: boolean | 'indeterminate';
   ```

### P2 - Nice to Have (Backlog)

1. **Add data-state attribute**: Enable CSS-based state styling
   ```typescript
   <span data-state={checked ? 'checked' : 'unchecked'} style={styles.checkmark(...)}>
   ```

2. **Add SVG aria-hidden**: Hide decorative icon from screen readers
   ```typescript
   <svg aria-hidden="true" viewBox="0 0 24 24">
   ```

3. **Add component render tests**: Test StaticCheckbox with React Testing Library

4. **Add accessibility tests**: Test ARIA attributes and keyboard navigation

5. **Align callback naming**: Consider `onCheckedChange` to match Radix pattern

---

## Action Items for WF-0002

- [ ] Remove tabIndex from label element to fix double focus
- [ ] Add focus ring styling to checkmark when input is focused
- [ ] Implement forwardRef on StaticCheckbox
- [ ] Add name, value, required props for form integration
- [ ] Add indeterminate state support
- [ ] Add React component tests with @testing-library/react
- [ ] Add accessibility tests for ARIA attributes
- [ ] Add aria-hidden to decorative SVG icon

---

## Code Comparison Snippets

### Focus Ring Handling

**liquid-render (missing):**
```typescript
// checkbox.tsx lines 66-73
input: {
  position: 'absolute',
  width: '100%',
  height: '100%',
  opacity: 0,  // Hidden, no visible focus indicator
  cursor: 'inherit',
  margin: 0,
} as React.CSSProperties,
```

**shadcn (present):**
```tsx
// Focus ring via Tailwind classes
"focus-visible:border-ring focus-visible:ring-ring/50
 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40
 ... focus-visible:ring-[3px]"
```

### Indeterminate State

**liquid-render (not supported):**
```typescript
// checkbox.tsx line 13
checked?: boolean;  // Only boolean, no indeterminate
```

**shadcn/Radix (supported):**
```typescript
// From Radix types
checked?: boolean | 'indeterminate';
onCheckedChange?: (checked: boolean | 'indeterminate') => void;
```

### Component Architecture

**liquid-render (custom implementation):**
```typescript
// Uses hidden native input + styled span overlay
<span style={styles.inputWrapper(size)}>
  <input type="checkbox" style={styles.input} /> {/* hidden */}
  <span style={styles.checkmark(checked, hasError, size)}>
    {checked && <CheckIcon size={size} />}
  </span>
</span>
```

**shadcn (Radix primitives):**
```tsx
// Uses Radix compound component with built-in accessibility
<CheckboxPrimitive.Root {...props}>
  <CheckboxPrimitive.Indicator>
    <CheckIcon className="size-3.5" />
  </CheckboxPrimitive.Indicator>
</CheckboxPrimitive.Root>
```
