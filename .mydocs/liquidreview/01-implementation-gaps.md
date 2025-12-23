# Implementation Gap Analysis - LiquidCode v2

**Date:** 2025-12-21
**Reviewer:** Claude Opus 4.5
**Documents Analyzed:**
- LIQUIDCODE-SPEC-v2.md (primary, 2591 lines)
- prd-liquid-engine-v2.md (secondary, 1512 lines)
- LIQUIDCODE-RATIONALE-v2.md (context, 1417 lines)

---

## Executive Summary

LiquidCode v2 presents a coherent conceptual architecture with strong first-principles reasoning. However, **approximately 40% of the specification lacks sufficient detail for implementation**. The specification excels at "what" and "why" but frequently omits the "how" needed for actual code.

**Critical finding:** The specification contains 6 hardening appendices (B.1-B.6) that attempt to address production gaps, but these themselves lack sufficient implementation detail, creating a second layer of gaps.

**Overall Completeness Score: 6/10**
- Conceptual design: 9/10
- Interface contracts: 7/10
- Algorithm specifications: 4/10
- Implementation guidance: 3/10

---

## Critical Gaps (Blocking Implementation)

### Gap 1: LLM Prompt Engineering - Complete Absence

**Location:** Throughout spec, notably missing from §12 (Discovery Engine) and §13 (Tiered Resolution)

**What's Missing:**
1. No LLM system prompts defined for any tier
2. No examples of input prompts that produce LiquidCode
3. No few-shot examples for teaching block type semantics
4. No specification of how the LLM learns the grammar
5. No prompt templates for L0/L1/L2 layers
6. No guidance on archetype detection prompting
7. No error recovery prompts

**Specific Examples of Undefined Prompts:**
- "How do we tell the LLM that 'K' means KPI?" (§6.2 defines codes but not LLM training)
- "What prompt structure produces `#overview;G2x2;K$revenue`?" (§6.3 shows output, not input)
- "How does the LLM know to use soft constraint scores?" (§9.3 assumes LLM understands scoring)

**Impact:** Cannot implement LLM tier (Tier 4) or any micro-LLM calls. The entire system depends on LLMs generating LiquidCode, but there's no specification for how to make that happen.

**Suggested Resolution:**
Create Appendix C: LLM Prompt Engineering
```markdown
### C.1 System Prompts
#### C.1.1 L0 Generation Prompt
You are a dashboard archetype selector. Given data schema and intent, output:
#archetype;layout;block_count

Examples:
Intent: "Show revenue trends"
Data: {date, revenue}
Output: #time_series;S;3

[10+ examples]

#### C.1.2 L1 Generation Prompt
[Detailed specification]

### C.2 Grammar Teaching Strategy
[How LLM learns single-character codes]

### C.3 Few-Shot Examples
[Canonical examples for each archetype]
```

**Estimated Implementation Blocker Duration:** 2-4 weeks to develop and test prompts

---

### Gap 2: Parser/Compiler - Grammar Ambiguities

**Location:** §6 (LiquidCode Grammar), §17 (Compilation Pipeline), Appendix B.1

**What's Missing:**
1. Tokenization rules undefined (how to split `K$revenue!hero^fixed`?)
2. Grammar is EBNF-style but not formal (BNF, PEG, or similar)
3. No precedence rules for operators
4. No associativity rules
5. Ambiguous productions (e.g., is `K$a$b` two bindings or nested access?)
6. No error recovery strategy
7. No specification of AST node types

**Specific Ambiguities:**

**Example 1: Signal syntax collision**
```liquidcode
DF<>@dateRange
```
Is this:
- `DF` (date-filter) with `<>@dateRange` (emit AND receive)?
- `DF<` (incomplete) then `>@dateRange`?

**Example 2: Binding field delimiters**
```liquidcode
L$date$amount
```
Is this:
- Line chart with x=date, y=amount (two fields)?
- Line chart bound to a field named "date$amount" (one field)?

**Example 3: Layout modifier stacking**
```liquidcode
K$revenue!hero^fixed*full
```
What's the parse order? Is there operator precedence?

