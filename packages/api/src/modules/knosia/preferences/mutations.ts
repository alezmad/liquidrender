import { and, eq } from "@turbostarter/db";
import { knosiaUserPreference } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import { getPreferences } from "./queries";

import type { UpdatePreferencesInput, PreferencesResponse } from "./schemas";

/**
 * Update user's Knosia preferences for a specific workspace
 * Uses upsert pattern - creates preference record if it doesn't exist
 */
export const updatePreferences = async (
  input: UpdatePreferencesInput,
): Promise<PreferencesResponse> => {
  const { userId, workspaceId, updates } = input;

  // Check if preference record exists
  const existing = await db
    .select()
    .from(knosiaUserPreference)
    .where(
      and(
        eq(knosiaUserPreference.userId, userId),
        eq(knosiaUserPreference.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  // Build update object based on provided fields
  const updateData: Record<string, unknown> = {};

  if (updates.comparisonPeriod !== undefined) {
    updateData.comparisonPeriod = updates.comparisonPeriod;
  }

  if (updates.favorites !== undefined) {
    updateData.favorites = updates.favorites;
  }

  if (updates.aliases !== undefined) {
    updateData.aliases = updates.aliases;
  }

  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }

  if (updates.hiddenItems !== undefined) {
    updateData.hiddenItems = updates.hiddenItems;
  }

  // Handle notification-related fields
  if (updates.briefingTime !== undefined || updates.alertsEnabled !== undefined) {
    // Get existing notification settings or create new object
    const existingNotification = existing[0]?.notification as {
      briefingTime?: string;
      alertChannels?: string[];
      digestFrequency?: string;
      quietHours?: string[];
    } | null;

    const notification = {
      ...existingNotification,
    };

    if (updates.briefingTime !== undefined) {
      notification.briefingTime = updates.briefingTime;
    }

    if (updates.alertsEnabled !== undefined) {
      // Toggle alert channels based on enabled flag
      notification.alertChannels = updates.alertsEnabled
        ? (existingNotification?.alertChannels?.length ? existingNotification.alertChannels : ["email"])
        : [];
    }

    updateData.notification = notification;
  }

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(knosiaUserPreference)
      .set(updateData)
      .where(
        and(
          eq(knosiaUserPreference.userId, userId),
          eq(knosiaUserPreference.workspaceId, workspaceId),
        ),
      );
  } else {
    // Insert new record with defaults
    await db.insert(knosiaUserPreference).values({
      userId,
      workspaceId,
      comparisonPeriod: updates.comparisonPeriod ?? "MoM",
      favorites: updates.favorites ?? {
        pinnedMetrics: [],
        pinnedDashboards: [],
        pinnedQueries: [],
        pinnedFilters: [],
      },
      aliases: updates.aliases ?? {},
      notes: updates.notes ?? {},
      hiddenItems: updates.hiddenItems ?? [],
      notification: {
        briefingTime: updates.briefingTime ?? "09:00",
        alertChannels: updates.alertsEnabled !== false ? ["email"] : [],
        digestFrequency: "daily",
        quietHours: [],
      },
    });
  }

  // Return updated preferences
  return getPreferences({ userId, workspaceId });
};
