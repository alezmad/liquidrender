import { and, desc, eq, count } from "@turbostarter/db";
import {
  knosiaCanvas,
  knosiaCanvasBlock,
  knosiaCanvasAlert,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { GetCanvasesInput } from "./schemas";

// ============================================================================
// CANVAS QUERIES
// ============================================================================

/**
 * Get a canvas by ID with access check
 */
export async function getCanvas(id: string, userId: string) {
  const result = await db
    .select()
    .from(knosiaCanvas)
    .where(
      and(
        eq(knosiaCanvas.id, id),
        eq(knosiaCanvas.createdBy, userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get canvases for a workspace
 */
export async function getCanvases(input: GetCanvasesInput & { userId: string }) {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(knosiaCanvas.workspaceId, input.workspaceId),
    eq(knosiaCanvas.createdBy, input.userId),
    input.status ? eq(knosiaCanvas.status, input.status) : undefined,
  );

  const data = await db
    .select()
    .from(knosiaCanvas)
    .where(where)
    .orderBy(desc(knosiaCanvas.updatedAt))
    .limit(input.perPage)
    .offset(offset);

  const total = await db
    .select({ count: count() })
    .from(knosiaCanvas)
    .where(where)
    .then((res) => res[0]?.count ?? 0);

  return { data, total };
}

// ============================================================================
// BLOCK QUERIES
// ============================================================================

/**
 * Get all blocks for a canvas
 */
export async function getCanvasBlocks(canvasId: string) {
  return db
    .select()
    .from(knosiaCanvasBlock)
    .where(eq(knosiaCanvasBlock.canvasId, canvasId))
    .orderBy(knosiaCanvasBlock.createdAt);
}

/**
 * Get a block by ID
 */
export async function getBlock(id: string) {
  const result = await db
    .select()
    .from(knosiaCanvasBlock)
    .where(eq(knosiaCanvasBlock.id, id))
    .limit(1);

  return result[0] ?? null;
}

// ============================================================================
// ALERT QUERIES
// ============================================================================

/**
 * Get all alerts for a canvas
 */
export async function getCanvasAlerts(canvasId: string) {
  return db
    .select()
    .from(knosiaCanvasAlert)
    .where(eq(knosiaCanvasAlert.canvasId, canvasId))
    .orderBy(knosiaCanvasAlert.createdAt);
}

/**
 * Get an alert by ID
 */
export async function getAlert(id: string) {
  const result = await db
    .select()
    .from(knosiaCanvasAlert)
    .where(eq(knosiaCanvasAlert.id, id))
    .limit(1);

  return result[0] ?? null;
}
