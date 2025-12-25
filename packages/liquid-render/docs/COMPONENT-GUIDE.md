# LiquidCode Component Authoring Guide

Standards for creating consistent React components in the LiquidCode renderer.

---

## File Structure

Every component file follows this structure:

```tsx
// [ComponentName] Component - Brief description
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, ... } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface ComponentSpecificType { ... }

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: { ... },
  // ... component-specific styles
};

// ============================================================================
// Helpers
// ============================================================================

function helperFunction() { ... }

// ============================================================================
// Sub-components (if needed)
// ============================================================================

function SubComponent() { ... }

// ============================================================================
// Main Component
// ============================================================================

export function ComponentName({ block, data }: LiquidComponentProps): React.ReactElement {
  // 1. Resolve bindings
  const value = resolveBinding(block.binding, data);

  // 2. Extract block properties
  const label = block.label;
  const color = getBlockColor(block);

  // 3. Render
  return (
    <div data-liquid-type="typename" style={styles.wrapper}>
      {/* content */}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticComponentProps { ... }

export function StaticComponent(props: StaticComponentProps): React.ReactElement {
  // For use outside LiquidUI context
}

export default ComponentName;
```

---

## Design Token Usage

**Always use tokens from `utils.ts`** - never hardcode values:

```tsx
// CORRECT
padding: tokens.spacing.md,
fontSize: tokens.fontSize.sm,
color: tokens.colors.foreground,
borderRadius: tokens.radius.lg,

// INCORRECT
padding: '16px',
fontSize: '14px',
color: '#0a0a0a',
borderRadius: '8px',
```

### Token Categories

| Category | Usage |
|----------|-------|
| `tokens.colors.*` | All colors (supports CSS variables for theming) |
| `tokens.spacing.*` | Margins, padding, gaps (`xs` to `2xl`) |
| `tokens.radius.*` | Border radius (`sm` to `full`) |
| `tokens.fontSize.*` | Font sizes (`xs` to `4xl`) |
| `tokens.fontWeight.*` | Font weights (`normal` to `bold`) |
| `tokens.shadow.*` | Box shadows (`none` to `lg`) |
| `tokens.transition.*` | Transitions (`fast`, `normal`, `slow`) |

### Chart Colors

Use `chartColors` array for consistent chart palettes:

```tsx
import { chartColors } from './utils';

// Access colors by index
stroke={chartColors[i % chartColors.length]}
```

---

## Style Patterns

### Card-like Containers

```tsx
import { cardStyles, mergeStyles } from './utils';

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    // additional overrides
  }),
};
```

### Buttons

```tsx
import { buttonStyles } from './utils';

const style = buttonStyles('default', 'md'); // variant, size
```

### Inputs

```tsx
import { inputStyles } from './utils';

const style = inputStyles({ /* overrides */ });
```

---

## Component Props Interface

All dynamic components receive `LiquidComponentProps`:

```tsx
interface LiquidComponentProps {
  block: Block;        // The parsed block from DSL
  data: DataContext;   // Data for binding resolution
  children?: ReactNode;
  className?: string;
}
```

### Accessing Block Properties

```tsx
// Binding resolution
const value = resolveBinding(block.binding, data);

// Label (with auto-generation from field name)
const label = block.label || fieldToLabel(block.binding?.field || '');

// Color from style
const color = getBlockColor(block);

// Layout properties
const layoutStyles = getLayoutStyles(block);

// Explicit columns (for tables)
const columns = block.columns;
```

---

## Data Attribute Convention

Every component MUST have a `data-liquid-type` attribute:

```tsx
<div data-liquid-type="kpi" ...>
<div data-liquid-type="line" ...>
<div data-liquid-type="table" ...>
```

This enables:
- CSS targeting
- Testing queries
- Debug inspection

---

## SSR/Browser Detection

For components that require browser APIs (charts, etc.):

```tsx
import { isBrowser } from './utils';

if (!isBrowser) {
  return (
    <div style={styles.placeholder}>
      [Chart placeholder - {data.length} points]
    </div>
  );
}
```

---

## Empty State Handling

Always handle empty/null data gracefully:

```tsx
if (!data || data.length === 0) {
  return (
    <div style={styles.wrapper}>
      {label && <div style={styles.header}>{label}</div>}
      <div style={styles.empty}>No data available</div>
    </div>
  );
}
```

---

