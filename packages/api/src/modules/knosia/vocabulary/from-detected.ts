/**
 * Save Detected Vocabulary - Transform UVB DetectedVocabulary into Knosia DB
 *
 * Wave 2 Phase 2.1 Group A
 * Glue function: DetectedVocabulary → knosia_vocabulary_item rows
 */

import { generateId } from "@turbostarter/shared/utils";
import { db } from "@turbostarter/db/server";
import { knosiaVocabularyItem } from "@turbostarter/db/schema";
import type { DetectedVocabulary } from "@repo/liquid-connect/uvb";
import { eq, and } from "drizzle-orm";

// =============================================================================
// Types
// =============================================================================

export interface SaveDetectedVocabularyOptions {
  promoteHighCertaintyToOrg?: boolean; // Default true
  certaintyThreshold?: number; // Default 0.8
  skipExisting?: boolean; // Default false
}

export interface SaveDetectedVocabularyResult {
  metrics: { created: number; skipped: number };
  dimensions: { created: number; skipped: number };
  entities: { created: number; skipped: number };
  errors: Array<{ item: string; error: string }>;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Save LLM-enriched vocabulary (with displayName, description, category, etc.)
 *
 * This is the preferred method when LLM enrichment is available, as it creates
 * vocabulary items with human-friendly names and business context.
 *
 * @param enriched - LLM-enriched vocabulary (from enrichVocabularyDescriptions)
 * @param orgId - Organization ID (required)
 * @param workspaceId - Workspace ID (for workspace-scoped items)
 * @param options - Configuration options
 * @returns Summary of created/skipped items and errors
 */
export async function saveEnrichedVocabulary(
  enriched: any, // EnrichedVocabulary with LLM fields
  orgId: string,
  workspaceId: string,
  options?: SaveDetectedVocabularyOptions,
): Promise<SaveDetectedVocabularyResult> {
  const opts: Required<SaveDetectedVocabularyOptions> = {
    promoteHighCertaintyToOrg: options?.promoteHighCertaintyToOrg ?? true,
    certaintyThreshold: options?.certaintyThreshold ?? 0.8,
    skipExisting: options?.skipExisting ?? false,
  };

  const result: SaveDetectedVocabularyResult = {
    metrics: { created: 0, skipped: 0 },
    dimensions: { created: 0, skipped: 0 },
    entities: { created: 0, skipped: 0 },
    errors: [],
  };

  // Process metrics with LLM enrichments
  for (const metric of enriched.metrics || []) {
    try {
      const displayName = metric.displayName || metric.suggestedDisplayName || metric.name;
      const slug = createSlug(displayName);
      const uniqueSlug = await ensureUniqueSlug(slug, orgId, workspaceId);

      const status = metric.certainty >= opts.certaintyThreshold ? "approved" : "draft";
      const formulaSql = generateMetricFormula(metric);
      const dbAggregation = metric.aggregation === "COUNT_DISTINCT" ? "COUNT" : metric.aggregation;

      if (opts.skipExisting) {
        const exists = await checkExists(uniqueSlug, orgId, workspaceId);
        if (exists) {
          result.metrics.skipped++;
          continue;
        }
      }

      await db.insert(knosiaVocabularyItem).values({
        id: generateId(),
        orgId,
        workspaceId: opts.promoteHighCertaintyToOrg && metric.certainty >= opts.certaintyThreshold ? null : workspaceId,
        canonicalName: displayName, // Use LLM display name
        slug: uniqueSlug,
        type: "metric",
        status,
        category: metric.category || null, // LLM category (Finance, Marketing, etc.)
        aggregation: dbAggregation as "SUM" | "AVG" | "COUNT" | "MIN" | "MAX",
        aggregationConfidence: Math.round(metric.certainty * 100),
        definition: {
          formulaSql,
          sourceTables: [metric.table],
          sourceColumn: metric.column,
          descriptionHuman: metric.description || `${metric.aggregation} of ${metric.column} from ${metric.table}`, // LLM description
          caveats: metric.caveats || undefined, // LLM caveats
        },
        semantics: inferMetricSemantics(metric),
        currentVersion: 1,
      });

      result.metrics.created++;
    } catch (error) {
      result.errors.push({
        item: metric.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Process dimensions with LLM enrichments
  for (const dimension of enriched.dimensions || []) {
    try {
      const displayName = dimension.displayName || dimension.name;
      const slug = createSlug(displayName);
      const uniqueSlug = await ensureUniqueSlug(slug, orgId, workspaceId);

      const status = dimension.certainty >= opts.certaintyThreshold ? "approved" : "draft";

      if (opts.skipExisting) {
        const exists = await checkExists(uniqueSlug, orgId, workspaceId);
        if (exists) {
          result.dimensions.skipped++;
          continue;
        }
      }

      await db.insert(knosiaVocabularyItem).values({
        id: generateId(),
        orgId,
        workspaceId: opts.promoteHighCertaintyToOrg && dimension.certainty >= opts.certaintyThreshold ? null : workspaceId,
        canonicalName: displayName, // Use LLM display name
        slug: uniqueSlug,
        type: "dimension",
        status,
        category: dimension.category || null, // LLM category
        cardinality: dimension.cardinality,
        definition: {
          sourceTables: [dimension.table],
          sourceColumn: dimension.column,
          descriptionHuman: dimension.description || `${dimension.name} dimension from ${dimension.table}`, // LLM description
          caveats: dimension.caveats || undefined, // LLM caveats
        },
        currentVersion: 1,
      });

      result.dimensions.created++;
    } catch (error) {
      result.errors.push({
        item: dimension.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Process entities (no LLM enrichment for entities yet)
  for (const entity of enriched.entities || []) {
    try {
      const slug = createSlug(entity.name);
      const uniqueSlug = await ensureUniqueSlug(slug, orgId, workspaceId);

      const status = entity.certainty >= opts.certaintyThreshold ? "approved" : "draft";

      if (opts.skipExisting) {
        const exists = await checkExists(uniqueSlug, orgId, workspaceId);
        if (exists) {
          result.entities.skipped++;
          continue;
        }
      }

      await db.insert(knosiaVocabularyItem).values({
        id: generateId(),
        orgId,
        workspaceId: opts.promoteHighCertaintyToOrg && entity.certainty >= opts.certaintyThreshold ? null : workspaceId,
        canonicalName: entity.name,
        slug: uniqueSlug,
        type: "entity",
        status,
        definition: {
          sourceTables: [entity.table],
          descriptionHuman: `${entity.name} entity from ${entity.table} (${entity.columnCount} columns)`,
        },
        currentVersion: 1,
      });

      result.entities.created++;
    } catch (error) {
      result.errors.push({
        item: entity.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * Transform DetectedVocabulary from UVB into knosia_vocabulary_item rows
 *
 * @param detected - DetectedVocabulary output from UVB hard rules
 * @param orgId - Organization ID (required)
 * @param workspaceId - Workspace ID (for workspace-scoped items)
 * @param options - Configuration options
 * @returns Summary of created/skipped items and errors
 */
export async function saveDetectedVocabulary(
  detected: DetectedVocabulary,
  orgId: string,
  workspaceId: string,
  options?: SaveDetectedVocabularyOptions,
): Promise<SaveDetectedVocabularyResult> {
  const opts: Required<SaveDetectedVocabularyOptions> = {
    promoteHighCertaintyToOrg: options?.promoteHighCertaintyToOrg ?? true,
    certaintyThreshold: options?.certaintyThreshold ?? 0.8,
    skipExisting: options?.skipExisting ?? false,
  };

  const result: SaveDetectedVocabularyResult = {
    metrics: { created: 0, skipped: 0 },
    dimensions: { created: 0, skipped: 0 },
    entities: { created: 0, skipped: 0 },
    errors: [],
  };

  // Process metrics
  for (const metric of detected.metrics) {
    try {
      const slug = createSlug(metric.name);
      const uniqueSlug = await ensureUniqueSlug(slug, orgId, workspaceId);

      // Determine status based on certainty
      const status = metric.certainty >= opts.certaintyThreshold ? "approved" : "draft";

      // Generate SQL formula
      const formulaSql = generateMetricFormula(metric);

      // Check if exists
      if (opts.skipExisting) {
        const exists = await checkExists(uniqueSlug, orgId, workspaceId);
        if (exists) {
          result.metrics.skipped++;
          continue;
        }
      }

      // Map COUNT_DISTINCT to COUNT for DB enum (formula preserves distinction)
      const dbAggregation = metric.aggregation === "COUNT_DISTINCT" ? "COUNT" : metric.aggregation;

      await db.insert(knosiaVocabularyItem).values({
        id: generateId(),
        orgId,
        workspaceId: opts.promoteHighCertaintyToOrg && metric.certainty >= opts.certaintyThreshold ? null : workspaceId,
        canonicalName: metric.suggestedDisplayName || metric.name,
        slug: uniqueSlug,
        type: "metric",
        status,
        aggregation: dbAggregation as "SUM" | "AVG" | "COUNT" | "MIN" | "MAX",
        aggregationConfidence: Math.round(metric.certainty * 100),
        definition: {
          formulaSql,
          sourceTables: [metric.table],
          sourceColumn: metric.column,
          descriptionHuman: `${metric.aggregation} of ${metric.column} from ${metric.table}`,
        },
        semantics: inferMetricSemantics(metric),
        currentVersion: 1,
      });

      result.metrics.created++;
    } catch (error) {
      result.errors.push({
        item: metric.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Process dimensions
  for (const dimension of detected.dimensions) {
    try {
      const slug = createSlug(dimension.name);
      const uniqueSlug = await ensureUniqueSlug(slug, orgId, workspaceId);

      const status = dimension.certainty >= opts.certaintyThreshold ? "approved" : "draft";

      if (opts.skipExisting) {
        const exists = await checkExists(uniqueSlug, orgId, workspaceId);
        if (exists) {
          result.dimensions.skipped++;
          continue;
        }
      }

      await db.insert(knosiaVocabularyItem).values({
        id: generateId(),
        orgId,
        workspaceId: opts.promoteHighCertaintyToOrg && dimension.certainty >= opts.certaintyThreshold ? null : workspaceId,
        canonicalName: dimension.name,
        slug: uniqueSlug,
        type: "dimension",
        status,
        cardinality: dimension.cardinality,
        definition: {
          sourceTables: [dimension.table],
          sourceColumn: dimension.column,
          descriptionHuman: `${dimension.name} dimension from ${dimension.table}`,
        },
        currentVersion: 1,
      });

      result.dimensions.created++;
    } catch (error) {
      result.errors.push({
        item: dimension.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Process entities
  for (const entity of detected.entities) {
    try {
      const slug = createSlug(entity.name);
      const uniqueSlug = await ensureUniqueSlug(slug, orgId, workspaceId);

      const status = entity.certainty >= opts.certaintyThreshold ? "approved" : "draft";

      if (opts.skipExisting) {
        const exists = await checkExists(uniqueSlug, orgId, workspaceId);
        if (exists) {
          result.entities.skipped++;
          continue;
        }
      }

      await db.insert(knosiaVocabularyItem).values({
        id: generateId(),
        orgId,
        workspaceId: opts.promoteHighCertaintyToOrg && entity.certainty >= opts.certaintyThreshold ? null : workspaceId,
        canonicalName: entity.name,
        slug: uniqueSlug,
        type: "entity",
        status,
        definition: {
          sourceTables: [entity.table],
          descriptionHuman: `${entity.name} entity from ${entity.table} (${entity.columnCount} columns)`,
        },
        currentVersion: 1,
      });

      result.entities.created++;
    } catch (error) {
      result.errors.push({
        item: entity.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create slug from name (lowercase, hyphenated)
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ensure slug is unique by appending _2, _3, etc.
 */
async function ensureUniqueSlug(
  slug: string,
  orgId: string,
  workspaceId: string,
): Promise<string> {
  let candidate = slug;
  let counter = 2;

  while (await checkExists(candidate, orgId, workspaceId)) {
    candidate = `${slug}_${counter}`;
    counter++;
  }

  return candidate;
}

/**
 * Check if slug already exists in org or workspace
 */
async function checkExists(
  slug: string,
  orgId: string,
  workspaceId: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: knosiaVocabularyItem.id })
    .from(knosiaVocabularyItem)
    .where(
      and(
        eq(knosiaVocabularyItem.slug, slug),
        eq(knosiaVocabularyItem.orgId, orgId),
      ),
    )
    .limit(1);

  return existing.length > 0;
}

/**
 * Generate SQL formula for metric
 */
function generateMetricFormula(metric: {
  aggregation: string;
  table: string;
  column: string;
  expression?: string;
}): string {
  if (metric.expression) {
    return metric.expression;
  }

  const agg = metric.aggregation;
  const table = metric.table;
  const column = metric.column;

  if (agg === "COUNT_DISTINCT") {
    return `COUNT(DISTINCT ${table}.${column})`;
  }

  return `${agg}(${table}.${column})`;
}

/**
 * Infer semantic metadata from metric properties
 */
function inferMetricSemantics(metric: {
  name: string;
  dataType: string;
  aggregation: string;
}): {
  direction?: "higher_is_better" | "lower_is_better" | "target_range";
  format?: "currency" | "percentage" | "count" | "duration" | "ratio";
  grain?: "daily" | "weekly" | "monthly" | "point_in_time";
} {
  const semantics: ReturnType<typeof inferMetricSemantics> = {};

  // Infer format
  const lowerName = metric.name.toLowerCase();
  if (
    lowerName.includes("price") ||
    lowerName.includes("revenue") ||
    lowerName.includes("cost") ||
    lowerName.includes("amount")
  ) {
    semantics.format = "currency";
  } else if (lowerName.includes("rate") || lowerName.includes("percent")) {
    semantics.format = "percentage";
  } else if (
    metric.aggregation === "COUNT" ||
    metric.aggregation === "COUNT_DISTINCT" ||
    metric.aggregation === ("COUNT_DISTINCT" as any)
  ) {
    semantics.format = "count";
  } else if (lowerName.includes("hours") || lowerName.includes("duration")) {
    semantics.format = "duration";
  }

  // Infer direction
  if (
    lowerName.includes("revenue") ||
    lowerName.includes("sales") ||
    lowerName.includes("profit")
  ) {
    semantics.direction = "higher_is_better";
  } else if (
    lowerName.includes("cost") ||
    lowerName.includes("churn") ||
    lowerName.includes("error")
  ) {
    semantics.direction = "lower_is_better";
  }

  return semantics;
}
