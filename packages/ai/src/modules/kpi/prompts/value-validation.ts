/**
 * KPI Value Validation Prompt
 *
 * Used to validate if computed KPI values from real data make business sense.
 * The LLM acts as a sanity checker for unrealistic or suspicious values.
 */

export const VALUE_VALIDATION_PROMPT = {
  name: "kpi-value-validation",
  version: "1.0.0",

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

1. **VALID** - Value is realistic for this metric type
2. **SUSPICIOUS** - Value seems off but might be explainable
3. **INVALID** - Value is clearly wrong (calculation error, data issue)

## Validation Criteria
- Percentages should be 0-100% (unless it's a growth rate)
- Monetary values should be positive (unless tracking losses)
- Counts should be non-negative integers
- Rates/ratios should be reasonable for the business type
- Check for common errors: off-by-100x (forgot to multiply by 100), division issues, NULL contamination

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
