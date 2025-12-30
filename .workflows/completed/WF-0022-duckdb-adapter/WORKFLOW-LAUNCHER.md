# Workflow Launcher: WF-0021 - DuckDB Universal Adapter

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0021`

## Quick Resume

```
/workflow:launch WF-0021
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~7,800 tokens):
- `.artifacts/2025-12-29-duckdb-universal-adapter-implementation.md` - Complete spec (~3,500 tokens)
- `packages/liquid-connect/src/uvb/adapters/postgres.ts` - Pattern reference (~500 tokens)
- `packages/liquid-connect/src/uvb/extractor.ts` - DatabaseAdapter interface (~2,000 tokens)
- `packages/liquid-connect/src/uvb/models.ts` - Type definitions (~1,500 tokens)

## Workflow State

- **ID**: WF-0021
- **Name**: DuckDB Universal Adapter
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0021-start (commit: 8e77354)

## Execution Plan

| Wave | Type | Tasks | Est. Time |
|------|------|-------|-----------|
| 0 | Sequential | Add duckdb dependency | ~30s |
| 1 | Parallel (2) | DuckDBAdapter, QueryExecutor | ~3-5 min |
| 2 | Sequential | Exports, Tests | ~1-2 min |

## Key Decisions Made

- DuckDB as universal adapter (replaces PostgresAdapter as primary)
- Connects via postgres_scanner, mysql_scanner, sqlite_scanner extensions
- QueryExecutor wraps adapter with timeout + row limits
- Keep PostgresAdapter as fallback

## File Ownership (EXCLUSIVE)

```
CREATE:
- packages/liquid-connect/src/uvb/adapters/duckdb.ts
- packages/liquid-connect/src/executor/index.ts
- packages/liquid-connect/src/executor/timeout.ts
- packages/liquid-connect/src/uvb/adapters/__tests__/duckdb.test.ts

MODIFY:
- packages/liquid-connect/src/uvb/adapters/index.ts
- packages/liquid-connect/package.json
```

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0021`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
