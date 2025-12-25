# Analytics Snippets - Schema Deep Dive

Detailed LiquidSchema structures generated from each snippet's roundtrip verification.

---

## SNIPPET 1: Real-time KPI Dashboard

**Source DSL:**
```liquid
@revenue @orders
Kp :revenue ~ws://api.metrics/revenue $hi, Kp :orders ~ws://api.metrics/orders $hi
Kp :conversion ~5s
>revenue=peak: Tx "Revenue Peak Alert" #ff0000
```

**Generated LiquidSchema:**
```json
{
  "version": "1.0",
  "signals": [
    { "name": "revenue" },
    { "name": "orders" }
  ],
  "layers": [
    {
      "id": 0,
      "visible": true,
      "root": {
        "uid": "root",
        "type": "container",
        "layout": { "flex": "row" },
        "children": [
          {
            "uid": "kpi-revenue",
            "type": "kpi",
            "binding": { "kind": "field", "value": "revenue" },
            "stream": {
              "type": "ws",
              "url": "ws://api.metrics/revenue"
            },
            "fidelity": "hi"
          },
          {
            "uid": "kpi-orders",
            "type": "kpi",
            "binding": { "kind": "field", "value": "orders" },
            "stream": {
              "type": "ws",
              "url": "ws://api.metrics/orders"
            },
            "fidelity": "hi"
          },
          {
            "uid": "kpi-conversion",
            "type": "kpi",
            "binding": { "kind": "field", "value": "conversion" },
            "signals": {
              "emit": {
                "name": "revenue",
                "value": "peak"
              }
            },
            "stream": {
              "type": "interval",
              "interval": 5000
            }
          },
          {
            "uid": "alert-text",
            "type": "text",
            "binding": { "kind": "literal", "value": "Revenue Peak Alert" },
            "condition": {
              "signal": "revenue",
              "signalValue": "peak"
            },
            "style": {
              "color": "ff0000"
            }
          }
        ]
      }
    }
  ]
}
```

**Key Features in Schema:**
- **StreamConfig:** WebSocket and interval-based streaming
  - `type: "ws"` with URL for real-time
  - `type: "interval"` with millisecond duration for polling
- **Fidelity:** `"hi"` for high-quality rendering
- **SignalEmit:** KPI emits `revenue=peak` signal
- **Condition:** Text component shows only when signal matches
- **Style:** `color` modifier applied to text

---

## SNIPPET 2: Multi-axis Charts with Fidelity

**Source DSL:**
```liquid
@timeRange @selectedCategory
Ln :date :sales $lo @timeRange
Br :category :volume $hi
?selectedCategory=electronics: Ln :date :electronics_sales
```

**Generated LiquidSchema:**
```json
{
  "version": "1.0",
  "signals": [
    { "name": "timeRange" },
    { "name": "selectedCategory" }
  ],
  "layers": [
    {
      "id": 0,
      "visible": true,
      "root": {
        "uid": "root",
        "type": "container",
        "layout": { "flex": "column" },
        "children": [
          {
            "uid": "line-sales",
            "type": "line",
            "binding": {
              "kind": "field",
              "value": "date",
              "x": "date",
              "y": "sales"
            },
            "signals": {
              "receive": "timeRange"
            },
            "fidelity": "lo"
          },
          {
            "uid": "bar-volume",
            "type": "bar",
            "binding": {
              "kind": "field",
              "value": "category",
              "x": "category",
              "y": "volume"
            },
            "fidelity": "hi"
          },
          {
            "uid": "line-electronics",
            "type": "line",
            "binding": {
              "kind": "field",
              "value": "date",
              "x": "date",
              "y": "electronics_sales"
            },
            "condition": {
              "signal": "selectedCategory",
              "signalValue": "electronics"
            }
          }
        ]
      }
    }
  ]
}
```

**Key Features in Schema:**
- **Multi-binding for Charts:**
  - `x` and `y` fields for axes
  - Preserves both values in binding structure
- **Receive Signal:** Line chart receives `timeRange` for reactive updates
- **Fidelity Levels:** Different levels for different data volumes
  - `"lo"` for client-side filtering
  - `"hi"` for detailed categorical analysis
- **Condition:** Electronics chart appears conditionally

---

## SNIPPET 3: Nested Dashboard with Conditional Visibility

