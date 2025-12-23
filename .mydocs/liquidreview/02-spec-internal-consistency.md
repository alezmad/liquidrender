# SPEC Internal Consistency Review

## Executive Summary

The LIQUIDCODE-SPEC-v2.md document is remarkably consistent for its complexity (~2,591 lines, 20 main sections + 2 appendices). The specification demonstrates strong structural coherence with well-defined type hierarchies, consistent syntax conventions, and clear normative requirements. However, I identified **23 critical inconsistencies**, **17 ambiguities**, and **31 minor issues** that should be addressed to ensure implementation conformance.

**Overall Assessment:** The spec is production-ready with targeted fixes. Most issues are resolvable through clarification rather than architectural changes.

---

## Critical Inconsistencies (Logical Contradictions)

### Issue 1: Block Interface Definition Mismatch
- **Locations:** §4.1 (line 169) vs §B.6.1 (line 2332)
- **Contradiction:**
  - §4.1 defines Block with `uid: string` as optional (appears without comment on requirement)
  - §B.6.1 defines Block with `uid: string` with comment "// Stable unique identifier" but no required marker in interface
  - §B.2.1 (line 1953) states "REQUIRED: stable unique identifier"
- **Resolution:** UID must be REQUIRED. Update §4.1 interface to match §B.6.1 and add explicit comment.
- **Fix Required:** Add comment in §4.1: `uid: string; // Stable unique identifier (required, see B.2)`

### Issue 2: Signal Transform Type Conflict
- **Locations:** §10.3 (line 787) vs §B.4 (line 2107)
- **Contradiction:**
  - §10.3 defines `transform?: string` as free-form string
  - §B.4 mandates LiquidExpr DSL as the only valid transform language
  - §B.6.1 (line 2384) says "LiquidExpr (see B.4)" in comment
- **Resolution:** All transform fields MUST use LiquidExpr. Section 10.3 should reference B.4 for transform syntax.
- **Fix Required:** Update §10.3 interface comments to specify "// LiquidExpr (see B.4)"

### Issue 3: Address Resolution Priority Order
- **Locations:** §8.3 (line 588) vs §B.2.4 (line 2005)
- **Contradiction:**
  - §8.3 lists resolution order as: Explicit ID → Grid position → Type ordinal → Binding signature → Pure ordinal
  - §B.2.4 introduces explicit ID addressing but doesn't update the priority order
  - No mention of how UID addressing fits in this hierarchy
- **Resolution:** Resolution should be: Explicit ID → UID → Grid position → Type ordinal → Binding signature → Pure ordinal
- **Fix Required:** Add UID addressing to §8.3 priority list at position 2.

### Issue 4: Breakpoint Threshold Inconsistency
- **Locations:** §11.11 (line 1097) vs §B.6.1 (line 2457)
- **Contradiction:**
  - §11.11 defines: `compact` < 600px, `standard` 600-1200px, `expanded` ≥ 1200px
  - §B.6.1 BreakpointThresholds interface defines `compact: number`, `standard: number`, `expanded: number` but no default values
  - Comment in §B.6.1 (line 2458-2460) says "// <600px default" but interface field is just `number`
- **Resolution:** Interface should have default values OR spec should clarify these are adapter-configurable overrides.
- **Fix Required:** Update §B.6.1 interface or add explicit default value documentation.

### Issue 5: Block Type Code Conflicts
- **Locations:** §6.2 (line 399-418) vs §A.2 (line 1832-1849)
- **Contradiction:**
  - §6.2 defines single-character codes: `B` = bar-chart
  - ASCII grammar examples use `B` for bar-chart
  - §A.2 matches this correctly
  - BUT §B.1 (line 1877) shows Unicode `↑` mapping to ASCII `^`, which conflicts with flexibility suffix `^` from §11.6 (line 957)
- **Resolution:** The `↑` (move) operator should map to `move:` (as shown in examples), not `^`. The ASCII table in §B.1.1 is correct, but needs clarification.
- **Fix Required:** Emphasize that `^` is ONLY for flexibility suffix, never for move operation.

### Issue 6: SlotContext Field Type Mismatch
- **Locations:** §11.10 (line 1067) vs §B.6.1 (line 2446)
- **Contradiction:**
  - §11.10 defines `height: number | 'auto'`
  - §B.6.1 defines same field identically
  - BUT implementation concern: 'auto' is not a valid breakpoint calculation input
- **Resolution:** This is actually consistent, but §11.11 transformation algorithm doesn't explain how 'auto' height is handled.
- **Fix Required:** Add handling for `height: 'auto'` in transformation algorithm (§11.11).

### Issue 7: SignalType Definition Duplication
- **Locations:** §4.3 (line 215-225) vs §B.6.1 (line 2398)
- **Contradiction:**
  - §4.3 lists 8 signal types in table format with descriptions
  - §B.6.1 lists same 8 types in TypeScript union type
  - INCONSISTENCY: §4.3 shows `selection` value as `string | string[]`
  - §B.6.1 doesn't specify value shape for `selection` type
  - Table in §A.3 (line 1853) shows `selection` as `string[]` only
- **Resolution:** Clarify if selection is single OR multi. Table values don't match.
- **Fix Required:** Standardize selection value type across all references.

### Issue 8: Operation Symbol ASCII Mapping Ambiguity
- **Locations:** §7.2 (line 508) vs §B.1.1 (line 1877)
- **Contradiction:**
  - §7.2 lists 5 operations with Unicode symbols: `+`, `-`, `→`, `~`, `↑`
  - §B.1.1 provides ASCII mappings but only for 4 symbols (missing `+`, `-`, `~`)
  - Implication: Are `+`, `-`, `~` already ASCII and don't need mapping?
- **Resolution:** Clarify that `+`, `-`, `~` are ASCII-safe and don't need alternate forms.
- **Fix Required:** Add note in §B.1.1 that some symbols are already ASCII.

