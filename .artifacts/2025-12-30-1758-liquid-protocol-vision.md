# Liquid Protocol Vision

> **One spec, infinite outputs.** Liquid Protocol separates UI behavior from rendering, enabling any component library to render Liquid specs.

---

## Executive Summary

LiquidRender today is a monolithic system: 77 components tightly coupled to both DSL interpretation and React rendering. This limits adoption and flexibility.

**Liquid Protocol** transforms LiquidRender into a **universal UI protocol**:
- **Headless core** handles parsing, bindings, state, and events
- **Adapters** map to any framework (React, Vue, Native, PDF)
- **Themes** provide component implementations (TurboStarter, shadcn, custom)

**Business Impact:**
- Framework-agnostic (Vue shops, React shops, everyone)
- Design system compatible (use YOUR existing components)
- AI-native (AI generates spec, humans choose aesthetics)
- White-label ready (each customer gets their own theme)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIQUID PROTOCOL (Headless Core)              │
│                         @liquid/core                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  DSL Parser  │  │   Binding    │  │    State     │          │
│  │  & Validator │  │   Resolver   │  │   Machine    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Event     │  │ Accessibility│  │   Layout     │          │
│  │   System     │  │  Contracts   │  │   Engine     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  useLiquid(spec, data)
                              │  returns: { blocks, state, handlers }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ADAPTER LAYER                             │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│ @liquid/react │ @liquid/vue   │ @liquid/native│ @liquid/pdf     │
│               │               │ (Expo)        │ (react-pdf)     │
├───────────────┼───────────────┼───────────────┼─────────────────┤
│ @liquid/email │ @liquid/figma │ @liquid/html  │ @liquid/canvas  │
│ (MJML)        │ (design)      │ (static)      │ (2D graphics)   │
└───────────────┴───────────────┴───────────────┴─────────────────┘
                              │
                              │  <LiquidProvider theme={...}>
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COMPONENT THEMES                            │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│ theme-default │ theme-turbo   │ theme-shadcn  │ theme-custom    │
│ (current 77)  │ (TurboStarter)│ (shadcn/ui)   │ (your design)   │
└───────────────┴───────────────┴───────────────┴─────────────────┘
```

---

## Core Concepts

### 1. The Spec (Unchanged)

Liquid specs remain the same - a declarative JSON/YAML structure:

```yaml
type: dashboard
children:
  - type: kpi-card
    title: "Revenue"
    value: "{{metrics.revenue}}"
    trend: "{{metrics.revenueTrend}}"
  - type: line-chart
    data: "{{metrics.history}}"
    xKey: "date"
    yKey: "value"
```

### 2. The Core (New)

`@liquid/core` is headless - no React, no DOM, pure logic:

```typescript
import { parseLiquidSpec, resolveBindings } from "@liquid/core";

// Parse and validate
const parsed = parseLiquidSpec(spec);

// Resolve all bindings against data
const resolved = resolveBindings(parsed, data);

// Result: blocks with resolved props, ready for any renderer
// {
//   type: "kpi-card",
//   props: { title: "Revenue", value: 142500, trend: 0.12 },
//   handlers: {},
//   children: []
// }
```

### 3. The Adapter (Framework Bridge)

Adapters provide framework-specific rendering logic:

```typescript
// @liquid/react
import { LiquidProvider, LiquidRender, useLiquid } from "@liquid/react";

// High-level: just render
<LiquidProvider theme={turbostarterTheme}>
  <LiquidRender spec={spec} data={data} />
</LiquidProvider>

// Low-level: full control
function MyDashboard({ spec, data }) {
  const { blocks } = useLiquid(spec, data);

  return blocks.map(block => (
    <MyCustomRenderer key={block.id} block={block} />
  ));
}
```

### 4. The Theme (Component Map)

A theme is a mapping from block types to components:

```typescript
// theme-turbostarter
import { Button } from "@turbostarter/ui-web/button";
import { Card } from "@turbostarter/ui-web/card";
import { Input } from "@turbostarter/ui-web/input";

export const turbostarterTheme: LiquidTheme = {
  button: {
    component: Button,
    mapProps: (block) => ({
      variant: block.variant ?? "default",
      size: block.size ?? "default",
      children: block.label,
    }),
  },
  card: {
    component: Card,
    mapProps: (block) => ({
      className: block.className,
      children: block.children,
    }),
  },
  // ... 75 more mappings
};
```

---

## The `liquify()` Function

For ad-hoc component adaptation without creating a full theme:

```typescript
import { liquify } from "@liquid/core";
import { DataTable } from "@turbostarter/ui-web/data-table";

