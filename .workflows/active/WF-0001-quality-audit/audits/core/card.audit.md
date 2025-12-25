---
component: Card
code: Cd
liquid_file: packages/liquid-render/src/renderer/components/card.tsx
shadcn_ref: card
auditor: A1-agent
date: 2025-12-25
scores:
  accessibility: 4
  api_design: 7
  design_tokens: 9
  features: 7
  testing: 6
  total: 33
priority: P1
---

# Audit: Card

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/card.tsx` |
| shadcn reference | `card` |
| DSL code | `Cd` |

---

## 1. Accessibility (0-10)

### Checklist
- [ ] ARIA attributes present and correct
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [x] Color contrast meets WCAG AA (uses design tokens with proper contrast)

### Findings

**Critical Issues:**
1. **No ARIA attributes**: The card components use plain `<div>` elements without any ARIA roles or attributes. Cards that act as interactive containers should have appropriate roles.

2. **No semantic landmark**: Cards are rendered as generic `<div>` elements. While shadcn also uses `<div>`, the lack of `role="region"` or `aria-labelledby` when a title is present is a gap.

3. **Title uses `<h3>` without flexibility for heading level context**: The main `Card` component hardcodes `<h3>` for the title, which can break heading hierarchy depending on page context.

**Positive:**
- The `CardTitle` static component allows customizable heading levels via `as` prop (`h1`-`h6`).
- Uses `data-liquid-type="card"` for identification (testing/CSS targeting).

### shadcn Comparison

shadcn's card uses `data-slot` attributes for component identification:
```tsx
// shadcn
<div data-slot="card" className={...} {...props} />
<div data-slot="card-header" className={...} {...props} />
```

Neither implementation has extensive ARIA - both rely on semantic HTML, but shadcn spreads all props allowing ARIA attributes to be passed through.

### Score: 4/10

**Rationale**: Missing ARIA attributes, no support for `aria-labelledby` when title exists, limited semantic structure. The static components are slightly better due to prop spreading potential, but the main `Card` component has fixed semantics.

---

## 2. API Design (0-10)

### Checklist
- [x] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [x] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props
```typescript
// Main Component (DSL-driven)
interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}

// Static Components
interface CardRootProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;  // declared but not used
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

interface CardTitleProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  style?: React.CSSProperties;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

interface SimpleCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}
```

### shadcn Props
```typescript
// shadcn - All components extend native div props
function Card({ className, ...props }: React.ComponentProps<"div">) { ... }
function CardHeader({ className, ...props }: React.ComponentProps<"div">) { ... }
function CardTitle({ className, ...props }: React.ComponentProps<"div">) { ... }
function CardDescription({ className, ...props }: React.ComponentProps<"div">) { ... }
function CardAction({ className, ...props }: React.ComponentProps<"div">) { ... }
function CardContent({ className, ...props }: React.ComponentProps<"div">) { ... }
function CardFooter({ className, ...props }: React.ComponentProps<"div">) { ... }
```

### Gaps

1. **No prop spreading**: liquid-render components don't spread additional props, preventing custom ARIA attributes, event handlers, or other native div props.

2. **Missing `CardAction` component**: shadcn has a dedicated `CardAction` for header actions (e.g., dropdown menu, close button). liquid-render lacks this.

3. **`className` declared but unused**: `CardRootProps` declares `className` but the implementation doesn't use it.

4. **CardTitle uses different element**: shadcn uses `<div>` for CardTitle, liquid-render uses semantic heading elements. This is actually a positive difference for accessibility.

5. **No ref forwarding**: Neither React.forwardRef nor ref prop support.

### Score: 7/10

**Rationale**: Good composition pattern matching shadcn structure. TypeScript types are defined. Deductions for missing prop spreading, missing CardAction, unused className prop, and no ref forwarding.

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
// Line 17-18: Uses token properly for border
borderBottom: `1px solid ${tokens.colors.border}`,

// Line 39: Uses token properly for border
borderTop: `1px solid ${tokens.colors.border}`,

// ALL styles use tokens correctly - no violations found
```

### Token Usage Analysis

**Excellent token usage throughout:**

| Style Property | Token Used | Line |
|---------------|------------|------|
| padding | `tokens.spacing.md` | 16, 34, 38 |
| border | `tokens.colors.border` | 17, 39 |
| fontSize | `tokens.fontSize.lg`, `tokens.fontSize.sm` | 21, 28 |
| fontWeight | `tokens.fontWeight.semibold` | 22 |
| color | `tokens.colors.foreground`, `tokens.colors.mutedForeground` | 23, 29 |
| marginTop | `tokens.spacing.xs` | 30 |
| backgroundColor | `tokens.colors.muted` | 40 |

**The component uses `cardStyles()` helper which includes:**
- `tokens.colors.card` for background
- `tokens.colors.border` for border
- `tokens.radius.lg` for border-radius
- `tokens.shadow.sm` for box-shadow

### Score: 9/10

**Rationale**: Excellent adherence to design token system. All colors, spacing, typography, and shadows use the token system from `utils.ts`. The only minor deduction is that `1px` border widths are hardcoded, though this is a reasonable decision as shadcn also hardcodes border widths.

---

## 4. Features (0-10)

### liquid-render Features
- [x] Card container with border, shadow, rounded corners
- [x] CardHeader with border-bottom separator
- [x] CardTitle with customizable heading level
- [x] CardDescription for subtitle text
- [x] CardContent for body
- [x] CardFooter with border-top and muted background
- [x] SimpleCard convenience component
- [x] Style override support via `style` prop
- [x] `data-liquid-type` for testing/CSS targeting

