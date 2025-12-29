# Workflow Launcher: WF-0017 - Query Engine

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0017`

## Quick Resume

```
/workflow:launch WF-0017
```

## Context Summary

Key artifacts (~15k tokens total):
- `.claude/artifacts/2025-12-29-query-engine-implementation-plan.md` - Full implementation plan
- `.claude/artifacts/2025-12-29-query-engine-vocabulary-bridge.md` - Vocabulary integration spec

Key source files:
- `packages/liquid-connect/src/uvb/models.ts` - DetectedVocabulary type
- `packages/liquid-connect/src/index.ts` - Main exports

## Workflow State

- **ID**: WF-0017
- **Name**: Query Engine
- **Status**: approved
- **Current Wave**: 0 (pending start)
- **Git Tag**: WF-0017-start (commit: 55b2d06)

## Key Decisions Made

1. **LLM fallback deferred** - Pattern matching first, add LLM later
2. **Use existing compiler** - `parseToAST()` validates LC syntax
3. **3-level synonyms** - Resolution order: user → org → global
4. **Dynamic patterns** - Generated from vocabulary, not static

## Architecture

```
packages/liquid-connect/src/
├── vocabulary/        NEW
│   ├── types.ts       CompiledVocabulary, Pattern, SlotEntry
│   ├── patterns.ts    Default patterns + time slots
│   ├── synonyms.ts    Global synonyms
│   ├── compiler.ts    DetectedVocabulary → CompiledVocabulary
│   └── index.ts       Exports
│
└── query/             NEW
    ├── types.ts       QueryContext, QueryResult, QueryTrace
    ├── normalizer.ts  Text normalization + synonym resolution
    ├── matcher.ts     Pattern matching + slot filling
    ├── engine.ts      Main orchestrator
    └── index.ts       Exports
```

## Waves

| Wave | Type | Tasks | Status |
|------|------|-------|--------|
| 0 | Sequential | Bootstrap (types + barrels) | pending |
| 1 | Parallel | patterns.ts, synonyms.ts | pending |
| 2 | Parallel | normalizer.ts, matcher.ts | pending |
| 3 | Sequential | compiler.ts, engine.ts, index.ts | pending |

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0017`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
