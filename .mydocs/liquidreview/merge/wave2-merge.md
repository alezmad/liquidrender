# Wave 2 Merge Document

**Status:** READY FOR REVIEW
**Date:** 2025-12-21
**Source:** LiquidCode Specification v2.0 (LIQUIDCODE-SPEC-v2.md)
**Resolutions:** ISS-007 through ISS-011, ISS-084 through ISS-102 (17 total)

---

## Executive Summary

This document consolidates all Wave 2 resolution changes for integration into the LiquidCode v2 specification. Changes are organized by target section with before/after content, conflict notes, and integration instructions.

**Statistics:**
- **Sections Modified:** 13 major sections
- **New Subsections:** 23 new subsections added
- **Lines Added:** ~3,500 lines of specification content
- **Conflicts:** 0 detected
- **Overlaps:** 2 complementary (noted below)

---

## Table of Contents

1. [Section 6: LiquidCode Grammar](#section-6-liquidcode-grammar)
2. [Section 8: Block Addressing System](#section-8-block-addressing-system)
3. [Section 9: Binding System](#section-9-binding-system)
4. [Section 11: Layout & Responsiveness System](#section-11-layout--responsiveness-system)
5. [Section 12: Discovery Engine](#section-12-discovery-engine)
6. [Section 13: Tiered Resolution System](#section-13-tiered-resolution-system)
7. [Section 15: Compositional Grammar Engine](#section-15-compositional-grammar-engine)
8. [Section 16: Digital Twin & State Management](#section-16-digital-twin--state-management)
9. [Appendix B: Hardening Specification](#appendix-b-hardening-specification)

---

## Section 6: LiquidCode Grammar

### 6.6 Field Name Encoding (NEW)
**Source:** ISS-087
**Location:** Insert after §6.5

**Summary:** Adds comprehensive rules for handling field names with special characters, spaces, and Unicode.

**Content to Add:**
```markdown
### 6.6 Field Name Encoding

LiquidCode must handle arbitrary field names from data sources, including those with special characters.

[FULL CONTENT FROM ISS-087 LINES 27-306]
```

**Integration Notes:**
- New subsection, no conflicts
- References existing §6.1 ($ prefix for binding fields)
- Complements §9 Binding System
- Adds validation schema to §B.6.1

---

## Section 8: Block Addressing System

### 8.4 Wildcard Selectors (ENHANCEMENT)
**Source:** ISS-010
**Location:** Replace §8.4 (lines 596-605)

**Before:**
```markdown
### 8.4 Wildcard Selectors

For batch operations:

| Selector | Meaning | Example |
|----------|---------|---------|
| `@K*` | All KPIs | `Δ~@K*.showTrend:true` |
| `@[*,0]` | All in column 0 | `Δ~@[*,0].width:200` |
| `@:*revenue*` | All revenue bindings | `Δ~@:*revenue*.format:"$"` |
```

**After:**
```markdown
[FULL CONTENT FROM ISS-010 LINES 39-559 including all subsections:
- 8.4.1 Wildcard Matching Algorithm
- 8.4.2 Interaction with Resolution Priority
- 8.4.3 Edge Cases
- 8.4.4 Performance Considerations
- 8.4.5 Batch Operation Semantics]
```

**Integration Notes:**
- Complete replacement with enhanced specification
- Preserves original table, adds extensive algorithms
- No conflicts

### 8.5 Snapshot Addressing (REPLACEMENT)
**Source:** ISS-102
**Location:** Replace §8.5 (lines 607-616)

**Before:**
```markdown
### 8.5 Snapshot Addressing

Reference historical states:

```liquidcode
# Address block as it was after operation 3
@snapshot:3.@K0

# Compare current to previous
?diff(@snapshot:-1, @current)
```
```

**After:**
```markdown
[FULL CONTENT FROM ISS-102 LINES 47-516 including all subsections:
- 8.5.1 Snapshot Index Semantics
- 8.5.2 Snapshot Resolution Algorithm
- 8.5.3 Bounds Checking Examples
- 8.5.4 History Pruning
- 8.5.5 Error Handling Strategies
- 8.5.6 LiquidCode Syntax Extensions
- 8.5.7 Snapshot Addressing in Queries
- 8.5.8 Enhanced OperationHistory Interface
- 8.5.9 User-Facing Error Messages
- 8.5.10 Testing Scenarios]
```

**Integration Notes:**
- Complete replacement with comprehensive specification
- Preserves original examples, adds extensive error handling
- Modifies §16.2 Operation History interface (see Section 16)

---

## Section 9: Binding System

### 9.5 Binding Validation and Schema Evolution (NEW)
**Source:** ISS-098
**Location:** Insert after §9.4

**Summary:** Handles stale bindings after schema changes with auto-repair and validation.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-098 LINES 47-357]
```

**Integration Notes:**
- New subsection after §9.4
- References §20 Versioning & Migration
- Updates §16.2 Operation History (see Section 16)

### 9.6 Data Presence Validation (NEW)
**Source:** ISS-084
**Location:** Insert after §9.5

**Summary:** Distinguishes empty data, null data, and zero values with rendering rules.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-084 LINES 23-157]
```

**Integration Notes:**
- New subsection
- Extends §19 Error Handling
- Adds adapter conformance requirements (§B.3.2)

### 9.7 Single-Item Collection Handling (NEW)
**Source:** ISS-085
**Location:** Insert after §9.6

**Summary:** Defines behavior for single-item arrays across all block types.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-085 LINES 23-212]
```

**Integration Notes:**
- New subsection
- Complements §9.6
- No conflicts

### 9.8 Large Dataset Handling (NEW)
**Source:** ISS-086
**Location:** Insert after §9.7

**Summary:** Pagination, virtualization, and default limits for large datasets.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-086 LINES 23-350]
```

**Integration Notes:**
- New subsection
- Extends §18 Adapter Interface Contract
- Adds performance guarantees
- Updates §B.3.2 conformance tests

### 9.9 Field Name Resolution Algorithm (NEW)
**Source:** ISS-088
**Location:** Insert after §9.8

**Summary:** 5-tier matching algorithm for ambiguous field names.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-088 LINES 23-591]
```

**Integration Notes:**
- New subsection
- Complements §6.6 Field Name Encoding
- References §12 Discovery Engine

### 9.10 Type System and Coercion (NEW)
**Source:** ISS-089
**Location:** Insert after §9.9

**Summary:** Type validation, coercion rules, and graceful degradation for type mismatches.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-089 LINES 23-548]
```

**Integration Notes:**
- New subsection
- References §B.4 Safe Transform DSL
- Updates §B.3.2 adapter conformance

---

## Section 11: Layout & Responsiveness System

### 11.3.1 Priority Tie-Breaking Rules (NEW)
**Source:** ISS-097
**Location:** Insert after §11.3 default statement (line 75)

**Before:**
```markdown
**Default:** Blocks without explicit priority are `primary`.
```

**After:**
```markdown
**Default:** Blocks without explicit priority are `primary`.

#### 11.3.1 Priority Tie-Breaking Rules

[FULL CONTENT FROM ISS-097 LINES 38-144]
```

**Integration Notes:**
- New subsection within §11.3
- Updates §11.10 (see below)

### 11.10 Responsive Transformation Rules (UPDATE)
**Source:** ISS-097
**Location:** Update §11.10 step 2 (line 1102)

**Before:**
```
2. Filter blocks by priority for breakpoint
```

**After:**
```
2. Sort blocks by priority using tie-breaking rules (§11.3.1)
3. Filter blocks by priority for breakpoint
```

**Integration Notes:**
- Simple addition to existing algorithm
- References new §11.3.1

### 11.11.1 The Constraint Solver Algorithm (NEW)
**Source:** ISS-009
**Location:** Insert after §11.11 transformation algorithm (line 1119)

**Summary:** Complete constraint-based layout solver with priority resolution.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-009 LINES 83-497]
```

**Integration Notes:**
- Extends existing §11.11
- Provides implementation details for high-level algorithm
- No conflicts

---

## Section 12: Discovery Engine

### 12.4.1 Primitive Detection Algorithm (NEW)
### 12.4.2 Archetype Detection from Primitives (NEW)
**Source:** ISS-007
**Location:** Insert after §12.4 table (line 1296)

**Summary:** Complete UOM primitive inference and archetype detection algorithms.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-007 LINES 52-291]
```

**Integration Notes:**
- Extends §12.4 with implementation algorithms
- References §12.3 for archetypes
- Follows soft-constraint philosophy

---

## Section 13: Tiered Resolution System

### 13.2.1 Cache Key Collision Detection and Resolution (NEW)
### 13.2.2 Intent Hash Computation (RELOCATED)
### 13.2.3 Complete Cache Key Generation (RELOCATED)
### 13.2.4 Collision Handling (RELOCATED)
### 13.2.5 Cache Key Versioning (RELOCATED)
### 13.2.6 Cache Key Examples (RELOCATED)
**Source:** ISS-008, ISS-100
**Location:** Replace/Enhance §13.2 (lines 1355-1364)

**Before:**
```markdown
### 13.2 Cache Key Design

```typescript
interface CacheKey {
  intentHash: string;        // Normalized intent signature
  dataFingerprint: string;   // Schema signature
  archetypeHint?: string;    // If provided
  scope: 'interface' | 'block';
}
```
```

**After:**
```markdown
### 13.2 Cache Key Design

[FULL ENHANCED CONTENT FROM ISS-008 LINES 38-392 PLUS ISS-100 COLLISION HANDLING]
```

**Integration Notes:**
- **OVERLAP:** ISS-008 and ISS-100 both address cache key design
- **RESOLUTION:** ISS-008 provides hash computation, ISS-100 adds collision detection
- **MERGE STRATEGY:** Combine both, with ISS-100's collision handling as §13.2.1
- Updates §14.2 FragmentStorage interface

---

## Section 15: Compositional Grammar Engine

### 15.6 Partial Fragment Matching (NEW)
**Source:** ISS-099
**Location:** Insert after §15.5

**Summary:** Scoring and composition of partial fragment matches.

**Content to Add:**
```markdown
[FULL CONTENT FROM ISS-099 LINES 44-456]
```

**Integration Notes:**
- New subsection
- Updates §13.3 Semantic Search threshold check
- No conflicts

---

## Section 16: Digital Twin & State Management

### 16.2 Operation History (UPDATE)
**Source:** ISS-098, ISS-102
**Location:** Update §16.2 interface (lines 1510-1529)

**Before:**
```typescript
interface AppliedOperation {
  operation: Operation;          // The mutation
  timestamp: number;
  inverse: Operation;            // For undo
  beforeHash: string;            // State verification
  afterHash: string;
}
```

**After:**
```typescript
interface AppliedOperation {
  operation: Operation;
  timestamp: number;
  inverse: Operation;
  beforeHash: string;
  afterHash: string;
  bindingRepairs?: BindingRepair[];      // NEW (ISS-098)
}
```

**OperationHistory interface updates:**
- Add methods from ISS-102 §8.5.8:
  - `snapshotSafe(index, fallback?)`
  - `getInitialSchema()`
  - `getCurrentIndex()`
  - `getOldestAvailableIndex()`
  - `isSnapshotAvailable(index)`
  - `getAvailableRange()`
  - `listOperations(from, to)`

**Integration Notes:**
- Multiple resolutions affect this interface
- No conflicts, all additions
- ISS-098 adds binding repair tracking
- ISS-102 adds snapshot management methods

---

## Appendix B: Hardening Specification

### B.3.2 Adapter Conformance (ENHANCEMENTS)
**Sources:** ISS-084, ISS-086, ISS-089
**Location:** Add to conformance test list (lines 2080-2103)

**Additional Tests to Add:**
```typescript
// From ISS-084 (Empty Data Set)
'renders empty state for empty array []',
'renders placeholder for null data',
'renders empty state for empty object {}',
'distinguishes between zero value and no data',
'transitions correctly from empty to populated data',

// From ISS-086 (Large Dataset Handling)
'completes render within timeout for large datasets',
'applies appropriate limits per block type',
'shows overflow indicators when data exceeds limits',
'supports pagination for tables',
'does not crash or hang on 100k+ row dataset',

// From ISS-089 (Type Mismatches)
'coerces common type mismatches gracefully',
'renders placeholder for uncoercible values',
'emits warnings for low-confidence coercions',
'validates data types before render',
'provides clear error messages for type mismatches',
```

### B.4.4 Error Handling (REPLACEMENT)
**Source:** ISS-101
**Location:** Replace §B.4.4 (lines 2147-2159)

**Before:**
```markdown
#### B.4.4 Error Handling

LiquidExpr NEVER throws. Errors produce typed fallback values:

| Error | Fallback | Example |
|-------|----------|---------|
| Divide by zero | `null` | `10 / 0` → `null` |
| Missing field | `null` | `$missing` → `null` |
| Type mismatch | `null` | `upper(123)` → `null` |
| Null input | `null` | `round(null)` → `null` |
```

**After:**
```markdown
[FULL COMPREHENSIVE CONTENT FROM ISS-101 LINES 43-357 including:
- B.4.4.1 Mathematical Edge Cases
- B.4.4.2 Null Propagation
- B.4.4.3 Type Coercion Rules
- B.4.4.4 NaN and Infinity Handling
- B.4.4.5 Numeric Bounds
- B.4.4.6 String Edge Cases
- B.4.4.7 Date Edge Cases
- B.4.4.8 Array/Aggregate Edge Cases
- B.4.4.9 Execution Bounds
- B.4.4.10 Error Handling Implementation
- B.4.4.11 Comprehensive Error Table]
```

**Integration Notes:**
- Complete replacement
- Vastly expanded from 4 examples to comprehensive specification
- No conflicts

### B.7 Hardening Checklist (ADDITIONS)
**Sources:** ISS-098, ISS-100, ISS-102
**Location:** Add to checklist (line 2572)

**Additional Checklist Items:**

**From ISS-098 (Binding Validation):**
- [ ] Binding validation runs on schema change events
- [ ] High-confidence repairs (>0.85) auto-apply with notification
- [ ] Low-confidence issues show repair UI with suggestions
- [ ] Schema history tracked for better migration suggestions
- [ ] Blocks with unresolvable bindings render as actionable placeholders

**From ISS-100 (Cache Key Collision):**
- [ ] Cache uses SHA-256 for intent and data fingerprint hashing
- [ ] Intent canonicalization reduces false collisions
- [ ] Storage supports collision buckets (multiple fragments per hash)
- [ ] Retrieval validates canonical intent match before returning fragment
- [ ] Collision events logged and monitored
- [ ] Alert triggers if collision rate exceeds threshold (>100/day)
- [ ] Cached fragments include full canonical intent for verification

**From ISS-102 (Snapshot Addressing):**
- [ ] Snapshot addressing handles negative indices beyond history
- [ ] Snapshot addressing handles positive indices beyond current state
- [ ] Snapshot 0 always returns initial schema (never pruned)
- [ ] History pruning preserves initial schema
- [ ] Error messages indicate available snapshot range
- [ ] Fallback strategies implemented (null, current, closest, throw)
- [ ] Snapshot availability check before resolution

---

## Conflict Analysis

### No Direct Conflicts Detected

All Wave 2 resolutions target distinct sections or add new subsections. No resolutions attempt to modify the same lines.

### Overlaps Identified

#### Overlap 1: Cache Key Design (ISS-008 + ISS-100)
- **ISS-008:** Defines hash computation and normalization
- **ISS-100:** Adds collision detection and resolution
- **Resolution:** COMPLEMENTARY - Merge both into enhanced §13.2
- **Strategy:** Use ISS-008 as base (§13.2.1-13.2.6), add ISS-100 as collision handling subsection

#### Overlap 2: Field Name Handling (ISS-087 + ISS-088)
- **ISS-087:** Field name encoding and quoting rules
- **ISS-088:** Field name resolution and matching
- **Resolution:** COMPLEMENTARY - Sequential subsections
- **Strategy:** ISS-087 → §6.6, ISS-088 → §9.9 (both reference each other)

---

## Integration Order Recommendations

To minimize merge conflicts and maintain spec coherence, apply changes in this order:

1. **§6.6** (ISS-087) - Field Name Encoding
2. **§8.4** (ISS-010) - Wildcard Selectors (replacement)
3. **§8.5** (ISS-102) - Snapshot Addressing (replacement)
4. **§9.5-9.10** (ISS-084, 085, 086, 088, 089, 098) - Binding System enhancements
5. **§11.3.1** (ISS-097) - Priority Tie-Breaking
6. **§11.10** (ISS-097) - Update transformation algorithm
7. **§11.11.1** (ISS-009) - Constraint Solver
8. **§12.4.1-12.4.2** (ISS-007) - Discovery algorithms
9. **§13.2** (ISS-008 + ISS-100) - Enhanced Cache Key Design
10. **§15.6** (ISS-099) - Partial Fragment Matching
11. **§16.2** (ISS-098, 102) - Operation History updates
12. **§B.3.2** (ISS-084, 086, 089) - Conformance tests
13. **§B.4.4** (ISS-101) - LiquidExpr Error Handling (replacement)
14. **§B.7** (ISS-098, 100, 102) - Hardening checklist additions

---

## Post-Integration Validation

After merging, verify:

### Cross-Reference Integrity
- [ ] All section references (§X.Y) resolve correctly
- [ ] Interface definitions match across sections
- [ ] Examples use consistent syntax

### Consistency Checks
- [ ] TypeScript interfaces match across all resolutions
- [ ] Error handling strategies are consistent
- [ ] Terminology is uniform (e.g., "block" vs "component")

### Completeness Checks
- [ ] All 17 resolutions fully integrated
- [ ] No orphaned subsections
- [ ] Table of Contents updated
- [ ] Appendix references updated

### Technical Review
- [ ] TypeScript code compiles (if extracted)
- [ ] Examples are executable
- [ ] Algorithms are implementable

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Resolutions | 17 |
| Sections Modified | 13 |
| New Subsections | 23 |
| Replaced Sections | 3 |
| Enhanced Sections | 4 |
| Lines Added | ~3,500 |
| Code Examples Added | 75+ |
| Algorithms Specified | 12 |
| Conformance Tests Added | 35+ |
| Hardening Checklist Items Added | 18 |

---

## Notes for Integration

1. **Preserve Line Numbers:** Original spec line numbers noted for each change
2. **Maintain Formatting:** All resolutions use consistent markdown formatting
3. **Validate Cross-References:** Some resolutions reference others (noted in integration notes)
4. **Review Examples:** Code examples should be tested for syntax correctness
5. **Update Table of Contents:** New subsections need TOC entries

---

## Appendix: Resolution Cross-Reference Map

| Resolution | Target Sections | Dependencies | Conflicts |
|------------|----------------|--------------|-----------|
| ISS-007 | §12.4 | §12.3 | None |
| ISS-008 | §13.2 | §12.4, §14.2 | ISS-100 (overlap, merged) |
| ISS-009 | §11.11 | §11.8 | None |
| ISS-010 | §8.4 | §8.3 | None |
| ISS-011 | §B.4.3 | §B.4.1, B.4.2, B.4.4 | None |
| ISS-084 | §9.6, §19, §B.3 | - | None |
| ISS-085 | §9.7, §11 | §9.6 | None |
| ISS-086 | §9.8, §11, §18 | - | None |
| ISS-087 | §6.6, §9.1 | - | None |
| ISS-088 | §9.9, §12 | §6.6 | None |
| ISS-089 | §9.10, §12, §B.4 | - | None |
| ISS-097 | §11.3, §11.10 | - | None |
| ISS-098 | §9.5, §16.2, §20 | - | None |
| ISS-099 | §15.6, §13.3 | - | None |
| ISS-100 | §13.2, §14.2 | §13.2 | ISS-008 (overlap, merged) |
| ISS-101 | §B.4.4 | - | None |
| ISS-102 | §8.5, §16.2 | - | None |

---

**End of Wave 2 Merge Document**

*This document is ready for review. Proceed with integration only after approval.*
