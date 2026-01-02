# Workflow Launcher: WF-0032 - Precise PDF Highlighting

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0032`

## Quick Resume

```
/workflow:resume WF-0032
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~8,000 tokens):
- `packages/ai/src/modules/pdf/api.ts` - Current tools, stream handling
- `packages/ai/src/modules/pdf/constants.ts` - System prompts
- `packages/ai/src/modules/pdf/types.ts` - PDF types to extend
- `apps/web/src/modules/pdf/context/pdf-viewer-context.tsx` - Viewer state
- `apps/web/src/modules/pdf/layout/preview/highlight-layer.tsx` - Existing highlight patterns
- `.artifacts/2026-01-01-precise-pdf-highlighting.md` - Implementation spec

## Workflow State

- **ID**: WF-0032
- **Name**: Precise PDF Highlighting
- **Status**: in_progress
- **Current Wave**: 0
- **Git Tag**: WF-0032-start (commit: 1461e7c)

## Key Decisions Made

- Use page-level fallback if exact text not found (simplest approach first)
- Keep existing `[[cite:...]]` system during transition period
- Use numbered badges on citation chips for multiple highlights
- highlightText tool returns PreciseCitation for streaming
- New text-highlight-layer.tsx component (coexists with existing bbox-based highlight-layer.tsx)

## Wave Structure

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | T0: PreciseCitation type |
| 1 | Parallel | T1: highlightText tool, T2: System prompt |
| 2 | Parallel | T3: Context text highlights, T4: Text highlight layer |
| 3 | Sequential | T5: Wire assistant + preview |

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:resume WF-0032`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
