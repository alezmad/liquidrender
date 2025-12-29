import { eq } from "@turbostarter/db";
import {
  knosiaAnalysis,
  knosiaVocabularyItem,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type {
  GetVocabularyInput,
  VocabularyResponse,
  VocabularyItem,
  ConfirmationQuestion,
} from "./schemas";

/**
 * Transforms raw database vocabulary item to API response format
 */
function transformVocabularyItem(
  item: typeof knosiaVocabularyItem.$inferSelect
): VocabularyItem {
  const definition = item.definition as {
    descriptionHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
  } | null;

  return {
    id: item.id,
    canonicalName: item.canonicalName,
    abbreviation: item.abbreviation ?? "",
    category: item.category ?? "general",
    confidence: item.aggregationConfidence ?? 80,
    source: {
      table: definition?.sourceTables?.[0] ?? "unknown",
      column: item.slug,
      expression: definition?.formulaSql,
    },
    description: definition?.descriptionHuman,
  };
}

/**
 * Generates confirmation questions based on detected vocabulary
 */
function generateConfirmationQuestions(
  metrics: VocabularyItem[],
  dimensions: VocabularyItem[],
  businessType: string
): ConfirmationQuestion[] {
  const questions: ConfirmationQuestion[] = [];

  // Revenue metric question (if applicable)
  const revenueMetrics = metrics.filter(
    (m) =>
      m.category === "revenue" ||
      m.canonicalName.toLowerCase().includes("revenue") ||
      m.canonicalName.toLowerCase().includes("mrr") ||
      m.canonicalName.toLowerCase().includes("arr")
  );

  if (revenueMetrics.length > 0) {
    questions.push({
      id: "q_primary_revenue",
      category: "revenue",
      question: "Which metric best represents your primary revenue?",
      impact: "This affects how revenue trends and growth are calculated",
      options: revenueMetrics.map((m, idx) => ({
        id: `opt_${m.id}`,
        label: `${m.canonicalName}${m.abbreviation ? ` (${m.abbreviation})` : ""}`,
        vocabularyItemId: m.id,
        suggested: idx === 0,
      })),
    });
  }

  // Customer metric question
  const customerMetrics = metrics.filter(
    (m) =>
      m.category === "customers" ||
      m.canonicalName.toLowerCase().includes("customer") ||
      m.canonicalName.toLowerCase().includes("user") ||
      m.canonicalName.toLowerCase().includes("subscriber")
  );

  if (customerMetrics.length > 0) {
    questions.push({
      id: "q_primary_customers",
      category: "customers",
      question: "Which metric represents your active customers?",
      impact: "This affects customer health and retention metrics",
      options: customerMetrics.map((m, idx) => ({
        id: `opt_${m.id}`,
        label: m.canonicalName,
        vocabularyItemId: m.id,
        suggested: idx === 0,
      })),
    });
  }

  // Time dimension question
  const timeDimensions = dimensions.filter(
    (d) =>
      d.category === "time" ||
      d.canonicalName.toLowerCase().includes("date") ||
      d.canonicalName.toLowerCase().includes("time") ||
      d.canonicalName.toLowerCase().includes("created") ||
      d.canonicalName.toLowerCase().includes("timestamp")
  );

  if (timeDimensions.length > 0) {
    questions.push({
      id: "q_primary_time",
      category: "time",
      question: "Which field should be used as the primary time dimension?",
      impact: "This determines how data is aggregated over time",
      options: timeDimensions.map((d, idx) => ({
        id: `opt_${d.id}`,
        label: d.canonicalName,
        vocabularyItemId: d.id,
        suggested: idx === 0,
      })),
    });
  }

  return questions;
}

/**
 * Get vocabulary from a completed analysis
 */
export async function getVocabularyFromAnalysis(
  input: GetVocabularyInput
): Promise<VocabularyResponse | null> {
  // Fetch the analysis
  const analysis = await db
    .select()
    .from(knosiaAnalysis)
    .where(eq(knosiaAnalysis.id, input.analysisId))
    .limit(1)
    .then((res) => res[0]);

  if (!analysis) {
    return null;
  }

  if (analysis.status !== "completed") {
    return null;
  }

  // Get vocabulary items for this workspace/org
  const workspaceId = analysis.workspaceId;

  // If vocabulary items already exist in the database, fetch them
  let vocabularyItems: (typeof knosiaVocabularyItem.$inferSelect)[] = [];

  if (workspaceId) {
    vocabularyItems = await db
      .select()
      .from(knosiaVocabularyItem)
      .where(eq(knosiaVocabularyItem.workspaceId, workspaceId));
  }

  // If no persisted items, extract from the analysis detectedVocab
  const detectedVocab = analysis.detectedVocab as {
    entities?: unknown[];
    metrics?: unknown[];
    dimensions?: unknown[];
  } | null;

  const businessType =
    (analysis.businessType as { detected?: string } | null)?.detected ?? "unknown";

  // Transform detected vocab if we don't have persisted items
  let metrics: VocabularyItem[] = [];
  let dimensions: VocabularyItem[] = [];
  let entities: VocabularyItem[] = [];

  if (vocabularyItems.length > 0) {
    // Use persisted vocabulary items
    metrics = vocabularyItems
      .filter((item) => item.type === "metric")
      .map(transformVocabularyItem);
    dimensions = vocabularyItems
      .filter((item) => item.type === "dimension")
      .map(transformVocabularyItem);
    entities = vocabularyItems
      .filter((item) => item.type === "entity")
      .map(transformVocabularyItem);
  } else if (detectedVocab) {
    // Transform from analysis detectedVocab (temporary items)
    metrics = (detectedVocab.metrics ?? []).map((m: unknown, idx: number) => {
      const metric = m as {
        name?: string;
        canonicalName?: string;
        abbreviation?: string;
        category?: string;
        confidence?: number;
        table?: string;
        column?: string;
        expression?: string;
        description?: string;
      };
      return {
        id: `temp_metric_${idx}`,
        canonicalName: metric.canonicalName ?? metric.name ?? `Metric ${idx + 1}`,
        abbreviation: metric.abbreviation ?? "",
        category: metric.category ?? "general",
        confidence: metric.confidence ?? 70,
        source: {
          table: metric.table ?? "unknown",
          column: metric.column ?? "unknown",
          expression: metric.expression,
        },
        description: metric.description,
      };
    });

    dimensions = (detectedVocab.dimensions ?? []).map(
      (d: unknown, idx: number) => {
        const dim = d as {
          name?: string;
          canonicalName?: string;
          abbreviation?: string;
          category?: string;
          confidence?: number;
          table?: string;
          column?: string;
          description?: string;
        };
        return {
          id: `temp_dimension_${idx}`,
          canonicalName: dim.canonicalName ?? dim.name ?? `Dimension ${idx + 1}`,
          abbreviation: dim.abbreviation ?? "",
          category: dim.category ?? "general",
          confidence: dim.confidence ?? 70,
          source: {
            table: dim.table ?? "unknown",
            column: dim.column ?? "unknown",
          },
          description: dim.description,
        };
      }
    );

    entities = (detectedVocab.entities ?? []).map((e: unknown, idx: number) => {
      const entity = e as {
        name?: string;
        canonicalName?: string;
        abbreviation?: string;
        category?: string;
        confidence?: number;
        table?: string;
        column?: string;
        description?: string;
      };
      return {
        id: `temp_entity_${idx}`,
        canonicalName: entity.canonicalName ?? entity.name ?? `Entity ${idx + 1}`,
        abbreviation: entity.abbreviation ?? "",
        category: entity.category ?? "general",
        confidence: entity.confidence ?? 70,
        source: {
          table: entity.table ?? "unknown",
          column: entity.column ?? "id",
        },
        description: entity.description,
      };
    });
  }

  // Generate confirmation questions
  const questions = generateConfirmationQuestions(
    metrics,
    dimensions,
    businessType
  );

  return {
    analysisId: analysis.id,
    businessType,
    metrics,
    dimensions,
    entities,
    questions,
  };
}
