/**
 * Ratio KPI Generation Prompt
 *
 * Generates DSL definitions for type='ratio' KPIs.
 * Numerator/denominator with aggregations, optional multiplier.
 */

import type { KPIPlan } from '../types';

export const PROMPT_NAME = 'ratio-kpi-generation';
export const PROMPT_VERSION = '1.0.0';

/**
 * Build the prompt for generating ratio KPIs.
 *
 * @param plans - KPIPlan[] for ratio KPIs
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
   - Numerator hint: ${plan.columns.numerator || 'infer from context'}
   - Denominator hint: ${plan.columns.denominator || 'infer from context'}
   - Format: ${plan.format ? `${plan.format.type}${plan.format.decimals !== undefined ? `, ${plan.format.decimals} decimals` : ''}` : 'number'}
`).join('\n');

  return `You are a KPI DSL generator specializing in RATIO KPIs.

## Your Task
Generate DSL definitions for ${plans.length} ratio KPI(s). Ratio KPIs calculate numerator divided by denominator, with optional multiplier.

## Available Schema
${schemaContext}

## KPIs to Generate
${planDescriptions}

## Ratio KPI Structure
\`\`\`typescript
{
  type: 'ratio',
  numerator: {
    aggregation: 'SUM' | 'COUNT' | 'COUNT_DISTINCT' | 'AVG' | 'MIN' | 'MAX',
    expression: string,
    filterCondition?: string  // Optional SQL condition for filtered aggregation
  },
  denominator: {
    aggregation: 'SUM' | 'COUNT' | 'COUNT_DISTINCT' | 'AVG' | 'MIN' | 'MAX',
    expression: string,
    filterCondition?: string
  },
  multiplier?: number,  // e.g., 100 for percentages
  entity: string,
  timeField?: string,
  filters?: Array<{ field: string, operator: string, value?: unknown }>
}
\`\`\`

## Examples

**Example 1: Conversion Rate (percentage)**
\`\`\`json
{
  "type": "ratio",
  "numerator": {
    "aggregation": "COUNT",
    "expression": "*",
    "filterCondition": "status = 'completed'"
  },
  "denominator": {
    "aggregation": "COUNT",
    "expression": "*"
  },
  "multiplier": 100,
  "entity": "orders"
}
\`\`\`

**Example 2: Average Order Value**
\`\`\`json
{
  "type": "ratio",
  "numerator": {
    "aggregation": "SUM",
    "expression": "unit_price * quantity"
  },
  "denominator": {
    "aggregation": "COUNT_DISTINCT",
    "expression": "order_id"
  },
  "entity": "order_details"
}
\`\`\`

**Example 3: On-Time Delivery Rate**
\`\`\`json
{
  "type": "ratio",
  "numerator": {
    "aggregation": "COUNT",
    "expression": "*",
    "filterCondition": "shipped_date <= required_date"
  },
  "denominator": {
    "aggregation": "COUNT",
    "expression": "*",
    "filterCondition": "shipped_date IS NOT NULL"
  },
  "multiplier": 100,
  "entity": "orders"
}
\`\`\`

## Rules
1. **numerator** and **denominator** each need aggregation + expression
2. Use **filterCondition** for row-level filtering (WHERE-like conditions)
3. Use **multiplier: 100** for percentages
4. expression = column name or arithmetic expression (NO SQL functions)
5. Only use columns that exist in the schema
6. For rate calculations, ensure denominator cannot be zero (use appropriate filters)

## Output Format
Return a JSON array with one object per KPI. Each object must have:
- name: string (exact name from the plan)
- definition: object (the DSL definition)
- metadata: { name, description, category, format }

\`\`\`json
[
  {
    "name": "Average Order Value",
    "definition": {
      "type": "ratio",
      "numerator": { "aggregation": "SUM", "expression": "unit_price * quantity" },
      "denominator": { "aggregation": "COUNT_DISTINCT", "expression": "order_id" },
      "entity": "order_details"
    },
    "metadata": {
      "name": "Average Order Value",
      "description": "Average revenue per order",
      "category": "revenue",
      "format": { "type": "currency", "decimals": 2 }
    }
  }
]
\`\`\`

Return ONLY valid JSON. No markdown, no explanation.`;
}
