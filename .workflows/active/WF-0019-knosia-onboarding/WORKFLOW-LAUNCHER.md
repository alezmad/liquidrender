# Workflow Launcher: WF-0019 - Knosia Onboarding Foundation

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0019`

## Quick Resume

```
/workflow:launch WF-0019
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~1,936 tokens):
- `.context/CLAUDE.md` - Project context hub (~1,144 tokens)
- `CLAUDE.md` - Root agent instructions (~792 tokens)

Additional context to read:
- `.claude/artifacts/2025-12-29-2330-knosia-frontend-implementation.md` - Full implementation spec
- `apps/web/src/app/[locale]/dashboard/(user)/layout.tsx` - TurboStarter sidebar pattern
- `packages/api/src/modules/knosia/router.ts` - Backend API endpoints

## Workflow State

- **ID**: WF-0019
- **Name**: Knosia Onboarding Foundation
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0019-start (commit: b3db360)

## Wave Overview

| Wave | Type | Tasks | Status |
|------|------|-------|--------|
| 0 | Sequential | Bootstrap (paths, i18n, types) | pending |
| 1 | Parallel (3) | Layout, DB Selector, Hooks | pending |
| 2 | Parallel (3) | Connection Form, Analysis Progress, Detection Review | pending |
| 3 | Sequential | Route Pages + Integration | pending |

## Key Decisions Made

- Following TurboStarter patterns from `(user)/layout.tsx`
- Using existing API endpoints from `packages/api/src/modules/knosia/`
- No new dependencies needed (using existing React Query, nuqs)
- Onboarding at `/onboarding/*` (no dashboard prefix)

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0019`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
