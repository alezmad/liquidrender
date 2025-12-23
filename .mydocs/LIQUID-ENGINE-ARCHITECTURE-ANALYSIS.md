# Liquid Engine Architecture Analysis

**Date:** 2025-12-21
**Context:** Analysis of PRD-v1 against LiquidCode specification to determine optimal architecture for platform-agnostic engine.

---

## The Insight You've Already Had

The PRD actually **already contains** the separation you're intuiting. Look at the package structure:

```
packages/liquid-ui/core     → Schema types + validation (SHARED)
packages/liquid-ui/catalog  → Component catalog (SHARED)
packages/liquid-ui/react    → React renderer (PLATFORM-SPECIFIC)
packages/liquid-ui/react-native → RN renderer (PLATFORM-SPECIFIC)
```

And the paradigm gates explicitly state:
> **"Schema spec is platform-agnostic; only renderers are platform-specific"**

**The PRD was always headed toward this.** But it's buried in implementation details rather than elevated to first-class architecture.

---

## What You Should Actually Build

You don't need a new PRD. You need to **refactor the architecture** to make the agnostic core explicit:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIQUID ENGINE                                    │
│                    (Platform-Agnostic Core)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     LIQUIDCODE LAYER                              │   │
│  │  • Token-minimal encoding                                        │   │
│  │  • 3-layer hierarchy (L0/L1/L2)                                  │   │
│  │  • Semantic caching + archetypes                                 │   │
│  │  • Context discovery engine                                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     LIQUIDSCHEMA LAYER                            │   │
│  │  • Abstract schema specification                                  │   │
│  │  • Block definitions (semantic, not visual)                      │   │
│  │  • Bindings + data references                                    │   │
│  │  • Validation (Zod or equivalent)                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     COMPONENT CATALOG                             │   │
│  │  • Abstract component specifications                              │   │
│  │  • Block type → component mapping                                │   │
│  │  • Default configurations                                        │   │
│  │  • NO IMPLEMENTATION (just contracts)                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │   REACT     │  │   REACT     │  │  PYTHON     │
         │   ADAPTER   │  │   NATIVE    │  │  ADAPTER    │
         │  (shadcn)   │  │   ADAPTER   │  │  (tkinter)  │
         └─────────────┘  └─────────────┘  └─────────────┘
```

---

## What the PRD Gets Right (Keep This)

| Concept | PRD Definition | Keep? |
|---------|----------------|-------|
| **ParsedData** | Universal intermediate format | Yes — this is exactly right |
| **LiquidSchema** | Declarative, validated contract | Yes — core innovation |
| **Blocks** | Semantic building blocks | Yes — but make abstract |
| **Bindings** | Data → component connections | Yes |
| **Explainability** | Trust layer in schema | Yes — important |
| **Fallback templates** | Graceful degradation | Yes |

## What the PRD Conflates (Separate This)

| Conflation | Problem | Solution |
|------------|---------|----------|
| Block = React Component | `kpi-card` assumes shadcn | Block = abstract specification; React implementation is one adapter |
| Catalog = Implementation | `bar-chart` has React props | Catalog = semantic spec; each adapter maps to its components |
| LiquidSchema embeds rendering hints | `grid-layout` is layout-specific | Schema describes structure; adapter determines layout system |

---

## The Correct Abstraction Stack

**Level 1: LiquidCode** (our new innovation)
- Token-minimal LLM encoding
- Compiles to LiquidSchema
- Handles caching, archetypes, context discovery
- *This is new IP we've defined*

**Level 2: LiquidSchema** (refined from PRD)
- Platform-agnostic schema specification
- Abstract block types with semantic meaning
- Data bindings without rendering assumptions
- *Refine the PRD's LiquidSchema to be truly abstract*

**Level 3: Component Catalog** (abstract)
- Maps block types to component specifications
- Defines props, slots, behaviors—not implementations
- *Similar to Web Components or Design Tokens*

**Level 4: Platform Adapters** (implementations)
- React Adapter → maps to shadcn/recharts
- React Native Adapter → maps to RN charts
- Python Adapter → maps to tkinter/matplotlib
- Qt Adapter → maps to Qt widgets
- *Each adapter is independent*

---

## What This Means for Implementation Order

Build the engine first:

```
PHASE 0: LIQUID ENGINE (platform-agnostic)
├── LiquidCode compiler
├── LiquidSchema validator
├── Context Discovery Engine
├── Archetype Detection
├── Fragment Cache
└── Abstract Component Catalog

PHASE 1: REACT ADAPTER (first implementation)
├── shadcn component mappings
├── Recharts integration
├── Layout system (CSS Grid)
└── Renderer

