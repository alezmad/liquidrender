# PATCH 006: Conformance Testing Tiers Clarification

**Date:** 2025-12-22
**Status:** PROPOSED
**Target:** LIQUIDCODE-SPEC v2.1
**Issue:** Conflicting test counts across sections (41 vs 30 vs 250+)

---

## Problem Statement

The current specification contains ambiguous conformance testing tiers:

1. **Section 18.4** defines 41 tests across 10 categories for adapter certification
2. **Appendix B.3.3** lists 30 tests as "minimum for adapter certification"
3. **Enhanced Test Suite Summary** mentions 250+ tests across broader implementation scope
4. **Table of Contents** and **Introduction** reference "41 certification tests"

This creates confusion about:
- Which tests are **required** vs **recommended** for certification?
- What is the relationship between the 30-test minimum and the 41-test suite?
- Are the 250+ tests a separate comprehensive suite or a superset?

---

## Solution: Three-Tier Conformance Model

This patch establishes **three distinct tiers** of conformance testing:

### Tier 1: Core Certification Suite (30 tests)
**Purpose:** Minimum viable adapter certification for production use
**Scope:** Adapter interface compliance (§18.1)
**Location:** Appendix B.3.3
**Status:** REQUIRED for certification badge

### Tier 2: Enhanced Certification Suite (41 tests)
**Purpose:** Full adapter certification with recommended features
**Scope:** Adapter + layout + streaming + accessibility
**Location:** Section 18.4
**Status:** REQUIRED (29 tests) + RECOMMENDED (12 tests)

### Tier 3: Comprehensive Implementation Suite (250+ tests)
**Purpose:** Full LiquidCode stack validation
**Scope:** Parser, compiler, addressing, runtime, adapters, integration
**Location:** Appendix B.3.3 (table summary)
**Status:** Reference implementation validation

---

## Proposed Changes

### Change 1: Update §18.4 Introduction

**Current:**
```markdown
### 18.4 Enhanced Conformance Testing (ISS-012)

Adapters MUST pass conformance tests to be certified for production use.
```

**Proposed:**
```markdown
### 18.4 Enhanced Conformance Testing (ISS-012)

Adapters MUST pass conformance tests to be certified for production use.

**Conformance Tiers:**
- **Tier 1 (Core):** 30 tests - Minimum adapter certification (§B.3.3)
- **Tier 2 (Enhanced):** 41 tests - Full adapter certification (this section)
- **Tier 3 (Comprehensive):** 250+ tests - Implementation validation (§B.3.3)

This section defines the **Tier 2 Enhanced Certification Suite** with versioned test IDs.
```

---

### Change 2: Add §18.4.13 - Certification Tiers Table

**Insert after §18.4.12 Test Execution:**

```markdown
#### 18.4.13 Certification Tiers

The LiquidCode conformance model defines three certification levels:

| Tier | Name | Tests | Scope | Badge | Purpose |
|------|------|-------|-------|-------|---------|
| **1** | Core | 30 | Adapter interface | 🟢 CERTIFIED | Production-ready adapter |
| **2** | Enhanced | 41 | Adapter + features | 🔵 ENHANCED | Full-featured adapter |
| **3** | Comprehensive | 250+ | Full stack | 🟣 REFERENCE | Implementation validation |

**Test ID Prefixes:**
- **LC-CERT-xxx:** Tier 2 Enhanced tests (this section)
- **LC-CORE-xxx:** Tier 1 Core tests (§B.3.3)
- **LC-IMPL-xxx:** Tier 3 Implementation tests (§B.3.3)

**Certification Levels:**

**Tier 1 (Core Certification):**
- ✅ Pass all 30 core tests from §B.3.3
- ✅ Implement full `LiquidAdapter` interface
- ✅ Support all 13 core block types
- Badge: "LiquidCode Core Certified"

**Tier 2 (Enhanced Certification):**
- ✅ Pass all 30 core tests (Tier 1)
- ✅ Pass 29/29 REQUIRED tests from §18.4
- ✅ Pass ≥10/12 RECOMMENDED tests from §18.4
- Badge: "LiquidCode Enhanced Certified"

**Tier 3 (Comprehensive Validation):**
- ✅ Pass all Tier 1 + Tier 2 tests
- ✅ Pass 250+ implementation tests
- ✅ Reference implementation quality
- Badge: "LiquidCode Reference Implementation"

**Typical Paths:**
- **Production adapter:** Target Tier 1, pursue Tier 2
- **Reference implementation:** Target Tier 3
- **Community adapter:** Start with Tier 1 subset (13 block rendering tests)
```

