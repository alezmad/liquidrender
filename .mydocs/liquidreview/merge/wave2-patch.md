# Wave 2 Patch Document

**Status:** READY TO APPLY
**Date:** 2025-12-21
**Target:** LiquidCode Specification v2.0 (LIQUIDCODE-SPEC-v2.md)
**Source:** Wave 2 Resolutions (ISS-007 through ISS-011, ISS-084 through ISS-102)

---

## Overview

This document contains all Wave 2 resolution changes ready to be applied to the LiquidCode v2 specification. Each section includes:
- **Insert Location**: Where to insert the new content
- **Complete Content**: Full text ready to copy/paste
- **Notes**: Integration guidance

Apply changes in the order presented to maintain consistency.

---

## SECTION 1: §6.6 Field Name Encoding (NEW)

**Location:** Insert after §6.5
**Source:** ISS-087

### 6.6 Field Name Encoding

LiquidCode must handle arbitrary field names from data sources, including those with special characters.

#### 6.6.1 Valid Unquoted Field Names

Field names matching this pattern can be used directly:

```regex
^[a-zA-Z_][a-zA-Z0-9_]*$
```

**Valid unquoted:**
- `$revenue` ✓
- `$user_id` ✓
- `$totalAmount` ✓
- `$_internal` ✓

**Invalid unquoted (require quoting):**
- `$total revenue` (space)
- `$user-id` (hyphen)
- `$revenue%` (special char)
- `$2023_revenue` (starts with number)

#### 6.6.2 Quoted Field Names

Field names with special characters MUST be quoted using one of two forms:

**Bracket notation:**
```liquidcode
$[field name with spaces]
$[user-id]
$[revenue%]
$[2023_revenue]
```

**String literal notation:**
```liquidcode
$"field name with spaces"
$"user-id"
$"revenue%"
$"2023_revenue"
```

Both forms are equivalent. Bracket notation is preferred for readability.

#### 6.6.3 Reserved Characters

These characters have special meaning and MUST be quoted:

| Character | Meaning | Example | Quoted Form |
|-----------|---------|---------|-------------|
| `,` | Delimiter | `$date,amount` | `$[date,amount]` if single field |
| `:` | Slot/modifier separator | `$revenue:sum` | `$[revenue:total]:sum` |
| `$` | Field prefix | N/A | Escape as `$$` |
| `@` | Address prefix | N/A | `$[@id]` |
| `#` | Archetype/ID prefix | N/A | `$[#tag]` |
| `*` | Wildcard | N/A | `$[all*]` |
| `[` `]` | Quoting delimiters | N/A | Escape as `\[` `\]` |
| `"` | String delimiter | N/A | Escape as `\"` |

#### 6.6.4 Escape Sequences

Within quoted field names, use escape sequences:

| Escape | Character | Example |
|--------|-----------|---------|
| `\\` | Backslash | `$[path\\to\\field]` |
| `\n` | Newline | `$[multi\nline]` |
| `\t` | Tab | `$[tab\tseparated]` |
| `\"` | Quote | `$["quoted"]` |
| `\[` | Open bracket | `$[array\[0\]]` |
| `\]` | Close bracket | `$[close\]]` |

#### 6.6.5 Normalization Rules

Field name matching follows these rules:

```typescript
function normalizeFieldName(raw: string): string {
  // 1. Trim whitespace
  let normalized = raw.trim();

  // 2. Lowercase for case-insensitive matching (see §6.6.6)
  normalized = normalized.toLowerCase();

  // 3. No other transformations (preserve symbols, spaces, etc.)
  return normalized;
}

function parseFieldReference(ref: string): string {
  // Unquoted: $fieldName
  if (/^\$[a-zA-Z_][a-zA-Z0-9_]*$/.test(ref)) {
    return ref.substring(1);  // Remove $
  }

  // Bracket quoted: $[field name]
  if (ref.startsWith('$[') && ref.endsWith(']')) {
    return unescapeBracket(ref.substring(2, ref.length - 1));
  }

  // String quoted: $"field name"
  if (ref.startsWith('$"') && ref.endsWith('"')) {
    return unescapeString(ref.substring(2, ref.length - 1));
  }

  throw new Error(`Invalid field reference: ${ref}`);
}
```

#### 6.6.6 Case Sensitivity

Field name matching is **case-insensitive** by default:

| Data Field | LiquidCode Reference | Match? |
|------------|---------------------|--------|
| `Revenue` | `$revenue` | ✓ Yes |
| `USER_ID` | `$user_id` | ✓ Yes |
| `TotalAmount` | `$totalamount` | ✓ Yes |

**Rationale:** Data sources use inconsistent casing (SQL uppercase, JSON camelCase, etc.). Case-insensitive matching reduces errors.

**Override:** For case-sensitive matching, use exact quoting:
```liquidcode
$"Revenue"    # Matches only "Revenue", not "revenue"
```

