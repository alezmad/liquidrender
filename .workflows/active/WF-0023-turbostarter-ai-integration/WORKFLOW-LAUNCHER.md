# Workflow Launcher: WF-0023 - Turbostarter AI Integration

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0023`

## Quick Resume

```
/workflow:launch WF-0023
```

## Context Summary

Source repository: `/Users/agutierrez/Desktop/turbostarter-ai`

Key files to reference:
- `turbostarter-ai/packages/ai/` - AI modules (chat, credits, image, pdf, tts)
- `turbostarter-ai/packages/db/src/schema/` - chat.ts, image.ts, pdf.ts
- `turbostarter-ai/apps/web/src/modules/` - UI components
- `turbostarter-ai/AGENTS.md` - AI architecture documentation

## Workflow State

- **ID**: WF-0023
- **Name**: Turbostarter AI Integration
- **Status**: in_progress
- **Current Wave**: 0 (Pre-flight & Bootstrap)
- **Git Tag**: WF-0023-start (commit: 8e77354)

## Key Decisions Made

- Keep liquidrender's newer auth (1.4.6 vs 1.3.34)
- Use separate DB schema namespaces (chat., image., pdf.)
- AI API routes under /api/ai/* (no conflict with /api/knosia/*)
- Copy all 5 AI modules: chat, credits, image, pdf, tts

## Integration Tasks

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | Bootstrap (package structure, deps) |
| 1 | Parallel | AI package, DB schemas, i18n |
| 2 | Parallel | API router, Web modules |
| 3 | Sequential | Migrations, validation |

## Dependencies to Install

```
@ai-sdk/anthropic @ai-sdk/deepseek @ai-sdk/fireworks @ai-sdk/google
@ai-sdk/replicate @ai-sdk/xai @elevenlabs/elevenlabs-js
@langchain/community @langchain/core @tavily/core pdf-parse
```

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0023`

The launcher will:
- Read STATUS.yaml for current position
- Resume from the current wave
- Continue parallel execution where applicable
