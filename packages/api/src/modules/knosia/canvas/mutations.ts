import { eq } from "@turbostarter/db";
import {
  knosiaCanvas,
  knosiaCanvasBlock,
  knosiaCanvasAlert,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type {
  CreateCanvasInput,
  UpdateCanvasInput,
  CreateBlockInput,
  UpdateBlockInput,
  ReorderBlocksInput,
  CreateAlertInput,
  UpdateAlertInput,
} from "./schemas";

// ============================================================================
// CANVAS MUTATIONS
// ============================================================================

/**
 * Create a new canvas
 */
export async function createCanvas(input: CreateCanvasInput & { userId: string }) {
  const [canvas] = await db
    .insert(knosiaCanvas)
    .values({
      id: generateId(),
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      icon: input.icon,
      createdBy: input.userId,
      status: "draft",
      layout: { type: "grid" as const, columns: 12 },
    })
    .returning();

  return canvas;
}

/**
 * Update a canvas
 */
export async function updateCanvas(
  id: string,
  input: UpdateCanvasInput,
  userId: string,
) {
  const [canvas] = await db
    .update(knosiaCanvas)
    .set({
      name: input.name,
      description: input.description,
      icon: input.icon,
      status: input.status,
      layout: input.layout as typeof knosiaCanvas.$inferInsert.layout,
    })
    .where(eq(knosiaCanvas.id, id))
    .returning();

  return canvas ?? null;
}

/**
 * Delete a canvas and its blocks/alerts
 */
export async function deleteCanvas(id: string, userId: string) {
  // Blocks and alerts cascade delete via FK
  const [canvas] = await db
    .delete(knosiaCanvas)
    .where(eq(knosiaCanvas.id, id))
    .returning();

  return canvas ?? null;
}

// ============================================================================
// BLOCK MUTATIONS
// ============================================================================

/**
 * Create a new block
 */
export async function createBlock(input: CreateBlockInput) {
  const [block] = await db
    .insert(knosiaCanvasBlock)
    .values({
      id: generateId(),
      canvasId: input.canvasId,
      type: input.type,
      title: input.title,
      position: input.position,
      config: input.config,
      dataSource: input.dataSource,
    })
    .returning();

  return block;
}

/**
 * Update a block
 */
export async function updateBlock(id: string, input: UpdateBlockInput) {
  const [block] = await db
    .update(knosiaCanvasBlock)
    .set({
      title: input.title,
      position: input.position as typeof knosiaCanvasBlock.$inferInsert.position,
      config: input.config as typeof knosiaCanvasBlock.$inferInsert.config,
      dataSource: input.dataSource as typeof knosiaCanvasBlock.$inferInsert.dataSource,
      cachedData: input.cachedData as typeof knosiaCanvasBlock.$inferInsert.cachedData,
    })
    .where(eq(knosiaCanvasBlock.id, id))
    .returning();

  return block ?? null;
}

/**
 * Delete a block
 */
export async function deleteBlock(id: string) {
  const [block] = await db
    .delete(knosiaCanvasBlock)
    .where(eq(knosiaCanvasBlock.id, id))
    .returning();

  return block ?? null;
}

/**
 * Reorder blocks (batch update positions)
 */
export async function reorderBlocks(input: ReorderBlocksInput) {
  const updates = input.blocks.map(({ id, position }) =>
    db
      .update(knosiaCanvasBlock)
      .set({
        position: position as typeof knosiaCanvasBlock.$inferInsert.position,
      })
      .where(eq(knosiaCanvasBlock.id, id))
      .returning()
  );

  const results = await Promise.all(updates);
  return results.flat();
}

// ============================================================================
// ALERT MUTATIONS
// ============================================================================

/**
 * Create a new alert
 */
export async function createAlert(input: CreateAlertInput) {
  const [alert] = await db
    .insert(knosiaCanvasAlert)
    .values({
      id: generateId(),
      canvasId: input.canvasId,
      blockId: input.blockId,
      name: input.name,
      condition: input.condition,
      channels: input.channels,
      enabled: true,
    })
    .returning();

  return alert;
}

/**
 * Update an alert
 */
export async function updateAlert(id: string, input: UpdateAlertInput) {
  const [alert] = await db
    .update(knosiaCanvasAlert)
    .set({
      name: input.name,
      condition: input.condition as typeof knosiaCanvasAlert.$inferInsert.condition,
      channels: input.channels as typeof knosiaCanvasAlert.$inferInsert.channels,
      enabled: input.enabled,
    })
    .where(eq(knosiaCanvasAlert.id, id))
    .returning();

  return alert ?? null;
}

/**
 * Delete an alert
 */
export async function deleteAlert(id: string) {
  const [alert] = await db
    .delete(knosiaCanvasAlert)
    .where(eq(knosiaCanvasAlert.id, id))
    .returning();

  return alert ?? null;
}