### Issue 9: Fragment Type Definition Missing
- **Locations:** §14.1 (line 1397) references `CachedFragment` but never defines it
- **Related:** §13.3 (line 1371), §B.5.1 (line 2196) also use undefined type
- **Contradiction:** Multiple sections reference `CachedFragment` interface but it's never specified
- **Resolution:** Add `CachedFragment` interface definition, likely in §14.2 or §B.6.1
- **Fix Required:** Define `interface CachedFragment` with fields: `key`, `fragment`, `metadata`, `ttl`

### Issue 10: LayoutBlock Type Undefined
- **Locations:** §3.2 (line 154), §B.6.1 (line 2319), §11.12 (line 1123)
- **Contradiction:**
  - §B.6.1 uses `layout: LayoutBlock` in LiquidSchema interface
  - §11.12 defines `interface LayoutBlock` with different fields than expected
  - No clear connection between LiquidSchema.layout and Block.layout
- **Resolution:** Clarify distinction between schema-level layout (container) and block-level layout (properties).
- **Fix Required:** Rename to `ContainerLayout` or add clear documentation of the two concepts.

### Issue 11: Scope Enum Values Usage
- **Locations:** §B.6.1 (line 2315) defines `scope: 'interface' | 'block'`
- **Contradiction:**
  - No section explains when to use 'block' scope vs 'interface' scope
  - Examples in spec always show 'interface' scope
  - §14.1 (line 1400) mentions "scope: 'interface' | 'block'" for CacheKey
- **Resolution:** Add section explaining scope semantics (when is schema just a block vs full interface?)
- **Fix Required:** Document scope field purpose and usage rules.

### Issue 12: Normative Language Inconsistency
- **Locations:** Throughout spec
- **Contradiction:**
  - §B.1.2 (line 1912): "Compilers MUST accept..."
  - §B.2.1 (line 1960): "UID properties: ... Immutable..." (no MUST/SHOULD)
  - §B.3.2 (line 2045): "Adapters MUST implement..."
  - Many requirements stated as facts without MUST/SHOULD/MAY
- **Resolution:** Apply RFC 2119 keywords consistently for all normative requirements
- **Fix Required:** Audit entire spec for implicit requirements and add MUST/SHOULD/MAY

### Issue 13: Grid Layout Syntax Ambiguity
- **Locations:** §6.3 (line 424) vs §11.7 (line 988)
- **Contradiction:**
  - §6.3 shows grid syntax as `G2x2` (rows x columns)
  - §11.7 example shows `G2x3` but doesn't clarify if this is 2 rows × 3 cols or 2 cols × 3 rows
  - §8.2 (line 582) shows grid address as `@[0,1]` with "row, column" comment
- **Resolution:** Confirm whether `GNxM` means N×M (rows×cols) or M×N (cols×rows). Address format suggests row-first.
- **Fix Required:** Explicitly state grid syntax dimension order in §6.3.

### Issue 14: Token Count Claims Variation
- **Locations:** Multiple sections cite different token counts
- **Contradiction:**
  - §1.1 (line 47): "~35 tokens"
  - §6.5 (line 488): "~40 tokens"
  - §13.2 (line 1388): "35-50 tokens" for novel archetype
  - §B.1.3 (line 1937): "P99 generation ≤ 60 tokens"
- **Resolution:** These represent different scenarios (base case vs full dashboard vs P99). Needs clarification.
- **Fix Required:** Add token count table showing typical, complex, and P99 cases.

### Issue 15: Parallel Tree Compilation Claim
- **Locations:** §5.2 (line 301) vs §17.2 (line 1585)
- **Contradiction:**
  - §5.2 claims "All L1 blocks generate concurrently"
  - §17.2 shows parallel compilation BUT only after "L0 completes"
  - §5.6 (line 360) says "A deeply nested block (D5) is still generated in phase L1"
  - Implication: If nested blocks require parent blocks to exist, how can ALL L1 blocks be parallel?
- **Resolution:** Clarify that parallelization applies to *siblings* at same depth, not across all depths.
- **Fix Required:** Update §5.2 to specify "All L1 *sibling* blocks generate concurrently."

### Issue 16: Binding Required vs Optional Fields
- **Locations:** §9.2 (line 658) vs §B.6.1 (line 2352)
- **Contradiction:**
  - §9.2 table shows "Required Slots" and "Optional Slots" for each block type
  - §B.6.1 DataBinding interface makes `fields: FieldBinding[]` required
  - BUT §4.1 (line 173) says `binding?: DataBinding` is optional
  - For layout blocks (grid, stack) which have no data, how is this handled?
- **Resolution:** Layout blocks don't have bindings. This is stated in §4.1 comment but should be formalized.
- **Fix Required:** Add validation rule: "Layout blocks MUST NOT have binding field."

### Issue 17: Signal Persistence Location Conflict
- **Locations:** §10.2 (line 769) vs §10.6 (line 828)
- **Contradiction:**
  - §10.2 defines signal persistence at interface level: `persist?: 'none' | 'url' | 'session' | 'local'`
  - §10.6 discusses signal inheritance across nested interfaces
  - Question: If parent has `§filter:persist=url` and child shadows it with `§filter:persist=session`, which wins?
- **Resolution:** Add inheritance rule: "Child signal shadowing overrides ALL parent signal properties including persistence."
- **Fix Required:** Add explicit rule in §10.7 about persistence inheritance.

### Issue 18: Error Rate Claim Discrepancy
- **Locations:** §1.1 (line 50) vs §5.5 (line 332)
- **Contradiction:**
  - §1.1 claims "<1%" error rate for LiquidCode
  - §5.5 calculates "Error probability per layer: ~5%" leading to 85% full success
  - Math: If error rate is 5% per layer and 3 layers, success is 0.95³ = 85.7%, implying 14.3% failure
  - These numbers don't reconcile
- **Resolution:** Clarify what "error rate" means in §1.1 vs "full success" in §5.5.
- **Fix Required:** Distinguish between "generation errors" (§1.1) and "layer success" (§5.5).

