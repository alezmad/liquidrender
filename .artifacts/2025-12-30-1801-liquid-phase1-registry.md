# Phase 1: Component Registry Implementation

> Step-by-step implementation guide for enabling theme switching in LiquidRender.

---

## Goal

Enable swapping component libraries via a provider:

```tsx
// Before (still works - backwards compatible)
<LiquidRender spec={spec} data={data} />

// After (opt-in to different theme)
<LiquidProvider theme={turbostarterTheme}>
  <LiquidRender spec={spec} data={data} />
</LiquidProvider>
```

---

## Current Architecture

```
packages/liquid-render/src/
├── renderer/
│   ├── components/           ← 77 component files
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── line-chart.tsx
│   │   └── utils.ts          ← tokens, styles
│   ├── component-registry.ts ← type → component map
│   └── liquid-renderer.tsx   ← main render logic
├── data-context.tsx          ← binding resolution
└── index.ts
```

The `component-registry.ts` already has a map:

```typescript
const componentMap: Record<string, LiquidComponent> = {
  button: Button,
  card: Card,
  "line-chart": LineChart,
  // ... 74 more
};
```

---

## Implementation Steps

### Step 1: Create Theme Types

**File:** `packages/liquid-render/src/types/theme.ts`

```typescript
import type { ComponentType } from "react";
import type { LiquidComponentProps } from "../renderer/components/utils";

/**
 * A function that maps block props to component props
 */
export type PropMapper<TProps = Record<string, unknown>> = (
  block: Record<string, unknown>,
  data: Record<string, unknown>,
  resolve: <T>(expr: string | T) => T
) => TProps;

/**
 * Adapter for a single component type
 */
export interface LiquidComponentAdapter<TProps = Record<string, unknown>> {
  /** The component to render */
  component: ComponentType<TProps>;

  /** Optional: Map block props to component props */
  mapProps?: PropMapper<TProps>;

  /** Optional: Feature flags */
  features?: {
    loading?: boolean;
    error?: boolean;
    empty?: boolean;
  };
}

/**
 * Legacy component (current format)
 */
export type LiquidLegacyComponent = ComponentType<LiquidComponentProps>;

/**
 * A theme is a collection of component adapters
 */
export interface LiquidTheme {
  /** Theme identifier */
  name: string;

  /** Version string */
  version: string;

  /** Component adapters keyed by block type */
  components: Record<string, LiquidComponentAdapter | LiquidLegacyComponent>;

  /** Fallback for unknown block types */
  fallback?: LiquidComponentAdapter | LiquidLegacyComponent;
}

/**
 * Check if a component is a legacy component
 */
export function isLegacyComponent(
  component: LiquidComponentAdapter | LiquidLegacyComponent
): component is LiquidLegacyComponent {
  return typeof component === "function";
}

/**
 * Check if a component is an adapter
 */
export function isComponentAdapter(
  component: LiquidComponentAdapter | LiquidLegacyComponent
): component is LiquidComponentAdapter {
  return typeof component === "object" && "component" in component;
}
```

### Step 2: Create Theme Context

**File:** `packages/liquid-render/src/context/theme-context.tsx`

```typescript
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LiquidTheme } from "../types/theme";
import { defaultTheme } from "../themes/default";

interface ThemeContextValue {
  theme: LiquidTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface LiquidProviderProps {
  /** Theme to use for rendering */
  theme?: LiquidTheme;
  children: ReactNode;
}

/**
 * Provider for Liquid theme context
 */
export function LiquidProvider({ theme, children }: LiquidProviderProps) {
  const value: ThemeContextValue = {
    theme: theme ?? defaultTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access current theme
 */
export function useLiquidTheme(): LiquidTheme {
  const context = useContext(ThemeContext);

  // If no provider, use default theme (backwards compatibility)
  if (!context) {
    return defaultTheme;
  }

  return context.theme;
}

/**
 * Hook to get a component for a block type
 */
export function useLiquidComponent(type: string) {
  const theme = useLiquidTheme();
  return theme.components[type] ?? theme.fallback ?? null;
}
```

### Step 3: Create Default Theme

**File:** `packages/liquid-render/src/themes/default/index.ts`