---

### Change 3: Rename Test IDs to Versioned Format

**Current format:** `CONF-R-001`, `CONF-E-002`, etc.

**Proposed format:** `LC-CERT-001` through `LC-CERT-041`

**Mapping:**

```typescript
// Block Rendering Tests (5 tests)
LC-CERT-001 = CONF-R-001  // renders all core block types
LC-CERT-002 = CONF-R-002  // renders placeholder for unknown block type
LC-CERT-003 = CONF-R-003  // renders empty state for null data
LC-CERT-004 = CONF-R-004  // renders empty state for mismatched data shape
LC-CERT-005 = CONF-R-005  // block count matches schema

// Error Handling Tests (5 tests)
LC-CERT-006 = CONF-E-001  // does not throw on malformed binding
LC-CERT-007 = CONF-E-002  // does not throw on invalid signal reference
LC-CERT-008 = CONF-E-003  // completes within timeout for large data
LC-CERT-009 = CONF-E-004  // recovers from partial data fetch failure
LC-CERT-010 = CONF-E-005  // provides meaningful error messages [RECOMMENDED]

// Degradation Tests (4 tests)
LC-CERT-011 = CONF-D-001  // shows placeholder with reason for unsupported features
LC-CERT-012 = CONF-D-002  // maintains layout when some blocks fail
LC-CERT-013 = CONF-D-003  // provides fallback for entire schema failure
LC-CERT-014 = CONF-D-004  // gracefully degrades on missing dependencies [RECOMMENDED]

// Signal Tests (5 tests)
LC-CERT-015 = CONF-S-001  // handles signal with no subscribers
LC-CERT-016 = CONF-S-002  // handles signal emit during render
LC-CERT-017 = CONF-S-003  // does not deadlock on circular signal reference
LC-CERT-018 = CONF-S-004  // signals propagate within 100ms
LC-CERT-019 = CONF-S-005  // persists and restores signals correctly

// Layout Tests (4 tests)
LC-CERT-020 = CONF-L-001  // respects priority-based visibility at breakpoints
LC-CERT-021 = CONF-L-002  // applies flexibility correctly
LC-CERT-022 = CONF-L-003  // maintains grid structure across breakpoints
LC-CERT-023 = CONF-L-004  // calculates layout within performance budget [RECOMMENDED]

// Data Binding Tests (4 tests)
LC-CERT-024 = CONF-B-001  // all bindings resolve to data
LC-CERT-025 = CONF-B-002  // handles transforms correctly
LC-CERT-026 = CONF-B-003  // applies aggregations correctly
LC-CERT-027 = CONF-B-004  // respects binding slot requirements

// Metadata Tests (2 tests)
LC-CERT-028 = CONF-M-001  // metadata is complete and valid
LC-CERT-029 = CONF-M-002  // supports method matches metadata

// Integration Tests (3 tests)
LC-CERT-030 = CONF-I-001  // end-to-end render with signals and bindings
LC-CERT-031 = CONF-I-002  // streaming render produces progressive output [RECOMMENDED]
LC-CERT-032 = CONF-I-003  // adapter handles schema updates without re-initialization [RECOMMENDED]

// Performance Tests (2 tests)
LC-CERT-033 = CONF-P-001  // renders within timeout for large schemas
LC-CERT-034 = CONF-P-002  // memory usage stays within bounds [RECOMMENDED]

// Accessibility Tests (2 tests)
LC-CERT-035 = CONF-A-001  // renders semantic HTML (web adapters) [RECOMMENDED]
LC-CERT-036 = CONF-A-002  // supports keyboard navigation [RECOMMENDED]

// Reserved for future tests
LC-CERT-037 through LC-CERT-041 = RESERVED
```

**Note:** Tests marked `[RECOMMENDED]` contribute to Tier 2 certification but are not blocking for Tier 1.

---

### Change 4: Update §18.4.11 Certification Criteria

**Current:**
```markdown
#### 18.4.11 Certification Criteria

An adapter is **certified** if it passes:

**Required:**
- 100% of CONF-R (Rendering) tests
- 100% of CONF-E (Error Handling) tests
- 100% of CONF-D (Degradation) tests
- 100% of CONF-S (Signal) tests
- 100% of CONF-L (Layout) tests (if `supportsLayout: true`)
- 100% of CONF-B (Binding) tests
- 100% of CONF-M (Metadata) tests
- 100% of CONF-I (Integration) tests

**Recommended:**
- ≥90% of CONF-P (Performance) tests
- ≥80% of CONF-A (Accessibility) tests

**Total:** 41 tests (29 required, 12 recommended)
```

