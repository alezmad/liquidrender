---
component: Avatar
code: Av
liquid_file: packages/liquid-render/src/renderer/components/avatar.tsx
shadcn_ref: avatar
auditor: agent
date: 2025-12-25
scores:
  accessibility: 4
  api_design: 5
  design_tokens: 8
  features: 5
  testing: 6
  total: 28
priority: P1
---

# Avatar Component Audit

## Executive Summary

The liquid-render Avatar component provides basic avatar functionality with image/initials fallback support. However, it lacks several key features present in the shadcn/ui reference implementation, particularly around accessibility, composability, and advanced image loading states.

---

## 1. Accessibility (Score: 4/10)

### shadcn/ui Reference

```tsx
// Uses Radix UI primitives with built-in accessibility
<AvatarPrimitive.Root
  data-slot="avatar"
  className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
  {...props}
/>
```

Radix Avatar provides:
- Automatic `role="img"` on the root element
- Proper focus management
- Screen reader announcements for loading states
- `AvatarFallback` has `delayMs` prop for announcing fallback

### liquid-render Implementation

```tsx
<span data-liquid-type="avatar" data-size={size} style={avatarStyle}>
  {imageSrc ? (
    <img src={imageSrc} alt={block.label || 'Avatar'} style={styles.image} />
  ) : (
    initials || '?'
  )}
</span>
```

### Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing `role` attribute | High | Root `<span>` lacks `role="img"` for screen readers |
| No focus indicator | Medium | No keyboard focus styling for interactive avatars |
| No ARIA labels | High | Fallback content not announced properly to screen readers |
| No loading state announcements | Medium | No `aria-busy` or loading state communication |

### Recommendations

1. Add `role="img"` to root element
2. Add `aria-label` with descriptive text
3. Implement focus ring styling for interactive cases
4. Consider using `aria-busy` during image loading

---

## 2. API Design (Score: 5/10)

### shadcn/ui Reference

```tsx
// Composable compound component pattern
function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) { ... }
function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) { ... }
function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) { ... }

export { Avatar, AvatarImage, AvatarFallback }

// Usage:
<Avatar>
  <AvatarImage src="/user.jpg" alt="@user" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### liquid-render Implementation

```tsx
// Monolithic component with internal logic
export interface AvatarProps {
  src?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}

export function Avatar({ block, data }: LiquidComponentProps): React.ReactElement { ... }
export function StaticAvatar({ src, initials, name, size, alt, className, style }: StaticAvatarProps): React.ReactElement { ... }
```

### Comparison

| Aspect | shadcn/ui | liquid-render |
|--------|-----------|---------------|
| Composability | Compound components | Monolithic |
| Props spreading | Full support (`...props`) | Limited |
| className support | Yes | Only in StaticAvatar |
| Ref forwarding | Yes (via Radix) | No |
| Children support | Full control | None |

### Issues Found

- No compound component pattern (AvatarImage, AvatarFallback)
- Limited customization options
- No ref forwarding for imperative access
- `className` only available on StaticAvatar, not main Avatar
- Props spreading not supported

---

## 3. Design Tokens (Score: 8/10)

### Token Usage Analysis

```tsx
// liquid-render - Good token usage
const sizeMap = {
  sm: { width: '2rem', height: '2rem', fontSize: tokens.fontSize.xs },
  md: { width: '2.5rem', height: '2.5rem', fontSize: tokens.fontSize.sm },
  lg: { width: '3.5rem', height: '3.5rem', fontSize: tokens.fontSize.lg },
};

