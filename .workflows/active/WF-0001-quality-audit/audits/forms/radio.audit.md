---
component: Radio
code: Rd
liquid_file: packages/liquid-render/src/renderer/components/radio.tsx
shadcn_ref: radio-group
auditor: agent
date: 2025-12-25
scores:
  accessibility: 3
  api_design: 5
  design_tokens: 7
  features: 4
  testing: 4
  total: 23
priority: P1
---

# Audit: Radio

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/radio.tsx` |
| shadcn reference | `radio-group` |
| DSL code | `Rd` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (uses fieldset/legend)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### Findings

**Critical Issues:**

1. **Uses native HTML radio inputs instead of Radix**: The component uses native `<input type="radio">` elements instead of Radix UI's `RadioGroupPrimitive` which provides built-in keyboard navigation (arrow keys to move between options), focus management, and ARIA compliance.

2. **No focus-visible styling**: The input styling lacks focus ring indicators. While native radio buttons have some browser defaults, there's no custom focus-visible styling:
   ```typescript
   // Current implementation (radio.tsx line 49-55)
   input: {
     width: '1rem',
     height: '1rem',
     margin: 0,
     accentColor: tokens.colors.primary,
     cursor: 'pointer',
   } as React.CSSProperties,
   ```

3. **No disabled state styling for individual options**: The dynamic `Radio` component completely ignores the disabled state. Options cannot be individually disabled.

4. **Missing ARIA attributes**:
   - No `aria-describedby` for error messages or help text
   - No `aria-invalid` for validation states
   - No `aria-required` for required fields

5. **Good: Uses semantic fieldset/legend**: The component correctly uses `<fieldset>` with `<legend>` for grouping, which is proper semantic HTML for radio groups.

### shadcn Comparison

shadcn radio-group uses Radix primitives with comprehensive accessibility:

```tsx
// shadcn radio-group.tsx
function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // Focus management with visible ring
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // Validation state support
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Proper disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}
```

**Key shadcn accessibility features missing in liquid-render:**
- Radix-based keyboard navigation (arrow keys between options)
- `focus-visible:ring-[3px]` for clear focus indicators
- `aria-invalid` support for validation states
- `disabled:opacity-50 disabled:cursor-not-allowed` for disabled state

### Score: 3/10

**Rationale**: Uses semantic fieldset/legend structure (good), but lacks Radix-based keyboard navigation, focus ring styling, disabled state support in dynamic component, and ARIA attributes for validation. Native radio inputs provide some accessibility but not the full Radix-level support.

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

```typescript
// Dynamic Radio (via block) - radio.tsx line 68
interface LiquidComponentProps {
  block: Block;        // Contains: binding, label, children (options), signals.emit
  data: DataContext;
  children?: ReactNode;
  className?: string;
}

// RadioOption interface - radio.tsx line 12-15
interface RadioOption {
  value: string;
  label: string;
}

// Static Radio - radio.tsx line 126-134
interface StaticRadioProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;      // Group-level only
  style?: React.CSSProperties;
}
```

### shadcn Props

```typescript
// RadioGroup - extends Radix Root
interface RadioGroupProps extends React.ComponentProps<typeof RadioGroupPrimitive.Root> {
  // Inherits: value, defaultValue, onValueChange, disabled, required, name, orientation, dir, loop
  className?: string;
}

// RadioGroupItem - extends Radix Item
interface RadioGroupItemProps extends React.ComponentProps<typeof RadioGroupPrimitive.Item> {
  // Inherits: value, disabled, required, id
  className?: string;
}
```

### Gaps

1. **No orientation prop**: Cannot set horizontal vs vertical layout (shadcn/Radix supports `orientation`)
2. **No loop prop**: Cannot control whether arrow keys loop around (Radix supports `loop`)
3. **No required prop**: Cannot mark the group as required for form validation
4. **No individual option disabled**: `StaticRadio` only supports group-level disabled, not per-option
5. **No defaultValue support**: Cannot set initial value in uncontrolled mode
6. **No dir prop**: Cannot set RTL direction
7. **Options defined inline rather than as children**: Different composition pattern than shadcn

   **liquid-render pattern:**
   ```tsx
   <StaticRadio
     options={[{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }]}
     value={value}
     onChange={setValue}
   />
   ```

   **shadcn pattern (more flexible):**
   ```tsx
   <RadioGroup value={value} onValueChange={setValue}>
     <RadioGroupItem value="m" id="m" />
     <Label htmlFor="m">Male</Label>
     <RadioGroupItem value="f" id="f" />
     <Label htmlFor="f">Female</Label>
   </RadioGroup>
   ```

8. **No className prop support**: `StaticRadio` doesn't support className for styling

### Score: 5/10

**Rationale**: Basic TypeScript types are exported and work. Missing orientation, loop, required, defaultValue props. Options-as-array pattern is less flexible than shadcn's children composition. No per-option disabled support.

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [ ] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Token Usage (Positive)

```typescript
// radio.tsx - Good token usage examples

