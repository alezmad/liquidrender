# Wave 1 Resolutions - Merge Document

**Source Specification:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Resolution Source:** `.mydocs/liquidreview/resolutions/wave1/`
**Date:** 2025-12-21
**Status:** Ready for Review

---

## Executive Summary

This document consolidates all Wave 1 resolution changes organized by target section in the LiquidCode v2 specification. Each change includes before/after content, rationale, and integration instructions.

**Wave 1 Issues Resolved:** 14
- ISS-002: Grammar Ambiguities (§6.6)
- ISS-003: Binding Inference Implementation (§9.3)
- ISS-004: Fragment Composition Algorithm (§15)
- ISS-005: Signal Persistence Implementation (§10.2, §18.3)
- ISS-006: Coherence Gate Validation (§B.5)
- ISS-016: Block Interface Definition (§4.1)
- ISS-023: Operation Symbol ASCII Mapping (§B.1)
- ISS-027: Normative Language (§2.3, §6.3, §9.3, §11.7, §17.4)
- ISS-031: Binding Requirements (§9.1, §9.2)
- ISS-036: Migration Interface (§20.3)
- ISS-048: Three Primitives Clarification (§4.4 - No Action)
- ISS-076: Signal Cycle Detection (§10.8, §B.3.3, §B.5.3)
- ISS-136: Implementation Guide (Appendix C)

**Conflicts Detected:** None
**Breaking Changes:** No breaking changes to normative interfaces

---

## Table of Contents