**Impact:** Cannot write a parser. Every implementer will interpret grammar differently, breaking interoperability.

**Suggested Resolution:**
```markdown
### 6.1.1 Formal Grammar (PEG)

generation    ← HASH archetype SEMI layout SEMI blocks
archetype     ← IDENTIFIER
layout        ← layoutType dimensions?
layoutType    ← 'G' / 'S'
dimensions    ← NUMBER 'x' NUMBER
blocks        ← block (COMMA block)*
block         ← blockType bindings? signals? layoutMods?
blockType     ← [A-Z]+ / IDENTIFIER
bindings      ← DOLLAR IDENTIFIER (DOLLAR IDENTIFIER)*
signals       ← signal+
signal        ← (LARROW / RARROW / LRARROW) AT IDENTIFIER
layoutMods    ← priority? flexibility? span? relationship?
priority      ← BANG (NUMBER / priorityName)
priorityName  ← 'hero' / 'primary' / 'secondary' / 'detail'
flexibility   ← CARET flexName
flexName      ← 'fixed' / 'shrink' / 'grow' / 'collapse'
span          ← STAR spanValue
spanValue     ← 'full' / 'half' / NUMBER

HASH          ← '#'
SEMI          ← ';'
COMMA         ← ','
DOLLAR        ← '$'
AT            ← '@'
BANG          ← '!'
CARET         ← '^'
STAR          ← '*'
LARROW        ← '<'
RARROW        ← '>'
LRARROW       ← '<>'
NUMBER        ← [0-9]+
IDENTIFIER    ← [a-zA-Z_][a-zA-Z0-9_]*

### 6.1.2 Tokenization Algorithm
[State machine specification]

### 6.1.3 Error Recovery
[Specific error messages for each production failure]
```

**Estimated Implementation Blocker Duration:** 1-2 weeks to formalize and test

---

### Gap 3: Binding Inference - ScoringSignal Implementation Undefined

**Location:** §9.3 (Binding Suggestion System)

**What's Missing:**
1. How is semantic similarity computed? (Embedding model? String matching?)
2. What ML model powers type inference?
3. Pattern matching algorithm undefined (regex? heuristics?)
4. "Position match" (weight 0.1) - what does this mean exactly?
5. How are weights combined? (Linear sum? Weighted average? Bayesian?)
6. What's the training data for semantic matching?
7. How is "user history" tracked and weighted?

**Specific Example of Undefined Behavior:**
```typescript
// Spec says:
interface ScoringSignal {
  source: 'type' | 'semantic' | 'pattern' | 'position' | 'user';
  weight: number;
  reason: string;
}

// But doesn't say how to compute this:
function computeSemanticMatch(field: string, slot: BindingSlot): number {
  // ??? Embedding similarity?
  // ??? Keyword matching?
  // ??? LLM call?
  // ??? Hardcoded rules?
}
```

**Impact:** Cannot implement binding suggestions. Core feature is specified declaratively but not algorithmically.

**Suggested Resolution:**
```markdown
### 9.3.1 Type Match Implementation
function scoreTypeMatch(field: FieldInfo, slot: BindingSlot): number {
  const typeMapping = {
    'x': ['date', 'number', 'string'],
    'y': ['number'],
    'value': ['number'],
    'label': ['string'],
    'category': ['string', 'enum']
  };

  return typeMapping[slot]?.includes(field.type) ? 1.0 : 0.0;
}

### 9.3.2 Semantic Match Implementation
Uses embeddings from all-MiniLM-L6-v2 model.

function scoreSemanticMatch(field: string, slot: BindingSlot): number {
  const slotSemantics = {
    'value': ['amount', 'total', 'count', 'revenue', 'sales'],
    'label': ['name', 'title', 'description', 'category'],
    'x': ['date', 'time', 'timestamp', 'created'],
    // ...
  };

  const fieldEmbedding = embed(field);
  const slotEmbeddings = slotSemantics[slot].map(embed);
  const similarities = slotEmbeddings.map(e => cosineSim(fieldEmbedding, e));
  return Math.max(...similarities);
}

### 9.3.3 Pattern Match Implementation
[Specific regex patterns for each primitive type]

### 9.3.4 Weight Combination
finalScore = Σ(signal.weight × signal.score) / Σ(signal.weight)
```

