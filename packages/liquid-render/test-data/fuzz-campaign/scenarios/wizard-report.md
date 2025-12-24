# Wizard/Survey Scenario Testing Report

**Domain:** Multi-step forms and wizards
**Date:** 2024-12-24
**Test Method:** Parse → Roundtrip validation

---

## Executive Summary

Tested 4 realistic wizard/survey scenarios. **All 4 scenarios revealed issues**, primarily:

1. **COMPILER_BUG**: Missing `Ta` (textarea) type code in UI constants - causes `Ta` → `Cn` conversion
2. **TEST_ERROR**: Conditional syntax incorrect - spec requires `?@signal=value`, tests used `?signal=value`
3. **COMPILER_BUG**: Conditionals not emitted in roundtrip - condition metadata lost
4. **SPEC_ISSUE**: Complex conditional color syntax not preserved in roundtrip
5. **COMPILER_ISSUE**: Custom labels lost when auto-labels are similar

---

## Scenario 1: Step Indicator with Progress Bar

**File:** `wizard-1.lc`

### LiquidCode
```liquid
@step
Bt "Step 1" >step=0, Bt "Step 2" >step=1, Bt "Step 3" >step=2
?step=0: Fm [
  Hd "Personal Info"
  In :name "Full Name"
  In :email "Email Address"
  Bt "Next" >step=1
]
?step=1: Fm [
  Hd "Contact Details"
  In :phone "Phone Number"
  In :address "Street Address"
  Bt "Back" >step=0, Bt "Next" >step=2
]
?step=2: Fm [
  Hd "Review & Submit"
  Tx "Please review your information"
  Bt "Back" >step=1, Bt "Submit" !submit
]
```

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ❌ FAILED

### Failures

#### 1. Custom labels lost
```
layer0[3][1].label mismatch: Full Name vs Name
layer0[3][2].label mismatch: Email Address vs Email
layer0[4][1].label mismatch: Phone Number vs Phone
layer0[4][2].label mismatch: Street Address vs Address
```

**Analysis:**
- Original: `In :name "Full Name"` (custom label)
- Auto-label for `:name` would be "Name" (from field name)
- Roundtrip produces: `In :name` (auto-label applied, custom label lost)

**Classification:** COMPILER_ISSUE
**Root Cause:** Emitter doesn't distinguish between explicit labels and auto-labels
- When label matches auto-label, it's omitted (optimization)
- But custom labels that differ from auto-label are also being lost
- Emitter needs to check if label was explicitly set vs auto-generated

**Evidence:**
```typescript
// ui-emitter.ts line 465
const typeCode = UI_TYPE_TO_CODE[block.type] || block.typeCode || 'Cn';
parts.push(typeCode);
// Missing: emit label if it differs from auto-label
```

**Suggested Fix:**
```typescript
// After emitting type and bindings
if (block.label && block.label !== autoGenerateLabel(block.binding)) {
  parts.push(`"${block.label}"`);
}
```

#### 2. Conditionals not preserved

**Analysis:**
- Original: `?step=0: Fm [...]` (conditional block)
- Roundtrip: `Fm [...]` (condition lost)

**Classification:** TEST_ERROR + COMPILER_BUG

**Test Error:**
- Spec requires: `?@step=0:` (with `@`)
- Test used: `?step=0:` (without `@`)
- Scanner only recognizes `?@signal=value` as CONDITION token
- Without `@`, scanner tokenizes as: `CONDITION:?` + `IDENTIFIER:step` + `EXPR:=0:`

**Compiler Bug:**
- Even if correctly parsed, conditions are stored but NOT emitted
- `condition` field exists in Block schema but emitter doesn't output it
- Roundtrip always loses conditional information

**Evidence:**
```typescript
// ui-emitter.ts - emitBlockDSL method
// No code to emit condition prefix ?@signal=value:
```

---

## Scenario 2: Conditional Questions (Dynamic Form)

**File:** `wizard-2.lc`

### LiquidCode
```liquid
@hasPartner @employmentType
Hd "Application Form"
Fm [
  In :fullName "Full Name"
  Se :maritalStatus
  ?maritalStatus=married: In :partnerName "Partner's Name"
  Se :employment ["employed", "self-employed", "unemployed"]
  ?employment=employed: In :employer "Employer Name"
  ?employment=employed: In :jobTitle "Job Title"
  ?employment=self-employed: In :businessName "Business Name"
  Bt "Submit Application" !submit
]
```

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ❌ FAILED

