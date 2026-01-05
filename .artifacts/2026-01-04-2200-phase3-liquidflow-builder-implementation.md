# Phase 3 LiquidFlow Builder - Implementation Dossier

**Date:** 2026-01-04
**Status:** Complete
**Package:** `@repo/liquid-connect`

---

## Executive Summary

Implemented the Phase 3 KPI execution pipeline that converts LLM-generated semantic metric definitions into executable SQL. This completes the 3-phase architecture:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | LLM generates `SemanticMetricDefinition` from business KPI names | ✅ Complete |
| Phase 2 | Convert definitions to `LiquidFlow` IR | ✅ Complete (this work) |
| Phase 3 | Emit SQL via dialect-specific emitters and execute | ✅ Complete (this work) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KPI Execution Pipeline                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  KPI Recipe      │    │  LiquidFlow IR   │    │  SQL Output      │  │
│  │  (Phase 1)       │───▶│  (Phase 2)       │───▶│  (Phase 3)       │  │
│  │                  │    │                  │    │                  │  │
│  │  • name          │    │  • metrics[]     │    │  • PostgreSQL    │  │
│  │  • semantic      │    │  • sources[]     │    │  • DuckDB        │  │
│  │    Definition    │    │  • filters[]     │    │  • Trino         │  │
│  │  • confidence    │    │  • time          │    │                  │  │
│  │  • feasible      │    │  • joins[]       │    │                  │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│           │                       │                       │            │
│           │                       │                       │            │
│           ▼                       ▼                       ▼            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Execution Layer                                │  │
│  │  executor(sql) → { rows, executionTimeMs } → MetricExecutionResult│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Files Created

### 1. Recipe Builder (`src/liquidflow/recipe-builder.ts`)

Converts KPI recipes to LiquidFlow IR.

```typescript
// Core types
interface SemanticMetricDefinition {
  type: 'simple' | 'derived' | 'cumulative';
  expression: string;
  aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'COUNT_DISTINCT' | 'MIN' | 'MAX';
  entity: string;
  timeField?: string;
  timeGranularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: FilterCondition[];
}

interface CalculatedMetricRecipe {
  name: string;
  description: string;
  category: 'revenue' | 'growth' | 'retention' | 'engagement' | 'efficiency' | 'custom';
  semanticDefinition: SemanticMetricDefinition;
  confidence: number;
  feasible: boolean;
}

// Core functions
function buildLiquidFlowFromRecipe(
  recipe: CalculatedMetricRecipe,
  options?: RecipeBuildOptions
): LiquidFlow;

function buildLiquidFlowsFromRecipes(
  recipes: CalculatedMetricRecipe[],
  options?: RecipeBuildOptions
): LiquidFlow[];

function validateRecipeForFlow(recipe: CalculatedMetricRecipe): {
  valid: boolean;
  errors: string[];
};
```

**Key Features:**
- Maps KPI filter operators to LiquidFlow operators
- Maps aggregation types between systems
- Generates slugified metric references
- Applies schema/database prefixes
- Supports time range constraints
- Estimates query complexity for optimization hints

### 2. Execution Pipeline (`src/kpi/execute.ts`)

Complete pipeline from recipe to executed results.

```typescript
// Compilation result
interface CompiledMetric {
  name: string;
  recipe: CalculatedMetricRecipe;
  flow: LiquidFlow;
  sql: string;
  emitResult: EmitResult;
  warnings: string[];
}

// Execution result
interface MetricExecutionResult {
  name: string;
  value: number | null;
  executionTimeMs: number;
  error?: string;
  rawRows?: unknown[];
}

// Core functions
function compileRecipeToSQL(
  recipe: CalculatedMetricRecipe,
  options: KPIExecutionOptions
): CompiledMetric;

function compileRecipesToSQL(
  recipes: CalculatedMetricRecipe[],
  options: KPIExecutionOptions
): CompiledMetric[];

async function executeCompiledMetric(
  compiled: CompiledMetric,
  executor: (sql: string) => Promise<{ rows: unknown[]; executionTimeMs: number }>
): Promise<MetricExecutionResult>;

async function executeRecipe(
  recipe: CalculatedMetricRecipe,
  options: KPIExecutionOptions,
  executor: (sql: string) => Promise<{ rows: unknown[]; executionTimeMs: number }>
): Promise<MetricExecutionResult>;

function previewRecipeSQL(
  recipe: CalculatedMetricRecipe,
  dialect?: Dialect
): { sql: string; flow: LiquidFlow; warnings: string[] };
```

