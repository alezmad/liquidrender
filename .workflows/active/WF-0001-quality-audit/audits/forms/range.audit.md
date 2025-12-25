---
component: Range (Slider)
code: Rg
liquid_file: packages/liquid-render/src/renderer/components/range.tsx
shadcn_ref: slider
auditor: agent
date: 2025-12-25
scores:
  accessibility: 5
  api_design: 5
  design_tokens: 7
  features: 4
  testing: 4
  total: 25
priority: P1
---

# Audit: Range (Slider)

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/range.tsx` |
| shadcn reference | `slider` |
| DSL code | `Rg` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (aria-valuenow, aria-valuemin, aria-valuemax)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### Findings

**Positive:**
- Uses proper `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
- Label is associated with input via `htmlFor`/`id` pattern
- Uses semantic `<input type="range">` element

**Liquid-render Code:**
```typescript
<input
  type="range"
  id={rangeId}
  min={min}
  max={max}
  step={step}
  value={currentValue}
  onChange={handleChange}
  style={styles.input}
  aria-valuenow={currentValue}
  aria-valuemin={min}
  aria-valuemax={max}
/>
```

**Issues:**
- No focus ring styles defined (relies on browser defaults which may be hidden by `outline: none`)
- No keyboard navigation for precise value control (arrow keys are handled by native `<input type="range">` but no custom handling)
- Missing `aria-valuetext` for better screen reader descriptions (e.g., "50 percent" instead of just "50")
- Missing `aria-orientation` attribute
- No disabled state styling (StaticRange has disabled prop but no visual feedback)

### shadcn Comparison

shadcn uses Radix UI's `SliderPrimitive` which provides:

**shadcn Code:**
```typescript
<SliderPrimitive.Root
  data-slot="slider"
  defaultValue={defaultValue}
  value={value}
  min={min}
  max={max}
  className={cn(
    "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
    className
  )}
  {...props}
>
```

Key accessibility features from Radix:
- Built-in keyboard navigation (Arrow keys, Home, End, Page Up/Down)
- Proper focus management with visible focus rings
- Supports both horizontal and vertical orientations with proper ARIA
- `data-[disabled]:opacity-50` provides visual disabled state
- Touch-friendly with `touch-none` for precise control

### Score: 5/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [x] Supports both controlled and uncontrolled modes (partially - StaticRange only)
- [ ] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props (liquid-render)

**Dynamic `Range` component:**
```typescript
// Uses LiquidComponentProps from block/data pattern
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}
```

**Static `StaticRangeProps`:**
```typescript
export interface StaticRangeProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}
```

### shadcn Props
```typescript
// Inherits all Radix SliderPrimitive.Root props:
interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  className?: string;
  defaultValue?: number[];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  inverted?: boolean;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  // ...and many more from Radix
}
```

### Gaps

| Feature | liquid-render | shadcn | Notes |
|---------|---------------|--------|-------|
| Multiple thumbs (range) | Single value only | Array of values | shadcn supports dual-thumb ranges |
| orientation | Not supported | `horizontal`/`vertical` | Major missing feature |
| className | Not supported on Range | Supported | No styling override |
| defaultValue | Not supported | Supported | Uncontrolled mode incomplete |
| onValueChange | `onChange(number)` | `onValueChange(number[])` | Different signature |
| onValueCommit | Not supported | Supported | Final value after drag |
| inverted | Not supported | Supported | Reverse direction |
| name | Not supported | Supported | Form submission |
| minStepsBetweenThumbs | Not supported | Supported | For dual ranges |

### Score: 5/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [ ] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

```typescript
// Line 51 - Hardcoded height value
input: {
  width: '100%',
  height: '0.5rem',  // VIOLATION: Should use tokens.spacing.sm or similar
  borderRadius: tokens.radius.full,
  appearance: 'none' as const,
  backgroundColor: tokens.colors.muted,
  cursor: 'pointer',
  outline: 'none',  // VIOLATION: Removes focus ring accessibility
}
```

**Good Usage:**
```typescript
// Line 30 - Proper token usage
gap: tokens.spacing.xs,

// Line 40-42 - Proper token usage
fontSize: tokens.fontSize.sm,
fontWeight: tokens.fontWeight.medium,
color: tokens.colors.foreground,
```

### Minor Issues:
- The track height `0.5rem` could be a token (e.g., `tokens.spacing.sm` = 0.5rem)
- No transition tokens used for hover/focus states

### Score: 7/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic slider functionality
- [x] Min/max/step configuration
- [x] Label display
- [x] Current value display
- [x] Signal emit support
- [x] Data binding support
- [x] Disabled state (StaticRange only)

### shadcn Features
- [x] Basic slider functionality
- [x] Min/max/step configuration
- [x] Multiple thumbs (dual-range sliders)
- [x] Vertical orientation
- [x] Inverted direction
- [x] Form integration (name attribute)
- [x] onValueCommit (final value after interaction)
- [x] Custom thumb styling per index
- [x] Touch-optimized
- [x] Keyboard navigation with precise control

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic slider | Yes | Yes | - |
| Min/max/step | Yes | Yes | - |
| Label display | Yes | No (separate) | - |
| Value display | Yes | No (separate) | - |
| Multi-thumb | No | Yes | P2 |
| Vertical orientation | No | Yes | P1 |
| Inverted direction | No | Yes | P3 |
| Form name | No | Yes | P2 |
| onValueCommit | No | Yes | P1 |
| Touch optimization | No | Yes | P1 |
| Focus ring | No | Yes | P0 |
| Thumb styling | No | Yes | P2 |

