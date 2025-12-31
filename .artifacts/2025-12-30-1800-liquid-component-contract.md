# Liquid Component Contract

> The interface specification that defines what makes a component "Liquid-compatible."

---

## Overview

A Liquid Component Contract defines:
1. **What props a block type provides** (input)
2. **How to map those props to a component** (transform)
3. **What capabilities the component supports** (features)

This contract enables ANY component from ANY library to render Liquid specs.

---

## Core Interfaces

### LiquidBlock (Input)

The parsed and resolved block from a Liquid spec:

```typescript
interface LiquidBlock<T extends string = string> {
  /** Unique identifier for this block instance */
  id: string;

  /** Block type (e.g., "button", "card", "line-chart") */
  type: T;

  /** Resolved props (bindings already evaluated) */
  props: Record<string, unknown>;

  /** Raw props (before binding resolution, for debugging) */
  rawProps: Record<string, unknown>;

  /** Child blocks (for container components) */
  children: LiquidBlock[];

  /** Event handlers provided by core */
  handlers: LiquidHandlers;

  /** Accessibility attributes */
  aria: LiquidAria;

  /** Layout hints from parent */
  layout: LiquidLayout;
}

interface LiquidHandlers {
  onClick?: () => void;
  onChange?: (value: unknown) => void;
  onSubmit?: (data: Record<string, unknown>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  // Extensible for custom handlers
  [key: string]: ((...args: unknown[]) => void) | undefined;
}

interface LiquidAria {
  role?: string;
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
}

interface LiquidLayout {
  /** Grid column span */
  colSpan?: number;
  /** Grid row span */
  rowSpan?: number;
  /** Flex grow */
  grow?: number;
  /** Alignment override */
  align?: "start" | "center" | "end" | "stretch";
}
```

### LiquidComponentAdapter (Transform)

Defines how to map a block to a component:

```typescript
interface LiquidComponentAdapter<
  TBlock extends LiquidBlock = LiquidBlock,
  TProps = Record<string, unknown>
> {
  /** The React/Vue/etc component to render */
  component: ComponentType<TProps>;

  /** Map block props to component props */
  mapProps: (block: TBlock, context: LiquidContext) => TProps;

  /** Optional: Zod schema for block validation */
  schema?: ZodType<TBlock["props"]>;

  /** Optional: Declare supported features */
  features?: LiquidFeatures;

  /** Optional: Custom children rendering */
  renderChildren?: (
    children: LiquidBlock[],
    context: LiquidContext
  ) => ReactNode;
}
```

### LiquidTheme (Component Map)

A complete mapping for all block types:

```typescript
interface LiquidTheme {
  /** Theme identifier */
  name: string;

  /** Theme version */
  version: string;

  /** Component adapters keyed by block type */
  components: Record<string, LiquidComponentAdapter>;

  /** Global design tokens (optional override) */
  tokens?: Partial<LiquidTokens>;

  /** Fallback component for unknown types */
  fallback?: LiquidComponentAdapter;
}
```

### LiquidContext (Runtime)

Context available during rendering:

```typescript
interface LiquidContext {
  /** The full data object passed to LiquidRender */
  data: Record<string, unknown>;

  /** Current theme */
  theme: LiquidTheme;

  /** Design tokens (theme + defaults) */
  tokens: LiquidTokens;

  /** Resolve a binding expression */
  resolve: <T>(expr: string | T) => T;

  /** Render child blocks */
  renderBlock: (block: LiquidBlock) => ReactNode;

  /** Register form field (for form components) */
  registerField?: (name: string, value: unknown) => void;

  /** Current nesting depth (for styling) */
  depth: number;
}
```

---

## Block Type Specifications

Each block type has a defined prop contract. Here are the core types:

### Layout Components

#### `container`
```typescript
interface ContainerBlock {
  type: "container";
  props: {
    padding?: "none" | "sm" | "md" | "lg" | "xl";
    background?: "default" | "muted" | "card";
    border?: boolean;
    radius?: "none" | "sm" | "md" | "lg";
    maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  };
  children: LiquidBlock[];
}
```

#### `grid`
```typescript
interface GridBlock {
  type: "grid";
  props: {
    columns?: number | { sm?: number; md?: number; lg?: number };
    gap?: "none" | "sm" | "md" | "lg";
    align?: "start" | "center" | "end" | "stretch";
  };
  children: LiquidBlock[];
}
```

#### `stack`
```typescript
interface StackBlock {
  type: "stack";
  props: {
    direction?: "horizontal" | "vertical";
    gap?: "none" | "sm" | "md" | "lg";
    align?: "start" | "center" | "end" | "stretch";
    justify?: "start" | "center" | "end" | "between" | "around";
    wrap?: boolean;
  };
  children: LiquidBlock[];
}
```

