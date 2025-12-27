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


---

## ✈️ Pre-flight Checks

> **Display this card before starting workflow execution. Loop until user selects [Y] or [S].**

```
┌─────────────────────────────────────────────────────────────┐
│  🛫 PRE-FLIGHT CHECKS                                       │
├─────────────────────────────────────────────────────────────┤
│  Start Commit: {start_commit}                               │
│  Target: {target_path}                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [G] Check git status        git status                     │
│  [B] Check branch            git branch --show-current      │
│  [I] Install dependencies    pnpm install                   │
│  [U] Build project           pnpm build                     │
│                                                             │
│  [A] Run all checks                                         │
│  [Y] Ready - proceed with workflow                          │
│  [S] Skip checks - proceed anyway                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Enter letter(s): `g`, `gbi`, `a`, `y`, or `s`

---

## 🛬 Post-flight Checks

> **Display this card after workflow completion. Loop until user selects [S].**

```
┌─────────────────────────────────────────────────────────────┐
│  🛬 POST-FLIGHT CHECKS                                      │
├─────────────────────────────────────────────────────────────┤
│  ✓ All waves completed                                      │
│  ✓ TypeScript compiles clean                                │
├─────────────────────────────────────────────────────────────┤
│  Start: {start_commit} → End: {end_commit}                  │
│  Branch: {commits_ahead} commits ahead of origin            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [C] Commit changes          git add && git commit          │
│  [P] Push to remote          git push                       │
│  [R] Create PR               gh pr create                   │
│  [T] Run tests               pnpm test                      │
│  [M] Move to completed       mv to .workflows/completed/    │
│  [G] Tag release             git tag {id}-end               │
│                                                             │
│  [A] All of the above                                       │
│  [S] Done - exit workflow                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Enter letter(s): `c`, `cp`, `cpr`, `a`, or `s`

---

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0011`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