// Legend styling (lines 29-34)
legend: {
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.medium,
  color: tokens.colors.foreground,
  marginBottom: tokens.spacing.sm,
  padding: 0,
} as React.CSSProperties,

// Options container (lines 36-40)
optionsContainer: {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: tokens.spacing.sm,
} as React.CSSProperties,

// Option row (lines 42-47)
option: {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing.sm,
  cursor: 'pointer',
} as React.CSSProperties,

// Label styling (lines 56-60)
label: {
  fontSize: tokens.fontSize.sm,
  color: tokens.colors.foreground,
  cursor: 'pointer',
} as React.CSSProperties,
```

### Violations Found

```typescript
// radio.tsx line 49-55 - hardcoded dimension
input: {
  width: '1rem',      // VIOLATION: should use tokens.spacing or dedicated size token
  height: '1rem',     // VIOLATION: should use tokens.spacing or dedicated size token
  margin: 0,
  accentColor: tokens.colors.primary,
  cursor: 'pointer',
} as React.CSSProperties,
```

**Note**: The `1rem` values could be considered acceptable as they represent a standard touch target size, but for consistency with the design system, these should reference tokens (e.g., `tokens.spacing.md` for 1rem).

### Score: 7/10

**Rationale**: Excellent token usage for colors, typography, and spacing throughout the component. Minor violation for hardcoded radio button dimensions. No shadow or radius tokens needed for this component (native radio styling).

---

## 4. Features (0-10)

### liquid-render Features
- [x] Radio group with label (via legend)
- [x] Options rendering
- [x] Value binding
- [x] Signal emission on change
- [x] Static variant for standalone use
- [ ] Disabled state (static only, group-level)
- [ ] Individual option disabled
- [ ] Required field
- [ ] Error/validation states
- [ ] Horizontal/vertical orientation
- [ ] Custom radio indicator
- [ ] Description text per option

### shadcn Features
- [x] Radio group with value/onChange
- [x] Options as composable children
- [x] Value binding (controlled/uncontrolled)
- [x] Disabled state (group and individual)
- [x] Required field
- [x] Custom radio indicator (CircleIcon)
- [x] Validation states (aria-invalid)
- [x] Orientation support
- [x] RTL direction support
- [x] Keyboard navigation (arrow keys)
- [x] Loop navigation option
- [x] Focus visible styles
- [x] data-slot attributes for styling

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic radio group | Yes | Yes | - |
| Signal emission | Yes | - | - |
| Fieldset/legend semantics | Yes | - | - |
| Radix primitives | - | Yes | P1 |
| Arrow key navigation | - | Yes | P1 |
| Focus visible ring | - | Yes | P0 |
| Individual option disabled | - | Yes | P1 |
| Validation states | - | Yes | P1 |
| Orientation prop | - | Yes | P2 |
| Custom indicator icon | - | Yes | P2 |
| data-slot attributes | - | Yes | P2 |
| Required field | - | Yes | P2 |
| Uncontrolled mode | - | Yes | P2 |

### Score: 4/10

**Rationale**: Has basic radio functionality with unique signal integration. Missing critical Radix-based features: keyboard navigation, focus management, individual disabled, validation states. The native radio approach provides less customization than shadcn's Radix-based implementation.

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [ ] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)

### Current Test Coverage

- Tests file: `packages/liquid-render/tests/radio.test.ts`
- Test count: 4 tests in 3 describe blocks
- Coverage: ~30% (parsing/roundtrip only)

### Existing Tests

```typescript
// radio.test.ts - Current tests (parsing focused)

describe('Basic Radio Parsing', () => {
  it('should parse radio with options', () => {
    const input = 'Rd :user.gender "Gender" [opt "m" "Male", opt "f" "Female"]';
    const schema = parseUI(input);
    // Tests: block.type, block.label, block.binding, block.children.length
  });

  it('should parse radio options correctly', () => {
    const input = 'Rd :status "Status" [opt "active" "Active", ...]';
    // Tests: children count, option type, binding kind
  });
});

describe('Radio with Signals', () => {
  it('should parse radio with emit signal', () => {
    const input = 'sig changed\nRd :role "Role" >changed [...]';
    // Tests: signals.emit.name
  });
});

