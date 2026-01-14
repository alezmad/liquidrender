/**
 * Schema Repair Prompt
 *
 * Used to repair KPI definitions that fail Zod schema validation.
 * The LLM fixes structural issues like missing fields, wrong types, etc.
 */

export const SCHEMA_REPAIR_PROMPT = {
  name: "schema-repair",
  version: "1.2.0",

  /**
   * Template with placeholders for dynamic content.
   * Placeholders: {originalDefinition}, {zodError}, {schemaContext}
   */
  template: `You are fixing a KPI definition that failed Zod schema validation.

## Original Definition
\`\`\`json
{originalDefinition}
\`\`\`

## Schema Validation Error
{zodError}

{schemaContextSection}

## Task
Fix the schema validation error. The definition structure is invalid.

## Required Structure
A valid KPIRecipe must have:
- name: string (required)
- description: string (required)
- category: string (required) - one of: revenue, growth, retention, engagement, efficiency, custom
- kpiDefinition: object (required) - the DSL definition
- format: object with type field (required)
- businessType: string[] (required)
- confidence: number 0-1 (required)
- feasible: boolean (required)
- requiredColumns: array of objects (required) - each object MUST have:
  - tableName: string (required)
  - columnName: string (required)
  - purpose: string (required) - how this column is used

Example: [{"tableName": "orders", "columnName": "total", "purpose": "revenue amount"}]

## kpiDefinition Types
1. Simple: { type: "simple", aggregation: "SUM|COUNT|...", expression: "column", entity: "table" }
2. Ratio: { type: "ratio", numerator: {aggregation, expression}, denominator: {aggregation, expression}, entity: "table" }
3. Filtered: { type: "filtered", aggregation: "...", expression: "column", subquery: {groupBy: "column", having: "COUNT(*) > 1"}, entity: "table" }
   - subquery.groupBy: string (column name) or string[] (multiple columns)
   - subquery.having: string (SQL HAVING clause condition)
4. Window: { type: "window", window: {lag: {offset: 1}}, outputExpression: "...", entity: "table" }

## Common Fixes
- Missing required field → Add the field
- Wrong type (string vs array) → Convert to correct type
- Invalid enum value → Use valid option
- expression contains SQL → Move SQL to correct field

## Output
Return ONLY the corrected KPI JSON object. No explanation, no markdown.`,

  /**
   * Render the prompt with actual values
   */
  render(vars: {
    originalDefinition: unknown;
    zodError: string;
    schemaContext?: string;
  }): string {
    const schemaContextSection = vars.schemaContext
      ? `## Available Database Schema\n${vars.schemaContext}\n`
      : "";

    return this.template
      .replace("{originalDefinition}", JSON.stringify(vars.originalDefinition, null, 2))
      .replace("{zodError}", vars.zodError)
      .replace("{schemaContextSection}", schemaContextSection);
  },

  /**
   * Changelog for tracking prompt evolution
   */
  changelog: [
    {
      version: "1.2.0",
      date: "2026-01-14",
      changes: "Added explicit subquery structure for filtered KPIs, expanded kpiDefinition type docs",
    },
    {
      version: "1.1.0",
      date: "2026-01-14",
      changes: "Added explicit requiredColumns object structure with example - fixes LLM generating strings instead of objects",
    },
    {
      version: "1.0.0",
      date: "2026-01-14",
      changes: "Initial extraction from recipe-generator.ts buildSchemaRepairPrompt()",
    },
  ],
};
