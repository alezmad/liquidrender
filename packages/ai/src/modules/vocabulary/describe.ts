/**
 * LLM-based Vocabulary Description Generator
 *
 * Generates business-friendly descriptions for vocabulary items (metrics, dimensions, entities).
 * Transforms technical field names into understandable business concepts.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Input types
export interface VocabularyField {
  name: string;
  dataType: string;
  tableName: string;
  tableContext?: string; // What the table represents (e.g., "orders", "customers")
  sampleValues?: unknown[];
  nullPercentage?: number;
  cardinality?: number;
  isNullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
}

// Response schema
const vocabularyDescriptionSchema = z.object({
  displayName: z.string().describe("Business-friendly display name (e.g., 'Total Revenue' instead of 'revenue_usd')"),
  description: z.string().describe("Clear explanation of what this field represents and how it's typically used"),
  suggestedAggregation: z.enum(["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX", "NONE"])
    .describe("Recommended aggregation for metrics (NONE for dimensions)"),
  businessContext: z.string().describe("Brief context about business usage (e.g., 'Key metric for tracking sales performance')"),
  category: z.string().optional().describe("Business category (e.g., 'Sales', 'Finance', 'Operations')"),
  caveats: z.array(z.string()).optional().describe("Important notes or limitations about this field"),
});

export type VocabularyDescription = z.infer<typeof vocabularyDescriptionSchema>;

/**
 * Generate vocabulary descriptions in batch (cost-efficient)
 */
export async function describeVocabularyBatch(
  fields: VocabularyField[],
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
    businessType?: string; // E.g., "E-Commerce", "SaaS"
  } = {}
): Promise<Record<string, VocabularyDescription>> {
  const { model = "haiku", maxTokens = 2000, businessType = "Unknown" } = options;

  // Batch process fields (max 20 at a time to avoid token limits)
  const batchSize = 20;
  const batches: VocabularyField[][] = [];

  for (let i = 0; i < fields.length; i += batchSize) {
    batches.push(fields.slice(i, i + batchSize));
  }

  // Process all batches in parallel for speed
  const batchResults = await Promise.all(
    batches.map(batch => describeBatch(batch, { model, maxTokens, businessType }))
  );

  // Merge all results
  const results: Record<string, VocabularyDescription> = {};
  for (const batchResult of batchResults) {
    Object.assign(results, batchResult);
  }

  return results;
}

/**
 * Internal: Describe a single batch of fields
 */
async function describeBatch(
  fields: VocabularyField[],
  options: {
    model: "haiku" | "sonnet";
    maxTokens: number;
    businessType: string;
  }
): Promise<Record<string, VocabularyDescription>> {
  const { model, maxTokens, businessType } = options;

  // Prepare field info
  const fieldInfo = fields.map(f => ({
    name: f.name,
    table: f.tableName,
    dataType: f.dataType,
    nullable: f.isNullable,
    pk: f.isPrimaryKey,
    fk: f.isForeignKey,
    references: f.references,
    sampleValues: f.sampleValues?.slice(0, 3), // Max 3 samples
    nullPct: f.nullPercentage,
    cardinality: f.cardinality,
  }));

  const prompt = `You are analyzing a ${businessType} database. Generate business-friendly descriptions for these database fields.

**Fields:**
${JSON.stringify(fieldInfo, null, 2)}

**Instructions:**
1. Create clear, business-friendly display names (not technical jargon)
2. Write concise descriptions that explain what the field represents
3. Suggest appropriate aggregations for numeric fields
4. Provide business context about how this field is typically used
5. Categorize fields by business function (Sales, Finance, Operations, etc.)
6. Note any important caveats or limitations

**Examples:**
- Field: "revenue_usd" → Display: "Revenue" | Description: "Total revenue in US Dollars. Typically used for financial reporting and trend analysis." | Aggregation: SUM | Context: "Key metric for tracking sales performance"
- Field: "customer_id" → Display: "Customer" | Description: "Unique identifier for each customer" | Aggregation: COUNT_DISTINCT | Context: "Used to track unique customers"
- Field: "created_at" → Display: "Created Date" | Description: "When the record was created" | Aggregation: NONE | Context: "Time dimension for analysis"

Return a JSON object mapping field names to their descriptions. Use the exact field names as keys.`;

  const batchSchema = z.record(z.string(), vocabularyDescriptionSchema);

  try {
    const result = await generateObject({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      schema: batchSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    throw new Error(
      `LLM vocabulary description failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate description for a single field (convenience wrapper)
 */
export async function describeVocabularyField(
  field: VocabularyField,
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
    businessType?: string;
  } = {}
): Promise<VocabularyDescription> {
  const result = await describeVocabularyBatch([field], options);
  return result[field.name] ?? {
    displayName: field.name,
    description: "",
    suggestedAggregation: "NONE",
    businessContext: "",
  };
}
