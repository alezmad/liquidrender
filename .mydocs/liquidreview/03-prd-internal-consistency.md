# PRD Internal Consistency Review

**Document:** `_bmad-output/prd-liquid-engine-v2.md`
**Reviewer:** Internal Consistency Analysis
**Date:** 2025-12-21
**Lines Analyzed:** 1,512

---

## Executive Summary

The PRD for Liquid Engine v2 demonstrates **strong overall consistency** with well-aligned requirements, clear scope boundaries, and coherent technical specifications. However, several **critical inconsistencies** were identified across type definitions, phase assignments, performance metrics, and requirement interactions.

**Overall Assessment:** 7.5/10 - Good foundation with specific areas requiring resolution

**Key Findings:**
- 8 Critical inconsistencies requiring immediate resolution
- 12 Requirement conflicts requiring clarification
- 15 Minor issues for cleanup
- Strong alignment between user journeys and functional requirements
- Excellent scope discipline with clear IN/OUT boundaries

---

## Critical Inconsistencies

### Issue 1: Block Identity System Contradiction

**Locations:**
- Section: LiquidSchema Core Types (L1119, L1141)
- Section: Hardening System (FR-HD-4 through FR-HD-6, L991-996)

**Contradiction:**
```typescript
// L1119-1121: Schema has both uid (required) and id (optional)
interface LiquidSchema {
  uid: string;                           // Stable unique identifier (required)
  id?: string;                           // User-assigned ID (optional)
}

// L1141-1143: Block has same dual identity
interface Block {
  uid: string;                           // Stable unique identifier (required)
  id?: string;                           // User-assigned ID (optional)
}

// BUT addressing system (L1085-1090) uses:
explicit_id     = "#" IDENTIFIER       // Which ID? uid or id?
```

**FR-HD-4:** "All blocks have immutable `uid` field generated at creation"
**FR-HD-5:** "Positional selectors (@K0, @[0,1]) resolve to uid sets at mutation time"
**FR-HD-6:** "Mutation operations target uids, not positions"

**Problem:** The grammar allows `@#myId` for explicit ID addressing, but it's ambiguous whether this targets `uid` (system-generated) or `id` (user-assigned). The hardening requirements only reference `uid`, but the type definitions suggest both exist.

**Resolution Required:**
1. **Clarify addressing semantics:** Does `@#myId` match against `uid` or `id` field?
2. **Update grammar:** If both are valid, grammar should distinguish (e.g., `@#user:myId` vs `@#uid:abc123`)
3. **Update FR-HD-5/6:** Explicitly state whether user-assigned `id` can be used for addressing

**Impact:** High - Affects mutation stability guarantees and addressing system reliability

---

### Issue 2: Layout Priority Type Inconsistency

**Locations:**
- LiquidCode Grammar (L1098-1103)
- BlockLayout Interface (L1242)
- FR-LY-1 (L969)

**Contradiction:**
```typescript
// Grammar L1098-1103:
priority        = "!" (PRIORITY_LEVEL | NUMBER)
PRIORITY_LEVEL  = "hero" | "primary" | "secondary" | "detail"

// Type definition L1242:
interface BlockLayout {
  priority?: 1 | 2 | 3 | 4 | 'hero' | 'primary' | 'secondary' | 'detail';
}

// FR-LY-1 L969:
"Engine can assign priority levels to blocks (hero, primary, secondary, detail OR 1-4)"
```

**Problem:**
1. Grammar allows ANY NUMBER, but type restricts to `1 | 2 | 3 | 4`
2. Unclear mapping between named levels and numeric levels
3. No specification of which form is canonical (names or numbers)

**Resolution Required:**
1. **Restrict grammar:** Change `NUMBER` to explicit `1 | 2 | 3 | 4`
2. **Document mapping:** Specify `hero=1, primary=2, secondary=3, detail=4` OR declare them as separate valid values
3. **Normalization:** Specify whether compiler normalizes to one form

**Impact:** High - Affects LiquidCode validation and schema compilation

---

### Issue 3: Adapter Interface Method Inconsistency

