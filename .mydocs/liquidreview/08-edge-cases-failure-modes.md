# Edge Cases and Failure Modes Review

**Document:** Edge Case Analysis - LiquidCode v2.0
**Date:** 2025-12-21
**Scope:** Mission-critical system failure mode analysis
**Methodology:** Adversarial review with fuzzer mindset

---

## Executive Summary

This analysis identifies **47 distinct failure modes** across 8 categories, ranging from catastrophic (system crash/data loss) to minor (cosmetic issues). The system shows **strong theoretical foundations** but has **27 unspecified behaviors** that could manifest as production failures.

**Overall Robustness Assessment:** The architecture is sound, but the seams between components contain numerous edge cases that could cause failures. The hardening specification (Appendix B) addresses ~40% of critical issues, but significant gaps remain.

**Key Findings:**
- 8 critical failure modes (system crash/data loss potential)
- 19 significant edge cases (degraded experience)
- 20 minor edge cases (cosmetic issues)
- 27 unspecified behaviors requiring definition

**Highest Risk Areas:**
1. Signal system (circular dependencies, race conditions)
2. Layout constraint solver (conflicting constraints, infinite loops)
3. Tiered resolution coherence gate (false positives, cache poisoning)
4. UID generation (collision risk, distribution quality)
5. LiquidExpr execution (resource exhaustion, undefined edge cases)

---

## Critical Failure Modes (System Crash/Data Loss)

### Failure 1: Signal Circular Dependency Deadlock

**Trigger:**
```liquidcode
§signalA:custom
§signalB:custom
Block1<@signalA>@signalB
Block2<@signalB>@signalA
```
Two blocks create a circular dependency: Block1 receives A and emits B, Block2 receives B and emits A.

**Impact:**
- Infinite loop during signal propagation
- Runtime hangs, adapter never completes render
- Host application becomes unresponsive
- CRITICAL: Violates "never crash host runtime" guarantee (B.3.1)

**Current Handling:**
- SPEC §10: No mention of cycle detection
- SPEC B.3.3: Conformance test says "does not deadlock on circular signal reference" but doesn't specify HOW to prevent it

**Recommended Handling:**
1. **Compile-time detection:** Build signal dependency graph, reject schemas with cycles
2. **Runtime detection:** Track signal emission depth, break at threshold (e.g., 10)
3. **Signal versioning:** Each emission gets a generation number, receivers only react to new generations
4. **Fallback:** Log error, stop propagation, render with last-known values

**Severity:** CRITICAL - Violates core guarantee
**Likelihood:** MEDIUM - Easy to create accidentally
**Priority:** P0 - Must fix before launch

---

### Failure 2: Layout Constraint Solver Non-Termination

**Trigger:**
```liquidcode
# Conflicting constraints
K1^fixed.min:500
K2^fixed.min:500
K3^fixed.min:500
# Total minimum: 1500px
# SlotContext.width: 400px
```
Three blocks with fixed minimum sizes exceed available space. Constraint solver attempts to satisfy unsatisfiable constraints.

**Impact:**
- Solver loops indefinitely trying to find valid layout
- Render timeout (5s default, B.3.2)
- Falls back to placeholder, but timeout is user-hostile
- Resource exhaustion if many concurrent renders

**Current Handling:**
- SPEC §11: No mention of unsatisfiable constraints
- PRD FR-LY-9: "Blocks can declare minimum and maximum size hints" but no conflict resolution
- Hardening B.3.2: Timeout exists but is a last resort

**Recommended Handling:**
1. **Compile-time validation:** Sum of minimums must not exceed any breakpoint threshold
2. **Runtime solver bounds:**
   - Max iterations: 1000
   - Progressive relaxation: If unsatisfiable, iteratively drop lowest-priority blocks
3. **Explicit fallback order:** hero → primary → secondary → detail
4. **Error result:** Return partial layout with explanation of dropped blocks

**Severity:** CRITICAL - Causes timeout/degradation
**Likelihood:** HIGH - Users frequently overestimate available space
**Priority:** P0 - Must fix before launch

---

### Failure 3: UID Collision in High-Volume Generation

**Trigger:**
- Rapid generation of many schemas (e.g., 10,000 blocks/second)
- UID format: `b_[a-z0-9]{12}` = 36^12 = ~4.7e18 space
- Birthday paradox: ~50% collision probability at √(36^12) ≈ 68 million blocks
- In distributed systems, parallel generators without coordination

**Impact:**
- Mutation targets wrong block (silent data corruption)
- Undo/redo breaks (operation applied to wrong block)
- Cache poisoning (different blocks share same UID)
- CRITICAL: Violates stable identity guarantee (B.2)

**Current Handling:**
- SPEC B.2.1: "Generated at creation time" but no uniqueness guarantee
- No mention of collision detection or generation algorithm

**Recommended Handling:**
1. **Better UID generation:**
   - Include timestamp prefix: `b_<timestamp:8><random:12>` (time-ordered UUIDs)
   - Or use UUIDv4: `b_<uuid>` (2^122 space, no collisions in practice)
2. **Collision detection:**
   - Track UIDs in Digital Twin, reject duplicates
   - Retry with new random seed if collision detected
3. **Distributed coordination:** Include instance ID in UID: `b_<instance:4><random:12>`

**Severity:** CRITICAL - Silent data corruption
**Likelihood:** LOW in single-instance, MEDIUM in distributed
**Priority:** P1 - Fix before scale

---

### Failure 4: LiquidExpr Resource Exhaustion

**Trigger:**
```liquidcode
# Transform with deep nesting
transform: "substr(substr(substr(substr(...1000 times..., 0, 1), 0, 1), 0, 1), 0, 1)"
# Or array operations on large data
transform: "sum(sum(sum(...nested 100 times...)))"
```

**Impact:**
- Stack overflow in expression evaluator
- Heap exhaustion from intermediate results
- Exceeds 1000-operation bound (B.4.6) but bound not enforced correctly
- Crashes adapter rendering process

**Current Handling:**
- SPEC B.4.6: "Execution time bounded (max 1000 operations)" but:
  - What counts as an "operation"? Function call? AST node?
  - How is limit enforced? Counter? Timeout?
  - What happens at limit? Return null? Throw?

**Recommended Handling:**
1. **Precise operation counting:**
   - Each function call = 1 operation
   - Each binary operator = 1 operation
   - Each array element access = 1 operation
