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

## V1 Validation Integration (2026-01-17)

### ✅ Execution + Value Validation Added

Integrated V1's `validateKPIValues()` into V2 test pipeline to add missing validation layers:

**Changes Made:**
1. Exported `validateKPIValues()` and `KPIExecutionResult` from V1 (`kpi-generation.ts`)
2. Created V2→V1 adapter functions in test script:
   - `extractSourceTables()` - Extract tables from KPI semantic definitions
   - `convertV2ToV1Recipe()` - Convert V2 KPIResult to V1 CalculatedMetricRecipe
3. Added Step 6 to test script: Execute queries + LLM value validation

**Critical Discovery**: V2's "100% success" only meant schema + compilation validation. Full validation reveals:

### Northwind Full Validation Results

| Validation Layer | Pass Rate | Notes |
|------------------|-----------|-------|
| **Schema (Zod)** | 15/15 (100%) | ✅ All well-formed |
| **Compilation (SQL)** | 15/15 (100%) | ✅ All compile |
| **Execution (DB)** | 9/15 (60%) | ❌ 6 runtime errors |
| **Business Value (LLM)** | 6/15 (40%) | ⚠️ 3 suspicious values |

**Execution Errors (6 KPIs):**
1. **COUNT_DISTINCT Syntax** (3 KPIs) - Generated `COUNT_DISTINCT(x)` instead of `COUNT(DISTINCT x)`
2. **Table Alias Issues** (3 KPIs) - Composite KPIs reference undefined aliases like `od.unit_price`

**Suspicious Values (3 KPIs):**
1. Average Items Per Order: 23.8 (actually valid for B2B Northwind, but flagged)
2. Monthly Revenue Trend: $1.35M (identical to total revenue - missing time grouping)
3. On-Time Delivery Rate: 100% (unrealistically perfect)

**Action Items:**
1. Fix COUNT_DISTINCT generation in simple-prompt.ts
2. Fix composite KPI table aliasing in composite-prompt.ts
3. Add time grouping for trend KPIs
4. Re-test to achieve true 100% execution success

## Phase 1: Quality Improvements (COMPLETE - 2026-01-17)

### ✅ Wave 1: Parallel Fixes

**SQL Generation Fixes** (`kpi-generation.ts`):
- Added `aggregationToSQL()` - Converts COUNT_DISTINCT → COUNT(DISTINCT x)
- Added composite JOIN construction - Proper FROM/JOIN/ON clauses
- **Impact**: 83% reduction in execution errors (6 → 1 per database)

**Value Validation Enhancement** (`value-validation.ts` v1.3.0):
- Context-aware bounds for B2B vs B2C
- Business pattern recognition (10-100 items/order normal for B2B)
- Time-series KPI detection (flag if Monthly = Total)
- **Impact**: 36% value quality improvement (40% → 76%)

### ✅ Wave 2: Testing Results

| Database | Type | Execution Success | Value Quality |
|----------|------|-------------------|---------------|
| Northwind | B2B | 15/15 (100%) | 13/15 (87%) |
| Pagila | Subscription | 15/15 (100%) | 11/15 (73%) |
| Chinook | E-commerce | 14/15 (93%) | 10/15 (67%) |
| **Average** | **Mixed** | **98%** ✅ | **76%** |

**Overall Quality**: 74% (KPIs that execute correctly AND make business sense)

**Remaining Issues**:
- 1 execution error (Chinook)
- Time-series KPIs need GROUP BY (8 KPIs across databases)
- Grain mismatches (2-3 KPIs)
- Percentage calculation errors (2-3 KPIs)

**Full Report**: `.artifacts/2026-01-17-phase-1-quality-improvements.md`

---

## Next Steps (Phase 2: Quality → 85%)

### Wave 3 (Parallel, 4-6 hours):
1. **Add time-series pattern detection** - Detect date columns, add GROUP BY logic
2. **Improve grain awareness** - Teach prompts about entity granularity
3. **Add semantic validation** - Detect grain mismatches, percentage errors

### Wave 4 (Sequential, 1 hour):
4. **Test Phase 2** - Verify 85%+ quality on all 3 databases
5. **Document Phase 2** - Update artifacts with results

**Target**: 85%+ value quality, 100% execution success

---

## Phase 3 Roadmap (Production Ready → 95%)

### Wave 5:
- Move execution validation into V2 VALIDATE phase
- Add optional database adapter parameter

### Wave 6 (Parallel):
- Add value repair strategies to REPAIR phase
- Build production feedback loop and metrics dashboard

**Target**: 95%+ quality, production-ready deployment
