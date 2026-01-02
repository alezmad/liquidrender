import { eq, and, sql } from "@turbostarter/db";
import {
  knosiaAnalysis,
  knosiaVocabularyItem,
  knosiaMismatchReport,
  knosiaWorkspace,
  knosiaUserVocabularyPrefs,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { compileVocabulary } from "@repo/liquid-connect";
import { generateId } from "@turbostarter/shared/utils";

import { transformToDetectedVocabulary } from "../shared/transforms";

import type {
  ConfirmVocabularyInput,
  ReportMismatchInput,
  ConfirmVocabularyResponse,
  ReportMismatchResponse,
  CreateVocabularyItemInput,
  UpdateVocabularyItemInput,
  UpdateVocabularyPrefsInput,
  CreatePrivateVocabInput,
  UpdatePrivateVocabInput,
  DeletePrivateVocabInput,
  TrackVocabularyUsageInput,
} from "./schemas";

/**
 * Slugify a canonical name for database storage
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Confirm vocabulary selections from an analysis
 * Creates vocabulary items in the database based on user confirmations
 */
export async function confirmVocabulary(
  analysisId: string,
  input: ConfirmVocabularyInput,
  userId: string
): Promise<ConfirmVocabularyResponse | null> {
  // Fetch the analysis to get workspace/org context
  const analysis = await db
    .select()
    .from(knosiaAnalysis)
    .where(eq(knosiaAnalysis.id, analysisId))
    .limit(1)
    .then((res) => res[0]);

  if (!analysis) {
    return null;
  }

  if (analysis.status !== "completed") {
    return null;
  }

  const workspaceId = analysis.workspaceId;
  const detectedVocab = analysis.detectedVocab as {
    entities?: unknown[];
    metrics?: unknown[];
    dimensions?: unknown[];
  } | null;

  if (!detectedVocab || !workspaceId) {
    return null;
  }

  // Get the connection to find the orgId
  const { knosiaConnection } = await import("@turbostarter/db/schema");
  const connection = await db
    .select()
    .from(knosiaConnection)
    .where(eq(knosiaConnection.id, analysis.connectionId))
    .limit(1)
    .then((res) => res[0]);

  if (!connection) {
    return null;
  }

  const orgId = connection.orgId;

  // Build a map of selected vocabulary item IDs from answers
  const selectedItemIds = new Set<string>();
  const answerMap = new Map<string, string>();

  for (const answer of input.answers) {
    answerMap.set(answer.questionId, answer.selectedOptionId);
    // Extract the vocabulary item ID from the option ID
    // Option IDs are formatted as "opt_{vocabularyItemId}"
    const itemId = answer.selectedOptionId.replace(/^opt_/, "");
    selectedItemIds.add(itemId);
  }

  // If skipped, we still create vocabulary items using defaults
  let answersApplied = input.answers.length;

  if (input.skipped) {
    // Use suggested options as defaults
    answersApplied = 0;
  }

  // Prepare vocabulary items to insert
  const itemsToInsert: (typeof knosiaVocabularyItem.$inferInsert)[] = [];

  // Helper to add items from detected vocab
  const addItems = (
    items: unknown[],
    type: "metric" | "dimension" | "entity"
  ) => {
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx] as {
        name?: string;
        canonicalName?: string;
        abbreviation?: string;
        category?: string;
        confidence?: number;
        table?: string;
        column?: string;
        expression?: string;
        description?: string;
        aggregation?: string;
        cardinality?: number;
      };

      const canonicalName =
        item.canonicalName ?? item.name ?? `${type} ${idx + 1}`;
      const tempId = `temp_${type}_${idx}`;

      // Skip if not selected (when not skipping and there were selections)
      if (!input.skipped && selectedItemIds.size > 0 && !selectedItemIds.has(tempId)) {
        continue;
      }

      itemsToInsert.push({
        workspaceId,
        orgId,
        canonicalName,
        abbreviation: item.abbreviation ?? null,
        slug: slugify(canonicalName),
        aliases: [],
        type,
        category: item.category ?? null,
        status: "approved",
        aggregation: item.aggregation as
          | "SUM"
          | "AVG"
          | "COUNT"
          | "MIN"
          | "MAX"
          | null,
        aggregationConfidence: item.confidence ?? 70,
        cardinality: item.cardinality ?? null,
        definition: {
          descriptionHuman: item.description,
          formulaSql: item.expression,
          sourceTables: item.table ? [item.table] : [],
        },
      });
    }
  };

  // Add all item types
  addItems(detectedVocab.metrics ?? [], "metric");
  addItems(detectedVocab.dimensions ?? [], "dimension");
  addItems(detectedVocab.entities ?? [], "entity");

  // Insert vocabulary items in a transaction
  let vocabularyId = "";

  await db.transaction(async (tx) => {
    // Delete existing vocabulary items for this workspace (replace mode)
    await tx
      .delete(knosiaVocabularyItem)
      .where(eq(knosiaVocabularyItem.workspaceId, workspaceId));

    // Insert new items
    if (itemsToInsert.length > 0) {
      const inserted = await tx
        .insert(knosiaVocabularyItem)
        .values(itemsToInsert)
        .returning({ id: knosiaVocabularyItem.id });

      // Use the first item's ID as the vocabulary ID (for reference)
      vocabularyId = inserted[0]?.id ?? workspaceId;
    } else {
      vocabularyId = workspaceId;
    }
  });

  // Compile vocabulary for Query Engine and cache in workspace
  await compileAndCacheVocabulary(workspaceId);

  return {
    vocabularyId,
    confirmedAt: new Date().toISOString(),
    answersApplied,
  };
}

