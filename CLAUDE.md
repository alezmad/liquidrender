# CLAUDE.md

Universal AI agent rules for this repository.

> **After reading this file:** Read `.cognitive/SUMMARY.md` then `.cognitive/capabilities.yaml`.

## Context Location

**Cognitive Context** (read first):
```
.cognitive/
├── SUMMARY.md              ← Identity & orientation (~300 tokens) - READ FIRST
├── capabilities.yaml       ← What exists - CHECK BEFORE BUILDING ANYTHING
├── rules.yaml              ← Project conventions
├── knowledge.json          ← Entity map (303 entities)
└── cache/answers/          ← Cached wisdom files
```

**Project Context**:
```
.context/
├── CLAUDE.md               ← Context hub
└── turbostarter-framework-context/  ← Framework docs

_bmad-output/               ← Project decisions (PRD, architecture)
```

**Hierarchy:** `.cognitive/` for cognitive reload → `.context/` for project → `_bmad-output/` for decisions.

## LiquidCode Components

When creating or modifying LiquidCode renderer components:

**Read first:** `.cognitive/cache/answers/how-to-create-component.md` (crystallized patterns)

**Deep reference:** `packages/liquid-render/docs/COMPONENT-GUIDE.md`

Key requirements:
- Use design tokens from `utils.ts` (never hardcode colors, spacing, etc.)
- Follow file structure: Types → Styles → Helpers → Sub-components → Main → Static
- Include `data-liquid-type` attribute on root element
- Handle empty/null states gracefully
- Provide both dynamic (`ComponentName`) and static (`StaticComponent`) variants
- Use `formatDisplayValue()` and `fieldToLabel()` for consistent display

Reference files:
- `packages/liquid-render/src/renderer/components/utils.ts` - Design tokens & utilities
- `packages/liquid-render/specs/LIQUID-RENDER-SPEC.md` - DSL specification

## Special Folders

### `.cognitive/` - Cognitive Context
**Read freely. Read FIRST.** Contains SUMMARY.md, capabilities.yaml, cached wisdom.

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
2. `.cognitive/SUMMARY.md` for cognitive reload
3. `.cognitive/capabilities.yaml` before building anything
4. Check `.cognitive/cache/answers/` for cached wisdom
5. `.context/CLAUDE.md` for project context
6. `_bmad-output/` for PRD/architecture when implementing features

## Documentation Usage

Examples from documentation are illustrative. Adapt them to match existing repository patterns rather than copying verbatim.
