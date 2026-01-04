/**
 * LLM Enrichment for Analysis
 *
 * Orchestrates all LLM enhancements (vocabulary descriptions, query suggestions, etc.)
 * while maintaining backwards compatibility. All LLM calls are optional and fail gracefully.
 */

import type { ExtractedSchema } from "@repo/liquid-connect/uvb";

/**
 * Filter out low-value fields before LLM enrichment
 */
function shouldEnrichField(field: any): boolean {
  // Skip IDs and technical fields
  const name = field.name?.toLowerCase() || '';
  if (name.endsWith('_id') || name === 'id') return false;
  if (['created_at', 'updated_at', 'deleted_at', 'modified_at'].includes(name)) return false;

  // Skip high-null fields (>50% null = poor data quality)
  if (field.nullPercentage && field.nullPercentage > 50) return false;

  // Skip near-unique fields (>80% unique = pseudo-ID)
  if (field.cardinality && field.totalRows) {
    const uniqueness = (field.cardinality / field.totalRows) * 100;
    if (uniqueness > 80) return false;
  }

  return true;
}

/**
 * Select top fields for quick preview enrichment
 * Returns the most obviously valuable fields (typically 15-30 fields)
 */
export function selectTopFields(detectedVocab: any, maxFields: number = 25): {
  metrics: any[];
  dimensions: any[];
} {
  const name = (field: any) => field.name?.toLowerCase() || '';

  // HIGH-VALUE patterns (most important business fields)
  const isHighValue = (field: any) => {
    const n = name(field);

    // Financial metrics
    if (/amount$|cost$|price$|revenue$|fee$|total$|value$/.test(n)) return true;

    // Counting metrics
    if (/count$|quantity$|qty$|volume$|number$/.test(n)) return true;

    // Rate/ratio metrics
    if (/rate$|percent$|ratio$|score$/.test(n)) return true;

    // Important dimensions
    if (/status$|state$|type$|category$|name$|title$/.test(n)) return true;

    // Important dates (not technical)
    if (/shipped_at$|delivered_at$|paid_at$|cancelled_at$|first_|last_/.test(n)) return true;

    return false;
  };

  // Sort: high-value first, then by low null percentage
  const sortByImportance = (fields: any[]) =>
    fields
      .map(f => ({ field: f, isHighValue: isHighValue(f), nullPct: f.nullPercentage || 0 }))
      .sort((a, b) => {
        if (a.isHighValue && !b.isHighValue) return -1;
        if (!a.isHighValue && b.isHighValue) return 1;
        return a.nullPct - b.nullPct; // Lower null percentage first
      })
      .map(x => x.field);

  const topMetrics = sortByImportance(detectedVocab.metrics || []).slice(0, maxFields);
  const topDimensions = sortByImportance(detectedVocab.dimensions || []).slice(0, maxFields);

  // Balance between metrics and dimensions (aim for 60/40 split)
  const total = topMetrics.length + topDimensions.length;
  if (total > maxFields) {
    const targetMetrics = Math.ceil(maxFields * 0.6);
    const targetDimensions = maxFields - targetMetrics;

    return {
      metrics: topMetrics.slice(0, targetMetrics),
      dimensions: topDimensions.slice(0, targetDimensions),
    };
  }

  return { metrics: topMetrics, dimensions: topDimensions };
}

/**
 * Enrich detected vocabulary with LLM-generated descriptions
 */
export async function enrichVocabularyDescriptions(
  detectedVocab: any,
  schema: ExtractedSchema,
  businessType: string
): Promise<any> {
  try {
    const { describeVocabularyBatch } = await import("@turbostarter/ai/vocabulary/describe");

    // Prepare fields for description generation (filtered for high-value fields only)
    const fields: Array<{
      name: string;
      dataType: string;
      tableName: string;
      nullPercentage?: number;
      cardinality?: number;
    }> = [];

    // Collect HIGH-VALUE metrics only
    for (const metric of detectedVocab.metrics || []) {
      if (shouldEnrichField(metric)) {
        fields.push({
          name: metric.name,
          dataType: metric.dataType || "unknown",
          tableName: metric.table || "unknown",
          nullPercentage: metric.nullPercentage,
          cardinality: metric.cardinality,
        });
      }
    }

    // Collect HIGH-VALUE dimensions only
    for (const dimension of detectedVocab.dimensions || []) {
      if (shouldEnrichField(dimension)) {
        fields.push({
          name: dimension.name,
          dataType: dimension.dataType || "unknown",
          tableName: dimension.table || "unknown",
          nullPercentage: dimension.nullPercentage,
          cardinality: dimension.cardinality,
        });
      }
    }

    console.log(`[LLM] Enriching ${fields.length} high-value fields (filtered from ${(detectedVocab.metrics?.length || 0) + (detectedVocab.dimensions?.length || 0)})`);

    // Generate descriptions in batch (cost-efficient)
    const descriptions = await describeVocabularyBatch(fields, {
      model: "haiku", // Use Haiku for cost efficiency
      businessType,
    });

    // Enrich vocabulary with descriptions
    for (const metric of detectedVocab.metrics || []) {
      const desc = descriptions[metric.name];
      if (desc) {
        metric.description = desc.description;
        metric.displayName = desc.displayName;
        metric.businessContext = desc.businessContext;
        metric.category = desc.category;
        metric.caveats = desc.caveats;
        if (desc.suggestedAggregation !== "NONE") {
          metric.suggestedAggregation = desc.suggestedAggregation;
        }
      }
    }

    for (const dimension of detectedVocab.dimensions || []) {
      const desc = descriptions[dimension.name];
      if (desc) {
        dimension.description = desc.description;
        dimension.displayName = desc.displayName;
        dimension.businessContext = desc.businessContext;
        dimension.category = desc.category;
        dimension.caveats = desc.caveats;
      }
    }

    return detectedVocab;
  } catch (error) {
    console.warn("[Analysis] LLM vocabulary enrichment failed, using basic names:", error);
    // Return unchanged vocabulary on failure
    return detectedVocab;
  }
}

