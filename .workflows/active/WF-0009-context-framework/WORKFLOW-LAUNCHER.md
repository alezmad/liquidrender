# Workflow Launcher: WF-0009 - Cognitive Context Framework

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0009`

## Quick Resume

```
/workflow:resume WF-0009
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~3,500 tokens):
- `CLAUDE.md` - Project rules (~200 tokens)
- `.context/CLAUDE.md` - Context hub (~250 tokens)
- `.claude/CONTEXT-FRAMEWORK-VISION.md` - Previous vision (~3,000 tokens)

## Workflow State

- **ID**: WF-0009
- **Name**: Cognitive Context Framework
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0009-start (commit: 5e04663)

## Key Decisions Made

From approval conversation:
1. **Filesystem + JSON indices, no database** - LLM is the query engine
2. **Progressive document structure** - 5 tiers: identity → purpose → structure → TL;DRs → full
3. **Two graphs** - Concept graph (understanding) + Entity graph (implementation)
4. **Wisdom = cached traversal** - Don't re-derive, cache the answer
5. **300-token ORIENTATION.md** - Always loaded, cognitive reload

## Core Philosophy

> Context is not storage. Context is externalized cognition.

The goal isn't to give an LLM more data. It's to give it **crystallized intelligence**.

## Deliverables

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | Directory structure, schemas |
| 1 | Parallel (3) | ORIENTATION.md, wisdom file, template |
| 2 | Sequential | Vision document, integration |

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:resume WF-0009`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
