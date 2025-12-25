---
component: Drawer
code: Dw
liquid_file: packages/liquid-render/src/renderer/components/drawer.tsx
shadcn_ref: drawer (vaul-based)
auditor: agent
date: 2025-12-25
scores:
  accessibility: 6
  api_design: 5
  design_tokens: 8
  features: 5
  testing: 6
  total: 30
priority: P1
---

# Audit: Drawer Component

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/drawer.tsx` |
| shadcn reference | `drawer` (uses vaul library) |
| DSL code | `Dw` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [x] Color contrast meets WCAG AA

### Findings

**Present:**
- `role="dialog"` on panel
- `aria-modal="true"` on panel
- `aria-labelledby` linking to title
- `aria-hidden` for overlay and when closed
- `aria-label="Close drawer"` on close button

**Missing:**
- **No Escape key handler** - Critical missing feature
- **No focus trap** - Focus can escape the drawer while open
- **No focus restore** - Focus is not returned to trigger when drawer closes
- **No focus visible ring** on close button

### liquid-render Code
```typescript
// drawer.tsx - Lines 183-205
<div
  id={drawerId}
  role="dialog"
  aria-modal="true"
  aria-labelledby={`${drawerId}-title`}
  style={panelStyle}
  aria-hidden={!isOpen}
>
  ...
  <button
    onClick={handleClose}
    style={styles.closeButton}
    aria-label="Close drawer"
    type="button"
  >
    x
  </button>
</div>
```

### shadcn Comparison

shadcn uses the `vaul` library which handles accessibility automatically:

```typescript
// shadcn drawer.tsx - uses vaul primitives
import { Drawer as DrawerPrimitive } from "vaul"

function DrawerContent({...}) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          // Direction-aware styling
          "data-[vaul-drawer-direction=top]:...",
          "data-[vaul-drawer-direction=bottom]:...",
          className
        )}
        {...props}
      >
        {/* Visual drag handle for bottom drawer */}
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}
```

**shadcn advantages via vaul:**
- Built-in focus trap
- Built-in Escape key handling
- Built-in focus restoration
- Touch/drag gesture support

### Score: 6/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props (Dynamic Component)

```typescript
// LiquidComponentProps - used by dynamic Drawer
export interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}

// Drawer - signal-based control only
// Position is hardcoded to 'right'
const position: 'left' | 'right' | 'bottom' = 'right';
```

### Current Props (Static Component)

```typescript
// StaticDrawerProps - good controlled API
export interface StaticDrawerProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  style?: React.CSSProperties;
}
```

### shadcn Props

```typescript
// shadcn provides composable sub-components
function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {...}
function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {...}
function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {...}
function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {...}
function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {...}
function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {...}
function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {...}
function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {...}
```

### Gaps

| Property | liquid-render | shadcn | Gap |
|----------|---------------|--------|-----|
| `open` / `onOpenChange` | Signal-based only | Yes (controlled) | Missing proper controlled mode |
| `direction` / `position` | Hardcoded 'right' in dynamic | 4 directions (top/bottom/left/right) | Missing top, hardcoded in dynamic |
| Composable parts | No | Yes (10 exports) | Monolithic vs composable |
| `modal` prop | Always modal | Optional | Missing |
| `dismissible` | Yes (overlay click) | Yes + gestures | Missing gesture support |
| `shouldScaleBackground` | No | Yes (vaul feature) | Missing |
| `snapPoints` | No | Yes (vaul feature) | Missing |

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

```typescript
// drawer.tsx - Line 15-16 - Minor: hardcoded overlay color
overlay: {
  backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Should use token
  // ...
}

// drawer.tsx - Lines 39-40, 50-51 - Hardcoded width
panelRight: {
  width: '20rem',  // Should be a token or prop
  maxWidth: '100vw',
}

