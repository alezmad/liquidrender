# Calculated Metrics Layer: Raw Data → Business KPIs

**Date:** 2026-01-04
**Status:** Solution Design
**Problem:** Canvas generation fails when KPIs require calculations (MRR, Churn, LTV) instead of direct column mapping
**Solution:** Extend Semantic Layer with Calculated Metrics support

---

## Executive Summary

**The Problem:**
Knosia's current template-based approach assumes KPIs are direct database columns. When KPI coverage < 10%, no canvas is created. This fails for most real-world scenarios where business metrics require calculations.

**Example:**
- Database has: `order_total`, `subscription_type`, `created_at`
- CEO needs: `Monthly Recurring Revenue (MRR)` = `SUM(order_total WHERE subscription_type='recurring') GROUP BY month`
- Current system: ❌ No canvas (0% KPI match)
- With calculated metrics: ✅ Canvas with working MRR chart

**The Solution:**
Add a **Calculated Metrics Layer** to the existing Semantic Layer. This layer:
1. Uses LLMs to generate KPI calculation recipes
2. Validates feasibility based on available vocabulary
3. Produces SQL queries that transform raw data → business metrics
4. Integrates seamlessly into the existing pipeline (no architecture changes)

**Impact:**
- ✅ Works with ANY database schema (not just template-matching ones)
- ✅ Generates useful canvases even with 0% template coverage
- ✅ Leverages existing LLM capabilities (already in codebase)
- ✅ Maintains backward compatibility

---

## Architecture Analysis

### Current Pipeline Flow (from knosia-architecture.md)

```
Step 6: Generate Semantic Layer
├─ generateSemanticLayer(vocabulary, schema)
└─ Returns: SemanticLayer (SQL generation capability)
    ↓
Step 7: Map to Business Template  ❌ BOTTLENECK
├─ mapToTemplate(vocabulary, template)
└─ Returns: MappingResult (coverage %)
    ↓
Step 8: Generate Dashboard Spec
├─ IF coverage >= 10% → generateDashboardSpec()
└─ ELSE → NO CANVAS ❌
```

**The Bottleneck:**
- `mapToTemplate()` does **string matching** (vocabulary.name → template.fieldName)
- Fails when KPIs require formulas: `MRR` != any column name
- Rigid 10% coverage threshold blocks canvas creation

### Proposed Enhancement (No Architecture Change)

```
Step 6: Generate Semantic Layer (unchanged)
├─ generateSemanticLayer(vocabulary, schema)
└─ Returns: SemanticLayer
    ↓
Step 6.5: Generate Calculated Metrics ⭐ NEW
├─ generateCalculatedMetrics(vocabulary, businessType, semanticLayer)
├─ Uses LLM to create KPI recipes
├─ Validates feasibility (do we have required columns?)
├─ Generates SQL for each calculable KPI
└─ Returns: CalculatedMetrics[]
    ↓
Step 7: Map to Business Template (enhanced)
├─ mapToTemplate(vocabulary + calculatedMetrics, template)
├─ Now matches both raw columns AND calculated KPIs
└─ Returns: MappingResult (higher coverage ✅)
    ↓
Step 8: Generate Dashboard Spec (unchanged)
├─ generateDashboardSpec(mappingResult)
└─ Includes both raw and calculated metrics
```

**Key Insight:** The architecture was ALREADY designed for this! The Semantic Layer has "SQL generation capability" (line 1093) but we're not using it for calculations.

---

## Solution Design

### 1. Calculated Metric Recipe (Data Structure)