### Issue 19: Snapshot Addressing Syntax Conflict
- **Locations:** §8.5 (line 609) vs §16.3 (line 1538)
- **Contradiction:**
  - §8.5 shows: `@snapshot:3.@K0` (colon separator)
  - §16.3 shows same syntax
  - BUT §8.2 (line 583) shows: `@:revenue` (colon for binding signature)
  - Ambiguity: How to distinguish `@snapshot:3` from `@:snapshot` (binding to field named "snapshot")?
- **Resolution:** Snapshot addressing needs different prefix to avoid collision with binding signature.
- **Fix Required:** Change snapshot syntax to `@snap[3].@K0` or similar unambiguous form.

### Issue 20: Adapter Interface Missing Fields
- **Locations:** §18.1 (line 1633) vs §11.9 (line 1168) vs §B.3.2 (line 2045)
- **Contradiction:**
  - §18.1 defines core adapter interface
  - §11.9 mentions adapter must provide layout context
  - §B.3.2 adds `renderTimeout`, `renderEmptyState`, `renderPlaceholder` as MUST
  - These don't appear in §18.1 interface
- **Resolution:** §B.3.2 is normative hardening spec and should be the authoritative interface.
- **Fix Required:** Update §18.1 to match §B.3.2 exactly.

### Issue 21: Migration Interface Incomplete
- **Locations:** §20.3 (line 1761)
- **Contradiction:**
  - Shows `interface Migration` but only has `migrate()` method
  - No indication of how migrations are registered, discovered, or executed
  - §20.2 (line 1753) mentions migrations but no implementation
- **Resolution:** Either expand migration system or mark as "future work."
- **Fix Required:** Add "Migration system is not yet specified" disclaimer.

### Issue 22: Coherence Threshold Values
- **Locations:** §9.3 (line 703) vs §B.5.4 (line 2267)
- **Contradiction:**
  - §9.3 Binding suggestion confidence thresholds: >0.8 = auto, 0.5-0.8 = best guess, <0.5 = prompt
  - §B.5.4 Coherence confidence thresholds: ≥0.9 = accept, 0.7-0.9 = repair, 0.5-0.7 = compose, <0.5 = LLM
  - Different threshold values for similar concepts (confidence scoring)
- **Resolution:** These are different systems but should align better to avoid confusion.
- **Fix Required:** Add note explaining why thresholds differ between binding suggestion and coherence.

### Issue 23: RenderConstraints Type Undefined
- **Locations:** §B.6.1 (line 2343) uses `constraints?: RenderConstraints`
- **Contradiction:** This type is referenced but never defined anywhere in the spec
- **Resolution:** Either define the interface or remove the field from Block.
- **Fix Required:** Add `interface RenderConstraints` definition or mark as reserved field.

---

## Ambiguities (Multiple Valid Interpretations)

### Ambiguity 1: "Archetype" vs "Archetype Hint"
- **Locations:** §6.3 (line 424) vs §12.3 (line 1274)
- **Issue:**
  - Generation syntax uses `#archetype` as first component
  - Text refers to both "archetype" and "archetype hint"
  - Unclear if archetype is prescriptive (MUST use this pattern) or advisory (suggestion only)
- **Impact:** LLM might misunderstand whether archetype selection is flexible or rigid
- **Recommendation:** Clarify that archetype is a suggestion that influences layout/block selection but doesn't constrain it.

### Ambiguity 2: Block Traversal Order
- **Locations:** §8.2 (line 580), §8.3 (line 595)
- **Issue:**
  - Pure ordinal `@0` matches "first block in traversal order"
  - Type ordinal `@K0` matches "first KPI"
  - No specification of what "traversal order" means (depth-first? breadth-first? document order?)
- **Impact:** Different implementations might resolve ordinals differently
- **Recommendation:** Specify traversal as "depth-first pre-order starting from layout root."

### Ambiguity 3: Signal Default Value Semantics
- **Locations:** §4.3 (line 209), §10.2 (line 768)
- **Issue:**
  - `default?: unknown` is defined for signals
  - Example shows `§dateRange:dr=30d,url` where `30d` appears to be the default
  - Unclear: Is `30d` a relative date (last 30 days from now) or absolute?
  - How is this value interpreted by different block types?
- **Impact:** Ambiguous default value parsing
- **Recommendation:** Add default value format specification for each signal type.

### Ambiguity 4: "Block Count" in L0 Layer
- **Locations:** §5.1 (line 280), §15.3 (line 1464)
- **Issue:**
  - L0 layer includes "Block count" decision
  - Layout inference (§15.3) determines layout from block count
  - Unclear: Does LLM specify exact count or approximate count?
  - Example `G2x2` implies 4 blocks, but text doesn't require this
- **Impact:** Uncertain whether grid dimensions must match block count
- **Recommendation:** Clarify: "Grid dimensions are independent of block count; blocks fill cells in order."

### Ambiguity 5: Binding Source Field
- **Locations:** §9.1 (line 640), §B.6.1 (line 2353)
- **Issue:**
  - `source: string` is defined but never explained
  - Examples in spec use field names directly without source
  - Is this a data source ID, table name, or something else?
- **Impact:** Unclear how to populate this field
- **Recommendation:** Add examples showing `source: "salesData"` or similar.

### Ambiguity 6: Wildcard Batch Operations
- **Locations:** §8.4 (line 597)
- **Issue:**
  - Shows examples like `Δ~@K*.showTrend:true`
  - Unclear: If operation fails on some blocks (e.g., showTrend not supported), does entire batch fail?
  - No specification of batch operation semantics
- **Impact:** Batch failure handling undefined
- **Recommendation:** Add rule: "Batch operations are best-effort; individual failures are logged but don't fail batch."

### Ambiguity 7: Signal Transform Execution Timing
- **Locations:** §10.3 (line 787)
- **Issue:**
  - SignalEmission has `transform?: string`
  - SignalReception has `transform?: string`
  - If both exist, which executes first?
  - Example: emitter transforms value to uppercase, receiver transforms to lowercase - what's final value?
- **Impact:** Transform pipeline order undefined
- **Recommendation:** Specify: "Emission transform executes before reception transform."

