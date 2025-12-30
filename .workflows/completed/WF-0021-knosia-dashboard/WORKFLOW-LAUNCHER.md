# Workflow Launcher: WF-0021 - Knosia Dashboard + Guest Infrastructure

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0021`

## Quick Resume

```
/workflow:launch WF-0021
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~8,500 tokens):
- `packages/api/src/modules/knosia/briefing/schemas.ts` - BriefingResponse types
- `packages/api/src/modules/knosia/briefing/queries.ts` - Mock data patterns
- `apps/web/src/app/[locale]/dashboard/(user)/layout.tsx` - Layout pattern
- `apps/web/src/config/paths.ts` - Route definitions
- `packages/i18n/src/translations/en/knosia.json` - i18n keys

## Workflow State

- **ID**: WF-0021
- **Name**: Knosia Dashboard + Guest Infrastructure
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0021-start

## Key Decisions Made

- Dashboard module at `apps/web/src/modules/dashboard/`
- Knosia layout at `/dashboard/knosia/` with dedicated sidebar
- Reuse ExpirationBanner from onboarding module (don't duplicate)
- Use existing i18n keys from knosia.json (no modifications needed)
- Cron endpoint for guest workspace cleanup

## Scope

### Wave 0 (Sequential): Bootstrap
- Create types.ts with component prop interfaces
- Set up directory structure

### Wave 1 (Parallel): UI Components
- T1: briefing-card.tsx - Greeting and data freshness
- T2: kpi-grid.tsx - 4-column KPI display
- T3: alert-list.tsx - Attention needed section
- T4: ask-input.tsx - Quick query input

### Wave 2 (Sequential): Hook + Barrels
- T5: use-briefing.ts - Fetch briefing from API
- Barrel exports for module

### Wave 3 (Sequential): Pages + Cron
- T6: layout.tsx - Knosia sidebar menu
- T7: page.tsx - Briefing landing page
- T8: Cron cleanup endpoint

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0021`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
