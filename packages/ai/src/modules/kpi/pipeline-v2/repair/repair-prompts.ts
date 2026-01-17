/**
 * KPI Repair Prompts - Escalating Model Repair
 *
 * Three-tier repair system:
 * - Haiku: Quick syntax fixes (90% of repairs)
 * - Sonnet: Approach rethinking (9% of repairs)
 * - Opus: Deep reasoning for edge cases (1% of repairs)
 *
 * Each prompt is versioned and includes the context needed
 * for effective repair.
 */

import type { ValidationResult, RepairAttempt } from '../types';

// ============================================================================
// Haiku Repair Prompt - Quick Fixes (90% of cases)
// ============================================================================

export const HAIKU_REPAIR_PROMPT_NAME = 'kpi-repair-haiku';
export const HAIKU_REPAIR_PROMPT_VERSION = '1.0.0';

/**
 * Build Haiku repair prompt for quick syntax fixes.
 *
 * Haiku is fast and cheap, ideal for:
 * - Missing required fields
 * - Simple type corrections
 * - Syntax errors in expressions
 * - Wrong aggregation type
 */
export function buildHaikuRepairPrompt(
  failed: ValidationResult,
  schemaContext: string
): string {
  const { generation, errors } = failed;
  const errorMessages = errors.map((e) => `- ${e.stage}: ${e.message}`).join('\n');

  return `Fix this KPI definition. The error is straightforward.

## KPI Name
${generation.metadata.name}

## Original Plan
${JSON.stringify(generation.plan, null, 2)}

## Failed Definition
\`\`\`json
${JSON.stringify(generation.definition, null, 2)}
\`\`\`

## Errors
${errorMessages}

## Available Schema
${schemaContext}

## Quick Fix Rules
- "expression" must be column name(s) only, NOT SQL functions
  - WRONG: "expression": "COUNT(DISTINCT customer_id)"
  - RIGHT: "aggregation": "COUNT_DISTINCT", "expression": "customer_id"
- For ratios/averages, use "type": "ratio" with numerator/denominator
- For percentages, add "multiplier": 100 to ratio definitions
- For filtered aggregations (e.g., customers with >1 order), use "type": "filtered" with:
  "subquery": { "groupBy": "customer_id", "having": "COUNT(*) > 1" }
- Filtered KPIs with percent format MUST have "percentOf" field
- Entity must match an actual table name from the schema
- All column names must exist in the specified entity

## Output
Return ONLY the corrected kpiDefinition JSON object. No explanation, no markdown.`;
}

// ============================================================================
// Sonnet Repair Prompt - Rethink Approach (9% of cases)
// ============================================================================

export const SONNET_REPAIR_PROMPT_NAME = 'kpi-repair-sonnet';
export const SONNET_REPAIR_PROMPT_VERSION = '1.0.0';

/**
 * Build Sonnet repair prompt for approach rethinking.
 *
 * Sonnet has more reasoning capability, ideal when Haiku fails:
 * - Wrong KPI type chosen
 * - Need different aggregation strategy
 * - Requires understanding business logic
 * - Multiple failed attempts indicate structural issues
 */
export function buildSonnetRepairPrompt(
  failed: ValidationResult,
  previousAttempts: RepairAttempt[],
  schemaContext: string
): string {
  const { generation, errors } = failed;
  const errorMessages = errors.map((e) => `- ${e.stage}: ${e.message}`).join('\n');

  // Format previous attempts for context
  const attemptsSummary = previousAttempts
    .map((attempt, i) => {
      const status = attempt.success ? 'SUCCESS' : 'FAILED';
      const error = attempt.error ? `: ${attempt.error}` : '';
      return `Attempt ${i + 1} (${attempt.tier})${error} - ${status}`;
    })
    .join('\n');

  return `The previous repair attempts failed. Rethink the approach for this KPI.

## KPI Name
${generation.metadata.name}

## Business Goal
${generation.plan.description}
**Why it matters:** ${generation.plan.businessValue}

## Original Plan
Type chosen: ${generation.plan.type}
Rationale: ${generation.plan.typeRationale}
\`\`\`json
${JSON.stringify(generation.plan.columns, null, 2)}
\`\`\`

## Failed Definition
\`\`\`json
${JSON.stringify(generation.definition, null, 2)}
\`\`\`

## Current Errors
${errorMessages}

## Previous Repair Attempts
${attemptsSummary || 'None yet'}

## Available Schema
${schemaContext}

## Rethink Strategy
The simple fixes didn't work. Consider:

1. **Wrong Type?** Maybe a different KPI type is more appropriate:
   - "simple" for single aggregations (SUM, COUNT, AVG)
   - "ratio" for numerator/denominator calculations or row-level filtered rates
   - "filtered" for GROUP BY + HAVING conditions (e.g., repeat customers)
   - "window" for period comparisons using LAG/LEAD

2. **Wrong Columns?** Check if:
   - The entity exists in the schema
   - Column names are spelled correctly
   - The data types make sense for the aggregation

3. **Ratio vs Filtered?** Key distinction:
   - Use "ratio" with filterCondition for ROW-LEVEL conditions (shipped_date <= required_date)
   - Use "filtered" with subquery for GROUP-LEVEL conditions (COUNT(*) > 1)

4. **Missing Fields?** Ensure:
   - "percentOf" is present for percentage KPIs with type="filtered"
   - "subquery.groupBy" and "subquery.having" are both present for filtered KPIs

## Output
Return ONLY the corrected kpiDefinition JSON object with the rethought approach.
No explanation, no markdown.`;
}

