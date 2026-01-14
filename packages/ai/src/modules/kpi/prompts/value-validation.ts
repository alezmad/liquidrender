/**
 * KPI Value Validation Prompt
 *
 * Used to validate if computed KPI values from real data make business sense.
 * The LLM acts as a sanity checker for unrealistic or suspicious values.
 */

export const VALUE_VALIDATION_PROMPT = {
  name: "kpi-value-validation",
  version: "1.1.0",

  /**
   * Template for validating KPI values against business expectations.
   */
  template: `You are a senior data analyst reviewing KPI values computed from real business data.

## Business Context
{businessType} business

## KPIs to Validate
{kpiResults}

## Your Task
For each KPI, determine if the value makes business sense:

1. **VALID** - Value is realistic for this metric type AND business context
2. **SUSPICIOUS** - Value seems off but might be explainable given context
3. **INVALID** - Value is clearly wrong (calculation error, data issue)

## Business Type Context (affects what's "normal")

**B2B / Wholesale:**
- Average Order Value: $500-5000 is NORMAL (large bulk orders)
- Items per order: 5-50 is NORMAL (multiple products per shipment)
- Discount rates: 0-25% is typical

**B2C / Retail / Ecommerce:**
- Average Order Value: $50-200 is NORMAL
- Items per order: 1-5 is NORMAL
- Discount rates: 0-30% is typical

**SaaS:**
- MRR/ARR metrics dominate
- Churn rate: 2-8% monthly is typical

## Sanity Bounds (flag if outside these ranges)

| KPI Type | Normal Range | Flag If |
|----------|--------------|---------|
| Items per order | 1-20 | > 50 (likely SUM(qty) confusion) |
| Discount rate | 0-50% | > 100% or < 0% |
| Conversion rate | 1-10% | > 50% |
| Repeat purchase rate | 10-60% | > 95% or < 1% |
| Monetary totals | > 0 | Negative (unless tracking losses) |

## Common Calculation Errors to Detect
- **Off-by-100x**: Forgot to multiply by 100 for percentages
- **Items vs Quantity confusion**: Using SUM(quantity) instead of COUNT(*) for "items per order"
- **Percentage columns misread**: Discount stored as 0.05 treated as $0.05 instead of 5%
- **Division issues**: Dividing by zero or wrong denominator
- **NULL contamination**: Aggregations affected by NULL values

## Output Format
Return a JSON array:
[
  {
    "kpiName": "name",
    "value": <computed_value>,
    "status": "VALID" | "SUSPICIOUS" | "INVALID",
    "reasoning": "brief explanation",
    "suggestedFix": "if invalid, what might be wrong"
  }
]

Return ONLY valid JSON, no markdown.`,

  /**
   * Render the prompt with actual values
   */
  render(vars: {
    businessType: string;
    kpiResults: Array<{
      name: string;
      description: string;
      value: number | string | null;
      sql?: string;
    }>;
  }): string {
    const kpiResultsFormatted = vars.kpiResults
      .map((kpi, i) => `${i + 1}. **${kpi.name}**
   Description: ${kpi.description}
   Computed Value: ${kpi.value === null ? "NULL" : kpi.value}
   ${kpi.sql ? `SQL: ${kpi.sql.substring(0, 100)}...` : ""}`)
      .join("\n\n");

    return this.template
      .replace("{businessType}", vars.businessType)
      .replace("{kpiResults}", kpiResultsFormatted);
  },

  /**
   * Changelog for tracking prompt evolution
   */
  changelog: [
    {
      version: "1.1.0",
      date: "2026-01-14",
      changes: "Added business type context (B2B vs B2C ranges), sanity bounds table, common calculation errors detection",
    },
    {
      version: "1.0.0",
      date: "2026-01-14",
      changes: "Initial version for KPI value sanity checking",
    },
  ],
};

/**
 * Schema for validation result
 */
export interface KPIValueValidation {
  kpiName: string;
  value: number | string | null;
  status: "VALID" | "SUSPICIOUS" | "INVALID";
  reasoning: string;
  suggestedFix?: string;
}