### Failures

#### 1. Custom label variations lost
```
layer0[1][2].label mismatch: Partner's Name vs Partner Name
layer0[1][4].label mismatch: Employer Name vs Employer
```

**Analysis:** Same as Scenario 1 - custom labels being replaced with auto-labels

**Classification:** COMPILER_ISSUE (duplicate of Scenario 1)

#### 2. Conditionals lost

**Analysis:** Same as Scenario 1
- All `?maritalStatus=...` and `?employment=...` conditions lost in roundtrip
- **Test Error:** Missing `@` prefix
- **Compiler Bug:** Conditions not emitted even if parsed

---

## Scenario 3: Multi-page Form with Tabs

**File:** `wizard-3.lc`

### LiquidCode
```liquid
@activeTab
Cn [
  Cn ^row [
    Bt "Basic" >activeTab=0
    Bt "Advanced" >activeTab=1
    Bt "Review" >activeTab=2
  ]
  ?activeTab=0: Fm [
    Hd "Basic Settings"
    In :projectName
    Ta :description
    Se :category ["web", "mobile", "desktop"]
  ]
  ?activeTab=1: Fm [
    Hd "Advanced Options"
    Sw :enableNotifications
    Sw :autoSave
    Rg :priority
  ]
  ?activeTab=2: Cn [
    Hd "Review Your Settings"
    Kp :projectName
    Tx :.description
    Bt "Save All" !submit
  ]
]
```

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ❌ FAILED

### Failures

#### 1. Type code `Ta` not recognized
```
layer0[1][2].type mismatch: ta vs container
```

**Analysis:**
- Original: `Ta :description` (textarea)
- Parsed as: `type: "ta"` (lowercased because `Ta` not in `UI_TYPE_CODES`)
- Emitted as: `Cn :description` (fallback to container because no reverse mapping)

**Classification:** COMPILER_BUG
**Root Cause:** Type code `Ta` missing from `UI_TYPE_CODES` constant

**Evidence:**
```typescript
// constants.ts line 23-85
export const UI_TYPE_CODES: Record<string, string> = {
  // ...
  // Ta: 'textarea', // MISSING!
  Tx: 'text',
  // ...
};
```

`Ta` exists in `QUESTION_TYPE_CODES` (line 167) but not in `UI_TYPE_CODES`.

**Why this matters:**
- According to spec §12, `Ta` is a shared type between LiquidCode and LiquidSurvey
- `Ta` should map to `textarea` for UI components
- Without the mapping:
  1. Parser: `Ta` → `ta` (fallback to lowercase)
  2. Emitter: `UI_TYPE_TO_CODE['ta']` → `undefined` → `'Cn'` (fallback)

**Suggested Fix:**
```typescript
// Add to constants.ts UI_TYPE_CODES
Ta: 'textarea',
```

---

## Scenario 4: Review & Submit with Conditional Color

**File:** `wizard-4.lc`

### LiquidCode
```liquid
@page
Pg :. #?page=0:primary,page=1:blue,page=2:green
Fm [
  ?page=0: Cn [
    Hd "Step 1: User Details"
    In :firstName
    In :lastName
    In :email @email
    Bt "Continue" >page=1
  ]
  ?page=1: Cn [
    Hd "Step 2: Preferences"
    Ck :newsletter "Subscribe to newsletter"
    Se :language ["en", "es", "fr"]
    Se :timezone
    Cn ^row [
      Bt "Back" >page=0
      Bt "Next" >page=2
    ]
  ]
  ?page=2: Cn [
    Hd "Step 3: Summary"
    Tx "Name:" :.firstName :.lastName
    Tx "Email:" :.email
    Tx "Language:" :.language
    Cn ^row [
      Bt "Back" >page=1
      Bt "Submit" !submit #green
    ]
  ]
]
```

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ❌ FAILED

### Failures

#### 1. Custom checkbox label lost
```
layer0[1][1][1].label mismatch: Subscribe to newsletter vs Newsletter
```