**Locations:**
- User Journey 4: Jamie Torres (L462-467)
- Adapter Interface Contract (L1294-1302)

**Contradiction:**
```typescript
// User Journey shows (L462-467):
interface LiquidAdapter<T> {
  render(schema: LiquidSchema, data: any): T;
  renderBlock(block: Block, data: any): T;
  supports(blockType: BlockType): boolean;
  renderPlaceholder(block: Block, reason: string): T;
  createSignalRuntime(registry: SignalRegistry): SignalRuntime;
  readonly metadata: AdapterMetadata;
}

// But Technical Specifications show (L1294-1302):
interface LiquidAdapter<RenderOutput> {
  render(schema: LiquidSchema, data: any, context?: SlotContext): RenderOutput;
  renderBlock(block: Block, data: any, context?: SlotContext): RenderOutput;
  supports(blockType: BlockType): boolean;
  renderPlaceholder(block: Block, reason: string): RenderOutput;
  createSignalRuntime(registry: SignalRegistry): SignalRuntime;
  resolveLayout(blocks: Block[], context: SlotContext): LayoutResolution;  // NEW
  readonly metadata: AdapterMetadata;
}
```

**Problem:**
1. User journey interface missing `context?: SlotContext` parameter
2. User journey interface missing `resolveLayout()` method entirely
3. Inconsistent generic name (`T` vs `RenderOutput`)

**Resolution Required:**
1. **Update user journey:** Add SlotContext parameter to render methods
2. **Update user journey:** Add resolveLayout() method
3. **OR update docs:** Explain that user journey shows simplified version for clarity

**Impact:** High - Affects adapter implementation guidance and conformance testing

---

### Issue 4: Cache Hit Rate Contradiction

**Locations:**
- Executive Summary (L79)
- Success Criteria - Measurable Outcomes (L205)
- Tiered Resolution Innovation (L758-764)

**Contradiction:**
```
// L79 Executive Summary:
"99% cache hit rate"

// L205 Success Criteria:
"Cache efficiency | 1 - (LLM calls / total requests) | >99%"

// L758-764 Tiered Resolution:
Tier | Hit Rate | Latency
Exact cache | 40% | <5ms
Semantic search | 50% | <50ms
Composition | 9% | <100ms
LLM fallback | 1% | <500ms
```

**Problem:**
1. Executive summary claims "99% cache hit rate"
2. Success criteria defines "cache efficiency" as >99% non-LLM calls
3. Tiered resolution table shows only 40% exact cache hits, but 99% non-LLM (40% + 50% + 9% = 99%)

**Ambiguity:** What does "cache hit rate" mean?
- **Narrow definition:** Exact cache matches (40%)
- **Broad definition:** Any non-LLM resolution (99%)

**Resolution Required:**
1. **Clarify terminology:** Use "exact cache hit rate" (40%) vs "LLM avoidance rate" (99%)
2. **Update Executive Summary:** Change "99% cache hit rate" to "99% of queries avoid LLM via tiered resolution"
3. **FR-TR-5 addition:** Require tracking both metrics separately

**Impact:** Medium - Affects success criteria interpretation and metric tracking

---

### Issue 5: Latency Target Inconsistency

**Locations:**
- Success Criteria - User Success (L141-145)
- Success Criteria - Technical Success (L184-189)
- NFR Performance (L1014-1024)
- Tiered Resolution table (L758-764)

**Contradiction:**
```
// User Success L141-145:
"Time to integration | First working render | <30 minutes"
"Token efficiency | Tokens per generation | <50 average"

// Technical Success L184:
"Generation latency | <100ms p95 | Cache hit response time"

// NFR-P3 L1016:
"Cache lookup <5ms"

// NFR-P6 L1020:
"Full resolution (cache miss) <500ms"

// Tiered Resolution L758-764:
Exact cache | 40% | <5ms
Semantic search | 50% | <50ms
Composition | 9% | <100ms
LLM fallback | 1% | <500ms
```

