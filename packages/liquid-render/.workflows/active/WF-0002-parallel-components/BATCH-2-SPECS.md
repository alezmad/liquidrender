# Wave 2: P1 Components (8 parallel)

Component specifications for parallel agent implementation.

---

## 1. Avatar (Av)

**DSL Pattern**: `Av :binding` or `Av "initials"` or `Av :image.url`
**Example**: `Av :user.avatar`, `Av "JD"`, `Av :profile.picture`

### Behavior
- Displays user avatar image or initials fallback
- Supports image URL binding or explicit initials
- Size variants: sm, md, lg
- Circular by default, optional square mode

### Props
- `binding`: Field path for image URL or user object
- `initials`: Fallback text (1-2 chars)
- `size`: sm | md | lg (default: md)

### HTML Structure
```tsx
<span data-liquid-type="avatar" data-size="md">
  <img src="..." alt="User" /> // or fallback initials
</span>
```

---

## 2. Radio (Rd)

**DSL Pattern**: `Rd :binding "Label" [opt "value" "Label", ...]`
**Example**: `Rd :user.gender "Gender" [opt "m" "Male", opt "f" "Female", opt "o" "Other"]`

### Behavior
- Radio button group (single selection)
- Stacked or inline layout options
- Updates bound value on selection
- Keyboard navigation (arrow keys)

### Props
- `binding`: Field path for selected value
- `label`: Group label
- `options`: Array of {value, label} from children

### HTML Structure
```tsx
<fieldset data-liquid-type="radio">
  <legend>Gender</legend>
  <label><input type="radio" name="..." value="m" /> Male</label>
  <label><input type="radio" name="..." value="f" /> Female</label>
</fieldset>
```

---

## 3. Range/Slider (Rg)

**DSL Pattern**: `Rg :binding "Label" min max` or `Rg :binding "Label" min max step`
**Example**: `Rg :settings.volume "Volume" 0 100`, `Rg :price "Price" 0 1000 50`

### Behavior
- Slider input for numeric values
- Min/max bounds
- Optional step value
- Shows current value display
- Keyboard accessible

### Props
- `binding`: Field path for numeric value
- `label`: Display label
- `min`: Minimum value
- `max`: Maximum value
- `step`: Step increment (default: 1)

### HTML Structure
```tsx
<div data-liquid-type="range">
  <label>Volume</label>
  <input type="range" min="0" max="100" value="50" />
  <span class="value">50</span>
</div>
```

---

## 4. Accordion (Ac)

**DSL Pattern**: `Ac "Title" [children]` or `Ac :binding [children]`
**Example**: `Ac "Details" [Tx :description]`, `Ac :faq.title [Tx :faq.answer]`

### Behavior
- Expandable/collapsible section
- Click header to toggle content
- Single or multi-expand mode
- Animated open/close transition

### Props
- `title` or `binding`: Header text
- `children`: Content to show when expanded
- `defaultOpen`: Start expanded (default: false)

### HTML Structure
```tsx
<div data-liquid-type="accordion">
  <button class="header" aria-expanded="false">
    <span>Details</span>
    <span class="chevron">▼</span>
  </button>
  <div class="content" hidden>
    {children}
  </div>
</div>
```

---

## 5. Popover (Pp)

**DSL Pattern**: `Pp [trigger] [content]`
**Example**: `Pp [Bt "Info"] [Tx "More details here"]`

### Behavior
- Displays content in floating panel
- Trigger click/hover to show
- Auto-positions (top/bottom/left/right)
- Click outside to dismiss
- Optional arrow indicator

### Props
- `trigger`: Element that triggers popover
- `content`: Popover content (children)
- `placement`: top | bottom | left | right (default: bottom)

### HTML Structure
```tsx
<div data-liquid-type="popover">
  <button class="trigger">Info</button>
  <div class="content" role="tooltip" hidden>
    More details here
  </div>
</div>
```

---

## 6. Tooltip (Tl)

**DSL Pattern**: `Tl [trigger] "tooltip text"` or `Tl [trigger] :binding`
**Example**: `Tl [Ic "info"] "Click for help"`, `Tl [Bt "?"] :helpText`

### Behavior
- Shows text on hover/focus
- Auto-positions near trigger
- Small delay before show
- Disappears on leave/blur

### Props
- `trigger`: Element to attach tooltip to
- `text` or `binding`: Tooltip content
- `placement`: top | bottom | left | right (default: top)

### HTML Structure
```tsx
<span data-liquid-type="tooltip">
  <span class="trigger">{trigger}</span>
  <span class="content" role="tooltip">Click for help</span>
</span>
```

---

## 7. Drawer (Dw)

**DSL Pattern**: `Dw "Title" [content]` with signal to open
**Example**: `sig menu; Bt "Open" >menu; Dw "Menu" <menu [Nav :items]`

### Behavior
- Slides in from edge (left/right/bottom)
- Modal overlay (click to close)
- Header with title + close button
- Scroll lock on body when open

### Props
- `title`: Drawer header text
- `children`: Drawer content
- `position`: left | right | bottom (default: right)
- `signal`: Signal to control open/close

### HTML Structure
```tsx
<div data-liquid-type="drawer" data-position="right">
  <div class="overlay" />
  <div class="panel">
    <div class="header">
      <span>Menu</span>
      <button class="close">×</button>
    </div>
    <div class="content">{children}</div>
  </div>
</div>
```

---

## 8. Stepper (St)

**DSL Pattern**: `St :binding [step "Title", step "Title", ...]`
**Example**: `St :checkout.step [step "Cart", step "Shipping", step "Payment", step "Confirm"]`

### Behavior
- Shows multi-step progress
- Current step highlighted
- Completed steps marked
- Clickable steps (if enabled)
- Horizontal or vertical layout

### Props
- `binding`: Current step index (0-based)
- `steps`: Array of step labels from children
- `orientation`: horizontal | vertical (default: horizontal)

### HTML Structure
```tsx
<div data-liquid-type="stepper" data-orientation="horizontal">
  <div class="step completed">
    <span class="indicator">✓</span>
    <span class="label">Cart</span>
  </div>
  <div class="step active">
    <span class="indicator">2</span>
    <span class="label">Shipping</span>
  </div>
  <div class="step">
    <span class="indicator">3</span>
    <span class="label">Payment</span>
  </div>
</div>
```

---

## Parallel Execution Plan (8 agents)

### Wave 2 - All 8 agents simultaneously
| Agent | Component | File | Complexity |
|-------|-----------|------|------------|
| 1 | Avatar | avatar.tsx | Low |
| 2 | Radio | radio.tsx | Low |
| 3 | Range | range.tsx | Medium |
| 4 | Accordion | accordion.tsx | Medium |
| 5 | Popover | popover.tsx | Medium |
| 6 | Tooltip | tooltip.tsx | Low |
| 7 | Drawer | drawer.tsx | Medium |
| 8 | Stepper | stepper.tsx | Medium |

### Validation
After wave completes:
1. Run `pnpm test` for unit tests
2. Update STATUS.yaml
