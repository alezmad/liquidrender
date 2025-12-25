# LiquidCode: Comprehensive Prompt (~1000 tokens)

LiquidCode is a compact, token-efficient DSL for building dashboards, forms, charts, and interactive UIs. Designed for LLM generation with predictable, unambiguous syntax.

## Complete Type Reference

### Core Types (0-9)
| Index | Code | Type | Use Case |
|-------|------|------|----------|
| `0` | `Cn` | container | Generic wrapper/div |
| `1` | `Kp` | kpi | Key metrics/statistics |
| `2` | `Br` | bar | Bar chart |
| `3` | `Ln` | line | Line/area chart |
| `4` | `Pi` | pie | Pie/donut chart |
| `5` | `Tb` | table | Data table |
| `6` | `Fm` | form | Form container |
| `7` | `Ls` | list | Repeating list |
| `8` | `Cd` | card | Card component |
| `9` | `Md` | modal | Modal/dialog |

### Layout & Structure
`Gd` Grid | `Sk` Stack | `Sp` Split | `Dw` Drawer | `Sh` Sheet | `Pp` Popover | `Tl` Tooltip | `Ac` Accordion

### Data Display
`Tx` Text | `Hd` Heading | `Ic` Icon | `Im` Image | `Av` Avatar | `Tg` Tag/Badge | `Pg` Progress | `Gn` Gauge | `Rt` Rating | `Sl` Sparkline

### Form Controls
`Bt` Button | `In` Input | `Se` Select | `Sw` Switch | `Ck` Checkbox | `Rd` Radio | `Rg` Range/Slider | `Cl` Color Picker | `Dt` Date | `Tm` Time | `Up` Upload | `Ot` OTP

### Advanced Charts
`Hm` Heatmap | `Sn` Sankey | `Tr` Tree | `Or` Org Chart | `Mp` Map | `Fl` Flowchart

### Media & Interactive
`Vd` Video | `Au` Audio | `Cr` Carousel | `Lb` Lightbox | `St` Stepper | `Kb` Kanban | `Ca` Calendar | `Ti` Timeline

## Complete Modifier Reference

### Binding Modifiers
| Modifier | Syntax | Example | Description |
|----------|--------|---------|-------------|
| Field | `:name` | `:revenue` | Bind to data field |
| Nested | `:.prop` | `:user.name` | Nested field access |
| Iterator | `:.` | `Ls :items [Tx :.]` | Current item in loop |
| Index | `:#` | `Tx :#` | Current index (0-based) |
| Computed | `=expr` | `=revenue/orders` | Calculated value |
| Literal | `"text"` | `"Submit"` | Static text/label |

### Signal Modifiers
| Modifier | Syntax | Example | Description |
|----------|--------|---------|-------------|
| Declare | `@name` | `@tab` | Declare signal (file top) |
| Emit | `>name` | `>tab=0` | Send signal value |
| Receive | `<name` | `<filter` | Listen to signal |
| Bidirectional | `<>name` | `<>query` | Two-way binding |
| Both | `<>name` | `In :search <>query` | Emit and receive |

### Style Modifiers
| Modifier | Syntax | Values | Example |
|----------|--------|--------|---------|
| Color | `#color` | red, green, blue, yellow, gray, primary, destructive | `#green` |
| Conditional Color | `#?cond:color` | `#?>=80:green,<80:red` | `Kp :score #?>=80:green,<80:red` |
| Size | `%size` | sm, md, lg, xl | `Tx "Title" %lg` |

### Layout Modifiers
| Modifier | Syntax | Values | Example |
|----------|--------|--------|---------|
| Priority | `!p` | h (hero), p (primary), s (secondary), 0-9 | `Kp :revenue !h` |
| Flex | `^flex` | f (fixed), s (shrink), g (grow), c (collapse) | `Cn ^g` |
| Span | `*span` | 1-9, f (full), h (half), t (third), q (quarter) | `Cd *h` |

### Action Modifiers
| Modifier | Syntax | Example | Description |
|----------|--------|---------|-------------|
| Submit | `!submit` | `Bt "Save" !submit` | Submit form |
| Reset | `!reset` | `Bt "Clear" !reset` | Reset form |
| Close | `!close` | `Bt "X" !close` | Close modal |

### State Modifiers
| Modifier | Syntax | Example | Description |
|----------|--------|---------|-------------|
| Hover | `:hover#color` | `Bt "Click" :hover#blue` | Hover state |
| Focus | `:focus#color` | `In :email :focus#primary` | Focus state |
| Active | `:active#color` | `Bt "Tab" :active#primary` | Active state |

### Streaming Modifiers
| Modifier | Syntax | Example | Description |
|----------|--------|---------|-------------|
| Poll | `~5s` | `Kp :price ~5s` | Poll every 5 seconds |
| WebSocket | `~ws://url` | `Kp :live ~ws://api/price` | WebSocket stream |
| SSE | `~sse://url` | `Tb :events ~sse://stream` | Server-Sent Events |

