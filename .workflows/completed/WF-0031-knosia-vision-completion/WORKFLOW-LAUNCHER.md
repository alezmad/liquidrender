# Workflow Launcher: WF-0031 - Knosia Vision Completion

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0031`

## Quick Resume

```
/workflow:resume WF-0031
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~15k tokens):
- `.artifacts/2025-12-31-knosia-implementation-gaps.md` - **MANDATORY** gap analysis with code (~8k)
- `.artifacts/2025-12-31-knosia-vision-implementation-spec.md` - Original spec (~6k)
- `packages/api/src/modules/knosia/thread/router.ts` - Thread router to extend (~800)

## Workflow State

- **ID**: WF-0031
- **Name**: Knosia Vision Completion
- **Status**: approved
- **Current Wave**: 0 (not started)
- **Git Tag**: WF-0031-start (commit: 2206395)

## What This Workflow Does

Completes the gaps left by WF-0030:

| Gap | Description | Wave |
|-----|-------------|------|
| 8 | Sidebar Menu (canvases, threads) | 0 |
| 7 | Dashboard Pages (4 routes) | 0, 3 |
| 1 | Thread API (fork, snapshot, star, share) | 1 |
| 5 | Comment Mention Notifications | 1 |
| 6 | Digest Preview Content | 1 |
| 2 | Block Trust Provenance | 2 |
| 3 | AI Insight Generation | 2 |
| 4 | AI Canvas Generation | 3 |

## Key Decisions Made

- Wave structure optimized for parallel execution
- Sidebar menu first (enables navigation)
- Page stubs before full wiring (separation of concerns)
- Provenance system in liquid-connect (not API)

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:resume WF-0031`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