describe('Radio Roundtrip', () => {
  it('should roundtrip radio with options', () => {
    // Tests: isEquivalent after roundtrip
  });
});
```

### Missing Tests

1. **Component rendering tests**:
   - Radio group renders with fieldset/legend
   - All options render correctly
   - Selected option shows checked state
   - Label displays correctly

2. **Interaction tests**:
   - onChange fires with correct value
   - Signal emission on selection change
   - Disabled state prevents selection (StaticRadio)

3. **Accessibility tests**:
   - Fieldset has correct role
   - Legend is associated with group
   - Radio inputs have correct name attribute
   - Keyboard navigation between options

4. **Edge cases**:
   - Empty options array
   - Single option
   - Very long option labels
   - Missing label prop
   - Undefined binding value

5. **Static Radio tests**:
   - Controlled value works
   - onChange callback fires
   - Disabled prop prevents interaction
   - Custom styles applied

### Score: 4/10

**Rationale**: Test file exists with 4 tests covering DSL parsing and roundtrip. No component rendering tests, interaction tests, or accessibility tests. Coverage is parsing-focused, not component-behavior focused.

---

## Overall Score: 23/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 3/10 | High | Uses fieldset/legend but lacks Radix, focus styles, ARIA |
| API Design | 5/10 | Medium | Basic props, missing orientation/disabled/required |
| Design Tokens | 7/10 | Medium | Good token usage, minor hardcoded dimensions |
| Features | 4/10 | Low | Basic features only, missing keyboard nav, validation |
| Testing | 4/10 | Medium | Parsing tests exist, no component tests |
| **Total** | **23/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)

1. **Add focus-visible styling**: Radio inputs need visible focus indicators for keyboard users
   ```typescript
   // Consider adding wrapper with focus-within styling or using Radix
   input: {
     // ... existing styles
     outline: 'none',
   }
   // Add CSS class for focus-visible ring, or migrate to Radix
   ```

2. **Add disabled state to dynamic Radio**: Currently only `StaticRadio` supports disabled
   ```typescript
   // In Radio component
   const disabled = block.disabled || false;
   // Pass to each input
   <input disabled={disabled} ... />
   ```

### P1 - Important (Next Sprint)

1. **Migrate to Radix RadioGroup primitives**: This would solve multiple issues at once
   ```typescript
   import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

   // Use RadioGroupPrimitive.Root, RadioGroupPrimitive.Item, RadioGroupPrimitive.Indicator
   // This provides: keyboard nav, focus management, ARIA, individual disabled
   ```

2. **Add ARIA validation attributes**: Support error states
   ```typescript
   <fieldset aria-invalid={hasError} aria-describedby={errorId}>
   ```

3. **Add individual option disabled support**:
   ```typescript
   interface RadioOption {
     value: string;
     label: string;
     disabled?: boolean;  // Add this
   }
   ```

4. **Add component rendering tests**: Create tests for the React component behavior
   ```typescript
   describe('Radio Component Rendering', () => {
     it('renders fieldset with legend', () => { ... });
     it('renders all options', () => { ... });
     it('shows checked state for selected option', () => { ... });
     it('calls onChange with correct value', () => { ... });
   });
   ```

### P2 - Nice to Have (Backlog)

1. **Add orientation prop**: Support horizontal layout
   ```typescript
   interface StaticRadioProps {
     orientation?: 'horizontal' | 'vertical';
   }
   ```

2. **Add required prop**: For form validation
   ```typescript
   <input required={required} aria-required={required} />
   ```

3. **Replace hardcoded dimensions with tokens**:
   ```typescript
   input: {
     width: tokens.spacing.md,   // 1rem
     height: tokens.spacing.md,  // 1rem
   }
   ```

4. **Add custom indicator support**: Allow custom checked indicator icon (like shadcn's CircleIcon)

5. **Add defaultValue support**: For uncontrolled usage pattern

6. **Add data-slot attributes**: For consistent styling and testing
   ```typescript
   <fieldset data-slot="radio-group" data-liquid-type="radio">
   <input data-slot="radio-group-item" />
   ```

---

## Action Items for WF-0002

- [ ] Add focus-visible styling for radio inputs (P0)
- [ ] Add disabled prop support to dynamic Radio component (P0)
- [ ] Evaluate migration to Radix RadioGroup primitives (P1)
- [ ] Add aria-invalid and aria-describedby support (P1)
- [ ] Add individual option disabled support to RadioOption interface (P1)
- [ ] Create component rendering and interaction tests in radio.test.ts (P1)
- [ ] Add orientation prop for horizontal layout (P2)
- [ ] Replace hardcoded `1rem` dimensions with tokens (P2)
- [ ] Add data-slot attributes for styling consistency (P2)
