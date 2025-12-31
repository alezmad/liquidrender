# Workflow Launcher: WF-0025 - Interactive PDF Citations

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0025`

## Quick Resume

```
/workflow:launch WF-0025
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~8,500 tokens):
- `.artifacts/2024-12-30-interactive-pdf-chat-vision.md` - Full vision (~3,500 tokens)
- `.artifacts/2024-12-30-pdf-feature-context.md` - File paths (~800 tokens)
- `packages/db/src/schema/pdf.ts` - DB schema (~600 tokens)
- `packages/ai/src/modules/pdf/embeddings.ts` - Embeddings (~800 tokens)
- `packages/ai/src/modules/pdf/api.ts` - Chat API (~1,600 tokens)
- `apps/web/src/modules/pdf/layout/preview/index.tsx` - Viewer (~400 tokens)
- `apps/web/src/modules/pdf/thread/assistant.tsx` - Messages (~300 tokens)

## Workflow State

- **ID**: WF-0025
- **Name**: Interactive PDF Citations
- **Status**: in_progress
- **Current Wave**: 0
- **Git Tag**: WF-0025-start

## Key Decisions Made

- Page extraction uses @langchain/community PDFLoader metadata (already returns pageNumber)
- Citation format: AI returns `[[cite:embeddingId:pageNum]]` markers
- Frontend parses and renders as clickable [1], [2] etc.
- PDF viewer exposes `usePdfViewer()` hook for cross-component navigation
- Navigation uses URL params `?page=3&highlight=emb_123` for shareability

## Implementation Phases

1. **Wave 0**: Bootstrap - types, schema migration, context skeleton
2. **Wave 1**: Core infrastructure - embedding metadata, AI citations, viewer context (PARALLEL)
3. **Wave 2**: UI components - citation UI, highlight layer, navigation (PARALLEL)
4. **Wave 3**: Integration - wire everything, validate, exports

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0025`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