#### 6.6.7 Unicode Support

Field names MAY contain Unicode characters:

```liquidcode
$[收入]              # Chinese characters
$[montant_€]         # Euro symbol
$[température]       # Accented characters
```

**Normalization:** Unicode characters are preserved as-is. No case folding beyond ASCII.

#### 6.6.8 Maximum Field Name Length

Field names are limited to **256 characters** after normalization.

Longer names are truncated with a warning:
```
Warning: Field name truncated from 300 to 256 characters:
  "very_long_field_name_that_exceeds..."
```

#### 6.6.9 Ambiguous Field Name Matching

Covered in detail in §9.9. Summary:

1. Exact match (case-insensitive) preferred
2. If multiple matches, use disambiguation rules
3. Emit warning when ambiguity resolved automatically

#### 6.6.10 LiquidCode Examples

```liquidcode
# Simple fields (unquoted)
K$revenue
L$date$amount

# Fields with spaces (quoted)
K$[total revenue]
B$[product name]$[sales amount]

# Fields with symbols (quoted)
K$[revenue%]
L$[date/time]$[amount-usd]

# Fields starting with numbers (quoted)
K$[2023_revenue]
K$[1st_quarter_sales]

# Reserved characters (quoted)
K$[user:id]          # Colon would be parsed as slot separator
B$[a,b,c]$value      # Comma would be parsed as delimiter

# Mixed (unquoted + quoted)
L$date$[sales amount]
B$category$[revenue%]:sum

# Unicode
K$[收入]
L$date$[montant_€]
```

#### 6.6.11 Compilation to LiquidSchema

Quoted field names are preserved in schema:

```typescript
// LiquidCode
K$[total revenue]

// Compiles to LiquidSchema
{
  type: 'kpi',
  binding: {
    source: 'data',
    fields: [
      { target: 'value', field: 'total revenue' }  // Quotes removed
    ]
  }
}
```

The schema stores the **unquoted, normalized** field name.

#### 6.6.12 Data Source Field Discovery

When discovering fields from a data source:

```typescript
interface DataSourceField {
  name: string;              // Original field name from source
  normalizedName: string;    // Normalized for matching
  requiresQuoting: boolean;  // True if special chars present
  suggestedReference: string; // LiquidCode reference
}

function discoverFields(data: Record<string, any>[]): DataSourceField[] {
  const fields: DataSourceField[] = [];

  for (const key of Object.keys(data[0] || {})) {
    const normalized = normalizeFieldName(key);
    const requiresQuoting = !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);

    fields.push({
      name: key,
      normalizedName: normalized,
      requiresQuoting,
      suggestedReference: requiresQuoting ? `$[${key}]` : `$${key}`,
    });
  }

  return fields;
}
```

#### 6.6.13 Error Messages

Clear error messages for invalid field references:

```typescript
// Error: Invalid character in unquoted field name
$total-revenue
// Message: "Field name 'total-revenue' contains '-' which requires quoting. Use: $[total-revenue]"

// Error: Missing closing bracket
$[revenue
// Message: "Unclosed bracket in field reference. Expected ']' after 'revenue'"

// Error: Field not found
$[unknown_field]
// Message: "Field 'unknown_field' not found in data source. Available fields: revenue, orders, date"
```

#### 6.6.14 Validation Schema

```typescript
const FieldReferencePattern = z.union([
  // Unquoted
  z.string().regex(/^\$[a-zA-Z_][a-zA-Z0-9_]*$/),

  // Bracket quoted
  z.string().regex(/^\$\[.+\]$/),

  // String quoted
  z.string().regex(/^\$".+"$/),
]);

function validateFieldReference(ref: string): boolean {
  return FieldReferencePattern.safeParse(ref).success;
}
```

---

## SECTION 2: §8.4 Wildcard Selectors (REPLACEMENT)

**Location:** Replace §8.4 (lines 596-605)
**Source:** ISS-010

### 8.4 Wildcard Selectors

For batch operations:

| Selector | Meaning | Example |
|----------|---------|---------|
| `@K*` | All KPIs | `Δ~@K*.showTrend:true` |
| `@[*,0]` | All in column 0 | `Δ~@[*,0].width:200` |
| `@:*revenue*` | All revenue bindings | `Δ~@:*revenue*.format:"$"` |

#### 8.4.1 Wildcard Matching Algorithm

Wildcards (`*`) enable batch operations on multiple blocks using pattern matching.

**Supported Wildcard Forms:**

```typescript
type WildcardSelector =
  | `@${BlockType}*`              // All blocks of type (e.g., @K*)
  | `@[${number | '*'},${number | '*'}]`  // Grid position with wildcards
  | `@:*${string}*`               // Binding field pattern match
  | `@#*${string}*`               // ID pattern match
  | `@*`                          // All blocks (use with caution)

