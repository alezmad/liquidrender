import { db } from "@turbostarter/db/server";
import {
  knosiaWorkspaceCanvas,
  knosiaCanvasVersion,
  knosiaWorkspaceMembership,
} from "@turbostarter/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";

import type { ListCanvasesQuery, ListVersionsQuery } from "./schemas";
import { canViewCanvas } from "./permissions";

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
 * List all canvases across all user's workspaces
 */
export async function listUserCanvases(
  userId: string,
  options: ListCanvasesQuery,
) {
  // Get all workspaces user is a member of
  const workspaceIds = await getUserWorkspaceIds(userId);

  if (workspaceIds.length === 0) {
    return { canvases: [] };
  }

  // Build query conditions
  const conditions = [
    // User can see workspace canvases OR their own private canvases
    or(
      eq(knosiaWorkspaceCanvas.scope, "workspace"),
      eq(knosiaWorkspaceCanvas.ownerId, userId),
    ),
  ];

  // Apply filters
  if (options.scope) {
    conditions.push(eq(knosiaWorkspaceCanvas.scope, options.scope));
  }

  if (!options.includeDeleted) {
    conditions.push(isNull(knosiaWorkspaceCanvas.deletedAt));
  }

  const dbCanvases = await db
    .select({
      id: knosiaWorkspaceCanvas.id,
      workspaceId: knosiaWorkspaceCanvas.workspaceId,
      title: knosiaWorkspaceCanvas.title,
      scope: knosiaWorkspaceCanvas.scope,
      ownerId: knosiaWorkspaceCanvas.ownerId,
      isDefault: knosiaWorkspaceCanvas.isDefault,
      currentVersion: knosiaWorkspaceCanvas.currentVersion,
      lastEditedBy: knosiaWorkspaceCanvas.lastEditedBy,
      createdAt: knosiaWorkspaceCanvas.createdAt,
      updatedAt: knosiaWorkspaceCanvas.updatedAt,
      deletedAt: knosiaWorkspaceCanvas.deletedAt,
    })
    .from(knosiaWorkspaceCanvas)
    .where(and(...conditions))
    .orderBy(
      desc(knosiaWorkspaceCanvas.isDefault),
      desc(knosiaWorkspaceCanvas.updatedAt),
    );

  // Map database fields to frontend Canvas type
  const canvases = dbCanvases.map(canvas => ({
    id: canvas.id,
    workspaceId: canvas.workspaceId,
    name: canvas.title, // Map title -> name
    description: null, // TODO: Add description field to database
    icon: null, // TODO: Add icon field to database
    status: canvas.deletedAt ? "archived" as const : "active" as const,
    layout: null, // TODO: Add layout field to database
    createdAt: canvas.createdAt.toISOString(),
    updatedAt: canvas.updatedAt.toISOString(),
  }));

  return { canvases };
}

/**
 * List canvases in a workspace
 *
 * Returns all canvases the user can view:
 * - Workspace-scoped canvases (all members)
 * - User's private canvases
 */
export async function listCanvases(
  workspaceId: string,
  userId: string,
  options: ListCanvasesQuery,
) {
  // Verify workspace membership
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

  // Build query conditions
  const conditions = [
    eq(knosiaWorkspaceCanvas.workspaceId, workspaceId),
    // User can see workspace canvases OR their own private canvases
    or(
      eq(knosiaWorkspaceCanvas.scope, "workspace"),
      eq(knosiaWorkspaceCanvas.ownerId, userId),
    ),
  ];

  // Apply filters
  if (options.scope) {
    conditions.push(eq(knosiaWorkspaceCanvas.scope, options.scope));
  }

  if (!options.includeDeleted) {
    conditions.push(isNull(knosiaWorkspaceCanvas.deletedAt));
  }

  const canvases = await db
    .select({
      id: knosiaWorkspaceCanvas.id,
      workspaceId: knosiaWorkspaceCanvas.workspaceId,
      title: knosiaWorkspaceCanvas.title,
      scope: knosiaWorkspaceCanvas.scope,
      ownerId: knosiaWorkspaceCanvas.ownerId,
      isDefault: knosiaWorkspaceCanvas.isDefault,
      currentVersion: knosiaWorkspaceCanvas.currentVersion,
      lastEditedBy: knosiaWorkspaceCanvas.lastEditedBy,
      createdAt: knosiaWorkspaceCanvas.createdAt,
      updatedAt: knosiaWorkspaceCanvas.updatedAt,
      deletedAt: knosiaWorkspaceCanvas.deletedAt,
    })
    .from(knosiaWorkspaceCanvas)
    .where(and(...conditions))
    .orderBy(
      desc(knosiaWorkspaceCanvas.isDefault),
      desc(knosiaWorkspaceCanvas.updatedAt),
    );

  return { canvases };
}

/**
 * Get a single canvas
 *
 * Returns full canvas including LiquidSchema
 */
export async function getCanvas(canvasId: string, userId: string) {
  const [canvas] = await db
    .select()
    .from(knosiaWorkspaceCanvas)
    .where(eq(knosiaWorkspaceCanvas.id, canvasId))
    .limit(1);

  if (!canvas) {
    throw new Error("Canvas not found");
  }

  // Check permissions
  const userWorkspaceIds = await getUserWorkspaceIds(userId);
  if (!canViewCanvas(canvas, userId, userWorkspaceIds)) {
    throw new Error("No view permission");
  }

  return canvas;
}

/**
 * List version history for a canvas
 */
export async function getCanvasVersions(
  canvasId: string,
  userId: string,
  options: ListVersionsQuery,
) {
  // Verify user can view canvas
  const canvas = await getCanvas(canvasId, userId);

  const versions = await db
    .select({
      id: knosiaCanvasVersion.id,
      versionNumber: knosiaCanvasVersion.versionNumber,
      createdBy: knosiaCanvasVersion.createdBy,
      changeSummary: knosiaCanvasVersion.changeSummary,
      createdAt: knosiaCanvasVersion.createdAt,
    })
    .from(knosiaCanvasVersion)
    .where(eq(knosiaCanvasVersion.canvasId, canvasId))
    .orderBy(desc(knosiaCanvasVersion.versionNumber))
    .limit(options.limit || 50);

  return { versions };
}

/**
 * Get a specific version of a canvas
 */
export async function getCanvasVersion(
  canvasId: string,
  versionNumber: number,
  userId: string,
) {
  // Verify user can view canvas
  await getCanvas(canvasId, userId);

  const [version] = await db
    .select()
    .from(knosiaCanvasVersion)
    .where(
      and(
        eq(knosiaCanvasVersion.canvasId, canvasId),
        eq(knosiaCanvasVersion.versionNumber, versionNumber),
      ),
    )
    .limit(1);

  if (!version) {
    throw new Error("Version not found");
  }

  return version;
}