PHASE 2: APPLICATION (LiquidRender product)
├── TurboStarter integration
├── File parsing
├── AI agents
├── Web app
└── [Everything else in current PRD]
```

---

## Concrete Recommendation

**Do NOT write a new PRD yet.**

Instead:

1. **Extract the Engine Spec** — Take the abstract parts of the PRD (LiquidSchema, ParsedData, Blocks) and formalize them as a standalone engine specification. Add LiquidCode as the AI layer above.

2. **Define the Adapter Interface** — Specify how adapters implement the abstract catalog. This is a simple interface contract.

3. **Build Engine First** — Implement the engine with TypeScript (works in browser and Node). No React dependencies.

4. **Build React Adapter Second** — This is where shadcn, recharts, etc. come in. The adapter is just one implementation.

5. **Use Current PRD for Application** — The LiquidRender product PRD is fine. It just consumes the engine and React adapter.

---

## Why This Is the Right Path

| Benefit | Impact |
|---------|--------|
| **LiquidCode is reusable IP** | License engine to other products |
| **Adapters are replaceable** | Customer wants Vue? Write Vue adapter, engine unchanged |
| **Testing is simpler** | Engine tests don't need DOM; adapter tests don't need AI |
| **Community contribution** | Others can write adapters; you own the engine |
| **Patent protection** | LiquidCode + Engine is the defensible innovation |

---

## What Should the Engine Package Look Like?

```
@liquid-engine/core
├── /liquidcode
│   ├── compiler.ts        # LiquidCode → LiquidSchema
│   ├── grammar.ts         # Token patterns
│   └── layers.ts          # L0/L1/L2 orchestration
│
├── /schema
│   ├── types.ts           # LiquidSchema interfaces
│   ├── blocks.ts          # Abstract block definitions
│   ├── bindings.ts        # Data binding system
│   └── validator.ts       # Zod schemas
│
├── /discovery
│   ├── engine.ts          # Context Discovery Engine
│   ├── archetypes.ts      # Schema Archetype System
│   ├── primitives.ts      # UOM primitive inference
│   └── intents.ts         # Intent generation
│
├── /cache
│   ├── repository.ts      # Fragment Repository
│   ├── composer.ts        # Fragment Composition
│   └── storage.ts         # Storage adapter interface
│
└── /catalog
    ├── registry.ts        # Component registry
    ├── blocks/            # Abstract block specs
    │   ├── kpi.ts
    │   ├── chart.ts
    │   ├── table.ts
    │   └── layout.ts
    └── adapter.ts         # Adapter interface contract
```

---

## Should You Write a New PRD?

**Not yet.**

The current PRD is a **product PRD** — it describes LiquidRender the application. That's correct and useful.

What you need is an **engine specification** document that extracts and elevates the platform-agnostic core. The LiquidCode spec we've been writing is already most of this. We just need to:

1. Add a section formalizing the abstract LiquidSchema (refine from PRD)
2. Add a section defining the Adapter Interface
3. Add a section for ParsedData normalization

The LiquidRender PRD then becomes a consumer of the engine, not the definition of it.

---

## Next Step Options

**A)** Add sections to LIQUIDCODE-SPEC.md for:
   - Abstract LiquidSchema specification (refined from PRD)
   - Adapter Interface contract
   - ParsedData normalization

**B)** Create a new document `LIQUID-ENGINE-SPEC.md` that consolidates everything into a single engine specification

**C)** Something else?

The LiquidCode spec is already ~4,100 lines. Option B might make more sense for clarity—a unified "Liquid Engine" document that covers LiquidCode + LiquidSchema + Adapters + Discovery.

---

## Key PRD Concepts to Preserve

### From PRD: ParsedData (Universal Intermediate Format)

```typescript
// All data sources normalize to this
interface ParsedData {
  columns: Column[];
  rows: Row[];
  metadata: DataMetadata;
}
```

### From PRD: LiquidSchema Core

```typescript
interface LiquidSchema {
  version: '1.0';
  id: string;
  title: string;
  description?: string;
  generatedAt: string;
  dataSource: DataSourceMeta;
  layout: LayoutBlock;
  blocks: Block[];
}
```

### From PRD: Explainability Layer

```typescript
interface Explainability {
  calculation: string;
  columnsUsed: string[];
  groupBy?: string[];
  filters?: string[];
  assumptions?: string[];
  coverage?: {
    rowsUsed: number;
    totalRows: number;
    dateRange?: { start: string; end: string };
  };
  confidence?: number;
}
```

### From PRD: Phase 1 Block Types

| Block Type | Purpose | Required Props |
|------------|---------|----------------|
| `kpi-card` | Single metric with trend | value, label, trend?, icon? |
| `bar-chart` | Categorical comparison | data, xField, yField, title? |
| `line-chart` | Time series / trends | data, xField, yField, title? |
| `pie-chart` | Part-to-whole | data, valueField, labelField, title? |
| `data-table` | Raw data display | data, columns, title?, pageSize? |
| `grid-layout` | Container for blocks | children, columns |
| `text-block` | Titles, descriptions | content, variant |

### From PRD: Paradigm Gates

| Gate | What It Proves | Metric |
|------|----------------|--------|
| Schema is Contract | Same schema + data → identical render | 100% determinism |
| AI Generates Data | Zero executable code in LiquidSchema | Schema audit pass |
| Never Broken | All valid schemas render successfully | 100% render success |
| Extensible | New Block type added without pipeline changes | Single PR |
| Portable Foundation | Schema spec is platform-agnostic | Multi-renderer test |

---

## Summary

The PRD is good for the **product**. What's missing is a clear **engine specification** that:

1. Elevates LiquidCode as the AI optimization layer
2. Makes LiquidSchema truly platform-agnostic
3. Defines the adapter interface contract
4. Separates the engine from any specific implementation

Build the engine first. The product comes second.
