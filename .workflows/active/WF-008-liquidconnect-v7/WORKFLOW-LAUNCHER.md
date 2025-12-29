# Workflow Launcher: WF-008 - LiquidConnect v7 Compiler

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-008`

## Quick Resume

```
/workflow:launch WF-008
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~8,500 tokens):
- `packages/liquid-connect/specs/SPEC-v7-SYNTHESIS.md` - v7 syntax spec (~4,200 tokens)
- `packages/liquid-connect/specs/language.md` - Current implementation (~3,000 tokens)
- `packages/liquid-connect/src/compiler/tokens.ts` - Token definitions (~300 tokens)

## Workflow State

- **ID**: WF-008
- **Name**: LiquidConnect v7 Compiler
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-008-start (commit: ab43834)

## Key Changes to Implement

| Feature | Current | v7 |
|---------|---------|-----|
| Time duration | `~P30d` | `~30d` (P optional) |
| Time aliases | Not supported | `~today`, `~last_month`, `~YTD` |
| Filter chaining | Implicit AND | Explicit `&` required (E104) |
| Comparison cols | `delta`, `delta_percent` | `_compare`, `_delta`, `_pct` |
| Scope pins | Not supported | `Q@orders @revenue` |
| Time override | Not supported | `@t:signupDate` |
| Explain mode | Not supported | `!explain` |

## Execution Plan

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | tokens.ts, diagnostics.ts |
| 1 | Parallel (3) | scanner.ts, parser.ts, ast.ts |
| 2 | Parallel (3) | time.ts, filter.ts, resolver.ts |
| 3 | Parallel (4) | base.ts, duckdb, postgres, trino |
| 4 | Sequential | liquidflow/types.ts |

## Key Decisions Made

- Use v6 compressed time notation (`~30d`) with readable aliases (`~last_month`)
- Enforce explicit `&` between filters (error E104 for implicit AND)
- Change comparison column naming to `_compare`, `_delta`, `_pct`
- Add enterprise features: scope pins, time override, explain mode

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-008`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
