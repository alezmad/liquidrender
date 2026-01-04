# CLAUDE.md

AI agent instructions for **Knosia** — the data scientist businesses can't afford, built on LiquidRender.

---

## What Knosia Is

**Knosia** transforms raw business data into actionable knowledge. Connect your database, get a 60-second briefing, vocabulary that speaks your language, and AI that understands your business.

**Core Problem:** "Active Users" means different things to Engineering, Product, Sales, and CEO. This vocabulary misalignment costs millions.

**Solution:** Knosia becomes the company's semantic layer — establishing shared vocabulary, providing role-aware intelligence, and enabling conversation-driven analytics.

**Stack:** Next.js 16 web app → Hono API (26 tables) → LiquidConnect (Schema→Vocabulary) → LiquidRender (77 components)

---

## Implementation Status

### ✅ V1 Foundation + V2 Enhancements

| Area | Location |
|------|----------|
| Database Schema (26 tables) | `packages/db/src/schema/knosia.ts` |
| Connections/Analysis/Canvas/Thread APIs | `packages/api/src/modules/knosia/` |
| Onboarding UI | `apps/web/src/modules/onboarding/` |
| Pipeline Orchestration | `packages/api/src/modules/knosia/pipeline/` |
| Schema Extraction (PostgreSQL/MySQL/DuckDB) | `packages/liquid-connect/src/uvb/` |
| Data Profiling (Tier 1+2, 20% accuracy boost) | `packages/liquid-connect/src/uvb/` |

### 🚧 V2 Gaps
Multi-connection, Dashboard/Thread UI, Global Search, Activity Feed, Comments, AI Insights, Role Selection, Confirmation Questions

### 🔮 V3+ Roadmap
V3: Vocabulary governance | V5: Proactive insights

---

## Critical Rules

### 1. CHECK BEFORE BUILDING
Read `.cognitive/capabilities.yaml` BEFORE creating anything. 77 LiquidRender components and TurboStarter framework already exist.

### 2. REUSE FIRST
- Extend existing, don't duplicate
- TurboStarter features NOT to be rebuilt
- Use design tokens from `utils.ts` (never hardcode colors/spacing)

### 3. ID PATTERNS
```typescript
import { generateId } from "@turbostarter/shared/utils";
const id = generateId(); // NOT UUID

// Zod schemas
import { connectionIdSchema } from "../shared-schemas"; // NOT z.string().uuid()
```

### 4. HYDRATION & LOCALSTORAGE
```typescript
const { progress, isHydrated } = useOnboardingState();
useEffect(() => {
  if (!isHydrated) return; // Wait for localStorage before decisions
  if (!progress.connectionId) router.push("/onboarding/connect");
}, [isHydrated, progress.connectionId]);
```

### 5. COMMIT DISCIPLINE
Suggest commits at natural breakpoints (before refactors, after features, when switching tasks). Atomic commits enable selective reverts.

### 6. PARALLEL EXECUTION
Use Task tool with parallel agents for independent work. Agent instructions must be:
- **Concise** - avoid verbose explanations
- **Outcome-focused** - report only what master agent needs
- **Self-contained** - include all context

For complex parallel work, write reports to `.reports/` instead of returning large outputs.

---

## Communication Philosophy

### Be a Senior Collaborator
- **Challenge weak requests** - If Y is better than X, say so
- **Elevate thinking** - Push toward better solutions (within reach)
- **Protect from shortcuts** - Flag technical debt early

### Output Discipline

| Output Type | Where | Why |
|-------------|-------|-----|
| Decisions, questions | Chat | Developer needs to respond |
| Large code (>50 lines) | `.artifacts/` | Don't clutter conversation |
| Reports, analysis | `.artifacts/` | Preserves context |
| Search results | `.reports/` | Reference without flooding |

**Naming:** `YYYY-MM-DD-HHMM-name-here.md`

### When to Use AskUserQuestion
**Use for:** Architectural decisions, ambiguous requirements, destructive operations
**Don't ask about:** Naming conventions, obvious fixes, implementation details within patterns

### Browser Automation MCP
Always ask user which MCP: Playwriter (preferred for real-time), Playwright MCP, or Browser Eval

---

## Core File Locations

| What | Where |
|------|-------|
| **Next steps** | `NEXT-STEPS.md` |
| Knosia DB schema | `packages/db/src/schema/knosia.ts` |
| Knosia API | `packages/api/src/modules/knosia/` |
| Onboarding | `apps/web/src/modules/onboarding/` |
| LiquidConnect | `packages/liquid-connect/src/` |
| LiquidRender | `packages/liquid-render/src/` |
| Design tokens | `packages/liquid-render/src/renderer/components/utils.ts` |

