# Workflow Launcher: WF-0033 - Knosia Canvas & Insights Implementation

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0033`

## Quick Resume

```
/workflow:launch WF-0033
```

## Context Summary

Key files for this workflow:
- `.artifacts/2026-01-01-1200-knosia-remaining-implementation.md` - Full spec
- `apps/web/src/modules/knosia/canvas/types.ts` - Canvas types
- `apps/web/src/modules/knosia/canvas/components/blocks/block-renderer.tsx` - Existing renderer

## Workflow State

- **ID**: WF-0033
- **Name**: Knosia Canvas & Insights Implementation
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0033-start (commit: 1461e7c)

## Key Decisions Made

- 4-wave structure: Bootstrap → Core blocks → Extended + Collab → Integration
- Parallel execution for independent block components
- LiquidRender delegation pattern for chart types
- Statistical helpers in separate file for reuse

## Waves Overview

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | Bootstrap & verify structure |
| 1 | Parallel (4) | hero-metric, watch-list, comparison-card, insight-card |
| 2 | Parallel (4) | liquid-render-block, insight-helpers, alerts-panel, share-modal |
| 3 | Sequential | Integration & wiring |

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0033`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
