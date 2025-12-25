# Liquid Render - AI Context

> **Quick Reference:** LiquidCode is a DSL for declarative UI. LLMs generate DSL, compiler parses to schema, renderer outputs React.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     LIQUID RENDER PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LiquidCode DSL  →  Scanner  →  Parser  →  Emitter  →  Schema   │
│       ↑                                                    ↓     │
│       └─────────────── Roundtrip ──────────────────────────┘     │
│                                                                  │
│  Schema  →  LiquidUI (React)  →  Component Registry  →  UI      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Compiler Pipeline

| File | Purpose |
|------|---------|
| `compiler/constants.ts` | Type codes, modifiers, color aliases |
| `compiler/ui-scanner.ts` | Lexer: DSL → Tokens |
| `compiler/ui-parser.ts` | Parser: Tokens → AST |
| `compiler/ui-emitter.ts` | Emitter: AST → Schema or DSL |
| `compiler/ui-compiler.ts` | Main entry: `parseUI()`, `compileUI()`, `roundtripUI()` |
| `compiler/streaming-parser.ts` | Progressive parsing for LLM streaming |

## DSL Quick Reference

### Type Codes (Most Common)

| Index | Code | Type | Example |
|-------|------|------|---------|
| 0 | `Cn` | container | `Cn ^row [...]` |
| 1 | `Kp` | kpi | `Kp :revenue` |
| 2 | `Br` | bar | `Br :month :sales` |
| 3 | `Ln` | line | `Ln :date :value` |
| 4 | `Pi` | pie | `Pi :category :count` |
| 5 | `Tb` | table | `Tb :data [:col1 :col2]` |
| 6 | `Fm` | form | `Fm [In :name, Bt "Save"]` |
| 7 | `Ls` | list | `Ls :items [Cd :.]` |
| 8 | `Cd` | card | `Cd :title :body` |
| 9 | `Md` | modal | `Md "Title" [...]` |

### Extended Types

**Layout:** `Gd` (grid), `Sk` (stack), `Sp` (split), `Sd` (sidebar), `Dw` (drawer), `Sh` (sheet), `Pp` (popover), `Tl` (tooltip), `Ac` (accordion)

**Navigation:** `Hr` (header), `Ts` (tabs), `Bc` (breadcrumb), `Nv` (nav)

**Data Display:** `Tx` (text), `Hd` (heading), `Ic` (icon), `Im` (image), `Av` (avatar), `Tg` (tag), `Bg` (badge), `Pg` (progress), `Gn` (gauge), `Rt` (rating), `Sl` (sparkline)

**Form Controls:** `Bt` (button), `In` (input), `Ta` (textarea), `Se` (select), `Sw` (switch), `Ck` (checkbox), `Rd` (radio), `Rg` (range), `Cl` (color), `Dt` (date), `Dr` (daterange), `Tm` (time), `Up` (upload), `Ot` (otp)

**Charts:** `Hm` (heatmap), `Sn` (sankey), `Tr` (tree), `Or` (org), `Mp` (map), `Fl` (flow)

### Modifiers

| Symbol | Name | Examples |
|--------|------|----------|
| `!` | Priority | `!h` (hero), `!p` (primary), `!s` (secondary), `!5` |
| `^` | Flex | `^f` (fixed), `^s` (shrink), `^g` (grow), `^row`, `^column` |
| `*` | Span | `*f` (full), `*h` (half), `*t` (third), `*q` (quarter), `*3` |
| `@` | Declare | `@signal` (at top of file) |
| `>` | Emit | `>signal`, `>tab=0`, `>/1` (open layer) |
| `<` | Receive | `<signal`, `/<` (close layer) |
| `<>` | Both | `<>bidirectional` |
| `#` | Color | `#red`, `#g` (green), `#?>=80:green,<80:red` |
| `%` | Size | `%lg`, `%sm`, `%xl` |
| `~` | Stream | `~5s`, `~ws://url`, `~sse://url` |
| `$` | Fidelity | `$lo`, `$hi`, `$auto`, `$skeleton`, `$defer` |

### Color Aliases

`#r`→red, `#g`→green, `#b`→blue, `#y`→yellow, `#o`→orange, `#p`→purple, `#w`→white, `#k`→black, `#gy`→gray, `#cy`→cyan, `#mg`→magenta

### Bindings

