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
