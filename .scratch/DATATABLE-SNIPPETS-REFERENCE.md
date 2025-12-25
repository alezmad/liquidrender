# Data Table LiquidCode Snippets - Complete Reference

This document provides the complete reference for all 5 unique data table snippets used in the verification test suite.

---

## Snippet 1: Basic Sortable Table with Filter

### LiquidCode DSL
```liquidcode
@filter @sort
Tb :users [:name :email :status]
Bt "Reset Filter" >clearFilter
```

### Parse & Roundtrip Test
```typescript
// Parse with parseUI()
const schema = parseUI(`@filter @sort
Tb :users [:name :email :status]
Bt "Reset Filter" >clearFilter`);

// Expected signals
expect(schema.signals.map(s => s.name)).toContain('filter');
expect(schema.signals.map(s => s.name)).toContain('sort');

// Expected columns
const tableBlock = findTableBlock(schema);
expect(tableBlock?.columns).toEqual(['name', 'email', 'status']);

// Roundtrip verification
const result = roundtripUI(schema);
expect(result.isEquivalent).toBe(true);
expect(result.differences.length).toBe(0);
```

### Features
- ✓ Signal declarations: `@filter`, `@sort`
- ✓ Table component with field binding: `Tb :users`
- ✓ Column definitions: `[:name :email :status]`
- ✓ Button with signal emit: `Bt "Reset Filter" >clearFilter`

### Use Case
Basic data table with filter controls and sort capability. Ideal for simple data views with user and email listing.

---

## Snippet 2: Table with Pagination Signals

### LiquidCode DSL
```liquidcode
@pageNum @pageSize @sort
Tb :products [:sku :description :quantity :price]
Bt "First" >pageNum=1
Bt "Next" >pageNum=next
Bt "Last" >pageNum=last
```

### Parse & Roundtrip Test
```typescript
// Parse with parseUI()
const schema = parseUI(`@pageNum @pageSize @sort
Tb :products [:sku :description :quantity :price]
Bt "First" >pageNum=1
Bt "Next" >pageNum=next
Bt "Last" >pageNum=last`);

// Expected signals
const signalNames = schema.signals.map(s => s.name);
expect(signalNames).toContain('pageNum');
expect(signalNames).toContain('pageSize');
expect(signalNames).toContain('sort');

// Expected columns
const tableBlock = findTableBlock(schema);
expect(tableBlock?.columns).toEqual(['sku', 'description', 'quantity', 'price']);

// Roundtrip verification
const result = roundtripUI(schema);
expect(result.isEquivalent).toBe(true);
```

### Features
- ✓ Multiple signal declarations: `@pageNum`, `@pageSize`, `@sort`
- ✓ Table with 4 columns: `[:sku :description :quantity :price]`
- ✓ Signal emit with numeric value: `>pageNum=1`
- ✓ Signal emit with semantic values: `>pageNum=next`, `>pageNum=last`
- ✓ Multiple button controls

### Use Case
Product inventory management with pagination. Supports first/next/last navigation patterns commonly seen in e-commerce.

---

## Snippet 3: Table with Complex Filter Bindings

### LiquidCode DSL
```liquidcode
@filter @sort @page
In :searchTerm "Search Orders" <filter
Tb :orders [:orderID :customerName :date :totalAmount :status]
Bt "Apply Filters" >filter
```

### Parse & Roundtrip Test
```typescript
// Parse with parseUI()
const schema = parseUI(`@filter @sort @page
In :searchTerm "Search Orders" <filter
Tb :orders [:orderID :customerName :date :totalAmount :status]
Bt "Apply Filters" >filter`);

// Expected signals
const signalNames = schema.signals.map(s => s.name);
expect(signalNames).toContain('filter');
expect(signalNames).toContain('sort');
expect(signalNames).toContain('page');

// Expected columns (5 columns)
const tableBlock = findTableBlock(schema);
expect(tableBlock?.columns).toEqual(['orderID', 'customerName', 'date', 'totalAmount', 'status']);

// Verify signal receive on input
const inputBlock = schema.layers[0].root.children?.find(c => c.type === 'input');
expect(inputBlock?.signals?.receive).toBe('filter');

// Roundtrip verification
const result = roundtripUI(schema);
expect(result.isEquivalent).toBe(true);
```

### Features
- ✓ Signal declarations: `@filter`, `@sort`, `@page`
- ✓ Input field with label: `In :searchTerm "Search Orders"`
- ✓ Signal receive binding on input: `<filter`
- ✓ Table with 5 columns: `[:orderID :customerName :date :totalAmount :status]`
- ✓ Button with signal emit: `Bt "Apply Filters" >filter`
- ✓ Bidirectional signal pattern (input receives, button emits)

