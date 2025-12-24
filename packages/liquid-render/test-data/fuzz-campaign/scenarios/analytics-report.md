# Analytics Dashboard Scenarios - Test Report

## Summary
- Total scenarios: 4
- Parsed: 4
- Failed to parse: 0
- Roundtrip passed: 0
- Roundtrip failed: 4

## Scenario 1: KPI Overview
**File:** analytics-1.lc
**Status:** PARSE ✅ | ROUNDTRIP ❌

### LiquidCode
```liquid
Kp :revenue "Total Revenue" !h #green
Kp :orders "Total Orders" !p #blue
Kp :customers "New Customers" !p #purple
Kp :growth "Growth Rate" !s #?>=10:green,<10:red
```

### Test Results
- **Parse:** SUCCESS
- **Roundtrip:** FAILED

### Differences
```
layer0[1].label mismatch: Total Revenue vs Revenue
layer0[2].label mismatch: Total Orders vs Orders
layer0[3].label mismatch: New Customers vs Customers
layer0[4].label mismatch: Growth Rate vs Growth
```

### Reconstructed DSL
```liquid
1
1 :revenue !h #green
1 :orders !p #blue
1 :customers !p #purple
1 :growth !s #?>=10:green
```

### Failure Analysis
- **Root Cause:** Explicit labels are lost during schema→AST conversion, replaced with auto-generated labels
- **Classification:** COMPILER_BUG
- **Evidence:**
  1. Source has explicit labels: `Kp :revenue "Total Revenue"`
  2. Schema correctly stores label in `block.label` field: `"label": "Total Revenue"`
  3. During roundtrip (schema→AST), the `liquidSchemaToAST` function only adds label to bindings if there's NO field binding
  4. Reconstruction uses auto-generated label "Revenue" instead of explicit "Total Revenue"

- **Bug Location:** `/src/compiler/ui-emitter.ts`, lines 616-622

```typescript
// Current (buggy) code:
if (block.binding) {
  astBlock.bindings.push(convertBinding(block.binding));
}

// Label as literal binding
if (block.label && !block.binding) {  // ❌ BUG: skips labels when binding exists
  astBlock.bindings.push({
    kind: 'literal',
    value: block.label,
  });
}
```

- **Suggested Fix:** The condition should check if the label is explicit (not auto-generated) by comparing with what would be auto-generated:

```typescript
// Binding
if (block.binding) {
  astBlock.bindings.push(convertBinding(block.binding));

  // Add label as literal binding if it's NOT auto-generated
  if (block.label && block.binding.kind === 'field') {
    const autoLabel = fieldToLabel(block.binding.value as string);
    if (block.label !== autoLabel) {
      // Explicit label differs from auto-generated - preserve it
      astBlock.bindings.push({
        kind: 'literal',
        value: block.label,
      });
    }
  }
} else if (block.label) {
  // No binding, just a label
  astBlock.bindings.push({
    kind: 'literal',
    value: block.label,
  });
}
```

---

## Scenario 2: Chart Grid
**File:** analytics-2.lc
**Status:** PARSE ✅ | ROUNDTRIP ❌

### LiquidCode
```liquid
Gd *2 [
  Br :category :sales "Sales by Category"
  Ln :date :revenue "Revenue Trend"
  Pi :segment :value "Market Share"
  Br :product :quantity "Top Products"
]
```

### Test Results
- **Parse:** SUCCESS
- **Roundtrip:** FAILED

### Differences
```
layer0[2][0].label mismatch: Sales by Category vs Category
layer0[2][1].label mismatch: Revenue Trend vs Date
layer0[2][2].label mismatch: Market Share vs Segment
layer0[2][3].label mismatch: Top Products vs Product
```

### Reconstructed DSL
```liquid
2
2
Gd *2 [2 :category, 3 :date, 4 :segment, 2 :product]
```

### Failure Analysis
- **Root Cause:** Same as Scenario 1 - explicit labels lost during roundtrip
- **Classification:** COMPILER_BUG (same bug)
- **Evidence:** Identical to Scenario 1, affects chart components with explicit labels

---

## Scenario 3: Metrics with Filters
**File:** analytics-3.lc
**Status:** PARSE ✅ | ROUNDTRIP ❌

### LiquidCode
```liquid
@dateRange @category

Se :dateOptions <>dateRange
Se :categoryOptions <>category

Kp :revenue <dateRange <category
Ln :date :sales <dateRange <category

Cn ?@category="electronics" [
  Br :product :quantity "Electronics Sales"
]

Cn ?@category="clothing" [
  Pi :size :quantity "Size Distribution"
]
```

### Test Results
- **Parse:** SUCCESS
- **Roundtrip:** FAILED

### Differences
```
layer0[5][0].label mismatch: Electronics Sales vs Product
layer0[6][0].label mismatch: Size Distribution vs Size
```

### Reconstructed DSL
```liquid
@dateRange @category
3
Se :dateOptions <>dateRange
Se :categoryOptions <>category
1 :revenue <category
3 :date <category
0 [2 :product]
0 [4 :size]
```

### Failure Analysis
- **Root Cause:** Same label preservation bug
- **Classification:** COMPILER_BUG (same bug)
- **Additional Issue:** Note that signal receivers are also being lost - `<dateRange <category` becomes just `<category` in the reconstructed version. This is a SECOND bug related to multiple signal receivers.

---

## Scenario 4: Complex Dashboard
**File:** analytics-4.lc
**Status:** PARSE ✅ | ROUNDTRIP ❌