```typescript
/**
 * A recipe for calculating a business metric from raw data
 */
interface CalculatedMetricRecipe {
  // Metadata
  id: string;
  name: string;                      // "Monthly Recurring Revenue"
  displayName: string;               // "MRR"
  category: "revenue" | "growth" | "efficiency" | "engagement";
  businessType: string;              // "SaaS"

  // Business definition
  definition: string;                // "Revenue from active recurring subscriptions"
  importance: "critical" | "high" | "medium" | "low";

  // Feasibility
  feasible: boolean;                 // Can we calculate this?
  confidence: number;                // 0-100 (LLM confidence in recipe)
  missingRequirements?: string[];    // ["cancellation_date"] if not feasible

  // Required vocabulary
  requiredVocabulary: {
    amount: {                        // The money column
      column: string;                // "order_total"
      table: string;                 // "orders"
      type: "metric";
    };
    timeField: {                     // The date column
      column: string;                // "created_at"
      table: string;                 // "orders"
      type: "timeField";
    };
    filter?: {                       // Optional categorical filter
      column: string;                // "subscription_type"
      table: string;                 // "orders"
      value: string;                 // "recurring"
      type: "dimension";
    };
    groupBy?: {                      // Optional grouping dimension
      column: string;                // "customer_id"
      table: string;                 // "customers"
      type: "entity" | "dimension";
    };
  };

  // SQL generation
  calculation: {
    aggregation: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MAX" | "MIN";
    filters: Array<{
      column: string;
      operator: "=" | "!=" | ">" | "<" | "IN" | "IS NULL" | "IS NOT NULL";
      value: string | number | boolean;
    }>;
    groupBy: Array<{
      column: string;
      timeGranularity?: "day" | "week" | "month" | "quarter" | "year";
    }>;
    orderBy?: Array<{
      column: string;
      direction: "ASC" | "DESC";
    }>;
  };

  // Generated SQL (for debugging/transparency)
  sql: string;

  // Visualization hint
  defaultVisualization: {
    type: "line" | "bar" | "kpi" | "table" | "pie";
    config?: Record<string, unknown>;
  };
}
```

### 2. LLM-Based Recipe Generator

**Module:** `packages/ai/src/modules/kpi/recipe-generator.ts`

```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

/**
 * Generate a KPI calculation recipe using LLM reasoning
 */
export async function generateKPIRecipe(
  kpiName: string,              // "MRR" or "Monthly Recurring Revenue"
  businessType: string,         // "SaaS"
  vocabulary: DetectedVocabulary,
  options: {
    model?: "haiku" | "sonnet";
  } = {}
): Promise<CalculatedMetricRecipe | null> {

  const { model = "haiku" } = options;

  // Build context for LLM
  const prompt = buildRecipePrompt(kpiName, businessType, vocabulary);

  try {
    const result = await generateObject({
      model: anthropic(model === "haiku"
        ? "claude-3-5-haiku-20241022"
        : "claude-3-5-sonnet-20241022"),
      schema: calculatedMetricRecipeSchema,
      prompt,
    });

    const recipe = result.object;

    // Only return if feasible
    return recipe.feasible ? recipe : null;

  } catch (error) {
    console.error(`[KPI Recipe] Failed to generate recipe for ${kpiName}:`, error);
    return null;
  }
}

/**
 * Build the LLM prompt for recipe generation
 */
function buildRecipePrompt(
  kpiName: string,
  businessType: string,
  vocabulary: DetectedVocabulary
): string {
  return `You are a business intelligence expert specializing in ${businessType} analytics.

**Task:** Generate a calculation recipe for the KPI: "${kpiName}"

**Available Vocabulary (from database schema):**

ENTITIES (tables):
${vocabulary.entities.map(e => `- ${e.table} (${e.totalRows || '?'} rows)`).join('\n')}

METRICS (numeric columns that can be aggregated):
${vocabulary.metrics.map(m =>
  `- ${m.table}.${m.name} (${m.dataType}, ${m.aggregation || 'SUM/AVG/COUNT'})`
).join('\n')}

DIMENSIONS (categorical columns for filtering/grouping):
${vocabulary.dimensions.map(d =>
  `- ${d.table}.${d.name} (${d.dataType}${d.sampleValues ? `, values: ${d.sampleValues.slice(0, 5).join(', ')}` : ''})`
).join('\n')}

TIME FIELDS (for trend analysis):
${vocabulary.timeFields.map(t => `- ${t.table}.${t.name}`).join('\n')}

**Instructions:**

1. **Understand the KPI:**
   - What does "${kpiName}" mean in a ${businessType} context?
   - What business question does it answer?