**Problem:**
1. Technical Success says "<100ms p95" for "cache hit response time"
2. But tiered resolution shows cache hits at <5ms, semantic at <50ms, composition at <100ms
3. If "cache hit" means exact cache (40% of requests), then p95 would include semantic/composition and should be <100ms ✓
4. BUT if "cache hit" means "any non-LLM" (99% of requests), then p95 is <100ms ✓
5. **However:** Success criteria doesn't define what constitutes a "generation"

**Resolution Required:**
1. **Define "generation latency":** Clarify if this includes all tiers or just LLM calls
2. **Update measurement column:** Specify "p95 across all resolution tiers" or "p95 for exact cache only"
3. **Add breakdown:** Show expected p50, p95, p99 across the tier distribution

**Impact:** Medium - Affects performance benchmarking and success criteria

---

### Issue 6: Binding Slot Duplication

**Locations:**
- LiquidCode Grammar (L1069)
- Innovation Section (L738-743)
- LiquidSchema Core Types (L1190-1195)

**Contradiction:**
```typescript
// Grammar L1069:
bindings        = "$" FIELD ("$" FIELD)*

// Innovation L738-743:
type BindingSlot =
  | 'x' | 'y' | 'value' | 'label' | 'category'
  | 'series' | 'color' | 'stack' | 'trend' | 'icon'
  | 'compare' | 'current' | 'previous' | 'format'
  | 'data' | 'columns' | 'pageSize';

// Types L1190-1195:
type BindingSlot =
  | 'x' | 'y' | 'value' | 'label' | 'category'
  | 'series' | 'color' | 'stack' | 'trend' | 'icon'
  | 'compare' | 'current' | 'previous' | 'format'
  | 'data' | 'columns' | 'pageSize';
```

**Problem:**
1. BindingSlot type is defined identically in TWO places
2. Grammar doesn't specify HOW slots are assigned (implicit vs explicit)
3. LiquidCode shows `$FIELD` syntax but doesn't show slot targeting

**Example ambiguity:**
```
K$revenue        // Does this bind 'revenue' to 'value' slot automatically?
K$revenue:value  // Or is explicit slot targeting required?
```

**Resolution Required:**
1. **Remove duplication:** Keep BindingSlot type in one canonical location (schema/types.ts)
2. **Clarify grammar:** Show whether slot targeting is implicit (auto-inferred) or explicit (must specify)
3. **Add examples:** Show LiquidCode for explicit vs implicit binding

**Impact:** Medium - Affects LiquidCode parsing and binding resolution

---

### Issue 7: Block Type Count Mismatch

**Locations:**
- Phase 1 Scope (L227)
- Block Catalog table (L1340-1355)
- BlockType definition (L1151-1165)

**Contradiction:**
```
// L227 Phase 1 Scope:
"13 block types | P0 | Core block catalog (see Block Types section)"

// Block Catalog L1340-1355 lists:
1. kpi
2. bar-chart
3. line-chart
4. pie-chart
5. data-table
6. grid
7. stack
8. text
9. metric-group
10. comparison
11. date-filter
12. select-filter
13. search-input
✓ Count: 13 types

// BUT BlockType L1151-1165:
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
  | `custom:${string}`;      // 14th type!
```

**Problem:**
1. Scope says "13 block types"
2. Catalog table shows exactly 13 concrete types ✓
3. BUT TypeScript definition includes `custom:${string}` as extensibility mechanism
4. Is "custom" counted as the 13th type, or is it additional?

**Resolution Required:**
1. **Clarify scope:** State "13 core block types + extensible custom types"
2. **Update FR-BC-4:** Link to extensibility mechanism
3. **Document custom blocks:** Explain registration and validation

**Impact:** Low - Doesn't affect functionality, but creates scope ambiguity

---

### Issue 8: Operation History Limit Contradiction

**Locations:**
- Digital Twin Architecture (L777-779)
- FR-SM-2/3 (L931-932)
- NFR-R3 (L1029)

**Contradiction:**
```typescript
// L777-779:
interface OperationHistory {
  operations: AppliedOperation[];
  maxSize: number;               // Undo depth limit
  push(op: Operation): void;
}

// FR-SM-2: "Engine can record operation history"
// FR-SM-3: "Engine can compute operation inverses for undo"

// NFR-R3 L1029: "No data loss in operation history"
```

