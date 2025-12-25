# Complex LiquidCode Layouts - Quick Reference

5 verified complex layout snippets for copy-paste use.

---

## Snippet 1: Multi-row Grid Dashboard

**Use Case:** Dashboard with fixed KPIs and flexible charts

```liquid
Gd ^r [
  Kp :revenue, Kp :orders
  Ln :trend ^g
  Br :comparison ^g
  Pi :distribution ^g
]
```

**Features:** Grid, flex-row, growing charts, mixed types
**Test Status:** ✓ PASS

---

## Snippet 2: Sidebar + Content Split

**Use Case:** Fixed sidebar navigation/filters with growing main content

```liquid
Sp *h ^f [
  Dw [Tx "Filters" ^c]
  Sk ^g [
    Br :monthly ^g
    Ln :daily ^g
    Tb :details [:id :amount :date] ^g
  ]
]
```

**Features:** Split pane, half-width fixed sidebar, nested stack
**Test Status:** ✓ PASS

---

## Snippet 3: Filtered Data Stack

**Use Case:** Form with signal-driven filtering on table results

```liquid
@filter
Sk [
  Fm ^c [
    In :search <>filter
    Se :category <>filter
    Bt "Apply" >filter
  ]
  Tb :results <filter ^g [:id :name :type]
  Tx "Apply filters to view data" ^c
]
```

**Features:** Signals, bidirectional binding, signal receiving, forms
**Test Status:** ✓ PASS

---

## Snippet 4: Priority Dashboard

**Use Case:** Multi-tier dashboard with hero section and alerts

```liquid
Gd ^r [
  0 !h ^g [Kp :revenue, Kp :growth, Kp :target]
  Br :monthly !p ^g *f
  Sk !s ^c [
    8 :alert1 #red
    8 :alert2 #yellow
  ]
]
```

**Features:** Priority modifiers, color styling, full-width span
**Test Status:** ✓ PASS

---

## Snippet 5: List + Modal Editor

**Use Case:** Split view with item list and modal for editing

```liquid
@edit
Sp ^f [
  Ls :items [8 :.id :.name >item]
  Sk ^g [
    Kp :itemCount
    Tb :itemData [:id :name :status] ^g
  ]
]
/1 9 [
  Fm [
    In :title
    Se :status
    Bt "Save" !submit, Bt "Close" /<
  ]
]
```

**Features:** Signals, split pane, lists, layers, modals
**Test Status:** ✓ PASS

---

## Modifier Reference

### Flex Modifiers
```
^r   Flex row (horizontal)
^g   Grow (fill available space)
^c   Collapse (minimize)
^f   Fixed (no flex)
^s   Shrink (smaller)
```

### Span Modifiers
```
*h   Half-width
*f   Full-width
*t   Third-width
*q   Quarter-width
*1-9 Column span (1-9)
```

### Priority Modifiers
```
!h   Hero (highest importance)
!p   Primary
!s   Secondary
!0-9 Numeric priority
```

### Signal Operators
```
@sig       Declare signal
>sig       Emit signal
<sig       Receive signal
<>sig      Bidirectional
```

### Layer Operators
```
/1         Define layer 1
>/1        Open layer 1
/<         Close current layer
```

### Style Modifiers
```
#red       Red color
#yellow    Yellow color
#green     Green color
#blue      Blue color
#gray      Gray color
```

---

## Layout Types Quick Matrix

| Type | Use | Example |
|------|-----|---------|
| `Gd` | Grid layout | Multi-column dashboards |
| `Sp` | Side-by-side split | Sidebar + content |
| `Sk` | Vertical/horizontal stack | Stacked components |
| `Ls` | Repeating list | Item lists |
| `Dw` | Side drawer | Filter panels |
| `Fm` | Form container | Input groups |
| `0` | Generic container | Grouping |
| `9` | Modal | Dialogs |

---

## Common Patterns

### Dashboard (Snippet 1)
```liquid
Gd ^r [
  Kp :kpi1, Kp :kpi2
  Ln :chart1 ^g
  Br :chart2 ^g
]
```

### Sidebar (Snippet 2)
```liquid
Sp *h ^f [
  Dw [/* filters */]
  Sk ^g [/* content */]
]
```

### Filtered Table (Snippet 3)
```liquid
@filter
Sk [
  Fm [In :search <>filter]
  Tb :data <filter ^g
]
```

### Priority Stack (Snippet 4)
```liquid
Gd ^r [
  0 !h [/* hero */]
  Br :main !p ^g *f
  Sk !s ^c [/* alerts */]
]
```

### Modal Edit (Snippet 5)
```liquid
@sig
Sp [
  Ls :items [8 >sig]
  Sk ^g [Tb :data]
]
/1 9 [Fm [/* edit form */]]
```

---

## Testing These Snippets

Run with TypeScript/Node:

```typescript
import { parseUI, roundtripUI } from './src/compiler/ui-compiler';

const snippet = `
  Gd ^r [
    Kp :revenue, Kp :orders
    Ln :trend ^g
  ]
`;

const schema = parseUI(snippet);
const { isEquivalent } = roundtripUI(schema);
console.log(isEquivalent ? 'PASS' : 'FAIL');
```

Or run the full test suite:
```bash
npx tsx test-layouts-final.ts
```

---

## Key Notes

1. **All snippets verified:** All 5 snippets pass parse + roundtrip verification
2. **Production ready:** Use for real dashboards and forms
3. **Composable:** Mix and match these patterns
4. **Signal-driven:** Patterns 3 & 5 show reactive architecture
5. **Layer support:** Pattern 5 shows modal/drawer interactions

---

*Last Updated: 2025-12-24*
*All Tests: ✓ PASS (5/5)*