2. **Map to Vocabulary:**
   - Which columns are needed to calculate this KPI?
   - Are all required columns available?
   - If not, what's missing?

3. **Define the Calculation:**
   - What aggregation function? (SUM, COUNT, AVG, etc.)
   - What filters are needed? (e.g., subscription_type = 'recurring')
   - How to group data? (by month, by customer, etc.)

4. **Assess Feasibility:**
   - Can this KPI be calculated with available data?
   - If yes: confidence = 80-100 (based on column name clarity)
   - If no: confidence = 0, list missing requirements

5. **Generate SQL Logic:**
   - Write the calculation logic
   - Use actual column/table names from vocabulary
   - Handle edge cases (nulls, divisions by zero)

**Output Format:** Return a structured CalculatedMetricRecipe object.

**Important:**
- Only set feasible=true if you can definitively calculate the KPI
- Confidence should reflect column name clarity (exact match = 100, fuzzy = 70-90, guessing = 50)
- Be conservative - false positives create broken dashboards

**Example for "MRR" in SaaS:**
If we have: orders.amount, orders.subscription_type, orders.created_at
Then:
- feasible = true
- requiredVocabulary.amount = orders.amount
- requiredVocabulary.filter = subscription_type = 'recurring'
- calculation.aggregation = SUM
- calculation.groupBy = DATE_TRUNC('month', created_at)
`;
}
```

### 3. Batch Recipe Generation

**Module:** `packages/ai/src/modules/kpi/batch-generator.ts`

```typescript
/**
 * Generate recipes for all standard KPIs for a business type
 */
export async function generateBusinessTypeRecipes(
  businessType: string,
  vocabulary: DetectedVocabulary,
  options: {
    model?: "haiku" | "sonnet";
    concurrency?: number;
  } = {}
): Promise<CalculatedMetricRecipe[]> {

  const { concurrency = 3 } = options;

  // Get standard KPIs for business type
  const standardKPIs = getStandardKPIs(businessType);

  // Generate recipes in parallel (with concurrency limit)
  const recipes: CalculatedMetricRecipe[] = [];

  for (let i = 0; i < standardKPIs.length; i += concurrency) {
    const batch = standardKPIs.slice(i, i + concurrency);

    const batchRecipes = await Promise.all(
      batch.map(kpi => generateKPIRecipe(kpi.name, businessType, vocabulary, options))
    );

    // Filter out null (not feasible) recipes
    recipes.push(...batchRecipes.filter(r => r !== null) as CalculatedMetricRecipe[]);
  }

  return recipes;
}

/**
 * Get standard KPIs for a business type
 */
function getStandardKPIs(businessType: string): Array<{ name: string; priority: number }> {
  const kpis: Record<string, Array<{ name: string; priority: number }>> = {
    "SaaS": [
      { name: "Monthly Recurring Revenue (MRR)", priority: 1 },
      { name: "Annual Recurring Revenue (ARR)", priority: 2 },
      { name: "Customer Churn Rate", priority: 3 },
      { name: "Net Revenue Retention (NRR)", priority: 4 },
      { name: "Customer Lifetime Value (LTV)", priority: 5 },
      { name: "Customer Acquisition Cost (CAC)", priority: 6 },
      { name: "Active Subscriptions", priority: 7 },
      { name: "Average Revenue Per User (ARPU)", priority: 8 },
    ],
    "E-Commerce": [
      { name: "Total Revenue", priority: 1 },
      { name: "Average Order Value (AOV)", priority: 2 },
      { name: "Conversion Rate", priority: 3 },
      { name: "Cart Abandonment Rate", priority: 4 },
      { name: "Customer Lifetime Value (LTV)", priority: 5 },
      { name: "Repeat Purchase Rate", priority: 6 },
      { name: "Revenue Per Visitor", priority: 7 },
    ],
    "CRM": [
      { name: "Lead-to-Customer Conversion Rate", priority: 1 },
      { name: "Sales Pipeline Value", priority: 2 },
      { name: "Average Deal Size", priority: 3 },
      { name: "Sales Cycle Length", priority: 4 },
      { name: "Win Rate", priority: 5 },
      { name: "Lead Response Time", priority: 6 },
    ],
  };

  return kpis[businessType] || [];
}
```