**shadcn multi-thumb implementation:**
```typescript
// shadcn supports rendering multiple thumbs
{Array.from({ length: _values.length }, (_, index) => (
  <SliderPrimitive.Thumb
    data-slot="slider-thumb"
    key={index}
    className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
  />
))}
```

**liquid-render uses native input:**
```typescript
// Single thumb only via native <input type="range">
<input
  type="range"
  id={rangeId}
  min={min}
  max={max}
  step={step}
  value={currentValue}
  onChange={handleChange}
  style={styles.input}
/>
```

### Score: 4/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [ ] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)
- [ ] Render tests (React component tests)

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/range.test.ts`
- Test count: 5 tests
- Coverage: DSL parsing/emitting only

### Test Summary

```typescript
describe('Range Component', () => {
  describe('Basic Range Parsing', () => {
    it('should parse range with min/max', () => {...});
    it('should parse range with step', () => {...});
    it('should parse range with nested binding', () => {...});
  });

  describe('Range with Signals', () => {
    it('should parse range with emit signal', () => {...});
  });

  describe('Range Emit Test', () => {
    it('should emit range with min/max/step correctly', () => {...});
  });
});
```

### Missing Tests

1. **React Component Tests:**
   - No render tests for `Range` or `StaticRange` components
   - No tests for `onChange` callback behavior
   - No tests for controlled vs uncontrolled behavior

2. **Edge Cases:**
   - Value outside min/max bounds
   - Negative min/max values
   - Decimal step values
   - Value clamping behavior

3. **Accessibility Tests:**
   - Keyboard navigation
   - Screen reader announcements
   - Focus management

4. **Integration Tests:**
   - Signal emission
   - Data binding updates
   - Form submission

### Score: 4/10

---

## Overall Score: 25/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 5/10 | High | Missing focus ring, keyboard enhancements |
| API Design | 5/10 | Medium | Missing multi-thumb, orientation, many props |
| Design Tokens | 7/10 | Medium | Minor violations (height, no transitions) |
| Features | 4/10 | Low | Native input limits features significantly |
| Testing | 4/10 | Medium | DSL tests only, no component render tests |
| **Total** | **25/50** | | **Needs significant improvement** |

---

## Recommendations

### P0 - Critical (Blocks Release)
1. **Add visible focus ring**: The current `outline: none` removes accessibility. Add proper focus styles:
   ```typescript
   input: {
     // ... existing styles
     outline: 'none',
   },
   inputFocus: {
     boxShadow: `0 0 0 2px ${tokens.colors.ring}`,
   }
   ```
   Or use `:focus-visible` CSS pseudo-class.

### P1 - Important (Next Sprint)
1. **Add onValueCommit callback**: Emit final value when drag ends, not on every change
2. **Support vertical orientation**: Add `orientation?: 'horizontal' | 'vertical'` prop
3. **Add component render tests**: Test React component behavior, not just DSL
4. **Consider Radix migration**: Native `<input type="range">` is limiting; Radix provides much better UX

### P2 - Nice to Have (Backlog)
1. **Multi-thumb support**: Allow range selection with two thumbs
2. **Form integration**: Add `name` prop for form submission
3. **Custom thumb styling**: Allow custom thumb appearance
4. **Add aria-valuetext**: Improve screen reader announcements
5. **Touch optimization**: Add `touch-none` for better mobile experience

---

## Action Items for WF-0002

- [ ] Fix focus ring visibility (P0 - accessibility)
- [ ] Add focus styles using tokens or CSS
- [ ] Create render tests for Range and StaticRange components
- [ ] Consider Radix SliderPrimitive integration for enhanced features
- [ ] Add orientation support
- [ ] Add onValueCommit callback
- [ ] Replace hardcoded `0.5rem` height with token value

---

## Code Comparison Summary

### Track/Thumb Rendering

**shadcn (Radix-based):**
```typescript
<SliderPrimitive.Track
  data-slot="slider-track"
  className="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5"
>
  <SliderPrimitive.Range
    data-slot="slider-range"
    className="bg-primary absolute data-[orientation=horizontal]:h-full"
  />
</SliderPrimitive.Track>
{Array.from({ length: _values.length }, (_, index) => (
  <SliderPrimitive.Thumb
    className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4"
  />
))}
```

**liquid-render (Native):**
```typescript
<input
  type="range"
  id={rangeId}
  min={min}
  max={max}
  step={step}
  value={currentValue}
  onChange={handleChange}
  style={styles.input}
  aria-valuenow={currentValue}
  aria-valuemin={min}
  aria-valuemax={max}
/>
```

The native approach is simpler but lacks:
- Visual filled range indicator
- Custom thumb appearance
- Multi-thumb support
- Consistent cross-browser styling
- Touch optimization

### Recommendation

Consider migrating to Radix `@radix-ui/react-slider` for parity with shadcn, or at minimum add CSS for:
- Custom thumb styling (`::-webkit-slider-thumb`, `::-moz-range-thumb`)
- Filled range visualization
- Focus ring visibility