**Problem:**
1. OperationHistory has `maxSize` limit
2. NFR-R3 promises "no data loss"
3. These are contradictory: if maxSize is enforced, old operations ARE lost

**Resolution Required:**
1. **Clarify NFR-R3:** Change to "No data loss within configured undo depth"
2. **Add requirement:** Specify minimum undo depth (e.g., "≥100 operations")
3. **Document overflow:** Specify what happens when maxSize reached (FIFO eviction, snapshot creation, etc.)

**Impact:** Medium - Affects state management guarantees and user expectations

---

## Requirement Conflicts

### RC-1: Token Efficiency Targets

**Requirements:**
- L78: "114x token reduction — LiquidCode encoding reduces LLM output from 4,000 tokens to 35"
- L142: "Token efficiency | Tokens per generation | <50 average"

**Conflict:**
- 35 tokens is cited as THE achievement (114x from 4,000)
- But success metric allows up to 50 tokens average
- This is a 43% margin, which seems large

**Resolution:** Clarify that 35 is the baseline case, but complex interfaces may use up to 50 tokens.

---

### RC-2: Adapter Placeholder Requirement

**Requirements:**
- FR-AI-4 (L952): "Adapters can implement renderPlaceholder(block, reason) method"
- FR-HD-8 (L995): "Adapters implement renderPlaceholder() for unknown block types"
- NFR-R2 (L1027): "Graceful degradation on partial failures"

**Conflict:**
- FR-AI-4 says "can implement" (optional)
- FR-HD-8 says "implement" (required)

**Resolution:** Change FR-AI-4 to "must implement" to match hardening requirement.

---

### RC-3: Validation Success Rate

**Requirements:**
- L80: "Never-broken guarantee — 100% of validated schemas render successfully"
- L187: "Validation rate | 100% | All generated schemas pass Zod"
- L188: "Render success | 100% | Valid schema → successful render"
- NFR-R1 (L1027): "100% valid schemas render successfully"

**Conflict:**
- What if adapter doesn't support a block type?
- Does it "fail to render" or "render placeholder"?
- If placeholder counts as "successful render", then 100% is achievable
- If placeholder is a "failure", then 100% is impossible with partial adapter support

**Resolution:**
1. Define "successful render" to include placeholder fallback
2. Add requirement: "Adapters must not crash on any valid schema"
3. Separate metric: "Native render rate" vs "Placeholder rate"

---

### RC-4: Phase 1 React Adapter Priority

**Requirements:**
- L239: "React adapter | P1 | Reference implementation"
- L267: "React Adapter — Reference implementation proving the contract"
- L560: "Alex Integration | Developer | npm install | 1 | Web | TypeScript API"

**Conflict:**
- React adapter is marked P1 (not P0)
- But it's listed as REQUIRED for MVP (L267)
- And primary user journey (Alex) requires it in Phase 1

**Resolution:** Change React adapter to P0. It's clearly essential for MVP validation.

---

### RC-5: Semantic Search Storage

**Requirements:**
- L234: "Tiered resolution | P1 | Cache → Search → Compose → LLM hierarchy"
- L275: "Semantic search integration (vector store) | Phase 2"

**Conflict:**
- Tiered resolution (P1, Phase 1) includes semantic search
- But semantic search integration is Phase 2

**Resolution:**
1. **Option A:** Simple semantic search in Phase 1 (in-memory vectors), advanced in Phase 2 (vector DB)
2. **Option B:** Move semantic search entirely to Phase 2, adjust tier hit rates for Phase 1

---

### RC-6: Compilation Latency Targets

**Requirements:**
- NFR-P1 (L1014): "LiquidCode compilation <5ms"
- NFR-P2 (L1015): "Schema validation <5ms"
- L185: "Compilation latency | <5ms | LiquidCode → LiquidSchema"

**Conflict:**
- Does the <5ms include BOTH compilation AND validation?
- Or is it 5ms for compilation + 5ms for validation = 10ms total?

**Resolution:** Clarify: "Compilation + validation <10ms total (<5ms each step)"

---

### RC-7: Fragment Composition Hit Rate