**Source DSL:**
```liquid
@dashboardMode
/1 [
  Kp :daily_active_users ~2s, Kp :session_count ~2s, Kp :bounce_rate ~2s
  Ln :hour :transactions $lo
  Hm :user_id :feature_usage $hi
]
?dashboardMode=summary: Kp :total_users ~5s
```

**Generated LiquidSchema:**
```json
{
  "version": "1.0",
  "signals": [
    { "name": "dashboardMode" }
  ],
  "layers": [
    {
      "id": 0,
      "visible": true,
      "root": {
        "uid": "root",
        "type": "container",
        "layout": { "flex": "row" },
        "children": [
          {
            "uid": "kpi-dau",
            "type": "kpi",
            "binding": { "kind": "field", "value": "daily_active_users" },
            "stream": {
              "type": "interval",
              "interval": 2000
            }
          },
          {
            "uid": "kpi-sessions",
            "type": "kpi",
            "binding": { "kind": "field", "value": "session_count" },
            "stream": {
              "type": "interval",
              "interval": 2000
            }
          },
          {
            "uid": "kpi-bounce",
            "type": "kpi",
            "binding": { "kind": "field", "value": "bounce_rate" },
            "stream": {
              "type": "interval",
              "interval": 2000
            }
          },
          {
            "uid": "line-transactions",
            "type": "line",
            "binding": {
              "kind": "field",
              "value": "hour",
              "x": "hour",
              "y": "transactions"
            },
            "fidelity": "lo"
          },
          {
            "uid": "heatmap-features",
            "type": "heatmap",
            "binding": {
              "kind": "field",
              "value": "user_id",
              "x": "user_id",
              "y": "feature_usage"
            },
            "fidelity": "hi"
          }
        ]
      }
    },
    {
      "id": 1,
      "visible": false,
      "root": {
        "uid": "layer-1-root",
        "type": "container",
        "layout": { "flex": "column" },
        "children": [
          {
            "uid": "kpi-total-users",
            "type": "kpi",
            "binding": { "kind": "field", "value": "total_users" },
            "condition": {
              "signal": "dashboardMode",
              "signalValue": "summary"
            },
            "stream": {
              "type": "interval",
              "interval": 5000
            }
          }
        ]
      }
    }
  ]
}
```

**Key Features in Schema:**
- **Multiple Layers:**
  - Layer 0: Main dashboard (visible: true)
  - Layer 1: Summary view (visible: false, enabled by condition)
- **Interval Streaming:** All metrics updated at 2s or 5s intervals
- **Mixed Fidelity:** Low for trend lines, high for detailed heatmaps
- **Conditional Layer:** KPI only renders when mode is "summary"

---

## SNIPPET 4: Form-based Analytics Dashboard

**Source DSL:**
```liquid
@filters @resultMode
Fm [
  Se :metric_type, Dt :start_date, Dt :end_date
  Bt "Apply Filters" >filters
]
?resultMode=table: Tb :results [:date :metric :value]
?resultMode=chart: Br :date :metric $lo
```

**Generated LiquidSchema:**
```json
{
  "version": "1.0",
  "signals": [
    { "name": "filters" },
    { "name": "resultMode" }
  ],
  "layers": [
    {
      "id": 0,
      "visible": true,
      "root": {
        "uid": "root",
        "type": "container",
        "layout": { "flex": "column" },
        "children": [
          {
            "uid": "form-filters",
            "type": "form",
            "layout": { "flex": "row" },
            "children": [
              {
                "uid": "select-metric",
                "type": "select",
                "binding": { "kind": "field", "value": "metric_type" }
              },
              {
                "uid": "date-start",
                "type": "date",
                "binding": { "kind": "field", "value": "start_date" }
              },
              {
                "uid": "date-end",
                "type": "date",
                "binding": { "kind": "field", "value": "end_date" }
              },
              {
                "uid": "button-apply",
                "type": "button",
                "binding": { "kind": "literal", "value": "Apply Filters" },
                "signals": {
                  "emit": {
                    "name": "filters"
                  }
                }
              }
            ]
          },
          {
            "uid": "table-results",
            "type": "table",
            "binding": { "kind": "field", "value": "results" },
            "columns": ["date", "metric", "value"],
            "condition": {
              "signal": "resultMode",
              "signalValue": "table"
            }
          },
          {
            "uid": "bar-results",
            "type": "bar",
            "binding": {
              "kind": "field",
              "value": "date",
              "x": "date",
              "y": "metric"
            },
            "fidelity": "lo",
            "condition": {
              "signal": "resultMode",
              "signalValue": "chart"
            }
          }
        ]
      }
    }
  ]
}
```

