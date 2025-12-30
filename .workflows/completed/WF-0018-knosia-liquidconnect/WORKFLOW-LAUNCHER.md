# Workflow Launcher: WF-0018 - Knosia LiquidConnect Integration

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0018`

## Quick Resume

```
/workflow:launch WF-0018
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~11,600 tokens):

| File | Purpose | Priority |
|------|---------|----------|
| `.claude/artifacts/2025-12-29-1715-FINAL-knosia-liquidconnect-integration.md` | Complete integration spec | 1 |
| `packages/db/src/schema/knosia.ts` | Current Knosia schema | 2 |
| `packages/liquid-connect/src/index.ts` | LC public exports | 2 |

## Workflow State

- **ID**: WF-0018
- **Name**: Knosia LiquidConnect Integration
- **Status**: approved
- **Current Wave**: 0 (not started)
- **Git Tag**: WF-0018-start (commit: dd58f29)

## Task Summary

| Wave | Type | Tasks | Status |
|------|------|-------|--------|
| 0 | Sequential | Schema migration, transforms, semantic builder | pending |
| 1 | Parallel | Connection testing, UVB integration | pending |
| 2 | Parallel | Vocabulary compile, Query engine | pending |
| 3 | Sequential | Integration validation | pending |

## Key Implementation Details

### Primary Document
Read `.claude/artifacts/2025-12-29-1715-FINAL-knosia-liquidconnect-integration.md` first - contains:
- TurboStarter API patterns (Hono routers, enforceAuth, Zod)
- Full Knosia schema (15 tables)
- Type mappings (knosiaVocabularyItem → DetectedVocabulary)
- Implementation code for all 4 phases
- Import references

### Critical Imports

```typescript
// From LiquidConnect
import {
  PostgresAdapter,
  extractSchema,
  applyHardRules,
  compileVocabulary,
  createQueryEngine,
  compile,
  emit,
} from '@repo/liquid-connect';
```

### Missing Migration

Add to `knosiaWorkspace`:
- `compiledVocabulary: jsonb`
- `vocabularyVersion: integer`

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0018`

The launcher will:
- Load STATUS.yaml for current position
- Read FINAL integration document
- Resume from Wave 0

---

*Generated 2025-12-29T18:15:00Z*
