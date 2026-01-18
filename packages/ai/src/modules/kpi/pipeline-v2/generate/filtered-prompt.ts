/**
 * Filtered KPI Generation Prompt
 *
 * Generates DSL definitions for type='filtered' KPIs.
 * Subquery with groupBy + having, optional percentOf.
 */

import type { KPIPlan } from '../types';

export const PROMPT_NAME = 'filtered-kpi-generation';
export const PROMPT_VERSION = '1.1.0';

/**
 * Build the prompt for generating filtered KPIs.
 *
 * @param plans - KPIPlan[] for filtered KPIs
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
   - GroupBy hint: ${plan.columns.groupBy || 'infer from context'}
   - Having hint: ${plan.columns.having || 'infer from context'}
   - PercentOf hint: ${plan.columns.percentOf || 'required if format is percent'}
   - Format: ${plan.format ? `${plan.format.type}${plan.format.decimals !== undefined ? `, ${plan.format.decimals} decimals` : ''}` : 'number'}
`).join('\n');

  return `You are a KPI DSL generator specializing in FILTERED KPIs.

## Your Task
Generate DSL definitions for ${plans.length} filtered KPI(s). Filtered KPIs use subqueries with GROUP BY and HAVING to identify entities matching certain conditions.

## Available Schema
${schemaContext}

## KPIs to Generate
${planDescriptions}

## Filtered KPI Structure
\`\`\`typescript
{
  type: 'filtered',
  aggregation: 'COUNT' | 'COUNT_DISTINCT' | 'SUM' | 'AVG',
  expression: string,        // Column to aggregate (usually same as groupBy)
  subquery: {
    groupBy: string | string[],  // REQUIRED: Column(s) to group by
    having: string,              // REQUIRED: HAVING condition (e.g., "COUNT(*) > 1")
    subqueryEntity?: string      // Optional: different table for subquery
  },
  percentOf?: string,        // CRITICAL: Required when format.type = 'percent'
  entity: string,
  timeField?: string,
  filters?: Array<{ field: string, operator: string, value?: unknown }>
}
\`\`\`

## Examples

**Example 1: Repeat Purchase Rate (percentage of customers with >1 order)**
\`\`\`json
{
  "type": "filtered",
  "aggregation": "COUNT_DISTINCT",
  "expression": "customer_id",
  "subquery": {
    "groupBy": "customer_id",
    "having": "COUNT(*) > 1"
  },
  "percentOf": "customer_id",
  "entity": "orders"
}
\`\`\`

**Example 2: High-Value Customers Count (customers spending > $1000)**
\`\`\`json
{
  "type": "filtered",
  "aggregation": "COUNT_DISTINCT",
  "expression": "customer_id",
  "subquery": {
    "groupBy": "customer_id",
    "having": "SUM(total_amount) > 1000"
  },
  "entity": "orders"
}
\`\`\`

**Example 3: Multi-Order Products % (products ordered more than 5 times)**
\`\`\`json
{
  "type": "filtered",
  "aggregation": "COUNT_DISTINCT",
  "expression": "product_id",
  "subquery": {
    "groupBy": "product_id",
    "having": "COUNT(*) > 5"
  },
  "percentOf": "product_id",
  "entity": "order_details"
}
\`\`\`

## CRITICAL RULES

1. **subquery.groupBy is REQUIRED** - Must specify which column to group by
2. **subquery.having is REQUIRED** - The condition to apply (e.g., "COUNT(*) > 1")
3. **percentOf is REQUIRED when format.type = 'percent'**
   - Without percentOf: returns raw count (e.g., 772 repeat customers)
   - With percentOf: returns percentage (e.g., 58.3% repeat rate)
   - percentOf should reference the SAME column as expression for proper percentage calculation
4. groupBy and expression should typically match (both are the entity identifier)
5. The having clause uses SQL syntax: COUNT(*), SUM(column), etc.
6. Only use columns that exist in the schema
7. **Percentage Calculation**: When format.type = 'percent', ensure percentOf matches expression
   - ✅ CORRECT: expression: "customer_id", percentOf: "customer_id" → (filtered customers / total customers) * 100
   - ❌ WRONG: expression: "customer_id", percentOf: "order_id" → comparing apples to oranges
8. **Grain Awareness**: Aggregations in HAVING must reference columns at the grouped entity's grain
   - If groupBy: "customer_id", HAVING can use COUNT(order_id), SUM(total), etc. from that customer's rows

## When to Use Filtered KPIs
Use type='filtered' when you need to:
- Group by an entity (like customer_id, product_id)
- Apply a HAVING condition (like COUNT(*) > 1)
- Count distinct entities matching the having condition

**DO NOT use filtered for row-level conditions** - Use ratio with filterCondition instead.
Example: "On-Time Delivery Rate" should be ratio, NOT filtered.

## Output Format
Return a JSON array with one object per KPI. Each object must have:
- name: string (exact name from the plan)
- definition: object (the DSL definition)
- metadata: { name, description, category, format }

\`\`\`json
[
  {
    "name": "Repeat Purchase Rate",
    "definition": {
      "type": "filtered",
      "aggregation": "COUNT_DISTINCT",
      "expression": "customer_id",
      "subquery": {
        "groupBy": "customer_id",
        "having": "COUNT(*) > 1"
      },
      "percentOf": "customer_id",
      "entity": "orders"
    },
    "metadata": {
      "name": "Repeat Purchase Rate",
      "description": "Percentage of customers with more than one order",
      "category": "retention",
      "format": { "type": "percent", "decimals": 1 }
    }
  }
]
\`\`\`

Return ONLY valid JSON. No markdown, no explanation.`;
}
