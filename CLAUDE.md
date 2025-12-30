# CLAUDE.md

AI agent instructions for **Knosia** — the data scientist businesses can't afford, built on LiquidRender.

---

## What Knosia Is

**Knosia** transforms raw business data into actionable knowledge. Connect your database, and within 60 seconds you have a personalized briefing, vocabulary that speaks your language, and AI that understands your business.

**Core Problem:** Every company has data and BI tools, but nobody has solved the vocabulary problem. "Active Users" means different things to Engineering, Product, Sales, and the CEO. This misalignment costs companies millions.

**Solution:** Knosia becomes the company's semantic layer — establishing shared vocabulary, providing role-aware intelligence, and enabling conversation-driven analytics.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KNOSIA STACK                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   apps/web/                    ← Next.js 16 web app                 │
│   └── modules/onboarding/      ← 60-second onboarding flow          │
│   └── modules/marketing/knosia/← Landing page components            │
│                                                                     │
│   packages/api/modules/knosia/ ← API (connections, analysis,        │
│                                   briefing, conversation,           │
│                                   vocabulary, preferences,          │
│                                   organization, shared)             │
│                                                                     │
│   packages/db/schema/knosia.ts ← 15 tables (V1 foundation)          │
│                                                                     │
│   packages/liquid-connect/     ← Schema → Vocabulary engine         │
│   └── uvb/                     ← Universal Vocabulary Builder       │
│   └── query/                   ← Natural language → SQL             │
│   └── vocabulary/              ← Compiled vocabulary patterns       │
│                                                                     │
│   packages/liquid-render/      ← DSL → React rendering (77 components)│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Status

### ✅ Implemented (V1 Foundation)

| Area                  | Status                            | Location                                        |
| --------------------- | --------------------------------- | ----------------------------------------------- |
| **Database Schema**   | 15 tables                         | `packages/db/src/schema/knosia.ts`              |
| **Connections API**   | CRUD + test                       | `packages/api/src/modules/knosia/connections/`  |
| **Analysis API**      | SSE streaming                     | `packages/api/src/modules/knosia/analysis/`     |
| **Briefing API**      | Basic structure                   | `packages/api/src/modules/knosia/briefing/`     |
| **Conversation API**  | Query + clarify                   | `packages/api/src/modules/knosia/conversation/` |
| **Vocabulary API**    | CRUD                              | `packages/api/src/modules/knosia/vocabulary/`   |
| **Onboarding UI**     | Connect + Review                  | `apps/web/src/modules/onboarding/`              |
| **Schema Extraction** | PostgreSQL (adapters for MySQL, SQLite, DuckDB planned) | `packages/liquid-connect/src/uvb/`              |
| **Guest Org TTL**     | 7-day expiration                  | Schema + API support                            |

### 🚧 In Progress / Gaps

| Feature                       | Vision Doc              | Gap                             |
| ----------------------------- | ----------------------- | ------------------------------- |
| **Multi-connection**          | `connectionIds[]` array | Currently single `connectionId` |
| **Connection Summary Screen** | After first test        | Not implemented                 |
| **Role Selection UI**         | `/onboarding/role`      | Page missing                    |
| **Confirmation Questions**    | Quick 6 questions       | UI not built                    |
| **Dashboard**                 | Briefing page           | No dashboard module yet         |
| **Conversation UI**           | Chat interface          | Backend ready, no frontend      |
| **Vocabulary Governance**     | PR workflow, versioning | V3 roadmap                      |
| **Proactive Insights**        | AI-driven alerts        | V5 roadmap                      |

### 📋 Onboarding Flow Status

```
VISION:
Connect → Test → Summary → [+Add?] → Analysis → Review → Role → Confirm → Ready → Dashboard
                   ↑                              ↑        ↑       ↑
                   🚧                             ✅       🚧      🚧

CURRENT:
Connect → Test → Analysis → Review
   ✅       ✅       ✅        ✅
```

