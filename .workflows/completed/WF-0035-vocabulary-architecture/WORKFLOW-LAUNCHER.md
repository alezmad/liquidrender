# Workflow Launcher: WF-0035 - Vocabulary Architecture

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0035`

## Quick Resume

```
/workflow:launch WF-0035
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~1,144 tokens):
- `.context/CLAUDE.md` - Project context hub

Key reference documents:
- `.artifacts/2026-01-01-vocabulary-implementation-plan.md` - Full implementation plan
- `.artifacts/2026-01-01-knosia-vocabulary-architecture.md` - Architecture vision

## Workflow State

- **ID**: WF-0035
- **Name**: Vocabulary Architecture
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0035-start (commit: 9c8c91f)

## Scope

Implement the vocabulary architecture from the implementation plan:

1. **Schema Updates** - Add `suggestedForRoles` field, create `knosiaUserVocabularyPrefs` table
2. **Core API** - Resolution algorithm, extended schemas/queries/mutations/router
3. **User Preferences** - Favorites, synonyms, recently used, private vocabulary
4. **Role Suggestions** - Role-based vocabulary suggestions with dismiss capability
5. **Vocabulary Browser UI** - Full vocabulary page at `/dashboard/knosia/vocabulary`

## Wave Structure

| Wave | Type | Tasks |
|------|------|-------|
| 0 | Sequential | T0: Schema updates + migration |
| 1 | Sequential | T1-T5: Core API |
| 2 | Parallel | T6: Preferences, T7: Role suggestions |
| 3 | Parallel | T8: Browser, T9: Hooks, T10: Page |
| 4 | Sequential | T11: TypeCheck validation |

## Key Decisions Made

- Use `jsonb` for flexible arrays (favorites, synonyms, privateVocabulary)
- Resolution algorithm merges org + workspace + private scopes
- Vocabulary browser grouped by scope with expandable sections
- Role suggestions based on `suggestedForRoles` field matching user role archetype

## User Notes

<!-- Add anything important to remember across sessions -->


## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0035`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
