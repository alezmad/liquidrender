---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - '.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md'
  - '.mydocs/liquidcode/LIQUIDCODE-RATIONALE-v2.md'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 2
workflowType: 'prd'
lastStep: 11
project_name: 'Liquid Engine v2'
user_name: 'Liquid Engine Core Team'
date: '2025-12-21'
status: 'Ready for Implementation'
---

# Product Requirements Document - Liquid Engine v2

**Author:** Liquid Engine Core Team
**Date:** 2025-12-21
**Status:** Ready for Implementation

---

## Executive Summary

Liquid Engine is a **platform-agnostic runtime** that transforms natural language intent into validated, renderable interface schemas. It is the core technology that powers LiquidRender and can be licensed to power any intent-to-interface application.

**Core Promise:** Any intent, any platform, instant interface. The engine that makes AI-generated UIs reliable, fast, and cheap.

### The Paradigm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              LIQUID ENGINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INTENT (natural language) ─────────────────────────────────────────┐   │
│                                                                      │   │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐    │   │
│  │   DISCOVERY     │──▶│   RESOLUTION    │──▶│   LIQUIDCODE    │    │   │
│  │   LAYER         │   │   LAYER         │   │   LAYER         │    │   │
│  │                 │   │                 │   │                 │    │   │
│  │ • Fingerprint   │   │ • Cache (40%)   │   │ • 3-layer       │    │   │
│  │ • Archetypes    │   │ • Search (50%)  │   │   hierarchy     │    │   │
│  │ • Predictions   │   │ • Compose (9%)  │   │ • 35 tokens     │    │   │
│  │ • Suggestions   │   │ • LLM (1%)      │   │ • Interface     │    │   │
│  │   (soft)        │   │                 │   │   algebra       │    │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘    │   │
│                                                      │               │   │
│                              ┌────────────────────────               │   │
│                              ▼                                       │   │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐    │   │
│  │   LIQUIDSCHEMA  │──▶│   STATE LAYER   │──▶│   ADAPTER       │    │   │
│  │   LAYER         │   │                 │   │   INTERFACE     │    │   │
│  │                 │   │ • Digital Twin  │   │                 │    │   │
│  │ • Zod validated │   │ • Op History    │   │ • React         │    │   │
│  │ • Block + Slot  │   │ • Undo/Redo     │   │ • React Native  │    │   │
│  │   + Signal      │   │ • Snapshots     │   │ • Qt, Python... │    │   │
│  │ • Platform-     │   │                 │   │                 │    │   │
│  │   agnostic      │   │                 │   │                 │    │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘    │   │
│                                                      │               │   │
│                              ────────────────────────┘               │   │
│                                                                      │   │
│  RENDERED INTERFACE (any platform) ◀────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**The innovation:** AI generates minimal DECISIONS (35 tokens), not complete CODE (4,000 tokens). Deterministic compilation expands decisions to validated schemas. Interfaces never break.

### What Makes This Special

1. **114x token reduction** — LiquidCode encoding reduces LLM output from 4,000 tokens to 35, cutting latency by 97% and cost by 99.7%
2. **99% cache hit rate** — Tiered resolution (cache → semantic search → composition → LLM) means 99% of queries never touch the LLM
3. **Never-broken guarantee** — 100% of validated schemas render successfully; no runtime UI errors
4. **Interface algebra** — Not just generation: mutate (Δ), query (?), undo/redo with full operation history
5. **Three primitives** — Block + Slot + Signal express any interface interaction; no fourth needed
6. **Soft constraints** — Binding suggestions guide, never block; user intent always wins
7. **Platform-agnostic** — Same schema renders on React, React Native, Qt, Python, or any adapter
8. **Digital twin** — Authoritative state with full history, snapshots, and derivation tracking

---

## Project Classification

**Technical Type:** Developer Tool (npm packages)
**Secondary Type:** Runtime Engine / SDK
**Domain:** General (horizontal platform)
**Complexity:** High
**Project Context:** Greenfield, extracted and evolved from LiquidRender v1 architecture

### Architecture Position

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           APPLICATIONS                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  LiquidRender   │  │  3rd Party      │  │  Enterprise     │          │
│  │  (Product)      │  │  Apps           │  │  Licenses       │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
└───────────┼─────────────────────┼───────────────────┼────────────────────┘
            │                     │                   │
            ▼                     ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM ADAPTERS                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │ @liquid-engine  │  │ @liquid-engine  │  │ @liquid-engine  │          │
│  │ /react          │  │ /react-native   │  │ /python         │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
└───────────┼─────────────────────┼───────────────────┼────────────────────┘
            │                     │                   │
            └──────────────┬──────┴───────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     LIQUID ENGINE (THIS PRD)                             │
│                     @liquid-engine/core                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ /discovery │ /resolution │ /liquidcode │ /schema │ /state │ /adapter││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

### User Success

**The "It Just Works" Moment:**

A developer integrates Liquid Engine, passes data and an intent, and receives a working dashboard in 200ms instead of 10 seconds. They mutate a block with 4 tokens instead of regenerating 4,000. They switch from React to React Native and the same schema just works.

**User Success Indicators:**

| Indicator | Metric | Target |
|-----------|--------|--------|
| Time to integration | First working render | <30 minutes |
| Token efficiency | Tokens per generation | <50 average |
| Mutation efficiency | Tokens per mutation | <10 average |
| Reliability | Valid schema → successful render | 100% |
| Platform portability | Same schema, different adapters | 100% identical |

**What "Success" Means:**

| Persona | Success Statement | Observable Behavior |
|---------|-------------------|---------------------|
| **Alex: App Developer** | "My AI features are 100x faster and 99% cheaper" | Migrates from raw JSON generation |
| **Sam: Platform Builder** | "I built a dashboard tool in a weekend" | Ships product using Liquid Engine |
| **Jamie: OSS Contributor** | "I wrote a Flutter adapter in 2 days" | Community adapter published |

### Business Success

**6-Month Launch Targets:**

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| npm weekly downloads | 5,000+ | Adoption signal |
| GitHub stars | 1,000+ | Community interest |
| Production integrations | 20+ | Real-world validation |
| Community adapters | 3+ | Ecosystem growth |
| Enterprise inquiries | 5+ | Revenue potential |
| Documentation score | >4.5/5 | Developer experience |

