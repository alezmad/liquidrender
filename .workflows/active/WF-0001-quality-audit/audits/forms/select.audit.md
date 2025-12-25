---
component: Select
code: Se
liquid_file: packages/liquid-render/src/renderer/components/select.tsx
shadcn_ref: select
auditor: agent
date: 2025-12-25
scores:
  accessibility: 4
  api_design: 5
  design_tokens: 9
  features: 4
  testing: 5
  total: 27
priority: P1
---

# Audit: Select

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/select.tsx` |
| shadcn reference | `select` (Radix UI based) |
| DSL code | `Se` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (partial - only in StaticSelect)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys) - uses native select
- [ ] Focus management correct - no custom focus ring
- [ ] Works with screen readers (tested with VoiceOver/NVDA) - native select should work
- [ ] Color contrast meets WCAG AA - relies on tokens

### Findings

**Positive:**
- Uses `htmlFor` on label elements for proper label association
- `StaticSelect` includes `aria-invalid` for error states
- `StaticSelect` includes `aria-describedby` linking to error/hint messages
- Error messages have `role="alert"` for screen reader announcements

**Negative:**
- Dynamic `Select` component lacks ARIA attributes entirely
- No custom focus ring styles defined
- No explicit `aria-label` or `aria-labelledby` fallbacks
- Native `<select>` element means limited keyboard customization
- Chevron icon (span with text content) is not properly hidden from assistive technology

**Code comparison:**

liquid-render (Dynamic Select - line 158-169):
```tsx
<select
  id={selectId}
  value={value}
  onChange={handleChange}
  style={styles.select(false)}
