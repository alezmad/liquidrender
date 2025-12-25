# Wave 1: P0 + P1 Components (8 parallel)

Component specifications for parallel agent implementation.

---

## 1. Switch (Sw)

**DSL Pattern**: `Sw :binding "Label"`
**Example**: `Sw :settings.darkMode "Dark Mode"`

### Behavior
- Toggle between on/off states
- Updates bound value (boolean)
- Visual indicator of current state
- Accessible with keyboard (Space to toggle)

### Props
- `binding`: Field path for boolean value
- `label`: Display label (optional, auto-generated from field)
- `disabled`: Disable interaction

### HTML Structure
```tsx
<label data-liquid-type="switch">
  <input type="checkbox" role="switch" />
  <span class="track"><span class="thumb" /></span>
  <span class="label">Label</span>
</label>
```

---

## 2. Checkbox (Ck)

**DSL Pattern**: `Ck :binding "Label"`
**Example**: `Ck :user.agreed "I agree to terms"`

### Behavior
- Standard checkbox with label
- Updates bound value (boolean)
- Supports indeterminate state for group parent

### Props
- `binding`: Field path for boolean value
- `label`: Display label
- `disabled`: Disable interaction

### HTML Structure
```tsx
<label data-liquid-type="checkbox">
  <input type="checkbox" />
  <span class="checkmark" />
  <span class="label">Label</span>
</label>
```

---

## 3. Tag/Badge (Tg)

**DSL Pattern**: `Tg "Text" #color` or `Tg :binding #color`
**Example**: `Tg "Active" #green`, `Tg :status`

### Behavior
- Display-only label/badge
- Color variants: default, primary, success (#green), warning (#yellow), danger (#red)
- Auto-color based on common values (active=green, pending=yellow, etc.)

### Props
- `text` or `binding`: Content to display
- `color`: Badge color variant

### HTML Structure
```tsx
<span data-liquid-type="tag" data-color="green">
  Active
</span>
```

---

## 4. Progress (Pg)

**DSL Pattern**: `Pg :binding "Label"` or `Pg :binding "Label" {value}`
**Example**: `Pg :upload.progress "Uploading"`, `Pg :task "Progress" 75`

### Behavior
- Shows progress bar with percentage
- Binding returns 0-100 number
- Optional label above bar
- Indeterminate mode when value is null

### Props
- `binding`: Field path for progress value (0-100)
- `label`: Optional label text
- `value`: Static value override

### HTML Structure
```tsx
<div data-liquid-type="progress">
  <div class="header">
    <span class="label">Uploading</span>
    <span class="value">75%</span>
  </div>
  <div class="track">
    <div class="bar" style="width: 75%" />
  </div>
</div>
```

---

## 5. Select (Se)

**DSL Pattern**: `Se :binding "Label" [opt "value" "Label", ...]`
**Example**: `Se :user.role "Role" [opt "admin" "Admin", opt "user" "User"]`

### Behavior
- Dropdown select with options
- Single selection
- Keyboard navigation
- Optional search/filter for long lists

### Props
- `binding`: Field path for selected value
- `label`: Display label
- `options`: Array of {value, label} pairs from children
- `placeholder`: Placeholder text when empty

### HTML Structure
```tsx
<div data-liquid-type="select">
  <label>Role</label>
  <button class="trigger" aria-haspopup="listbox">
    <span class="value">Admin</span>
    <span class="chevron">▼</span>
  </button>
  <ul role="listbox" class="options">
    <li role="option" aria-selected="true">Admin</li>
    <li role="option">User</li>
  </ul>
</div>
```

---

## 6. List/Repeater (Lt)

**DSL Pattern**: `0 ^col *items [Template]` (uses repeat modifier)
**Example**: `0 ^col *tasks [Cd :$.title :$.status]`

### Behavior
- Repeats child template for each item in array
- Provides `$` context for current item
- Supports empty state
- Can combine with any layout (row, col, grid)

### Implementation Notes
This is NOT a new component but a modifier on Container (`*binding`).
The `*` prefix on binding triggers repeat mode:
- Resolves binding to array
- Renders children once per item
- Sets `$` in data context to current item

### Example Resolution
```
DSL: 0 ^col *tasks [Cd :$.title :$.status]
Data: { tasks: [{title: "A", status: "done"}, {title: "B", status: "pending"}] }

Renders:
<div data-liquid-type="container" data-layout="col">
  <div data-liquid-type="card">A / done</div>
  <div data-liquid-type="card">B / pending</div>
</div>
```

---

## 7. Heading (Hd)

**DSL Pattern**: `Hd "Text" #level` or `Hd :binding #level`
**Example**: `Hd "Dashboard" #1`, `Hd :page.title #2`

### Behavior
- Renders semantic heading (h1-h6)
- Level specified by #1 through #6 (default: #2)
- Supports binding for dynamic text

### Props
- `text` or `binding`: Heading content
- `level`: 1-6 (default 2)

### HTML Structure
```tsx
<h2 data-liquid-type="heading" data-level="2">
  Dashboard
</h2>
```

---

## 8. Icon (Ic)

**DSL Pattern**: `Ic "name"` or `Ic "name" #color`
**Example**: `Ic "check" #green`, `Ic "warning" #yellow`

### Behavior
- Renders SVG icon by name
- Common icons: check, x, warning, info, search, plus, minus, edit, trash, settings
- Color variants from design tokens

### Props
- `name`: Icon identifier
- `color`: Optional color variant
- `size`: sm, md, lg (default: md)

### HTML Structure
```tsx
<span data-liquid-type="icon" data-icon="check" data-color="green">
  <svg>...</svg>
</span>
```

### Icon Set (minimal)
Start with 12 essential icons using simple SVG paths:
- `check` - Checkmark
- `x` - Close/remove
- `plus` - Add
- `minus` - Remove
- `edit` - Pencil
- `trash` - Delete
- `search` - Magnifying glass
- `settings` - Gear
- `info` - Info circle
- `warning` - Triangle alert
- `chevron-down` - Dropdown arrow
- `chevron-right` - Expand arrow

---

## Parallel Execution Plan (8 agents)

### Wave 1 - All 8 agents simultaneously
| Agent | Component | File |
|-------|-----------|------|
| 1 | Switch | switch.tsx |
| 2 | Checkbox | checkbox.tsx |
| 3 | Tag | tag.tsx |
| 4 | Progress | progress.tsx |
| 5 | Select | select.tsx |
| 6 | List | (modify container.tsx for repeat) |
| 7 | Heading | heading.tsx |
| 8 | Icon | icon.tsx |

### Validation
After wave completes:
1. Run `pnpm test` for unit tests
2. Run `pnpm exec playwright test` for e2e
3. Update STATUS.yaml
