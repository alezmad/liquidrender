---
component: Tabs
code: Ts
liquid_file: packages/liquid-render/src/renderer/components/tabs.tsx
shadcn_ref: tabs
auditor: A6
date: 2025-12-25
scores:
  accessibility: 9
  api_design: 7
  design_tokens: 10
  features: 8
  testing: 6
  total: 40
priority: P1
---

# Audit: Tabs

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/tabs.tsx` |
| shadcn reference | `tabs` |
| DSL code | `Ts` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct
- [x] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [x] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA) - Not verified
- [ ] Color contrast meets WCAG AA - Not verified

### Findings

The liquid-render Tabs component has **excellent accessibility implementation**:

1. **ARIA Roles**: Correctly implements `role="tablist"`, `role="tab"`, and `role="tabpanel"`
2. **ARIA Attributes**:
   - `aria-selected` on active tab
   - `aria-controls` linking tab to its panel
   - `aria-labelledby` on panels referencing the tab
   - `aria-disabled` for disabled tabs
3. **Keyboard Navigation**: Full implementation including:
   - `ArrowLeft`/`ArrowRight` for horizontal navigation
   - `Home`/`End` to jump to first/last tab
   - Properly skips disabled tabs during keyboard navigation
   - Focus follows selection (`tabRefs.current[nextIndex]?.focus()`)
4. **Focus Management**:
   - Uses roving tabindex pattern (`tabIndex={isActive ? 0 : -1}`)
   - Tab panels are focusable (`tabIndex={0}`)
5. **Unique IDs**: Uses `generateId('tabs')` for unique tab/panel IDs

### shadcn Comparison

shadcn/ui uses Radix UI's Tabs primitive which handles accessibility natively:
```tsx
<TabsPrimitive.Root>
  <TabsPrimitive.List>
    <TabsPrimitive.Trigger>
  <TabsPrimitive.Content>
```

Radix provides the same ARIA patterns but abstracts them away. liquid-render implements these manually but correctly.

**Key difference**: shadcn relies on Radix for keyboard handling; liquid-render implements it manually with equal quality.

### Score: 9/10

Minor deductions:
- No explicit `aria-orientation` attribute (defaults to horizontal)
- Screen reader testing not verified

---

## 2. API Design (0-10)

### Checklist
- [x] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [x] Consistent variants across components
- [x] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [ ] Default props are sensible - missing `defaultValue` prop naming

### Current Props

```typescript
// Dynamic component (DSL-driven)
interface LiquidComponentProps {
  block: Block;        // Contains binding, style.color for variant
  data: DataContext;   // For resolving bindings
  children?: ReactNode;
}

// Static component
interface StaticTabsProps {
  tabs: TabItem[];
  activeIndex?: number;      // Should be 'value'
  onChange?: (index: number) => void;  // Should be 'onValueChange'
  variant?: 'line' | 'pills' | 'boxed';
  className?: string;
  style?: React.CSSProperties;
}