### Ambiguity 8: Slot Map Semantics
- **Locations:** §4.2 (line 193)
- **Issue:**
  - `type SlotMap = Record<string, Block[]>`
  - Slot names like "children", "header", "body" are mentioned
  - No specification of standard slot names per block type
  - Grid has `slots.children`, but does card have `slots.header` or `slots.cardHeader`?
- **Impact:** Slot naming conventions unclear
- **Recommendation:** Add table of standard slot names per layout block type.

### Ambiguity 9: Priority Numeric vs Semantic
- **Locations:** §11.3 (line 906), §11.6 (line 949), §B.6.1 (line 2420)
- **Issue:**
  - Priority can be `1 | 2 | 3 | 4` OR `'hero' | 'primary' | 'secondary' | 'detail'`
  - Mapping: hero=1, primary=2, secondary=3, detail=4
  - BUT §11.6 shows `!hero` and `!1` as different syntax options
  - Can you use `!2` for primary or must you use `!primary`?
- **Impact:** Syntax acceptance rules unclear
- **Recommendation:** Specify both forms are valid and map equivalently.

### Ambiguity 10: Composition Depth Notation
- **Locations:** §5.6 (line 341)
- **Issue:**
  - Introduces D0, D1, Dn notation for composition depth
  - Only mentioned in this section to clarify vs generation layers
  - Not used anywhere else in spec
  - Unclear if this is a formal notation or just explanatory
- **Impact:** No impact (purely explanatory), but could be formalized
- **Recommendation:** Either formalize Dn notation or remove from normative text.

### Ambiguity 11: Cache TTL Strategy
- **Locations:** §14.2 (line 1412), §14.3 (line 1427)
- **Issue:**
  - `set(key, fragment, ttl?: number)` allows optional TTL
  - Cache warming mentions "high TTL"
  - No specification of default TTL or recommended values
- **Impact:** Cache expiry behavior undefined
- **Recommendation:** Add recommended TTL values: discovery=1hr, user-generated=24hr, etc.

### Ambiguity 12: Schema Version Compatibility Direction
- **Locations:** §20.2 (line 1752)
- **Issue:**
  - "3.x | 2.x | Forward-compatible fields ignored"
  - Implies engine can read future schemas but ignores unknown fields
  - Conflicts with "strict" Zod validation in §B.6.3 (line 2522) which disallows extra fields
- **Impact:** Forward compatibility not actually possible with strict validation
- **Recommendation:** Choose: strict validation (reject unknown) OR forward-compatible (ignore unknown).

### Ambiguity 13: Placeholder Rendering Requirements
- **Locations:** §19.2 (line 1719), §B.3.1 (line 2036)
- **Issue:**
  - "Placeholder + warning" is level 2 degradation
  - No specification of what placeholder MUST contain
  - Should it show block type? Original binding? Error message?
- **Impact:** Inconsistent placeholder rendering across adapters
- **Recommendation:** Define minimum placeholder content: block type, UID, and reason string.

### Ambiguity 14: Signal Registry Inheritance Default
- **Locations:** §10.7 (line 840)
- **Issue:**
  - "Default: Auto-Inherit" for child blocks
  - But §B.6.1 shows `signalInheritance?: SignalInheritance` as optional
  - If field is omitted, which mode is assumed?
- **Impact:** Default behavior unclear
- **Recommendation:** Specify: "If signalInheritance is omitted, mode defaults to 'inherit'."

### Ambiguity 15: LiquidExpr Error Fallback Propagation
- **Locations:** §B.4.4 (line 2150)
- **Issue:**
  - All errors produce `null` fallback
  - But if transform is in a required binding slot, does `null` satisfy requirement?
  - Example: `kpi` requires `value` binding, transform fails and returns `null` - does block render?
- **Impact:** Error handling interaction with required fields
- **Recommendation:** Specify: "null from transform error triggers empty state render."

### Ambiguity 16: Coherence Repair Scope
- **Locations:** §B.5.5 (line 2277)
- **Issue:**
  - Micro-LLM repair shown for binding issues
  - Repair prompt says "~10 tokens output"
  - But repairs list includes adding signals, which is structural change
  - Can micro-LLM add structural elements or only fix bindings?
- **Impact:** Repair capability scope unclear
- **Recommendation:** Limit micro-LLM to L2 repairs only; structural repairs escalate to composition tier.

### Ambiguity 17: UID Generation Timing
- **Locations:** §B.2.1 (line 1964)
- **Issue:**
  - "Generated at creation time (compile or mutation)"
  - But compilation is deterministic per spec
  - If same LiquidCode compiles twice, do blocks get same UIDs or different?
- **Impact:** Cache key stability
- **Recommendation:** Specify: "UIDs are generated randomly per compilation; same LiquidCode produces different UIDs."

---

## Minor Issues (Stylistic/Editorial)

### Minor Issue 1: Table of Contents Link Format
- **Location:** Lines 10-34
- **Issue:** ToC uses `#` anchors but section headers have special chars that may not slugify consistently
- **Fix:** Verify all ToC links resolve correctly (e.g., §11 has `&` in title)

### Minor Issue 2: Version Number Format Inconsistency
- **Location:** Line 3 vs Line 2313
- **Issue:**
  - Line 3: `**Version:** 2.0`
  - Line 2314: `version: '2.0'` (string)
- **Fix:** Clarify version is semantic string, not number

### Minor Issue 3: Code Block Language Inconsistency
- **Location:** Throughout spec
- **Issue:** Some code blocks use `typescript`, others use `liquidcode`, some have no language tag
- **Fix:** Standardize: TypeScript for interfaces, liquidcode for LiquidCode syntax

### Minor Issue 4: Em Dash Usage
- **Location:** Lines 75-78 (§2.2)
- **Issue:** Uses em dashes `—` for bullets which may render inconsistently
- **Fix:** Use standard Markdown bullets `-`

### Minor Issue 5: Diagram ASCII Inconsistency
- **Location:** Lines 86-140 (§3.1), 742-755 (§10.1)
- **Issue:** Box-drawing characters may not render in all viewers
- **Fix:** Note in spec that diagrams are informative, not normative