### shadcn Features
- [x] Card container with border, shadow, rounded corners
- [x] CardHeader with grid layout for complex headers
- [x] CardTitle (uses div, not heading)
- [x] CardDescription for subtitle text
- [x] CardAction for header action buttons
- [x] CardContent for body
- [x] CardFooter with flex layout
- [x] className support with cn() utility
- [x] data-slot for component identification
- [x] Full prop spreading for extensibility

### Gap Analysis
| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Basic card structure | Yes | Yes | - |
| CardHeader | Yes | Yes | - |
| CardTitle | Yes (semantic heading) | Yes (div) | - |
| CardDescription | Yes | Yes | - |
| CardAction | No | Yes | P1 |
| CardContent | Yes | Yes | - |
| CardFooter | Yes | Yes | - |
| Grid layout in header | No | Yes | P2 |
| Prop spreading | No | Yes | P1 |
| className merging | Partial (declared, unused) | Yes | P1 |
| ref forwarding | No | No | P2 |

**Notable Differences:**

1. **CardAction missing**: shadcn provides a dedicated slot for action buttons in the header that auto-positions to top-right.

2. **Header grid layout**: shadcn uses CSS Grid in CardHeader for automatic positioning of title, description, and action. liquid-render uses simple block layout.

3. **Footer styling**: liquid-render has `backgroundColor: tokens.colors.muted` on footer; shadcn leaves it transparent with conditional padding.

### Score: 7/10

**Rationale**: Core card functionality is complete and well-implemented. Missing CardAction component and advanced header grid layout. The SimpleCard convenience component is a nice addition not present in shadcn.

---

## 5. Testing (0-10)

### Checklist
- [x] Unit tests exist
- [x] Covers happy path
- [x] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)

### Current Test Coverage
- Tests file: `packages/liquid-render/tests/card-layouts.test.ts`
- Test count: 12 tests across 6 describe blocks
- Coverage: DSL parsing and roundtrip only (no render tests)

### Test Analysis

**What's tested:**
1. Card with image, text, and button - parse + roundtrip
2. Grid of multiple cards - parse + roundtrip
3. Card with action buttons - parse + roundtrip
4. Nested card content - parse + roundtrip
5. Data-bound KPI card - parse + roundtrip
6. Card type recognition (Cd code and 8 index)

**What's NOT tested:**
1. **React rendering**: No tests for the actual React component output
2. **Static components**: No tests for CardRoot, CardHeader, CardTitle, etc.
3. **SimpleCard**: No tests for the convenience component
4. **Style application**: No tests verifying styles are applied correctly
5. **Prop handling**: No tests for style overrides, className, or children rendering
6. **Accessibility**: No ARIA attribute tests
7. **Edge cases**: No tests for empty children, missing labels, invalid props

### Missing Tests
- `card.render.test.tsx` - React component rendering tests
- `card.a11y.test.tsx` - Accessibility tests
- Tests for static component variants
- Tests for SimpleCard component
- Style override tests
- Children rendering tests

### Score: 6/10

**Rationale**: Tests exist but only cover DSL parsing/roundtrip, not the React component. The parsing tests are thorough (5 distinct card layout patterns), but there's no validation that the rendered output is correct or accessible.

---

## Overall Score: 33/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 4/10 | High | Missing ARIA, no semantic structure beyond h3 |
| API Design | 7/10 | Medium | Good composition, missing prop spread & CardAction |
| Design Tokens | 9/10 | Medium | Excellent token adherence |
| Features | 7/10 | Low | Core features present, missing CardAction |
| Testing | 6/10 | Medium | DSL tests only, no render/a11y tests |
| **Total** | **33/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)
None - Component is functional for basic use cases.

### P1 - Important (Next Sprint)
1. **Add ARIA attributes**: When CardHeader contains a CardTitle, add `aria-labelledby` to the card container linking to the title's id.
   ```tsx
   // Example fix for Card component
   const titleId = hasTitle ? generateId('card-title') : undefined;
   return (
     <div
       data-liquid-type="card"
       style={styles.card}
       role="region"
       aria-labelledby={titleId}
     >
       {hasTitle && (
         <div style={styles.header}>
           <h3 id={titleId} style={styles.title}>{label}</h3>
         </div>
       )}
       ...
     </div>
   );
   ```

2. **Add CardAction component**: Create a `CardAction` component for header actions matching shadcn pattern.

3. **Enable prop spreading**: All static components should spread remaining props to allow custom attributes:
   ```tsx
   export function CardRoot({ children, style: customStyle, ...props }: CardRootProps & React.HTMLAttributes<HTMLDivElement>) {
     return (
       <div style={mergeStyles(styles.card, customStyle)} {...props}>
         {children}
       </div>
     );
   }
   ```

4. **Add React component tests**: Create `card.render.test.tsx` with:
   - Static component rendering tests
   - SimpleCard rendering tests
   - Style application verification
   - Children rendering tests

### P2 - Nice to Have (Backlog)
1. **Add ref forwarding**: Use `React.forwardRef` for all static components.

2. **Implement className merging**: Actually use the declared className prop with a merge utility.

3. **Add grid layout to CardHeader**: Match shadcn's grid-based header for better action positioning.

4. **Add accessibility tests**: Create tests verifying ARIA attributes and keyboard navigation.

5. **Add snapshot tests**: Capture expected output for regression prevention.

---

## Action Items for WF-0002

- [ ] Add `role="region"` and `aria-labelledby` to Card when title present
- [ ] Create `CardAction` component matching shadcn API
- [ ] Implement prop spreading on all static components (CardRoot, CardHeader, etc.)
- [ ] Fix unused `className` prop in CardRootProps
- [ ] Create `card.render.test.tsx` with React component tests
- [ ] Create `card.a11y.test.tsx` with accessibility tests
