# Workflow Launcher: WF-0020 - Progressive Connection Onboarding

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0020`

## Quick Resume

```
/workflow:launch WF-0020
```

## Context Summary

Key files (~3,500 tokens):
- `.artifacts/2025-12-29-progressive-connection-implementation.md` - Full implementation spec
- `apps/web/src/modules/onboarding/types.ts` - Current types to extend
- `apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts` - State hook to update

## Workflow State

- **ID**: WF-0020
- **Name**: Progressive Connection Onboarding
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0020-start (commit: 8e77354)

## Key Decisions Made

- Keep `connectionId` for backward compatibility alongside `connectionIds[]`
- First connection automatically becomes `primaryConnectionId`
- Summary screen appears after first successful connection
- Use `connectionIdSchema` from shared-schemas (not `z.string()`)

## Task Summary

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | Extend types.ts |
| 1 | Parallel (3) | State hook, Summaries hook, Summary card |
| 2 | Parallel (2) | Summary screen, Connect page |
| 3 | Sequential | i18n + exports + validation |

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0020`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
