# Avatar Component

User avatar with image/initials fallback.

## DSL Syntax

```
Av :binding
Av "initials"
Av "Name"
```

## Usage Examples

### Basic Avatar with Image URL

```liquidcode
Av :user.avatar
```

### Avatar with User Object

```liquidcode
Av :profile
```

The component automatically looks for `avatar`, `picture`, `image`, or `url` properties, and falls back to `name` for initials if no image is found.

### Avatar with Explicit Initials

```liquidcode
Av "JD"
```

### Avatar with Name (Auto-generates Initials)

```liquidcode
Av "John Doe"
```

### Multiple Avatars

```liquidcode
{
  Av :user1.avatar
  Av :user2.avatar
  Av "Guest"
}
```

## Size Variants

Use the `%` modifier to control size:

```liquidcode
Av :user.avatar %sm    // Small (2rem)
Av :user.avatar %md    // Medium (2.5rem) - default
Av :user.avatar %lg    // Large (3.5rem)
```

## Data Binding Examples

### Image URL String

```typescript
const data = {
  user: {
    avatar: 'https://example.com/avatar.jpg',
  },
};
```

### User Object with Image

```typescript
const data = {
  user: {
    avatar: '/images/user.png',
    name: 'Alice Smith',
  },
};
```

### User Object with Name Only (Shows Initials)

```typescript
const data = {
  user: {
    name: 'Bob Johnson',
  },
};
```

## Static Component

For direct React usage without LiquidCode:

```tsx
import { StaticAvatar } from '@repo/liquid-render';

// With image
<StaticAvatar src="https://example.com/avatar.jpg" alt="User" />

// With explicit initials
<StaticAvatar initials="JD" size="lg" />

// With name (auto-generates initials)
<StaticAvatar name="Alice Smith" />
```

## Properties (Static Component)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | `string` | - | Image URL |
| `initials` | `string` | - | Explicit initials to display |
| `name` | `string` | - | Full name (auto-generates initials) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Avatar size |
| `alt` | `string` | `'Avatar'` | Alt text for image |
| `style` | `React.CSSProperties` | - | Custom styles |

## Behavior

1. **Image Priority**: If a valid image URL is provided, it displays the image
2. **Initials Fallback**: If no image, displays initials from:
   - Explicit `initials` prop
   - Auto-generated from `name` prop
   - Auto-generated from block label
3. **Unknown Fallback**: Shows "?" if no data is available

## Initials Generation

- Takes first letter of each word
- Maximum 2 letters
- Uppercase
- Example: "John Doe" → "JD"

## Design Tokens

The Avatar component uses the following design tokens:

- **Background**: `tokens.colors.muted`
- **Text Color**: `tokens.colors.mutedForeground`
- **Font Weight**: `tokens.fontWeight.medium`
- **Border Radius**: `tokens.radius.full` (circular)

## Accessibility

- Uses semantic `<img>` tags with proper `alt` attributes
- Readable initials with good contrast
- Size variants for different contexts
