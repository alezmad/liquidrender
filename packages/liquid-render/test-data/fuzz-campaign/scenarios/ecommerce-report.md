# E-commerce Domain Scenario Testing Report

**Test Domain:** E-commerce
**Date:** 2025-12-24
**Compiler Version:** LiquidCode UI Compiler v1.0
**Test Scenarios:** 4

---

## Executive Summary

Tested 4 realistic e-commerce LiquidCode snippets covering common UI patterns:
- **Product Card**: Image, title, price, rating, add-to-cart
- **Shopping Cart**: List of items with quantities and totals
- **Checkout Form**: Multi-field form with validation
- **Order Summary**: Complex nested structure with status indicators

**Results:**
- ✅ 2 scenarios passed all tests (Scenarios 1, 2)
- ⚠️ 2 scenarios failed roundtrip equivalence (Scenarios 3, 4)
- 🐛 2 compiler bugs identified in label preservation and conditional color parsing

---

## Scenario 1: Product Card

### LiquidCode
```liquid
Cd [
  Im :productImage
  Hd :productName %lg
  Tx :description
  Kp :price "Price"
  Rt :rating
  Bt "Add to Cart" !addToCart #primary
]
```

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ✅ EQUIVALENT

### Analysis
Perfect! This scenario demonstrates:
- Card container with children
- Multiple component types (image, heading, text, KPI, rating, button)
- Auto-label generation (`:productImage` → "Product Image")
- Custom label override (`:price "Price"`)
- Style modifiers (`%lg`, `#primary`)
- Action modifiers (`!addToCart`)

All features parsed and roundtripped correctly.

---

## Scenario 2: Shopping Cart

### LiquidCode
```liquid
@cartTotal
Cd "Shopping Cart" [
  Ls :cartItems [
    Cd [
      Im :.image %sm
      Tx :.name
      In :.quantity
      Kp :.price
      Bt "Remove" !removeItem
    ]
  ]
  Kp :subtotal :tax :shipping :total
  Bt "Checkout" !checkout #primary
]
```

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ✅ EQUIVALENT

### Analysis
Excellent! This scenario demonstrates:
- Signal declarations (`@cartTotal`)
- Nested structures (card > list > card)
- Iterator bindings (`:.image`, `:.name`, etc.)
- Repetition shorthand (`Kp :subtotal :tax :shipping :total` → 4 KPIs)
- Complex nesting with proper context preservation

The repetition shorthand correctly expanded to 4 separate KPI blocks (UIDs `b9_0` through `b9_3`), and the iterator bindings preserved the dot notation correctly.

---

## Scenario 3: Checkout Form

### LiquidCode
```liquid
Fm [
  Hd "Checkout" %lg
  In :fullName "Full Name"
  In :email @email "Email"
  In :phone "Phone Number"
  In :address "Street Address"
  In :city :state :zipCode
  Se :country [:options]
  Ck :saveAddress "Save for future orders"
  Sw :newsletter "Subscribe to newsletter"
  Bt "Place Order" !submit #primary
  Bt "Cancel" !cancel
]
```

### Test Results
- **Parse:** ✅ SUCCESS
- **Roundtrip:** ❌ NOT EQUIVALENT

### Differences Detected
```
- layer0[3].label mismatch: Phone Number vs Phone
- layer0[4].label mismatch: Street Address vs Address
- layer0[9].label mismatch: Save for future orders vs Save Address
- layer0[10].label mismatch: Subscribe to newsletter vs Newsletter
```

### Reconstructed DSL
```liquid
6 [Hd "Checkout" %lg, In :fullName, In :email, In :phone, In :address, In :city, In :state, In :zipCode, Se :country, Ck :saveAddress, Sw :newsletter, Bt "Place Order" #primary !submit, Bt "Cancel" !cancel]
```

### Root Cause Analysis

**Classification:** 🐛 **COMPILER_BUG**

**Issue:** Custom label preservation failure in schema-to-DSL conversion

**Evidence:**
1. Parser correctly handles syntax `In :phone "Phone Number"`
2. Parser creates bindings: `[{kind: 'field', value: 'phone'}, {kind: 'literal', value: 'Phone Number'}]`
3. Emitter correctly converts to schema: `{binding: {kind: 'field', value: 'phone'}, label: "Phone Number"}`
4. **BUG:** Reverse conversion (`liquidSchemaToAST`) doesn't emit custom labels

**Code Location:** `/src/compiler/ui-emitter.ts`, lines 616-622

```typescript
// Label as literal binding
if (block.label && !block.binding) {
  astBlock.bindings.push({
    kind: 'literal',
    value: block.label,
  });
}
```

**Problem:** This code only adds label as literal binding when there's NO binding. When a block has both a field binding AND a custom label, the custom label is lost.

**Expected Behavior:**
```typescript
// Label as literal binding (even if there's a field binding)
if (block.label) {
  // If field binding exists and label differs from auto-label, add explicit label
  const autoLabel = block.binding?.kind === 'field'
    ? fieldToLabel(block.binding.value as string)
    : undefined;

  if (!block.binding || block.label !== autoLabel) {
    astBlock.bindings.push({
      kind: 'literal',
      value: block.label,
    });
  }
}
```

**Impact:** Any component with field binding + custom label will lose the custom label on roundtrip.

**Suggested Fix:**
1. Modify `liquidSchemaToAST` function to detect when label differs from auto-generated label
2. Emit literal binding for custom labels even when field binding exists
3. Add test cases for field+label combinations

---

## Scenario 4: Order Summary

