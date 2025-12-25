---
component: Sidebar
code: Sd
liquid_file: packages/liquid-render/src/renderer/components/sidebar.tsx
shadcn_ref: sidebar
auditor: agent
date: 2025-12-25
scores:
  accessibility: 5
  api_design: 5
  design_tokens: 9
  features: 4
  testing: 7
  total: 30
priority: P1
---

# Audit: Sidebar

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/sidebar.tsx` |
| shadcn reference | `sidebar` |
| DSL code | `Sd` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct (partial - has `aria-current`, `aria-label`, `aria-expanded`)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys) - **Missing arrow key support**
- [ ] Focus management correct (focus trap for modals, focus ring visible) - **No visible focus ring styles**
- [ ] Works with screen readers (tested with VoiceOver/NVDA) - **Not verified**
- [ ] Color contrast meets WCAG AA - **Uses CSS variables, depends on theme**

### Findings

**liquid-render implementation:**

```typescript
// Good: Has aria-current for active state
<button
  onClick={handleClick}
  style={itemStyle}
  aria-current={isActive ? 'page' : undefined}
>

// Good: Toggle button has aria-label and aria-expanded
<button
  onClick={toggleCollapsed}
  onMouseEnter={() => setHoverToggle(true)}
  onMouseLeave={() => setHoverToggle(false)}
  style={toggleButtonStyle}
  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
  aria-expanded={!isCollapsed}
>
```

**Issues Found:**
1. No `role="menubar"` or `role="menu"` for the navigation structure
2. No keyboard navigation with arrow keys (Up/Down/Left/Right)
3. No focus ring/outline styles defined
4. No `aria-haspopup` for items with children
5. No `tabIndex` management for collapsed items
6. Missing keyboard shortcut support (Cmd+B to toggle)

### shadcn Comparison

shadcn has comprehensive keyboard support:

```typescript
// shadcn: Keyboard shortcut to toggle sidebar
React.useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault()
      toggleSidebar()
    }
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}, [toggleSidebar])

// shadcn: Focus ring with ring-sidebar-ring
const sidebarMenuButtonVariants = cva(
  "... ring-sidebar-ring ... outline-hidden ... focus-visible:ring-2 ..."
)

// shadcn: Disabled state handling
"disabled:pointer-events-none disabled:opacity-50 ... aria-disabled:pointer-events-none aria-disabled:opacity-50"
```

### Score: 5/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.) - **Missing variant/size props**
- [ ] Consistent variants across components - **No variants**
- [x] Supports both controlled and uncontrolled modes - **StaticSidebar has `collapsed` prop and `onToggle`**
- [ ] TypeScript types are complete and exported - **Missing several types**
- [x] Default props are sensible

### Current Props (liquid-render)

```typescript
// Dynamic component (DSL-driven)
export function Sidebar({ block, data, children }: LiquidComponentProps): React.ReactElement

// Static component
export interface StaticSidebarProps {
  items: Array<{
    label: string;
    value?: unknown;
    children?: Array<{ label: string; value?: unknown }>;
  }>;
  activeValue?: unknown;
  collapsed?: boolean;
  position?: 'left' | 'right';
  width?: number | string;
  onSelect?: (value: unknown) => void;
  onToggle?: (collapsed: boolean) => void;
  style?: React.CSSProperties;
}
```

### shadcn Props

```typescript
// shadcn has modular components with rich props
function Sidebar({
  side = "left",
  variant = "sidebar",         // "sidebar" | "floating" | "inset"
  collapsible = "offcanvas",   // "offcanvas" | "icon" | "none"
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
})

// Provider for controlled state
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
})

// Menu button with variants
function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",    // "default" | "outline"
  size = "default",       // "default" | "sm" | "lg"
  tooltip,
  className,
  ...props
}: ...)
```

### Gaps
1. **No `variant` prop** - shadcn has "sidebar", "floating", "inset"
2. **No `collapsible` prop** - shadcn has "offcanvas", "icon", "none"
3. **No `asChild` pattern** - shadcn uses Radix Slot for polymorphism
4. **No provider pattern** - shadcn uses SidebarContext for state sharing
5. **No `tooltip` support** - shadcn shows tooltips in collapsed mode
6. **No `size` variants** for menu items
7. **No `className` support** - uses inline styles only
8. **Limited depth support** - only 2 levels vs shadcn's unlimited

### Score: 5/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [x] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

Only minor violations:

```typescript
// Hardcoded width values (line 44-49)
wrapperCollapsed: {
  width: '60px',    // Should use tokens or CSS variable
} as React.CSSProperties,

