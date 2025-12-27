# Workflow Launcher: WF-0010 - Cognitive Context Documentation

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:resume WF-0010`

## Quick Resume

```
/workflow:resume WF-0010
```

## Context Summary

Reference files for this workflow:
- `.claude/context/COGNITIVE-CONTEXT-FRAMEWORK.md` - Vision document
- `.claude/context/ORIENTATION.md` - Example orientation
- `.claude/context/schemas/*.yaml` - Schema definitions
- `.claude/context/wisdom/*.md` - Example wisdom files

## Workflow State

- **ID**: WF-0010
- **Name**: Cognitive Context Documentation
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0010-start (commit: 0eb42c9)

## Key Decisions Made

From approval conversation:
1. **Three artifacts**: MANIFESTO (philosophy), SPECIFICATION (technical), QUICKSTART (5-min guide)
2. **Portable template**: Drop-in directory for any project
3. **Project-agnostic**: Documentation written for community reuse

## Deliverables

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | Create docs directory |
| 1 | Parallel (3) | MANIFESTO.md, SPECIFICATION.md, QUICKSTART.md |
| 2 | Parallel (2) | Portable template, setup.sh |

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:resume WF-0010`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
