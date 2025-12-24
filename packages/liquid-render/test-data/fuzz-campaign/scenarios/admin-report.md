# Admin Panel Domain - LiquidCode Compiler Test Report

**Test Date:** 2024-12-24
**Test Type:** Realistic scenario testing
**Domain:** Admin panels (tables, forms, filters, settings)
**Total Scenarios:** 4
**Pass:** 2
**Fail:** 2

---

## Executive Summary

Four realistic admin panel scenarios were generated and tested against the LiquidCode compiler. Two scenarios passed completely (user table, CRUD form), while two scenarios revealed compiler bugs related to label preservation during roundtrip conversion.

### Key Findings
1. **COMPILER_BUG**: Explicit labels lost when combined with field bindings
2. **COMPILER_BUG**: Auto-generated labels differ from explicit labels in casing/formatting
3. **TEST_ERROR**: Incorrect conditional syntax used (fixed for future tests)

---

## Scenario 1: User Table with Actions

### Code
```liquid
@sel
Tb :users [:name :email :role :status :created] >sel
Bt "Edit" >/1, Bt "Delete" !delete
```

### Description
A typical admin table showing user records with columns for name, email, role, status, and creation date. Includes action buttons to edit (opens layer 1 modal) or delete users. Uses a signal (`sel`) to track selected row.

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ✅ EQUIVALENT
- **Status:** PASS

### Analysis
This scenario exercises:
- Signal declaration (`@sel`)
- Table with explicit columns
- Signal emit on table row selection
- Layer navigation (`>/1`)
- Action modifiers (`!delete`)

All features work correctly. The table columns are preserved, signals are properly handled, and the DSL roundtrips perfectly.

---

## Scenario 2: CRUD Form

### Code
```liquid
Fm [
  In :firstName :lastName :email
  Se :role [:admin :editor :viewer]
  Sw :active
  Bt "Cancel" /<, Bt "Save" !submit
]
```

### Description
A typical create/edit form for user management with text inputs using repetition shorthand, a role dropdown, an active toggle switch, and action buttons for cancel (close layer) and save (submit form).

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ✅ EQUIVALENT
- **Status:** PASS

### Analysis
This scenario exercises:
- Form container
- Input repetition shorthand (`In :firstName :lastName :email` → 3 inputs)
- Select with column syntax for options
- Switch toggle
- Layer close modifier (`/<`)
- Form submit action (`!submit`)

The repetition shorthand correctly expands to 3 separate input fields. Auto-label generation works correctly, converting `firstName` → "First Name", `lastName` → "Last Name", etc.

---

## Scenario 3: Filter Panel with Signals

### Code
```liquid
@search @role @dateRange
In :search <>search "Search users"
Se :role <>role [admin, editor, viewer]
Dt :startDate <>dateRange.start
Dt :endDate <>dateRange.end
Bt "Apply Filters" >apply
Tb :results <search <role <dateRange [:name :email :role :lastLogin]
```

### Description
A filtering interface with search input, role dropdown, date range pickers, an apply button, and a results table. Uses bidirectional signals for real-time filtering and signal propagation to update the table.

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ❌ NOT EQUIVALENT
- **Status:** FAIL

### Differences Detected
```
layer0[0].label mismatch: Search users vs Search
```

### Root Cause Analysis

**Classification:** COMPILER_BUG

**Evidence:**
1. Original DSL has explicit label: `In :search <>search "Search users"`
2. Parser correctly creates TWO bindings:
   - Field binding: `:search`
   - Literal binding: `"Search users"`
3. Emitter correctly uses literal binding as label (line 265-267 in ui-emitter.ts)
4. Schema correctly stores: `{ binding: {kind: "field", value: "search"}, label: "Search users" }`
5. **BUG**: During schema-to-AST conversion (line 616-622), the literal binding is NOT recreated

**Buggy Code:**
```typescript
// ui-emitter.ts:616-622
// Label as literal binding
if (block.label && !block.binding) {
  astBlock.bindings.push({
    kind: 'literal',
    value: block.label,
  });
}
```

**Problem:** The condition `!block.binding` means literal bindings are only created when there's NO field binding. But when we have BOTH a field binding AND an explicit label (from a literal binding), the label is lost during roundtrip.

**Fix Strategy:**
The function should check if the label differs from the auto-generated label for that field. If it does, add a literal binding:

```typescript
// Label as literal binding
if (block.label) {
  if (!block.binding) {
    // No binding - label is standalone
    astBlock.bindings.push({
      kind: 'literal',
      value: block.label,
    });
  } else if (block.binding.kind === 'field') {
    // Has field binding - check if label differs from auto-generated
    const autoLabel = fieldToLabel(block.binding.value);
    if (block.label !== autoLabel) {
      // Explicit label differs from auto-label - preserve it
      astBlock.bindings.push({
        kind: 'literal',
        value: block.label,
      });
    }
  }
}
```

