import { NextResponse } from "next/server";
import { db } from "@turbostarter/db/server";
import { knosiaOrganization } from "@turbostarter/db/schema";
import { and, lt, eq, isNotNull } from "drizzle-orm";

/**
 * Cron endpoint for cleaning up expired guest organizations.
 *
 * Guest organizations (isGuest=true) have a TTL (expiresAt) set during creation.
 * This endpoint:
 * 1. Finds organizations past their expiration date
 * 2. Deletes them (hard delete for guest orgs)
 * 3. Logs cleanup for monitoring
 *
 * Expected to be called by Vercel Cron or similar scheduler.
 *
 * Security: Should be protected by CRON_SECRET in production.
 */
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // Find expired guest organizations
    const expiredOrgs = await db
      .select({
        id: knosiaOrganization.id,
        name: knosiaOrganization.name,
        expiresAt: knosiaOrganization.expiresAt,
      })
      .from(knosiaOrganization)
      .where(
        and(
          eq(knosiaOrganization.isGuest, true),
          isNotNull(knosiaOrganization.expiresAt),
          lt(knosiaOrganization.expiresAt, now)
        )
      );

    if (expiredOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired guest organizations found",
        processed: 0,
      });
    }

    // Delete expired guest organizations
    const expiredIds = expiredOrgs.map((org) => org.id);

    await db
      .delete(knosiaOrganization)
      .where(
        and(
          eq(knosiaOrganization.isGuest, true),
          isNotNull(knosiaOrganization.expiresAt),
          lt(knosiaOrganization.expiresAt, now)
        )
      );

    console.log(
      `[cron/cleanup-expired-orgs] Deleted ${expiredIds.length} expired guest organizations:`,
      expiredIds
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${expiredIds.length} expired guest organizations`,
      processed: expiredIds.length,
      organizationIds: expiredIds,
    });
  } catch (error) {
    console.error("[cron/cleanup-expired-orgs] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup expired organizations",
      },
      { status: 500 }
    );
  }
}