---

## Critical Rules

### 1. CHECK BEFORE BUILDING

**Read `.cognitive/capabilities.yaml` BEFORE creating anything new.** Most things already exist.

The project has 77 LiquidRender components, complete TurboStarter framework integration, and established patterns. Don't reinvent.

### 2. REUSE FIRST

- Extend existing components, don't duplicate
- TurboStarter features are NOT to be rebuilt
- Use design tokens from `utils.ts`, never hardcode colors or spacing
- Adapt documentation examples to match existing patterns, don't copy verbatim

### 3. ID PATTERNS

**Use `generateId()` from `@turbostarter/shared/utils`** — NOT UUID.

```typescript
import { generateId } from "@turbostarter/shared/utils";
const id = generateId(); // 32-char alphanumeric
```

For Zod schemas, use shared schemas:

```typescript
import { connectionIdSchema, workspaceIdSchema } from "../shared-schemas";

// NOT: z.string().uuid()
// USE: connectionIdSchema (or knosiaIdSchema for generic)
```

### 4. HYDRATION & LOCALSTORAGE

**Always check `isHydrated` before state-based decisions:**

```typescript
const { progress, isHydrated } = useOnboardingState();

useEffect(() => {
  if (!isHydrated) return; // Wait for localStorage
  if (!progress.connectionId) router.push("/onboarding/connect");
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

For complex parallel work, agents write reports to `.reports/` instead of returning large outputs.

---

## Communication Philosophy

### Be a Senior Collaborator, Not a Task Executor

The goal isn't to complete tasks—it's to build excellent software together. That means:

**Challenge weak requests.** If the user asks for X but Y would be significantly better, say so. Don't be a yes-machine. A quick "Are you sure? Here's why Z might serve you better..." saves hours of rework.

**Elevate thinking—within reach.** Push toward better solutions, but keep them achievable. "You could add optimistic updates here for better UX" is useful. "You should rebuild this as a microservices architecture" is not.

**Protect from shortcuts that cost later.** If a request will cause technical debt, flag it. "This works, but you'll hit scaling issues at ~1000 users. Want to discuss alternatives now or accept the tradeoff?"

### Output Discipline

| Output Type                     | Where         | Why                                 |
| ------------------------------- | ------------- | ----------------------------------- |
| Decisions, questions, tradeoffs | Chat          | Developer needs to see and respond  |
| Large code blocks (>50 lines)   | `.artifacts/` | Don't clutter conversation          |
| Reports, analysis, research     | `.artifacts/` | Preserves context, reviewable later |
| Search results, file listings   | `.reports/`   | Reference without flooding chat     |

**Naming Convention:** `YYYY-MM-DD-HHMM-name-here.md`

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

### When to Use AskUserQuestion

**Use for:**

- Architectural decisions with long-term consequences
- Ambiguous requirements that could go multiple directions
- Tradeoffs where user preference matters (speed vs. quality, simple vs. flexible)
- Before destructive or irreversible operations

**Don't ask about:**

- Naming conventions (use existing patterns)
- Implementation details within established patterns
- Obvious fixes with clear solutions

### Browser Automation MCP Selection

When browser interaction is needed (testing UI, scraping, automation), **always ask the user** which MCP to use:

```typescript
// Use AskUserQuestion with these options:
{
  question: "Which browser automation tool should I use?",
  header: "Browser MCP",
  options: [
    { label: "Playwriter", description: "Controls user's existing Chrome window via extension (Recommended)" },
    { label: "Playwright MCP", description: "Headless browser automation via @playwright/mcp" },
    { label: "Browser Eval", description: "MCP Docker browser_eval tool" }
  ]
}
```

**Playwriter** is preferred when the user wants to interact with their current browser session or see actions in real-time.

---

## Core File Locations

| What              | Where                                                           |
| ----------------- | --------------------------------------------------------------- |
| **Next steps**    | `NEXT-STEPS.md`                                                 |
| Knosia DB schema  | `packages/db/src/schema/knosia.ts`                              |
| Knosia API router | `packages/api/src/modules/knosia/router.ts`                     |
| Onboarding module | `apps/web/src/modules/onboarding/`                              |
| Onboarding state  | `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts` |
| LiquidConnect     | `packages/liquid-connect/src/`                                  |
| LiquidRender      | `packages/liquid-render/src/`                                   |
| Design tokens     | `packages/liquid-render/src/renderer/components/utils.ts`       |
| Web pages         | `apps/web/src/app/[locale]/`                                    |
| API routes        | `packages/api/src/modules/`                                     |

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
    label: "platform",
    items: [
      {
        title: "myFeature", // i18n key from "common" namespace
        href: pathsConfig.myFeature.index,
        icon: Icons.Sparkles,
      },
    ],
  },
];
```

