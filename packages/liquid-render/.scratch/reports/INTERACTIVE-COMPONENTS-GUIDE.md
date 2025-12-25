# Interactive Components Quick Reference

## Overview

This guide provides quick-reference examples for implementing interactive components using the LiquidCode DSL.

---

## 1. Accordion Component (Ac)

**Type Code:** `Ac`

### Basic Accordion
```liquidcode
@accordion_state
Ac "Title" [
  Bt "Section 1" >accordion_state=1,
  ?@accordion_state=1 [Tx "Content 1"],
  Bt "Section 2" >accordion_state=2,
  ?@accordion_state=2 [Tx "Content 2"]
]
```

### Features
- Multiple collapsible sections
- Single-state signal management
- Emit signal with section index
- Conditional rendering per section

### Signal Pattern
```liquidcode
@section_id              # Declare state signal
Ac "Title" [            # Accordion container
  Bt "Label" >section_id=N    # Button emits signal
  ?@section_id=N [...]  # Conditional content
]
```

### Real-World Example
```liquidcode
@active_tab
Ac "FAQ" [
  Bt "Shipping" >active_tab=1 !p,
  ?@active_tab=1 [Tx "Free shipping on orders over $100"],
  Bt "Returns" >active_tab=2 !p,
  ?@active_tab=2 [Tx "30-day return guarantee"],
  Bt "Support" >active_tab=3 !p,
  ?@active_tab=3 [Tx "Contact us 24/7 for help"]
]
```

---

## 2. Carousel Component (Cr)

**Type Code:** `Cr`

### Basic Carousel
```liquidcode
@slide_index
Cr "Title" [
  Tx "Slide 1",
  Tx "Slide 2",
  Tx "Slide 3"
]
Bt "Previous" >slide_index=-1
Bt "Next" >slide_index=+1
```

### Features
- Auto-rotation with streaming (`~Ns` or `~Nm`)
- Navigation buttons
- Manual or automatic advancement
- Supports any component type in slides

### Auto-Rotating Carousel
```liquidcode
@carousel_idx
Cr "Featured" ~5s [    # Auto-rotate every 5 seconds
  Tx "Item 1" !h,
  Tx "Item 2" !h,
  Tx "Item 3" !h
]
```

### With Navigation
```liquidcode
@slide
Cr "Gallery" ~10s [
  Im :image1,
  Im :image2,
  Im :image3
]
Cn ^r [                # Row of buttons
  Bt "◄ Prev" >slide=-1 !s,
  Bt "Next ►" >slide=+1 !s
]
```

### Key Syntax
- `~5s` = 5 second interval
- `~1m` = 1 minute interval
- `~ws://url` = WebSocket stream
- `>carousel_idx=+1` = Increment
- `>carousel_idx=-1` = Decrement

---

## 3. Tabs Component

**Type Code:** None (built with Cn + Conditional blocks)

### Basic Tabs
```liquidcode
@tab_index
Cn ^r [
  Bt "Tab 1" >tab_index=1 !h,
  Bt "Tab 2" >tab_index=2 !p,
  Bt "Tab 3" >tab_index=3 !p
]
?@tab_index=1 [Tx "Content 1"]
?@tab_index=2 [Tx "Content 2"]
?@tab_index=3 [Tx "Content 3"]
```

### Features
- Horizontal button row (flex row)
- Conditional content per tab
- Independent styling per tab button
- Support for complex content

### Multi-Section Tab Group
```liquidcode
@section
Cn ^r [
  Bt "Overview" >section=1 !h,
  Bt "Details" >section=2 !p,
  Bt "Reviews" >section=3 !p
]
?@section=1 [
  Kp :views "Views" !h,
  Kp :rating "Rating" !h
]
?@section=2 [
  Tx "Product Details",
  Tb :specs [:name, :value]
]
?@section=3 [
  Tx "Customer Reviews",
  Ls :reviews
]
```

### Priority Degradation
```liquidcode
!h  # Hero/Active tab
!p  # Primary/Inactive tab
!s  # Secondary/Inactive tab
```

---

## 4. Stepper Component (St)

**Type Code:** `St`

### Basic Stepper
```liquidcode
@step
St "Process" [
  Bt "Step 1" >step=1,
  Bt "Step 2" >step=2,
  Bt "Step 3" >step=3
]
?@step=1 [Tx "Step 1 content"]
?@step=2 [Tx "Step 2 content"]
?@step=3 [Tx "Step 3 content"]
```

### Features
- Sequential step progression
- Visual stepper component
- Form-friendly structure
- State-driven navigation

### Checkout Wizard
```liquidcode
@current_step
St "Checkout" [
  Bt "Personal" >current_step=1 !h,
  Bt "Address" >current_step=2 !p,
  Bt "Payment" >current_step=3 !p,
  Bt "Confirm" >current_step=4 !s
]
?@current_step=1 [
  Fm [In :name, In :email]
]
?@current_step=2 [
  Fm [In :address, In :city]
]
?@current_step=3 [
  Fm [In :card, In :cvv]
]
?@current_step=4 [
  Tx "Confirm order"
]
```

### Step Form Pattern
```liquidcode
?@step=N [           # Conditional block
  Fm [              # Form container
    In :field1,     # Input field
    Se :dropdown,   # Select field
    Ta :textarea    # Textarea field
  ]
]
```