**Estimated Implementation Blocker Duration:** 1 week for semantic model selection and testing

---

### Gap 4: Fragment Composition - Composition Algorithm Undefined

**Location:** §15 (Compositional Grammar Engine)

**What's Missing:**
1. How are fragments selected for composition?
2. What's the search algorithm for finding compatible fragments?
3. How are fragment boundaries detected?
4. How are signals wired across composed fragments?
5. What's the conflict resolution strategy when fragments overlap?
6. How is layout recomputed for composed fragments?

**Specific Example:**
```typescript
// Spec says composition happens but not how:
interface CompositionRule {
  pattern: IntentPattern;      // What is IntentPattern?
  fragments: FragmentRef[];    // How is this populated?
  layout: LayoutRule;          // What's the algorithm?
  signals: SignalWiring;       // How is this computed?
}
```

**Impact:** Cannot implement Tier 3 (Fragment Composition). Tier distribution assumes 9% of queries use composition, but there's no algorithm.

**Suggested Resolution:**
```markdown
### 15.2.1 Fragment Selection Algorithm
function composeFragments(intent: Intent, cache: FragmentCache): LiquidCode {
  // 1. Decompose intent into sub-intents
  const subIntents = decomposeIntent(intent);

  // 2. For each sub-intent, find best matching fragment
  const fragments = subIntents.map(si =>
    cache.search(si, threshold: 0.7).top()
  );

  // 3. Check fragment compatibility
  if (!areCompatible(fragments)) {
    escalate to Tier 4;
  }

  // 4. Merge fragments
  return mergeFragments(fragments, intent.data);
}

### 15.2.2 Fragment Compatibility Rules
[Specific compatibility checks]

### 15.2.3 Signal Wiring Algorithm
[Step-by-step wiring procedure]
```

**Estimated Implementation Blocker Duration:** 1-2 weeks to design and test

---

### Gap 5: Signal Runtime - Persistence Implementation Missing

**Location:** §10.2 (Signal Declaration), §18.3 (Signal Runtime Interface)

**What's Missing:**
1. How is `persist: 'url'` implemented? (Query params? Hash fragment?)
2. What's the serialization format for complex signal types?
3. How are conflicts resolved when URL and session disagree?
4. What happens when signal value exceeds URL length limits?
5. How is restoration order determined on page load?
6. How are circular signal dependencies detected?

**Specific Example:**
```typescript
// Spec defines interface but not implementation:
interface SignalRuntime {
  persist(): void;    // How?
  restore(): void;    // When? What order?
}

// For url persistence:
signal dateRange: {start: Date, end: Date}, persist: 'url'

// Questions:
// 1. URL format? ?dateRange=start:2024-01-01,end:2024-12-31
// 2. Or: ?dr_start=2024-01-01&dr_end=2024-12-31
// 3. Date format? ISO? Unix timestamp?
// 4. URL too long? Truncate? Fallback to session?
```

**Impact:** Signals work in-memory but cannot persist. Critical for shareable dashboards.

**Suggested Resolution:**
```markdown
### 10.6.1 URL Persistence Specification
Format: ?signal_name=base64(JSON.stringify(value))

Example:
@dateRange → ?dateRange=eyJzdGFydCI6IjIwMjQt...

Maximum length: 2000 chars (IE11 compat)
Overflow strategy: Fallback to session storage with warning

### 10.6.2 Persistence Order
1. Restore from URL (highest priority)
2. Restore from session
3. Restore from local
4. Use default value

### 10.6.3 Circular Dependency Detection
[Topological sort algorithm for signal graph]
```

**Estimated Implementation Blocker Duration:** 3-5 days for URL/session persistence

---

### Gap 6: Coherence Gate - Validation Algorithm Missing

**Location:** Appendix B.5 (Coherence Gate)

**What's Missing:**
1. Binding coherence check implementation (B.5.2) has pseudocode but not actual logic
2. How is "type compatibility" determined? (Line 2226)
3. Signal coherence (B.5.3) - what if signal is optional?
4. Layout coherence not specified at all
5. Data coherence not specified at all
6. Micro-LLM repair prompts undefined

