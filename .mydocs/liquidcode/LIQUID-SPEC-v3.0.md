# Liquid v3.0 Specification

**One language. Maximum compression. Full expressiveness.**

---

## §0 Design Principles

1. **Common case fast, rare case possible**
2. **Indices when known, literals when novel**
3. **Position encodes meaning, symbols escape position**
4. **Schema is context, not content**

---

## §1 The Unified Grammar

```
Program     := Statement+
Statement   := Block | Mutation | Route

Block       := Type Binding* Modifier* Children?
Type        := Index | Code
Binding     := Index | Field | Expr
Modifier    := Layout | Signal | Style
Children    := '[' Block+ ']'

Index       := [0-9]+
Code        := [A-Z][a-z]?
Field       := ':' Name
Expr        := '=' Expression
Name        := [a-z_][a-zA-Z0-9_]*
String      := '"' [^"]* '"'

Layout      := '!' Priority | '^' Flex | '*' Span
Signal      := '>' Emit | '<' Recv | '<>' Both
Style       := '#' Color | '%' Size

Mutation    := Op Target Value?
Op          := '+' | '-' | '~' | '^'
Target      := '@' Index

Route       := '/' Index
```

**Key insight:** Indices are always single tokens. Names/strings cost more. Use indices when referencing known things, literals when creating novel things.

---

## §2 The Type System

### §2.1 Indexed Types (Pre-registered)

Single digit = common block type:

| Index | Type | Description |
|-------|------|-------------|
| `0` | container | Generic container/div |
| `1` | kpi | Key performance indicator |
| `2` | bar | Bar chart |
| `3` | line | Line chart |
| `4` | pie | Pie chart |
| `5` | table | Data table |
| `6` | form | Form container |
| `7` | list | Repeating list |
| `8` | card | Card component |
| `9` | modal | Modal/dialog |

### §2.2 Coded Types (Extensible)

Two chars = extended type:

| Code | Type |
|------|------|
| `Kp` | KPI |
| `Br` | Bar chart |
| `Ln` | Line chart |
| `Pi` | Pie chart |
| `Tb` | Table |
| `Gd` | Grid |
| `St` | Stack |
| `Cd` | Card |
| `Md` | Modal |
| `Fm` | Form |
| `Bt` | Button |
| `In` | Input |
| `Sl` | Select |
| `Tx` | Text |
| `Im` | Image |
| `Ic` | Icon |
| `Hm` | Heatmap |
| `Tr` | Tree |
| `Mp` | Map |
| `Gn` | Gauge |

### §2.3 Custom Types

For novel types not in registry:

```
:customType
```

Colon prefix = literal type name.

---

## §3 The Binding System

### §3.1 Indexed Binding (Schema Reference)

When schema is known, bind by index:

```
1 0      # KPI bound to schema field 0
5 0123   # Table with columns 0,1,2,3
```

### §3.2 Named Binding (Explicit Field)

When field name needed:

```
1 :revenue           # KPI bound to "revenue" field
3 :date :amount      # Line chart: x=date, y=amount
```

### §3.3 Computed Binding (Expression)

When computation needed:

```
1 =revenue/orders              # Computed value
1 =sum(items.price)            # Aggregation
3 :date =revenue-costs         # Mixed: named x, computed y
```

### §3.4 Literal Binding (Static Value)

When value is constant:

```
Tx "Squadron Alpha"            # Static text
1 =100 "Target"                # Static KPI with label
```

---

## §4 Labeling System

### §4.1 Implicit Labels (From Schema)

No label specified = derive from schema metadata:

```
1 0      # Label comes from schema[0].label
```

### §4.2 Indexed Labels (Pre-registered)

Reference pre-loaded label by index:

```
1 0 'L0   # Value from field 0, label from labels[0]
```

### §4.3 Literal Labels (Inline String)

When custom label needed:

```
1 0 "Squadron Readiness"       # Custom label
```

**Token cost:** Only pay for strings when you need them.

---

## §5 Layout System

### §5.1 Implicit Layout

Children auto-layout based on parent type:

```
0[1 0, 1 1, 1 2, 1 3]    # Container with 4 KPIs → auto grid
```

### §5.2 Explicit Layout Modifiers

```
!   Priority (0-9, or h=hero, p=primary, s=secondary)
^   Flexibility (f=fixed, s=shrink, g=grow, c=collapse)
*   Span (1-9, f=full, h=half, t=third, q=quarter)
```

Examples:
```
1 0 !h          # Hero priority
5 0123 *f       # Full width table
8 :pilot ^f     # Fixed size card
```