### Use Case
Order management dashboard with search filtering. The input field receives filter state changes, and the button applies filters. Perfect for search-driven workflows.

---

## Snippet 4: Table with Multi-Column Sort

### LiquidCode DSL
```liquidcode
@sortColumn @sortDir @page @pageSize
Tb :transactions [:txnID :type :amount :timestamp :status]
Cn ^r [
  Bt "Sort Name" >sortColumn=name,
  Bt "Sort Date" >sortColumn=timestamp,
  Bt "Sort Amount" >sortColumn=amount
]
Cn ^r [
  Bt "Ascending" >sortDir=asc,
  Bt "Descending" >sortDir=desc
]
```

### Parse & Roundtrip Test
```typescript
// Parse with parseUI()
const schema = parseUI(`@sortColumn @sortDir @page @pageSize
Tb :transactions [:txnID :type :amount :timestamp :status]
Cn ^r [
  Bt "Sort Name" >sortColumn=name,
  Bt "Sort Date" >sortColumn=timestamp,
  Bt "Sort Amount" >sortColumn=amount
]
Cn ^r [
  Bt "Ascending" >sortDir=asc,
  Bt "Descending" >sortDir=desc
]`);

// Expected signals (4 signals)
const signalNames = schema.signals.map(s => s.name);
expect(signalNames).toContain('sortColumn');
expect(signalNames).toContain('sortDir');
expect(signalNames).toContain('page');
expect(signalNames).toContain('pageSize');

// Expected columns (5 columns)
const tableBlock = findTableBlock(schema);
expect(tableBlock?.columns).toEqual(['txnID', 'type', 'amount', 'timestamp', 'status']);

// Verify container structure with flex layout
const root = schema.layers[0].root;
expect(root.children).toBeDefined();
expect(root.children?.[0].layout?.flex).toBe('row'); // ^r = row flex

// Roundtrip verification
const result = roundtripUI(schema);
expect(result.isEquivalent).toBe(true);
```

### Features
- ✓ 4 signal declarations: `@sortColumn`, `@sortDir`, `@page`, `@pageSize`
- ✓ Table with 5 columns: `[:txnID :type :amount :timestamp :status]`
- ✓ Container `Cn` for grouping
- ✓ Flex row layout modifier: `^r`
- ✓ Nested buttons with signal emit and payloads:
  - `>sortColumn=name`, `>sortColumn=timestamp`, `>sortColumn=amount`
  - `>sortDir=asc`, `>sortDir=desc`
- ✓ Comma-separated children syntax

### Use Case
Advanced transaction analytics with multi-column sort controls. Supports sorting by different fields and direction selection independently.

---

## Snippet 5: Interactive Table Dashboard

### LiquidCode DSL
```liquidcode
@search @filter @sort @page @mode
0 [
  Cn ^r [
    In :search "Search..." <search,
    Bt "Filter" >filter,
    Bt "Clear" >clearAll
  ]
  Tb :analytics [:metric :value :trend :lastUpdate]
  Cn ^r [
    Bt "◀ Prev" >page=prev,
    Tx "Page 1 of 10",
    Bt "Next ▶" >page=next
  ]
]
```

### Parse & Roundtrip Test
```typescript
// Parse with parseUI()
const schema = parseUI(`@search @filter @sort @page @mode
0 [
  Cn ^r [
    In :search "Search..." <search,
    Bt "Filter" >filter,
    Bt "Clear" >clearAll
  ]
  Tb :analytics [:metric :value :trend :lastUpdate]
  Cn ^r [
    Bt "◀ Prev" >page=prev,
    Tx "Page 1 of 10",
    Bt "Next ▶" >page=next
  ]
]`);

// Expected signals (5 signals)
const signalNames = schema.signals.map(s => s.name);
expect(signalNames).toContain('search');
expect(signalNames).toContain('filter');
expect(signalNames).toContain('sort');
expect(signalNames).toContain('page');
expect(signalNames).toContain('mode');

// Expected columns (4 columns)
const tableBlock = findTableBlock(schema);
expect(tableBlock?.columns).toEqual(['metric', 'value', 'trend', 'lastUpdate']);

// Verify layer 0 structure
const root = schema.layers[0].root;
expect(root.type).toBe('container');
expect(root.children).toHaveLength(3); // 3 sections: toolbar, table, pagination

// Verify toolbar (section 1)
const toolbar = root.children?.[0];
expect(toolbar?.type).toBe('container');
expect(toolbar?.layout?.flex).toBe('row');

// Verify input with signal receive
const searchInput = toolbar?.children?.find(c => c.type === 'input');
expect(searchInput?.signals?.receive).toBe('search');

// Verify pagination (section 3)
const pagination = root.children?.[2];
expect(pagination?.type).toBe('container');
const prevBtn = pagination?.children?.[0];
expect(prevBtn?.signals?.emit?.value).toBe('prev');
const nextBtn = pagination?.children?.[2];
expect(nextBtn?.signals?.emit?.value).toBe('next');

// Roundtrip verification
const result = roundtripUI(schema);
expect(result.isEquivalent).toBe(true);
```