```typescript
import type { LiquidTheme } from "../../types/theme";

// Import all current components
import { Accordion } from "../../renderer/components/accordion";
import { Alert } from "../../renderer/components/alert";
import { AlertDialog } from "../../renderer/components/alertdialog";
import { AreaChart } from "../../renderer/components/area-chart";
import { Audio } from "../../renderer/components/audio";
import { Avatar } from "../../renderer/components/avatar";
import { Badge } from "../../renderer/components/badge";
import { BarChart } from "../../renderer/components/bar-chart";
import { Breadcrumb } from "../../renderer/components/breadcrumb";
import { Button } from "../../renderer/components/button";
import { Calendar } from "../../renderer/components/calendar";
import { Card } from "../../renderer/components/card";
import { Carousel } from "../../renderer/components/carousel";
import { Checkbox } from "../../renderer/components/checkbox";
import { Collapsible } from "../../renderer/components/collapsible";
import { Color } from "../../renderer/components/color";
import { Command } from "../../renderer/components/command";
import { Container } from "../../renderer/components/container";
import { ContextMenu } from "../../renderer/components/contextmenu";
import { DataTable } from "../../renderer/components/data-table";
import { DateInput } from "../../renderer/components/date";
import { DateRange } from "../../renderer/components/daterange";
import { Drawer } from "../../renderer/components/drawer";
import { Dropdown } from "../../renderer/components/dropdown";
import { Empty } from "../../renderer/components/empty";
import { Flow } from "../../renderer/components/flow";
import { Form } from "../../renderer/components/form";
import { Gauge } from "../../renderer/components/gauge";
import { Grid } from "../../renderer/components/grid";
import { Header } from "../../renderer/components/header";
import { Heading } from "../../renderer/components/heading";
import { Heatmap } from "../../renderer/components/heatmap";
import { HoverCard } from "../../renderer/components/hovercard";
import { Icon } from "../../renderer/components/icon";
import { Image } from "../../renderer/components/image";
import { Input } from "../../renderer/components/input";
import { Kanban } from "../../renderer/components/kanban";
import { KpiCard } from "../../renderer/components/kpi-card";
import { Lightbox } from "../../renderer/components/lightbox";
import { LineChart } from "../../renderer/components/line-chart";
import { List } from "../../renderer/components/list";
import { MapComponent } from "../../renderer/components/map";
import { Modal } from "../../renderer/components/modal";
import { Nav } from "../../renderer/components/nav";
import { Org } from "../../renderer/components/org";
import { Otp } from "../../renderer/components/otp";
import { Pagination } from "../../renderer/components/pagination";
import { PieChart } from "../../renderer/components/pie-chart";
import { Popover } from "../../renderer/components/popover";
import { Progress } from "../../renderer/components/progress";
import { Radio } from "../../renderer/components/radio";
import { Range } from "../../renderer/components/range";
import { Rating } from "../../renderer/components/rating";
import { Sankey } from "../../renderer/components/sankey";
import { Scatter } from "../../renderer/components/scatter";
import { Select } from "../../renderer/components/select";
import { Separator } from "../../renderer/components/separator";
import { Sheet } from "../../renderer/components/sheet";
import { Sidebar } from "../../renderer/components/sidebar";
import { Skeleton } from "../../renderer/components/skeleton";
import { Sparkline } from "../../renderer/components/sparkline";
import { Spinner } from "../../renderer/components/spinner";
import { Split } from "../../renderer/components/split";
import { Stack } from "../../renderer/components/stack";
import { Stepper } from "../../renderer/components/stepper";
import { Switch } from "../../renderer/components/switch";
import { Tabs } from "../../renderer/components/tabs";
import { Tag } from "../../renderer/components/tag";
import { Text } from "../../renderer/components/text";
import { Textarea } from "../../renderer/components/textarea";
import { Timeline } from "../../renderer/components/timeline";
import { Time } from "../../renderer/components/time";
import { Toast } from "../../renderer/components/toast";
import { Tooltip } from "../../renderer/components/tooltip";
import { Tree } from "../../renderer/components/tree";
import { Upload } from "../../renderer/components/upload";
import { Video } from "../../renderer/components/video";

// Fallback for unknown types
import { UnknownComponent } from "../../renderer/components/unknown";

/**
 * Default theme using current LiquidRender components
 * These are "legacy" format - they receive (block, data) props directly
 */
export const defaultTheme: LiquidTheme = {
  name: "default",
  version: "1.0.0",
  components: {
    // Layout
    container: Container,
    grid: Grid,
    stack: Stack,
    split: Split,
    sidebar: Sidebar,

    // Typography
    heading: Heading,
    text: Text,

    // Navigation
    nav: Nav,
    breadcrumb: Breadcrumb,
    tabs: Tabs,
    stepper: Stepper,
    pagination: Pagination,

    // Data Display
    card: Card,
    "kpi-card": KpiCard,
    badge: Badge,
    tag: Tag,
    avatar: Avatar,
    icon: Icon,
    image: Image,
    list: List,
    tree: Tree,
    "data-table": DataTable,
    timeline: Timeline,
    kanban: Kanban,
    calendar: Calendar,
    empty: Empty,
    skeleton: Skeleton,

    // Charts
    "line-chart": LineChart,
    "bar-chart": BarChart,
    "area-chart": AreaChart,
    "pie-chart": PieChart,
    scatter: Scatter,
    heatmap: Heatmap,
    gauge: Gauge,
    sparkline: Sparkline,
    sankey: Sankey,

    // Diagrams
    flow: Flow,
    org: Org,
    map: MapComponent,

    // Forms
    form: Form,
    input: Input,
    textarea: Textarea,
    select: Select,
    checkbox: Checkbox,
    radio: Radio,
    switch: Switch,
    range: Range,
    rating: Rating,
    date: DateInput,
    daterange: DateRange,
    time: Time,
    color: Color,
    otp: Otp,
    upload: Upload,

    // Actions
    button: Button,

    // Feedback
    alert: Alert,
    "alert-dialog": AlertDialog,
    progress: Progress,
    spinner: Spinner,
    toast: Toast,

    // Overlays
    modal: Modal,
    drawer: Drawer,
    sheet: Sheet,
    popover: Popover,
    tooltip: Tooltip,
    dropdown: Dropdown,
    "context-menu": ContextMenu,
    "hover-card": HoverCard,
    command: Command,

    // Disclosure
    accordion: Accordion,
    collapsible: Collapsible,

    // Media
    video: Video,
    audio: Audio,
    carousel: Carousel,
    lightbox: Lightbox,

    // Misc
    header: Header,
    separator: Separator,
  },
  fallback: UnknownComponent,
};
```

