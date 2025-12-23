# ⚠️ ARCHIVED FILES - DO NOT USE WITHOUT CONFIRMATION

## Critical Warning for AI Agents

**This folder contains DEPRECATED context files.**

Reading these files without explicit user permission can:
- Divert development intent from the current source of truth
- Introduce conflicting requirements or outdated specifications
- Cause implementation decisions based on superseded designs

## Before Reading Any File in This Folder

1. **ASK THE USER FIRST**: "I see there's an archived file `[filename]`. This is marked as deprecated. Should I read it, or should I use the current source of truth instead?"

2. **Current Source of Truth**: Always prefer files in `_bmad-output/` over anything in `.archived/`

3. **Why These Were Archived**: These files represent earlier iterations, alternative approaches, or GPT-generated drafts that have been superseded by the canonical documents.

## Archived Files

| File | Original Location | Reason Archived | Replaced By |
|------|-------------------|-----------------|-------------|
| `DEPRECATED-ASK-BEFORE-READING-prd.md` | `_bmad-output/prd.md` | Original BMAD workflow output, superseded by corrected version | `_bmad-output/prd-liquidrender-v1.md` |
| `DEPRECATED-ASK-BEFORE-READING-prd-liquidrender-v1-trust.md` | `.mydocs/prd-liquidrender-v1-trust.md` | GPT-generated trust layer draft, merged into main PRD | `_bmad-output/prd-liquidrender-v1.md` |

## If You Need Historical Context

If you genuinely need to understand why something changed or compare versions, ask the user:
> "Would you like me to compare the archived version with the current PRD to understand what changed?"

**DO NOT silently read archived files and incorporate their content into recommendations.**