/**
 * Generate query suggestions based on detected vocabulary
 */
export async function generateQuerySuggestions(
  detectedVocab: any,
  businessType: string
): Promise<any> {
  try {
    const { generateQuerySuggestions } = await import("@turbostarter/ai/suggestions/queries");

    const context = {
      businessType,
      entities: (detectedVocab.entities || []).map((e: any) => e.name),
      metrics: (detectedVocab.metrics || []).map((m: any) => ({
        name: m.name,
        description: m.description,
      })),
      dimensions: (detectedVocab.dimensions || []).map((d: any) => ({
        name: d.name,
        description: d.description,
      })),
      timeFields: (detectedVocab.timeFields || []).map((t: any) => ({
        name: t.name,
        table: t.table,
      })),
    };

    const suggestions = await generateQuerySuggestions(context, {
      model: "haiku",
    });

    return {
      starterQuestions: suggestions.starterQuestions.map(q => ({
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        insight: q.expectedInsight,
      })),
      kpiQuestions: suggestions.kpiQuestions.map(q => q.question),
      trendQuestions: suggestions.trendQuestions.map(q => q.question),
      breakdownQuestions: suggestions.breakdownQuestions.map(q => q.question),
    };
  } catch (error) {
    console.warn("[Analysis] LLM query suggestion generation failed:", error);
    // Return empty suggestions on failure
    return {
      starterQuestions: [],
      kpiQuestions: [],
      trendQuestions: [],
      breakdownQuestions: [],
    };
  }
}

/**
 * Explain data quality issues using LLM
 */
export async function explainDataQuality(
  profilingData: any,
  businessType: string
): Promise<any> {
  try {
    const { explainDataQuality } = await import("@turbostarter/ai/quality/explain");

    // Convert profiling data to quality metrics
    const metrics: Array<{
      tableName: string;
      columnName: string;
      dataType: string;
      nullPercentage?: number;
      cardinality?: number;
      uniquenessPercentage?: number;
    }> = [];

    // Extract quality metrics from profiling data
    for (const [tableName, tableProfile] of Object.entries(profilingData.tableProfiles || {})) {
      const columnProfiles = profilingData.columnProfiles?.[tableName] || {};
      for (const columnProfile of Object.values(columnProfiles) as any[]) {
        metrics.push({
          tableName,
          columnName: columnProfile.columnName,
          dataType: columnProfile.dataType || "unknown",
          nullPercentage: columnProfile.nullPercentage,
          cardinality: columnProfile.distinctCount,
          uniquenessPercentage: columnProfile.uniquenessPercentage,
        });
      }
    }

    // Only explain top 15 most interesting quality issues (to limit cost)
    const topIssues = metrics
      .filter(m => (m.nullPercentage ?? 0) > 20 || (m.uniquenessPercentage ?? 0) > 90)
      .slice(0, 15);

    if (topIssues.length === 0) {
      return null;
    }

    const explanation = await explainDataQuality(topIssues, {
      model: "haiku",
      businessType,
    });

    return {
      overallHealth: explanation.overallHealth,
      topIssues: explanation.topIssues,
      recommendations: explanation.recommendations,
    };
  } catch (error) {
    console.warn("[Analysis] LLM quality explanation failed:", error);
    return null;
  }
}

/**
 * Discover implicit relationships using LLM
 */
