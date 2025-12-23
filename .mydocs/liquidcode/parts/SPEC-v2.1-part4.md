# LiquidCode Specification v2.1 - Part 4: Appendices

**Version:** 2.1
**Date:** 2025-12-22
**Status:** Draft
**Authors:** Liquid Engine Core Team

---

## Table of Contents - Part 4

- [Appendix A: Quick Reference](#appendix-a-quick-reference)
- [Appendix B: Hardening Specification](#appendix-b-hardening-specification)
- [Appendix C: Implementation Guide](#appendix-c-implementation-guide)
- [Appendix D: Reference Implementation](#appendix-d-reference-implementation)
- [Appendix E: Interactive Playground](#appendix-e-interactive-playground)

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
| `<` | `<` | `recv:` | Receive signal | `<@dateRange->filter` or `recv:@dateRange->filter` |

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
| `!` | `!` | `pri:` | Priority suffix | `K$revenue!hero` or `K$revenue pri:hero` |
| `^` | `^` | `flex:` | Flexibility suffix | `K$revenue^fixed` or `K$revenue flex:fixed` |
| `*` | `*` | `span:` | Span suffix | `L$trend*full` or `L$trend span:full` |
| `=` | `=` | `rel:` | Relationship | `[K$a K$b]=group` or `[K$a K$b] rel:group` |

#### B.1.2 Grammar Normalization

Compilers MUST:
1. **Accept both ASCII and Unicode forms**
2. **Normalize to ASCII primary form for caching/hashing**
3. **Emit ASCII primary in LLM prompts** (maximum tokenizer compatibility)
4. **Accept Unicode in human-authored contexts**

**Precedence rules when multiple forms exist:**
- Primary form is always preferred for output
- Alternative forms accepted for input only
- Normalization function converts all to primary

**Conflict resolution:**
- `^` context-dependent:
  - After block definition + before word → flexibility suffix (`K$rev^fixed`)
  - After `delta:` + before `@` → NOT USED (use `move:` instead)
- When ambiguous, use longest matching keyword form (`move:` over `^`)

**Normalization function (updated):**
```typescript
function normalizeToASCII(code: string): string {
  return code
    // Mode prefixes
    .replace(/Δ/g, 'delta:')
    .replace(/§/g, 'signal:')

    // Flow operator (context-aware, not in flex position)
    .replace(/→/g, '->')

    // Move operation (explicit keyword to avoid ^ conflict)
    .replace(/↑/g, 'move:')

    // Alternative forms to primary
    .replace(/\bD:/g, 'delta:')
    .replace(/\bS:/g, 'signal:')
    .replace(/\bemit:/g, '>')
    .replace(/\brecv:/g, '<')
    .replace(/\bmod:/g, '~')
    .replace(/\bpri:/g, '!')
    .replace(/\bflex:/g, '^')
    .replace(/\bspan:/g, '*')
    .replace(/\brel:/g, '=');
}
```

#### B.1.3 Complete Examples (ASCII vs Unicode)

**Generation (both forms identical):**
```liquidcode
# Unicode/ASCII (no difference)
#overview;G2x2;K$revenue,K$orders,L$date$amount,T
```

**Signal Declaration:**
```liquidcode
# ASCII Primary
signal:dateRange:dr=30d,url
signal:category:sel=all,session

# ASCII Alternative
S:dateRange:dr=30d,url
S:category:sel=all,session

# Unicode (sugar)
§dateRange:dr=30d,url
§category:sel=all,session
```

**Signal Connections:**
```liquidcode
# ASCII Primary
>@dateRange:onChange
<@dateRange->filter.date

# ASCII Alternative
emit:@dateRange:onChange
recv:@dateRange->filter.date

# Unicode/Mixed (already ASCII for ><)
>@dateRange:onChange
<@dateRange→filter.date
```

**Mutations:**
```liquidcode
# ASCII Primary
delta:+K$profit@[1,2]
delta:-@K1
delta:@P0->B
delta:~@K0.label:"Total Revenue"
delta:move:@[0,0]->[1,1]

# ASCII Alternative
D:+K$profit@[1,2]
D:-@K1
D:@P0->B
D:mod:@K0.label:"Total Revenue"
D:move:@[0,0]->[1,1]

# Unicode (sugar)
Δ+K$profit@[1,2]
Δ-@K1
Δ@P0→B
Δ~@K0.label:"Total Revenue"
Δ↑@[0,0]→[1,1]
```

**Layout Annotations:**
```liquidcode
# ASCII Primary
K$revenue!hero^fixed
L$trend!1^grow*full
[K$a K$b K$c]=group

# ASCII Alternative
K$revenue pri:hero flex:fixed
L$trend pri:1 flex:grow span:full
[K$a K$b K$c] rel:group

# Unicode (same as primary for these)
K$revenue!hero^fixed
L$trend!1^grow*full
[K$a K$b K$c]=group
```

**Query:**
```liquidcode
# ASCII/Unicode (identical)
?@K0
?@[0,1]
?summary
```

#### B.1.4 Token Budget Validation

**Tokenizer Testing Requirements:**
- Test with GPT-4, Claude 3.5, and Llama 3 tokenizers
- Measure P50/P90/P99 for ASCII primary vs Unicode
- Compare primary vs alternative forms

**Acceptance Criteria:**
- P99 generation ≤ 60 tokens (both ASCII primary and Unicode)
- P99 mutation ≤ 15 tokens (both forms)
- ASCII primary within 5% of Unicode token count
- ASCII alternative within 15% of ASCII primary

**Expected Results:**
| Form | Generation (P99) | Mutation (P99) | Notes |
|------|------------------|----------------|-------|
| Unicode | ~40-50 tokens | ~8-12 tokens | May spike on non-GPT tokenizers |
| ASCII Primary | ~42-52 tokens | ~9-13 tokens | Most stable across tokenizers |
| ASCII Alternative | ~45-58 tokens | ~10-15 tokens | Longer keywords, trade verbosity for clarity |

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

This section defines the complete test suite for validating LiquidCode implementations. Tests are categorized by component and include acceptance criteria for each.

**Minimum tests for adapter certification:**

```typescript
const conformanceTests = [
  // Block rendering (13 tests, one per block type)
  'renders kpi block',
  'renders bar-chart block',
  'renders line-chart block',
  'renders pie-chart block',
  'renders data-table block',
  'renders grid layout',
  'renders stack layout',
  'renders text block',
  'renders metric-group block',
  'renders comparison block',
  'renders date-filter block',
  'renders select-filter block',
  'renders search-input block',

  // Error handling (4 tests)
  'renders placeholder for unknown block type',
  'renders empty state for null data',
  'renders empty state for mismatched data shape',
  'does not throw on malformed binding',

  // Signals (4 tests)
  'does not throw on invalid signal reference',
  'handles signal with no subscribers',
  'handles signal emit during render',
  'does not deadlock on circular signal reference',

  // Performance (2 tests)
  'completes within timeout for large data',
  'recovers from partial data fetch failure',

  // Degradation (3 tests)
  'shows placeholder with reason for unsupported features',
  'maintains layout when some blocks fail',
  'provides fallback for entire schema failure',

  // Accessibility (4 tests)
  'all blocks have ARIA labels',
  'keyboard navigation works',
  'focus indicators visible',
  'color contrast meets WCAG AA',
];

// Total: 30 conformance tests
```

**Enhanced Test Suite Summary:**

The comprehensive test suite includes **250+ test cases** across 10 categories:

| Category | Tests | Purpose |
|----------|-------|---------|
| Parser | 50+ | Syntax correctness |
| Compiler | 30+ | AST → schema validity |
| Addressing | 25+ | Resolution accuracy |
| Binding | 20+ | Data matching |
| Signals | 25+ | Reactivity |
| Layout | 20+ | Constraint solving |
| State | 15+ | History & undo |
| Adapter | 30+ | Conformance |
| Integration | 20+ | End-to-end |
| Performance | 15+ | Latency & tokens |

**Total: 250+ tests**

**Note:** See ISS-139 resolution document for complete test specifications across all categories.

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
literal     = NUMBER | STRING | BOOLEAN | NULL | "null"
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

#### B.4.4 Error Handling and Edge Cases

LiquidExpr NEVER throws exceptions. All error conditions produce typed fallback values with predictable propagation rules.

**B.4.4.1 Mathematical Edge Cases**

| Operation | Edge Case | Result | Reasoning |
|-----------|-----------|--------|-----------|
| Division | `x / 0` where x ≠ 0 | `null` | Undefined mathematically |
| Division | `0 / 0` | `null` | Indeterminate form |
| Modulo | `x % 0` | `null` | Undefined mathematically |
| Square root | `sqrt(x)` where x < 0 | `null` | Imaginary result (not supported) |
| Logarithm | `log(0)` | `null` | Negative infinity (not representable) |
| Logarithm | `log(x)` where x < 0 | `null` | Complex result (not supported) |
| Power | `0 ^ 0` | `1` | Mathematical convention (lim x→0 x^x = 1) |
| Power | `x ^ y` where result > MAX_SAFE_INTEGER | `null` | Overflow |
| Power | `x ^ y` where result < MIN_SAFE_INTEGER | `null` | Underflow |

**B.4.4.2 Null Propagation**

LiquidExpr uses **strict null propagation**: any operation involving `null` produces `null`.

```typescript
// Arithmetic with null
null + 5        → null
10 - null       → null
null * null     → null
100 / null      → null

// Comparison with null
null == null    → true
null == 5       → false
null != 5       → true
null < 5        → false  (null is not comparable)
null >= null    → false

// Logical with null
null && true    → null
true && null    → null
null || false   → false  (null is falsy)
false || null   → false

// Function calls with null
round(null)     → null
upper(null)     → null
if(null, 'a', 'b') → 'b'  (null is falsy)
```

**B.4.4.3 Type Coercion Rules**

When operand types don't match, attempt coercion before falling back to `null`:

```typescript
// Number + String (concat if either is string)
5 + "3"         → "53"
"Revenue: " + 100 → "Revenue: 100"

// String to Number (for arithmetic)
"10" - 5        → 5
"10" * "2"      → 20
"10.5" / 2      → 5.25
"abc" - 5       → null  (coercion fails)

// Boolean to Number
true + 1        → 2
false * 10      → 0

// String to Boolean (in logical context)
"" || "default" → "default"  (empty string is falsy)
"text" && true  → true

// Any to Boolean (in conditionals)
if(0, 'a', 'b')      → 'b'  (0 is falsy)
if(1, 'a', 'b')      → 'a'  (non-zero is truthy)
if("", 'a', 'b')     → 'b'  (empty string is falsy)
if("text", 'a', 'b') → 'a'  (non-empty string is truthy)
```

**B.4.4.4 NaN and Infinity Handling**

JavaScript's `NaN` and `Infinity` are not first-class values in LiquidExpr:

```typescript
// Operations producing NaN in JS → null in LiquidExpr
0 / 0           → null  (not NaN)
sqrt(-1)        → null  (not NaN)
parseFloat("abc") → null  (not NaN)

// Operations producing Infinity in JS → null in LiquidExpr
1 / 0           → null  (not Infinity)
-1 / 0          → null  (not -Infinity)
Math.pow(10, 1000) → null  (overflow, not Infinity)

// Checking for these values
isNaN(x)        → not available (use x == null)
isFinite(x)     → not available (valid numbers are always finite)
```

**B.4.4.5 Comprehensive Error Table**

| Category | Operation | Invalid Input | Result |
|----------|-----------|---------------|--------|
| **Arithmetic** | `a + b` | Either null | `null` |
| | `a - b` | Either null | `null` |
| | `a * b` | Either null | `null` |
| | `a / b` | b = 0 | `null` |
| | `a / b` | Either null | `null` |
| | `a % b` | b = 0 | `null` |
| | `a ^ b` | Overflow | `null` |
| **Math Functions** | `sqrt(x)` | x < 0 | `null` |
| | `log(x)` | x ≤ 0 | `null` |
| | `abs(x)` | x = null | `null` |
| | `round(x)` | x = null | `null` |
| | `min(a,b)` | Either null | `null` |
| | `max(a,b)` | Either null | `null` |
| **String Functions** | `upper(s)` | s not string | `null` |
| | `lower(s)` | s not string | `null` |
| | `len(s)` | s not string/array | `null` |
| | `substr(s,i,n)` | i or n negative | `null` |
| | `substr(s,i,n)` | i > len(s) | `""` |
| **Date Functions** | `year(d)` | d not date | `null` |
| | `format(d,f)` | d invalid | `null` |
| | `diff(d1,d2,u)` | Either invalid | `null` |
| **Aggregate Functions** | `avg([])` | Empty array | `null` |
| | `avg([...])` | Contains null | `null` |
| | `sum([])` | Empty array | `0` |
| | `first([])` | Empty array | `null` |
| | `max([])` | Empty array | `null` |
| **Logical** | `a && b` | a falsy | `a` |
| | `a \|\| b` | a truthy | `a` |
| | `if(c,t,f)` | c falsy | `f` |
| **Comparison** | `a < b` | Either null | `false` |
| | `a == b` | null == null | `true` |

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

**Type Compatibility Matrix:**

The system validates type compatibility between bindings and data fields using a comprehensive compatibility matrix:

```typescript
const TYPE_COMPATIBILITY_MATRIX: Record<BindingSlot, TypeRequirement> = {
  // Numeric slots
  value: {
    acceptedTypes: ['number', 'integer', 'float', 'decimal', 'currency'],
    acceptedPatterns: [/amount$/, /price$/, /cost$/, /revenue$/, /total$/],
    coercible: ['string'],
    validation: (value: unknown) => !isNaN(Number(value)),
  },

  // Categorical slots
  category: {
    acceptedTypes: ['string', 'enum', 'category'],
    acceptedPatterns: [/type$/, /status$/, /region$/, /category$/],
    maxCardinality: 50,
    validation: (values: unknown[]) => new Set(values).size <= 50,
  },

  // Temporal slots
  x: {
    acceptedTypes: ['date', 'datetime', 'timestamp', 'time', 'number', 'string', 'category'],
    acceptedPatterns: [/date$/, /time$/, /timestamp$/, /created/, /updated/],
    coercible: ['string', 'number'],
    validation: (value: unknown) => {
      if (typeof value === 'string') return !isNaN(Date.parse(value));
      if (typeof value === 'number') return value > 0;
      return value instanceof Date;
    },
  },

  // ... additional slots defined in ISS-006 resolution
};
```

**Field Existence Validation:**

```typescript
function validateFieldExistence(
  fragment: CachedFragment,
  dataFingerprint: DataFingerprint
): FieldExistenceResult {
  const results: FieldCheckResult[] = [];

  for (const block of fragment.blocks) {
    if (!block.binding) continue;

    const blockType = block.type;
    const requiredSlots = getRequiredSlots(blockType);
    const boundSlots = new Set(block.binding.fields.map(f => f.target));

    // Check all required slots are bound
    for (const requiredSlot of requiredSlots) {
      if (!boundSlots.has(requiredSlot)) {
        results.push({
          blockUid: block.uid,
          blockType,
          issue: 'missing-binding',
          slot: requiredSlot,
          severity: 'error',
          suggestion: {
            type: 'infer-binding',
            candidates: inferBindingCandidates(requiredSlot, dataFingerprint),
          },
        });
      }
    }

    // Check all bound fields exist in data
    for (const fieldBinding of block.binding.fields) {
      const fieldExists = dataFingerprint.hasField(fieldBinding.field);

      if (!fieldExists) {
        const fuzzyMatches = findFuzzyMatches(fieldBinding.field, dataFingerprint.fields);

        results.push({
          blockUid: block.uid,
          blockType,
          issue: 'missing-field',
          field: fieldBinding.field,
          slot: fieldBinding.target,
          severity: fuzzyMatches.length > 0 ? 'warning' : 'error',
          suggestion: {
            type: 'field-substitution',
            candidates: fuzzyMatches,
          },
        });
      }
    }
  }

  return {
    pass: results.every(r => r.severity !== 'error'),
    errors: results.filter(r => r.severity === 'error'),
    warnings: results.filter(r => r.severity === 'warning'),
  };
}
```

#### B.5.3 Signal Coherence

**Enhanced Signal Validation:**

```typescript
function validateSignalCoherence(
  fragment: CachedFragment,
  parentContext?: SignalRegistry
): SignalCoherenceResult {
  const issues: SignalIssue[] = [];

  // Build signal graph
  const declared = new Map<string, SignalDefinition>();
  const emitters = new Map<string, SignalEmitter[]>();
  const receivers = new Map<string, SignalReceiver[]>();

  // Collect declared signals
  if (fragment.signals) {
    for (const [name, def] of Object.entries(fragment.signals)) {
      declared.set(name, def);
    }
  }

  // Collect parent signals (if inheriting)
  if (parentContext && fragment.signalInheritance?.mode !== 'isolate') {
    for (const [name, def] of Object.entries(parentContext)) {
      if (!declared.has(name)) {
        declared.set(name, def);
      }
    }
  }

  // Collect emissions and receptions
  for (const block of fragment.blocks) {
    if (!block.signals) continue;

    // Track emissions
    for (const emission of block.signals.emits || []) {
      if (!emitters.has(emission.signal)) {
        emitters.set(emission.signal, []);
      }
      emitters.get(emission.signal)!.push({
        blockUid: block.uid,
        blockType: block.type,
        trigger: emission.trigger,
        transform: emission.transform,
      });
    }

    // Track receptions
    for (const reception of block.signals.receives || []) {
      if (!receivers.has(reception.signal)) {
        receivers.set(reception.signal, []);
      }
      receivers.get(reception.signal)!.push({
        blockUid: block.uid,
        blockType: block.type,
        target: reception.target,
        transform: reception.transform,
      });
    }
  }

  // Validation checks
  // Check 1: All emitted signals are declared
  for (const [signalName, emitterList] of emitters) {
    if (!declared.has(signalName)) {
      issues.push({
        type: 'undeclared-emission',
        signal: signalName,
        emitters: emitterList,
        severity: 'error',
        suggestion: {
          type: 'add-signal-declaration',
          signal: signalName,
          inferredType: inferSignalType(emitterList),
        },
      });
    }
  }

  // Check 2: All received signals are either declared or emitted
  for (const [signalName, receiverList] of receivers) {
    if (!declared.has(signalName) && !emitters.has(signalName)) {
      issues.push({
        type: 'orphan-reception',
        signal: signalName,
        receivers: receiverList,
        severity: 'error',
        suggestion: {
          type: 'add-signal-declaration',
          signal: signalName,
          inferredType: inferSignalType(receiverList),
        },
      });
    }
  }

  // Check 3: Detect circular signal dependencies
  const cycles = detectSignalCycles(fragment);
  for (const cycle of cycles) {
    issues.push({
      type: 'circular-dependency',
      signals: cycle,
      severity: 'error',
      suggestion: {
        type: 'break-cycle',
        reason: 'Signal emissions form a cycle',
      },
    });
  }

  return {
    pass: issues.every(i => i.severity !== 'error'),
    errors: issues.filter(i => i.severity === 'error'),
    warnings: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
  };
}
```

**Note:** See ISS-006 resolution document for complete coherence validation algorithms including type compatibility matrix, field checking, signal validation, and repair logic.

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
  target: BindingSlot;                   // Slot name
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
- [ ] All adapters pass conformance test suite (30/30 tests)
- [ ] No adapter throws on any valid schema
- [ ] All transforms use LiquidExpr (no free-form code)
- [ ] Coherence gate rejects incoherent fragments
- [ ] Micro-LLM repairs are scoped and budgeted
- [ ] Schema validation uses complete Zod schema
- [ ] Canonical ordering produces deterministic hashes
- [ ] Error messages include resolution path and suggestions
- [ ] Type compatibility matrix implemented for binding validation
- [ ] Signal circular dependency detection active
- [ ] Division by zero and mathematical edge cases handled
- [ ] Comprehensive test suite (250+ tests) passes

---

## Appendix C: Implementation Guide

This appendix provides a structured guide for implementing the LiquidCode v2 system from scratch.

### C.1 Overview

**Complete implementation timeline:** 16-20 weeks
**Minimum Viable Implementation (MVI):** 4-6 weeks

The implementation is divided into 13 phases covering:
1. Core Schema & Validation
2. LiquidCode Parser
3. Compiler Pipeline
4. Block Addressing System
5. Binding System
6. Signal System
7. Discovery Engine
8. Fragment Cache
9. Tiered Resolution
10. Layout System
11. Digital Twin & State
12. Adapter Interface
13. LLM Integration

### C.2 Key Implementation Phases

**Phase 1: Core Schema (1 week)**
- TypeScript interfaces (§B.6.1)
- Zod validation schemas (§B.6.3)
- Canonical ordering function (§B.6.2)

**Phase 2: Parser (2 weeks)**
- Tokenizer (§6, §B.1)
- PEG grammar implementation
- Error reporting with line/column

**Phase 3: Compiler (2 weeks)**
- AST → LiquidSchema transformation
- UID generation (§B.2)
- Parallel tree compilation

**Phase 4-13:** See ISS-136 resolution document for complete phase breakdown with acceptance criteria, starting files, validation requirements, and known gaps to fill.

### C.3 Common Implementation Pitfalls

**Parser Ambiguities:**
- Use formal PEG grammar, not just examples
- Normalize to ASCII form early (§B.1)
- Document tokenization state machine

**UID Collisions:**
- Use crypto-strong random generator
- Include timestamp component
- Detect and handle collisions

**Signal Circular Dependencies:**
- Detect cycles during compilation
- Limit propagation depth
- Maintain visited set during emit

**Layout Solver Non-Termination:**
- Set max iteration limit (1000)
- Detect oscillation
- Fall back to simpler layout

**LiquidExpr Resource Exhaustion:**
- Limit operation count (1000 max)
- Set execution timeout (100ms)
- Sandbox execution context

### C.4 Testing Strategy

**Unit Testing:** 200+ tests across 8 packages (80% coverage target)
**Integration Testing:** 20+ end-to-end scenarios
**Conformance Testing:** 30 adapter certification tests
**Performance Testing:** Validate spec claims (§1.1)

### C.5 Deployment Checklist

**Functional:** All 13 block types, 5 mutations, 4 address forms
**Performance:** P95 <100ms generation latency with cache
**Reliability:** <1% error rate, 100% valid schemas render
**Security:** LiquidExpr sandboxed, no eval/injection
**Documentation:** API reference, migration guide, troubleshooting

**Note:** See ISS-136 resolution document for complete implementation guide including detailed phase breakdowns, testing strategies, troubleshooting guide, extension points, and performance optimization techniques.

---

## Appendix D: Reference Implementation

This appendix defines the requirements for the official LiquidCode v2 reference implementation.

### D.1 Purpose & Goals

The reference implementation serves three purposes:

1. **Specification Validation:** Prove that the spec is complete and implementable
2. **Interoperability Baseline:** Define expected behavior for edge cases
3. **Development Accelerator:** Provide working code for implementers to study

**Non-goals:**
- ❌ Production-ready system (optimizations may be omitted)
- ❌ Feature-complete (extensions like custom blocks are optional)
- ❌ Multi-platform (focus on one adapter initially)

### D.2 Scope

**Required Components:**
- Core Schema (100% of §B.6.1)
- Parser (100% of §6 grammar)
- Compiler (100% of §17)
- Block Addressing (100% of §8)
- Binding System (core type matching)
- Signal System (core emit/receive + URL persistence)
- Digital Twin (100% of §16)
- React Adapter (13 core blocks)
- Conformance Tests (100% of §B.3.3)

**Optional Components:**
- Discovery Engine (complex ML, high effort)
- Fragment Cache (requires external dependencies)
- Tiered Resolution (depends on cache + LLM)
- LLM Integration (requires API keys, variable costs)
- Layout Solver (complex constraint solving)

### D.3 Technical Stack

**Language:** TypeScript ≥5.0
**Runtime:** Node.js ≥18
**Validation:** Zod ≥3.22
**Testing:** Jest or Vitest
**Rendering:** React ≥18 (for adapter)

**Code organization:**
```
liquidcode-reference/
├── packages/
│   ├── schema/          # Core types + validation
│   ├── parser/          # LiquidCode → AST
│   ├── compiler/        # AST → LiquidSchema
│   ├── addressing/      # Block addressing
│   ├── binding/         # Binding system
│   ├── signals/         # Signal system
│   ├── state/           # Digital Twin
│   ├── adapter-react/   # React adapter
│   └── testing/         # Conformance tests
└── examples/            # Example dashboards
```

### D.4 Deliverables

**Code Repository:** `liquidcode/liquidcode-reference`
**npm Packages:** `@liquidcode/schema`, `@liquidcode/parser`, etc.
**Documentation Site:** `https://liquidcode.dev/reference`
**Timeline:** 16 weeks (4 phases)

**Phase 1 (Weeks 1-6):** Core + Parser + Compiler
**Phase 2 (Weeks 7-10):** Binding + Signals + State
**Phase 3 (Weeks 11-14):** React Adapter + Conformance Tests
**Phase 4 (Weeks 15-16):** Documentation + Examples + npm Publish

### D.5 Success Criteria

1. ✅ Validates spec (proves implementability)
2. ✅ Enables interop (behavior baseline)
3. ✅ Accelerates development (reusable code)
4. ✅ Passes all tests (250+ test suite)
5. ✅ Meets quality bar (type-safe, <100KB, 80% coverage)

**Note:** See ISS-137 resolution document for complete reference implementation specification including detailed requirements, test cases, performance targets, conformance criteria, and known limitations.

---

## Appendix E: Interactive Playground

This appendix defines the requirements for the LiquidCode Playground—an interactive web-based tool for learning and experimenting with LiquidCode.

### E.1 Purpose & Goals

The LiquidCode Playground serves four purposes:

1. **Learning:** Teach LiquidCode syntax interactively
2. **Experimentation:** Test LiquidCode without setup
3. **Sharing:** Share dashboard examples via URL
4. **Validation:** Verify correctness and view compiled output

**Primary audience:**
- New LiquidCode users learning syntax
- Frontend developers prototyping dashboards
- Technical writers creating examples
- Spec contributors validating changes

### E.2 Core Features

**Code Editor:**
- Syntax highlighting for LiquidCode
- Auto-completion for block types, operators, signals
- Real-time syntax validation
- Line numbers and error markers
- Support ASCII and Unicode operators

**Live Preview:**
- Real-time rendering using React adapter
- Updates on code change (debounced ~500ms)
- Interactive (signals work)
- Responsive preview modes (mobile/tablet/desktop)
- Dark/light mode toggle

**Schema Inspector:**
- Display compiled LiquidSchema JSON
- Syntax-highlighted viewer
- Collapsible sections
- Copy/download buttons
- Validation status indicator

**Sample Data Panel:**
- JSON editor for data
- Pre-filled templates for each archetype
- CSV import
- Validation against binding expectations

**Example Gallery:**
- Curated examples (Beginner/Intermediate/Advanced)
- One-click load
- Search/filter by feature
- Community examples (optional)

**Share Feature:**
- Generate shareable URL with encoded code + data
- Short URL generation (optional backend)
- Copy to clipboard
- QR code (optional)
- Embed code for docs

### E.3 Educational Features

**Interactive Tutorial:**
- Step-by-step guided tour
- Progressive disclosure
- Checkpoints with validation
- 5-step tutorial: Basic → Chart → Filter → Mutations → Layout

**Syntax Helper:**
- Inline documentation
- Tooltips on hover
- Quick reference panel (?)
- Context-sensitive help

**Error Assistance:**
- Parse errors shown inline
- Suggestions for fixes
- Link to relevant spec section
- Common mistakes database

### E.4 Technical Architecture

**Frontend Stack:**
- Framework: React 18+ or Next.js
- Editor: Monaco Editor
- State: Zustand or Jotai
- Styling: Tailwind CSS
- Build: Vite or Next.js

**Key Dependencies:**
```json
{
  "@liquidcode/parser": "^2.0.0",
  "@liquidcode/compiler": "^2.0.0",
  "@liquidcode/adapter-react": "^2.0.0",
  "@monaco-editor/react": "^4.6.0",
  "recharts": "^2.10.0",
  "lz-string": "^1.5.0"
}
```

### E.5 Deployment

**Platform:** Static site on Vercel/Netlify
**URL:** `https://liquidcode.dev/playground`
**URL Structure:**
- Primary: `https://liquidcode.dev/playground`
- With code: `https://liquidcode.dev/playground#code=...&data=...`
- Embed: `https://liquidcode.dev/playground/embed?id=...`

### E.6 Timeline

**Phase 1: MVP (2-3 weeks)**
- Code editor + syntax highlighting
- Live preview
- Schema inspector
- Basic example gallery (5-10 examples)
- Share via URL (hash-based)

**Phase 2: Enhanced (3-4 weeks)**
- Sample data panel
- Interactive tutorial
- Syntax helper + autocomplete
- Error assistance
- Performance profiler
- Mobile support

**Phase 3: Community (2-3 weeks, optional)**
- User authentication
- Save to account
- Publish to gallery
- Fork/remix examples

### E.7 Success Metrics

1. **Adoption:** 1,000+ unique users in first 3 months
2. **Engagement:** Average session >5 minutes
3. **Learning:** 50%+ complete tutorial
4. **Sharing:** 100+ examples shared in first month
5. **Quality:** <5% error rate on compile attempts
6. **Performance:** P95 compile time <100ms

**Note:** See ISS-138 resolution document for complete playground specification including detailed UI/UX designs, feature breakdowns, accessibility requirements, analytics, and future enhancement possibilities.

---

**End of LiquidCode Specification v2.1 - Part 4: Appendices**

**Next Steps:**
1. Review and integrate all four parts into final specification
2. Update main Table of Contents to include new appendices
3. Add cross-references between parts
4. Begin implementation using Appendix C as guide
5. Build reference implementation per Appendix D
6. Launch playground per Appendix E

**Related Documents:**
- Part 1: Executive Summary through Design Philosophy
- Part 2: Architecture and Core Systems
- Part 3: Advanced Systems and Operations
- ISS-006: Coherence Gate (complete algorithm)
- ISS-023: ASCII Mapping (complete table)
- ISS-101: LiquidExpr Division (error handling)
- ISS-136: Implementation Guide (full detail)
- ISS-137: Reference Implementation (full specification)
- ISS-138: Playground Spec (full design)
- ISS-139: Test Suite (250+ tests)