**Additional Issues:**
Looking at the other receive signals on the table - the table has THREE receive signals (`<search <role <dateRange`), but only one is preserved in the schema. This suggests the compiler may have issues with multiple receive signals on a single component.

---

## Scenario 4: Settings Page with Tabs

### Original Code (INCORRECT)
```liquid
@tab
Bt "General" >tab=0, Bt "Security" >tab=1, Bt "Notifications" >tab=2
?tab=0: Fm [
  In :siteName :siteUrl
  Se :timezone [:utc :est :pst]
  Bt "Save" !submit
]
?tab=1: Fm [
  Sw :twoFactor "Enable 2FA"
  Sw :passwordExpiry "Password expiration"
  In :sessionTimeout "Session timeout (minutes)"
  Bt "Save" !submit
]
?tab=2: Fm [
  Ck :emailNotifications "Email notifications"
  Ck :slackNotifications "Slack notifications"
  In :notificationEmail :email
  Bt "Save" !submit
]
```

### Test Results
- **Parse:** ✅ SUCCESS (but ignored conditionals)
- **Roundtrip:** ❌ NOT EQUIVALENT
- **Status:** FAIL

### Differences Detected
```
layer0[4][0].label mismatch: Enable 2FA vs Two Factor
layer0[4][1].label mismatch: Password expiration vs Password Expiry
layer0[4][2].label mismatch: Session timeout (minutes) vs Session Timeout
layer0[5][0].label mismatch: Email notifications vs Email Notifications
layer0[5][1].label mismatch: Slack notifications vs Slack Notifications
```

### Root Cause Analysis

**Classification:** COMPILER_BUG (same as Scenario 3) + TEST_ERROR (incorrect syntax)

**Issue 1: Test Error - Incorrect Conditional Syntax**

I used `?tab=0:` format based on the spec's §6.2 example (lines 202-203), but the parser expects `?@tab=0` format (with `@` prefix).

**Spec ambiguity detected:**
- Lines 202-203 show: `?tab=0: content` (colon-based)
- Lines 465-467 show: `0 ?@tab=0 [content]` (container-based with `?@`)

The parser only implements the `?@signal=value` syntax (ui-parser.ts:223-224). The colon-based syntax from the LLM-optimal section is not implemented.

**Corrected Code:**
```liquid
@tab
Bt "General" >tab=0, Bt "Security" >tab=1, Bt "Notifications" >tab=2
0 ?@tab=0 [Fm [
  In :siteName :siteUrl
  Se :timezone [:utc :est :pst]
  Bt "Save" !submit
]]
0 ?@tab=1 [Fm [
  Sw :twoFactor "Enable 2FA"
  Sw :passwordExpiry "Password expiration"
  In :sessionTimeout "Session timeout (minutes)"
  Bt "Save" !submit
]]
0 ?@tab=2 [Fm [
  Ck :emailNotifications "Email notifications"
  Ck :slackNotifications "Slack notifications"
  In :notificationEmail :email
  Bt "Save" !submit
]]
```

**Issue 2: Compiler Bug - Label Preservation**

Same root cause as Scenario 3. When explicit labels are provided with field bindings, they are lost during roundtrip:
- `Sw :twoFactor "Enable 2FA"` → label becomes "Two Factor" (auto-generated)
- `Sw :passwordExpiry "Password expiration"` → label becomes "Password Expiry" (auto-generated)
- `In :sessionTimeout "Session timeout (minutes)"` → label becomes "Session Timeout" (auto-generated)

**Evidence:**
The parser correctly created TWO bindings for each component (field + literal), but the schema-to-AST converter only preserves labels when there's NO binding.

---

## Consolidated Bug Report

### BUG #1: Explicit Labels Lost During Roundtrip

**Severity:** HIGH
**Component:** ui-emitter.ts (liquidSchemaToAST function, lines 616-622)
**Affects:** Any component with both field binding and explicit label

**Description:**
When a component has both a field binding (`:fieldName`) and an explicit label (`"Custom Label"`), the explicit label is lost during schema-to-AST conversion because the converter only creates literal bindings when there's NO field binding.

**Steps to Reproduce:**
1. Parse DSL: `In :search "Search users"`
2. Convert to schema (preserves label)
3. Convert back to AST (loses literal binding)
4. Emit DSL: `In :search` (label lost, becomes auto-generated "Search")

**Expected Behavior:**
The literal binding should be preserved when the label differs from the auto-generated label.