interface TabItem {
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}
```

### shadcn Props

```typescript
// shadcn uses Radix primitives with these patterns:
interface TabsProps {
  value?: string;           // Controlled value (string, not number)
  defaultValue?: string;    // Uncontrolled default
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
}
```

### Gaps

| Prop | liquid-render | shadcn | Issue |
|------|---------------|--------|-------|
| Value type | `number` (index) | `string` (id) | shadcn uses string IDs for better semantics |
| `defaultValue` | Not exposed | `defaultValue` | liquid-render uses internal state only |
| `onValueChange` | `onChange(index)` | `onValueChange(value)` | Naming inconsistency |
| `orientation` | Not supported | `orientation` | Missing vertical tabs support |
| `activationMode` | Automatic only | `automatic \| manual` | No manual activation mode |

### Score: 7/10

Deductions:
- Uses index-based values instead of string IDs (-1)
- Prop naming doesn't match shadcn conventions (-1)
- Missing orientation support (-1)

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

**NONE** - This component has excellent token usage:

```typescript
// All values properly use tokens:
gap: tokens.spacing.md,
gap: tokens.spacing.xs,
borderBottom: `1px solid ${tokens.colors.border}`,
padding: tokens.spacing.xs,
backgroundColor: tokens.colors.muted,
borderRadius: tokens.radius.lg,
padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
fontSize: tokens.fontSize.sm,
fontWeight: tokens.fontWeight.medium,
color: tokens.colors.mutedForeground,
transition: `all ${tokens.transition.fast}`,
backgroundColor: tokens.colors.primary,
color: tokens.colors.primaryForeground,
boxShadow: tokens.shadow.sm,
```

Only hardcoded value is the indicator height:
```typescript
height: '2px',  // Acceptable for decorative element
```

### Score: 10/10

Exemplary use of design tokens throughout the component.

---

## 4. Features (0-10)

### liquid-render Features
- [x] Multiple tabs with labels
- [x] Tab content rendering
- [x] Active tab indicator (line variant)
- [x] Disabled tabs support
- [x] Keyboard navigation (arrows, home, end)
- [x] Three visual variants (line, pills, boxed)
- [x] Signal emit on tab change
- [x] Data binding for active tab
- [x] Controlled mode (via binding)
- [x] Uncontrolled mode (internal state)
- [x] Empty state handling
- [ ] Vertical orientation
- [ ] Manual activation mode
- [ ] Tab icons
- [ ] Closable tabs

### shadcn Features
- [x] Composable (Tabs, TabsList, TabsTrigger, TabsContent)
- [x] String-based values
- [x] Controlled/uncontrolled
- [x] Disabled tabs
- [x] Keyboard navigation
- [ ] Multiple variants (only one style)
- [ ] Signal integration
- [ ] Data binding

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Tab variants | 3 variants | 1 variant | liquid-render is better |
| Orientation | horizontal only | both | P2 |
| Activation mode | automatic | both | P2 |
| Tab icons | not supported | via children | P2 |
| Closable tabs | not supported | not built-in | P2 |
| Signal integration | supported | N/A | liquid-render advantage |

### Score: 8/10

Strong feature set with three visual variants. Missing vertical orientation is the main gap.

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (null, empty, overflow)
- [ ] Covers error states - minimal
- [ ] Accessibility tests (if applicable) - none
- [ ] Snapshot tests (if applicable) - none
- [ ] React component tests - only DSL parsing

### Current Test Coverage

- Tests file: `packages/liquid-render/tests/tabs.test.ts`
- Test count: 18 tests (5 skipped)
- Coverage: DSL parsing only, no React rendering tests

### Test Categories Present

1. **DSL Parsing** (10 tests):
   - Basic tabs with children
   - Pills variant
   - Nested components
   - Empty tabs container
   - Single tab
   - Empty tab content
   - Deeply nested content
   - Tabs without binding
   - Mixed content types
   - Complex spec example

2. **Skipped Tests** (5 tests):
   - Disabled tab parsing (TODO: implement :disabled state)
   - Signal emit parsing
   - Signal receive parsing
   - Bidirectional signal
   - All disabled tabs

### Missing Tests

1. **React Component Tests**:
   - Tab click handling
   - Keyboard navigation (ArrowLeft, ArrowRight, Home, End)
   - Focus management
   - Disabled tab behavior
   - Variant rendering (line, pills, boxed)
   - Active indicator visibility

2. **Accessibility Tests**:
   - ARIA attributes verification
   - Keyboard navigation skips disabled tabs
   - Focus moves with selection

3. **Integration Tests**:
   - Signal emit behavior
   - Binding updates
   - Controlled/uncontrolled switching

### Score: 6/10

Deductions:
- No React component rendering tests (-2)
- No accessibility/keyboard tests (-1)
- Skipped tests for disabled state (-1)

---

## Overall Score: 40/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 9/10 | High | Excellent ARIA and keyboard support |
| API Design | 7/10 | Medium | Index-based instead of string IDs, naming gaps |
| Design Tokens | 10/10 | Medium | Perfect token usage |
| Features | 8/10 | Low | Good variant support, missing vertical |
| Testing | 6/10 | Medium | DSL tests only, no React tests |
| **Total** | **40/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)

None identified. Component is production-ready.

### P1 - Important (Next Sprint)

1. **Add React component tests**: Create integration tests that verify:
   - Click handling activates correct tab
   - Keyboard navigation works correctly
   - Disabled tabs are skipped
   - ARIA attributes are correct

   ```typescript
   // Example test needed
   it('should navigate tabs with arrow keys', async () => {
     render(<StaticTabs tabs={mockTabs} />);
     const firstTab = screen.getByRole('tab', { name: 'Tab 1' });
     firstTab.focus();
     await userEvent.keyboard('{ArrowRight}');
     expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
   });
   ```

2. **Fix skipped tests**: Implement `:disabled` state parsing in DSL to enable the skipped tests

3. **Consider API alignment**: Align prop naming with shadcn patterns:
   - `activeIndex` -> `value` (with string type)
   - `onChange` -> `onValueChange`
   - Add `defaultValue` prop

### P2 - Nice to Have (Backlog)

1. **Vertical orientation**: Add support for `orientation="vertical"` with appropriate keyboard handling (ArrowUp/ArrowDown)

2. **Manual activation mode**: Add `activationMode="manual"` where arrow keys move focus but don't activate

3. **Tab icons**: Support icon content in tab labels

4. **Add `aria-orientation`**: Explicitly set orientation attribute

---

## Action Items for WF-0002

- [ ] Create `tabs.render.test.tsx` with React Testing Library tests
- [ ] Add keyboard navigation tests for all arrow key + Home/End scenarios
- [ ] Add ARIA attribute verification tests
- [ ] Implement `:disabled` state parsing in DSL (unblock skipped tests)
- [ ] Consider refactoring to use string-based tab IDs instead of indices
