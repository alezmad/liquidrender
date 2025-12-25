# WF-0004: Architecture Hardening

> **Purpose:** Refactor LiquidCode to enterprise-grade, platform-agnostic architecture.
> **Status:** SPECIFICATION COMPLETE - Ready for implementation
> **Depends on:** WF-0003 (completed)

---

## Executive Summary

This workflow addresses architectural debt identified during WF-0003 code review:

1. **Signal serialization inconsistency** - Different components use different serialization
2. **DSL leakage into components** - Components check for DSL symbols directly
3. **Render-time parsing** - Components re-parse child structures
4. **Platform coupling** - Current architecture is React-specific
5. **No extension point** - No clean way to add custom components

The goal is to make **LiquidSchema the universal contract** that any renderer (React, Vue, Swift, Kotlin) can consume.

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       LiquidCode DSL                             │
│            Kp :revenue, Ts #pills [...], Custom "spark" :data   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  COMPILER LAYER (Parser + Emitter)                              │
│  ─────────────────────────────────────────────────────────────  │
│  Responsibilities:                                               │
│  • Parse DSL → AST                                               │
│  • Resolve ALL modifiers to explicit props                       │
│  • Pre-parse child structures (tabs[], options[], navItems[])   │
│  • Add formatted signal strings                                  │
│  • Output: LiquidSchema (pure JSON, NO DSL artifacts)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LIQUID SCHEMA (The Universal Contract)                         │
│  ─────────────────────────────────────────────────────────────  │
│  • Pure JSON - serializable, cacheable, transferable            │
│  • Platform-agnostic - no React/Vue/Swift specifics             │
│  • Complete - components receive ready-to-render data           │
│  • Extensible - CustomBlock for platform-specific components    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (src/renderer/presentation/)                │
│  ─────────────────────────────────────────────────────────────  │
│  • Signal formatting utilities (shared, not per-component)      │
│  • Display value normalization                                   │
│  • CSS injection (once at init via LiquidProvider)              │
│  • Binding value contracts                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  RENDERER LAYER (Platform-Specific)                             │
│  ─────────────────────────────────────────────────────────────  │
│  React Renderer │ Vue Renderer │ Swift Renderer │ Kotlin        │
│  ─────────────────────────────────────────────────────────────  │
│  • Pure presentational components                                │
│  • ZERO DSL knowledge                                            │
│  • ZERO data transformation                                      │
│  • Just: props → UI                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schema Changes

### Current Block Interface (Problems)

```typescript
// Current: Components must interpret DSL conventions
interface Block {
  type: string;
  style?: {
    color?: string;  // Overloaded: "pills" = variant, "disabled" = state
    size?: string;
  };
  children?: Block[];  // Components must filter/parse
  signals?: {
    emit?: { name?: string; value?: string };  // No formatted string
  };
}
```

### New Block Interface (Solution)

```typescript
// New: Schema is complete, components just render
interface Block {
  uid: string;
  type: string;

  // Explicit resolved props (not DSL symbols)
  variant?: string;           // 'pills' | 'boxed' | 'line' etc.
  disabled?: boolean;         // true/false, not style.color='disabled'

  // Pre-parsed child structures
  items?: BlockItem[];        // For tabs, select, radio, nav

  // Signals with formatted string for display
  signals?: {
    emit?: SignalEmit;
    receive?: string[];
  };

  // Original fields
  binding?: Binding;
  label?: string;
  layout?: Layout;
  style?: Style;              // Only for actual styling (color, size)
  children?: Block[];         // Raw children (for containers)
}

interface SignalEmit {
  name: string;
  value?: string;
  formatted: string;          // "name=value" ready for display
}

interface BlockItem {
  label: string;
  value?: string;
  disabled?: boolean;
  icon?: string;
  children?: Block[];         // For nested items (nav submenus)
}
```

---

## CustomBlock Specification

### Purpose

Allow LLM or developers to use platform-specific components while keeping the schema portable.

### Schema Definition

```typescript
interface CustomBlock extends Block {
  type: 'custom';
  componentId: string;              // Platform-agnostic identifier
  props?: Record<string, unknown>;  // Serializable props only
}
```

### DSL Syntax

