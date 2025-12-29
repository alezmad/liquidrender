# CLAUDE.md

AI agent instructions for LiquidRender - a DSL-to-React rendering engine built on TurboStarter.

---

## Identity & Structure

**LiquidRender** compiles a domain-specific language into React UI components. The DSL describes interfaces declaratively; the renderer produces interactive dashboards, forms, and data visualizations.

```
packages/liquid-render/     ← Core rendering engine
├── src/compiler/           ← DSL → render tree
├── src/renderer/           ← React components (47 components)
│   └── components/         ← DataTable, Charts, Forms, Layout
└── src/types/              ← Type definitions

packages/liquid-code/       ← Code generation utilities
packages/liquid-survey/     ← Survey/form builder
packages/liquid-connect/    ← Database connection SDK (Knosia)

apps/web/                   ← Next.js 16 web app
apps/mobile/                ← Expo mobile app
packages/db/                ← Drizzle schemas
packages/api/               ← Hono API routes
```

### Core File Locations

| What          | Where                                            |
| ------------- | ------------------------------------------------ |
| Main renderer | `liquid-render/src/renderer/LiquidUI.tsx`        |
| Design tokens | `liquid-render/src/renderer/components/utils.ts` |
| DSL types     | `liquid-render/src/types/`                       |
| DB schemas    | `packages/db/src/schema/`                        |
| API routes    | `packages/api/src/modules/`                      |
| Web pages     | `apps/web/src/app/[locale]/`                     |

---

## Critical Rules

### 1. CHECK BEFORE BUILDING

**Read `.cognitive/capabilities.yaml` BEFORE creating anything new.** Most things already exist.

The project has 47 LiquidRender components, complete TurboStarter framework integration, and established patterns. Don't reinvent.

### 2. REUSE FIRST

- Extend existing components, don't duplicate
- TurboStarter features are NOT to be rebuilt
- Use design tokens from `utils.ts`, never hardcode colors or spacing
- Adapt documentation examples to match existing patterns, don't copy verbatim

### 3. ID PATTERNS

**Use `generateId()` from `@turbostarter/shared/utils`** - NOT UUID.

```typescript
import { generateId } from "@turbostarter/shared/utils";

// Format: 32-character alphanumeric (base62)
const id = generateId(); // "HK9SO1TUY54PPAUDxJHFUgupuXTUqjA7"
```

For Zod schemas, use shared schemas:

```typescript
import { connectionIdSchema, workspaceIdSchema } from "../shared-schemas";

// NOT: z.string().uuid()
// USE: connectionIdSchema (or knosiaIdSchema for generic)
```

**Never use `.uuid()` validation** unless interfacing with external systems that require UUID format.

### 4. HYDRATION & LOCALSTORAGE

**Always check `isHydrated` before making state-based decisions** when using localStorage-persisted hooks.

```typescript
const { progress, isHydrated } = useOnboardingState();

useEffect(() => {
  if (!isHydrated) return; // Wait for localStorage to load

  // Now safe to use progress for redirects/decisions
  if (!progress.connectionId) {
    router.push("/onboarding/connect");
  }
}, [isHydrated, progress.connectionId]);
```

Why:

- React SSR renders with default state (no localStorage access)
- Client hydration reads localStorage and updates state
- Checking state before hydration causes flash redirects or wrong UI

### 5. COMMIT DISCIPLINE

**Suggest commits at natural breakpoints** to create rollback safety.

- **Before** major refactors, schema changes, or risky operations
- **After** completing a logical unit (feature, fix, migration)
- When switching between unrelated tasks

Don't batch unrelated changes. Atomic commits enable selective reverts.

```
# Good commit flow
1. "Add user preferences schema" (schema done)
2. "Add preferences API routes" (API done)
3. "Wire preferences to UI" (feature complete)

# Bad - single commit with everything
1. "Add user preferences feature" (schema + API + UI + tests)
```

### 6. PARALLEL EXECUTION

