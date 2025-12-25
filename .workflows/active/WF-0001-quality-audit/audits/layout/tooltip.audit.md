---
component: Tooltip
code: Tl
liquid_file: packages/liquid-render/src/renderer/components/tooltip.tsx
shadcn_ref: tooltip
auditor: claude-opus-4-5
date: 2025-12-25
scores:
  accessibility: 6
  api_design: 5
  design_tokens: 8
  features: 5
  testing: 5
  total: 29
priority: P1
---

# Audit: Tooltip

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/tooltip.tsx` |
| shadcn reference | `tooltip` |
| DSL code | `Tl` |

---

## 1. Accessibility (0-10)

### Checklist
- [x] ARIA attributes present and correct
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### Findings

**Good:**
- Uses `role="tooltip"` correctly on the tooltip content
- Uses `aria-describedby` to associate trigger with tooltip content
- Has `onFocus`/`onBlur` handlers for keyboard accessibility
- Generates unique IDs for accessibility association

**Issues:**
1. **No Escape key support** - Users cannot dismiss the tooltip with Escape key
2. **No focus ring styling** - The trigger element lacks visible focus indicators
3. **Pointer events disabled** - The tooltip has `pointerEvents: 'none'` which prevents users from hovering over the tooltip content itself
4. **No delay configuration for screen readers** - Fixed delay may not be appropriate for all users

**liquid-render code:**
```typescript
// Focus/blur handlers added but no Escape key support
onFocus={handleMouseEnter}
onBlur={handleMouseLeave}

// ARIA attributes present
<span style={styles.trigger} aria-describedby={tooltipId}>
  {children}
</span>
<span id={tooltipId} role="tooltip" style={contentStyle}>
```

**shadcn uses Radix UI which provides:**
```typescript
// Radix handles all keyboard interactions automatically
<TooltipPrimitive.Root data-slot="tooltip" {...props} />
<TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
<TooltipPrimitive.Content
  data-slot="tooltip-content"
  // Radix internally manages focus, Escape key, etc.
```

### shadcn Comparison
shadcn uses Radix UI primitives (`@radix-ui/react-tooltip`) which provide:
- Full keyboard support (Escape to dismiss)
- WAI-ARIA Tooltip pattern compliance
- Automatic focus management
- Screen reader announcements
- Collision detection (auto-repositioning)

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
// LiquidComponentProps from utils.ts
export interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}

// Component signature
export function Tooltip({ block, data, children }: LiquidComponentProps)
```

### Current Props (Static Component)
```typescript
export interface StaticTooltipProps {
  text: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  style?: React.CSSProperties;
}
```

### shadcn Props
```typescript
// shadcn exposes Radix primitives directly
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>)
function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>)
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>)
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>)
```

### Gaps

| Gap | Description | Priority |
|-----|-------------|----------|
| No controlled mode | Cannot control open state via props | P1 |
| No `sideOffset` | Cannot adjust distance from trigger | P2 |
| No `open`/`onOpenChange` | No controlled API | P1 |
| No `delayDuration` (dynamic) | Hardcoded 200ms in dynamic component | P2 |
| No className forwarding | Cannot add custom CSS classes | P2 |
| Missing `align` prop | Cannot align tooltip relative to trigger | P2 |
| Single component export | shadcn exports 4 composable parts | P1 |

### Score: 5/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [ ] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Token Usage Analysis

**Good - Uses tokens:**
```typescript
const styles = {
  content: {
    marginBottom: tokens.spacing.xs,           // Good
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,  // Good
    backgroundColor: tokens.colors.foreground, // Good
    color: tokens.colors.background,           // Good
    borderRadius: tokens.radius.sm,            // Good
    fontSize: tokens.fontSize.xs,              // Good
  },
};
```

### Violations Found
```typescript
// Arrow styles use hardcoded pixel values
arrow: {
  bottom: '-4px',                              // Should use tokens.spacing
  width: 0,
  height: 0,
  borderLeft: '4px solid transparent',         // Hardcoded
  borderRight: '4px solid transparent',        // Hardcoded
  borderTop: `4px solid ${tokens.colors.foreground}`,  // Mixed - token for color, hardcoded size
},

// zIndex is hardcoded
content: {
  zIndex: 100,  // Should be tokens.zIndex.tooltip (not currently in tokens)
},
```

**Comparison with shadcn:**
```typescript
// shadcn uses Tailwind classes mapped to CSS variables
className={cn(
  "bg-foreground text-background",  // CSS variable colors
  "rounded-md px-3 py-1.5 text-xs", // Tailwind spacing/sizing
  "z-50",                            // z-index from Tailwind
)}
```

### Score: 8/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Basic tooltip display on hover
- [x] Tooltip with text content
- [x] Data binding support (`:binding`)
- [x] Trigger child element
- [x] Show/hide delay
- [x] Placement options (StaticTooltip only: top/bottom/left/right)
- [x] Focus/blur support for keyboard accessibility
- [ ] Controlled open state
- [ ] Animation/transitions
- [ ] Arrow indicator
- [ ] Collision detection
- [ ] Portal rendering
- [ ] Multiple tooltip coordination

### shadcn Features
```typescript
// Radix-powered features:
- [x] Controlled state (open/onOpenChange)
- [x] Animation (animate-in, fade-in-0, zoom-in-95)
- [x] Arrow with proper styling
- [x] Portal rendering (TooltipPrimitive.Portal)
- [x] Collision detection (auto-repositioning)
- [x] Side offset configuration
- [x] Delay duration configuration
- [x] Provider for multiple tooltips
- [x] Slide animations based on direction
```