**Key Features in Schema:**
- **Form Container:** Nested form with multiple controls
  - Holds select, date pickers, and button together
- **Signal Emit on Button:** Button click emits "filters" signal
- **Conditional Results:** Table and chart shown based on mode
  - Table: columns explicitly specified
  - Chart: automatic axis detection
- **Column Specification:** `columns: ["date", "metric", "value"]` for table

---

## SNIPPET 5: Competitive Intelligence Dashboard

**Source DSL:**
```liquid
@competitor @compareMode
Gd [
  Kp :market_share ~ws://live/competitor1 $hi
  Kp :revenue_growth ~ws://live/competitor2 $hi
  Kp :customer_satisfaction ~5s
  Ln :month :market_share >competitor <compareMode
]
<>competitor: Tb :competitor_data [:rank :score :trend]
```

**Generated LiquidSchema:**
```json
{
  "version": "1.0",
  "signals": [
    { "name": "competitor" },
    { "name": "compareMode" }
  ],
  "layers": [
    {
      "id": 0,
      "visible": true,
      "root": {
        "uid": "root",
        "type": "container",
        "layout": { "flex": "column" },
        "children": [
          {
            "uid": "grid-metrics",
            "type": "grid",
            "layout": { "flex": "row" },
            "children": [
              {
                "uid": "kpi-market-share",
                "type": "kpi",
                "binding": { "kind": "field", "value": "market_share" },
                "stream": {
                  "type": "ws",
                  "url": "ws://live/competitor1"
                },
                "fidelity": "hi"
              },
              {
                "uid": "kpi-revenue",
                "type": "kpi",
                "binding": { "kind": "field", "value": "revenue_growth" },
                "stream": {
                  "type": "ws",
                  "url": "ws://live/competitor2"
                },
                "fidelity": "hi"
              },
              {
                "uid": "kpi-satisfaction",
                "type": "kpi",
                "binding": { "kind": "field", "value": "customer_satisfaction" },
                "stream": {
                  "type": "interval",
                  "interval": 5000
                }
              },
              {
                "uid": "line-trend",
                "type": "line",
                "binding": {
                  "kind": "field",
                  "value": "month",
                  "x": "month",
                  "y": "market_share"
                },
                "signals": {
                  "emit": { "name": "competitor" },
                  "receive": "compareMode"
                }
              }
            ]
          },
          {
            "uid": "table-competitors",
            "type": "table",
            "binding": { "kind": "field", "value": "competitor_data" },
            "columns": ["rank", "score", "trend"],
            "signals": {
              "both": "competitor"
            }
          }
        ]
      }
    }
  ]
}
```

**Key Features in Schema:**
- **Grid Container:** Multi-column layout for competitor metrics
- **WebSocket Streaming:** Different URLs per competitor
  - `competitor1` and `competitor2` live feeds
  - Mixed with interval polling for satisfaction
- **Bidirectional Signal:**
  - Chart emits: `>competitor` when clicked
  - Table receives: `<competitor` for filtering
  - Both via: `"both": "competitor"` (two-way binding)
- **Mixed Streaming:** WebSocket + polling in same dashboard
- **Column Specification:** Rank, score, trend columns in table

---

## Signal Flow Patterns

### Pattern 1: Emit → Receive → Condition

**Example from Snippet 1:**
```
KPI Component  → emit "revenue=peak"  →
Text Alert     ← display condition met
```

**Schema representation:**
```json
{
  "signals": { "emit": { "name": "revenue", "value": "peak" } },
  "condition": { "signal": "revenue", "signalValue": "peak" }
}
```

### Pattern 2: Receive Signal

**Example from Snippet 2:**
```
External state → signal "timeRange" →
Line Chart     ← reactive update
```

**Schema representation:**
```json
{
  "signals": { "receive": "timeRange" }
}
```

### Pattern 3: Bidirectional Binding

