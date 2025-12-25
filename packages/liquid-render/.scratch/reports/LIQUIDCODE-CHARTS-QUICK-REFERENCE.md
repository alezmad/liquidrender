# LiquidCode Charts - Quick Reference Guide

Fast lookup for chart syntax in LiquidCode.

---

## Chart Types

### Line Chart
```liquid
Ln :x :y                    # Single axis
Ln :x :y1 :y2             # Dual axes
Ln :date :revenue :orders  # Example: revenue and orders over time
```

### Bar Chart
```liquid
Br :category :value         # Basic bar chart
Br :region :sales #region   # With color by category
Br :product :revenue #?>=10000:gold,<10000:silver  # Conditional color
```

### Pie Chart
```liquid
Pi :label :value             # Basic pie chart
Pi :segment :share "Title"   # With title
Pi :category :percentage     # Example: market share
```

### Heatmap (2D Grid)
```liquid
Hm :x :y :intensity         # Basic heatmap
Hm :day :hour :activity     # Example: user activity by day/hour
Hm :row :column :value      # 2D matrix visualization
```

### Gauge (Single Metric)
```liquid
Gn :value                          # Basic gauge
Gn :score "Performance Score"      # With label
Gn :temperature "System Temp" %lg  # With size modifier
```

---

## Modifiers

### Color
```liquid
#fieldName                    # Color by field values
#?>=100:green,<100:red       # Conditional: >=100 green, <100 red
#?active:blue,inactive:gray  # Conditional text values
```

### Size
```liquid
%lg    # Large
%sm    # Small
%md    # Medium (default)
```

### Streaming (Real-time)
```liquid
~5s                          # Poll every 5 seconds
~1m                          # Poll every 1 minute
~ws://api.example.com/data   # WebSocket real-time
~sse://stream.example.com    # Server-Sent Events
```

### Signals
```liquid
<signalName    # Receive signal (chart updates when signal changes)
>signalName    # Emit signal (chart triggers signal when updated)
```

### Conditional
```liquid
?@signal=value    # Render only if signal equals value
?@filter=active   # Example: show only if filter is "active"
```

---

## Full Examples

### Example 1: Sales Dashboard
```liquid
Kp :totalRevenue :totalOrders :avgOrderValue
Ln :month :revenue :orders
Br :product :sales #category
Pi :region :revenue "Revenue by Region"
```

### Example 2: Real-time Monitoring
```liquid
Kp :cpuUsage ~5s, Kp :memoryUsage ~5s
Ln :timestamp :temperature ~ws://sensors.example.com/stream
Hm :server :metric :value ~5s
Gn :systemHealth "System Health" %lg
```

### Example 3: Interactive Dashboard
```liquid
@dateRange @filter
Kp :total, Kp :average

?@filter=premium: [Ln :date :revenue <dateRange]
?@filter=standard: [Br :category :sales <dateRange]
?@filter=all: [Hm :day :hour :transactions <dateRange]

Gn :conversion "Conversion Rate"
```

### Example 4: Market Analysis
```liquid
Ln :date :btcPrice :ethPrice ~ws://crypto.api/prices
Br :exchange :volume #exchange
Pi :chainType :tvl "Total Value Locked"
Hm :dayOfWeek :hour :trades
Gn :marketSentiment "Market Sentiment" #?positive:green,negative:red
```

---

## Field Binding Syntax

```liquid
:fieldName           # Bind to data field
"Static Text"        # Static literal text
=SUM(field)          # Expression/formula
```

## Data Structure Examples

### For Line Chart: `Ln :date :revenue`
```json
{
  "date": ["Jan", "Feb", "Mar"],
  "revenue": [45000, 52000, 48000]
}
```

### For Bar Chart: `Br :region :sales #region`
```json
{
  "region": ["North", "South", "East", "West"],
  "sales": [125000, 98000, 156000, 112000]
}
```

### For Pie Chart: `Pi :segment :share`
```json
{
  "segment": ["Product A", "Product B", "Product C"],
  "share": [35, 45, 20]
}
```

### For Heatmap: `Hm :day :hour :intensity`
```json
{
  "day": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "hour": [9, 10, 11, 12, 13, 14, 15, 16, 17],
  "intensity": [/* 45 values for 5x9 grid */]
}
```

### For Gauge: `Gn :score`
```json
{
  "score": 78.5
}
```

---

## Signal Declaration & Binding

### Declare Signal
```liquid
@signalName
```

### Receive Signal
```liquid
Ln :date :revenue <signalName
```

### Conditional on Signal
```liquid
?@signalName=value: [...]
```

### Example
```liquid
@dateRange
@category

Ln :date :revenue <dateRange
Br :region :sales <category
Hm :day :hour :activity <dateRange <category
```

---

## Type Codes (Numeric vs Semantic)

| Numeric | Semantic | Type |
|---------|----------|------|
| 3 | Ln | Line |
| 2 | Br | Bar |
| 4 | Pi | Pie |
| - | Hm | Heatmap |
| - | Gn | Gauge |

**Both forms work:** `3 :x :y` ≡ `Ln :x :y`

---

## Common Patterns

### KPI + Chart
```liquid
Kp :metric
Ln :date :metric
```

### Multiple KPIs + Charts
```liquid
Kp :a :b :c
Ln :x :y
Br :cat :val
```

### Filtered Charts
```liquid
@filter
Ln :date :value <filter
Br :category :sales <filter
```

### Real-time Dashboard
```liquid
Ln :time :price ~ws://api.example.com
Hm :hour :minute :activity ~5s
Gn :status ~ws://api.example.com ~1m
```

### Conditional Views
```liquid
@tab
?@tab=0: [Ln :x :y]
?@tab=1: [Br :cat :val]
?@tab=2: [Pi :label :val]
```

---

## Troubleshooting

### Chart not showing
1. Check field names match data keys
2. Verify binding syntax: `:fieldName` (with colon)
3. Ensure data types are correct (numbers for numeric charts)

### Colors not working
1. Use `#fieldName` to color by field
2. For conditional: `#?condition:color,condition:color`
3. Valid color names: red, green, blue, yellow, gold, silver, gray, etc.

### Streaming not updating
1. Check URL format: `~ws://...` or `~sse://...`
2. Verify endpoint is accessible
3. For polling: `~5s` (5 seconds), `~1m` (1 minute)

### Signal binding issues
1. Declare first: `@signalName`
2. Then use: `<signalName` or `?@signalName=value`
3. Ensure signal name matches

---

## Test Results

**All tested chart snippets: 10/10 PASS (100%)**

### Basic Charts (5/5 PASS)
- Line chart with dual axes ✓
- Bar chart with colors ✓
- Pie chart with labels ✓
- Heatmap with 2D grid ✓
- Gauge with label ✓

### Advanced Features (5/5 PASS)
- Line chart with WebSocket ✓
- Bar chart with conditional colors ✓
- Multi-chart dashboard ✓
- Gauge with size modifier ✓
- Heatmap with signal binding ✓

---

## API Reference

```typescript
// Parse LiquidCode DSL to schema
const schema = parseUI("Ln :month :revenue");

// Roundtrip: DSL → Schema → DSL
const { isEquivalent, dsl } = roundtripUI(schema);

// Compile: Schema → DSL
const liquidCode = compileUI(schema);
```

---

## More Information

- Full specification: `/specs/LIQUID-RENDER-SPEC.md`
- Detailed report: `/CHART-VERIFICATION-REPORT.md`
- Complete summary: `/CHART-TESTING-SUMMARY.md`

---

*LiquidCode Chart Syntax - Quick Reference*
*Updated: 2025-12-24*