**Use Task tool with parallel agents** when work has no dependencies or concurrency conflicts.

When to parallelize:

- Multiple independent file searches
- Separate API modules with no shared state
- Tests that don't share fixtures
- Documentation for different components

Agent instructions must be:

- **Concise** - avoid verbose explanations that waste context
- **Outcome-focused** - report only what master agent needs
- **Self-contained** - include all necessary context in the prompt

```typescript
// CORRECT - focused instruction
"Search for all usages of connectionIdSchema in packages/api. Report: file paths and line numbers only."

// INCORRECT - verbose instruction
"I need you to help me understand how connectionIdSchema is used across the codebase.
Please search through all the files and provide a detailed analysis of each usage pattern..."
```

For complex parallel work, agents write reports to `.claude/reports/` instead of returning large outputs.

---

## Communication Philosophy

### Be a Senior Collaborator, Not a Task Executor

The goal isn't to complete tasks—it's to build excellent software together. That means:

**Challenge weak requests.** If the user asks for X but Y would be significantly better, say so. Don't be a yes-machine. A quick "Are you sure? Here's why Z might serve you better..." saves hours of rework.

**Elevate thinking—within reach.** Push toward better solutions, but keep them achievable. "You could add optimistic updates here for better UX" is useful. "You should rebuild this as a microservices architecture" is not.

**Protect from shortcuts that cost later.** If a request will cause technical debt, flag it. "This works, but you'll hit scaling issues at ~1000 users. Want to discuss alternatives now or accept the tradeoff?"

### Output Discipline

| Output Type                     | Where                | Why                                 |
| ------------------------------- | -------------------- | ----------------------------------- |
| Decisions, questions, tradeoffs | Chat                 | Developer needs to see and respond  |
| Large code blocks (>50 lines)   | `.claude/artifacts/` | Don't clutter conversation          |
| Reports, analysis, research     | `.claude/artifacts/` | Preserves context, reviewable later |
| Search results, file listings   | `.claude/reports/`   | Reference without flooding chat     |

**Important Naming Convention (use bash to check date and time): YYYY-MM-DD-HHMM-name-here.md**

**Chat should be scannable.** Every message should answer: "What changed? What decision is needed? What's next?"

### Questions That Reveal Requirements

Don't ask surface questions. Ask questions that expose hidden complexity:

```
# Surface (less useful)
"What should the button say?"

# Revealing (exposes real requirements)
"Should this action be reversible? That changes whether we need soft-delete."
"Who else might need to see this data? That affects the permission model."
"What happens if this fails halfway through? Need to decide on transaction boundaries."
```

### Offering Alternatives

When concise execution might compromise quality, present tradeoffs explicitly:

```
## Option A: Quick (your request)
- Add validation directly in the component
- Ships today
- Tech debt: validation logic duplicated if reused elsewhere

## Option B: Sustainable (recommended)
- Extract to shared validation schema
- +30 minutes
- Benefit: Reusable across forms, single source of truth

Your call—both are valid depending on timeline.
```

**Never silently downgrade quality for speed.** If there's a tension, surface it.

### When to Use AskUserQuestion

- Architectural decisions with long-term consequences
- Ambiguous requirements that could go multiple directions
- Tradeoffs where user preference matters (speed vs. quality, simple vs. flexible)
- Before destructive or irreversible operations

Don't ask about: naming conventions (use existing patterns), implementation details within established patterns, obvious fixes.

---

## Adding Pages & Features (TurboStarter Patterns)

### Think Feature, Not Page

Before creating a page, ask: **Is this a page or a feature?**

| Just a Page                    | A Feature (needs module)           |
| ------------------------------ | ---------------------------------- |
| Static content, simple display | Has its own state, hooks, types    |
| No reusable components         | Components used in multiple places |
| Single route                   | Multiple related routes            |
| Example: About page            | Example: Onboarding flow, Settings |

**If it's a feature**, create a module first:

```
apps/web/src/modules/[feature]/
├── components/           ← UI components
│   └── [sub-feature]/    ← Grouped by concern
├── hooks/                ← Feature-specific hooks
├── types.ts              ← Type definitions
└── index.ts              ← Barrel exports (public API)
```

### The Three-File Contract

Every new feature touches three locations:

```
1. config/paths.ts        → Define routes (type-safe)
2. layout.tsx             → Add to sidebar menu
3. i18n translations      → Add display strings
```

#### 1. Path Configuration (`apps/web/src/config/paths.ts`)

```typescript
// Add to pathsConfig object
myFeature: {
  index: `${DASHBOARD_PREFIX}/my-feature`,
  detail: (id: string) => `${DASHBOARD_PREFIX}/my-feature/${id}`,
  settings: `${DASHBOARD_PREFIX}/my-feature/settings`,
},
```

#### 2. Sidebar Menu (in parent `layout.tsx`)

```typescript
import { Icons } from "@turbostarter/ui-web/icons";
import { pathsConfig } from "~/config/paths";

const menu = [
  {
    label: "platform", // i18n key or literal
    items: [
      // ... existing items
      {
        title: "myFeature", // i18n key from "common" namespace
        href: pathsConfig.myFeature.index,
        icon: Icons.Sparkles, // Pick from lucide-react via Icons
      },
    ],
  },
];
```

#### 3. Translations (`packages/i18n/src/translations/`)

**For sidebar items** (use `common` namespace):

```json
// en/common.json - add key matching your title
{
  "myFeature": "My Feature"
}

// es/common.json
{
  "myFeature": "Mi Función"
}
```

**For feature-specific translations** (create new namespace):

```json
// en/myfeature.json
{
  "title": "My Feature",
  "description": "Feature description"
}
```

Then register in `en/index.ts` and `es/index.ts`:

```typescript
export const en = {
  // ... existing namespaces
  myfeature: () => import("./myfeature.json"),
} as const;
```

### Page File Structure

```typescript
// apps/web/src/app/[locale]/dashboard/my-feature/page.tsx

import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";

// Feature components from module
import { MyFeatureView } from "~/modules/my-feature";

export default async function MyFeaturePage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  // Server data fetching if needed
  // const data = await api.myFeature.list();

  return <MyFeatureView user={user} />;
}
```

### Module Barrel Export Pattern

```typescript
// modules/my-feature/index.ts

/**
 * My Feature Module
 * Brief description of what this feature does.
 */

// Types (export first for consumers)
export * from "./types";

// Hooks
export { useMyFeature } from "./hooks/use-my-feature";

// Components (only export what pages need)
export { MyFeatureView } from "./components/my-feature-view";
export { MyFeatureCard } from "./components/my-feature-card";
```

### Layout Hierarchy

```
app/[locale]/
├── layout.tsx                    → Root (providers, fonts)
├── (marketing)/layout.tsx        → Marketing header/footer
├── dashboard/layout.tsx          → Auth check, base providers
│   ├── (user)/layout.tsx         → User sidebar menu
│   └── [organization]/layout.tsx → Org sidebar menu
└── admin/layout.tsx              → Admin sidebar menu
```

**Rule:** Each layout defines its own `menu` array. Don't share menus across layouts.

### Icon Selection

```typescript
import { Icons } from "@turbostarter/ui-web/icons";

// Icons is a re-export of lucide-react with consistent naming
// Browse options: https://lucide.dev/icons

// Common choices:
Icons.Home; // Dashboard home
Icons.Settings; // Settings/config
Icons.Users; // Members/users
Icons.Brain; // AI features
Icons.Database; // Data/connections
Icons.BarChart; // Analytics
Icons.FileText; // Documents/reports
Icons.Sparkles; // New/featured
```

### When to Create a New Layout

Create a new layout when:

- Different sidebar menu needed
- Different auth requirements
- Different providers needed (e.g., feature-specific context)