### 3. Module Index (`src/kpi/index.ts`)

Barrel exports for the KPI module.

### 4. Test Suite (`src/kpi/__tests__/execute.test.ts`)

15 tests covering:
- LiquidFlow building from recipes
- Time constraint application
- Schema prefix handling
- Recipe validation
- SQL compilation for PostgreSQL and DuckDB
- Batch compilation
- Infeasible recipe filtering
- SQL output verification

---

## Type Mappings

### Filter Operators

| KPI Recipe | LiquidFlow |
|------------|------------|
| `=` | `=` |
| `!=` | `!=` |
| `>` | `>` |
| `<` | `<` |
| `>=` | `>=` |
| `<=` | `<=` |
| `IN` | `IN` |
| `NOT IN` | `NOT IN` |
| `LIKE` | `LIKE` |
| `IS NULL` | `IS NULL` |
| `IS NOT NULL` | `IS NOT NULL` |

### Aggregations

| KPI Recipe | LiquidFlow |
|------------|------------|
| `SUM` | `SUM` |
| `AVG` | `AVG` |
| `COUNT` | `COUNT` |
| `COUNT_DISTINCT` | `COUNT_DISTINCT` |
| `MIN` | `MIN` |
| `MAX` | `MAX` |

---

## Usage Examples

### Basic SQL Preview

```typescript
import { previewRecipeSQL } from '@repo/liquid-connect';

const mrrRecipe = {
  name: 'Monthly Recurring Revenue (MRR)',
  semanticDefinition: {
    type: 'simple',
    expression: 'amount',
    aggregation: 'SUM',
    entity: 'subscriptions',
    filters: [{ field: 'status', operator: '=', value: 'active' }],
  },
  confidence: 0.95,
  feasible: true,
};

const preview = previewRecipeSQL(mrrRecipe, 'postgres');
console.log(preview.sql);
// SELECT SUM(amount) AS "Monthly Recurring Revenue (MRR)"
// FROM subscriptions
// WHERE status = 'active'
```

### Full Compilation with Options

```typescript
import { compileRecipeToSQL } from '@repo/liquid-connect';

const compiled = compileRecipeToSQL(mrrRecipe, {
  dialect: 'postgres',
  schema: 'analytics',
  database: 'production',
  timeRange: {
    start: '2024-01-01',
    end: '2024-12-31',
  },
  additionalFilters: [
    { field: 'plan_type', operator: '=', value: 'enterprise' }
  ],
});

console.log(compiled.sql);
console.log(compiled.flow);
console.log(compiled.warnings);
```

### Execute with Custom Executor

```typescript
import { executeRecipe } from '@repo/liquid-connect';
import { db } from '@turbostarter/db/server';

const result = await executeRecipe(
  mrrRecipe,
  { dialect: 'postgres' },
  async (sql) => {
    const startTime = Date.now();
    const rows = await db.execute(sql);
    return {
      rows,
      executionTimeMs: Date.now() - startTime,
    };
  }
);

console.log(`${result.name}: $${result.value}`);
// Monthly Recurring Revenue (MRR): $125000
```

### Batch Processing