### §5.3 Grid Shorthand

```
G 2x3 [...]     # Explicit 2 col × 3 row grid
G 4 [...]       # 4 columns, auto rows
[...]           # Auto grid (inferred from children)
```

---

## §6 Signal System

### §6.1 Signal Declaration

Signals declared at root with `@`:

```
@dr             # dateRange signal (type inferred)
@cat            # category signal
@sel            # selection signal
```

### §6.2 Signal Binding

```
<dr             # Receive dateRange
>sel            # Emit selection
<>flt           # Bidirectional (filter component)
```

### §6.3 Signal Wiring

```
@dr @cat        # Declare two signals
Sl :categories <>cat    # Select emits/receives cat
5 :orders <dr <cat      # Table receives both
```

---

## §7 Hidden Layers (Modals, Pages, Drawers)

### §7.1 Layer Declaration

Prefix with `/` to create hidden layer:

```
/1 9[...]       # Layer 1: modal with content
/2 0[...]       # Layer 2: page with content
```

### §7.2 Layer Triggers

Blocks can trigger layers:

```
8 :pilot >/1    # Card click opens layer 1
Bt "Edit" >/2   # Button opens layer 2
```

### §7.3 Layer Close

```
Bt "Close" >/0  # Return to main layer
Bt "Cancel" /<  # Close current layer
```

---

## §8 Conditionals

### §8.1 Visibility Conditions

```
1 0 ?alerts>0           # Show KPI only if alerts > 0
0 [...] ?@mode=edit     # Show container only in edit mode
```

### §8.2 Conditional Styling

```
1 0 #?>=80:green,>=50:yellow,<50:red    # Conditional color
```

---

## §9 Iteration

### §9.1 Repeat Over Data

```
7 :pilots [8 :. ]       # List of pilots, each as card
                        # :. = current item binding
```

### §9.2 Indexed Access

```
7 :pilots [
  Tx :.name             # pilot.name
  1 :.hours             # pilot.hours
  1 :.ops               # pilot.operativity
]
```

---

## §10 Mutations

### §10.1 Operators

```
+   Add block
-   Remove block
~   Modify property
^   Move block
```

### §10.2 Targeting

```
@0              # By render order index
@1:2            # Layer 1, element 2
@:revenue       # By binding field
@#myId          # By explicit ID
```

### §10.3 Mutation Examples

```
+@3 1 :profit           # Add KPI after element 3
-@5                     # Remove element 5
~@2 :newField           # Change binding of element 2
~@1 "New Label"         # Change label of element 1
^@4 @1                  # Move element 4 to position 1
```

---

## §11 Complete Examples

### §11.1 Simple Dashboard (Indexed, Minimal)

**Intent:** "Sales dashboard with 4 KPIs and a chart"

```
1 0, 1 1, 1 2, 1 3, 3 4 5
```

**Tokens:** 4-6

**Expansion:**
- 4 KPIs bound to schema fields 0-3
- Line chart with x=field 4, y=field 5

### §11.2 Dashboard with Labels

**Intent:** "Dashboard with custom labels"

```
1 0 "Revenue", 1 1 "Orders", 3 2 3 "Trend"
```

**Tokens:** ~12 (strings cost tokens)

### §11.3 Squadron Command Dashboard

**Intent:** Full squadron dashboard with modals

```
@dr @view
0 !h [Tx "CENTRO DE MANDO", Tx "Sistema Operativo" #green]
0 [Bt "Dashboard" <>view, Bt "Pilotos" <>view, Bt "Alertas" <>view, Bt "Vuelos" <>view]
0 ?@view=0 [
  1 0 "Pilotos", 1 1 "Horas", 1 2 "Vuelos", 1 3 "Ops"
  G 2 [
    7 :pilots *2 [8 :. >/1]
    0 [7 :alerts [Tx :.msg], Bt "Acción" >/2]
  ]
]
0 ?@view=3 [5 :flights]
/1 9 [1 :.hours, 1 :.ops, Bt "Asignar" >/2, Bt "Cerrar" /<]
/2 9 [Fm [Sl :pilots, Sl :missions, Bt "Confirmar", Bt "Cancelar" /<]]
```

**Tokens:** ~80

**Compare to:**
- LiquidCode v2.1: ~400 tokens
- Raw JSON: ~4000 tokens

### §11.4 Minimal Dashboard (Schema-Aware)

When schema is fully known and adapter can infer:

```
D 0123 45 6
```

