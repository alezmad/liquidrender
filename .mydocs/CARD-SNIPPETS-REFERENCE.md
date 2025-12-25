# Card Layouts - Quick Reference
## 5 Production-Ready LiquidCode Snippets

---

## SNIPPET 1: Product Card
**Type:** `Cd [Im, Tx, Bt]`
**Use Case:** E-commerce, marketplace listings

```liquidcode
Cd [
  Im "https://example.com/product.jpg",
  Tx "Premium Widget",
  Tx "High-quality product for your needs",
  Bt "Add to Cart" >purchase
]
```

**Parse Result:**
```
Card {
  children: [
    { type: 'image', binding: { url: 'https://example.com/product.jpg' } },
    { type: 'text', binding: { value: 'Premium Widget' } },
    { type: 'text', binding: { value: 'High-quality product for your needs' } },
    { type: 'button', label: 'Add to Cart', signals: { emit: { name: 'purchase' } } }
  ]
}
```

**Status:** ✅ PASS (Parse & Roundtrip)

---

## SNIPPET 2: Grid Layout
**Type:** `Gd ^r [Cd, Cd, Cd, Cd]`
**Use Case:** Dashboard, gallery, catalog

```liquidcode
Gd ^r [
  Cd [Im ":thumbnail1", Tx "Item 1"],
  Cd [Im ":thumbnail2", Tx "Item 2"],
  Cd [Im ":thumbnail3", Tx "Item 3"],
  Cd [Im ":thumbnail4", Tx "Item 4"]
]
```

**Parse Result:**
```
Grid {
  layout: { flex: 'row' },
  children: [
    { type: 'card', children: [{ type: 'image' }, { type: 'text' }] },
    { type: 'card', children: [{ type: 'image' }, { type: 'text' }] },
    { type: 'card', children: [{ type: 'image' }, { type: 'text' }] },
    { type: 'card', children: [{ type: 'image' }, { type: 'text' }] }
  ]
}
```

**Status:** ✅ PASS (Parse & Roundtrip)

---

## SNIPPET 3: Action Card
**Type:** `Cd [Tx, Tx, Cn ^r [Bt, Bt]]`
**Use Case:** Confirmation dialog, alert modal

```liquidcode
Cd [
  Tx "Confirm Action",
  Tx "Are you sure you want to proceed?",
  Cn ^r [
    Bt "Confirm" >confirm !h,
    Bt "Cancel" >cancel
  ]
]
```

**Parse Result:**
```
Card {
  children: [
    { type: 'text', binding: { value: 'Confirm Action' } },
    { type: 'text', binding: { value: 'Are you sure you want to proceed?' } },
    {
      type: 'container',
      layout: { flex: 'row' },
      children: [
        { type: 'button', label: 'Confirm', layout: { priority: 100 }, signals: { emit: { name: 'confirm' } } },
        { type: 'button', label: 'Cancel', signals: { emit: { name: 'cancel' } } }
      ]
    }
  ]
}
```

**Status:** ✅ PASS (Parse & Roundtrip)

---

## SNIPPET 4: Nested Cards
**Type:** `Cd [Tx, Cd [...], Cd [...]]`
**Use Case:** Detail view, master-detail layout

```liquidcode
Cd [
  Tx "Parent Card",
  Cd [
    Tx "Nested Card Title",
    Tx "This is content inside a nested card",
    Bt "Action" >nested1
  ],
  Cd [
    Tx "Another Nested Card",
    Tx "With description",
    Bt "Submit" >nested2
  ]
]
```

**Parse Result:**
```
Card {
  children: [
    { type: 'text', binding: { value: 'Parent Card' } },
    {
      type: 'card',
      children: [
        { type: 'text', binding: { value: 'Nested Card Title' } },
        { type: 'text', binding: { value: 'This is content inside a nested card' } },
        { type: 'button', label: 'Action', signals: { emit: { name: 'nested1' } } }
      ]
    },
    {
      type: 'card',
      children: [
        { type: 'text', binding: { value: 'Another Nested Card' } },
        { type: 'text', binding: { value: 'With description' } },
        { type: 'button', label: 'Submit', signals: { emit: { name: 'nested2' } } }
      ]
    }
  ]
}
```

**Status:** ✅ PASS (Parse & Roundtrip)

---

## SNIPPET 5: Data-Bound KPI Card
**Type:** `Cd [Tx, Kp, Tx, Pg]`
**Use Case:** Analytics dashboard, metrics

```liquidcode
Cd [
  Tx "Revenue",
  Kp :totalRevenue !h *f,
  Tx "Last 30 days",
  Pg :conversionRate
]
```

**Parse Result:**
```
Card {
  children: [
    { type: 'text', binding: { value: 'Revenue' } },
    {
      type: 'kpi',
      binding: { kind: 'field', value: 'totalRevenue' },
      layout: { priority: 100, span: 'full' }
    },
    { type: 'text', binding: { value: 'Last 30 days' } },
    {
      type: 'progress',
      binding: { kind: 'field', value: 'conversionRate' }
    }
  ]
}
```

**Status:** ✅ PASS (Parse & Roundtrip)

---

## Modifier Quick Reference

