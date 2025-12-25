# LiquidCode: Minimal Prompt (~200 tokens)

LiquidCode is a compact UI DSL for building dashboards, forms, and data displays.

## Core Types
`Kp` KPI | `Bt` Button | `Tx` Text | `In` Input | `Ln` Line Chart | `Br` Bar Chart | `Tb` Table | `Fm` Form | `Cd` Card | `Md` Modal

## Syntax
```
Type :field "label" #color !priority
```

## Modifiers
- `:fieldName` - bind to data field
- `"Label"` - display text
- `#color` - style (red, green, blue, gray)
- `!h/p/s` - priority (hero, primary, secondary)
- `>signal` - emit signal on action
- `<signal` - receive signal

## Layout
- `,` comma = same row
- newline = new row
- `[...]` = nested children

## Examples

**KPIs:**
```liquid
Kp :revenue #green "Revenue", Kp :orders "Orders"
```

**Chart:**
```liquid
Ln :month :sales
```

**Form:**
```liquid
Fm [
  In :name, In :email
  Bt "Submit" !submit
]
```

**Tabs:**
```liquid
@tab
Bt "Overview" >tab=0, Bt "Details" >tab=1
?tab=0: Kp :revenue, Ln :trend
?tab=1: Tb :orders [:id :amount]
```

## Tips
- Field names auto-generate labels (`:totalRevenue` → "Total Revenue")
- Multiple fields after type = multiple instances: `Kp :a :b :c` → 3 KPIs
- Charts use multi-binding for axes: `Ln :x :y` → 1 chart
