# LiquidCode v2 Review Methodology

**Version:** 1.0
**Created:** 2025-12-21
**Purpose:** Structured methodology for parallel review and resolution of specification issues

---

## Review Dimensions Matrix

| Dimension                          | Purpose                                  | Bell Labs Lens      | Skunk Works Lens        | Apple Lens           | Agent Focus                                                                 |
| ---------------------------------- | ---------------------------------------- | ------------------- | ----------------------- | -------------------- | --------------------------------------------------------------------------- |
| **Implementation Gaps**            | What's specified but unimplementable?    | Theory-practice gap | Engineering feasibility | Shipping reality     | LLM prompts, parser, binding inference, cache, signals, adapters, coherence |
| **SPEC Internal Consistency**      | Does SPEC contradict itself?             | Mathematical rigor  | System integrity        | Coherent experience  | Types, syntax, semantics, numerics, cross-refs, normative language          |
| **PRD Internal Consistency**       | Does PRD contradict itself?              | Mathematical rigor  | System integrity        | Coherent experience  | Requirements, scope, priorities, metrics, user stories                      |
| **RATIONALE Internal Consistency** | Does RATIONALE contradict itself?        | Mathematical rigor  | System integrity        | Coherent experience  | Arguments, history, principles, quantitative claims                         |
| **Cross-Document Consistency**     | Do docs contradict each other?           | Unified theory      | Interface contracts     | One story            | SPEC↔PRD, SPEC↔RATIONALE, PRD↔RATIONALE, interfaces, terminology            |
| **Simplification**                 | Can we remove without losing capability? | Occam's razor       | Weight reduction        | Restraint            | YAGNI, one way, defaults, inline concepts, reduce surface                   |
| **Architectural Soundness**        | Is the overall approach defensible?      | First principles    | Asymmetric advantage    | Integration          | Problem fit, primitives, moat, failure modes, scalability, alternatives     |
| **Edge Cases & Failure Modes**     | What breaks at boundaries?               | Stress testing      | Mission-critical        | Graceful degradation | Input, LLM output, schema, binding, signal, layout, cache, adapter          |
| **Extensibility & Evolution**      | Can this grow without breaking?          | Future-proofing     | Modularity              | Platform thinking    | Block/signal/slot extension, versioning, adapters, LLM evolution            |
| **Developer Experience**           | Is this implementable by mortals?        | Usability           | Practical engineering   | Joy of use           | Learning curve, debugging, testing, integration, documentation              |

---

## Phase 1: Parallel Review (Complete)

Each dimension is reviewed by an independent agent producing a standalone document:

```
.mydocs/liquidreview/
├── 01-implementation-gaps.md
├── 02-spec-internal-consistency.md
├── 03-prd-internal-consistency.md
├── 04-rationale-internal-consistency.md
├── 05-cross-document-consistency.md
├── 06-simplification-opportunities.md
├── 07-architectural-soundness.md
├── 08-edge-cases-failure-modes.md
├── 09-extensibility-evolution.md
├── 10-developer-experience.md
└── AGGREGATED-REVIEW.md
```

---

## Phase 2: Issue Classification & Dependency Mapping

### 2.1 Issue Taxonomy

Each issue is classified by:

| Attribute | Values | Purpose |
|-----------|--------|---------|
| **Severity** | `critical` / `significant` / `minor` | Prioritization |
| **Type** | `gap` / `inconsistency` / `simplification` / `edge-case` / `dx` | Resolution approach |
| **Target** | `SPEC` / `PRD` / `RATIONALE` / `multi` | Which doc(s) to modify |
| **Section** | e.g., `§9.3`, `B.5.2` | Precise location |
| **Effort** | `S` / `M` / `L` / `XL` | T-shirt sizing |

### 2.2 Interference Graph

Issues that modify the same sections CANNOT be resolved in parallel.

```
Issue A ──[modifies §9.3]──┐
                          ├── CONFLICT: Sequential only
Issue B ──[modifies §9.3]──┘

Issue C ──[modifies §11.2]──┐
                            ├── SAFE: Parallel OK
Issue D ──[modifies B.5.1]──┘
```

**Interference Rule:** Two issues INTERFERE if:
1. They modify the same file section (±20 lines)
2. One adds content that the other deletes
3. They modify the same interface definition
4. They affect the same cross-reference chain

### 2.3 Resolution Clusters

Group non-interfering issues into parallelizable clusters:

```
Cluster 1 (Parallel):     Cluster 2 (Parallel):     Cluster 3 (Sequential):
├── Issue A (§6.1)        ├── Issue X (§11.2)       ├── Issue M (§9.3)
├── Issue B (§12.4)       ├── Issue Y (B.3.2)       ├── Issue N (§9.3)
└── Issue C (B.6.1)       └── Issue Z (PRD §4)      └── Issue O (§9.4)
```

---

## Phase 3: Concurrent Resolution Workflow

### 3.1 Resolution Agent Protocol

Each resolution agent receives:

```markdown
## Resolution Task: [Issue ID]

**Issue:** [Title]
**Severity:** [critical/significant/minor]
**Target:** [Document path]
**Section:** [Exact location]
**Current State:** [What exists now - verbatim quote]
**Required Change:** [Specific modification]
**Acceptance Criteria:** [How to verify fix is correct]

### Constraints
- DO NOT modify sections outside [start_line] to [end_line]
- DO NOT change interface signatures that other issues depend on
- PRESERVE existing cross-references
- MAINTAIN normative language consistency (MUST/SHOULD/MAY)

### Deliverable
Write the replacement content to:
`.mydocs/liquidreview/resolutions/[issue-id].md`
```

### 3.2 Resolution File Format

```markdown
# Resolution: [Issue ID]

## Original (Lines X-Y)
```[original content]```

## Replacement
```[new content]```

## Verification
- [ ] Criterion 1
- [ ] Criterion 2

## Side Effects
- None / [List any unintended impacts]
```

### 3.3 Merge Protocol

After all parallel resolutions complete:

1. **Collect** all resolution files
2. **Sort** by target file, then by line number (ascending)
3. **Apply** in reverse line order (bottom-up to preserve line numbers)
4. **Verify** cross-references still valid
5. **Run** consistency check on modified documents

---

## Phase 4: Validation

### 4.1 Post-Resolution Checks

| Check | Tool | Pass Criteria |
|-------|------|---------------|
| Interface consistency | Grep + Compare | All interfaces match across docs |
| Cross-reference validity | Link checker | All §X.Y references resolve |
| Type definition completeness | AST parse | All types defined before use |
| Example validity | Syntax check | All examples parse correctly |

### 4.2 Regression Review

Run abbreviated version of Phase 1 reviews on modified docs to ensure no new issues introduced.

---

## Execution Commands

### Generate Sprint Backlog
```bash
# Extract all issues into structured format
python3 scripts/extract-issues.py AGGREGATED-REVIEW.md > sprint-backlog.json
```

### Launch Parallel Resolution
```bash
# For each cluster, launch agents
claude-agent resolve --cluster 1 --parallel
claude-agent resolve --cluster 2 --parallel
# Wait for cluster 1,2 then:
claude-agent resolve --cluster 3 --sequential
```

### Apply Resolutions
```bash
# Merge all resolution files
python3 scripts/apply-resolutions.py resolutions/ --target-docs
```

---

## Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Total issues identified | - | 95 |
| Critical issues | <10 | TBD |
| Resolution parallelism | >60% | TBD |
| Time to resolution | <4h | TBD |
| Regression rate | 0% | TBD |