**Suggested Fix:**
Modify `liquidSchemaToAST` function to detect when a label differs from the auto-generated version and recreate the literal binding:

```typescript
// Current (BUGGY):
if (block.label && !block.binding) {
  astBlock.bindings.push({ kind: 'literal', value: block.label });
}

// Fixed:
if (block.label) {
  if (!block.binding) {
    astBlock.bindings.push({ kind: 'literal', value: block.label });
  } else if (block.binding.kind === 'field') {
    const autoLabel = fieldToLabel(block.binding.value);
    if (block.label !== autoLabel) {
      astBlock.bindings.push({ kind: 'literal', value: block.label });
    }
  }
}
```

**Impact:**
- Scenario 3: 1 component affected (search input)
- Scenario 4: 5 components affected (switches, input, checkboxes)

---

### ISSUE #2: Spec Ambiguity - Conditional Syntax

**Severity:** MEDIUM
**Component:** Specification (LIQUID-RENDER-SPEC.md)
**Affects:** Developers writing conditional blocks

**Description:**
The spec shows two different syntaxes for conditional blocks:
1. LLM-optimal section (lines 202-203): `?tab=0: content`
2. Examples section (lines 465-467): `0 ?@tab=0 [content]`

Only the second format (with `?@` prefix) is implemented in the parser.

**Recommendation:**
1. Remove the colon-based syntax from the spec if not supported
2. OR implement the colon-based syntax in the parser (more LLM-friendly)
3. Add clear note about which syntax is preferred/supported

---

### POTENTIAL BUG #3: Multiple Receive Signals

**Severity:** UNKNOWN (needs further investigation)
**Component:** Signal handling
**Affects:** Components with multiple receive signals

**Description:**
Scenario 3 has a table with three receive signals:
```liquid
Tb :results <search <role <dateRange [:name :email :role :lastLogin]
```

The schema only preserves one receive signal (`dateRange`). This suggests the compiler may not support multiple receive signals on a single component, or the last one overwrites previous ones.

**Recommendation:**
Investigate whether multiple receive signals should be supported, and if so, fix the signal extraction logic in the emitter.

---

## Recommendations

### Immediate Actions
1. **Fix BUG #1:** Update `liquidSchemaToAST` to preserve explicit labels
2. **Clarify spec:** Document which conditional syntax is supported
3. **Investigate:** Multiple receive signals behavior

### Test Suite Improvements
1. Add explicit test cases for label preservation
2. Add test cases for components with explicit vs auto-generated labels
3. Add test cases for multiple signal receivers
4. Add test cases for both conditional syntax formats

### Future Enhancements
1. Consider implementing the more LLM-friendly colon-based conditional syntax
2. Add validation warnings when labels match auto-generated versions (unnecessary verbosity)
3. Add compiler warnings for potential spec ambiguities

---

## Test Scenarios Summary

| Scenario | Type | Parse | Roundtrip | Classification | Root Cause |
|----------|------|-------|-----------|----------------|------------|
| 1. User Table | Admin table | ✅ | ✅ | PASS | - |
| 2. CRUD Form | Form | ✅ | ✅ | PASS | - |
| 3. Filter Panel | Filters + signals | ✅ | ❌ | COMPILER_BUG | Explicit label lost (Bug #1) |
| 4. Settings Page | Tabs + forms | ⚠️ | ❌ | COMPILER_BUG + TEST_ERROR | Explicit labels lost (Bug #1) + Wrong conditional syntax |

**Overall Pass Rate:** 50% (2/4)
**Compiler Bugs Found:** 1 critical (label preservation)
**Spec Issues Found:** 1 medium (conditional syntax ambiguity)
**Test Errors:** 1 (incorrect syntax usage)

---

## Appendix: Test Files

All test files are located in:
- `/Users/agutierrez/Desktop/liquidrender/packages/liquid-render/test-data/fuzz-campaign/scenarios/`

Files:
- `admin-1.lc` - User table (PASS)
- `admin-2.lc` - CRUD form (PASS)
- `admin-3.lc` - Filter panel (FAIL - Bug #1)
- `admin-4.lc` - Settings page (FAIL - Bug #1 + wrong syntax)

---

## Conclusion

The LiquidCode compiler successfully handles basic admin panel scenarios but has a critical bug in label preservation during roundtrip conversion. This bug affects any component with both field bindings and explicit labels, which is common in real-world admin panels where developers want custom labels that differ from auto-generated ones.

The suggested fix is straightforward and low-risk: check if the label differs from the auto-generated version before deciding whether to add a literal binding.

Additionally, the spec has an ambiguity regarding conditional syntax that should be clarified to prevent confusion for developers.