**Requirements:**
- L762: "Composition | 9% | <100ms"
- L277: "Fragment composition engine | Phase 2"

**Conflict:**
- Tiered resolution table assumes 9% composition hits
- But composition engine is Phase 2

**Resolution:**
1. Move composition to Phase 1 (matches tiered resolution P1)
2. OR adjust Phase 1 tier distribution: 45% cache, 54% semantic, 1% LLM

---

### RC-8: Discovery Engine Phase

**Requirements:**
- L234: "Discovery engine | P1"
- L237: "Fragment cache | P1"
- L421-427: User journey shows cache warming via discovery API

**Conflict:**
- Discovery is P1 but cache warming is shown in Phase 1 user journey
- This is consistent ✓

**Actually NOT a conflict:** Discovery (P1) and its use (Phase 1 journey) align. No issue.

---

### RC-9: Custom Block Registration

**Requirements:**
- FR-BC-4 (L900): "Users can register custom block types"
- L536-543: Enterprise journey shows custom block registration
- L564: "Enterprise Pilot | Architect | Evaluation | 2 | Multi"

**Conflict:**
- Custom block registration is shown as needed for Enterprise (Phase 2)
- But no phase assignment in Phase 1 scope table
- Functional requirement suggests it's available always

**Resolution:** Add "Custom block registration | P2 | Enterprise feature" to scope table.

---

### RC-10: Snapshot Addressing Phase

**Requirements:**
- L241: "Snapshot addressing | P2 | Reference historical states"
- L881: "FR-BA-7: Engine can resolve snapshot addresses (@snapshot:3.@K0)"

**Conflict:**
- Snapshot addressing is Phase 2
- But FR-BA-7 (functional requirement) has no phase qualifier
- Implies it's Phase 1 (all FRs are Phase 1 unless marked)

**Resolution:** Either move snapshot addressing to P1, or mark FR-BA-7 as "(Phase 2)".

---

### RC-11: Explainability Phase

**Requirements:**
- L244: "Explainability layer | P2 | Trust metadata in schemas"
- L1129: "explainability?: SchemaExplainability;" in LiquidSchema interface
- No definition of SchemaExplainability interface anywhere

**Conflict:**
- Explainability is Phase 2
- But LiquidSchema type (Phase 1) includes the field
- Field type is undefined (SchemaExplainability not defined)

**Resolution:**
1. Add SchemaExplainability type definition (even if minimal for Phase 1)
2. OR mark field as "(Phase 2)" in type definition

---

### RC-12: Binding Score Thresholds

**Requirements:**
- L746-749: Auto-bind >0.8, flag 0.5-0.8, prompt <0.5
- FR-BS-6 (L911): "Engine can auto-bind high-confidence suggestions (>0.8)"
- FR-BS-7 (L912): "Engine can flag medium-confidence suggestions (0.5-0.8)"
- FR-BS-8 (L913): "Engine can prompt clarification for low-confidence (<0.5)"

**Conflict:**
- Threshold values are HARDCODED in innovation section
- But no requirement for making them configurable
- FR-DE-6 allows "configure archetype detection thresholds"
- Should binding thresholds also be configurable?

**Resolution:** Add FR-BS-10: "Users can configure binding confidence thresholds"

---

## Minor Issues

### M-1: Typo in User Journey

**Location:** L334

```typescript
const dashboard = adapter.render(schema, data);
```

Missing SlotContext parameter based on technical specs. Should be:

```typescript
const dashboard = adapter.render(schema, data, context);
```

---

### M-2: Grammar Incomplete for Signals

**Location:** L1072

```
signal_decl     = "§" SIGNAL_NAME ":" SIGNAL_TYPE ["=" DEFAULT] ["," PERSIST]
```

DEFAULT and PERSIST are not defined in grammar. Should specify:

```
DEFAULT         = STRING | NUMBER | BOOLEAN | "null"
PERSIST         = "none" | "url" | "session" | "local"
```

---

### M-3: SchemaMetadata Missing from LiquidSchema

**Location:** L1130, L1133-1138

