# ⚠️ Personal Development Notes - ASK BEFORE READING

## For AI Agents

**This folder contains the user's personal notes, research, and development aids.**

These files are private context that support the user's development process. They may include:
- Personal research and notes
- Draft ideas not yet incorporated into official docs
- Reference materials from external sources
- Experimental concepts being explored

## Before Reading Any File in This Folder

**Always ask the user first:**
> "I see a file `[filename]` in your personal notes folder. Would you like me to read it for additional context, or should I proceed without it?"

## Why This Matters

- Personal notes may contain incomplete thoughts or outdated information
- Some content may be exploratory and not intended as implementation guidance
- The user may prefer to share specific context verbally rather than having AI read raw notes
- Privacy: these are personal development aids, not public documentation

## Source of Truth

For implementation decisions, always prefer:
1. `CLAUDE.md` (root) - Architecture and patterns
2. `_bmad-output/prd-liquidrender-v1.md` - Product requirements
3. Code-level constraints (TypeScript, Zod schemas)

Files in `.mydocs/` are supplementary context, not authoritative sources.