### Minor Issue 6: Example Comment Syntax
- **Location:** Line 2128 (§B.4.2)
- **Issue:** Uses `(* comment *)` which is not standard EBNF in some parsers
- **Fix:** Use `/* comment */` for wider compatibility

### Minor Issue 7: Placeholder Type Generic Inconsistency
- **Location:** Line 2056 (§B.3.2)
- **Issue:** `Placeholder<T>` type used but never defined
- **Fix:** Define `type Placeholder<T> = T & { isPlaceholder: true; reason: string }`

### Minor Issue 8: Signal Type Abbreviation Explanation Missing
- **Location:** Line 445 (§6.4)
- **Issue:** Shows `dr=30d` but `dr` abbreviation for dateRange not explained
- **Fix:** Add abbreviation table or expand to `dateRange=30d`

### Minor Issue 9: Binding Slot vs FieldBinding Target Confusion
- **Location:** §9.2 (line 658) vs §B.6.1 (line 2382)
- **Issue:**
  - §9.2 calls them "binding slots"
  - §B.6.1 interface field is `target: BindingSlot`
  - Terminology inconsistency (slot vs target)
- **Fix:** Standardize on one term (recommend "binding slot")

### Minor Issue 10: Operation Count Starting Value
- **Location:** §16.1 (line 1505), §B.6.1 (line 2478)
- **Issue:**
  - DigitalTwin has `operationCount: number`
  - SchemaMetadata has `operationCount: number`
  - Both required fields but no indication of starting value (0? 1?)
- **Fix:** Specify: "operationCount starts at 0 for newly generated schemas"

### Minor Issue 11: ISO 8601 Format Unspecified
- **Location:** Line 2318 (§B.6.1)
- **Issue:** `generatedAt: string; // ISO 8601` but no precision specified
- **Fix:** Specify format: "ISO 8601 with timezone (e.g., 2024-01-15T10:30:00Z)"

### Minor Issue 12: Regex Pattern Inconsistency
- **Location:** Lines 2515, 2527, 2549, 2561
- **Issue:** UID patterns use `^b_[a-z0-9]{12}$` but doesn't specify lowercase vs case-insensitive
- **Fix:** Confirm UIDs are lowercase hex and document why

### Minor Issue 13: Ordinal vs Index Terminology
- **Location:** §8.2 (line 580)
- **Issue:** "Nth block" uses ordinal (1st, 2nd) but `@0` suggests 0-indexed
- **Fix:** Clarify: "`@0` is the first block (0-indexed)"

### Minor Issue 14: Wildcard Syntax Discrepancy
- **Location:** §8.4 (line 597-604)
- **Issue:**
  - Shows `@K*` for all KPIs
  - Shows `@[*,0]` for all in column 0
  - Shows `@:*revenue*` for wildcard binding
  - Inconsistent wildcard position (suffix, infix, both)
- **Fix:** Formalize wildcard rules: `*` matches any characters in that position

### Minor Issue 15: Priority Default Value Ambiguity
- **Location:** §11.3 (line 913)
- **Issue:** "Blocks without explicit priority are `primary`"
- **Question:** What about layout blocks (grid, stack) which don't display data?
- **Fix:** Clarify: "Data blocks default to primary; layout blocks have no priority"

### Minor Issue 16: Span Default Values
- **Location:** §11.6 (line 979-982)
- **Issue:** Span syntax `*full`, `*2` shown but default (no span) behavior not explained
- **Fix:** Add: "Blocks without span occupy 1 column, 1 row"

### Minor Issue 17: Relationship Type "Flow" Undefined
- **Location:** §11.5 (line 943), §B.6.1 (line 2442)
- **Issue:** Table shows `flow` relationship but never explains what it means
- **Fix:** Add explanation: "flow: blocks can wrap to next line like inline text"

### Minor Issue 18: Example Line Numbers
- **Location:** §6.5 (line 470-487)
- **Issue:** Complete example has no line numbers, making it hard to reference
- **Fix:** Add line numbers or sub-references for documentation

### Minor Issue 19: Appendix A Heading Level
- **Location:** Line 1781
- **Issue:** Uses `##` for appendix sections, same as main sections
- **Fix:** Consider using different heading level or style for appendices

### Minor Issue 20: Conformance Test Format
- **Location:** §B.3.3 (line 2079)
- **Issue:** Test array has string descriptions but no formal test structure
- **Fix:** Convert to table with test name, expected result, failure mode

### Minor Issue 21: Token Budget Context Missing
- **Location:** §B.1.3 (line 1936)
- **Issue:** P50/P90/P99 tokens mentioned but no baseline for comparison
- **Fix:** Add: "Traditional JSON interfaces: P50=3500, P90=4200, P99=5800 tokens"

### Minor Issue 22: Snapshot Index Sign Confusion
- **Location:** §8.5 (line 615)
- **Issue:** Shows `@snapshot:-1` suggesting negative indexing
- **Question:** Is `-1` the most recent? Or is it operation count minus 1?
- **Fix:** Clarify: "Negative indices count back from current (−1 = previous)"

### Minor Issue 23: Grid Cell Definition Missing
- **Location:** §11.14 (line 1198-1207)
- **Issue:** GridCell interface includes `width: number` and `height: number | 'auto'`
- **Question:** What unit? Pixels, percentages, grid units?
- **Fix:** Add comment: "// Width/height in pixels, resolved by adapter"

### Minor Issue 24: Signal Trigger Type Not Exhaustive
- **Location:** §10.4 (line 799)
- **Issue:** Table shows 5 trigger types but SignalEmission uses `trigger: string` (not enum)
- **Fix:** Either make trigger an enum or add "custom trigger strings allowed"

### Minor Issue 25: AdapterMetadata Field Order
- **Location:** §18.2 (line 1658)
- **Issue:** Interface fields not in canonical order per §B.6.2
- **Fix:** Reorder fields alphabetically or by logical grouping

### Minor Issue 26: Explainability Confidence Overlap
- **Location:** §B.6.1 (line 2470)
- **Issue:** SchemaExplainability has `confidence: number` but no range specified
- **Question:** Is this 0-1 like other confidence scores?
- **Fix:** Add comment: "// 0-1 confidence score"

