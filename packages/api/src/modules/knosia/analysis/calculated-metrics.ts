/**
 * Calculated Metrics Integration
 *
 * Generates KPI recipes and enriches vocabulary with calculated metrics.
 * This is Step 7.5 in the analysis pipeline.
 *
 * Architecture:
 * - Phase 1 (Current): LLM generates semantic metric definitions
 * - Phase 2 (Next): Add definitions to LiquidConnect SemanticLayer
 * - Phase 3 (Future): Emitters generate database-specific SQL and execute
 *
 * Benefits of Semantic Layer approach:
 * - Database-agnostic (works for PostgreSQL, MySQL, DuckDB)
 * - Single source of truth for SQL generation
 * - Query optimization by LiquidConnect emitters
 * - No SQL maintenance burden on LLM
 */

import type { DetectedVocabulary, ExtractedSchema, ProfilingData } from "@repo/liquid-connect/uvb";
import { generateKPIRecipes } from "@turbostarter/ai/kpi";
import type {
  CalculatedMetricRecipe,
  GenerateRecipeRequest,
} from "@turbostarter/ai/kpi";
import { db } from "@turbostarter/db/server";
import { knosiaCalculatedMetric } from "@turbostarter/db/schema/knosia";
import { generateId } from "@turbostarter/shared/utils";

/**
 * Extended vocabulary with calculated metrics
 */
export interface EnrichedVocabulary extends DetectedVocabulary {
  calculatedMetrics?: CalculatedMetricRecipe[];
}

/**
 * Convert ExtractedSchema to vocabulary context for recipe generation
 */
function schemaToVocabularyContext(
  schema: ExtractedSchema,
  vocabulary: DetectedVocabulary
): GenerateRecipeRequest["vocabularyContext"] {
  return {
    tables: schema.tables.map((table) => ({
      name: table.name,
      columns: table.columns.map((col) => {
        // Find semantic type from vocabulary
        const metric = vocabulary.metrics?.find(
          (m) =>
            m.table === table.name &&
            m.column === col.name
        );
        const dimension = vocabulary.dimensions?.find(
          (d) =>
            d.table === table.name &&
            d.column === col.name
        );

        return {
          name: col.name,
          type: col.dataType,
          semanticType: metric
            ? "measure"
            : dimension
              ? "dimension"
              : undefined,
        };
      }),
    })),
    detectedMetrics: vocabulary.metrics?.map((m) => m.name) || [],
    detectedDimensions: vocabulary.dimensions?.map((d) => d.name) || [],
  };
}

/**
 * Filter recipes to only include feasible ones with high confidence
 */
function filterFeasibleRecipes(
  recipes: CalculatedMetricRecipe[]
): CalculatedMetricRecipe[] {
  return recipes.filter((recipe) => recipe.feasible && recipe.confidence >= 0.7);
}

/**
 * Generate calculated metrics and enrich vocabulary
 *
 * This is Step 7.5 in the analysis pipeline:
 * - Takes detected vocabulary and schema
 * - Generates KPI recipes using LLM
 * - Adds feasible recipes as calculated metrics
 * - Returns enriched vocabulary
 */