**Specific Example:**
```typescript
// Spec has structure but not algorithm:
function checkBindingCoherence(
  fragment: CachedFragment,
  dataFingerprint: DataFingerprint
): CoherenceResult {
  // Line 2223: How is this implemented?
  if (!dataFingerprint.hasField(field.field)) {
    // What if field is optional?
    // What if field can be derived?
  }

  // Line 2228: What is "isTypeCompatible"?
  if (!isTypeCompatible(field, dataFingerprint.getField(field.field))) {
    // String can bind to number slot?
    // Number can bind to string slot?
    // Date can bind to string slot?
  }
}
```

**Impact:** Cache hits return incoherent fragments. Fast + wrong = user distrust.

**Suggested Resolution:**
```markdown
### B.5.2.1 Type Compatibility Rules
const compatibilityMatrix = {
  'x': {
    'date': 1.0,
    'number': 0.8,
    'string': 0.6
  },
  'y': {
    'number': 1.0,
    'date': 0.0,
    'string': 0.0
  },
  // ... exhaustive matrix
};

### B.5.2.2 Optional Field Handling
If field is optional in binding AND missing in data:
  - Confidence penalty: -0.2
  - Continue with warning

### B.5.2.3 Derived Field Support
Check if field can be computed from available fields:
  - full_name from first_name + last_name
  - age from birth_date
```

**Estimated Implementation Blocker Duration:** 1 week for comprehensive rules

---

## Significant Gaps (Requires Clarification)

### Gap 7: Discovery Engine - Archetype Detection Heuristics

**Location:** §12.4 (UOM Primitive Inference), §12.5 (Intent Prediction)