/**
 * Compile vocabulary items and cache in workspace for Query Engine
 */
export async function compileAndCacheVocabulary(
  workspaceId: string
): Promise<void> {
  // Load all vocabulary items for workspace
  const items = await db.query.knosiaVocabularyItem.findMany({
    where: eq(knosiaVocabularyItem.workspaceId, workspaceId),
  });

  if (items.length === 0) {
    return;
  }

  // Transform to DetectedVocabulary format
  const detected = transformToDetectedVocabulary(items);

  // Compile for Query Engine
  const compiled = compileVocabulary(detected, {
    includeDefaultPatterns: true,
    includeGlobalSynonyms: true,
  });

  // Serialize for JSONB storage (Date → string)
  const serializedCompiled = {
    ...compiled,
    compiledAt: compiled.compiledAt.toISOString(),
  };

  // Cache in workspace
  await db
    .update(knosiaWorkspace)
    .set({
      compiledVocabulary: serializedCompiled,
      vocabularyVersion: sql`vocabulary_version + 1`,
    })
    .where(eq(knosiaWorkspace.id, workspaceId));
}

/**
 * Report a vocabulary mismatch/issue
 */
export async function reportMismatch(
  itemId: string,
  userId: string,
  workspaceId: string | null,
  input: ReportMismatchInput
): Promise<ReportMismatchResponse> {
  // Check if this item exists
  const item = await db
    .select()
    .from(knosiaVocabularyItem)
    .where(eq(knosiaVocabularyItem.id, itemId))
    .limit(1)
    .then((res) => res[0]);

  if (!item) {
    return {
      success: false,
      message: "Vocabulary item not found",
    };
  }

  // Check for existing report from this user for this item
  const existingReport = await db
    .select()
    .from(knosiaMismatchReport)
    .where(
      and(
        eq(knosiaMismatchReport.itemId, itemId),
        eq(knosiaMismatchReport.userId, userId),
        eq(knosiaMismatchReport.status, "pending")
      )
    )
    .limit(1)
    .then((res) => res[0]);

  if (existingReport) {
    return {
      success: true,
      message: "Already received - thank you",
    };
  }

  try {
    // Create the mismatch report
    await db.insert(knosiaMismatchReport).values({
      itemId: input.itemId,
      userId,
      workspaceId,
      issueType: input.issue,
      description: input.description ?? null,
      status: "pending",
    });

    return {
      success: true,
      message: "Thanks, we'll review this",
    };
  } catch (error) {
    console.error("Failed to create mismatch report:", error);
    return {
      success: false,
      message: "Couldn't send - try again",
    };
  }
}

// ============================================================================
// New Vocabulary CRUD Mutations
// ============================================================================

/**
 * Create a new vocabulary item
 */
export async function createVocabularyItem(
  input: CreateVocabularyItemInput
): Promise<typeof knosiaVocabularyItem.$inferSelect> {
  const [item] = await db
    .insert(knosiaVocabularyItem)
    .values({
      orgId: input.orgId,
      workspaceId: input.workspaceId ?? null,
      canonicalName: input.canonicalName,
      slug: input.slug,
      abbreviation: input.abbreviation ?? null,
      type: input.type,
      category: input.category ?? null,
      status: "draft",
      definition: input.definition ?? null,
      suggestedForRoles: input.suggestedForRoles ?? null,
    })
    .returning();

  return item!;
}