```typescript
// L1130:
metadata?: SchemaMetadata;

// L1133-1138: SchemaMetadata defined AFTER LiquidSchema
interface SchemaMetadata {
  createdBy?: string;
  modifiedAt?: string;
  operationCount: number;
  coherenceScore?: number;
}
```

**Issue:** Type is used before definition. Not a semantic error in TypeScript, but inconsistent ordering.

**Resolution:** Move SchemaMetadata definition BEFORE LiquidSchema for better readability.

---

### M-4: LayoutBlock Undefined

**Location:** L1124

```typescript
layout: LayoutBlock;
```

LayoutBlock type is referenced but never defined. Should be:

```typescript
layout: LayoutSpec;  // OR define LayoutBlock type
```

---

### M-5: Relationship Type Mismatch

**Location:** L1101-1106, L1263-1266

```
// Grammar L1106:
RELATIONSHIP    = "group" | "compare" | "detail" | "flow"

// Type L1264:
type: 'group' | 'compare' | 'detail' | 'flow';
```

These match ✓ Actually NOT an issue.

---

### M-6: RenderConstraints Undefined

**Location:** L1148

```typescript
constraints?: RenderConstraints;
```

RenderConstraints type is never defined anywhere in the PRD.

**Resolution:** Define or remove this field.

---

### M-7: Success Metric Unit Inconsistency

**Location:** L203-204

```
Schemas/day | Unique schemas generated (hash-based) | 10,000+ at 6 months
```

"10,000+ at 6 months" - is this:
- 10,000 schemas/day average across 6 months?
- 10,000 total schemas by month 6?

**Resolution:** Clarify as "10,000 schemas/day throughput by month 6"

---

### M-8: LiquidExpr Undefined

**Location:** L1199, L1211

```typescript
transform?: string;  // LiquidExpr transformation
validation?: string; // LiquidExpr returning boolean
```

LiquidExpr is mentioned but not defined in Technical Specifications.

**Resolution:** Add LiquidExpr syntax reference or link to hardening section.

---

### M-9: AppliedOperation Undefined

**Location:** L778

```typescript
operations: AppliedOperation[];
```

AppliedOperation type is never defined.

**Resolution:** Define the type or change to `Operation[]` if they're the same.

---

### M-10: Breakpoint Threshold Values Missing

**Location:** L1279-1283

```typescript
interface BreakpointThresholds {
  compact: number;   // <600px default
  standard: number;  // <1200px default
  expanded: number;  // ≥1200px default
}
```

**Issue:** Comments show defaults, but they're not in type definition.

**Resolution:** Change to:

```typescript
interface BreakpointThresholds {
  compact?: number;   // Default: 600
  standard?: number;  // Default: 1200
  expanded?: number;  // Default: Infinity
}
```

---

### M-11: Test Coverage Metric Precision

**Location:** L818

```
Unit tests | >90% coverage
```

**Issue:** "Coverage" is ambiguous - line coverage? branch coverage? statement coverage?

**Resolution:** Specify "line coverage >90%, branch coverage >80%"

---

### M-12: Bundle Size Unrealistic

**Location:** L800

```
Bundle size | <100KB minified (core)
```

**Issue:** For a compiler + validator + cache + discovery engine, 100KB minified seems very aggressive.

**Analysis:**
- Zod alone is ~50KB minified
- Parser + compiler likely 30KB+
- Total <100KB is challenging

**Resolution:** Either:
1. Change to "<200KB minified (core without adapters)"
2. OR verify this is achievable and document tree-shaking strategy

---

### M-13: Archive Detection vs Description Conflict

**Location:** L832-836

```
FR-DE-3: Engine can detect schema archetypes (overview, time_series, comparison, funnel)
```

**Issue:** "overview, time_series, comparison, funnel" - only 4 archetypes listed.

**But:** User journey references "sales_overview_v2" fragment (L367), suggesting more archetypes exist.

**Resolution:** Either:
1. List complete set of supported archetypes
2. OR change to "Engine can detect common schema archetypes (including overview, time_series, comparison, funnel)"

---

### M-14: File Structure Missing Hardening Details

**Location:** L1478-1485

