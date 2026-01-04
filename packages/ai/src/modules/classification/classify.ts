/**
 * LLM-based Metric Classification Intelligence
 *
 * Provides semantic understanding of field types beyond simple heuristics.
 * Catches edge cases that rule-based systems miss.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Input types
export interface FieldToClassify {
  name: string;
  tableName: string;
  dataType: string;
  isNumeric: boolean;
  isText: boolean;
  isTimestamp: boolean;
  isBoolean: boolean;
  cardinality?: number;
  nullPercentage?: number;
  sampleValues?: unknown[];
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

// Response schema
const classificationSchema = z.object({
  type: z.enum(["metric", "dimension", "time_dimension", "filter", "identifier", "ignore"])
    .describe("Primary classification"),
  confidence: z.number().min(0).max(1)
    .describe("Confidence in this classification"),
  reasoning: z.string()
    .describe("Why this classification was chosen"),
  suggestedAggregation: z.enum(["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX", "NONE"])
    .optional()
    .describe("For metrics, recommended aggregation"),
  suggestedFormula: z.string().optional()
    .describe("For calculated metrics, suggested formula"),
  granularities: z.array(z.enum(["day", "week", "month", "quarter", "year"])).optional()
    .describe("For time dimensions, supported granularities"),
});

const batchClassificationSchema = z.record(z.string(), classificationSchema);

export type FieldClassification = z.infer<typeof classificationSchema>;

/**
 * Classify fields in batch (cost-efficient)
 */
export async function classifyFieldsBatch(
  fields: FieldToClassify[],
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
    businessType?: string;
  } = {}
): Promise<Record<string, FieldClassification>> {
  const { model = "haiku", maxTokens = 2000, businessType = "Unknown" } = options;

  // Batch process (max 25 at a time)
  const batchSize = 25;
  const batches: FieldToClassify[][] = [];

  for (let i = 0; i < fields.length; i += batchSize) {
    batches.push(fields.slice(i, i + batchSize));
  }

  const results: Record<string, FieldClassification> = {};

  for (const batch of batches) {
    const batchResult = await classifyBatch(batch, { model, maxTokens, businessType });
    Object.assign(results, batchResult);
  }

  return results;
}

/**
 * Internal: Classify a single batch
 */
async function classifyBatch(
  fields: FieldToClassify[],
  options: {
    model: "haiku" | "sonnet";
    maxTokens: number;
    businessType: string;
  }
): Promise<Record<string, FieldClassification>> {
  const { model, maxTokens, businessType } = options;

  // Prepare field info
  const fieldInfo = fields.map(f => ({
    name: f.name,
    table: f.tableName,
    dataType: f.dataType,
    isNumeric: f.isNumeric,
    isText: f.isText,
    isTimestamp: f.isTimestamp,
    isBoolean: f.isBoolean,
    cardinality: f.cardinality,
    nullPct: f.nullPercentage,
    sampleValues: f.sampleValues?.slice(0, 3),
    isPK: f.isPrimaryKey,
    isFK: f.isForeignKey,
  }));

  const prompt = `Classify these database fields for a ${businessType} business.

**Fields:**
${JSON.stringify(fieldInfo, null, 2)}

**Classification Types:**
1. **metric**: Quantitative measure (revenue, count, duration)
   - Numeric values you aggregate (SUM, AVG, COUNT, etc.)
   - Example: total_revenue, order_count, session_duration

2. **dimension**: Categorical attribute for grouping/filtering
   - Text fields, enums, low-cardinality strings
   - Example: status, country, product_category, user_role

3. **time_dimension**: Time-based field for trend analysis
   - Timestamps, dates (created_at, updated_at, order_date)
   - Suggest granularities (day, week, month, quarter, year)

4. **filter**: Boolean or flag fields for filtering
   - is_active, has_subscription, is_deleted
   - Typically boolean or low-cardinality (2-5 values)

5. **identifier**: Primary/foreign keys, unique IDs
   - High cardinality (>90% unique)
   - Example: user_id, order_id, uuid

6. **ignore**: Fields not useful for analysis
   - Internal system fields, audit logs, serialized data
   - Example: updated_by, internal_notes, raw_json

**Edge Cases to Handle:**
- "created_at" → time_dimension (NOT metric, even though it's numeric)
- "status_code" → dimension (NOT metric, even though it's numeric - it's categorical)
- "revenue_per_customer" → metric with suggested formula "SUM(revenue) / COUNT_DISTINCT(customer_id)"
- "is_active" → filter (NOT dimension - it's a boolean flag)
- "user_id" → identifier (high cardinality >90% unique)

**Instructions:**
1. Consider semantic meaning, not just data type
2. Check cardinality: >90% unique = identifier, <100 values = dimension/filter
3. For metrics, suggest appropriate aggregation
4. For time fields, suggest granularities
5. For calculated metrics, suggest formulas if possible

Return JSON mapping field names to classifications.`;

  try {
    const result = await generateObject({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      schema: batchClassificationSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    throw new Error(
      `LLM field classification failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Classify a single field (convenience wrapper)
 */
export async function classifyField(
  field: FieldToClassify,
  options: {
    model?: "haiku" | "sonnet";
    businessType?: string;
  } = {}
): Promise<FieldClassification> {
  const result = await classifyFieldsBatch([field], options);
  return result[field.name] ?? {
    type: "ignore",
    confidence: 0,
    reasoning: "Unable to classify",
  };
}