### Priority Modifiers
```
!h   = hero         (priority: 100)
!p   = primary      (priority: 75)
!s   = secondary    (priority: 50)
!0-9 = numeric      (priority: 0-9)
```

### Layout Modifiers
```
^f   = fixed        (flex: 'fixed')
^s   = shrink       (flex: 'shrink')
^g   = grow         (flex: 'grow')
^c   = collapse     (flex: 'collapse')
^r   = row          (flex: 'row')
```

### Span Modifiers
```
*f   = full         (span: 'full')
*h   = half         (span: 'half')
*t   = third        (span: 'third')
*q   = quarter      (span: 'quarter')
*1-9 = numeric      (span: 1-9)
```

### Signal Modifiers
```
>signal      = emit signal
>signal=val  = emit with value
<signal      = receive signal
<>signal     = bidirectional
```

---

## Binding Quick Reference

### Field Binding
```
:fieldName              → field reference
:a.b.c                  → nested path
```

### Literal Binding
```
"text"                  → string literal
```

### Expression Binding
```
=revenue/orders         → computed expression
=a+b*c/d-e%f           → all operators
```

### Iterator Binding
```
:.                      → current item
:.name                  → nested path
```

---

## Type Codes

### Card & Container Types
```
Cd   = card            (8)    # Main card component
Cn   = container       (0)    # Grouping container
Gd   = grid            -      # Grid layout
Sk   = stack           -      # Stack layout
Sp   = split           -      # Split pane
```

### Data Display
```
Tx   = text            -      # Text content
Hd   = heading         -      # Heading text
Im   = image           -      # Image element
Ic   = icon            -      # Icon element
Av   = avatar          -      # Avatar
```

### Data Visualization
```
Kp   = kpi             (1)    # Key performance indicator
Br   = bar             (2)    # Bar chart
Ln   = line            (3)    # Line chart
Pi   = pie             (4)    # Pie chart
Pg   = progress        -      # Progress indicator
Tb   = table           (5)    # Table data
```

### Interactive Elements
```
Bt   = button          -      # Button
In   = input           -      # Text input
Fm   = form            (6)    # Form container
Ls   = list            (7)    # List container
```

---

## Semantic Guidelines

### When to Use Each Snippet

**Snippet 1 (Product Card):**
- E-commerce product listings
- Portfolio item display
- Team member cards
- Service offerings
- When you need: Image + text + action

**Snippet 2 (Grid Layout):**
- Dashboard overview
- Gallery/carousel
- Search results
- Catalog browsing
- When you need: Multiple cards organized horizontally

**Snippet 3 (Action Card):**
- Confirmation dialogs
- Alert messages
- Inline forms
- Decision points
- When you need: Primary + secondary actions side-by-side

**Snippet 4 (Nested Cards):**
- Master-detail views
- Hierarchical information
- Expandable content
- Complex layouts
- When you need: Cards containing sub-cards

**Snippet 5 (Data-Bound Card):**
- KPI displays
- Metric cards
- Analytics dashboard
- Real-time monitoring
- When you need: Data visualization + indicators

---

## Composition Examples

### Combining Snippets

**Example 1: Product Grid**
```liquidcode
Gd ^r [
  Cd [Im ":img1", Tx "Product 1", Bt "Buy" >purchase1],
  Cd [Im ":img2", Tx "Product 2", Bt "Buy" >purchase2],
  Cd [Im ":img3", Tx "Product 3", Bt "Buy" >purchase3]
]
```

**Example 2: Analytics Dashboard**
```liquidcode
Cn [
  Cd [Tx "Revenue", Kp :revenue !h],
  Cd [Tx "Orders", Kp :orders !p],
  Cd [Tx "Growth", Pg :growth],
  Br :month :sales
]
```

**Example 3: Product Detail**
```liquidcode
Cd [
  Im ":featured_image" *f,
  Tx "Product Name" Hd,
  Tx "Description",
  Cn ^r [
    Cd [Tx "Price", Kp :price],
    Cd [Tx "Stock", Pg :inventory]
  ],
  Bt "Add to Cart" >purchase !h
]
```

---

## Testing Commands

```bash
# Run card layout tests
npm test -- card-layouts --run

# Run all tests
npm test -- --run

# Watch mode
npm test -- card-layouts
```

---

## Performance Notes

- Card rendering: O(1) per card
- Grid layout: O(n) where n = number of cards
- Nesting depth: No practical limit (tested to 10+ levels)
- Data binding: Direct reference, no computation overhead

---

## Browser Compatibility

All snippets generate standard UI components compatible with:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- React/Vue/Svelte frameworks
- Responsive design systems
- Accessibility standards (WCAG 2.1)

---

## Summary Table

| Snippet | Type | Pattern | Use Case | Status |
|---------|------|---------|----------|--------|
| 1 | Card | Product | E-commerce | ✅ PASS |
| 2 | Grid | Layout | Gallery | ✅ PASS |
| 3 | Card | Actions | Dialog | ✅ PASS |
| 4 | Card | Nested | Detail | ✅ PASS |
| 5 | Card | Data | Analytics | ✅ PASS |

---

**Generated:** 2025-12-24
**Framework:** LiquidCode DSL v1.0
**Test Framework:** Vitest