/**
 * Update an existing vocabulary item
 */
export async function updateVocabularyItem(
  itemId: string,
  input: UpdateVocabularyItemInput
): Promise<typeof knosiaVocabularyItem.$inferSelect | null> {
  const [updated] = await db
    .update(knosiaVocabularyItem)
    .set({
      canonicalName: input.canonicalName,
      abbreviation: input.abbreviation,
      category: input.category,
      definition: input.definition,
      suggestedForRoles: input.suggestedForRoles,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(knosiaVocabularyItem.id, itemId))
    .returning();

  return updated ?? null;
}

/**
 * Mark a vocabulary item as deprecated
 */
export async function deprecateVocabularyItem(
  itemId: string
): Promise<typeof knosiaVocabularyItem.$inferSelect | null> {
  const [updated] = await db
    .update(knosiaVocabularyItem)
    .set({
      status: "deprecated",
      updatedAt: new Date(),
    })
    .where(eq(knosiaVocabularyItem.id, itemId))
    .returning();

  return updated ?? null;
}

// ============================================================================
// User Vocabulary Preferences Mutations
// ============================================================================

/**
 * Ensure user vocabulary prefs exist (upsert)
 */
async function ensureUserVocabularyPrefs(
  userId: string,
  workspaceId: string
): Promise<typeof knosiaUserVocabularyPrefs.$inferSelect> {
  const existing = await db.query.knosiaUserVocabularyPrefs.findFirst({
    where: and(
      eq(knosiaUserVocabularyPrefs.userId, userId),
      eq(knosiaUserVocabularyPrefs.workspaceId, workspaceId)
    ),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(knosiaUserVocabularyPrefs)
    .values({
      userId,
      workspaceId,
      favorites: [],
      synonyms: {},
      recentlyUsed: [],
      dismissedSuggestions: [],
      privateVocabulary: [],
    })
    .returning();

  return created!;
}

/**
 * Update user vocabulary preferences
 */
export async function updateUserVocabularyPrefs(
  userId: string,
  input: UpdateVocabularyPrefsInput
): Promise<{
  favorites: string[];
  synonyms: Record<string, string>;
  dismissedSuggestions: string[];
}> {
  const prefs = await ensureUserVocabularyPrefs(userId, input.workspaceId);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.favorites !== undefined) {
    updateData.favorites = input.favorites;
  }
  if (input.synonyms !== undefined) {
    updateData.synonyms = input.synonyms;
  }
  if (input.dismissedSuggestions !== undefined) {
    updateData.dismissedSuggestions = input.dismissedSuggestions;
  }

  const [updated] = await db
    .update(knosiaUserVocabularyPrefs)
    .set(updateData)
    .where(eq(knosiaUserVocabularyPrefs.id, prefs.id))
    .returning();

  return {
    favorites: (updated!.favorites as string[]) ?? [],
    synonyms: (updated!.synonyms as Record<string, string>) ?? {},
    dismissedSuggestions: (updated!.dismissedSuggestions as string[]) ?? [],
  };
}

/**
 * Create a private vocabulary item
 */
export async function createPrivateVocabulary(
  userId: string,
  input: CreatePrivateVocabInput
): Promise<{
  id: string;
  name: string;
  slug: string;
  type: "metric" | "dimension" | "filter";
  formula: string;
  description?: string;
  createdAt: string;
}> {
  const prefs = await ensureUserVocabularyPrefs(userId, input.workspaceId);

  const newItem = {
    id: generateId(),
    name: input.name,
    slug: input.slug,
    type: input.type,
    formula: input.formula,
    description: input.description,
    createdAt: new Date().toISOString(),
  };

  const currentPrivate =
    (prefs.privateVocabulary as {
      id: string;
      name: string;
      slug: string;
      type: "metric" | "dimension" | "filter";
      formula: string;
      description?: string;
      createdAt: string;
    }[]) ?? [];

  await db
    .update(knosiaUserVocabularyPrefs)
    .set({
      privateVocabulary: [...currentPrivate, newItem],
      updatedAt: new Date(),
    })
    .where(eq(knosiaUserVocabularyPrefs.id, prefs.id));

  return newItem;
}

/**
 * Update a private vocabulary item
 */
export async function updatePrivateVocabulary(
  userId: string,
  input: UpdatePrivateVocabInput
): Promise<{
  id: string;
  name: string;
  slug: string;
  type: "metric" | "dimension" | "filter";
  formula: string;
  description?: string;
  createdAt: string;
} | null> {
  const prefs = await db.query.knosiaUserVocabularyPrefs.findFirst({
    where: and(
      eq(knosiaUserVocabularyPrefs.userId, userId),
      eq(knosiaUserVocabularyPrefs.workspaceId, input.workspaceId)
    ),
  });

  if (!prefs) {
    return null;
  }

  const currentPrivate =
    (prefs.privateVocabulary as {
      id: string;
      name: string;
      slug: string;
      type: "metric" | "dimension" | "filter";
      formula: string;
      description?: string;
      createdAt: string;
    }[]) ?? [];

  const itemIndex = currentPrivate.findIndex((item) => item.id === input.id);
  if (itemIndex === -1) {
    return null;
  }

  const existingItem = currentPrivate[itemIndex]!;
  const updatedItem: {
    id: string;
    name: string;
    slug: string;
    type: "metric" | "dimension" | "filter";
    formula: string;
    description?: string;
    createdAt: string;
  } = {
    id: existingItem.id,
    name: input.name ?? existingItem.name,
    slug: existingItem.slug,
    type: existingItem.type,
    formula: input.formula ?? existingItem.formula,
    description: input.description ?? existingItem.description,
    createdAt: existingItem.createdAt,
  };

  const updatedPrivate = [
    ...currentPrivate.slice(0, itemIndex),
    updatedItem,
    ...currentPrivate.slice(itemIndex + 1),
  ];

  await db
    .update(knosiaUserVocabularyPrefs)
    .set({
      privateVocabulary: updatedPrivate,
      updatedAt: new Date(),
    })
    .where(eq(knosiaUserVocabularyPrefs.id, prefs.id));

  return updatedItem;
}

/**
 * Delete a private vocabulary item
 */
export async function deletePrivateVocabulary(
  userId: string,
  input: DeletePrivateVocabInput
): Promise<boolean> {
  const prefs = await db.query.knosiaUserVocabularyPrefs.findFirst({
    where: and(
      eq(knosiaUserVocabularyPrefs.userId, userId),
      eq(knosiaUserVocabularyPrefs.workspaceId, input.workspaceId)
    ),
  });

  if (!prefs) {
    return false;
  }

  const currentPrivate =
    (prefs.privateVocabulary as {
      id: string;
      name: string;
      slug: string;
      type: "metric" | "dimension" | "filter";
      formula: string;
      description?: string;
      createdAt: string;
    }[]) ?? [];

  const filtered = currentPrivate.filter((item) => item.id !== input.id);

  if (filtered.length === currentPrivate.length) {
    return false; // Nothing was removed
  }

  await db
    .update(knosiaUserVocabularyPrefs)
    .set({
      privateVocabulary: filtered,
      updatedAt: new Date(),
    })
    .where(eq(knosiaUserVocabularyPrefs.id, prefs.id));

  return true;
}

/**
 * Track vocabulary usage (for recently used list)
 */
export async function trackVocabularyUsage(
  userId: string,
  input: TrackVocabularyUsageInput
): Promise<void> {
  const prefs = await ensureUserVocabularyPrefs(userId, input.workspaceId);

  const recentlyUsed =
    (prefs.recentlyUsed as { slug: string; lastUsedAt: string; useCount: number }[]) ?? [];

  const now = new Date().toISOString();
  const existingIndex = recentlyUsed.findIndex((r) => r.slug === input.slug);

  let updated: { slug: string; lastUsedAt: string; useCount: number }[];

  if (existingIndex >= 0) {
    // Update existing entry
    const existingEntry = recentlyUsed[existingIndex]!;
    updated = [
      ...recentlyUsed.slice(0, existingIndex),
      {
        slug: input.slug,
        lastUsedAt: now,
        useCount: existingEntry.useCount + 1,
      },
      ...recentlyUsed.slice(existingIndex + 1),
    ];
  } else {
    // Add new entry
    updated = [
      { slug: input.slug, lastUsedAt: now, useCount: 1 },
      ...recentlyUsed,
    ];
  }

  // Keep only the most recent 50 entries
  updated.sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
  updated = updated.slice(0, 50);

  await db
    .update(knosiaUserVocabularyPrefs)
    .set({
      recentlyUsed: updated,
      updatedAt: new Date(),
    })
    .where(eq(knosiaUserVocabularyPrefs.id, prefs.id));
}