// Turn any component into a Liquid-compatible component
const LiquidDataTable = liquify(DataTable, {
  // Define the block schema
  schema: z.object({
    type: z.literal("data-table"),
    data: z.string(), // binding expression
    columns: z.array(z.object({
      key: z.string(),
      header: z.string(),
      sortable: z.boolean().optional(),
    })),
  }),

  // Map block props to component props
  mapProps: (block, resolve) => ({
    data: resolve(block.data),
    columns: block.columns.map(col => ({
      accessorKey: col.key,
      header: col.header,
      enableSorting: col.sortable,
    })),
  }),
});

// Use it
registerComponent("data-table", LiquidDataTable);
```

---

## Implementation Roadmap

### Phase 1: Component Registry (Week 1)

**Goal:** Enable theme switching with minimal changes to current architecture.

```typescript
// New API
<LiquidProvider theme="turbostarter">
  <LiquidRender spec={spec} data={data} />
</LiquidProvider>
```

**Deliverables:**
- [ ] Extract component map from current renderer
- [ ] Create `LiquidProvider` with theme context
- [ ] Create `theme-default` from current 77 components
- [ ] Create `theme-turbostarter` proof of concept (10 components)
- [ ] Update `LiquidRender` to use theme context

**Risk:** Low - additive changes, current behavior preserved

### Phase 2: Liquify Wrapper (Week 2-3)

**Goal:** Enable any component to become Liquid-compatible.

```typescript
const LiquidButton = liquify(AnyButton, { schema, mapProps });
```

**Deliverables:**
- [ ] Design `LiquidComponentContract` interface
- [ ] Build `liquify()` function
- [ ] Build prop mapping utilities
- [ ] Create adapters for 20 core components
- [ ] Documentation + examples

**Risk:** Medium - requires careful interface design

### Phase 3: Headless Core (Week 4-6)

**Goal:** Complete separation of concerns.

```typescript
import { useLiquid } from "@liquid/core";
// Works with React, Vue, Svelte, anything
```

**Deliverables:**
- [ ] Extract DSL parser to `@liquid/core`
- [ ] Extract binding resolver
- [ ] Build `useLiquid` hook (framework-agnostic)
- [ ] Create `@liquid/react` adapter
- [ ] Create `@liquid/vue` adapter (proof of concept)

**Risk:** High - significant refactor, but huge payoff

---

## Cross-Platform Vision

With the protocol architecture, one spec renders everywhere:

| Adapter | Output | Use Case |
|---------|--------|----------|
| `@liquid/react` | React web app | Primary web UI |
| `@liquid/native` | React Native | Mobile apps |
| `@liquid/pdf` | PDF document | Reports, exports |
| `@liquid/email` | HTML email | Notifications |
| `@liquid/figma` | Figma file | Design handoff |
| `@liquid/html` | Static HTML | SSG, emails |

**Example:** A Knosia briefing spec could render as:
- Interactive dashboard (React + theme-turbo)
- Mobile view (Native + theme-native)
- PDF report (pdf + theme-print)
- Email summary (email + theme-email)

---

## Migration Strategy

### For Existing LiquidRender Users

**Phase 1:** No breaking changes. Default theme = current components.

```typescript
// Before (still works)
<LiquidRender spec={spec} data={data} />

// After (opt-in to new theme)
<LiquidProvider theme={turbostarterTheme}>
  <LiquidRender spec={spec} data={data} />
</LiquidProvider>
```

### For Theme Authors

1. Install `@liquid/core`
2. Create component map following `LiquidTheme` interface
3. Export theme
4. Publish as npm package

### For Framework Authors (Vue, Svelte, etc.)

1. Install `@liquid/core`
2. Create framework adapter using `useLiquid` primitives
3. Publish as `@liquid/vue`, `@liquid/svelte`, etc.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Theme switch works | Can swap theme-default ↔ theme-turbo |
| Component coverage | 77 components mapped in default theme |
| Performance | <5% overhead from abstraction |
| Bundle size | Core <10KB gzipped |
| Theme size | <5KB per theme (just mappings) |

---

## Open Questions

1. **How to handle theme-specific features?**
   - Some components have features others don't (e.g., TurboStarter DataTable has built-in filtering)
   - Option A: Lowest common denominator
   - Option B: Feature detection + graceful degradation
   - Option C: Theme capabilities declaration

2. **Should themes be complete or composable?**
   - Complete: Every theme maps all 77 types
   - Composable: `mergeThemes(baseTheme, overrides)`
   - Recommendation: Composable with required core set

3. **How to handle interactive state?**
   - Forms, modals, popovers have internal state
   - Core manages? Or delegate to component?
   - Recommendation: Core provides state contract, component implements

---

## Next Steps

1. **Read:** Component Contract specification
2. **Build:** Phase 1 implementation
3. **Validate:** TurboStarter theme proof of concept
4. **Iterate:** Based on learnings

---

*Document created: 2025-12-30*
*Status: Vision / RFC*
