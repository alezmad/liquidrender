# LiquidCode Production Checklist

> **Goal:** First UI language optimized for LLM generation with low latency, high specificity, and semantic clarity.

**Core Premise:** Token reduction → Lower latency → Better UX for liquid interfaces

---

## Executive Summary

LiquidCode aims to be the optimal format for LLMs to generate UI. This checklist covers everything needed to achieve production readiness across five dimensions:

1. **Syntax Optimization** - Token efficiency without losing LLM accuracy
2. **Compiler Robustness** - Graceful handling of malformed/streaming input
3. **LLM Alignment** - Grammar designed for how LLMs actually work
4. **Streaming Support** - Real-time partial rendering
5. **Specification Formalization** - Unambiguous, testable grammar

---

## Phase 1: Safe Syntax Optimizations

These changes reduce tokens without affecting LLM generation quality.

### 1.1 Implicit Container
- [ ] Make `0` optional when `[...]` is present
- [ ] `[Kp :a, Kp :b]` equivalent to `0 [Kp :a, Kp :b]`
- [ ] Parser infers container type from bracket presence
- [ ] Update emitter to omit redundant `0`

**Token savings:** ~5-10% for nested layouts

### 1.2 Whitespace-Optional Modifiers
- [ ] Allow modifiers without separating whitespace
- [ ] `Kp:revenue#green!h` equivalent to `Kp :revenue #green !h`
- [ ] Prefixes (`:`, `#`, `!`, `@`, `>`, `<`, `~`, `$`, `^`, `*`) are unambiguous delimiters
- [ ] Keep whitespace optional (both forms valid)

**Token savings:** ~3-5% for modifier-heavy components

### 1.3 Short Color Aliases
- [ ] Define 1-char color aliases: `#g`→green, `#r`→red, `#b`→blue, etc.
- [ ] Keep full names valid for readability
- [ ] Expand aliases in parser, emit short form

| Alias | Full Color |
|-------|------------|
| `#r` | red |
| `#g` | green |
| `#b` | blue |
| `#y` | yellow |
| `#o` | orange |
| `#p` | purple |
| `#w` | white |
| `#k` | black |
| `#gy` | gray |

**Token savings:** ~1-2% for styled components

### 1.4 Repetition Shorthand (Already Implemented)
- [x] Multiple fields expand to multiple components
- [x] `Kp :a :b :c` → 3 separate KPIs
- [x] Works with all component types

### 1.5 Do NOT Implement
- [ ] ~~1-char type codes~~ - Too ambiguous for LLMs
- [ ] ~~Context-dependent meanings~~ - Increases error rate
- [ ] ~~Aggressive abbreviations~~ - Training data bias

---

## Phase 2: Compiler Robustness

