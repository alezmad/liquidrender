# LiquidCode: Standard Prompt (~500 tokens)

LiquidCode is a compact DSL for building UI components with minimal syntax. Optimized for LLM generation.

## Type Codes

**Charts & Data:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Kp` | KPI card | `Ln` | Line chart |
| `Br` | Bar chart | `Pi` | Pie chart |
| `Tb` | Table | `Pg` | Progress bar |

**Forms & Input:**
| Code | Type | Code | Type |
|------|------|------|------|
| `In` | Text input | `Se` | Select dropdown |
| `Bt` | Button | `Sw` | Switch toggle |
| `Ck` | Checkbox | `Rd` | Radio button |
| `Dt` | Date picker | `Fm` | Form container |

**Layout & Structure:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Cn` | Container | `Cd` | Card |
| `Md` | Modal | `Gd` | Grid |
| `Sk` | Stack | `Ac` | Accordion |

**Content:**
| Code | Type | Code | Type |
|------|------|------|------|
| `Tx` | Text | `Hd` | Heading |
| `Ic` | Icon | `Im` | Image |
| `Tg` | Tag/badge | `Av` | Avatar |

## Modifiers

### Binding
- `:fieldName` - Bind to data field
- `"Label Text"` - Display label/text
- `=expr` - Computed expression (e.g., `=revenue/orders`)

### Signals
- `@signal` - Declare signal (top of file)
- `>signal` - Emit signal (e.g., `>tab=0`)
- `<signal` - Receive signal
- `<>signal` - Two-way binding

### Style
- `#color` - Color (red, green, blue, yellow, gray, primary, destructive)
- `%size` - Size (sm, md, lg, xl)
- `!priority` - Layout priority (h=hero, p=primary, s=secondary)

### Conditional
- `?signal=value:` - Show when condition met
- `?@signal=value` - Inline condition

## Syntax Patterns

### Layout Rules
```liquid
Kp :a, Kp :b         # Comma = same row
Kp :a
Kp :b                # Newline = new row
Fm [In :x, In :y]    # Brackets = nesting
```

### Auto-Label Generation
```liquid
:revenue → "Revenue"
:totalRevenue → "Total Revenue"
:order_count → "Order Count"
```

### Repetition Shorthand
```liquid
Kp :revenue :orders :customers  # → 3 KPIs
In :name :email :phone          # → 3 inputs
```

**Exception:** Charts use multi-binding for axes:
```liquid
Ln :month :sales    # → 1 chart (x=month, y=sales)
Br :category :total # → 1 chart (x=category, y=total)
```

## Examples

### Dashboard
```liquid
Kp :revenue #green "Revenue", Kp :orders "Orders", Kp :growth #blue "%"
Ln :month :sales
Tb :transactions [:date :customer :amount :status]
```

### Tabbed Interface
```liquid
@tab
Bt "Overview" >tab=0, Bt "Details" >tab=1, Bt "Settings" >tab=2

?tab=0: Kp :revenue :orders, Ln :trend
?tab=1: Tb :orders [:id :customer :amount]
?tab=2: Fm [In :name, In :email, Bt "Save" !submit]
```

### Form with Validation
```liquid
Fm [
  In :name "Full Name"
  In :email "Email Address"
  Se :role [:admin :user :guest]
  Sw :notifications "Enable notifications"
  Bt "Cancel", Bt "Save" !submit #primary
]
```

### Modal Trigger
```liquid
@selected
Tb :users [:name :email :role] >selected
Bt "Edit" >/1

/1 Md "Edit User" [
  Fm [
    In :name, In :email
    Bt "Close" /<, Bt "Save" !submit
  ]
]
```

### Table with Actions
```liquid
Tb :products [
  :name :price :stock :status
  Bt "Edit" >edit, Bt "Delete" >delete #destructive
]
```

## Best Practices

1. **Use semantic type codes** - `Kp`, `Ln`, `Bt` (not numeric indices)
2. **Use named bindings** - `:fieldName` (auto-labels)
3. **Minimal punctuation** - Rely on commas/newlines for layout
4. **Signal-driven interactivity** - Declare signals, emit on actions, conditionally render
5. **Explicit labels when needed** - Override auto-labels with `"Custom Text"`

## Common Patterns

**Filter by date range:**
```liquid
@dateRange
Dt :start :end <>dateRange
Tb :data <dateRange
```

**Live search:**
```liquid
@query
In :search <>query
Tb :results <query
```

**Conditional color:**
```liquid
Kp :score #?>=80:green,<80:red
```
