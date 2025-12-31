# Workflow Launcher: WF-0030 - Knosia Vision Implementation

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0030`

## Quick Resume

```
/workflow:resume WF-0030
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~1,144 tokens):
- `.context/CLAUDE.md` - Project context hub (~1,144 tokens)

Key implementation files:
- `.artifacts/2025-12-31-knosia-vision-implementation-spec.md` - Full spec
- `packages/db/src/schema/knosia.ts` - Current schema (15 tables)
- `packages/api/src/modules/knosia/` - Current API modules

## Workflow State

- **ID**: WF-0030
- **Name**: Knosia Vision Implementation
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0030-start (commit: 4f44536)

## Key Decisions Made

1. **Rename conversation → thread**: Full migration before adding new tables
2. **Hybrid blocks**: Canvas-native (hero_metric, watch_list, comparison, insight) + LiquidRender delegation (charts, tables)
3. **Block Trust Metadata**: Added to thread messages with provenance field
4. **Tests per module**: API tests + UI component tests + final Playwright check
5. **10 waves total**: Schema → API → Frontend → Tests → Playwright

## Scope

**Phase 0: Schema Foundation**
- Rename conversation → thread (tables, enums, refs)
- Add 9 new tables: Canvas (3), Collaboration (3), Notification (3)

**Phase 1: API Modules**
- Thread (rename + enhance with forking, snapshots, sharing)
- Canvas (CRUD + blocks + alerts)
- Comment, Notification, Digest

**Phase 2: Frontend Modules**
- Thread UI (view, sidebar, actions)
- Canvas UI (grid layout, blocks, editor)
- Brief Enhancement (attention, on-track, thinking sections)

**Phase 3: Testing**
- API integration tests
- UI component tests
- Playwright E2E verification

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0030`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
