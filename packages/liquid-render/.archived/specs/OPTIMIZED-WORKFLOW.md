# LiquidCode Production Workflow v2

## Lessons Applied
- **File ownership**: Each agent owns exclusive files to prevent merge conflicts
- **Interface-first**: Define APIs before parallel implementation
- **Atomic checkpoints**: Test after each phase, not just at end
- **Critical path first**: Streaming parser is the differentiator

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE A: STREAMING PARSER                        │
│                    (Critical Path - Sequential)                     │
│  Owner: streaming-parser.ts (NEW FILE)                              │
│  Depends: ui-scanner.ts, ui-parser.ts (READ ONLY)                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE B: ERROR RESILIENCE                        │
│                    (Parallel - File Owned)                          │
├─────────────────────────────────────────────────────────────────────┤
│  B1: Scanner Recovery    │ B2: Parser Recovery   │ B3: Diagnostics  │
│  ui-scanner.ts           │ ui-parser.ts          │ diagnostics.ts   │
│  (EXCLUSIVE)             │ (EXCLUSIVE)           │ (NEW FILE)       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE C: LLM ALIGNMENT                           │
│                    (Parallel - No Code Changes)                     │
├─────────────────────────────────────────────────────────────────────┤
│  C1: Prompt Templates    │ C2: Training Examples                    │
│  docs/prompts/           │ test-data/training/                      │
│  (NEW DOCS)              │ (NEW DATA)                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE D: FORMALIZATION                           │
│                    (Sequential - Depends on All)                    │
├─────────────────────────────────────────────────────────────────────┤
│  D1: EBNF Grammar        │ D2: Conformance Suite                    │
│  specs/grammar.ebnf      │ tests/conformance/                       │
└─────────────────────────────────────────────────────────────────────┘

```

---

## Phase A: Streaming Parser

**Priority**: P0 (Critical Path)
**Owner**: `src/compiler/streaming-parser.ts` (NEW)
**Mode**: Sequential (foundational)

### Interface Contract
```typescript
interface StreamingParser {
  // Feed chunk of LiquidCode, get partial result
  feed(chunk: string): StreamingResult;

  // Finalize parsing, get final result
  finalize(): ParseResult;

  // Get best-effort renderable at any point
  getBestEffort(): LiquidSchema;

  // Reset state for new input
  reset(): void;
}

interface StreamingResult {
  schema: LiquidSchema;        // Current best parse
  complete: boolean;           // Is input complete?
  pendingTokens: string;       // Buffered incomplete tokens
  errors: LiquidCodeError[];   // Errors so far
  checkpoint: number;          // Safe resume position
}
```

### Implementation Tasks
1. Create `StreamingParser` class wrapping UIScanner + UIParser
2. Implement token buffering for chunk boundaries
3. Implement partial validity (incomplete tokens OK)
4. Implement checkpointing for progressive render
5. Add streaming-specific tests

### Success Criteria
- [ ] Can parse `Kp :rev` as valid partial KPI
- [ ] Can buffer incomplete string `"Hello` across chunks
- [ ] Progressive updates as tokens complete
- [ ] <10ms per chunk for typical input

---

## Phase B: Error Resilience

**Priority**: P0
**Mode**: Parallel (file-owned)

### B1: Scanner Recovery
**Owner**: `ui-scanner.ts` (EXCLUSIVE)
- Collect errors instead of throwing
- Continue scanning after malformed tokens
- Return `{ tokens, errors }` (already done)
- Add recovery for unterminated strings
- Add recovery for invalid escape sequences

### B2: Parser Recovery
**Owner**: `ui-parser.ts` (EXCLUSIVE)
- Synchronize at safe points: `,`, `]`, newline
- Return partial AST with error markers
- Mark incomplete blocks for UI placeholder
- Implement lenient mode flag

### B3: Diagnostics
**Owner**: `src/compiler/diagnostics.ts` (NEW)
- Format error messages with context
- Show source line with pointer
- Suggest fixes for common errors
- Sanitize control characters in output

---

## Phase C: LLM Alignment

**Priority**: P1
**Mode**: Parallel (no code conflicts)

### C1: Prompt Templates
**Owner**: `docs/prompts/` (NEW)
- Minimal prompt (~200 tokens)
- Standard prompt (~500 tokens)
- Comprehensive prompt (~1000 tokens)
- Include grammar reference
- Include examples at each complexity level

### C2: Training Examples
**Owner**: `test-data/training/` (NEW)
- Generate 1000+ synthetic examples
- Cover all component types
- Cover all modifier combinations
- Include error→correction pairs
- Format for potential fine-tuning

---

## Phase D: Formalization

**Priority**: P1
**Mode**: Sequential (depends on B, C)

### D1: EBNF Grammar
**Owner**: `specs/grammar.ebnf` (NEW)
- Complete formal grammar
- Machine-readable format
- Validated unambiguous

### D2: Conformance Suite
**Owner**: `tests/conformance/` (NEW)
- 200+ golden tests
- Edge cases per construct
- Error case coverage
- Performance benchmarks

---

## Execution Plan

### Checkpoint 0: Pre-flight
```bash
pnpm test  # Must pass before starting
```

### Wave 1: Phase A (Sequential, Critical)
```
Agent A: streaming-parser.ts
├── Create StreamingParser class
├── Implement feed() with buffering
├── Implement getBestEffort()
├── Add streaming tests
└── Checkpoint: streaming tests pass
```

### Wave 2: Phase B (Parallel)
```
Agent B1: Scanner recovery (ui-scanner.ts)
Agent B2: Parser recovery (ui-parser.ts)
Agent B3: Diagnostics (diagnostics.ts)
└── Checkpoint: error tests pass
```

### Wave 3: Phase C (Parallel, Background)
```
Agent C1: Prompt templates (docs)
Agent C2: Training examples (data)
└── Checkpoint: files created, examples valid
```

### Wave 4: Phase D (Sequential)
```
Agent D: Grammar + Conformance
├── Write EBNF grammar
├── Create conformance tests
└── Checkpoint: conformance 100%
```

### Final Checkpoint
```bash
pnpm test                    # All tests pass
pnpm build                   # Builds clean
# Verify streaming demo works
```

---

## File Ownership Matrix

| File | Phase A | B1 | B2 | B3 | C1 | C2 | D |
|------|---------|----|----|----|----|----|----|
| streaming-parser.ts | OWNER | - | - | - | - | - | - |
| ui-scanner.ts | READ | OWNER | - | - | - | - | - |
| ui-parser.ts | READ | - | OWNER | - | - | - | - |
| diagnostics.ts | - | - | - | OWNER | - | - | - |
| docs/prompts/ | - | - | - | - | OWNER | - | - |
| test-data/training/ | - | - | - | - | - | OWNER | - |
| specs/grammar.ebnf | - | - | - | - | - | - | OWNER |
| tests/conformance/ | - | - | - | - | - | - | OWNER |

---

## Success Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| Streaming chunk latency | <10ms | Benchmark test |
| Error recovery rate | >90% partial render | Error test suite |
| Prompt template quality | <2% syntax errors | LLM test |
| Conformance coverage | 200+ tests | Test count |
| All tests passing | 100% | `pnpm test` |

---

## Retry Strategy

If agent fails:
1. Check test output for specific failure
2. Read relevant source file
3. Apply targeted fix
4. Re-run checkpoint tests
5. Max 3 retries before escalation