### Minor Issue 27: LiquidExpr Execution Limit
- **Location:** §B.4.6 (line 2179)
- **Issue:** "Execution time bounded (max 1000 operations)"
- **Question:** What counts as an operation? Function call? Binary op?
- **Fix:** Clarify: "Operation = function call, binary op, or property access"

### Minor Issue 28: Mutation Inverse Missing
- **Location:** §16.2 (line 1525)
- **Issue:** AppliedOperation has `inverse: Operation` for undo
- **Question:** Are all operations invertible? What about non-deterministic ones?
- **Fix:** Add: "Some operations may have null inverse if non-invertible"

### Minor Issue 29: Discovery Engine Warm Cache Metric
- **Location:** §12.6 (line 1316)
- **Issue:** "85%+ of first queries hit cache"
- **Question:** Is this per-session or across all users?
- **Fix:** Clarify: "85%+ hit rate for first query in a session"

### Minor Issue 30: JSON Schema $id URL
- **Location:** Line 2542
- **Issue:** Uses `https://liquidcode.dev/schema/v2.0/` which may not exist
- **Fix:** Use example.com or add note: "Placeholder URL"

### Minor Issue 31: Hardening Checklist Incompleteness
- **Location:** §B.7 (line 2573)
- **Issue:** Checklist has 12 items but spec identified 6 hardening sections (B.1-B.6)
- **Fix:** Add checklist items for each subsection of each hardening section

---

## Cross-Reference Verification

### Verified Correct Cross-References
✅ §4.1 references B.2 for UID requirement (line 170)
✅ §9.2 references binding slots correctly used in B.6.1
✅ §10.7 signal inheritance correctly references §10.2 for base definitions
✅ §11.14 adapter interface references §18.1
✅ §B.4 LiquidExpr referenced correctly from §10.3, §B.6.1
✅ Appendix A quick reference matches main sections

### Cross-Reference Errors

#### Error 1: Missing Forward Reference
- **Location:** §4.1 (line 173)
- **Issue:** Comments say "optional for layout blocks" but doesn't reference where layout blocks are defined
- **Fix:** Add "see §11.12" or similar

#### Error 2: Broken Section Reference
- **Location:** §5.4 (line 324)
- **Issue:** "most user edits touch only L1 or L2" but no reference to mutation layer detection (§5.3)
- **Fix:** Add: "See §5.3 for layer scope detection"

#### Error 3: Appendix B Intro Reference
- **Location:** Line 1867
- **Issue:** Says "addresses six critical failure modes" but doesn't reference what review identified them
- **Fix:** Add context or remove claim

#### Error 4: Signal Type Reference Inconsistency
- **Location:** §6.4 (line 442) vs §A.3 (line 1851)
- **Issue:** §6.4 shows abbreviations (dr, sel, str) but §A.3 uses full names
- **Fix:** Cross-reference abbreviation usage or standardize

---

## Numerical/Quantitative Consistency

### Verified Consistent Numbers
✅ Breakpoint thresholds (600px, 1200px) consistent in §11.11 and §B.6.1
✅ UID length (12 chars) consistent across regex patterns
✅ Three primitives (Block, Slot, Signal) mentioned consistently
✅ Five operations (+, -, →, ~, ↑) listed consistently

### Numerical Inconsistencies

#### Inconsistency 1: Token Counts (Already listed as Critical Issue 14)

#### Inconsistency 2: Error Rates (Already listed as Critical Issue 18)

#### Inconsistency 3: Cache Hit Rate Variance
- **Locations:** §12.6 (line 1316) vs §13.1 (line 1329)
- **Values:**
  - §12.6 says "85%+ first query hit rate"
  - §13.1 tier breakdown: 40% exact cache + 50% semantic = 90% total cached
- **Issue:** 85% vs 90% mismatch
- **Resolution:** Update §12.6 to 90% or explain the 5% difference

#### Inconsistency 4: Layer Token Counts
- **Location:** §5.1 (line 280-295)
- **Values:** L0=5 tokens, L1=20 tokens, L2=10 tokens
- **Total:** 5+20+10 = 35 tokens
- **Match:** This matches §1.1 claim of ~35 tokens ✅
- **But:** §6.5 shows example with ~40 tokens
- **Resolution:** Example includes signal declarations which add tokens

#### Inconsistency 5: Latency Claims
- **Location:** §1.1 (line 48) vs §13.1 (line 1331-1352)
- **Values:**
  - §1.1: "70-100ms latency"
  - §13.1 tier latencies: <5ms, <50ms, <100ms, <500ms
  - Weighted average: 0.4*5 + 0.5*50 + 0.09*100 + 0.01*500 = 39ms
- **Issue:** 39ms average but claim is 70-100ms
- **Resolution:** Clarify whether 70-100ms includes data fetch or just LiquidCode generation

---

## Syntax/Grammar Consistency

### Verified Consistent Syntax
✅ `$fieldName` for bindings used consistently
✅ `@address` for block addressing used consistently
✅ `#archetype` for archetype hint used consistently
✅ Grid syntax `GNxM` used consistently (though dimension order ambiguous)

### Syntax Inconsistencies

#### Syntax Error 1: Signal Declaration Syntax Variants
- **Locations:** §6.4 (line 442) vs §B.1.1 (line 1890)
- **Forms:**
  - Unicode: `§dateRange:dr=30d,url`
  - ASCII (shown): `signal:dateRange:dr=30d,url`
- **Issue:** ASCII form has extra colon before signal name
- **Resolution:** Normalize to `signal:dateRange:dr=30d,url` consistently

#### Syntax Error 2: Mutation Prefix Syntax
- **Locations:** §7.2 (line 510) vs §B.1.1 (line 1893)
- **Forms:**
  - Unicode: `Δ+K$profit@[1,2]`
  - ASCII (shown): `delta:+K$profit@[1,2]`
- **Issue:** ASCII form has colon after delta but operation symbol follows
- **Alternative:** Could be `delta +K$profit` (space separator)
- **Resolution:** Formalize ASCII mutation syntax with examples

