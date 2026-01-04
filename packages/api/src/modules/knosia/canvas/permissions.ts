import type { db } from "@turbostarter/db/server";

interface Canvas {
  id: string;
  workspaceId: string;
  ownerId: string;
  scope: "private" | "workspace";
  deletedAt: Date | null;
}

/**
 * Check if user can view canvas
 *
 * Rules:
 * - Deleted canvases are not viewable
 * - Private canvases: owner only
 * - Workspace canvases: any workspace member
 */
export function canViewCanvas(
  canvas: Canvas,
  userId: string,
  userWorkspaceIds: string[],
): boolean {
  // Deleted canvases not viewable
  if (canvas.deletedAt) return false;

  // Private: owner only
  if (canvas.scope === "private") {
    return canvas.ownerId === userId;
  }

  // Workspace: any workspace member
  if (canvas.scope === "workspace") {
    return userWorkspaceIds.includes(canvas.workspaceId);
  }

  return false;
}

/**
 * Check if user can edit canvas
 *
 * Rules:
 * - Must have view permission first
 * - Private canvases: owner only
 * - Workspace canvases: any workspace member
 */
export function canEditCanvas(
  canvas: Canvas,
  userId: string,
  userWorkspaceIds: string[],
): boolean {
  // Must be able to view first
  if (!canViewCanvas(canvas, userId, userWorkspaceIds)) {
    return false;
  }

  // Private: owner only
  if (canvas.scope === "private") {
    return canvas.ownerId === userId;
  }

  // Workspace: any workspace member
  if (canvas.scope === "workspace") {
    return userWorkspaceIds.includes(canvas.workspaceId);
  }

  return false;
}

/**
 * Check if user can delete canvas
 *
 * Rules:
 * - Only owner can delete (regardless of scope)
 */
export function canDeleteCanvas(canvas: Canvas, userId: string): boolean {
  return canvas.ownerId === userId;
}

/**
 * Check if user can change canvas scope
 *
 * Rules:
 * - Only owner can change scope
 * - Can only transition private → workspace (not workspace → private)
 */
export function canChangeScope(
  canvas: Canvas,
  userId: string,
  newScope: "private" | "workspace",
): boolean {
  // Only owner can change scope
  if (canvas.ownerId !== userId) return false;

  // Can only transition private → workspace
  return canvas.scope === "private" && newScope === "workspace";
}