wrapperExpanded: {
  width: '240px',   // Should use tokens or CSS variable
} as React.CSSProperties,
```

**Good usage examples:**

```typescript
// Proper token usage throughout
backgroundColor: tokens.colors.card,
borderRight: `1px solid ${tokens.colors.border}`,
transition: `width ${tokens.transition.normal}`,
padding: tokens.spacing.sm,
gap: tokens.spacing.xs,
borderRadius: tokens.radius.md,
fontSize: tokens.fontSize.sm,
fontWeight: tokens.fontWeight.medium,
```

Compare with shadcn's approach using CSS variables:

```typescript
// shadcn: Uses CSS variables for width
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"

style={{
  "--sidebar-width": SIDEBAR_WIDTH,
  "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
  ...style,
} as React.CSSProperties}
```

### Score: 9/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic sidebar container
- [x] Navigation items with labels
- [x] Collapsible/expandable functionality
- [x] Active item highlighting (`aria-current`)
- [x] Nested navigation (children support)
- [x] Signal binding for active state
- [x] Left/right positioning
- [x] Toggle button with icon rotation

### shadcn Features
- [x] Basic sidebar container
- [x] Navigation items with labels
- [x] Collapsible/expandable functionality
- [x] Active item highlighting (`data-active`)
- [x] Nested navigation (SidebarMenuSub)
- [x] Context-based state management
- [x] Left/right positioning
- [x] Toggle button (SidebarTrigger)
- [x] **Mobile sheet behavior** - liquid-render missing
- [x] **Multiple variants (sidebar/floating/inset)** - liquid-render missing
- [x] **Multiple collapsible modes (offcanvas/icon/none)** - liquid-render missing
- [x] **Keyboard shortcut (Cmd+B)** - liquid-render missing
- [x] **Tooltip support in collapsed mode** - liquid-render missing
- [x] **Cookie persistence** - liquid-render missing
- [x] **SidebarRail for drag resize** - liquid-render missing
- [x] **Skeleton loading state** - liquid-render missing
- [x] **Menu badges** - liquid-render missing
- [x] **Menu actions** - liquid-render missing
- [x] **Header/Footer/Content sections** - liquid-render missing
- [x] **Input component** - liquid-render missing
- [x] **Separator component** - liquid-render missing
- [x] **Group labels** - liquid-render missing

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic sidebar | Yes | Yes | - |
| Collapse/expand | Yes | Yes | - |
| Active state | Yes | Yes | - |
| Nested items | Yes | Yes | - |
| Mobile sheet | No | Yes | P1 |
| Variants (floating/inset) | No | Yes | P2 |
| Collapsible modes | No | Yes | P2 |
| Keyboard shortcuts | No | Yes | P1 |
| Tooltip on collapse | No | Yes | P1 |
| State persistence | No | Yes | P3 |
| Drag resize (Rail) | No | Yes | P3 |
| Loading skeleton | No | Yes | P2 |
| Menu badges | No | Yes | P2 |
| Menu actions | No | Yes | P2 |
| Header/Footer slots | No | Yes | P1 |
| Search input | No | Yes | P2 |
| Group labels | No | Yes | P1 |

### Code Comparison

**shadcn's modular architecture (29 exported components/hooks):**

```typescript
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
```

**liquid-render exports (2 components):**

```typescript
export { Sidebar, StaticSidebar }
```

**shadcn's mobile responsiveness:**

```typescript
// Automatically uses Sheet on mobile
if (isMobile) {
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
      <SheetContent
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-mobile="true"
        className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
        style={{
          "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
        } as React.CSSProperties}
        side={side}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Sidebar</SheetTitle>
          <SheetDescription>Displays the mobile sidebar.</SheetDescription>
        </SheetHeader>
        <div className="flex h-full w-full flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
```

**liquid-render has no mobile handling** - renders same on all screen sizes.

### Score: 4/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (null, empty, overflow)
- [ ] Covers error states - **Not covered**
- [ ] Accessibility tests (if applicable) - **Not covered**
- [ ] Snapshot tests (if applicable) - **Not applicable**

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/sidebar.test.ts`
- Test count: 25 test cases in 11 describe blocks
- Coverage: Parser/DSL only (no render tests)

### Test Categories
1. **Basic Parsing** (3 tests)
   - Parse basic sidebar with nav items
   - Parse sidebar with signal binding
   - Parse collapsible sidebar with ^collapse modifier

2. **Navigation Items** (4 tests)
   - Signal-emitting nav items
   - Nested navigation items
   - Active state tracking

3. **Layout and Position** (3 tests)
   - Position modifier
   - Full width span
   - Sidebar in container layout

4. **Complex Navigation Patterns** (2 tests)
   - Multi-level navigation with signal propagation
   - Sidebar with icons in nav items

5. **Collapsible Behavior** (2 tests)
   - Collapsible sidebar with toggle
   - Fixed width when expanded

6. **Integration with Pages** (1 test)
   - Sidebar with content layout

7. **Keyboard Navigation** (1 test)
   - Keyboard-navigable nav items (DSL parse only, not actual keyboard events)

8. **Styling and Theming** (2 tests)
   - Color modifier
   - Nav items with color

9. **Empty and Edge Cases** (3 tests)
   - Empty sidebar
   - Single nav item
   - Deeply nested navigation

10. **Real-World Examples** (2 tests)
    - Full dashboard layout
    - E-commerce site navigation

### Missing Tests
1. **React render tests** - No RTL/React testing
2. **Keyboard navigation** - Actual key event handling
3. **Focus management** - Focus trap, tab order
4. **Collapse/expand animation** - Transition behavior
5. **Screen reader** - ARIA announcement verification
6. **Mobile responsive** - Not applicable (feature missing)
7. **Active state toggle** - Click handler testing
8. **Hover state** - CSS state testing
9. **Error boundaries** - Component error handling

### Score: 7/10

---

## Overall Score: 30/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 5/10 | High | Missing keyboard nav, focus management |
| API Design | 5/10 | Medium | Missing variants, context, modular API |
| Design Tokens | 9/10 | Medium | Excellent except hardcoded widths |
| Features | 4/10 | Low | Only ~40% of shadcn features |
| Testing | 7/10 | Medium | Good DSL coverage, no render tests |
| **Total** | **30/50** | | **Priority: P1** |

---

## Recommendations

### P0 - Critical (Blocks Release)
None

### P1 - Important (Next Sprint)
1. **Add keyboard navigation**: Implement arrow key support for navigating between items
2. **Add focus management**: Add visible focus ring styles and proper tab order
3. **Add mobile sheet behavior**: Detect mobile and render as overlay sheet
4. **Add group labels**: Support section headers in navigation
5. **Add header/footer slots**: Allow content above/below nav items
6. **Add tooltip in collapsed mode**: Show item labels on hover when collapsed
7. **Add keyboard shortcut**: Cmd+B to toggle sidebar

### P2 - Nice to Have (Backlog)
1. **Add variant prop**: Support "sidebar", "floating", "inset" variants
2. **Add collapsible modes**: Support "offcanvas", "icon", "none"
3. **Add loading skeleton**: SidebarMenuSkeleton equivalent
4. **Add menu badges**: Badge support for menu items
5. **Add menu actions**: Action buttons on menu items
6. **Add SidebarInput**: Search within sidebar
7. **Modularize components**: Split into SidebarMenu, SidebarMenuItem, etc.

### P3 - Low Priority
1. **Add state persistence**: Cookie/localStorage for collapse state
2. **Add SidebarRail**: Draggable resize handle
3. **Add SidebarInset**: Main content area component

---

## Action Items for WF-0002

- [ ] Add `onKeyDown` handler to NavItemComponent for arrow key navigation
- [ ] Add focus ring styles using `tokens.ring` or outline
- [ ] Add `role="menu"` and `role="menuitem"` ARIA attributes
- [ ] Add `aria-haspopup="true"` for items with children
- [ ] Create `useIsMobile` hook or import from utils
- [ ] Add Sheet wrapper for mobile viewport detection
- [ ] Add `variant` prop with "sidebar" | "floating" | "inset"
- [ ] Add `collapsible` prop with "offcanvas" | "icon" | "none"
- [ ] Add `tooltip` prop to menu items
- [ ] Create `SidebarHeader`, `SidebarFooter`, `SidebarContent` sub-components
- [ ] Add render tests with React Testing Library
- [ ] Add keyboard event tests for arrow navigation
- [ ] Convert hardcoded width values to CSS variables

---

## Code Snippets Reference

### liquid-render Current Implementation

```typescript
// NavItemComponent - basic button without keyboard support
function NavItemComponent({
  item,
  isActive,
  isCollapsed,
  onSelect,
  level = 0,
}: NavItemComponentProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(item.value ?? item.label);
    }
  }, [hasChildren, isExpanded, item.value, item.label, onSelect]);

  return (
    <>
      <button
        onClick={handleClick}
        style={itemStyle}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Content */}
      </button>
      {/* Nested items */}
    </>
  );
}
```

### shadcn Menu Button with Full Features

```typescript
function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button"
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  // Wrap with tooltip in collapsed mode
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}
```