### LiquidCode
```liquid
Cd "Order Summary" [
  Kp :orderNumber "Order #"
  Tg :status #?=delivered:green,=shipped:blue,=pending:yellow
  Hd "Order Details" %md
  Ls :items [
    Cd [
      Im :.image %sm
      Tx :.name
      Kp :.quantity "Qty"
      Kp :.price
    ]
  ]
  Kp :subtotal :tax :shipping :total
  Hd "Shipping Info" %md
  Tx :shippingAddress
  Tx :estimatedDelivery
  Pg :deliveryProgress
]
```

### Test Results
- **Parse:** ✅ SUCCESS (with partial data loss)
- **Roundtrip:** ❌ NOT EQUIVALENT

### Differences Detected
```
- layer0[0].label mismatch: Order # vs Order Number
- layer0[3][0][2].label mismatch: Qty vs undefined
```

### Reconstructed DSL
```liquid
8 "Order Summary" [1 :orderNumber, Tg :status #?=delivered:green, Hd "Order Details" %md, 7 :items [8 [Im :.image %sm, Tx :.name, 1 :.quantity, 1 :.price]], 1 :subtotal, 1 :tax, 1 :shipping, 1 :total, Hd "Shipping Info" %md, Tx :shippingAddress, Tx :estimatedDelivery, Pg :deliveryProgress]
```

### Root Cause Analysis

**Classification:** 🐛 **COMPILER_BUG** (2 separate issues)

#### Issue 1: Custom Label Loss (Same as Scenario 3)
- `Kp :orderNumber "Order #"` loses custom label
- `Kp :.quantity "Qty"` (iterator + custom label) loses custom label

#### Issue 2: Conditional Color Truncation

**Evidence:**
- Input: `#?=delivered:green,=shipped:blue,=pending:yellow`
- Parsed: `#?=delivered:green` (rest discarded)
- Schema shows: `style.colorCondition: "?=delivered:green"`

**Problem:** Scanner or parser treats comma as a separator, not as part of the conditional color expression.

**Code Location:** Likely in scanner's COLOR token regex

**Expected Behavior:** Conditional colors should support comma-separated conditions:
```
#?=delivered:green,=shipped:blue,=pending:yellow
```

Should be parsed as a single condition string, not tokenized at commas.

**Impact:** Multi-condition color modifiers are truncated to first condition only.

**Suggested Fix:**
1. Update scanner to recognize comma-separated conditions within color modifiers
2. Modify regex pattern for COLOR token to include commas when following `?`
3. Add test cases for multi-condition color expressions

---

## Test Code Validity Assessment

All 4 test scenarios use **valid LiquidCode syntax** according to the spec:

✅ **Scenario 1:** Valid - basic components with modifiers
✅ **Scenario 2:** Valid - lists, iterators, repetition shorthand
✅ **Scenario 3:** Valid - forms with field + custom label syntax
✅ **Scenario 4:** Valid - conditional colors (intended feature per spec §4.3)

The failures are compiler implementation bugs, not invalid test code.

---

## Findings Summary

### Bugs Discovered: 2

1. **Custom Label Preservation Bug**
   - Location: `ui-emitter.ts:616-622` (`liquidSchemaToAST`)
   - Severity: HIGH
   - Impact: Data loss on roundtrip for any field binding with custom label
   - Affects: Scenarios 3, 4

2. **Conditional Color Truncation Bug**
   - Location: Scanner (COLOR token pattern)
   - Severity: MEDIUM
   - Impact: Multi-condition colors only preserve first condition
   - Affects: Scenario 4

### Spec Ambiguities: 0

The spec clearly defines the expected syntax. No ambiguities discovered.

### Test Errors: 0

All generated LiquidCode is spec-compliant and represents realistic developer usage.

---

## Recommendations

### Priority 1: Fix Custom Label Preservation
This is a critical bug affecting common usage patterns. Developers frequently override auto-generated labels with custom text.

**Action Items:**
1. Modify `liquidSchemaToAST` to detect custom labels vs auto-labels
2. Emit literal bindings for custom labels even with field bindings
3. Add comprehensive test coverage for label combinations:
   - Field binding only (auto-label)
   - Field binding + custom label
   - Literal binding only
   - Iterator binding + custom label

### Priority 2: Fix Conditional Color Parsing
Multi-condition color expressions are a valuable feature per spec §4.3.

**Action Items:**
1. Update scanner COLOR token regex to handle comma-separated conditions
2. Ensure proper escaping/quoting of complex condition strings
3. Add test cases for various condition formats:
   - Single condition: `#?=value:color`
   - Multiple conditions: `#?=val1:c1,=val2:c2,=val3:c3`
   - Comparison operators: `#?>=80:green,<80:red`

### Priority 3: Expand Test Coverage
The current fuzzing campaign revealed 2 bugs in 4 scenarios. More extensive testing recommended.

**Suggested Test Domains:**
- Dashboard/Analytics (charts, KPIs, filters)
- Forms (validation, multi-step, file upload)
- Data Tables (sorting, filtering, pagination)
- Navigation (tabs, modals, drawers)
- Media (image galleries, video players)

---

## Conclusion

The e-commerce domain testing successfully identified 2 compiler bugs affecting real-world usage:

1. **Custom label preservation** - High-impact bug affecting any developer who wants to override auto-generated labels
2. **Conditional color parsing** - Medium-impact bug limiting expressiveness of conditional styling

Both bugs have clear root causes, suggested fixes, and test cases for verification. The LiquidCode DSL syntax itself is well-designed and intuitive for e-commerce use cases - the issues are purely in the compiler implementation.

**Overall Compiler Health:** Good foundation with specific fixable bugs. No fundamental design issues discovered.