### Fidelity Modifiers
| Modifier | Syntax | Example | Use Case |
|----------|--------|---------|----------|
| Low | `$lo` | `Cn $lo [...]` | LLM preview, quick sketch |
| High | `$hi` | `Br :data $hi` | Production, full detail |
| Skeleton | `$skeleton` | `Tb :data $skeleton` | Loading state |
| Defer | `$defer` | `Cn $defer [...]` | Lazy render below fold |

## Syntax Rules

### Layout Separator Semantics
```liquid
# Comma = same row (horizontal)
Kp :a, Kp :b, Kp :c

# Newline = new row (vertical stack)
Kp :a
Kp :b
Kp :c

# Brackets = explicit nesting
Fm [
  In :name, In :email
  Bt "Submit"
]
```

### Auto-Label Generation
Field names automatically convert to human-readable labels:

| Field Binding | Generated Label |
|---------------|-----------------|
| `:revenue` | "Revenue" |
| `:totalRevenue` | "Total Revenue" |
| `:avg_order_value` | "Avg Order Value" |
| `:orderCount` | "Order Count" |

Override with explicit literal: `Kp :revenue "Custom Label"`

### Repetition Shorthand
Multiple field bindings after a non-chart type expand to multiple instances:

```liquid
Kp :revenue :orders :customers
# Expands to:
Kp :revenue, Kp :orders, Kp :customers
```

**Exception:** Charts use multi-binding for axes (x, y):
```liquid
Ln :month :sales      # ONE chart with x=month, y=sales
Br :category :total   # ONE chart with x=category, y=total
```

### Conditional Rendering
```liquid
@tab
?tab=0: Kp :revenue, Ln :trend
?tab=1: Tb :orders [:id :amount]
?tab=2: Fm [In :settings]
```

Inline conditions:
```liquid
Bt "Admin Panel" ?@role=admin
Tg "Premium" ?@subscription=premium #green
```

### Layers (Modals, Drawers)
```liquid
Bt "Open Details" >/1        # Open layer 1
Bt "Open Settings" >/2       # Open layer 2

/1 Md "Details" [...]        # Layer 1: modal
/2 Dw "Settings" [...]       # Layer 2: drawer

Bt "Close" /<                # Close current layer
Bt "Back to Main" >/0        # Return to layer 0 (main)
```

## Complete Examples

### Executive Dashboard (Ultra-Minimal)
```liquid
@period
Se :periods [:today :week :month :year] <>period
Kp :metrics <period
Ln :trend <period
Br :breakdown <period
Tb :details <period [:date :metric :value :change]
```

### Sales Dashboard (Explicit)
```liquid
@dateRange @filter
Dt :start :end <>dateRange
In :search <>filter

Kp :revenue #green "Total Revenue", Kp :orders "Orders", Kp :avgOrder "Avg Order", Kp :growth #blue "Growth %"

Ln :date :sales "Sales Trend"
Br :product :revenue "Revenue by Product"

Tb :transactions <dateRange <filter [
  :id :date :customer :product :amount :status
  Bt "View" >details, Bt "Refund" >refund #destructive
]
```

### Multi-Tab Analytics
```liquid
@tab @segment
Bt "Overview" >tab=0, Bt "Users" >tab=1, Bt "Revenue" >tab=2, Bt "Reports" >tab=3

?tab=0: Kp :activeUsers :sessions :bounceRate :avgDuration
        Ln :date :sessions "Daily Sessions"
        Br :source :users "Traffic Sources"

?tab=1: In :search <>segment "Search users"
        Tb :users <segment [:id :name :email :signupDate :plan :status]

?tab=2: Kp :mrr #green "MRR", Kp :arr #green "ARR", Kp :churn #red "Churn %"
        Ln :month :mrr "Monthly Recurring Revenue"
        Pi :plan :revenue "Revenue by Plan"

?tab=3: Se :reportType [:sales :users :revenue]
        Bt "Generate" >generate #primary
        Tb :report [:metric :value :change]
```

### Form with Validation & Modal
```liquid
@formData @showModal
Fm [
  Hd "User Registration" %xl
  In :firstName "First Name", In :lastName "Last Name"
  In :email "Email Address"
  In :phone "Phone Number"
  Se :country [:us :uk :ca :au] "Country"
  Dt :birthdate "Date of Birth"
  Sw :newsletter "Subscribe to newsletter"
  Ck :terms "I accept terms and conditions"
  Bt "Cancel", Bt "Register" !submit #primary
]

Bt "Preview" >showModal

/1 Md "Registration Preview" ?@showModal [
  Tx "Review your information:"
  Kp :formData
  Bt "Edit" /<, Bt "Confirm" !submit #primary
]
```

### Real-Time Monitoring
```liquid
@alert @view
Bt "Grid" >view=grid, Bt "List" >view=list

Kp :cpu ~5s #?>=80:red,<80:green "CPU Usage"
Kp :memory ~5s #?>=75:yellow,<75:green "Memory"
Kp :disk ~5s "Disk I/O"
Kp :network ~5s "Network"

?view=grid: Gd [
  Ln :time :cpu ~5s "CPU History"
  Ln :time :memory ~5s "Memory History"
  Br :process :cpu "Top Processes"
  Tb :alerts ~10s [:time :level :message]
]

?view=list: Tb :metrics ~5s [:name :current :avg :max :status]
```