```
Custom "revenue-sparkline" :monthlyRevenue #green
Custom "map-view" :locations :selectedId
Custom "video-player" "https://..." #autoplay
```

### Emitted Schema

```json
{
  "uid": "block-123",
  "type": "custom",
  "componentId": "revenue-sparkline",
  "binding": { "kind": "field", "value": "monthlyRevenue" },
  "style": { "color": "green" },
  "props": {}
}
```

### Platform Registration

```typescript
// React
<LiquidUI
  schema={schema}
  data={data}
  customComponents={{
    'revenue-sparkline': RevenueSparkline,
    'map-view': MapView,
    'video-player': VideoPlayer,
  }}
/>

// Vue (future)
<LiquidUI
  :schema="schema"
  :data="data"
  :custom-components="{
    'revenue-sparkline': VueSparkline,
    'map-view': VueMapView,
  }"
/>

// Swift (future)
LiquidUI(
  schema: schema,
  data: data,
  customComponents: [
    "revenue-sparkline": RevenueSparklineView.self,
    "map-view": MapViewWrapper.self,
  ]
)
```

### LLM Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User Request                                                 │
│     "I need a sparkline component for revenue trends"           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. LLM Generates Component Files                               │
│     src/custom/revenue-sparkline/                               │
│     ├── contract.ts         ← Props interface                   │
│     ├── react.tsx           ← React implementation              │
│     ├── vue.vue             ← Vue implementation (optional)     │
│     └── test.ts             ← Component tests                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Human Reviews & Approves                                    │
│     Security check, code quality, tests pass                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Component Registered                                        │
│     customComponents['revenue-sparkline'] = RevenueSparkline    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. DSL Uses Component                                          │
│     Custom "revenue-sparkline" :data #green                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Schema Hardening

**Goal:** Make schema complete, remove DSL interpretation from components.

#### Task 1.1: Extend Block Types

File: `src/compiler/ui-emitter.ts`

```typescript
// Add to Block interface
interface Block {
  // ... existing fields ...

  // NEW: Resolved props
  variant?: 'default' | 'pills' | 'boxed' | 'outline' | 'ghost' | string;
  disabled?: boolean;

  // NEW: Pre-parsed items for list-like components
  items?: BlockItem[];
}

interface BlockItem {
  uid: string;
  label: string;
  value?: string;
  disabled?: boolean;
  icon?: string;
  binding?: Binding;
  children?: Block[];
}

// Add formatted to SignalEmit
interface SignalEmit {
  name?: string;
  value?: string;
  layer?: number;
  formatted?: string;  // NEW: "name=value" ready for display
}
```

#### Task 1.2: Update Emitter

File: `src/compiler/ui-emitter.ts`

Changes:
1. Resolve `#pills`, `#boxed` modifiers to `variant: 'pills'`
2. Resolve `#disabled` modifier to `disabled: true`
3. Add `formatted` field to signal emit
4. Pre-parse `tab`, `option`, `nav` children into `items[]`

```typescript
// Example: Tabs emission
function emitTabsBlock(ast: BlockAST): Block {
  return {
    uid: ast.uid,
    type: 'tabs',
    variant: extractVariant(ast.modifiers),  // 'line' | 'pills' | 'boxed'
    items: ast.children
      ?.filter(c => c.type === 'tab')
      .map(tab => ({
        uid: tab.uid,
        label: tab.label || 'Tab',
        disabled: hasModifier(tab, 'disabled'),
        children: tab.children?.map(emitBlock),
      })),
    signals: ast.signals ? {
      emit: {
        ...ast.signals.emit,
        formatted: formatSignal(ast.signals.emit),
      }
    } : undefined,
  };
}

function formatSignal(emit: SignalEmit): string {
  if (!emit?.name) return '';
  return emit.value ? `${emit.name}=${emit.value}` : emit.name;
}
```

#### Task 1.3: Add CustomBlock Support

File: `src/compiler/constants.ts`

```typescript
export const TYPE_CODES = {
  // ... existing codes ...
  Custom: 'custom',
};
```

File: `src/compiler/ui-parser.ts`

```typescript
// Parse: Custom "component-id" :binding #modifier
function parseCustomBlock(): BlockAST {
  // First string literal is componentId
  // Rest follows standard parsing
}
```

File: `src/compiler/ui-emitter.ts`