---

## Adding Pages & Features

### Think Feature, Not Page
**Create module** if: has state/hooks/types, reusable components, multiple routes

**Module structure:**
```
apps/web/src/modules/[feature]/
├── components/
├── hooks/
├── types.ts
└── index.ts  ← Barrel exports
```

### Three-File Contract
1. `config/paths.ts` → Define routes
2. `layout.tsx` → Add to sidebar menu
3. `i18n translations` → Add display strings

**Page template:** See `.cognitive/cache/answers/` for full patterns

### Layout Hierarchy
```
app/[locale]/
├── layout.tsx                → Root (providers)
├── (marketing)/layout.tsx    → Marketing
├── dashboard/layout.tsx      → Auth check
│   ├── (user)/layout.tsx     → User sidebar
│   └── [organization]/       → Org sidebar
└── admin/layout.tsx          → Admin sidebar
```

**Icons:** `import { Icons } from "@turbostarter/ui-web/icons"` (lucide-react)

---

## Creating API Endpoints

### Module Structure
```
packages/api/src/modules/[feature]/
├── router.ts      ← Routes (thin layer)
├── schemas.ts     ← Zod validation
├── queries.ts     ← SELECT operations
├── mutations.ts   ← INSERT/UPDATE/DELETE
└── index.ts       ← Barrel exports
```

**Full patterns:** See `.cognitive/cache/answers/api-patterns.md`

### Middleware
```typescript
import {
  enforceAuth,       // Logged-in user
  enforceAdmin,      // Admin role
  enforceMembership, // Org membership
  validate,          // Zod validation
} from "../../../middleware";
```

### Frontend API Calls
**Server:** `const data = await handle(api.posts.$get)();`
**Client:** `useQuery({ queryKey: ["posts"], queryFn: handle(api.posts.$get) })`

---

## Form Patterns

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({ resolver: zodResolver(formSchema) });

// With TurboStarter UI
<Form {...form}>
  <FormField name="name" render={({ field }) => (
    <FormItem><FormLabel>Name</FormLabel><Input {...field} /><FormMessage /></FormItem>
  )} />
</Form>
```

**Full patterns:** `.cognitive/cache/answers/form-patterns.md`

---

## Creating LiquidRender Components

**Deep reference:** `.cognitive/cache/answers/how-to-create-component.md`

### Mandatory File Structure
```tsx
// [ComponentName] Component
import React from "react";
import type { LiquidComponentProps } from "./utils";
import { tokens, cardStyles, mergeStyles } from "./utils";
import { resolveBinding } from "../data-context";

export function ComponentName({ block, data }: LiquidComponentProps) {
  const value = resolveBinding(block.binding, data);
  return <div data-liquid-type="typename" style={styles.wrapper}>{/* ... */}</div>;
}
```

### Design Tokens (NEVER hardcode)
```tsx
// CORRECT
padding: tokens.spacing.md,
color: tokens.colors.foreground,