### Display Components

#### `text`
```typescript
interface TextBlock {
  type: "text";
  props: {
    content: string;
    variant?: "body" | "muted" | "lead" | "small" | "code";
    weight?: "normal" | "medium" | "semibold" | "bold";
    align?: "left" | "center" | "right";
  };
}
```

#### `heading`
```typescript
interface HeadingBlock {
  type: "heading";
  props: {
    content: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    align?: "left" | "center" | "right";
  };
}
```

#### `badge`
```typescript
interface BadgeBlock {
  type: "badge";
  props: {
    content: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}
```

### Interactive Components

#### `button`
```typescript
interface ButtonBlock {
  type: "button";
  props: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
    size?: "sm" | "default" | "lg" | "icon";
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    iconPosition?: "left" | "right";
  };
  handlers: {
    onClick?: () => void;
  };
}
```

#### `input`
```typescript
interface InputBlock {
  type: "input";
  props: {
    name: string;
    label?: string;
    placeholder?: string;
    type?: "text" | "email" | "password" | "number" | "tel" | "url";
    value?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
  };
  handlers: {
    onChange?: (value: string) => void;
    onBlur?: () => void;
  };
}
```

#### `select`
```typescript
interface SelectBlock {
  type: "select";
  props: {
    name: string;
    label?: string;
    placeholder?: string;
    options: Array<{ value: string; label: string }>;
    value?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
  };
  handlers: {
    onChange?: (value: string) => void;
  };
}
```

### Data Display Components

#### `kpi-card`
```typescript
interface KpiCardBlock {
  type: "kpi-card";
  props: {
    title: string;
    value: string | number;
    previousValue?: number;
    trend?: number; // percentage change
    trendDirection?: "up" | "down" | "neutral";
    format?: "number" | "currency" | "percent";
    icon?: string;
  };
}
```

#### `data-table`
```typescript
interface DataTableBlock {
  type: "data-table";
  props: {
    data: Record<string, unknown>[];
    columns: Array<{
      key: string;
      header: string;
      sortable?: boolean;
      format?: "text" | "number" | "currency" | "date" | "badge";
      width?: string;
    }>;
    pageSize?: number;
    searchable?: boolean;
    selectable?: boolean;
  };
  handlers: {
    onRowClick?: (row: Record<string, unknown>) => void;
    onSelectionChange?: (rows: Record<string, unknown>[]) => void;
  };
}
```

### Chart Components

#### `line-chart`
```typescript
interface LineChartBlock {
  type: "line-chart";
  props: {
    data: Record<string, unknown>[];
    xKey: string;
    yKeys: string[];
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    curve?: "linear" | "smooth" | "step";
    colors?: string[];
  };
}
```

#### `bar-chart`
```typescript
interface BarChartBlock {
  type: "bar-chart";
  props: {
    data: Record<string, unknown>[];
    xKey: string;
    yKeys: string[];
    height?: number;
    stacked?: boolean;
    horizontal?: boolean;
    showLegend?: boolean;
    showGrid?: boolean;
    colors?: string[];
  };
}
```

#### `pie-chart`
```typescript
interface PieChartBlock {
  type: "pie-chart";
  props: {
    data: Array<{ name: string; value: number }>;
    height?: number;
    donut?: boolean;
    showLegend?: boolean;
    showLabels?: boolean;
    colors?: string[];
  };
}
```

---

## Feature Declarations

Components can declare what features they support:

```typescript
interface LiquidFeatures {
  /** Supports loading/skeleton state */
  loading?: boolean;

  /** Supports error state */
  error?: boolean;

  /** Supports empty state */
  empty?: boolean;

  /** Supports pagination */
  pagination?: boolean;

  /** Supports sorting */
  sorting?: boolean;

  /** Supports filtering */
  filtering?: boolean;

  /** Supports selection */
  selection?: boolean;

  /** Supports drag and drop */
  dragDrop?: boolean;

  /** Supports responsive breakpoints */
  responsive?: boolean;

  /** Supports dark mode */
  darkMode?: boolean;

  /** Supports RTL */
  rtl?: boolean;
}
```

When a spec uses a feature the component doesn't support, the renderer can:
1. Show a warning in dev mode
2. Gracefully degrade (ignore the feature)
3. Use a fallback component that does support it

---

## The `liquify()` Function

Helper to create adapters from any component:

