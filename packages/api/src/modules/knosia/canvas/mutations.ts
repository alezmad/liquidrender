import { db } from "@turbostarter/db/server";
import {
  knosiaWorkspaceCanvas,
  knosiaCanvasVersion,
  knosiaWorkspaceMembership,
} from "@turbostarter/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";
import { generateId } from "@turbostarter/shared/utils";

import type { CreateCanvasInput, UpdateCanvasInput } from "./schemas";
import { canEditCanvas, canDeleteCanvas, canChangeScope } from "./permissions";

/**
 * Get all workspaces user is a member of
 */
async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ workspaceId: knosiaWorkspaceMembership.workspaceId })
    .from(knosiaWorkspaceMembership)
    .where(eq(knosiaWorkspaceMembership.userId, userId));

  return memberships.map((m) => m.workspaceId);
}

/**
 * Verify workspace membership
 */
async function verifyWorkspaceMembership(
  workspaceId: string,
  userId: string,
) {
  const memberships = await db
    .select()
    .from(knosiaWorkspaceMembership)
    .where(
      and(
        eq(knosiaWorkspaceMembership.workspaceId, workspaceId),
        eq(knosiaWorkspaceMembership.userId, userId),
      ),
    )
    .limit(1);

  if (!memberships.length) {
    throw new Error("Not a workspace member");
  }

  return memberships[0];
}

/**
 * Create a new canvas
 */
export async function createCanvas(input: CreateCanvasInput, userId: string) {
  // Verify workspace membership
  await verifyWorkspaceMembership(input.workspaceId, userId);

  // Create canvas
  const [canvas] = await db
    .insert(knosiaWorkspaceCanvas)
    .values({
      id: generateId(),
      workspaceId: input.workspaceId,
      title: input.title,
      schema: input.schema,
      scope: input.scope,
      ownerId: userId,
      isDefault: false,
      currentVersion: 1,
      lastEditedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return canvas;
}

/**
 * Update a canvas
 *
 * Automatically creates version history and handles optimistic locking
 */
export async function updateCanvas(
  canvasId: string,
  input: UpdateCanvasInput,
  userId: string,
) {
  return db.transaction(async (tx) => {
    // 1. Get current canvas with lock
    const [canvas] = await tx
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.id, canvasId))
      .for("update");

    if (!canvas) {
      throw new Error("Canvas not found");
    }

    // 2. Verify edit permission
    const userWorkspaceIds = await getUserWorkspaceIds(userId);
    if (!canEditCanvas(canvas, userId, userWorkspaceIds)) {
      throw new Error("No edit permission");
    }

    // 3. Optimistic locking check
    if (input.expectedVersion !== canvas.currentVersion) {
      throw new Error("Version conflict");
    }

    const nextVersion = canvas.currentVersion + 1;

    // 4. Save current state as version
    await tx.insert(knosiaCanvasVersion).values({
      id: generateId(),
      canvasId,
      versionNumber: canvas.currentVersion,
      schema: canvas.schema,
      createdBy: canvas.lastEditedBy || canvas.ownerId,
      changeSummary: null,
      createdAt: canvas.updatedAt,
    });

    // 5. Update canvas
    const [updated] = await tx
      .update(knosiaWorkspaceCanvas)
      .set({
        ...(input.title && { title: input.title }),
        ...(input.schema && { schema: input.schema }),
        currentVersion: nextVersion,
        lastEditedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(knosiaWorkspaceCanvas.id, canvasId))
      .returning();

    // 6. Prune old versions (keep last 50)
    await tx
      .delete(knosiaCanvasVersion)
      .where(
        and(
          eq(knosiaCanvasVersion.canvasId, canvasId),
          lt(knosiaCanvasVersion.versionNumber, nextVersion - 50),
        ),
      );

    return updated;
  });
}

/**
 * Delete a canvas (soft delete)
 */
export async function deleteCanvas(
  canvasId: string,
  userId: string,
  permanent = false,
) {
  const [canvas] = await db
    .select()
    .from(knosiaWorkspaceCanvas)
    .where(eq(knosiaWorkspaceCanvas.id, canvasId))
    .limit(1);

  if (!canvas) {
    throw new Error("Canvas not found");
  }

  // Only owner can delete
  if (!canDeleteCanvas(canvas, userId)) {
    throw new Error("Not canvas owner");
  }

  // Cannot delete default workspace canvas
  if (canvas.isDefault) {
    throw new Error("Cannot delete default workspace canvas");
  }

  if (permanent) {
    // Hard delete (cascades to versions)
    await db
      .delete(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.id, canvasId));

    return { success: true, deletedAt: null };
  }

  // Soft delete
  const deletedAt = new Date();
  await db
    .update(knosiaWorkspaceCanvas)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(knosiaWorkspaceCanvas.id, canvasId));

  return { success: true, deletedAt: deletedAt.toISOString() };
}