**Analysis:** Same as Scenario 1 - custom label replaced with auto-label

**Classification:** COMPILER_ISSUE (duplicate)

#### 2. Complex conditional color lost

**Original:**
```liquid
Pg :. #?page=0:primary,page=1:blue,page=2:green
```

**Roundtrip:**
```liquid
Pg :. #?page=0:primary
```

**Analysis:**
- Multi-condition color expression partially lost
- Only first condition preserved: `?page=0:primary`
- Lost: `,page=1:blue,page=2:green`

**Classification:** SPEC_AMBIGUITY + COMPILER_BUG

**Spec Ambiguity:**
- Spec §4.3 shows: `#?>=80:green,<80:red` (comparison operators)
- Test used: `#?page=0:primary,page=1:blue,page=2:green` (signal equality with commas)
- Unclear if commas create multiple conditions OR if this is even valid syntax
- Scanner stops at first comma (line 315: `while (!this.isAtEnd() && !' \t\n,[]'.includes(this.peek()))`)

**Compiler Bug:**
- Even if syntax is valid, scanner stops at comma
- Only captures: `#?page=0:primary`
- Remaining `,page=1:blue,page=2:green` becomes separate tokens

**Suggested Fix:**
Either:
1. Clarify spec: conditional colors cannot use commas (use separate modifiers)
2. Update scanner to handle comma-separated conditions in color expressions

---

## Summary of Findings

### Compiler Bugs (3)

1. **Missing `Ta` type code**
   - Location: `src/compiler/constants.ts`
   - Impact: `Ta` (textarea) becomes `Cn` (container) in roundtrip
   - Fix: Add `Ta: 'textarea'` to `UI_TYPE_CODES`

2. **Conditionals not emitted**
   - Location: `src/compiler/ui-emitter.ts` - `emitBlockDSL()`
   - Impact: All `?@signal=value:` conditions lost in roundtrip
   - Fix: Emit condition prefix when `block.condition` exists

3. **Custom labels not preserved**
   - Location: `src/compiler/ui-emitter.ts` - label emission logic
   - Impact: Explicit labels that differ from auto-labels are lost
   - Fix: Only skip label when it matches auto-generated label

### Test Errors (1)

4. **Incorrect conditional syntax**
   - Used: `?signal=value:`
   - Correct: `?@signal=value:`
   - All 4 test scenarios used wrong syntax (missing `@`)

### Spec Issues (1)

5. **Conditional color with commas unclear**
   - Example: `#?page=0:primary,page=1:blue,page=2:green`
   - Not clearly documented in spec
   - Scanner stops at comma, loses remaining conditions

---

## Recommendations

### Critical (must fix)
1. **Add `Ta` to UI_TYPE_CODES** - breaks textarea components
2. **Implement conditional emission** - fundamental feature missing
3. **Fix label preservation logic** - loses user intent

### High Priority
4. **Update test scenarios** - use correct `?@signal=value:` syntax
5. **Document conditional color syntax** - clarify comma usage in spec

### Medium Priority
6. **Add roundtrip tests to CI** - catch these issues automatically
7. **Improve error messages** - scanner could warn about `?signal` without `@`

---

## Test Scenario Corrections

All 4 scenarios need to replace `?signal=value:` with `?@signal=value:`:

**Before:**
```liquid
?step=0: Fm [...]
?maritalStatus=married: In :partnerName
?activeTab=0: Fm [...]
?page=0: Cn [...]
```

**After:**
```liquid
?@step=0: Fm [...]
?@maritalStatus=married: In :partnerName
?@activeTab=0: Fm [...]
?@page=0: Cn [...]
```

Additionally, remove complex conditional color until spec is clarified:
```liquid
# Before
Pg :. #?page=0:primary,page=1:blue,page=2:green

# After (multiple modifiers or simplify)
Pg :. #primary
```

---

## Conclusion

The LiquidCode compiler successfully parses realistic wizard/survey scenarios but has **3 critical bugs** preventing lossless roundtrip:

1. Missing textarea type code
2. Conditions parsed but not emitted
3. Custom labels incorrectly replaced with auto-labels

These are all **fixable compiler bugs**, not fundamental design issues. The DSL syntax is sound for wizard/survey use cases once these bugs are addressed.
