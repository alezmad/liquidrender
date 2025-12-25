# Wave 1: P0 Navigation Components (3 parallel)

Core components required for dashboard navigation and filtering.

---

## Agent Prompt Template

Each agent receives this context:

```
You are implementing the {COMPONENT_NAME} component for LiquidCode.

## REQUIRED READING (Do this first!)
1. Read `docs/COMPONENT-GUIDE.md` - Component structure and patterns
2. Read `specs/LIQUID-RENDER-SPEC.md` - DSL specification
3. Read `src/renderer/components/utils.ts` - Design tokens
4. Reference existing component: `src/renderer/components/accordion.tsx`

## Files to Create/Modify
1. `src/renderer/components/{component}.tsx` - Component implementation
2. `tests/{component}.test.ts` - Unit tests (Vitest)
3. `src/compiler/constants.ts` - Add type code
4. `src/renderer/components/index.ts` - Register component

## Checklist
- [ ] Read COMPONENT-GUIDE.md first
- [ ] File follows structure: Types → Styles → Helpers → Sub-components → Main → Static
- [ ] Uses tokens from utils.ts (NO hardcoded colors/spacing)
- [ ] Has data-liquid-type="{type}" on root element
- [ ] Handles empty/null states gracefully
- [ ] Both dynamic + static variants exported
- [ ] Registered in liquidComponents map in index.ts
- [ ] Type code added to constants.ts
- [ ] Unit tests pass: pnpm test {component}
- [ ] Roundtrip test included

## IMPORTANT: Testing Rules
- RUN: `pnpm test tests/{component}.test.ts` (Vitest unit tests)
- DO NOT RUN: `pnpm exec playwright test` (causes resource exhaustion)
- Playwright tests will be run manually by orchestrator after wave completes

When done, output:
COMPONENT_COMPLETE: {component}
FILES_MODIFIED: [list]
TESTS_ADDED: [count]
```

---

## 1. Sidebar (Sd) - HIGH COMPLEXITY

**DSL Pattern:**
```
Sd [nav items...]
Sd ^collapse [nav items...]  // Collapsible mode
Sd ^right [nav items...]     // Right-positioned
```

**Example:**
```
@navState
Sd ^collapse <navState [
  nav "Dashboard" :icon.home >view=dash,
  nav "Analytics" :icon.chart >view=analytics,
  nav "Settings" :icon.gear [
    nav "Profile" >view=profile,
    nav "Billing" >view=billing
  ],
  nav "Logout" :icon.logout >logout
]
```

### Behavior
- Vertical navigation container
- Collapsible: shrinks to icons only when collapsed
- Nested menus: accordion-style expand/collapse
- Active state: highlights item matching current signal value
- Mobile: renders as drawer overlay
- Keyboard: Arrow keys navigate, Enter selects

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| collapsed | signal | false | Controls collapse state |
| position | left\|right | left | Sidebar position |
| width | string | 240px | Expanded width |
| collapsedWidth | string | 64px | Collapsed width |

### HTML Structure
```tsx
<aside data-liquid-type="sidebar" data-collapsed="false" data-position="left">
  <div class="sidebar-content">
    <nav class="sidebar-nav">
      {children}
    </nav>
  </div>
  <button class="sidebar-toggle" aria-label="Toggle sidebar">
    <ChevronLeft />
  </button>
</aside>
```

### Styling Requirements
- Smooth width transition (200ms ease)
- Scrollable content area
- Fixed position relative to viewport
- Z-index above main content
- Shadow on collapsed hover (preview)

### Child Component: nav

**DSL Pattern:**
```
nav "Label" >signal=value           // Basic nav item
nav "Label" :icon.name >signal      // With icon
nav "Label" [nested items...]       // With submenu
nav "Label" :icon Bg :count         // With badge
```

**Props:**
- `label`: Display text
- `icon`: Icon name from library
- `signal`: Click emits this signal
- `children`: Nested nav items (submenu)
- `disabled`: Greys out and disables

---

## 2. Tabs (Ts) - MEDIUM COMPLEXITY

**DSL Pattern:**
```
Ts :binding [tab items...]
Ts :binding #pills [tab items...]   // Pills variant
Ts :binding ^col [tab items...]     // Vertical tabs
```

**Example:**
```
Ts :activeTab [
  tab "Overview" [
    Kp :revenue :orders :customers
  ],
  tab "Details" [
    Tb :transactions [:date :desc :amount]
  ],
  tab "Settings" :disabled [
    Tx "Coming soon"
  ]
]
```