2. **Stack depth limit:** Max 50 nested calls
3. **Result size limit:** Max 1MB intermediate results
4. **Enforcement:** Increment counter in interpreter, return null at limit
5. **Compile-time check:** Static analysis for obviously unbounded expressions

**Severity:** CRITICAL - Crashes host
**Likelihood:** LOW - Requires malicious/buggy input
**Priority:** P1 - Security hardening

---

### Failure 5: Adapter Timeout Cascades

**Trigger:**
```liquidcode
# Schema with 50 data-table blocks, each with 100K rows
T$orders  # 100K rows
T$products  # 100K rows
...50 times...
```

**Impact:**
- Each table takes 4s to render (near 5s timeout)
- 50 tables × 4s = 200s total
- All time out, entire schema becomes placeholders
- User sees nothing but "render failed" messages
- SEVERE: Violates "render successfully" expectation

**Current Handling:**
- SPEC B.3.2: "renderTimeout: 5s per block" (default)
- Conformance test: "completes within timeout for large data"
- But no guidance on:
  - What to do when ALL blocks time out?
  - How to prevent cascade failures?
  - Should timeout be adaptive?

**Recommended Handling:**
1. **Streaming render:** Don't wait for all blocks, show incremental progress
2. **Adaptive timeout:** Base timeout on data size: `timeout = min(5s, 100ms × rowCount^0.5)`
3. **Partial success:** If >50% of blocks render, show those + placeholders
4. **Timeout budget:** Total schema timeout = 30s, distribute proportionally
5. **Fallback sequence:**
   - First: Render with data sampling (first 1000 rows)
   - Second: Render with schema summary ("100K rows")
   - Third: Placeholder with explanation

**Severity:** CRITICAL - Entire interface fails
**Likelihood:** MEDIUM - Large data is common
**Priority:** P0 - UX critical

---

### Failure 6: Cache Poisoning via Coherence False Positive

**Trigger:**
```
User intent: "Show revenue by product"
Cached fragment: "Show cost by category"
Data fingerprint: {fields: [product, revenue, category, cost]}

Coherence check:
  - revenue field exists ✓
  - product field exists ✓
  - Binding coherence: 0.85 (PASS threshold 0.8)

Result: Cache hit with WRONG bindings
Rendered: Cost by category (not revenue by product)
Cached for future queries!
```

**Impact:**
- Coherence gate passes plausible-but-wrong fragment
- Wrong result cached, served to future users
- Cache poisoning spreads error
- Trust destruction: "AI gave me wrong data"
- CRITICAL: Silent data corruption at scale

**Current Handling:**
- SPEC B.5: Coherence gate exists
- B.5.4: Thresholds defined (0.9 accept, 0.7-0.9 repair, <0.7 escalate)
- But coherence scoring is underspecified:
  - How is "binding coherence" calculated?
  - Does it check semantic similarity of field names?
  - Does it validate aggregation compatibility?

