/**
 * LLM-based Smart Relationship Discovery
 *
 * Discovers implicit relationships between tables that aren't defined as foreign keys.
 * Useful for databases that lack proper FK constraints.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ExtractedSchema } from "@repo/liquid-connect/uvb";

// Response schema
const relationshipSchema = z.object({
  fromTable: z.string().describe("Source table name"),
  fromColumn: z.string().describe("Source column name"),
  toTable: z.string().describe("Target table name"),
  toColumn: z.string().describe("Target column name"),
  relationshipType: z.enum(["many_to_one", "one_to_many", "many_to_many", "one_to_one"])
    .describe("Type of relationship"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  reasoning: z.string().describe("Why this relationship was detected"),
  isImplicit: z.boolean().describe("True if no formal FK exists, false if FK exists"),
});

const discoveryResultSchema = z.object({
  relationships: z.array(relationshipSchema),
  junctionTables: z.array(z.object({
    tableName: z.string(),
    connectsTable1: z.string(),
    connectsTable2: z.string(),
    reasoning: z.string(),
  })).describe("Tables that serve as many-to-many junction tables"),
});

export type ImplicitRelationship = z.infer<typeof relationshipSchema>;
export type RelationshipDiscoveryResult = z.infer<typeof discoveryResultSchema>;

/**
 * Discover implicit relationships using Claude
 */
export async function discoverImplicitRelationships(
  schema: ExtractedSchema,
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
    businessType?: string;
  } = {}
): Promise<RelationshipDiscoveryResult> {
  const { model = "sonnet", maxTokens = 3000, businessType = "Unknown" } = options;

  // Prepare schema info
  const tableInfo = schema.tables.map(t => ({
    name: t.name,
    columns: t.columns.map(c => ({
      name: c.name,
      type: c.dataType,
      isPK: c.isPrimaryKey,
      isFK: !!c.references,
      references: c.references ? `${c.references.table}.${c.references.column}` : undefined,
    })),
    formalFKs: t.foreignKeys.map(fk => ({
      from: fk.column,
      to: `${fk.referencedTable}.${fk.referencedColumn}`,
    })),
  }));

  const prompt = `Analyze this ${businessType} database schema and discover implicit relationships.

**Database:** ${schema.database}
**Tables:** ${schema.tables.length}

**Schema:**
${JSON.stringify(tableInfo, null, 2)}

**Instructions:**
1. Find columns that likely reference other tables but lack formal FK constraints
2. Look for naming patterns:
   - "customer_id" in orders likely references users.id or customers.id
   - "user_email" in events likely references users.email
   - "userId", "user_id", "customerId", "customer_id" often mean the same thing
3. Identify junction tables (many-to-many):
   - Typically have 2 FK columns and minimal other data
   - Example: user_projects linking users ↔ projects
4. Consider cardinality:
   - most_to_one: Multiple records in table A reference one record in table B
   - one_to_many: Inverse of many_to_one
   - many_to_many: Through a junction table
   - one_to_one: Rare, usually for table splitting

**Common Patterns:**
- *_id columns usually reference another table's primary key
- email/username columns might reference users table
- Tables with only 2-3 columns (all FKs) are likely junction tables
- created_by, updated_by, assigned_to often reference users
- Prefixes like "customer_", "product_", "order_" indicate relationships

**Example Output:**
- orders.customer_id → users.id (many_to_one, high confidence)
- events.user_email → users.email (many_to_one, medium confidence)
- user_projects is junction table connecting users ↔ projects

Mark isImplicit=true for relationships NOT in the formal FK list.
Provide confidence scores based on naming strength and context.`;

  try {
    const result = await generateObject({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      schema: discoveryResultSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    throw new Error(
      `LLM relationship discovery failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Merge implicit relationships with existing formal relationships
 */
export function mergeRelationships(
  schema: ExtractedSchema,
  implicit: RelationshipDiscoveryResult
): Array<{
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
  type: string;
  confidence: number;
  source: "formal" | "implicit";
}> {
  const merged: Array<{
    from: string;
    fromColumn: string;
    to: string;
    toColumn: string;
    type: string;
    confidence: number;
    source: "formal" | "implicit";
  }> = [];

  // Add formal FKs (confidence = 1.0)
  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      merged.push({
        from: table.name,
        fromColumn: fk.column,
        to: fk.referencedTable,
        toColumn: fk.referencedColumn,
        type: "many_to_one",
        confidence: 1.0,
        source: "formal",
      });
    }
  }

  // Add implicit relationships (exclude duplicates)
  for (const rel of implicit.relationships) {
    if (!rel.isImplicit) continue; // Skip if it's already a formal FK

    const isDuplicate = merged.some(
      m => m.from === rel.fromTable &&
           m.fromColumn === rel.fromColumn &&
           m.to === rel.toTable &&
           m.toColumn === rel.toColumn
    );

    if (!isDuplicate) {
      merged.push({
        from: rel.fromTable,
        fromColumn: rel.fromColumn,
        to: rel.toTable,
        toColumn: rel.toColumn,
        type: rel.relationshipType,
        confidence: rel.confidence,
        source: "implicit",
      });
    }
  }

  return merged;
}