export async function enrichVocabularyWithCalculatedMetrics(
  vocabulary: DetectedVocabulary,
  schema: ExtractedSchema,
  businessType: string,
  options: {
    maxRecipes?: number;
    model?: "haiku" | "sonnet";
    enabled?: boolean;
  } = {}
): Promise<{
  enrichedVocabulary: EnrichedVocabulary;
  recipes: CalculatedMetricRecipe[];
  stats: {
    totalGenerated: number;
    feasibleCount: number;
    infeasibleCount: number;
    averageConfidence: number;
  };
}> {
  const { maxRecipes = 10, model = "haiku", enabled = true } = options;

  // Skip if disabled or no ANTHROPIC_API_KEY
  if (!enabled || !process.env.ANTHROPIC_API_KEY) {
    console.log("[CalculatedMetrics] Skipping: feature disabled or API key missing");
    return {
      enrichedVocabulary: vocabulary,
      recipes: [],
      stats: {
        totalGenerated: 0,
        feasibleCount: 0,
        infeasibleCount: 0,
        averageConfidence: 0,
      },
    };
  }

  try {
    console.log(`[CalculatedMetrics] Generating recipes for business type: ${businessType}`);

    // Convert schema to vocabulary context
    const vocabularyContext = schemaToVocabularyContext(schema, vocabulary);

    // Generate KPI recipes
    const request: GenerateRecipeRequest = {
      businessType: businessType.toLowerCase().replace(/[^a-z]/g, ""),
      vocabularyContext,
      generateCommonKPIs: true,
    };

    const response = await generateKPIRecipes(request, { model, maxRecipes });

    console.log(`[CalculatedMetrics] Generated ${response.totalGenerated} recipes:`, {
      feasible: response.feasibleCount,
      infeasible: response.infeasibleCount,
      avgConfidence: response.averageConfidence.toFixed(2),
    });

    if (response.warnings?.length) {
      console.warn("[CalculatedMetrics] Warnings:", response.warnings);
    }

    // Filter to only feasible recipes with high confidence
    const feasibleRecipes = filterFeasibleRecipes(response.recipes);

    // Enrich vocabulary with calculated metrics
    const enrichedVocabulary: EnrichedVocabulary = {
      ...vocabulary,
      calculatedMetrics: feasibleRecipes,
    };

    return {
      enrichedVocabulary,
      recipes: response.recipes,
      stats: {
        totalGenerated: response.totalGenerated,
        feasibleCount: response.feasibleCount,
        infeasibleCount: response.infeasibleCount,
        averageConfidence: response.averageConfidence,
      },
    };
  } catch (error) {
    console.error("[CalculatedMetrics] Failed to generate recipes:", error);

    // Return original vocabulary on error
    return {
      enrichedVocabulary: vocabulary,
      recipes: [],
      stats: {
        totalGenerated: 0,
        feasibleCount: 0,
        infeasibleCount: 0,
        averageConfidence: 0,
      },
    };
  }
}

/**
 * Build enhanced vocabulary context using profiling insights
 * This provides the LLM with additional context to generate smarter metrics
 */
function buildEnhancedVocabularyContext(
  vocabulary: DetectedVocabulary,
  profilingData: ProfilingData | null,
  schema: ExtractedSchema
): GenerateRecipeRequest["vocabularyContext"] {
  const baseContext = schemaToVocabularyContext(schema, vocabulary);

  // If no profiling data, return base context
  if (!profilingData?.columnProfiles) {
    return baseContext;
  }

  // Extract profiling insights
  const highCardinalityColumns = Object.entries(profilingData.columnProfiles)
    .filter(([_, profile]) => {
      const cardinality = profile.cardinality ?? 0;
      const rowCount = profile.rowCount ?? 1;
      return cardinality / rowCount > 0.9;
    })
    .map(([col]) => col);

  const enumColumns = Object.entries(profilingData.columnProfiles)
    .filter(([_, profile]) => {
      const distinctValues = profile.distinctValues ?? [];
      const coverage = profile.coverage ?? 0;
      return distinctValues.length < 100 && coverage > 0.8;
    })
    .map(([col, profile]) => ({
      column: col,
      values: profile.distinctValues ?? [],
    }));

  const requiredFields = Object.entries(profilingData.columnProfiles)
    .filter(([_, profile]) => (profile.nullPercentage ?? 100) < 5)
    .map(([col]) => col);

  // Return base context (profiling insights are informational only)
  // The LLM recipe generator doesn't currently accept profilingInsights
  return baseContext;
}

/**
 * Categorize metric based on name/description patterns
 */
function categorizeMetric(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("revenue") || lower.includes("sales") || lower.includes("mrr") || lower.includes("arr")) {
    return "revenue";
  }
  if (lower.includes("growth") || lower.includes("churn") || lower.includes("retention") || lower.includes("acquisition")) {
    return "growth";
  }
  if (lower.includes("active") || lower.includes("usage") || lower.includes("engagement") || lower.includes("dau") || lower.includes("mau")) {
    return "engagement";
  }
  if (lower.includes("cost") || lower.includes("efficiency") || lower.includes("time") || lower.includes("duration")) {
    return "operational";
  }

  return "other";
}

/**
 * Generate human-readable description from recipe
 */
