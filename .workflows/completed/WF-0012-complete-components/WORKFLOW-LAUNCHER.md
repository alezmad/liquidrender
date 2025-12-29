# Workflow Launcher: WF-0012 - LiquidRender Complete Components

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0012`

## Quick Resume

```
/workflow:launch WF-0012
```

## Context Summary

Files from CONTEXT-LIBRARY.yaml (~6,871 tokens):
- `packages/liquid-render/docs/COMPONENT-GUIDE.md` - Component authoring standards (~1,800 tokens)
- `packages/liquid-render/src/renderer/components/utils.ts` - Design tokens (~2,000 tokens)
- `packages/liquid-render/src/compiler/constants.ts` - Type codes (~1,200 tokens)
- `.context/CLAUDE.md` - Project context hub (~1,144 tokens)
- `CLAUDE.md` - Root instructions (~727 tokens)

## Workflow State

- **ID**: WF-0012
- **Name**: LiquidRender Complete Components
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0012-start (commit: 4a8d535)

## Task Summary

| Wave | Type | Components | Status |
|------|------|------------|--------|
| 0 | Sequential | Bootstrap (constants) | Pending |
| 1 | Parallel (8) | Ca, Sp, Cr, Ot, Al, To, Sv, Co | Pending |
| 2 | Parallel (6) | Dg, Dn, Cx, Cm, Pn, Hc | Pending |
| 3 | Parallel (5) | Up, Cl, Tm, Rt, Ep | Pending |
| 4 | Parallel (2) | Ld, Lr | Pending |
| 5 | Parallel (3) | Gn, Sc, Sl | Pending |
| 6 | Parallel (4) | Vd, Au, Lb, Ti | Pending |
| 7 | Parallel (3) | Hm, Sn, Tr | Pending |
| 8 | Parallel (4) | Kb, Or, Mp, Fl | Pending |
| 9 | Sequential | Integration | Pending |

**Total**: 36 components

## Key Decisions Made

- Using `typecheck` per-wave (lighter than full build)
- Full `build` only in final wave
- New type codes: Al, Dg, Ld, Lr, To, Sv, Co, Dn, Cx, Cm, Pn, Hc, Ep, Sc
- P4 components (Map, Flow, Org, Sankey) will be stubs/placeholders

## Per-Component Flow

1. Fetch shadcn source: `mcp__shadcn-ui__get_component`
2. Fetch demo: `mcp__shadcn-ui__get_component_demo`
3. Read COMPONENT-GUIDE.md for standards
4. Create component with design tokens from utils.ts
5. Include `data-liquid-type` attribute
6. Export both dynamic and static variants
7. Register in liquidComponents map

## Validation

- Per-wave: `pnpm --filter @repo/liquid-render typecheck`
- Final: `pnpm --filter @repo/liquid-render build`

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0012`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
