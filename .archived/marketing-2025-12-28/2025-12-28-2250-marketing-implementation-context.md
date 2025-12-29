# Marketing Implementation Context

**Purpose:** Reference document for building marketing pages. Check these files and follow these guidelines.

---

## Files to Check Before Building

### 1. Existing Marketing Components

Read these first to understand patterns:

| File | Purpose | Key Patterns |
|------|---------|--------------|
| `apps/web/src/modules/marketing/layout/section.tsx` | Section primitives | `Section`, `SectionHeader`, `SectionTitle`, `SectionDescription`, `SectionBadge` |
| `apps/web/src/modules/marketing/home/hero.tsx` | Hero section | Animation classes, responsive typography, CTA layout |
| `apps/web/src/modules/marketing/home/features.tsx` | Feature grid | Icon + text cards, grid layout |
| `apps/web/src/modules/marketing/home/faq.tsx` | FAQ accordion | Accordion pattern, translation keys |
| `apps/web/src/modules/marketing/home/testimonials.tsx` | Social proof | Card layout, avatar handling |
| `apps/web/src/modules/marketing/home/banner.tsx` | CTA banner | Gradient backgrounds, call-to-action |
| `apps/web/src/modules/marketing/layout/cta-button.tsx` | Primary CTA | Button styling, link handling |

### 2. Layout & Navigation

| File | Purpose |
|------|---------|
| `apps/web/src/modules/marketing/layout/header/header.tsx` | Main navigation |
| `apps/web/src/modules/marketing/layout/header/navigation/navigation.tsx` | Nav items |
| `apps/web/src/modules/marketing/layout/footer.tsx` | Footer links |
| `apps/web/src/app/[locale]/(marketing)/layout.tsx` | Marketing layout wrapper |

### 3. Configuration Files

| File | Purpose |
|------|---------|
| `apps/web/src/config/paths.ts` | Route definitions (add new routes here) |
| `apps/web/src/config/app.ts` | App metadata, social links |

### 4. Shared Components

| File | Purpose |
|------|---------|
| `apps/web/src/modules/common/turbo-link.tsx` | Next.js Link wrapper |
| `apps/web/src/modules/common/themed-image.tsx` | Dark/light mode images |
| `apps/web/src/modules/common/mdx.tsx` | MDX rendering (if needed for docs) |

### 5. UI Primitives (from TurboStarter)

```typescript
// Available imports from @turbostarter/ui-web
import { Button, buttonVariants } from "@turbostarter/ui-web/button";
import { Card } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";
import { Accordion } from "@turbostarter/ui-web/accordion";
import { Tabs } from "@turbostarter/ui-web/tabs";
import { Badge } from "@turbostarter/ui-web/badge";
import { Dialog } from "@turbostarter/ui-web/dialog";
// ... and more (shadcn/ui based)
```

### 6. i18n Files

| File | Purpose |
|------|---------|
| `packages/i18n/src/locales/en.json` | English translations |
| Pattern: `t("namespace:key.subkey")` | Translation function |

Add marketing translations under a `marketing:` namespace.

### 7. Product Documentation (for accurate copy)

| File | Purpose |
|------|---------|
| `packages/liquid-render/specs/LIQUID-RENDER-SPEC.md` | LiquidRender full spec |
| `packages/liquid-connect/specs/UNIVERSAL-VOCABULARY-BUILDER.md` | UVB complete knowledge |
| `packages/liquid-connect/specs/UVB-INTEGRATION-DESIGN.md` | UVB integration details |
| `.cognitive/project/capabilities.yaml` | All capabilities list |
| `.cognitive/project/SUMMARY.md` | Project overview |

---

## Styling Guidelines

### Typography Scale

From existing hero.tsx:

```tsx
// Heading sizes
"text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]"  // Hero title
"text-4xl md:text-5xl lg:text-6xl"                     // Section title
"text-2xl md:text-3xl"                                  // Subsection
"text-lg sm:text-xl"                                    // Body large
"text-base"                                             // Body

// Font weights
"font-semibold"   // Headings
"font-medium"     // Subheadings
"font-normal"     // Body
```

### Color Usage

```tsx
// Text
"text-foreground"       // Primary text
"text-muted-foreground" // Secondary text

// Backgrounds
"bg-background"         // Primary background
"bg-accent"             // Hover/active states
"bg-primary"            // Brand color
"bg-secondary"          // Secondary brand

// Borders
"border"                // Standard border
"border-primary"        // Accent border
```

### Animation Classes

From hero.tsx:

```tsx
"animate-fade-in"                        // Fade in
"animate-fade-up"                        // Fade up
"-translate-y-4 opacity-0"               // Initial state for fade-in
"[--animation-delay:200ms]"              // Staggered delays
"transition-colors duration-200"         // Color transitions
"group-hover:translate-x-0.5"            // Hover micro-interactions
```

