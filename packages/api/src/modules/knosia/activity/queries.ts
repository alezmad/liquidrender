import { and, desc, eq, count } from "@turbostarter/db";
import { knosiaActivity } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { GetActivityFeedInput } from "./schemas";

// ============================================================================
// ACTIVITY QUERIES
// ============================================================================

/**
 * Get activity feed for a workspace
 */
export async function getActivityFeed(input: GetActivityFeedInput) {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(knosiaActivity.workspaceId, input.workspaceId),
    input.type ? eq(knosiaActivity.type, input.type) : undefined,
  );

  const data = await db
    .select()
    .from(knosiaActivity)
    .where(where)
    .orderBy(desc(knosiaActivity.createdAt))
    .limit(input.perPage)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(knosiaActivity)
    .where(where)
    .then((res) => res[0]?.count ?? 0);

  return { data, total };
}

/**
 * Get activity by ID
 */
export async function getActivity(id: string) {
  const result = await db
    .select()
    .from(knosiaActivity)
    .where(eq(knosiaActivity.id, id))
    .limit(1);

  return result[0] ?? null;
}
