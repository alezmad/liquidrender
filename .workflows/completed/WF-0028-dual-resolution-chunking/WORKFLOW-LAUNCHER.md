# Workflow Launcher: WF-0028 - Dual-Resolution PDF Chunking

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0028`

## Quick Resume

```
/workflow:launch WF-0028
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~1,144 tokens):
- `.context/CLAUDE.md` - Project context hub

Key spec document:
- `.artifacts/2025-12-31-1815-dual-resolution-chunking.md` - Full implementation spec

## Workflow State

- **ID**: WF-0028
- **Name**: Dual-Resolution PDF Chunking
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0028-start (commit: 94732840bf6670a4ec866c304d2e04f21e9f19bb)

## Problem Being Solved

Current PDF chunking uses arbitrary 1000-char boundaries that split mid-sentence/paragraph.
This causes:
- Fuzzy text matching for highlights (imprecise)
- Lost PDF structure (no layout awareness)
- Fragile `indexOf` for position finding

## Solution

**Dual-Resolution Chunking:**
1. **Citation Units** - Paragraph-level with exact bounding boxes for pixel-perfect highlighting
2. **Retrieval Chunks** - Groups 3-5 citation units for semantic search (one embedding per chunk)

## Wave Structure

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | T0: Schema + T1: Migration |
| 1 | Parallel (2) | T2: Layout Parser, T3: Chunking |
| 2 | Parallel (2) | T4: Dual Embeddings, T5: Search |
| 3 | Sequential | T6: Highlight, T7: API, T8: Integration |

## Key Files to Create/Modify

- `packages/db/src/schema/pdf.ts` - Add citationUnit, retrievalChunk tables
- `packages/ai/src/modules/pdf/layout-parser.ts` - Extract paragraphs with positions
- `packages/ai/src/modules/pdf/chunking.ts` - Group paragraphs into semantic chunks
- `packages/ai/src/modules/pdf/dual-embeddings.ts` - Process with dual resolution
- `packages/ai/src/modules/pdf/search.ts` - Search and return citation units
- `apps/web/src/modules/pdf/layout/preview/highlight-layer.tsx` - Bounding box rendering

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0028`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