#### 3. Translations (`packages/i18n/src/translations/`)

```json
// en/common.json
{ "myFeature": "My Feature" }

// es/common.json
{ "myFeature": "Mi Función" }
```

### Page File Structure

```typescript
// apps/web/src/app/[locale]/dashboard/my-feature/page.tsx

import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth/server";
import { pathsConfig } from "~/config/paths";
import { MyFeatureView } from "~/modules/my-feature";

export default async function MyFeaturePage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return <MyFeatureView user={user} />;
}
```

### Module Barrel Export Pattern

```typescript
// modules/my-feature/index.ts

// Types (export first for consumers)
export * from "./types";

// Hooks
export { useMyFeature } from "./hooks/use-my-feature";

// Components (only export what pages need)
export { MyFeatureView } from "./components/my-feature-view";
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

### When to Create a New Layout

Create a new layout when:

- Different sidebar menu needed
- Different auth requirements
- Different providers needed (e.g., feature-specific context)

Don't create a new layout for:

- Styling differences (use components)
- Single pages that don't need sidebar changes

### Icon Selection

```typescript
import { Icons } from "@turbostarter/ui-web/icons";

// Icons is a re-export of lucide-react
// Common choices:
Icons.Home;        // Dashboard home
Icons.Settings;    // Settings/config
Icons.Users;       // Members/users
Icons.Brain;       // AI features
Icons.Database;    // Data/connections
Icons.BarChart;    // Analytics
Icons.FileText;    // Documents/reports
Icons.Sparkles;    // New/featured
Icons.MessageSquare; // Conversations/chat
Icons.Search;      // Search features
```

---

## Creating API Endpoints (Hono Patterns)

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
├── analysis/
└── vocabulary/
```

### The Four-File Pattern

#### 1. Schemas (`schemas.ts`)

```typescript
import { z } from "zod";

export const createPostInputSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string(),
  published: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;
```

#### 2. Queries (`queries.ts`)

```typescript
import { db } from "@turbostarter/db/server";
import { posts } from "@turbostarter/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getPosts(input: GetPostsInput) {
  return db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(input.limit);
}
```

#### 3. Mutations (`mutations.ts`)

```typescript
import { generateId } from "@turbostarter/shared/utils";

export async function createPost(input: CreatePostInput) {
  const [post] = await db
    .insert(posts)
    .values({ id: generateId(), ...input })
    .returning();
  return post;
}
```

#### 4. Router (`router.ts`)

```typescript
import { Hono } from "hono";
import { enforceAuth, validate } from "../../../middleware";

export const postsRouter = new Hono<{ Variables: Variables }>()
  .get("/", validate("query", getPostsInputSchema), async (c) => {
    const input = c.req.valid("query");
    const posts = await getPosts(input);
    return c.json({ data: posts });
  })
  .post(
    "/",
    enforceAuth,
    validate("json", createPostInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const post = await createPost(input);
      return c.json(post, 201);
    },
  );
```

### Available Middleware

