---
component: Input
code: In
liquid_file: packages/liquid-render/src/renderer/components/input.tsx
shadcn_ref: input
auditor: claude-agent
date: 2025-12-25
scores:
  accessibility: 6
  api_design: 7
  design_tokens: 9
  features: 6
  testing: 0
  total: 28
priority: P1
---

# Audit: Input

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/input.tsx` |
| shadcn reference | `input` |
| DSL code | `In` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (partial - only on ControlledInput)
- [x] Keyboard navigation works (native input behavior)
- [x] Focus management correct (native focus ring)
- [ ] Works with screen readers (not verified, missing aria-label support)
- [ ] Color contrast meets WCAG AA (uses tokens but not verified)

### Findings

**Positive:**
- The `ControlledInput` component has proper ARIA support:
  - `aria-invalid={hasError}` for error states
  - `aria-describedby` linking to error/hint messages
  - Error messages have `role="alert"` for screen reader announcements
  - Labels properly linked via `htmlFor` and `id`

**Negative:**
- The main `Input` block component (used by LiquidUI) lacks:
  - `aria-invalid` attribute for error states
  - `aria-describedby` for hints/errors
  - No disabled state handling
  - No required field support

**liquid-render ControlledInput (good example):**
```tsx
<input
  ref={ref}
  id={inputId}
  style={mergeStyles(styles.input(size, hasError, hasIcon), inputStyle)}
  aria-invalid={hasError}
  aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
  {...props}
/>
{error && (
  <span id={`${inputId}-error`} style={styles.error} role="alert">
    {error}
  </span>
)}
```

**liquid-render Input block (needs improvement):**
```tsx
<input
  id={inputId}
  type="text"
  value={value}
  onChange={handleChange}
  placeholder={placeholder}
  style={styles.input('md', false, false)}