**Decision Points:**

| Outcome | Signal | Action |
|---------|--------|--------|
| 5/6 targets hit | Strong PMF | Proceed to commercial licensing |
| 3-4/6 targets hit | Good traction | Focus on developer experience |
| <3/6 targets hit | Adoption barrier | Investigate friction points |

### Technical Success

**Core Technical Requirements:**

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Token reduction | 100x+ | LiquidCode tokens / equivalent JSON |
| Cache hit rate | >90% | Cached responses / total queries |
| Generation latency | <100ms p95 | Cache hit response time |
| Compilation latency | <5ms | LiquidCode → LiquidSchema |
| Validation rate | 100% | All generated schemas pass Zod |
| Render success | 100% | Valid schema → successful render |
| Adapter conformance | 100% | All adapters pass test suite |

### Measurable Outcomes

**North Star Metric: Schemas Generated Per Day**

Why this metric:
- Shows real usage, not just downloads
- Indicates integration depth
- Drives all other metrics (if schemas generated, engine is working)
- Measurable via telemetry (opt-in)

**Metrics Definitions:**

| Metric | Definition | Target |
|--------|------------|--------|
| Schemas/day | Unique schemas generated (hash-based) | 10,000+ at 6 months |
| Cache efficiency | 1 - (LLM calls / total requests) | >99% |
| Mutation ratio | Mutations / (mutations + generations) | >50% |
| Adapter coverage | Block types rendered correctly | 100% |

---

## Product Scope

### Phase 1 Scope: IN/OUT (LOCKED)

#### IN SCOPE - Phase 1

