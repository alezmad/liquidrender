# WF-0002 Agent Prompts

## Wave 1: P0 Critical Tests

### T1-T4: Component Tests (Button, Modal, Form, Input)

```
You are writing comprehensive tests for the {COMPONENT} component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="{SHADCN_REF}" to get shadcn reference
2. Read the liquid-render component: `packages/liquid-render/src/renderer/components/{FILE}.tsx`
3. Create test file: `packages/liquid-render/tests/{FILE}.test.tsx`

## Test Coverage Requirements
- Rendering: basic render, with props variations
- Accessibility: ARIA attributes, roles, keyboard navigation
- Interactions: click handlers, focus management
- Edge cases: empty states, error states

## Output Format
Write a complete test file using Vitest and React Testing Library.
Include at least 10 test cases covering the above categories.
```

### T5-T7: Chart Tests (LineChart, BarChart, PieChart)

```
You are writing comprehensive tests for the {COMPONENT} chart component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="chart" to get shadcn chart patterns
2. Read: `packages/liquid-render/src/renderer/components/{FILE}.tsx`
3. Create: `packages/liquid-render/tests/{FILE}.test.tsx`

## Test Coverage
- Rendering with valid data
- Empty data state
- SSR fallback behavior
- Auto-detection of data fields
- Design token usage
- Tooltip rendering
- Legend rendering

## Note
Charts use Recharts - mock ResponsiveContainer for tests.
```

---

## Wave 2: Chart Accessibility

### T8-T10: Chart A11y (LineChart, BarChart, PieChart)

```
You are improving accessibility for the {COMPONENT} chart component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="chart" to get shadcn patterns
2. Read current: `packages/liquid-render/src/renderer/components/{FILE}.tsx`
3. Modify the component to add:

## Required Changes
1. Add `role="img"` to chart container
2. Add `aria-label` describing the chart (use title prop or generate)
3. Add `aria-describedby` pointing to a visually hidden data summary
4. Implement ChartConfig pattern from shadcn for theme-aware colors
5. Add keyboard navigation for tooltips (optional)

## Preserve
- Existing DSL API compatibility
- Design token usage
- SSR fallback behavior
```

---

## Wave 3: Radix Migration

### T11: Select to Radix

```
You are migrating the Select component to use Radix UI primitives.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="select"
2. Read current: `packages/liquid-render/src/renderer/components/select.tsx`
3. Install check: Ensure @radix-ui/react-select is available

## Migration Steps
1. Import Radix Select primitives
2. Replace native <select> with Radix Select.Root, Trigger, Content, Item
3. Preserve StaticSelect API
4. Add keyboard navigation (arrow keys, type-ahead)
5. Add focus ring styling using tokens
6. Maintain DSL compatibility (binding, options parsing)

## Preserve
- Design tokens from utils.ts
- data-liquid-type attribute
- Existing props interface
```

### T12: Radio to Radix

```
You are migrating the Radio component to use Radix UI primitives.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="radio-group"
2. Read current: `packages/liquid-render/src/renderer/components/radio.tsx`

## Migration Steps
1. Import @radix-ui/react-radio-group
2. Replace manual implementation with RadioGroup.Root, Item, Indicator
3. Add proper ARIA roles (handled by Radix)
4. Add keyboard navigation (arrow keys within group)
5. Add focus ring styling
6. Create RadioGroup wrapper component
```

### T13: Popover to Radix

```
You are migrating the Popover component to use Radix UI primitives.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="popover"
2. Read current: `packages/liquid-render/src/renderer/components/popover.tsx`

## Migration Steps
1. Import @radix-ui/react-popover
2. Replace custom toggle with Popover.Root, Trigger, Portal, Content
3. Add focus trap (handled by Radix)
4. Add Escape key to close
5. Add proper positioning (side, align props)
6. Add animation via data-state
```

### T14: Tooltip to Radix

```
You are migrating the Tooltip component to use Radix UI primitives.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="tooltip"
2. Read current: `packages/liquid-render/src/renderer/components/tooltip.tsx`

## Migration Steps
1. Import @radix-ui/react-tooltip
2. Add TooltipProvider at root level
3. Replace CSS hover with Tooltip.Root, Trigger, Portal, Content
4. Add delayDuration prop
5. Add proper ARIA (handled by Radix)
6. Add animation via data-state
```

---

## Wave 4: Focus Rings + ARIA

### T15-T22: Focus Ring Pattern

```
You are adding consistent focus ring styling to the {COMPONENT} component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="{SHADCN_REF}"
2. Read current: `packages/liquid-render/src/renderer/components/{FILE}.tsx`

## Focus Ring Pattern (from shadcn)
```css
outline: none;
focus-visible: {
  border-color: tokens.colors.ring;
  box-shadow: `0 0 0 3px ${tokens.colors.ring}50`;
}
```

## Additional ARIA Fixes
{SPECIFIC_ARIA_FIXES}

## Preserve
- Existing functionality
- Design tokens
- DSL compatibility
```

---

## Wave 5: UX Polish

### T23: Drawer Gestures

```
You are adding swipe gestures to the Drawer component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="drawer"
2. Consider using vaul library for mobile gestures
3. Add touch swipe to close
4. Add drag handle indicator
5. Add smooth open/close animations
```

### T24: Accordion Animations

```
You are adding animations to the Accordion component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="accordion"
2. Add height animation for content expand/collapse
3. Add rotate animation for chevron indicator
4. Use CSS transitions or Radix animation data-state
```

### T25: Form Validation

```
You are adding validation integration to the Form component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="form"
2. Add error state styling
3. Add aria-invalid support
4. Add error message display
5. Consider react-hook-form integration patterns
```

### T26: Progress ARIA Placement

```
You are fixing ARIA attribute placement in the Progress component.

## Instructions
1. Use `mcp__shadcn-ui__get_component` with componentName="progress"
2. Move role="progressbar" from indicator to track/root element
3. Move aria-valuenow, aria-valuemin, aria-valuemax to root
4. Ensure aria-label is on root element
```

---

## Usage

To launch an agent with a prompt:
```
Task tool with subagent_type="general-purpose"
Provide the prompt above with {VARIABLES} replaced
```
