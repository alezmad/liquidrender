/**
 * Simple KPI Generation Prompt
 *
 * Generates DSL definitions for type='simple' KPIs.
 * Single aggregation (SUM, COUNT, AVG, MIN, MAX, COUNT_DISTINCT).
 */

import type { KPIPlan } from '../types';

export const PROMPT_NAME = 'simple-kpi-generation';
export const PROMPT_VERSION = '1.1.0';

/**
 * Build the prompt for generating simple KPIs.
 *
 * @param plans - KPIPlan[] for simple KPIs
 * @param schemaContext - Schema markdown context
 * @returns Complete prompt string
 */
export function buildPrompt(plans: KPIPlan[], schemaContext: string): string {
  const planDescriptions = plans.map((plan, i) => `
${i + 1}. **${plan.name}**
   - Description: ${plan.description}
   - Business value: ${plan.businessValue}
   - Entity: ${plan.entity}
   - Category: ${plan.category}
   - Aggregation hint: ${plan.aggregation || 'infer from context'}
   - Expression hint: ${plan.columns.expression || 'infer from context'}
   - TimeField hint: ${plan.columns.timeField || 'none (use for time-series KPIs)'}
   - Format: ${plan.format ? `${plan.format.type}${plan.format.decimals !== undefined ? `, ${plan.format.decimals} decimals` : ''}` : 'number'}
`).join('\n');

  return `You are a KPI DSL generator specializing in SIMPLE KPIs.

## Your Task
Generate DSL definitions for ${plans.length} simple KPI(s). Simple KPIs use a single aggregation function on a column or expression.

## Available Schema
${schemaContext}

## KPIs to Generate
${planDescriptions}

## Simple KPI Structure
\`\`\`typescript
{
  type: 'simple',
  aggregation: 'SUM' | 'COUNT' | 'COUNT_DISTINCT' | 'AVG' | 'MIN' | 'MAX',
  expression: string,  // Column name or arithmetic expression (e.g., "unit_price * quantity")
  entity: string,      // Source table
  timeField?: string,  // Optional timestamp column
  filters?: Array<{ field: string, operator: string, value?: unknown }>
}
\`\`\`

## Examples

**Example 1: Total Revenue**
\`\`\`json
{
  "type": "simple",
  "aggregation": "SUM",
  "expression": "unit_price * quantity",
  "entity": "order_details",
  "timeField": "order_date"
}
\`\`\`

**Example 2: Order Count**
\`\`\`json
{
  "type": "simple",
  "aggregation": "COUNT_DISTINCT",
  "expression": "order_id",
  "entity": "orders",
  "timeField": "order_date"
}
\`\`\`

**Example 3: Average Order Value**
\`\`\`json
{
  "type": "simple",
  "aggregation": "AVG",
  "expression": "unit_price * quantity",
  "entity": "order_details"
}
\`\`\`

## Rules
1. **expression** = column name or arithmetic expression only (NO SQL functions)
2. **aggregation** handles the SQL function (SUM, COUNT, etc.)
3. Use COUNT(*) via: aggregation: "COUNT", expression: "*"
4. Use COUNT DISTINCT via: aggregation: "COUNT_DISTINCT", expression: "column_name"
5. Only use columns that exist in the schema
6. **CRITICAL - Time-series KPIs**: If KPI name contains "Monthly", "Daily", "Weekly", "Quarterly", or "Trend", you MUST include timeField
   - Without timeField: "Monthly Revenue Trend" will equal "Total Revenue" (no time grouping)
   - With timeField: The compiler will add proper DATE_TRUNC/GROUP BY logic
   - Example: { "type": "simple", "aggregation": "SUM", "expression": "amount", "entity": "orders", "timeField": "order_date" }
7. **Grain Awareness**: Ensure expression matches the entity's natural grain
   - For order-level metrics: Use order table, aggregate order columns
   - For line-item metrics: Use order_details/line_items table, aggregate quantities
   - Don't mix: SUM(order_details.quantity) should be on order_details entity, not orders

## Output Format
Return a JSON array with one object per KPI. Each object must have:
- name: string (exact name from the plan)
- definition: object (the DSL definition)
- metadata: { name, description, category, format }

\`\`\`json
[
  {
    "name": "Total Revenue",
    "definition": {
      "type": "simple",
      "aggregation": "SUM",
      "expression": "unit_price * quantity",
      "entity": "order_details"
    },
    "metadata": {
      "name": "Total Revenue",
      "description": "Total revenue from all orders",
      "category": "revenue",
      "format": { "type": "currency", "decimals": 2 }
    }
  }
]
\`\`\`

Return ONLY valid JSON. No markdown, no explanation.`;
}
