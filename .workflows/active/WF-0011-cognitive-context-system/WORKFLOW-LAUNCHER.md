# Workflow Launcher: WF-0011 - Production Cognitive Context System

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0011`

## Quick Resume

```
/workflow:launch WF-0011
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~8,500 tokens):
- `.claude/context/docs/distribution/cognitive-context/README.md` - Distribution docs
- `.claude/context/docs/distribution/cognitive-context/ONBOARDING-AGENT.md` - Protocol
- `.context/knowledge/capabilities.yaml` - Example format
- `.context/knowledge/SUMMARY.md` - Example format

## Workflow State

- **ID**: WF-0011
- **Name**: Production Cognitive Context System
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0011-start (commit: fcdc66e)

## Problem Being Solved

The current cognitive-context is documentation, not a working system. It requires:
- Manual inventory maintenance (nobody does this)
- Manual sync commands (forgotten)
- No validation (drift goes unnoticed)
- No feedback loop (can't improve)

## Solution Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   EXTRACT   │───▶│   VALIDATE  │───▶│   DELIVER   │
│             │    │             │    │             │
│ AST Parser  │    │ Completeness│    │ Multi-tool  │
│ File Watch  │    │ Token Budget│    │ Sync Engine │
│ Git Hooks   │    │ Drift Detect│    │ Adapters    │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Key Decisions Made

1. **TypeScript package** in `packages/cognitive-context/`
2. **AST-based extraction** using TypeScript compiler API (not regex)
3. **Multi-tool support**: Cursor, Claude Code, Continue, Aider
4. **Self-maintaining**: File watcher + git hooks + CI validation
5. **Token budgeting**: Enforce SUMMARY.md stays under 300 tokens

## Wave Structure

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | Bootstrap (types, config, package.json) |
| 1 | Parallel (4) | AST Extractor, File Watcher, Token Counter, Config Loader |
| 2 | Parallel (3) | Validator, Drift Detector, Sync Engine |
| 3 | Sequential | Adapters, CLI, Pre-commit, CI Action |

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0011`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
