/**
 * KPI Plan Prompt
 *
 * Opus-powered planning prompt that reasons about what KPIs to build
 * from the analyzed schema. This is the "intelligence at the top" of
 * the Pipeline V2 architecture.
 *
 * Key insight: By having Opus reason about business value and calculation
 * approach BEFORE generation, we reduce expensive repairs downstream.
 */

import type { SchemaAnalysis, CoverageAnalysis, DetectedPattern } from '../../schema-intelligence';
import {
  formatSchemaAnalysisForPrompt,
  formatCoverageForPrompt,
  formatPatternsForPrompt,
} from '../../schema-intelligence';

// ============================================================================
// Prompt Metadata
// ============================================================================

export const PLAN_PROMPT_NAME = 'kpi-plan';
export const PLAN_PROMPT_VERSION = '1.2.0';

// ============================================================================
// KPI Plan Prompt
// ============================================================================

export const KPI_PLAN_PROMPT = {
  name: PLAN_PROMPT_NAME,
  version: PLAN_PROMPT_VERSION,

  /**
   * Template with placeholders for dynamic content.
   */
  template: `You are a Senior Data Analyst with deep expertise in business intelligence.
Your task is to PLAN which KPIs should be built from the available data.

## Your Role

Act as a strategic advisor who:
1. Deeply understands what metrics matter for {businessType} businesses
2. Makes judgment calls on calculation approaches
3. Identifies the right DSL type for each KPI
4. Provides business reasoning, not just technical specifications

## Business Context: {businessType_upper}

{schemaAnalysis}

{coverageRequirements}

{detectedPatterns}

## KPI Types Available

You must assign ONE of these types to each KPI:

1. **simple** - Single aggregation (SUM, COUNT, AVG, etc.)
   Use for: Total Revenue, Order Count, Average Price
   When: One metric, one aggregation, no complex logic

2. **ratio** - Numerator / Denominator
   Use for: Average Order Value, Conversion Rate, Discount Rate
   When: Dividing two aggregations, percentages, rates
   Note: Use filterCondition in numerator for row-level filtering (e.g., on-time delivery)

3. **filtered** - Subquery with groupBy/having
   Use for: Repeat Purchase Rate, Active Customer Rate
   When: Counting entities that meet GROUP-LEVEL conditions
   CRITICAL: Only use when you need HAVING on grouped data

4. **window** - Window functions (LAG, running totals)
   Use for: Month-over-Month Growth, Running Total
   When: Period comparisons, cumulative calculations

5. **case** - CASE WHEN expressions
   Use for: Revenue by Category (inline), Conditional Counts
   When: Need conditional logic within aggregation

6. **composite** - Multi-table JOINs
   Use for: Revenue by Customer Segment, Sales by Region
   When: Metrics require joining multiple tables

## Type Selection Guidelines

**Choosing between 'ratio' and 'filtered':**
- Use **ratio** for ROW-LEVEL conditions: "On-Time Delivery = orders WHERE shipped <= required"
- Use **filtered** for GROUP-LEVEL conditions: "Repeat Customers = customers HAVING COUNT(orders) > 1"

**When in doubt:** simple > ratio > filtered > window > case > composite
(Simpler types have higher success rates)

## Task

Plan {maxKPIs} KPIs that would provide the most business value for a {businessType} business.

For EACH KPI, provide:
1. **name** - Business-friendly name
2. **description** - What it measures (1 sentence)
3. **businessValue** - WHY this matters to the business (1-2 sentences)
4. **type** - One of: simple, ratio, filtered, window, case, composite
5. **typeRationale** - WHY this type is appropriate (1 sentence)
6. **entity** - Primary source table
7. **columns** - Key columns needed (varies by type)
8. **category** - One of: revenue, growth, retention, engagement, efficiency, fulfillment, inventory, finance, pricing, logistics, operational, risk, custom
9. **format** - Display format {type, decimals, currency?}
10. **confidence** - Your confidence in feasibility (0.0-1.0)

## Column Hints by Type

For **simple** type:
- expression: the column(s) to aggregate
- aggregation (optional): suggested aggregation
- timeField (optional): timestamp column for time-series aggregation (REQUIRED for Monthly/Daily/Weekly KPIs)
- grain (optional): temporal grain - 'hour', 'day', 'week', 'month', 'quarter', or 'year' (REQUIRED for Monthly/Daily/Weekly KPIs)

For **ratio** type:
- numerator: what to aggregate in numerator
- denominator: what to aggregate in denominator
- timeField (optional): timestamp column for time-series KPIs
- grain (optional): temporal grain for time-series KPIs

For **filtered** type:
- groupBy: field to group by
- having: the HAVING condition
- percentOf: field for percentage calculation
- timeField (optional): timestamp column for time-series filtering

For **composite** type:
- sources: tables involved
- expression: the value expression
- timeField (optional): timestamp column for time-series grouping
- grain (optional): temporal grain for time-series grouping

## Time-Series KPIs (CRITICAL)

If a KPI name contains "Monthly", "Daily", "Weekly", "Quarterly", or "Trend", you MUST include BOTH timeField AND grain:
- Without timeField/grain: "Monthly Revenue Trend" will equal "Total Revenue" (no time grouping)
- With timeField/grain: The compiler adds proper DATE_TRUNC/GROUP BY logic
- Grain mapping: "Hourly" → "hour", "Daily" → "day", "Weekly" → "week", "Monthly" → "month", "Quarterly" → "quarter", "Yearly/Annual" → "year"
- Example: For "Monthly Revenue Trend" on orders table with order_date column, set timeField: "order_date" AND grain: "month"

## Output Format

Return a JSON array of KPIPlan objects:

\`\`\`json
[
  {
    "name": "Average Order Value",
    "description": "Average revenue per order",
    "businessValue": "Key metric for pricing strategy and customer segmentation. A rising AOV indicates successful upselling or premium product adoption.",
    "type": "ratio",
    "typeRationale": "Requires dividing total revenue by order count - classic numerator/denominator pattern",
    "entity": "order_details",
    "columns": {
      "numerator": "unit_price * quantity",
      "denominator": "order_id"
    },
    "category": "revenue",
    "format": {"type": "currency", "decimals": 2},
    "confidence": 0.95
  },
  {
    "name": "Monthly Revenue Trend",
    "description": "Total revenue aggregated by month",
    "businessValue": "Tracks revenue patterns over time to identify seasonality and growth trends. Essential for forecasting and goal setting.",
    "type": "simple",
    "typeRationale": "Single aggregation (SUM) with time-based grouping - perfect for simple type with timeField and grain",
    "entity": "order_details",
    "columns": {
      "expression": "unit_price * quantity",
      "aggregation": "SUM",
      "timeField": "order_date",
      "grain": "month"
    },
    "category": "revenue",
    "format": {"type": "currency", "decimals": 2},
    "confidence": 0.95
  },
  {
    "name": "Repeat Purchase Rate",
    "description": "Percentage of customers who made more than one purchase",
    "businessValue": "Core retention metric. High repeat rates indicate product-market fit and customer satisfaction. Cheaper to retain than acquire.",
    "type": "filtered",
    "typeRationale": "Requires counting customers grouped by customer_id with HAVING COUNT > 1 - a group-level condition",
    "entity": "orders",
    "columns": {
      "groupBy": "customer_id",
      "having": "COUNT(*) > 1",
      "percentOf": "customer_id"
    },
    "category": "retention",
    "format": {"type": "percent", "decimals": 1},
    "confidence": 0.90
  }
]
\`\`\`

## Quality Criteria

Before including a KPI:
1. Can it be calculated from the available schema? (don't invent columns)
2. Would an executive find it actionable?
3. Is the type choice correct for the calculation logic?
4. Is the confidence score realistic?

## Critical Rules

1. ONLY reference columns that exist in the schema
2. NEVER include KPIs that can't be calculated
3. Prioritize business value over technical complexity
4. Use exact column names from the schema
5. Set confidence < 0.7 if there are assumptions involved

Return ONLY a valid JSON array. No markdown code blocks, no explanations.`,

  /**
   * Render the prompt with actual values
   */
  render(vars: {
    businessType: string;
    schemaAnalysis: SchemaAnalysis;
    coverageAnalysis: CoverageAnalysis;
    patterns: DetectedPattern[];
    maxKPIs: number;
  }): string {
    const schemaMarkdown = formatSchemaAnalysisForPrompt(vars.schemaAnalysis);
    const coverageMarkdown = formatCoverageForPrompt(vars.coverageAnalysis);
    const patternsMarkdown = formatPatternsForPrompt(vars.patterns);

    return this.template
      .replace(/{businessType}/g, vars.businessType)
      .replace(/{businessType_upper}/g, vars.businessType.toUpperCase())
      .replace(/{schemaAnalysis}/g, schemaMarkdown)
      .replace(/{coverageRequirements}/g, coverageMarkdown)
      .replace(/{detectedPatterns}/g, patternsMarkdown || '(No special patterns detected)')
      .replace(/{maxKPIs}/g, String(vars.maxKPIs));
  },

  /**
   * Changelog for tracking prompt evolution
   */
  changelog: [
    {
      version: '1.0.0',
      date: '2026-01-17',
      changes: 'Initial version - Opus planning prompt for Pipeline V2 cognitive decomposition',
    },
    {
      version: '1.2.0',
      date: '2026-01-18',
      changes: 'Added grain field to column hints for time-series KPIs. Updated examples and rules to require both timeField AND grain for Monthly/Daily/Weekly KPIs.',
    },
  ],
};

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse the Opus response into KPIPlan objects.
 * Handles JSON extraction and basic validation.
 */
export function parseKPIPlanResponse(response: string): unknown[] {
  // Try to extract JSON array from response
  let jsonStr = response.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1]!.trim();
  }

  // Remove any leading/trailing non-JSON content
  const arrayStart = jsonStr.indexOf('[');
  const arrayEnd = jsonStr.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1) {
    jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse KPI plan response: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