```typescript
import {
  enforceAuth, // Requires logged-in user
  enforceAdmin, // Requires admin role
  enforceMembership, // Requires org membership
  validate, // Zod schema validation
} from "../../../middleware";
```

### Calling API from Frontend

**Server Component:**

```typescript
import { api } from "~/lib/api/server";
import { handle } from "@turbostarter/api/utils";

const posts = await handle(api.posts.$get)();
```

**Client Component:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import { handle } from "@turbostarter/api/utils";

const { data } = useQuery({
  queryKey: ["posts"],
  queryFn: handle(api.posts.$get),
});
```

### Response Patterns

```typescript
// Success with data
return c.json({ data: posts });           // 200 OK (default)
return c.json(post, 201);                 // 201 Created

// Errors
return c.json({ error: "Not found" }, 404);
return c.json({ error: "Validation failed", details: "..." }, 400);

// Empty success
return c.json({ success: true });
```

### API Module Checklist

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

## Form Patterns (react-hook-form + zod)

### Basic Form Structure

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

type FormData = z.infer<typeof formSchema>;

export function MyForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("name")} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      <button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

### With TurboStarter UI Components

```typescript
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@turbostarter/ui-web/form";
import { Input } from "@turbostarter/ui-web/input";
import { Button } from "@turbostarter/ui-web/button";

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <Input {...field} />
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

### Form with API Mutation

```typescript
import { useMutation } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

const mutation = useMutation({
  mutationFn: async (data: FormData) => {
    const res = await api.myEndpoint.$post({ json: data });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  },
  onSuccess: () => {
    form.reset();
    // toast, redirect, etc.
  },
});

// In form: onSubmit={mutation.mutate}
```

---

## Creating LiquidRender Components

> **Deep reference:** `.cognitive/cache/answers/how-to-create-component.md`

### File Structure (mandatory order)

```tsx
// [ComponentName] Component - Brief description
import React from "react";
import type { LiquidComponentProps } from "./utils";
import { tokens, cardStyles, mergeStyles } from "./utils";
import { resolveBinding } from "../data-context";

// ============================================================================
// Types
// ============================================================================

// ============================================================================
// Styles
// ============================================================================

// ============================================================================
// Main Component
// ============================================================================

export function ComponentName({
  block,
  data,
}: LiquidComponentProps): React.ReactElement {
  const value = resolveBinding(block.binding, data);

  return (
    <div data-liquid-type="typename" style={styles.wrapper}>
      {/* content */}
    </div>
  );
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

### Component Requirements

- [ ] `data-liquid-type` attribute on root element
- [ ] Handle empty/null data states
- [ ] Use `formatDisplayValue()` for value display
- [ ] Use `fieldToLabel()` for auto-labels
- [ ] SSR placeholder if browser-dependent (`isBrowser` check)

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

---

## Available Packages (USE THESE, don't add alternatives)

```yaml
charts: recharts
ui_primitives: "@radix-ui/*"
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
testing: vitest + playwright
```

---

## UI Components (77 Available in LiquidRender)

### Tables & Data
- `data-table.tsx` - Full-featured data table with sorting, filtering, pagination
- `list.tsx`, `tree.tsx`, `kanban.tsx`, `timeline.tsx`

### Charts & Visualization
- `line-chart.tsx`, `bar-chart.tsx`, `area-chart.tsx`, `pie-chart.tsx`
- `scatter.tsx`, `heatmap.tsx`, `sankey.tsx`, `sparkline.tsx`, `gauge.tsx`
- `flow.tsx`, `org.tsx`, `map.tsx`

### Forms & Input
- `button.tsx`, `checkbox.tsx`, `date.tsx`, `daterange.tsx`, `time.tsx`
- `form.tsx`, `input.tsx`, `radio.tsx`, `range.tsx`, `rating.tsx`
- `select.tsx`, `switch.tsx`, `textarea.tsx`, `upload.tsx`, `otp.tsx`, `color.tsx`

### Layout
- `accordion.tsx`, `card.tsx`, `container.tsx`, `grid.tsx`
- `header.tsx`, `modal.tsx`, `nav.tsx`, `split.tsx`
- `sidebar.tsx`, `stack.tsx`, `stepper.tsx`, `tabs.tsx`, `collapsible.tsx`

### Feedback & Overlays
- `drawer.tsx`, `popover.tsx`, `sheet.tsx`, `tooltip.tsx`, `hovercard.tsx`
- `alert.tsx`, `alertdialog.tsx`, `toast.tsx`, `skeleton.tsx`, `spinner.tsx`
- `dropdown.tsx`, `contextmenu.tsx`, `command.tsx`

### Display
- `avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `heading.tsx`
- `icon.tsx`, `image.tsx`, `kpi-card.tsx`, `progress.tsx`
- `tag.tsx`, `text.tsx`, `separator.tsx`, `empty.tsx`, `pagination.tsx`

