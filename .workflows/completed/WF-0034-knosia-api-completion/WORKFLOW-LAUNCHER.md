# Workflow Launcher: WF-0034 - Knosia API Completion

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:resume WF-0034`

## Quick Resume

```
/workflow:resume WF-0034
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~14,500 tokens):
- `thread/mutations.ts` - shareThread pattern to replicate
- `canvas/router.ts` - Existing canvas API structure
- `insight/mutations.ts` - Current implementation with TODOs
- `insight/helpers.ts` - Statistical functions
- `connections/queries.ts` - Connection query patterns
- `canvas-share-modal.tsx` - Share modal with TODOs
- `canvas-view.tsx` - Alert/AI handlers to wire

## Workflow State

- **ID**: WF-0034
- **Name**: Knosia API Completion
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0034-start (commit: ac1afaf)

## Key Decisions Made

- Canvas Share API follows thread/mutations.ts pattern (shareThread → shareCanvas)
- Insight queries use new data-queries.ts functions from connections module
- Alert API already exists in canvas/router.ts - just wire UI handlers
- AI edit API already exists in canvas/router.ts POST /:id/edit

## Wave Structure

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | T0: Connection data queries |
| 1 | Parallel | T1: Canvas Share API, T2: Insight real queries |
| 2 | Parallel | T3: Share modal wire, T4: View handlers |
| 3 | Sequential | T5: TypeCheck validation |

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:resume WF-0034`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