#### Syntax Error 3: Emit/Receive Abbreviation
- **Locations:** §6.4 (line 452-466) vs §6.5 (line 474)
- **Forms:**
  - §6.4 shows: `>@signalName:trigger` (emit), `<@signalName→target` (receive)
  - §6.5 shows: `DF<>@dateRange` (emit AND receive)
- **Issue:** `<>` syntax not explained in grammar section
- **Resolution:** Add `<>` as shorthand for "emits and receives same signal"

#### Syntax Error 4: Layout Suffix Composition
- **Locations:** §11.6 (line 972)
- **Example:** `K$revenue!hero^fixed` (combined priority + flexibility)
- **Issue:** No formal grammar for suffix ordering
- **Question:** Is `K$revenue^fixed!hero` also valid?
- **Resolution:** Specify suffix order: priority (!), flexibility (^), span (*), in that order

#### Syntax Error 5: Relationship Grouping Syntax
- **Locations:** §11.6 (line 966-970)
- **Forms:**
  - `[K$revenue K$orders K$profit]=group`
  - `[K$total -> T$breakdown]=detail`
- **Issue:** Mix of space-separated and arrow-separated lists
- **Resolution:** Formalize: space-separated for symmetric relations, arrow for directed relations

---

## Type Definition Consistency

### Verified Consistent Types
✅ `BlockType` union defined identically in §B.6.1 and used consistently
✅ `SignalType` union consistent (except selection value shape issue)
✅ `Breakpoint` enum consistent across sections
✅ `BindingSlot` union consistent

### Type Definition Issues

#### Type Issue 1: Interface vs Type Alias Inconsistency
- **Location:** §4.2 (line 193) vs §B.6.1
- **Forms:**
  - §4.2: `type SlotMap = Record<string, Block[]>`
  - §B.6.1: `slots?: Record<string, Block[]>` (inlined)
- **Issue:** SlotMap type alias defined but not used in normative schema
- **Resolution:** Either use SlotMap consistently or remove the alias

#### Type Issue 2: PersistStrategy Type Name
- **Location:** §4.3 (line 210) vs §10.2 (line 769) vs §B.6.1 (line 2394)
- **Names:**
  - §4.3: `persist?: PersistStrategy`
  - §10.2, §B.6.1: `persist?: 'none' | 'url' | 'session' | 'local'`
- **Issue:** Type alias mentioned but never defined
- **Resolution:** Define `type PersistStrategy = 'none' | 'url' | 'session' | 'local'`

#### Type Issue 3: TriggerType Missing Definition
- **Location:** §10.3 (line 786)
- **Usage:** `trigger: TriggerType`
- **Issue:** Type name used but should be string per §10.4
- **Resolution:** Change to `trigger: string` or define enum

#### Type Issue 4: Unknown Type Usage
- **Location:** §B.6.1 (line 2393, 2367)
- **Usage:** `default?: unknown`, `value: unknown`
- **Issue:** TypeScript `unknown` is correct but may not be clear to non-TS readers
- **Resolution:** Add note: "unknown means any type (type-safe any)"

#### Type Issue 5: FilterCondition Operator Missing Types
- **Location:** §B.6.1 (line 2366)
- **Definition:** `operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'`
- **Issue:** `in` and `contains` operators have different value types than comparison ops
  - `in` expects array value
  - `contains` expects string value
  - Others expect scalar
- **Resolution:** Consider `value: unknown | unknown[]` or operator-specific value types

---

## Semantic Consistency

### Verified Semantically Consistent Concepts
✅ "Deterministic compilation" concept used consistently
✅ "Soft constraints" vs "hard filters" distinction maintained
✅ "Position-derived identity" concept coherent
✅ Three-layer hierarchy (L0/L1/L2) vs composition depth (Dn) clearly distinguished

### Semantic Issues

#### Semantic Issue 1: "Token-Minimal" Definition
- **Locations:** §1 (line 39), §2.1 (line 66)
- **Claim:** "Token-minimal encoding"
- **Question:** Minimal compared to what? JSON? Other DSLs?
- **Issue:** "Minimal" is relative but no comparison baseline after §1.1 table
- **Resolution:** Define as "minimal compared to equivalent JSON schema"

#### Semantic Issue 2: "Always Compiles" vs "May Use LLM"
- **Locations:** §2.2 (line 77) vs §13.1 (line 1346)
- **Statements:**
  - §2.2: "NOT rendered directly — Always compiles to LiquidSchema first"
  - §13.1: Tier 4 uses "LLM Generation" for 1% of requests
- **Issue:** If LiquidCode always compiles, why does tier 4 need LLM?
- **Resolution:** Clarify: "LiquidCode generation may use LLM; compilation is always deterministic"

#### Semantic Issue 3: "Parallel" Generation Ambiguity
- **Location:** §2.1 (line 67), §5.2 (line 301)
- **Claim:** "Hierarchy enables parallelism"
- **Issue:** Parallel LLM calls vs parallel compilation not distinguished
- **Resolution:** Clarify: "Independent blocks can be generated by parallel LLM calls AND compiled in parallel"

#### Semantic Issue 4: "Zero Token Overhead" for Addresses
- **Location:** §2.1 (line 71), §8.1 (line 571)
- **Claim:** "Zero token overhead for address generation"
- **Issue:** `@K0` is 1 token, not zero
- **Clarification Needed:** "Zero token overhead" means addresses are derived, not stored in schema
- **Resolution:** Reword: "Zero storage overhead — addresses computed from position"

#### Semantic Issue 5: "100% Render Success" Guarantee
- **Location:** §19.3 (line 1727) vs §B.3.1 (line 2032)
- **Claims:**
  - §19.3: "100% render success rate for validated schemas"
  - §B.3.1: Defines "success" as not crashing (includes degraded/fallback states)
- **Issue:** Layperson might interpret "success" as "perfect render" not "didn't crash"
- **Resolution:** Reword: "100% of validated schemas render without crashing (may degrade)"