### Media
- `video.tsx`, `audio.tsx`, `carousel.tsx`, `lightbox.tsx`, `calendar.tsx`

---

## TurboStarter Framework (DO NOT REBUILD)

| Feature       | Package                 |
| ------------- | ----------------------- |
| Auth          | `@turbostarter/auth`    |
| Billing       | `@turbostarter/billing` |
| Database      | `@turbostarter/db`      |
| API           | `@turbostarter/api`     |
| UI            | `@turbostarter/ui-web`  |
| i18n          | `@turbostarter/i18n`    |
| Email         | `@turbostarter/email`   |
| Storage       | `@turbostarter/storage` |
| Organizations | Multi-tenancy, RBAC     |

### TurboStarter Docs Quick Reference

| Need                | Documentation Path                             |
| ------------------- | ---------------------------------------------- |
| Commands & patterns | `sections/web/framework.md`                    |
| Authentication      | `sections/web/auth/`                           |
| Database/Drizzle    | `sections/web/database/`                       |
| API/Hono            | `sections/web/api/`                            |
| Billing/Stripe      | `sections/web/billing/`                        |
| UI Components       | `sections/web/ui/`                             |
| Organizations       | `sections/web/organizations/`                  |
| i18n                | `sections/web/internationalization/`           |
| Deployment          | `sections/web/deployment/`                     |
| Mobile              | `sections/mobile/`                             |

**Keyword search:** `.context/turbostarter-framework-context/index.md`

---

## Essential Commands

```bash
pnpm install                    # Install dependencies
pnpm services:start             # Start Docker (PostgreSQL)
pnpm with-env -F @turbostarter/db db:setup   # First-time DB setup
pnpm dev                        # Start all apps
pnpm --filter web dev           # Web only

# Database
pnpm with-env -F @turbostarter/db db:generate  # Generate migration
pnpm with-env -F @turbostarter/db db:migrate   # Apply migrations
pnpm with-env -F @turbostarter/db db:studio    # Open Drizzle Studio

# Quality
pnpm typecheck && pnpm lint && pnpm format
```

---

## Database Migration Best Practices

### Common Migration Failures & Solutions

#### 1. pgSchema-based tables not detected

**Problem:** Drizzle-kit says "No schema changes" but tables don't exist.

**Cause:** Tables using `pgSchema()` (namespaced schemas like `pdf.chat`, `image.generation`) must be DIRECTLY exported from `packages/db/src/schema/index.ts`.

**Fix:** Add explicit exports:
```typescript
// index.ts - pgSchema modules need direct exports
export * from "./chat";
export * from "./pdf";
export * from "./image";
```

#### 2. Export naming conflicts

**Problem:** Migration creates some tables but silently skips others.

**Cause:** Multiple schema files export the same names (e.g., both `chat.ts` and `pdf.ts` export `chat`, `message`). Later exports override earlier ones.