**What's Missing:**
1. "Detection signals" (§12.4) - are these regex? ML? Heuristics?
2. How are multiple signals combined?
3. What if signals contradict?
4. Cardinality thresholds undefined (what's "low" vs "high"?)
5. Intent prediction mapping incomplete (only 5 examples for infinite intents)

**Suggested Resolution:**
```markdown
### 12.4.1 Primitive Detection Algorithm
function detectPrimitive(column: ColumnInfo): Primitive {
  const signals = [
    checkType(column),           // Weight: 0.4
    checkName(column),           // Weight: 0.3
    checkCardinality(column),    // Weight: 0.2
    checkValuePatterns(column)   // Weight: 0.1
  ];

  return weightedVote(signals);
}

### 12.4.2 Cardinality Thresholds
- identifier: unique ratio > 0.95
- category: unique ratio < 0.1 AND unique count < 50
- continuous: unique ratio > 0.5
```

---

### Gap 8: Tiered Resolution - Cache Key Design

**Location:** §13.2 (Cache Key Design)

**What's Missing:**
1. How is `intentHash` computed? (String hash? Embedding?)
2. What normalization is applied to intent before hashing?
3. How is `dataFingerprint` computed?
4. What if data changes slightly (cache invalidation)?
5. How are archetype hints weighted in key?

**Suggested Resolution:**
```markdown
### 13.2.1 Intent Normalization
1. Lowercase
2. Remove stop words
3. Lemmatize verbs
4. Sort terms alphabetically
5. SHA256 hash

### 13.2.2 Data Fingerprint Algorithm
fingerprint = hash({
  columnNames: sorted(columns),
  columnTypes: types.map(canonical),
  rowCount: quantized(rows, buckets: [0,10,100,1k,10k,100k,1M,10M]),
  primitives: detected
})
```

---

### Gap 9: Layout System - Constraint Solver Algorithm

**Location:** §11.11 (The Constraint Solver Algorithm)

**What's Missing:**
1. "Minimum required space" - how is this computed per block type?
2. "Share remaining space proportionally" - what proportion formula?
3. "Minimum viable if space tight" - what's minimum for each block?
4. How are conflicts resolved (e.g., two hero blocks, not enough space)?
5. What's the computational complexity? (NP-hard? Greedy?)

**Suggested Resolution:**
```markdown
### 11.11.1 Block Minimum Sizes (from §11.9)
const minimumSizes = {
  'kpi': { width: 100, height: 80 },
  'bar-chart': { width: 200, height: 150 },
  'line-chart': { width: 250, height: 150 },
  // ...
};

### 11.11.2 Space Allocation Algorithm (Greedy)
1. Sort blocks by priority (hero first)
2. Allocate fixed blocks their minimum
3. If space remaining:
   a. Distribute to grow blocks proportionally by weight
   b. Weight = 1 / priority (hero gets 4x weight of detail)
4. If space insufficient:
   a. Shrink shrinkable blocks to 70% minimum
   b. Collapse collapsible blocks
   c. If still insufficient, hide lowest priority

### 11.11.3 Complexity Analysis
O(n log n) for sorting + O(n) for allocation = O(n log n)
```

---

### Gap 10: Block Addressing - Wildcard Resolution

**Location:** §8.4 (Wildcard Selectors)

**What's Missing:**
1. How does `@K*` order results? (Creation order? Position order?)
2. How many blocks does `@K*` match (limit)?
3. What if `@[*,0]` matches 100 blocks?
4. How are wildcard mutations applied (sequential? parallel? transactional?)

**Suggested Resolution:**
```markdown
### 8.4.1 Wildcard Ordering
Results ordered by:
1. Grid position (if grid layout)
2. Traversal order (depth-first)
3. UID (tiebreaker)

### 8.4.2 Wildcard Limits
Default: 100 blocks
Override: ?@K*:limit=200

### 8.4.3 Wildcard Mutation Semantics
Applied in parallel, transactionally:
- All mutations succeed, or all fail
- No partial application
```

---

### Gap 11: LiquidExpr - Function Implementation

**Location:** Appendix B.4 (Safe Transform DSL)

**What's Missing:**
1. Date formatting - what format strings are supported?
2. Currency formatting - what locales?
3. Built-in functions table incomplete (only examples)
4. How is execution time bounded (line 2179)?
5. What happens when execution hits bound?

**Suggested Resolution:**
```markdown
### B.4.3.1 Complete Function Reference

Math:
- round(n, decimals?)
- floor(n)
- ceil(n)
- abs(n)
- min(...values)
- max(...values)

String:
- upper(s)
- lower(s)
- trim(s)
- len(s)
- substr(s, start, length?)
- concat(...strings)
- replace(s, pattern, replacement)
- split(s, delimiter)

Date:
- year(d)
- month(d)
- day(d)
- format(d, fmt)  // fmt: 'YYYY-MM-DD', 'MM/DD/YYYY', ISO8601
- diff(d1, d2, unit)  // unit: 'days', 'hours', 'seconds'
- add(d, n, unit)

Format:
- currency(n, symbol?, decimals?)  // symbol: '$', '€', etc.
- percent(n, decimals?)
- number(n, decimals?)
- date(d, fmt)

Logic:
- if(cond, then, else)
- coalesce(...values)  // first non-null
- default(v, def)

Aggregate:
- sum(arr)
- avg(arr)
- count(arr)
- first(arr)
- last(arr)
- median(arr)
- stddev(arr)

### B.4.6.1 Execution Time Bound
Maximum operations: 1000
Maximum recursion: 10
Timeout: 100ms
Exceeded behavior: return null, log warning
```

---

## Minor Gaps (Nice to Have)

### Gap 12: Adapter Conformance Tests - Test Cases

**Location:** §18.4 (Conformance Testing), Appendix B.3.3

**What's Missing:**
1. Only 13 test categories listed, but "minimum tests" undefined
2. No test data provided
3. No expected outputs specified
4. No performance benchmarks

**Suggested Resolution:**
Provide a test suite package with:
- 50+ test schemas (JSON)
- Expected render outcomes (screenshots or descriptions)
- Performance benchmarks (latency targets)

---

### Gap 13: Versioning & Migration - Migration Algorithms

**Location:** §20.3 (Migration Path)

**What's Missing:**
1. Migration from v1 to v2 not specified
2. What if migration is lossy?
3. How are custom block types migrated?

**Suggested Resolution:**
```markdown
### 20.3.1 V1 to V2 Migration
Changes:
1. Add `uid` to all blocks (generate new)
2. Convert old signal syntax to new
3. Add `version: "2.0"` field

Lossy conversions:
- V1 custom blocks → V2 `custom:*` prefix
- V1 explicit IDs preserved as V2 `id` field

### 20.3.2 Migration Testing
Run conformance tests on migrated schemas
```

---

### Gap 14: Error Handling - Error Code Taxonomy

**Location:** §19.1 (Error Categories)

**What's Missing:**
1. No error codes defined (e.g., ERR_PARSE_001)
2. No error message templates
3. No suggested fixes catalog

**Suggested Resolution:**
```markdown
### 19.1.1 Error Code Taxonomy

Parse Errors (ERR_PARSE_xxx):
- ERR_PARSE_001: Unexpected token
- ERR_PARSE_002: Missing semicolon
- ERR_PARSE_003: Invalid block code

Validation Errors (ERR_VALID_xxx):
- ERR_VALID_001: Missing required binding
- ERR_VALID_002: Unknown block type
- ERR_VALID_003: Invalid signal reference

[50+ error codes with templates]
```

---

### Gap 15: Discovery Engine - Pre-Generation Strategy

**Location:** §14.3 (Cache Warming Strategy)

**What's Missing:**
1. "Top 20 intents" - how are these selected?
2. What if data has novel archetype?
3. How long does warming take (blocking?)
4. Can warming happen async?

**Suggested Resolution:**
```markdown
### 14.3.1 Warm Strategy Selection
Generate fragments for:
1. Each detected archetype (1 fragment)
2. Each primitive combination (up to 10)
3. Each common intent pattern (from template library)

Total: ~20-30 fragments
Time budget: 30 seconds
Strategy: Async, non-blocking
```

---

## Completeness Score Breakdown

| Component | Conceptual Design | Interfaces | Algorithms | Implementation | Overall |
|-----------|-------------------|------------|------------|----------------|---------|
| Discovery Engine | 9/10 | 6/10 | 3/10 | 2/10 | 5/10 |
| Tiered Resolution | 8/10 | 7/10 | 4/10 | 3/10 | 5.5/10 |
| LiquidCode Compiler | 9/10 | 8/10 | 4/10 | 3/10 | 6/10 |
| Interface Algebra | 9/10 | 8/10 | 6/10 | 5/10 | 7/10 |
| Block Addressing | 8/10 | 7/10 | 5/10 | 4/10 | 6/10 |
| LiquidSchema | 9/10 | 9/10 | N/A | 8/10 | 8.5/10 |
| Binding System | 8/10 | 7/10 | 2/10 | 1/10 | 4.5/10 |
| Signal System | 9/10 | 8/10 | 4/10 | 2/10 | 5.75/10 |
| Layout System | 9/10 | 7/10 | 3/10 | 2/10 | 5.25/10 |
| State Layer | 8/10 | 8/10 | 7/10 | 6/10 | 7.25/10 |
| Fragment Cache | 7/10 | 6/10 | 3/10 | 2/10 | 4.5/10 |
| Adapter Interface | 9/10 | 9/10 | N/A | 7/10 | 8.33/10 |
| Hardening (B.1-B.6) | 7/10 | 6/10 | 3/10 | 2/10 | 4.5/10 |

**Overall Average: 6.0/10**

---

## Gap Severity Matrix

| Gap | Blocking? | Effort to Fill | Priority | Risk if Unfilled |
|-----|-----------|----------------|----------|------------------|
| LLM Prompts | ✅ Yes | High (3-4 weeks) | P0 | System doesn't work |
| Parser Ambiguity | ✅ Yes | Medium (2 weeks) | P0 | Incompatible implementations |
| Binding Inference | ✅ Yes | Medium (1 week) | P0 | Core feature missing |
| Fragment Composition | ✅ Yes | Medium (2 weeks) | P1 | Tier 3 doesn't work |
| Signal Persistence | ✅ Yes | Low (1 week) | P1 | Can't share dashboards |
| Coherence Gate | ✅ Yes | Medium (1 week) | P0 | Cache returns wrong results |
| Archetype Detection | ⚠️ Partial | Low (3-5 days) | P1 | Discovery less effective |
| Cache Key Design | ⚠️ Partial | Low (2-3 days) | P1 | Cache inefficient |
| Constraint Solver | ⚠️ Partial | Medium (1 week) | P1 | Layout issues |
| Wildcard Resolution | ❌ No | Low (1-2 days) | P2 | Edge case failures |
| LiquidExpr Functions | ❌ No | Low (3-5 days) | P2 | Limited transforms |
| Conformance Tests | ❌ No | Medium (1 week) | P2 | Quality issues |
| Migration | ❌ No | Low (2-3 days) | P3 | V1 users stuck |
| Error Codes | ❌ No | Low (2-3 days) | P3 | Poor DX |
| Warm Strategy | ❌ No | Low (1-2 days) | P3 | Slower cold starts |

---

## Recommendations

### Phase 1: Critical Gaps (Before Any Implementation)
1. **Define LLM prompts** (Appendix C: Prompt Engineering Specification)
   - System prompts for each layer
   - Few-shot examples for each archetype
   - Error recovery prompts
   - Estimated effort: 3-4 weeks

2. **Formalize grammar** (Upgrade §6 to full PEG/BNF)
   - Remove all ambiguities
   - Define tokenization state machine
   - Provide reference implementation
   - Estimated effort: 2 weeks

3. **Specify binding inference** (Detailed §9.3 algorithms)
   - Semantic model selection
   - Complete weight combination formula
   - Type compatibility matrix
   - Estimated effort: 1 week

4. **Define coherence gate** (Complete Appendix B.5)
   - All four coherence types (binding, signal, layout, data)
   - Micro-LLM repair prompts
   - Threshold calibration
   - Estimated effort: 1 week

**Phase 1 Total: 7-8 weeks**

### Phase 2: Significant Gaps (Parallel with Core Implementation)
5. Fragment composition algorithm (§15 expansion)
6. Signal persistence specification (§10.6 new section)
7. Layout constraint solver (§11.11 expansion)
8. Cache key design (§13.2 expansion)
9. Archetype detection heuristics (§12 expansion)

**Phase 2 Total: 4-5 weeks**

### Phase 3: Polish (During Testing)
10. Conformance test suite (reference implementation)
11. Error code taxonomy (developer experience)
12. Migration algorithms (V1 → V2)
13. LiquidExpr complete function catalog

**Phase 3 Total: 2-3 weeks**

---

## Testing Strategy for Gap Filling

For each gap filled, require:

1. **Specification test**: Does the spec answer all "how" questions?
2. **Implementation test**: Can two independent implementers produce compatible results?
3. **Completeness test**: Are all edge cases covered?
4. **Performance test**: Does it meet stated latency/cost targets?

Example for LLM prompts:
```
Specification test: ✅ System prompt defined for L0/L1/L2
Implementation test: ✅ GPT-4 and Claude produce valid LiquidCode
Completeness test: ✅ Handles 20+ archetype variations
Performance test: ✅ P95 < 50 tokens output, <500ms latency
```

---

## Conclusion

LiquidCode v2 is a **conceptually sound but implementation-incomplete specification**. The architecture is innovative and well-reasoned (as evidenced by the excellent RATIONALE document), but approximately 40% of the system lacks the detail needed to implement it.

**The good news:** Most gaps can be filled without changing the core architecture. The specification is a solid foundation that needs scaffolding, not reconstruction.

**The bad news:** The 6 critical gaps are blocking. No amount of clever implementation can work around undefined LLM prompts, ambiguous grammar, or unspecified algorithms.

**Recommended action:** Freeze feature development. Spend 7-8 weeks filling Phase 1 gaps before writing production code. The alternative is multiple incompatible implementations, debugging nightmares, and a system that doesn't meet its stated performance/reliability targets.

**Final assessment:** This is very close to being implementable. With focused effort on the 6 critical gaps, LiquidCode v2 could be production-ready in 3-4 months. Without addressing these gaps, it remains a compelling research prototype.
