import { z } from "zod";

import { connectionIdSchema } from "../shared-schemas";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const updatePreferencesSchema = z.object({
  defaultConnectionId: connectionIdSchema.optional(),
  role: z.string().optional(),
  comparisonPeriod: z.enum(["WoW", "MoM", "YoY"]).optional(),
  briefingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  alertsEnabled: z.boolean().optional(),
  // Extended preferences from DB schema
  favorites: z
    .object({
      pinnedMetrics: z.array(z.string()).optional(),
      pinnedDashboards: z.array(z.string()).optional(),
      pinnedQueries: z.array(z.string()).optional(),
      pinnedFilters: z
        .array(z.object({ field: z.string(), value: z.unknown() }))
        .optional(),
    })
    .optional(),
  aliases: z.record(z.string(), z.string()).optional(),
  notes: z.record(z.string(), z.string()).optional(),
  hiddenItems: z.array(z.string()).optional(),
});

export const getPreferencesInputSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
});

export const updatePreferencesInputSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  updates: updatePreferencesSchema,
});

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface PreferencesResponse {
  defaultConnectionId: string | null;
  role: string;
  vocabularyOverrides: Record<string, string>;
  comparisonPeriod: "WoW" | "MoM" | "YoY";
  briefingTime: string;
  alertsEnabled: boolean;
  favorites: {
    pinnedMetrics: string[];
    pinnedDashboards: string[];
    pinnedQueries: string[];
    pinnedFilters: Array<{ field: string; value: unknown }>;
  };
  aliases: Record<string, string>;
  notes: Record<string, string>;
  hiddenItems: string[];
}

// ============================================================================
// TYPES
// ============================================================================

export type GetPreferencesInput = z.infer<typeof getPreferencesInputSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;
export type UpdatePreferencesPayload = z.infer<typeof updatePreferencesSchema>;