**Fix:** Prefix exports to avoid conflicts:
```typescript
// pdf.ts - all exports prefixed with 'pdf'
export const pdfSchema = pgSchema("pdf");
export const pdfChat = pdfSchema.table("chat", {...});
export const pdfMessage = pdfSchema.table("message", {...});
```

#### 3. Missing CREATE SCHEMA statements

**Problem:** Migration fails with `schema "X" does not exist`.

**Cause:** Drizzle-kit sometimes omits `CREATE SCHEMA` statements for pgSchema-based modules.

**Fix:** Manually add at the TOP of the migration file:
```sql
CREATE SCHEMA "chat";
--> statement-breakpoint
CREATE SCHEMA "pdf";
--> statement-breakpoint
CREATE SCHEMA "image";
--> statement-breakpoint
-- rest of migration...
```

#### 4. Missing PostgreSQL extensions

**Problem:** Migration fails with `type "vector" does not exist`.

**Cause:** pgvector extension not installed in PostgreSQL.

**Fix:**
1. Use pgvector-enabled Docker image in `docker-compose.yml`:
   ```yaml
   db:
     image: pgvector/pgvector:pg17  # NOT postgres:18-alpine
   ```
2. Add extension to migration:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. If switching images, clear the volume (data loss!):
   ```bash
   docker compose down db -v && docker compose up -d db
   ```

### Pre-Migration Checklist

Before running `db:generate`:

1. **Check exports in `index.ts`** - All schema files must be exported
2. **Check for naming conflicts** - Search for duplicate export names across schema files
3. **Verify Docker image** - Ensure pgvector image if using vector types

After running `db:generate`:

4. **Review migration file** - Check for:
   - All `CREATE SCHEMA` statements present
   - All expected tables included
   - Extension requirements (e.g., `vector`)

5. **Test migration** - Run `db:migrate` against a fresh database first

### Recovery: When Migrations Fail Mid-Apply

If migration partially applied:

```bash
# 1. Check what was applied
psql -c "\dt" -c "\dn"

# 2. Option A: Fresh start (dev only)
docker compose down db -v
docker compose up -d db
pnpm db:migrate

# 3. Option B: Fix and rerun
# Delete failed migration file and snapshot
# Regenerate and fix issues
# Apply again
```

---

## Knosia Data Model (V1 - 15 Tables)

```
PLATFORM
├── knosia_organization       ← Top-level org (guest TTL support)

WORKSPACE
├── knosia_workspace          ← Bounded context with vocabulary
├── knosia_workspace_connection

CONNECTION
├── knosia_connection         ← Database credentials
├── knosia_connection_health  ← Status tracking
├── knosia_connection_schema  ← Cached schema snapshot

VOCABULARY
├── knosia_vocabulary_item    ← Metrics, dimensions, entities
├── knosia_vocabulary_version ← Version history

ROLE
├── knosia_role_template      ← Cognitive profiles

USER
├── knosia_workspace_membership
├── knosia_user_preference

INTELLIGENCE
├── knosia_analysis           ← Schema analysis runs
├── knosia_conversation       ← Chat sessions
├── knosia_conversation_message

GOVERNANCE
├── knosia_mismatch_report    ← User-reported issues
```

---

## Onboarding State

```typescript
interface OnboardingProgress {
  connectionId: string | null; // Current (single connection)
  // connectionIds: string[];     // TODO: Multi-connection support
  analysisId: string | null;
  workspaceId: string | null;
  selectedRole: UserRole | null; // executive|finance|sales|marketing|product|support
  answers: ConfirmationAnswer[];
  completedSteps: OnboardingStep[];
}
```

---

## Vision Documents

| Document                                                  | Purpose                                      |
| --------------------------------------------------------- | -------------------------------------------- |
| `.artifacts/2025-12-29-1355-knosia-architecture-vision.md`  | Full architecture (30 tables, V1-V5 roadmap) |
| `.artifacts/2025-12-29-0219-knosia-ux-flow-clickthrough.md` | Screen-by-screen UX spec                     |
| `.artifacts/2025-12-29-progressive-connection-onboarding.md`| Multi-connection extension                   |