/>
// Missing: aria-invalid, aria-describedby, disabled handling
```

### shadcn Comparison

shadcn's Input uses CSS-based aria-invalid styling:
```tsx
className={cn(
  // ... base styles
  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  className
)}
```

This approach relies on the consumer setting `aria-invalid` themselves, while liquid-render's `ControlledInput` handles this automatically based on the `error` prop - which is actually better for DX.

However, shadcn's approach allows for more granular control and doesn't require a wrapper component.

### Score: 6/10

Rationale: Good accessibility in ControlledInput, but the block-based Input used by the DSL lacks critical ARIA attributes.

---

## 2. API Design (0-10)

### Checklist
- [x] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components (no variant prop)
- [x] Supports both controlled and uncontrolled modes (separate components)
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

**Block-based Input (for LiquidUI DSL):**
```typescript
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}
// Uses: block.label, block.binding?.value (placeholder), block.signals?.emit
```

**ControlledInput (standalone):**
```typescript
interface ControlledInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;  // 'sm' | 'md' | 'lg'
  icon?: React.ReactNode;
  inputStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
}
```

**SearchInput:**
```typescript
interface SearchInputProps extends Omit<ControlledInputProps, 'icon' | 'type'> {
  onSearch?: (value: string) => void;
}
```

**Textarea:**
```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperStyle?: React.CSSProperties;
}
```

### shadcn Props

```typescript
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Pure forwarding component - no wrapper, no label, no error handling
}
```

### Gaps

| Feature | liquid-render | shadcn | Notes |
|---------|---------------|--------|-------|
| `className` prop | Via `inputStyle`/`wrapperStyle` | Direct | shadcn uses Tailwind classes |
| `type` prop | ControlledInput: yes, Input block: hardcoded "text" | Yes | Block component needs type support |
| Ref forwarding | `ControlledInput`: Yes, `Input`: No | Yes | Block component missing |
| Variant prop | No | No | Neither has variants |
| Extends native | ControlledInput: Yes | Yes | Block component doesn't |

### Score: 7/10

Rationale: Good TypeScript support and sensible API for ControlledInput. Block-based Input is limited but serves its DSL purpose. Missing ref forwarding on block component.

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (indirectly via `inputStyles()`)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (N/A for input - no shadows used)

### Violations Found

```typescript
// Only one minor violation found:
hasIcon ? { paddingLeft: '2.5rem' } : {}
// Should use tokens.spacing for consistency
```

**Excellent token usage throughout:**
```typescript
const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: { height: '2rem', fontSize: tokens.fontSize.xs, padding: `0 ${tokens.spacing.sm}` },
  md: { height: '2.5rem', fontSize: tokens.fontSize.sm, padding: `0 ${tokens.spacing.md}` },
  lg: { height: '3rem', fontSize: tokens.fontSize.base, padding: `0 ${tokens.spacing.md}` },
};

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,   // Token!
  },
  label: {
    fontSize: tokens.fontSize.sm,           // Token!
    fontWeight: tokens.fontWeight.medium,   // Token!
    color: tokens.colors.foreground,        // Token!
  },
  error: {
    fontSize: tokens.fontSize.xs,   // Token!
    color: tokens.colors.error,     // Token!
    marginTop: tokens.spacing.xs,   // Token!
  },
  icon: {
    position: 'absolute',
    left: tokens.spacing.sm,                // Token!
    color: tokens.colors.mutedForeground,   // Token!
  },
};
```

Uses `inputStyles()` utility which also uses tokens:
```typescript
export function inputStyles(overrides?: CSSProperties): CSSProperties {
  return mergeStyles(
    baseStyles(),
    {
      borderRadius: tokens.radius.md,
      border: `1px solid ${tokens.colors.input}`,
      backgroundColor: tokens.colors.background,
      padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
      fontSize: tokens.fontSize.sm,
      color: tokens.colors.foreground,
      transition: `border-color ${tokens.transition.fast}`,
    },
    overrides
  );
}
```

### Score: 9/10

Rationale: Excellent token usage. Only one minor hardcoded value (`2.5rem` for icon padding). Very consistent with design system.

---

## 4. Features (0-10)

### liquid-render Features
- [x] Label support
- [x] Placeholder support
- [x] Error state with message
- [x] Hint text support
- [x] Size variants (sm, md, lg)
- [x] Icon support (left position only)
- [x] Signal emission on change
- [x] Textarea variant
- [x] SearchInput variant with onSearch callback
- [x] forwardRef support (ControlledInput only)
- [ ] Right icon/addon support
- [ ] Prefix/suffix text
- [ ] Clear button
- [ ] Character counter
- [ ] Loading state
- [ ] Password visibility toggle

### shadcn Features
- [x] forwardRef support
- [x] File input styling
- [x] Selection styling
- [x] Dark mode support (via CSS variables)
- [x] Focus ring with ring utilities
- [x] aria-invalid styling
- [x] Disabled styling
- [x] className forwarding
- [ ] Label (separate component)
- [ ] Error message (separate component)
- [ ] Icon support (separate composition)

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Base input | Y | Y | - |
| Label integration | Y (built-in) | N (separate) | - |
| Error handling | Y (built-in) | N (manual) | - |
| Hint text | Y | N | - |
| Size variants | Y | N | - |
| Icon support | Y (left only) | N (composition) | P2 |
| File input styling | N | Y | P2 |
| Selection styling | N | Y | P2 |
| Dark mode | Y (CSS vars) | Y (CSS vars) | - |
| Focus ring | Partial | Y | P1 |
| Disabled opacity | N | Y | P1 |
| Password toggle | N | N | P2 |

**shadcn Input code:**
```tsx
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}
```

**Key shadcn features liquid-render is missing:**
1. `disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50` - no disabled styling
2. `file:*` styles - no file input support
3. `selection:*` styles - no text selection styling
4. `focus-visible:ring-[3px]` - focus ring styling is basic in liquid-render

### Score: 6/10

Rationale: liquid-render has more built-in features (label, error, hint, sizes, icons) but missing polish features like disabled styling, file input support, and proper focus rings.

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
- Tests file: **NONE**
- Test count: 0
- Coverage: 0%

### Missing Tests

**Critical tests needed:**

1. **Block-based Input parsing:**
```typescript
describe('Input block', () => {
  it('parses In with label', () => {
    const input = 'In "Email" :email';
    // verify block.label = "Email", block.binding.name = "email"
  });
});
```

2. **ControlledInput rendering:**
```typescript
describe('ControlledInput', () => {
  it('renders with label', () => {});
  it('shows error message with role="alert"', () => {});
  it('shows hint when no error', () => {});
  it('hides hint when error present', () => {});
  it('applies size variants correctly', () => {});
  it('renders icon when provided', () => {});
  it('forwards ref correctly', () => {});
  it('sets aria-invalid when error prop is set', () => {});
});
```

3. **SearchInput:**
```typescript
describe('SearchInput', () => {
  it('calls onSearch on Enter keypress', () => {});
  it('renders search icon', () => {});
});
```

4. **Textarea:**
```typescript
describe('Textarea', () => {
  it('renders with label', () => {});
  it('shows error state', () => {});
});
```

5. **Signal integration:**
```typescript
describe('Input signals', () => {
  it('emits signal on value change', () => {});
});
```

### Score: 0/10

Rationale: No tests exist for the Input component at all. This is a critical gap.

---

## Overall Score: 28/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 6/10 | High | ControlledInput good, block-based Input needs work |
| API Design | 7/10 | Medium | Good TypeScript, sensible API |
| Design Tokens | 9/10 | Medium | Excellent token usage, one minor violation |
| Features | 6/10 | Low | Good feature set but missing polish |
| Testing | 0/10 | Medium | Critical gap - no tests |
| **Total** | **28/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)
1. **Add test suite**: Create `packages/liquid-render/tests/input.test.ts` with comprehensive tests covering all variants
2. **Add ARIA to block Input**: The DSL-based Input component needs `aria-invalid` and `aria-describedby` support

### P1 - Important (Next Sprint)
1. **Add disabled styling**: Implement `disabled:opacity-50 disabled:cursor-not-allowed` equivalent
2. **Fix focus ring**: Add proper focus-visible ring styling matching shadcn's `focus-visible:ring-ring/50 focus-visible:ring-[3px]`
3. **Add type support to block Input**: Currently hardcoded to "text", should support email, password, number, etc.
4. **Add ref forwarding to block Input**: Currently only ControlledInput has forwardRef

### P2 - Nice to Have (Backlog)
1. **File input styling**: Add styled file input support
2. **Selection styling**: Add text selection color styling
3. **Right icon support**: Allow icons on both sides
4. **Password visibility toggle**: Built-in show/hide for password inputs
5. **Character counter**: Optional character count display
6. **Prefix/suffix text**: Support for input addons
7. **Fix hardcoded paddingLeft**: Replace `'2.5rem'` with token-based value

---

## Action Items for WF-0002

- [ ] Create `packages/liquid-render/tests/input.test.ts` with comprehensive tests
- [ ] Add `aria-invalid` and `aria-describedby` to block-based Input component
- [ ] Add disabled styling to input styles
- [ ] Implement focus ring styling using tokens
- [ ] Add `type` prop support to block-based Input (extract from block.binding or add new block property)
- [ ] Add forwardRef to block-based Input component
- [ ] Replace hardcoded `paddingLeft: '2.5rem'` with `tokens.spacing.xl` or similar