### 4. Integration with Semantic Layer

**Module:** `packages/liquid-connect/src/semantic/calculated-metrics.ts`

```typescript
import type { DetectedVocabulary } from "../uvb/models";
import type { CalculatedMetricRecipe } from "@turbostarter/ai/kpi";

/**
 * Convert calculated metric recipes to vocabulary items
 */
export function recipesToVocabulary(
  recipes: CalculatedMetricRecipe[]
): {
  metrics: DetectedMetric[];
  sql: Record<string, string>; // metric.id → SQL query
} {
  const metrics: DetectedMetric[] = [];
  const sql: Record<string, string> = {};

  for (const recipe of recipes) {
    if (!recipe.feasible) continue;

    // Create a synthetic vocabulary item
    const metric: DetectedMetric = {
      id: recipe.id,
      name: recipe.displayName || recipe.name,
      table: "__calculated__", // Special marker
      column: recipe.id,
      dataType: "numeric",
      aggregation: recipe.calculation.aggregation,
      isCalculated: true, // Flag for downstream processing
      calculationRecipe: recipe, // Store full recipe
      certainty: recipe.confidence / 100,
    };

    metrics.push(metric);
    sql[recipe.id] = recipe.sql;
  }

  return { metrics, sql };
}

/**
 * Merge detected vocabulary with calculated metrics
 */
export function mergeVocabularyWithCalculated(
  detected: DetectedVocabulary,
  calculated: CalculatedMetricRecipe[]
): {
  vocabulary: DetectedVocabulary;
  calculatedSQL: Record<string, string>;
} {
  const { metrics: calculatedMetrics, sql } = recipesToVocabulary(calculated);

  return {
    vocabulary: {
      ...detected,
      metrics: [
        ...detected.metrics,
        ...calculatedMetrics, // Add calculated metrics to the end
      ],
    },
    calculatedSQL: sql,
  };
}
```

### 5. Pipeline Integration

**File:** `packages/api/src/modules/knosia/pipeline/index.ts`

**Changes:**

```typescript
export async function runKnosiaPipeline(
  connectionId: string,
  userId: string,
  workspaceId: string,
  options?: PipelineOptions
): Promise<PipelineResult> {

  // ... existing steps 1-5 (extract, profile, detect, save vocab, detect business type)

  // Step 6: Resolve Vocabulary (unchanged)
  const resolvedVocab = await resolveVocabulary(userId, workspaceId);

  // Step 7: Generate Semantic Layer (unchanged)
  const semanticLayer = await generateSemanticLayer(resolvedVocab, extractedSchema);

  // ⭐ Step 7.5: Generate Calculated Metrics (NEW)
  console.log("[Pipeline] Generating calculated metrics for business type:", businessType.detected);

  const { generateBusinessTypeRecipes } = await import("@turbostarter/ai/kpi/batch-generator");
  const { mergeVocabularyWithCalculated } = await import("@repo/liquid-connect/semantic/calculated-metrics");

  const calculatedRecipes = await generateBusinessTypeRecipes(
    businessType.detected,
    resolvedVocab,
    { model: "haiku", concurrency: 3 }
  );

  console.log(`[Pipeline] Generated ${calculatedRecipes.length} calculated metrics`);

  // Merge calculated metrics into vocabulary
  const { vocabulary: enrichedVocab, calculatedSQL } = mergeVocabularyWithCalculated(
    resolvedVocab,
    calculatedRecipes
  );

  // Step 8: Map to Business Template (now uses enriched vocabulary)
  const template = getTemplate(businessType.detected);
  const mappingResult = mapToTemplate(enrichedVocab, template); // ✅ Higher coverage!

  console.log(`[Pipeline] Template coverage: ${mappingResult.coverage}% (with calculated metrics)`);

  // Step 9-10: Generate dashboard spec and LiquidSchema (unchanged)
  const dashboardSpec = generateDashboardSpec(mappingResult);
  const liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec);

  // Step 11: Create canvas with calculated metrics metadata
  const canvas = await createCanvas({
    workspaceId,
    liquidSchema,
    metadata: {
      calculatedMetrics: calculatedRecipes.map(r => r.id),
      calculatedSQL, // Store SQL for runtime execution
    },
  });

  return {
    analysisId,
    businessType,
    vocabularyStats: {
      raw: resolvedVocab.metrics.length,
      calculated: calculatedRecipes.length,
      total: enrichedVocab.metrics.length,
    },
    canvasId: canvas.id,
  };
}
```