**Meaning:**
- `D` = Dashboard archetype shortcut
- `0123` = 4 KPIs bound to fields 0-3
- `45` = Chart with x=4, y=5
- `6` = Table with field 6

**Tokens:** 2-3

---

## §12 Archetype Shortcuts

For maximum compression when patterns match:

| Shortcut | Expansion |
|----------|-----------|
| `D` | Dashboard (KPIs + chart + table) |
| `C` | Command (header + nav + grid + modals) |
| `A` | Admin (sidebar + table + CRUD) |
| `F` | Form (fields + actions) |
| `L` | List (filters + paginated list) |

**Usage:**
```
D 0123 45 6             # Full dashboard, 3 tokens
D 0123 45 6 /1 78       # Dashboard + modal, 5 tokens
```

**Fallback:** If archetype doesn't fit, use full syntax.

---

## §13 Grammar Summary

### §13.1 Minimal (Indices Only)

```
1 0, 1 1, 3 2 3, 5 4
```

4 KPIs + chart + table in ~5 tokens.

### §13.2 Standard (Mixed)

```
1 :revenue "Revenue", 3 :date :amount, 5 :orders
```

Named fields + labels in ~15 tokens.

### §13.3 Full (Everything)

```
@dr
0 !h [Tx "Header"]
G 2x2 [1 :a <dr, 1 :b <dr, 3 :c :d <dr, 5 :e <dr]
/1 9 [Fm [...]]
```

Complete app in ~40 tokens.

---

## §14 Token Efficiency

| Scenario | Tokens | Notes |
|----------|--------|-------|
| 4 KPIs | 3-4 | `1 0, 1 1, 1 2, 1 3` |
| Dashboard | 5-8 | Archetype shortcut |
| + Custom labels | +2-3 per label | Strings cost |
| + Modals | +3-5 per modal | Layer syntax |
| + Computed fields | +3-5 per expr | Expression syntax |
| Full app | 30-80 | Depends on customization |

**Principle:** Pay only for what you customize.

---

## §15 Compilation Target

Liquid compiles to **LiquidSchema** (JSON):

```typescript
interface LiquidSchema {
  version: "3.0";
  signals: Signal[];
  layers: Layer[];
}

interface Layer {
  id: number;
  visible: boolean;
  root: Block;
}

interface Block {
  uid: string;
  type: string;
  binding?: Binding;
  label?: string;
  layout?: Layout;
  signals?: SignalBinding;
  condition?: Condition;
  children?: Block[];
  trigger?: string;
}
```

This JSON is what the React adapter consumes.

---

## §16 The Pipeline

```
Natural Language
      │
      ▼
   ┌─────┐
   │ LLM │ → Liquid v3 (3-80 tokens)
   └──┬──┘
      │
      ▼
 ┌─────────┐
 │Compiler │ → LiquidSchema (JSON)
 └────┬────┘
      │
      ▼
 ┌─────────┐
 │ Adapter │ → React Components
 └─────────┘
```

**Single language. Full pipeline. Maximum compression.**

---

## §17 Why This Works

1. **Indices for known things** (0-9 = 1 token each)
2. **Names only when needed** (`:fieldName` = 2-3 tokens)
3. **Strings only when custom** (`"Label"` = 2-4 tokens)
4. **Expressions only when computed** (`=a/b` = 3-5 tokens)
5. **Archetype shortcuts for patterns** (`D` = 1 token for whole dashboard)
6. **Everything else implicit** (layout, wiring, types)

**You pay tokens proportional to customization, not structure.**

---

## Appendix A: Migration from LiquidCode v2.1

| v2.1 Syntax | v3.0 Syntax |
|-------------|-------------|
| `#archetype` | Archetype letter (`D`, `C`, etc) |
| `K$revenue` | `1 :revenue` or `1 0` |
| `§signal:type` | `@signal` |
| `<@signal` | `<signal` |
| `>@signal` | `>signal` |
| `G2x2[...]` | `G 2x2 [...]` |
| `Δ+K$field@pos` | `+@pos 1 :field` |
| `!hero` | `!h` |
| `"Label"` | `"Label"` (same) |

---

## Appendix B: Token Count Validation

| Example | GPT-4 Tokens |
|---------|--------------|
| `1 0` | 2 |
| `1 0, 1 1, 1 2, 1 3` | 6 |
| `D 0123 45 6` | 3 |
| `1 :revenue "Total Revenue"` | 6 |
| `@dr 5 :orders <dr` | 5 |
| Full squadron dashboard | ~75 |

---

*Liquid v3: One language. Every token earns its place.*