// drawer.tsx - Lines 87-88 - Hardcoded button size
closeButton: {
  width: '2rem',   // Could use tokens.spacing.xl
  height: '2rem',
}
```

### Good Token Usage

```typescript
// Proper token usage examples from drawer.tsx
transition: `opacity ${tokens.transition.normal}`,
backgroundColor: tokens.colors.background,
boxShadow: tokens.shadow.lg,
borderTopLeftRadius: tokens.radius.xl,
padding: tokens.spacing.md,
borderBottom: `1px solid ${tokens.colors.border}`,
fontSize: tokens.fontSize.lg,
fontWeight: tokens.fontWeight.semibold,
color: tokens.colors.foreground,
```

### Score: 8/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Open/close via signals
- [x] Overlay with click-to-close
- [x] Title display
- [x] Body scroll lock when open
- [x] Transition animations
- [x] Three position options (left, right, bottom) in StaticDrawer
- [ ] Top position
- [ ] Drag gesture to close
- [ ] Focus trap
- [ ] Escape key handling
- [ ] Trigger component
- [ ] Description support
- [ ] Footer support

### shadcn Features
- [x] Controlled open/close
- [x] Overlay with click-to-close
- [x] Title display with proper semantics (DrawerTitle primitive)
- [x] Body scroll lock when open
- [x] Transition animations (CSS-based with animate-in/animate-out)
- [x] Four position options (top, bottom, left, right)
- [x] Drag gesture to close (vaul)
- [x] Focus trap (vaul)
- [x] Escape key handling (vaul)
- [x] Trigger component (DrawerTrigger)
- [x] Description support (DrawerDescription)
- [x] Footer support (DrawerFooter)
- [x] Close button component (DrawerClose)
- [x] Snap points (vaul)
- [x] Scale background option (vaul)

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic open/close | Yes (signals) | Yes (controlled) | - |
| Overlay click close | Yes | Yes | - |
| Position: right | Yes | Yes | - |
| Position: left | Static only | Yes | P2 |
| Position: bottom | Static only | Yes | P2 |
| Position: top | No | Yes | P3 |
| Escape key | No | Yes (vaul) | **P0** |
| Focus trap | No | Yes (vaul) | **P1** |
| Drag gestures | No | Yes (vaul) | P2 |
| DrawerTrigger | No (use Bt) | Yes | P3 |
| DrawerDescription | No | Yes | P2 |
| DrawerFooter | No | Yes | P2 |
| Snap points | No | Yes (vaul) | P3 |

### Score: 5/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)
- [ ] React render tests

### Current Test Coverage

- Tests file: `packages/liquid-render/tests/drawer.test.ts`
- Test count: 10 tests
- Coverage: Parser/compiler tests only (no render tests)

### Existing Tests (Parser-Level)

```typescript
// drawer.test.ts - Tests DSL parsing, not React rendering
describe('Basic Drawer Parsing', () => {
  it('should parse drawer with title and content', () => {
    const input = 'Dw "Menu" [Tx "Menu content"]';
    const schema = parseUI(input);
    // ...
  });
});

describe('Drawer with Button Trigger', () => {
  it('should parse drawer with button emit', () => {
    const input = `Bt "Open" >menu
Dw "Menu" <menu [Tx "Content"]`;
    // ...
  });
});

describe('Drawer Roundtrip', () => {
  it('should roundtrip drawer with title', () => {
    // ...
  });
});
```

### Missing Tests

1. **React render tests** - No tests for actual component rendering
2. **Signal-based open/close** - Not tested in render context
3. **Accessibility behavior** - No keyboard/screen reader tests
4. **Focus management** - Not tested
5. **Body scroll lock** - Not tested
6. **Position variants** - Only tested at parser level
7. **Close button interaction** - Not tested
8. **Overlay click behavior** - Not tested

### Score: 6/10

---

## Overall Score: 30/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 6/10 | High | Missing Escape key, focus trap, focus restore |
| API Design | 5/10 | Medium | Hardcoded position in dynamic, monolithic design |
| Design Tokens | 8/10 | Medium | Good usage, minor hardcoded values |
| Features | 5/10 | Low | Missing top position, gestures, composable parts |
| Testing | 6/10 | Medium | Parser tests only, no render tests |
| **Total** | **30/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)

1. **Add Escape key handler**: Users expect Escape to close drawers. Add keyboard event listener.
   ```typescript
   useEffect(() => {
     const handleEscape = (e: KeyboardEvent) => {
       if (e.key === 'Escape' && isOpen) {
         handleClose();
       }
     };
     document.addEventListener('keydown', handleEscape);
     return () => document.removeEventListener('keydown', handleEscape);
   }, [isOpen, handleClose]);
   ```

### P1 - Important (Next Sprint)

1. **Add focus trap**: Implement focus containment within the drawer when open. Consider using `@radix-ui/react-focus-scope` or custom implementation.

2. **Add focus restore**: Save trigger element ref and restore focus when drawer closes.

3. **Make position dynamic**: Allow position to be set via block style or signal in the dynamic Drawer component.
   ```typescript
   const position = (block.style?.position as 'left' | 'right' | 'bottom') || 'right';
   ```

4. **Add render tests**: Create React Testing Library tests for the Drawer component.

### P2 - Nice to Have (Backlog)

1. **Replace hardcoded overlay color**: Add to tokens
   ```typescript
   // In utils.ts
   colors: {
     overlay: 'var(--overlay, rgba(0, 0, 0, 0.5))',
   }
   ```

2. **Add description support**: Add `block.description` rendering similar to shadcn's DrawerDescription.

3. **Add footer slot**: Allow footer content via children or dedicated prop.

4. **Consider vaul library**: Evaluate adopting vaul for production-quality drawer behavior (gestures, snap points, etc.).

---

## Action Items for WF-0002

- [ ] Add Escape key handler to close drawer (P0)
- [ ] Implement focus trap using radix or custom solution (P1)
- [ ] Add focus restoration on drawer close (P1)
- [ ] Make position prop work in dynamic Drawer component (P1)
- [ ] Create React render tests with Testing Library (P1)
- [ ] Move hardcoded overlay color to tokens (P2)
- [ ] Add top position support (P3)
- [ ] Evaluate vaul library adoption for gestures/snap points (P3)