## Display Value Formatting

Use `formatDisplayValue()` for consistent value display:

```tsx
import { formatDisplayValue } from './utils';

// Handles: numbers, dates, booleans, null, arrays
<span>{formatDisplayValue(value)}</span>
```

Features:
- Large numbers: `1234567` → `1.2M`
- Thousands: `12345` → `12.3K`
- Null/undefined: `—`
- Booleans: `Yes`/`No`
- Dates: Localized format

---

## Label Generation

Use `fieldToLabel()` for automatic label creation:

```tsx
import { fieldToLabel } from './utils';

fieldToLabel('totalRevenue')  // → "Total Revenue"
fieldToLabel('order_count')   // → "Order Count"
fieldToLabel('avgValue')      // → "Avg Value"
```

---

## Static vs Dynamic Components

### Dynamic (DSL-driven)
- Receives `LiquidComponentProps`
- Used by `LiquidUI` renderer
- Name: `ComponentName`

### Static (standalone)
- Explicit props interface
- Used directly in React apps
- Name: `StaticComponentName`

```tsx
// Dynamic - used by LiquidUI
export function DataTable({ block, data }: LiquidComponentProps) { ... }

// Static - used directly
export function StaticTable({
  data,
  columns,
  title,
  sortable
}: StaticTableProps) { ... }
```

---

## Export Conventions

```tsx
// Named exports for all variants
export { ComponentName, StaticComponent } from './component';

// Default export = main dynamic component
export { ComponentName as default } from './component';

// Register in liquidComponents map (index.ts)
export const liquidComponents = {
  typename: ComponentName,
};
```

---

## Chart Components (Recharts)

Charts use Recharts with these patterns:

```tsx
import {
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// Always wrap in ResponsiveContainer
<ResponsiveContainer width="100%" height={220}>
  <RechartsComponent data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
    <XAxis
      dataKey={xKey}
      tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
      stroke={tokens.colors.border}
    />
    <YAxis
      tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
      stroke={tokens.colors.border}
    />
    <Tooltip contentStyle={{
      backgroundColor: tokens.colors.card,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: tokens.radius.md,
    }} />
    <Legend wrapperStyle={{ fontSize: tokens.fontSize.sm }} />
  </RechartsComponent>
</ResponsiveContainer>
```

### Auto-detection Pattern

Charts should auto-detect x/y fields when not explicit:

```tsx
function detectXYFields(data: DataPoint[]): { x: string; y: string } {
  const firstRow = data[0];
  const keys = Object.keys(firstRow);

  // x = first string/date field
  const xField = keys.find(k => typeof firstRow[k] === 'string');

  // y = first numeric field (not x)
  const yField = keys.find(k => typeof firstRow[k] === 'number' && k !== xField);

  return { x: xField, y: yField };
}
```

---

## Interactive Components

For stateful components (forms, modals):

```tsx
// Controlled variant (external state)
export function ControlledComponent({ value, onChange, ...props }) { ... }

// Uncontrolled variant (internal state)
export function Component(props) {
  const [value, setValue] = useState(props.defaultValue);
  return <ControlledComponent value={value} onChange={setValue} {...props} />;
}

// Hook for complex state
export function useComponentState(options) {
  const [state, setState] = useState(...);
  return { state, ...actions };
}
```

---

## Accessibility

- All interactive elements need proper `role` attributes
- Use semantic HTML (`<button>`, `<table>`, etc.)
- Include `aria-label` for icon-only buttons
- Ensure keyboard navigation works
- Use `generateId()` for unique IDs:

```tsx
import { generateId } from './utils';

const inputId = generateId('input'); // → "liquid-123"
```

---

## Type Safety

- Always define explicit interfaces for component-specific types
- Use `React.CSSProperties` for style objects
- Prefer `unknown` over `any` for data values
- Use type guards for data validation:

```tsx
function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}
```

---

## Checklist for New Components

- [ ] File follows standard structure with section headers
- [ ] Uses tokens for all style values
- [ ] Has `data-liquid-type` attribute
- [ ] Handles empty/null data states
- [ ] Uses `formatDisplayValue()` for value display
- [ ] Uses `fieldToLabel()` for auto-labels
- [ ] Has SSR placeholder if browser-dependent
- [ ] Includes both dynamic and static variants
- [ ] Registered in `liquidComponents` map
- [ ] Exported from `index.ts`