**Example from Snippet 5:**
```
Line Chart ↔↔ "competitor" ↔↔ Table
(user clicks point)   (emits)   (receives & filters)
(receives compare mode)(receives) (emits selection)
```

**Schema representation:**
```json
{
  "signals": {
    "emit": { "name": "competitor" },
    "receive": "compareMode"
  }
}
```

vs.

```json
{
  "signals": {
    "both": "competitor"
  }
}
```

---

## Streaming Configuration Details

### WebSocket (Real-time)
```json
{
  "stream": {
    "type": "ws",
    "url": "ws://api.metrics/revenue"
  }
}
```
- **Use case:** Sub-second updates
- **Latency:** <100ms typical
- **Bandwidth:** Constant connection
- **Best for:** Revenue, active users, live feeds

### Interval Polling
```json
{
  "stream": {
    "type": "interval",
    "interval": 5000
  }
}
```
- **Use case:** Regular updates (2s-30s)
- **Latency:** ~interval/2 average
- **Bandwidth:** Burst requests
- **Best for:** Analytics, aggregated metrics

---

## Fidelity Level Usage

| Level | Rendering | Use Cases |
|-------|-----------|-----------|
| `"hi"` | Full detail | Real-time metrics, interactive charts, primary KPIs |
| `"lo"` | Skeleton/summary | Large datasets, secondary views, responsive layouts |
| `"auto"` | Context-aware | Default, determined by data size and device |
| `"skeleton"` | Placeholder | Loading state before data arrives |
| `"defer"` | Lazy-loaded | Off-screen components loaded on demand |

---

## Binding Types in Schemas

### Field Binding
```json
{
  "binding": {
    "kind": "field",
    "value": "fieldName"
  }
}
```

### Literal Binding
```json
{
  "binding": {
    "kind": "literal",
    "value": "Static text"
  }
}
```

### Multi-field Binding (Charts)
```json
{
  "binding": {
    "kind": "field",
    "value": "date",
    "x": "date",
    "y": "revenue"
  }
}
```

### Indexed Binding (Arrays)
```json
{
  "binding": {
    "kind": "indexed",
    "value": [0, 1, 2]
  }
}
```

---

## Type Code to Component Mapping

| Code | Type | Component | In Snippets |
|------|------|-----------|-------------|
| `1` | kpi | KPI metric card | 1, 3, 5 |
| `2` | bar | Bar chart | 2, 4 |
| `3` | line | Line chart | 2, 3, 5 |
| `5` | table | Data table | 4, 5 |
| `6` | form | Form container | 4 |
| `Gd` | grid | Grid layout | 5 |
| `Hm` | heatmap | Heat map chart | 3 |
| `Tx` | text | Text/paragraph | 1 |
| `Se` | select | Select dropdown | 4 |
| `Dt` | date | Date picker | 4 |
| `Bt` | button | Button | 4 |
| `Br` | bar | Bar chart (named) | 2, 4, 5 |
| `Ln` | line | Line chart (named) | 2, 3, 5 |
| `Kp` | kpi | KPI (named) | 1, 3, 5 |
| `Tb` | table | Table (named) | 4, 5 |
| `Fm` | form | Form (named) | 4 |

---

## Container Layout Types

```json
{
  "layout": {
    "flex": "row"    // Horizontal layout, comma-separated
  }
}
```

```json
{
  "layout": {
    "flex": "column" // Vertical layout, newline-separated
  }
}
```

---

## Condition Structure

### Signal Value Condition
```json
{
  "condition": {
    "signal": "dashboardMode",
    "signalValue": "summary"
  }
}
```
Component visible when `dashboardMode === "summary"`

### Expression Condition
```json
{
  "condition": {
    "expression": "revenue > 10000"
  }
}
```
Component visible when expression evaluates to true

---

## Summary

These schemas demonstrate:

1. **Real-time data:** WebSocket streaming integrated with schema
2. **Responsive design:** Fidelity levels for device/network adaptation
3. **Interactivity:** Signal-based component communication
4. **Complex layouts:** Nested containers with grid and form organization
5. **Conditional rendering:** Data-driven visibility and filtering
6. **Mixed strategies:** Combining WebSocket with polling, high with low fidelity

All patterns maintain roundtrip equivalence, ensuring DSL → Schema → DSL → Schema produces identical results.