### Table with Inline Editing
```liquid
@editing @selected
Tb :products [
  :id :name :price :stock :category :status
  Bt "Edit" >editing=:id >selected=:.
  Bt "Delete" >delete=:id #destructive
]

/1 Md "Edit Product" ?@editing [
  Fm <>selected [
    In :name "Product Name"
    In :price "Price"
    In :stock "Stock Quantity"
    Se :category [:electronics :clothing :food :other]
    Se :status [:active :inactive :discontinued]
    Bt "Cancel" /<, Bt "Save" !submit #primary
  ]
]
```

## DO's and DON'Ts

### DO ✓
```liquid
# Use semantic type codes
Kp :revenue

# Use named bindings for clarity
Ln :month :sales

# Rely on auto-labels
Kp :totalRevenue    # Auto: "Total Revenue"

# Use repetition shorthand
Kp :a :b :c

# Signal-driven conditionals
@tab
?tab=0: Kp :metric
```

### DON'T ✗
```liquid
# Don't use numeric indices (unless legacy)
1 0    # Prefer: Kp :revenue

# Don't add unnecessary labels
Kp :revenue "revenue"    # Auto-label handles this

# Don't repeat type for multiples
Kp :a, Kp :b, Kp :c    # Use: Kp :a :b :c

# Don't use brackets without nesting
[Kp :a, Kp :b]    # Just: Kp :a, Kp :b

# Don't forget signal declaration
?tab=0: ...    # Missing: @tab at top
```

## Common Mistakes

1. **Chart multi-binding confusion:**
   - `Kp :a :b :c` → 3 KPIs (expansion)
   - `Ln :a :b` → 1 chart (x=a, y=b, no expansion)

2. **Missing signal declarations:**
   ```liquid
   @tab    # Required at top
   Bt "Tab1" >tab=0
   ?tab=0: ...
   ```

3. **Layer reference errors:**
   ```liquid
   Bt "Open" >/1    # Must have /1 layer defined
   /1 Md [...]      # Layer definition
   ```

4. **Conditional syntax:**
   ```liquid
   ?signal=value: Block    # Correct (block-level)
   Block ?@signal=value    # Correct (inline)
   ?signal: Block          # Wrong (missing =value)
   ```

5. **Table columns without array:**
   ```liquid
   Tb :data [:col1 :col2]    # Correct
   Tb :data :col1 :col2      # Wrong (not array)
   ```

## Token Efficiency

| Pattern | Verbose | Compact | Savings |
|---------|---------|---------|---------|
| 3 KPIs | `Kp :a, Kp :b, Kp :c` | `Kp :a :b :c` | 8 chars (40%) |
| Auto-label | `Kp :revenue "Revenue"` | `Kp :revenue` | 10 chars (50%) |
| Nested obj | `Kp :summary.revenue "Revenue"` | `Kp :summary` | Auto-expands all |
| Container | `Cn ^row [Kp :a, Kp :b]` | `Kp :a, Kp :b` | 9 chars (35%) |

## Integration with Data

LiquidCode expects structured JSON data:

```json
{
  "revenue": 832000,
  "orders": 2248,
  "trend": [
    {"month": "Jan", "sales": 45000},
    {"month": "Feb", "sales": 52000}
  ],
  "users": [
    {"id": 1, "name": "Alice", "email": "alice@example.com"},
    {"id": 2, "name": "Bob", "email": "bob@example.com"}
  ]
}
```

Renders with:
```liquid
Kp :revenue :orders
Ln :trend.month :trend.sales
Tb :users [:id :name :email]
```

Or ultra-minimal (auto-detection):
```liquid
Kp :revenue :orders
Ln :trend
Tb :users
```

## Advanced Patterns

### Drill-Down Navigation
```liquid
@selected @drilldown
Br :category :sales >selected
?@selected: Ln :selected.month :selected.sales
           Tb :selected.details [:product :amount]
```

### Wizard/Stepper
```liquid
@step
St [
  Bt "Step 1" >step=0, Bt "Step 2" >step=1, Bt "Step 3" >step=2
  ?step=0: Fm [In :name, In :email]
  ?step=1: Fm [In :address, Se :country]
  ?step=2: Tx "Review and confirm", Kp :summary
]
```

### Linked Filters
```liquid
@region @category @dateRange
Se :regions <>region
Se :categories <>category
Dt :start :end <>dateRange

Tb :products <region <category <dateRange
Br :products.category :products.sales <region <dateRange
```

## Performance Tips

1. Use `$lo` for rapid LLM iteration, `$hi` for production
2. Use `$defer` for below-fold heavy content
3. Poll intervals: `~5s` for critical, `~1m` for background
4. Stream real-time data with `~ws://` instead of polling

---

**Design Philosophy:** LiquidCode prioritizes token efficiency, semantic clarity, and predictable generation patterns. It's optimized for LLMs to produce correct UI descriptions with minimal ambiguity.