function generateDescription(recipe: CalculatedMetricRecipe): string {
  const { semanticDefinition } = recipe;
  const parts: string[] = [];

  // Aggregation + expression
  if (semanticDefinition.aggregation && semanticDefinition.expression) {
    parts.push(`${semanticDefinition.aggregation}(${semanticDefinition.expression})`);
  }

  // Entity
  if (semanticDefinition.entity) {
    parts.push(`from ${semanticDefinition.entity}`);
  }

  // Filters
  if (semanticDefinition.filters && semanticDefinition.filters.length > 0) {
    const filterDesc = semanticDefinition.filters
      .map((f) => `${f.field} ${f.operator} ${f.value}`)
      .join(", ");
    parts.push(`where ${filterDesc}`);
  }

  // Time granularity
  if (semanticDefinition.timeGranularity) {
    parts.push(`grouped by ${semanticDefinition.timeGranularity}`);
  }

  return parts.join(" ");
}

/**
 * Extract vocabulary lineage from recipe
 * Links calculated metrics back to the base vocabulary items they reference
 */
function extractVocabularyLineage(
  recipe: CalculatedMetricRecipe,
  vocabulary: DetectedVocabulary
): string[] {
  const { semanticDefinition } = recipe;
  const lineage: string[] = [];

  // Find base metric referenced in expression
  const baseMetric = vocabulary.metrics?.find(
    (m) => m.name === semanticDefinition.expression || m.column === semanticDefinition.expression
  );
  if (baseMetric?.id) {
    lineage.push(baseMetric.id);
  }

  // Find dimensions used in filters
  if (semanticDefinition.filters) {
    for (const filter of semanticDefinition.filters) {
      const dimension = vocabulary.dimensions?.find(
        (d) => d.name === filter.field || d.column === filter.field
      );
      if (dimension?.id) {
        lineage.push(dimension.id);
      }
    }
  }

  return lineage;
}

/**
 * Generate and store calculated metrics in database
 * This is called during Step 4.5 of the SSE analysis stream
 */
interface GenerateAndStoreInput {
  detectedVocabulary: DetectedVocabulary;
  profilingData: ProfilingData | null;
  businessType: string;
  extractedSchema: ExtractedSchema;
  connectionId: string;
  workspaceId: string;
  analysisId: string;
}

export async function generateAndStoreCalculatedMetrics(
  input: GenerateAndStoreInput
): Promise<{
  totalGenerated: number;
  feasibleCount: number;
  storedCount: number;
  categories: string[];
  metrics: Array<{
    id: string;
    name: string;
    category: string;
    confidence: string | null;
  }>;
}> {
  const {
    detectedVocabulary,
    profilingData,
    businessType,
    extractedSchema,
    connectionId,
    workspaceId,
  } = input;

  // Build enhanced vocabulary context (uses profiling insights)
  const vocabularyContext = buildEnhancedVocabularyContext(
    detectedVocabulary,
    profilingData,
    extractedSchema
  );

  // Generate recipes via LLM (Phase 1)
  const result = await enrichVocabularyWithCalculatedMetrics(
    detectedVocabulary,
    extractedSchema,
    businessType,
    {
      maxRecipes: 10,
      model: "haiku", // Fast + cheap for onboarding
      enabled: true,
    }
  );

  // Filter feasible recipes with good confidence
  const feasibleRecipes = result.enrichedVocabulary.calculatedMetrics?.filter(
    (recipe) => recipe.feasible && (recipe.confidence ?? 0) >= 0.7
  ) ?? [];

  // Store in database
  const storedMetrics = [];
  for (const recipe of feasibleRecipes) {
    const metricId = generateId();
    const category = categorizeMetric(recipe.name);
    const description = generateDescription(recipe);
    const vocabularyItemIds = extractVocabularyLineage(recipe, detectedVocabulary);

    await db.insert(knosiaCalculatedMetric).values({
      id: metricId,
      workspaceId,
      connectionId,
      name: recipe.name,
      category,
      description,
      semanticDefinition: recipe.semanticDefinition,
      confidence: recipe.confidence?.toString() ?? null,
      feasible: recipe.feasible,
      source: "ai_generated",
      vocabularyItemIds,
      canvasCount: 0,
      executionCount: 0,
      status: "active",
    });

    storedMetrics.push({
      id: metricId,
      name: recipe.name,
      category,
      confidence: recipe.confidence?.toString() ?? null,
    });
  }

  // Categorize for summary
  const categories = [...new Set(storedMetrics.map((m) => m.category).filter(Boolean))];

  return {
    totalGenerated: result.stats.totalGenerated,
    feasibleCount: result.stats.feasibleCount,
    storedCount: storedMetrics.length,
    categories,
    metrics: storedMetrics,
  };
}
