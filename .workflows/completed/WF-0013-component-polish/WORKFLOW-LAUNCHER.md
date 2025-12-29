# Workflow Launcher: WF-0013 - Component Polish Sprint

> Copy this entire file content and paste into a fresh Claude Code session,
> or run: `/workflow:launch WF-0013`

## Quick Resume

```
/workflow:launch WF-0013
```

## Context Summary

Files needed (~6,000 tokens):
- `packages/liquid-render/docs/COMPONENT-GUIDE.md` - Design tokens, patterns
- `packages/liquid-render/src/renderer/components/utils.ts` - Shared utilities
- `.workflows/active/WF-0012-complete-components/AUDIT-REPORT.md` - Audit findings

## Workflow State

- **ID**: WF-0013
- **Name**: Component Polish Sprint
- **Status**: approved
- **Current Wave**: 0
- **Git Tag**: WF-0013-start (commit: 3f1a17a)

## Goal

Elevate component library from **B+** to **A-** production-ready by:
1. Refactoring Toast into a proper toast manager (C+ → A-)
2. Adding keyboard navigation to Calendar, Split
3. Adding touch/swipe to Carousel
4. Fixing AlertDialog portal and focus trap
5. Enhancing Dropdown with submenus
6. Adding fuzzy search to Command
7. Fixing accessibility issues in HoverCard, Color, Lightbox

## Key Decisions Made

- Using native HTML5 APIs (no external gesture libraries)
- Creating shared focus-trap utility for reuse
- Parallel execution waves for speed
- Priority 1-3 fixes only (Priority 4 as time permits)

## Task Summary

| Wave | Tasks | Status |
|------|-------|--------|
| 0 | Focus trap utility | pending |
| 1 | Toast, AlertDialog, Collapsible | pending |
| 2 | Carousel, Calendar, Split | pending |
| 3 | Dropdown, Command, OTP | pending |
| 4 | HoverCard, Color, Lightbox | pending |
| 5 | Build validation | pending |

## Launch Instructions

1. Paste this file into a fresh Claude Code session, OR
2. Run: `/workflow:launch WF-0013`

The launcher will:
- Load context files listed above
- Read STATUS.yaml for current position
- Resume from the current wave
