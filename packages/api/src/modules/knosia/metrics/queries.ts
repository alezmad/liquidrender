import { db } from "@turbostarter/db/server";
import { knosiaCalculatedMetric } from "@turbostarter/db/schema";
import { and, eq, desc } from "drizzle-orm";
import type { ListMetricsInput } from "./schemas";

/**
 * List calculated metrics with optional filters
 *
 * Filters:
 * - workspaceId: Filter by workspace
 * - connectionId: Filter by connection
 * - category: Filter by category (revenue, growth, etc.)
 * - status: Filter by status (active, draft, deprecated)
 */
export async function listMetrics(input: ListMetricsInput) {
  const conditions = [];

  if (input.workspaceId) {
    conditions.push(eq(knosiaCalculatedMetric.workspaceId, input.workspaceId));
  }
  if (input.connectionId) {
    conditions.push(eq(knosiaCalculatedMetric.connectionId, input.connectionId));
  }
  if (input.category) {
    conditions.push(eq(knosiaCalculatedMetric.category, input.category));
  }
  if (input.status) {
    conditions.push(eq(knosiaCalculatedMetric.status, input.status));
  }

  return db
    .select()
    .from(knosiaCalculatedMetric)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(knosiaCalculatedMetric.createdAt));
}

/**
 * Get a single calculated metric by ID
 *
 * Returns null if not found (does not throw)
 */
export async function getMetric(id: string) {
  const result = await db
    .select()
    .from(knosiaCalculatedMetric)
    .where(eq(knosiaCalculatedMetric.id, id))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get all calculated metrics for a specific connection
 *
 * Used by the Vocabulary page to show metrics for a connection
 */
export async function getMetricsByConnection(connectionId: string) {
  return db
    .select()
    .from(knosiaCalculatedMetric)
    .where(
      and(
        eq(knosiaCalculatedMetric.connectionId, connectionId),
        eq(knosiaCalculatedMetric.status, "active"),
      ),
    )
    .orderBy(desc(knosiaCalculatedMetric.createdAt));
}
