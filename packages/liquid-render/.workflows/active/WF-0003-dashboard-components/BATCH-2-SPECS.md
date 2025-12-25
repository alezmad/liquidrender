# Wave 2: P1 Dashboard Polish (4 parallel)

Components that elevate dashboard quality and UX.

---

## Agent Prompt Template

Each agent receives this context:

```
You are implementing the {COMPONENT_NAME} component for LiquidCode.

## REQUIRED READING (Do this first!)
1. Read `docs/COMPONENT-GUIDE.md` - Component structure and patterns
2. Read `specs/LIQUID-RENDER-SPEC.md` - DSL specification
3. Read `src/renderer/components/utils.ts` - Design tokens
4. Reference existing: `src/renderer/components/tag.tsx` (simple example)

## Files to Create/Modify
1. `src/renderer/components/{component}.tsx` - Component implementation
2. `tests/{component}.test.ts` - Unit tests (Vitest)
3. `src/compiler/constants.ts` - Add type code
4. `src/renderer/components/index.ts` - Register component

## Checklist
- [ ] Read COMPONENT-GUIDE.md first
- [ ] Uses tokens from utils.ts (NO hardcoded colors/spacing)
- [ ] Has data-liquid-type="{type}" on root element
- [ ] Both dynamic + static variants exported
- [ ] Registered in liquidComponents map
- [ ] Type code added to constants.ts
- [ ] Unit tests pass

## IMPORTANT: Testing Rules
- RUN: `pnpm test tests/{component}.test.ts` (Vitest unit tests)
- DO NOT RUN: Playwright tests (causes resource exhaustion)
- Playwright tests run manually after wave completes

When done, output:
COMPONENT_COMPLETE: {component}
FILES_MODIFIED: [list]
TESTS_ADDED: [count]
```

---

## 1. Header (Hr) - LOW COMPLEXITY

**DSL Pattern:**
```
Hr "Title"                           // Simple header
Hr :title                            // Dynamic title
Hr "Title" [actions...]              // With action slots
Hr "Title" :logo [Bc [...], actions] // Full header
```

**Example:**
```
Hr "Singular Bank ETPs" [
  Se :workspace <>workspace,
  Bt "Help" :icon.help,
  Bt "Notifications" [Bg :unread],
  Av :user.avatar
]
```

### Behavior
- Fixed top bar (sticky by default)
- Left: Logo/title area
- Center: Optional breadcrumb/search slot
- Right: Action buttons, user avatar
- Responsive: Hamburger menu on mobile

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string\|binding | required | Header text |
| logo | string | null | Logo image URL |
| sticky | boolean | true | Fixed position |
| height | string | 64px | Header height |

### HTML Structure
```tsx
<header data-liquid-type="header" data-sticky="true">
  <div class="header-start">
    {logo && <img class="header-logo" src={logo} />}
    <h1 class="header-title">{title}</h1>
  </div>
  <div class="header-center">
    {breadcrumb slot}
  </div>
  <div class="header-end">
    {action children}
  </div>
</header>
```

### Styling Requirements
- Background: surface color with subtle shadow
- Height: 64px standard, 48px compact
- Logo max-height: 32px
- Z-index: above sidebar

---

## 2. Badge (Bg) - LOW COMPLEXITY

**DSL Pattern:**
```
Bg :count                    // Number badge
Bg "New"                     // Text badge
Bg                           // Dot only (no value)
Bg :count #red               // Colored
Bg :count %sm                // Size variant
```

**Example:**
```
// As overlay on icon
Ic "bell" [Bg :notifications]

// As standalone
Bg "Beta" #blue

// With max
Bg :unread                   // Shows "99+" if > 99
```

### Behavior
- Positioned top-right of parent element
- Shows number, text, or dot
- Numbers > 99 show "99+"
- Hides when value is 0, null, or empty
- Animates on value change (pulse)

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | number\|string\|binding | null | Badge content |
| max | number | 99 | Max before "+" |
| dot | boolean | false | Show dot only |
| size | xs\|sm\|md | sm | Badge size |

### HTML Structure
```tsx
<span data-liquid-type="badge" data-size="sm" data-dot="false">
  {value > max ? `${max}+` : value}
</span>
```

### Styling Requirements
- Border-radius: full (pill shape)
- Min-width: matches height for single digit
- Font-size: 10px (xs), 12px (sm), 14px (md)
- Positioned: absolute, top: -4px, right: -4px
- Parent needs: position: relative