### 2.1 Error Recovery (Critical for Streaming)
- [ ] Scanner continues after errors (collect, don't throw)
- [ ] Parser synchronizes at safe points (newline, `]`, `,`)
- [ ] Return partial AST with error markers
- [ ] Enable "best effort" rendering of incomplete input

```typescript
interface ParseResult {
  schema: UISchema;
  errors: LiquidCodeError[];
  isComplete: boolean;
  recoverableAt?: number; // Position where parsing can resume
}
```

### 2.2 Resource Limits
- [ ] `MAX_TOKEN_LENGTH = 10000` - Single token limit
- [ ] `MAX_NESTING_DEPTH = 100` - Bracket depth limit
- [ ] `MAX_TOTAL_TOKENS = 100000` - Total tokens limit
- [ ] `MAX_STRING_LENGTH = 50000` - Label/content limit
- [ ] Emit clear errors when limits exceeded

### 2.3 Input Validation
- [ ] UTF-8 validation (reject orphaned surrogates)
- [ ] Line ending normalization (`\r\n` → `\n`)
- [ ] Control character handling (strip or error)
- [ ] BOM detection and stripping

### 2.4 Escape Sequence Handling
- [ ] Support: `\"`, `\\`, `\n`, `\t`, `\r`
- [ ] Add: `\uXXXX` for unicode escapes
- [ ] Decision: Unknown escapes → warning + keep literal
- [ ] Document escape behavior in spec

### 2.5 Diagnostic Quality
- [ ] Sanitize control chars in error messages
- [ ] Show visible representation of whitespace
- [ ] Include source context with pointer
- [ ] Suggest fixes for common errors

```
LiquidCodeError: Unterminated string

  12 | Kp :revenue "Total Revenue
                   ^~~~~~~~~~~~~~~~

  Did you mean: "Total Revenue"
```

---

## Phase 3: LLM Alignment

### 3.1 Grammar Predictability
- [ ] Document canonical modifier order
- [ ] Enforce consistent patterns in examples
- [ ] Parser accepts any order, emitter uses canonical

**Canonical order:**
```
?condition TYPE :field "label" #color !priority @signal >emit <receive ~stream $fidelity ^layout *span [children]
```

### 3.2 Morphological Consistency
- [ ] Audit type codes for confusability
- [ ] Document naming rationale
- [ ] Consider 3-char codes for new types (future)

| Current | Meaning | Confusability |
|---------|---------|---------------|
| `Kp` | KPI | Low (unique) |
| `Bt` | Button | Low |
| `Tb` | Table | Medium (Tab?) |
| `Tx` | Text | Low |
| `Ln` | Line chart | Medium (Line?) |
| `Br` | Bar chart | Medium (Break?) |

### 3.3 Prefix Unambiguity Audit
- [ ] Verify no prefix is also a complete token
- [ ] Verify all prefixes are distinguishable
- [ ] Document prefix meanings clearly

| Prefix | Meaning | Status |
|--------|---------|--------|
| `:` | Field binding | ✅ Unique |
| `#` | Color | ✅ Unique |
| `!` | Priority/Action | ✅ Unique |
| `@` | Signal declare | ✅ Unique |
| `>` | Signal emit | ✅ Unique |
| `<` | Signal receive | ✅ Unique |
| `~` | Streaming | ✅ Unique |
| `$` | Fidelity | ✅ Unique |
| `^` | Layout/Flex | ✅ Unique |
| `*` | Span | ✅ Unique |
| `?` | Conditional | ✅ Unique |
| `/` | Layer | ✅ Unique |
| `"` | String start | ✅ Unique |
| `[` | Children start | ✅ Unique |

### 3.4 Few-Shot Prompt Engineering
- [ ] Create minimal prompt template (~200 tokens)
- [ ] Create standard prompt template (~500 tokens)
- [ ] Create comprehensive prompt template (~1000 tokens)
- [ ] Benchmark LLM accuracy with each
- [ ] Document recommended prompt for each use case

### 3.5 Training Data Consideration
- [ ] Generate synthetic training examples (10K+)
- [ ] Cover all component types
- [ ] Cover all modifier combinations
- [ ] Include intentional errors with corrections
- [ ] Format for fine-tuning (if needed)

---

## Phase 4: Streaming Parser

### 4.1 Incremental Parsing API
- [ ] `StreamingParser.feed(chunk: string): PartialResult`
- [ ] `StreamingParser.finalize(): FinalResult`
- [ ] `StreamingParser.getBestEffort(): RenderableSchema`
- [ ] `StreamingParser.getInsertionPoint(): Position`

```typescript
interface StreamingParser {
  feed(chunk: string): {
    schema: UISchema;
    complete: boolean;
    pendingTokens: string;
    errors: LiquidCodeError[];
  };

  finalize(): {
    schema: UISchema;
    errors: LiquidCodeError[];
  };

  getBestEffort(): UISchema; // Always returns something renderable

  reset(): void;
}
```

### 4.2 Partial Validity
- [ ] Define "minimally valid" states
- [ ] `Kp` alone → valid (empty KPI)
- [ ] `Kp :rev` → valid (partial field)
- [ ] `Kp :revenue "Lab` → valid (partial label)
- [ ] Render partial state with placeholders

### 4.3 Token Boundary Handling
- [ ] Handle chunks that split tokens
- [ ] Buffer incomplete tokens across feeds
- [ ] Detect when waiting for more input vs error

### 4.4 Render Checkpoints
- [ ] Emit renderable checkpoints during parsing
- [ ] Allow UI to update progressively
- [ ] Define checkpoint granularity (component-level)

---

## Phase 5: Specification Formalization

### 5.1 Formal Grammar (EBNF)
- [ ] Complete EBNF grammar for all constructs
- [ ] Machine-readable format
- [ ] Generate parser from grammar (optional)
- [ ] Validate grammar is unambiguous

```ebnf
program     = { statement } ;
statement   = [ condition ] component { modifier } [ children ] ;
component   = type_code | type_index ;
type_code   = uppercase letter { lowercase } ;
type_index  = digit ;
modifier    = field | label | color | priority | signal | stream | fidelity | layout | span ;
field       = ":" identifier { "." identifier } ;
label       = '"' { char | escape } '"' ;
color       = "#" ( color_name | conditional_color ) ;
...
```

### 5.2 Semantic Specification
- [ ] Define exact meaning of each construct
- [ ] Define default values
- [ ] Define inheritance rules
- [ ] Define conflict resolution

### 5.3 Conformance Test Suite
- [ ] 100+ golden tests for roundtrip
- [ ] Edge case tests for each construct
- [ ] Error case tests
- [ ] Streaming tests
- [ ] Performance benchmarks

### 5.4 Version Strategy
- [ ] Define versioning scheme
- [ ] Define backwards compatibility rules
- [ ] Define deprecation process
- [ ] Include version in schema output

---

## Phase 6: Performance Benchmarks

### 6.1 Token Efficiency Metrics
- [ ] Benchmark vs JSX (target: 50%+ savings)
- [ ] Benchmark vs JSON (target: 40%+ savings)
- [ ] Benchmark vs HTML (target: 60%+ savings)
- [ ] Measure across UI complexity levels

### 6.2 Parse Performance
- [ ] Target: <1ms for typical UI (~50 components)
- [ ] Target: <10ms for complex UI (~500 components)
- [ ] Target: <100ms for max UI (~5000 components)
- [ ] Benchmark streaming parse throughput

### 6.3 LLM Generation Quality
- [ ] Measure syntax error rate (target: <1%)
- [ ] Measure semantic accuracy (target: >95%)
- [ ] Measure token usage vs alternatives
- [ ] Compare across LLM models (GPT-4, Claude, etc.)

---

## Phase 7: Developer Experience

### 7.1 Tooling
- [ ] Syntax highlighter (VSCode extension)
- [ ] Language server (autocomplete, hover)
- [ ] Prettier plugin (formatting)
- [ ] ESLint plugin (linting)

### 7.2 Documentation
- [ ] Quick start guide
- [ ] Complete reference
- [ ] Interactive playground
- [ ] Migration guide from JSX/HTML

### 7.3 Debug Tools
- [ ] AST visualizer
- [ ] Roundtrip diff viewer
- [ ] Token count analyzer
- [ ] Error explainer

---

## Implementation Priority

### P0 - Critical (Before Production)
1. Error recovery for streaming
2. Resource limits
3. Streaming parser API
4. Formal grammar specification
5. Conformance test suite (100+ tests)

### P1 - High (Production Ready)
1. Implicit container syntax
2. Whitespace-optional modifiers
3. Short color aliases
4. UTF-8 validation
5. Diagnostic quality improvements

### P2 - Medium (Post-Launch)
1. Few-shot prompt templates
2. Token efficiency benchmarks
3. VSCode extension
4. Interactive playground

### P3 - Low (Future)
1. Fine-tuning dataset
2. Language server
3. Additional tooling

---

## Success Criteria

LiquidCode is production-ready when:

| Metric | Target | Current |
|--------|--------|---------|
| Roundtrip accuracy | 100% | 100% ✅ |
| Token savings vs JSX | >50% | ~55% ✅ |
| LLM syntax error rate | <2% | TBD |
| Parse time (50 components) | <1ms | TBD |
| Streaming chunk latency | <10ms | TBD |
| Test coverage | >95% | ~90% |
| Formal grammar | Complete | Partial |

---

## Final Recommendations

### Keep (Already Optimal)
- 2-char type codes (Kp, Bt, Tx, etc.)
- Single-char prefix modifiers
- Bracket-based nesting
- Repetition shorthand

### Implement (Safe Token Wins)
- Implicit container with `[...]`
- Whitespace-optional between modifiers
- Short color aliases

### Avoid (Would Hurt LLM Accuracy)
- 1-char type codes
- Context-dependent syntax
- Aggressive abbreviations
- Complex escape sequences

### Prioritize (Unique Value Proposition)
- Streaming parser with partial rendering
- Error recovery for malformed input
- Comprehensive prompt templates
- Formal verifiable grammar

---

## Appendix: Quick Reference

### Token Type Codes
```
0-9  Core types (container, text, etc.)
Kp   KPI/metric display
Bt   Button
Tx   Text
Ln   Line chart
Br   Bar chart
Pi   Pie chart
Tb   Table
Fm   Form
In   Input
Se   Select
Sw   Switch
Ck   Checkbox
Rd   Radio
Ta   Textarea
Dt   Date picker
Rg   Range slider
Cl   Color picker
Up   File upload
Cd   Card
Ls   List
Ac   Accordion
Cr   Carousel
St   Stepper
Md   Modal
Dw   Drawer
Pp   Popover
Tl   Tooltip
Av   Avatar
Tg   Tag
Rt   Rating
Pg   Progress
Gn   Gauge
Sl   Sparkline
Hm   Heatmap
Mp   Map
Ca   Calendar
Ti   Timeline
Kb   Kanban
Gd   Grid
Sk   Skeleton
Im   Image
Ic   Icon
Hd   Header
```

### Modifier Prefixes
```
:field     Field binding
"label"    Display label
#color     Color/style
!priority  Priority/action
@signal    Signal declare
>emit      Signal emit
<receive   Signal receive
~stream    Streaming source
$fidelity  Fidelity hint
^layout    Flex/layout
*span      Grid span
?cond      Conditional render
/layer     Layer/overlay
```

### Example Complexity Levels

**Simple (5 tokens):**
```liquid
Kp :revenue
```

**Medium (25 tokens):**
```liquid
0 ^r [Kp :revenue #green, Kp :orders #blue, Kp :customers #purple]
```

**Complex (100+ tokens):**
```liquid
@tab Bt "Overview" >tab=0, Bt "Details" >tab=1, Bt "Settings" >tab=2
?@tab=0 0 [Kp :revenue :orders :customers, Ln :trend <dateRange]
?@tab=1 Tb :transactions [:date, :customer, :amount, :status] <search <dateRange
?@tab=2 Fm [In :name, In :email, Se :timezone, Sw :notifications]
```
