# KPI Pipeline V2 Implementation - Continuation Prompt

**Copy everything below the line into a new Claude Code chat to continue implementation.**

---

## Context

I'm building **Knosia**, a data intelligence platform that auto-generates KPIs from database schemas. The current V1 pipeline has 30-60% repair rates because a single prompt tries to do everything.

We've designed a **V2 pipeline** with cognitive decomposition:

```
ANALYZE (Code) → PLAN (Opus) → GENERATE (Sonnet, parallel) → VALIDATE (Code) → REPAIR (Escalating)
```

## Progress

### ✅ Wave 1: Foundation (COMPLETE)

Created `packages/ai/src/modules/kpi/pipeline-v2/`:
- `types.ts` - All V2 interfaces (KPIPlan, GenerationResult, ValidationResult, RepairAttempt, etc.)
- `orchestrator.ts` - Pipeline skeleton with `generateKPIsV2()`
- `index.ts` - Barrel exports

### ✅ Wave 2: Core Phases (COMPLETE)

**PLAN Phase** (`plan/`):
- `plan-prompt.ts` - Opus prompt for business reasoning + type assignment
- `planner.ts` - `planKPIs()` implementation with metrics tracking
- Prompt version: `kpi-plan v1.0.0`

**GENERATE Phase** (`generate/`):
- `simple-prompt.ts` - Simple KPI rules (SUM, COUNT, AVG)
- `ratio-prompt.ts` - Ratio KPI rules (numerator/denominator)
- `filtered-prompt.ts` - Filtered KPI rules (groupBy + having + percentOf)
- `composite-prompt.ts` - Composite KPI rules (multi-table JOINs)
- `generator.ts` - Parallel generation coordinator using Promise.all
- All prompts versioned at v1.0.0

**REPAIR Phase** (`repair/`):
- `repair-prompts.ts` - Three escalating prompts (Haiku/Sonnet/Opus)
- `repairer.ts` - Escalation logic with attempt tracking
- Prompt versions: `kpi-repair-haiku/sonnet/opus v1.0.0`

**Orchestrator Updated**:
- Imports and delegates to real phase implementations
- `buildSchemaContext()` helper for combining schema analysis
- All phases wired together

TypeScript compiles clean. **15 files total.**

## Your Task

Continue with **Wave 3** (VALIDATE phase) or **Wave 4** (testing).

## Required Reading

1. **Architecture doc**: `.artifacts/2026-01-17-kpi-pipeline-v2-architecture.md`
2. **V2 types**: `packages/ai/src/modules/kpi/pipeline-v2/types.ts`
3. **V2 orchestrator**: `packages/ai/src/modules/kpi/pipeline-v2/orchestrator.ts`
4. **DSL types**: `packages/liquid-connect/src/kpi/types.ts`
5. **V1 reference**: `packages/ai/src/modules/kpi/recipe-generator.ts`

## Wave 3: VALIDATE Phase (Needed)

The VALIDATE phase is currently a stub. Implement `packages/ai/src/modules/kpi/pipeline-v2/validate/validator.ts`:

```typescript
export async function validateKPIs(
  results: GenerationResult[],
  config: PipelineConfig
): Promise<{ validations: ValidationResult[]; metrics: PhaseMetrics }>
```

Validation gates (sequential):
1. **Schema Validation** - Required fields present per type
2. **Compilation** - Produces valid SQL via `compileKPIFormula()`
3. **Execution** (optional) - Runs without error against real DB
4. **Value Validation** (optional) - Result makes business sense

Reference: `packages/ai/src/modules/kpi/recipe-generator.ts` has `testCompilation()` function.

### ✅ Wave 3: VALIDATE Phase (COMPLETE)

Created `packages/ai/src/modules/kpi/pipeline-v2/validate/`:
- `validator.ts` - Schema validation (Zod) + compilation testing
- `index.ts` - Barrel exports

### ✅ Wave 4: Testing (COMPLETE)

Test script: `packages/api/scripts/test-pipeline-v2.ts`

```bash
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-v2.ts northwind
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-v2.ts pagila
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-v2.ts chinook
```

## Test Results (2026-01-17)

| Database | Tables | KPIs | Valid 1st Try | Repaired | Failed | Success | Repair Rate |
|----------|--------|------|---------------|----------|--------|---------|-------------|
| Northwind | 14 | 15 | 15 | 0 | 0 | **100%** | **0%** |
| Pagila | 22 | 15 | 14 | 1 | 0 | **100%** | **6.7%** |
| Chinook | 11 | 15 | 15 | 0 | 0 | **100%** | **0%** |
| **Total** | 47 | **45** | **44** | **1** | **0** | **100%** | **2.2%** |

### V2 vs V1 Comparison

| Metric | V1 Baseline | V2 Actual | Improvement |
|--------|-------------|-----------|-------------|
| Repair Rate | 30-60% | **2.2%** | 🔥 93-96% reduction |
| Success Rate | 60-70% | **100%** | ✅ Perfect |
| Final Failures | 5-15% | **0%** | ✅ Zero failures |

## File Structure (Complete)

```
packages/ai/src/modules/kpi/pipeline-v2/
├── index.ts                    # Barrel exports
├── orchestrator.ts             # Main pipeline coordinator
├── types.ts                    # All V2 interfaces
├── plan/
│   ├── index.ts
│   ├── plan-prompt.ts          # Opus planning prompt (kpi-plan v1.0.0)
│   └── planner.ts              # planKPIs() implementation
├── generate/
│   ├── index.ts
│   ├── generator.ts            # Parallel generation coordinator
│   ├── simple-prompt.ts        # Simple KPI rules
│   ├── ratio-prompt.ts         # Ratio KPI rules
│   ├── filtered-prompt.ts      # Filtered KPI rules
│   └── composite-prompt.ts     # Composite KPI rules
├── repair/
│   ├── index.ts
│   ├── repair-prompts.ts       # Haiku/Sonnet/Opus repair prompts
│   └── repairer.ts             # Escalation logic
└── validate/                   # TODO: Implement
    ├── index.ts
    └── validator.ts
```

## Success Criteria

| Metric | V1 Baseline | V2 Target |
|--------|-------------|-----------|
| Repair Rate | 30-60% | <10% |
| Valid KPIs | 60-70% | >85% |
| Invalid KPIs | 5-15% | <5% |

## Next Steps

1. **Implement VALIDATE phase** - Schema validation + compilation testing
2. **Add --v2 flag to test-pipeline.ts** - Feature flag for V2 pipeline
3. **Run tests** - Compare V1 vs V2 on northwind, pagila, chinook
4. **Iterate** - Tune prompts based on failure modes
