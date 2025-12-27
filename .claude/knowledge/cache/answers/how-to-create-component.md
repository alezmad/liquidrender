# How to Create a LiquidRender Component

## Location

`packages/liquid-render/src/renderer/components/`

## File Structure

Follow this order in every component file:

```typescript
// 1. Imports
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles } from './utils';
import { resolveBinding } from '../data-context';

// 2. Types
interface MyComponentProps extends LiquidComponentProps {
  // additional props
}

// 3. Styles (using tokens, never hardcode)
const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
  }),
  // ...
};

// 4. Helpers (if needed)
function formatData(raw: unknown): ProcessedData { ... }

// 5. Sub-components (if needed)
function Header({ title }: { title: string }) { ... }

// 6. Main Component
export function MyComponent({ block, data }: LiquidComponentProps) {
  // Resolve bindings from DSL
  const items = resolveBinding(block.props?.data, data);

  // Handle empty state
  if (!items || items.length === 0) {
    return <div style={styles.empty}>No data available</div>;
  }

  return (
    <div
      data-liquid-type="my-component"
      style={styles.wrapper}
    >
      {/* content */}
    </div>
  );
}

// 7. Static variant (for non-DSL usage)
export function StaticMyComponent({ data }: { data: Item[] }) { ... }
```

## Required Patterns

### Use Design Tokens

```typescript
// YES
color: tokens.colors.foreground
padding: tokens.spacing.md
borderRadius: tokens.radius.md

// NO
color: '#333'
padding: '16px'
```

### Add data-liquid-type

```tsx
<div data-liquid-type="my-component">
```

### Handle Empty States

```typescript
if (!data || data.length === 0) {
  return (
    <div style={styles.placeholder}>
      No data available
    </div>
  );
}
```

### Resolve DSL Bindings

```typescript
const value = resolveBinding(block.props?.myProp, data);
```

## Reference Components

- Simple: `icon.tsx`, `heading.tsx`
- With data: `data-table.tsx`
- With charts: `line-chart.tsx`, `bar-chart.tsx`
- With forms: `radio.tsx`, `switch.tsx`

## Checklist

- [ ] File in `components/` directory
- [ ] Uses `LiquidComponentProps` interface
- [ ] All styles use `tokens`
- [ ] Has `data-liquid-type` attribute
- [ ] Handles null/empty states
- [ ] Has static variant export
- [ ] No hardcoded colors or spacing