**Proposed:**
```markdown
#### 18.4.11 Certification Criteria

**Tier 2 Enhanced Certification** requires:

**Required (29 tests):**
- LC-CERT-001 through LC-CERT-009 (excluding LC-CERT-010)
- LC-CERT-011 through LC-CERT-013 (excluding LC-CERT-014)
- LC-CERT-015 through LC-CERT-022 (excluding LC-CERT-023)
- LC-CERT-024 through LC-CERT-030
- LC-CERT-033

**Recommended (12 tests):**
- LC-CERT-010 (meaningful error messages)
- LC-CERT-014 (dependency degradation)
- LC-CERT-023 (layout performance)
- LC-CERT-031, LC-CERT-032 (streaming & schema updates)
- LC-CERT-034 (memory bounds)
- LC-CERT-035, LC-CERT-036 (accessibility)
- LC-CERT-037 through LC-CERT-041 (future)

**Certification Levels:**
- **Tier 1 Core:** Pass all 30 tests in §B.3.3
- **Tier 2 Enhanced:** Pass 29/29 REQUIRED + ≥10/12 RECOMMENDED
- **Tier 3 Comprehensive:** Pass all Tier 1 + Tier 2 + 250+ implementation tests

**Layout Exception:**
If `adapter.metadata.supportsLayout === false`, tests LC-CERT-020 through LC-CERT-023 are skipped.

**Platform Exception:**
If `adapter.metadata.platform !== 'web'`, tests LC-CERT-035 and LC-CERT-036 are skipped.
```

---

### Change 5: Clarify Appendix B.3.3

**Current:**
```markdown
#### B.3.3 Conformance Test Suite

This section defines the complete test suite for validating LiquidCode implementations. Tests are categorized by component and include acceptance criteria for each.

**Minimum tests for adapter certification:**
```

**Proposed:**
```markdown
#### B.3.3 Conformance Test Suite

This section defines the **Tier 1 Core Certification Suite** (30 tests) and references the **Tier 3 Comprehensive Implementation Suite** (250+ tests).

**Tier 1: Core Certification (30 tests, versioned as LC-CORE-xxx):**

These tests validate the minimum viable adapter for production use. All adapters seeking certification MUST pass these tests.
```

**Additionally, update the test list with versioned IDs:**

```typescript
const coreConformanceTests = [
  // Block rendering (13 tests, one per block type)
  'LC-CORE-001: renders kpi block',
  'LC-CORE-002: renders bar-chart block',
  'LC-CORE-003: renders line-chart block',
  'LC-CORE-004: renders pie-chart block',
  'LC-CORE-005: renders data-table block',
  'LC-CORE-006: renders grid layout',
  'LC-CORE-007: renders stack layout',
  'LC-CORE-008: renders text block',
  'LC-CORE-009: renders metric-group block',
  'LC-CORE-010: renders comparison block',
  'LC-CORE-011: renders date-filter block',
  'LC-CORE-012: renders select-filter block',
  'LC-CORE-013: renders search-input block',

  // Error handling (4 tests)
  'LC-CORE-014: renders placeholder for unknown block type',
  'LC-CORE-015: renders empty state for null data',
  'LC-CORE-016: renders empty state for mismatched data shape',
  'LC-CORE-017: does not throw on malformed binding',

  // Signals (4 tests)
  'LC-CORE-018: does not throw on invalid signal reference',
  'LC-CORE-019: handles signal with no subscribers',
  'LC-CORE-020: handles signal emit during render',
  'LC-CORE-021: does not deadlock on circular signal reference',

  // Performance (2 tests)
  'LC-CORE-022: completes within timeout for large data',
  'LC-CORE-023: recovers from partial data fetch failure',

  // Degradation (3 tests)
  'LC-CORE-024: shows placeholder with reason for unsupported features',
  'LC-CORE-025: maintains layout when some blocks fail',
  'LC-CORE-026: provides fallback for entire schema failure',

  // Accessibility (4 tests)
  'LC-CORE-027: all blocks have ARIA labels',
  'LC-CORE-028: keyboard navigation works',
  'LC-CORE-029: focus indicators visible',
  'LC-CORE-030: color contrast meets WCAG AA',
];

// Total: 30 core conformance tests
```

