# Resolution Agent Prompts

**Purpose:** Ready-to-execute prompts for parallel resolution agents
**Usage:** Copy each batch prompt to launch agents

---

## Wave 1: Critical Issues

### Batch 1A: Grammar Section (Sequential - 4 issues)

```
You are resolving LiquidCode v2 specification issues in the Grammar section.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`

**Issues to Resolve (in order):**

1. **ISS-002: Parser/Compiler - Grammar Ambiguities**
   - Section: §6 (LiquidCode Grammar), §17, Appendix B.1
   - Problem: Grammar is EBNF-style but not formal; tokenization undefined
   - Action: Add formal PEG grammar, tokenization rules, precedence rules
   - Output: `ISS-002.md`

2. **ISS-019: Breakpoint Threshold Inconsistency**
   - Section: §6.2 vs §A.2
   - Problem: Threshold values differ between sections
   - Action: Align to single authoritative source
   - Output: `ISS-019.md`

3. **ISS-027: Normative Language Inconsistency**
   - Section: §6.3 vs §11.7
   - Problem: MUST/SHOULD/MAY usage inconsistent
   - Action: Standardize normative language per RFC 2119
   - Output: `ISS-027.md`

4. **ISS-028: Grid Layout Syntax Ambiguity**
   - Section: §6
   - Problem: Multiple sections cite different token counts
   - Action: Clarify grid syntax with examples
   - Output: `ISS-028.md`

**Output Format for Each Issue:**
Use the resolution template from EXECUTION-PIPELINE.md

**Constraints:**
- Process issues sequentially (high interference risk)
- Read full section context before modifying
- Preserve all cross-references
- Maintain normative language consistency
```

---

### Batch 1B: Binding/Signal Section (Sequential - 4 issues)

```
You are resolving LiquidCode v2 specification issues in the Binding/Signal section.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`

**Issues to Resolve (in order):**

1. **ISS-003: Binding Inference - ScoringSignal Implementation**
   - Section: §9.3 (Binding Suggestion System)
   - Problem: No algorithm for semantic matching, type inference, weight combination
   - Action: Add implementation algorithms for each ScoringSignal source
   - Output: `ISS-003.md`

2. **ISS-005: Signal Runtime - Persistence Implementation**
   - Section: §10.2, §18.3
   - Problem: URL/session/local persistence undefined
   - Action: Specify serialization format, URL encoding, restoration order
   - Output: `ISS-005.md`

3. **ISS-031: Binding Required vs Optional Fields**
   - Section: §10.2 vs §10.6
   - Problem: Field requirements ambiguous
   - Action: Clarify required vs optional with defaults
   - Output: `ISS-031.md`

4. **ISS-036: Migration Interface Incomplete**
   - Section: §9.3, B.5.4
   - Problem: Migration interface missing methods
   - Action: Complete interface with all required methods
   - Output: `ISS-036.md`

**Output Format:** Use resolution template
**Constraints:** Sequential processing, preserve cross-references
```

---

### Batch 1C: Layout/Cache Section (Parallel - 3 issues)

```
You are resolving LiquidCode v2 specification issues in the Layout/Cache section.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`
**Strategy:** These issues are in isolated sections - resolve in parallel

**Your Assigned Issue:** [ISS-004 | ISS-023 | ISS-024]

---

**ISS-004: Fragment Composition Algorithm**
- Section: §15 (Compositional Grammar Engine)
- Problem: Composition algorithm undefined
- Action: Define fragment selection, compatibility checking, merging algorithm
- Output: `ISS-004.md`

---

**ISS-023: Operation Symbol ASCII Mapping**
- Section: §14.1
- Problem: ASCII equivalents for Unicode operators incomplete
- Action: Complete mapping table for all operators
- Output: `ISS-023.md`

---

**ISS-024: Fragment Type Definition Missing**
- Section: §3.2, B.6.1
- Problem: Fragment interface referenced but not defined
- Action: Add complete Fragment interface definition
- Output: `ISS-024.md`

---

**Output Format:** Use resolution template
**Constraints:** You may work in parallel with other agents
```

---

### Batch 1D: Appendix Section (Parallel - 3 issues)

```
You are resolving LiquidCode v2 specification issues in the Appendix section.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`
**Strategy:** These issues are in isolated sections - resolve in parallel

**Your Assigned Issue:** [ISS-006 | ISS-037 | ISS-038]

---

**ISS-006: Coherence Gate Validation Algorithm**
- Section: Appendix B.5
- Problem: Validation algorithm has pseudocode but no actual logic
- Action: Specify complete algorithm with type compatibility rules
- Output: `ISS-006.md`

---

**ISS-037: Coherence Threshold Values**
- Section: B.6.1
- Problem: Threshold constants undefined
- Action: Define all threshold values with justification
- Output: `ISS-037.md`

---

**ISS-038: RenderConstraints Type Undefined**
- Section: §6.3, §12.3
- Problem: RenderConstraints referenced but not defined
- Action: Add complete interface definition
- Output: `ISS-038.md`

---

**Output Format:** Use resolution template
```

---

### Batch 1E: Consistency Issues (Parallel - 5 issues)

```
You are resolving LiquidCode v2 consistency issues.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`
**Strategy:** Parallel - each issue in different section

**Your Assigned Issue:** [ISS-016 | ISS-017 | ISS-018 | ISS-020 | ISS-021]

---

**ISS-016: Block Interface Definition Mismatch**
- Location A: §10.3 (line ~787)
- Location B: §B.4 (line ~2107)
- Problem: Block interface fields differ
- Action: Align to normative B.6 definition
- Output: `ISS-016.md`

---