### Features
- ✓ 5 signal declarations: `@search`, `@filter`, `@sort`, `@page`, `@mode`
- ✓ Explicit layer declaration: `/0`
- ✓ Container with 3 child sections
- ✓ Row flex layout: `^r` for horizontal toolbars
- ✓ Section 1 - Filter toolbar:
  - Input with signal receive: `In :search "Search..." <search`
  - Buttons with signal emit: `>filter`, `>clearAll`
- ✓ Section 2 - Data table with 4 columns: `[:metric :value :trend :lastUpdate]`
- ✓ Section 3 - Pagination toolbar:
  - Buttons with semantic values: `>page=prev`, `>page=next`
  - Text component for status: `Tx "Page 1 of 10"`
- ✓ Unicode support in button labels: `◀ Prev`, `Next ▶`

### Use Case
Comprehensive analytics dashboard combining search, filtering, sorting, and pagination in a single view. Demonstrates enterprise-level data table UI patterns.

---

## Comparison Matrix

| Feature | Snippet 1 | Snippet 2 | Snippet 3 | Snippet 4 | Snippet 5 |
|---------|-----------|-----------|-----------|-----------|-----------|
| Signals | 2 | 3 | 3 | 4 | 5 |
| Columns | 3 | 4 | 5 | 5 | 4 |
| Tables | 1 | 1 | 1 | 1 | 1 |
| Buttons | 1 | 3 | 1 | 5 | 3 |
| Containers | 0 | 0 | 0 | 2 | 3 |
| Inputs | 0 | 0 | 1 | 0 | 1 |
| Text Components | 0 | 0 | 0 | 0 | 1 |
| Signal Receive | 0 | 0 | 1 | 0 | 1 |
| Signal Emit | 1 | 3 | 1 | 5 | 3 |
| Complexity | Basic | Medium | Medium | Complex | Expert |

---

## Testing Summary

### All Snippets Verified ✓
- **Parse Test:** DSL → LiquidSchema (100% success)
- **Signal Test:** Expected signals present and correct (100% success)
- **Column Test:** Expected columns parsed correctly (100% success)
- **Roundtrip Test:** Schema → DSL → Schema equivalence (100% success)

### Total Test Count: 25
- 5 snippets × 5 tests per snippet = 25 tests
- All tests passing
- 0 failures

---

## Implementation Notes

### Column Definition Syntax
Columns are defined using bracket notation with field bindings:
```
Tb :dataSource [:column1 :column2 :column3]
```

### Signal System
Three types of signal bindings:
1. **Declare:** `@signalName` - Declare a signal
2. **Emit:** `>signalName` or `>signalName=value` - Component sends signal
3. **Receive:** `<signalName` - Component receives signal updates

### Layout Modifiers
- `^r` - Row flex layout (horizontal)
- `^c` - Column flex layout (vertical)
- `^g` - Gap flex layout

### Component Types Used
- `Tb` - Table (data display)
- `Bt` - Button (interactive)
- `In` - Input (data collection)
- `Tx` - Text (static display)
- `Cn` - Container (layout grouping)

---

## Running the Verification

### Execute Tests
```bash
cd /Users/agutierrez/Desktop/liquidrender/packages/liquid-render
npm run test -- tests/data-tables.test.ts
```

### Generate Report
```bash
npx tsx data-tables-report.ts
```

### Expected Output
```
✓ tests/data-tables.test.ts (25 tests) 8ms
Test Files  1 passed (1)
Tests  25 passed (25)
```

---

## Files Reference

- **Test Suite:** `/tests/data-tables.test.ts`
- **Report Generator:** `/data-tables-report.ts`
- **Documentation:** `/DATA-TABLES-VERIFICATION.md`
- **This Reference:** `/DATATABLE-SNIPPETS-REFERENCE.md`

All files located in: `/Users/agutierrez/Desktop/liquidrender/packages/liquid-render/`