>
  {options.map((option, index) => (
    <option key={`${option.value}-${index}`} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
<span style={styles.chevron}>▼</span>  // Not aria-hidden
```

shadcn Select (uses Radix primitives with full ARIA):
```tsx
<SelectPrimitive.Trigger
  data-slot="select-trigger"
  data-size={size}
  className={cn(
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive ...",
    className
  )}
  {...props}
>
  {children}
  <SelectPrimitive.Icon asChild>
    <ChevronDownIcon className="size-4 opacity-50" />
  </SelectPrimitive.Icon>
</SelectPrimitive.Trigger>
```

### shadcn Comparison

shadcn uses Radix UI Select which provides:
- Complete WAI-ARIA 1.2 listbox pattern compliance
- `role="listbox"`, `role="option"`, `aria-selected`, `aria-expanded`
- Full keyboard navigation (Arrow Up/Down, Home, End, type-ahead)
- Focus management with `SelectPrimitive.Content` portal
- Proper focus ring with `focus-visible:ring-[3px]`
- Icons properly hidden with `[&_svg]:pointer-events-none`

### Score: 4/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes (partial - only controlled)
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

```typescript
// Dynamic component (block-based)
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}

// Static component
interface StaticSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
  selectStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
}

interface SelectOption {
  value: string;
  label: string;
}
```

### shadcn Props

```typescript
// Composed of multiple primitives
function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {}

function SelectTrigger({
  className,
  size = "default",  // "sm" | "default"
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {}

// Additional composable parts:
// SelectGroup, SelectValue, SelectContent, SelectLabel
// SelectSeparator, SelectScrollUpButton, SelectScrollDownButton
```

### Gaps

| Gap | liquid-render | shadcn | Priority |
|-----|---------------|--------|----------|
| Size variants | Not supported | `size="sm" \| "default"` | P2 |
| Composable parts | Monolithic | 10 separate components | P1 |
| Option groups | Not supported | `SelectGroup` + `SelectLabel` | P2 |
| Separators | Not supported | `SelectSeparator` | P3 |
| Scroll buttons | Not supported | `SelectScrollUpButton/Down` | P3 |
| Custom trigger | Not supported | `SelectTrigger` with children | P2 |
| Placeholder styling | Basic | `data-[placeholder]:text-muted-foreground` | P3 |
| Uncontrolled mode | Not supported | Fully supported via Radix | P1 |
| Option disabled state | Not supported | `data-[disabled]` handling | P2 |

### Score: 5/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (via inputStyles)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [ ] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

```typescript
// Line 45-48 - hardcoded paddingRight
select: (hasError: boolean): React.CSSProperties =>
  mergeStyles(
    inputStyles(),
    {
      appearance: 'none',
      paddingRight: '2.5rem',  // Should be tokens.spacing.xl or similar
      cursor: 'pointer',
      backgroundImage: 'none',
    },
    // ...
  ),
```

**Positive Token Usage:**
- `tokens.spacing.xs` for gaps (line 25)
- `tokens.fontSize.sm` for labels (line 29)
- `tokens.fontWeight.medium` for labels (line 30)
- `tokens.colors.foreground` for labels (line 31)
- `tokens.spacing.md` for chevron positioning (line 54)
- `tokens.colors.mutedForeground` for chevron (line 58)
- `tokens.fontSize.xs` for chevron, error, hint (lines 59, 64, 70)
- `tokens.colors.error` for error states (lines 49, 64)

### Score: 9/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic dropdown with options
- [x] Label support
- [x] Error state styling
- [x] Hint text (StaticSelect only)
- [x] Placeholder option (StaticSelect only)
- [x] Signal emission on change
- [x] Data binding support
- [x] Empty state handling

### shadcn Features
- [x] Basic dropdown with options
- [x] Custom trigger content
- [x] Option groups with labels
- [x] Separators between options
- [x] Scroll buttons for long lists
- [x] Size variants (sm, default)
- [x] Check icon on selected item
- [x] Animated open/close
- [x] Portal rendering (escapes overflow)
- [x] Position variants (item-aligned, popper)
- [x] Dark mode support
- [x] Disabled option styling
- [x] Type-ahead search

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic select | Yes | Yes | - |
| Label | Yes | Yes | - |
| Error state | Yes | Yes | - |
| Hint text | StaticSelect only | N/A | - |
| Placeholder | StaticSelect only | Yes | - |
| Option groups | No | Yes (`SelectGroup`) | P2 |
| Separators | No | Yes (`SelectSeparator`) | P3 |
| Scroll buttons | No | Yes | P3 |
| Size variants | No | Yes | P2 |
| Custom trigger | No | Yes | P2 |
| Check indicator | No | Yes (CheckIcon) | P2 |
| Animations | No | Yes (data-state animations) | P3 |
| Portal rendering | No | Yes (avoids z-index issues) | P1 |
| Position control | No | Yes (item-aligned/popper) | P2 |
| Disabled options | No | Yes | P2 |
| Type-ahead | No | Yes | P2 |

**Code comparison - Selected item indicator:**

liquid-render: No indicator
```tsx
<option key={`${option.value}-${index}`} value={option.value}>
  {option.label}
</option>
```

shadcn:
```tsx
function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item ...>
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
```

### Score: 4/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (empty options, nested bindings)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)
- [ ] React rendering tests (component mount/update)

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/select.test.ts`
- Test count: 7 tests
- Coverage: Parser/DSL only (no React component tests)

### Test Categories

| Category | Tests | Status |
|----------|-------|--------|
| Basic parsing | 3 | Covered |
| Signal handling | 1 | Covered |
| Roundtrip | 1 | Covered |
| Edge cases | 2 | Covered |
| React rendering | 0 | Missing |
| Accessibility | 0 | Missing |
| User interaction | 0 | Missing |

### Missing Tests

1. **React component rendering tests:**
   - Mount Select with props
   - Render with various option counts
   - Handle value changes
   - Verify signal emission

2. **StaticSelect tests:**
   - Error state rendering
   - Hint text rendering
   - Placeholder functionality
   - Disabled state

3. **Accessibility tests:**
   - Verify label association
   - aria-invalid on error
   - aria-describedby linkage
   - Keyboard navigation

4. **Edge case React tests:**
   - Empty options renders disabled state
   - Very long option labels
   - Special characters in values/labels

### Score: 5/10

---

## Overall Score: 27/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 4/10 | High | Uses native select; missing ARIA in dynamic component |
| API Design | 5/10 | Medium | Monolithic vs composable; missing variants |
| Design Tokens | 9/10 | Medium | Excellent token usage; minor hardcoded value |
| Features | 4/10 | Low | Missing option groups, animations, portal |
| Testing | 5/10 | Medium | Parser tests only; no React component tests |
| **Total** | **27/50** | | Priority: P1 |

---

## Recommendations

### P0 - Critical (Blocks Release)
1. **Add aria-hidden to chevron icon:** The decorative chevron (`<span style={styles.chevron}>...</span>`) should have `aria-hidden="true"` to prevent screen readers from announcing it.
2. **Add ARIA attributes to dynamic Select:** The dynamic `Select` component lacks `aria-invalid`, `aria-describedby` that StaticSelect has.

### P1 - Important (Next Sprint)
1. **Add React component tests:** Create `select.render.test.tsx` to test component mounting, state changes, and accessibility attributes.
2. **Consider Radix migration:** For production use, consider wrapping Radix Select primitive to get full accessibility and features.
3. **Add uncontrolled mode:** Support `defaultValue` prop pattern for forms that don't need controlled state.
4. **Portal rendering:** Native select has z-index limitations; consider custom dropdown with portal for complex UIs.

### P2 - Nice to Have (Backlog)
1. **Size variants:** Add `size="sm" | "default"` prop matching shadcn pattern.
2. **Option groups:** Support `SelectGroup` pattern for categorized options.
3. **Disabled options:** Add `disabled` property to `SelectOption` interface.
4. **Custom focus ring:** Add visible focus ring style matching design system.
5. **Type-ahead search:** For long option lists, support keyboard search.

---

## Action Items for WF-0002

- [ ] Add `aria-hidden="true"` to chevron icon (both Select and StaticSelect)
- [ ] Add `aria-invalid` and `aria-describedby` to dynamic Select component
- [ ] Create `select.render.test.tsx` with React Testing Library tests
- [ ] Replace hardcoded `paddingRight: '2.5rem'` with token value
- [ ] Add focus ring styles using tokens
- [ ] Document feature gap decisions (native vs custom dropdown trade-offs)