// ============================================================================
// Opus Repair Prompt - Deep Reasoning (1% of cases)
// ============================================================================

export const OPUS_REPAIR_PROMPT_NAME = 'kpi-repair-opus';
export const OPUS_REPAIR_PROMPT_VERSION = '1.0.0';

/**
 * Build Opus repair prompt for deep reasoning on edge cases.
 *
 * Opus is the most capable model, reserved for:
 * - Unusual schema patterns
 * - Complex business logic
 * - Cases where simpler models repeatedly fail
 * - First-principles reasoning needed
 */
export function buildOpusRepairPrompt(
  failed: ValidationResult,
  previousAttempts: RepairAttempt[],
  schemaContext: string
): string {
  const { generation, errors } = failed;
  const errorMessages = errors.map((e) => {
    let detail = `- **${e.stage}**: ${e.message}`;
    if (e.context) {
      if (e.context.field) detail += `\n  Field: ${e.context.field}`;
      if (e.context.expected) detail += `\n  Expected: ${e.context.expected}`;
      if (e.context.actual) detail += `\n  Actual: ${e.context.actual}`;
      if (e.context.sql) detail += `\n  SQL: ${e.context.sql}`;
      if (e.context.dbError) detail += `\n  DB Error: ${e.context.dbError}`;
    }
    return detail;
  }).join('\n');

  // Detailed previous attempts for learning
  const attemptsDetail = previousAttempts
    .map((attempt, i) => {
      const defJson = attempt.repairedDefinition
        ? JSON.stringify(attempt.repairedDefinition, null, 2)
        : 'N/A';
      return `### Attempt ${i + 1} (${attempt.tier})
**Result:** ${attempt.success ? 'SUCCESS' : 'FAILED'}
**Error:** ${attempt.error || 'None'}
**Definition tried:**
\`\`\`json
${defJson}
\`\`\``;
    })
    .join('\n\n');

  return `This is an unusual case that requires deep reasoning. Multiple repair attempts have failed.

## KPI Overview
**Name:** ${generation.metadata.name}
**Description:** ${generation.plan.description}
**Business Value:** ${generation.plan.businessValue}
**Category:** ${generation.plan.category}

## Original Plan
\`\`\`json
${JSON.stringify(generation.plan, null, 2)}
\`\`\`

## Current Definition (Failing)
\`\`\`json
${JSON.stringify(generation.definition, null, 2)}
\`\`\`

## Detailed Errors
${errorMessages}

## Previous Repair Attempts (All Failed)
${attemptsDetail || 'None yet'}

## Database Schema
${schemaContext}

## Deep Analysis Required

Reason from first principles:

1. **What exactly is this KPI trying to measure?**
   - Break down the business logic step by step
   - What data is needed?
   - What aggregations are required?

2. **Is the calculation even possible with this schema?**
   - Do the required columns exist?
   - Are the data types compatible?
   - Are there missing relationships?

3. **Why did previous approaches fail?**
   - Pattern in the errors?
   - Fundamental misunderstanding of the data?
   - Edge case in the schema?

4. **What's the simplest correct approach?**
   - Start from the SQL you would write manually
   - Map that to the DSL structure
   - Choose the KPI type that most naturally fits

## KPI Type Reference

### Simple
Single aggregation: \`{ type: "simple", aggregation: "SUM", expression: "amount", entity: "orders" }\`

### Ratio
Two aggregations divided:
\`\`\`json
{
  "type": "ratio",
  "numerator": { "aggregation": "COUNT", "expression": "*", "filterCondition": "status = 'completed'" },
  "denominator": { "aggregation": "COUNT", "expression": "*" },
  "multiplier": 100,
  "entity": "orders"
}
\`\`\`

### Filtered (with subquery)
For GROUP BY + HAVING patterns:
\`\`\`json
{
  "type": "filtered",
  "aggregation": "COUNT_DISTINCT",
  "expression": "customer_id",
  "subquery": { "groupBy": "customer_id", "having": "COUNT(*) > 1" },
  "percentOf": "customer_id",
  "entity": "orders"
}
\`\`\`

### Window
For period comparisons:
\`\`\`json
{
  "type": "window",
  "aggregation": "SUM",
  "expression": "revenue",
  "window": {
    "partitionBy": [],
    "orderBy": [{ "field": "month", "direction": "asc" }],
    "lag": { "offset": 1 }
  },
  "outputExpression": "(current - lag) / NULLIF(lag, 0) * 100",
  "entity": "monthly_revenue"
}
\`\`\`

## Output
Return ONLY the corrected kpiDefinition JSON object.
If this KPI truly cannot be calculated from the available schema, return:
\`\`\`json
{ "infeasible": true, "reason": "Explanation of why this cannot be calculated" }
\`\`\`

No explanation outside the JSON, no markdown code blocks.`;
}

// ============================================================================
// Prompt Changelog
// ============================================================================

export const REPAIR_PROMPTS_CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-01-17',
    changes: 'Initial implementation of escalating repair prompts for Pipeline V2',
  },
];