---

## Context System

### CRITICAL: Check for Active Workflows on Session Start

**After context reset, chat consolidation, or starting a new session:**

```
┌─────────────────────────────────────────────────────────────────┐
│  WORKFLOW CHECK (run immediately on session start)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ls .workflows/active/                                          │
│                                                                 │
│  If workflow found:                                             │
│  → Run /workflow:resume [ID] to continue with proper tracking   │
│  → DO NOT continue work ad-hoc (loses structure)                │
│                                                                 │
│  WHY: Context resets interrupt workflows mid-execution.         │
│  The /workflow:resume command restores:                         │
│  • Wave/task tracking                                           │
│  • Context files from CONTEXT-LIBRARY.yaml                      │
│  • Proper TodoWrite wave-based structure                        │
│  • Parallel execution coordination                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Read Order (for new tasks)

1. **This file** (already loaded)
2. **Check `.workflows/active/`** - Resume any interrupted workflows first
3. **`NEXT-STEPS.md`** - Check current priorities before starting new work
4. `.cognitive/capabilities.yaml` - Before building anything
5. `.cognitive/cache/answers/` - Check for cached wisdom
6. `.artifacts/` - Vision docs when implementing features

### Deep References

| Task                | Read                                                  |
| ------------------- | ----------------------------------------------------- |
| **What to do next** | `NEXT-STEPS.md`                                       |
| Creating component  | `.cognitive/cache/answers/how-to-create-component.md` |
| Creating chart      | `.cognitive/cache/answers/chart-patterns.md`          |
| Entity lookup       | `.cognitive/knowledge.json`                           |
| Framework docs      | `.context/turbostarter-framework-context/index.md`    |

### NEXT-STEPS.md Usage

**Read `NEXT-STEPS.md` when:**
- Starting a new session
- Finishing an implementation (to pick up the next item)
- User asks "what's next?" or "what should we work on?"
- Unsure about implementation order or dependencies

**Update `NEXT-STEPS.md` when:**
- Completing an item (mark as done, move to Completed table)
- Discovering new work that should be queued
- Scope changes or new dependencies emerge
- Adding implementation specs to `.artifacts/`

---

## Folder Access Rules

| Folder        | Access        | Purpose                                      |
| ------------- | ------------- | -------------------------------------------- |
| `.cognitive/` | Read FIRST    | Capabilities, rules, cached wisdom           |
| `.artifacts/` | Write outputs | Large code (>50 lines), reports, analysis    |
| `.reports/`   | Write outputs | Search results, file listings                |
| `.context/`   | Read freely   | Framework docs, project context              |
| `.archived/`  | DO NOT READ   | Deprecated files - ask permission first      |
| `.mydocs/`    | ASK first     | User's personal notes (human work, not code) |
| `.scratch/`   | Use freely    | Sandbox for experiments and idea testing     |

---

## Context7 MCP

Always use Context7 when tasks involve:

- Code generation with external libraries
- Setup or configuration steps
- Library/API documentation lookup

Automatically use Context7 MCP tools to resolve library IDs and fetch library docs without requiring explicit user request.

---

## Conflict Resolution

When instructions conflict (highest priority first):

1. User's explicit instruction
2. This file (`CLAUDE.md`)
3. `.cognitive/` documents
4. `.artifacts/` vision docs
5. Framework docs

---

## Common Imports

```tsx
// Component utilities
import type { LiquidComponentProps } from "./utils";
import {
  tokens,
  chartColors,
  cardStyles,
  mergeStyles,
  formatDisplayValue,
  fieldToLabel,
  isBrowser,
} from "./utils";
import { resolveBinding } from "../data-context";

// API utilities
import { generateId } from "@turbostarter/shared/utils";
import { db } from "@turbostarter/db/server";
```