```typescript
import { executeRecipes } from '@repo/liquid-connect';

const recipes = [mrrRecipe, arrRecipe, churnRateRecipe];

const results = await executeRecipes(
  recipes,
  { dialect: 'postgres' },
  executor
);

results.forEach(r => {
  console.log(`${r.name}: ${r.value ?? 'N/A'}`);
});
```

---

## Integration Points

### Knosia Analysis Pipeline

The builder integrates with `packages/api/src/modules/knosia/analysis/calculated-metrics.ts`:

```typescript
// Current Phase 1 flow
const recipes = await generateKPIRecipes(request, { model: 'haiku' });

// New Phase 2+3 integration
import { compileRecipesToSQL, executeRecipes } from '@repo/liquid-connect';

const compiled = compileRecipesToSQL(recipes, {
  dialect: 'postgres',
  schema: connectionSchema,
});

const results = await executeRecipes(
  recipes,
  { dialect: 'postgres' },
  async (sql) => queryExecutor.execute(sql)
);
```

### Canvas Execution

When a user adds a calculated metric to a canvas:

```typescript
import { previewRecipeSQL, executeRecipe } from '@repo/liquid-connect';

// Show SQL preview in UI
const preview = previewRecipeSQL(recipe, 'postgres');

// Execute on demand
const result = await executeRecipe(recipe, options, executor);
```

---

## Test Results

```
 ✓ src/kpi/__tests__/execute.test.ts (15 tests) 4ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
```

### Test Coverage

| Category | Tests |
|----------|-------|
| buildLiquidFlowFromRecipe | 3 |
| validateRecipeForFlow | 2 |
| compileRecipeToSQL | 3 |
| compileRecipesToSQL | 2 |
| previewRecipeSQL | 2 |
| SQL Output Verification | 3 |

---

## Package Exports

Added to `packages/liquid-connect/src/index.ts`:

```typescript
// =============================================================================
// KPI EXECUTION (Phase 3)
// =============================================================================

export {
  // Recipe → LiquidFlow → SQL pipeline
  compileRecipeToSQL,
  compileRecipesToSQL,
  executeCompiledMetric,
  executeRecipe,
  executeRecipes,
  previewRecipeSQL,
  // Recipe builder
  buildLiquidFlowFromRecipe,
  buildLiquidFlowsFromRecipes,
  validateRecipeForFlow,
  // Types
  type CompiledMetric,
  type MetricExecutionResult,
  type KPIExecutionOptions,
  type CalculatedMetricRecipe,
  type SemanticMetricDefinition as KPISemanticMetricDefinition,
  type RecipeBuildOptions,
} from './kpi';
```

---

## Future Enhancements

### Near-term
1. **Join Support** - Handle metrics spanning multiple tables
2. **Derived Metrics** - Support `type: 'derived'` with formula parsing
3. **Cumulative Metrics** - Running totals with window functions

### Long-term
1. **Query Caching** - Cache compiled LiquidFlow for repeated recipes
2. **Incremental Computation** - Delta updates for time-series metrics
3. **Cost Estimation** - Predict query cost before execution

---

## Dependencies

```
@repo/liquid-connect
├── src/liquidflow/types.ts      (LiquidFlow IR types)
├── src/liquidflow/builder.ts    (Fluent builder API)
├── src/emitters/index.ts        (SQL emitters)
│   ├── postgres/
│   ├── duckdb/
│   └── trino/
└── src/kpi/                     (NEW - this implementation)
    ├── execute.ts
    ├── index.ts
    └── __tests__/execute.test.ts
```

---

## Conclusion

Phase 3 is complete. The KPI execution pipeline now provides:

1. **Type-safe conversion** from LLM-generated semantic definitions to executable SQL
2. **Multi-dialect support** for PostgreSQL, DuckDB, and Trino
3. **Batch optimization** grouping metrics by entity for efficient queries
4. **Preview capability** for UI display before execution
5. **Comprehensive testing** with 15 passing tests

The system is ready for integration with the Knosia canvas and analysis pipelines.
