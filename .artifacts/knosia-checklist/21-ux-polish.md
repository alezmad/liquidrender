# UX Polish

**Section:** 21 of 32
**Items:** ~35
**Status:** [x] Verified

---

## Loading States

- [ ] Skeleton loaders for Thread list <!-- KNOSIA:TODO priority=2 category=ux -->
- [ ] Skeleton loaders for Canvas list <!-- KNOSIA:TODO priority=2 category=ux -->
- [ ] Skeleton loaders for Brief sections <!-- KNOSIA:TODO priority=2 category=ux -->
- [ ] Skeleton loaders for data blocks <!-- KNOSIA:TODO priority=2 category=ux -->
- [x] Spinner for actions (save, delete, etc.) <!-- KNOSIA:DONE -->
- [ ] Progress indicator for long operations <!-- KNOSIA:TODO priority=3 category=ux -->

## Empty States

- [x] No threads empty state with CTA <!-- KNOSIA:DONE -->
- [x] No canvases empty state with CTA <!-- KNOSIA:DONE -->
- [ ] No connections empty state <!-- KNOSIA:TODO priority=2 category=ux -->
- [ ] No vocabulary items empty state <!-- KNOSIA:TODO priority=3 category=ux -->
- [ ] No notifications empty state <!-- KNOSIA:TODO priority=3 category=ux -->
- [ ] No activity empty state <!-- KNOSIA:TODO priority=3 category=ux -->
- [ ] No search results state <!-- KNOSIA:TODO priority=3 category=ux -->

## Error States

- [x] Error boundary at app level <!-- KNOSIA:DONE -->
- [ ] Error boundary per major section <!-- KNOSIA:TODO priority=2 category=ux -->
- [x] 404 page for not found routes <!-- KNOSIA:DONE -->
- [x] 500 page for server errors <!-- KNOSIA:DONE -->
- [ ] Network error handling (offline/timeout) <!-- KNOSIA:TODO priority=2 category=ux -->
- [x] API error messages displayed to user <!-- KNOSIA:DONE -->
- [x] Retry button for failed requests <!-- KNOSIA:DONE -->

## Form Validation

- [x] Client-side validation feedback <!-- KNOSIA:PARTIAL notes="Present in some forms via react-hook-form/zod, not all Knosia forms" -->
- [x] Server-side validation errors displayed <!-- KNOSIA:PARTIAL notes="Basic toast error messages, no field-level server errors" -->
- [ ] Required field indicators <!-- KNOSIA:TODO priority=3 category=ux -->
- [ ] Character limits shown <!-- KNOSIA:TODO priority=3 category=ux -->
- [ ] Unsaved changes warning on navigation <!-- KNOSIA:TODO priority=2 category=ux -->

---

## Canvas Editor UX

### Undo/Redo

- [ ] Undo last action (Cmd+Z) <!-- KNOSIA:TODO priority=2 category=canvas -->
- [ ] Redo last action (Cmd+Shift+Z) <!-- KNOSIA:TODO priority=2 category=canvas -->
- [ ] History stack for canvas edits <!-- KNOSIA:TODO priority=2 category=canvas -->

### Autosave

- [ ] Autosave canvas changes (debounced) <!-- KNOSIA:TODO priority=1 category=canvas -->
- [x] "Saving..." indicator <!-- KNOSIA:PARTIAL notes="Present in alert modal, not in main canvas editor" -->
- [ ] "All changes saved" indicator <!-- KNOSIA:TODO priority=2 category=canvas -->
- [ ] Conflict detection if edited elsewhere <!-- KNOSIA:TODO priority=3 category=canvas -->

### Keyboard Shortcuts

- [ ] Delete selected block (Backspace/Delete) <!-- KNOSIA:TODO priority=2 category=canvas -->
- [ ] Duplicate block (Cmd+D) <!-- KNOSIA:TODO priority=3 category=canvas -->
- [ ] Select all blocks (Cmd+A) <!-- KNOSIA:TODO priority=3 category=canvas -->
- [ ] Escape to deselect <!-- KNOSIA:TODO priority=2 category=canvas -->
- [ ] Arrow keys to nudge position <!-- KNOSIA:TODO priority=3 category=canvas -->

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 10 |
| TODO | 24 |
| PARTIAL | 3 |

**Verified by:** Claude Agent
**Date:** 2026-01-01
**Notes:**
- Skeleton loaders not implemented for Knosia components (using spinners instead)
- Basic empty states exist for threads/canvases sidebars
- App-level error boundary with Sentry integration exists
- Canvas editor lacks undo/redo, keyboard shortcuts, and autosave
- Form validation partial - uses react-hook-form but inconsistently
