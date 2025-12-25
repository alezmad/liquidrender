---
component: DataTable
code: Tb
liquid_file: packages/liquid-render/src/renderer/components/data-table.tsx
shadcn_ref: table
auditor: agent
date: 2025-12-25
scores:
  accessibility: 5
  api_design: 7
  design_tokens: 9
  features: 6
  testing: 6
  total: 33
priority: P1
---

# Audit: DataTable

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/data-table.tsx` |
| shadcn reference | `table` |
| DSL code | `Tb` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct - Partial (uses semantic HTML)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys) - Missing keyboard nav for sorting
- [x] Focus management correct - N/A for static table
- [ ] Works with screen readers - Missing `scope` on `<th>`, no `aria-sort`
- [x] Color contrast meets WCAG AA - Uses tokens with CSS variables

### Findings

**Positive:**
- Uses semantic HTML `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`
- Has `data-liquid-type="table"` for identification
- Empty state gracefully handled with `No data available` message
- Uses proper `colSpan` for empty state

**Negative:**
- Missing `scope="col"` on `<th>` elements for screen reader association
- Missing `<caption>` element (shadcn has `TableCaption` component)
- Sortable headers lack `aria-sort` attribute to indicate sort state
- No keyboard support for column sorting (relies on click handlers only)
- No `role="button"` or `tabindex` on sortable headers
- Missing `aria-label` on sort icons

### shadcn Comparison

shadcn Table provides:
```tsx
// TableCaption for accessibility
<caption data-slot="table-caption" className="text-muted-foreground mt-4 text-sm">
  {children}
</caption>

// TableHead with proper data-slot
<th data-slot="table-head" className="...">
```

shadcn separates table primitives, allowing composition. Liquid-render's DataTable is monolithic.

### Score: 5/10

**Rationale:** Uses semantic HTML which is good, but lacks critical ARIA attributes for sortable tables (`aria-sort`), missing `<caption>`, no keyboard navigation for sort, and no `scope` attributes.

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.) - Different pattern (block-based)
- [x] Consistent variants across components - Follows LiquidComponentProps pattern
- [ ] Supports both controlled and uncontrolled modes - Sort is internal only
- [x] TypeScript types are complete and exported - Column, SortState, etc.
- [x] Default props are sensible - Auto-infers columns from data

### Current Props

```typescript
// Dynamic component (LiquidUI-driven)
interface LiquidComponentProps {
  block: Block;        // Contains: label, binding, columns
  data: DataContext;   // Data for binding resolution
  children?: ReactNode;
  className?: string;
}

// Static component (standalone usage)
interface StaticTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns?: Column[];
  title?: string;
  sortable?: boolean;
  striped?: boolean;
  style?: React.CSSProperties;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}
```

### shadcn Props

```typescript
// shadcn uses composition - each element is separate
function Table({ className, ...props }: React.ComponentProps<"table">)
function TableHeader({ className, ...props }: React.ComponentProps<"thead">)
function TableBody({ className, ...props }: React.ComponentProps<"tbody">)
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">)
function TableRow({ className, ...props }: React.ComponentProps<"tr">)
function TableHead({ className, ...props }: React.ComponentProps<"th">)
function TableCell({ className, ...props }: React.ComponentProps<"td">)
function TableCaption({ className, ...props }: React.ComponentProps<"caption">)
```

### Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No external sort control (onSort callback) | Cannot integrate with server-side sorting | P1 |
| No column visibility control | Cannot hide/show columns dynamically | P2 |
| No row selection support | Common data table requirement | P1 |
| No footer support (TableFooter) | Cannot show totals/summaries | P2 |
| Missing `className` prop on dynamic component | Limited styling flexibility | P2 |
| No pagination built-in | Requires external component | P1 |

### Score: 7/10

**Rationale:** Good TypeScript types, dual dynamic/static variants, auto-column inference. Missing external control callbacks, row selection, and pagination integration.

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

```typescript
// Minor violations in SortIcon SVG
<svg
  width="12"    // Hardcoded, but acceptable for icon sizing
  height="12"   // Hardcoded, but acceptable for icon sizing
  viewBox="0 0 24 24"
  fill="currentColor"  // Good - inherits color
  ...
>
```

### Token Usage Analysis

**Excellent token usage throughout:**
```typescript
// Header styles
padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
fontWeight: tokens.fontWeight.medium,
borderBottom: `1px solid ${tokens.colors.border}`,
fontSize: tokens.fontSize.base,

// Table cell styles
padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
color: tokens.colors.foreground,
borderBottom: `1px solid ${tokens.colors.border}`,

// Empty state
padding: tokens.spacing['2xl'],
color: tokens.colors.mutedForeground,