```typescript
interface CustomBlock extends Block {
  type: 'custom';
  componentId: string;
  props?: Record<string, unknown>;
}
```

---

### Phase 2: Presentation Layer

**Goal:** Centralize formatting, CSS injection, display utilities.

#### Task 2.1: Create Presentation Module

```
src/renderer/presentation/
├── index.ts              ← Public exports
├── signal-utils.ts       ← Signal formatting (shared)
├── display-utils.ts      ← Value formatting (shared)
├── styles.ts             ← CSS injection (init-time)
└── contracts.ts          ← Binding value contracts
```

#### Task 2.2: Signal Utilities

File: `src/renderer/presentation/signal-utils.ts`

```typescript
import type { SignalEmit } from '../../compiler/ui-emitter';

/**
 * Format signal for display (data attributes, debugging)
 * If schema has formatted field, use it. Otherwise compute.
 */
export function formatSignalForDisplay(emit?: SignalEmit): string {
  if (!emit?.name) return '';
  if (emit.formatted) return emit.formatted;
  return emit.value ? `${emit.name}=${emit.value}` : emit.name;
}

/**
 * Serialize signal value for emission
 * Standardizes all emissions to strings
 */
export function serializeSignalValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
```

#### Task 2.3: CSS Injection at Init

File: `src/renderer/presentation/styles.ts`

```typescript
let stylesInjected = false;

const LIQUID_STYLES = `
  @keyframes liquid-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  @keyframes liquid-progress {
    0% { background-position: 0 0; }
    100% { background-position: 1rem 0; }
  }

  @keyframes liquid-modal-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

export function injectLiquidStyles(): void {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'liquid-ui-styles';
  style.textContent = LIQUID_STYLES;
  document.head.appendChild(style);

  stylesInjected = true;
}
```

File: `src/renderer/LiquidUI.tsx`

```typescript
import { injectLiquidStyles } from './presentation/styles';

export function LiquidUI(props: LiquidUIProps) {
  // Inject styles once on first render
  useEffect(() => {
    injectLiquidStyles();
  }, []);

  // ... rest of component
}
```

---

### Phase 3: Simplify Components

**Goal:** Components become pure renderers with zero logic.

#### Task 3.1: Refactor Tabs

Before:
```typescript
function Tabs({ block, data, children }) {
  // ❌ DSL interpretation
  const variant = block.style?.color === 'pills' ? 'pills' : 'line';

  // ❌ Child parsing at render
  const tabs = block.children?.filter(c => c.type === 'tab').map(...);

  // ❌ Signal formatting
  const signal = `${emit.name}=${emit.value}`;
}
```

After:
```typescript
function Tabs({ block, data, children }) {
  // ✅ Read pre-resolved props
  const variant = block.variant || 'line';

  // ✅ Use pre-parsed items
  const tabs = block.items || [];

  // ✅ Use pre-formatted signal
  const signal = block.signals?.emit?.formatted;
}
```

#### Task 3.2: Refactor Pattern (All Components)

Apply this pattern to all components that currently:
- Check `style.color` for variant/state
- Filter/map `children` for items
- Format signals manually

Components to refactor:
- [ ] `tabs.tsx`
- [ ] `sidebar.tsx`
- [ ] `nav.tsx`
- [ ] `select.tsx`
- [ ] `radio.tsx`
- [ ] `breadcrumb.tsx`
- [ ] `badge.tsx`
- [ ] `button.tsx`
- [ ] `header.tsx`
- [ ] `progress.tsx`
- [ ] `modal.tsx`

---

### Phase 4: Custom Components API

**Goal:** Enable platform-specific component registration.

#### Task 4.1: CustomComponents Prop

File: `src/renderer/LiquidUI.tsx`

```typescript
export interface LiquidUIProps {
  schema: LiquidSchema;
  data: DataContext;
  customComponents?: Record<string, ComponentType<LiquidComponentProps>>;
  onSignal?: (name: string, value: string) => void;
}

function BlockRenderer({ block, data, customComponents }: BlockRendererProps) {
  if (block.type === 'custom') {
    const CustomComponent = customComponents?.[block.componentId];
    if (!CustomComponent) {
      console.warn(`Custom component "${block.componentId}" not registered`);
      return <UnknownBlock block={block} />;
    }
    return <CustomComponent block={block} data={data} />;
  }

  // ... existing logic
}
```

#### Task 4.2: Custom Component Contract

File: `src/renderer/custom-component.ts`

```typescript
import type { Block, Binding } from '../compiler/ui-emitter';
import type { DataContext } from './data-context';