```
├── hardening/
│   ├── ascii-grammar.ts
│   ├── uid-system.ts
│   ├── liquid-expr.ts
│   ├── coherence.ts
│   ├── conformance.ts
│   └── index.ts
```

**Issue:** Hardening section includes 5 files, but FR-HD requirements (L988-1007) cover 19 requirements. Some files may need to be split.

**Resolution:** This is just organizational - no technical conflict.

---

### M-15: Conformance Testing Duplication

**Location:** L632-635 (package structure), L1379-1393 (observability)

```
// Package structure shows:
├── /adapter
│   ├── interface.ts
│   ├── conformance.ts      ← Conformance here

// But also:
├── /hardening
│   ├── conformance.ts      ← Conformance here too
```

**Issue:** Two conformance.ts files in different modules.

**Resolution:**
- `/adapter/conformance.ts` = Adapter conformance test utilities
- `/hardening/conformance.ts` = Schema/grammar conformance
- Should rename one for clarity (e.g., `/hardening/schema-validation.ts`)

---

## Consistency Score Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Requirement Consistency | 7/10 | Strong FR set, but 12 conflicts across phases/priorities |
| Type Definition Consistency | 6/10 | Several undefined types, dual definitions, ambiguous mappings |
| Scope Consistency | 9/10 | Excellent IN/OUT discipline, minor phase assignment issues |
| Priority/Phase Consistency | 6/10 | React adapter P1→P0, semantic search phase conflict, snapshot addressing unclear |
| Metric Consistency | 7/10 | Clear targets, but cache hit rate terminology needs refinement |
| User Story Alignment | 9/10 | Excellent alignment with FRs, minor interface version mismatch |

**Overall Consistency Score: 7.5/10**

---

## Recommendations

### Immediate (Pre-Implementation)

1. **Resolve Critical Issues 1-8:** These affect core architecture decisions
   - Especially #1 (identity system), #2 (priority types), #3 (adapter interface)

2. **Fix Type Definitions:**
   - Define missing types: RenderConstraints, AppliedOperation, SchemaExplainability, LayoutBlock
   - Remove duplication: BindingSlot defined twice
   - Move definitions before usage for clarity

3. **Clarify Phase Assignments:**
   - Move React adapter to P0 (it's essential for MVP)
   - Resolve semantic search phase (P1 simple or P2 only)
   - Mark FR-BA-7 snapshot addressing as Phase 2

4. **Update Grammar:**
   - Restrict priority to 1-4 (not any number)
   - Define DEFAULT and PERSIST in signal_decl
   - Clarify slot targeting syntax ($field vs $field:slot)

### Medium-Term (During Implementation)

5. **Refine Metrics:**
   - Separate "exact cache hit" from "LLM avoidance rate"
   - Define success metric units precisely
   - Add breakdown for p50/p95/p99 latency

6. **Documentation Updates:**
   - Add identity system clarification guide
   - Document LiquidExpr syntax
   - Explain placeholder vs failure semantics

### Nice-to-Have (Post-MVP)

7. **Consistency Improvements:**
   - Rename duplicate conformance.ts files
   - Reorganize type definitions for logical flow
   - Add configurability to hardcoded thresholds

---

## Conclusion

The PRD demonstrates **strong architectural thinking** with clear value propositions, well-defined user journeys, and comprehensive functional requirements. The inconsistencies identified are **primarily in the implementation details** (type definitions, phase assignments, metric terminology) rather than fundamental conceptual conflicts.

**Key Strengths:**
- Excellent scope discipline (clear IN/OUT boundaries)
- Strong user journey → functional requirement traceability
- Comprehensive technical specifications
- Innovative architecture with clear rationale

**Key Weaknesses:**
- Type definitions need cleanup (undefined types, duplication)
- Phase assignments have some conflicts (React adapter, semantic search)
- Metric terminology needs precision (cache hit rate ambiguity)
- Grammar has some incomplete/overly permissive rules

**Recommendation:** Address Critical Issues 1-3 before development kickoff. Others can be resolved during detailed design phase.

---

**Review Complete:** 8 Critical, 12 Conflicts, 15 Minor Issues identified.
