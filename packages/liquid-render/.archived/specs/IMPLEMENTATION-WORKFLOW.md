# LiquidCode Production Implementation Workflow

## Execution Strategy

```
Phase 1 ──────────────────────────────────────────────────────────────
   │
   ├── Agent 1A: Implicit Container ─────┐
   ├── Agent 1B: Whitespace-Optional ────┼── Parallel (independent)
   └── Agent 1C: Short Color Aliases ────┘
                                         │
                                    Checkpoint 1
                                         │
Phase 2 ──────────────────────────────────────────────────────────────
   │
   ├── Agent 2A: Error Recovery ─────────┐
   ├── Agent 2B: Resource Limits ────────┼── Parallel (independent)
   └── Agent 2C: Input Validation ───────┘
                                         │
                                    Checkpoint 2
                                         │
Phase 3 ──────────────────────────────────────────────────────────────
   │
   └── Agent 3: Streaming Parser ────────── Sequential (depends on P2)
                                         │
                                    Checkpoint 3
                                         │
Phase 4 ──────────────────────────────────────────────────────────────
   │
   ├── Agent 4A: Syntax Tests ───────────┐
   ├── Agent 4B: Robustness Tests ───────┼── Parallel (independent)
   └── Agent 4C: Streaming Tests ────────┘
                                         │
                                    Checkpoint 4
                                         │
Phase 5 ──────────────────────────────────────────────────────────────
   │
   └── Validation: Run full test suite
   └── Benchmark: Token efficiency
```

## Checkpoint Protocol

After each phase:
1. Run `pnpm test` to verify no regressions
2. Record pass/fail status
3. If failed: retry with fix agent
4. If passed: proceed to next phase

## Task Specifications

### Phase 1A: Implicit Container
- File: `ui-parser.ts`
- Change: Treat `[...]` as implicit container when no type precedes
- Test: `[Kp :a]` should equal `0 [Kp :a]`

### Phase 1B: Whitespace-Optional Modifiers
- File: `ui-scanner.ts`
- Change: Allow modifiers without whitespace separation
- Test: `Kp:revenue#green` should parse correctly

### Phase 1C: Short Color Aliases
- File: `ui-parser.ts` + `constants.ts`
- Change: Map `#r`→red, `#g`→green, etc.
- Test: `Kp #g` should emit `#green` schema

### Phase 2A: Error Recovery
- File: `ui-scanner.ts`, `ui-parser.ts`
- Change: Collect errors, continue parsing
- Test: Malformed input returns partial AST + errors

### Phase 2B: Resource Limits
- File: `ui-scanner.ts`, `ui-parser.ts`
- Change: Add MAX_* constants, check during parse
- Test: Exceeding limits throws specific error

### Phase 2C: Input Validation
- File: `ui-scanner.ts`
- Change: Normalize line endings, validate UTF-8
- Test: Various encodings handled correctly

### Phase 3: Streaming Parser
- File: New `ui-streaming-parser.ts`
- Change: Incremental feed/finalize API
- Test: Chunked input produces correct output

### Phase 4: Test Suite
- File: `tests/compiler.test.ts`
- Change: Add 50+ new test cases
- Test: All pass
