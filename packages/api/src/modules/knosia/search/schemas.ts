import { z } from "zod";

import { workspaceIdSchema } from "../shared-schemas";

// ============================================================================
// SEARCH INPUT SCHEMAS
// ============================================================================

export const globalSearchInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  query: z.string().min(1).max(500),
  types: z.array(z.enum(["thread", "canvas", "vocabulary"])).optional(),
  limit: z.number().min(1).max(50).default(20),
});

export const searchQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  query: z.string().min(1).max(500),
  types: z.string().optional(), // comma-separated list
  limit: z.string().optional(),
});

// ============================================================================
// SEARCH RESULT TYPES
// ============================================================================

export const searchResultItemSchema = z.object({
  id: z.string(),
  type: z.enum(["thread", "canvas", "vocabulary"]),
  title: z.string(),
  description: z.string().nullable(),
  matchedField: z.string(), // which field matched
  excerpt: z.string().nullable(), // highlighted excerpt
  updatedAt: z.string(),
  link: z.string(),
});

export const globalSearchResultSchema = z.object({
  query: z.string(),
  results: z.array(searchResultItemSchema),
  counts: z.object({
    thread: z.number(),
    canvas: z.number(),
    vocabulary: z.number(),
    total: z.number(),
  }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GlobalSearchInput = z.infer<typeof globalSearchInputSchema>;
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;
export type GlobalSearchResult = z.infer<typeof globalSearchResultSchema>;