**ISS-017: Signal Transform Type Conflict**
- Location A: §8.3 (line ~588)
- Location B: §B.2.4 (line ~2005)
- Problem: Transform type is `string` vs `TransformSpec`
- Action: Unify to single type
- Output: `ISS-017.md`

---

**ISS-018: Address Resolution Priority Order**
- Location A: §11.11 (line ~1097)
- Location B: §B.6.1 (line ~24)
- Problem: Priority order differs
- Action: Standardize priority sequence
- Output: `ISS-018.md`

---

**ISS-020: Block Type Code Conflicts**
- Location A: §11.10 (line ~1067)
- Location B: §B.6.1
- Problem: Block type codes inconsistent
- Action: Consolidate to single source
- Output: `ISS-020.md`

---

**ISS-021: SlotContext Field Type Mismatch**
- Location A: §4.3 (line ~215)
- Location B: §B.6.1
- Problem: SlotContext fields differ
- Action: Align to normative definition
- Output: `ISS-021.md`

---

**Output Format:** Use resolution template
**For each:** Identify authoritative source, update non-authoritative to match
```

---

### Batch 1F: Analysis Issues (Parallel - 5 issues)

```
You are resolving LiquidCode v2 analysis-identified issues.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`

**Your Assigned Issue:** [ISS-048 | ISS-049 | ISS-050 | ISS-051 | ISS-052]

---

**ISS-048: Three Primitives Claim vs. Four Primitives Listed**
- Problem: Spec claims three primitives but lists four in some places
- Action: Verify and correct primitive count consistently
- Output: `ISS-048.md`

---

**ISS-049: Soft Constraints Philosophy vs. Confidence Thresholds**
- Problem: Soft constraint philosophy conflicts with hard thresholds
- Action: Reconcile philosophy with implementation
- Output: `ISS-049.md`

---

**ISS-050: Position-Derived Identity Stability**
- Problem: Position-based addressing may be unstable
- Action: Document stability guarantees and edge cases
- Output: `ISS-050.md`

---

**ISS-051: Latency Claims - LLM Generation Time**
- Problem: Latency claims may be unrealistic
- Action: Verify or qualify latency targets
- Output: `ISS-051.md`

---

**ISS-052: Compression Ratio - 114x vs. Token Count Math**
- Problem: Compression ratio doesn't match token counts
- Action: Recalculate and correct
- Output: `ISS-052.md`

---

**Output Format:** Use resolution template
```

---

### Batch 1G: Edge Cases (Parallel - 4 issues)

```
You are resolving LiquidCode v2 edge case issues.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`

**Your Assigned Issue:** [ISS-076 | ISS-077 | ISS-078 | ISS-079]

---

**ISS-076: Signal Circular Dependency Deadlock**
- Problem: No detection/prevention for circular signals
- Action: Add cycle detection algorithm
- Output: `ISS-076.md`

---

**ISS-077: Layout Constraint Solver Non-Termination**
- Problem: Solver may not terminate with conflicting constraints
- Action: Add termination guarantee with max iterations
- Output: `ISS-077.md`

---

**ISS-078: UID Collision in High-Volume Generation**
- Problem: UID collision probability undefined
- Action: Document collision probability and handling
- Output: `ISS-078.md`

---

**ISS-079: LiquidExpr Resource Exhaustion**
- Problem: No limits on expression evaluation
- Action: Add resource limits and timeouts
- Output: `ISS-079.md`

---

**Output Format:** Use resolution template
```

---

### Batch 1H: Documentation (Parallel - 4 issues)

```
You are resolving LiquidCode v2 documentation gap issues.

**Target Document:** `.mydocs/liquidcode/LIQUIDCODE-SPEC-v2.md`
**Output Directory:** `.mydocs/liquidreview/resolutions/wave1/`

**Your Assigned Issue:** [ISS-136 | ISS-137 | ISS-138 | ISS-139]

---

**ISS-136: Add Implementation Guide Document**
- Problem: No implementation guide exists
- Action: Create outline for implementation guide appendix
- Output: `ISS-136.md`

---

**ISS-137: Provide Reference Implementation**
- Problem: No reference implementation specified
- Action: Define reference implementation requirements
- Output: `ISS-137.md`

---

**ISS-138: Build Interactive Playground**
- Problem: No playground specification
- Action: Define playground requirements
- Output: `ISS-138.md`

---

**ISS-139: Create Comprehensive Test Suite**
- Problem: Test suite incomplete
- Action: Define test case categories and coverage requirements
- Output: `ISS-139.md`

---

**Output Format:** Use resolution template
```

---

## Progress Report Template

After each batch, generate:

```markdown
# Batch [ID] Progress Report

**Wave:** [1/2/3]
**Batch:** [1A/1B/etc]
**Timestamp:** [ISO]
**Duration:** [minutes]

## Results

| ID | Title | Status | Confidence |
|----|-------|--------|------------|
| ISS-XXX | [Title] | ✅/⚠️/❌ | HIGH/MED/LOW |

## Summary
- **Attempted:** X
- **Resolved:** Y
- **Partial:** Z
- **Blocked:** W

## Blockers (if any)
[List blockers and recommended actions]

## Ready for Next Batch
[YES/NO]
```

---

## Execution Order

1. **Batch 1A** (Sequential) → Wait for completion
2. **Batch 1B** (Sequential) → Wait for completion
3. **Batches 1C, 1D, 1E, 1F, 1G, 1H** (All Parallel) → Wait for all
4. **Merge Wave 1** → Validate
5. **Wave 2** (All Parallel)
6. **Merge Wave 2** → Validate
7. **Wave 3** (All Parallel)
8. **Final Merge** → Regression Review
