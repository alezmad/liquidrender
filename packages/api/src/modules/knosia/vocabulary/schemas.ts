import { z } from "zod";

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for getting vocabulary from an analysis
 */
export const getVocabularySchema = z.object({
  analysisId: z.string().min(1, "Analysis ID is required"),
});

/**
 * Schema for confirming vocabulary selections
 */
export const confirmVocabularySchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionId: z.string().min(1),
    })
  ),
  skipped: z.boolean().optional().default(false),
});

/**
 * Schema for reporting a vocabulary mismatch
 */
export const reportMismatchSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  issue: z.enum(["wrong_mapping", "wrong_name", "missing", "other"]),
  description: z.string().max(500).optional(),
});

/**
 * Schema for listing vocabulary (merged from org/workspace/private)
 */
export const listVocabularySchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  search: z.string().optional(),
  type: z.enum(["metric", "measure", "kpi", "dimension", "entity", "event"]).optional(),
  scope: z.enum(["all", "org", "workspace", "private"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

/**
 * Schema for creating a vocabulary item
 */
export const createVocabularyItemSchema = z.object({
  workspaceId: z.string().optional(), // null = org-level
  orgId: z.string().min(1, "Org ID is required"),
  canonicalName: z.string().min(1, "Canonical name is required"),
  slug: z.string().min(1, "Slug is required"),
  abbreviation: z.string().optional(),
  type: z.enum(["metric", "measure", "kpi", "dimension", "entity", "event"]),
  category: z.string().optional(),
  definition: z
    .object({
      descriptionHuman: z.string().optional(),
      formulaHuman: z.string().optional(),
      formulaSql: z.string().optional(),
      sourceTables: z.array(z.string()).optional(),
    })
    .optional(),
  // KPI-specific fields
  formulaSql: z.string().optional(),
  formulaHuman: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(["ai_generated", "user_created", "detected"]).optional(),
  sourceVocabularyIds: z.array(z.string()).optional(),
  suggestedForRoles: z.array(z.string()).optional(),
});

/**
 * Schema for updating a vocabulary item
 */
export const updateVocabularyItemSchema = z.object({
  canonicalName: z.string().min(1).optional(),
  abbreviation: z.string().optional(),
  category: z.string().optional(),
  definition: z
    .object({
      descriptionHuman: z.string().optional(),
      formulaHuman: z.string().optional(),
      formulaSql: z.string().optional(),
      sourceTables: z.array(z.string()).optional(),
    })
    .optional(),
  suggestedForRoles: z.array(z.string()).optional(),
  status: z.enum(["draft", "approved", "deprecated"]).optional(),
});

/**
 * Schema for updating user vocabulary preferences
 */
export const updateVocabularyPrefsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  favorites: z.array(z.string()).optional(),
  synonyms: z.record(z.string(), z.string()).optional(),
  dismissedSuggestions: z.array(z.string()).optional(),
});

/**
 * Schema for creating private vocabulary
 */
export const createPrivateVocabSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  type: z.enum(["metric", "dimension", "filter"]),
  formula: z.string().min(1, "Formula is required"),
  description: z.string().optional(),
});

/**
 * Schema for updating private vocabulary
 */
export const updatePrivateVocabSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  id: z.string().min(1, "Private vocabulary ID is required"),
  name: z.string().min(1).optional(),
  formula: z.string().min(1).optional(),
  description: z.string().optional(),
});

/**
 * Schema for deleting private vocabulary
 */
export const deletePrivateVocabSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  id: z.string().min(1, "Private vocabulary ID is required"),
});

/**
 * Schema for tracking vocabulary usage
 */
export const trackVocabularyUsageSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  slug: z.string().min(1, "Vocabulary slug is required"),
});

/**
 * Schema for getting vocabulary by slug
 */
export const getVocabularyBySlugSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  slug: z.string().min(1, "Slug is required"),
});

/**
 * Schema for getting user vocabulary preferences
 */
export const getUserVocabularyPrefsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

/**
 * Schema for getting role-based suggestions
 */
export const getSuggestionsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  roleArchetype: z.string().min(1, "Role archetype is required"),
});

/**
 * Schema for previewing a vocabulary item with live data
 */
export const previewVocabularySchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

/**
 * Query schema for preview endpoint (used by Hono zValidator)
 */
export const previewVocabularyQuerySchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Source information for a vocabulary item
 */
export interface VocabularySource {
  table: string;
  column: string;
  expression?: string;
}

/**
 * A single vocabulary item (metric, dimension, or entity)
 */
export interface VocabularyItem {
  id: string;
  canonicalName: string;
  abbreviation: string;
  category: string;
  confidence: number;
  source: VocabularySource;
  description?: string;
}

/**
 * An option in a confirmation question
 */
export interface ConfirmationOption {
  id: string;
  label: string;
  vocabularyItemId: string;
  suggested: boolean;
}

/**
 * A confirmation question for the user
 */
export interface ConfirmationQuestion {
  id: string;
  category: "revenue" | "customers" | "time";
  question: string;
  impact: string;
  options: ConfirmationOption[];
}

/**
 * Full vocabulary response from an analysis
 */
export interface VocabularyResponse {
  analysisId: string;
  businessType: string;
  metrics: VocabularyItem[];
  dimensions: VocabularyItem[];
  entities: VocabularyItem[];
  questions: ConfirmationQuestion[];
}

/**
 * Response after confirming vocabulary
 */
export interface ConfirmVocabularyResponse {
  vocabularyId: string;
  confirmedAt: string;
  answersApplied: number;
}

/**
 * Response after reporting a mismatch
 */
export interface ReportMismatchResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export type GetVocabularyInput = z.infer<typeof getVocabularySchema>;
export type ConfirmVocabularyInput = z.infer<typeof confirmVocabularySchema>;
export type ReportMismatchInput = z.infer<typeof reportMismatchSchema>;
export type ListVocabularyInput = z.infer<typeof listVocabularySchema>;
export type CreateVocabularyItemInput = z.infer<typeof createVocabularyItemSchema>;
export type UpdateVocabularyItemInput = z.infer<typeof updateVocabularyItemSchema>;
export type UpdateVocabularyPrefsInput = z.infer<typeof updateVocabularyPrefsSchema>;
export type CreatePrivateVocabInput = z.infer<typeof createPrivateVocabSchema>;
export type UpdatePrivateVocabInput = z.infer<typeof updatePrivateVocabSchema>;
export type DeletePrivateVocabInput = z.infer<typeof deletePrivateVocabSchema>;
export type TrackVocabularyUsageInput = z.infer<typeof trackVocabularyUsageSchema>;
export type GetVocabularyBySlugInput = z.infer<typeof getVocabularyBySlugSchema>;
export type GetUserVocabularyPrefsInput = z.infer<typeof getUserVocabularyPrefsSchema>;
export type GetSuggestionsInput = z.infer<typeof getSuggestionsSchema>;
export type PreviewVocabularyInput = z.infer<typeof previewVocabularySchema>;