### Step 4: Create Unknown Component

**File:** `packages/liquid-render/src/renderer/components/unknown.tsx`

```typescript
import React from "react";
import type { LiquidComponentProps } from "./utils";
import { tokens } from "./utils";

const styles = {
  wrapper: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.muted,
    border: `1px dashed ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
  },
  type: {
    fontFamily: "monospace",
    fontWeight: tokens.fontWeight.medium,
  },
};

export function UnknownComponent({
  block,
}: LiquidComponentProps): React.ReactElement {
  return (
    <div data-liquid-type="unknown" style={styles.wrapper}>
      Unknown component type:{" "}
      <span style={styles.type}>{block.type || "undefined"}</span>
    </div>
  );
}

export default UnknownComponent;
```

### Step 5: Update LiquidRenderer

**File:** `packages/liquid-render/src/renderer/liquid-renderer.tsx`

Update to use theme context:

```typescript
"use client";

import React from "react";
import { useLiquidTheme, isLegacyComponent, isComponentAdapter } from "../context/theme-context";
import { resolveBinding } from "../data-context";
import type { LiquidComponentProps } from "./components/utils";

interface LiquidRendererProps {
  spec: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export function LiquidRenderer({ spec, data = {} }: LiquidRendererProps) {
  const theme = useLiquidTheme();

  const renderBlock = (block: Record<string, unknown>, index: number) => {
    const type = block.type as string;
    const componentDef = theme.components[type] ?? theme.fallback;

    if (!componentDef) {
      console.warn(`No component found for type: ${type}`);
      return null;
    }

    const key = (block.id as string) || `block-${index}`;

    // Legacy component format (current components)
    if (isLegacyComponent(componentDef)) {
      const Component = componentDef;
      return <Component key={key} block={block} data={data} />;
    }

    // New adapter format
    if (isComponentAdapter(componentDef)) {
      const { component: Component, mapProps } = componentDef;

      // Create resolve function for this block
      const resolve = <T,>(expr: string | T): T => {
        if (typeof expr === "string" && expr.startsWith("{{") && expr.endsWith("}}")) {
          return resolveBinding(expr, data) as T;
        }
        return expr as T;
      };

      // Map props if mapper provided, otherwise pass block props directly
      const props = mapProps
        ? mapProps(block, data, resolve)
        : block;

      return <Component key={key} {...props} />;
    }

    return null;
  };

  // Handle array of blocks
  if (Array.isArray(spec)) {
    return <>{spec.map((block, i) => renderBlock(block, i))}</>;
  }

  // Handle single block
  return renderBlock(spec, 0);
}

export default LiquidRenderer;
```

### Step 6: Update Exports

**File:** `packages/liquid-render/src/index.ts`

```typescript
// Core renderer
export { LiquidRenderer } from "./renderer/liquid-renderer";

// Theme context
export { LiquidProvider, useLiquidTheme, useLiquidComponent } from "./context/theme-context";

// Types
export type {
  LiquidTheme,
  LiquidComponentAdapter,
  LiquidLegacyComponent,
  PropMapper,
} from "./types/theme";

// Default theme
export { defaultTheme } from "./themes/default";

// Utilities
export { tokens, chartColors, formatDisplayValue, fieldToLabel } from "./renderer/components/utils";

// Data context
export { resolveBinding, DataProvider, useData } from "./data-context";
```

---

## File Structure After Implementation

```
packages/liquid-render/src/
├── context/
│   └── theme-context.tsx       ← NEW
├── types/
│   └── theme.ts                ← NEW
├── themes/
│   └── default/
│       └── index.ts            ← NEW (wraps current components)
├── renderer/
│   ├── components/
│   │   ├── unknown.tsx         ← NEW
│   │   └── ... (existing 77)
│   ├── component-registry.ts   ← DEPRECATED (replaced by themes)
│   └── liquid-renderer.tsx     ← UPDATED
├── data-context.tsx
└── index.ts                    ← UPDATED
```

---

## Testing the Implementation

### Test 1: Backwards Compatibility

```tsx
// Should work exactly as before
import { LiquidRenderer } from "@repo/liquid-render";

function App() {
  return <LiquidRenderer spec={spec} data={data} />;
}
```

### Test 2: Explicit Default Theme

```tsx
import { LiquidProvider, LiquidRenderer, defaultTheme } from "@repo/liquid-render";

function App() {
  return (
    <LiquidProvider theme={defaultTheme}>
      <LiquidRenderer spec={spec} data={data} />
    </LiquidProvider>
  );
}
```

### Test 3: Custom Theme Override

```tsx
import { LiquidProvider, LiquidRenderer, defaultTheme } from "@repo/liquid-render";
import { MyButton } from "./my-button";

const customTheme = {
  ...defaultTheme,
  name: "custom",
  components: {
    ...defaultTheme.components,
    button: {
      component: MyButton,
      mapProps: (block) => ({
        children: block.label,
        variant: block.variant,
      }),
    },
  },
};

function App() {
  return (
    <LiquidProvider theme={customTheme}>
      <LiquidRenderer spec={spec} data={data} />
    </LiquidProvider>
  );
}
```

---

## Checklist

- [ ] Create `types/theme.ts`
- [ ] Create `context/theme-context.tsx`
- [ ] Create `themes/default/index.ts`
- [ ] Create `renderer/components/unknown.tsx`
- [ ] Update `renderer/liquid-renderer.tsx`
- [ ] Update `index.ts` exports
- [ ] Test backwards compatibility
- [ ] Test with custom theme override
- [ ] Update documentation

---

## Next Steps

After Phase 1 is complete:

1. **Create TurboStarter Theme** - Map 10-20 core components
2. **Add `liquify()` helper** - For ad-hoc component wrapping
3. **Add theme validation** - Warn about missing components
4. **Add feature detection** - Graceful degradation

---

*Document created: 2025-12-30*
*Status: Implementation Spec*