### Animation
```css
@keyframes badge-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

---

## 3. Breadcrumb (Bc) - LOW COMPLEXITY

**DSL Pattern:**
```
Bc [crumb items...]
Bc :path                     // From data array
Bc :path #arrows             // Arrow separators
```

**Example:**
```
Bc [
  crumb "Home" >nav=home,
  crumb "Products" >nav=products,
  crumb "Electronics" >nav=electronics,
  crumb "Laptops"            // Current (no signal)
]

// From data: path = ["Home", "Products", "Details"]
Bc :path
```

### Behavior
- Horizontal list with separators
- All items except last are clickable
- Last item is current page (styled differently)
- Truncates with ellipsis on overflow
- Mobile: Shows only last 2 items with "..." prefix

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | crumb[]\|binding | required | Breadcrumb items |
| separator | string | "/" | Item separator |
| maxItems | number | 5 | Max visible items |

### HTML Structure
```tsx
<nav data-liquid-type="breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li>
      <a href="#" data-signal="nav=home">Home</a>
      <span class="separator">/</span>
    </li>
    <li>
      <a href="#" data-signal="nav=products">Products</a>
      <span class="separator">/</span>
    </li>
    <li aria-current="page">
      <span>Details</span>
    </li>
  </ol>
</nav>
```

### Child Component: crumb

**DSL Pattern:**
```
crumb "Label"                // Current page (no link)
crumb "Label" >signal        // Clickable with signal
crumb "Label" :icon.name     // With icon
```

---

## 4. Nav Item (nav) - LOW COMPLEXITY

Child component for Sidebar. Can be implemented alongside Sidebar or separately.

**DSL Pattern:**
```
nav "Label" >signal                  // Basic
nav "Label" :icon.name >signal       // With icon
nav "Label" [children...]            // Submenu
nav "Label" Bg :count                // With badge
nav "Label" :disabled                // Disabled state
```

**Example:**
```
nav "Dashboard" :icon.home >view=dashboard
nav "Reports" :icon.chart [
  nav "Monthly" >view=reports-monthly,
  nav "Annual" >view=reports-annual
]
nav "Messages" :icon.mail Bg :unread >view=messages
```

### Behavior
- Click emits signal (unless has children)
- With children: click toggles submenu
- Active state: matches current signal value
- Collapsed sidebar: shows icon only + tooltip
- Badge overlays icon in collapsed mode

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | required | Display text |
| icon | string | null | Icon name |
| signal | string | null | Click emission |
| children | nav[] | null | Submenu items |
| disabled | boolean | false | Disabled state |
| active | boolean | auto | Active state (auto-detected) |

### HTML Structure
```tsx
<div data-liquid-type="nav" data-active="false" data-has-children="false">
  <button class="nav-trigger">
    {icon && <span class="nav-icon"><Icon name={icon} /></span>}
    <span class="nav-label">{label}</span>
    {badge && <Badge {...badge} />}
    {hasChildren && <ChevronDown class="nav-chevron" />}
  </button>
  {hasChildren && (
    <div class="nav-submenu" data-expanded="false">
      {children}
    </div>
  )}
</div>
```

### Styling Requirements
- Padding: 12px 16px
- Active: primary color background (10% opacity)
- Hover: surface hover color
- Icon size: 20px
- Submenu indent: 24px from parent
- Chevron rotates 180deg when expanded

---

## Parser Requirements

### New Type Codes
Add to `constants.ts`:
```ts
Hr: 'header',
Bg: 'badge',
Bc: 'breadcrumb',
crumb: 'crumb'  // Child of breadcrumb
// nav already added in Wave 1
```

### New Modifiers
- `#arrows` - Breadcrumb arrow separators
- `#chevrons` - Breadcrumb chevron separators

---

## Integration Tests

After Wave 2, verify this dashboard shell renders:

```
@view @notifications

Hr "My Dashboard" [
  Bc [crumb "Home" >view=home, crumb "Dashboard"],
  Bt "Alerts" [Bg :notifications],
  Av :user
]

Cn ^row [
  Sd ^collapse [
    nav "Overview" :icon.home >view=overview,
    nav "Analytics" :icon.chart >view=analytics,
    nav "Settings" :icon.gear [
      nav "Profile" >view=profile,
      nav "Team" >view=team
    ]
  ],

  Cn ^col *10 [
    Ts :tab [
      tab "Summary" [Kp :metrics],
      tab "Details" [Tb :data]
    ]
  ]
]
```

---

## Validation Checklist

For each component:
- [ ] Type code registered in constants.ts
- [ ] Parser handles all DSL patterns
- [ ] Emitter produces valid DSL
- [ ] Roundtrip test passes
- [ ] Component renders correctly
- [ ] Responsive behavior
- [ ] Signal integration
- [ ] Design tokens used