Don't create a new layout for:

- Styling differences (use components)
- Single pages that don't need sidebar changes

---

## Creating API Endpoints (Hono Patterns)

### Think Module, Not Endpoint

Before creating an endpoint, ask: **Is this a standalone endpoint or part of a domain?**

| Single Endpoint                | Domain Module                         |
| ------------------------------ | ------------------------------------- |
| Health check, webhook receiver | User management, billing, connections |
| No related operations          | CRUD + related queries                |
| Stateless utility              | Shared schemas and types              |

**If it's a domain**, create a module with the full structure.

### API Module Structure

```
packages/api/src/modules/[feature]/
├── router.ts            ← Route definitions (thin layer)
├── schemas.ts           ← Zod schemas for input/output
├── queries.ts           ← Read operations (SELECT)
├── mutations.ts         ← Write operations (INSERT/UPDATE/DELETE)
└── index.ts             ← Barrel exports
```

For complex domains with sub-features:

```
packages/api/src/modules/knosia/
├── router.ts            ← Main router, mounts sub-routers
├── shared-schemas.ts    ← Schemas used across sub-modules
├── connections/         ← Sub-module
│   ├── router.ts
│   ├── schemas.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
└── analysis/            ← Another sub-module
    └── ...
```

### The Four-File Pattern

#### 1. Schemas (`schemas.ts`)

Define input validation and output types:

```typescript
import { z } from "zod";

// Input schemas (what the API receives)
export const createPostInputSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string(),
  published: z.boolean().default(false),
});

export const getPostsInputSchema = z.object({
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
});

// Output schemas (optional, for documentation)
export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  published: z.boolean(),
  createdAt: z.date(),
});

// Type exports
export type CreatePostInput = z.infer<typeof createPostInputSchema>;
export type GetPostsInput = z.infer<typeof getPostsInputSchema>;
export type Post = z.infer<typeof postSchema>;
```

#### 2. Queries (`queries.ts`)

Read operations, typically SELECT statements:

```typescript
import { db } from "@turbostarter/db/server";
import { posts } from "@turbostarter/db/schema";
import { eq, desc } from "drizzle-orm";

import type { GetPostsInput } from "./schemas";

export async function getPosts(input: GetPostsInput) {
  return db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(input.limit)
    .offset(input.offset);
}

export async function getPostById(id: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  return post ?? null;
}
```

#### 3. Mutations (`mutations.ts`)

Write operations:

```typescript
import { db } from "@turbostarter/db/server";
import { posts } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@turbostarter/shared/utils";

import type { CreatePostInput } from "./schemas";

export async function createPost(input: CreatePostInput) {
  const [post] = await db
    .insert(posts)
    .values({
      id: generateId(),
      ...input,
    })
    .returning();

  return post;
}

export async function deletePost(id: string) {
  const [deleted] = await db
    .delete(posts)
    .where(eq(posts.id, id))
    .returning({ id: posts.id });

  return deleted ?? null;
}
```

#### 4. Router (`router.ts`)

Thin layer connecting HTTP to business logic:

```typescript
import { Hono } from "hono";

import { enforceAuth, validate } from "../../../middleware";
import { createPost, deletePost } from "./mutations";
import { getPosts, getPostById } from "./queries";
import { createPostInputSchema, getPostsInputSchema } from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const postsRouter = new Hono<{ Variables: Variables }>()
  // Public endpoint (no auth)
  .get("/", validate("query", getPostsInputSchema), async (c) => {
    const input = c.req.valid("query");
    const posts = await getPosts(input);
    return c.json({ data: posts });
  })

  // Protected endpoint
  .post(
    "/",
    enforceAuth,
    validate("json", createPostInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const post = await createPost(input);
      return c.json(post, 201);
    },
  )

  // With URL params
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const post = await getPostById(id);

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    return c.json(post);
  })

  .delete("/:id", enforceAuth, async (c) => {
    const id = c.req.param("id");
    const result = await deletePost(id);

    if (!result) {
      return c.json({ error: "Post not found" }, 404);
    }

    return c.json({ success: true });
  });
```

