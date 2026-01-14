/**
 * Cascade Impact Helper
 *
 * Queries cascade relationships to get impact counts and item details before deletion.
 * Returns both raw counts and user-facing impact summaries with expandable items.
 */

import { count, eq } from "drizzle-orm";

import { db } from "@turbostarter/db/server";

import { CASCADE_REGISTRY } from "./cascade-registry";

import type { ResourceType } from "./cascade-registry";

/** Maximum items to fetch per relation for preview */
const MAX_PREVIEW_ITEMS = 10;

export interface CascadeImpact {
  [key: string]: number;
}

export interface ImpactItem {
  id: string;
  displayName: string;
}

export interface UserFacingImpact {
  label: string;
  count: number;
  /** Actual records for preview (max 10) */
  items: ImpactItem[];
  /** True if there are more items than shown */
  hasMore: boolean;
}

export interface CascadeImpactResult {
  /** Raw counts keyed by relation name */
  impacts: CascadeImpact;
  /** User-visible impacts (excludes hidden relations, excludes zero counts) */
  userFacingImpacts: UserFacingImpact[];
  /** Total count of user-visible affected records */
  totalAffected: number;
}

/**
 * Get cascade impact for a resource before deletion
 *
 * @param resourceType - The type of resource (connection, workspace, etc.)
 * @param resourceId - The ID of the resource to check
 * @returns Impact counts, user-facing summaries, and item details
 *
 * @example
 * const impact = await getCascadeImpact("connection", connectionId);
 * // { impacts: { calculatedMetrics: 3 }, userFacingImpacts: [{ label: "calculated metrics", count: 3, items: [...], hasMore: false }], totalAffected: 3 }
 */
export async function getCascadeImpact(
  resourceType: ResourceType,
  resourceId: string,
): Promise<CascadeImpactResult> {
  const registry = CASCADE_REGISTRY[resourceType];
  const impacts: CascadeImpact = {};
  const userFacingImpacts: UserFacingImpact[] = [];

  await Promise.all(
    Object.entries(registry).map(async ([key, config]) => {
      const fkColumn = config.table[config.fk as keyof typeof config.table];

      if (!fkColumn) {
        console.warn(
          `Missing FK column "${config.fk}" on table for cascade registry entry "${key}"`,
        );
        impacts[key] = 0;
        return;
      }

      // First get the count
      const countResult = await db
        .select({ count: count() })
        .from(config.table)
        .where(eq(fkColumn, resourceId));

      const countValue = countResult[0]?.count ?? 0;
      impacts[key] = countValue;

      // Only fetch items for user-facing (not hidden) relations with records
      if (!config.hidden && countValue > 0) {
        // Fetch items for preview (limit to MAX_PREVIEW_ITEMS + 1 to detect hasMore)
        const displayField = config.displayField ?? "id";
        const idColumn = config.table["id" as keyof typeof config.table];
        const displayColumn =
          config.table[displayField as keyof typeof config.table];

        const records = await db
          .select({
            id: idColumn,
            displayValue: displayColumn ?? idColumn,
          })
          .from(config.table)
          .where(eq(fkColumn, resourceId))
          .limit(MAX_PREVIEW_ITEMS + 1);

        const hasMore = records.length > MAX_PREVIEW_ITEMS;
        const items: ImpactItem[] = records
          .slice(0, MAX_PREVIEW_ITEMS)
          .map((r) => ({
            id: String(r.id),
            displayName: r.displayValue
              ? String(r.displayValue)
              : "(unnamed)",
          }));

        userFacingImpacts.push({
          label: config.label,
          count: countValue,
          items,
          hasMore,
        });
      }
    }),
  );

  const totalAffected = userFacingImpacts.reduce((sum, i) => sum + i.count, 0);

  return { impacts, userFacingImpacts, totalAffected };
}
