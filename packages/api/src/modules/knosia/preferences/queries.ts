import { and, eq } from "@turbostarter/db";
import { knosiaUserPreference, knosiaWorkspaceMembership, knosiaRoleTemplate } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { GetPreferencesInput, PreferencesResponse } from "./schemas";

/**
 * Default preferences for new users or when no preferences exist
 */
const DEFAULT_PREFERENCES: PreferencesResponse = {
  defaultConnectionId: null,
  role: "analyst",
  vocabularyOverrides: {},
  comparisonPeriod: "MoM",
  briefingTime: "09:00",
  alertsEnabled: true,
  favorites: {
    pinnedMetrics: [],
    pinnedDashboards: [],
    pinnedQueries: [],
    pinnedFilters: [],
  },
  aliases: {},
  notes: {},
  hiddenItems: [],
};

/**
 * Get user's Knosia preferences for a specific workspace
 * Returns sensible defaults if preferences don't exist
 */
export const getPreferences = async (
  input: GetPreferencesInput,
): Promise<PreferencesResponse> => {
  // Fetch user preference record
  const result = await db
    .select({
      preference: knosiaUserPreference,
      membership: knosiaWorkspaceMembership,
      roleTemplate: knosiaRoleTemplate,
    })
    .from(knosiaUserPreference)
    .leftJoin(
      knosiaWorkspaceMembership,
      and(
        eq(knosiaWorkspaceMembership.userId, knosiaUserPreference.userId),
        eq(knosiaWorkspaceMembership.workspaceId, knosiaUserPreference.workspaceId),
      ),
    )
    .leftJoin(
      knosiaRoleTemplate,
      eq(knosiaRoleTemplate.id, knosiaWorkspaceMembership.roleId),
    )
    .where(
      and(
        eq(knosiaUserPreference.userId, input.userId),
        eq(knosiaUserPreference.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  const record = result[0];

  // If no preferences exist, return defaults
  if (!record) {
    return DEFAULT_PREFERENCES;
  }

  const { preference, roleTemplate } = record;

  // Safely extract notification settings
  const notification = preference.notification as {
    briefingTime?: string;
    alertChannels?: string[];
    digestFrequency?: string;
    quietHours?: string[];
  } | null;

  // Safely extract favorites
  const favorites = preference.favorites as {
    pinnedMetrics?: string[];
    pinnedDashboards?: string[];
    pinnedQueries?: string[];
    pinnedFilters?: Array<{ field: string; value: unknown }>;
  } | null;

  return {
    defaultConnectionId: null, // Not stored in preference table, would need workspace connection
    role: roleTemplate?.name ?? DEFAULT_PREFERENCES.role,
    vocabularyOverrides: (preference.aliases as Record<string, string>) ?? {},
    comparisonPeriod: (preference.comparisonPeriod as "WoW" | "MoM" | "YoY") ?? DEFAULT_PREFERENCES.comparisonPeriod,
    briefingTime: notification?.briefingTime ?? DEFAULT_PREFERENCES.briefingTime,
    alertsEnabled: notification?.alertChannels ? notification.alertChannels.length > 0 : DEFAULT_PREFERENCES.alertsEnabled,
    favorites: {
      pinnedMetrics: favorites?.pinnedMetrics ?? [],
      pinnedDashboards: favorites?.pinnedDashboards ?? [],
      pinnedQueries: favorites?.pinnedQueries ?? [],
      pinnedFilters: favorites?.pinnedFilters ?? [],
    },
    aliases: (preference.aliases as Record<string, string>) ?? {},
    notes: (preference.notes as Record<string, string>) ?? {},
    hiddenItems: (preference.hiddenItems as string[]) ?? [],
  };
};
