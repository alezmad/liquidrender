# Grid DSL Enhancement Specification

**Date:** 2025-12-31
**Status:** Ready for Implementation
**Scope:** LiquidCode DSL Grid Component Improvements

---

## Executive Summary

Enhance the LiquidCode DSL to support explicit grid column specification, row-based layout inference via newlines, and improved alignment controls—all while respecting CSS Grid's natural flow model.

---

## Current State

### What Exists
- Grid component (`Gd`) renders with hardcoded 12-column default
- `*N` span modifier works for child elements
- No DSL syntax for column count
- `columns` in parser is only for TABLE field names, not grid layout

### Gap Identified
```
Gd [Cd, Cd, Cd]  → Always renders as 12-column grid (wrong)
                   Should be 3 columns or auto-fit
```

---

## Design Decisions

### 1. Column Specification Syntax

| Syntax | CSS Output | Use Case |
|--------|------------|----------|
| `Gd [...]` | `auto-fit, minmax(200px, 1fr)` | Default responsive |
| `Gd 3 [...]` | `repeat(3, minmax(0, 1fr))` | Fixed 3 columns |
| `Gd ~fit [...]` | `auto-fit, minmax(200px, 1fr)` | Explicit responsive |
| `Gd ~fill [...]` | `auto-fill, minmax(200px, 1fr)` | Maintain min-width |
| `Gd ~250 [...]` | `auto-fit, minmax(250px, 1fr)` | Custom min-width |

**Parser change:** Accept NUMBER token after `Gd` type code as column count.

### 2. Row-Based Layout (Newline Separator)

Newlines within grid brackets define rows. First row determines column count.

```
Gd [
  Cd, Cd, Cd      ← First row: 3 items → 3 columns
  Cd, Cd, Cd      ← Second row: validates against 3
  Cd, Cd          ← Incomplete row: OK, 1 empty cell
]
```

**Compiler behavior:**
1. Split children by newline tokens
2. Count items in first row → set `columns`
3. Warn (not error) if subsequent rows exceed first row count
4. Allow incomplete last row (CSS Grid handles naturally)

### 3. Alignment for Incomplete Rows

Reuse flex modifier for justify-content on incomplete rows:

| Syntax | CSS `justify-content` | Visual |
|--------|----------------------|--------|
| `Gd 3 [...]` | `start` (default) | `[A][B][ ]` |
| `Gd 3 ^c [...]` | `center` | `[ ][A][B][ ]` |
| `Gd 3 ^e [...]` | `end` | `[ ][A][B]` |
| `Gd 3 ^sb [...]` | `space-between` | `[A][ ][B]` |

### 4. Gap Control

Reuse size modifier `%` for gap specification:

| Syntax | Gap Value |
|--------|-----------|
| `Gd 3 [...]` | `md` (default) |
| `Gd 3 %xs [...]` | `4px` |
| `Gd 3 %sm [...]` | `8px` |
| `Gd 3 %md [...]` | `16px` |
| `Gd 3 %lg [...]` | `24px` |
| `Gd 3 %xl [...]` | `32px` |

### 5. Explicit Empty Cell

New token `_` for placeholder cells:

```
Gd 3 [
  Cd, Cd, Cd
  Cd, _, Cd     ← Middle cell explicitly empty
]
```

Emits: `<div data-liquid-type="grid-empty" />` with optional styling hook.

### 6. Child Span (Already Works)

Existing span modifier applies to grid children:

| Syntax | CSS |
|--------|-----|
| `Cd *2` | `grid-column: span 2` |
| `Cd *f` | `grid-column: 1 / -1` (full width) |
| `Cd *h` | `grid-column: span 6` (half of 12) |

**Enhancement:** Add row span support:

| Syntax | CSS |
|--------|-----|
| `Cd *r2` | `grid-row: span 2` |
| `Cd *2r2` | `grid-column: span 2; grid-row: span 2` |

### 7. NO Masonry Support

