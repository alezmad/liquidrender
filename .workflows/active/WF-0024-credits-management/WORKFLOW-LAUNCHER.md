# Workflow Launcher: WF-0024 - Credits Management System

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0024`

## Quick Resume

```
/workflow:launch WF-0024
```

## Context Summary

Files from STATUS.yaml (~8k tokens):
- `.artifacts/2025-12-30-credits-management-implementation.md` - Full spec (~8k tokens)
- `packages/db/src/schema/customer.ts` - Existing customer table
- `packages/api/src/modules/admin/customers/router.ts` - Existing router

## Workflow State

- **ID**: WF-0024
- **Name**: Credits Management System
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0024-start (commit: 04b1108)

## Key Decisions Made

- Use existing `packages/ai` package for credits config (already exists)
- Add `credit_transaction` table for audit log
- Auto-create customer on user signup via better-auth hooks
- Admin UI as dialog component in customers table
- No new dependencies needed

## Wave Plan

| Wave | Type | Tasks | Files |
|------|------|-------|-------|
| 0 | Sequential | Schema & Migration | credit-transaction.ts, index.ts |
| 1 | Parallel (3) | Config, Auth Hook, Backfill | config.ts, server.ts, backfill-customers.ts |
| 2 | Parallel (2) | API Layer | mutations.ts, queries.ts, router.ts, admin.ts |
| 3 | Sequential | UI + Middleware | credits-dialog.tsx, columns.tsx, middleware.ts |

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0024`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