**Then add:**

```markdown
**Tier 3: Comprehensive Implementation Suite (250+ tests, versioned as LC-IMPL-xxx):**

The full implementation test suite validates all components of the LiquidCode stack. This is used for reference implementations and comprehensive validation.

**Enhanced Test Suite Summary:**

| Category | Tests | ID Range | Purpose |
|----------|-------|----------|---------|
| Parser | 50+ | LC-IMPL-001-050 | Syntax correctness |
| Compiler | 30+ | LC-IMPL-051-080 | AST → schema validity |
| Addressing | 25+ | LC-IMPL-081-105 | Resolution accuracy |
| Binding | 20+ | LC-IMPL-106-125 | Data matching |
| Signals | 25+ | LC-IMPL-126-150 | Reactivity |
| Layout | 20+ | LC-IMPL-151-170 | Constraint solving |
| State | 15+ | LC-IMPL-171-185 | History & undo |
| Adapter | 30+ | LC-IMPL-186-215 | Conformance |
| Integration | 20+ | LC-IMPL-216-235 | End-to-end |
| Performance | 15+ | LC-IMPL-236-250 | Latency & tokens |

**Total: 250+ tests**

**Note:** See ISS-139 resolution document for complete test specifications across all categories.
```

---

## Test ID Migration Guide

For existing implementations using `CONF-*` test IDs:

```typescript
// Legacy ID mapping
const LEGACY_ID_MAP = {
  'CONF-R-001': 'LC-CERT-001',
  'CONF-R-002': 'LC-CERT-002',
  'CONF-R-003': 'LC-CERT-003',
  'CONF-R-004': 'LC-CERT-004',
  'CONF-R-005': 'LC-CERT-005',
  'CONF-E-001': 'LC-CERT-006',
  'CONF-E-002': 'LC-CERT-007',
  // ... etc
};

// Support both legacy and new IDs during transition
function normalizeTestId(id: string): string {
  return LEGACY_ID_MAP[id] || id;
}
```

**Deprecation Timeline:**
- **v2.1:** Introduce LC-CERT-xxx IDs, support both formats
- **v2.2:** Mark CONF-xxx as deprecated
- **v3.0:** Remove CONF-xxx support

---

## Implementation Checklist

- [ ] Update §18.4 introduction with tier overview
- [ ] Add §18.4.13 Certification Tiers table
- [ ] Rename all test IDs from CONF-xxx to LC-CERT-xxx
- [ ] Update §18.4.11 certification criteria with tier requirements
- [ ] Update §B.3.3 with LC-CORE-xxx IDs and tier 3 table
- [ ] Update test execution examples with new IDs
- [ ] Add migration guide for legacy CONF-xxx IDs
- [ ] Update Table of Contents references
- [ ] Update Introduction summary to clarify tiers
- [ ] Create test runner that supports both ID formats during transition

---

## Benefits

1. **Clarity:** Unambiguous certification levels
2. **Versioning:** Test IDs are now versioned and trackable
3. **Flexibility:** Adapters can target different tiers based on use case
4. **Migration:** Smooth transition from CONF-xxx to LC-CERT-xxx
5. **Scope:** Clear separation between adapter tests and full implementation tests
6. **Badging:** Well-defined certification badges for different levels

---

## Example Certification Report

```typescript
interface CertificationReport {
  adapter: string;
  version: string;
  timestamp: string;
  tiers: {
    tier1: {
      passed: 30;
      total: 30;
      status: 'CERTIFIED';
    };
    tier2: {
      required: {
        passed: 29;
        total: 29;
        status: 'PASS';
      };
      recommended: {
        passed: 11;
        total: 12;
        status: 'PASS'; // ≥10/12
      };
      status: 'ENHANCED CERTIFIED';
    };
  };
  badge: 'LiquidCode Enhanced Certified';
  testResults: {
    'LC-CERT-001': 'PASS',
    'LC-CERT-002': 'PASS',
    // ...
  };
}
```

---

## Related Issues

- ISS-012: Enhanced conformance testing
- ISS-139: Complete test specifications
- ISS-137: Reference implementation requirements

---

## Approval Required

This patch requires review from:
- [ ] Specification maintainer
- [ ] Reference implementation team
- [ ] Community adapter developers

**Review by:** 2026-01-05
**Target merge:** v2.2 (pending approval)