**Decision:** Do not implement masonry layout in grid component.

**Rationale:**
- CSS Grid uses row-based model; masonry fights this
- JS-based masonry causes layout shift
- CSS `masonry` is experimental (Firefox flag only)
- ROI not worth complexity for business dashboards

**Alternative:** If masonry needed, create dedicated `Masonry` component with JS positioning.

---

## Implementation Plan

### Phase 1: Core Column Specification (P0)

**Files to modify:**

#### 1. `ui-scanner.ts`
No changes needed—NUMBER token already exists.

#### 2. `ui-parser.ts`

```typescript
// In parseBlock(), after parsing type code for grid:
if (block.type === 'grid' && this.check('NUMBER')) {
  const token = this.advance();
  block.gridColumns = parseInt(token.value, 10);
}

// In parseChildren(), track rows via newlines:
private parseChildrenWithRows(): { children: BlockAST[], rows: BlockAST[][] } {
  const rows: BlockAST[][] = [];
  let currentRow: BlockAST[] = [];

  // ... existing logic but track NEWLINE tokens before filtering
  // When NEWLINE encountered between blocks, start new row
}
```

**Add to BlockAST interface:**
```typescript
interface BlockAST {
  // ... existing
  gridColumns?: number;           // Explicit column count
  gridMode?: 'fit' | 'fill';      // Auto-fit vs auto-fill
  gridMinWidth?: string;          // Custom min-width for auto modes
  gridRows?: BlockAST[][];        // Children organized by rows
}
```

#### 3. `ui-emitter.ts`

```typescript
// In emitBlock() for grid type:
if (astBlock.type === 'grid') {
  // Determine columns
  let columns: number | 'auto-fit' | 'auto-fill' = 'auto-fit';

  if (astBlock.gridColumns) {
    columns = astBlock.gridColumns;
  } else if (astBlock.gridRows && astBlock.gridRows[0]) {
    // Infer from first row
    columns = astBlock.gridRows[0].length;
  }

  block.layout = {
    ...block.layout,
    columns,
    gridMinWidth: astBlock.gridMinWidth,
  };
}
```

**Add to Layout interface:**
```typescript
interface Layout {
  // ... existing
  columns?: number | 'auto' | 'auto-fit' | 'auto-fill';
  gridMinWidth?: string;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}
```

#### 4. `grid.tsx`

Update `extractGridConfig`:
```typescript
function extractGridConfig(layout?: Record<string, unknown>): GridLayoutConfig {
  if (!layout) {
    // NEW DEFAULT: auto-fit instead of 12
    return { columns: 'auto-fit', gap: 'md', align: 'stretch' };
  }

  return {
    columns: (layout.columns as ColumnSpec) ?? 'auto-fit',
    gap: (layout.gap as GapSize) ?? 'md',
    // ... rest
  };
}
```

### Phase 2: Row-Based Parsing (P1)

**Parser changes:**

1. Preserve NEWLINE tokens during children parsing
2. Build `gridRows: BlockAST[][]` structure
3. Infer columns from `gridRows[0].length`
4. Emit warning if row lengths inconsistent

**Scanner changes:**

None—NEWLINE already tokenized, just filtered in parser.

**Change in constructor:**
```typescript
// Instead of filtering all newlines, keep track of them for grid row detection
this.tokens = tokens.filter(t => t.type !== 'COMMENT');
// Handle NEWLINE specially in parseChildren for grids
```

### Phase 3: Alignment & Gap (P2)

**Modifier mapping in emitter:**

```typescript
// Flex modifiers for grid alignment
const gridAlignMap: Record<string, string> = {
  'c': 'center',      // ^c → justify-content: center
  'e': 'end',         // ^e → justify-content: end
  'sb': 'space-between',
  'sa': 'space-around',
};

// Size modifiers for gap
const gridGapMap: Record<string, GapSize> = {
  'xs': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'xl': 'xl',
};
```

### Phase 4: Empty Cell Placeholder (P3)

