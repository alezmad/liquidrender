import { db } from "@turbostarter/db/server";
import { knosiaCalculatedMetric } from "@turbostarter/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@turbostarter/shared/utils";
import type { CreateMetricInput, UpdateMetricInput } from "./schemas";

/**
 * Create a new calculated metric
 *
 * Can be AI-generated (during onboarding) or user-created
 */
export async function createMetric(input: CreateMetricInput) {
  const metricId = generateId();

  const result = await db
    .insert(knosiaCalculatedMetric)
    .values({
      id: metricId,
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      name: input.name,
      category: input.category ?? "other",
      description: input.description ?? null,
      semanticDefinition: input.semanticDefinition as any, // JSONB type assertion
      confidence: input.confidence?.toString() ?? null,
      feasible: true,
      source: input.source,
      vocabularyItemIds: [],
      canvasCount: 0,
      executionCount: 0,
      status: "active",
    })
    .returning();

  return result[0];
}

/**
 * Update an existing calculated metric
 *
 * Returns null if metric not found
 */
export async function updateMetric(id: string, input: UpdateMetricInput) {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.semanticDefinition !== undefined) {
    updateData.semanticDefinition = input.semanticDefinition as any; // JSONB type assertion
  }
  if (input.status !== undefined) updateData.status = input.status;

  const result = await db
    .update(knosiaCalculatedMetric)
    .set(updateData)
    .where(eq(knosiaCalculatedMetric.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * Delete a calculated metric
 *
 * By default, performs soft delete (sets status to deprecated)
 * Pass hard=true to permanently delete
 */
export async function deleteMetric(id: string, hard = false) {
  if (hard) {
    await db
      .delete(knosiaCalculatedMetric)
      .where(eq(knosiaCalculatedMetric.id, id));
    return true;
  }

  // Soft delete: set status to deprecated
  await db
    .update(knosiaCalculatedMetric)
    .set({
      status: "deprecated",
      updatedAt: new Date(),
    })
    .where(eq(knosiaCalculatedMetric.id, id));

  return true;
}