**Recommended Handling:**
1. **Stricter coherence scoring:**
   - Field name exact match: +1.0
   - Field name semantic match: +0.5 (revenue ≈ sales)
   - Field name different: +0.0 (revenue ≠ cost)
   - Aggregation match: Required (can't replace sum with count)
2. **Intent signature matching:**
   - Extract entities from intent (product, revenue)
   - Match against fragment entities (category, cost)
   - Require >0.8 overlap
3. **User feedback loop:**
   - If user corrects within 10s, invalidate cache
   - Track correction rate per fragment
   - Purge fragments with >5% correction rate
4. **Confidence calibration:**
   - Log predicted coherence vs actual corrections
   - Adjust thresholds to maintain <1% error rate

**Severity:** CRITICAL - Silent wrong results
**Likelihood:** MEDIUM - Similarity heuristics fail often
**Priority:** P0 - Trust critical

---

### Failure 7: Mutation Address Resolution Ambiguity

**Trigger:**
```liquidcode
# Schema has:
@0: K$revenue (KPI)
@1: K$revenue (KPI duplicate binding)
@2: L$date$revenue (Line chart)

# User mutation:
Δ~@:revenue.format:"$"
# Intent: Format all revenue displays

# Ambiguity:
# - Selector @:revenue matches 3 blocks
# - Spec says wildcard @:*revenue* for multiple
# - But @:revenue is singular form—should it error or pick first?
```

**Impact:**
- If picks first: Only @0 updated, user confused
- If picks all: Unintended side effects
- If errors: User frustrated, must specify each explicitly
- Inconsistent behavior across implementations
- Undo/redo breaks (what's the inverse of ambiguous mutation?)

**Current Handling:**
- SPEC §8.2: Address hierarchy defined
- SPEC B.2.2: "If ambiguous and operation expects singular: return error with disambiguation options"
- BUT: What determines "expects singular"? Modify (~) vs batch operations?

**Recommended Handling:**
1. **Explicit batch syntax:**
   - Singular: `@:revenue` → error if multiple matches
   - Plural: `@:revenue*` → apply to all matches
   - User must choose intent
2. **Disambiguation error:**
   ```
   Error: Ambiguous address '@:revenue' matches 3 blocks:
     @0: K$revenue "Revenue KPI"
     @1: K$revenue "Revenue Total"
     @2: L$date$revenue "Revenue Trend"

   Use one of:
     @0, @1, @2 (specific)
     @:revenue* (all)
   ```
3. **LLM context injection:**
   - Include current schema summary in mutation prompts
   - LLM can choose specific address based on intent

**Severity:** HIGH - Data corruption risk
**Likelihood:** HIGH - Duplicate bindings common
**Priority:** P0 - Correctness critical

---

### Failure 8: Digital Twin Operation History Corruption

**Trigger:**
```typescript
// Concurrent mutations (e.g., collaborative editing)
Thread A: Δ+K$profit@[1,0]  // Add KPI at position [1,0]
Thread B: Δ-@[1,0]           // Remove block at [1,0]

// Race condition:
// - Both read current state
// - A adds block, gets UID b_abc
// - B removes block at [1,0] (different UID)
// - History records both operations
// - Undo breaks: inverse of B targets wrong block
```

**Impact:**
- Undo/redo stack corrupted
- Snapshots inconsistent
- Digital Twin diverges from rendered state
- Data loss: operations lost or misapplied
- CRITICAL: Violates "authoritative state" guarantee (§16)

**Current Handling:**
- SPEC §16: Digital Twin and Operation History defined
- No mention of concurrent access
- No mention of operation ordering guarantees
- No mention of conflict resolution

**Recommended Handling:**
1. **Optimistic locking:**
   - Each operation includes expected `beforeHash`
   - If hash mismatch, reject with conflict error
   - Client retries with updated state
2. **Operation sequencing:**
   - Assign monotonic sequence numbers
   - Operations must be applied in sequence
   - Gaps detected and rejected
3. **CRDT-style resolution:**
   - Operations commute when possible
   - Conflict resolution rules for non-commutative operations
   - Last-write-wins for property updates
4. **Single-writer model:**
   - Digital Twin is single-threaded
   - Mutations queued and applied serially
   - Simpler but limits concurrency

**Severity:** CRITICAL - Data loss
**Likelihood:** MEDIUM in collaborative scenarios
**Priority:** P1 - If collaborative editing needed, else P2

---

## Significant Edge Cases (Degraded Experience)

### Edge Case 1: Empty Data Set

**Trigger:** User provides empty array or null data
```typescript
engine.resolve([], "Show revenue trends")
```

**Impact:**
- Discovery engine fingerprint fails (no schema to analyze)
- Archetype detection fails (no patterns)
- Binding suggestions fail (no fields)
- Interface generates but shows all "No data" states
- Poor UX: user sees empty shell

**Current Handling:**
- Not specified

**Recommended Handling:**
1. Detect empty data early
2. Return "No data available" message instead of empty interface
3. Or generate schema but flag as "preview mode"
4. Suggest data format: "Expected columns: revenue, date, category"

**Severity:** MEDIUM - Poor UX, not broken
**Likelihood:** MEDIUM - Common during development/testing

---

### Edge Case 2: Single Row Data

**Trigger:** Data has only one row
```typescript
engine.resolve([{revenue: 1000, date: '2024-01-01'}], "Show trends")
```

**Impact:**
- Time-series chart with 1 point (confusing visualization)
- No trend to show (can't compute trend from 1 point)
- Archetype "time_series" detected but meaningless
- User sees chart that provides no insight

**Current Handling:**
- Not specified
- Discovery likely detects time_series archetype anyway

**Recommended Handling:**
1. Minimum row thresholds per archetype:
   - time_series: 3+ rows
   - comparison: 2+ groups
   - funnel: 2+ stages
2. If below threshold, suggest alternative:
   - 1 row → Show as KPI card instead of chart
   - Warn: "Need at least 3 data points for trend analysis"

**Severity:** MEDIUM - Confusing output
**Likelihood:** MEDIUM - Small datasets common

---

### Edge Case 3: Extremely Large Data Set

**Trigger:** Data has 1M+ rows
```typescript
engine.resolve(millionRows, "Show order details")
```

**Impact:**
- Fingerprinting takes 10+ seconds (blocks intent resolution)
- Memory exhaustion during aggregation
- Adapter render timeout (can't render 1M row table)
- Browser tab crashes

**Current Handling:**
- Not specified
- PRD mentions "large data" in conformance tests but no limits

**Recommended Handling:**
1. **Data sampling for fingerprint:**
   - Sample first 10,000 rows for schema detection
   - Flag: "Analyzed sample of 1M rows"
2. **Automatic aggregation:**
   - Never bind raw data >100K rows to table
   - Force aggregation: groupBy or limit
3. **Adapter-level pagination:**
   - Table blocks automatically paginate
   - Render first page, lazy-load rest
4. **Warning to user:**
   - "Dataset has 1M rows, showing aggregated view"

**Severity:** MEDIUM - Performance degradation
**Likelihood:** HIGH - Big data is common

---

### Edge Case 4: Data with Special Characters in Field Names

**Trigger:** Data has fields like: `"revenue ($)"`, `"date/time"`, `"user.name"`
```javascript
{
  "revenue ($)": 1000,
  "date/time": "2024-01-01",
  "user.name": "Alice"
}
```

**Impact:**
- LiquidCode binding syntax breaks: `K$revenue ($)` (syntax error)
- Addressing fails: `@:revenue ($)` (can't parse)
- LiquidExpr fails: `$revenue ($)` (expects identifier)
- Schema invalid, compilation fails

**Current Handling:**
- Not specified
- Grammar assumes field names are identifiers

**Recommended Handling:**
1. **Field name normalization:**
   - Discovery engine normalizes: `revenue ($)` → `revenue_usd`
   - Store mapping: `revenue_usd` → `"revenue ($)"`
   - LiquidCode uses normalized names
2. **Quoting syntax:**
   - Allow: `K$"revenue ($)"` for literal field names
   - Parser handles quoted strings
3. **Error handling:**
   - If field name invalid, reject at fingerprint
   - Suggest: "Field 'revenue ($)' contains invalid characters. Rename to 'revenue_usd'?"

**Severity:** MEDIUM - Breaks for real-world data
**Likelihood:** HIGH - Special chars common

---

### Edge Case 5: Ambiguous Field Name Matching

**Trigger:** Data has similar field names: `revenue`, `revenue_total`, `total_revenue`
```javascript
{
  revenue: 1000,
  revenue_total: 1500,
  total_revenue: 1500
}
```

User intent: "Show revenue"

**Impact:**
- Binding suggestion scores all three similarly
- LLM might pick wrong one
- User gets `revenue` (1000) when they wanted `revenue_total` (1500)
- No clear error, just wrong data

**Current Handling:**
- SPEC §9.3: Soft constraints with scoring signals
- Semantic match uses field name similarity
- But no tie-breaking rules defined

**Recommended Handling:**
1. **Tie-breaking priority:**
   - Exact match > partial match
   - Shorter name > longer name (revenue > revenue_total)
   - Earlier in schema > later
2. **Disambiguation prompt:**
   - If top 2 scores within 0.1, ask user:
   - "Multiple 'revenue' fields found: revenue (1000), revenue_total (1500). Which one?"
3. **Context from intent:**
   - If intent says "total revenue", match `revenue_total`
   - NLP on intent string to extract qualifiers

**Severity:** MEDIUM - Silent wrong results
**Likelihood:** HIGH - Naming conventions vary

---

### Edge Case 6: Type Mismatches in Data

**Trigger:** Data types don't match expectations
```javascript
{
  revenue: "1000",    // String, not number
  date: 1640995200,   // Unix timestamp, not ISO string
  count: 5.7          // Float, expected integer
}
```

**Impact:**
- Discovery infers wrong primitive types
- Aggregations fail (can't sum strings)
- Charts render incorrectly (string on Y-axis)
- Filters don't work (date range on timestamp)

**Current Handling:**
- SPEC §12.4: UOM primitive inference based on types
- But assumes data is correctly typed
- No mention of type coercion

**Recommended Handling:**
1. **Type coercion in fingerprint:**
   - Attempt numeric parse for "1000" → 1000
   - Detect timestamp patterns, convert to dates
   - Round floats for count fields
2. **Type validation:**
   - If coercion fails, flag field as unreliable
   - Lower binding confidence score
3. **Adapter-level fallback:**
   - Render as text if numeric rendering fails
   - Show "Invalid data type" instead of crash

**Severity:** MEDIUM - Incorrect rendering
**Likelihood:** HIGH - Type inconsistency common

---

### Edge Case 7: Missing Required Bindings

**Trigger:** Block type requires bindings that can't be satisfied
```liquidcode
# User intent: "Show comparison"
# Data: {revenue: 1000}  (only one field)
# Engine generates: C$current$previous
# But no "previous" field exists
```

**Impact:**
- Block renders with incomplete data
- Comparison shows current vs empty/null
- Confusing to user ("what am I comparing to?")

**Current Handling:**
- SPEC §9.2: Required bindings listed per block type
- SPEC B.5.2: Coherence gate checks binding compatibility
- Should catch this, but what if coherence gate bypassed?

**Recommended Handling:**
1. **Compile-time validation:**
   - Check all required bindings have data fields
   - Reject schema if any block has missing required bindings
2. **Fallback block types:**
   - If comparison requires 2 fields but only 1 exists, use KPI instead
   - Automatic substitution with lower-capability block
3. **Explicit error:**
   - "Cannot create comparison: need 2 fields, found 1"
   - Suggest alternative: "Show as single metric instead?"

**Severity:** MEDIUM - Confusing output
**Likelihood:** MEDIUM - Archetype mismatch common

---

### Edge Case 8: Schema at Size Limits

**Trigger:** Schema with maximum complexity
```liquidcode
# 50 blocks (reasonable maximum for single interface)
# Each block has:
#   - 10 binding fields
#   - 5 signal connections
#   - 3 relationship constraints
# Total: 50 × (10 + 5 + 3) = 900 decision points
```

**Impact:**
- Compilation time increases (polynomial in block count)
- Layout solver complexity: O(n²) for n blocks
- Render performance degrades
- Cache key becomes huge (100+ KB)
- Hits practical limits

**Current Handling:**
- No specified limits
- PRD mentions "~50 blocks" in examples but not as hard limit

**Recommended Handling:**
1. **Hard limits:**
   - Max 100 blocks per interface
   - Max 20 bindings per block
   - Max 10 signals per interface
   - Max 5 relationship groups
2. **Complexity budget:**
   - Calculate complexity score: blocks × (bindings + signals + relationships)
   - Reject if score > 10,000
3. **Suggest decomposition:**
   - "Interface too complex. Consider splitting into nested sub-interfaces"
4. **Progressive degradation:**
   - If >50 blocks, disable some optimizations
   - If >100 blocks, force pagination/tabs

**Severity:** MEDIUM - Performance cliff
**Likelihood:** LOW - Most interfaces <20 blocks

---

### Edge Case 9: Signal with No Subscribers

**Trigger:**
```liquidcode
§dateRange:dr=30d,url
DF<>@dateRange  # Date filter emits AND receives (self-connection)
# But no other blocks receive @dateRange
```

**Impact:**
- Signal declared but unused
- Filter has no effect (emits into void)
- Poor UX: user changes filter, nothing happens
- Not an error, just confusing

**Current Handling:**
- SPEC conformance test: "handles signal with no subscribers"
- But doesn't say WHAT handling means

**Recommended Handling:**
1. **Compile-time warning:**
   - "Signal @dateRange emitted but never received"
   - Suggest: "Did you mean to connect it to the table/chart?"
2. **Auto-wiring suggestion:**
   - If filter emits signal with no receivers, suggest likely targets
   - "Connect @dateRange to these blocks? [Table, Chart]"
3. **Runtime no-op:**
   - Signal emission works, just has no effect
   - Don't error, just warn in debug mode

**Severity:** LOW - Confusing but functional
**Likelihood:** MEDIUM - Easy to forget connections

---

### Edge Case 10: Signal Type Mismatch

**Trigger:**
```liquidcode
§category:selection=all,url  # Type: selection (string[])
SF$categories<>@category     # Filter emits string[]
K$revenue<@category→filter.status  # KPI receives into filter

# But revenue filter expects status enum, not category list
# Type mismatch: string[] vs enum
```

**Impact:**
- Filter fails to apply (type incompatible)
- KPI shows unfiltered data
- Silent failure or runtime error depending on adapter

**Current Handling:**
- SPEC §10.2: Signal types defined
- But no type checking specified
- No mention of type coercion or validation

**Recommended Handling:**
1. **Compile-time type checking:**
   - Build signal flow graph with types
   - Validate emitter type matches receiver expectation
   - Error if incompatible
2. **Type adapters:**
   - Allow transforms on signal reception: `<@category→filter.status:transform="first($category)"`
   - Automatic array → scalar coercion where sensible
3. **Runtime validation:**
   - SignalRuntime.set() validates type
   - If mismatch, log error and use default value

**Severity:** MEDIUM - Silent failure
**Likelihood:** MEDIUM - Type discipline hard for LLM

---

### Edge Case 11: Conflicting Priority Assignments

**Trigger:**
```liquidcode
K$revenue!hero
L$trend!hero
P$distribution!hero
# Three blocks all marked hero (priority 1)
# But only space for 2 in compact breakpoint
```

**Impact:**
- Priority system meant to rank importance
- If multiple blocks tied at same priority, who wins?
- Layout solver arbitrary choice (first in order?)
- User expects all heroes visible, one gets hidden

**Current Handling:**
- SPEC §11.3: Priority levels defined
- SPEC §11: "Priority never hidden" for hero
- PRD FR-LY-10: "Resolve priority conflicts using block order as tiebreaker"
- Specified! But edge case: what if ALL blocks hero?

**Recommended Handling:**
1. **Limit hero assignments:**
   - Compile-time warning: "Multiple hero blocks may not fit"
   - Suggest: max 1 hero per interface
2. **Tie-breaking:**
   - If multiple same priority, use block order
   - First in schema = higher implicit priority
3. **Responsive collapse:**
   - If compact breakpoint can't fit all heroes, escalate to fallback
   - Or force scrolling

**Severity:** MEDIUM - UX confusion
**Likelihood:** MEDIUM - LLM might over-assign hero

---

### Edge Case 12: Layout with Zero-Width Container

**Trigger:**
```typescript
adapter.render(schema, data, {
  width: 0,  // Container collapsed or hidden
  height: 300,
  breakpoint: 'compact'
})
```

**Impact:**
- Layout solver tries to fit blocks in 0px width
- All blocks fail minimum width requirements
- Entire interface collapses or errors
- Division by zero in proportional allocation

**Current Handling:**
- Not specified
- SPEC §11.10: SlotContext defines width/height
- No validation of context sanity

**Recommended Handling:**
1. **Context validation:**
   - Reject width/height < 100px
   - Error: "Container too small to render interface"
2. **Degenerate mode:**
   - If width < min viable (200px), render as stacked list
   - Ignore layout constraints, just show blocks vertically
3. **Invisible placeholder:**
   - Render nothing, wait for resize
   - Listen for container size change, then render

**Severity:** MEDIUM - Edge case but possible
**Likelihood:** LOW - Usually container has size

---

### Edge Case 13: Single-Column Layout Constraint

**Trigger:**
```liquidcode
G1x10  # Grid 1 column, 10 rows
# Or compact breakpoint forces single column
```

**Impact:**
- All relationship="compare" constraints fail (need side-by-side)
- All span=half/third constraints ignored (no columns to span)
- Layout severely degraded from design intent

**Current Handling:**
- SPEC §11: Responsive transformations defined
- Compact breakpoint may force single column
- But relationship constraints not adapted

**Recommended Handling:**
1. **Constraint relaxation:**
   - relationship="compare" → relationship="group" in single column
   - Blocks still adjacent, just stacked not side-by-side
2. **Warning:**
   - "Layout constraints relaxed for narrow container"
3. **Maintain ordering:**
   - Compare blocks stay in order, visual hint they're related

**Severity:** LOW - Degrades gracefully
**Likelihood:** MEDIUM - Mobile/sidebar common

---

### Edge Case 14: All Blocks Same Priority

**Trigger:**
```liquidcode
K$revenue   # Default: primary
K$orders    # Default: primary
L$trend     # Default: primary
# All priority=2, none explicitly set
```

**Impact:**
- No clear importance ranking
- If space limited, arbitrary block dropped
- User can't predict what they'll see

**Current Handling:**
- SPEC §11.3: "Default: Blocks without explicit priority are primary"
- Tie-breaker: block order (FR-LY-10)
- Actually specified correctly!

**Recommended Handling:**
- Current behavior is correct: use block order
- Could enhance: LLM should assign varied priorities
- Or default first block to hero, rest to primary

**Severity:** LOW - Works as designed
**Likelihood:** HIGH - Most blocks use default

---

### Edge Case 15: Binding to Non-Existent Field After Schema Change

**Trigger:**
```
1. User generates interface with binding K$revenue
2. User changes data source (new schema without 'revenue' field)
3. Schema still references $revenue
4. Field doesn't exist
```

**Impact:**
- Binding fails at render time
- Block shows "No data" or placeholder
- User confused why their interface broke

**Current Handling:**
- SPEC §19.1: Binding error → placeholder + warning
- Invalidation: schema change invalidates cache (§14.4)
- But what about Digital Twin? Does it auto-update?

**Recommended Handling:**
1. **Schema change detection:**
   - When data source changes, diff new schema vs existing bindings
   - Report: "3 blocks reference missing fields: revenue, cost, profit"
2. **Automatic remapping:**
   - If new schema has similar field (revenue_total), suggest rebinding
   - User approves/rejects
3. **Graceful degradation:**
   - Missing binding → show placeholder with hint
   - "Field 'revenue' not found. Available: sales, income"

**Severity:** MEDIUM - Common scenario
**Likelihood:** HIGH - Data sources change

---

### Edge Case 16: Partial Fragment Composition Mismatch

**Trigger:**
```
# Composition tier combines:
Fragment A: Grid layout with 2 KPIs
Fragment B: Time series archetype with line chart

# Combined:
Grid layout with 2 KPIs + line chart
# But fragments assume different signal names
Fragment A emits: @filter
Fragment B receives: @dateRange
# No connection!
```

**Impact:**
- Composed interface has disconnected parts
- Filter doesn't affect chart (signals don't match)
- Coherence gate should catch, but what if signals "close enough"?

**Current Handling:**
- SPEC §15: Compositional grammar engine
- §15.4: Signal auto-wiring for known patterns
- But assumes fragments use standard signal names

**Recommended Handling:**
1. **Signal normalization:**
   - Standardize signal names: @dateRange, @categoryFilter, @search
   - Fragments always use standard names
2. **Signal aliasing:**
   - When composing, create mappings: @filter → @dateRange
   - Bridge signals in composed schema
3. **Coherence check:**
   - Validate all emitted signals have receivers
   - Warn if orphaned signals found

**Severity:** MEDIUM - Composition fails
**Likelihood:** MEDIUM - Fragment reuse common

---

### Edge Case 17: Cache Key Collision (Different Intents, Same Hash)

**Trigger:**
```
Intent A: "Show revenue trends by quarter"
Intent B: "Display quarterly revenue patterns"
# Semantically identical, different wording
# Hash differently but should cache hit

OR

Intent X: "Show revenue"
Intent Y: "Show profits"
# Different semantic, but hash collision (unlikely but possible)
```

**Impact:**
- Case 1: Cache miss when should hit (inefficiency)
- Case 2: Wrong result served (critical)

**Current Handling:**
- SPEC §13.2: CacheKey includes intentHash
- But hash algorithm not specified
- §13.3: Semantic search for near-misses
- Handles Case 1 via Tier 2

**Recommended Handling:**
1. **Intent normalization:**
   - Canonicalize intent before hashing
   - "revenue trends" == "trends in revenue"
   - Extract entities + action, hash that
2. **Collision detection:**
   - Store original intent with cached fragment
   - On cache hit, verify intent similarity >0.95
   - If collision detected, escalate to Tier 2
3. **Better hash:**
   - Use crypto hash (SHA-256) for negligible collision risk
   - Or content-addressed: hash(normalized intent + data fingerprint)

**Severity:** HIGH for wrong result, LOW for cache miss
**Likelihood:** LOW for collision, MEDIUM for normalization issues

---

### Edge Case 18: LiquidExpr Division by Zero

**Trigger:**
```liquidcode
transform: "$revenue / $orders"
# Data: {revenue: 1000, orders: 0}
```

**Impact:**
- Mathematical error
- Spec says: "Divide by zero → null" (B.4.4)
- Block shows null/empty instead of data

**Current Handling:**
- SPEC B.4.4: "Divide by zero → null"
- Specified correctly!

**Recommended Handling:**
- Current behavior is correct
- Could enhance: return Infinity or special marker
- Or allow: `default($revenue / $orders, 0)` for fallback

**Severity:** LOW - Specified correctly
**Likelihood:** MEDIUM - Division common

---

### Edge Case 19: Snapshot Addressing Non-Existent History

**Trigger:**
```liquidcode
?@snapshot:100.@K0
# But operation history only has 10 operations
# Snapshot 100 doesn't exist
```

**Impact:**
- Query fails
- Error or return null?

**Current Handling:**
- SPEC §16.4: Snapshot addressing defined
- But no error handling for out-of-range

**Recommended Handling:**
1. **Bounds checking:**
   - Validate snapshot index ≤ operationCount
   - Error: "Snapshot 100 not found. History has 10 operations."
2. **Relative addressing:**
   - Support: `@snapshot:-1` (previous), `@snapshot:-5` (5 back)
   - More intuitive than absolute indices
3. **Graceful fallback:**
   - If snapshot missing, return current state with warning

**Severity:** LOW - Query edge case
**Likelihood:** LOW - Users rarely use snapshots

---

## Minor Edge Cases (Cosmetic Issues)

### Edge Case 20: Unicode Operator Rendering in ASCII Prompts

**Trigger:** LLM trained on examples with Unicode (`Δ`, `§`) but prompted with ASCII (`delta:`, `signal:`)

**Impact:**
- LLM might generate Unicode output even though prompt is ASCII
- Compiler accepts both, so not broken
- But inconsistent with prompt examples

**Current Handling:**
- SPEC B.1: Both forms accepted, normalized to ASCII
- Compilers MUST accept both

**Recommended Handling:**
- Current behavior is correct
- Could add: LLM post-processing to normalize output
- Or train LLM on ASCII-only examples

**Severity:** LOW - Works, just inconsistent
**Likelihood:** LOW - LLMs follow prompt format

---

### Edge Case 21: Ordinal Address Off-by-One Errors

**Trigger:**
```liquidcode
# Schema has 5 KPIs: @K0, @K1, @K2, @K3, @K4
# User thinks: "The third KPI" = @K3
# But @K3 is actually the FOURTH (0-indexed)
```

**Impact:**
- Human mental model (1-indexed) vs system (0-indexed)
- User targets wrong block
- Cosmetic: error message could help

**Current Handling:**
- SPEC §8: Ordinal addressing is 0-indexed
- Consistent with programming convention

**Recommended Handling:**
1. **Error message clarity:**
   - "Block @K3 is the 4th KPI (0-indexed)"
   - Help users map mental model to syntax
2. **1-indexed alternative:**
   - Allow: `@K#1` for first (1-indexed)
   - Keep `@K0` for 0-indexed
   - User chooses preference
3. **Schema summary uses natural language:**
   - "First KPI: @K0"
   - "Second KPI: @K1"

**Severity:** LOW - Convention, not bug
**Likelihood:** MEDIUM - Off-by-one common

---

### Edge Case 22: Long Label Truncation

**Trigger:**
```liquidcode
Δ~@K0.label:"This is an extremely long label that will not fit in the KPI card visual space and will cause overflow or truncation issues"
```

**Impact:**
- Label too long for UI
- Adapter must truncate or wrap
- Visual design breaks

**Current Handling:**
- Not specified in LiquidCode/Schema
- Adapter responsibility

**Recommended Handling:**
1. **Length limits in schema validation:**
   - Max label length: 100 characters
   - Reject if exceeded
2. **Automatic abbreviation:**
   - LLM generates concise labels
   - If user provides long label, suggest: "Shorten to 50 chars?"
3. **Adapter truncation:**
   - Truncate with ellipsis: "This is an extremely..."
   - Tooltip shows full text

**Severity:** LOW - Visual issue
**Likelihood:** MEDIUM - Users write long labels

---

### Edge Case 23: Invalid Color Values in Binding

**Trigger:**
```liquidcode
B$category:x$value:y$status:color
# status field has values: "pending", "active", "completed"
# Adapter expects color codes, gets status strings
```

**Impact:**
- Color binding type mismatch
- Adapter falls back to default colors
- Not broken, just not styled as intended

**Current Handling:**
- SPEC §9.2: Binding slots defined
- Color slot expects color value
- But no validation of actual data

**Recommended Handling:**
1. **Categorical color mapping:**
   - Adapter auto-maps categories to color palette
   - "pending" → yellow, "active" → green, etc.
2. **Validation:**
   - If color binding gets non-color data, warn
   - Suggest: "status field is categorical. Use for grouping, not color"
3. **Transform:**
   - `$status:color:transform="colorMap($status, {pending:'#ff0',active:'#0f0'})"`

**Severity:** LOW - Falls back gracefully
**Likelihood:** MEDIUM - Binding intent mismatch common

---

### Edge Case 24: Malformed LiquidCode Syntax

**Trigger:**
```liquidcode
#overview;G2x2;K$revenue K$orders  # Missing comma
Δ~@K0.label  # Missing value
§dateRange:dr=30d url  # Missing comma
```

**Impact:**
- Parser errors
- SPEC §19.1: "Parse error → Reject with clear message"

**Current Handling:**
- SPEC §19.1: Error categories defined
- Parse error → reject with message
- Specified correctly!

**Recommended Handling:**
- Current behavior correct
- Enhance error messages with suggestions:
  - "Expected comma after K$revenue"
  - "Missing value after .label. Did you mean: .label:'New Label'?"

**Severity:** LOW - Clear error
**Likelihood:** MEDIUM - Syntax errors common in LLM output

---

### Edge Case 25: Schema Versioning Forward Compatibility

**Trigger:**
```
Engine v2.0 receives schema with version: "2.5"
Schema includes fields engine doesn't recognize
```

**Impact:**
- Unknown fields ignored (§20.2: forward-compatible)
- Might lose information if downgraded
- But rendering works

**Current Handling:**
- SPEC §20.2: "Forward-compatible fields ignored"
- Correct behavior

**Recommended Handling:**
- Log warning: "Schema version 2.5 is newer. Unknown fields ignored: [list]"
- Offer upgrade: "Upgrade to engine 2.5 for full support"

**Severity:** LOW - Degrades gracefully
**Likelihood:** LOW - Users upgrade engines

---

### Edge Case 26: Explainability Metadata Bloat

**Trigger:**
```typescript
schema.explainability = {
  source: 'composition',
  confidence: 0.87,
  reasoning: "..." // 10KB string
  sourceFragments: [...100 fragment IDs...]
}
```

**Impact:**
- Schema size bloats
- Serialization slow
- Not affecting functionality, just metadata

**Current Handling:**
- SPEC §16.4: Source propagation defined
- No size limits

**Recommended Handling:**
1. **Optional explainability:**
   - Include only if debug mode enabled
   - Production: omit or summarize
2. **Size limits:**
   - Max reasoning: 1KB
   - Max sourceFragments: 10
3. **External storage:**
   - Store explainability separately
   - Schema includes reference ID

**Severity:** LOW - Performance, not correctness
**Likelihood:** LOW - Most schemas don't use explainability

---

### Edge Case 27: Adapter Not Supporting Required Block Type

**Trigger:**
```liquidcode
# Schema includes: custom:geo-map
# Adapter only supports 13 core types
```

**Impact:**
- SPEC B.3.2: "renderPlaceholder for unknown types"
- Shows placeholder, not broken

**Current Handling:**
- SPEC B.3: Adapter must implement renderPlaceholder
- Specified correctly!

**Recommended Handling:**
- Current behavior correct
- Placeholder should be informative:
  - "Block type 'custom:geo-map' not supported by this adapter"
  - "Install @liquid-engine/geo-adapter for map support"

**Severity:** LOW - Graceful degradation
**Likelihood:** MEDIUM - Custom types common

---

### Edge Case 28-47: Additional Minor Cases

I'll summarize the remaining minor edge cases briefly:

28. **Floating-point precision in KPI values** - Display rounding, not data corruption
29. **Time zone handling in date fields** - Adapter responsibility, schema agnostic
30. **Null vs undefined in optional fields** - Schema validation handles
31. **Empty string vs null in text fields** - Render as empty, not error
32. **Array vs single value in selection signal** - Type adapter needed
33. **Whitespace in LiquidCode** - Parser should ignore extra whitespace
34. **Case sensitivity in block type codes** - Define K vs k (K is canonical)
35. **Redundant signal declarations** - Warn but allow (idempotent)
36. **Overlapping grid positions** - Layout solver detects, error
37. **Negative numbers in grid positions** - Validation error
38. **Grid dimensions exceed block count** - Empty cells allowed
39. **Span exceeds grid columns** - Clamp to available columns
40. **Missing default value for signal** - Use type-appropriate default (empty array, null, etc.)
41. **Signal validation expression always false** - Warn user, allow anyway
42. **Transform expression returns wrong type** - Coerce or null
43. **Binding to array field expecting scalar** - Take first element or aggregate
44. **Sort on non-sortable field** - Skip sort, log warning
45. **Filter on non-filterable field** - Skip filter, log warning
46. **Aggregation on non-numeric field** - Count instead of sum
47. **Limit negative or zero** - Treat as unlimited

---

## Unspecified Behaviors

### 1. Signal Cycle Detection Algorithm
- **Question:** How is circular dependency detected?
- **Impact:** Critical failure mode if not specified
- **Needs:** Algorithm specification (DFS, timestamps, etc.)

### 2. Layout Constraint Solver Termination Guarantee
- **Question:** Is solver guaranteed to terminate?
- **Impact:** Infinite loops possible
- **Needs:** Proof of termination or iteration bound

### 3. UID Generation Algorithm
- **Question:** Random vs sequential? Collision detection?
- **Impact:** Collision risk in distributed systems
- **Needs:** Specification of generation (UUIDv4, ULID, etc.)

### 4. LiquidExpr Operation Counting
- **Question:** What counts as an "operation"?
- **Impact:** Bound (1000 ops) meaningless without definition
- **Needs:** Precise operation taxonomy

### 5. Coherence Score Calculation
- **Question:** Exact formula for binding/signal coherence?
- **Impact:** Cache poisoning if scoring wrong
- **Needs:** Mathematical definition of coherence

### 6. Timeout Distribution Strategy
- **Question:** How is 30s schema timeout split among 50 blocks?
- **Impact:** Some blocks starved, others waste time
- **Needs:** Fair allocation algorithm

### 7. Address Resolution Tie-Breaking
- **Question:** When @K0 matches multiple, which is chosen?
- **Impact:** Non-deterministic mutations
- **Needs:** Explicit tie-break rules (already partially specified as "first in traversal")

### 8. Intent Hash Normalization
- **Question:** How is intent normalized before hashing?
- **Impact:** Cache efficiency
- **Needs:** Normalization algorithm (stemming, entity extraction, etc.)

### 9. Fragment Composition Priority
- **Question:** When multiple composition paths exist, which wins?
- **Impact:** Non-deterministic output
- **Needs:** Scoring function for composition quality

### 10. Signal Persistence Timing
- **Question:** When is URL/session/local persistence written?
- **Impact:** Data loss if browser closes before persist
- **Needs:** Persistence contract (immediate, debounced, on-unload)

### 11. Breakpoint Detection Hysteresis
- **Question:** If container width oscillates around 600px, constant re-layout?
- **Impact:** Performance, jank
- **Needs:** Hysteresis band (e.g., 600-620px transition zone)

### 12. Relationship Constraint Precedence
- **Question:** If block in both group and compare, which wins?
- **Impact:** Ambiguous layout
- **Needs:** Precedence rules

### 13. Snapshot Storage Limits
- **Question:** Infinite operation history? Memory leak?
- **Impact:** Memory exhaustion
- **Needs:** History size limit (default 100 operations)

### 14. Micro-LLM Call Budget
- **Question:** How many micro-LLM calls allowed per request?
- **Impact:** Cost control
- **Needs:** Budget limit (default 5 calls, 200 tokens total)

### 15. Schema Validation Failure Handling
- **Question:** If Zod validation fails, what exactly happens?
- **Impact:** User sees error or fallback?
- **Needs:** Error recovery path

### 16. Data Sampling Strategy
- **Question:** For large data, which rows sampled?
- **Impact:** Bias if not random
- **Needs:** Sampling algorithm (random, stratified, first N)

### 17. Field Name Normalization Rules
- **Question:** `revenue ($)` → `revenue_usd` or `revenue_dollars`?
- **Impact:** Ambiguity
- **Needs:** Normalization spec (regex replacement rules)

### 18. Type Coercion Precedence
- **Question:** "1000" as string: coerce to number or keep string?
- **Impact:** Unexpected behavior
- **Needs:** Type inference priority

### 19. Binding Ambiguity Resolution
- **Question:** If 3 fields match @:revenue, show all 3 or error?
- **Impact:** Usability
- **Needs:** Disambiguation UX

### 20. Signal Transform Execution Order
- **Question:** Emit transform before propagate, or after?
- **Impact:** Race conditions
- **Needs:** Execution model

### 21. Placeholder Render Timeout
- **Question:** How long to show "loading" before "error"?
- **Impact:** UX perception
- **Needs:** Timeout values (5s loading, then error)

### 22. Cache Invalidation Propagation
- **Question:** If source schema changes, invalidate related fragments?
- **Impact:** Stale cache
- **Needs:** Invalidation rules

### 23. Concurrent Mutation Ordering
- **Question:** Two clients mutate simultaneously, which applies first?
- **Impact:** Conflict
- **Needs:** Optimistic locking spec

### 24. Error Message Localization
- **Question:** Are error messages in user's language?
- **Impact:** Usability
- **Needs:** i18n strategy

### 25. Adapter Metadata Version Negotiation
- **Question:** If adapter supports v1.x and v2.x, which is used?
- **Impact:** Compatibility
- **Needs:** Version selection algorithm

### 26. Streaming Render Buffer Strategy
- **Question:** L1 blocks stream one-by-one or batched?
- **Impact:** Perceived performance
- **Needs:** Buffering policy

### 27. Custom Block Type Registration Conflicts
- **Question:** Two packages register same block type name?
- **Impact:** Ambiguity
- **Needs:** Namespacing or error

---

## Robustness Score

**Overall Score: 7.2/10**

**Breakdown:**

| Category | Score | Weight | Contribution |
|----------|-------|--------|--------------|
| **Architecture Soundness** | 9/10 | 30% | 2.7 |
| **Edge Case Coverage** | 6/10 | 25% | 1.5 |
| **Error Handling** | 7/10 | 20% | 1.4 |
| **Specification Completeness** | 6/10 | 15% | 0.9 |
| **Hardening Measures** | 8/10 | 10% | 0.8 |

**Justification:**

**Strengths:**
- ✅ Excellent theoretical foundation (information theory, constraint satisfaction)
- ✅ Clear separation of concerns (layers, primitives, tiered resolution)
- ✅ Hardening spec (Appendix B) addresses most critical seams
- ✅ Never-broken guarantee with testable conformance
- ✅ Graceful degradation strategy well-defined

**Weaknesses:**
- ❌ 8 critical failure modes (circular signals, layout deadlocks, UID collisions, cache poisoning)
- ❌ 27 unspecified behaviors (could cause non-determinism)
- ❌ Signal system lacks cycle detection specification
- ❌ Layout constraint solver termination not proven
- ❌ Coherence gate scoring underspecified (cache poisoning risk)

**Comparison to Industry Standards:**

| System | Robustness Score | Notes |
|--------|------------------|-------|
| **React** | 8.5/10 | Mature, battle-tested, but prop drilling issues |
| **GraphQL** | 8/10 | Strong typing, query validation, but N+1 problems |
| **SQL** | 9/10 | Decades of hardening, well-defined failure modes |
| **LiquidCode v2** | 7.2/10 | Novel, theoretically sound, but young spec |

**Path to 9/10:**
1. Specify signal cycle detection algorithm (P0)
2. Prove layout solver termination (P0)
3. Define coherence score mathematically (P0)
4. Specify UID generation algorithm (P1)
5. Define all 27 unspecified behaviors (P1-P2)
6. Add property-based tests for grammar fuzzing (P2)
7. Formal verification of core algorithms (P3)

**Production Readiness:**

| Aspect | Status | Blocker? |
|--------|--------|----------|
| MVP (Phase 1) | 🟡 Yellow | Fix 3 critical issues |
| Production (Phase 2) | 🔴 Red | Fix all 8 critical issues |
| Enterprise (Phase 3) | 🔴 Red | Fix critical + define all unspecified |

**Recommendation:**

**Do not ship Phase 1 MVP until:**
1. Signal cycle detection implemented and tested
2. Layout solver termination guaranteed (proof or bound)
3. Cache coherence scoring mathematically defined

**These three are blocking issues that could cause system crashes or wrong results.**

The remaining 5 critical issues and 27 unspecified behaviors can be addressed incrementally in Phase 1→2 transition, but the above three are **absolute prerequisites** for any production deployment.

---

## Appendix: Fuzz Testing Recommendations

To discover additional edge cases, run these fuzzing strategies:

### Grammar Fuzzing
```python
# Generate random LiquidCode
- Random block type combinations
- Invalid operator sequences
- Missing delimiters
- Unicode injection
- Extremely long field names
- Deeply nested operations
```

### Data Fuzzing
```python
# Generate pathological data
- Empty arrays
- Single row
- 1M+ rows
- All nulls
- All duplicates
- Extreme outliers
- Type inconsistencies
```

### Schema Fuzzing
```python
# Generate complex schemas
- 1000+ blocks
- 100+ signals
- Circular signal graphs
- Conflicting constraints
- Maximum nesting depth
```

### Mutation Fuzzing
```python
# Generate invalid mutations
- Address non-existent blocks
- Ambiguous addresses
- Conflicting batch operations
- Undo/redo chains (1000+ operations)
```

### Adapter Fuzzing
```python
# Stress test adapters
- Render timeout scenarios
- Memory exhaustion
- Concurrent renders
- Malformed schemas
```

**Expected Outcome:** Discover 20-50 additional edge cases, refine specification, increase robustness to 8.5/10.

---

*End of Edge Cases and Failure Modes Review*
