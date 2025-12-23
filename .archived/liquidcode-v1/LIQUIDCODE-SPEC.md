# LiquidCode Specification

**Version:** 1.0.0
**Status:** Draft
**Authors:** Agutierrez
**Date:** 2025-12-21

---

## Abstract

LiquidCode is a token-minimal encoding standard for LLM-orchestrated interface generation. It enables parallel compilation of complex structured outputs through hierarchical decomposition, reducing latency by an order of magnitude while improving reliability through constrained decision spaces.

**Core purpose:** Minimize LLM output tokens while maximizing parallel execution for real-time interface generation.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Principles](#2-core-principles)
3. [Architecture](#3-architecture)
4. [Layer System](#4-layer-system)
5. [Grammar Specification](#5-grammar-specification)
6. [Domain Adapters](#6-domain-adapters)
7. [Component Taxonomy](#7-component-taxonomy)
8. [Extensibility API](#8-extensibility-api)
9. [Compilation Model](#9-compilation-model)
10. [Reference Implementation](#10-reference-implementation)
11. [Conformance](#11-conformance)
12. [Semantic Caching Extension](#12-semantic-caching-extension)
13. [Context-Driven Precomputation](#13-context-driven-precomputation)
14. [Request Scope and Signal System](#14-request-scope-and-signal-system)

---

## 1. Introduction

### 1.1 Problem Statement

Large Language Models generate tokens sequentially. Complex structured outputs (JSON, code, markup) require thousands of tokens, each representing an error opportunity. Generation time scales linearly with output complexity.

Traditional approaches:
- **Full generation:** LLM outputs complete structured document (~4,000 tokens, ~3-5 seconds)
- **Template filling:** LLM fills predefined slots (limited flexibility)
- **Code generation:** LLM writes executable code (unreliable, security risks)

LiquidCode introduces a fourth approach: **hierarchical decision compilation**.

### 1.2 Solution Overview

LiquidCode decomposes interface generation into hierarchical layers. Each layer:
- Receives constrained input from the previous layer
- Outputs minimal decision tokens
- Enables parallel execution of independent branches
- Compiles deterministically to the target format

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIQUIDCODE EXECUTION MODEL                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRADITIONAL          LIQUIDCODE                                │
│  ────────────         ──────────                                │
│                                                                 │
│  Context ─────────▶ LLM ─────────▶ Full Output                 │
│           4000 tok      3-5 sec                                 │
│                                                                 │
│  Context ─▶ L0 ─┬─▶ L1a ─┬─▶ L2a ─▶ Compile ─▶ Output         │
│            5tok │   10tok│   15tok    instant                   │
│                 ├─▶ L1b ─┼─▶ L2b                               │
│                 │        │                                      │
│                 └─▶ L1c ─┴─▶ L2c                               │
│                                                                 │
│           Total: 60 tokens, 100-150ms (parallel)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Scope

This specification defines:
- The LiquidCode grammar and encoding rules
- The layer system and execution model
- The extensibility API for domain adaptation
- The component taxonomy structure
- Conformance requirements for implementations

This specification does not define:
- Specific domain vocabularies (see Domain Adapters)
- LLM prompting strategies (implementation-specific)
- Target output formats (defined by adapters)

---

## 2. Core Principles

### 2.1 Token Alignment

LiquidCode encodings MUST align with LLM tokenization patterns.

**Preferred tokens:**
- Single punctuation: `$ # @ ^ _ ! | : + , .`
- Single letters: `A-Z a-z`
- Common words: field names, type names
- Small integers: `0-9`, `10-99`

**Avoided patterns:**
- Random strings (tokenize character-by-character)
- Camel/snake case breaks (split unexpectedly)
- Base64/binary (no training signal)

**Validation:** An encoding is token-aligned if the token count is within 1.5x of the character count divided by 4.

### 2.2 Hierarchical Constraint Propagation

Each layer MUST constrain the decision space for subsequent layers.

```
L0: 6 possible archetypes
    │
    ▼ (selected: overview)
L1: ~50 valid configurations for "overview"
    │
    ▼ (selected: 4 KPIs, 2 charts)
L2: ~20 valid bindings per component
```

**Invariant:** Decision space at layer N+1 ≤ Decision space at layer N.

### 2.3 Parallel Independence

Sibling branches at the same layer MUST be independently resolvable.

```
L0: Structure
    │
    ├── L1[zone_a] ◄── No dependency on L1[zone_b]
    ├── L1[zone_b] ◄── No dependency on L1[zone_a]
    └── L1[zone_c] ◄── No dependency on L1[zone_a,b]
```

**Invariant:** L1[i] depends only on L0, never on L1[j] where i ≠ j.

### 2.4 Deterministic Compilation

Given identical layer outputs and context, compilation MUST produce identical results.

```
compile(L0, L1, L2, context) === compile(L0, L1, L2, context)  // Always true
```

**Invariant:** Compilers are pure functions with no side effects or randomness.

### 2.5 Graceful Degradation

Every layer MUST have a valid default. Partial resolution MUST produce valid output.

```
L0: resolved    → Use L0
L1: failed      → Use default(L1, L0)
L2: skipped     → Use default(L2, L1)

Result: Valid output (potentially less optimized)
```

**Invariant:** No layer failure causes complete system failure.

---

## 3. Architecture

### 3.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIQUIDCODE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Context   │────▶│   Router    │────▶│  Resolver   │       │
│  │  Provider   │     │             │     │   (LLM)     │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                  │                    │               │
│         │                  │                    ▼               │
│         │                  │           ┌─────────────┐          │
│         │                  │           │   Decoder   │          │
│         │                  │           │             │          │
│         │                  │           └─────────────┘          │
│         │                  │                    │               │
│         │                  ▼                    ▼               │
│         │           ┌─────────────┐     ┌─────────────┐        │
│         │           │    Cache    │◄───▶│  Compiler   │        │
│         │           │             │     │             │        │
│         │           └─────────────┘     └─────────────┘        │
│         │                                      │                │
│         ▼                                      ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Domain Adapter                        │   │
│  │  (Defines vocabulary, components, compilation targets)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────┐                             │
│                    │   Output    │                             │
│                    │  (Schema/   │                             │
│                    │   Code/UI)  │                             │
│                    └─────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Context Provider** | Supplies domain context, data fingerprints, user intent |
| **Router** | Determines execution path, layer dependencies, parallelization |
| **Resolver** | Invokes LLM with layer-specific prompts, handles retries |
| **Decoder** | Parses LiquidCode tokens into structured decisions |
| **Cache** | Stores layer results keyed by context hash |
| **Compiler** | Transforms decoded decisions into target output |
| **Domain Adapter** | Defines domain-specific vocabulary, components, targets |

### 3.3 Execution Flow

```
1. Context Provider emits fingerprint + intent
2. Router checks Cache for each layer
3. For cache misses:
   a. Resolver invokes LLM with layer prompt
   b. Decoder parses LiquidCode response
   c. Cache stores result
4. When all layers resolved:
   a. Compiler assembles target output
   b. Output returned to caller
```

---

## 4. Layer System

### 4.1 Standard Layers

LiquidCode defines three standard layers. Domain Adapters MAY define additional layers.

| Layer | Name | Purpose | Token Budget |
|-------|------|---------|--------------|
| L0 | Structure | High-level organization, archetypes | 1-10 |
| L1 | Content | Component types and primary bindings | 10-30 |
| L2 | Polish | Formatting, styling, refinements | 10-25 |

**Total budget:** 21-65 tokens per complete resolution.

### 4.2 Layer Dependencies

```
L0 ──────────────────────────────────▶ Required
 │
 ├──▶ L1[zone_0] ────▶ L2[zone_0] ──▶ Optional
 ├──▶ L1[zone_1] ────▶ L2[zone_1] ──▶ Optional
 └──▶ L1[zone_n] ────▶ L2[zone_n] ──▶ Optional
```

**Rules:**
- L0 is always required and executed first
- L1 branches execute in parallel after L0
- L2 branches execute in parallel after their L1 parent
- L2 is optional; defaults applied if skipped

### 4.3 Layer Resolution Protocol

Each layer resolution follows this protocol:

```
INPUT:  context, parent_result, layer_spec
OUTPUT: layer_result | error

1. Build prompt from context + parent_result + layer_spec.vocabulary
2. Check cache for hash(prompt)
3. If cache hit: return cached result
4. Invoke LLM with prompt
5. Decode response using layer_spec.grammar
6. Validate decoded result against layer_spec.constraints
7. If invalid:
   a. If retries < max_retries: goto 4 with error context
   b. Else: return default(layer_spec, parent_result)
8. Cache result
9. Return result
```

### 4.4 Layer Specification Format

```typescript
interface LayerSpec {
  id: string;                    // e.g., "L0", "L1", "L2"
  name: string;                  // Human-readable name
  parent: string | null;         // Parent layer ID (null for L0)
  vocabulary: Vocabulary;        // Valid tokens for this layer
  grammar: Grammar;              // Parsing rules
  constraints: Constraint[];     // Validation rules
  defaults: DefaultResolver;     // Fallback logic
  parallelizable: boolean;       // Can run parallel with siblings
}
```

---

## 5. Grammar Specification

### 5.1 Core Grammar (EBNF)

```ebnf
(* Top-level structure *)
liquidcode     = layer_0 [ ":" layer_1 ] [ "|" layer_2 ] ;

(* Layer 0: Structure *)
layer_0        = archetype [ ":" zone_counts ] ;
archetype      = LETTER ;
zone_counts    = INTEGER { "-" INTEGER } ;

(* Layer 1: Content *)
layer_1        = zone_spec { "|" zone_spec } ;
zone_spec      = component_spec { "," component_spec } ;
component_spec = type_prefix field [ modifiers ] ;
type_prefix    = SYMBOL ;
field          = IDENTIFIER | QUOTED_STRING ;
modifiers      = { MODIFIER } ;

(* Layer 2: Polish *)
layer_2        = refinement { "|" refinement } ;
refinement     = component_ref ":" style_spec ;
component_ref  = INTEGER | IDENTIFIER ;
style_spec     = { STYLE_TOKEN } ;

(* Terminals *)
LETTER         = "A" | "B" | ... | "Z" ;
SYMBOL         = "$" | "#" | "@" | "^" | "_" | "!" | "%" ;
MODIFIER       = "+" | "-" | "~" | ":" | "." ;
INTEGER        = DIGIT { DIGIT } ;
DIGIT          = "0" | "1" | ... | "9" ;
IDENTIFIER     = ALPHA { ALPHA | DIGIT | "_" } ;
QUOTED_STRING  = "'" { ANY } "'" ;
STYLE_TOKEN    = SYMBOL | LETTER | INTEGER ;
```

### 5.2 Token Categories

#### 5.2.1 Type Prefixes

Type prefixes indicate component or operation types.

| Symbol | Category | Example Usage |
|--------|----------|---------------|
| `$` | Aggregation: Sum | `$revenue` = sum of revenue |
| `#` | Aggregation: Count | `#orders` = count of orders |
| `@` | Aggregation: Average | `@price` = average price |
| `^` | Aggregation: Maximum | `^value` = maximum value |
| `_` | Aggregation: Minimum | `_value` = minimum value |
| `!` | Aggregation: Distinct | `!customers` = distinct count |
| `%` | Aggregation: Percentage | `%conversion` = percentage |

#### 5.2.2 Component Types

Single letters denote component types. Domain Adapters define mappings.

| Letter | Common Mapping | Notes |
|--------|----------------|-------|
| `K` | KPI/Metric Card | Single value display |
| `B` | Bar Chart | Categorical comparison |
| `L` | Line Chart | Time series |
| `P` | Pie Chart | Part-to-whole |
| `A` | Area Chart | Stacked time series |
| `S` | Scatter Plot | Correlation |
| `T` | Table | Tabular data |
| `X` | Text Block | Static content |
| `G` | Grid/Container | Layout container |
| `M` | Map | Geographic |
| `F` | Form | Input collection |

#### 5.2.3 Modifiers

Modifiers refine component behavior.

| Modifier | Meaning | Example |
|----------|---------|---------|
| `+` | Positive trend / ascending | `$revenue+` = up is good |
| `-` | Negative trend / descending | `$costs-` = down is good |
| `~` | Neutral / no trend | `$value~` = no judgment |
| `:` | Binding separator | `Bx:cat y:rev` = bar with bindings |
| `.` | Property accessor | `revenue.format:$` = currency format |

#### 5.2.4 Separators

| Separator | Purpose |
|-----------|---------|
| `:` | Layer/section delimiter |
| `|` | Zone/group delimiter |
| `,` | Item delimiter within zone |
| ` ` | Binding key-value separator |

### 5.3 Encoding Examples

#### Simple Dashboard
```
O:4-2-1:$revenue,#orders,@aov,%conv|Bx:region y:revenue,Lx:date y:revenue|date,region,revenue,orders n100
```

Decodes to:
- Archetype: Overview
- Zones: 4 KPIs, 2 charts, 1 table
- KPIs: sum(revenue), count(orders), avg(aov), percent(conv)
- Charts: bar(region→revenue), line(date→revenue)
- Table: date, region, revenue, orders; limit 100

#### Minimal Form
```
O:4-1-1
```

Decodes to:
- Archetype: Overview
- Zones: 4 items, 1 item, 1 item
- All components: use defaults based on data fingerprint

### 5.4 Escape Sequences

For field names containing reserved characters:

| Escape | Meaning |
|--------|---------|
| `'...'` | Quoted literal (spaces, symbols allowed) |
| `\:` | Literal colon |
| `\|` | Literal pipe |
| `\\` | Literal backslash |

Example: `$'Revenue ($)'` = sum of field "Revenue ($)"

---

## 6. Domain Adapters

### 6.1 Adapter Structure

Domain Adapters customize LiquidCode for specific output domains.

```typescript
interface DomainAdapter {
  // Metadata
  id: string;                      // e.g., "dashboard", "form", "document"
  version: string;                 // Semver
  name: string;                    // Human-readable

  // Vocabulary
  archetypes: ArchetypeMap;        // L0 archetype definitions
  componentTypes: ComponentMap;    // Component type definitions
  aggregations: AggregationMap;    // Type prefix meanings
  modifiers: ModifierMap;          // Modifier meanings

  // Layers
  layers: LayerSpec[];             // Layer definitions (min: L0, L1, L2)

  // Compilation
  compiler: CompilerSpec;          // How to produce output
  targetSchema: JSONSchema;        // Output format schema

  // Extensibility
  extensions: ExtensionPoint[];    // Custom extension points
}
```

### 6.2 Standard Adapters

#### 6.2.1 Dashboard Adapter

**ID:** `liquidcode:dashboard:v1`

```typescript
const DashboardAdapter: DomainAdapter = {
  id: "liquidcode:dashboard:v1",
  version: "1.0.0",
  name: "Dashboard Generation",

  archetypes: {
    "O": { name: "overview", zones: ["kpis", "charts", "table"] },
    "T": { name: "timeseries", zones: ["kpis", "timeline", "sparklines"] },
    "C": { name: "comparison", zones: ["kpis", "bars", "breakdown"] },
    "K": { name: "breakdown", zones: ["hero", "distribution", "detail"] },
    "D": { name: "detail", zones: ["summary", "table", "filters"] },
    "M": { name: "minimal", zones: ["kpis", "table"] },
  },

  componentTypes: {
    "K": { type: "kpi-card", props: ["value", "label", "trend"] },
    "B": { type: "bar-chart", props: ["x", "y", "group"] },
    "L": { type: "line-chart", props: ["x", "y", "series"] },
    "P": { type: "pie-chart", props: ["value", "label"] },
    "T": { type: "data-table", props: ["columns", "sort", "limit"] },
    // ...
  },

  // ...
};
```

#### 6.2.2 Form Adapter

**ID:** `liquidcode:form:v1`

```typescript
const FormAdapter: DomainAdapter = {
  id: "liquidcode:form:v1",
  version: "1.0.0",
  name: "Form Generation",

  archetypes: {
    "S": { name: "single-page", zones: ["fields", "actions"] },
    "M": { name: "multi-step", zones: ["steps", "navigation"] },
    "W": { name: "wizard", zones: ["progress", "content", "nav"] },
  },

  componentTypes: {
    "T": { type: "text-input", props: ["label", "validation"] },
    "N": { type: "number-input", props: ["label", "min", "max"] },
    "S": { type: "select", props: ["label", "options"] },
    "C": { type: "checkbox", props: ["label"] },
    "R": { type: "radio-group", props: ["label", "options"] },
    "D": { type: "date-picker", props: ["label", "format"] },
    "F": { type: "file-upload", props: ["label", "accept"] },
    // ...
  },

  // ...
};
```

#### 6.2.3 Document Adapter

**ID:** `liquidcode:document:v1`

For generating structured documents, reports, or content.

### 6.3 Custom Adapters

Organizations can create custom adapters for proprietary domains:

```typescript
const CustomAdapter: DomainAdapter = {
  id: "mycompany:trading-dashboard:v1",
  extends: "liquidcode:dashboard:v1",  // Inherit from standard

  // Override or extend
  archetypes: {
    ...DashboardAdapter.archetypes,
    "P": { name: "portfolio", zones: ["positions", "performance", "risk"] },
  },

  componentTypes: {
    ...DashboardAdapter.componentTypes,
    "Q": { type: "quote-ticker", props: ["symbol", "fields"] },
    "H": { type: "heatmap", props: ["x", "y", "value", "color"] },
  },
};
```

---

## 7. Component Taxonomy

### 7.1 Taxonomy Structure

Components are organized in a hierarchical taxonomy enabling:
- Inheritance of properties
- Fallback resolution
- Progressive capability discovery

```
Component
├── Display
│   ├── Metric
│   │   ├── KPI Card
│   │   ├── Gauge
│   │   └── Sparkline
│   ├── Chart
│   │   ├── Categorical
│   │   │   ├── Bar
│   │   │   ├── Pie
│   │   │   └── Treemap
│   │   ├── Temporal
│   │   │   ├── Line
│   │   │   ├── Area
│   │   │   └── Candlestick
│   │   └── Relational
│   │       ├── Scatter
│   │       ├── Bubble
│   │       └── Network
│   ├── Table
│   │   ├── Data Table
│   │   ├── Pivot Table
│   │   └── Matrix
│   └── Text
│       ├── Heading
│       ├── Paragraph
│       └── Callout
├── Input
│   ├── Text
│   │   ├── Single Line
│   │   ├── Multi Line
│   │   └── Rich Text
│   ├── Selection
│   │   ├── Dropdown
│   │   ├── Radio
│   │   ├── Checkbox
│   │   └── Toggle
│   ├── Numeric
│   │   ├── Number
│   │   ├── Slider
│   │   └── Rating
│   └── Temporal
│       ├── Date
│       ├── Time
│       └── DateTime
├── Layout
│   ├── Container
│   │   ├── Grid
│   │   ├── Stack
│   │   └── Card
│   ├── Navigation
│   │   ├── Tabs
│   │   ├── Accordion
│   │   └── Stepper
│   └── Separator
│       ├── Divider
│       └── Spacer
└── Action
    ├── Button
    ├── Link
    └── Menu
```

### 7.2 Taxonomy Resolution

When a component type is referenced, the resolver walks up the taxonomy to find implementations:

```
Request: "Candlestick" chart
Adapter has: No Candlestick

Resolution:
1. Check: Candlestick → Not found
2. Check: Temporal (parent) → Found: Line chart
3. Return: Line chart as fallback

Result: Line chart rendered instead of Candlestick
Metadata: { requested: "Candlestick", resolved: "Line", fallback: true }
```

### 7.3 Registering Components

```typescript
interface ComponentRegistration {
  id: string;                    // Unique identifier
  taxonomy: string[];            // Path in taxonomy tree
  symbol: string;                // LiquidCode symbol (1 char)
  props: PropDefinition[];       // Required/optional properties
  bindings: BindingSpec[];       // Data binding specifications
  render: RenderSpec;            // How to render (adapter-specific)
  fallback?: string;             // Fallback component ID
}

// Registration
adapter.registerComponent({
  id: "heatmap",
  taxonomy: ["Display", "Chart", "Relational"],
  symbol: "H",
  props: [
    { name: "x", required: true },
    { name: "y", required: true },
    { name: "value", required: true },
    { name: "colorScale", required: false, default: "viridis" },
  ],
  bindings: [
    { name: "x", type: "field", accepts: ["categorical", "temporal"] },
    { name: "y", type: "field", accepts: ["categorical"] },
    { name: "value", type: "field", accepts: ["numeric"] },
  ],
  render: { component: "HeatmapChart", package: "@mycompany/charts" },
  fallback: "data-table",  // If heatmap unavailable, show table
});
```

---

## 8. Extensibility API

### 8.1 Extension Points

LiquidCode provides extension points for customization:

```typescript
interface ExtensionPoints {
  // Layer extensions
  "layer:before": (layer: LayerSpec, context: Context) => Context;
  "layer:after": (layer: LayerSpec, result: LayerResult) => LayerResult;

  // Resolution extensions
  "resolve:prompt": (prompt: string, layer: LayerSpec) => string;
  "resolve:parse": (raw: string, grammar: Grammar) => ParseResult;
  "resolve:validate": (result: any, constraints: Constraint[]) => ValidationResult;

  // Compilation extensions
  "compile:before": (layers: LayerResult[], context: Context) => void;
  "compile:component": (component: Component, context: Context) => CompiledComponent;
  "compile:after": (output: Output) => Output;

  // Cache extensions
  "cache:key": (context: Context, layer: LayerSpec) => string;
  "cache:get": (key: string) => CacheResult | null;
  "cache:set": (key: string, value: any, ttl: number) => void;
}
```

### 8.2 Plugin System

```typescript
interface LiquidCodePlugin {
  id: string;
  version: string;
  hooks: Partial<ExtensionPoints>;
}

// Example: Analytics plugin
const AnalyticsPlugin: LiquidCodePlugin = {
  id: "analytics",
  version: "1.0.0",
  hooks: {
    "layer:after": (layer, result) => {
      analytics.track("layer_resolved", {
        layer: layer.id,
        tokens: result.tokenCount,
        cached: result.cached,
        duration: result.durationMs,
      });
      return result;
    },
    "compile:after": (output) => {
      analytics.track("compilation_complete", {
        componentCount: output.components.length,
        duration: output.compilationMs,
      });
      return output;
    },
  },
};

// Registration
liquidcode.use(AnalyticsPlugin);
```

### 8.3 Adapter Inheritance

Adapters can extend other adapters:

```typescript
const ExtendedDashboard = createAdapter({
  extends: "liquidcode:dashboard:v1",

  // Add new archetypes
  archetypes: {
    "R": { name: "realtime", zones: ["live", "history", "alerts"] },
  },

  // Add new components
  components: [
    { id: "live-ticker", symbol: "V", ... },
    { id: "alert-panel", symbol: "!", ... },
  ],

  // Override compilation for specific components
  compilerOverrides: {
    "kpi-card": (component, context) => {
      // Custom KPI rendering with animations
      return { ...defaultCompile(component), animated: true };
    },
  },
});
```

### 8.4 Schema Registry

For enterprise deployments, a schema registry enables:
- Version management of adapters
- Centralized component definitions
- Cross-team component sharing

```typescript
interface SchemaRegistry {
  // Adapter management
  registerAdapter(adapter: DomainAdapter): void;
  getAdapter(id: string, version?: string): DomainAdapter;
  listAdapters(): AdapterInfo[];

  // Component management
  registerComponent(adapterId: string, component: ComponentRegistration): void;
  getComponent(adapterId: string, symbol: string): ComponentRegistration;

  // Validation
  validateLiquidCode(code: string, adapterId: string): ValidationResult;
}
```

---

## 9. Compilation Model

### 9.1 Compilation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPILATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer Results ──▶ Merge ──▶ Resolve ──▶ Transform ──▶ Output  │
│                                                                 │
│  ┌─────────┐                                                    │
│  │   L0    │──┐                                                 │
│  └─────────┘  │    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  ┌─────────┐  ├───▶│  Merge  │───▶│ Resolve │───▶│Transform│  │
│  │   L1[]  │──┤    │ Results │    │ Bindings│    │ to      │  │
│  └─────────┘  │    └─────────┘    └─────────┘    │ Target  │  │
│  ┌─────────┐  │                                   └─────────┘  │
│  │   L2[]  │──┘                                        │        │
│  └─────────┘                                           ▼        │
│                                                  ┌─────────┐    │
│                                                  │ Output  │    │
│                                                  │ (JSON/  │    │
│                                                  │  Code)  │    │
│                                                  └─────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Merge Phase

Combines layer results into unified component tree:

```typescript
function merge(l0: L0Result, l1: L1Result[], l2: L2Result[]): MergedTree {
  const tree = {
    archetype: l0.archetype,
    zones: l0.zones.map((zone, i) => ({
      id: zone.id,
      components: l1[i].components.map((comp, j) => ({
        ...comp,
        refinements: l2[i]?.refinements[j] ?? {},
      })),
    })),
  };
  return tree;
}
```

### 9.3 Resolve Phase

Resolves component references and data bindings:

```typescript
function resolve(tree: MergedTree, context: Context): ResolvedTree {
  return {
    ...tree,
    zones: tree.zones.map(zone => ({
      ...zone,
      components: zone.components.map(comp => ({
        ...comp,
        resolvedBindings: resolveBindings(comp.bindings, context.data),
        resolvedComponent: resolveComponent(comp.type, context.adapter),
      })),
    })),
  };
}
```

### 9.4 Transform Phase

Transforms resolved tree to target format:

```typescript
function transform(tree: ResolvedTree, adapter: DomainAdapter): Output {
  return adapter.compiler.compile(tree);
}

// Example: Dashboard adapter transform
function compileDashboard(tree: ResolvedTree): DashboardSchema {
  return {
    version: "1.0",
    id: generateId(),
    layout: buildLayout(tree.archetype, tree.zones),
    blocks: tree.zones.flatMap(zone =>
      zone.components.map(comp => buildBlock(comp))
    ),
  };
}
```

### 9.5 Incremental Compilation

For progressive rendering, compilation can be incremental:

```typescript
interface IncrementalCompiler {
  // Compile as layers complete
  onLayerComplete(layer: LayerResult): PartialOutput;

  // Get current state
  getPartialOutput(): PartialOutput;

  // Finalize when all layers complete
  finalize(): Output;
}

// Usage
const compiler = createIncrementalCompiler(adapter);

l0.then(result => {
  render(compiler.onLayerComplete(result));  // Render skeleton
});

l1.forEach(result => {
  render(compiler.onLayerComplete(result));  // Render each zone
});

l2.forEach(result => {
  render(compiler.onLayerComplete(result));  // Apply polish
});

const final = compiler.finalize();
```

---

## 10. Reference Implementation

### 10.1 TypeScript Reference

```typescript
// Core types
interface LiquidCodeRuntime {
  // Configuration
  configure(options: RuntimeOptions): void;

  // Adapter management
  registerAdapter(adapter: DomainAdapter): void;
  getAdapter(id: string): DomainAdapter;

  // Execution
  execute(input: ExecutionInput): Promise<ExecutionOutput>;
  executeStreaming(input: ExecutionInput): AsyncGenerator<PartialOutput>;

  // Utilities
  parse(code: string, adapterId: string): ParseResult;
  validate(code: string, adapterId: string): ValidationResult;
  compile(layers: LayerResult[], adapterId: string): Output;
}

// Execution input
interface ExecutionInput {
  adapterId: string;
  context: Context;
  options?: ExecutionOptions;
}

// Context
interface Context {
  fingerprint: DataFingerprint;    // Data characteristics
  intent?: string;                  // User prompt/intent
  data?: any;                       // Actual data for binding
  constraints?: Constraint[];       // Execution constraints
}

// Execution options
interface ExecutionOptions {
  layers?: ("L0" | "L1" | "L2")[];  // Which layers to execute (default: all)
  parallel?: boolean;                // Enable parallel execution (default: true)
  cache?: boolean;                   // Enable caching (default: true)
  timeout?: number;                  // Timeout in ms (default: 5000)
  retries?: number;                  // Max retries per layer (default: 1)
  progressive?: boolean;             // Enable progressive output (default: true)
}

// Output
interface ExecutionOutput {
  success: boolean;
  output: any;                       // Adapter-specific output
  metadata: {
    layers: LayerMetadata[];
    totalTokens: number;
    totalDurationMs: number;
    cacheHits: number;
    fallbacksUsed: number;
  };
}
```

### 10.2 Minimal Example

```typescript
import { createRuntime, DashboardAdapter } from "liquidcode";

// Create runtime
const runtime = createRuntime();
runtime.registerAdapter(DashboardAdapter);

// Execute
const result = await runtime.execute({
  adapterId: "liquidcode:dashboard:v1",
  context: {
    fingerprint: {
      shape: "timeseries",
      numeric: ["revenue", "orders", "profit"],
      categorical: ["region", "category"],
      temporal: "date",
    },
    intent: "show sales performance overview",
  },
});

console.log(result.output);
// {
//   version: "1.0",
//   layout: { ... },
//   blocks: [ ... ]
// }

console.log(result.metadata);
// {
//   layers: [
//     { id: "L0", tokens: 5, durationMs: 45, cached: false },
//     { id: "L1", tokens: 18, durationMs: 52, cached: false },
//     { id: "L2", tokens: 12, durationMs: 48, cached: false },
//   ],
//   totalTokens: 35,
//   totalDurationMs: 145,
//   cacheHits: 0,
//   fallbacksUsed: 0,
// }
```

### 10.3 Streaming Example

```typescript
const stream = runtime.executeStreaming({
  adapterId: "liquidcode:dashboard:v1",
  context: { ... },
  options: { progressive: true },
});

for await (const partial of stream) {
  switch (partial.phase) {
    case "L0":
      renderSkeleton(partial.layout);
      break;
    case "L1":
      renderZone(partial.zone, partial.components);
      break;
    case "L2":
      applyRefinements(partial.refinements);
      break;
    case "complete":
      finalize(partial.output);
      break;
  }
}
```

---

## 11. Conformance

### 11.1 Conformance Levels

| Level | Requirements |
|-------|--------------|
| **Minimal** | Implements L0, L1, L2 parsing and compilation for at least one adapter |
| **Standard** | Minimal + caching + parallel execution + streaming |
| **Full** | Standard + custom adapters + plugin system + schema registry |

### 11.2 Conformance Tests

Implementations MUST pass the conformance test suite:

```
liquidcode-conformance/
├── parsing/
│   ├── valid-codes.json      # Must parse successfully
│   ├── invalid-codes.json    # Must reject
│   └── edge-cases.json       # Must handle correctly
├── compilation/
│   ├── determinism.json      # Same input → same output
│   ├── fallbacks.json        # Correct fallback behavior
│   └── incremental.json      # Correct partial outputs
├── execution/
│   ├── parallel.json         # Parallel execution correctness
│   ├── caching.json          # Cache behavior
│   └── timeouts.json         # Timeout handling
└── adapters/
    ├── dashboard.json        # Dashboard adapter tests
    └── form.json             # Form adapter tests
```

### 11.3 Version Compatibility

| Spec Version | Adapter Compatibility |
|--------------|----------------------|
| 1.x | All 1.x adapters |
| 2.x | 2.x adapters; 1.x with migration |

**Migration path:** Major version changes require documented migration guides.

---

## 12. Semantic Caching Extension

This section defines an optional extension for semantic caching and fragment-based compilation. Implementations MAY support this extension to achieve sub-50ms latency through precomputed fragment retrieval.

### 12.1 Overview

The Semantic Caching Extension enables:
- **Zero-LLM execution** for known query patterns
- **Fragment composition** from cached components
- **Variable binding** for parameterized templates
- **Enterprise precomputation** for instant deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEMANTIC CACHE FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Query ──▶ Embed ──▶ Vector Search ──▶ Graph Validate          │
│                           │                    │                │
│                           ▼                    ▼                │
│                      Fragments            Compatibility         │
│                           │                    │                │
│                           └────────┬───────────┘                │
│                                    ▼                            │
│                            Bind Variables                       │
│                                    │                            │
│                                    ▼                            │
│                              Compose                            │
│                                    │                            │
│                                    ▼                            │
│                         LiquidCode String                       │
│                                    │                            │
│                                    ▼                            │
│                              Compile                            │
│                                                                 │
│  Total latency: 15-50ms (no LLM)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Fragment Definition

A **Fragment** is a parameterized LiquidCode substring with semantic metadata.

```typescript
interface Fragment {
  // Identity
  id: string;                        // Unique identifier
  version: string;                   // Semver for cache invalidation

  // Content
  code: string;                      // LiquidCode template with variables
  layer: "L0" | "L1" | "L2";         // Which layer this fragment belongs to

  // Semantics
  embedding: number[];               // Vector embedding for similarity search
  intents: string[];                 // Natural language descriptions

  // Type System
  fills?: string;                    // Type this fragment provides
  slots?: Record<string, SlotSpec>;  // Types this fragment requires

  // Variables
  variables: Record<string, VariableSpec>;

  // Constraints
  constraints?: Constraint[];        // Validity predicates

  // Composition
  compatibleWith?: string[];         // Fragment IDs this composes with
}

interface SlotSpec {
  type: string;                      // Required fragment type
  min?: number;                      // Minimum count
  max?: number;                      // Maximum count
  optional?: boolean;                // Can be omitted
}

interface VariableSpec {
  type: VariableType;                // field_ref | computed | constant | contextual
  dataType?: DataType;               // numeric | temporal | categorical | text
  hints?: string[];                  // Semantic hints for binding inference
  default?: string;                  // Default value if unbound
  required?: boolean;                // Must be bound
}

type VariableType = "field_ref" | "computed" | "constant" | "contextual" | "conditional";
type DataType = "numeric" | "temporal" | "categorical" | "text" | "boolean";
```

### 12.3 Variable Syntax

Variables in fragment templates use double-brace syntax:

```
{{variable_name}}           Simple variable
{{variable:modifier}}       Variable with modifier
{{fn(arg1, arg2)}}          Computed variable
{{if(cond, then, else)}}    Conditional variable
```

#### Variable Types

| Type | Syntax | Example | Binding Source |
|------|--------|---------|----------------|
| Field Reference | `{{name}}` | `{{revenue}}` | Data fingerprint column |
| Computed | `{{fn(args)}}` | `{{sum(revenue)}}` | Computed at compile time |
| Constant | `{{=value}}` | `{{=100}}` | Literal value |
| Contextual | `{{@key}}` | `{{@period}}` | Execution context |
| Conditional | `{{if(c,t,e)}}` | `{{if(has_date,date,id)}}` | Evaluated at bind time |

#### Modifiers

| Modifier | Meaning | Example |
|----------|---------|---------|
| `:currency` | Format as currency | `{{revenue:currency}}` |
| `:percent` | Format as percentage | `{{rate:percent}}` |
| `:short` | Abbreviated format | `{{date:short}}` |
| `:upper` | Uppercase | `{{name:upper}}` |
| `:default(v)` | Default if unbound | `{{field:default(id)}}` |

### 12.4 Fragment Repository

The Fragment Repository stores and retrieves fragments using hybrid indexing.

```typescript
interface FragmentRepository {
  // Storage
  store(fragment: Fragment): Promise<void>;
  storeBatch(fragments: Fragment[]): Promise<void>;

  // Retrieval by ID
  get(id: string): Promise<Fragment | null>;

  // Semantic retrieval
  search(query: SemanticQuery): Promise<FragmentMatch[]>;

  // Graph queries
  findCompatible(fragmentId: string): Promise<Fragment[]>;
  findPath(from: string, to: string): Promise<Fragment[][]>;

  // Lifecycle
  invalidate(id: string): Promise<void>;
  warmCache(tenant: string): Promise<void>;
}

interface SemanticQuery {
  text?: string;                     // Natural language query
  embedding?: number[];              // Pre-computed embedding
  layer?: "L0" | "L1" | "L2";        // Filter by layer
  type?: string;                     // Filter by fills/slot type
  fingerprint?: DataFingerprint;     // Filter by data compatibility
  limit?: number;                    // Max results
  threshold?: number;                // Minimum similarity (0-1)
}

interface FragmentMatch {
  fragment: Fragment;
  similarity: number;                // 0-1 similarity score
  bindability: number;               // 0-1 how well variables can bind
  source: "exact" | "semantic" | "fallback";
}
```

### 12.5 Binding Resolution

The Binding Resolver maps fragment variables to concrete values.

```typescript
interface BindingContext {
  fingerprint: DataFingerprint;      // Available columns and types
  data?: any;                        // Actual data for computed values
  context: Record<string, any>;      // Contextual values (@period, etc.)
  preferences?: BindingPreferences;  // User/tenant preferences
}

interface BindingPreferences {
  fieldMappings?: Record<string, string>;  // Explicit mappings
  semanticHints?: Record<string, string[]>; // Preferred semantic matches
  defaults?: Record<string, any>;          // Default values
}

interface BindingResolver {
  // Resolve all variables in a fragment
  resolve(
    fragment: Fragment,
    context: BindingContext
  ): Promise<ResolvedBindings>;

  // Check if fragment can be bound
  canBind(
    fragment: Fragment,
    fingerprint: DataFingerprint
  ): BindabilityResult;

  // Infer bindings from fingerprint
  infer(
    variables: Record<string, VariableSpec>,
    fingerprint: DataFingerprint
  ): InferredBindings;
}

interface ResolvedBindings {
  bindings: Record<string, string>;  // Variable name → resolved value
  unbound: string[];                 // Variables that couldn't bind
  inferred: string[];                // Variables bound by inference
  warnings: string[];                // Non-fatal issues
}

interface BindabilityResult {
  bindable: boolean;
  score: number;                     // 0-1, how well it binds
  missing: string[];                 // Required variables without matches
  partial: string[];                 // Optional variables without matches
}
```

#### Binding Inference Algorithm

```typescript
function inferBinding(
  variable: VariableSpec,
  fingerprint: DataFingerprint
): string | null {
  // 1. Check explicit type match
  const typeMatches = fingerprint.columns.filter(c =>
    matchesDataType(c.type, variable.dataType)
  );

  if (typeMatches.length === 0) return null;
  if (typeMatches.length === 1) return typeMatches[0].name;

  // 2. Apply semantic hints
  if (variable.hints) {
    const hintMatches = typeMatches.filter(c =>
      variable.hints.some(hint =>
        semanticMatch(c.name, hint) > 0.7
      )
    );
    if (hintMatches.length === 1) return hintMatches[0].name;
    if (hintMatches.length > 1) typeMatches = hintMatches;
  }

  // 3. Prefer common names
  const commonNames = ["revenue", "amount", "value", "total", "count", "date"];
  const commonMatch = typeMatches.find(c =>
    commonNames.includes(c.name.toLowerCase())
  );
  if (commonMatch) return commonMatch.name;

  // 4. Return first match
  return typeMatches[0].name;
}
```

### 12.6 Composition Engine

The Composition Engine assembles complete LiquidCode from fragments.

```typescript
interface CompositionEngine {
  // Compose from query
  compose(
    query: string,
    context: BindingContext,
    options?: CompositionOptions
  ): Promise<CompositionResult>;

  // Compose from specific fragments
  composeFragments(
    fragments: FragmentSelection,
    context: BindingContext
  ): Promise<CompositionResult>;
}

interface FragmentSelection {
  l0: Fragment;
  l1: Fragment[];
  l2?: Fragment[];
}

interface CompositionOptions {
  maxLLMFallback?: number;           // Max layers to resolve via LLM
  similarityThreshold?: number;       // Min similarity for fragment match
  preferCache?: boolean;              // Prefer cached over LLM
  timeout?: number;                   // Composition timeout in ms
}

interface CompositionResult {
  code: string;                       // Final LiquidCode string
  fragments: FragmentSelection;       // Fragments used
  bindings: ResolvedBindings;         // Applied bindings
  source: CompositionSource;          // How each layer was resolved
  latency: {
    search: number;
    bind: number;
    compose: number;
    total: number;
  };
}

interface CompositionSource {
  l0: "cache" | "llm" | "fallback";
  l1: ("cache" | "llm" | "fallback")[];
  l2: ("cache" | "llm" | "fallback" | "skipped")[];
}
```

#### Composition Algorithm

```typescript
async function compose(
  query: string,
  context: BindingContext,
  options: CompositionOptions = {}
): Promise<CompositionResult> {
  const startTime = performance.now();
  const timings = { search: 0, bind: 0, compose: 0, total: 0 };

  // 1. Embed query
  const queryEmbedding = await embed(query);

  // 2. Search for L0 fragment
  const searchStart = performance.now();
  const l0Matches = await repository.search({
    embedding: queryEmbedding,
    layer: "L0",
    fingerprint: context.fingerprint,
    limit: 3,
    threshold: options.similarityThreshold ?? 0.7
  });

  let l0: Fragment;
  let l0Source: "cache" | "llm" | "fallback";

  if (l0Matches.length > 0 && l0Matches[0].similarity > 0.8) {
    l0 = l0Matches[0].fragment;
    l0Source = "cache";
  } else if (options.maxLLMFallback !== 0) {
    l0 = await resolveLLM("L0", query, context);
    l0Source = "llm";
  } else {
    l0 = getDefaultFragment("L0");
    l0Source = "fallback";
  }

  // 3. Search for L1 fragments (parallel per slot)
  const l1Fragments: Fragment[] = [];
  const l1Sources: ("cache" | "llm" | "fallback")[] = [];

  await Promise.all(
    Object.entries(l0.slots ?? {}).map(async ([slotName, slotSpec]) => {
      const l1Matches = await repository.search({
        embedding: queryEmbedding,
        layer: "L1",
        type: slotSpec.type,
        fingerprint: context.fingerprint,
        limit: 3
      });

      if (l1Matches.length > 0 && l1Matches[0].similarity > 0.75) {
        l1Fragments.push(l1Matches[0].fragment);
        l1Sources.push("cache");
      } else if ((options.maxLLMFallback ?? 1) > 0) {
        const resolved = await resolveLLM("L1", query, context, slotSpec);
        l1Fragments.push(resolved);
        l1Sources.push("llm");
      } else {
        l1Fragments.push(getDefaultFragment("L1", slotSpec.type));
        l1Sources.push("fallback");
      }
    })
  );

  timings.search = performance.now() - searchStart;

  // 4. Bind variables
  const bindStart = performance.now();
  const allFragments = [l0, ...l1Fragments];
  const bindings = await bindResolver.resolve(
    mergeVariables(allFragments),
    context
  );
  timings.bind = performance.now() - bindStart;

  // 5. Compose final code
  const composeStart = performance.now();
  const code = instantiate(l0, l1Fragments, bindings);
  timings.compose = performance.now() - composeStart;

  timings.total = performance.now() - startTime;

  return {
    code,
    fragments: { l0, l1: l1Fragments, l2: [] },
    bindings,
    source: { l0: l0Source, l1: l1Sources, l2: [] },
    latency: timings
  };
}
```

### 12.7 Fragment Network

Fragments form a composition graph defining valid combinations.

```typescript
interface FragmentNetwork {
  // Nodes are fragments
  nodes: Map<string, Fragment>;

  // Edges define composition relationships
  edges: CompositionEdge[];

  // Type hierarchy
  typeHierarchy: TypeNode;
}

interface CompositionEdge {
  from: string;                      // Parent fragment ID
  to: string;                        // Child fragment ID
  slot: string;                      // Which slot this fills
  weight: number;                    // Preference weight (0-1)
}

interface TypeNode {
  type: string;
  parent?: string;
  children: string[];
  fragments: string[];               // Fragments of this type
}
```

#### Network Queries

```typescript
interface NetworkQueries {
  // Find all valid compositions starting from a fragment
  findCompositions(
    rootId: string,
    maxDepth?: number
  ): Promise<CompositionPath[]>;

  // Check if two fragments can compose
  canCompose(
    parentId: string,
    childId: string,
    slot: string
  ): boolean;

  // Find shortest path between fragments
  findPath(
    fromId: string,
    toId: string
  ): Promise<Fragment[] | null>;

  // Get all fragments compatible with a fingerprint
  compatibleFragments(
    fingerprint: DataFingerprint
  ): Promise<Fragment[]>;
}

interface CompositionPath {
  fragments: Fragment[];
  slots: string[];
  score: number;                     // Combined compatibility score
}
```

### 12.8 Enterprise Precomputation

For enterprise deployments, precompute fragment libraries from data sources.

```typescript
interface PrecomputationEngine {
  // Analyze data sources and generate fragments
  precompute(
    config: PrecomputationConfig
  ): Promise<PrecomputationResult>;

  // Incrementally update on schema change
  update(
    tenant: string,
    changes: SchemaChange[]
  ): Promise<void>;

  // Warm cache for a tenant
  warm(tenant: string): Promise<WarmingResult>;
}

interface PrecomputationConfig {
  tenant: string;
  dataSources: DataSourceConfig[];
  intentCorpus?: string[];           // Known user intents
  templates?: Fragment[];            // Base templates to expand
  maxFragments?: number;             // Limit fragments per source
  computeEmbeddings?: boolean;       // Pre-compute embeddings
}

interface DataSourceConfig {
  id: string;
  type: "database" | "api" | "file";
  connection: any;                   // Connection details
  schema?: SchemaDefinition;         // Override detected schema
  domains?: string[];                // Business domains (sales, hr, etc.)
}

interface PrecomputationResult {
  tenant: string;
  fragments: Fragment[];
  network: FragmentNetwork;
  stats: {
    dataSourcesAnalyzed: number;
    fragmentsGenerated: number;
    intentsDiscovered: number;
    estimatedCoverage: number;       // 0-1, query coverage estimate
  };
}
```

#### Precomputation Algorithm

```typescript
async function precompute(
  config: PrecomputationConfig
): Promise<PrecomputationResult> {
  const fragments: Fragment[] = [];
  const intents: string[] = config.intentCorpus ?? [];

  // 1. Analyze each data source
  for (const source of config.dataSources) {
    const fingerprint = await analyzeDataSource(source);

    // 2. Generate probable intents from schema
    const derivedIntents = generateIntents(fingerprint, source.domains);
    intents.push(...derivedIntents);

    // 3. For each intent, generate optimal fragments
    for (const intent of derivedIntents) {
      // L0 fragment
      const l0 = await generateL0Fragment(intent, fingerprint);
      fragments.push(l0);

      // L1 fragments for each slot
      for (const slot of Object.keys(l0.slots ?? {})) {
        const l1 = await generateL1Fragment(intent, slot, fingerprint);
        fragments.push(l1);
      }
    }
  }

  // 4. Deduplicate similar fragments
  const deduped = deduplicateFragments(fragments, 0.95);

  // 5. Build composition network
  const network = buildNetwork(deduped);

  // 6. Compute embeddings
  if (config.computeEmbeddings) {
    await computeEmbeddings(deduped);
  }

  // 7. Store
  await repository.storeBatch(deduped);

  return {
    tenant: config.tenant,
    fragments: deduped,
    network,
    stats: {
      dataSourcesAnalyzed: config.dataSources.length,
      fragmentsGenerated: deduped.length,
      intentsDiscovered: intents.length,
      estimatedCoverage: estimateCoverage(deduped, intents)
    }
  };
}

function generateIntents(
  fingerprint: DataFingerprint,
  domains?: string[]
): string[] {
  const intents: string[] = [];

  // Metric intents
  for (const col of fingerprint.numericFields) {
    intents.push(`total ${col}`);
    intents.push(`average ${col}`);
    intents.push(`${col} trend`);
    intents.push(`${col} by ${fingerprint.categoricalFields[0] ?? 'category'}`);
  }

  // Time-based intents
  if (fingerprint.temporalField) {
    intents.push(`${fingerprint.temporalField} trend`);
    intents.push(`last week`);
    intents.push(`monthly comparison`);
    intents.push(`year over year`);
  }

  // Domain-specific intents
  if (domains?.includes('sales')) {
    intents.push('sales overview', 'revenue breakdown', 'top customers');
  }
  if (domains?.includes('marketing')) {
    intents.push('campaign performance', 'channel attribution', 'conversion funnel');
  }

  return intents;
}
```

### 12.9 Multi-Tenant Architecture

Fragment repositories support multi-tenant isolation with inheritance.

```
GLOBAL (read-only, shipped with product)
├── Standard archetypes
├── Common component templates
└── Universal style presets
     │
     ▼
ENTERPRISE (per-tenant, inherits global)
├── Custom archetypes
├── Domain-specific templates
├── Branded styles
└── Tenant-specific fragments
     │
     ▼
TEAM (per-team, inherits enterprise)
├── Team preferences
├── Saved compositions
└── User-created fragments
```

```typescript
interface TenantConfig {
  id: string;
  parent?: string;                   // Inherit from (null = global)
  fragmentOverrides?: string[];      // Fragment IDs to override
  preferences?: TenantPreferences;
}

interface TenantPreferences {
  defaultStyle?: string;             // Default L2 fragment
  fieldMappings?: Record<string, string>;
  terminology?: Record<string, string>; // "revenue" → "sales"
  brandColors?: string[];
}

// Resolution order: Team → Enterprise → Global
async function resolveFragment(
  id: string,
  tenant: TenantConfig
): Promise<Fragment> {
  // Check tenant-specific
  let fragment = await repository.get(id, tenant.id);
  if (fragment) return fragment;

  // Check parent chain
  let current = tenant;
  while (current.parent) {
    fragment = await repository.get(id, current.parent);
    if (fragment) return fragment;
    current = await getTenantConfig(current.parent);
  }

  // Fall back to global
  return repository.get(id, "global");
}
```

### 12.10 Cache Warming Strategies

```typescript
interface WarmingStrategy {
  // On tenant onboarding
  onboard(tenant: string): Promise<void>;

  // Periodic refresh
  refresh(tenant: string, interval: number): Promise<void>;

  // Usage-based warming
  warmFromUsage(tenant: string, period: Duration): Promise<void>;
}

// Usage-based warming
async function warmFromUsage(
  tenant: string,
  period: Duration
): Promise<void> {
  // 1. Get query history
  const queries = await getQueryHistory(tenant, period);

  // 2. Extract unique intents
  const intents = extractIntents(queries);

  // 3. For each intent, ensure fragments exist
  for (const intent of intents) {
    const matches = await repository.search({
      text: intent,
      tenant
    });

    // If no good match, precompute
    if (matches.length === 0 || matches[0].similarity < 0.8) {
      const fragments = await generateFragments(intent, tenant);
      await repository.storeBatch(fragments);
    }
  }

  // 4. Preload hot fragments into memory
  const hotFragments = queries
    .flatMap(q => q.fragmentsUsed)
    .countBy()
    .topN(100);

  await memoryCache.preload(hotFragments);
}
```

### 12.11 Latency Targets

| Scenario | Target Latency | Requirements |
|----------|----------------|--------------|
| Exact match | <15ms | Fragment in cache, no binding inference |
| Semantic match | <30ms | Vector search + binding |
| Composition | <50ms | Multi-fragment + composition |
| Partial LLM | <150ms | Cache + 1 LLM call |
| Cold start | <500ms | Full LLM + cache population |

### 12.12 Conformance

Implementations supporting the Semantic Caching Extension MUST:

1. Implement the `FragmentRepository` interface
2. Support parameterized fragments with variable binding
3. Provide semantic search with configurable similarity threshold
4. Support fragment composition according to type constraints
5. Maintain cache coherence on fragment updates

Implementations SHOULD:

1. Support multi-tenant isolation
2. Provide precomputation for enterprise deployment
3. Implement usage-based cache warming
4. Expose latency metrics per retrieval strategy

---

## 13. Context-Driven Precomputation

This section defines the **Context Discovery Engine**—a universal system for predicting probable user intents and preloading fragment caches before any user interaction. This enables zero-latency cold starts across all deployment scenarios.

### 13.1 Theoretical Foundation

The Context Discovery Engine is grounded in the **Universal Organization Metamodel (UOM)**, which identifies 11 irreducible primitives that describe any coordinated human activity:

| Category | Primitives | Question Answered |
|----------|------------|-------------------|
| **Existential** | AGENT, OBJECT, ARTIFACT | What exists? |
| **Intentional** | PURPOSE, RULE | What is sought? What constrains? |
| **Dynamic** | EVENT, ACTION, FLOW | What happens? |
| **Structural** | CONTEXT, RELATION, STATE | What persists? How connected? |

**Core Insight:** A data schema IS a compressed encoding of organizational structure. Tables, columns, foreign keys, and naming conventions embed these primitives. The Context Discovery Engine *decodes* this organizational signature to predict user intents.

```
SCHEMA ─────────────▶ PRIMITIVES ─────────────▶ INTENTS ─────────────▶ FRAGMENTS
        (decode)                 (generate)               (compile)
```

### 13.2 Architecture Overview

```
DEPLOYMENT CONTEXT
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTEXT DISCOVERY ENGINE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     INPUT ADAPTERS                              │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐   │ │
│  │  │ Schema  │  │  File   │  │   API   │  │   Explicit      │   │ │
│  │  │ Adapter │  │ Adapter │  │ Adapter │  │   Primitives    │   │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘   │ │
│  └───────┼────────────┼───────────┼────────────────┼─────────────┘ │
│          │            │           │                │               │
│          ▼            ▼           ▼                ▼               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  PRIMITIVE INFERENCE ENGINE                     │ │
│  │                                                                 │ │
│  │   Data Signals          Inference Rules                        │ │
│  │   ─────────────         ───────────────                        │ │
│  │   Table names      ──▶  OBJECT identification                  │ │
│  │   Foreign keys     ──▶  RELATION mapping                       │ │
│  │   Numeric cols     ──▶  PURPOSE (metrics)                      │ │
│  │   Temporal cols    ──▶  EVENT/FLOW detection                   │ │
│  │   Status enums     ──▶  STATE discovery                        │ │
│  │   Agent patterns   ──▶  AGENT classification                   │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   INTENT GENERATION ENGINE                      │ │
│  │                                                                 │ │
│  │   Primitive Combinations              Intent Patterns           │ │
│  │   ──────────────────────              ───────────────           │ │
│  │   PURPOSE × OBJECT           ──▶  "track {object}"             │ │
│  │   AGENT × FLOW               ──▶  "monitor {agent} {flow}"     │ │
│  │   EVENT × STATE              ──▶  "compare {event} by {state}" │ │
│  │   RELATION(a,b)              ──▶  "{a} by {b}"                 │ │
│  │   STATE × OBJECT             ──▶  "{object} in {state}"        │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   FRAGMENT GENERATION ENGINE                    │ │
│  │                                                                 │ │
│  │   Intent            ──▶  L0 Fragment (archetype)               │ │
│  │   Object context    ──▶  L1 Fragments (component bindings)     │ │
│  │   Deployment style  ──▶  L2 Fragments (formatting)             │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               ▼
                      WARMED CACHE
                (before first user request)
```

### 13.3 Core Interfaces

```typescript
/**
 * Universal Context Discovery Engine
 * Works for any deployment scenario: individual files to enterprise warehouses
 */
interface ContextDiscoveryEngine {
  /**
   * Discover primitives, generate intents, and produce fragments
   * from any input type
   */
  discover(input: DiscoveryInput): Promise<DiscoveryResult>;

  /**
   * Incrementally update discovery when context changes
   */
  update(
    existingResult: DiscoveryResult,
    changes: ContextChange[]
  ): Promise<DiscoveryResult>;

  /**
   * Estimate coverage for a query set against discovered intents
   */
  estimateCoverage(
    result: DiscoveryResult,
    queries: string[]
  ): CoverageEstimate;
}

/**
 * Input types for discovery - supports any deployment scenario
 */
type DiscoveryInput =
  | SchemaInput
  | FileInput
  | APIInput
  | ExplicitInput
  | CompositeInput;

interface SchemaInput {
  type: "schema";
  schema: SchemaDefinition;
  hints?: DiscoveryHints;
}

interface FileInput {
  type: "file";
  files: ParsedFile[];
  hints?: DiscoveryHints;
}

interface APIInput {
  type: "api";
  endpoints: APIEndpoint[];
  responseSchemas?: Record<string, SchemaDefinition>;
  hints?: DiscoveryHints;
}

interface ExplicitInput {
  type: "explicit";
  primitives: ExplicitPrimitives;
}

interface CompositeInput {
  type: "composite";
  sources: DiscoveryInput[];
  mergeStrategy: "union" | "intersection" | "weighted";
}

/**
 * Optional hints to guide discovery
 */
interface DiscoveryHints {
  domain?: string[];                    // e.g., ["sales", "marketing"]
  industry?: string;                    // e.g., "ecommerce", "healthcare"
  organizationType?: OrganizationType;  // e.g., "startup", "enterprise"
  knownIntents?: string[];              // User-provided example queries
  excludePatterns?: string[];           // Tables/columns to ignore
}

type OrganizationType =
  | "individual"
  | "team"
  | "startup"
  | "smb"
  | "enterprise"
  | "platform";

/**
 * Complete discovery result
 */
interface DiscoveryResult {
  // Inferred organizational primitives
  primitives: InferredPrimitives;

  // Generated intents ranked by probability
  intents: PredictedIntent[];

  // Fragment library ready for cache
  fragments: Fragment[];

  // Composition network for fragments
  network: FragmentNetwork;

  // Quality metrics
  metrics: DiscoveryMetrics;

  // Identified gaps requiring clarification
  gaps: DiscoveryGap[];
}

interface DiscoveryMetrics {
  confidence: number;           // 0-1: Confidence in primitive inference
  coverage: number;             // 0-1: Estimated query coverage
  fragmentCount: number;        // Number of fragments generated
  intentCount: number;          // Number of unique intents
  primitiveCompleteness: number; // 0-1: How many primitive categories populated
}

interface DiscoveryGap {
  type: "ambiguous" | "missing" | "conflict";
  primitive: PrimitiveCategory;
  description: string;
  suggestions?: string[];       // How user could resolve
}
```

### 13.4 Inferred Primitives Structure

```typescript
/**
 * Full primitive inference result based on UOM categories
 */
interface InferredPrimitives {
  // EXISTENTIAL: What exists
  agents: AgentPrimitive[];
  objects: ObjectPrimitive[];
  artifacts: ArtifactPrimitive[];

  // INTENTIONAL: What is sought, what constrains
  purposes: PurposePrimitive[];
  rules: RulePrimitive[];

  // DYNAMIC: What happens
  events: EventPrimitive[];
  actions: ActionPrimitive[];
  flows: FlowPrimitive[];

  // STRUCTURAL: What persists
  contexts: ContextPrimitive[];
  relations: RelationPrimitive[];
  states: StatePrimitive[];
}

type PrimitiveCategory = keyof InferredPrimitives;

/**
 * AGENT: Entity with autonomous action capacity
 * Inferred from: tables with user/customer/employee patterns, auth tables
 */
interface AgentPrimitive {
  id: string;
  source: string;               // Table/column that defines this
  name: string;                 // Human-readable name
  type: "individual" | "collective" | "role" | "system";
  capabilities: string[];       // Actions this agent can perform
  identifiedBy: string[];       // Fields that identify instances
  confidence: number;
}

/**
 * OBJECT: Entity without agency, can be transformed
 * Inferred from: entity tables without user patterns
 */
interface ObjectPrimitive {
  id: string;
  source: string;
  name: string;
  singularForm: string;
  pluralForm: string;
  attributes: string[];         // Column names
  categorizedBy?: string[];     // Categorical columns
  measuredBy?: string[];        // Numeric columns
  confidence: number;
}

/**
 * ARTIFACT: Object created by agent action
 * Inferred from: tables with created_by, author, etc.
 */
interface ArtifactPrimitive {
  id: string;
  source: string;
  name: string;
  creatorAgent?: string;        // AgentPrimitive id
  creationEvent?: string;       // EventPrimitive id
  purpose?: string;             // PurposePrimitive id
  confidence: number;
}

/**
 * PURPOSE: Intended state that guides action
 * Inferred from: metric columns, KPI names, goal tables
 */
interface PurposePrimitive {
  id: string;
  source: string;
  name: string;
  metric?: string;              // Column being measured
  direction?: "maximize" | "minimize" | "target";
  holder?: string;              // AgentPrimitive id
  confidence: number;
}

/**
 * RULE: Constraint with normative force
 * Inferred from: constraints, validation rules, enums
 */
interface RulePrimitive {
  id: string;
  source: string;
  name: string;
  type: "constitutive" | "regulative" | "procedural" | "evaluative";
  scope: string[];              // What it applies to
  confidence: number;
}

/**
 * EVENT: Discrete occurrence marking state change
 * Inferred from: temporal columns, timestamp patterns
 */
interface EventPrimitive {
  id: string;
  source: string;
  name: string;
  timestamp: string;            // Column containing when
  participants: string[];       // Related entities
  type: "external" | "internal" | "scheduled" | "conditional";
  confidence: number;
}

/**
 * ACTION: Purposeful event by an agent
 * Inferred from: transaction tables, audit logs
 */
interface ActionPrimitive {
  id: string;
  source: string;
  name: string;
  agent: string;                // AgentPrimitive id
  verb: string;                 // Action word (create, update, purchase)
  targets: string[];            // ObjectPrimitive ids
  confidence: number;
}

/**
 * FLOW: Directed movement between contexts
 * Inferred from: from/to patterns, transfer tables
 */
interface FlowPrimitive {
  id: string;
  source: string;
  name: string;
  what: string;                 // What is flowing
  from?: string;                // Source context
  to?: string;                  // Destination context
  type: "material" | "information" | "value" | "authority" | "work";
  confidence: number;
}

/**
 * CONTEXT: Bounded region for interpretation
 * Inferred from: hierarchy tables, org structure, categories
 */
interface ContextPrimitive {
  id: string;
  source: string;
  name: string;
  type: "physical" | "temporal" | "organizational" | "informational";
  parent?: string;              // Parent context
  children?: string[];          // Child contexts
  confidence: number;
}

/**
 * RELATION: Structured connection between entities
 * Inferred from: foreign keys, junction tables
 */
interface RelationPrimitive {
  id: string;
  source: string;
  name: string;
  from: string;                 // Source primitive id
  to: string;                   // Target primitive id
  cardinality: "1:1" | "1:n" | "m:n";
  type: "compositional" | "hierarchical" | "causal" | "temporal" | "deontic";
  confidence: number;
}

/**
 * STATE: Configuration at a point in time
 * Inferred from: status columns, enum fields, boolean flags
 */
interface StatePrimitive {
  id: string;
  source: string;
  name: string;
  entity: string;               // What has this state
  values: string[];             // Possible state values
  transitions?: StateTransition[];
  confidence: number;
}

interface StateTransition {
  from: string;
  to: string;
  trigger?: string;             // EventPrimitive id
}
```

### 13.5 Primitive Inference Rules

The engine infers primitives from data signals using the following rules:

```typescript
interface InferenceRules {
  /**
   * AGENT detection rules
   */
  agent: InferenceRule[];

  /**
   * OBJECT detection rules
   */
  object: InferenceRule[];

  // ... one per primitive category
}

interface InferenceRule {
  name: string;
  priority: number;             // Higher = checked first
  confidence: number;           // Base confidence when matched
  patterns: SignalPattern[];
  excludeIf?: SignalPattern[];
  extract: (match: PatternMatch) => Partial<Primitive>;
}

type SignalPattern =
  | TableNamePattern
  | ColumnNamePattern
  | RelationshipPattern
  | DataTypePattern
  | ValueDistributionPattern;

/**
 * Standard inference rules
 */
const STANDARD_INFERENCE_RULES: InferenceRules = {
  agent: [
    {
      name: "user_table_pattern",
      priority: 100,
      confidence: 0.95,
      patterns: [
        { type: "table_name", regex: /^(user|customer|employee|member|account)s?$/i }
      ],
      extract: (match) => ({
        type: "individual",
        identifiedBy: ["id", "email", "username"]
      })
    },
    {
      name: "team_org_pattern",
      priority: 90,
      confidence: 0.85,
      patterns: [
        { type: "table_name", regex: /^(team|department|org|organization|group)s?$/i }
      ],
      extract: (match) => ({
        type: "collective"
      })
    },
    {
      name: "created_by_pattern",
      priority: 80,
      confidence: 0.75,
      patterns: [
        { type: "column_name", regex: /^(created_by|author|owner|assignee)(_id)?$/i }
      ],
      extract: (match) => ({
        type: "individual",
        capabilities: ["create", "own"]
      })
    }
  ],

  object: [
    {
      name: "entity_table_pattern",
      priority: 100,
      confidence: 0.90,
      patterns: [
        { type: "table_name", regex: /^[a-z_]+s$/i }  // Plural nouns
      ],
      excludeIf: [
        { type: "column_name", regex: /^(email|password|auth)/i }  // Not user tables
      ],
      extract: (match) => ({
        singularForm: depluralize(match.tableName),
        pluralForm: match.tableName
      })
    }
  ],

  purpose: [
    {
      name: "metric_column_pattern",
      priority: 100,
      confidence: 0.90,
      patterns: [
        { type: "column_name", regex: /^(total|sum|count|amount|revenue|cost|price|quantity)$/i },
        { type: "data_type", includes: ["numeric", "decimal", "float", "integer"] }
      ],
      extract: (match) => ({
        metric: match.columnName,
        direction: guessDirection(match.columnName)
      })
    },
    {
      name: "kpi_naming_pattern",
      priority: 90,
      confidence: 0.85,
      patterns: [
        { type: "column_name", regex: /_rate$|_ratio$|_score$|_index$/i }
      ],
      extract: (match) => ({
        metric: match.columnName,
        direction: "maximize"
      })
    }
  ],

  event: [
    {
      name: "timestamp_pattern",
      priority: 100,
      confidence: 0.95,
      patterns: [
        { type: "column_name", regex: /^(created|updated|deleted|completed|started|ended)_(at|on|date|time)$/i }
      ],
      extract: (match) => ({
        timestamp: match.columnName,
        type: inferEventType(match.columnName)
      })
    }
  ],

  state: [
    {
      name: "status_column_pattern",
      priority: 100,
      confidence: 0.95,
      patterns: [
        { type: "column_name", regex: /^(status|state|phase|stage)$/i }
      ],
      extract: (match) => ({
        values: match.enumValues ?? ["unknown"]
      })
    },
    {
      name: "boolean_flag_pattern",
      priority: 80,
      confidence: 0.80,
      patterns: [
        { type: "column_name", regex: /^(is_|has_|can_|should_)/i },
        { type: "data_type", includes: ["boolean"] }
      ],
      extract: (match) => ({
        values: ["true", "false"]
      })
    }
  ],

  relation: [
    {
      name: "foreign_key_pattern",
      priority: 100,
      confidence: 0.95,
      patterns: [
        { type: "relationship", exists: true }
      ],
      extract: (match) => ({
        cardinality: inferCardinality(match.relationship),
        type: "compositional"
      })
    }
  ],

  flow: [
    {
      name: "from_to_pattern",
      priority: 100,
      confidence: 0.90,
      patterns: [
        { type: "column_name", regex: /^(from_|source_)/i },
        { type: "column_name", regex: /^(to_|target_|destination_)/i }
      ],
      extract: (match) => ({
        type: inferFlowType(match.tableName)
      })
    },
    {
      name: "transfer_table_pattern",
      priority: 90,
      confidence: 0.85,
      patterns: [
        { type: "table_name", regex: /(transfer|transaction|payment|order|shipment)s?$/i }
      ],
      extract: (match) => ({
        type: "value"
      })
    }
  ]
};
```

### 13.6 Intent Generation

```typescript
/**
 * Predicted intent with probability and fragment mapping
 */
interface PredictedIntent {
  id: string;
  text: string;                         // Natural language intent
  normalized: string;                   // Canonical form
  probability: number;                  // 0-1 likelihood user will ask
  primitives: PrimitiveReference[];     // Which primitives involved
  archetype: ArchetypeHint;             // Suggested L0
  bindings: BindingHint[];              // Suggested L1 bindings
}

interface PrimitiveReference {
  category: PrimitiveCategory;
  id: string;
}

interface ArchetypeHint {
  type: string;                         // e.g., "overview", "trend", "comparison"
  confidence: number;
}

interface BindingHint {
  slot: string;
  primitiveId: string;
  field?: string;
}

/**
 * Intent generation engine
 */
interface IntentGenerator {
  /**
   * Generate intents from primitives
   */
  generate(
    primitives: InferredPrimitives,
    options?: IntentGenerationOptions
  ): PredictedIntent[];
}

interface IntentGenerationOptions {
  maxIntents?: number;                  // Limit total intents
  minProbability?: number;              // Filter low-probability
  includeDomainSpecific?: boolean;      // Add domain intents
  domains?: string[];                   // Domains to consider
}

/**
 * Intent templates by primitive combination
 */
const INTENT_TEMPLATES: IntentTemplate[] = [
  // PURPOSE × OBJECT patterns
  {
    name: "metric_total",
    requires: ["purpose", "object"],
    template: "total {purpose.metric}",
    probability: 0.95,
    archetype: "kpi"
  },
  {
    name: "metric_by_category",
    requires: ["purpose", "object", "relation"],
    template: "{purpose.metric} by {relation.to}",
    probability: 0.90,
    archetype: "breakdown"
  },
  {
    name: "metric_trend",
    requires: ["purpose", "event"],
    template: "{purpose.metric} over {event.temporal_granularity}",
    probability: 0.90,
    archetype: "trend"
  },

  // AGENT × ACTION patterns
  {
    name: "agent_activity",
    requires: ["agent", "action"],
    template: "{agent.name} {action.verb} activity",
    probability: 0.80,
    archetype: "activity"
  },
  {
    name: "top_agents",
    requires: ["agent", "purpose"],
    template: "top {agent.pluralForm} by {purpose.metric}",
    probability: 0.85,
    archetype: "ranking"
  },

  // OBJECT × STATE patterns
  {
    name: "object_by_state",
    requires: ["object", "state"],
    template: "{object.pluralForm} by {state.name}",
    probability: 0.85,
    archetype: "breakdown"
  },
  {
    name: "object_in_state",
    requires: ["object", "state"],
    template: "{object.pluralForm} in {state.value}",
    probability: 0.75,
    archetype: "filter"
  },

  // EVENT × TEMPORAL patterns
  {
    name: "recent_events",
    requires: ["event"],
    template: "recent {event.pluralForm}",
    probability: 0.80,
    archetype: "list"
  },
  {
    name: "event_comparison",
    requires: ["event", "purpose"],
    template: "{purpose.metric} this {event.period} vs last",
    probability: 0.85,
    archetype: "comparison"
  },

  // FLOW patterns
  {
    name: "flow_volume",
    requires: ["flow"],
    template: "{flow.what} from {flow.from} to {flow.to}",
    probability: 0.75,
    archetype: "flow"
  },
  {
    name: "flow_trend",
    requires: ["flow", "event"],
    template: "{flow.what} over time",
    probability: 0.80,
    archetype: "trend"
  },

  // CONTEXT patterns
  {
    name: "context_comparison",
    requires: ["context", "purpose"],
    template: "{purpose.metric} by {context.name}",
    probability: 0.80,
    archetype: "comparison"
  }
];

/**
 * Domain-specific intent patterns
 */
const DOMAIN_INTENT_PATTERNS: Record<string, IntentTemplate[]> = {
  sales: [
    { name: "revenue_overview", template: "revenue overview", probability: 0.95, archetype: "overview" },
    { name: "sales_pipeline", template: "sales pipeline", probability: 0.90, archetype: "funnel" },
    { name: "deal_velocity", template: "deal velocity", probability: 0.80, archetype: "metric" },
    { name: "quota_attainment", template: "quota attainment", probability: 0.85, archetype: "gauge" }
  ],
  marketing: [
    { name: "campaign_performance", template: "campaign performance", probability: 0.95, archetype: "overview" },
    { name: "channel_attribution", template: "channel attribution", probability: 0.85, archetype: "breakdown" },
    { name: "conversion_funnel", template: "conversion funnel", probability: 0.90, archetype: "funnel" }
  ],
  ecommerce: [
    { name: "order_overview", template: "order overview", probability: 0.95, archetype: "overview" },
    { name: "cart_abandonment", template: "cart abandonment", probability: 0.80, archetype: "metric" },
    { name: "product_performance", template: "product performance", probability: 0.90, archetype: "ranking" }
  ],
  hr: [
    { name: "headcount", template: "headcount overview", probability: 0.95, archetype: "overview" },
    { name: "attrition", template: "attrition analysis", probability: 0.85, archetype: "trend" },
    { name: "hiring_pipeline", template: "hiring pipeline", probability: 0.80, archetype: "funnel" }
  ]
};

/**
 * Intent generation algorithm
 */
function generateIntents(
  primitives: InferredPrimitives,
  options: IntentGenerationOptions = {}
): PredictedIntent[] {
  const intents: PredictedIntent[] = [];

  // 1. Apply universal templates
  for (const template of INTENT_TEMPLATES) {
    const matches = findPrimitiveMatches(primitives, template.requires);

    for (const match of matches) {
      const text = instantiateTemplate(template.template, match);
      const probability = calculateProbability(template.probability, match);

      if (probability >= (options.minProbability ?? 0.5)) {
        intents.push({
          id: generateId(),
          text,
          normalized: normalize(text),
          probability,
          primitives: extractReferences(match),
          archetype: { type: template.archetype, confidence: probability },
          bindings: generateBindingHints(template, match)
        });
      }
    }
  }

  // 2. Apply domain-specific templates
  if (options.includeDomainSpecific !== false) {
    const domains = options.domains ?? inferDomains(primitives);

    for (const domain of domains) {
      const domainTemplates = DOMAIN_INTENT_PATTERNS[domain] ?? [];

      for (const template of domainTemplates) {
        intents.push({
          id: generateId(),
          text: template.template,
          normalized: normalize(template.template),
          probability: template.probability * 0.8, // Slightly lower for domain-specific
          primitives: [],
          archetype: { type: template.archetype, confidence: 0.8 },
          bindings: []
        });
      }
    }
  }

  // 3. Deduplicate and rank
  const deduped = deduplicateIntents(intents);
  const ranked = deduped.sort((a, b) => b.probability - a.probability);

  // 4. Apply limit
  if (options.maxIntents) {
    return ranked.slice(0, options.maxIntents);
  }

  return ranked;
}
```

### 13.7 Deployment Profiles

Different deployment scenarios have different discovery characteristics:

```typescript
/**
 * Deployment profile affects discovery strategy
 */
interface DeploymentProfile {
  type: OrganizationType;
  characteristics: ProfileCharacteristics;
  strategy: DiscoveryStrategy;
  targets: PerformanceTargets;
}

interface ProfileCharacteristics {
  typicalSources: number;               // Expected data sources
  typicalComplexity: "low" | "medium" | "high";
  userExpertise: "novice" | "intermediate" | "expert";
  queryDiversity: "narrow" | "medium" | "broad";
}

interface DiscoveryStrategy {
  inferenceDepth: "shallow" | "deep";   // How hard to work on inference
  intentBreadth: "focused" | "comprehensive";
  fragmentPrecomputation: "minimal" | "standard" | "exhaustive";
  cachingAggression: number;            // 0-1
}

interface PerformanceTargets {
  discoveryTime: number;                // Max ms for discovery
  coldStartLatency: number;             // Target first-query latency
  cacheHitRate: number;                 // Target cache hit rate
}

/**
 * Standard deployment profiles
 */
const DEPLOYMENT_PROFILES: Record<OrganizationType, DeploymentProfile> = {
  individual: {
    type: "individual",
    characteristics: {
      typicalSources: 1,
      typicalComplexity: "low",
      userExpertise: "novice",
      queryDiversity: "narrow"
    },
    strategy: {
      inferenceDepth: "shallow",
      intentBreadth: "focused",
      fragmentPrecomputation: "minimal",
      cachingAggression: 0.9
    },
    targets: {
      discoveryTime: 2000,
      coldStartLatency: 100,
      cacheHitRate: 0.95
    }
  },

  team: {
    type: "team",
    characteristics: {
      typicalSources: 3,
      typicalComplexity: "medium",
      userExpertise: "intermediate",
      queryDiversity: "medium"
    },
    strategy: {
      inferenceDepth: "deep",
      intentBreadth: "comprehensive",
      fragmentPrecomputation: "standard",
      cachingAggression: 0.8
    },
    targets: {
      discoveryTime: 5000,
      coldStartLatency: 75,
      cacheHitRate: 0.90
    }
  },

  enterprise: {
    type: "enterprise",
    characteristics: {
      typicalSources: 20,
      typicalComplexity: "high",
      userExpertise: "mixed",
      queryDiversity: "broad"
    },
    strategy: {
      inferenceDepth: "deep",
      intentBreadth: "comprehensive",
      fragmentPrecomputation: "exhaustive",
      cachingAggression: 0.7
    },
    targets: {
      discoveryTime: 30000,
      coldStartLatency: 50,
      cacheHitRate: 0.85
    }
  },

  platform: {
    type: "platform",
    characteristics: {
      typicalSources: 100,
      typicalComplexity: "high",
      userExpertise: "mixed",
      queryDiversity: "broad"
    },
    strategy: {
      inferenceDepth: "deep",
      intentBreadth: "comprehensive",
      fragmentPrecomputation: "exhaustive",
      cachingAggression: 0.6
    },
    targets: {
      discoveryTime: 60000,
      coldStartLatency: 40,
      cacheHitRate: 0.80
    }
  }
};
```

### 13.8 Organizational Onboarding (Optional)

For organizations desiring maximum cache coverage, an optional structured onboarding process uses the UOM's **7 Canonical Perspectives**:

```typescript
/**
 * Structured organizational onboarding using UOM perspectives
 */
interface OrganizationalOnboarding {
  /**
   * Run full perspective-based discovery
   */
  run(
    baseDiscovery: DiscoveryResult,
    mode: OnboardingMode
  ): Promise<EnhancedDiscoveryResult>;

  /**
   * Run a single perspective phase
   */
  runPhase(
    phase: PerspectivePhase,
    context: OnboardingContext
  ): Promise<PhaseResult>;
}

type OnboardingMode =
  | "auto"      // Fully automatic inference
  | "guided"    // Ask user questions per perspective
  | "hybrid";   // Auto with optional user refinement

type PerspectivePhase =
  | "structural"      // How is it arranged?
  | "processual"      // How does work flow?
  | "intentional"     // What is achieved?
  | "normative"       // What governs behavior?
  | "informational"   // What is known/shared?
  | "resource"        // What is used?
  | "temporal";       // When does it happen?

interface OnboardingContext {
  mode: OnboardingMode;
  baseDiscovery: DiscoveryResult;
  completedPhases: PerspectivePhase[];
  userResponses: Map<string, any>;
}

/**
 * Perspective phase definitions
 */
const PERSPECTIVE_PHASES: Record<PerspectivePhase, PhaseDefinition> = {
  structural: {
    name: "Structural Perspective",
    question: "How is your organization arranged?",
    primitivesFocus: ["agent", "context", "relation"],
    autoInference: inferStructuralPrimitives,
    guidedQuestions: [
      "What teams/departments exist?",
      "How are they organized (hierarchy, matrix, flat)?",
      "What are the main reporting relationships?"
    ],
    enhancesIntents: ["organizational comparison", "team performance", "hierarchy views"]
  },

  processual: {
    name: "Processual Perspective",
    question: "How does work flow through your organization?",
    primitivesFocus: ["action", "flow", "event"],
    autoInference: inferProcessualPrimitives,
    guidedQuestions: [
      "What are your core business processes?",
      "What triggers work to start?",
      "How do tasks move between people/systems?"
    ],
    enhancesIntents: ["workflow tracking", "process metrics", "bottleneck analysis"]
  },

  intentional: {
    name: "Intentional Perspective",
    question: "What is your organization trying to achieve?",
    primitivesFocus: ["purpose", "action"],
    autoInference: inferIntentionalPrimitives,
    guidedQuestions: [
      "What are your key business goals?",
      "What metrics matter most?",
      "What does success look like?"
    ],
    enhancesIntents: ["goal tracking", "KPI dashboards", "performance scorecards"]
  },

  normative: {
    name: "Normative Perspective",
    question: "What governs behavior in your organization?",
    primitivesFocus: ["rule"],
    autoInference: inferNormativePrimitives,
    guidedQuestions: [
      "What policies or rules constrain operations?",
      "What approval thresholds exist?",
      "What compliance requirements apply?"
    ],
    enhancesIntents: ["compliance dashboards", "exception reporting", "rule violations"]
  },

  informational: {
    name: "Informational Perspective",
    question: "What information flows through your organization?",
    primitivesFocus: ["flow", "artifact"],
    autoInference: inferInformationalPrimitives,
    guidedQuestions: [
      "What reports are generated regularly?",
      "What data is shared between teams?",
      "What are the key data sources?"
    ],
    enhancesIntents: ["data lineage", "report generation", "information access"]
  },

  resource: {
    name: "Resource Perspective",
    question: "What resources does your organization use?",
    primitivesFocus: ["object", "artifact"],
    autoInference: inferResourcePrimitives,
    guidedQuestions: [
      "What assets do you track?",
      "What gets consumed in your processes?",
      "What is produced?"
    ],
    enhancesIntents: ["resource allocation", "inventory", "capacity planning"]
  },

  temporal: {
    name: "Temporal Perspective",
    question: "When do things happen?",
    primitivesFocus: ["event", "state"],
    autoInference: inferTemporalPrimitives,
    guidedQuestions: [
      "What are your important time periods (fiscal year, seasons)?",
      "What events drive your business cycles?",
      "What time comparisons matter (YoY, MoM)?"
    ],
    enhancesIntents: ["period comparison", "seasonal analysis", "timeline views"]
  }
};

/**
 * Full onboarding algorithm
 */
async function runOnboarding(
  baseDiscovery: DiscoveryResult,
  mode: OnboardingMode
): Promise<EnhancedDiscoveryResult> {
  const context: OnboardingContext = {
    mode,
    baseDiscovery,
    completedPhases: [],
    userResponses: new Map()
  };

  let enhanced = baseDiscovery;

  for (const phase of PERSPECTIVE_ORDER) {
    const phaseResult = await runPhase(phase, context);

    // Merge new primitives
    enhanced = mergePrimitives(enhanced, phaseResult.primitives);

    // Regenerate intents with new primitives
    enhanced.intents = generateIntents(enhanced.primitives, {
      includeDomainSpecific: true,
      domains: inferDomains(enhanced.primitives)
    });

    // Regenerate fragments
    enhanced.fragments = generateFragments(enhanced.intents, enhanced.primitives);

    context.completedPhases.push(phase);
  }

  return {
    ...enhanced,
    onboardingComplete: true,
    perspectivesCovered: context.completedPhases,
    enhancementFactor: calculateEnhancement(baseDiscovery, enhanced)
  };
}

const PERSPECTIVE_ORDER: PerspectivePhase[] = [
  "structural",     // Foundation: Who and where
  "intentional",    // Goals: What we're trying to do
  "processual",     // How: Work gets done
  "temporal",       // When: Time dimensions
  "normative",      // Constraints: Rules and policies
  "informational",  // Data: What's tracked
  "resource"        // Assets: What's used
];
```

### 13.9 Coverage Estimation

```typescript
/**
 * Estimate how well the fragment cache covers probable queries
 */
interface CoverageEstimator {
  /**
   * Estimate coverage for discovered intents
   */
  estimateDiscoveryCoverage(result: DiscoveryResult): CoverageEstimate;

  /**
   * Estimate coverage for a specific query set
   */
  estimateQueryCoverage(
    result: DiscoveryResult,
    queries: string[]
  ): CoverageEstimate;

  /**
   * Identify gaps in coverage
   */
  identifyGaps(
    result: DiscoveryResult,
    targetCoverage: number
  ): CoverageGap[];
}

interface CoverageEstimate {
  overall: number;                      // 0-1 overall coverage
  byArchetype: Record<string, number>;  // Coverage per archetype
  byPrimitive: Record<PrimitiveCategory, number>; // Coverage per primitive type
  confidence: number;                   // How confident in this estimate
  recommendations?: string[];           // How to improve
}

interface CoverageGap {
  type: "archetype" | "primitive" | "domain";
  name: string;
  currentCoverage: number;
  estimatedQueries: number;             // How many queries this would cover
  effort: "low" | "medium" | "high";    // Effort to fill gap
  suggestion: string;
}

/**
 * Coverage calculation algorithm
 */
function estimateDiscoveryCoverage(result: DiscoveryResult): CoverageEstimate {
  // 1. Measure archetype coverage
  const archetypeCoverage = measureArchetypeCoverage(result.fragments);

  // 2. Measure primitive coverage
  const primitiveCoverage = measurePrimitiveCoverage(result.primitives, result.intents);

  // 3. Calculate weighted overall coverage
  const weights = {
    archetype: 0.4,
    primitive: 0.4,
    intent: 0.2
  };

  const intentCoverage = result.intents.filter(i =>
    hasMatchingFragment(i, result.fragments)
  ).length / result.intents.length;

  const overall =
    weights.archetype * mean(Object.values(archetypeCoverage)) +
    weights.primitive * mean(Object.values(primitiveCoverage)) +
    weights.intent * intentCoverage;

  return {
    overall,
    byArchetype: archetypeCoverage,
    byPrimitive: primitiveCoverage,
    confidence: calculateConfidence(result),
    recommendations: generateRecommendations(archetypeCoverage, primitiveCoverage)
  };
}

function measureArchetypeCoverage(fragments: Fragment[]): Record<string, number> {
  const EXPECTED_ARCHETYPES = [
    "overview", "trend", "comparison", "breakdown",
    "ranking", "funnel", "detail", "alert"
  ];

  const coverage: Record<string, number> = {};

  for (const archetype of EXPECTED_ARCHETYPES) {
    const matching = fragments.filter(f =>
      f.metadata?.archetype === archetype
    );

    // Coverage is min(1, count / expected)
    // Expected is roughly 3-5 fragments per archetype
    coverage[archetype] = Math.min(1, matching.length / 4);
  }

  return coverage;
}
```

### 13.10 Continuous Learning

The discovery engine improves over time by learning from actual usage:

```typescript
/**
 * Continuous learning from usage patterns
 */
interface DiscoveryLearning {
  /**
   * Record a query and its result
   */
  recordQuery(
    query: string,
    cacheHit: boolean,
    fragments?: Fragment[]
  ): void;

  /**
   * Refine discovery based on accumulated data
   */
  refine(
    original: DiscoveryResult,
    usageData: UsageData
  ): Promise<RefinedDiscoveryResult>;

  /**
   * Identify missing intents from cache misses
   */
  identifyMissingIntents(
    misses: CacheMiss[]
  ): PredictedIntent[];
}

interface UsageData {
  queries: QueryRecord[];
  period: Duration;
  tenantId?: string;
}

interface QueryRecord {
  query: string;
  timestamp: Date;
  cacheHit: boolean;
  latency: number;
  fragmentsUsed?: string[];
  userFeedback?: "helpful" | "not_helpful";
}

interface CacheMiss {
  query: string;
  embedding: number[];
  nearestFragment?: string;
  nearestSimilarity?: number;
}

/**
 * Learning algorithm
 */
async function refineDiscovery(
  original: DiscoveryResult,
  usageData: UsageData
): Promise<RefinedDiscoveryResult> {
  // 1. Analyze cache misses
  const misses = usageData.queries.filter(q => !q.cacheHit);

  // 2. Cluster missed queries by semantic similarity
  const missedClusters = await clusterQueries(misses.map(m => m.query));

  // 3. For each cluster, try to infer missing primitive or intent
  const newIntents: PredictedIntent[] = [];
  const newPrimitives: Partial<InferredPrimitives> = {};

  for (const cluster of missedClusters) {
    // Check if this is a known pattern we failed to generate
    const pattern = matchIntentPattern(cluster.centroid);

    if (pattern) {
      // We have the primitive but missed the intent combination
      newIntents.push(createIntent(pattern, original.primitives));
    } else {
      // We might be missing a primitive entirely
      const inferred = tryInferPrimitive(cluster.queries, original);
      if (inferred) {
        mergePrimitive(newPrimitives, inferred);
      }
    }
  }

  // 4. Adjust probabilities based on actual usage
  const adjustedIntents = original.intents.map(intent => {
    const usageCount = usageData.queries.filter(q =>
      matchesIntent(q.query, intent)
    ).length;

    const expectedCount = intent.probability * usageData.queries.length;
    const adjustmentFactor = usageCount / Math.max(1, expectedCount);

    return {
      ...intent,
      probability: clamp(intent.probability * adjustmentFactor, 0, 1)
    };
  });

  // 5. Generate new fragments for new intents
  const newFragments = await generateFragments(newIntents, original.primitives);

  return {
    ...original,
    primitives: mergePrimitives(original.primitives, newPrimitives),
    intents: [...adjustedIntents, ...newIntents].sort((a, b) => b.probability - a.probability),
    fragments: [...original.fragments, ...newFragments],
    refinementGeneration: (original.refinementGeneration ?? 0) + 1,
    lastRefinement: new Date()
  };
}
```

### 13.11 Conformance

Implementations supporting Context-Driven Precomputation MUST:

1. Implement the `ContextDiscoveryEngine` interface
2. Support at least `SchemaInput` and `FileInput` discovery types
3. Infer at least: OBJECT, PURPOSE, EVENT, STATE, RELATION primitives
4. Generate intents using the standard template patterns
5. Produce valid `Fragment` objects compatible with Section 12

Implementations SHOULD:

1. Support all 11 UOM primitives
2. Implement domain-specific intent patterns
3. Provide coverage estimation
4. Support continuous learning refinement
5. Implement the organizational onboarding flow

### 13.12 Performance Requirements

| Deployment Type | Discovery Time | Fragment Count | Coverage Target |
|-----------------|---------------|----------------|-----------------|
| Individual (1 file) | <2s | 10-50 | >95% |
| Team (3-5 sources) | <5s | 50-200 | >90% |
| Enterprise (20+ sources) | <30s | 500-2000 | >85% |
| Platform (100+ tenants) | <60s per tenant | 100-500 per tenant | >80% |

### 13.13 Schema Archetype System

The Schema Archetype System eliminates the need for sector-specific libraries by recognizing **universal structural patterns** that appear across all industries. This enables true plug-and-play deployment with zero onboarding.

#### 13.13.1 Core Insight

**Sector labels are proxies. Schema structure is the signal.**

A retail order, a healthcare claim, and a financial trade share the same underlying archetype: `transaction_flow`. Their dashboards are structurally identical—only the field names differ.

By operating at the archetype level instead of the sector level:
- 30 archetypes replace 1000s of sector libraries
- Detection is instant (structural analysis, no LLM)
- Coverage improves (archetypes compose, sectors don't)
- Maintenance drops by 100x

```
SECTOR APPROACH (additive):
  1000 sectors × 50 templates = 50,000 static fragments

ARCHETYPE APPROACH (multiplicative):
  30 archetypes × 15 generators = 450 generators
  → Each deployment: 3 archetypes × 15 fragments = 45 generated fragments
  → 90%+ coverage with 100x less content
```

#### 13.13.2 Archetype Catalog

The following archetypes represent **universal schema patterns** observed across industries:

```typescript
/**
 * Schema archetypes - universal patterns that appear across all domains
 */
type SchemaArchetype =
  // Transactional Patterns
  | "transaction_flow"      // Agent performs action on object with value over time
  | "order_fulfillment"     // Order → Line Items → Fulfillment → Delivery
  | "payment_cycle"         // Invoice → Payment → Reconciliation

  // Lifecycle Patterns
  | "entity_lifecycle"      // Object with status transitions over time
  | "approval_workflow"     // Request → Review → Approve/Reject
  | "case_management"       // Open → Assign → Work → Resolve → Close

  // Hierarchical Patterns
  | "hierarchical_metrics"  // Nested contexts with aggregate measures
  | "org_hierarchy"         // Parent-child organizational units
  | "product_taxonomy"      // Category → Subcategory → Product → Variant
  | "geographic_rollup"     // Country → Region → City → Location

  // Temporal Patterns
  | "event_sequence"        // Ordered events with durations
  | "time_series"           // Regular measurements over time
  | "cohort_analysis"       // Groups tracked through time periods
  | "period_comparison"     // This period vs previous period

  // Relational Patterns
  | "many_to_many"          // Junction table with attributes
  | "master_detail"         // Parent record with child records
  | "self_referential"      // Hierarchy within single table

  // Resource Patterns
  | "resource_allocation"   // Agents + Objects + Capacity + Utilization
  | "inventory_movement"    // Stock → Transfer → Consume/Replenish
  | "capacity_planning"     // Demand vs Supply over time

  // Funnel Patterns
  | "conversion_funnel"     // Stages with dropoff rates
  | "pipeline_stages"       // Opportunities moving through stages
  | "customer_journey"      // Touchpoints leading to outcome

  // Scoring Patterns
  | "scorecard"             // Multiple metrics against targets
  | "rating_system"         // Entities with ratings/reviews
  | "health_index"          // Composite score from multiple factors

  // Alerting Patterns
  | "threshold_monitoring"  // Values compared against limits
  | "anomaly_detection"     // Deviations from baseline
  | "sla_tracking"          // Performance against service levels;

/**
 * Archetype definition with detection patterns and fragment generators
 */
interface ArchetypeDefinition {
  id: SchemaArchetype;
  name: string;
  description: string;

  // Detection
  patterns: ArchetypePattern[];
  requiredSignals: SignalRequirement[];
  optionalSignals?: SignalRequirement[];
  excludeIf?: SignalRequirement[];

  // Generation
  fragmentGenerators: FragmentGenerator[];

  // Composition
  composesWell: SchemaArchetype[];     // Often appears with
  conflictsWith?: SchemaArchetype[];   // Rarely appears with

  // Metadata
  prevalence: number;                   // 0-1, how common
  industryAgnostic: boolean;            // True for most
}
```

#### 13.13.3 Archetype Detection

Detection uses structural analysis, not machine learning—making it instant and deterministic.

```typescript
/**
 * Archetype detector - runs in <100ms
 */
interface ArchetypeDetector {
  /**
   * Detect all matching archetypes for a schema
   */
  detect(schema: SchemaDefinition): ArchetypeMatch[];

  /**
   * Get detection confidence for specific archetype
   */
  testArchetype(
    schema: SchemaDefinition,
    archetype: SchemaArchetype
  ): ArchetypeMatch | null;
}

interface ArchetypeMatch {
  archetype: SchemaArchetype;
  confidence: number;                   // 0-1
  matchedPatterns: PatternMatch[];
  boundElements: BoundElement[];        // Schema elements mapped to archetype roles
  generatorContext: GeneratorContext;   // Context for fragment generation
}

interface BoundElement {
  role: string;                         // e.g., "agent", "object", "metric", "timestamp"
  element: SchemaElement;               // The matched table/column
  confidence: number;
}

interface GeneratorContext {
  primaryMetric?: BoundElement;
  primaryDimension?: BoundElement;
  temporalField?: BoundElement;
  statusField?: BoundElement;
  agentField?: BoundElement;
  objectField?: BoundElement;
  valueFields: BoundElement[];
  categoryFields: BoundElement[];
}
```

**Detection Patterns:**

```typescript
/**
 * Pattern definitions for each archetype
 */
const ARCHETYPE_PATTERNS: Record<SchemaArchetype, ArchetypePattern[]> = {
  transaction_flow: [
    {
      name: "classic_transaction",
      confidence: 0.95,
      requires: [
        { type: "table", hasColumns: ["amount|total|value", "created_at|date|timestamp"] },
        { type: "foreignKey", to: "user|customer|account" },
      ],
      binds: {
        metric: "amount|total|value",
        timestamp: "created_at|date|timestamp",
        agent: { via: "foreignKey", pattern: "user|customer|account" }
      }
    },
    {
      name: "order_pattern",
      confidence: 0.90,
      requires: [
        { type: "table", nameMatches: "order|transaction|sale|purchase" },
        { type: "column", nameMatches: "total|amount|price|value" }
      ]
    }
  ],

  entity_lifecycle: [
    {
      name: "status_tracking",
      confidence: 0.95,
      requires: [
        { type: "column", nameMatches: "status|state|phase|stage" },
        { type: "column", nameMatches: "created_at|updated_at" }
      ],
      binds: {
        status: "status|state|phase|stage",
        timestamps: ["created_at", "updated_at"]
      }
    }
  ],

  hierarchical_metrics: [
    {
      name: "rollup_structure",
      confidence: 0.90,
      requires: [
        { type: "foreignKey", selfReferential: true },
        { type: "column", isNumeric: true }
      ],
      binds: {
        hierarchy: { via: "selfReferential" },
        metrics: { allNumeric: true }
      }
    },
    {
      name: "parent_child_explicit",
      confidence: 0.85,
      requires: [
        { type: "column", nameMatches: "parent_id|parent|group_id" },
        { type: "column", isNumeric: true }
      ]
    }
  ],

  event_sequence: [
    {
      name: "timestamped_events",
      confidence: 0.90,
      requires: [
        { type: "table", nameMatches: "event|log|activity|action" },
        { type: "column", nameMatches: "timestamp|occurred_at|event_time" },
        { type: "column", nameMatches: "type|event_type|action|name" }
      ],
      binds: {
        timestamp: "timestamp|occurred_at|event_time",
        eventType: "type|event_type|action|name"
      }
    }
  ],

  conversion_funnel: [
    {
      name: "stage_progression",
      confidence: 0.90,
      requires: [
        { type: "column", nameMatches: "stage|step|phase|status" },
        { type: "column", nameMatches: "entered_at|started_at|timestamp" }
      ],
      enhancedBy: [
        { type: "column", nameMatches: "exited_at|completed_at|converted_at" }
      ]
    }
  ],

  time_series: [
    {
      name: "regular_measurements",
      confidence: 0.95,
      requires: [
        { type: "column", isTimestamp: true },
        { type: "column", isNumeric: true, count: { min: 1 } }
      ],
      indicatedBy: [
        { type: "table", nameMatches: "metric|measurement|reading|sample" }
      ]
    }
  ],

  scorecard: [
    {
      name: "metrics_vs_targets",
      confidence: 0.90,
      requires: [
        { type: "column", nameMatches: "target|goal|quota|budget" },
        { type: "column", nameMatches: "actual|current|value" }
      ]
    }
  ],

  threshold_monitoring: [
    {
      name: "limit_checking",
      confidence: 0.85,
      requires: [
        { type: "column", nameMatches: "threshold|limit|min|max|ceiling|floor" },
        { type: "column", isNumeric: true }
      ]
    }
  ]
};

/**
 * Detection algorithm
 */
function detectArchetypes(schema: SchemaDefinition): ArchetypeMatch[] {
  const matches: ArchetypeMatch[] = [];

  for (const [archetype, patterns] of Object.entries(ARCHETYPE_PATTERNS)) {
    for (const pattern of patterns) {
      const match = testPattern(schema, pattern);

      if (match && match.confidence >= 0.7) {
        matches.push({
          archetype: archetype as SchemaArchetype,
          confidence: match.confidence,
          matchedPatterns: [match],
          boundElements: match.bindings,
          generatorContext: buildContext(match.bindings)
        });
        break; // One match per archetype is sufficient
      }
    }
  }

  // Sort by confidence, return top matches
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5); // Schemas rarely match more than 5 archetypes
}
```

#### 13.13.4 Fragment Generators

Each archetype ships with **generator functions**, not static templates. Generators produce fragments customized to the specific schema.

```typescript
/**
 * Fragment generator interface
 */
interface FragmentGenerator {
  id: string;
  archetype: SchemaArchetype;
  layer: "L0" | "L1" | "L2";

  /**
   * Generate fragments from context
   */
  generate(context: GeneratorContext): Fragment[];

  /**
   * Check if generator applies to this context
   */
  appliesTo(context: GeneratorContext): boolean;
}

/**
 * Generator registry
 */
const FRAGMENT_GENERATORS: FragmentGenerator[] = [
  // Transaction Flow Generators
  {
    id: "transaction_overview",
    archetype: "transaction_flow",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.primaryMetric,
    generate: (ctx) => [{
      id: `txn_overview_${ctx.primaryMetric!.element.name}`,
      version: "1.0",
      layer: "L0",
      code: `$overview|h,4,2,2|${ctx.primaryMetric!.element.name}`,
      intents: [
        `${ctx.primaryMetric!.element.name} overview`,
        `total ${ctx.primaryMetric!.element.name}`,
        `${ctx.primaryMetric!.element.name} summary`
      ],
      variables: {
        metric: { type: "field", inferred: ctx.primaryMetric!.element.name }
      },
      metadata: { archetype: "overview", source: "transaction_flow" }
    }]
  },

  {
    id: "transaction_trend",
    archetype: "transaction_flow",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.primaryMetric && !!ctx.temporalField,
    generate: (ctx) => [{
      id: `txn_trend_${ctx.primaryMetric!.element.name}`,
      version: "1.0",
      layer: "L0",
      code: `$trend|f,2,1|${ctx.primaryMetric!.element.name}:${ctx.temporalField!.element.name}`,
      intents: [
        `${ctx.primaryMetric!.element.name} trend`,
        `${ctx.primaryMetric!.element.name} over time`,
        `${ctx.primaryMetric!.element.name} by ${inferGranularity(ctx.temporalField!)}`
      ],
      variables: {
        metric: { type: "field", inferred: ctx.primaryMetric!.element.name },
        temporal: { type: "field", inferred: ctx.temporalField!.element.name }
      },
      metadata: { archetype: "trend", source: "transaction_flow" }
    }]
  },

  {
    id: "transaction_breakdown",
    archetype: "transaction_flow",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.primaryMetric && ctx.categoryFields.length > 0,
    generate: (ctx) => ctx.categoryFields.map(cat => ({
      id: `txn_breakdown_${ctx.primaryMetric!.element.name}_by_${cat.element.name}`,
      version: "1.0",
      layer: "L0",
      code: `$breakdown|f,2,1|${ctx.primaryMetric!.element.name}:${cat.element.name}`,
      intents: [
        `${ctx.primaryMetric!.element.name} by ${cat.element.name}`,
        `${cat.element.name} breakdown`,
        `${ctx.primaryMetric!.element.name} per ${cat.element.name}`
      ],
      variables: {
        metric: { type: "field", inferred: ctx.primaryMetric!.element.name },
        dimension: { type: "field", inferred: cat.element.name }
      },
      metadata: { archetype: "breakdown", source: "transaction_flow" }
    }))
  },

  {
    id: "transaction_top_agents",
    archetype: "transaction_flow",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.primaryMetric && !!ctx.agentField,
    generate: (ctx) => [{
      id: `txn_top_${ctx.agentField!.element.name}`,
      version: "1.0",
      layer: "L0",
      code: `$ranking|f,2,1|${ctx.primaryMetric!.element.name}:${ctx.agentField!.element.name}:10`,
      intents: [
        `top ${pluralize(ctx.agentField!.element.name)}`,
        `best ${pluralize(ctx.agentField!.element.name)}`,
        `${ctx.agentField!.element.name} ranking`
      ],
      variables: {
        metric: { type: "field", inferred: ctx.primaryMetric!.element.name },
        agent: { type: "field", inferred: ctx.agentField!.element.name }
      },
      metadata: { archetype: "ranking", source: "transaction_flow" }
    }]
  },

  // Entity Lifecycle Generators
  {
    id: "lifecycle_status_breakdown",
    archetype: "entity_lifecycle",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.statusField,
    generate: (ctx) => [{
      id: `lifecycle_by_${ctx.statusField!.element.name}`,
      version: "1.0",
      layer: "L0",
      code: `$breakdown|f,2,1|count:${ctx.statusField!.element.name}`,
      intents: [
        `by ${ctx.statusField!.element.name}`,
        `${ctx.statusField!.element.name} breakdown`,
        `status distribution`
      ],
      variables: {
        status: { type: "field", inferred: ctx.statusField!.element.name }
      },
      metadata: { archetype: "breakdown", source: "entity_lifecycle" }
    }]
  },

  {
    id: "lifecycle_aging",
    archetype: "entity_lifecycle",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.statusField && ctx.timestamps.length > 0,
    generate: (ctx) => [{
      id: `lifecycle_aging`,
      version: "1.0",
      layer: "L0",
      code: `$breakdown|f,2,1|age_bucket:${ctx.statusField!.element.name}`,
      intents: [
        "aging analysis",
        "how long in each status",
        "status duration"
      ],
      metadata: { archetype: "breakdown", source: "entity_lifecycle" }
    }]
  },

  // Funnel Generators
  {
    id: "funnel_visualization",
    archetype: "conversion_funnel",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.statusField,
    generate: (ctx) => [{
      id: `funnel_${ctx.statusField!.element.name}`,
      version: "1.0",
      layer: "L0",
      code: `$funnel|f,2,2|${ctx.statusField!.element.name}`,
      intents: [
        "conversion funnel",
        "funnel analysis",
        "stage progression",
        "dropoff analysis"
      ],
      metadata: { archetype: "funnel", source: "conversion_funnel" }
    }]
  },

  // Time Series Generators
  {
    id: "timeseries_chart",
    archetype: "time_series",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.temporalField && ctx.valueFields.length > 0,
    generate: (ctx) => ctx.valueFields.map(val => ({
      id: `ts_${val.element.name}`,
      version: "1.0",
      layer: "L0",
      code: `$trend|f,2,1|${val.element.name}:${ctx.temporalField!.element.name}`,
      intents: [
        `${val.element.name} over time`,
        `${val.element.name} trend`,
        `${val.element.name} history`
      ],
      metadata: { archetype: "trend", source: "time_series" }
    }))
  },

  {
    id: "timeseries_comparison",
    archetype: "time_series",
    layer: "L0",
    appliesTo: (ctx) => !!ctx.temporalField && ctx.valueFields.length > 0,
    generate: (ctx) => [{
      id: `ts_comparison`,
      version: "1.0",
      layer: "L0",
      code: `$comparison|h,2,2,2|period:${ctx.temporalField!.element.name}`,
      intents: [
        "period comparison",
        "this period vs last",
        "year over year",
        "month over month"
      ],
      metadata: { archetype: "comparison", source: "time_series" }
    }]
  },

  // Scorecard Generators
  {
    id: "scorecard_dashboard",
    archetype: "scorecard",
    layer: "L0",
    appliesTo: (ctx) => ctx.valueFields.length >= 2,
    generate: (ctx) => [{
      id: `scorecard`,
      version: "1.0",
      layer: "L0",
      code: `$scorecard|h,${Math.min(ctx.valueFields.length, 6)},1,1|${ctx.valueFields.map(v => v.element.name).join(',')}`,
      intents: [
        "scorecard",
        "KPIs",
        "key metrics",
        "performance dashboard"
      ],
      metadata: { archetype: "scorecard", source: "scorecard" }
    }]
  }
];

/**
 * Generate all fragments for detected archetypes
 */
function generateFragmentsForArchetypes(
  matches: ArchetypeMatch[]
): Fragment[] {
  const fragments: Fragment[] = [];
  const seenIntents = new Set<string>();

  for (const match of matches) {
    const generators = FRAGMENT_GENERATORS.filter(
      g => g.archetype === match.archetype
    );

    for (const generator of generators) {
      if (generator.appliesTo(match.generatorContext)) {
        const generated = generator.generate(match.generatorContext);

        // Deduplicate by intent similarity
        for (const fragment of generated) {
          const dominated = fragment.intents.some(i => seenIntents.has(normalize(i)));
          if (!dominated) {
            fragments.push(fragment);
            fragment.intents.forEach(i => seenIntents.add(normalize(i)));
          }
        }
      }
    }
  }

  return fragments;
}
```

#### 13.13.5 Archetype Composition

Real schemas typically match 2-4 archetypes. The composition system handles overlaps and conflicts.

```typescript
/**
 * Archetype composition rules
 */
interface CompositionRules {
  /**
   * Archetypes that enhance each other
   */
  synergies: ArchetypeSynergy[];

  /**
   * Resolution rules for shared elements
   */
  conflicts: ConflictResolution[];
}

interface ArchetypeSynergy {
  archetypes: [SchemaArchetype, SchemaArchetype];
  enhancement: "additive" | "multiplicative";
  additionalGenerators?: FragmentGenerator[];
}

interface ConflictResolution {
  element: "metric" | "timestamp" | "status" | "agent";
  when: SchemaArchetype[];
  resolution: "first_wins" | "highest_confidence" | "merge" | "duplicate";
}

const COMPOSITION_RULES: CompositionRules = {
  synergies: [
    {
      archetypes: ["transaction_flow", "entity_lifecycle"],
      enhancement: "multiplicative",
      additionalGenerators: [
        // Order lifecycle dashboard combining both
        {
          id: "order_lifecycle_combined",
          archetype: "transaction_flow", // Primary
          layer: "L0",
          appliesTo: () => true,
          generate: (ctx) => [{
            id: "order_lifecycle",
            version: "1.0",
            layer: "L0",
            code: `$overview|h,4,2,2|combined`,
            intents: ["order lifecycle", "order status overview", "fulfillment status"],
            metadata: { archetype: "overview", source: "synergy" }
          }]
        }
      ]
    },
    {
      archetypes: ["transaction_flow", "time_series"],
      enhancement: "multiplicative",
      // Both archetypes' generators apply
    },
    {
      archetypes: ["entity_lifecycle", "conversion_funnel"],
      enhancement: "additive",
      // Lifecycle stages become funnel stages
    }
  ],

  conflicts: [
    {
      element: "metric",
      when: ["transaction_flow", "scorecard"],
      resolution: "highest_confidence"
    },
    {
      element: "timestamp",
      when: ["time_series", "event_sequence"],
      resolution: "merge" // Both get the timestamp
    },
    {
      element: "status",
      when: ["entity_lifecycle", "conversion_funnel"],
      resolution: "duplicate" // Both archetypes use it
    }
  ]
};

/**
 * Compose fragments from multiple archetype matches
 */
function composeArchetypes(matches: ArchetypeMatch[]): ComposedResult {
  // 1. Resolve element conflicts
  const resolvedContext = resolveConflicts(matches, COMPOSITION_RULES.conflicts);

  // 2. Generate base fragments from each archetype
  let fragments = generateFragmentsForArchetypes(
    matches.map(m => ({ ...m, generatorContext: resolvedContext }))
  );

  // 3. Apply synergy generators
  for (const synergy of COMPOSITION_RULES.synergies) {
    const hasArchetypes = synergy.archetypes.every(a =>
      matches.some(m => m.archetype === a)
    );

    if (hasArchetypes && synergy.additionalGenerators) {
      for (const generator of synergy.additionalGenerators) {
        fragments.push(...generator.generate(resolvedContext));
      }
    }
  }

  // 4. Deduplicate
  fragments = deduplicateFragments(fragments);

  return {
    fragments,
    archetypes: matches.map(m => m.archetype),
    synergiesApplied: COMPOSITION_RULES.synergies
      .filter(s => s.archetypes.every(a => matches.some(m => m.archetype === a)))
      .map(s => s.archetypes)
  };
}
```

#### 13.13.6 Terminology Inference

Generators produce fragments with detected field names. Terminology inference improves display labels.

```typescript
/**
 * Terminology inference from schema and context
 */
interface TerminologyInference {
  /**
   * Infer display name for a field
   */
  inferDisplayName(
    field: SchemaElement,
    context: GeneratorContext
  ): string;

  /**
   * Infer plural form
   */
  inferPlural(singular: string): string;

  /**
   * Infer metric direction
   */
  inferDirection(field: SchemaElement): "up_is_good" | "down_is_good" | "neutral";
}

const TERMINOLOGY_PATTERNS: TerminologyPattern[] = [
  // Revenue patterns
  { pattern: /^(revenue|sales|income|earnings)$/i, display: "Revenue", direction: "up_is_good" },
  { pattern: /^(amount|total|sum)$/i, display: "Total", direction: "neutral" },

  // Cost patterns
  { pattern: /^(cost|expense|spend|spending)$/i, display: "Cost", direction: "down_is_good" },
  { pattern: /^(cogs|cost_of_goods)$/i, display: "COGS", direction: "down_is_good" },

  // Count patterns
  { pattern: /^(count|num|number)_?of_?(.+)$/i, display: (m) => `${titleCase(m[2])} Count`, direction: "neutral" },
  { pattern: /^(.+)_count$/i, display: (m) => `${titleCase(m[1])}s`, direction: "neutral" },

  // Rate patterns
  { pattern: /^(.+)_rate$/i, display: (m) => `${titleCase(m[1])} Rate`, direction: "up_is_good" },
  { pattern: /^conversion_rate$/i, display: "Conversion Rate", direction: "up_is_good" },
  { pattern: /^churn_rate$/i, display: "Churn Rate", direction: "down_is_good" },

  // Time patterns
  { pattern: /^(created|updated|deleted)_(at|on|date)$/i, display: (m) => `${titleCase(m[1])} Date`, direction: "neutral" },
  { pattern: /^(start|end)_(date|time)$/i, display: (m) => `${titleCase(m[1])} ${titleCase(m[2])}`, direction: "neutral" },

  // Status patterns
  { pattern: /^(status|state|phase|stage)$/i, display: "Status", direction: "neutral" },

  // Agent patterns
  { pattern: /^(user|customer|client|member)_?id?$/i, display: (m) => titleCase(m[1]), direction: "neutral" },
  { pattern: /^(created|assigned|owned)_by$/i, display: (m) => `${titleCase(m[1])} By`, direction: "neutral" }
];

function inferDisplayName(field: SchemaElement): string {
  const name = field.name;

  // Check patterns
  for (const pattern of TERMINOLOGY_PATTERNS) {
    const match = name.match(pattern.pattern);
    if (match) {
      return typeof pattern.display === 'function'
        ? pattern.display(match)
        : pattern.display;
    }
  }

  // Default: Convert snake_case to Title Case
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
```

#### 13.13.7 Quick Customization Protocol

For remaining edge cases, a progressive disclosure customization layer:

```typescript
/**
 * Quick customization protocol - optional, never required
 */
interface QuickCustomization {
  /**
   * Tier 1: Automatic (no user input)
   * - Archetype detection
   * - Fragment generation
   * - Terminology inference
   * Result: 90%+ coverage
   */
  tier1(): Promise<DiscoveryResult>;

  /**
   * Tier 2: 5-minute refinement
   * - Confirm key metric
   * - Confirm time periods
   * - Confirm terminology preferences
   * Result: 95%+ coverage
   */
  tier2(result: DiscoveryResult): Promise<RefinementSession>;

  /**
   * Tier 3: Deep customization (optional)
   * - Full 7-perspective onboarding
   * - Custom archetype additions
   * - Advanced configurations
   * Result: 99%+ coverage
   */
  tier3(result: DiscoveryResult): Promise<EnhancedDiscoveryResult>;
}

interface RefinementSession {
  questions: RefinementQuestion[];
  apply(answers: Map<string, any>): Promise<DiscoveryResult>;
}

interface RefinementQuestion {
  id: string;
  question: string;
  type: "confirm" | "select" | "text";
  context: string;                      // Why we're asking
  default?: any;                        // Pre-filled from inference
  options?: string[];                   // For select type
  impact: "high" | "medium" | "low";    // How much this affects coverage
}

/**
 * Standard Tier 2 questions
 */
const TIER_2_QUESTIONS: (ctx: GeneratorContext) => RefinementQuestion[] = (ctx) => [
  {
    id: "primary_metric",
    question: "What is your main success metric?",
    type: "select",
    context: "This determines which KPIs appear first",
    default: ctx.primaryMetric?.element.name,
    options: ctx.valueFields.map(v => v.element.name),
    impact: "high"
  },
  {
    id: "time_periods",
    question: "What time comparisons matter most?",
    type: "select",
    context: "This affects period-over-period comparisons",
    default: "month",
    options: ["day", "week", "month", "quarter", "year"],
    impact: "medium"
  },
  {
    id: "terminology",
    question: `Should "${ctx.primaryMetric?.element.name}" be displayed as...`,
    type: "select",
    context: "This affects labels throughout dashboards",
    default: inferDisplayName(ctx.primaryMetric!.element),
    options: [
      inferDisplayName(ctx.primaryMetric!.element),
      "Revenue",
      "Sales",
      "Income",
      "Custom..."
    ],
    impact: "low"
  }
];
```

#### 13.13.8 Conformance

Implementations of the Schema Archetype System MUST:

1. Implement detection for at least 10 core archetypes:
   - `transaction_flow`
   - `entity_lifecycle`
   - `hierarchical_metrics`
   - `event_sequence`
   - `time_series`
   - `conversion_funnel`
   - `scorecard`
   - `many_to_many`
   - `master_detail`
   - `threshold_monitoring`

2. Complete archetype detection in <100ms

3. Generate at least 3 fragments per matched archetype

4. Support archetype composition for multi-archetype schemas

5. Provide terminology inference for field display names

Implementations SHOULD:

1. Implement all 25+ archetypes defined in 13.13.2
2. Provide Tier 2 quick customization
3. Support custom archetype definitions
4. Track archetype detection accuracy for continuous improvement

#### 13.13.9 Performance Targets

| Metric | Target |
|--------|--------|
| Archetype detection time | <100ms |
| Fragments per archetype | 10-15 |
| Typical archetypes per schema | 2-4 |
| Coverage from archetypes alone | >85% |
| Coverage after Tier 2 | >95% |

---

## 14. Request Scope and Signal System

This section defines the **Request Scope** system for multi-granularity generation and the **Signal System** for inter-component reactivity.

### 14.1 Design Principles

The Liquid Engine operates on three fundamental primitives that appear in all reactive UI systems:

| Primitive | Purpose | Our Term |
|-----------|---------|----------|
| **Component** | Atomic rendering unit | Block |
| **Composition** | Nesting capability | Slot |
| **State Flow** | Inter-component reactivity | Signal |

**Key insight:** A filter doesn't "affect" a table. They both react to a shared signal. This is loose coupling through named channels.

### 14.2 Request Scope

The engine accepts requests at two granularities:

```typescript
/**
 * Request scope - what granularity is being requested
 */
type RequestScope = "interface" | "block";
```

| Scope | Description | Use Case |
|-------|-------------|----------|
| `interface` | Multiple blocks with layout and signals | Full dashboard, page, screen |
| `block` | Single block (may have slots) | Embedded component, widget |

**Why only two scopes?**

- A "container" is just a Block with `slots` and no `binding`
- A "fragment" is just a Block used inside another Block
- The engine processes them identically—the distinction is semantic, not structural

```typescript
/**
 * Liquid Engine Request
 */
interface LiquidRequest {
  // What granularity?
  scope: RequestScope;

  // What does the user want?
  intent: string | StructuredIntent;

  // What data context?
  data: ParsedData | DataReference;

  // What constraints apply?
  constraints?: ScopeConstraints;

  // Where will this be embedded?
  embedding?: EmbeddingContext;
}

interface ScopeConstraints {
  // Layout constraints
  maxWidth?: number;
  maxHeight?: number;
  layout?: "horizontal" | "vertical" | "grid" | "free";

  // Content constraints
  maxBlocks?: number;
  allowedTypes?: BlockType[];
  excludedTypes?: BlockType[];

  // Behavioral constraints
  interactive?: boolean;
  animated?: boolean;
}

interface EmbeddingContext {
  // Platform context
  platform: "web" | "mobile" | "desktop" | "email" | "pdf";

  // Parent scope (for nested requests)
  parentScope?: RequestScope;

  // Theme context
  theme?: ThemeTokens;

  // Accessibility requirements
  a11y?: A11yRequirements;
}
```

### 14.3 Block Architecture

Blocks are the universal primitive. Every element in a LiquidSchema is a Block.

```typescript
/**
 * Block - the universal primitive
 */
interface Block {
  id: string;
  type: BlockType;

  // DATA BINDING (optional)
  // Present for data-connected blocks (charts, tables, KPIs)
  // Absent for layout blocks (grid, stack, tabs)
  binding?: DataBinding;

  // COMPOSITION (optional)
  // Present for container blocks (grid, stack, card)
  // Absent for atomic blocks (kpi, simple chart)
  slots?: Record<string, Block[]>;

  // SIGNALS (optional)
  // Present for interactive or reactive blocks
  signals?: SignalConnections;

  // METADATA
  explain?: Explainability;
  constraints?: RenderConstraints;
  warnings?: string[];
}
```

**Block Categories:**

| Category | Has Binding | Has Slots | Has Signals | Examples |
|----------|-------------|-----------|-------------|----------|
| **Layout** | No | Yes | Maybe | grid, stack, tabs, accordion |
| **Atomic Data** | Yes | No | Receives | kpi, chart, table, metric |
| **Interactive** | Maybe | No | Emits | filter, search, picker, toggle |
| **Composite** | Yes | Yes | Both | dashboard-widget, card-with-filter |

### 14.4 Signal System

Signals enable reactive connections between blocks without tight coupling.

```typescript
/**
 * Signal Registry - declared at interface level
 */
interface SignalRegistry {
  [signalName: string]: SignalDefinition;
}

interface SignalDefinition {
  // Type of the signal value
  type: SignalType;

  // Default value
  default?: any;

  // Optional description
  description?: string;

  // Persistence strategy
  persist?: "none" | "url" | "session" | "local";
}

type SignalType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "dateRange"
  | "array"
  | "object"
  | { enum: string[] };

/**
 * Signal Connections - declared at block level
 */
interface SignalConnections {
  // Signals this block EMITS
  emits?: SignalEmission[];

  // Signals this block RECEIVES
  receives?: SignalReception[];
}

interface SignalEmission {
  // Signal name (must exist in registry)
  signal: string;

  // What triggers emission
  trigger: TriggerType;

  // Optional value transformation
  transform?: TransformExpression;
}

interface SignalReception {
  // Signal name (must exist in registry)
  signal: string;

  // What property is affected
  target: BindingPath;

  // Optional value transformation
  transform?: TransformExpression;
}

type TriggerType =
  | "onChange"      // Value changed
  | "onSelect"      // Item selected
  | "onSubmit"      // Form submitted
  | "onHover"       // Hover state
  | "onClick"       // Click event
  | "onFilter"      // Filter applied
  | "onSort"        // Sort changed
  | "onPage";       // Pagination changed

type BindingPath = string; // e.g., "binding.filter[0].value"
type TransformExpression = string; // e.g., "value.toUpperCase()"
```

### 14.5 Complete Schema Structure

```typescript
/**
 * LiquidSchema - complete interface specification
 */
interface LiquidSchema {
  version: "1.0";
  id: string;

  // SCOPE
  scope: RequestScope;
  standalone: boolean;  // Can render without parent?

  // CONTENT (optional for block scope)
  title?: string;
  description?: string;

  // SIGNALS (interface scope only)
  signals?: SignalRegistry;

  // LAYOUT (interface scope only, or block with slots)
  layout?: LayoutBlock;

  // BLOCKS
  blocks: Block[];

  // EMBEDDING HINTS
  embedding?: {
    minWidth?: number;
    minHeight?: number;
    aspectRatio?: string;
    overflow?: "scroll" | "clip" | "visible";
  };

  // METADATA
  generatedAt: string;
  explainability?: SchemaExplainability;
}
```

### 14.6 Signal Flow Example

```typescript
const dashboardSchema: LiquidSchema = {
  version: "1.0",
  id: "sales-dashboard",
  scope: "interface",
  standalone: true,
  title: "Sales Dashboard",

  // SIGNAL REGISTRY
  signals: {
    "@dateRange": {
      type: "dateRange",
      default: { start: "2024-01-01", end: "2024-12-31" },
      persist: "url"
    },
    "@selectedRegion": {
      type: { enum: ["North", "South", "East", "West"] },
      default: null,
      persist: "session"
    },
    "@searchQuery": {
      type: "string",
      default: "",
      persist: "none"
    }
  },

  layout: {
    type: "grid",
    columns: 12,
    slots: {
      header: ["date-filter", "search-box"],
      sidebar: ["region-chart"],
      main: ["revenue-kpi", "revenue-chart", "sales-table"]
    }
  },

  blocks: [
    // FILTER - emits @dateRange
    {
      id: "date-filter",
      type: "date-range-picker",
      signals: {
        emits: [
          { signal: "@dateRange", trigger: "onChange" }
        ]
      }
    },

    // SEARCH - emits @searchQuery
    {
      id: "search-box",
      type: "search-input",
      signals: {
        emits: [
          { signal: "@searchQuery", trigger: "onChange" }
        ]
      }
    },

    // KPI - receives @dateRange
    {
      id: "revenue-kpi",
      type: "kpi",
      binding: {
        source: "sales",
        field: "revenue",
        aggregate: "sum",
        filter: [
          { field: "date", op: "between", value: "@dateRange" }
        ]
      },
      signals: {
        receives: [
          { signal: "@dateRange", target: "binding.filter[0].value" }
        ]
      }
    },

    // CHART - receives @dateRange
    {
      id: "revenue-chart",
      type: "line-chart",
      binding: {
        source: "sales",
        field: "revenue",
        groupBy: ["date"],
        filter: [
          { field: "date", op: "between", value: "@dateRange" }
        ]
      },
      signals: {
        receives: [
          { signal: "@dateRange", target: "binding.filter[0].value" }
        ]
      }
    },

    // PIE CHART - receives @dateRange, emits @selectedRegion
    {
      id: "region-chart",
      type: "pie-chart",
      binding: {
        source: "sales",
        field: "revenue",
        groupBy: ["region"],
        filter: [
          { field: "date", op: "between", value: "@dateRange" }
        ]
      },
      signals: {
        receives: [
          { signal: "@dateRange", target: "binding.filter[0].value" }
        ],
        emits: [
          { signal: "@selectedRegion", trigger: "onSelect" }
        ]
      }
    },

    // TABLE - receives @dateRange, @selectedRegion, @searchQuery
    {
      id: "sales-table",
      type: "data-table",
      binding: {
        source: "sales",
        columns: ["date", "product", "region", "revenue"],
        filter: [
          { field: "date", op: "between", value: "@dateRange" },
          { field: "region", op: "eq", value: "@selectedRegion" },
          { field: "product", op: "contains", value: "@searchQuery" }
        ],
        sort: [{ field: "date", order: "desc" }]
      },
      signals: {
        receives: [
          { signal: "@dateRange", target: "binding.filter[0].value" },
          { signal: "@selectedRegion", target: "binding.filter[1].value" },
          { signal: "@searchQuery", target: "binding.filter[2].value" }
        ]
      }
    }
  ],

  generatedAt: "2024-12-21T00:00:00Z"
};
```

### 14.7 LiquidCode Signal Syntax

Signals are encoded in LiquidCode using the `@` prefix:

```
# Signal declarations (in interface header)
$dashboard|h,12[
  @dateRange:dateRange=2024-01-01..2024-12-31,
  @region:enum[North,South,East,West],
  @search:string
]|...

# Signal connections (in block definitions)
filter:date>@dateRange           # Emits @dateRange
kpi:revenue<@dateRange           # Receives @dateRange
pie:revenue:region<@dateRange>@region    # Receives and emits
table:sales<@dateRange<@region<@search   # Receives multiple
```

**Syntax:**
- `[...]` after archetype = signal declarations
- `>@signal` = emits signal
- `<@signal` = receives signal
- `<@sig1<@sig2` = receives multiple signals

### 14.8 Adapter Implementation

The engine produces schemas with signal declarations. Adapters implement the reactivity mechanism:

```typescript
/**
 * Adapter signal implementation interface
 */
interface SignalAdapter<T> {
  /**
   * Initialize signal store from registry
   */
  initializeSignals(registry: SignalRegistry): SignalStore;

  /**
   * Create emit handler for a block
   */
  createEmitHandler(
    emission: SignalEmission,
    store: SignalStore
  ): EventHandler;

  /**
   * Subscribe block to signal changes
   */
  subscribeToSignals(
    receptions: SignalReception[],
    store: SignalStore,
    onUpdate: (updates: Record<string, any>) => void
  ): Unsubscribe;

  /**
   * Persist signals according to strategy
   */
  persistSignals(
    registry: SignalRegistry,
    values: Record<string, any>
  ): void;

  /**
   * Restore signals from persistence
   */
  restoreSignals(
    registry: SignalRegistry
  ): Record<string, any>;
}

/**
 * React adapter example
 */
function useLiquidSignals(schema: LiquidSchema) {
  // Initialize from registry + persistence
  const [signals, setSignals] = useState(() => {
    const initial = initializeDefaults(schema.signals);
    const persisted = restoreFromPersistence(schema.signals);
    return { ...initial, ...persisted };
  });

  // Emit function
  const emit = useCallback((name: string, value: any) => {
    setSignals(prev => {
      const next = { ...prev, [name]: value };
      persistSignals(schema.signals, next);
      return next;
    });
  }, [schema.signals]);

  // Subscribe hook for blocks
  const useSignal = (name: string) => signals[name];

  return { signals, emit, useSignal };
}
```

### 14.9 Signal Validation

The engine validates signal connections at compile time:

```typescript
interface SignalValidation {
  /**
   * Validate all signal references exist in registry
   */
  validateReferences(schema: LiquidSchema): ValidationResult;

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(schema: LiquidSchema): CircularDependency[];

  /**
   * Check type compatibility between emissions and receptions
   */
  validateTypeCompatibility(schema: LiquidSchema): TypeMismatch[];
}

// Validation errors
interface CircularDependency {
  cycle: string[];  // Block IDs in the cycle
  signal: string;   // Signal causing the cycle
}

interface TypeMismatch {
  signal: string;
  expected: SignalType;
  received: string;  // Path that receives wrong type
}
```

### 14.10 Scope Behavior Matrix

| Aspect | Interface Scope | Block Scope |
|--------|-----------------|-------------|
| Signal Registry | Yes (declares signals) | No (inherits from parent) |
| Layout | Yes (grid, columns) | Optional (if has slots) |
| Multiple Blocks | Yes | No (single root block) |
| Standalone | Yes | Depends on signals needed |
| Archetype Detection | Full | Single archetype |
| Fragment Cache | Full library | Single fragment |
| Explainability | Full | Block-level |

### 14.11 Conformance

Implementations supporting the Request Scope and Signal System MUST:

1. Accept both `interface` and `block` scope requests
2. Validate signal references at compile time
3. Detect circular signal dependencies
4. Include signals in schema output
5. Document adapter signal implementation requirements

Implementations SHOULD:

1. Support all trigger types
2. Implement signal persistence strategies
3. Provide signal debugging tools
4. Support signal transformations
5. Optimize re-renders for signal changes

### 14.12 Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Cascade re-renders | Targeted subscriptions, memoization |
| Signal storms | Debouncing, batching |
| Memory leaks | Automatic unsubscription on unmount |
| Circular updates | Cycle detection at compile time |
| Large signal values | Reference passing, not value copying |

---

## Appendix A: Reserved Symbols

The following symbols are reserved and MUST NOT be used for custom meanings:

```
Structural:  : | , ; [ ] { } ( )
Operators:   $ # @ ^ _ ! % + - ~ .
Quotes:      ' " `
Escape:      \
```

## Appendix B: Token Efficiency Reference

| Encoding | Tokens | Compression vs JSON |
|----------|--------|---------------------|
| Full JSON dashboard | 4,000 | 1x |
| Flat LiquidCode | 35 | 114x |
| Hierarchical LiquidCode | 35 (but parallel) | 114x + parallelism |

## Appendix C: Error Codes

| Code | Meaning |
|------|---------|
| LC001 | Invalid archetype |
| LC002 | Invalid zone count |
| LC003 | Unknown component type |
| LC004 | Invalid field reference |
| LC005 | Malformed binding |
| LC006 | Layer dependency violation |
| LC007 | Constraint validation failure |
| LC008 | Compilation error |
| LC009 | Timeout exceeded |
| LC010 | Cache error |

---

**End of Specification**

*LiquidCode Specification v1.0.0 - Draft*