### Responsive Breakpoints

```tsx
// Mobile-first approach
"px-6"          // Mobile padding
"sm:container"  // Small screens
"md:..."        // Medium screens (768px)
"lg:..."        // Large screens (1024px)
"xl:..."        // Extra large (1280px)
```

### Spacing Patterns

```tsx
// Section padding
"py-10 sm:py-12 md:py-16 lg:py-20"

// Gap between elements
"gap-6 sm:gap-8 md:gap-10 lg:gap-12"

// Max widths
"max-w-[560px]"   // Narrow content (descriptions)
"max-w-4xl"       // Medium content
"max-w-5xl"       // Wide content
"max-w-6xl"       // Full width content
```

---

## Component Patterns

### Section Template

```tsx
import { Section, SectionHeader, SectionTitle, SectionDescription } from "~/modules/marketing/layout/section";

export const MySection = async () => {
  const { t } = await getTranslation();

  return (
    <Section id="my-section">
      <SectionHeader>
        <SectionTitle>{t("marketing:section.title")}</SectionTitle>
        <SectionDescription>{t("marketing:section.description")}</SectionDescription>
      </SectionHeader>

      {/* Content */}
    </Section>
  );
};
```

### Feature Card Pattern

```tsx
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {features.map((feature) => (
    <div key={feature.id} className="rounded-lg border p-6">
      <feature.icon className="h-8 w-8 text-primary mb-4" />
      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
      <p className="text-muted-foreground">{feature.description}</p>
    </div>
  ))}
</div>
```

### CTA Pattern

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
  <CtaButton />  {/* Primary CTA */}
  <TurboLink
    href={pathsConfig.marketing.contact}
    className={buttonVariants({ variant: "outline" })}
  >
    {t("contact.cta")}
  </TurboLink>
</div>
```

### Code Demo Pattern

For showing DSL examples:

```tsx
<div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm">
  <pre className="overflow-x-auto">
    <code>{codeExample}</code>
  </pre>
</div>
```

---

## Page Structure Template

```tsx
// apps/web/src/app/[locale]/(marketing)/products/uvb/page.tsx

import { getMetadata } from "~/lib/metadata";
import { withI18n } from "@turbostarter/i18n/with-i18n";

// Import sections
import { UVBHero } from "~/modules/marketing/products/uvb/hero";
import { UVBFeatures } from "~/modules/marketing/products/uvb/features";
import { UVBDemo } from "~/modules/marketing/products/uvb/demo";
import { UVBCta } from "~/modules/marketing/products/uvb/cta";

export const generateMetadata = getMetadata({
  title: "marketing:products.uvb.title",
  description: "marketing:products.uvb.description",
});

const UVBPage = () => {
  return (
    <>
      <UVBHero />
      <UVBFeatures />
      <UVBDemo />
      <UVBCta />
    </>
  );
};

export default withI18n(UVBPage);
```

---

## File Organization

### New Directories to Create

```
apps/web/src/modules/marketing/
├── products/
│   ├── liquid-render/
│   │   ├── hero.tsx
│   │   ├── component-gallery.tsx
│   │   ├── code-demo.tsx
│   │   └── tech-specs.tsx
│   ├── liquid-connect/
│   │   ├── hero.tsx
│   │   ├── determinism.tsx
│   │   └── emitters.tsx
│   └── uvb/
│       ├── hero.tsx
│       ├── rules.tsx
│       ├── validation.tsx
│       └── demo.tsx
├── solutions/
│   ├── data-teams.tsx
│   ├── consultants.tsx
│   └── saas.tsx
├── demo/
│   ├── demo-container.tsx
│   ├── database-selector.tsx
│   ├── extraction-viz.tsx
│   ├── confirmation-wizard.tsx
│   └── query-interface.tsx
├── start/
│   ├── hero.tsx
│   └── steps.tsx
└── shared/
    ├── feature-grid.tsx
    ├── comparison-table.tsx
    ├── code-block.tsx
    └── stats-bar.tsx