// Transitions
transition: `background-color ${tokens.transition.fast}`,
```

**Uses design utilities:**
- `cardStyles()` for wrapper
- `mergeStyles()` for style composition
- `baseStyles()` for table base

### Score: 9/10

**Rationale:** Excellent adherence to design tokens. Only minor hardcoding for SVG dimensions which is acceptable. Uses CSS variables for theming support.

---

## 4. Features (0-10)

### liquid-render Features
- [x] Auto-column detection from data
- [x] Column sorting (single column)
- [x] Sortable column headers with indicator
- [x] Striped rows (alternating background)
- [x] Responsive horizontal scroll
- [x] Empty state handling
- [x] Title/label support
- [x] Value formatting via `formatDisplayValue()`
- [x] Label generation via `fieldToLabel()`
- [ ] Pagination
- [ ] Row selection
- [ ] Column visibility toggle
- [ ] Multi-column sort
- [ ] Filtering
- [ ] Column resizing
- [ ] Row expansion

### shadcn Features
- [x] Semantic table structure
- [x] Table caption support
- [x] Footer support
- [x] Hover states on rows
- [x] Selected state styling (`data-[state=selected]`)
- [x] Checkbox integration styling
- [x] Composable primitives

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Semantic HTML | Yes | Yes | - |
| Caption/Title | Partial (div) | Yes (`<caption>`) | P2 |
| Column Sorting | Yes (single) | Manual | - |
| Multi-Sort | No | Manual | P2 |
| Row Selection | No | Via composition | P1 |
| Pagination | No | Via composition | P1 |
| Footer/Totals | No | Yes | P2 |
| Hover States | No | Yes | P2 |
| Selected State | No | Yes | P1 |
| Column Visibility | No | Via composition | P2 |

### Score: 6/10

**Rationale:** Good core features (sorting, auto-columns, formatting), but missing key data table capabilities: row selection, pagination, and external sort control.

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (empty data implicitly via column detection)
- [ ] Covers error states
- [ ] Accessibility tests
- [ ] Snapshot tests
- [ ] Render tests (component output)

### Current Test Coverage

- Tests file: `packages/liquid-render/tests/data-tables.test.ts`
- Test count: 26 tests across 6 describe blocks
- Coverage: DSL parsing and roundtrip only

### Test Analysis

The existing tests focus on:
1. **DSL Parsing** - Validates `parseUI()` parses table snippets correctly
2. **Column Extraction** - Verifies `[:col1, :col2]` syntax extracts columns
3. **Signal Detection** - Tests signal declarations like `@filter @sort`
4. **Roundtrip Equivalence** - Ensures `roundtripUI()` produces equivalent output

**Example test coverage:**
```typescript
it('should parse TABLE_001 columns correctly', () => {
  const schema = parseUI(snippet.source);
  const tableBlock = findTableBlock(schema);
  expect(tableBlock?.columns).toEqual(['name', 'email', 'status']);
});

it('should roundtrip TABLE_001 with equivalence', () => {
  const schema = parseUI(snippet.source);
  const result = roundtripUI(schema);
  expect(result.isEquivalent).toBe(true);
});
```

### Missing Tests

| Test Type | Description | Priority |
|-----------|-------------|----------|
| Render Tests | Verify React component output | P1 |
| Sorting Tests | Test sort state changes, direction cycling | P1 |
| Empty State Test | Verify "No data available" renders | P2 |
| Accessibility Tests | Test ARIA attributes, keyboard nav | P1 |
| Static Component Tests | Test `StaticTable` variant | P2 |
| Column Inference Tests | Test auto-detection from various data shapes | P2 |

### Score: 6/10

**Rationale:** Tests exist but only cover DSL parsing, not React component behavior. Missing render tests, interaction tests (sorting), and accessibility tests.

---

## Overall Score: 33/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 5/10 | High | Missing ARIA, keyboard nav, caption |
| API Design | 7/10 | Medium | Good types, missing callbacks |
| Design Tokens | 9/10 | Medium | Excellent token usage |
| Features | 6/10 | Low | Core features good, missing row selection/pagination |
| Testing | 6/10 | Medium | DSL tests only, no render tests |
| **Total** | **33/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)

None identified. Component is functional for basic use cases.

### P1 - Important (Next Sprint)

1. **Add `aria-sort` attribute to sortable headers**
   - When sorted ascending: `aria-sort="ascending"`
   - When sorted descending: `aria-sort="descending"`
   - When not sorted: `aria-sort="none"`

2. **Add keyboard navigation for sorting**
   - Add `tabindex="0"` and `role="button"` to sortable headers
   - Handle Enter/Space key to trigger sort

3. **Add `scope="col"` to `<th>` elements**
   ```tsx
   <th scope="col" ...>
   ```

4. **Add onSort callback for external control**
   ```typescript
   interface StaticTableProps {
     onSort?: (column: string, direction: SortDirection) => void;
   }
   ```

5. **Add render tests for DataTable component**
   - Test sorting behavior
   - Test empty state rendering
   - Test column display

### P2 - Nice to Have (Backlog)

1. **Add `<caption>` element support**
   - Replace title div with semantic `<caption>`
   - Add `captionSide: 'top'` for positioning

2. **Add row selection support**
   ```typescript
   interface StaticTableProps {
     selectable?: boolean;
     selectedRows?: number[];
     onSelectionChange?: (rows: number[]) => void;
   }
   ```

3. **Add pagination integration**
   ```typescript
   interface StaticTableProps {
     page?: number;
     pageSize?: number;
     total?: number;
     onPageChange?: (page: number) => void;
   }
   ```

4. **Add hover state to rows**
   - Currently using striped rows, add subtle hover effect

5. **Add footer support for totals/summaries**

---

## Action Items for WF-0002

- [ ] Add `scope="col"` to all `<th>` elements
- [ ] Add `aria-sort` attribute to sortable column headers
- [ ] Add keyboard handler (Enter/Space) for sort activation
- [ ] Add `tabindex="0"` and `role="button"` to sortable headers
- [ ] Create render test suite for DataTable component
- [ ] Add `onSort` callback prop to StaticTable
- [ ] Replace title div with semantic `<caption>` element
