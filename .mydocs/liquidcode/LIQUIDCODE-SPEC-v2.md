# LiquidCode Specification v2.0

**Version:** 2.0
**Date:** 2025-12-21
**Status:** Draft
**Authors:** Liquid Engine Core Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Philosophy](#2-design-philosophy)
3. [Core Architecture](#3-core-architecture)
4. [The Three Primitives](#4-the-three-primitives)
5. [Hierarchical Layer System](#5-hierarchical-layer-system)
6. [LiquidCode Grammar](#6-liquidcode-grammar)
7. [Interface Algebra](#7-interface-algebra)
8. [Block Addressing System](#8-block-addressing-system)
9. [Binding System](#9-binding-system)
10. [Signal System](#10-signal-system)
11. [Layout & Responsiveness System](#11-layout--responsiveness-system)
12. [Discovery Engine](#12-discovery-engine)
13. [Tiered Resolution System](#13-tiered-resolution-system)
14. [Fragment Cache Architecture](#14-fragment-cache-architecture)
15. [Compositional Grammar Engine](#15-compositional-grammar-engine)
16. [Digital Twin & State Management](#16-digital-twin--state-management)
17. [Compilation Pipeline](#17-compilation-pipeline)
18. [Adapter Interface Contract](#18-adapter-interface-contract)
19. [Error Handling & Degradation](#19-error-handling--degradation)
20. [Versioning & Migration](#20-versioning--migration)
- [Appendix A: Quick Reference](#appendix-a-quick-reference)
- [Appendix B: Hardening Specification](#appendix-b-hardening-specification)

---

## 1. Executive Summary

LiquidCode is a **token-minimal encoding language** for LLM-generated user interfaces. It reduces LLM output from ~4,000 tokens (raw JSON) to ~35 tokens while maintaining full expressiveness. The language compiles deterministically to LiquidSchema, a platform-agnostic interface specification that any adapter can render.

### 1.1 The Core Insight

LLMs are **decision engines**, not text generators. By constraining LLM output to minimal decisions and deferring structure generation to deterministic compilation, we achieve:

| Metric | Traditional | LiquidCode | Improvement |
|--------|-------------|------------|-------------|
| Token count | ~4,000 | ~35 | **114x reduction** |
| Latency | 8-12s | 70-100ms | **100x faster** |
| Cost per generation | $0.12 | $0.001 | **99% cheaper** |
| Error rate | 15-20% | <1% | **95% fewer errors** |

### 1.2 The Three Claims

1. **Any interface can be expressed** with three primitives: Block, Slot, Signal
2. **Any mutation can be expressed** with five operations: +, -, →, ~, ↑
3. **Any target can be addressed** with position-derived identity: @ordinal, @type, @grid, @binding

---

## 2. Design Philosophy

### 2.1 Principles

| Principle | Meaning | Implication |
|-----------|---------|-------------|
| **Decisions, not syntax** | LLM outputs choices, compiler outputs structure | Minimal token count |
| **Hierarchy enables parallelism** | Independent branches execute concurrently | Fast generation |
| **Constraints reduce errors** | Each layer limits decision space | High reliability |
| **Compilation guarantees correctness** | Deterministic transformation | No runtime errors |
| **Soft constraints, not hard filters** | Suggestions score options, never block | User freedom |
| **Position implies identity** | Addresses derive from structure | Zero token overhead |

### 2.2 Non-Goals

- **NOT a general programming language** — Purpose-built for interface generation
- **NOT human-authored** — Optimized for LLM output, not human typing
- **NOT rendered directly** — Always compiles to LiquidSchema first
- **NOT platform-specific** — Zero React, CSS, or DOM concepts in the language

---

## 3. Core Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              LIQUID ENGINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     DISCOVERY LAYER                               │   │
│  │  • Data fingerprinting (schema signals)                          │   │
│  │  • Primitive inference (UOM-based)                               │   │
│  │  • Archetype detection                                           │   │
│  │  • Intent prediction                                             │   │
│  │  • Binding suggestion (soft constraints)                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     RESOLUTION LAYER                              │   │
│  │  • Tiered resolution (cache → search → compose → LLM)           │   │
│  │  • Fragment composition                                          │   │
│  │  • Micro-LLM calls (targeted generation)                        │   │
│  │  • Parallel tree compilation                                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     LIQUIDCODE LAYER                              │   │
│  │  • Three-layer hierarchy (L0/L1/L2)                              │   │
│  │  • Token-minimal encoding                                        │   │
│  │  • Interface algebra (generate/mutate/query)                     │   │
│  │  • Block addressing system                                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     LIQUIDSCHEMA LAYER                            │   │
│  │  • Platform-agnostic specification                               │   │
│  │  • Zod-validated types                                           │   │
│  │  • Abstract block definitions                                    │   │
│  │  • Signal registry                                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     STATE LAYER                                   │   │
│  │  • Digital Twin (current authoritative state)                    │   │
│  │  • Operation history (undo/redo stack)                           │   │
│  │  • Snapshot addressing                                           │   │
│  │  • Source propagation (derivation tracking)                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │   REACT     │  │   REACT     │  │   OTHER     │
         │   ADAPTER   │  │   NATIVE    │  │   ADAPTERS  │
         └─────────────┘  └─────────────┘  └─────────────┘
```

### 3.2 Data Flow

```
Intent (natural language)
    ↓
Discovery Engine
    ↓ (data fingerprint + predicted archetypes)
Tiered Resolution
    ↓ (cache hit OR semantic match OR LLM generation)
LiquidCode (35 tokens)
    ↓ (deterministic compilation)
LiquidSchema (validated JSON)
    ↓ (adapter-specific rendering)
Rendered Interface
```

---

## 4. The Three Primitives

LiquidCode reduces all component architecture to exactly three concepts:

### 4.1 Block

A **Block** is the atomic unit of interface. Every visual element is a block.

```typescript
interface Block {
  uid: string;               // Stable unique identifier (required, see B.2)
  type: BlockType;           // What kind of block
  id?: string;               // User-assigned semantic ID (optional)
  binding?: DataBinding;     // What data it displays (optional for layout blocks)
  slots?: SlotMap;           // Where child blocks go (optional)
  signals?: SignalConnections; // How it participates in reactivity (optional)
}
```

**Block Categories:**

| Category | Has Binding | Has Slots | Emits Signals | Examples |
|----------|-------------|-----------|---------------|----------|
| Layout | No | Yes | No | grid, stack, tabs |
| Atomic Data | Yes | No | No | kpi, chart, table |
| Interactive | Optional | No | Yes | date-filter, select-filter |
| Composite | Yes | Yes | Optional | metric-group, card-with-actions |

### 4.2 Slot

A **Slot** is a named location where child blocks can be placed.

```typescript
type SlotMap = Record<string, Block[]>;
```

Slots enable composition:
- `grid.slots.children` — Where grid cells go
- `card.slots.header` — Card header content
- `card.slots.body` — Card body content
- `tabs.slots.panels` — Tab panel content

### 4.3 Signal

A **Signal** is a typed channel connecting emitters to receivers.

```typescript
interface Signal {
  type: SignalType;          // What kind of value flows
  default?: unknown;         // Initial value
  persist?: PersistStrategy; // Where to store (url, session, local, none)
}
```

**Signal Types:**

| Type | Value Shape | Example Use |
|------|-------------|-------------|
| `dateRange` | `{start: Date, end: Date}` | Time filtering |
| `selection` | `string \| string[]` | Row/item selection |
| `filter` | `Record<string, any>` | General filtering |
| `search` | `string` | Text search |
| `pagination` | `{page: number, size: number}` | Paging state |
| `sort` | `{field: string, dir: 'asc'\|'desc'}` | Sort state |
| `toggle` | `boolean` | Binary state |
| `custom` | `any` | User-defined |

### 4.4 Completeness Theorem

**Claim:** Any interface interaction can be expressed with Block + Slot + Signal.

**Proof by construction:**

| Interaction | Expression |
|-------------|------------|
| Static display | Block with binding |
| Layout | Block with slots |
| User input | Block emitting signal |
| Data filtering | Block receiving signal into binding.filter |
| Master-detail | Block A emits selection → Block B receives into binding.filter |
| Nested dashboard | Block with slots, signals bridged via receives |

No fourth primitive is needed. Three is complete.

### 4.5 Orthogonality of Concepts

LiquidCode concepts are designed to be **orthogonal** — each axis is independent:

| Concept A | Concept B | Relationship | Example |
|-----------|-----------|--------------|---------|
| Block | Slot | Independent | A block has slots OR doesn't; slots contain blocks |
| Block | Signal | Independent | A block emits/receives OR doesn't |
| Slot | Signal | Independent | Signals flow through slots but don't define them |
| Priority | Flexibility | Independent | `!hero^shrink` = important but can shrink |
| Binding | Signal | Complementary | Binding = data in; Signal = events/state |
| Generation Layer | Composition Depth | Orthogonal | When produced vs where nested |

**Why orthogonality matters:**
- Each concept can vary independently
- No hidden coupling between decisions
- LLM can change one without affecting others
- Simpler mental model

**Common confusions resolved:**

| Question | Answer |
|----------|--------|
| "If a block is in a slot, is it grouped?" | No. Slots define containment; groups define behavior |
| "If a block is hero, is it fixed?" | No. Hero = visibility priority; fixed = size behavior |
| "If blocks share a signal, are they in the same slot?" | Not necessarily. Signals connect across the tree |
| "Does nesting depth affect generation order?" | No. All blocks generated in L1, regardless of depth |

---

## 5. Hierarchical Layer System

### 5.1 The Three Layers

LiquidCode decomposes interface generation into three independent layers:

```
L0: STRUCTURE (5 tokens)
├── Archetype selection
├── Layout decision
└── Block count

L1: CONTENT (20 tokens, parallelizable)
├── Block types
├── Data bindings
└── Signal connections

L2: POLISH (10 tokens, optional)
├── Labels
├── Formatting
└── Styling hints
```

### 5.2 Layer Independence

Each layer can be:
- **Generated independently** — L0 completes before L1 starts
- **Mutated independently** — "Change the chart type" touches only L1
- **Cached independently** — L2 polish can reuse L1 content
- **Parallelized within** — All L1 blocks generate concurrently

### 5.3 Layer Scope Detection

When processing a mutation request, the engine detects which layer(s) are affected:

| User Request | Affected Layer | Scope |
|--------------|----------------|-------|
| "Add a new metric" | L1 | Single block addition |
| "Change chart to bar" | L1 | Single block type change |
| "Update the title" | L2 | Single block polish |
| "Make it a grid layout" | L0 | Full restructure |
| "Show revenue instead of cost" | L1 | Binding change |

### 5.4 Cascade Rules

When a higher layer changes, lower layers may need regeneration:

```
L0 change → Invalidates all L1 and L2
L1 change → Invalidates affected L2 only
L2 change → No cascade
```

This enables **surgical corrections** — most user edits touch only L1 or L2.

### 5.5 Mathematical Foundation

**Error probability per layer:** ~5%
**With 3 layers:** 0.95³ = 85% full success
**Without layers (monolithic):** 0.95^N where N = all decisions (~10-20) = <40% success

Hierarchy dramatically improves reliability.

### 5.6 Generation Layers vs Composition Depth

**Critical clarification:** LiquidCode has TWO distinct hierarchies that must not be confused:

| Concept | Notation | Purpose | Example |
|---------|----------|---------|---------|
| **Generation Layers** | L0, L1, L2 | Stages of LLM output | L0=Structure, L1=Content, L2=Polish |
| **Composition Depth** | D0, D1, Dn | Nesting in component tree | Interface → Grid → Nested Card → ... |

**Generation Layers (L0/L1/L2):**
- Fixed at THREE levels
- Describe WHEN/HOW the LLM produces output
- L0 decides structure → L1 fills content → L2 adds polish
- Each layer is a phase of generation

**Composition Depth (D0/D1/Dn):**
- Unlimited nesting depth
- Describes WHERE blocks are in the component tree
- D0 = Root interface
- D1 = Blocks in root's slots
- Dn = Blocks nested n levels deep
- Slots can contain blocks which can have slots...

**These are orthogonal:**
- A deeply nested block (D5) is still generated in phase L1 (content)
- The generation phase doesn't depend on nesting depth
- The nesting depth doesn't affect which generation phase handles it

```
Generation Phases (temporal):
  L0 → L1 → L2
  (structure) → (all blocks, any depth) → (polish for all)

Composition Tree (spatial):
  Interface (D0)
  ├── Grid (D1)
  │   ├── KPI (D2)
  │   └── Card (D2)
  │       └── Chart (D3)
  └── Sidebar (D1)
      └── Filter (D2)
```

---

## 6. LiquidCode Grammar

### 6.1 Core Syntax

LiquidCode uses single-character prefixes for maximum token efficiency:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `#` | Archetype | `#overview` |
| `@` | Address | `@K0` |
| `$` | Binding field | `$revenue` |
| `§` | Signal | `§dateRange` |
| `>` | Emit signal | `>@dateRange` |
| `<` | Receive signal | `<@dateRange` |
| `Δ` | Mutation | `Δ~@K0.label` |
| `?` | Query | `?@K0` |

### 6.2 Block Type Codes

Single/double character codes for common block types:

| Code | Block Type | Category |
|------|------------|----------|
| `K` | kpi | Atomic Data |
| `B` | bar-chart | Atomic Data |
| `L` | line-chart | Atomic Data |
| `P` | pie-chart | Atomic Data |
| `T` | data-table | Atomic Data |
| `G` | grid | Layout |
| `S` | stack | Layout |
| `X` | text | Atomic Data |
| `M` | metric-group | Composite |
| `C` | comparison | Atomic Data |
| `DF` | date-filter | Interactive |
| `SF` | select-filter | Interactive |
| `SI` | search-input | Interactive |

### 6.3 Generation Syntax

Full interface generation:

```
#archetype;layout;blocks

Examples:
#overview;G2x2;K$revenue,K$orders,L$date$amount,T
#comparison;S;C$current$previous,B$category$value
#funnel;S;K$stage1,K$stage2,K$stage3,K$stage4
```

Breakdown:
- `#overview` — Archetype hint
- `G2x2` — Grid layout, 2 columns x 2 rows
- `K$revenue` — KPI bound to revenue field
- `L$date$amount` — Line chart with date as X, amount as Y

### 6.4 Signal Syntax

Signal declaration (interface level):
```
§signalName:type=default,persist

Examples:
§dateRange:dr=30d,url
§category:sel=all,session
§search:str=,none
```

Signal emission (block level):
```
>@signalName:trigger

Examples:
>@dateRange:onChange
>@category:onSelect
```

Signal reception (block level):
```
<@signalName→target

Examples:
<@dateRange→filter.date
<@category→filter.category
```

### 6.5 Complete Example

```liquidcode
#sales_dashboard;G2x3
§dateRange:dr=30d,url
§category:sel=all,session
DF<>@dateRange
SF$categories<>@category
K$revenue<@dateRange<@category
K$orders<@dateRange<@category
L$date$revenue<@dateRange<@category
T$orders<@dateRange<@category
```

Compiles to a sales dashboard with:
- 2x3 grid layout
- Date filter emitting to @dateRange (persisted to URL)
- Category filter emitting to @category (persisted to session)
- 4 data blocks all receiving both signals

**Token count: ~40** vs **~4,000 for equivalent JSON**

---

## 7. Interface Algebra

LiquidCode v2 introduces **Interface Algebra** — the language is not just for generation but for complete interface manipulation.

### 7.1 Three Modes

| Mode | Symbol | Purpose |
|------|--------|---------|
| **Generate** | `#` | Create interface from intent |
| **Mutate** | `Δ` | Modify existing interface |
| **Query** | `?` | Read current state |

### 7.2 Operation Primitives

Five atomic operations for mutations:

| Symbol | Operation | Meaning | Example |
|--------|-----------|---------|---------|
| `+` | Add | Insert new block | `Δ+K$profit@[1,2]` |
| `-` | Remove | Delete block | `Δ-@K1` |
| `→` | Replace | Swap block type | `Δ@P0→B` |
| `~` | Modify | Change property | `Δ~@K0.label:"Total"` |
| `↑` | Move | Relocate block | `Δ↑@K0→[0,1]` |

### 7.3 Mutation Examples

```liquidcode
# Add a new KPI showing profit in grid position [1,2]
Δ+K$profit@[1,2]

# Remove the second KPI
Δ-@K1

# Replace pie chart with bar chart
Δ@P0→B

# Change KPI label
Δ~@K0.label:"Total Revenue"

# Move block from [0,0] to [1,1]
Δ↑@[0,0]→[1,1]

# Batch operations
Δ[-@K1,~@K0.label:"New",+L$trend@[2,0]]
```

### 7.4 Query Syntax

```liquidcode
# Get current state of first KPI
?@K0

# Get all charts
?@*chart

# Get block at position [0,1]
?@[0,1]

# Get interface summary
?summary
```

### 7.5 Efficiency Comparison

| Operation | Full Regeneration | Mutation |
|-----------|-------------------|----------|
| Change one label | 35 tokens | 4 tokens |
| Add one block | 35 tokens | 6 tokens |
| Remove one block | 35 tokens | 3 tokens |
| Swap chart type | 35 tokens | 4 tokens |

**Mutations are 8-10x more efficient than regeneration.**

---

## 8. Block Addressing System

### 8.1 Design Principle

Block addresses are **derived from position**, not stored as IDs. This achieves:
- Zero token cost for address generation
- Stable addresses across regeneration
- Human-readable targeting

### 8.2 Address Hierarchy

| Address Form | Syntax | Meaning | Token Cost |
|--------------|--------|---------|------------|
| Pure ordinal | `@0`, `@1` | Nth block in flat order | 1 token |
| Type ordinal | `@K0`, `@L1` | Nth block of type | 1 token |
| Grid position | `@[0,1]` | Row, column | 1 token |
| Binding signature | `@:revenue` | Block bound to field | 2 tokens |
| Explicit ID | `@#myId` | User-assigned ID | 2 tokens |

### 8.3 Resolution Priority

When resolving an address:

1. **Explicit ID** — `@#myId` matches block with `id: "myId"`
2. **Grid position** — `@[0,1]` matches block at row 0, column 1
3. **Type ordinal** — `@K0` matches first KPI
4. **Binding signature** — `@:revenue` matches block bound to revenue
5. **Pure ordinal** — `@0` matches first block in traversal order

### 8.4 Wildcard Selectors

For batch operations:

| Selector | Meaning | Example |
|----------|---------|---------|
| `@K*` | All KPIs | `Δ~@K*.showTrend:true` |
| `@[*,0]` | All in column 0 | `Δ~@[*,0].width:200` |
| `@:*revenue*` | All revenue bindings | `Δ~@:*revenue*.format:"$"` |

### 8.5 Snapshot Addressing

Reference historical states:

```liquidcode
# Address block as it was after operation 3
@snapshot:3.@K0

# Compare current to previous
?diff(@snapshot:-1, @current)
```

### 8.6 Schema Summary for LLM Context

When processing mutations, the engine injects a **schema summary** (~15 tokens) as LLM context:

```
@0:K[0,0]revenue "Revenue"
@1:K[0,1]orders "Orders"
@2:L[1,0]date,amount "Trend"
@3:P[1,1]category,amount "Distribution"
```

This enables the LLM to resolve user references like "the pie chart" → `@P0` or `@3`.

---

## 9. Binding System

### 9.1 Binding Definition

A **binding** connects a block to data:

```typescript
interface DataBinding {
  source: string;                    // Data source reference
  fields: FieldBinding[];            // Field mappings
  aggregate?: AggregateSpec;         // Aggregation (sum, count, avg)
  groupBy?: string[];                // Grouping fields
  filter?: FilterCondition[];        // Filter conditions
  sort?: SortSpec[];                 // Sort order
  limit?: number;                    // Row limit
}

interface FieldBinding {
  target: BindingSlot;               // Where data goes (x, y, value, label, etc.)
  field: string;                     // Source field name
  transform?: TransformSpec;         // Optional transformation
}
```

### 9.2 Binding Slots by Block Type

| Block Type | Required Slots | Optional Slots |
|------------|----------------|----------------|
| kpi | value | label, trend, icon, compare |
| bar-chart | category, value | color, label, stack |
| line-chart | x, y | series, color, label |
| pie-chart | label, value | color |
| data-table | data, columns | pageSize |
| comparison | current, previous | label, format |

### 9.3 Binding Suggestion System (Soft Constraints)

The engine **suggests** bindings using soft constraints (scores), never hard filters:

```typescript
type BindingSlot =
  | 'x' | 'y' | 'value' | 'label' | 'category'
  | 'series' | 'color' | 'stack' | 'trend' | 'icon'
  | 'compare' | 'current' | 'previous' | 'format'
  | 'data' | 'columns' | 'pageSize';

interface BindingSuggestion {
  field: string;
  slot: BindingSlot;
  score: number;           // 0-1 confidence
  signals: ScoringSignal[];
}

interface ScoringSignal {
  source: 'type' | 'semantic' | 'pattern' | 'position' | 'user';
  weight: number;
  reason: string;
}
```

**Scoring signals:**

| Signal | Weight | Example |
|--------|--------|---------|
| Type match | 0.3 | Numeric field → value slot |
| Semantic match | 0.3 | "revenue" → financial KPI |
| Pattern match | 0.2 | Date column → X axis |
| Position match | 0.1 | First numeric → primary metric |
| User history | 0.1 | Previously used this binding |

**Confidence thresholds:**

| Score | Behavior |
|-------|----------|
| > 0.8 | Auto-bind (high confidence) |
| 0.5 - 0.8 | Bind with "best guess" flag |
| < 0.5 | Prompt for clarification |

**Critical principle:** User explicit intent always overrides suggestions.

### 9.4 LiquidCode Binding Syntax

```liquidcode
# Simple binding (field name only)
K$revenue

# Multi-field binding
L$date$amount

# Binding with slot specification
B$category:x$revenue:y

# Binding with aggregation
K$revenue:sum

# Binding with groupBy
B$category$revenue:sum:groupBy=region

# Binding with filter
T$orders:filter=status:active
```

---

## 10. Signal System

### 10.1 Signal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE (SignalRegistry)                │
│  @dateRange: dateRange (persist: url)                       │
│  @category: selection (persist: session)                    │
│  @search: search (persist: none)                            │
└─────────────────────────────────────────────────────────────┘
         ↑ emit                              ↓ receive
┌─────────────────┐                 ┌─────────────────────────┐
│   EMITTERS      │                 │      RECEIVERS          │
│  date-filter    │                 │  line-chart             │
│  select-filter  │                 │  data-table             │
│  search-input   │                 │  kpi-cards              │
└─────────────────┘                 └─────────────────────────┘
```

### 10.2 Signal Declaration

At interface level:

```typescript
interface SignalRegistry {
  [signalName: string]: SignalDefinition;
}

interface SignalDefinition {
  type: SignalType;
  default?: unknown;
  persist?: 'none' | 'url' | 'session' | 'local';
  validation?: string;    // LiquidExpr returning boolean (see B.4)
}
```

### 10.3 Signal Connections

At block level:

```typescript
interface SignalConnections {
  emits?: SignalEmission[];
  receives?: SignalReception[];
}

interface SignalEmission {
  signal: string;             // Name from registry
  trigger: TriggerType;       // When to emit
  transform?: string;         // Value transformation
}

interface SignalReception {
  signal: string;             // Name from registry
  target: string;             // Binding path to update
  transform?: string;         // Value transformation
}
```

### 10.4 Trigger Types

| Trigger | Fires When |
|---------|------------|
| `onChange` | Value changes |
| `onSelect` | Item selected |
| `onSubmit` | Form submitted |
| `onClear` | Value cleared |
| `onToggle` | Boolean toggled |

### 10.5 Signal Auto-Wiring

The engine can automatically wire common signal patterns:

| Pattern | Auto-Wire Rule |
|---------|----------------|
| Date filter + time-series chart | Connect via @dateRange |
| Category filter + grouped data | Connect via @categoryFilter |
| Search input + table | Connect via @search |
| Master table + detail view | Connect via @selection |

Auto-wiring suggestions follow the same soft-constraint model as bindings.

### 10.6 Fractal Composition

Signals work at any nesting level:

```
Interface level:
  signals: { @globalFilter, @theme }

Block level (composite component):
  signals: { @localSelection }

Nested interface (embedded dashboard):
  signals: { @childFilter }
  receives: @globalFilter → @childFilter  // bridging
```

### 10.7 Signal Inheritance

When blocks nest or interfaces embed, signal visibility follows clear rules:

**Default: Auto-Inherit**
- Child blocks see parent's signal registry automatically
- No explicit declaration needed for receiving parent signals
- `<@parentSignal` just works

**Explicit: Shadowing**
- Child can declare a signal with same name
- Child's signal shadows (overrides) parent's for that subtree
- Useful for isolation

**Explicit: Bridging**
- Child can map parent signal to different local name
- `receives: @parentFilter → @localFilter`
- Useful when naming conventions differ

```typescript
interface SignalInheritance {
  mode: 'inherit' | 'shadow' | 'bridge' | 'isolate';
  mappings?: Record<string, string>;  // parent → local
}
```

**Inheritance modes:**

| Mode | Parent Signal | Local Signal | Behavior |
|------|---------------|--------------|----------|
| `inherit` (default) | Visible | If different, both visible | Child uses parent's |
| `shadow` | Hidden | Overrides | Child's replaces parent's |
| `bridge` | Hidden | Mapped | Parent's value flows to local name |
| `isolate` | Hidden | Only local | No parent signals visible |

---

## 11. Layout & Responsiveness System

### 11.1 The Layout Problem

Traditional approaches fail for LLM-generated interfaces:

| Approach | Problem |
|----------|---------|
| Pixel sizes in schema | Fragile, platform-specific, token-heavy |
| CSS media queries | Platform-specific, LLM can't reason about it |
| Fixed percentages | Doesn't adapt to content or container |

**The insight:** Layout is not about sizes. Layout is about **relationships and priorities**.

The LLM should express semantic intent:
- "This is the most important block"
- "These blocks should stay together"
- "This can shrink if needed"

The **adapter** converts these constraints to platform-specific layout.

### 11.2 The Three Layout Concepts

| Concept | Purpose | What LLM Decides |
|---------|---------|------------------|
| **Priority** | Importance ranking | Which blocks matter most |
| **Flexibility** | Resize behavior | What can adapt to space |
| **Relationship** | Spatial semantics | How blocks relate |

### 11.3 Priority System

Blocks have semantic importance levels:

| Priority | Level | Meaning | Responsive Behavior |
|----------|-------|---------|---------------------|
| `hero` | 1 | The main insight | Never hidden, always visible |
| `primary` | 2 | Key supporting info | Visible in standard+ breakpoints |
| `secondary` | 3 | Important but deferrable | May collapse on small screens |
| `detail` | 4 | Nice-to-have | Hidden on compact, shown on demand |

**Default:** Blocks without explicit priority are `primary`.

### 11.4 Flexibility System

Blocks have adaptation behavior:

| Flexibility | Meaning | Use Case |
|-------------|---------|----------|
| `fixed` | Needs its content space | KPIs, key metrics |
| `shrink` | Can reduce size | Charts (lose legend/labels) |
| `grow` | Can expand to fill | Tables, large visualizations |
| `collapse` | Can minimize/hide | Detail blocks, secondary info |

**Defaults by block type:**

| Block Type | Default Flexibility |
|------------|---------------------|
| kpi | fixed |
| bar-chart, line-chart, pie-chart | shrink |
| data-table | grow |
| text | shrink |
| metric-group | shrink |

### 11.5 Relationship System

Blocks can have spatial relationships:

| Relationship | Meaning | Example |
|--------------|---------|---------|
| `group` | These blocks are a unit | KPI row that moves together |
| `compare` | Should be same size | Side-by-side charts |
| `detail` | Elaborates another block | Table showing chart data |
| `flow` | Natural reading order | Can wrap to next line |

### 11.6 LiquidCode Layout Syntax

**Priority suffix:** `!`
```liquidcode
K$revenue!hero      # Hero priority (never hide)
K$orders!1          # Explicit level 1
L$trend!3           # Secondary (can collapse)
K$profit!detail     # Detail (hidden on compact)
```

**Flexibility suffix:** `^`
```liquidcode
K$revenue^fixed     # Fixed size
L$trend^grow        # Can grow to fill space
T$orders^shrink     # Can shrink
P$dist^collapse     # Can collapse/hide
```

**Relationship grouping:** `=`
```liquidcode
[K$revenue K$orders K$profit]=group    # These stay together
[L$trend B$compare]=compare            # Same size
[K$total -> T$breakdown]=detail        # Detail relationship
```

**Combined (composable):**
```liquidcode
K$revenue!hero^fixed    # Hero priority, fixed size
L$trend!2^grow*full     # Primary, can grow, full width
```

**Span suffix:** `*` (in grid context)
```liquidcode
L$trend*full            # Full width (all columns)
T$data*2                # Span 2 columns
```

### 11.7 Complete Layout Example

```liquidcode
#sales_dashboard;G2x3
§dateRange:dr=30d,url
DF<>@dateRange
K$revenue!hero^fixed
K$orders!1^fixed
K$profit!2^fixed
[K$revenue K$orders K$profit]=group
L$trend!1^grow*full
B$byRegion!2^shrink
[L$trend B$byRegion]=compare
T$details!3^collapse*full
```

This encodes:
- Revenue KPI is hero (never hidden)
- Three KPIs are a group (stay together)
- Trend chart and region chart should be same height
- Details table can collapse and spans full width

### 11.8 Block Layout Properties (Schema)

The Block interface (see §4.1) includes an optional `layout` field:

```typescript
interface BlockLayout {
  // Priority (1-4, or semantic name)
  priority?: 1 | 2 | 3 | 4 | 'hero' | 'primary' | 'secondary' | 'detail';

  // Flexibility
  flex?: 'fixed' | 'shrink' | 'grow' | 'collapse';

  // Size hints (adapter interprets)
  size?: SizeHints;

  // Span (in grid context)
  span?: SpanSpec;

  // Relationship to other blocks
  relationship?: RelationshipSpec;
}

interface SizeHints {
  min?: SizeValue;       // Minimum viable size
  ideal?: SizeValue;     // Preferred size
  max?: SizeValue;       // Maximum size
  aspect?: number;       // Width/height ratio (e.g., 16/9)
}

type SizeValue = number | 'auto' | 'content' | `${number}%`;

interface SpanSpec {
  columns?: number | 'full' | 'half' | 'third' | 'quarter' | 'auto';
  rows?: number;
}

interface RelationshipSpec {
  type: 'group' | 'compare' | 'detail' | 'flow';
  with?: string[];       // Block IDs/UIDs in relationship
}
```

### 11.9 Intrinsic Block Sizes

Each block type has natural size requirements:

| Block Type | Min Width | Ideal Width | Height | Aspect Ratio |
|------------|-----------|-------------|--------|--------------|
| kpi | 100px | 200px | ~80px | - |
| bar-chart | 200px | 400px | auto | 16:9 |
| line-chart | 250px | 500px | auto | 16:9 |
| pie-chart | 150px | 300px | auto | 1:1 |
| data-table | 300px | 100% | content | - |
| text | 150px | 100% | content | - |
| comparison | 120px | 250px | ~100px | - |

### 11.10 Slot Context (Embedded Rendering)

When LiquidCode renders in a container (not full screen), the adapter provides context:

```typescript
interface SlotContext {
  // Available space
  width: number;
  height: number | 'auto';

  // Breakpoint (adapter-determined)
  breakpoint: 'compact' | 'standard' | 'expanded';

  // Constraints
  minBlockWidth?: number;
  orientation?: 'any' | 'portrait' | 'landscape';

  // Parent coordination
  parentSignals?: SignalRegistry;
}
```

The engine uses slot context during compilation:

```typescript
engine.compile(liquidCode, {
  context: slotContext,
  adapt: true  // Enable responsive adaptation
});
```

### 11.11 Responsive Transformation Rules

The engine transforms schemas based on breakpoint:

| Breakpoint | Trigger | Transformation |
|------------|---------|----------------|
| `expanded` | width >= 1200px | Full layout as designed |
| `standard` | 600px <= width < 1200px | Reduce columns, stack some blocks |
| `compact` | width < 600px | Single column, collapse detail blocks |

**Transformation algorithm:**

```
1. Determine breakpoint from slot context
2. Filter blocks by priority for breakpoint
3. Calculate available space per visible block
4. Apply flexibility rules:
   - fixed: allocate minimum required
   - grow: share remaining space proportionally
   - shrink: reduce to minimum viable
   - collapse: minimize or hide
5. Apply relationships:
   - group: keep together, stack if needed
   - compare: equalize dimensions
   - detail: position after master
6. Generate adapted layout
```

### 11.12 Responsive Layout Config (Schema)

```typescript
interface LayoutBlock {
  type: 'grid' | 'stack' | 'flow';

  // Responsive configuration
  responsive?: ResponsiveConfig;

  children: Block[];
}

interface ResponsiveConfig {
  // Explicit breakpoint overrides
  breakpoints?: {
    compact?: BreakpointLayout;
    standard?: BreakpointLayout;
    expanded?: BreakpointLayout;
  };

  // Or automatic layout inference
  auto?: {
    minColumnWidth: number;    // Min column width before wrap
    maxColumns: number;        // Max columns regardless of space
    gutter: 'none' | 'tight' | 'normal' | 'loose';
  };
}

interface BreakpointLayout {
  columns: number;
  visiblePriorities?: number[];  // Which priority levels show
  collapse?: string[];           // Block IDs to collapse
  stack?: string[][];            // Block groups to stack vertically
}
```

### 11.13 LiquidCode Responsive Overrides

For explicit breakpoint control (rare, usually auto-inferred):

```liquidcode
# Override for compact breakpoint
@compact:L$trend^collapse     # Collapse chart on compact
@compact:T$details-           # Remove table on compact
@compact:[K$a K$b]=stack      # Stack these KPIs on compact
```

### 11.14 Adapter Responsibility

The adapter translates layout constraints to platform:

```typescript
interface LiquidAdapter<RenderOutput> {
  // ... existing methods ...

  // Layout-aware rendering
  renderWithContext(
    schema: LiquidSchema,
    data: any,
    context: SlotContext
  ): RenderOutput;

  // Calculate layout for context
  calculateLayout(
    schema: LiquidSchema,
    context: SlotContext
  ): LayoutPlan;
}

interface LayoutPlan {
  breakpoint: Breakpoint;
  visibleBlocks: string[];
  collapsedBlocks: string[];
  hiddenBlocks: string[];
  grid: GridCell[];
}

interface GridCell {
  blockId: string;
  row: number;
  column: number;
  rowSpan: number;
  colSpan: number;
  width: number;
  height: number | 'auto';
}
```

### 11.15 Layout Examples by Context

**Full screen (expanded):**
```
┌────────────────────────────────────────────────────────┐
│ [KPI: Revenue]  [KPI: Orders]  [KPI: Profit]  [KPI: X] │
├────────────────────────────┬───────────────────────────┤
│ [Line Chart: Trend]        │ [Bar Chart: By Region]    │
├────────────────────────────┴───────────────────────────┤
│ [Data Table: Details]                                   │
└────────────────────────────────────────────────────────┘
```

**Embedded widget (standard):**
```
┌─────────────────────────────┐
│ [KPI: Revenue] [KPI: Orders]│
├─────────────────────────────┤
│ [Line Chart: Trend]         │
├─────────────────────────────┤
│ [Bar Chart: By Region]      │
└─────────────────────────────┘
```

**Sidebar slot (compact):**
```
┌──────────────┐
│ [KPI: Revenue]│ ← Hero only
├──────────────┤
│ [Sparkline]  │ ← Chart minimized
├──────────────┤
│ [3 more ▼]   │ ← Collapsed
└──────────────┘
```

---

## 12. Discovery Engine

### 12.1 Purpose

The Discovery Engine analyzes data **before** user interaction to:
- Predict what interfaces users will request
- Pre-generate common fragments
- Warm the cache for zero-latency response

### 12.2 Discovery Pipeline

```
Data Source
    ↓
Schema Fingerprinting
    ↓ (column names, types, cardinality)
Primitive Inference (UOM)
    ↓ (date, currency, count, percentage, category)
Archetype Detection
    ↓ (overview, comparison, funnel, time_series)
Intent Prediction
    ↓ (likely user questions)
Fragment Pre-Generation
    ↓ (cached LiquidCode fragments)
Cache Warmed
```

### 12.3 Schema Archetypes

| Archetype | Data Pattern | Predicted Interface |
|-----------|--------------|---------------------|
| `overview` | Mixed metrics + dimensions | KPI row + charts grid |
| `time_series` | Date + measures | Line/area charts |
| `comparison` | Two periods/groups | Comparison blocks + delta |
| `funnel` | Ordered stages | Funnel or waterfall |
| `hierarchical` | Parent-child relationships | Tree or nested metrics |
| `distribution` | Categories + values | Pie/donut + bar |
| `correlation` | Multiple numeric columns | Scatter + heatmap |

### 12.4 UOM Primitive Inference

Using Universal Organization Metamodel concepts:

| Primitive | Detection Signals | Example Fields |
|-----------|-------------------|----------------|
| `date` | Date type, "date/time/created" in name | created_at, order_date |
| `currency` | "price/cost/revenue/amount" in name | revenue, total_cost |
| `count` | Integer, "count/qty/quantity" in name | order_count, units |
| `percentage` | 0-1 or 0-100 range, "rate/pct" in name | conversion_rate |
| `category` | Low cardinality, string type | region, status |
| `identifier` | High cardinality, unique | user_id, order_id |

### 12.5 Intent Prediction

From primitives, predict likely user intents:

| Detected Primitives | Predicted Intents |
|---------------------|-------------------|
| date + currency | "Show revenue over time" |
| category + currency | "Compare revenue by category" |
| date + count | "Show order trends" |
| two currencies | "Compare actual vs budget" |
| category + percentage | "Show conversion by segment" |

### 12.6 Pre-Generation Strategy

For each predicted intent, generate and cache:
- L0 structure (archetype + layout)
- L1 fragments (block types + binding templates)
- L2 defaults (sensible labels + formatting)

**Goal:** 85%+ of first queries hit cache.

---

## 13. Tiered Resolution System

### 13.1 Resolution Hierarchy

```
User Intent
    ↓
┌───────────────────────────────────────────┐
│ TIER 1: Exact Cache Hit (40% of requests) │
│   Intent hash matches cached fragment      │
│   Latency: <5ms                           │
└───────────────────────────────────────────┘
    ↓ (miss)
┌───────────────────────────────────────────┐
│ TIER 2: Semantic Search (50% of requests) │
│   Similar intent in vector store          │
│   Latency: <50ms                          │
└───────────────────────────────────────────┘
    ↓ (miss)
┌───────────────────────────────────────────┐
│ TIER 3: Fragment Composition (9%)         │
│   Combine cached fragments                 │
│   Compositional Grammar Engine             │
│   Latency: <100ms                         │
└───────────────────────────────────────────┘
    ↓ (miss)
┌───────────────────────────────────────────┐
│ TIER 4: LLM Generation (1% of requests)   │
│   Novel archetypes only                   │
│   Micro-LLM for targeted generation       │
│   Latency: <500ms                         │
└───────────────────────────────────────────┘
```

### 13.2 Cache Key Design

```typescript
interface CacheKey {
  intentHash: string;        // Normalized intent signature
  dataFingerprint: string;   // Schema signature
  archetypeHint?: string;    // If provided
  scope: 'interface' | 'block';
}
```

### 13.3 Semantic Search

For near-misses, use embedding similarity:

```typescript
interface SemanticMatch {
  fragment: CachedFragment;
  similarity: number;        // 0-1
  adaptations: Adaptation[]; // What needs to change
}
```

If similarity > 0.85 and adaptations are L2-only (labels/formatting), use cached fragment with adaptations.

### 13.4 Micro-LLM Calls

For targeted generation within Tier 4:

| Scenario | Micro-Call Scope | Tokens |
|----------|------------------|--------|
| Single block needed | Just that block type | 5-10 |
| Binding clarification | Binding suggestion | 3-5 |
| Label refinement | L2 polish only | 5-10 |
| Novel archetype | Full L0+L1+L2 | 35-50 |

Micro-calls are **scoped** to minimize token usage.

---

## 14. Fragment Cache Architecture

### 14.1 Fragment Types

| Fragment Type | Contains | Reusability |
|---------------|----------|-------------|
| `archetype` | L0 structure + layout | High (pattern-based) |
| `block` | Single block definition | Very high |
| `composition` | Block combinations | Medium |
| `polish` | L2 formatting | Very high |
| `binding-template` | Binding patterns | High |

### 14.2 Storage Interface

```typescript
interface FragmentStorage {
  get(key: CacheKey): Promise<CachedFragment | null>;
  set(key: CacheKey, fragment: CachedFragment, ttl?: number): Promise<void>;
  search(embedding: number[], limit: number): Promise<SemanticMatch[]>;
  invalidate(pattern: string): Promise<number>;
  clear(): Promise<void>;
}
```

### 14.3 Cache Warming Strategy

```
On data source connection:
  1. Fingerprint schema
  2. Detect archetypes
  3. Predict top 20 intents
  4. Pre-generate fragments for each
  5. Store in cache with high TTL

On first user query:
  6. Cache hit expected 85%+ of time
```

### 14.4 Invalidation Rules

| Event | Invalidation Scope |
|-------|-------------------|
| Schema change | All fragments for that data source |
| User correction | Specific fragment + similar |
| TTL expiry | Individual fragment |
| Manual clear | All fragments |

---

## 15. Compositional Grammar Engine

### 15.1 Purpose

When no single cached fragment matches, compose from smaller pieces.

### 15.2 Composition Rules

```typescript
interface CompositionRule {
  pattern: IntentPattern;      // What intent structure matches
  fragments: FragmentRef[];    // What fragments to combine
  layout: LayoutRule;          // How to arrange
  signals: SignalWiring;       // How to connect
}
```

### 15.3 Layout Inference

From block count and types, infer layout:

| Block Composition | Inferred Layout |
|-------------------|-----------------|
| 2-4 KPIs | Single row |
| KPIs + 1 chart | KPI row + chart below |
| KPIs + 2 charts | KPI row + 2-col chart row |
| KPIs + charts + table | 3-row grid |
| All charts | Responsive grid |

### 15.4 Signal Auto-Wiring

When composing fragments with interactive blocks:

| Interactive Block | Target Blocks | Auto-Wire |
|-------------------|---------------|-----------|
| date-filter | All time-series | @dateRange |
| select-filter | Blocks with matching groupBy | @filter |
| search-input | Tables | @search |

### 15.5 Binding Coherence

Ensure composed fragments share consistent bindings:

```
Rule: If multiple blocks use same field, use same aggregation
Rule: If blocks are in same row, likely related—use compatible scales
Rule: If filter exists, all data blocks should receive it
```

---

## 16. Digital Twin & State Management

### 16.1 Digital Twin

The **Digital Twin** is the authoritative current state of the interface:

```typescript
interface DigitalTwin {
  schema: LiquidSchema;          // Current valid schema
  timestamp: number;             // Last update time
  operationCount: number;        // Total operations applied
}
```

### 16.2 Operation History

```typescript
interface OperationHistory {
  operations: AppliedOperation[];
  maxSize: number;               // Undo depth limit

  push(op: Operation): void;
  undo(): Operation | null;
  redo(): Operation | null;
  snapshot(index: number): LiquidSchema;
}

interface AppliedOperation {
  operation: Operation;          // The mutation
  timestamp: number;
  inverse: Operation;            // For undo
  beforeHash: string;            // State verification
  afterHash: string;
}
```

### 16.3 Snapshot Addressing

Reference historical states for comparison or rollback:

```typescript
// Get schema as it was after operation N
twin.history.snapshot(3)

// In LiquidCode
?@snapshot:3.@K0  // Query first KPI at snapshot 3
```

### 16.4 Source Propagation

Track where each piece of the schema came from:

```typescript
interface SourceTracking {
  source: 'cache' | 'semantic' | 'composition' | 'llm' | 'mutation';
  confidence: number;
  timestamp: number;
  operationId?: string;
}
```

This enables:
- Debugging why something looks wrong
- Learning from corrections
- Explaining decisions to users

---

## 17. Compilation Pipeline

### 17.1 LiquidCode → LiquidSchema

```
LiquidCode (35 tokens)
    ↓
Tokenizer
    ↓ (token stream)
Parser
    ↓ (AST)
Semantic Analyzer
    ↓ (validated AST with resolved references)
Schema Generator
    ↓ (LiquidSchema JSON)
Validator (Zod)
    ↓ (validated LiquidSchema)
Output
```

### 17.2 Parallel Tree Compilation

L1 blocks compile in parallel:

```
L0 completes
    ↓
┌────────┬────────┬────────┐
│ Block1 │ Block2 │ Block3 │  (parallel)
└────────┴────────┴────────┘
    ↓
Merge into schema
    ↓
L2 polish (parallel per block)
    ↓
Final schema
```

### 17.3 Streaming Support

For real-time rendering:

```
L0 complete → Render skeleton
L1[0] complete → Render first block
L1[1] complete → Render second block
...
L2 complete → Apply polish
```

Users see progressive interface construction.

### 17.4 Compilation Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| Type safety | Zod validation |
| No undefined references | Semantic analysis |
| Valid layout | Layout constraint solver |
| Signal consistency | Signal registry validation |
| Binding validity | Binding schema matching |

**If compilation succeeds, rendering cannot fail.**

---

## 18. Adapter Interface Contract

### 18.1 Core Interface

```typescript
interface LiquidAdapter<RenderOutput> {
  // Render complete schema
  render(schema: LiquidSchema, data: any): RenderOutput;

  // Render single block
  renderBlock(block: Block, data: any): RenderOutput;

  // Check if block type is supported
  supports(blockType: BlockType): boolean;

  // Render unsupported block as placeholder
  renderPlaceholder(block: Block, reason: string): RenderOutput;

  // Create signal runtime
  createSignalRuntime(registry: SignalRegistry): SignalRuntime;

  // Metadata
  readonly metadata: AdapterMetadata;
}
```

### 18.2 Adapter Metadata

```typescript
interface AdapterMetadata {
  name: string;                      // "react", "react-native", "qt"
  version: string;                   // Semver
  platform: string;                  // "web", "mobile", "desktop"
  supportedSchemaVersions: string[]; // ["1.x", "2.x"]
  supportedBlockTypes: BlockType[];  // What blocks this adapter renders
  supportsSignals: boolean;          // Whether signals work
  supportsStreaming: boolean;        // Whether progressive render works
  supportsLayout: boolean;           // Whether layout resolution works (§11)
  breakpointThresholds?: BreakpointThresholds;  // Custom breakpoint values
}
```

### 18.3 Signal Runtime Interface

```typescript
interface SignalRuntime {
  get(signalName: string): any;
  set(signalName: string, value: any): void;
  subscribe(signalName: string, callback: (value: any) => void): () => void;
  persist(): void;
  restore(): void;
}
```

### 18.4 Conformance Testing

Adapters must pass conformance tests:

```typescript
interface ConformanceTest {
  name: string;
  schema: LiquidSchema;
  data: any;
  expectations: Expectation[];
}

// Example expectations
- "Block count matches schema"
- "All bindings resolve to data"
- "Signals propagate within 100ms"
- "Placeholder shown for unsupported blocks"
```

---

## 19. Error Handling & Degradation

### 19.1 Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| Parse error | Invalid LiquidCode syntax | Reject with clear message |
| Validation error | Missing required binding | Reject with field location |
| Resolution error | Unknown block type | Placeholder + warning |
| Binding error | Field not in data | Placeholder + warning |
| Signal error | Transform failure | Use default value |
| Render error | Adapter crash | Fallback template |

### 19.2 Graceful Degradation

```
Level 1: Perfect render (everything works)
Level 2: Partial render (some blocks as placeholders)
Level 3: Fallback template (safe default layout)
Level 4: Host crash (NEVER acceptable - see B.3.1)
```

### 19.3 Never-Broken Guarantee

**Claim:** Any valid LiquidSchema renders successfully.

**Mechanism:**
1. Compilation validates all references
2. Unknown block types render as placeholders
3. Missing data shows "No data" state
4. Signal failures fall back to defaults

**Result:** 100% render success rate for validated schemas.

---

## 20. Versioning & Migration

### 20.1 Schema Versioning

```typescript
interface LiquidSchema {
  version: "2.0";  // Schema version
  // ...
}
```

### 20.2 Version Compatibility

| Schema Version | Engine Version | Compatibility |
|----------------|----------------|---------------|
| 1.x | 2.x | Read-only (migration available) |
| 2.x | 2.x | Full support |
| 3.x | 2.x | Forward-compatible fields ignored |

### 20.3 Migration Path

```typescript
interface Migration {
  from: string;    // "1.0"
  to: string;      // "2.0"
  migrate(schema: OldSchema): NewSchema;
}
```

### 20.4 Adapter Version Matching

Adapters declare supported schema versions:

```typescript
metadata.supportedSchemaVersions = ["2.x"];
```

Engine selects compatible adapter or provides migration.

---

## Appendix A: Quick Reference

### A.1 LiquidCode Cheat Sheet

```
GENERATION:
#archetype;layout;blocks
#overview;G2x2;K$rev,K$ord,L$date$amt,T

SIGNALS:
§name:type=default,persist
§dateRange:dr=30d,url

EMIT/RECEIVE:
>@signalName:trigger
<@signalName→target

MUTATIONS:
Δ+block@position    Add
Δ-@address          Remove
Δ@old→new           Replace
Δ~@addr.prop:val    Modify
Δ↑@addr→pos         Move

ADDRESSING:
@0, @1              Ordinal
@K0, @L1            Type ordinal
@[0,1]              Grid position
@:fieldName         Binding signature
@#explicitId        Explicit ID
@K*, @[*,0]         Wildcards

LAYOUT:
!hero, !1, !2, !3   Priority (1=hero, 4=detail)
^fixed, ^shrink     Flexibility
^grow, ^collapse
*full, *2           Span (columns)
[a b c]=group       Relationship grouping
[a b]=compare
[a -> b]=detail

RESPONSIVE:
@compact:block...   Breakpoint override
@standard:block...
@expanded:block...

QUERY:
?@address           Get block
?summary            Get schema summary
```

### A.2 Block Type Reference

| Code | Type | Category | Required Bindings |
|------|------|----------|-------------------|
| K | kpi | Atomic | value |
| B | bar-chart | Atomic | category, value |
| L | line-chart | Atomic | x, y |
| P | pie-chart | Atomic | label, value |
| T | data-table | Atomic | data, columns |
| G | grid | Layout | (slots only) |
| S | stack | Layout | (slots only) |
| X | text | Atomic | content |
| M | metric-group | Composite | metrics[] |
| C | comparison | Atomic | current, previous |
| DF | date-filter | Interactive | (signals only) |
| SF | select-filter | Interactive | options |
| SI | search-input | Interactive | (signals only) |

### A.3 Signal Type Reference

| Type | Value Shape | Common Use |
|------|-------------|------------|
| dateRange | {start, end} | Time filtering |
| selection | string[] | Multi-select |
| filter | Record | General filter |
| search | string | Text search |
| pagination | {page, size} | Paging |
| sort | {field, dir} | Sorting |
| toggle | boolean | On/off state |
| custom | any | User-defined |

---

## Appendix B: Hardening Specification

This appendix addresses six critical failure modes identified in architecture review. These are **normative requirements** for production-grade implementations.

### B.1 Canonical ASCII Grammar (Tokenizer Reality)

**Problem:** Unicode operators (Δ, §, ↑, →) may tokenize poorly on common LLM tokenizers, inflating token counts 3-10x and breaking cost/latency assumptions.

**Solution:** Define a canonical ASCII grammar with Unicode as optional sugar.

#### B.1.1 ASCII Operator Mapping

| Unicode | ASCII | Meaning |
|---------|-------|---------|
| `Δ` | `D` or `delta:` | Mutation mode |
| `§` | `S` or `signal:` | Signal declaration |
| `→` | `->` | Replacement / flow |
| `↑` | `^` or `move:` | Move operation |

**Canonical form (ASCII):**
```liquidcode
# Generation (same)
#overview;G2x2;K$revenue,K$orders

# Signals (ASCII)
signal:dateRange:dr=30d,url

# Mutations (ASCII)
delta:+K$profit@[1,2]
delta:-@K1
delta:@P0->B
delta:move:@[0,0]->[1,1]

# Emit/Receive (same - already ASCII)
>@dateRange:onChange
<@dateRange->filter.date
```

**Unicode form (sugar):**
```liquidcode
§dateRange:dr=30d,url
Δ+K$profit@[1,2]
Δ↑@[0,0]→[1,1]
```

#### B.1.2 Grammar Normalization

Compilers MUST:
1. Accept both ASCII and Unicode forms
2. Normalize to ASCII for caching/hashing
3. Emit ASCII in LLM prompts (maximum compatibility)
4. Accept Unicode in human-authored contexts

**Normalization function:**
```typescript
function normalizeToASCII(code: string): string {
  return code
    .replace(/Δ/g, 'delta:')
    .replace(/§/g, 'signal:')
    .replace(/→/g, '->')
    .replace(/↑/g, 'move:');
}
```

#### B.1.3 Token Budget Validation

Before production, measure P50/P90/P99 tokens for:
- 10 representative dashboard generations
- 20 common mutations
- Compare ASCII vs Unicode on target LLM tokenizer

**Acceptance criteria:**
- P99 generation ≤ 60 tokens
- P99 mutation ≤ 15 tokens
- ASCII form within 10% of Unicode token count

---

### B.2 Stable Block Identity (UID System)

**Problem:** Position-based addresses (`@K0`, `@[0,1]`) drift under mutation. Insert a block and all subsequent addresses shift, causing edits to hit wrong targets.

**Solution:** Every block has a stable `uid`. Positional selectors resolve to uids at mutation time.

#### B.2.1 UID Requirements

```typescript
interface Block {
  uid: string;           // REQUIRED: stable unique identifier
  id?: string;           // OPTIONAL: user-assigned semantic name
  type: BlockType;
  // ... rest of block
}
```

**UID properties:**
- Generated at creation time (compile or mutation)
- Immutable for block lifetime
- Survives position changes, type changes, property modifications
- Format: `b_<random12>` (e.g., `b_a7f3c9e2b4d1`)

#### B.2.2 Address Resolution

All positional selectors resolve to uid sets at mutation time:

```typescript
interface AddressResolution {
  selector: string;           // Original: "@K0"
  resolvedUids: string[];     // ["b_a7f3c9e2b4d1"]
  ambiguous: boolean;         // True if multiple matches for singular selector
  timestamp: number;          // When resolved
}
```

**Resolution algorithm:**
```
1. Parse selector (e.g., @K0 = "first KPI")
2. Query current schema for matching blocks
3. Return uid(s) of matching block(s)
4. If ambiguous and operation expects singular:
   a. Return error with disambiguation options
   b. OR use deterministic tiebreaker (first in traversal order)
```

#### B.2.3 Mutation Targeting

Mutations operate on uids, not positions:

```typescript
interface MutationOperation {
  type: 'add' | 'remove' | 'replace' | 'modify' | 'move';
  targetUid: string;          // Resolved from selector
  originalSelector: string;   // For audit trail
  // ... operation-specific fields
}
```

**Critical invariant:** Once resolved, mutation targets uid. Schema structure can change between resolution and execution without affecting target.

#### B.2.4 Explicit ID Addressing

Users can assign semantic IDs for stable human-readable addresses:

```liquidcode
# Assign ID at creation
K$revenue#main_revenue

# Address by ID (stable)
delta:~@#main_revenue.label:"New Label"
```

IDs are:
- Optional (uid is always present)
- User-controlled (not auto-generated)
- Must be unique within schema
- Immutable once assigned

---

### B.3 Testable Render Guarantee

**Problem:** "100% valid schemas render successfully" is not verifiable without defining what "successfully" means and bounding adapter behavior.

**Solution:** Redefine guarantee as testable contract with explicit degradation levels.

#### B.3.1 Render Contract

> **Guarantee:** A LiquidSchema that passes validation MUST render to one of four defined outcomes without crashing the host runtime.

**Outcome levels:**

| Level | Name | Description | Acceptable? |
|-------|------|-------------|-------------|
| 1 | Perfect | All blocks render with full functionality | ✅ Required |
| 2 | Degraded | Some blocks render as placeholders | ✅ Acceptable |
| 3 | Fallback | Entire schema renders as fallback template | ✅ Acceptable |
| 4 | Error | Host runtime crashes or hangs | ❌ NEVER |

#### B.3.2 Adapter Conformance

Adapters MUST implement the full interface from §18.1. Minimum conformance requirements:

```typescript
interface LiquidAdapter<T> {
  // Full schema rendering (MUST)
  render(schema: LiquidSchema, data: any): T;

  // MUST NOT throw for any valid block type
  renderBlock(block: Block, data: any): T | Placeholder<T>;

  // MUST return valid placeholder for unknown types
  renderPlaceholder(block: Block, reason: string): Placeholder<T>;

  // MUST handle missing data gracefully
  renderEmptyState(block: Block): T;

  // Block type support (MUST)
  supports(blockType: BlockType): boolean;

  // Signal runtime (MUST if signals used)
  createSignalRuntime(registry: SignalRegistry): SignalRuntime;

  // MUST complete within timeout (default 5s per block)
  readonly renderTimeout: number;

  // Adapter identification (MUST)
  readonly metadata: AdapterMetadata;
}
```

#### B.3.3 Conformance Test Suite

Minimum tests for adapter certification:

```typescript
const conformanceTests = [
  // Block rendering
  'renders all 13 core block types',
  'renders placeholder for unknown block type',
  'renders empty state for null data',
  'renders empty state for mismatched data shape',

  // Error handling
  'does not throw on malformed binding',
  'does not throw on invalid signal reference',
  'completes within timeout for large data',
  'recovers from partial data fetch failure',

  // Degradation
  'shows placeholder with reason for unsupported features',
  'maintains layout when some blocks fail',
  'provides fallback for entire schema failure',

  // Signals
  'handles signal with no subscribers',
  'handles signal emit during render',
  'does not deadlock on circular signal reference',
];
```

---

### B.4 Safe Transform DSL

**Problem:** Free-form `transform: string` in bindings is a security risk (injection), determinism risk (cross-platform differences), and complexity risk (unbounded).

**Solution:** A tiny, total, sandboxed expression language.

#### B.4.1 LiquidExpr Specification

LiquidExpr is a pure, total, typed expression language for data transformation.

**Properties:**
- **Pure:** No side effects, no I/O
- **Total:** Always terminates, no exceptions
- **Typed:** Statically typed, errors at compile time
- **Sandboxed:** No access to external state

#### B.4.2 Grammar

```ebnf
expr        = literal | identifier | call | binary | conditional | access
literal     = NUMBER | STRING | BOOLEAN | NULL
identifier  = "$" NAME                    (* $fieldName *)
call        = NAME "(" [expr ("," expr)*] ")"
binary      = expr OPERATOR expr
conditional = expr "?" expr ":" expr
access      = expr "." NAME

OPERATOR    = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "&&" | "||"
```

#### B.4.3 Built-in Functions

| Category | Functions |
|----------|-----------|
| Math | `round(n)`, `floor(n)`, `ceil(n)`, `abs(n)`, `min(a,b)`, `max(a,b)` |
| String | `upper(s)`, `lower(s)`, `trim(s)`, `len(s)`, `substr(s,i,n)`, `concat(a,b)` |
| Date | `year(d)`, `month(d)`, `day(d)`, `format(d,fmt)`, `diff(d1,d2,unit)` |
| Format | `currency(n,sym)`, `percent(n)`, `number(n,dec)`, `date(d,fmt)` |
| Logic | `if(cond,then,else)`, `coalesce(a,b)`, `default(v,def)` |
| Aggregate | `sum(arr)`, `avg(arr)`, `count(arr)`, `first(arr)`, `last(arr)` |

#### B.4.4 Error Handling

LiquidExpr NEVER throws. Errors produce typed fallback values:

| Error | Fallback | Example |
|-------|----------|---------|
| Divide by zero | `null` | `10 / 0` → `null` |
| Missing field | `null` | `$missing` → `null` |
| Type mismatch | `null` | `upper(123)` → `null` |
| Null input | `null` | `round(null)` → `null` |

#### B.4.5 Examples

```typescript
// In binding specification
binding: {
  fields: [
    { target: 'value', field: 'revenue', transform: 'currency($revenue, "$")' },
    { target: 'label', field: 'name', transform: 'upper($name)' },
    { target: 'trend', field: 'change', transform: '$change >= 0 ? "up" : "down"' },
    { target: 'display', transform: 'concat($firstName, " ", $lastName)' },
  ]
}
```

#### B.4.6 Security Properties

- No `eval()` or dynamic code execution
- No access to `window`, `process`, or global state
- No network requests
- No file system access
- Execution time bounded (max 1000 operations)

---

### B.5 Coherence Gate (Reuse Validation)

**Problem:** Semantic/compositional reuse can return "plausible wrong" interfaces. Fast confident wrong UIs destroy user trust.

**Solution:** Coherence gate validates schema compatibility before accepting reuse.

#### B.5.1 Coherence Checks

Before accepting a cached/composed fragment:

```typescript
interface CoherenceCheck {
  binding: BindingCoherence;
  signal: SignalCoherence;
  layout: LayoutCoherence;
  data: DataCoherence;
}

interface CoherenceResult {
  pass: boolean;
  confidence: number;        // 0-1
  repairs: RepairSuggestion[];
  reason?: string;
}
```

#### B.5.2 Binding Coherence

Check that bindings can be satisfied:

```typescript
function checkBindingCoherence(
  fragment: CachedFragment,
  dataFingerprint: DataFingerprint
): CoherenceResult {
  const issues: string[] = [];

  for (const block of fragment.blocks) {
    for (const field of block.binding.fields) {
      // Check field exists
      if (!dataFingerprint.hasField(field.field)) {
        issues.push(`Missing field: ${field.field}`);
      }
      // Check type compatibility
      if (!isTypeCompatible(field, dataFingerprint.getField(field.field))) {
        issues.push(`Type mismatch: ${field.field}`);
      }
    }
  }

  return {
    pass: issues.length === 0,
    confidence: 1 - (issues.length * 0.2),
    repairs: issues.map(i => ({ type: 'micro-llm', scope: 'binding', issue: i })),
  };
}
```

#### B.5.3 Signal Coherence

Check that signals can flow:

```typescript
function checkSignalCoherence(fragment: CachedFragment): CoherenceResult {
  const declared = new Set(Object.keys(fragment.signals || {}));
  const emitted = new Set<string>();
  const received = new Set<string>();

  for (const block of fragment.blocks) {
    block.signals?.emits?.forEach(e => emitted.add(e.signal));
    block.signals?.receives?.forEach(r => received.add(r.signal));
  }

  // All received signals must be declared or emitted
  const orphans = [...received].filter(r => !declared.has(r) && !emitted.has(r));

  return {
    pass: orphans.length === 0,
    confidence: 1 - (orphans.length * 0.3),
    repairs: orphans.map(o => ({ type: 'add-signal', signal: o })),
  };
}
```

#### B.5.4 Coherence Thresholds

| Confidence | Action |
|------------|--------|
| ≥ 0.9 | Accept fragment directly |
| 0.7 - 0.9 | Accept with repairs (micro-LLM for bindings) |
| 0.5 - 0.7 | Escalate to composition tier |
| < 0.5 | Escalate to LLM tier |

#### B.5.5 Micro-LLM Repair

When coherence check fails with repairable issues:

```typescript
interface RepairContext {
  fragment: CachedFragment;
  issues: CoherenceIssue[];
  dataFingerprint: DataFingerprint;
}

// Micro-LLM prompt (scoped, ~10 tokens output)
const repairPrompt = `
Fix bindings for ${issues.length} blocks.
Data fields: ${dataFingerprint.fieldNames.join(', ')}
Issues: ${issues.map(i => i.description).join('; ')}
Output: field mappings only
`;
```

---

### B.6 Normative LiquidSchema Specification

**Problem:** Partial schema specification leads to implementation divergence, broken caching, and adapter incompatibilities.

**Solution:** Complete, normative schema with JSON Schema, TypeScript types, and canonical ordering.

#### B.6.1 Complete Type Definitions

```typescript
/**
 * LiquidSchema v2.0 - Normative Type Definitions
 * All implementations MUST conform to these types.
 */

interface LiquidSchema {
  // REQUIRED fields
  version: '2.0';
  scope: 'interface' | 'block';
  uid: string;                           // Schema-level UID
  title: string;
  generatedAt: string;                   // ISO 8601
  layout: LayoutBlock;
  blocks: Block[];

  // OPTIONAL fields
  id?: string;                           // User-assigned ID
  description?: string;
  signals?: SignalRegistry;
  slotContext?: SlotContext;
  signalInheritance?: SignalInheritance;
  explainability?: SchemaExplainability;
  metadata?: SchemaMetadata;
}

interface Block {
  // REQUIRED fields
  uid: string;                           // Stable unique identifier
  type: BlockType;

  // OPTIONAL fields
  id?: string;                           // User-assigned ID
  binding?: DataBinding;
  slots?: Record<string, Block[]>;
  signals?: SignalConnections;
  layout?: BlockLayout;
  constraints?: RenderConstraints;
}

type BlockType =
  | 'kpi' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'data-table'
  | 'grid' | 'stack' | 'text' | 'metric-group' | 'comparison'
  | 'date-filter' | 'select-filter' | 'search-input'
  | `custom:${string}`;                  // Extensible with prefix

interface DataBinding {
  source: string;
  fields: FieldBinding[];
  aggregate?: AggregateSpec;
  groupBy?: string[];
  filter?: FilterCondition[];
  sort?: SortSpec[];
  limit?: number;
}

type AggregateSpec = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'first' | 'last';

interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

type BindingSlot =
  | 'x' | 'y' | 'value' | 'label' | 'category'
  | 'series' | 'color' | 'stack' | 'trend' | 'icon'
  | 'compare' | 'current' | 'previous' | 'format'
  | 'data' | 'columns' | 'pageSize';

interface FieldBinding {
  target: BindingSlot;                   // Slot name (see §9.2)
  field: string;                         // Source field
  transform?: string;                    // LiquidExpr (see B.4)
}

interface SignalRegistry {
  [signalName: string]: SignalDefinition;
}

interface SignalDefinition {
  type: SignalType;
  default?: unknown;
  persist?: 'none' | 'url' | 'session' | 'local';
  validation?: string;                   // LiquidExpr returning boolean
}

type SignalType =
  | 'dateRange' | 'selection' | 'filter' | 'search'
  | 'pagination' | 'sort' | 'toggle' | 'custom';

interface SignalConnections {
  emits?: SignalEmission[];
  receives?: SignalReception[];
}

interface SignalEmission {
  signal: string;
  trigger: string;
  transform?: string;                    // LiquidExpr
}

interface SignalReception {
  signal: string;
  target: string;
  transform?: string;                    // LiquidExpr
}

interface BlockLayout {
  priority?: 1 | 2 | 3 | 4 | 'hero' | 'primary' | 'secondary' | 'detail';
  flex?: 'fixed' | 'shrink' | 'grow' | 'collapse';
  size?: SizeHints;
  span?: SpanSpec;
  relationship?: RelationshipSpec;
}

interface SizeHints {
  min?: SizeValue;
  ideal?: SizeValue;
  max?: SizeValue;
  aspect?: number;
}

type SizeValue = number | 'auto' | 'content' | `${number}%`;

interface SpanSpec {
  columns?: number | 'full' | 'half' | 'third' | 'quarter' | 'auto';
  rows?: number;
}

interface RelationshipSpec {
  type: 'group' | 'compare' | 'detail' | 'flow';
  with?: string[];
}

interface SlotContext {
  width: number;
  height: number | 'auto';
  breakpoint: Breakpoint;
  minBlockWidth?: number;
  orientation?: 'any' | 'portrait' | 'landscape';
  parentSignals?: SignalRegistry;
}

type Breakpoint = 'compact' | 'standard' | 'expanded';

interface BreakpointThresholds {
  compact: number;   // <600px default
  standard: number;  // <1200px default
  expanded: number;  // ≥1200px default
}

interface SignalInheritance {
  mode: 'inherit' | 'shadow' | 'bridge' | 'isolate';
  mappings?: Record<string, string>;
}

interface SchemaExplainability {
  source: 'cache' | 'semantic' | 'composition' | 'llm' | 'mutation';
  confidence: number;
  reasoning?: string;
  sourceFragments?: string[];
}

interface SchemaMetadata {
  createdBy?: string;
  modifiedAt?: string;
  operationCount: number;
  coherenceScore?: number;
}
```

#### B.6.2 Canonical Ordering

For deterministic hashing and caching, schema fields MUST be ordered:

```typescript
const FIELD_ORDER = {
  LiquidSchema: ['version', 'scope', 'uid', 'id', 'title', 'description',
                 'generatedAt', 'layout', 'blocks', 'signals', 'slotContext',
                 'signalInheritance', 'explainability', 'metadata'],
  Block: ['uid', 'id', 'type', 'binding', 'slots', 'signals', 'layout', 'constraints'],
  // ... etc
};

function canonicalize(schema: LiquidSchema): string {
  return JSON.stringify(schema, (key, value) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const order = FIELD_ORDER[key] || Object.keys(value).sort();
      return Object.fromEntries(order.map(k => [k, value[k]]).filter(([,v]) => v !== undefined));
    }
    return value;
  });
}
```

#### B.6.3 Validation Requirements

All schemas MUST pass Zod validation before render:

```typescript
import { z } from 'zod';

const BlockSchema = z.object({
  uid: z.string().regex(/^b_[a-z0-9]{12}$/),
  type: z.union([
    z.enum(['kpi', 'bar-chart', 'line-chart', /* ... */]),
    z.string().regex(/^custom:[a-z-]+$/),
  ]),
  id: z.string().optional(),
  // ... full schema
}).strict();  // No extra fields

const LiquidSchemaSchema = z.object({
  version: z.literal('2.0'),
  scope: z.enum(['interface', 'block']),
  uid: z.string().regex(/^s_[a-z0-9]{12}$/),
  // ... full schema
}).strict();

// Validation is REQUIRED before render
function validateSchema(schema: unknown): LiquidSchema {
  return LiquidSchemaSchema.parse(schema);  // Throws on invalid
}
```

#### B.6.4 JSON Schema (for external validation)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://liquidcode.dev/schema/v2.0/LiquidSchema.json",
  "title": "LiquidSchema",
  "type": "object",
  "required": ["version", "scope", "uid", "title", "generatedAt", "layout", "blocks"],
  "properties": {
    "version": { "const": "2.0" },
    "scope": { "enum": ["interface", "block"] },
    "uid": { "type": "string", "pattern": "^s_[a-z0-9]{12}$" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/Block" }
    }
  },
  "additionalProperties": false,
  "definitions": {
    "Block": {
      "type": "object",
      "required": ["uid", "type"],
      "properties": {
        "uid": { "type": "string", "pattern": "^b_[a-z0-9]{12}$" }
      },
      "additionalProperties": false
    }
  }
}
```

---

### B.7 Hardening Checklist

Before production deployment, verify:

- [ ] ASCII grammar produces equivalent results to Unicode
- [ ] P99 token count ≤ 60 for generation, ≤ 15 for mutation
- [ ] All blocks have stable UIDs that survive mutations
- [ ] Positional selectors resolve to UIDs before operation
- [ ] All adapters pass conformance test suite
- [ ] No adapter throws on any valid schema
- [ ] All transforms use LiquidExpr (no free-form code)
- [ ] Coherence gate rejects incoherent fragments
- [ ] Micro-LLM repairs are scoped and budgeted
- [ ] Schema validation uses complete Zod schema
- [ ] Canonical ordering produces deterministic hashes
- [ ] Error messages include resolution path and suggestions

---

*End of LiquidCode Specification v2.0*
