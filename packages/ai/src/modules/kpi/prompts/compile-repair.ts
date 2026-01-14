/**
 * Compile Repair Prompt
 *
 * Used to repair KPI definitions that fail SQL compilation.
 * The LLM fixes DSL issues that prevent valid SQL generation.
 */

export const COMPILE_REPAIR_PROMPT = {
  name: "compile-repair",
  version: "1.0.0",

  /**
   * Template with placeholders for dynamic content.
   * Placeholders: {kpiDefinition}, {error}, {schemaContext}
   */
  template: `You are fixing a KPI definition that failed compilation.

## Original Definition
\`\`\`json
{kpiDefinition}
\`\`\`

## Compilation Error
{error}

{schemaContextSection}

## Task
Fix the compilation error. The DSL definition doesn't compile to valid SQL.

## Common Fixes
- "expression" must be column name(s) only, NOT SQL functions
  - WRONG: "expression": "COUNT(DISTINCT customer_id)"
  - RIGHT: "aggregation": "COUNT_DISTINCT", "expression": "customer_id"
- For averages/rates, use "type": "ratio" with numerator/denominator
- For percentages, add "multiplier": 100 to ratio type
- For filtered aggregations (e.g., customers with >1 order), use "type": "filtered" with:
  \`\`\`json
  "subquery": { "groupBy": "customer_id", "having": "COUNT(*) > 1" }
  \`\`\`

## Output
Return ONLY the corrected kpiDefinition JSON object. No explanation, no markdown.`,

  /**
   * Render the prompt with actual values
   */
  render(vars: {
    kpiDefinition: unknown;
    error: string;
    schemaContext?: string;
  }): string {
    const schemaContextSection = vars.schemaContext
      ? `## Available Schema\n${vars.schemaContext}\n`
      : "";

    return this.template
      .replace("{kpiDefinition}", JSON.stringify(vars.kpiDefinition, null, 2))
      .replace("{error}", vars.error)
      .replace("{schemaContextSection}", schemaContextSection);
  },

  /**
   * Changelog for tracking prompt evolution
   */
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-14",
      changes: "Initial extraction from recipe-generator.ts buildRepairPrompt()",
    },
  ],
};
