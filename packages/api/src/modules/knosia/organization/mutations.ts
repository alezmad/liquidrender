import { and, eq, lt, isNotNull } from "@turbostarter/db";
import { knosiaOrganization } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { User } from "@turbostarter/auth";

/** Guest workspace TTL in milliseconds (7 days) */
const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface KnosiaOrgResult {
  id: string;
  name: string;
  isGuest: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Get or create a knosia organization for the user.
 *
 * Strategy:
 * - Each user gets their own knosia org (keyed by their user ID)
 * - For anonymous users: org name is "Guest Workspace" with 7-day TTL
 * - For real users: org name is their name or email, no expiration
 */
export async function getOrCreateKnosiaOrg(user: User): Promise<KnosiaOrgResult> {
  // Use user ID as org ID for 1:1 mapping
  const orgId = `user-${user.id}`;

  // Check if org exists
  const existing = await db
    .select({
      id: knosiaOrganization.id,
      name: knosiaOrganization.name,
      isGuest: knosiaOrganization.isGuest,
      expiresAt: knosiaOrganization.expiresAt,
      createdAt: knosiaOrganization.createdAt,
    })
    .from(knosiaOrganization)
    .where(eq(knosiaOrganization.id, orgId))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      name: existing[0].name,
      isGuest: existing[0].isGuest ?? false,
      expiresAt: existing[0].expiresAt,
      createdAt: existing[0].createdAt,
    };
  }

  // Create new org
  const isAnonymous = user.isAnonymous ?? false;
  const orgName = isAnonymous
    ? "Guest Workspace"
    : user.name ?? user.email ?? "My Workspace";

  // Guest orgs expire in 7 days, registered users never expire
  const expiresAt = isAnonymous ? new Date(Date.now() + GUEST_TTL_MS) : null;

  const [newOrg] = await db
    .insert(knosiaOrganization)
    .values({
      id: orgId,
      name: orgName,
      isGuest: isAnonymous,
      expiresAt,
      // Add domain from email if available
      domain: user.email?.split("@")[1] ?? null,
    })
    .returning({
      id: knosiaOrganization.id,
      name: knosiaOrganization.name,
      isGuest: knosiaOrganization.isGuest,
      expiresAt: knosiaOrganization.expiresAt,
      createdAt: knosiaOrganization.createdAt,
    });

  if (!newOrg) {
    throw new Error("Failed to create organization");
  }

  return {
    id: newOrg.id,
    name: newOrg.name,
    isGuest: newOrg.isGuest ?? false,
    expiresAt: newOrg.expiresAt,
    createdAt: newOrg.createdAt,
  };
}

/**
 * Extend or clear TTL when a guest user converts to registered.
 * Call this when anonymous user links/creates a real account.
 */
export async function convertGuestToRegistered(
  orgId: string,
  newName?: string,
): Promise<KnosiaOrgResult | null> {
  const [updated] = await db
    .update(knosiaOrganization)
    .set({
      isGuest: false,
      expiresAt: null, // Never expires after conversion
      name: newName ?? undefined,
    })
    .where(eq(knosiaOrganization.id, orgId))
    .returning({
      id: knosiaOrganization.id,
      name: knosiaOrganization.name,
      isGuest: knosiaOrganization.isGuest,
      expiresAt: knosiaOrganization.expiresAt,
      createdAt: knosiaOrganization.createdAt,
    });

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    name: updated.name,
    isGuest: updated.isGuest ?? false,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
  };
}

/**
 * Delete expired guest organizations and all related data.
 * Cascade delete handles connections, workspaces, etc.
 *
 * Call this from a cron job or cleanup task.
 */
export async function cleanupExpiredOrgs(): Promise<number> {
  const now = new Date();

  // Delete guest orgs that have expired
  const deleted = await db
    .delete(knosiaOrganization)
    .where(
      and(
        eq(knosiaOrganization.isGuest, true),
        isNotNull(knosiaOrganization.expiresAt),
        lt(knosiaOrganization.expiresAt, now),
      ),
    )
    .returning({ id: knosiaOrganization.id });

  return deleted.length;
}
