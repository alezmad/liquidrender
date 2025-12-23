# CLAUDE.md

Universal AI agent rules for this repository.

> **After reading this file:** Read `.context/CLAUDE.md` for full project context.

## Context Location

All project context lives in `.context/` and `_bmad-output/`:

```
.context/
├── CLAUDE.md                          ← Context hub (read this next)
├── skills/                            ← Project-specific Agent Skills
└── turbostarter-framework-context/    ← Framework we build ON TOP OF

_bmad-output/                          ← Project decisions (WHAT + HOW)
└── [documents]                        ← PRD, architecture, epics, stories
```

**Both are essential:** BMAD defines the project; framework docs show what's already available.

## Special Folders

### `.context/` - Project Context
**Read freely.** Contains context navigation and framework documentation.

### `_bmad-output/` - BMAD Output (Project Decisions)
**Read freely.** Contains BMAD workflow outputs (PRD, architecture, epics). Defines WHAT to build and HOW for this specific project.

### `.archived/` - Deprecated Files
**DO NOT READ without user permission.** Contains deprecated context files that could divert development intent.

### `.mydocs/` - Personal Development Notes
**ASK before reading.** Contains the user's personal notes and research.

### `.scratch/` - Temporary Experiments
**Safe to use freely.** Sandbox for throwaway code and experiments.

## Conflict Resolution

When instructions conflict:
1. User's explicit instruction (highest)
2. This file (`CLAUDE.md`)
3. `.context/CLAUDE.md`
4. `_bmad-output/` documents
5. Framework docs (lowest)

## Reading Order

When starting a new task:
1. This file (already loaded)
2. `.context/CLAUDE.md` for context hub
3. `_bmad-output/` for PRD/architecture when implementing features

## Documentation Usage

Examples from documentation are illustrative. Adapt them to match existing repository patterns rather than copying verbatim.
