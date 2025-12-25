---
component: Accordion
code: Ac
liquid_file: packages/liquid-render/src/renderer/components/accordion.tsx
shadcn_ref: accordion
auditor: agent
date: 2025-12-25
scores:
  accessibility: 6
  api_design: 5
  design_tokens: 9
  features: 4
  testing: 5
  total: 29
priority: P1
---

# Audit: Accordion

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/accordion.tsx` |
| shadcn reference | `accordion` |
| DSL code | `Ac` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### Findings

**Positive:**
- Uses `aria-expanded` on the button trigger
- Uses `aria-controls` to link button to content region
- Uses `role="region"` on the content panel
- Uses `hidden` attribute for collapsed content
- Uses semantic `<button>` element for the trigger

**Issues:**
1. **Missing `aria-labelledby`** on content region is broken - references `accordionId` but the button does not have that ID set
2. **No visible focus ring** - no `:focus` or `:focus-visible` styles defined
3. **No keyboard navigation support** - missing Arrow key navigation for accordion groups
4. **No Enter/Space key handling** - relies entirely on button default behavior (works but not explicit)

### liquid-render Code
```typescript
<button
  onClick={toggleOpen}
  aria-expanded={isOpen}
  aria-controls={contentId}
  style={styles.header}
>
  <span>{String(title)}</span>
  <span style={chevronStyle}>...</span>
</button>
<div
  id={contentId}
  role="region"
  aria-labelledby={accordionId}  // BUG: accordionId is not set on any element
  style={contentStyle}
  hidden={!isOpen}
>
```

### shadcn Comparison

shadcn uses Radix UI primitives which handle all accessibility automatically:

```typescript
// shadcn accordion.tsx
<AccordionPrimitive.Trigger
  data-slot="accordion-trigger"
  className={cn(
    "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
    className
  )}
  {...props}
>
```

Key shadcn accessibility features:
- `focus-visible:ring-[3px]` - Visible focus indicator
- `disabled:pointer-events-none disabled:opacity-50` - Disabled state handling
- Radix primitives handle `aria-*` attributes, keyboard nav, and screen reader announcements

### Score: 6/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props (Dynamic Component)
```typescript
export function Accordion({ block, data, children }: LiquidComponentProps): React.ReactElement

// LiquidComponentProps (from utils.ts):
export interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;  // Not used in Accordion!
}
```

### Current Props (Static Component)
```typescript
export interface StaticAccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
}
```

### shadcn Props
```typescript
// shadcn exposes four separate components:
function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {}
// AccordionPrimitive.Root props include:
// - type: "single" | "multiple"
// - value: string | string[]
// - defaultValue: string | string[]
// - onValueChange: (value) => void
// - collapsible: boolean
// - disabled: boolean

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {}
// - value: string (required)
// - disabled: boolean

function AccordionTrigger({ className, children, ...props }) {}
function AccordionContent({ className, children, ...props }) {}
```

### Gaps
1. **No `type` prop** - shadcn supports "single" (one at a time) or "multiple" (many open)
2. **No controlled mode** - liquid-render only supports uncontrolled via `useState`
3. **No `disabled` prop** - cannot disable accordion items
4. **No `collapsible` prop** - cannot prevent collapsing all items
5. **No `value`/`onValueChange`** - cannot track/control open state externally
6. **No `className` passthrough** - `className` prop exists in interface but not used
7. **Single monolithic component** - shadcn has separate Item/Trigger/Content for flexibility

### Score: 5/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [ ] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Token Usage Analysis

**Excellent token usage:**
```typescript
const styles = {
  wrapper: {
    border: `1px solid ${tokens.colors.border}`,         // tokens.colors
    borderRadius: tokens.radius.md,                       // tokens.radius
    overflow: 'hidden',
  },
  header: {
    padding: tokens.spacing.md,                           // tokens.spacing
    backgroundColor: tokens.colors.background,            // tokens.colors
    fontSize: tokens.fontSize.sm,                         // tokens.fontSize
    fontWeight: tokens.fontWeight.medium,                 // tokens.fontWeight
    color: tokens.colors.foreground,                      // tokens.colors
    transition: `background-color ${tokens.transition.fast}`, // tokens.transition
  },
  // ...
};
```

### Violations Found
```typescript
// Only minor issues:
border: 'none',  // Line 25 - could use tokens but 'none' is acceptable
paddingTop: 0,   // Line 49 - could use tokens.spacing.none but 0 is acceptable
```

### Score: 9/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic expand/collapse functionality
- [x] Title from label or data binding
- [x] Children content support
- [x] Chevron rotation animation
- [x] Static component variant with `defaultOpen`
- [ ] Multiple accordion support (single/multiple mode)
- [ ] Controlled state
- [ ] Disabled state
- [ ] Collapsible constraint
- [ ] Smooth open/close animation
- [ ] Custom icon support

### shadcn Features
- [x] Basic expand/collapse functionality
- [x] Title support
- [x] Children content support
- [x] Chevron rotation animation (`[&[data-state=open]>svg]:rotate-180`)
- [x] Multiple accordion support (`type="single"` or `type="multiple"`)
- [x] Controlled state (`value`/`onValueChange`)
- [x] Disabled state (`disabled` prop)
- [x] Collapsible constraint (`collapsible` prop)
- [x] Smooth animations (`animate-accordion-up`/`animate-accordion-down`)
- [x] Custom icon via children composition

### Gap Analysis
| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic expand/collapse | OK | OK | - |
| Single/Multiple mode | Missing | OK | P1 |
| Controlled state | Missing | OK | P1 |
| Disabled state | Missing | OK | P1 |
| Collapsible option | Missing | OK | P2 |
| Smooth animation | Missing | OK | P2 |
| Custom trigger icon | Missing | OK | P3 |
| Composable API | Missing | OK | P2 |

### shadcn Animation Code
```typescript
// shadcn uses CSS animations:
<AccordionPrimitive.Content
  className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