### Registering the Router

Add to `packages/api/src/index.ts`:

```typescript
import { postsRouter } from "./modules/posts/router";

const appRouter = new Hono()
  .basePath("/api")
  // ... existing routes
  .route("/posts", postsRouter) // Add your new router
  .onError(onError);
```

### Available Middleware

```typescript
import {
  enforceAuth,           // Requires logged-in user
  enforceAdmin,          // Requires admin role
  enforceMembership,     // Requires org membership
  enforceOrganizationPermission,  // Requires specific org permission
  enforceUserPermission, // Requires specific user permission
  validate,              // Zod schema validation
} from "../../../middleware";

// Usage examples:
.post("/", enforceAuth, ...)                           // Any logged-in user
.post("/", enforceAuth, enforceAdmin, ...)            // Admin only
.post("/", enforceAuth, enforceMembership({ organizationId, role: MemberRole.ADMIN }), ...)
.get("/", validate("query", schema), ...)              // Validate query params
.post("/", validate("json", schema), ...)              // Validate JSON body
```

### Calling API from Frontend

**Server Component:**

```typescript
import { api } from "~/lib/api/server";
import { handle } from "@turbostarter/api/utils";

export default async function Page() {
  // Option 1: With handle() for automatic error handling
  const posts = await handle(api.posts.$get)();

  // Option 2: Manual response handling
  const response = await api.posts.$get();
  const { data } = await response.json();

  return <PostList posts={posts} />;
}
```

**Client Component:**

```typescript
"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import { handle } from "@turbostarter/api/utils";

export function PostList() {
  const { data, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: handle(api.posts.$get),
  });

  const createPost = useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await api.posts.$post({ json: input });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
  });

  // ...
}
```

### Response Patterns

```typescript
// Success with data
return c.json({ data: posts }); // 200 OK (default)
return c.json(post, 201); // 201 Created

// Errors
return c.json({ error: "Not found" }, 404);
return c.json({ error: "Validation failed", details: "..." }, 400);

// Empty success
return c.json({ success: true });
```

### Checklist for New API Module

- [ ] Create module folder in `packages/api/src/modules/`
- [ ] Define schemas with Zod in `schemas.ts`
- [ ] Implement queries in `queries.ts`
- [ ] Implement mutations in `mutations.ts`
- [ ] Create router in `router.ts`
- [ ] Export from `index.ts`
- [ ] Register router in `packages/api/src/index.ts`
- [ ] Add middleware (auth, validation) as needed
- [ ] Test endpoints manually or write tests

---

## Available Packages (USE THESE, don't add alternatives)

```yaml
charts: recharts
ui_primitives: "@radix-ui/* (popover, select, tooltip, radio-group)"
forms: react-hook-form
validation: zod
data_fetching: "@tanstack/react-query"
dates: date-fns
icons: lucide-react
classnames: clsx + tailwind-merge
http: hono (server)
database: drizzle-orm
auth: better-auth
mobile: expo + expo-router
testing: vitest + playwright + testing-library
```

**RULE: Don't add packages that duplicate what's already available.**

- If a new module or package is needed, use a Claude Question to prompt the user.

---

## UI Components (47 Available)

### Tables

- `data-table.tsx` - Full-featured data table

### Charts

- `line-chart.tsx`, `bar-chart.tsx`, `area-chart.tsx`, `pie-chart.tsx`

### Forms

- `button.tsx`, `checkbox.tsx`, `date.tsx`, `daterange.tsx`
- `form.tsx`, `input.tsx`, `radio.tsx`, `range.tsx`
- `select.tsx`, `switch.tsx`, `textarea.tsx`

### Layout

- `accordion.tsx`, `card.tsx`, `container.tsx`, `grid.tsx`
- `header.tsx`, `list.tsx`, `modal.tsx`, `nav.tsx`
- `sidebar.tsx`, `stack.tsx`, `stepper.tsx`, `tabs.tsx`