### 6. Runtime Query Execution

**Challenge:** When rendering a canvas block that uses a calculated metric, we need to execute the SQL.

**Module:** `packages/api/src/modules/knosia/canvas/data-resolver.ts`

```typescript
/**
 * Resolve data for a canvas block (supports calculated metrics)
 */
export async function resolveBlockData(
  blockId: string,
  canvasId: string,
  connectionId: string
): Promise<unknown> {

  // Get block binding (from LiquidSchema)
  const block = await getCanvasBlock(canvasId, blockId);

  // Check if this block uses a calculated metric
  if (block.binding?.kind === "calculated") {
    // Fetch the SQL from canvas metadata
    const canvas = await getCanvas(canvasId);
    const sql = canvas.metadata?.calculatedSQL?.[block.binding.metricId];

    if (!sql) {
      throw new Error(`Calculated metric SQL not found: ${block.binding.metricId}`);
    }

    // Execute the SQL against user database
    const { executeQuery } = await import("../connections/data-queries");
    const result = await executeQuery(connectionId, sql);

    return result.rows;
  }

  // Standard vocabulary binding (existing logic)
  return resolveStandardBinding(block.binding, connectionId);
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal:** Basic calculated metrics infrastructure

1. **Create KPI Recipe Schema**
   - File: `packages/ai/src/modules/kpi/types.ts`
   - Define `CalculatedMetricRecipe` interface
   - Create Zod schema for LLM validation

2. **Implement Recipe Generator**
   - File: `packages/ai/src/modules/kpi/recipe-generator.ts`
   - Implement `generateKPIRecipe()` with LLM
   - Test with 3 KPIs (MRR, Churn, AOV)

3. **Add Standard KPI Library**
   - File: `packages/ai/src/modules/kpi/standard-kpis.ts`
   - Define KPIs for: SaaS, E-Commerce, CRM
   - Include business definitions

**Deliverables:**
- ✅ Recipe generator working for 3 KPIs
- ✅ Unit tests with mocked vocabulary
- ✅ SQL generation verified

### Phase 2: Integration (Week 2)

**Goal:** Integrate with pipeline

1. **Batch Recipe Generation**
   - File: `packages/ai/src/modules/kpi/batch-generator.ts`
   - Implement `generateBusinessTypeRecipes()`
   - Add concurrency control (3 concurrent LLM calls)

2. **Semantic Layer Integration**
   - File: `packages/liquid-connect/src/semantic/calculated-metrics.ts`
   - Implement `recipesToVocabulary()`
   - Implement `mergeVocabularyWithCalculated()`

3. **Pipeline Enhancement**
   - File: `packages/api/src/modules/knosia/pipeline/index.ts`
   - Add Step 7.5 (calculated metrics generation)
   - Store `calculatedSQL` in canvas metadata

**Deliverables:**
- ✅ Pipeline generates calculated metrics
- ✅ Canvas created even with 0% raw template coverage
- ✅ Integration test: E2E with test database

### Phase 3: Runtime & UI (Week 3)

**Goal:** Execute calculated metrics and render in UI

1. **Data Resolver**
   - File: `packages/api/src/modules/knosia/canvas/data-resolver.ts`
   - Implement `resolveBlockData()` for calculated metrics
   - Handle SQL execution

2. **Canvas Metadata Storage**
   - Update `knosia_workspace_canvas.metadata` JSONB
   - Store: `{ calculatedMetrics: string[], calculatedSQL: Record<string, string> }`

3. **Frontend Binding**
   - Update LiquidRender bindings to support `kind: "calculated"`
   - Add `metricId` to binding for calculated metrics

**Deliverables:**
- ✅ Calculated metrics render in canvas
- ✅ SQL executes on-demand
- ✅ Error handling for failed calculations

### Phase 4: Polish & Optimization (Week 4)

**Goal:** Production-ready

1. **Caching Layer**
   - Cache calculated metric results (5-minute TTL)
   - Invalidate on data refresh

2. **Error Handling**
   - Graceful degradation if SQL fails
   - User-friendly error messages

3. **Transparency**
   - Show SQL in block tooltip (debugging)
   - "How is this calculated?" popover

4. **Testing**
   - E2E tests with real databases
   - Test coverage: SaaS, E-Commerce, CRM
   - Performance benchmarks

**Deliverables:**
- ✅ Production-ready calculated metrics
- ✅ 90%+ test coverage
- ✅ Performance < 500ms per metric

---

## Database Schema Changes

### Canvas Metadata (JSONB)

**Table:** `knosia_workspace_canvas`
**Column:** `metadata` (JSONB, existing)

**New Structure:**

```typescript
interface CanvasMetadata {
  // Existing fields (if any)
  ...existing,