| Feature | Priority | Description |
|---------|----------|-------------|
| LiquidCode compiler | P0 | Token-minimal encoding → LiquidSchema |
| Three-layer hierarchy | P0 | L0 Structure, L1 Content, L2 Polish |
| Interface algebra | P0 | Generate (#), Mutate (Δ), Query (?) modes |
| Operation primitives | P0 | Add (+), Remove (-), Replace (→), Modify (~), Move (↑) |
| Block addressing | P0 | Position-derived identity (@ordinal, @type, @grid) |
| LiquidSchema types | P0 | Zod-validated schema specification |
| Three primitives | P0 | Block + Slot + Signal system |
| 13 block types | P0 | Core block catalog (see Block Types section) |
| Binding system | P0 | Soft-constraint suggestions, never hard filters |
| Signal system | P0 | Typed channels with emit/receive/persist |
| Schema validator | P0 | 100% validation before render |
| Adapter interface | P0 | Contract for platform renderers |
| Digital twin | P0 | Authoritative state management |
| Operation history | P0 | Full undo/redo stack |
| Discovery engine | P1 | Schema fingerprinting, archetype detection |
| Tiered resolution | P1 | Cache → Search → Compose → LLM hierarchy |
| Fragment cache | P1 | In-memory + pluggable storage |
| Archetype detection | P1 | Pattern recognition (<100ms) |
| Primitive inference | P1 | UOM-based data understanding |
| Intent prediction | P1 | Primitives → predicted intents |
| React adapter | P1 | Reference implementation |
| Conformance tests | P1 | Adapter validation suite |
| Snapshot addressing | P2 | Reference historical states |
| Source propagation | P2 | Derivation tracking |
| Micro-LLM calls | P2 | Targeted generation for single blocks |
| Explainability layer | P2 | Trust metadata in schemas |

#### OUT OF SCOPE - Phase 1

| Feature | Phase | Reason |
|---------|-------|--------|
| React Native adapter | 2 | Need React reference first |
| Python adapter | 2 | Community contribution target |
| Qt adapter | 3 | Enterprise feature |
| Multi-modal input | Future | Voice/image mockups |
| Continuous learning | Future | Per-user personalization |
| Visual editor | Never | Engine is headless by design |

**Phase 1 Principle:** Build the complete engine core with one reference adapter. Prove the architecture before expanding platform coverage.

### MVP - Minimum Viable Product

Core capabilities that must work for MVP:

1. **LiquidCode Compilation** — Token-minimal encoding compiles to valid LiquidSchema
2. **Interface Algebra** — Generate, mutate, and query interfaces
3. **Tiered Resolution** — Cache hits for 90%+ of requests
4. **Signal System** — Interactive interfaces with emit/receive
5. **React Adapter** — Reference implementation proving the contract
6. **Digital Twin** — State management with undo/redo

### Growth Features (Post-MVP)

**Phase 2: Platform Expansion**
- React Native adapter
- Python adapter (matplotlib, tkinter)
- Semantic search integration (vector store)
- Fragment composition engine
- Cache warming strategies

**Phase 3: Enterprise**
- Qt adapter for desktop
- Custom adapter SDK
- Multi-tenant fragment storage
- Usage analytics
- SLA guarantees

### Vision (Future)

**Phase 4+: Ecosystem**
- Community adapter marketplace
- LiquidCode language extensions
- Multi-modal input (image, voice)
- Continuous learning from corrections
- Industry standardization

**12-Month Vision:**
- 50,000+ npm weekly downloads
- 10+ platform adapters (3+ community)
- 100+ production integrations
- Enterprise licensing revenue
- Open specification process started

---

## User Journeys

### Journey 1: Alex Chen - The Integration (Primary Success Path)

Alex is a senior frontend developer at a fintech startup. They've been asked to add an "AI dashboard" feature to their React app. Users should be able to describe what they want in natural language and see it instantly.

Alex has tried this before with raw LLM JSON generation. It was slow (8-10 seconds), expensive ($0.06 per generation), and broken 20% of the time. Users complained. The feature was shelved.

Then Alex discovers Liquid Engine on Hacker News. The README claims "35 tokens instead of 4,000" and "100ms instead of 10 seconds." Skeptical but intrigued, they run `npm install @liquid-engine/core @liquid-engine/react`.

Following the quickstart, Alex writes:

```typescript
import { LiquidEngine } from '@liquid-engine/core';
import { ReactAdapter } from '@liquid-engine/react';

const engine = new LiquidEngine();
const adapter = new ReactAdapter();

// User's data
const data = { columns: [...], rows: [...] };
const intent = "Show me revenue trends with comparison to last period";

// Generate interface
const liquidCode = await engine.resolve(data, intent);
const schema = engine.compile(liquidCode);
const dashboard = adapter.render(schema, data);
```

The first call takes 300ms—cold cache. Alex refreshes. 50ms. Again. 45ms. The cache is working.

Alex tries a mutation: `Δ→@L0:bar-chart`. The line chart becomes a bar chart in 15ms. No regeneration.

"This is actually going to work."

Alex ships the feature. Users love it. Generation is instant. Costs drop from $0.06 to $0.0005 per query. Error rate: zero.

**Requirements Revealed:**
- Simple npm installation
- Clear TypeScript API with good types
- Engine + Adapter separation
- resolve() for intent → LiquidCode
- compile() for LiquidCode → LiquidSchema
- render() for schema → React components
- Sub-100ms cached response
- Mutation support for modifications

---

### Journey 2: Alex Debugging - The Error Path

A week after launch, Alex gets a bug report: "Dashboard shows wrong chart type for time data."

Alex opens the debugging tools:

```typescript
const result = await engine.resolve(data, intent, { debug: true });

console.log(result.resolution);
// {
//   tier: 'semantic',
//   similarity: 0.87,
//   adaptations: [{ layer: 'L1', change: 'type', from: 'bar', to: 'line' }],
//   source: 'fragment:sales_overview_v2'
// }

console.log(result.bindings);
// [
//   { field: 'date', slot: 'x', score: 0.95, signals: [...] },
//   { field: 'revenue', slot: 'y', score: 0.88, signals: [...] }
// ]
```

Alex sees the problem: the semantic search matched a fragment that expected quarterly data, but the user has daily data. The adaptation didn't catch it.

Alex adds a correction:

```typescript
engine.corrections.add({
  pattern: { dataType: 'daily', archetype: 'time_series' },
  preference: { chartType: 'line', aggregation: 'none' }
});
```

The engine learns. Future requests with daily time data use line charts.

**Requirements Revealed:**
- Debug mode showing resolution path
- Binding scores exposed for inspection
- Source tracking (where did this come from?)
- Correction API for feedback learning
- Pattern-based preferences

---

### Journey 3: Sam Park - The Platform Builder

Sam is building a no-code dashboard tool for small businesses. They don't want to build chart rendering or AI prompting from scratch. They want to focus on their UX.

Sam evaluates options:
- Raw LLM: Too slow, too expensive, too unreliable
- Chart libraries: No AI, have to build everything
- Existing dashboard tools: Locked-in, can't customize

Then Sam finds Liquid Engine. It's a building block, not a product.

Sam's architecture:

```
User → Sam's UI → Liquid Engine → Sam's React Components
```

Sam uses the engine for intent processing:

```typescript
const engine = new LiquidEngine({
  cache: new RedisFragmentStorage(redis),
  llm: new AnthropicProvider(apiKey)
});

// Warm cache on data upload
const fingerprint = engine.discovery.fingerprint(userData);
const predictions = engine.discovery.predict(fingerprint);
await engine.cache.warm(predictions);

// User request (cache hit)
const schema = await engine.generate(intent, { data: userData });
```

For rendering, Sam uses their own components:

```typescript
class SamAdapter implements LiquidAdapter<ReactElement> {
  render(schema, data) {
    // Sam's branded components
  }
}
```

Sam ships in 3 weeks instead of 3 months. Their users don't know Liquid Engine exists. They just know dashboards appear instantly.

**Requirements Revealed:**
- Pluggable storage for cache (Redis, etc.)
- Pluggable LLM provider
- Discovery API for fingerprinting and prediction
- Cache warming API
- Adapter interface for custom renderers
- Clear separation of engine and rendering

---

### Journey 4: Jamie Torres - The Contributor

Jamie is a Flutter developer who wants to bring Liquid Engine to mobile. They read the contribution docs.

The adapter interface is clean:

```typescript
interface LiquidAdapter<T> {
  render(schema: LiquidSchema, data: any): T;
  renderBlock(block: Block, data: any): T;
  supports(blockType: BlockType): boolean;
  renderPlaceholder(block: Block, reason: string): T;
  createSignalRuntime(registry: SignalRegistry): SignalRuntime;
  readonly metadata: AdapterMetadata;
}
```

Jamie creates `@liquid-engine/flutter`:

```dart
class FlutterAdapter implements LiquidAdapter<Widget> {
  @override
  Widget render(LiquidSchema schema, dynamic data) {
    return Column(
      children: schema.blocks.map((b) => renderBlock(b, data)).toList()
    );
  }
  // ...
}
```

Jamie runs the conformance tests:

```bash
npx @liquid-engine/conformance test ./flutter-adapter
# ✓ 47/47 tests passed
# ✓ All block types rendered
# ✓ Signal propagation working
# ✓ Placeholder fallback verified
```

Jamie publishes. The community celebrates. Flutter developers can now use Liquid Engine.

**Requirements Revealed:**
- Clear adapter interface contract
- Language-agnostic interface (TypeScript, Dart, Python, etc.)
- Conformance test suite
- Contribution documentation
- npm/pub package publishing support

---

### Journey 5: Enterprise Pilot - The Evaluation

A Fortune 500 company is evaluating Liquid Engine for their internal analytics platform. They need:
- 10M+ queries per day capacity
- 99.9% uptime SLA
- Data residency compliance
- Custom block types

Their architect runs benchmarks:

```
Queries/second: 50,000 (cache hits)
Cache hit rate: 99.2%
LLM fallback rate: 0.8%
P99 latency: 85ms
```

They integrate with their existing infrastructure:

```typescript
const engine = new LiquidEngine({
  cache: new S3FragmentStorage({ bucket: 'analytics-cache', region: 'eu-west-1' }),
  llm: new AzureOpenAIProvider({ endpoint: '...' }),
  telemetry: new DatadogTelemetry()
});
```

They add custom block types:

```typescript
engine.catalog.register({
  type: 'compliance-table',
  category: 'composite',
  bindings: [...],
  signals: [...]
});
```

The pilot succeeds. They sign an enterprise license.

**Requirements Revealed:**
- Horizontal scalability (stateless engine)
- Pluggable everything (cache, LLM, telemetry)
- Custom block type registration
- Performance benchmarking tools
- Enterprise support pathway

---

### Journey Requirements Summary

| Journey | User Type | Entry Point | Phase | Platform | Key Requirements |
|---------|-----------|-------------|-------|----------|------------------|
| Alex Integration | Developer | npm install | 1 | Web | TypeScript API, engine/adapter split, sub-100ms |
| Alex Debugging | Developer | Debug mode | 1 | Web | Resolution tracing, binding scores, corrections |
| Sam Platform | Builder | npm package | 1 | Web | Pluggable storage/LLM, cache warming, custom adapter |
| Jamie Contributor | OSS Dev | GitHub | 1 | Flutter | Adapter interface, conformance tests, docs |
| Enterprise Pilot | Architect | Evaluation | 2 | Multi | Scale, custom blocks, enterprise features |

---

## Domain Strategy

### Package Architecture

```
@liquid-engine/core (THIS PRD)
├── /discovery
│   ├── fingerprint.ts    # Schema fingerprinting
│   ├── archetypes.ts     # Archetype detection
│   ├── primitives.ts     # UOM primitive inference
│   ├── intents.ts        # Intent prediction
│   └── index.ts
│
├── /resolution
│   ├── tiers.ts          # Tiered resolution orchestration
│   ├── cache.ts          # Cache tier
│   ├── semantic.ts       # Semantic search tier
│   ├── composition.ts    # Fragment composition tier
│   ├── llm.ts            # LLM fallback tier
│   └── index.ts
│
├── /liquidcode
│   ├── compiler.ts       # LiquidCode → LiquidSchema
│   ├── tokenizer.ts      # Token stream
│   ├── parser.ts         # AST generation
│   ├── grammar.ts        # Syntax definitions
│   ├── layers.ts         # L0/L1/L2 handling
│   ├── operations.ts     # Δ, +, -, →, ~, ↑
│   ├── addressing.ts     # @ordinal, @type, @grid, etc.
│   └── index.ts
│
├── /schema
│   ├── types.ts          # LiquidSchema interfaces
│   ├── blocks.ts         # Block definitions
│   ├── slots.ts          # Slot system
│   ├── signals.ts        # Signal system
│   ├── bindings.ts       # Binding system
│   ├── validator.ts      # Zod schemas
│   └── index.ts
│
├── /state
│   ├── twin.ts           # Digital twin
│   ├── history.ts        # Operation history
│   ├── snapshots.ts      # Snapshot addressing
│   ├── source.ts         # Source propagation
│   └── index.ts
│
├── /cache
│   ├── repository.ts     # Fragment repository
│   ├── storage.ts        # Storage adapter interface
│   ├── memory.ts         # In-memory implementation
│   └── index.ts
│
├── /catalog
│   ├── registry.ts       # Block type registry
│   ├── blocks/           # Block specifications
│   │   ├── kpi.ts
│   │   ├── charts.ts
│   │   ├── table.ts
│   │   ├── layout.ts
│   │   ├── interactive.ts
│   │   └── composite.ts
│   └── index.ts
│
├── /adapter
│   ├── interface.ts      # Adapter contract
│   ├── conformance.ts    # Conformance test utilities
│   └── index.ts
│
├── /binding
│   ├── suggestions.ts    # Soft-constraint scoring
│   ├── signals.ts        # Scoring signals
│   ├── resolver.ts       # Binding resolution
│   └── index.ts
│
├── /layout
│   ├── constraints.ts    # Priority, flexibility, span
│   ├── breakpoints.ts    # Breakpoint detection & thresholds
│   ├── resolver.ts       # Constraint satisfaction solver
│   ├── inheritance.ts    # Signal inheritance modes
│   ├── responsive.ts     # Breakpoint transformations
│   └── index.ts
│
├── /hardening
│   ├── ascii-grammar.ts  # ASCII/Unicode normalization
│   ├── uid-system.ts     # Stable block identity
│   ├── liquid-expr.ts    # Safe transform DSL
│   ├── coherence.ts      # Reuse validation gate
│   ├── conformance.ts    # Adapter test suite
│   └── index.ts
│
└── index.ts              # Public API
```

### Core (Horizontal)

The engine is **100% platform-agnostic**:

| Component | Purpose | Platform Dependency |
|-----------|---------|---------------------|
| Discovery | Data analysis | None |
| Resolution | Cache + LLM orchestration | None |
| LiquidCode | Encoding language | None |
| LiquidSchema | Interface specification | None |
| State | Digital twin, history | None |
| Catalog | Block definitions | None |
| Binding | Soft-constraint suggestions | None |
| Layout | Constraint-based responsive layout | None |
| Hardening | Production-grade guarantees | None |
| Adapter | Interface contract | None (defines contract) |

**Zero React, CSS, DOM, or platform-specific code in core.**

---

## Innovation & Novel Patterns

### 1. Interface Algebra

LiquidCode v2 is not just a generation language—it's a complete algebra for interface manipulation:

| Mode | Symbol | Purpose |
|------|--------|---------|
| Generate | `#` | Create from intent |
| Mutate | `Δ` | Modify existing |
| Query | `?` | Read state |

With five atomic operations:

| Operation | Symbol | Example |
|-----------|--------|---------|
| Add | `+` | `Δ+K$profit@[1,2]` |
| Remove | `-` | `Δ-@K1` |
| Replace | `→` | `Δ@P0→B` |
| Modify | `~` | `Δ~@K0.label:"Total"` |
| Move | `↑` | `Δ↑@[0,0]→[1,1]` |

**Why this matters:** Mutations are 8-10x more token-efficient than regeneration.

### 2. Position-Derived Identity

Block addresses derive from structure, not stored IDs:

| Address | Meaning | Token Cost |
|---------|---------|------------|
| `@0` | First block | 1 |
| `@K0` | First KPI | 1 |
| `@[0,1]` | Row 0, col 1 | 1 |
| `@:revenue` | Bound to revenue | 2 |

**Why this matters:** Zero token cost for addressing in generated code.

### 3. Soft Constraint Binding

V1 used hard filters for binding inference. V2 uses soft scores:

```typescript
interface BindingSuggestion {
  field: string;
  slot: BindingSlot;
  score: number;           // 0-1, never blocks
  signals: ScoringSignal[];
}

interface ScoringSignal {
  source: 'type' | 'semantic' | 'pattern' | 'position' | 'user';
  weight: number;
  reason: string;
}

type BindingSlot =
  | 'x' | 'y' | 'value' | 'label' | 'category'
  | 'series' | 'color' | 'stack' | 'trend' | 'icon'
  | 'compare' | 'current' | 'previous' | 'format'
  | 'data' | 'columns' | 'pageSize';
```

| Score | Behavior |
|-------|----------|
| >0.8 | Auto-bind |
| 0.5-0.8 | Bind with "best guess" flag |
| <0.5 | Prompt for clarification |

**Why this matters:** User intent always wins. System guides, never blocks.

### 4. Tiered Resolution

99% of queries never touch the LLM:

| Tier | Hit Rate | Latency |
|------|----------|---------|
| Exact cache | 40% | <5ms |
| Semantic search | 50% | <50ms |
| Composition | 9% | <100ms |
| LLM fallback | 1% | <500ms |

**Why this matters:** Cost drops from $0.06 to $0.0002 per query.

### 5. Digital Twin Architecture

Authoritative state with full history (see SPEC §16):

```typescript
interface DigitalTwin {
  schema: LiquidSchema;          // Current valid schema
  timestamp: number;             // Last update time
  operationCount: number;        // Total operations applied
}

interface OperationHistory {
  operations: AppliedOperation[];
  maxSize: number;               // Undo depth limit
  push(op: Operation): void;
  undo(): Operation | null;
  redo(): Operation | null;
  snapshot(index: number): LiquidSchema;
}
```

**Why this matters:** Undo/redo, time-travel debugging, derivation tracking.

---

## Project Type Specific Requirements

### npm Package Requirements

| Requirement | Specification |
|-------------|---------------|
| Node version | >=18.0.0 |
| Module format | ESM + CJS dual |
| TypeScript | Full types, strict mode |
| Bundle size | <100KB minified (core) |
| Dependencies | Minimal, Zod for validation |
| Tree-shaking | Full support |

### API Design Requirements

| Requirement | Specification |
|-------------|---------------|
| Async patterns | Promise-based, no callbacks |
| Error handling | Typed errors with codes |
| Configuration | Options objects, sensible defaults |
| Extensibility | Plugin/adapter pattern |
| Documentation | JSDoc on all public APIs |

### Testing Requirements

| Requirement | Specification |
|-------------|---------------|
| Unit tests | >90% coverage |
| Integration tests | All tiers tested |
| Conformance tests | Adapter validation suite |
| Benchmark tests | Performance regression detection |
| Property tests | Grammar fuzzing |

---

## Functional Requirements

### Discovery Engine

- FR-DE-1: Engine can fingerprint data schemas (columns, types, cardinality)
- FR-DE-2: Engine can infer primitives from column patterns (date, currency, count, category)
- FR-DE-3: Engine can detect schema archetypes (overview, time_series, comparison, funnel)
- FR-DE-4: Engine can predict likely intents from detected archetypes
- FR-DE-5: Engine can pre-generate fragments for predicted intents
- FR-DE-6: Users can configure archetype detection thresholds
- FR-DE-7: Engine can expose primitive inference signals for debugging

### Tiered Resolution

- FR-TR-1: Engine can resolve intents via exact cache match
- FR-TR-2: Engine can resolve intents via semantic similarity search
- FR-TR-3: Engine can compose fragments from cached pieces
- FR-TR-4: Engine can fall back to LLM generation for novel intents
- FR-TR-5: Engine can track resolution tier for each request
- FR-TR-6: Users can configure resolution tier thresholds
- FR-TR-7: Engine can bypass specific tiers via options

### LiquidCode Compiler

- FR-LC-1: Compiler can tokenize LiquidCode input
- FR-LC-2: Compiler can parse tokens into AST
- FR-LC-3: Compiler can validate AST semantically
- FR-LC-4: Compiler can generate LiquidSchema from valid AST
- FR-LC-5: Compiler can process L0 (structure) layer
- FR-LC-6: Compiler can process L1 (content) layer in parallel
- FR-LC-7: Compiler can process L2 (polish) layer
- FR-LC-8: Compiler can emit streaming partial results

### Interface Algebra

- FR-IA-1: Engine can process Generate mode (#) for new interfaces
- FR-IA-2: Engine can process Mutate mode (Δ) for modifications
- FR-IA-3: Engine can process Query mode (?) for state inspection
- FR-IA-4: Engine can execute Add operation (+)
- FR-IA-5: Engine can execute Remove operation (-)
- FR-IA-6: Engine can execute Replace operation (→)
- FR-IA-7: Engine can execute Modify operation (~)
- FR-IA-8: Engine can execute Move operation (↑)
- FR-IA-9: Engine can batch multiple operations
- FR-IA-10: Users can undo operations
- FR-IA-11: Users can redo undone operations

### Block Addressing

- FR-BA-1: Engine can resolve ordinal addresses (@0, @1)
- FR-BA-2: Engine can resolve type ordinal addresses (@K0, @L1)
- FR-BA-3: Engine can resolve grid position addresses (@[0,1])
- FR-BA-4: Engine can resolve binding signature addresses (@:revenue)
- FR-BA-5: Engine can resolve explicit ID addresses (@#myId)
- FR-BA-6: Engine can resolve wildcard addresses (@K*, @[*,0])
- FR-BA-7: Engine can resolve snapshot addresses (@snapshot:3.@K0)
- FR-BA-8: Engine can generate schema summary for LLM context

### LiquidSchema

- FR-LS-1: Schema can represent Block primitive
- FR-LS-2: Schema can represent Slot primitive
- FR-LS-3: Schema can represent Signal primitive
- FR-LS-4: Schema can validate via Zod
- FR-LS-5: Schema can include version field
- FR-LS-6: Schema can include explainability metadata
- FR-LS-7: Schema can be serialized to JSON
- FR-LS-8: Schema can be deserialized from JSON

### Block Catalog

- FR-BC-1: Catalog can register block types
- FR-BC-2: Catalog can retrieve block specifications
- FR-BC-3: Catalog can validate blocks against specifications
- FR-BC-4: Users can register custom block types
- FR-BC-5: Catalog can export block type metadata

### Binding System

- FR-BS-1: Engine can suggest bindings with soft-constraint scores
- FR-BS-2: Engine can apply type match scoring signal
- FR-BS-3: Engine can apply semantic match scoring signal
- FR-BS-4: Engine can apply pattern match scoring signal
- FR-BS-5: Engine can apply user history scoring signal
- FR-BS-6: Engine can auto-bind high-confidence suggestions (>0.8)
- FR-BS-7: Engine can flag medium-confidence suggestions (0.5-0.8)
- FR-BS-8: Engine can prompt clarification for low-confidence (<0.5)
- FR-BS-9: Users can override any binding suggestion

### Signal System

- FR-SG-1: Schema can declare signals at interface level
- FR-SG-2: Signals can have types (dateRange, selection, filter, etc.)
- FR-SG-3: Signals can have default values
- FR-SG-4: Signals can have persistence strategies (url, session, local)
- FR-SG-5: Blocks can emit signals on triggers
- FR-SG-6: Blocks can receive signals into binding targets
- FR-SG-7: Signals can have transformations
- FR-SG-8: Engine can auto-wire common signal patterns
- FR-SG-9: Adapters can implement signal runtime

### State Management

- FR-SM-1: Engine can maintain digital twin (current state)
- FR-SM-2: Engine can record operation history
- FR-SM-3: Engine can compute operation inverses for undo
- FR-SM-4: Engine can access historical snapshots by index
- FR-SM-5: Engine can track source of each schema element
- FR-SM-6: Engine can persist state to storage
- FR-SM-7: Engine can restore state from storage

### Fragment Cache

- FR-FC-1: Cache can store fragments by key
- FR-FC-2: Cache can retrieve fragments by key
- FR-FC-3: Cache can search fragments by semantic similarity
- FR-FC-4: Cache can invalidate fragments by pattern
- FR-FC-5: Cache can report hit/miss statistics
- FR-FC-6: Users can configure TTL for fragments
- FR-FC-7: Users can plug custom storage backends

### Adapter Interface

- FR-AI-1: Adapters can implement render(schema, data) method
- FR-AI-2: Adapters can implement renderBlock(block, data) method
- FR-AI-3: Adapters can implement supports(blockType) method
- FR-AI-4: Adapters can implement renderPlaceholder(block, reason) method
- FR-AI-5: Adapters can implement createSignalRuntime(registry) method
- FR-AI-6: Adapters can expose metadata (name, version, supported types)
- FR-AI-7: Adapters can declare supported schema versions

### Error Handling

- FR-EH-1: Engine can return typed errors with codes
- FR-EH-2: Engine can include error location for parse errors
- FR-EH-3: Engine can suggest fixes for common errors
- FR-EH-4: Engine can degrade gracefully on partial failures
- FR-EH-5: Engine can render placeholders for unsupported blocks
- FR-EH-6: Engine can fall back to default values on signal errors

### Layout System

- FR-LY-1: Engine can assign priority levels to blocks (hero, primary, secondary, detail OR 1-4)
- FR-LY-2: Engine can assign flexibility modes to blocks (fixed, shrink, grow, collapse)
- FR-LY-3: Engine can process span specifications (full, half, third, quarter, auto)
- FR-LY-4: Engine can process relationship groupings (group, sequence, alternate)
- FR-LY-5: Engine can receive slot context from adapters (width, height, breakpoint)
- FR-LY-6: Engine can determine breakpoint from slot context dimensions
- FR-LY-7: Engine can apply responsive transformations based on breakpoint
- FR-LY-8: Engine can propagate layout constraints to nested blocks
- FR-LY-9: Blocks can declare minimum and maximum size hints
- FR-LY-10: Engine can resolve priority conflicts using block order as tiebreaker
- FR-LY-11: Engine can collapse blocks when flex='collapse' and space insufficient
- FR-LY-12: Engine can emit layout-resolved schema with computed constraints
- FR-LY-13: Adapters can implement constraint-based layout rendering
- FR-LY-14: LiquidCode can encode layout via priority (!), flexibility (^), span (*) operators
- FR-LY-15: LiquidCode can encode breakpoint-specific overrides (@compact:, @standard:, @expanded:)
- FR-LY-16: Engine can track layout inheritance mode (inherit, shadow, bridge, isolate)
- FR-LY-17: Engine can transform layout for embedded slot contexts

### Hardening System

- FR-HD-1: Compiler accepts both ASCII and Unicode operator forms
- FR-HD-2: Compiler normalizes all input to ASCII canonical form for caching
- FR-HD-3: LLM prompts use ASCII operators exclusively
- FR-HD-4: All blocks have immutable `uid` field generated at creation
- FR-HD-5: Positional selectors (@K0, @[0,1]) resolve to uid sets at mutation time
- FR-HD-6: Mutation operations target uids, not positions
- FR-HD-7: Address resolution errors return disambiguation options
- FR-HD-8: Adapters implement renderPlaceholder() for unknown block types
- FR-HD-9: Adapters complete within timeout (default 5s per block)
- FR-HD-10: Adapters never crash host runtime for any valid schema
- FR-HD-11: Transform expressions use LiquidExpr DSL only (no free-form code)
- FR-HD-12: LiquidExpr errors return null (never throw)
- FR-HD-13: LiquidExpr execution bounded (max 1000 operations)
- FR-HD-14: Coherence gate validates binding compatibility before cache acceptance
- FR-HD-15: Coherence gate validates signal flow before cache acceptance
- FR-HD-16: Coherence failures trigger micro-LLM repair or tier escalation
- FR-HD-17: Schema validation uses complete Zod schema (strict mode)
- FR-HD-18: Schema serialization uses canonical field ordering
- FR-HD-19: All schemas include version field for migration support

---

## Non-Functional Requirements

### Performance

- NFR-P1: LiquidCode compilation <5ms
- NFR-P2: Schema validation <5ms
- NFR-P3: Cache lookup <5ms
- NFR-P4: Semantic search <50ms
- NFR-P5: Fragment composition <100ms
- NFR-P6: Full resolution (cache miss) <500ms
- NFR-P7: Mutation execution <10ms
- NFR-P8: Parallel L1 block generation
- NFR-P9: Layout resolution <10ms for ≤50 blocks
- NFR-P10: Breakpoint detection <1ms

### Reliability

- NFR-R1: 100% valid schemas render successfully
- NFR-R2: Graceful degradation on partial failures
- NFR-R3: No data loss in operation history
- NFR-R4: Deterministic compilation (same input → same output)
- NFR-R5: Idempotent cache operations

### Scalability

- NFR-S1: Stateless engine (horizontal scale)
- NFR-S2: Pluggable storage for multi-instance cache
- NFR-S3: No memory leaks under sustained load
- NFR-S4: Sub-linear memory growth with cache size

### Security

- NFR-SE1: No arbitrary code execution in schemas
- NFR-SE2: Sandboxed LLM prompts (no injection)
- NFR-SE3: No sensitive data in cache keys
- NFR-SE4: Audit trail for operations (optional)

### Developer Experience

- NFR-DX1: Full TypeScript types
- NFR-DX2: Clear error messages with locations
- NFR-DX3: Debug mode with resolution tracing
- NFR-DX4: Comprehensive JSDoc documentation
- NFR-DX5: Example code for all public APIs

---

## Technical Specifications

### LiquidCode Grammar

```
// Generation
generation      = archetype ";" layout ";" blocks
archetype       = "#" IDENTIFIER
layout          = LAYOUT_TYPE [SIZE]
blocks          = block ("," block)*
block           = BLOCK_TYPE [bindings] [signals]
bindings        = "$" FIELD ("$" FIELD)*
signals         = ("<" | ">") "@" SIGNAL_NAME

// Signals
signal_decl     = "§" SIGNAL_NAME ":" SIGNAL_TYPE ["=" DEFAULT] ["," PERSIST]

// Mutations
mutation        = "Δ" operation
operation       = add | remove | replace | modify | move
add             = "+" block "@" address
remove          = "-" "@" address
replace         = "@" address "→" BLOCK_TYPE
modify          = "~" "@" address "." PROPERTY ":" VALUE
move            = "↑" "@" address "→" address

// Addressing
address         = "@" (ordinal | type_ordinal | grid | binding_sig | explicit_id | wildcard | snapshot)
ordinal         = NUMBER
type_ordinal    = BLOCK_CODE NUMBER
grid            = "[" NUMBER "," NUMBER "]"
binding_sig     = ":" FIELD_NAME
explicit_id     = "#" IDENTIFIER
wildcard        = (BLOCK_CODE | "[" "*" "," NUMBER "]" | ":" "*" PATTERN "*") "*"?
snapshot        = "snapshot:" NUMBER "." address

// Query
query           = "?" (address | "summary" | "diff")

// Layout Constraints (v2 extensions)
block_layout    = block [priority] [flexibility] [span] [relationship]
priority        = "!" (PRIORITY_LEVEL | NUMBER)
flexibility     = "^" FLEX_MODE
span            = "*" SPAN_VALUE
relationship    = "=" RELATIONSHIP_TYPE

PRIORITY_LEVEL  = "hero" | "primary" | "secondary" | "detail"
FLEX_MODE       = "fixed" | "shrink" | "grow" | "collapse"
SPAN_VALUE      = "full" | "half" | "third" | "quarter" | "auto"
RELATIONSHIP    = "group" | "compare" | "detail" | "flow"

// Responsive Overrides
responsive      = "@" BREAKPOINT ":" block_layout
BREAKPOINT      = "compact" | "standard" | "expanded"
```

### LiquidSchema Core Types

```typescript
interface LiquidSchema {
  version: "2.0";
  scope: "interface" | "block";
  uid: string;                           // Stable unique identifier (required)
  id?: string;                           // User-assigned ID (optional)
  title: string;
  description?: string;
  generatedAt: string;
  layout: LayoutBlock;
  blocks: Block[];
  signals?: SignalRegistry;
  slotContext?: SlotContext;
  signalInheritance?: SignalInheritance;
  explainability?: SchemaExplainability;
  metadata?: SchemaMetadata;
}

interface SchemaMetadata {
  createdBy?: string;
  modifiedAt?: string;
  operationCount: number;
  coherenceScore?: number;
}

interface Block {
  uid: string;                           // Stable unique identifier (required)
  id?: string;                           // User-assigned ID (optional)
  type: BlockType;
  binding?: DataBinding;
  slots?: Record<string, Block[]>;
  signals?: SignalConnections;
  layout?: BlockLayout;
  constraints?: RenderConstraints;
}

type BlockType =
  | "kpi"
  | "bar-chart"
  | "line-chart"
  | "pie-chart"
  | "data-table"
  | "grid"
  | "stack"
  | "text"
  | "metric-group"
  | "comparison"
  | "date-filter"
  | "select-filter"
  | "search-input"
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
  target: BindingSlot;                   // Slot name (see BindingSlot type)
  field: string;                         // Source field name
  transform?: string;                    // LiquidExpr transformation
}

interface SignalRegistry {
  [signalName: string]: SignalDefinition;
}

interface SignalDefinition {
  type: SignalType;
  default?: unknown;
  persist?: "none" | "url" | "session" | "local";
  validation?: string;                   // LiquidExpr returning boolean
}

type SignalType =
  | "dateRange"
  | "selection"
  | "filter"
  | "search"
  | "pagination"
  | "sort"
  | "toggle"
  | "custom";

interface SignalConnections {
  emits?: SignalEmission[];
  receives?: SignalReception[];
}

interface SignalEmission {
  signal: string;                        // Signal name to emit
  trigger: string;                       // Event that triggers emission
  transform?: string;                    // LiquidExpr for value transformation
}

interface SignalReception {
  signal: string;                        // Signal name to receive
  target: string;                        // Target property/behavior to update
  transform?: string;                    // LiquidExpr for value transformation
}

// Layout Types (v2)
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
  with?: string[];  // Block IDs/UIDs in relationship
}

interface SlotContext {
  width: number;
  height: number | 'auto';
  breakpoint: 'compact' | 'standard' | 'expanded';
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
```

### Adapter Interface Contract

```typescript
interface LiquidAdapter<RenderOutput> {
  render(schema: LiquidSchema, data: any, context?: SlotContext): RenderOutput;
  renderBlock(block: Block, data: any, context?: SlotContext): RenderOutput;
  supports(blockType: BlockType): boolean;
  renderPlaceholder(block: Block, reason: string): RenderOutput;
  createSignalRuntime(registry: SignalRegistry): SignalRuntime;
  resolveLayout(blocks: Block[], context: SlotContext): LayoutResolution;
  readonly metadata: AdapterMetadata;
}

interface AdapterMetadata {
  name: string;
  version: string;
  platform: string;
  supportedSchemaVersions: string[];
  supportedBlockTypes: BlockType[];
  supportsSignals: boolean;
  supportsStreaming: boolean;
  supportsLayout: boolean;
  breakpointThresholds?: BreakpointThresholds;
}

interface LayoutResolution {
  breakpoint: Breakpoint;
  computed: ComputedLayout[];
  collapsed: string[];  // Block IDs that couldn't fit
}

interface ComputedLayout {
  blockId: string;
  position: { row: number; col: number };
  span: { rows: number; cols: number };
  dimensions: { width: number; height: number };
}

interface SignalRuntime {
  get(signalName: string): any;
  set(signalName: string, value: any): void;
  subscribe(signalName: string, callback: (value: any) => void): () => void;
  persist(): void;
  restore(): void;
}
```

### Block Catalog

| Block Type | Category | Required Bindings | Emits Signals |
|------------|----------|-------------------|---------------|
| kpi | Atomic | value | No |
| bar-chart | Atomic | category, value | No |
| line-chart | Atomic | x, y | No |
| pie-chart | Atomic | label, value | No |
| data-table | Atomic | data, columns | Optional (selection) |
| grid | Layout | (none) | No |
| stack | Layout | (none) | No |
| text | Atomic | content | No |
| metric-group | Composite | metrics[] | No |
| comparison | Atomic | current, previous | No |
| date-filter | Interactive | (none) | Yes (dateRange) |
| select-filter | Interactive | options | Yes (selection) |
| search-input | Interactive | (none) | Yes (search) |

---

## Observability & QA Requirements

### Logging

| Level | Content |
|-------|---------|
| ERROR | Compilation failures, validation errors |
| WARN | Degraded resolution, placeholder renders |
| INFO | Resolution tier, cache statistics |
| DEBUG | Token stream, AST, binding scores |

### Telemetry (Opt-In)

| Metric | Purpose |
|--------|---------|
| resolution_tier | Track cache efficiency |
| compilation_time | Performance monitoring |
| schema_tokens | Token efficiency |
| operation_type | Usage patterns |
| error_code | Error frequency |

### Conformance Testing

| Test Category | Coverage |
|---------------|----------|
| Block rendering | All 13 block types |
| Signal propagation | Emit/receive flow |
| Placeholder fallback | Unknown types |
| Binding resolution | All slot types |
| Mutation execution | All 5 operations |
| Undo/redo | State consistency |
| Layout resolution | All 3 breakpoints |
| Priority handling | hero → detail ordering |
| Flexibility modes | fixed, shrink, grow, collapse |
| Embedded contexts | SlotContext propagation |

---

## File Structure

```
packages/liquid-engine/core/
├── src/
│   ├── discovery/
│   │   ├── fingerprint.ts
│   │   ├── archetypes.ts
│   │   ├── primitives.ts
│   │   ├── intents.ts
│   │   └── index.ts
│   │
│   ├── resolution/
│   │   ├── tiers.ts
│   │   ├── cache.ts
│   │   ├── semantic.ts
│   │   ├── composition.ts
│   │   ├── llm.ts
│   │   └── index.ts
│   │
│   ├── liquidcode/
│   │   ├── compiler.ts
│   │   ├── tokenizer.ts
│   │   ├── parser.ts
│   │   ├── grammar.ts
│   │   ├── layers.ts
│   │   ├── operations.ts
│   │   ├── addressing.ts
│   │   └── index.ts
│   │
│   ├── schema/
│   │   ├── types.ts
│   │   ├── blocks.ts
│   │   ├── slots.ts
│   │   ├── signals.ts
│   │   ├── bindings.ts
│   │   ├── validator.ts
│   │   └── index.ts
│   │
│   ├── state/
│   │   ├── twin.ts
│   │   ├── history.ts
│   │   ├── snapshots.ts
│   │   ├── source.ts
│   │   └── index.ts
│   │
│   ├── cache/
│   │   ├── repository.ts
│   │   ├── storage.ts
│   │   ├── memory.ts
│   │   └── index.ts
│   │
│   ├── catalog/
│   │   ├── registry.ts
│   │   ├── blocks/
│   │   │   ├── kpi.ts
│   │   │   ├── charts.ts
│   │   │   ├── table.ts
│   │   │   ├── layout.ts
│   │   │   ├── interactive.ts
│   │   │   └── composite.ts
│   │   └── index.ts
│   │
│   ├── binding/
│   │   ├── suggestions.ts
│   │   ├── signals.ts
│   │   ├── resolver.ts
│   │   └── index.ts
│   │
│   ├── adapter/
│   │   ├── interface.ts
│   │   ├── conformance.ts
│   │   └── index.ts
│   │
│   ├── layout/
│   │   ├── constraints.ts
│   │   ├── breakpoints.ts
│   │   ├── resolver.ts
│   │   ├── inheritance.ts
│   │   ├── responsive.ts
│   │   └── index.ts
│   │
│   ├── hardening/
│   │   ├── ascii-grammar.ts
│   │   ├── uid-system.ts
│   │   ├── liquid-expr.ts
│   │   ├── coherence.ts
│   │   ├── conformance.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── conformance/
│   └── benchmark/
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| LiquidCode Specification v2 | `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md` | Full encoding grammar |
| LiquidCode Rationale v2 | `.mydocs/liquidcode/LIQUIDCODE-RATIONALE-v2.md` | Design decisions |
| Architecture Analysis | `.mydocs/LIQUID-ENGINE-ARCHITECTURE-ANALYSIS.md` | V1 → V2 evolution |

---

*End of Product Requirements Document - Liquid Engine v2*