**Scanner addition:**
```typescript
// New token type
'PLACEHOLDER'  // Matches single underscore: _
```

**Parser handling:**
```typescript
if (this.check('PLACEHOLDER')) {
  this.advance();
  children.push({
    uid: this.generateUid(),
    type: 'grid-empty',
    bindings: [],
    modifiers: [],
    line: token.line,
  });
}
```

**Component:**
```typescript
// In component registry
export function GridEmpty(): React.ReactElement {
  return <div data-liquid-type="grid-empty" style={styles.empty} />;
}
```

---

## Syntax Reference (Complete)

```
GRID SYNTAX:
─────────────────────────────────────────────────────────

Gd [children]              → auto-fit responsive (DEFAULT)
Gd N [children]            → N fixed columns
Gd ~fit [children]         → explicit auto-fit
Gd ~fill [children]        → auto-fill (maintain size)
Gd ~Npx [children]         → auto-fit with N min-width

MODIFIERS:
─────────────────────────────────────────────────────────

%xs %sm %md %lg %xl        → gap size
^c ^e ^sb ^sa              → incomplete row alignment

CHILD MODIFIERS:
─────────────────────────────────────────────────────────

*N                         → column span N
*f                         → full width (span all)
*h                         → half width
*rN                        → row span N
*NrM                       → column span N, row span M

SPECIAL:
─────────────────────────────────────────────────────────

_                          → empty cell placeholder

ROW SYNTAX:
─────────────────────────────────────────────────────────

Gd [                       → newlines define rows
  Cd, Cd, Cd               → row 1 (defines 3 columns)
  Cd, Cd, Cd               → row 2
  Cd, Cd                   → row 3 (incomplete OK)
]
```

---

## Examples

### Dashboard KPIs
```
Gd 4 %lg [
  Kp :revenue
  Kp :orders
  Kp :customers
  Kp :conversion
]
```

### Responsive Cards
```
Gd ~250 [
  Cd :product1
  Cd :product2
  Cd :product3
  Cd :product4
  Cd :product5
]
```

### Mixed Layout with Spans
```
Gd 3 [
  Cd *f "Featured"           ← spans all 3 columns
  Cd, Cd, Cd
  Cd *2, Cd                  ← first spans 2, second spans 1
]
```

### Explicit Empty Cell
```
Gd 3 [
  Cd "A", Cd "B", Cd "C"
  Cd "D", _, Cd "F"          ← middle cell empty
]
```

### Row-Based Definition
```
Gd [
  Cd :a, Cd :b, Cd :c
  Cd :d, Cd :e, Cd :f
  Cd :g, Cd :h
]
→ 3 columns (inferred from first row)
→ last row has 1 empty cell (natural CSS Grid behavior)
```

---

## Testing Checklist

- [ ] `Gd [Cd, Cd, Cd]` renders as auto-fit
- [ ] `Gd 3 [Cd, Cd, Cd, Cd]` renders as 3 columns with overflow
- [ ] `Gd ~250 [...]` uses 250px min-width
- [ ] Newline rows infer column count from first row
- [ ] Incomplete last row leaves natural empty space
- [ ] `^c` centers incomplete row items
- [ ] `%lg` applies large gap
- [ ] `*2` spans child across 2 columns
- [ ] `*r2` spans child across 2 rows
- [ ] `_` renders empty placeholder cell
- [ ] Roundtrip: parse → emit → parse produces same AST

---

## Migration Notes

**Breaking change:** Default columns changes from 12 to auto-fit.

**Migration:** Existing `Gd [...]` blocks will now be responsive instead of 12-column fixed. To preserve old behavior:
```
Gd 12 [...]  → explicit 12 columns
```

Consider adding compiler warning for `Gd` without explicit columns during transition period.

---

## Out of Scope

- Masonry layout (use dedicated Masonry component if needed)
- CSS Grid areas/template syntax
- Subgrid
- Complex responsive breakpoints (rely on auto-fit/auto-fill)