const styles = {
  avatar: {
    borderRadius: tokens.radius.full,          // Token
    backgroundColor: tokens.colors.muted,      // Token
    color: tokens.colors.mutedForeground,      // Token
    fontWeight: tokens.fontWeight.medium,      // Token
  },
};
```

### shadcn/ui Reference

```tsx
// Uses Tailwind classes mapped to CSS variables
className={cn("bg-muted flex size-full items-center justify-center rounded-full", className)}
```

### Compliance Check

| Token Category | Usage | Compliant |
|----------------|-------|-----------|
| Colors | `tokens.colors.muted`, `tokens.colors.mutedForeground` | Yes |
| Border radius | `tokens.radius.full` | Yes |
| Font size | `tokens.fontSize.xs/sm/lg` | Yes |
| Font weight | `tokens.fontWeight.medium` | Yes |
| Spacing | N/A (fixed rem values for size) | Partial |

### Minor Issues

- Size dimensions use hardcoded rem values (`'2rem'`, `'2.5rem'`, `'3.5rem'`) instead of spacing tokens
- Could use `tokens.spacing` for more consistent sizing

---

## 4. Features (Score: 5/10)

### Feature Comparison

| Feature | shadcn/ui | liquid-render | Notes |
|---------|-----------|---------------|-------|
| Image display | Yes | Yes | Both support image src |
| Fallback text | Yes (AvatarFallback) | Yes (initials) | Different implementation |
| Delayed fallback | Yes (`delayMs` prop) | No | Radix shows fallback after delay |
| Image loading state | Yes (handled by Radix) | No | No loading indicator |
| Image error handling | Yes (automatic via Radix) | No | No error state |
| Custom fallback content | Yes (any children) | No | Only text initials |
| Size variants | No (uses className) | Yes (sm/md/lg) | liquid-render has built-in sizes |
| Object binding | No | Yes | liquid-render unique feature |
| Auto-initials from name | No | Yes | Extracts initials from name |

### Missing Features

1. **Image Loading States**: shadcn/ui via Radix handles image loading gracefully
2. **Delayed Fallback**: Option to delay showing fallback (gives image time to load)
3. **Custom Fallback Content**: Only supports text, not icons or custom JSX
4. **onLoadingStatusChange callback**: No way to know when image loads/fails

### Unique liquid-render Features

1. Built-in size prop (sm/md/lg)
2. Automatic initials extraction from name
3. Object binding support (`user.avatar` resolves from data context)

---

## 5. Testing (Score: 6/10)

### Test File Analysis

File: `packages/liquid-render/tests/avatar.test.ts`

```typescript
describe('Avatar Component', () => {
  describe('Basic Avatar Parsing', () => {
    it('should parse avatar with binding', () => { ... });
    it('should parse avatar with initials', () => { ... });
    it('should parse avatar with nested binding', () => { ... });
  });

  describe('Avatar Roundtrip', () => {
    it('should roundtrip avatar with binding', () => { ... });
    it('should roundtrip avatar with initials', () => { ... });
  });

  describe('Multiple Avatars', () => {
    it('should parse avatars in container', () => { ... });
  });
});
```

### Test Coverage

| Test Type | Covered | Notes |
|-----------|---------|-------|
| DSL Parsing | Yes | Tests DSL to schema conversion |
| Roundtrip | Yes | Tests parse -> emit -> parse |
| Rendering | No | No React render tests |
| Accessibility | No | No a11y tests |
| Image loading | No | No image state tests |
| Fallback behavior | No | No fallback tests |
| Size variants | No | No size prop tests |
| Error handling | No | No error state tests |

### Issues

- Tests focus only on DSL parsing, not component rendering
- No React Testing Library / render tests
- No accessibility testing (e.g., axe-core)
- No visual regression tests
- No tests for edge cases (invalid src, missing data)

---

## Summary & Recommendations

### Priority Fixes (P1)

1. **Accessibility**: Add `role="img"` and proper ARIA attributes
2. **Image Error Handling**: Add onError handler with fallback
3. **Render Tests**: Add React render tests for component behavior

### Medium Priority (P2)

4. **Ref Forwarding**: Support `React.forwardRef` for imperative access
5. **Loading States**: Add image loading state handling
6. **Props Spreading**: Support `...props` for flexibility

### Lower Priority (P3)

7. **Compound Components**: Consider AvatarImage/AvatarFallback pattern
8. **Custom Fallback**: Allow JSX children for fallback content
9. **Delayed Fallback**: Add `delayMs` prop option

### Score Breakdown

| Dimension | Score | Max | Percentage |
|-----------|-------|-----|------------|
| Accessibility | 4 | 10 | 40% |
| API Design | 5 | 10 | 50% |
| Design Tokens | 8 | 10 | 80% |
| Features | 5 | 10 | 50% |
| Testing | 6 | 10 | 60% |
| **Total** | **28** | **50** | **56%** |

---

## Code Comparison: Key Patterns

### Root Element

**shadcn/ui:**
```tsx
<AvatarPrimitive.Root
  data-slot="avatar"
  className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
  {...props}
/>
```

**liquid-render:**
```tsx
<span data-liquid-type="avatar" data-size={size} style={avatarStyle}>
```

### Image Handling

**shadcn/ui:**
```tsx
<AvatarPrimitive.Image
  data-slot="avatar-image"
  className={cn("aspect-square size-full", className)}
  {...props}
/>
// Radix handles: loading, error, onLoadingStatusChange
```

**liquid-render:**
```tsx
<img src={imageSrc} alt={block.label || 'Avatar'} style={styles.image} />
// No loading/error handling
```

### Fallback

**shadcn/ui:**
```tsx
<AvatarPrimitive.Fallback
  data-slot="avatar-fallback"
  className={cn("bg-muted flex size-full items-center justify-center rounded-full", className)}
  {...props}  // Accepts any children
/>
```

**liquid-render:**
```tsx
{initials || '?'}  // Text only
```
