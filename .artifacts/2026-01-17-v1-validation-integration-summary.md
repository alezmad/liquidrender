# V1 Validation Integration Summary

**Date**: 2026-01-17
**Purpose**: Integrate V1's execution + value validation into V2 pipeline test

---

## What We Did

### 1. Exported V1 Functions

**File**: `packages/api/src/modules/knosia/vocabulary/kpi-generation.ts`

```typescript
// Made these exports public:
export interface KPIExecutionResult { ... }
export async function validateKPIValues(...) { ... }
```

### 2. Created V2→V1 Adapter

**File**: `packages/api/scripts/test-pipeline-v2.ts`

```typescript
// Extract source tables from semantic definition
function extractSourceTables(def: KPISemanticDefinition): string[]

// Convert V2 KPIResult to V1 CalculatedMetricRecipe
function convertV2ToV1Recipe(
  kpi: KPIResult,
  businessType: string
): { recipe: CalculatedMetricRecipe; sourceTables: string[] }
```

### 3. Added Validation Step

After V2 pipeline completes:
1. Convert valid KPIs to V1 format
2. Run `validateKPIValues()` against database
3. Display execution results + LLM value validation

---

## What We Learned

### Critical Discovery: "100% Success" Was Misleading

V2's "100% success rate" only validated:
- ✅ **Schema** (Zod checks)
- ✅ **Compilation** (SQL generates)

But NOT:
- ❌ **Execution** (SQL runs without errors)
- ❌ **Business Value** (results make sense)

### Northwind Real Results

| Layer | Test | Pass | Fail | Rate |
|-------|------|------|------|------|
| Schema | Well-formed JSON | 15 | 0 | 100% ✅ |
| Compilation | SQL generates | 15 | 0 | 100% ✅ |
| **Execution** | SQL runs | **9** | **6** | **60%** ❌ |
| **Value Check** | Makes sense | **6** | **9** | **40%** ⚠️ |

**True Success Rate**: 6/15 (40%) - only 6 KPIs actually work correctly

---

## Bugs Found

### 1. COUNT_DISTINCT Syntax Error (3 KPIs)

**Generated Code**:
```sql
SELECT COUNT_DISTINCT(order_id) AS value FROM orders
```

**Error**: `Scalar Function with name count_distinct does not exist!`

**Fix Needed**: Use `COUNT(DISTINCT order_id)` instead

**Affected KPIs**:
- Total Orders
- Average Order Value
- Repeat Customer Rate

**Root Cause**: V2 generation prompts use `COUNT_DISTINCT` as shorthand, but DuckDB doesn't support it.

---

### 2. Composite KPI Table Alias Errors (3 KPIs)

**Generated Code**:
```sql
SELECT SUM(od.unit_price * od.quantity) AS value
FROM "source_db"."public"."orders"
```

**Error**: `Referenced table "od" not found!`

**Fix Needed**: Define aliases in FROM clause or use full table names

**Affected KPIs**:
- Revenue by Product
- Revenue by Customer
- Revenue by Employee

**Root Cause**: Composite KPIs generate table aliases but don't properly construct multi-table queries.

---

### 3. Suspicious Values (LLM Flagged)

#### Average Items Per Order: 23.8
- **LLM**: "Too high for B2C (1-5 typical), possible calculation error"
- **Reality**: Northwind IS B2B, so this is actually valid
- **Action**: False positive, LLM needs better context

#### Monthly Revenue Trend: $1,354,458.59
- **LLM**: "Identical to total revenue, monthly aggregation broken"
- **Reality**: Missing `GROUP BY month` in generated SQL
- **Action**: Fix time-series KPI generation

#### On-Time Delivery Rate: 100%
- **LLM**: "Perfect 100% is unrealistic"
- **Reality**: Could be data quality issue or filter error
- **Action**: Investigate actual data

---

## Architecture Insight

### V2 Pipeline Validation Layers

```
┌─────────────────────────────────────────────┐
│ LAYER 1: Schema Validation                 │
│ Check: Zod schema compliance                │
│ Status: ✅ IMPLEMENTED (V2)                 │
│ Pass Rate: 100%                             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ LAYER 2: Compilation Validation             │
│ Check: Generates valid SQL                  │
│ Status: ✅ IMPLEMENTED (V2)                 │
│ Pass Rate: 100%                             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ LAYER 3: Execution Validation               │
│ Check: SQL runs without errors              │
│ Status: ✅ IMPLEMENTED (V1 integration)     │
│ Pass Rate: 60% ❌                           │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ LAYER 4: Value Validation                   │
│ Check: LLM business sense check             │
│ Status: ✅ IMPLEMENTED (V1 integration)     │
│ Pass Rate: 40% (6 valid, 3 suspicious)      │
└─────────────────────────────────────────────┘
```

