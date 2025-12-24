# LiquidCode Compiler - Consolidated Bug Report

**Campaign:** Adversarial Realism Testing v1
**Date:** 2024-12-24
**Agents:** 5 (Analytics, E-commerce, Admin, Wizard, Monitor)
**Total Scenarios:** 20

---

## Executive Summary

| Domain | Scenarios | Passed | Failed | Pass Rate |
|--------|-----------|--------|--------|-----------|
| Analytics | 4 | 0 | 4 | 0% |
| E-commerce | 4 | 2 | 2 | 50% |
| Admin | 4 | 2 | 2 | 50% |
| Wizard | 4 | 0 | 4 | 0% |
| Monitor | 4 | 4 | 0 | 100% |
| **Total** | **20** | **8** | **12** | **40%** |

---

## Confirmed Compiler Bugs (5)

### BUG-001: Label Preservation Failure (CRITICAL)

**Frequency:** 4/5 domains (Analytics, E-commerce, Admin, Wizard)
**Impact:** High - affects any component with field binding + explicit label

**Description:**
When a block has both a field binding (`:fieldName`) and an explicit label (`"Custom Label"`), the explicit label is lost during `schema → AST` conversion.

**Evidence:**
```liquid
// Original
In :name "Full Name"

// After roundtrip
In :name  // Label becomes auto-generated "Name"
```

**Root Cause:** `ui-emitter.ts:616-622`
```typescript
// Current (BUGGY):
if (block.label && !block.binding) {
  astBlock.bindings.push({ kind: 'literal', value: block.label });
}
```

The condition `!block.binding` skips labels when a field binding exists.

**Fix Strategy:**
Compare explicit label against auto-generated label; preserve if different.

---

### BUG-002: Missing `Ta` Type Code (CRITICAL)

**Frequency:** 1/5 domains (Wizard)
**Impact:** Medium - breaks textarea components

**Description:**
`Ta` (textarea) is missing from `UI_TYPE_CODES`, causing it to fallback to `Cn` (container).

**Evidence:**
```liquid
// Original
Ta :description

// After roundtrip
Cn :description  // Type changed!
```

**Root Cause:** `constants.ts` - `UI_TYPE_CODES` is missing `Ta: 'textarea'`

**Fix:** Add `Ta: 'textarea'` to `UI_TYPE_CODES`

---

### BUG-003: Conditional Color Truncation (MAJOR)

**Frequency:** 2/5 domains (E-commerce, Wizard)
**Impact:** Medium - multi-condition colors only preserve first condition

**Description:**
Scanner stops at comma in conditional color expressions.

**Evidence:**
```liquid
// Original
#?=delivered:green,=shipped:blue,=pending:yellow

// After roundtrip
#?=delivered:green  // Rest truncated
```

**Root Cause:** `ui-scanner.ts:315` - color scanning stops at comma
```typescript
while (!this.isAtEnd() && !' \t\n,[]'.includes(this.peek()))
```

**Fix Strategy:**
When scanning conditional color (`#?`), allow commas within the expression.

---

### BUG-004: Conditionals Not Emitted (MAJOR)

**Frequency:** 3/5 domains (Analytics, Admin, Wizard)
**Impact:** High - all conditional blocks lose their conditions

**Description:**
Condition modifiers (`?@signal=value`) are stored in schema but not emitted during DSL generation.

**Evidence:**
```liquid
// Original
0 ?@tab=0 [Kp :revenue]

// After roundtrip
0 [Kp :revenue]  // Condition lost!
```

**Root Cause:** `ui-emitter.ts` - `emitBlockDSL()` doesn't emit `block.condition`

**Fix Strategy:**
Add condition emission before block content.

---

### BUG-005: Multiple Signal Receivers Overwritten (MAJOR)

**Frequency:** 2/5 domains (Analytics, Admin)
**Impact:** Medium - only last receive signal preserved

**Description:**
When a component has multiple `<signal` receivers, only the last one is kept.

**Evidence:**
```liquid
// Original
Tb :results <search <role <dateRange

// After roundtrip
Tb :results <dateRange  // Only last receiver
```

**Root Cause:** Schema stores `receive?: string` (singular), not `string[]`

**Fix Strategy:**
Update schema type and extraction logic to support arrays.

---

## Test Errors (Not Compiler Bugs)

### TEST-001: Wrong Conditional Syntax

**Description:** Some test scenarios used `?signal=value:` instead of `?@signal=value`
**Domains Affected:** Admin, Wizard
**Resolution:** Spec ambiguity - document correct syntax

### TEST-002: Invalid Function-Like Syntax (Monitor)

**Description:** Initial monitor tests used `text("Hello") { font: bold }` which doesn't exist in spec
**Resolution:** Corrected to `Tx "Hello" %bold`

---

## Fix Priority Matrix

| Bug ID | Severity | Frequency | Effort | Priority |
|--------|----------|-----------|--------|----------|
| BUG-001 | CRITICAL | 4/5 | Medium | **P0** |
| BUG-002 | CRITICAL | 1/5 | Low | **P0** |
| BUG-004 | MAJOR | 3/5 | Medium | **P1** |
| BUG-005 | MAJOR | 2/5 | Medium | **P1** |
| BUG-003 | MAJOR | 2/5 | Medium | **P2** |

---

## Implementation Plan

### Phase 1: Critical Fixes (BUG-001, BUG-002)

1. **BUG-002: Add missing `Ta` type code**
   - File: `constants.ts`
   - Change: Add `Ta: 'textarea'` to `UI_TYPE_CODES`

2. **BUG-001: Fix label preservation**
   - File: `ui-emitter.ts`
   - Function: `liquidSchemaToAST` / `convertBlock`
   - Add: Helper function `fieldToLabel()`
   - Change: Compare labels, emit literal binding when explicit

### Phase 2: Major Fixes (BUG-004, BUG-005)

3. **BUG-004: Emit conditionals**
   - File: `ui-emitter.ts`
   - Function: `emitBlockDSL()`
   - Add: Emit `?@signal=value` prefix when `block.condition` exists

4. **BUG-005: Multiple receive signals**
   - File: `ui-emitter.ts`
   - Types: Update `Block.signals.receive` to support arrays
   - Functions: Update extraction and emission logic

### Phase 3: Enhancement (BUG-003)

5. **BUG-003: Conditional color parsing**
   - File: `ui-scanner.ts`
   - Function: `color()`
   - Change: Allow commas in `#?` expressions

---

## Verification Tests

After fixes, all 20 scenarios should pass roundtrip equivalence.

Run: `pnpm test` to verify.