### Feedback

- `drawer.tsx`, `popover.tsx`, `sheet.tsx`, `tooltip.tsx`

### Display

- `avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `heading.tsx`
- `icon.tsx`, `image.tsx`, `kpi-card.tsx`, `progress.tsx`
- `tag.tsx`, `text.tsx`

---

## TurboStarter Framework (DO NOT REBUILD)

| Feature            | Package/Location                                           |
| ------------------ | ---------------------------------------------------------- |
| Auth               | `@turbostarter/auth` (Better Auth)                         |
| Billing            | `@turbostarter/billing` (Stripe, Lemon Squeezy, Polar)     |
| Database           | `@turbostarter/db` (Drizzle ORM)                           |
| API                | `@turbostarter/api` (Hono)                                 |
| Email              | `@turbostarter/email`                                      |
| Storage            | `@turbostarter/storage`                                    |
| i18n               | `@turbostarter/i18n`                                       |
| CMS                | `@turbostarter/cms`                                        |
| Analytics          | `packages/analytics`                                       |
| AI                 | Built-in (OpenAI, Anthropic, Google, agents, chatbot, TTS) |
| Admin              | Super Admin dashboard                                      |
| Organizations      | Multi-tenancy, RBAC, invitations                           |
| Background tasks   | trigger.dev, Upstash QStash                                |
| Monitoring         | Sentry, PostHog                                            |
| Deployment         | Vercel, Railway, Fly.io, Docker configs                    |
| Push notifications | Mobile push (Expo)                                         |

**Docs:** `.context/turbostarter-framework-context/index.md` (222 pages, keyword searchable)

---

## Data Models (in packages/db - EXTEND, don't recreate)

### Auth Tables

- `user`, `session`, `account`, `verification`, `passkey`, `two_factor`

### Organizations Tables

- `organization`, `member`, `invitation`

### Billing Tables

- `customer`

### Knosia Tables (LiquidConnect)

- See `packages/db/src/schema/knosia.ts`

---

## Established Patterns

| Pattern    | How                                               |
| ---------- | ------------------------------------------------- |
| Forms      | `react-hook-form` + `zod` + `@hookform/resolvers` |
| Queries    | `@tanstack/react-query`                           |
| Validation | `zod` schemas                                     |
| Styling    | Design tokens in `utils.ts`                       |

---

## Essential Commands

### Development

```bash
pnpm install                    # Install dependencies
pnpm services:start             # Start Docker (PostgreSQL)
pnpm with-env -F @turbostarter/db db:setup   # First-time DB setup
pnpm dev                        # Start all apps
pnpm --filter web dev           # Web only
pnpm --filter mobile dev        # Mobile only
```

### Database

```bash
pnpm with-env -F @turbostarter/db db:generate  # Generate migration
pnpm with-env -F @turbostarter/db db:migrate   # Apply migrations
pnpm with-env -F @turbostarter/db db:push      # Push schema (dev only)
pnpm with-env -F @turbostarter/db db:studio    # Open Drizzle Studio
```

### Quality

```bash
pnpm typecheck      # Type check monorepo
pnpm lint           # Lint (check)
pnpm lint:fix       # Lint (fix)
pnpm format         # Format (check)
pnpm format:fix     # Format (fix)
```

---

## Creating LiquidRender Components

> **Deep reference:** `.cognitive/cache/answers/how-to-create-component.md`

### File Structure (mandatory order)

```tsx
// [ComponentName] Component - Brief description
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface ComponentSpecificType { ... }

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: { ... },
};

// ============================================================================
// Helpers
// ============================================================================

function helperFunction() { ... }

// ============================================================================
// Sub-components (if needed)
// ============================================================================

function SubComponent() { ... }

// ============================================================================
// Main Component
// ============================================================================