```typescript
function liquify<TProps>(
  component: ComponentType<TProps>,
  options: {
    /** Zod schema for block validation */
    schema?: ZodType;

    /** Map block to component props */
    mapProps: (
      block: LiquidBlock,
      context: LiquidContext
    ) => TProps;

    /** Declare features */
    features?: LiquidFeatures;

    /** Custom children rendering */
    renderChildren?: (
      children: LiquidBlock[],
      context: LiquidContext
    ) => ReactNode;
  }
): LiquidComponentAdapter<LiquidBlock, TProps>;
```

### Example Usage

```typescript
import { Button } from "@turbostarter/ui-web/button";
import { liquify } from "@liquid/core";

const LiquidButton = liquify(Button, {
  schema: z.object({
    label: z.string(),
    variant: z.enum(["default", "secondary", "destructive", "outline", "ghost", "link"]).optional(),
    size: z.enum(["sm", "default", "lg", "icon"]).optional(),
    disabled: z.boolean().optional(),
  }),

  mapProps: (block, context) => ({
    variant: block.props.variant ?? "default",
    size: block.props.size ?? "default",
    disabled: block.props.disabled,
    onClick: block.handlers.onClick,
    children: block.props.label,
  }),

  features: {
    loading: true, // Button supports loading prop
    darkMode: true,
  },
});
```

---

## Design Tokens

Standard tokens that themes can override:

```typescript
interface LiquidTokens {
  colors: {
    // Semantic colors
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;

    // Chart colors
    chart: string[];

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  spacing: {
    xs: string;  // 4px
    sm: string;  // 8px
    md: string;  // 16px
    lg: string;  // 24px
    xl: string;  // 32px
    "2xl": string; // 48px
  };

  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };

  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };

  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };

  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
}
```

---

## Validation

### Block Validation

Each adapter can define a Zod schema for its block:

```typescript
const buttonAdapter: LiquidComponentAdapter = {
  component: Button,
  schema: z.object({
    label: z.string().min(1, "Button label required"),
    variant: z.enum(["default", "secondary", "destructive"]).optional(),
    disabled: z.boolean().optional(),
  }),
  mapProps: (block) => ({ /* ... */ }),
};
```

### Spec Validation

The core validates the entire spec:

```typescript
import { validateSpec } from "@liquid/core";

const result = validateSpec(spec, theme);

if (!result.valid) {
  console.error(result.errors);
  // [
  //   { path: "children[2].props.label", message: "Button label required" },
  //   { path: "children[5].type", message: "Unknown block type: unknown-type" }
  // ]
}
```

---

## Error Handling

### Unknown Block Type

```typescript
// Option 1: Use theme's fallback component
<div data-liquid-unknown={block.type}>
  Unknown component: {block.type}
</div>

// Option 2: Skip and warn
console.warn(`Unknown block type: ${block.type}`);
return null;

// Option 3: Throw in development
if (process.env.NODE_ENV === "development") {
  throw new Error(`Unknown block type: ${block.type}`);
}
```

### Missing Required Props

```typescript
// Validation happens before rendering
const errors = validateBlock(block, adapter.schema);
if (errors.length > 0) {
  return <ErrorBoundary errors={errors} block={block} />;
}
```

### Runtime Errors

```typescript
// Each component wrapped in error boundary
<LiquidErrorBoundary block={block}>
  <Component {...mappedProps} />
</LiquidErrorBoundary>
```

---

## Testing Contract

Theme authors should test their adapters:

```typescript
import { testAdapter } from "@liquid/testing";

describe("ButtonAdapter", () => {
  it("maps props correctly", () => {
    const block = createBlock("button", {
      label: "Click me",
      variant: "destructive",
    });

    const props = buttonAdapter.mapProps(block, mockContext);

    expect(props.children).toBe("Click me");
    expect(props.variant).toBe("destructive");
  });

  it("validates schema", () => {
    const result = testAdapter(buttonAdapter, {
      valid: [
        { label: "OK" },
        { label: "Submit", variant: "default" },
      ],
      invalid: [
        { label: "" }, // empty label
        { variant: "invalid" }, // missing label
      ],
    });

    expect(result.passed).toBe(true);
  });
});
```

---

## Migration from Current Components

Current LiquidRender components become the default theme:

```typescript
// Current
export function Button({ block, data }: LiquidComponentProps) {
  const label = resolveBinding(block.label, data);
  return <button>{label}</button>;
}

// Becomes
const buttonAdapter: LiquidComponentAdapter = {
  component: ButtonPrimitive, // extracted presentation
  mapProps: (block, context) => ({
    children: block.props.label,
    variant: block.props.variant,
    onClick: block.handlers.onClick,
  }),
};
```

---

*Document created: 2025-12-30*
*Status: Specification*
