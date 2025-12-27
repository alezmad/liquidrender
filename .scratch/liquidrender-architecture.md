# LiquidRender Compiler/Engine Architecture

## Overview

LiquidRender is a **unified DSL compiler** that transforms two domain-specific languages into React component trees:
- **LiquidCode** - UI/Dashboard DSL
- **LiquidSurvey** - Forms/Flow DSL

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LIQUIDRENDER COMPILER/ENGINE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   DSL SOURCE    │
                              │   (String)      │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
     ┌──────────────────────────┐         ┌──────────────────────────┐
     │     LIQUIDCODE (UI)      │         │   LIQUIDSURVEY (Forms)   │
     │                          │         │                          │
     │ Kp :revenue              │         │ > start "Welcome" -> q1  │
     │ Ln :date :sales          │         │ ? q1 Rt* "Rate 1-5"      │
     │ Tb :data [:id :amount]   │         │ < end "Thanks!"          │
     └────────────┬─────────────┘         └────────────┬─────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: LEXICAL ANALYSIS                                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐                    ┌─────────────────────┐            │
│  │    UI SCANNER       │                    │   SURVEY SCANNER    │            │
│  │  ui-scanner.ts      │                    │   scanner.ts        │            │
│  │     (776 LOC)       │                    │     (351 LOC)       │            │
│  ├─────────────────────┤                    ├─────────────────────┤            │
│  │ • Type codes (Kp,Ln)│                    │ • Node markers (>?) │            │
│  │ • Bindings (:field) │                    │ • Transitions (->)  │            │
│  │ • Modifiers (#^$~)  │                    │ • Conditions (?>=)  │            │
│  │ • Signals (@)       │                    │ • Options [...]     │            │
│  └──────────┬──────────┘                    └──────────┬──────────┘            │
│             │                                          │                        │
│             ▼                                          ▼                        │
│      ┌────────────┐                            ┌────────────┐                  │
│      │  Token[]   │                            │  Token[]   │                  │
│      └────────────┘                            └────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: SYNTAX ANALYSIS                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐                    ┌─────────────────────┐            │
│  │     UI PARSER       │                    │   SURVEY PARSER     │            │
│  │  ui-parser.ts       │                    │   parser.ts         │            │
│  │     (807 LOC)       │                    │     (506 LOC)       │            │
│  ├─────────────────────┤                    ├─────────────────────┤            │
│  │ • Block nesting     │                    │ • Node structure    │            │
│  │ • Signal refs       │                    │ • Branch validation │            │
│  │ • Layer definitions │                    │ • Transition graph  │            │
│  │ • Custom components │                    │ • Question types    │            │
│  └──────────┬──────────┘                    └──────────┬──────────┘            │
│             │                                          │                        │
│             ▼                                          ▼                        │
│       ┌──────────┐                              ┌───────────┐                  │
│       │  UI AST  │                              │Survey AST │                  │
│       └──────────┘                              └───────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: CODE GENERATION                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐                    ┌─────────────────────┐            │
│  │     UI EMITTER      │                    │   SURVEY EMITTER    │            │
│  │  ui-emitter.ts      │                    │   emitter.ts        │            │
│  │    (1027 LOC)       │                    │     (247 LOC)       │            │
│  ├─────────────────────┤                    ├─────────────────────┤            │
│  │ • Generate blocks   │                    │ • Generate nodes    │            │
│  │ • Resolve bindings  │                    │ • Build transitions │            │
│  │ • Configure signals │                    │ • Set conditions    │            │
│  │ • Build layers      │                    │ • Wire graph        │            │
│  └──────────┬──────────┘                    └──────────┬──────────┘            │
│             │                                          │                        │
│             ▼                                          ▼                        │
│    ┌────────────────┐                        ┌────────────────┐                │
│    │ LiquidSchema   │                        │  GraphSurvey   │                │
│    │ (JSON IR)      │                        │  (JSON IR)     │                │
│    └────────────────┘                        └────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: VALIDATION                                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          VALIDATOR                                       │   │
│  │                        validator.ts                                      │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │  • Schema consistency       • Single start node check                   │   │
│  │  • Field reference validity • End node reachability                     │   │
│  │  • Signal usage validation  • Dead path detection                       │   │
│  │  • Type checking            • Circular reference detection              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│                            ┌────────────────────┐                              │
│                            │ ValidationResult   │                              │
│                            │ {valid, errors[],  │                              │
│                            │  warnings[]}       │                              │
│                            └────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: RUNTIME                                                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────┐              ┌─────────────────────────┐          │
│  │      LIQUIDUI           │              │     SURVEY ENGINE       │          │
│  │    LiquidUI.tsx         │              │     types.ts (engine)   │          │
│  │      (354 LOC)          │              │       (782 LOC)         │          │
│  ├─────────────────────────┤              ├─────────────────────────┤          │
│  │ • Context provider      │              │ • Node navigation       │          │
│  │ • Signal state machine  │              │ • Answer collection     │          │
│  │ • Layer management      │              │ • Branch execution      │          │
│  │ • Block traversal       │              │ • State serialization   │          │
│  │ • Data binding          │              │ • Progress tracking     │          │
│  └───────────┬─────────────┘              └──────────────────┬──────┘          │
│              │                                               │                  │
│              ▼                                               ▼                  │
│  ┌─────────────────────────┐              ┌─────────────────────────┐          │
│  │   DATA CONTEXT          │              │    SURVEY SESSION       │          │
│  │   data-context.ts       │              │                         │          │
│  │     (199 LOC)           │              │ • Current node          │          │
│  ├─────────────────────────┤              │ • Answer history        │          │
│  │ • Field resolution      │              │ • Branch points         │          │
│  │ • Computed bindings     │              │ • Timestamps            │          │
│  │ • Iterator context      │              └─────────────────────────┘          │
│  │ • Data normalization    │                                                   │
│  └───────────┬─────────────┘                                                   │
│              │                                                                  │
└──────────────┼──────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: REACT RENDERING                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    COMPONENT REGISTRY                                    │   │
│  │                 component-registry.ts (126 LOC)                          │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────────┬───────────┐  │   │
│  │  │ PRIMITIVES  │   CHARTS    │    DATA     │   FORMS     │  LAYOUT   │  │   │
│  │  ├─────────────┼─────────────┼─────────────┼─────────────┼───────────┤  │   │
│  │  │ container   │ line-chart  │ data-table  │ input       │ grid      │  │   │
│  │  │ text        │ bar-chart   │ list        │ textarea    │ stack     │  │   │
│  │  │ heading     │ pie-chart   │ avatar      │ button      │ sidebar   │  │   │
│  │  │ image       │ area-chart  │ kpi-card    │ checkbox    │ header    │  │   │
│  │  │ icon        │ donut       │             │ radio       │ nav       │  │   │
│  │  └─────────────┴─────────────┴─────────────┼─────────────┼───────────┤  │   │
│  │                                            │ select      │ card      │  │   │
│  │  ┌─────────────┬─────────────┐             │ switch      │ modal     │  │   │
│  │  │  STATUS     │  ADVANCED   │             │ range       │ drawer    │  │   │
│  │  ├─────────────┼─────────────┤             │ date        │ tabs      │  │   │
│  │  │ badge       │ stepper     │             │ daterange   │ accordion │  │   │
│  │  │ tag         │ calendar    │             └─────────────┴───────────┘  │   │
│  │  │ progress    │ custom      │                                          │   │
│  │  │ tooltip     │             │                                          │   │
│  │  │ popover     │             │            48 COMPONENTS TOTAL           │   │
│  │  └─────────────┴─────────────┘                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│                            ┌────────────────────┐                              │
│                            │  React.ReactElement│                              │
│                            │   (Component Tree) │                              │
│                            └────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│ SPECIAL MODULES                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌────────────────────────┐    ┌────────────────────────┐                      │
│  │   STREAMING PARSER     │    │    UNIFIED COMPILER    │                      │
│  │ streaming-parser.ts    │    │     compiler.ts        │                      │
│  │     (427 LOC)          │    │      (342 LOC)         │                      │
│  ├────────────────────────┤    ├────────────────────────┤                      │
│  │ • Progressive parsing  │    │ • Format detection     │                      │
│  │ • Checkpoint emission  │    │ • Unified API          │                      │
│  │ • Low-latency render   │    │ • parse(), compile()   │                      │
│  │ • LLM integration      │    │ • roundtrip()          │                      │
│  └────────────────────────┘    └────────────────────────┘                      │
│                                                                                 │
│  ┌────────────────────────┐    ┌────────────────────────┐                      │
│  │    DIAGNOSTICS         │    │     CONSTANTS          │                      │
│  │  diagnostics.ts        │    │   constants.ts         │                      │
│  │     (314 LOC)          │    │     (291 LOC)          │                      │
│  ├────────────────────────┤    ├────────────────────────┤                      │
│  │ • Error reporting      │    │ • Type code mapping    │                      │
│  │ • Recovery suggestions │    │ • Operator definitions │                      │
│  │ • Source mapping       │    │ • Validator functions  │                      │
│  └────────────────────────┘    └────────────────────────┘                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Summary Table

| Component | File | LOC | Input | Output | Purpose |
|-----------|------|-----|-------|--------|---------|
| **UI Scanner** | ui-scanner.ts | 776 | DSL string | Token[] | Tokenize LiquidCode syntax |
| **Survey Scanner** | scanner.ts | 351 | DSL string | Token[] | Tokenize LiquidSurvey syntax |
| **UI Parser** | ui-parser.ts | 807 | Token[] | UI AST | Build UI component tree |
| **Survey Parser** | parser.ts | 506 | Token[] | Survey AST | Build survey flow tree |
| **UI Emitter** | ui-emitter.ts | 1027 | UI AST | LiquidSchema | Generate component schema |
| **Survey Emitter** | emitter.ts | 247 | Survey AST | GraphSurvey | Generate survey schema |
| **Unified Compiler** | compiler.ts | 342 | DSL string | Schema | Auto-detect & compile |
| **Streaming Parser** | streaming-parser.ts | 427 | DSL chunks | Stream | Progressive LLM parsing |
| **Validator** | validator.ts | ~300 | Schema | ValidationResult | Validate structure |
| **Survey Engine** | types.ts | 782 | GraphSurvey | Session | Execute survey flow |
| **LiquidUI** | LiquidUI.tsx | 354 | LiquidSchema | React | Render to components |
| **Data Context** | data-context.ts | 199 | Binding+Data | Value | Resolve field bindings |
| **Registry** | component-registry.ts | 126 | Block.type | Component | Map types to React |
| **Components** | components/*.tsx | 30K+ | Block+Data | JSX | 48 UI components |

---

## Signal System

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNAL FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. DECLARATION          @filter @dateRange                │
│        │                                                    │
│        ▼                                                    │
│   2. EMISSION             Bt "Apply" >filter=selected       │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────────────────────────────────────┐          │
│   │         SIGNAL STATE MACHINE                 │          │
│   │                                              │          │
│   │   signals: {                                 │          │
│   │     filter: "selected",                      │          │
│   │     dateRange: {start: ..., end: ...}        │          │
│   │   }                                          │          │
│   └──────────────────┬──────────────────────────┘          │
│                      │                                      │
│                      ▼                                      │
│   3. RECEPTION            Tb :data <filter                  │
│        │                                                    │
│        ▼                                                    │
│   Component receives signal via context and re-renders      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
packages/liquid-render/src/
├── compiler/
│   ├── scanner.ts           # Survey tokenizer (351 LOC)
│   ├── parser.ts            # Survey parser (506 LOC)
│   ├── emitter.ts           # Survey emitter (247 LOC)
│   ├── ui-scanner.ts        # UI tokenizer (776 LOC)
│   ├── ui-parser.ts         # UI parser (807 LOC)
│   ├── ui-emitter.ts        # UI emitter (1027 LOC)
│   ├── compiler.ts          # Unified API (342 LOC)
│   ├── streaming-parser.ts  # LLM streaming (427 LOC)
│   ├── constants.ts         # Type codes (291 LOC)
│   └── diagnostics.ts       # Error handling (314 LOC)
├── renderer/
│   ├── LiquidUI.tsx         # Main renderer (354 LOC)
│   ├── data-context.ts      # Binding resolver (199 LOC)
│   ├── component-registry.ts # Component map (126 LOC)
│   └── components/          # 48 React components (30K+ LOC)
│       ├── primitives/
│       ├── charts/
│       ├── data/
│       ├── forms/
│       ├── layout/
│       └── utils.ts         # Design tokens
├── types.ts                 # All type definitions
├── validator.ts             # Schema validation
└── index.ts                 # Public exports
```