  // New: Calculated metrics
  calculatedMetrics?: string[];              // ["mrr", "churn", "ltv"]
  calculatedSQL?: Record<string, string>;    // { "mrr": "SELECT ...", "churn": "SELECT ..." }
}
```

**No migration needed** - JSONB is flexible, backward compatible.

---

## LLM Prompt Examples

### Example 1: MRR (High Confidence)

**Input:**
- KPI: "Monthly Recurring Revenue (MRR)"
- Business Type: SaaS
- Vocabulary: `orders.amount`, `orders.subscription_type`, `orders.created_at`

**LLM Output:**

```json
{
  "id": "mrr",
  "name": "Monthly Recurring Revenue",
  "displayName": "MRR",
  "definition": "Total recurring revenue per month from active subscriptions",
  "feasible": true,
  "confidence": 90,
  "requiredVocabulary": {
    "amount": {
      "column": "amount",
      "table": "orders",
      "type": "metric"
    },
    "timeField": {
      "column": "created_at",
      "table": "orders",
      "type": "timeField"
    },
    "filter": {
      "column": "subscription_type",
      "table": "orders",
      "value": "recurring",
      "type": "dimension"
    }
  },
  "calculation": {
    "aggregation": "SUM",
    "filters": [
      { "column": "subscription_type", "operator": "=", "value": "recurring" },
      { "column": "cancelled_at", "operator": "IS NULL", "value": null }
    ],
    "groupBy": [
      { "column": "created_at", "timeGranularity": "month" }
    ]
  },
  "sql": "SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as mrr FROM orders WHERE subscription_type = 'recurring' AND cancelled_at IS NULL GROUP BY month ORDER BY month DESC",
  "defaultVisualization": {
    "type": "line",
    "config": { "xAxis": "month", "yAxis": "mrr" }
  }
}
```

### Example 2: Churn Rate (Missing Data)

**Input:**
- KPI: "Customer Churn Rate"
- Business Type: SaaS
- Vocabulary: `customers.id`, `customers.created_at` (NO cancellation field)

**LLM Output:**

```json
{
  "id": "churn_rate",
  "name": "Customer Churn Rate",
  "displayName": "Churn Rate",
  "definition": "Percentage of customers who cancelled in a given period",
  "feasible": false,
  "confidence": 0,
  "missingRequirements": [
    "cancellation_date or cancelled_at field",
    "subscription_status field (active/cancelled)"
  ],
  "requiredVocabulary": {},
  "calculation": {},
  "sql": ""
}
```

---

## Benefits

### 1. Solves the Core Problem

✅ **Before:** 0% template coverage → No canvas → User sees nothing
✅ **After:** 0% template coverage → 5 calculated KPIs → User sees MRR, Revenue, Active Users

### 2. Works with Real-World Data

- Most databases don't have columns named exactly "monthly_recurring_revenue"
- KPIs are business concepts, not database columns
- Calculations adapt to each schema

### 3. Leverages Existing Architecture

- No pipeline restructuring needed
- Semantic layer was designed for this
- LLM capabilities already in codebase

### 4. Maintains Flexibility

- Users can still add custom metrics
- Template matching still works (for raw columns)
- Calculated metrics are additive, not replacement

### 5. Provides Transparency

- Users see the SQL (debugging)
- Can edit formulas (future enhancement)
- Clear "how is this calculated?" explanations

---

## Risks & Mitigations

### Risk 1: LLM Generates Incorrect SQL

**Impact:** Broken charts, wrong data
**Mitigation:**
- Conservative feasibility checking (only high-confidence recipes)
- SQL validation before storage
- Runtime error handling with graceful degradation
- User feedback loop ("Is this calculation correct?")

### Risk 2: Performance (Multiple SQL Queries)

**Impact:** Slow canvas loading
**Mitigation:**
- 5-minute cache for calculated metrics
- Lazy loading (only calculate visible blocks)
- Batch SQL execution where possible
- Materialized views (future optimization)

### Risk 3: Cost (LLM API Calls)

**Impact:** High API costs for recipe generation
**Mitigation:**
- Use Haiku (cheapest model) for recipes
- Cache recipes per business type (reusable)
- Limit to top 10 KPIs per business type
- Cost: ~$0.10 per analysis (10 KPIs × $0.01 per recipe)

### Risk 4: Complexity

**Impact:** Hard to debug, maintain
**Mitigation:**
- Comprehensive logging
- Unit tests for each component
- Clear separation of concerns (recipe gen, SQL execution, UI)
- Document SQL in UI (transparency)

---

## Success Metrics

### Technical Metrics

- **Canvas Creation Rate:** 90%+ (vs current ~30% with template-only)
- **KPI Feasibility:** 70%+ of standard KPIs calculable per business type
- **Performance:** < 500ms per calculated metric query
- **Accuracy:** < 5% error rate (user-reported incorrect calculations)

### Business Metrics

- **Time to First Value:** < 60 seconds from connection to working dashboard
- **User Satisfaction:** "My dashboard shows useful metrics" (survey)
- **Engagement:** Users interact with calculated metric charts

---

## Alternative Approaches (Considered & Rejected)

### Alternative 1: Manual Metric Definitions

**Approach:** Require users to define KPI formulas themselves

**Pros:**
- 100% accurate (user knows their data)
- No LLM cost

**Cons:**
- ❌ Destroys "60-second value" promise
- ❌ Requires SQL knowledge
- ❌ Not differentiated from Looker/Tableau

**Decision:** Rejected - defeats Knosia's core value prop

### Alternative 2: Hardcoded KPI Templates

**Approach:** Pre-define SQL templates for each business type, string-replace table/column names

**Pros:**
- Fast, predictable
- No LLM cost

**Cons:**
- ❌ Brittle (breaks if column names don't match exactly)
- ❌ Doesn't handle schema variations
- ❌ Limited to exact matches

**Decision:** Rejected - this is what we have now (and it fails)

### Alternative 3: Semantic Matching Only

**Approach:** Use embeddings to match vocabulary to KPIs, no calculation logic

**Pros:**
- Better than string matching
- Handles synonyms

**Cons:**
- ❌ Still can't generate formulas
- ❌ "revenue" column != MRR calculation
- ❌ Doesn't solve the core problem

**Decision:** Rejected - insufficient for calculated metrics

---

## Conclusion

**The Architecture Doesn't Need to Change.**

The existing pipeline already has the right structure. We just need to:

1. **Extend the Semantic Layer** with calculated metrics support
2. **Insert a new step** (7.5) between semantic layer and template mapping
3. **Store SQL formulas** in canvas metadata
4. **Execute on-demand** when rendering blocks

This is **feasible with current LLM technology** and **maintains Knosia's core value**: transform any database into business insights in 60 seconds.

**Next Steps:**
1. Approve this approach
2. Implement Phase 1 (recipe generator)
3. Test with real SaaS database
4. Iterate based on results

---

**END OF DOCUMENT**