**shadcn animation classes:**
```typescript
className={cn(
  "animate-in fade-in-0 zoom-in-95",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2",
  "data-[side=top]:slide-in-from-bottom-2",
)}
```

**shadcn arrow:**
```typescript
<TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
```

### Gap Analysis
| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic hover tooltip | ✅ | ✅ | - |
| Text content | ✅ | ✅ | - |
| Trigger element | ✅ | ✅ | - |
| Data binding | ✅ | N/A | - |
| Controlled state | ❌ | ✅ | P1 |
| Animations | ❌ | ✅ | P2 |
| Portal rendering | ❌ | ✅ | P1 |
| Collision detection | ❌ | ✅ | P1 |
| Provider pattern | ❌ | ✅ | P2 |
| Side offset | ❌ | ✅ | P2 |
| Arrow (quality) | Partial | ✅ | P2 |

### Score: 5/10

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [ ] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)
- [ ] Render tests with React Testing Library

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/tooltip.test.ts`
- Test count: 6 tests
- Coverage: Parsing/roundtrip only (no render tests)

**Existing tests:**
```typescript
describe('Tooltip Component', () => {
  describe('Basic Tooltip Parsing', () => {
    it('should parse tooltip with text and trigger')
    it('should parse tooltip with binding')
    it('should parse tooltip trigger element')
  });

  describe('Tooltip Roundtrip', () => {
    it('should roundtrip tooltip with text')
    it('should roundtrip tooltip with binding')
  });

  describe('Multiple Tooltips', () => {
    it('should parse tooltips in container')
  });
});
```

### Missing Tests

1. **Render tests (React Testing Library)**
   - Tooltip appears on hover
   - Tooltip appears on focus
   - Tooltip hides on mouse leave
   - Tooltip hides on blur
   - Correct ARIA attributes

2. **Edge cases**
   - Empty tooltip text
   - Null binding value
   - Very long tooltip text
   - Nested tooltips

3. **Accessibility tests**
   - Screen reader announcements
   - Keyboard navigation
   - Focus management

4. **Visual regression tests**
   - Placement variations
   - Animation states

### Score: 5/10

---

## Overall Score: 29/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 6/10 | High | Has basic ARIA, missing keyboard support |
| API Design | 5/10 | Medium | Limited props, no controlled mode |
| Design Tokens | 8/10 | Medium | Good token usage, minor violations |
| Features | 5/10 | Low | Basic features, missing animations/portal |
| Testing | 5/10 | Medium | Parsing tests only, no render tests |
| **Total** | **29/50** | | Priority: P1 |

---

## Recommendations

### P0 - Critical (Blocks Release)
None identified - component is functional for basic use cases.

### P1 - Important (Next Sprint)
1. **Add Escape key support**: Allow users to dismiss tooltip with keyboard
   ```typescript
   useEffect(() => {
     const handleEscape = (e: KeyboardEvent) => {
       if (e.key === 'Escape') setIsVisible(false);
     };
     document.addEventListener('keydown', handleEscape);
     return () => document.removeEventListener('keydown', handleEscape);
   }, []);
   ```

2. **Add Portal rendering**: Prevent z-index/overflow issues
   ```typescript
   import { createPortal } from 'react-dom';
   // Render tooltip content in portal
   ```

3. **Add controlled mode**: Support `open`/`onOpenChange` props
   ```typescript
   interface TooltipProps {
     open?: boolean;
     onOpenChange?: (open: boolean) => void;
     defaultOpen?: boolean;
   }
   ```

4. **Add render tests**: Create React Testing Library tests for hover/focus behavior

### P2 - Nice to Have (Backlog)
1. **Add animations**: CSS transitions for fade-in/out and slide effects
2. **Add collision detection**: Auto-reposition when near viewport edges
3. **Add sideOffset prop**: Configurable distance from trigger
4. **Add TooltipProvider**: For coordinating multiple tooltips (only one visible)
5. **Improve arrow**: Use proper arrow component instead of CSS borders
6. **Add align prop**: Start/center/end alignment options
7. **Use tokens for z-index**: Add `tokens.zIndex.tooltip` to design system

---

## Action Items for WF-0002

- [ ] Add `onKeyDown` handler for Escape key dismissal
- [ ] Implement portal rendering using `createPortal`
- [ ] Add controlled mode props (`open`, `onOpenChange`, `defaultOpen`)
- [ ] Create render tests with React Testing Library
- [ ] Add focus ring styling on trigger element
- [ ] Replace hardcoded arrow pixel values with tokens
- [ ] Add CSS transitions for smooth show/hide
- [ ] Consider adopting Radix UI primitives for full accessibility

---

## Code Comparison Summary

### liquid-render Implementation
```typescript
// Simple hover-based tooltip with manual state management
export function Tooltip({ block, data, children }: LiquidComponentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), 200);
  }, []);

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
          onFocus={handleMouseEnter} onBlur={handleMouseLeave}>
      <span aria-describedby={tooltipId}>{children}</span>
      <span id={tooltipId} role="tooltip">{tooltipText}</span>
    </span>
  );
}
```

### shadcn/Radix Implementation
```typescript
// Composable components with full accessibility via Radix primitives
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipContent({ className, sideOffset = 0, children, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn("animate-in fade-in-0 zoom-in-95 z-50 rounded-md...")}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="..." />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
```

The key architectural difference is that shadcn delegates accessibility and interaction patterns to Radix UI, while liquid-render implements these manually (with gaps). For production-quality accessibility, consider either adopting Radix primitives or implementing the full WAI-ARIA Tooltip pattern.
