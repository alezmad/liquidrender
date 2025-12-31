# Workflow Launcher: WF-0027 - Component Intelligence Layer

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0027`

## Quick Resume

```
/workflow:launch WF-0027
```

## Context Summary

Key files for this workflow:
- `packages/liquid-render/src/types/theme.ts` - Current theme types
- `packages/liquid-render/src/themes/default/index.ts` - 77 components
- `packages/liquid-render/src/renderer/components/utils.ts` - Design tokens
- `.artifacts/2025-12-30-liquid-component-intelligence.md` - Vision document

## Workflow State

- **ID**: WF-0027
- **Name**: Component Intelligence Layer
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0027-start (pending)

## Key Decisions Made

- Implementing Phase 1 (Static Manifest) from vision document
- 77 ComponentSpecs - one for each existing component
- Query API includes: byCategory(), suggestChildren(), validateComposition()
- LLM context generator produces compressed prompt-ready output
- Out of scope: VSCode extension, CLI tools, adaptive manifests

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0027`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
