# WF-0003: Dashboard-Ready Components

Level up LiquidCode to build enterprise dashboards like Singular Bank ETPs.

## Objective

Add missing navigation, layout, and interaction components needed to build production dashboards without workarounds.

---

## Required Reading

Before implementing any component, agents MUST read:

1. **Component Guide**: `docs/COMPONENT-GUIDE.md`
   - File structure (Types → Styles → Helpers → Sub-components → Main → Static)
   - Design tokens from `utils.ts`
   - Required `data-liquid-type` attribute
   - Empty/null state handling
   - Dynamic + Static variant exports

2. **DSL Specification**: `specs/LIQUID-RENDER-SPEC.md`
   - Signal system (`@`, `>`, `<`, `<>`)
   - Modifier syntax (`:`, `#`, `!`, `^`, `*`, `$`, `~`)
   - Child block syntax `[...]`
   - Conditional blocks `?@signal=value`

3. **Grammar**: `specs/grammar.ebnf`
   - Formal DSL syntax
   - Token definitions
   - Canonical modifier order

4. **Constants**: `src/compiler/constants.ts`
   - Existing type codes
   - Modifier symbols
   - Type indices

---

## Gap Analysis

Based on Singular Bank dashboard requirements:

| Current Capability | Gap | Solution |
|--------------------|-----|----------|
| Buttons as nav items | No sidebar navigation | **Sidebar (Sd)** component |
| Buttons with signals | No proper tabs | **Tabs (Ts)** component |
| Manual Se dropdowns | No date range picker | **DateRange (Dr)** component |
| Basic Cn layout | No app header | **Header (Hr)** component |
| Ic component exists | No icon library | **Lucide integration** |
| Static colors | No theme switching | **Theme context** |
| No indicators | No notification dots | **Badge (Bg)** component |

---

## Architecture

### Wave 1: Navigation & Layout (P0)
Core components blocking dashboard builds.

```
┌─────────────────────────────────────────────────────────────┐
│ Hr "App Title" :user [Bt "Settings", Av :user.avatar]       │
├────────────┬────────────────────────────────────────────────┤
│            │ Ts :activeTab [                                │
│  Sd [      │   tab "Overview" [Kp :metrics],                │
│    nav ... │   tab "Details" [Tb :data],                    │
│    nav ... │   tab "Charts" [Ln :trend]                     │
│  ]         │ ]                                              │
│            │                                                │
│            │ Dr :dateRange                                  │
└────────────┴────────────────────────────────────────────────┘
```

### Wave 2: Polish & UX (P1)
Components that elevate dashboard quality.

- Badge for notifications
- Breadcrumb for deep navigation
- Theme toggle
- Icon library expansion

---

## Component Specifications

### 1. Sidebar (Sd) - Priority 0

**DSL Pattern:**
```
Sd [
  nav "Dashboard" :icon.home >view=dash,
  nav "Reports" :icon.chart [
    nav "Monthly" >view=monthly,
    nav "Annual" >view=annual
  ],
  nav "Settings" :icon.gear >view=settings
]
```

**Behavior:**
- Collapsible with `^collapse` modifier
- Active item highlight via signal match
- Nested menus (accordion-style)
- Icon + label + optional badge
- Mobile: drawer behavior

**Props:**
- `collapsed`: boolean (controlled via signal)
- `children`: nav items
- `position`: left | right (default: left)

---

### 2. Tabs (Ts) - Priority 0

**DSL Pattern:**
```
Ts :activeTab [
  tab "Tab One" [content for tab 1],
  tab "Tab Two" [content for tab 2],
  tab "Tab Three" :disabled [content for tab 3]
]
```

**Behavior:**
- Horizontal tab list (vertical via `^col`)
- Only active panel renders
- Keyboard navigation (arrow keys)
- Optional: pills style with `#pills`

**Props:**
- `binding`: active tab index or key
- `children`: tab items with content
- `variant`: line | pills | boxed (default: line)

---

### 3. DateRange (Dr) - Priority 0

