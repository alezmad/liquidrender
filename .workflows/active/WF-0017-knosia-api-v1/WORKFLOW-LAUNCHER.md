# Workflow Launcher: WF-0017 - Knosia API V1

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0017`

## Quick Resume

```
/workflow:launch WF-0017
```

## Context Summary

**Core Context (~14k tokens):**
- `.claude/artifacts/2025-12-29-knosia-architecture-vision.md` - Full data model (30 tables, V1=15)
- `.claude/artifacts/2025-12-29-0315-knosia-api-contract-spec.md` - API endpoints, request/response
- `.claude/artifacts/2025-12-29-query-engine-vocabulary-bridge.md` - Query Engine integration
- `packages/db/src/schema/vocabulary.ts` - Existing schema pattern
- `packages/api/src/modules/vocabulary/router.ts` - Existing router pattern

## Workflow State

- **ID**: WF-0017
- **Name**: Knosia API V1
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0017-start (commit: 1b3512e)

## Scope

### V1 Tables (15)
```
organizations          workspaces              workspace_connections
connections            connection_health       connection_schemas
vocabulary_items       vocabulary_versions     role_templates
workspace_memberships  user_preferences        analyses
conversations          conversation_messages   mismatch_reports
```

### V1 API Modules (6)
| Module | Endpoints |
|--------|-----------|
| connections | POST /test, POST /, GET /, DELETE /:id |
| analysis | GET /run (SSE streaming) |
| vocabulary | GET /:id, POST /confirm, POST /report-mismatch |
| briefing | GET / |
| conversation | POST /query, POST /clarify |
| preferences | GET /, PATCH / |

## Key Decisions Made

- Following existing TurboStarter patterns (Hono + Zod + Drizzle)
- Using `packages/api/src/modules/vocabulary/` as reference implementation
- SSE streaming for analysis module using Hono's `streamSSE`
- All routes protected with `enforceAuth` middleware

## Wave Structure

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | Schema (15 tables) |
| 1 | Parallel (6) | API modules |
| 2 | Sequential | Integration |

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0017`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