/**
 * Change canvas scope (private → workspace only)
 */
export async function changeCanvasScope(
  canvasId: string,
  newScope: "workspace",
  userId: string,
) {
  const [canvas] = await db
    .select()
    .from(knosiaWorkspaceCanvas)
    .where(eq(knosiaWorkspaceCanvas.id, canvasId))
    .limit(1);

  if (!canvas) {
    throw new Error("Canvas not found");
  }

  // Verify permission
  if (!canChangeScope(canvas, userId, newScope)) {
    if (canvas.ownerId !== userId) {
      throw new Error("Not canvas owner");
    }
    throw new Error("Invalid scope transition");
  }

  // Update scope
  const [updated] = await db
    .update(knosiaWorkspaceCanvas)
    .set({ scope: newScope, updatedAt: new Date() })
    .where(eq(knosiaWorkspaceCanvas.id, canvasId))
    .returning({
      id: knosiaWorkspaceCanvas.id,
      scope: knosiaWorkspaceCanvas.scope,
      updatedAt: knosiaWorkspaceCanvas.updatedAt,
    });

  return updated;
}

/**
 * Restore a canvas to a previous version
 */
export async function restoreCanvasVersion(
  canvasId: string,
  versionNumber: number,
  userId: string,
) {
  return db.transaction(async (tx) => {
    // 1. Get current canvas
    const [canvas] = await tx
      .select()
      .from(knosiaWorkspaceCanvas)
      .where(eq(knosiaWorkspaceCanvas.id, canvasId))
      .for("update");

    if (!canvas) {
      throw new Error("Canvas not found");
    }

    // 2. Verify edit permission
    const userWorkspaceIds = await getUserWorkspaceIds(userId);
    if (!canEditCanvas(canvas, userId, userWorkspaceIds)) {
      throw new Error("No edit permission");
    }

    // 3. Get version to restore
    const [version] = await tx
      .select()
      .from(knosiaCanvasVersion)
      .where(
        and(
          eq(knosiaCanvasVersion.canvasId, canvasId),
          eq(knosiaCanvasVersion.versionNumber, versionNumber),
        ),
      );

    if (!version) {
      throw new Error("Version not found");
    }

    const nextVersion = canvas.currentVersion + 1;

    // 4. Save current state as version
    await tx.insert(knosiaCanvasVersion).values({
      id: generateId(),
      canvasId,
      versionNumber: canvas.currentVersion,
      schema: canvas.schema,
      createdBy: canvas.lastEditedBy || canvas.ownerId,
      changeSummary: null,
      createdAt: canvas.updatedAt,
    });

    // 5. Update canvas with restored schema
    await tx
      .update(knosiaWorkspaceCanvas)
      .set({
        schema: version.schema,
        currentVersion: nextVersion,
        lastEditedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(knosiaWorkspaceCanvas.id, canvasId));

    // 6. Prune old versions
    await tx
      .delete(knosiaCanvasVersion)
      .where(
        and(
          eq(knosiaCanvasVersion.canvasId, canvasId),
          lt(knosiaCanvasVersion.versionNumber, nextVersion - 50),
        ),
      );

    return {
      currentVersion: nextVersion,
      restoredFromVersion: versionNumber,
      schema: version.schema,
      updatedAt: new Date().toISOString(),
    };
  });
}