**DSL Pattern:**
```
Dr :dateRange "Select Period"
Dr :dateRange [preset "Last 7 days", preset "Last 30 days", preset "This year"]
```

**Behavior:**
- Month + Year dropdowns OR calendar picker
- Preset quick selections
- Emits `{start, end}` date object
- Localized month names

**Props:**
- `binding`: date range value `{start: Date, end: Date}`
- `label`: display label
- `presets`: optional quick selections
- `mode`: dropdown | calendar (default: dropdown)

---

### 4. Header (Hr) - Priority 1

**DSL Pattern:**
```
Hr "Dashboard" [Bt "Help", Av :user]
Hr :title [Se :workspace, Bt "Notifications" Bg :count]
```

**Behavior:**
- Fixed top bar
- Logo/title slot (left)
- Actions slot (right)
- Optional breadcrumb slot

**Props:**
- `title` or `binding`: header text
- `children`: action components (right-aligned)
- `sticky`: boolean (default: true)

---

### 5. Badge (Bg) - Priority 1

**DSL Pattern:**
```
Bg :count                    // Shows number
Bg "New"                     // Shows text
Bg :unread #red              // With color
Ic "bell" [Bg :notifications] // Icon with badge
```

**Behavior:**
- Small indicator overlay
- Number or dot or text
- Positioned top-right of parent
- Hides when value is 0/null

**Props:**
- `value` or `binding`: number/string to display
- `max`: max before showing "99+" (default: 99)
- `dot`: boolean, show dot instead of number

---

### 6. Breadcrumb (Bc) - Priority 1

**DSL Pattern:**
```
Bc [crumb "Home" >nav=home, crumb "Products" >nav=products, crumb "Details"]
Bc :path                     // From data binding
```

**Behavior:**
- Horizontal trail with separators
- Last item is current (non-clickable)
- Clickable items emit navigation signal

---

## Implementation Order

### Wave 1 (3 parallel agents)
| Agent | Component | Complexity | Blocks |
|-------|-----------|------------|--------|
| 1 | Sidebar (Sd) | High | Dashboard navigation |
| 2 | Tabs (Ts) | Medium | Content switching |
| 3 | DateRange (Dr) | Medium | Date filtering |

### Wave 2 (4 parallel agents)
| Agent | Component | Complexity | Blocks |
|-------|-----------|------------|--------|
| 1 | Header (Hr) | Low | App shell |
| 2 | Badge (Bg) | Low | Notifications |
| 3 | Breadcrumb (Bc) | Low | Navigation |
| 4 | Nav item (nav) | Low | Sidebar children |

---

## Success Criteria

After WF-0003 completes, this DSL should render a full dashboard:

```
@view @dateRange @user

Hr "Singular Bank ETPs" [Av :user, Bt "Logout" >logout]

Cn ^row [
  Sd ^collapse [
    nav "Dashboard" >view=dash,
    nav "Patrimonio" >view=patrimonio,
    nav "Vista ISIN" >view=isin,
    nav "Gestoras" [
      nav "Activas" >view=gestoras-active,
      nav "Historico" >view=gestoras-history
    ]
  ],

  Cn ^col *10 [
    Bc [crumb "Dashboard" >view=dash, crumb "Resumen"],

    Ts :tabView [
      tab "Mes Actual" [
        Dr :dateRange,
        Kp :patrimonio :etps :focusList :topGestora,
        Ln :month :valor
      ],
      tab "6 Meses" [...],
      tab "Anual" [...]
    ]
  ]
]
```

---

## Dependencies

- Wave 1 has no blockers (builds on existing patterns)
- Wave 2 Badge requires positioning logic from Tooltip
- Sidebar uses Accordion expand/collapse pattern

---

## Testing Strategy

### Agent Testing (during implementation)
- **Unit tests only**: `pnpm test tests/{component}.test.ts`
- Parser, emitter, roundtrip for each component
- **DO NOT run Playwright** (causes resource exhaustion with parallel agents)

### Orchestrator Testing (after wave completes)
- Run full test suite: `pnpm test`
- Visual tests: `pnpm exec playwright test` (manual, sequential)
- E2E: Full dashboard render with mock data
