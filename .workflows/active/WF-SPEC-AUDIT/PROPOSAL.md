# Workflow Proposal: WF-SPEC-AUDIT - Compiler vs Spec Consistency Audit

## Overview
- **Tasks**: 6 audit tasks
- **Waves**: 2 parallel execution groups
- **Output**: 1 comprehensive audit report
- **Dependencies to install**: none

## Execution Plan

| Wave | Type | Tasks | Output |
|------|------|-------|--------|
| 0 | Sequential | Extract spec checklist | SPEC-CHECKLIST.md |
| 1 | Parallel (4) | Audit constants, parser, emitter, scanner | 4 audit files |
| 2 | Sequential | Cross-reference & compile report | AUDIT-REPORT.md |

## Task Details

| ID | Name | Focus Area | Files | Complexity |
|----|------|------------|-------|------------|
| T0 | Spec Extraction | Extract all DSL features from spec | LIQUID-RENDER-SPEC.md | S |
| T1 | Constants Audit | Check type codes, modifiers, colors | constants.ts | M |
| T2 | Parser Audit | Check token handling, modifiers, bindings | ui-parser.ts, ui-scanner.ts | L |
| T3 | Emitter Audit | Check schema output, DSL roundtrip | ui-emitter.ts | M |
| T4 | Scanner Audit | Check token patterns match spec | ui-scanner.ts | S |
| T5 | Report Generation | Cross-reference all findings | All audit outputs | M |

## Preliminary Findings (Quick Scan)

Based on my initial read, here are potential issues to investigate:

### Constants (constants.ts)

| Spec Feature | In constants.ts? | Status |
|--------------|------------------|--------|
| Core types (0-9) | Yes | OK |
| Extended types (Gd, Sk, etc.) | Yes | OK |
| Color aliases (r, g, b, etc.) | Yes | OK |
| Priority values (h, p, s) | Yes | OK |
| Flex values (f, s, g, c, row, col) | Yes | OK |
| Span values (f, h, t, q, 1-9) | Yes | OK |
| Stream modifiers (~) | Not in constants | **Parser handles inline** |
| Fidelity modifiers ($) | Not in constants | **Parser handles inline** |

### Parser (ui-parser.ts)

| Spec Feature | Implemented? | Notes |
|--------------|--------------|-------|
| Signal declare (@) | Yes | Line 123 |
| Signal emit (>) | Yes | Line 377 |
| Signal receive (<) | Yes | Line 398 |
| Signal bidirectional (<>) | Yes | Line 409 |
| Color modifiers (#) | Yes | Line 420, expands aliases |
| Streaming (~) | Yes | Line 459-486 |
| Fidelity ($) | Yes | Line 488-500 |
| Range params (Rg min max step) | Yes | Line 218, 522-556 |
| Conditional (?@signal=val) | Yes | Line 145, 245-269 |
| Layer triggers (>/1) | Yes | Line 385 |
| Layer close (/<) | Yes | Line 502 |
| Custom components | Yes | Line 205-208 |
| Table columns [: :] | Yes | Line 224, 597-626 |

### Emitter (ui-emitter.ts)

| Spec Feature | Implemented? | Notes |
|--------------|--------------|-------|
| LiquidSchema output | Yes | Full interface defined |
| Repetition shorthand | Yes | Line 206-266 (Kp :a :b -> 3 KPIs) |
| Chart x/y binding | Yes | Line 280-287 |
| Auto-labels | Yes | fieldToLabel() Line 684-700 |
| Roundtrip (Schema->AST) | Yes | liquidSchemaToAST() Line 722 |
| Stream config | Yes | StreamConfig interface |
| Fidelity levels | Yes | FidelityLevel type |

### Potential Gaps to Investigate

1. **§1 Grammar - Program := Signal* Statement+**
   - Are we handling multiple signals on one line? (`@tab @filter`)

2. **§4.1 Layout - Flex values**
   - Spec says `^row` and `^column` - do we handle full words?
   - Constants has `row: 'row', col: 'column'` but parser may expect single char

3. **§4.3 Style - Size values**
   - Spec mentions `%lg`, `%sm` - what size tokens exist?

4. **§5 Layers**
   - Layer close `/<` vs `>/0` - are both supported?

5. **§12 Shared Type Codes**
   - Tx, Rt, Dt, Sl, Cl, Au, Vd are shared between UI and Survey
   - Context detection needs verification

---

## Dependency Graph

```
     ┌──────────────────────────────────────────────────┐
     │            T0: Spec Extraction                    │
     │        (Extract all features to checklist)        │
     └──────────────────┬───────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │   T1    │    │   T2    │    │   T3    │
   │Constants│    │ Parser  │    │ Emitter │
   └────┬────┘    └────┬────┘    └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       ▼
              ┌────────────────┐
              │      T5       │
              │ Final Report  │
              └────────────────┘
```

---

**Approve?** Reply:
- "approved" to start full audit
- "quick" for a summary-only report (no parallel agents)
- Describe changes to modify scope
- "cancel" to abort