### Behavior
- Tab list renders horizontally (or vertically with ^col)
- Only active panel content is rendered
- Keyboard: Arrow keys switch tabs, Enter/Space selects
- Maintains focus management per WAI-ARIA tabs pattern
- Lazy loading: panels render on first activation

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| binding | field | required | Active tab key/index |
| variant | line\|pills\|boxed | line | Visual style |
| orientation | horizontal\|vertical | horizontal | Tab list direction |
| lazy | boolean | true | Lazy load panels |

### HTML Structure
```tsx
<div data-liquid-type="tabs" data-variant="line">
  <div class="tabs-list" role="tablist">
    <button role="tab" aria-selected="true" aria-controls="panel-0">
      Overview
    </button>
    <button role="tab" aria-selected="false" aria-controls="panel-1">
      Details
    </button>
  </div>
  <div class="tabs-panels">
    <div role="tabpanel" id="panel-0" aria-labelledby="tab-0">
      {active panel content}
    </div>
  </div>
</div>
```

### Child Component: tab

**DSL Pattern:**
```
tab "Label" [content...]
tab "Label" :icon.name [content...]
tab "Label" :disabled [content...]
tab "Label" Bg :count [content...]  // With badge
```

**Props:**
- `label`: Tab button text
- `icon`: Optional icon
- `disabled`: Cannot be selected
- `children`: Panel content

---

## 3. DateRange (Dr) - MEDIUM COMPLEXITY

**DSL Pattern:**
```
Dr :binding                              // Basic
Dr :binding "Select dates"               // With label
Dr :binding [preset options...]          // With presets
Dr :binding #calendar                    // Calendar picker mode
```

**Example:**
```
Dr :dateRange "Report Period" [
  preset "Today" today,
  preset "Yesterday" yesterday,
  preset "Last 7 days" last7d,
  preset "Last 30 days" last30d,
  preset "This month" thisMonth,
  preset "Last month" lastMonth,
  preset "This year" thisYear,
  preset "Custom" custom
]
```

### Behavior
- Default mode: Two dropdowns (start month/year, end month/year)
- Calendar mode: Date picker popover
- Presets: Quick selection buttons
- Emits: `{start: string, end: string}` in ISO format
- Validation: end >= start

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| binding | field | required | Date range value |
| label | string | null | Display label |
| mode | dropdown\|calendar | dropdown | Input mode |
| minDate | string | null | Earliest selectable |
| maxDate | string | null | Latest selectable |
| presets | preset[] | [] | Quick selections |

### HTML Structure
```tsx
<div data-liquid-type="daterange">
  <label>Report Period</label>
  <div class="daterange-inputs">
    <div class="daterange-start">
      <select class="month">...</select>
      <select class="year">...</select>
    </div>
    <span class="separator">to</span>
    <div class="daterange-end">
      <select class="month">...</select>
      <select class="year">...</select>
    </div>
  </div>
  <div class="daterange-presets">
    <button>Last 7 days</button>
    <button>This month</button>
    ...
  </div>
</div>
```

### Child Component: preset

**DSL Pattern:**
```
preset "Label" value
```

Values: `today`, `yesterday`, `last7d`, `last30d`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`, `thisQuarter`, `lastQuarter`, `thisYear`, `lastYear`, `custom`

---

## Parser Requirements

### New Type Codes
Add to `constants.ts`:
```ts
Sd: 'sidebar',
Ts: 'tabs',
Dr: 'daterange',
nav: 'nav',      // Child of sidebar
tab: 'tab',      // Child of tabs
preset: 'preset' // Child of daterange
```

### New Modifiers
- `^collapse` - Sidebar collapse mode
- `^right` - Sidebar right position
- `#pills` - Tabs pills variant
- `#boxed` - Tabs boxed variant
- `#calendar` - DateRange calendar mode

---

## Validation Checklist

For each component:
- [ ] Type code registered in constants.ts
- [ ] Parser handles all DSL patterns
- [ ] Emitter produces valid DSL
- [ ] Roundtrip test passes
- [ ] Component renders correctly
- [ ] Keyboard navigation works
- [ ] ARIA attributes correct
- [ ] Responsive behavior tested
- [ ] Signal integration works
- [ ] Design tokens used (no hardcoded values)
