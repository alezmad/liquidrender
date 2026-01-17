# KPI Pipeline V2: Cognitive Decomposition Architecture

**Status:** Design Complete, Ready for Implementation
**Date:** 2026-01-17
**Predecessor:** `.artifacts/2026-01-17-schema-driven-kpi-coverage.md`

---

## Executive Summary

V1 pipeline uses a single prompt trying to do everything: understand schema, ideate KPIs, assign types, generate DSL, remember all rules. This causes 30-60% repair rates on non-standard schemas.

V2 decomposes cognition into focused phases, using the right model for each task:

```
PLAN (Opus) → GENERATE (Sonnet, parallel) → VALIDATE (Code) → REPAIR (Escalating)
```

**Key insight:** Separate "thinking about what to build" from "building it precisely."

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 0: ANALYZE (Code - No LLM)                                    │
│ packages/ai/src/modules/kpi/schema-intelligence/                    │
│                                                                     │
│ • entity-detector.ts    → Tables, types, relationships              │
│ • pattern-detector.ts   → Deadline comparisons, variance patterns   │
│ • coverage-analyzer.ts  → Required KPIs by entity type              │
│                                                                     │
│ Output: SchemaIntelligence object                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: PLAN (Opus - Single Call)                                  │
│                                                                     │
│ The "Senior Data Analyst" that:                                     │
│ • Deeply understands business context from schema                   │
│ • Makes judgment calls on what KPIs matter                          │
│ • Reasons about calculation approach for each                       │
│ • Assigns DSL type with rationale                                   │
│                                                                     │
│ Input:  SchemaIntelligence + business context                       │
│ Output: KPIPlan[]                                                   │
│                                                                     │
│ interface KPIPlan {                                                 │
│   name: string;                                                     │
│   description: string;                                              │
│   businessValue: string;      // Why this matters                   │
│   type: KPIType;              // simple | ratio | filtered | ...    │
│   typeRationale: string;      // Why this type                      │
│   columns: {                  // Key columns identified             │
│     expression?: string;                                            │
│     numerator?: string;                                             │
│     denominator?: string;                                           │
│     groupBy?: string;                                               │
│     having?: string;                                                │
│     percentOf?: string;                                             │
│   };                                                                │
│   entity: string;                                                   │
│   confidence: number;                                               │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: GENERATE (Sonnet - Parallel by Type)                       │
│                                                                     │
│ Specialized prompts, each knowing ONLY its type's rules:            │
│                                                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │   Simple    │ │    Ratio    │ │  Filtered   │ │  Composite  │    │
│ │   Prompt    │ │   Prompt    │ │   Prompt    │ │   Prompt    │    │
│ │             │ │             │ │             │ │             │    │
│ │ SUM, COUNT  │ │ num/denom   │ │ groupBy +   │ │ JOINs +     │    │
│ │ AVG, MIN    │ │ multiplier  │ │ having +    │ │ multi-table │    │
│ │ MAX only    │ │ filterCond  │ │ percentOf   │ │ aggregation │    │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                                     │
│ Input:  KPIPlan[] filtered by type + type-specific rules            │
│ Output: KPIDefinition[] (DSL)                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: VALIDATE (Code)                                            │
│                                                                     │
│ Sequential validation gates:                                        │
│ 1. Schema Validation  → Required fields present?                    │
│ 2. Compilation        → Produces valid SQL?                         │
│ 3. Execution          → Runs without error?                         │
│ 4. Value Validation   → Result makes business sense?                │
│                                                                     │
│ Output: ValidationResult { valid, errors[], warnings[] }            │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: REPAIR (Escalating Models)                                 │
│                                                                     │
│ For each failed KPI:                                                │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Try 1: Haiku (fast, cheap)                                  │   │
│   │ "Fix this specific error: missing groupBy field"            │   │
│   │ Handles: 90% of failures (syntax, missing fields)           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                        ↓ if fails                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Try 2: Sonnet (more capable)                                │   │
│   │ "Rethink approach, maybe wrong type for this KPI"           │   │
│   │ Handles: 9% of failures (wrong approach)                    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                        ↓ if fails                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Try 3: Opus (deep reasoning)                                │   │
│   │ "This schema is unusual, reason from first principles"      │   │
│   │ Handles: 1% of failures (edge cases)                        │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                        ↓ if fails                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Give up: Flag for review                                    │   │
│   │ Mark as "needs-human-review", continue with others          │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Model Allocation Strategy

| Phase | Model | Rationale | Cost |
|-------|-------|-----------|------|
| ANALYZE | Code | Deterministic, fast | Free |
| PLAN | Opus | Judgment, reasoning, business understanding | $$$ |
| GENERATE | Sonnet | Structured output, rule-following | $$ |
| REPAIR L1 | Haiku | Quick syntax fixes | $ |
| REPAIR L2 | Sonnet | Approach rethinking | $$ |
| REPAIR L3 | Opus | Deep edge case reasoning | $$$ |

**Cost optimization:** Intelligence at the top of funnel prevents expensive repairs downstream.

---

## File Structure

```
packages/ai/src/modules/kpi/
├── schema-intelligence/          # PHASE 0 (exists)
│   ├── entity-detector.ts
│   ├── pattern-detector.ts
│   ├── coverage-analyzer.ts
│   └── index.ts
│
├── pipeline-v2/                  # NEW
│   ├── types.ts                  # KPIPlan, ValidationResult interfaces
│   ├── orchestrator.ts           # Main pipeline coordinator
│   │
│   ├── plan/                     # PHASE 1
│   │   ├── plan-prompt.ts        # Opus planning prompt
│   │   └── planner.ts            # Plan generation logic
│   │
│   ├── generate/                 # PHASE 2
│   │   ├── simple-prompt.ts      # Simple KPI generation
│   │   ├── ratio-prompt.ts       # Ratio KPI generation
│   │   ├── filtered-prompt.ts    # Filtered KPI generation
│   │   ├── composite-prompt.ts   # Composite KPI generation
│   │   └── generator.ts          # Parallel generation coordinator
│   │
│   ├── validate/                 # PHASE 3
│   │   └── validator.ts          # Validation pipeline
│   │
│   └── repair/                   # PHASE 4
│       ├── repair-prompts.ts     # Tiered repair prompts
│       └── repairer.ts           # Escalation logic
│
└── prompts/                      # V1 prompts (keep for comparison)
    ├── schema-first-generation.ts
    └── value-validation.ts
```

---

## Implementation Plan with Claude Code Subtasks

### Overview

Use Claude Code's Task tool to parallelize independent work. Each phase becomes a focused subtask that can run autonomously.

### Wave 1: Foundation (Sequential)

These must be done first as other work depends on them.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Task 1.1: Create types.ts                                           │
│                                                                     │
│ Define interfaces:                                                  │
│ • KPIPlan                                                           │
│ • GenerationResult                                                  │
│ • ValidationResult                                                  │
│ • RepairAttempt                                                     │
│ • PipelineConfig                                                    │
│                                                                     │
│ Estimated: 30 min                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Task 1.2: Create orchestrator.ts skeleton                           │
│                                                                     │
│ Main entry point:                                                   │
│ • generateKPIsV2(connection, options)                               │
│ • Coordinates all phases                                            │
│ • Handles errors and reporting                                      │
│                                                                     │
│ Estimated: 30 min                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Wave 2: Core Phases (Parallel)

These can be built simultaneously by different agents.

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Task 2.1        │ │ Task 2.2        │ │ Task 2.3        │
│ PLAN Phase      │ │ GENERATE Phase  │ │ REPAIR Phase    │
│                 │ │                 │ │                 │
│ • plan-prompt   │ │ • 4 type prompts│ │ • repair-prompts│
│ • planner.ts    │ │ • generator.ts  │ │ • repairer.ts   │
│                 │ │   (parallel)    │ │   (escalation)  │
│                 │ │                 │ │                 │
│ Agent: Explore  │ │ Agent: Explore  │ │ Agent: Explore  │
│ + Write         │ │ + Write         │ │ + Write         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
                    Wave 3 (after merge)
```

### Wave 3: Integration (Sequential)

Wire everything together.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Task 3.1: Integrate phases in orchestrator                          │
│                                                                     │
│ • Wire PLAN → GENERATE → VALIDATE → REPAIR                          │
│ • Add tracing and logging                                           │
│ • Handle edge cases                                                 │
│                                                                     │
│ Estimated: 1 hour                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Task 3.2: Update kpi-generation.ts to use V2                        │
│                                                                     │
│ • Add feature flag: useV2Pipeline                                   │
│ • Maintain V1 for comparison                                        │
│ • Update test-pipeline.ts to support both                           │
│                                                                     │
│ Estimated: 30 min                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Wave 4: Testing (Parallel)

Test against all databases simultaneously.

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Task 4.1        │ │ Task 4.2        │ │ Task 4.3        │
│ Test Northwind  │ │ Test Pagila     │ │ Test Chinook    │
│                 │ │                 │ │                 │
│ Run V2 pipeline │ │ Run V2 pipeline │ │ Run V2 pipeline │
│ Compare to V1   │ │ Compare to V1   │ │ Compare to V1   │
│ Report results  │ │ Report results  │ │ Report results  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
                   Analyze & Iterate
```

---

## Claude Code Task Prompts

### Wave 1.1: Types

```
Create the types file for KPI Pipeline V2.

Read the architecture doc at .artifacts/2026-01-17-kpi-pipeline-v2-architecture.md

Create packages/ai/src/modules/kpi/pipeline-v2/types.ts with:
1. KPIPlan interface - output of PLAN phase
2. GenerationResult interface - output of GENERATE phase
3. ValidationResult interface - output of VALIDATE phase
4. RepairAttempt interface - tracks repair escalation
5. PipelineConfig interface - configuration options
6. PipelineMetrics interface - timing and token tracking

Export all types. Add JSDoc comments explaining each.
```

### Wave 2.1: PLAN Phase

```
Implement the PLAN phase for KPI Pipeline V2.

Read:
- .artifacts/2026-01-17-kpi-pipeline-v2-architecture.md
- packages/ai/src/modules/kpi/pipeline-v2/types.ts
- packages/ai/src/modules/kpi/prompts/schema-first-generation.ts (for reference)

Create:
1. packages/ai/src/modules/kpi/pipeline-v2/plan/plan-prompt.ts
   - Opus prompt for KPI planning
   - Focus on business reasoning, type assignment with rationale
   - Output structured KPIPlan[]

2. packages/ai/src/modules/kpi/pipeline-v2/plan/planner.ts
   - planKPIs(schemaIntelligence, config) function
   - Calls Opus with planning prompt
   - Parses and validates response
   - Returns KPIPlan[]

Use Anthropic SDK patterns from existing recipe-generator.ts.
```

### Wave 2.2: GENERATE Phase

```
Implement the GENERATE phase for KPI Pipeline V2.

Read:
- .artifacts/2026-01-17-kpi-pipeline-v2-architecture.md
- packages/ai/src/modules/kpi/pipeline-v2/types.ts
- packages/liquid-connect/src/kpi/types.ts (DSL types)

Create type-specific generation prompts:
1. packages/ai/src/modules/kpi/pipeline-v2/generate/simple-prompt.ts
2. packages/ai/src/modules/kpi/pipeline-v2/generate/ratio-prompt.ts
3. packages/ai/src/modules/kpi/pipeline-v2/generate/filtered-prompt.ts
4. packages/ai/src/modules/kpi/pipeline-v2/generate/composite-prompt.ts

Each prompt should:
- ONLY know its type's rules (focused)
- Include 2-3 examples of that type
- Require specific fields for that type

Create:
5. packages/ai/src/modules/kpi/pipeline-v2/generate/generator.ts
   - generateKPIs(plans: KPIPlan[], config) function
   - Groups plans by type
   - Runs type-specific generation in PARALLEL
   - Merges results
   - Returns GenerationResult[]
```

### Wave 2.3: REPAIR Phase

```
Implement the REPAIR phase with escalation for KPI Pipeline V2.

Read:
- .artifacts/2026-01-17-kpi-pipeline-v2-architecture.md
- packages/ai/src/modules/kpi/pipeline-v2/types.ts

Create:
1. packages/ai/src/modules/kpi/pipeline-v2/repair/repair-prompts.ts
   - haikuRepairPrompt: Quick syntax fixes
   - sonnetRepairPrompt: Approach rethinking
   - opusRepairPrompt: Deep reasoning for edge cases

2. packages/ai/src/modules/kpi/pipeline-v2/repair/repairer.ts
   - repairKPI(failed: GenerationResult, error: ValidationResult, config)
   - Implements escalation: Haiku → Sonnet → Opus → Give up
   - Tracks attempts in RepairAttempt[]
   - Returns repaired DSL or flags for review

Each escalation level should:
- Get full context of previous attempts
- Understand why previous level failed
- Have appropriate scope for its model's capability
```

---

## Execution Commands

```bash
# Wave 1: Foundation (run sequentially)
# Human runs these or Claude runs with confirmation

# Wave 2: Parallel implementation
# Use Task tool to spawn 3 agents simultaneously:
# - Agent 1: PLAN phase
# - Agent 2: GENERATE phase
# - Agent 3: REPAIR phase

# Wave 3: Integration (after Wave 2 completes)
# Single agent wires everything together

# Wave 4: Testing (parallel)
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts northwind --v2
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts pagila --v2
pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts chinook --v2
```

---

## Success Metrics

| Metric | V1 Baseline | V2 Target | V2 Actual (2026-01-17) |
|--------|-------------|-----------|------------------------|
| Compile Success | 100% | 100% | **100%** ✅ |
| Repair Rate | 30-60% | <10% | **2.2%** 🔥 |
| Valid KPIs | 60-70% | >85% | **100%** ✅ |
| Invalid KPIs | 5-15% | <5% | **0%** ✅ |
| Time to Generate | ~30s | ~45s | ~44s ✅ |

### Test Results by Database

| Database | KPIs | Valid 1st Try | Repaired | Success Rate | Repair Rate |
|----------|------|---------------|----------|--------------|-------------|
| Northwind | 15 | 15 | 0 | 100% | 0% |
| Pagila | 15 | 14 | 1 | 100% | 6.7% |
| Chinook | 15 | 15 | 0 | 100% | 0% |
| **Total** | **45** | **44** | **1** | **100%** | **2.2%** |

**Important Note**: These results measure **Schema + Compilation** validation only. See below for full execution validation.

### V1 Validation Integration (Execution + Value Validation)

After integrating V1's `validateKPIValues()` function into V2 test pipeline, we discovered that "100% success" only means KPIs pass schema and compilation checks - NOT that they execute correctly or return sensible values.

**Northwind Results with Full Validation:**

| Metric | Count | Percentage |
|--------|-------|------------|
| Total KPIs Generated | 15 | 100% |
| **Schema + Compilation** | 15 | 100% ✅ |
| **Execution Success** | 9 | 60% ⚠️ |
| **Business Value Valid** | 6 | 40% |
| **Business Value Suspicious** | 3 | 20% |
| **Execution Errors** | 6 | 40% ❌ |

**Execution Errors Found (6 KPIs):**

1. **COUNT_DISTINCT Syntax** (3 KPIs)
   - Generated: `COUNT_DISTINCT(column)`
   - DuckDB expects: `COUNT(DISTINCT column)`
   - Affected: Total Orders, Average Order Value, Repeat Customer Rate

2. **Table Alias Issues** (3 KPIs)
   - Generated: `od.unit_price` without defining `od` alias
   - Composite KPIs not properly handling multi-table queries
   - Affected: Revenue by Product, Revenue by Customer, Revenue by Employee

**Suspicious Values (LLM Validation):**

1. **Average Items Per Order: 23.8** ⚠️
   - LLM: "Above typical B2C range (1-5), might indicate B2B or calculation error"
   - Actual: Northwind IS B2B, so this is valid but flagged

2. **Monthly Revenue Trend: $1.35M** ⚠️
   - LLM: "Identical to total revenue, monthly aggregation likely broken"
   - Actual: Missing time grouping in query

3. **On-Time Delivery Rate: 100%** ⚠️
   - LLM: "Perfect 100% is extremely unlikely in real operations"
   - Actual: Possible data quality issue or filter error

**Key Insight**: V2's VALIDATE phase only checks schema + compilation. Real-world validation requires:
- ✅ Schema validation (Zod)
- ✅ Compilation (SQL generation)
- ❌ **Execution** (runs without SQL errors) - NOW INTEGRATED
- ❌ **Value validation** (LLM business sense check) - NOW INTEGRATED

**Integration Status**: V1's `validateKPIValues()` now runs after V2 pipeline in test script, providing full validation coverage.

**Next Steps**: Fix SQL generation bugs (COUNT_DISTINCT syntax, composite table aliases) to achieve true 100% execution success.

---

## Rollback Plan

V2 is additive. Keep V1 intact:
- Feature flag `useV2Pipeline: boolean` in config
- Test script supports `--v1` and `--v2` flags
- Can A/B compare on same database
- If V2 regresses, flip flag back

---

## Next Steps

1. Review this architecture doc
2. Approve implementation approach
3. Run Wave 1 (types + skeleton)
4. Run Wave 2 in parallel (3 agents)
5. Run Wave 3 integration
6. Run Wave 4 testing
7. Compare V1 vs V2 metrics
8. Iterate or ship