export function ComponentName({ block, data }: LiquidComponentProps): React.ReactElement {
  const value = resolveBinding(block.binding, data);
  const label = block.label;

  return (
    <div data-liquid-type="typename" style={styles.wrapper}>
      {/* content */}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticComponent(props: StaticComponentProps): React.ReactElement {
  // For use outside LiquidUI context
}

export default ComponentName;
```

### Design Tokens (NEVER hardcode)

```tsx
import { tokens } from './utils';

// CORRECT
padding: tokens.spacing.md,
fontSize: tokens.fontSize.sm,
color: tokens.colors.foreground,
borderRadius: tokens.radius.lg,

// INCORRECT - never hardcode
padding: '16px',
color: '#0a0a0a',
```

#### Token Categories

| Category              | Examples                                             |
| --------------------- | ---------------------------------------------------- |
| `tokens.colors.*`     | `foreground`, `border`, `success`, `mutedForeground` |
| `tokens.spacing.*`    | `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (4px to 48px)    |
| `tokens.radius.*`     | `sm`, `md`, `lg`, `xl`, `full`                       |
| `tokens.fontSize.*`   | `xs`, `sm`, `base`, `lg`, `xl`                       |
| `tokens.fontWeight.*` | `normal`, `medium`, `semibold`, `bold`               |
| `tokens.shadow.*`     | `none`, `sm`, `md`, `lg`                             |
| `tokens.transition.*` | `fast`, `normal`, `slow`                             |

### Component Requirements

- [ ] `data-liquid-type` attribute on root element
- [ ] Handle empty/null data states
- [ ] Use `formatDisplayValue()` for value display
- [ ] Use `fieldToLabel()` for auto-labels
- [ ] SSR placeholder if browser-dependent (`isBrowser` check)
- [ ] Both dynamic and static variant exports

### Empty State Pattern

```tsx
if (!data || data.length === 0) {
  return (
    <div style={styles.wrapper}>
      {label && <div style={styles.header}>{label}</div>}
      <div style={styles.empty}>No data available</div>
    </div>
  );
}
```

### Value Formatting

```tsx
import { formatDisplayValue, fieldToLabel } from "./utils";

<span>{formatDisplayValue(value)}</span>; // 1234567 → "1.2M"
const label = block.label || fieldToLabel(block.binding?.field || ""); // "totalRevenue" → "Total Revenue"
```

---

## Creating Chart Components

> **Deep reference:** `.cognitive/cache/answers/chart-patterns.md`

### SSR + ResponsiveContainer

```tsx
import { isBrowser, chartColors, tokens } from "./utils";
import { LineChart, ResponsiveContainer } from "recharts";

if (!isBrowser) {
  return (
    <div data-liquid-type="line" style={styles.wrapper}>
      <div style={styles.placeholder}>[Line chart - {data.length} points]</div>
    </div>
  );
}

return (
  <ResponsiveContainer width="100%" height={220}>
    <LineChart
      data={chartData}
      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
    >
      {/* ... */}
    </LineChart>
  </ResponsiveContainer>
);
```

### Chart Colors

```tsx
import { chartColors } from "./utils";

// chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

<Line stroke={chartColors[i % chartColors.length]} />;
```

### Axis Styling

```tsx
<XAxis
  dataKey={xKey}
  tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
  stroke={tokens.colors.border}
/>
<YAxis
  tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
  stroke={tokens.colors.border}
/>
<CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
```

### Tooltip Styling

```tsx
<Tooltip
  contentStyle={{
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    fontSize: tokens.fontSize.sm,
  }}
/>
```

---

## Code Conventions

### TypeScript

- No `any` types
- Prefer `const` over `let`
- Use `async/await` for I/O operations

### Database

- Create migration for every schema change
- Use Drizzle ORM patterns from existing schema files

### API Routes

- Routes go in `packages/api/src/modules/`
- Use Hono router patterns
- Validate with Zod schemas

---

## Context System

### Read Order (for new tasks)

1. **This file** (already loaded)
2. `.cognitive/capabilities.yaml` - Before building anything
3. `.cognitive/cache/answers/` - Check for cached wisdom
4. `_bmad-output/` - PRD/architecture when implementing features

### Context Locations

| Location        | Purpose                               |
| --------------- | ------------------------------------- |
| `.cognitive/`   | Capabilities, rules, cached wisdom    |
| `.context/`     | Project context, framework docs       |
| `_bmad-output/` | Project decisions (PRD, architecture) |

### Deep References

| Task                 | Read                                                  |
| -------------------- | ----------------------------------------------------- |
| Creating component   | `.cognitive/cache/answers/how-to-create-component.md` |
| Creating chart       | `.cognitive/cache/answers/chart-patterns.md`          |
| Entity lookup        | `.cognitive/knowledge.json` (303 entities)            |
| Framework capability | `.context/turbostarter-framework-context/index.md`    |
| Project architecture | `_bmad-output/LIQUIDCONNECT-ARCHITECTURE.md`          |
| Product requirements | `_bmad-output/LIQUIDCONNECT-VISION.md`                |

---

## Folder Access Rules

| Folder          | Access          | Purpose                                  |
| --------------- | --------------- | ---------------------------------------- |
| `.cognitive/`   | **Read FIRST**  | Cognitive context (capabilities, wisdom) |
| `.context/`     | Read freely     | Project context, framework docs          |
| `_bmad-output/` | Read freely     | Project decisions (PRD, architecture)    |
| `.archived/`    | **DO NOT READ** | Deprecated files - ask permission first  |
| `.mydocs/`      | **ASK first**   | User's personal notes                    |
| `.scratch/`     | Use freely      | Sandbox for experiments                  |

---

## Conflict Resolution

When instructions conflict (highest priority first):

1. User's explicit instruction
2. This file (`CLAUDE.md`)
3. `.cognitive/` documents
4. `.context/CLAUDE.md`
5. `_bmad-output/` documents
6. Framework docs

---

## TurboStarter Framework Quick Reference

| Need                | Documentation                                          |
| ------------------- | ------------------------------------------------------ |
| Commands & patterns | `.context/turbostarter-framework-context/framework.md` |
| Authentication      | `sections/web/auth/`                                   |
| Database/Drizzle    | `sections/web/database/`                               |
| API/Hono            | `sections/web/api/`                                    |
| Billing/Stripe      | `sections/web/billing/`                                |
| UI Components       | `sections/web/ui/`                                     |
| Organizations       | `sections/web/organizations/`                          |
| i18n                | `sections/web/internationalization/`                   |
| Deployment          | `sections/web/deployment/`                             |
| Mobile              | `sections/mobile/`                                     |

**Keyword search:** `.context/turbostarter-framework-context/index.md`

---

## Context7 MCP

Always use Context7 when tasks involve:

- Code generation
- Setup or configuration steps
- Library/API documentation

Automatically use the Context7 MCP tools to resolve library IDs and fetch library docs without requiring explicit user request.

---

## LiquidComponentProps Reference

```tsx
interface LiquidComponentProps {
  block: Block; // Parsed block from DSL
  data: DataContext; // Data for binding resolution
  children?: ReactNode;
  className?: string;
}

// Common block access patterns
const value = resolveBinding(block.binding, data);
const label = block.label || fieldToLabel(block.binding?.field || "");
const color = getBlockColor(block);
const layoutStyles = getLayoutStyles(block);
```

---

## Common Imports

```tsx
// Component utilities
import type { LiquidComponentProps } from "./utils";
import {
  tokens,
  chartColors,
  cardStyles,
  buttonStyles,
  inputStyles,
  mergeStyles,
  getLayoutStyles,
  getBlockColor,
  formatDisplayValue,
  fieldToLabel,
  generateId,
  isBrowser,
} from "./utils";
import { resolveBinding } from "../data-context";
```