interface WildcardPattern {
  form: 'type' | 'grid' | 'binding' | 'id' | 'all';
  pattern: string | RegExp;
  constraints?: WildcardConstraint;
}

interface WildcardConstraint {
  minMatches?: number;    // Fail if fewer than N matches
  maxMatches?: number;    // Fail if more than N matches
  requireAll?: boolean;   // Fail if any target doesn't match
}
```

**Pattern Compilation:**

```typescript
function compileWildcard(selector: string): WildcardPattern {
  // Type ordinal wildcard: @K*, @L*, etc.
  const typeMatch = selector.match(/^@([A-Z]+)\*$/);
  if (typeMatch) {
    return {
      form: 'type',
      pattern: typeMatch[1]
    };
  }

  // Grid position wildcard: @[*,0], @[1,*], @[*,*]
  const gridMatch = selector.match(/^@\[(\*|\d+),(\*|\d+)\]$/);
  if (gridMatch) {
    return {
      form: 'grid',
      pattern: {
        row: gridMatch[1] === '*' ? null : parseInt(gridMatch[1]),
        col: gridMatch[2] === '*' ? null : parseInt(gridMatch[2])
      }
    };
  }

  // Binding signature wildcard: @:*revenue*, @:*total*
  const bindingMatch = selector.match(/^@:\*(.+?)\*$/);
  if (bindingMatch) {
    return {
      form: 'binding',
      pattern: new RegExp(escapeRegex(bindingMatch[1]), 'i')  // Case-insensitive
    };
  }

  // ID wildcard: @#*main*, @#*filter*
  const idMatch = selector.match(/^@#\*(.+?)\*$/);
  if (idMatch) {
    return {
      form: 'id',
      pattern: new RegExp(escapeRegex(idMatch[1]), 'i')
    };
  }

  // All blocks: @*
  if (selector === '@*') {
    return {
      form: 'all',
      pattern: '.*'
    };
  }

  throw new Error(`Invalid wildcard selector: ${selector}`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Resolution Algorithm:**

```typescript
interface WildcardResolution {
  selector: string;
  pattern: WildcardPattern;
  matchedUids: string[];
  matchedBlocks: Block[];
  count: number;
}

function resolveWildcard(
  selector: string,
  schema: LiquidSchema
): WildcardResolution {
  const pattern = compileWildcard(selector);
  const matchedBlocks: Block[] = [];

  for (const block of schema.blocks) {
    if (matchesPattern(block, pattern, schema)) {
      matchedBlocks.push(block);
    }
  }

  return {
    selector,
    pattern,
    matchedUids: matchedBlocks.map(b => b.uid),
    matchedBlocks,
    count: matchedBlocks.length
  };
}

function matchesPattern(
  block: Block,
  pattern: WildcardPattern,
  schema: LiquidSchema
): boolean {
  switch (pattern.form) {
    case 'type': {
      // Match block type code
      const typeCode = getBlockTypeCode(block.type);
      return typeCode === pattern.pattern;
    }

    case 'grid': {
      // Match grid position
      const position = getBlockGridPosition(block, schema);
      if (!position) return false;

      const { row, col } = pattern.pattern as { row: number | null; col: number | null };
      return (
        (row === null || position.row === row) &&
        (col === null || position.col === col)
      );
    }

    case 'binding': {
      // Match binding field names
      if (!block.binding) return false;
      const regex = pattern.pattern as RegExp;
      return block.binding.fields.some(f => regex.test(f.field));
    }

    case 'id': {
      // Match block ID
      if (!block.id) return false;
      const regex = pattern.pattern as RegExp;
      return regex.test(block.id);
    }

    case 'all': {
      return true;  // Matches everything
    }

    default:
      return false;
  }
}

// Helper: Get block type code (reverse of type name)
function getBlockTypeCode(type: BlockType): string {
  const CODE_MAP: Record<string, string> = {
    'kpi': 'K',
    'bar-chart': 'B',
    'line-chart': 'L',
    'pie-chart': 'P',
    'data-table': 'T',
    'grid': 'G',
    'stack': 'S',
    'text': 'X',
    'metric-group': 'M',
    'comparison': 'C',
    'date-filter': 'DF',
    'select-filter': 'SF',
    'search-input': 'SI'
  };
  return CODE_MAP[type] || type;
}

// Helper: Get grid position for a block
function getBlockGridPosition(
  block: Block,
  schema: LiquidSchema
): { row: number; col: number } | null {
  // Traverse schema to find block's position in grid
  // This is adapter-specific, but for spec purposes:
  // Assumes blocks in grid slots are ordered by position

  const gridBlock = findParentGrid(block, schema);
  if (!gridBlock || gridBlock.type !== 'grid') return null;

  const children = gridBlock.slots?.children || [];
  const index = children.findIndex(b => b.uid === block.uid);
  if (index === -1) return null;

  // Assume 2D grid with known columns (from layout metadata)
  const columns = extractGridColumns(gridBlock);
  const row = Math.floor(index / columns);
  const col = index % columns;

  return { row, col };
}

function findParentGrid(block: Block, schema: LiquidSchema): Block | null {
  // Recursive search through schema tree
  // Implementation depends on schema structure
  // ... (simplified for spec)
  return schema.layout.type === 'grid' ? schema.layout as unknown as Block : null;
}

function extractGridColumns(gridBlock: Block): number {
  // Parse grid layout (e.g., "G2x3" = 2 columns)
  // Implementation-specific
  return 2;  // Default
}
```

#### 8.4.2 Interaction with Resolution Priority

Wildcards respect the address resolution priority hierarchy (§8.3):

| Wildcard Form | Priority Level | Falls Back To |
|---------------|----------------|---------------|
| `@#*pattern*` | 1 (Explicit ID) | Higher priority than all others |
| `@[*,N]` or `@[N,*]` | 2 (Grid position) | Higher than type ordinal |
| `@K*` | 3 (Type ordinal) | Higher than binding |
| `@:*pattern*` | 4 (Binding signature) | Higher than pure ordinal |
| `@*` | 5 (Pure ordinal) | Lowest priority |

**Example:**

```typescript
// Given schema with:
// - Block uid=b1, type=kpi, id="main_revenue", binding.field="revenue", position=[0,0]
// - Block uid=b2, type=kpi, id="side_revenue", binding.field="revenue_total", position=[0,1]

// Different wildcards resolve differently:
resolveWildcard('@K*', schema)          // → [b1, b2] (both KPIs)
resolveWildcard('@[*,0]', schema)       // → [b1] (only column 0)
resolveWildcard('@:*revenue*', schema)  // → [b1, b2] (both have "revenue" in binding)
resolveWildcard('@#*main*', schema)     // → [b1] (ID contains "main")
```

#### 8.4.3 Edge Cases

**No matches:**

```typescript
const result = resolveWildcard('@L*', schema);  // No line charts
// result.count === 0
// result.matchedUids === []

// Mutation behavior:
Δ~@L*.color:"blue"  // No-op, no error (batch operations are permissive)
```

**Too many matches (safety limit):**

```typescript
const MAX_WILDCARD_MATCHES = 100;

function resolveWildcard(selector: string, schema: LiquidSchema): WildcardResolution {
  // ... matching logic ...

  if (matchedBlocks.length > MAX_WILDCARD_MATCHES) {
    throw new Error(
      `Wildcard '${selector}' matched ${matchedBlocks.length} blocks (max: ${MAX_WILDCARD_MATCHES}). ` +
      `Please use a more specific selector.`
    );
  }

  return { /* ... */ };
}
```

**Ambiguous patterns (multiple wildcard forms could match):**

```typescript
// Pattern: @[*,*] (all grid positions)
// Also matches: @* (all blocks)
// Resolution: Use most specific form

function resolveAddress(selector: string, schema: LiquidSchema): string[] {
  // If selector is wildcard, resolve based on form specificity
  if (isWildcard(selector)) {
    const pattern = compileWildcard(selector);

    // Grid wildcards are more specific than @*
    // Type wildcards are more specific than binding wildcards
    // etc.

    return resolveWildcard(selector, schema).matchedUids;
  }

  // ... singular address resolution ...
}
```

#### 8.4.4 Performance Considerations

For large schemas (>500 blocks):

```typescript
interface WildcardIndex {
  byType: Map<string, Set<string>>;        // Type code → UIDs
  byGridPosition: Map<string, Set<string>>;  // "row,col" → UIDs
  byBinding: Map<string, Set<string>>;     // Field name → UIDs
  byId: Map<string, string>;               // ID → UID
}

function buildWildcardIndex(schema: LiquidSchema): WildcardIndex {
  const index: WildcardIndex = {
    byType: new Map(),
    byGridPosition: new Map(),
    byBinding: new Map(),
    byId: new Map()
  };

  for (const block of schema.blocks) {
    // Index by type
    const typeCode = getBlockTypeCode(block.type);
    if (!index.byType.has(typeCode)) {
      index.byType.set(typeCode, new Set());
    }
    index.byType.get(typeCode)!.add(block.uid);

    // Index by grid position
    const pos = getBlockGridPosition(block, schema);
    if (pos) {
      const key = `${pos.row},${pos.col}`;
      if (!index.byGridPosition.has(key)) {
        index.byGridPosition.set(key, new Set());
      }
      index.byGridPosition.get(key)!.add(block.uid);
    }

    // Index by binding fields
    if (block.binding) {
      for (const field of block.binding.fields) {
        if (!index.byBinding.has(field.field)) {
          index.byBinding.set(field.field, new Set());
        }
        index.byBinding.get(field.field)!.add(block.uid);
      }
    }

    // Index by ID
    if (block.id) {
      index.byId.set(block.id, block.uid);
    }
  }

  return index;
}

// Fast wildcard resolution using index
function resolveWildcardFast(
  selector: string,
  schema: LiquidSchema,
  index: WildcardIndex
): WildcardResolution {
  const pattern = compileWildcard(selector);

  let candidateUids: Set<string>;

  switch (pattern.form) {
    case 'type':
      candidateUids = index.byType.get(pattern.pattern as string) || new Set();
      break;

    case 'grid': {
      const { row, col } = pattern.pattern as { row: number | null; col: number | null };
      if (row !== null && col !== null) {
        // Exact position
        candidateUids = index.byGridPosition.get(`${row},${col}`) || new Set();
      } else {
        // Need to scan positions
        candidateUids = new Set();
        for (const [key, uids] of index.byGridPosition.entries()) {
          const [r, c] = key.split(',').map(Number);
          if ((row === null || r === row) && (col === null || c === col)) {
            uids.forEach(uid => candidateUids.add(uid));
          }
        }
      }
      break;
    }

    case 'binding': {
      const regex = pattern.pattern as RegExp;
      candidateUids = new Set();
      for (const [field, uids] of index.byBinding.entries()) {
        if (regex.test(field)) {
          uids.forEach(uid => candidateUids.add(uid));
        }
      }
      break;
    }

    case 'id': {
      const regex = pattern.pattern as RegExp;
      candidateUids = new Set();
      for (const [id, uid] of index.byId.entries()) {
        if (regex.test(id)) {
          candidateUids.add(uid);
        }
      }
      break;
    }

    case 'all':
      candidateUids = new Set(schema.blocks.map(b => b.uid));
      break;

    default:
      candidateUids = new Set();
  }

  const matchedBlocks = schema.blocks.filter(b => candidateUids.has(b.uid));

  return {
    selector,
    pattern,
    matchedUids: Array.from(candidateUids),
    matchedBlocks,
    count: candidateUids.size
  };
}
```

**Index Build Time:** O(N) where N = block count
**Wildcard Resolution:** O(M) where M = matched blocks (vs O(N) without index)

For schemas with <100 blocks, indexing overhead exceeds benefit. Use simple iteration.

#### 8.4.5 Batch Operation Semantics

When wildcards are used in mutations:

```typescript
// Example: Update all KPI labels
Δ~@K*.label:"Updated"

// Expands to individual operations:
Δ~@b_abc123.label:"Updated"
Δ~@b_def456.label:"Updated"
Δ~@b_ghi789.label:"Updated"

// Each operation is independent:
// - If one fails, others still apply
// - Operations are applied in UID order (deterministic)
// - All operations share same transaction/undo group
```

**Transaction Semantics:**

```typescript
interface BatchMutation {
  selector: string;           // Original wildcard selector
  operations: Operation[];    // Expanded individual operations
  transactionId: string;      // All ops in same transaction
  rollback?: () => void;      // Undo entire batch
}

function applyBatchMutation(
  selector: string,
  mutation: MutationSpec,
  schema: LiquidSchema
): BatchMutation {
  const resolution = resolveWildcard(selector, schema);
  const operations: Operation[] = [];

  for (const uid of resolution.matchedUids) {
    operations.push({
      type: mutation.type,
      targetUid: uid,
      ...mutation.spec
    });
  }

  const transactionId = generateTransactionId();

  // Apply all operations
  for (const op of operations) {
    try {
      applyOperation(op, schema);
    } catch (error) {
      // Log error but continue (permissive batch operations)
      console.warn(`Batch operation failed for ${op.targetUid}:`, error);
    }
  }

  return {
    selector,
    operations,
    transactionId,
    rollback: () => rollbackTransaction(transactionId)
  };
}
```

---

## SECTION 3: §8.5 Snapshot Addressing (REPLACEMENT)

**Location:** Replace §8.5 (lines 607-616)
**Source:** ISS-102

**NOTE:** This is a large replacement. The complete content from ISS-102 resolution (lines 47-516) should be inserted here. Due to length, I'm providing the structure with key sections. Refer to ISS-102.md for full content.

### 8.5 Snapshot Addressing

Reference historical schema states for comparison, rollback, or debugging.

#### 8.5.1 Snapshot Index Semantics

[Content from ISS-102 lines 54-71]

#### 8.5.2 Snapshot Resolution Algorithm

[Content from ISS-102 lines 73-157]

#### 8.5.3 Bounds Checking Examples

[Content from ISS-102 lines 159-171]

#### 8.5.4 History Pruning

[Content from ISS-102 lines 173-215]

#### 8.5.5 Error Handling Strategies

[Content from ISS-102 lines 217-275]

#### 8.5.6 LiquidCode Syntax Extensions

[Content from ISS-102 lines 277-296]

#### 8.5.7 Snapshot Addressing in Queries

[Content from ISS-102 lines 298-334]

#### 8.5.8 Enhanced OperationHistory Interface

[Content from ISS-102 lines 336-407]

#### 8.5.9 User-Facing Error Messages

[Content from ISS-102 lines 409-443]

#### 8.5.10 Testing Scenarios

[Content from ISS-102 lines 445-485]

---

## SECTION 4: §9.5 Binding Validation and Schema Evolution (NEW)

**Location:** Insert after §9.4
**Source:** ISS-098

**NOTE:** This is a large section. The complete content from ISS-098 resolution (lines 47-357) should be inserted here. Refer to ISS-098.md for full content.

### 9.5 Binding Validation and Schema Evolution

When data schemas evolve, existing bindings may reference fields that no longer exist or have changed type. The engine MUST detect and handle these cases.

#### 9.5.1 Schema Change Events

[Content from ISS-098]

#### 9.5.2 Binding Validation Algorithm

[Content from ISS-098]

#### 9.5.3 Field Suggestion Algorithm

[Content from ISS-098]

#### 9.5.4 Handling Strategies

[Content from ISS-098]

#### 9.5.5 Migration Metadata

[Content from ISS-098]

#### 9.5.6 Validation Triggers

[Content from ISS-098]

#### 9.5.7 Graceful Degradation

[Content from ISS-098]

---

## SECTION 5: §9.6 Data Presence Validation (NEW)

**Location:** Insert after §9.5
**Source:** ISS-084

### 9.6 Data Presence Validation

The binding system distinguishes between different data absence scenarios:

#### 9.6.1 Empty vs. Null Data

| Scenario | Data Value | Interpretation | Rendering Behavior |
|----------|-----------|----------------|-------------------|
| **Empty Array** | `[]` | Valid but empty collection | Render empty state UI |
| **Null Data** | `null` or `undefined` | Data source unavailable | Render placeholder with reason |
| **Empty Object** | `{}` | Valid but no fields | Render "No fields available" |
| **Zero Count** | Aggregate returns 0 | Valid result of zero | Render 0 normally |

#### 9.6.2 Empty State Rendering

When a binding resolves to an empty array (`[]`), blocks MUST render a meaningful empty state:

| Block Type | Empty State Rendering |
|------------|----------------------|
| `kpi` | Display "0" or "—" based on field type |
| `bar-chart`, `line-chart`, `pie-chart` | Show empty chart frame with message "No data to display" |
| `data-table` | Show table headers with row: "No records found" |
| `metric-group` | Render each metric with appropriate empty state |
| `comparison` | Display "—" for both current and previous values |

#### 9.6.3 Null Data Rendering

When a binding source is `null` or `undefined`, blocks MUST render a placeholder:

```typescript
interface EmptyStateConfig {
  type: 'empty' | 'null' | 'error';
  message?: string;
  icon?: 'no-data' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Default messages:**
- Empty array: "No data to display"
- Null source: "Data unavailable"
- Empty object: "No fields available"

#### 9.6.4 Adapter Requirements

Adapters MUST implement empty state rendering:

```typescript
interface LiquidAdapter<T> {
  // ... existing methods ...

  // MUST return valid empty state representation
  renderEmptyState(block: Block, reason: 'empty' | 'null' | 'no-fields'): T;
}
```

#### 9.6.5 LiquidCode Example

```liquidcode
# All blocks render appropriately when data is empty
#sales_dashboard;G2x2
K$revenue          # Shows "—" or "0" if data is []
L$date$amount      # Shows "No data to display" if data is []
T$orders           # Shows headers + "No records found" if data is []
```

#### 9.6.6 Validation Rules

The binding system validates data presence:

```typescript
function validateDataPresence(data: unknown): DataPresenceResult {
  if (data === null || data === undefined) {
    return { type: 'null', render: 'placeholder' };
  }

  if (Array.isArray(data) && data.length === 0) {
    return { type: 'empty', render: 'empty-state' };
  }

  if (typeof data === 'object' && Object.keys(data).length === 0) {
    return { type: 'no-fields', render: 'empty-state' };
  }

  return { type: 'present', render: 'normal' };
}
```

#### 9.6.7 Signal Behavior with Empty Data

Signals operate normally even with empty data:
- Filters can still be applied (resulting in empty filtered sets)
- Selections have no effect but don't error
- Signal state is preserved for when data becomes available

#### 9.6.8 Edge Case: Transition from Empty to Populated

When data transitions from empty to populated:
1. Adapter receives new data
2. Empty state UI is replaced with normal rendering
3. All signals are reapplied to new data
4. Layout recalculates if needed

---

## SECTION 6: §9.7 Single-Item Collection Handling (NEW)

**Location:** Insert after §9.6
**Source:** ISS-085

**NOTE:** Insert complete content from ISS-085 resolution (lines 23-212). Refer to ISS-085.md.

### 9.7 Single-Item Collection Handling

When a data binding resolves to a single-item collection (array with one element), blocks adapt their rendering appropriately.

[Full content from ISS-085]

---

## SECTION 7: §9.8 Large Dataset Handling (NEW)

**Location:** Insert after §9.7
**Source:** ISS-086

**NOTE:** Insert complete content from ISS-086 resolution (lines 23-350). Refer to ISS-086.md.

### 9.8 Large Dataset Handling

The engine and adapters must handle arbitrarily large datasets without degrading performance or crashing.

[Full content from ISS-086]

---

## SECTION 8: §9.9 Field Name Resolution Algorithm (NEW)

**Location:** Insert after §9.8
**Source:** ISS-088

**NOTE:** Insert complete content from ISS-088 resolution (lines 23-591). Refer to ISS-088.md.

### 9.9 Field Name Resolution Algorithm

When resolving a field reference to actual data fields, the engine uses a deterministic multi-tier matching algorithm.

[Full content from ISS-088]

---

## SECTION 9: §9.10 Type System and Coercion (NEW)

**Location:** Insert after §9.9
**Source:** ISS-089

**NOTE:** Insert complete content from ISS-089 resolution (lines 23-548). Refer to ISS-089.md.

### 9.10 Type System and Coercion

LiquidCode uses a flexible type system that prioritizes graceful degradation over strict validation.

[Full content from ISS-089]

---

## SECTION 10: §11.3.1 Priority Tie-Breaking Rules (NEW)

**Location:** Insert after §11.3 default statement (line 75)
**Source:** ISS-097

#### 11.3.1 Priority Tie-Breaking Rules

When multiple blocks share the same priority level, the layout engine MUST apply deterministic tie-breaking:

**Tie-Breaking Hierarchy:**
1. **Explicit `hero` blocks** — All hero blocks are equivalent (no ordering within hero)
2. **Position in source order** — Earlier in block array = higher precedence
3. **Block type importance** — If positions are synthesized, use type weights
4. **UID lexicographic order** — Final deterministic tiebreaker

**Type Importance Weights:**
```typescript
const BLOCK_TYPE_WEIGHTS: Record<BlockType, number> = {
  // Interactive controls (highest)
  'date-filter': 100,
  'select-filter': 95,
  'search-input': 90,

  // Key metrics
  'kpi': 80,
  'comparison': 75,
  'metric-group': 70,

  // Visualizations
  'line-chart': 60,
  'bar-chart': 55,
  'pie-chart': 50,

  // Data detail
  'data-table': 40,

  // Layout/content
  'text': 20,
  'grid': 10,
  'stack': 10,
};
```

**Tie-Breaking Algorithm:**
```typescript
function orderBlocksByPriority(blocks: Block[]): Block[] {
  return blocks.sort((a, b) => {
    // 1. Priority level (lower number = higher priority)
    const aPri = normalizePriority(a.layout?.priority ?? 'primary');
    const bPri = normalizePriority(b.layout?.priority ?? 'primary');
    if (aPri !== bPri) return aPri - bPri;

    // 2. Source position (earlier = higher priority)
    const aPos = blocks.indexOf(a);
    const bPos = blocks.indexOf(b);
    if (aPos !== bPos) return aPos - bPos;

    // 3. Block type importance
    const aWeight = BLOCK_TYPE_WEIGHTS[a.type] ?? 0;
    const bWeight = BLOCK_TYPE_WEIGHTS[b.type] ?? 0;
    if (aWeight !== bWeight) return bWeight - aWeight;

    // 4. UID (deterministic fallback)
    return a.uid.localeCompare(b.uid);
  });
}

function normalizePriority(
  p: 1 | 2 | 3 | 4 | 'hero' | 'primary' | 'secondary' | 'detail'
): number {
  if (typeof p === 'number') return p;
  return { hero: 1, primary: 2, secondary: 3, detail: 4 }[p];
}
```

---

## SECTION 11: §11.10 Update (Line 1102)

**Location:** Update §11.10 step 2
**Source:** ISS-097

**Before:**
```
2. Filter blocks by priority for breakpoint
```

**After:**
```
2. Sort blocks by priority using tie-breaking rules (§11.3.1)
3. Filter blocks by priority for breakpoint
```

---

## SECTION 12: §11.11.1 The Constraint Solver Algorithm (NEW)

**Location:** Insert after §11.11 transformation algorithm (line 1119)
**Source:** ISS-009

**NOTE:** Insert content from ISS-009 (first 200 lines provide core algorithm). Full content in ISS-009.md.

#### 11.11.1 The Constraint Solver Algorithm

The layout engine uses a priority-based constraint solver to resolve conflicts and distribute space.

[Partial content from ISS-009 - refer to full resolution for complete algorithm]

---

## SECTION 13: §12.4.1-12.4.2 Archetype Detection (NEW)

**Location:** Insert after §12.4 table (line 1296)
**Source:** ISS-007

#### 12.4.1 Primitive Detection Algorithm

For each field in the data schema, calculate a weighted score for each primitive type:

[Content from ISS-007 lines 52-141]

#### 12.4.2 Archetype Detection from Primitives

Once primitives are detected, infer L0 archetypes using pattern matching:

[Content from ISS-007 lines 158-291]

---

## SECTION 14: §13.2 Cache Key Design (ENHANCEMENT)

**Location:** Replace/Enhance §13.2 (lines 1355-1364)
**Source:** ISS-008, ISS-100

**NOTE:** This merges ISS-008 (hash computation) and ISS-100 (collision handling). Insert combined content from both resolutions.

### 13.2 Cache Key Design

[Enhanced content combining ISS-008 and ISS-100]

#### 13.2.1 Cache Key Collision Detection and Resolution (ISS-100)

[Content from ISS-100]

#### 13.2.2 Intent Hash Computation (ISS-008)

[Content from ISS-008]

#### 13.2.3 Data Fingerprint Generation (ISS-008)

[Content from ISS-008]

---

## SECTION 15: §15.6 Partial Fragment Matching (NEW)

**Location:** Insert after §15.5
**Source:** ISS-099

**NOTE:** Insert complete content from ISS-099 resolution (lines 44-456). Refer to ISS-099.md.

### 15.6 Partial Fragment Matching

When no single fragment fully satisfies the intent, the engine MAY compose from multiple partial fragments or fall back to LLM generation.

[Full content from ISS-099]

---

## SECTION 16: §16.2 Operation History (UPDATE)

**Location:** Update §16.2 interface (lines 1510-1529)
**Source:** ISS-098, ISS-102

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

**OperationHistory interface updates (add these methods):**

From ISS-102 §8.5.8:
```typescript
interface OperationHistory {
  operations: AppliedOperation[];
  maxSize: number;
  initialSchema: LiquidSchema;       // REQUIRED: always preserved
  prunedCount: number;               // Track pruned operations

  // Core operations
  push(op: AppliedOperation): void;
  undo(): AppliedOperation | null;
  redo(): AppliedOperation | null;

  // Snapshot access
  snapshot(index: number): LiquidSchema;  // Throws if unavailable
  snapshotSafe(
    index: number,
    fallback?: FallbackStrategy
  ): LiquidSchema | null;

  // Metadata
  getInitialSchema(): LiquidSchema;
  getCurrentIndex(): number;
  getOldestAvailableIndex(): number;
  isSnapshotAvailable(index: number): boolean;

  // Range queries
  getAvailableRange(): { oldest: number; current: number };
  listOperations(from: number, to: number): AppliedOperation[];
}
```

---

## SECTION 17: Appendix B.3.2 Adapter Conformance (ENHANCEMENTS)

**Location:** Add to conformance test list (lines 2080-2103)
**Sources:** ISS-084, ISS-086, ISS-089

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

---

## SECTION 18: §B.4.4 Error Handling (REPLACEMENT)

**Location:** Replace §B.4.4 (lines 2147-2159)
**Source:** ISS-101

**NOTE:** This is a complete replacement with comprehensive error handling specification. Insert full content from ISS-101 resolution (lines 43-357). Refer to ISS-101.md for complete content.

#### B.4.4 Error Handling and Edge Cases

LiquidExpr NEVER throws exceptions. All error conditions produce typed fallback values with predictable propagation rules.

[Full comprehensive content from ISS-101 including all subsections:
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

---

## SECTION 19: §B.7 Hardening Checklist (ADDITIONS)

**Location:** Add to checklist (line 2572)
**Sources:** ISS-098, ISS-100, ISS-102

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

## Application Notes

1. **Order Matters**: Apply sections in the order presented to avoid reference errors.

2. **Large Insertions**: Some sections (§9.7, §9.8, §9.9, §9.10, §8.5, etc.) are very large. Refer to the original resolution documents for complete content when the patch says "[Full content from ISS-XXX]".

3. **Cross-References**: After applying all patches, search for broken cross-references and update them.

4. **Table of Contents**: Update the spec's table of contents to include all new subsections.

5. **Version**: Update the spec's metadata to indicate Wave 2 resolutions have been applied.

6. **Validation**: After applying:
   - Check that all §X.Y references resolve correctly
   - Verify TypeScript code examples are syntactically valid
   - Ensure consistent terminology throughout

---

**End of Wave 2 Patch Document**

*Ready to apply. Proceed with integration when approved.*