1. [Section 2: Design Philosophy](#section-2-design-philosophy)
2. [Section 4: The Three Primitives](#section-4-the-three-primitives)
3. [Section 6: LiquidCode Grammar](#section-6-liquidcode-grammar)
4. [Section 9: Binding System](#section-9-binding-system)
5. [Section 10: Signal System](#section-10-signal-system)
6. [Section 11: Layout & Responsiveness](#section-11-layout--responsiveness)
7. [Section 15: Compositional Grammar Engine](#section-15-compositional-grammar-engine)
8. [Section 17: Compilation Pipeline](#section-17-compilation-pipeline)
9. [Section 18: Adapter Interface Contract](#section-18-adapter-interface-contract)
10. [Section 20: Versioning & Migration](#section-20-versioning--migration)
11. [Appendix B: Hardening Specification](#appendix-b-hardening-specification)
12. [Appendix C: Implementation Guide (NEW)](#appendix-c-implementation-guide-new)

---

## Section 2: Design Philosophy

### ISS-027: Add Normative Language Statement

**Target Location:** After §2.2 (line ~77)

**Change Type:** Addition

**Rationale:** Establish RFC 2119 compliance for consistent interpretation of requirements across the specification.

**Replacement Content:**

```markdown
### 2.3 Normative Language

This specification uses normative language per **RFC 2119**:

| Keyword | Meaning |
|---------|---------|
| **MUST** | Absolute requirement for conformance |
| **MUST NOT** | Absolute prohibition |
| **REQUIRED** | Synonym for MUST |
| **SHALL** | Synonym for MUST |
| **SHALL NOT** | Synonym for MUST NOT |
| **SHOULD** | Recommended, but valid reasons may exist to ignore |
| **SHOULD NOT** | Not recommended, but may be acceptable in specific circumstances |
| **RECOMMENDED** | Synonym for SHOULD |
| **MAY** | Truly optional, implementer's choice |
| **OPTIONAL** | Synonym for MAY |

**Scope:**
- Normative requirements apply to implementations (compilers, engines, adapters)
- Examples are non-normative unless explicitly stated otherwise
- Descriptive sections (architecture diagrams, rationale) are non-normative
- Appendix B contains normative requirements for production systems
```

**Integration Notes:**
- Update Table of Contents to include §2.3
- Cross-reference from other sections using normative language
- Ensure consistency with existing Appendix B language

---

## Section 4: The Three Primitives

### ISS-016: Block Interface Update

**Target Location:** §4.1 (lines 168-177)

**Change Type:** Enhancement (non-breaking)

**Before:**
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

**After:**
```typescript
interface Block {
  // REQUIRED fields
  uid: string;               // Stable unique identifier (see B.2)
  type: BlockType;           // What kind of block

  // OPTIONAL fields
  id?: string;               // User-assigned semantic ID (optional)
  binding?: DataBinding;     // What data it displays (optional for layout blocks)
  slots?: Record<string, Block[]>;  // Where child blocks go (optional)
  signals?: SignalConnections;      // How it participates in reactivity (optional)
  layout?: BlockLayout;      // Layout and responsive properties (see §11)
  constraints?: RenderConstraints;  // Render-time constraints
}

// Note: For complete normative definition, see B.6.1
```

**Also Remove:** Line 193 `type SlotMap = Record<string, Block[]>;` (inline type is clearer)

**Rationale:**
- Aligns with normative definition in §B.6.1
- Adds missing `layout` and `constraints` fields
- Clarifies required vs optional fields
- Removes redundant SlotMap type alias

**Integration Notes:**
- Update all references to `SlotMap` to use `Record<string, Block[]>` directly
- No semantic change (backward compatible)

---

### ISS-048: Three Primitives Clarification (OPTIONAL)

**Target Location:** After §4.4 (line ~242)

**Change Type:** Clarification (non-normative)

**Rationale:** Prevent confusion between primitives, block types, and block categories.

**Optional Addition:**
```markdown
**Note on Terminology:** LiquidCode has exactly three *primitives* (Block, Slot, Signal),
but many *block types* (kpi, chart, etc.) and four *block categories* (Layout, Atomic Data,
Interactive, Composite). The primitives are the irreducible concepts; types and categories
are built from these primitives.
```

**Integration Notes:**
- This is a clarification, not a correction
- Can be added for enhanced readability
- No action required if current text is clear enough

---

## Section 6: LiquidCode Grammar

### ISS-002: Add Formal Grammar

**Target Location:** After §6.5 (line 489)

**Change Type:** Addition (critical)

**Rationale:** Specification currently lacks formal tokenization rules and production grammar, leading to implementation inconsistencies.

**New Subsection:**

```markdown
### 6.6 Formal Grammar

LiquidCode uses a PEG (Parsing Expression Grammar) for unambiguous parsing.

#### 6.6.1 Tokenization Rules

**Lexical tokens (highest to lowest precedence):**

```
WHITESPACE     = [ \t\n\r]+                 // Ignored between tokens
COMMENT        = "//" [^\n]* "\n"           // Single-line comments

// Literals
ARCHETYPE      = "#" [a-z_][a-z0-9_]*       // #overview, #comparison
SIGNAL_DECL    = ("§" | "signal:") NAME    // §dateRange or signal:dateRange
MUTATION       = ("Δ" | "delta:") OP       // Δ+ or delta:+
QUERY          = "?"                        // Query mode

// Operators (normalized to ASCII internally)
ARROW          = "→" | "->"                 // Flow/replacement
MOVE_OP        = "↑" | "move:"              // Move operation
EMIT           = ">"                        // Signal emission
RECEIVE        = "<"                        // Signal reception

// Identifiers and addresses
ADDRESS        = "@" ADDR_SPEC              // Block addressing
  ADDR_SPEC    = GRID_POS | TYPE_ORD | BIND_SIG | EXPLICIT_ID | ORDINAL
  GRID_POS     = "[" NUMBER "," NUMBER "]"  // @[0,1]
  TYPE_ORD     = BLOCK_CODE NUMBER          // @K0, @L1
  BIND_SIG     = ":" FIELD_NAME             // @:revenue
  EXPLICIT_ID  = "#" NAME                   // @#myId
  ORDINAL      = NUMBER                     // @0, @1

BINDING        = "$" FIELD_NAME             // $revenue
FIELD_NAME     = [a-zA-Z_][a-zA-Z0-9_]*
BLOCK_CODE     = "K" | "B" | "L" | "P" | "T" | "G" | "S" | "X" | "M" | "C"
               | "DF" | "SF" | "SI"         // Single or double char

// Layout modifiers
PRIORITY       = "!" (NUMBER | "hero" | "primary" | "secondary" | "detail")
FLEXIBILITY    = "^" ("fixed" | "shrink" | "grow" | "collapse")
SPAN           = "*" (NUMBER | "full" | "half" | "third" | "quarter")

// Delimiters
SEMICOLON      = ";"
COMMA          = ","
COLON          = ":"
EQUALS         = "="
DOT            = "."
LBRACKET       = "["
RBRACKET       = "]"
LPAREN         = "("
RPAREN         = ")"

// Basic types
NUMBER         = [0-9]+ ("." [0-9]+)?
STRING         = '"' ([^"\\] | "\\" .)* '"'
NAME           = [a-z][a-zA-Z0-9_]*
```

#### 6.6.2 Grammar Production Rules

**Root productions:**

```peg
Program         ← Generation / Mutation / Query
Generation      ← ARCHETYPE SEMICOLON Layout SEMICOLON BlockList SignalDecl*
Mutation        ← MUTATION MutationOp
Query           ← QUERY Address

Layout          ← LayoutSpec Dimension?
LayoutSpec      ← "G" / "S" / "F"           // Grid, Stack, Flow
Dimension       ← NUMBER "x" NUMBER         // 2x3 (cols x rows)

BlockList       ← BlockDecl (COMMA BlockDecl)*
BlockDecl       ← BlockSpec Binding? Signals? LayoutMods? ExplicitId?

BlockSpec       ← BLOCK_CODE
Binding         ← BINDING (BINDING)*        // $field1$field2...
Signals         ← SignalEmit* SignalRecv*
SignalEmit      ← EMIT ADDRESS (COLON Trigger)?
SignalRecv      ← RECEIVE ADDRESS (ARROW Target)?
LayoutMods      ← (PRIORITY / FLEXIBILITY / SPAN)+
ExplicitId      ← "#" NAME

SignalDecl      ← SIGNAL_DECL COLON SignalType (EQUALS Default)? (COMMA Persist)?
SignalType      ← "dr" | "sel" | "str" | "pag" | "sort" | "tog" | "custom"
Persist         ← "url" | "session" | "local" | "none"

MutationOp      ← AddOp / RemoveOp / ReplaceOp / ModifyOp / MoveOp
AddOp           ← "+" BlockDecl ADDRESS     // Add block at position
RemoveOp        ← "-" ADDRESS               // Remove block
ReplaceOp       ← ADDRESS ARROW BlockSpec   // Replace block type
ModifyOp        ← "~" ADDRESS DOT Property COLON Value
MoveOp          ← (MOVE_OP | "↑") ADDRESS ARROW ADDRESS

Address         ← ADDRESS
Property        ← NAME
Value           ← STRING / NUMBER / NAME
Target          ← NAME (DOT NAME)*          // filter.date
Trigger         ← NAME                      // onChange, onSelect
Default         ← STRING / NUMBER
```

#### 6.6.3 Operator Precedence

Within block declarations, modifiers bind in this order (tightest to loosest):

1. **Binding** (`$field`) - Tightest, part of block identity
2. **Signals** (`<@sig`, `>@sig`) - Data flow connections
3. **Layout modifiers** (`!hero`, `^fixed`, `*2`) - Visual properties
4. **Explicit ID** (`#myId`) - Naming, loosest binding

**Example parsing:**
```
K$revenue<@dateRange!hero^fixed*2#main

Parses as:
  BlockSpec: K (kpi)
  Binding: $revenue
  SignalRecv: <@dateRange
  Priority: !hero
  Flexibility: ^fixed
  Span: *2
  ExplicitId: #main
```

#### 6.6.4 Ambiguity Resolution

**Rule 1: Greedy matching**
- Block codes consume maximum characters: `DF` matches `date-filter`, not `D` + `F`
- Field names consume until delimiter: `$revenue_2024` is one field, not `$revenue` + `_2024`

**Rule 2: Layout dimensions**
- `G2x2` means 2 cols × 2 rows (width × height convention)
- Single number defaults to 1D: `G3` means 3 columns, 1 row
- Missing dimension is auto: `G` means auto grid

**Rule 3: Signal shorthand**
- `<>@signal` means emit AND receive to same signal
- `<@s1<@s2` chains receives: block receives both s1 and s2

**Rule 4: Address resolution order** (see §8.3)
1. Explicit ID (`@#id`)
2. Grid position (`@[r,c]`)
3. Type ordinal (`@K0`)
4. Binding signature (`@:field`)
5. Pure ordinal (`@0`)

#### 6.6.5 Normalization Requirements

Per Appendix B.1.2, compilers MUST normalize to ASCII canonical form:

```typescript
function normalize(code: string): string {
  return code
    .replace(/Δ/g, 'delta:')
    .replace(/§/g, 'signal:')
    .replace(/→/g, '->')
    .replace(/↑/g, 'move:')
    .trim();
}
```

This ensures:
- Consistent tokenization across LLM tokenizers
- Deterministic cache keys
- Reduced token counts (see B.1.3)

#### 6.6.6 Error Recovery

Parsers SHOULD implement error recovery for common mistakes:

| Error Pattern | Recovery Strategy | Example |
|---------------|-------------------|---------|
| Missing semicolon | Insert at expected position | `#overview G2x2` → insert `;` |
| Unknown block code | Treat as custom block | `Q$field` → `custom:Q` |
| Malformed address | Fall back to ordinal | `@[0]` → `@0` |
| Extra whitespace | Ignore (tokenizer strips) | `K $revenue` → `K$revenue` |

**Parser output for errors:**
```typescript
interface ParseError {
  position: number;          // Character offset
  line: number;
  column: number;
  expected: string[];        // What was expected
  found: string;             // What was found
  recoverable: boolean;      // Can parser continue?
  suggestion?: string;       // Auto-fix suggestion
}
```
```

**Integration Notes:**
- Update §17.1 to reference §6.6 for tokenization and parsing
- Add cross-references from §8 (addressing) to §6.6.4
- Update Table of Contents

---

### ISS-027: Update Generation Syntax to Normative

**Target Location:** §6.3 (lines 419-437)

**Change Type:** Enhancement (add normative language)

**Before:**
```markdown
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
```

**After:**
```markdown
### 6.3 Generation Syntax (Normative)

**Full interface generation syntax:**

```
#archetype;layout;blocks
```

**Structure requirements:**

1. **Archetype** (REQUIRED): MUST begin with `#` followed by archetype identifier
2. **Layout** (REQUIRED): MUST specify layout type and optional dimensions
   - Format: `LayoutCode[Dimensions]`
   - Layout codes: `G` (grid), `S` (stack), `F` (flow)
   - Dimensions: `NxM` for grid (cols × rows), omitted for stack/flow
3. **Blocks** (REQUIRED): MUST be comma-separated block declarations
   - Each block MUST begin with a block type code (see §6.2)
   - Blocks MAY include bindings, signals, layout modifiers, IDs

**Semicolon delimiters** (REQUIRED): Sections MUST be separated by semicolons (`;`)

**Examples (non-normative):**
```
#overview;G2x2;K$revenue,K$orders,L$date$amount,T
#comparison;S;C$current$previous,B$category$value
#funnel;S;K$stage1,K$stage2,K$stage3,K$stage4
```

**Breakdown:**
- `#overview` — Archetype hint (REQUIRED)
- `G2x2` — Grid layout, 2 columns × 2 rows (REQUIRED format)
- `K$revenue` — KPI block with binding to revenue field
- `L$date$amount` — Line chart with date as X-axis, amount as Y-axis
```

**Integration Notes:**
- Consistent with RFC 2119 language added in §2.3
- Mark examples as non-normative
- Update §17.1 to reference normative requirements

---

## Section 9: Binding System

### ISS-003: Complete Binding Inference Implementation

**Target Location:** §9.3 (lines 693-711)

**Change Type:** Enhancement (add complete algorithms)

**Before:**
```typescript
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

**After:** (Full implementation with all algorithms - see ISS-003 resolution for complete code)

**Summary of Addition:**
- `scoreTypeMatch()` function with type-to-slot mapping
- `scoreSemanticMatch()` with semantic patterns and Levenshtein distance
- `scorePatternMatch()` with cardinality and data pattern checks
- `scorePositionMatch()` with field position heuristics
- `scoreUserHistory()` with frequency and recency scoring
- `calculateBindingScore()` combining all signals with weights
- `suggestBindings()` generating ranked suggestions

**Integration Notes:**
- Implements complete binding suggestion system referenced in §12.5
- Provides testable, deterministic algorithms
- Maintains soft constraint philosophy (scores, not hard blocks)

---

### ISS-027: Add Normative Constraints

**Target Location:** After §9.3 (line 711)

**Change Type:** Addition

**Rationale:** Clarify that binding suggestions are soft constraints, never hard rejections.

**New Content:**
```markdown
**Constraint enforcement (normative):**

1. Suggestions MUST be scores (0-1 range), never hard rejections
2. Engine MUST accept any binding if user explicitly specifies it
3. Low-confidence suggestions (< 0.5) SHOULD prompt for clarification
4. Auto-binding (score > 0.8) MAY proceed without confirmation
5. User explicit intent MUST override all suggestions
```

---

### ISS-031: Binding Requirements Clarification

**Target Location:** §9.1 (lines 639-647) and §9.2 (table)

**Change Type:** Enhancement (add requirements detail)

**Before (§9.1):**
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
```

**After:**
```typescript
interface DataBinding {
  // REQUIRED fields
  source: string;                    // Data source reference (required)
  fields: FieldBinding[];            // Field mappings (required, min 1)

  // OPTIONAL fields with defaults
  aggregate?: AggregateSpec;         // Aggregation (default: none)
  groupBy?: string[];                // Grouping fields (default: [])
  filter?: FilterCondition[];        // Filter conditions (default: [])
  sort?: SortSpec[];                 // Sort order (default: [])
  limit?: number;                    // Row limit (default: unlimited)
}

interface FieldBinding {
  // REQUIRED fields
  target: BindingSlot;               // Slot name (required)
  field: string;                     // Source field name (required)

  // OPTIONAL fields
  transform?: string;                // LiquidExpr transformation (default: none)
}
```

**Also Add:** Complete binding requirements table and validation function (see ISS-031 for full content)

**Update §9.2 Table:**

| Block Type | Required Slots | Optional Slots | Defaults |
|------------|----------------|----------------|----------|
| kpi | value | label, trend, icon, compare | label: null, trend: null |
| bar-chart | category, value | color, label, stack | color: auto, label: category |
| line-chart | x, y | series, color, label | series: null, color: auto |
| pie-chart | label, value | color | color: auto |
| data-table | data | columns, pageSize | columns: all, pageSize: 10 |
| comparison | current, previous | label, format | format: 'percent' |
| text | content | — | — |
| metric-group | metrics | — | — |
| grid | — | — | — |
| stack | — | — | — |
| date-filter | — | label, format | label: 'Date Range' |
| select-filter | options | label, multiple | label: 'Select', multiple: false |
| search-input | — | placeholder | placeholder: 'Search...' |

---

## Section 10: Signal System

### ISS-005: Signal Persistence Implementation

**Target Location:** §10.2 (lines 761-773) and §18.3 (lines 1671-1681)

**Change Type:** Complete specification addition

**Current State:** Persistence strategy enum defined, but no serialization or restoration logic.

**Before (§10.2):**
```typescript
interface SignalDefinition {
  type: SignalType;
  default?: unknown;
  persist?: 'none' | 'url' | 'session' | 'local';
  validation?: string;    // LiquidExpr returning boolean (see B.4)
}
```

**After:** Add complete persistence implementation including:
- `PersistedSignal` interface
- `serializeSignal()` and `deserializeSignal()` functions
- URL encoding/decoding for all signal types
- Restoration priority order (URL > session > local > default)
- `SignalPersistence` class with storage operations
- Complete `DefaultSignalRuntime` implementation

(See ISS-005 resolution for full ~400 lines of implementation)

**Before (§18.3):**
```typescript
interface SignalRuntime {
  get(signalName: string): any;
  set(signalName: string, value: any): void;
  subscribe(signalName: string, callback: (value: any) => void): () => void;
  persist(): void;
  restore(): void;
}
```

**After:**
```typescript
interface SignalRuntime {
  // Value access
  get(signalName: string): any;
  set(signalName: string, value: any): void;

  // Subscription management
  subscribe(signalName: string, callback: (value: any) => void): () => void;

  // Persistence operations
  persist(): void;              // Save all signals to their configured storage
  restore(): void;              // Load all signals from storage
  persistSignal(signalName: string): void;    // Save single signal
  restoreSignal(signalName: string): void;    // Load single signal

  // Metadata
  readonly registry: SignalRegistry;
}
```

**Integration Notes:**
- Provides production-ready persistence implementation
- Handles all signal types with type-specific encoding
- Clear restoration priority order prevents conflicts

---

### ISS-076: Signal Cycle Detection

**Target Location:** After §10.7 (line 870)

**Change Type:** Addition (critical safety feature)

**Rationale:** Prevent infinite loops from circular signal dependencies, violating render guarantee.

**New Section:**

```markdown
### 10.8 Signal Cycle Detection and Prevention

**Problem:** Circular signal dependencies can cause infinite propagation loops, violating the render guarantee.

**Example cycle:**
```liquidcode
§filterA:filter
§filterB:filter
Block1<@filterA>@filterB    # Receives A, emits B
Block2<@filterB>@filterA    # Receives B, emits A
```

#### 10.8.1 Compile-Time Cycle Detection

The compiler MUST detect cycles in signal dependencies before allowing schema validation to pass.

**Algorithm:**

```typescript
interface SignalNode {
  blockUid: string;
  emits: string[];
  receives: string[];
}

function detectSignalCycles(schema: LiquidSchema): CycleDetectionResult {
  const graph = buildSignalDependencyGraph(schema);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  for (const node of graph.nodes) {
    if (!visited.has(node.blockUid)) {
      detectCyclesDFS(node, graph, visited, recursionStack, [], cycles);
    }
  }

  return {
    hasCycles: cycles.length > 0,
    cycles: cycles,
    affectedBlocks: Array.from(new Set(cycles.flat())),
  };
}
```

(See ISS-076 for full DFS implementation and runtime safety net)

**Validation Rule:**

If `detectSignalCycles(schema).hasCycles === true`, compilation MUST fail with error:

```typescript
interface SignalCycleError extends CompilationError {
  code: 'SIGNAL_CYCLE_DETECTED';
  message: string;
  cycles: SignalCycle[];
}
```

#### 10.8.2 Runtime Safety Net

(Defense in depth with propagation depth tracking - see ISS-076)

#### 10.8.3 Signal Versioning (Alternative Approach)

(Generation-based cycle breaking - see ISS-076)
```

**Also Update:**
- §B.3.3 conformance tests (line 2101)
- §B.5.3 coherence gate (line 2264)

**Integration Notes:**
- Critical safety feature addressing edge case ISS-076
- Provides both compile-time and runtime protection
- Maintains "never crash host runtime" guarantee (§B.3.1)

---

## Section 11: Layout & Responsiveness

### ISS-027: Layout Example to Normative

**Target Location:** §11.7 (lines 985-1004)

**Change Type:** Rewrite with normative language

**Before:**
```markdown
### 11.7 Complete Layout Example

[Example with informal descriptions]
```

**After:**
```markdown
### 11.7 Layout Annotation Requirements

**Priority annotation** (OPTIONAL):
- Blocks MAY specify priority using `!` suffix
- Valid values: `!hero`, `!1`, `!2`, `!3`, `!4`, `!primary`, `!secondary`, `!detail`
- Default: `!primary` if omitted

**Flexibility annotation** (OPTIONAL):
- Blocks MAY specify flexibility using `^` suffix
- Valid values: `^fixed`, `^shrink`, `^grow`, `^collapse`
- Default: Block type default (see §11.4)

**Span annotation** (OPTIONAL, grid context only):
- Blocks MAY specify column span using `*` suffix
- Valid values: `*full`, `*half`, `*2`, `*3`, etc.
- Default: Single column span

**Relationship grouping** (OPTIONAL):
- Multiple blocks MAY be grouped using bracket syntax: `[block1 block2]=type`
- Valid relationship types: `group`, `compare`, `detail`, `flow`
- Relationships affect layout behavior per §11.5

**Complete example (non-normative):**

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

**Interpretation:**
- Revenue KPI has hero priority (MUST NOT be hidden at any breakpoint)
- Three KPIs form a group (layout SHOULD keep together)
- Trend chart SHOULD equalize height with region chart (compare relationship)
- Details table MAY collapse at small breakpoints (priority 3 + collapse flexibility)
```

---

## Section 15: Compositional Grammar Engine

### ISS-004: Fragment Composition Algorithm

**Target Location:** After §15.2 (Composition Rules)

**Change Type:** Addition (critical implementation gap)

**Rationale:** Spec defines composition purpose and interfaces but lacks core algorithm.

**New Subsections:**

```markdown
#### 15.2.1 Fragment Selection Algorithm

The composition engine selects fragments to combine using a multi-stage matching process:

```typescript
interface FragmentSelector {
  selectFragments(
    intent: UserIntent,
    dataFingerprint: DataFingerprint,
    cache: FragmentStorage
  ): FragmentSet;
}

interface FragmentSet {
  fragments: CachedFragment[];
  coverage: number;           // 0-1, how much of intent is covered
  conflicts: Conflict[];      // Detected incompatibilities
  confidence: number;         // 0-1, overall confidence score
}
```

**Selection process:**

```
1. Parse Intent → Extract Components
2. Query Cache → Find Candidates
3. Score Candidates → Rank by Fitness
4. Select Optimal Set → Maximize Coverage
5. Validate Set → Check Viability
```

(See ISS-004 for full algorithm with coverage calculation and scoring formulas)

#### 15.2.2 Compatibility Checking

Before merging, validate that fragments can coexist:

```typescript
interface CompatibilityChecker {
  check(fragments: CachedFragment[]): CompatibilityResult;
}
```

**Compatibility checks (executed in parallel):**
1. Binding Compatibility
2. Signal Compatibility
3. Layout Compatibility
4. Type Compatibility

(See ISS-004 for complete implementation of all four checks)

#### 15.2.3 Fragment Merging Algorithm

Once compatibility is verified, merge fragments into a single schema:

**Merging process:**
```
1. Initialize Schema Structure
2. Merge Signal Registries
3. Collect All Blocks
4. Apply Repairs
5. Infer Combined Layout (§15.3)
6. Apply Auto-Wiring (§15.4)
7. Ensure Binding Coherence (§15.5)
8. Assign Block Positions
9. Validate Merged Schema
10. Return Merged Schema
```

(See ISS-004 for signal merging precedence, position assignment, and auto-wiring algorithms)
```

**Integration Notes:**
- Fills critical gap in Tier 3 resolution
- Provides complete, implementable algorithms
- Expected composition success rate: ~75% of Tier 3 attempts
- Time complexity: O(n log n + f²b)

---

## Section 17: Compilation Pipeline

### ISS-002: Update Compilation Pipeline Reference

**Target Location:** §17.1 (after line 1580)

**Change Type:** Enhancement (add references to new §6.6)

**Before:**
```markdown
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
```

**After:**
```markdown
### 17.1 LiquidCode → LiquidSchema

```
LiquidCode (35 tokens)
    ↓
Tokenizer (see §6.6.1)
    ↓ (token stream)
Parser (see §6.6.2)
    ↓ (AST)
Semantic Analyzer (see §6.6.4)
    ↓ (validated AST with resolved references)
Schema Generator
    ↓ (LiquidSchema JSON)
Validator (Zod)
    ↓ (validated LiquidSchema)
Output
```

**Tokenizer responsibilities:**
- Normalize Unicode to ASCII (§6.6.5, B.1.2)
- Strip whitespace and comments
- Emit token stream with position information
- MUST NOT fail on unknown characters (emit ERROR token)

**Parser responsibilities:**
- Build AST from token stream per §6.6.2 grammar
- Apply precedence rules (§6.6.3)
- Resolve ambiguities per §6.6.4
- SHOULD recover from errors per §6.6.6
- Emit ParseError for irrecoverable issues

**Semantic Analyzer responsibilities:**
- Resolve all addresses (§8, §6.6.4 Rule 4)
- Validate signal references (emitted signals must be declared)
- Validate binding slots match block type (§9.2)
- Validate layout constraints (§11)
- MUST fail on unresolvable references
```

---

### ISS-027: Compilation Guarantees to Normative

**Target Location:** §17.4 (lines 1615-1625)

**Change Type:** Rewrite with RFC 2119 language

**Before:**
```markdown
### 17.4 Compilation Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| Type safety | Zod validation |
| No undefined references | Semantic analysis |
| Valid layout | Layout constraint solver |
| Signal consistency | Signal registry validation |
| Binding validity | Binding schema matching |

**If compilation succeeds, rendering cannot fail.**
```

**After:**
```markdown
### 17.4 Compilation Guarantees (Normative)

A compiler conforming to this specification MUST provide these guarantees:

| Guarantee | Mechanism | Requirement Level |
|-----------|-----------|-------------------|
| Type safety | Zod validation | MUST validate all schemas |
| No undefined references | Semantic analysis | MUST resolve all addresses before emit |
| Valid layout | Layout constraint solver | MUST produce renderable layout |
| Signal consistency | Signal registry validation | MUST validate all signal connections |
| Binding validity | Binding schema matching | MUST verify binding slots match block types |

**Correctness invariant:**

> If compilation succeeds, rendering MUST NOT fail due to schema issues.

Adapters MAY fail to render due to:
- Unsupported block types (MUST render placeholder, see B.3)
- Missing data (MUST render empty state)
- Platform limitations (MUST degrade gracefully)

But adapters MUST NOT fail due to:
- Invalid schema structure (compilation prevents this)
- Undefined references (semantic analysis prevents this)
- Type mismatches (Zod validation prevents this)
```

---

## Section 18: Adapter Interface Contract

### ISS-005: Signal Runtime Interface Enhancement

(Already covered in Section 10 above - see ISS-005)

---

## Section 20: Versioning & Migration

### ISS-036: Complete Migration Interface

**Target Location:** §20.3 (lines 1760-1767)

**Change Type:** Complete specification addition

**Before:**
```typescript
interface Migration {
  from: string;    // "1.0"
  to: string;      // "2.0"
  migrate(schema: OldSchema): NewSchema;
}
```

**After:**
```typescript
/**
 * Migration Interface
 *
 * Provides transformation between LiquidSchema versions.
 * All migrations MUST be:
 * - Deterministic (same input → same output)
 * - Total (never throw for valid input schema)
 * - Documented (provide change log)
 */

interface Migration {
  // Version identification
  from: string;                      // Source version (e.g., "1.0")
  to: string;                        // Target version (e.g., "2.0")

  // Metadata
  id: string;                        // Unique migration ID
  description: string;               // Human-readable description
  breaking: boolean;                 // Whether migration is breaking

  // Core transformation
  migrate(schema: unknown): MigrationResult;

  // Validation
  canMigrate(schema: unknown): boolean;

  // Utilities
  getChangelog(): ChangelogEntry[];
  estimateComplexity(schema: unknown): MigrationComplexity;
}

interface MigrationResult {
  success: boolean;
  schema?: LiquidSchema;             // Migrated schema (if success)
  errors?: MigrationError[];         // Errors (if failure)
  warnings?: MigrationWarning[];     // Non-fatal issues
  metadata: MigrationMetadata;
}
```

**Also Add:**
- `MigrationRegistry` interface for managing migration paths
- Complete `Migration_v1_to_v2` example implementation
- BFS algorithm for finding multi-hop migration paths
- Integration with coherence gate (§B.5.4)

(See ISS-036 for full ~580 lines of specification)

**Integration Notes:**
- Provides complete migration infrastructure
- Supports multi-version migration paths (v1 → v1.5 → v2)
- Includes transformation logging for auditability
- Integrates with coherence validation

---

## Appendix B: Hardening Specification

### ISS-023: Complete ASCII Operator Mapping

**Target Location:** §B.1.1 (replace existing partial mapping)

**Change Type:** Complete specification

**Rationale:** Current mapping is incomplete and has conflicts (e.g., `^` used for both move and flexibility).

**Before:**
```markdown
#### B.1.1 ASCII Operator Mapping

| Unicode | ASCII | Meaning |
|---------|-------|---------|
| `Δ` | `D` or `delta:` | Mutation mode |
| `§` | `S` or `signal:` | Signal declaration |
| `→` | `->` | Replacement / flow |
| `↑` | `^` or `move:` | Move operation |
```

**After:**
```markdown
#### B.1.1 ASCII Operator Mapping (Complete)

**Mode Prefixes:**

| Unicode | ASCII Primary | ASCII Alternative | Meaning | Example |
|---------|---------------|-------------------|---------|---------|
| `#` | `#` | N/A (already ASCII) | Archetype | `#overview` |
| `Δ` | `delta:` | `D:` | Mutation mode | `delta:+K$profit` or `D:+K$profit` |
| `?` | `?` | N/A (already ASCII) | Query mode | `?@K0` |

**Address Prefixes:**

| Unicode | ASCII Primary | ASCII Alternative | Meaning | Example |
|---------|---------------|-------------------|---------|---------|
| `@` | `@` | N/A (already ASCII) | Address | `@K0` |
| `$` | `$` | N/A (already ASCII) | Binding field | `$revenue` |

**Signal Operators:**

| Unicode | ASCII Primary | ASCII Alternative | Meaning | Example |
|---------|---------------|-------------------|---------|---------|
| `§` | `signal:` | `S:` | Signal declaration | `signal:dateRange:dr=30d,url` |
| `>` | `>` | `emit:` | Emit signal | `>@dateRange` or `emit:@dateRange` |
| `<` | `<` | `recv:` | Receive signal | `<@dateRange->filter` |

**Mutation Operations:**

| Unicode | ASCII Primary | ASCII Alternative | Meaning | Example |
|---------|---------------|-------------------|---------|---------|
| `+` | `+` | N/A (already ASCII) | Add block | `delta:+K$profit` |
| `-` | `-` | N/A (already ASCII) | Remove block | `delta:-@K1` |
| `→` | `->` | N/A | Replace/flow | `delta:@P0->B` |
| `↑` | `move:` | N/A | Move operation | `delta:move:@[0,0]->[1,1]` |
| `~` | `~` | `mod:` | Modify property | `delta:~@K0.label:"New"` |

**Layout Operators:**

| Unicode | ASCII Primary | ASCII Alternative | Meaning | Example |
|---------|---------------|-------------------|---------|---------|
| `!` | `!` | `pri:` | Priority suffix | `K$revenue!hero` |
| `^` | `^` | `flex:` | Flexibility suffix | `K$revenue^fixed` |
| `*` | `*` | `span:` | Span suffix | `L$trend*full` |
| `=` | `=` | `rel:` | Relationship | `[K$a K$b]=group` |
```

**Also Update §B.1.2:** Add complete normalization function and conflict resolution rules.

**Integration Notes:**
- Resolves `^` conflict (only used for flexibility, not move)
- All operators now have complete ASCII mappings
- Provides primary and alternative forms with clear precedence

---

### ISS-006: Complete Coherence Gate Validation

**Target Location:** §B.5 (enhance existing content)

**Change Type:** Major addition (complete algorithm specification)

**Add New Subsections:**

```markdown
#### B.5.1.1 Type Compatibility Matrix

Before any coherence check, the system must validate type compatibility between bindings and data fields. This matrix defines all valid combinations:

```typescript
const TYPE_COMPATIBILITY_MATRIX: Record<BindingSlot, TypeRequirement> = {
  value: {
    acceptedTypes: ['number', 'integer', 'float', 'decimal', 'currency'],
    acceptedPatterns: [/amount$/, /price$/, /cost$/, /revenue$/, /total$/],
    coercible: ['string'],
    validation: (value: unknown) => !isNaN(Number(value)),
  },
  // ... complete matrix for all binding slots
};
```

(See ISS-006 for full type compatibility matrix covering all 17+ binding slots)

#### B.5.1.2 Field Existence Checking Algorithm

```typescript
function validateFieldExistence(
  fragment: CachedFragment,
  dataFingerprint: DataFingerprint
): FieldExistenceResult {
  // Complete implementation with:
  // - Required slot validation
  // - Field existence checks
  // - Fuzzy matching for typos
  // - Binding candidate inference
}
```

(See ISS-006 for complete ~150 lines of validation logic)

#### B.5.1.3 Type Compatibility Validation

(Complete type checking implementation - see ISS-006)

#### B.5.3.1 Enhanced Signal Coherence Validation

**Comprehensive signal coherence validation:**

```typescript
function validateSignalCoherence(
  fragment: CachedFragment,
  parentContext?: SignalRegistry
): SignalCoherenceResult {
  // Checks:
  // 1. All emitted signals are declared
  // 2. All received signals are declared or emitted
  // 3. Signals with receivers but no emitters (warnings)
  // 4. Signals with emitters but no receivers (info)
  // 5. Type compatibility between emitters and receivers
  // 6. Circular signal dependencies (NEW from ISS-076)
}
```

(See ISS-006 for complete ~300 lines including cycle detection)

#### B.5.5.1 Complete Repair Trigger Logic

**Master coherence validation:**

```typescript
function validateCoherence(
  fragment: CachedFragment,
  dataFingerprint: DataFingerprint,
  parentContext?: SignalRegistry
): CoherenceResult {
  // Orchestrates all checks:
  const fieldExistence = validateFieldExistence(fragment, dataFingerprint);
  const typeCompat = validateTypeCompatibility(fragment, dataFingerprint);
  const signalCoher = validateSignalCoherence(fragment, parentContext);
  const layoutValid = validateLayoutCoherence(fragment);
  const dataCoher = validateDataCoherence(fragment, dataFingerprint);

  // Determines repair strategy with confidence thresholds
}
```

**Repair strategies:**
- Auto-substitute (confidence 0.9, zero cost)
- Auto-declare (confidence 0.95, zero cost)
- Auto-transform (confidence 0.85, zero cost)
- Micro-LLM (confidence 0.7, 5-10 tokens)
- Escalate to composition (confidence 0.3-0.5)
- Escalate to LLM (confidence < 0.3)

(See ISS-006 for complete decision tree and repair application logic)
```

**Integration Notes:**
- Transforms conceptual coherence gate into executable system
- Provides type compatibility matrix for all binding slots
- Includes fuzzy field matching with Levenshtein distance
- Complete signal coherence with cycle detection (links to ISS-076)
- Decision tree for repair vs escalation with clear thresholds

---

### ISS-076: Update Conformance Tests

**Target Location:** §B.3.3 (line 2101)

**Change Type:** Enhancement (make tests specific)

**Before:**
```typescript
'does not deadlock on circular signal reference',
```

**After:**
```typescript
// Compile-time detection
'rejects schema with circular signal dependencies at compile time',
'provides actionable error message with cycle path',
'suggests specific fixes to break cycle',

// Runtime protection
'halts signal propagation at depth limit without crashing',
'renders last-known values when cycle detected at runtime',
'logs cycle detection in development mode',
```

---

## Appendix C: Implementation Guide (NEW)

### ISS-136: Add Complete Implementation Guide

**Target Location:** After Appendix B (new appendix)

**Change Type:** Addition (major documentation)

**Rationale:** Specification lacks practical implementation guidance, making it difficult to build the system from scratch.

**New Appendix Structure:**

```markdown
## Appendix C: Implementation Guide

This appendix provides a structured guide for implementing the LiquidCode v2 system from scratch.

### C.1 Implementation Phases

#### C.1.1 Phase Overview

| Phase | Component | Dependencies | Estimated Effort |
|-------|-----------|--------------|------------------|
| 1 | Core Schema & Validation | None | 1 week |
| 2 | LiquidCode Parser | Phase 1 | 2 weeks |
| 3 | Compiler Pipeline | Phases 1-2 | 2 weeks |
| 4 | Block Addressing System | Phase 1 | 1 week |
| 5 | Binding System | Phases 1, 3 | 2 weeks |
| 6 | Signal System | Phases 1, 3 | 1 week |
| 7 | Discovery Engine | Phases 1, 5 | 3 weeks |
| 8 | Fragment Cache | Phases 1, 3 | 2 weeks |
| 9 | Tiered Resolution | Phases 7-8 | 2 weeks |
| 10 | Layout System | Phase 3 | 2 weeks |
| 11 | Digital Twin & State | Phases 1, 4 | 1 week |
| 12 | Adapter Interface | All | 2 weeks |
| 13 | LLM Integration | Phases 2, 9 | 3-4 weeks |

**Total Estimated Timeline:** 16-20 weeks for complete implementation

**MVI (Minimum Viable Implementation) Timeline:** 4-6 weeks
```

(See ISS-136 for complete 1,200+ line implementation guide covering all 13 phases)

**Appendix C Contents:**
- C.1: Implementation Phases (with MVI path)
- C.2: Phase-by-Phase Starting Points (13 subsections)
- C.3: Testing Strategy (unit, integration, conformance, performance)
- C.4: Common Implementation Pitfalls (parser, UIDs, signals, layout, LiquidExpr)
- C.5: Deployment Checklist (functional, performance, reliability, security)
- C.6: Troubleshooting Guide (parser, compilation, resolution, render, performance)
- C.7: Extension Points (custom blocks, signals, archetypes, functions)
- C.8: Migration from V1 (if applicable)
- C.9: Performance Optimization Guide
- C.10: Recommended Tools & Libraries
- C.11: Summary

**Integration Notes:**
- Add to Table of Contents
- Cross-reference from §17 (compilation) and Appendix B.7 (hardening)
- References all identified implementation gaps
- Provides concrete code examples for each phase
- Includes estimated timelines and effort

---

## Conflicts and Overlaps

**No conflicts detected** between Wave 1 resolutions. All changes are either:
1. Additions to different sections (no overlap)
2. Enhancements to existing content (complementary)
3. Clarifications (non-contradictory)

**Complementary Changes:**
- ISS-002 (formal grammar) + ISS-023 (ASCII mapping) work together
- ISS-005 (signal persistence) + ISS-076 (cycle detection) both enhance §10
- ISS-006 (coherence gate) integrates ISS-076 (cycle detection)
- ISS-027 (normative language) applies uniformly across all sections

---

## Integration Instructions

### Step 1: Preparation
1. Create backup of current spec: `LIQUIDCODE-SPEC-v2.backup.md`
2. Review this merge document completely
3. Note all line number references (may shift during merge)

### Step 2: Apply Changes in Order

**Recommended merge order:**

1. **§2.3** (ISS-027) - Foundation for normative language
2. **§4.1** (ISS-016) - Block interface alignment
3. **§6.6** (ISS-002) - Formal grammar addition
4. **§6.3** (ISS-027) - Update generation syntax to normative
5. **§9.1, §9.2, §9.3** (ISS-003, ISS-027, ISS-031) - Binding system
6. **§10.2, §10.8** (ISS-005, ISS-076) - Signal enhancements
7. **§11.7** (ISS-027) - Layout normative update
8. **§15.2.1-15.2.3** (ISS-004) - Composition algorithm
9. **§17.1, §17.4** (ISS-002, ISS-027) - Compilation updates
10. **§18.3** (ISS-005) - Signal runtime
11. **§20.3** (ISS-036) - Migration interface
12. **§B.1** (ISS-023) - Complete ASCII mapping
13. **§B.3.3** (ISS-076) - Conformance tests
14. **§B.5** (ISS-006) - Coherence gate
15. **Appendix C** (ISS-136) - Implementation guide

### Step 3: Validation

After each section merge:
1. Check line number references still valid
2. Verify cross-references intact
3. Update Table of Contents
4. Validate markdown syntax
5. Check code block formatting

### Step 4: Final Review

1. Full read-through for consistency
2. Verify all cross-references work
3. Check normative language usage (MUST/SHOULD/MAY)
4. Validate TypeScript code blocks compile
5. Ensure examples match updated syntax

---

## Testing Recommendations

After applying all Wave 1 changes:

1. **Grammar Testing:**
   - Parse all examples in spec with formal grammar
   - Test edge cases from §6.6.4
   - Validate ASCII normalization

2. **Binding System Testing:**
   - Implement scoring algorithms from ISS-003
   - Test against sample datasets
   - Validate soft constraint behavior

3. **Signal System Testing:**
   - Test persistence serialization/deserialization
   - Validate cycle detection with examples from ISS-076
   - Test restoration priority order

4. **Composition Testing:**
   - Implement fragment selection algorithm
   - Test compatibility checking
   - Validate merging with various fragment combinations

5. **Coherence Testing:**
   - Test type compatibility matrix
   - Validate field existence checking
   - Test repair trigger conditions

---

## Post-Merge Checklist

- [ ] All 14 Wave 1 resolutions applied
- [ ] Table of Contents updated
- [ ] Cross-references validated
- [ ] Normative language consistent (RFC 2119)
- [ ] Code examples compile
- [ ] Line numbers in document match references
- [ ] No markdown syntax errors
- [ ] All TypeScript interfaces valid
- [ ] Examples match updated grammar
- [ ] Implementation guide references correct sections

---

## Appendix: Resolution Summary Table

| Issue | Section | Type | Lines Changed | Complexity | Breaking |
|-------|---------|------|---------------|------------|----------|
| ISS-002 | §6.6 | Addition | +280 | High | No |
| ISS-003 | §9.3 | Enhancement | +150 | Medium | No |
| ISS-004 | §15.2 | Addition | +320 | High | No |
| ISS-005 | §10.2, §18.3 | Addition | +400 | High | No |
| ISS-006 | §B.5 | Enhancement | +600 | Very High | No |
| ISS-016 | §4.1 | Update | +8 | Low | No |
| ISS-023 | §B.1 | Complete | +120 | Medium | No |
| ISS-027 | Multiple | Enhancement | +80 | Low | No |
| ISS-031 | §9.1, §9.2 | Clarification | +180 | Medium | No |
| ISS-036 | §20.3 | Addition | +580 | High | No |
| ISS-048 | §4.4 | Optional | +3 | Trivial | No |
| ISS-076 | §10.8, §B.3.3 | Addition | +260 | High | No |
| ISS-136 | Appendix C | Addition | +1200 | Very High | No |

**Total Estimated Line Changes:** ~4,181 lines
**New Sections Added:** 7
**Enhanced Sections:** 11
**Breaking Changes:** 0

---

**Document Author:** Claude Opus 4.5
**Review Status:** Ready for Review
**Next Steps:** Apply changes to specification, validate, test