### LiquidCode
```liquid
@tab @filter

Cn ^row [
  Bt "Overview" >tab=0
  Bt "Details" >tab=1
  Bt "Trends" >tab=2
]

Cn ?@tab=0 [
  Gd *3 [
    Kp :revenue !h #green
    Kp :orders !p #blue
    Kp :customers !s #purple
  ]
  Cn ^row *2 [
    Ln :month :revenue "Monthly Revenue" *f
    Br :category :sales "Category Performance" *f
  ]
]

Cn ?@tab=1 [
  Cn ^row [
    Se :filterOptions <>filter
    In :search <>query
  ]
  Tb :orders [:id :customer :amount :status] <filter <query
]

Cn ?@tab=2 [
  Sk [
    Ln :date :revenue "Revenue Trend" *f
    Ln :date :orders "Order Volume" *f
    Hm :product :date :value "Product Heatmap" *f
  ]
]
```

### Test Results
- **Parse:** SUCCESS
- **Roundtrip:** FAILED

### Differences
```
layer0[2][1][0].label mismatch: Monthly Revenue vs Month
layer0[2][1][1].label mismatch: Category Performance vs Category
layer0[4][0][0].label mismatch: Revenue Trend vs Date
layer0[4][0][1].label mismatch: Order Volume vs Date
layer0[4][0][2].label mismatch: Product Heatmap vs Product
```

### Reconstructed DSL
```liquid
@tab @filter
4
0 ^r [Bt "Overview" >tab=0, Bt "Details" >tab=1, Bt "Trends" >tab=2]
0 [Gd *3 [1 :revenue !h #green, 1 :orders !p #blue, 1 :customers !s #purple], 0 ^r *2 [3 :month *full, 2 :category *full]]
0 [0 ^r [Se :filterOptions <>filter, In :search <>query], 5 :orders [:id :customer :amount :status]]
0 [Sk [3 :date *full, 3 :date *full, Hm :product *full]]
```

### Failure Analysis
- **Root Cause:** Same label preservation bug
- **Classification:** COMPILER_BUG (same bug)
- **Additional Issues:**
  1. Same as Scenario 3 - multiple signal receivers being lost (only last receiver preserved)
  2. Conditional rendering markers (`?@tab=0`) are being lost in reconstruction
  3. Heatmap with 3-axis binding (`:product :date :value`) loses the third axis, becomes just `:product`

---

## Findings Summary

### Compiler Bugs Found: 4

1. **Label Preservation Bug** (CRITICAL)
   - **Affects:** All 4 scenarios
   - **Impact:** Explicit labels are lost during schema→AST roundtrip
   - **Location:** `ui-emitter.ts:616-622` in `liquidSchemaToAST` function
   - **Severity:** HIGH - breaks roundtrip equivalence for any component with explicit labels

2. **Multiple Signal Receivers Bug** (MAJOR)
   - **Affects:** Scenario 3, 4
   - **Impact:** Only last signal receiver preserved when multiple `<signal` modifiers exist
   - **Example:** `<dateRange <category` becomes just `<category`
   - **Severity:** MEDIUM - breaks multi-signal reactive behavior

3. **Conditional Rendering Lost** (MAJOR)
   - **Affects:** Scenario 4
   - **Impact:** Conditional blocks (`?@tab=0 [...]`) lose their condition during reconstruction
   - **Severity:** HIGH - breaks conditional UI logic

4. **Multi-Axis Chart Binding** (MINOR)
   - **Affects:** Scenario 4 (Heatmap)
   - **Impact:** Charts with 3+ bindings (x, y, z) only preserve x, y
   - **Example:** `Hm :product :date :value` becomes `Hm :product`
   - **Severity:** LOW - only affects advanced chart types

### Spec Ambiguities: 0
All LiquidCode syntax used is valid according to the spec.

### Test Errors: 0
All scenarios are realistic and correctly written.

---

## Recommendations

### Priority 1: Fix Label Preservation (Bug #1)
Implement the fix in `liquidSchemaToAST` to detect and preserve explicit labels:

```typescript
function fieldToLabel(field: string): string {
  const name = field.split('.').pop() || field;
  let result = name.replace(/_/g, ' ');
  result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
  result = result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return result;
}

// In convertBlock function:
if (block.binding) {
  astBlock.bindings.push(convertBinding(block.binding));

  // Preserve explicit labels
  if (block.label && block.binding.kind === 'field') {
    const autoLabel = fieldToLabel(block.binding.value as string);
    if (block.label !== autoLabel) {
      astBlock.bindings.push({
        kind: 'literal',
        value: block.label,
      });
    }
  }
} else if (block.label) {
  astBlock.bindings.push({
    kind: 'literal',
    value: block.label,
  });
}
```

### Priority 2: Fix Multiple Signal Receivers (Bug #2)
Schema currently stores signals as:
```typescript
signals?: {
  receive?: string;  // ❌ Only one signal
  emit?: SignalEmit;
  both?: string;     // ❌ Only one signal
}
```

Should support multiple receivers:
```typescript
signals?: {
  receive?: string | string[];  // ✅ Multiple signals
  emit?: SignalEmit;
  both?: string | string[];     // ✅ Multiple signals
}
```

### Priority 3: Fix Conditional Rendering (Bug #3)
The schema stores conditions correctly, but `liquidSchemaToAST` doesn't check parent container conditions for child blocks.

### Priority 4: Fix Multi-Axis Charts (Bug #4)
Extend binding schema to support z-axis and other dimensions for advanced chart types.

---

## Test Data Quality
All 4 scenarios represent realistic analytics dashboard code that developers would actually write:
- ✅ Scenario 1: Standard KPI cards with custom labels and conditional styling
- ✅ Scenario 2: Multi-chart grid layout
- ✅ Scenario 3: Filtered metrics with signal-based reactivity
- ✅ Scenario 4: Complex tabbed dashboard with nested layouts

The failures are all genuine compiler bugs, not invalid syntax or unrealistic usage.