### Why V2 Validation Stopped at Layer 2

**Original Design Goal**: Fast validation to route KPIs to repair

**Trade-off**: Compilation check is sufficient to know if DSL is valid, but doesn't catch:
- Dialect-specific SQL quirks (COUNT_DISTINCT)
- Runtime errors (table aliases, joins)
- Business logic errors (aggregation, grouping)

**Decision**: V2 focused on DSL correctness, not SQL execution correctness.

---

## Value Validation Examples

### Valid Value Example

**KPI**: Total Revenue
**Value**: $1,354,458.59
**LLM Check**: "✅ VALID - Revenue value is reasonable for B2B trading company with 830 orders"

### Suspicious Value Example

**KPI**: On-Time Delivery Rate
**Value**: 100%
**LLM Check**: "⚠️ SUSPICIOUS - Perfect 100% on-time delivery is extremely unlikely in real-world operations. Verify calculation method, check for data issues or filtering."

### Invalid Value Example (Not Found in Test)

**KPI**: Customer Churn Rate
**Value**: 150%
**LLM Check**: "❌ INVALID - Percentage cannot exceed 100%. Check calculation logic."

---

## Integration Seamlessness

### Type Compatibility: Perfect ✅

V2 and V1 both use the same underlying types from `liquid-connect`:
- `KPISemanticDefinition`
- `CalculatedMetricRecipe`
- `SimpleKPIDefinition`, `RatioKPIDefinition`, etc.

**No type conversions needed** - just property mapping.

### Adapter Simplicity: 15 Lines

```typescript
function convertV2ToV1Recipe(kpi: KPIResult, businessType: string) {
  return {
    recipe: {
      name: kpi.plan.name,
      description: kpi.plan.description,
      category: kpi.plan.category,
      semanticDefinition: kpi.definition!,
      businessType: [businessType],
      confidence: kpi.plan.confidence,
      feasible: true,
    },
    sourceTables: extractSourceTables(kpi.definition),
  };
}
```

### Integration Effort: 30 Minutes

1. Export V1 functions (5 min)
2. Write adapter (10 min)
3. Add validation step (10 min)
4. Fix composite table extraction bug (5 min)

---

## Performance Impact

### V2 Pipeline Only

```
Schema Extraction:  ~3s
Profiling:          ~5s
V2 Pipeline:        ~45s
─────────────────────────
Total:              ~53s
```

### V2 + V1 Validation

```
Schema Extraction:  ~3s
Profiling:          ~5s
V2 Pipeline:        ~45s
V1 Validation:      ~11s  ← Added
─────────────────────────
Total:              ~64s (+21%)
```

**Cost**: +11 seconds (+21%)
**Benefit**: Catch 40% execution errors before production

**Worth it?** YES - Finding errors in testing is far cheaper than production failures.

---

## Next Steps

### Immediate (Bug Fixes)

1. **Fix COUNT_DISTINCT** - Update generation prompts to use `COUNT(DISTINCT x)`
2. **Fix Composite Aliases** - Properly construct multi-table queries with aliases
3. **Fix Time Grouping** - Add GROUP BY for trend KPIs

### Short-term (Move to V2)

4. **Optional Execution Gate** - Add to `validator.ts` as optional validation
5. **Optional Value Gate** - Add LLM check to `validator.ts`
6. **Database Adapter Support** - Pass connection to validator for execution

### Long-term (Production Ready)

7. **Test All Databases** - Verify fixes on Pagila, Chinook, AdventureWorks
8. **Feature Flag** - Add `useV2Pipeline` config option
9. **Metrics Dashboard** - Track execution success rates in production
10. **Auto-repair Execution Errors** - Train repair prompts on execution failures

---

## Conclusion

**What We Thought**: V2 has 100% success rate
**What We Found**: V2 has 40% TRUE success rate (only 6/15 KPIs actually work)

**Impact**: This integration revealed critical gaps in V2's validation strategy

**Value**: V1's execution + value validation is now the gold standard for testing

**Path Forward**: Fix SQL generation bugs, move execution validation into V2 core, achieve true 100% success rate