// INCORRECT
padding: '16px', color: '#0a0a0a'
```

**Token categories:** `tokens.colors.*`, `spacing.*`, `radius.*`, `fontSize.*`, `fontWeight.*`

### Requirements Checklist
- [ ] `data-liquid-type` on root
- [ ] Handle empty/null states
- [ ] Use `formatDisplayValue()` for values
- [ ] SSR placeholder if browser-dependent (`isBrowser` check)

**Chart patterns:** `.cognitive/cache/answers/chart-patterns.md`

---

## Available Packages

```yaml
charts: recharts
ui_primitives: "@radix-ui/*"
forms: react-hook-form
validation: zod
data_fetching: "@tanstack/react-query"
dates: date-fns
icons: lucide-react
http: hono (server)
database: drizzle-orm
auth: better-auth
testing: vitest + playwright
```

---

## UI Components (77 in LiquidRender)

**Tables & Data:** data-table, list, tree, kanban, timeline
**Charts:** line-chart, bar-chart, area-chart, pie-chart, scatter, heatmap, sankey, sparkline, gauge
**Forms:** button, checkbox, date, input, select, switch, textarea, upload, rating
**Layout:** accordion, card, container, grid, header, modal, nav, sidebar, tabs
**Feedback:** drawer, popover, sheet, tooltip, alert, toast, skeleton, spinner
**Display:** avatar, badge, breadcrumb, heading, icon, image, kpi-card, progress

---

## TurboStarter Framework (DO NOT REBUILD)

| Feature | Package |
|---------|---------|
| Auth/Billing/DB/API/UI/i18n/Email/Storage | `@turbostarter/*` |

**Docs:** `.context/turbostarter-framework-context/index.md`

---

## Essential Commands

```bash
pnpm install                    # Dependencies
pnpm services:start             # Docker (PostgreSQL)
pnpm with-env -F @turbostarter/db db:setup   # First-time DB
pnpm dev                        # Start all apps

# Database
pnpm with-env -F @turbostarter/db db:generate  # Generate migration
pnpm with-env -F @turbostarter/db db:migrate   # Apply migrations
pnpm with-env -F @turbostarter/db db:studio    # Drizzle Studio

# Quality
pnpm typecheck && pnpm lint && pnpm format
```

---

## Database Migration Best Practices

### Common Failures

**1. pgSchema tables not detected**
→ Export directly from `packages/db/src/schema/index.ts`

**2. Export naming conflicts**
→ Prefix exports to avoid collisions (e.g., `pdfChat`, `pdfMessage`)

**3. Missing CREATE SCHEMA**
→ Manually add to migration file top

**4. Missing extensions**
→ Use pgvector image: `pgvector/pgvector:pg17`

### Pre-Migration Checklist
1. Check exports in `index.ts`
2. Search for naming conflicts
3. Verify Docker image for extensions
4. Review generated migration
5. Test against fresh DB

---

## Knosia Data Model (26 Tables)

**Platform (3):** organization, workspace, workspace_connection
**Connection (3):** connection, connection_health, connection_schema
**Vocabulary (2):** vocabulary_item, vocabulary_version
**Intelligence (4):** analysis, thread, thread_message, thread_snapshot
**Canvas (2):** workspace_canvas, canvas_version
**User (3):** workspace_membership, user_preference, user_vocabulary_prefs
**Role (1):** role_template
**Profiling (2):** table_profile, column_profile
**Governance (2):** mismatch_report, comment
**Notification (4):** notification, ai_insight, activity, digest

---

## Architecture References

| Document | Purpose |
|----------|---------|
| `.docs/knosia-architecture.md` | Current architecture (V1+V2) |
| `.artifacts/2025-12-29-1355-knosia-architecture-vision.md` | V1-V5 roadmap |
| `.artifacts/2025-12-29-0219-knosia-ux-flow-clickthrough.md` | Screen-by-screen UX |

---

## V2 Profiling-Enhanced Vocabulary (Complete ✅)

Uses data profiling (null%, cardinality, freshness) for 20% accuracy boost:
- **ID exclusion** via >90% unique cardinality
- **Enum detection** via <100 values, >80% coverage
- **Required fields** via <5% null
- **COUNT_DISTINCT** for low-cardinality metrics

**Test:** `packages/liquid-connect/src/uvb/__tests__/rules-profiling.test.ts` (8/8 passing)

---

## Context System

### On Session Start
```bash
ls .workflows/active/  # Check for interrupted workflows
# If found → /workflow:resume [ID]
```

### Read Order
1. This file (loaded)
2. `.workflows/active/` (resume first)
3. `NEXT-STEPS.md` (current priorities)
4. `.cognitive/capabilities.yaml` (before building)
5. `.cognitive/cache/answers/` (cached patterns)
6. `.artifacts/` (vision docs)

### Deep References

| Task | Read |
|------|------|
| **Next priorities** | `NEXT-STEPS.md` |
| **Architecture** | `.docs/knosia-architecture.md` |
| Component patterns | `.cognitive/cache/answers/how-to-create-component.md` |
| Chart patterns | `.cognitive/cache/answers/chart-patterns.md` |
| Entity lookup | `.cognitive/knowledge.json` |
| Framework docs | `.context/turbostarter-framework-context/index.md` |

### Folder Access

| Folder | Access | Purpose |
|--------|--------|---------|
| `.cognitive/` | Read FIRST | Capabilities, rules, patterns |
| `.docs/` | Read freely | Architecture specs |
| `.artifacts/` | Write outputs | Large code, reports |
| `.reports/` | Write outputs | Search results |
| `.context/` | Read freely | Framework docs |
| `.archived/` | DO NOT READ | Deprecated (ask first) |
| `.mydocs/` | ASK first | User's personal notes |
| `.scratch/` | Use freely | Experiments |

---

## Context7 MCP

Auto-use for: library docs lookup, external library code generation, setup/config

---

## Conflict Resolution

Priority: 1) User instruction 2) This file 3) `.cognitive/` 4) `.artifacts/` 5) Framework docs

---

## Common Imports

```tsx
// LiquidRender
import type { LiquidComponentProps } from "./utils";
import { tokens, chartColors, cardStyles, formatDisplayValue, fieldToLabel, isBrowser } from "./utils";
import { resolveBinding } from "../data-context";

// API
import { generateId } from "@turbostarter/shared/utils";
import { db } from "@turbostarter/db/server";
```