/**
 * Props passed to custom components
 */
export interface CustomComponentProps {
  /** The block definition from schema */
  block: CustomBlock;

  /** Data context for binding resolution */
  data: DataContext;

  /** Pre-rendered children (if any) */
  children?: React.ReactNode;
}

/**
 * Custom block schema
 */
export interface CustomBlock extends Block {
  type: 'custom';

  /** Identifier for the custom component */
  componentId: string;

  /** Additional props passed to component */
  props?: Record<string, unknown>;
}

/**
 * Utility to resolve binding in custom components
 */
export { resolveBinding } from './data-context';
```

---

## Testing Strategy

### Unit Tests

1. **Emitter tests**: Verify variant/disabled/items are correctly extracted
2. **Signal format tests**: Verify `formatted` field is correct
3. **CustomBlock tests**: Verify parsing and emission

### Integration Tests

1. **Tabs with variant**: `Ts #pills [...]` → `variant: 'pills'`
2. **Disabled items**: `tab "X" #disabled` → `items[0].disabled: true`
3. **Custom component**: `Custom "spark" :data` → `componentId: 'spark'`

### Component Tests

1. **Pure render tests**: Components receive pre-resolved props
2. **No DSL leakage**: Components don't check `style.color`

---

## Migration Guide

### For Component Authors

Before:
```typescript
// ❌ Old pattern
const variant = block.style?.color === 'pills' ? 'pills' : 'line';
const disabled = block.style?.color === 'disabled';
const items = block.children?.filter(c => c.type === 'option');
```

After:
```typescript
// ✅ New pattern
const variant = block.variant || 'line';
const disabled = block.disabled || false;
const items = block.items || [];
```

### For Schema Consumers

Before:
```json
{
  "type": "tabs",
  "style": { "color": "pills" },
  "children": [
    { "type": "tab", "label": "One", "children": [...] }
  ]
}
```

After:
```json
{
  "type": "tabs",
  "variant": "pills",
  "items": [
    { "label": "One", "disabled": false, "children": [...] }
  ]
}
```

---

## Success Criteria

1. **Zero DSL in components**: `grep -r "style?.color ===" components/` returns nothing
2. **All tests pass**: 150+ tests green
3. **Custom component works**: Demo with sparkline custom component
4. **Schema is portable**: JSON can be consumed by non-React renderer
5. **CSS injected once**: No per-component style injection

---

## Files to Modify

### Compiler Layer
- `src/compiler/ui-emitter.ts` - Add variant, disabled, items, formatted
- `src/compiler/ui-parser.ts` - Parse Custom blocks
- `src/compiler/constants.ts` - Add Custom type code

### Presentation Layer (NEW)
- `src/renderer/presentation/index.ts`
- `src/renderer/presentation/signal-utils.ts`
- `src/renderer/presentation/display-utils.ts`
- `src/renderer/presentation/styles.ts`

### Renderer Layer
- `src/renderer/LiquidUI.tsx` - CSS init, customComponents prop
- `src/renderer/component-registry.ts` - Custom component handling
- `src/renderer/components/*.tsx` - All components simplified

### Types
- `src/types/schema.ts` (NEW) - Exported schema types for consumers

---

## Estimated Effort

| Phase | Tasks | Complexity | Estimate |
|-------|-------|------------|----------|
| Phase 1: Schema | 3 | High | 2-3 sessions |
| Phase 2: Presentation | 3 | Medium | 1-2 sessions |
| Phase 3: Components | 11 | Medium | 2-3 sessions |
| Phase 4: Custom API | 2 | Medium | 1 session |

**Total: 6-9 sessions**

---

## Next Steps

1. Review and approve this specification
2. Create feature branch: `feat/wf-0004-architecture-hardening`
3. Implement Phase 1 (Schema Hardening)
4. Test with existing components
5. Proceed to Phase 2-4

---

*Document created: 2024-12-25*
*Last updated: 2024-12-25*
*Author: Claude Code + Human Review*