---

## 5. Advanced Patterns

### Multi-Signal Dashboard
```liquidcode
@view @metric
Ac "Metrics" [
  Bt "Revenue" >view=revenue,
  ?@view=revenue [Ln :date :revenue ~5s],
  Bt "Traffic" >view=traffic,
  ?@view=traffic [Br :source :count]
]
Cn [
  Bt "This Week" >metric=week,
  Bt "This Month" >metric=month
]
?@metric=week [Tb :weekly [:date, :value]]
?@metric=month [Tb :monthly [:date, :value]]
```

### Real-Time Updates
```liquidcode
Ln :time :temperature ~5s  # Update every 5 seconds
Kp :stock_price ~1s        # Update every 1 second
```

### Nested Containers
```liquidcode
Cn ^r [        # Row layout
  Cn [         # Left column
    Kp :a,
    Kp :b
  ],
  Cn [         # Right column
    Br :chart
  ]
]
```

---

## Common Modifiers

| Modifier | Purpose | Examples |
|----------|---------|----------|
| `!h` | Hero (highest priority) | Active tab, main button |
| `!p` | Primary (medium priority) | Secondary tabs, actions |
| `!s` | Secondary (low priority) | Inactive tabs, help buttons |
| `^r` | Row layout (horizontal) | Tab buttons, button groups |
| `^c` | Column layout (vertical) | Stacked sections |
| `*2` | Span 2 units | Wide items |
| `#color` | Color styling | `#blue`, `#green`, `#red` |
| `~5s` | Stream interval | Real-time updates |

---

## Signal Patterns

### Enumeration Signal
```liquidcode
@view
Bt "Revenue" >view=revenue  # Named values
Bt "Traffic" >view=traffic
```

### Numeric Signal
```liquidcode
@step
Bt "Next" >step=+1    # Arithmetic
Bt "Back" >step=-1
```

### Index Signal
```liquidcode
@tab_idx
Bt "Tab 1" >tab_idx=1  # Direct values
Bt "Tab 2" >tab_idx=2
Bt "Tab 3" >tab_idx=3
```

### Bidirectional Signal
```liquidcode
@toggle
Bt "Settings" <>toggle  # Read/write both directions
Kp :value <toggle       # Display current state
```

---

## Testing Your Components

### Parse a Snippet
```typescript
import { parseUI } from './src/compiler/compiler';

const schema = parseUI(`
  @tab
  Cn ^r [Bt "A" >tab=1, Bt "B" >tab=2]
  ?@tab=1 [Tx "Content A"]
  ?@tab=2 [Tx "Content B"]
`);
console.log(schema);
```

### Verify Roundtrip
```typescript
import { parseUI, roundtripUI } from './src/compiler/compiler';

const schema = parseUI(snippet);
const { isEquivalent, differences } = roundtripUI(schema);

if (isEquivalent) {
  console.log('✓ Roundtrip successful');
} else {
  console.log('✗ Differences found:', differences);
}
```

---

## Best Practices

1. **Always declare signals** before use
   ```liquidcode
   @my_signal      # Declare first
   Bt "Click" >my_signal=value
   ```

2. **Use priority modifiers** for visual hierarchy
   ```liquidcode
   Bt "Active" >tab=1 !h      # Hero (active)
   Bt "Inactive" >tab=2 !p    # Primary (inactive)
   ```

3. **Keep signal values simple** (numeric or short strings)
   ```liquidcode
   >tab=1              # ✓ Good
   >view=revenue       # ✓ Good
   >step=next_form     # ✓ OK (no spaces)
   >action=go_to_page  # ✓ OK
   ```

4. **Group related conditional blocks**
   ```liquidcode
   Bt "A" >tab=1
   ?@tab=1 [...]      # Content immediately after
   Bt "B" >tab=2
   ?@tab=2 [...]      # Next content block
   ```

5. **Use flex modifiers** for layout
   ```liquidcode
   Cn ^r [...]        # Horizontal row
   Cn ^c [...]        # Vertical column (default)
   ```

---

## Troubleshooting

### Signals not updating
- Ensure signal is declared with `@`
- Check conditional blocks use correct signal name
- Verify emission uses `>` syntax

### Content not appearing
- Check condition syntax: `?@signal=value`
- Ensure value matches emitted signal value
- Verify content is within bracket array

### Layout issues
- Use `^r` for rows, `^c` for columns
- Check nesting depth (max ~5 reasonable)
- Use span modifiers (`*2`, `*3`) for sizing

### Parsing errors
- Ensure all brackets are balanced
- Check for unterminated strings
- Verify all signals are declared

---

## Reference Links

- **Type Codes:** See `constants.ts` UI_TYPE_CODES
- **Modifiers:** See UI_MODIFIER_SYMBOLS in constants.ts
- **Full Spec:** LIQUID-RENDER-SPEC.md
- **Test Suite:** test-interactive-components.ts

---

## Examples Summary

| Component | Type Code | Key Features |
|-----------|-----------|--------------|
| Accordion | Ac | Multi-section, state-driven |
| Carousel | Cr | Auto-rotating, navigation |
| Tabs | Cn+? | Row buttons, conditional content |
| Stepper | St | Sequential, form-focused |
| Dashboard | Multi | Multiple signals, real-time |

---

**Last Updated:** 2025-12-24
**Status:** Production Ready ✓