```

### Route Additions

Add to `apps/web/src/config/paths.ts`:

```typescript
export const pathsConfig = {
  marketing: {
    // Existing
    home: "/",
    blog: "/blog",
    pricing: "/pricing",
    contact: "/contact",

    // New - Products
    products: {
      liquidRender: "/products/liquid-render",
      liquidConnect: "/products/liquid-connect",
      uvb: "/products/uvb",
    },

    // New - Solutions
    solutions: {
      dataTeams: "/solutions/data-teams",
      consultants: "/solutions/consultants",
      saas: "/solutions/saas",
    },

    // New - Demo
    demo: "/demo",

    // New - B2C
    start: {
      home: "/start",
      founders: "/start/founders",
      creators: "/start/creators",
      playground: "/start/playground",
    },
  },
  // ... rest
};
```

---

## Translation Key Structure

Add to `packages/i18n/src/locales/en.json`:

```json
{
  "marketing": {
    "products": {
      "liquidRender": {
        "title": "LiquidRender",
        "tagline": "Build UIs with 47 characters, not 470 lines",
        "description": "A DSL-to-React rendering engine...",
        "features": {
          "compression": {
            "title": "3.75x Compression",
            "description": "Same UI, fewer tokens"
          }
        }
      },
      "liquidConnect": { ... },
      "uvb": { ... }
    },
    "solutions": {
      "dataTeams": { ... },
      "consultants": { ... },
      "saas": { ... }
    },
    "demo": {
      "title": "Try it now",
      "steps": { ... }
    },
    "start": { ... }
  }
}
```

---

## Icon Usage

From lucide-react (already in project):

```tsx
import {
  Database,
  Zap,
  Code,
  BarChart3,
  Users,
  Clock,
  Check,
  ArrowRight,
  Play,
  Sparkles
} from "lucide-react";

// Or via TurboStarter Icons
import { Icons } from "@turbostarter/ui-web/icons";
// Icons.ChevronRight, Icons.Check, etc.
```

Suggested icons for products:
- **LiquidRender:** `<Code />`, `<Sparkles />`, `<Zap />`
- **LiquidConnect:** `<Database />`, `<ArrowRight />`, `<BarChart3 />`
- **UVB:** `<Clock />`, `<Sparkles />`, `<Database />`

---

## Image Assets Needed

| Asset | Location | Dimensions | Notes |
|-------|----------|------------|-------|
| Product hero screenshots | `public/images/products/` | 2626x1894 | Dark/light variants |
| Feature icons | Can use lucide-react | - | SVG preferred |
| Architecture diagrams | `public/images/diagrams/` | Variable | SVG for scalability |
| Demo animations | `public/images/demo/` | - | Lottie or WebP |

---

## Key Guidelines

### DO

1. **Use existing patterns** — Copy structure from hero.tsx, features.tsx
2. **Responsive-first** — Start mobile, add breakpoints
3. **Translate everything** — Use `t()` for all user-facing text
4. **Animate thoughtfully** — Use existing animation classes
5. **Keep sections modular** — One component per section
6. **Use semantic HTML** — Proper heading hierarchy
7. **Test dark mode** — All components must work in both themes

### DON'T

1. **Don't hardcode colors** — Use CSS variables
2. **Don't skip i18n** — Even for "temporary" text
3. **Don't create new utilities** — Check if pattern exists first
4. **Don't inline styles** — Use Tailwind classes
5. **Don't forget loading states** — Use Suspense where needed
6. **Don't ignore accessibility** — Proper alt text, ARIA labels

---

## Quick Reference: Imports

```tsx
// Translations
import { getTranslation } from "@turbostarter/i18n/server";
import { withI18n } from "@turbostarter/i18n/with-i18n";

// UI
import { buttonVariants } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { cn } from "@turbostarter/ui";

// Layout
import { Section, SectionHeader, SectionTitle, SectionDescription } from "~/modules/marketing/layout/section";
import { CtaButton } from "~/modules/marketing/layout/cta-button";
import { TurboLink } from "~/modules/common/turbo-link";
import { ThemedImage } from "~/modules/common/themed-image";

// Config
import { pathsConfig } from "~/config/paths";
import { getMetadata } from "~/lib/metadata";
```

---

## Testing Checklist

Before considering a page complete:

- [ ] Renders correctly on mobile (375px)
- [ ] Renders correctly on tablet (768px)
- [ ] Renders correctly on desktop (1280px)
- [ ] Dark mode looks good
- [ ] All text is translated
- [ ] Links work correctly
- [ ] CTAs are visible and functional
- [ ] Images load and have alt text
- [ ] No console errors
- [ ] Page has proper metadata

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `.claude/artifacts/2025-12-28-2237-strategic-vision-marketing.md` | Strategic positioning, ICPs, messaging |
| `.claude/artifacts/2025-12-28-2245-marketing-development-requirements.md` | Full requirements, page specs |
| `.context/turbostarter-framework-context/sections/web/marketing/pages.md` | TurboStarter page creation docs |
| `packages/liquid-render/specs/LIQUID-RENDER-SPEC.md` | Product spec for accurate copy |
| `packages/liquid-connect/specs/UNIVERSAL-VOCABULARY-BUILDER.md` | UVB spec for accurate copy |