>
```

### liquid-render Animation Code
```typescript
// liquid-render uses display:none (no animation):
contentHidden: {
  display: 'none',  // Instant hide, no transition
}
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

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/accordion.test.ts`
- Test count: 6 tests
- Coverage: ~40% (parsing/roundtrip only, no render tests)

### Test Analysis

**What is tested:**
```typescript
// All tests are DSL parsing/roundtrip tests, NOT component render tests:

it('should parse accordion with title and children', () => {
  const input = 'Ac "Details" [Tx :description]';
  const schema = parseUI(input);
  expect(block.type).toBe('accordion');
});

it('should roundtrip accordion with title', () => {
  const input = 'Ac "Details" [Tx :content]';
  const result = roundtripUI(schema);
  expect(result.isEquivalent).toBe(true);
});
```

### Missing Tests
1. **React component rendering tests** - no `render()` or React Testing Library
2. **Accessibility tests** - no `aria-*` attribute assertions
3. **Keyboard interaction tests** - no keyboard event simulation
4. **Click behavior tests** - no toggle state verification
5. **Edge case tests** - empty title, null binding, deep nesting
6. **Static component tests** - `StaticAccordion` not tested at all
7. **Focus management tests** - focus state not verified

### Score: 5/10

---

## Overall Score: 29/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 6/10 | High | Missing focus ring, broken aria-labelledby |
| API Design | 5/10 | Medium | Missing controlled mode, variants |
| Design Tokens | 9/10 | Medium | Excellent token usage |
| Features | 4/10 | Low | Missing single/multiple, animations |
| Testing | 5/10 | Medium | Only DSL tests, no render tests |
| **Total** | **29/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)
1. **Fix `aria-labelledby` bug**: The `accordionId` is never set as an `id` on any element, breaking the accessibility link.
   ```typescript
   // Fix: Add id to button
   <button
     id={accordionId}
     onClick={toggleOpen}
     aria-expanded={isOpen}
     aria-controls={contentId}
   >
   ```

2. **Add visible focus ring**: Add focus styles to the header button.
   ```typescript
   headerFocus: {
     outline: `2px solid ${tokens.colors.ring}`,
     outlineOffset: '2px',
   }
   ```

### P1 - Important (Next Sprint)
1. **Add single/multiple mode**: Support `type` prop to allow one-at-a-time or multiple open accordions.

2. **Add controlled mode**: Support `value`/`onValueChange` props for external state control.

3. **Add disabled prop**: Support disabling individual accordion items.

4. **Add React component tests**: Create render tests using React Testing Library.
   ```typescript
   // Example test to add:
   it('should toggle open/closed on click', async () => {
     render(<StaticAccordion title="Test">Content</StaticAccordion>);
     const button = screen.getByRole('button');
     expect(screen.queryByText('Content')).not.toBeVisible();
     await userEvent.click(button);
     expect(screen.getByText('Content')).toBeVisible();
   });
   ```

### P2 - Nice to Have (Backlog)
1. **Add smooth open/close animation**: Use CSS transitions or framer-motion for expand/collapse.

2. **Add composable API**: Consider AccordionItem/AccordionTrigger/AccordionContent pattern.

3. **Use className prop**: The LiquidComponentProps includes `className` but it is not used.

4. **Add collapsible prop**: Option to prevent closing all items.

---

## Action Items for WF-0002

- [ ] Fix `aria-labelledby` by adding `id={accordionId}` to the button element
- [ ] Add `:focus-visible` styles with `tokens.colors.ring`
- [ ] Add `disabled` prop support with appropriate styling
- [ ] Create `accordion.render.test.tsx` with React Testing Library tests
- [ ] Add click toggle tests and keyboard interaction tests
- [ ] Consider refactoring to support `type="single" | "multiple"` mode
- [ ] Add smooth CSS animations for expand/collapse transitions