| Syntax | Kind | Example |
|--------|------|---------|
| `:field` | Field | `Kp :revenue` |
| `:.` | Iterator (current item) | `Ls :items [Tx :.]` |
| `:.field` | Iterator field | `Ls :items [Tx :.name]` |
| `:#` | Index ref | `Ls :items [Tx :#]` |
| `=expr` | Computed | `Kp =revenue/orders` |
| `"text"` | Literal | `Bt "Submit"` |
| `0123` | Indexed (legacy) | `Tb 0123` |

### Special Syntax

**Repetition Shorthand:** Non-chart types expand multiple fields:
```
Kp :revenue :orders :customers  →  3 separate KPI cards
```

**Range Parameters:**
```
Rg :volume "Volume" 0 100       # min=0, max=100
Rg :rating "Rating" 1 5 1       # min=1, max=5, step=1
```

**Custom Components:**
```
Custom "sparkline" :data #green
```

**Layers:**
```
/1 Md "Modal" [...]     # Define layer 1
Bt "Open" >/1           # Open layer 1
Bt "Close" /<           # Close current layer
```

**Conditional Rendering:**
```
?@tab=0 [Kp :revenue]   # Show when tab signal = 0
```

## Schema Types

```typescript
interface LiquidSchema {
  version: '1.0';
  signals: Signal[];
  layers: Layer[];
  surveys?: EmbeddedSurvey[];
}

interface Block {
  uid: string;
  type: string;
  binding?: Binding;
  label?: string;
  layout?: Layout;
  signals?: SignalBinding;
  condition?: Condition;
  style?: Style;
  stream?: StreamConfig;
  fidelity?: FidelityLevel;
  action?: string;
  children?: Block[];
  columns?: string[];       // Table columns
  min?: number;             // Range min
  max?: number;             // Range max
  step?: number;            // Range step
  componentId?: string;     // Custom component
}
```

## Renderer

### Component Registry (`renderer/component-registry.ts`)

Built-in components: `kpi`, `button`, `text`, `container`, `card`, `table`, `line`, `bar`, `pie`, `modal`, `input`, `form`, `avatar`, `sidebar`, `tabs`, `daterange`, `header`, `badge`, `breadcrumb`, `nav`

### Custom Components

```tsx
<LiquidUI
  schema={schema}
  data={data}
  customComponents={{
    'sparkline': MySparklineComponent,
  }}
/>
```

### Component Props

```typescript
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
}
```

## Streaming Parser

For LLM output streaming with progressive rendering:

```typescript
import { StreamingParser } from './compiler/streaming-parser';

const parser = new StreamingParser({
  onCheckpoint: (schema, blockCount) => {
    // Render partial UI
  }
});

// Feed chunks as they arrive
parser.feed('Kp :rev');
parser.feed('enue\n');

// Finalize when done
const result = parser.finalize();
```

## API Entry Points

### Main Package (`src/index.ts`)
- `compile()`, `parse()`, `roundtrip()` - Survey DSL
- `SurveyEngine` - Survey runtime
- `validateSurvey()` - Schema validation

### UI Compiler (`src/compiler/ui-compiler.ts`)
- `parseUI(source)` → LiquidSchema
- `compileUI(schema)` → DSL string
- `roundtripUI(schema)` → { dsl, reconstructed, isEquivalent }
- `parseUIToAST(source)` → UIAST (for debugging)

### Renderer (`src/renderer/index.ts`)
- `<LiquidUI schema={} data={} />` - Main React component
- `resolveBinding(binding, data)` - Resolve data bindings
- `componentRegistry` - Access/extend component registry

## File Structure

```
src/
├── compiler/
│   ├── constants.ts      # Type codes, modifiers
│   ├── ui-scanner.ts     # Lexer
│   ├── ui-parser.ts      # Parser
│   ├── ui-emitter.ts     # Schema/DSL emitter
│   ├── ui-compiler.ts    # Main API
│   ├── streaming-parser.ts
│   ├── scanner.ts        # Survey lexer
│   ├── parser.ts         # Survey parser
│   └── emitter.ts        # Survey emitter
├── renderer/
│   ├── LiquidUI.tsx      # Main React component
│   ├── data-context.ts   # Data binding resolution
│   ├── component-registry.ts
│   └── components/       # Built-in components
├── types/
│   └── custom-component.ts
└── index.ts              # Package exports
```

## Design Principles

1. **LLM-Optimal** - Minimal tokens, semantic type codes
2. **Lossless Roundtrip** - DSL ↔ Schema equivalence
3. **Progressive Rendering** - Stream-friendly parsing
4. **Extensible** - Custom components, registry overrides
5. **Platform Portable** - Schema is platform-agnostic

## Canonical Spec

See `specs/LIQUID-RENDER-SPEC.md` for the complete DSL specification.
