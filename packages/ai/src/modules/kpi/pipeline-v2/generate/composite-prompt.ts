/**
 * Composite KPI Generation Prompt
 *
 * Generates DSL definitions for type='composite' KPIs.
 * Multiple source tables with JOINs.
 */

import type { KPIPlan } from '../types';

export const PROMPT_NAME = 'composite-kpi-generation';
export const PROMPT_VERSION = '1.0.0';

/**
 * Build the prompt for generating composite KPIs.
 *
 * @param plans - KPIPlan[] for composite KPIs
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
   - Sources hint: ${plan.columns.sources?.join(', ') || 'infer from context'}
   - Expression hint: ${plan.columns.expression || 'infer from context'}
   - TimeField hint: ${plan.columns.timeField || 'none (use for time-series KPIs)'}
   - Format: ${plan.format ? `${plan.format.type}${plan.format.decimals !== undefined ? `, ${plan.format.decimals} decimals` : ''}` : 'number'}
`).join('\n');

  return `You are a KPI DSL generator specializing in COMPOSITE KPIs.

## Your Task
Generate DSL definitions for ${plans.length} composite KPI(s). Composite KPIs aggregate data across multiple tables using JOINs.

## Available Schema
${schemaContext}

## KPIs to Generate
${planDescriptions}

## Composite KPI Structure
\`\`\`typescript
{
  type: 'composite',
  aggregation: 'SUM' | 'COUNT' | 'COUNT_DISTINCT' | 'AVG' | 'MIN' | 'MAX',
  expression: string,  // Expression using table aliases (e.g., "o.amount")
  sources: Array<{
    alias: string,     // Short alias (e.g., "o", "c", "p")
    table: string,     // Table name
    schema?: string,   // Optional schema name
    join?: {
      type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL',
      on: string       // JOIN condition (e.g., "o.customer_id = c.id")
    }
  }>,
  groupBy?: string[],  // Optional: columns to group by
  entity: string,      // Primary entity (first source table)
  timeField?: string,
  filters?: Array<{ field: string, operator: string, value?: unknown }>
}
\`\`\`

## Examples

**Example 1: Revenue by Customer Region**
\`\`\`json
{
  "type": "composite",
  "aggregation": "SUM",
  "expression": "od.unit_price * od.quantity",
  "sources": [
    { "alias": "od", "table": "order_details" },
    { "alias": "o", "table": "orders", "join": { "type": "INNER", "on": "od.order_id = o.order_id" } },
    { "alias": "c", "table": "customers", "join": { "type": "INNER", "on": "o.customer_id = c.customer_id" } }
  ],
  "groupBy": ["c.region"],
  "entity": "order_details"
}
\`\`\`

**Example 2: Average Order Value by Category**
\`\`\`json
{
  "type": "composite",
  "aggregation": "AVG",
  "expression": "od.unit_price * od.quantity",
  "sources": [
    { "alias": "od", "table": "order_details" },
    { "alias": "p", "table": "products", "join": { "type": "INNER", "on": "od.product_id = p.product_id" } },
    { "alias": "cat", "table": "categories", "join": { "type": "INNER", "on": "p.category_id = cat.category_id" } }
  ],
  "groupBy": ["cat.category_name"],
  "entity": "order_details"
}
\`\`\`

**Example 3: Supplier Performance Score**
\`\`\`json
{
  "type": "composite",
  "aggregation": "COUNT_DISTINCT",
  "expression": "o.order_id",
  "sources": [
    { "alias": "o", "table": "orders" },
    { "alias": "od", "table": "order_details", "join": { "type": "INNER", "on": "o.order_id = od.order_id" } },
    { "alias": "p", "table": "products", "join": { "type": "INNER", "on": "od.product_id = p.product_id" } },
    { "alias": "s", "table": "suppliers", "join": { "type": "INNER", "on": "p.supplier_id = s.supplier_id" } }
  ],
  "groupBy": ["s.company_name"],
  "entity": "orders"
}
\`\`\`

## Rules
1. **sources** must include all tables needed for the calculation
2. First source has no join (it's the base table)
3. Each subsequent source must have a **join** with type and on condition
4. Use table aliases in expression and groupBy (e.g., "o.amount", not "orders.amount")
5. **entity** should be the primary/base table (first in sources)
6. Only use columns and tables that exist in the schema
7. Use appropriate JOIN types:
   - INNER: when both sides must exist
   - LEFT: when right side may be null
   - RIGHT: rarely needed (prefer LEFT)
   - FULL: when either side may be null

## Output Format
Return a JSON array with one object per KPI. Each object must have:
- name: string (exact name from the plan)
- definition: object (the DSL definition)
- metadata: { name, description, category, format }

\`\`\`json
[
  {
    "name": "Revenue by Customer Region",
    "definition": {
      "type": "composite",
      "aggregation": "SUM",
      "expression": "od.unit_price * od.quantity",
      "sources": [
        { "alias": "od", "table": "order_details" },
        { "alias": "o", "table": "orders", "join": { "type": "INNER", "on": "od.order_id = o.order_id" } },
        { "alias": "c", "table": "customers", "join": { "type": "INNER", "on": "o.customer_id = c.customer_id" } }
      ],
      "groupBy": ["c.region"],
      "entity": "order_details"
    },
    "metadata": {
      "name": "Revenue by Customer Region",
      "description": "Total revenue grouped by customer region",
      "category": "revenue",
      "format": { "type": "currency", "decimals": 2 }
    }
  }
]
\`\`\`

Return ONLY valid JSON. No markdown, no explanation.`;
}