#### Semantic Issue 6: "Slot" Overloading
- **Locations:** §4.2 (slots for children), §9.2 (binding slots), §11.10 (slot context)
- **Issue:** "Slot" means three different things:
  1. Container slot (where blocks go)
  2. Binding slot (where data goes)
  3. Embedding slot (container context)
- **Resolution:** Use qualified terms: "container slot", "binding slot", "embedding slot"

#### Semantic Issue 7: "Fractal Composition"
- **Location:** §10.6 (line 820)
- **Term:** "Fractal Composition"
- **Issue:** Used once without definition
- **Resolution:** Explain: "Fractal composition = patterns that work at any nesting level"

#### Semantic Issue 8: "Soft Constraints" Mechanism
- **Locations:** §2.1 (line 70), §9.3 (line 670)
- **Claim:** "Soft constraints, not hard filters — Suggestions score options, never block"
- **Issue:** §9.3 shows threshold <0.5 = "Prompt for clarification"
- **Question:** Is prompting for clarification a form of blocking?
- **Resolution:** Clarify: "Never block silently; may prompt user for high-risk decisions"

---

## Consistency Score

**7.5/10** - Specification is solid but needs targeted fixes

### Scoring Breakdown

**Strengths (+):**
- ✅ **Type System Consistency (9/10):** Well-defined TypeScript interfaces with minimal conflicts
- ✅ **Syntax Consistency (8/10):** LiquidCode grammar mostly consistent, ASCII/Unicode duality clear
- ✅ **Concept Orthogonality (9/10):** Three primitives, five operations, clear separation of concerns
- ✅ **Cross-Reference Quality (8/10):** Most references accurate, few broken links
- ✅ **Hardening Appendix (9/10):** Appendix B addresses real concerns with normative requirements

**Weaknesses (−):**
- ❌ **Numerical Claims (5/10):** Token counts and error rates need reconciliation
- ❌ **Undefined Types (6/10):** CachedFragment, RenderConstraints, Placeholder missing
- ❌ **Normative Language (6/10):** Inconsistent use of MUST/SHOULD/MAY
- ❌ **Ambiguous Defaults (6/10):** Many optional fields lack default value specifications
- ❌ **Example Coverage (7/10):** Some advanced features lack examples (e.g., snapshot addressing in practice)

### Critical Issues Requiring Immediate Fix (Before v2.0 Final)
1. ✋ **Block.uid requirement** - Must be explicit in all interface definitions
2. ✋ **Transform language** - Must specify LiquidExpr everywhere
3. ✋ **Token count reconciliation** - Must align claims with reality
4. ✋ **Undefined types** - Must define CachedFragment, RenderConstraints
5. ✋ **Adapter interface** - Must match §18.1 with §B.3.2

### Medium Priority (Should Fix for v2.1)
6. 📋 Address resolution priority including UID
7. 📋 Coherence threshold explanation
8. 📋 Signal value type consistency
9. 📋 Snapshot addressing syntax collision
10. 📋 Normative language audit

### Low Priority (Nice to Have)
11. 📝 ASCII diagram rendering notes
12. 📝 Code block language tags
13. 📝 Terminology glossary (slot overloading)
14. 📝 Extended examples for complex features
15. 📝 Migration system specification (or mark as future work)

---

## Recommendations for Spec Improvement

### Immediate Actions

1. **Add Missing Type Definitions**
   - CachedFragment interface in §14 or Appendix B
   - RenderConstraints interface or remove from Block
   - Placeholder<T> type in §B.3.2

2. **Reconcile Numerical Claims**
   - Create token count reference table (typical/complex/P99)
   - Clarify error rate vs layer success rate
   - Update cache hit rate to 90% consistently

3. **Unify Transform Language**
   - Add "// LiquidExpr (see B.4)" comments to ALL transform fields
   - Remove any suggestion of free-form strings

4. **Formalize UID System**
   - Make uid required in §4.1 Block interface
   - Update address resolution to include UID priority
   - Document UID generation determinism (or lack thereof)

5. **Align Adapter Interfaces**
   - Make §18.1 match §B.3.2 exactly
   - Add all MUST methods from hardening spec

### Structural Improvements

6. **Add Glossary Section**
   - Define overloaded terms (slot, scope, layer)
   - Disambiguate archetype vs archetype hint
   - Explain fractal composition

7. **Formalize Grammar**
   - Create EBNF for complete LiquidCode syntax
   - Document ASCII/Unicode equivalence rules
   - Specify suffix ordering for layout modifiers

8. **Expand Examples**
   - Add end-to-end example showing all features
   - Show mutation sequences (not just single operations)
   - Demonstrate snapshot addressing in practice
   - Show coherence gate rejection and repair

9. **Add Conformance Matrix**
   - Table showing which features are MUST/SHOULD/MAY
   - Adapter conformance levels (minimal/standard/full)
   - Schema version compatibility matrix

10. **Normative Language Audit**
    - Apply RFC 2119 keywords consistently
    - Mark all requirements with MUST/SHOULD/MAY
    - Separate normative from informative sections

---

## Methodology Notes

This review analyzed:
- ✅ All 20 main sections (§1-§20)
- ✅ Both appendices (A: Quick Ref, B: Hardening)
- ✅ 2,591 lines of specification text
- ✅ 47 TypeScript interface definitions
- ✅ 35+ code examples
- ✅ 25+ cross-references
- ✅ 15+ tables and diagrams

**Analysis Techniques:**
1. Interface definition comparison (§4.1 vs §B.6.1)
2. Cross-reference verification (all § references)
3. Type consistency checking (TypeScript types)
4. Numerical claim verification (token counts, percentages)
5. Syntax usage pattern analysis (LiquidCode examples)
6. Normative language scanning (MUST/SHOULD/MAY)

**Not Analyzed:**
- Implementation correctness (no code review)
- External specification compatibility (no JSON Schema validation)
- Practical feasibility (no prototype testing)

---

**Prepared by:** Internal Consistency Review Process
**Date:** 2025-12-21
**Specification Version:** v2.0 (Draft)
**Review Scope:** Complete normative text
**Next Review:** After addressing critical issues
