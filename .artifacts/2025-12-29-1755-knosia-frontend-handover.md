# Knosia Frontend Implementation - Handover Prompt

Copy this prompt to start a new chat for implementation:

---

## Prompt

```
I need to implement the Knosia frontend. Read these files in order:

**1. Implementation Spec (main document):**
.claude/artifacts/2025-12-29-2330-knosia-frontend-implementation.md

**2. TurboStarter Patterns (reference examples):**
- apps/web/src/app/[locale]/dashboard/(user)/layout.tsx  ← Sidebar layout pattern
- apps/web/src/app/[locale]/dashboard/(user)/page.tsx    ← Dashboard page pattern
- apps/web/src/config/paths.ts                           ← Path configuration
- apps/web/src/modules/common/layout/dashboard/header.tsx ← Header components
- apps/web/src/modules/common/layout/dashboard/sidebar.tsx ← Sidebar component

**3. Backend API (what we're connecting to):**
- packages/api/src/modules/knosia/router.ts              ← API routes
- packages/api/src/modules/knosia/connections/router.ts  ← Connection endpoints
- packages/api/src/modules/knosia/analysis/router.ts     ← Analysis SSE endpoint
- packages/api/src/modules/knosia/vocabulary/router.ts   ← Vocabulary endpoints
- packages/api/src/modules/knosia/conversation/router.ts ← Query endpoint

**4. Database Schema:**
- packages/db/src/schema/knosia.ts                       ← Knosia tables

**5. Framework Reference:**
- .context/turbostarter-framework-context/framework.md   ← Commands & conventions

After reading, start implementing Wave 1: Onboarding Foundation.
Focus on:
1. Add paths to apps/web/src/config/paths.ts
2. Create apps/web/src/app/[locale]/onboarding/layout.tsx
3. Create apps/web/src/app/[locale]/onboarding/connect/page.tsx
4. Create apps/web/src/modules/onboarding/ components

Follow TurboStarter patterns exactly - reuse existing components, use React Query (not Zustand), and use nuqs for URL state.
```

---

## Files to Read Summary

| File | Purpose | Priority |
|------|---------|----------|
| `.claude/artifacts/2025-12-29-2330-knosia-frontend-implementation.md` | Main implementation spec | **Required** |
| `apps/web/src/app/[locale]/dashboard/(user)/layout.tsx` | Sidebar + auth pattern | High |
| `apps/web/src/config/paths.ts` | Path config pattern | High |
| `packages/api/src/modules/knosia/router.ts` | API structure | High |
| `packages/db/src/schema/knosia.ts` | Data models | Medium |
| `.context/turbostarter-framework-context/framework.md` | Commands | Medium |

## Quick Context

- **Backend:** 100% complete (WF-0018) - all API endpoints working
- **Frontend:** 0% - starting fresh
- **Stack:** Next.js App Router, React Query, nuqs, shadcn/ui
- **No Zustand:** Use React Query + URL state instead

## Wave 1 Deliverables

1. `/onboarding/connect` - Database selector + connection form
2. `/onboarding/review` - Analysis progress + business type display
3. SSE hook for real-time analysis updates
4. ~7 components in `modules/onboarding/`

---

*Generated: 2025-12-29*