export async function discoverImplicitRelationships(
  schema: ExtractedSchema,
  businessType: string
): Promise<any> {
  try {
    const { discoverImplicitRelationships, mergeRelationships } = await import(
      "@turbostarter/ai/relationships/discover"
    );

    const discovery = await discoverImplicitRelationships(schema, {
      model: "sonnet", // Use Sonnet for better relationship reasoning
      businessType,
    });

    // Merge with formal relationships
    const allRelationships = mergeRelationships(schema, discovery);

    return {
      implicit: discovery.relationships.filter(r => r.isImplicit),
      junctionTables: discovery.junctionTables,
      allRelationships,
    };
  } catch (error) {
    console.warn("[Analysis] LLM relationship discovery failed:", error);
    return null;
  }
}

/**
 * Classify fields with improved accuracy using LLM
 */
export async function classifyFieldsWithLLM(
  detectedVocab: any,
  schema: ExtractedSchema,
  profilingData: any,
  businessType: string
): Promise<any> {
  try {
    const { classifyFieldsBatch } = await import("@turbostarter/ai/classification/classify");

    // Prepare fields for classification
    const fields: Array<{
      name: string;
      tableName: string;
      dataType: string;
      isNumeric: boolean;
      isText: boolean;
      isTimestamp: boolean;
      isBoolean: boolean;
      cardinality?: number;
      nullPercentage?: number;
      isPrimaryKey?: boolean;
      isForeignKey?: boolean;
    }> = [];

    for (const table of schema.tables) {
      const columnProfiles = profilingData?.columnProfiles?.[table.name] || {};

      for (const column of table.columns) {
        const profile = Object.values(columnProfiles).find(
          (p: any) => p.columnName === column.name
        ) as any;

        fields.push({
          name: column.name,
          tableName: table.name,
          dataType: column.dataType,
          isNumeric: column.dataType.toLowerCase().includes("int") ||
                     column.dataType.toLowerCase().includes("float") ||
                     column.dataType.toLowerCase().includes("decimal") ||
                     column.dataType.toLowerCase().includes("numeric"),
          isText: column.dataType.toLowerCase().includes("text") ||
                  column.dataType.toLowerCase().includes("char") ||
                  column.dataType.toLowerCase().includes("varchar"),
          isTimestamp: column.dataType.toLowerCase().includes("timestamp") ||
                       column.dataType.toLowerCase().includes("date"),
          isBoolean: column.dataType.toLowerCase().includes("bool"),
          cardinality: profile?.distinctCount,
          nullPercentage: profile?.nullPercentage,
          isPrimaryKey: column.isPrimaryKey,
          isForeignKey: !!column.references,
        });
      }
    }

    // Classify fields
    const classifications = await classifyFieldsBatch(fields, {
      model: "haiku",
      businessType,
    });

    // Update detected vocab with LLM classifications
    for (const [fieldName, classification] of Object.entries(classifications)) {
      // Update metrics/dimensions based on classification
      if (classification.type === "metric") {
        const existingMetric = detectedVocab.metrics.find((m: any) => m.name === fieldName);
        if (existingMetric && classification.suggestedAggregation) {
          existingMetric.suggestedAggregation = classification.suggestedAggregation;
          existingMetric.classificationConfidence = classification.confidence;
        }
      }
    }

    return classifications;
  } catch (error) {
    console.warn("[Analysis] LLM field classification failed:", error);
    return null;
  }
}

/**
 * Enrich remaining fields adaptively based on database size
 * Uses different strategies for small/medium/large databases
 */
export async function enrichRemainingFieldsAdaptive(
  remainingVocab: { metrics: any[]; dimensions: any[] },
  schema: ExtractedSchema,
  businessType: string
): Promise<any> {
  const allRemaining = [
    ...(remainingVocab.metrics || []),
    ...(remainingVocab.dimensions || []),
  ];

  if (allRemaining.length === 0) {
    console.log("[LLM] No remaining fields to enrich");
    return remainingVocab;
  }

  console.log(`[Background] Enriching ${allRemaining.length} remaining fields`);

  try {
    // ADAPTIVE STRATEGY based on database size
    if (allRemaining.length <= 100) {
      // Small: Single smart call (optimal for <100 fields)
      console.log("[Background] Using single-call strategy (<=100 fields)");
      return await enrichVocabularyDescriptions(remainingVocab, schema, businessType);
    } else {
      // Large: Apply filtering first, then enrich filtered set
      console.log("[Background] Using filtered strategy (>100 fields)");

      // Filter to high-value fields only
      const filteredMetrics = (remainingVocab.metrics || []).filter(shouldEnrichField);
      const filteredDimensions = (remainingVocab.dimensions || []).filter(shouldEnrichField);

      console.log(
        `[Background] Filtered ${allRemaining.length} → ${filteredMetrics.length + filteredDimensions.length} high-value fields`
      );

      return await enrichVocabularyDescriptions(
        { metrics: filteredMetrics, dimensions: filteredDimensions },
        schema,
        businessType
      );
    }
  } catch (error) {
    console.warn("[Background] Background enrichment failed:", error);
    return remainingVocab; // Return unchanged on failure
  }
}
