import { and, desc, eq, gte, sql, count } from "@turbostarter/db";
import {
  knosiaAiInsight,
  knosiaVocabularyItem,
  knosiaWorkspace,
  knosiaWorkspaceMembership,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

// ============================================================================
// WORKSPACE & MEMBERSHIP QUERIES
// ============================================================================

/**
 * Get workspace with vocabulary for insight generation
 */
export async function getWorkspaceWithVocabulary(workspaceId: string) {
  const workspace = await db
    .select()
    .from(knosiaWorkspace)
    .where(eq(knosiaWorkspace.id, workspaceId))
    .limit(1);

  if (!workspace[0]) return null;

  const vocabularyItems = await db
    .select()
    .from(knosiaVocabularyItem)
    .where(
      and(
        eq(knosiaVocabularyItem.workspaceId, workspaceId),
        eq(knosiaVocabularyItem.type, "metric"),
      ),
    );

  return {
    ...workspace[0],
    metrics: vocabularyItems,
  };
}

/**
 * Get workspace member user IDs
 */
export async function getWorkspaceMemberIds(workspaceId: string): Promise<string[]> {
  const members = await db
    .select({ userId: knosiaWorkspaceMembership.userId })
    .from(knosiaWorkspaceMembership)
    .where(eq(knosiaWorkspaceMembership.workspaceId, workspaceId));

  return members.map((m) => m.userId);
}

// ============================================================================
// INSIGHT HISTORY QUERIES
// ============================================================================

/**
 * Get recent insights to avoid duplicates
 */
export async function getRecentInsights(workspaceId: string, days: number = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return db
    .select({
      id: knosiaAiInsight.id,
      headline: knosiaAiInsight.headline,
      category: knosiaAiInsight.category,
      evidence: knosiaAiInsight.evidence,
      surfacedAt: knosiaAiInsight.surfacedAt,
    })
    .from(knosiaAiInsight)
    .where(
      and(
        eq(knosiaAiInsight.workspaceId, workspaceId),
        gte(knosiaAiInsight.surfacedAt, cutoff),
      ),
    )
    .orderBy(desc(knosiaAiInsight.surfacedAt));
}

/**
 * Count insights generated today for a workspace
 */
export async function getInsightsGeneratedToday(workspaceId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: count() })
    .from(knosiaAiInsight)
    .where(
      and(
        eq(knosiaAiInsight.workspaceId, workspaceId),
        gte(knosiaAiInsight.surfacedAt, today),
      ),
    );

  return result[0]?.count ?? 0;
}

/**
 * Check if a similar insight was recently generated
 * to avoid duplicate insights on the same metric/pattern
 */
export async function hasSimilarRecentInsight(
  workspaceId: string,
  metricSlug: string,
  category: string,
  windowHours: number = 24,
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - windowHours);

  const result = await db
    .select({ count: count() })
    .from(knosiaAiInsight)
    .where(
      and(
        eq(knosiaAiInsight.workspaceId, workspaceId),
        eq(knosiaAiInsight.category, category),
        gte(knosiaAiInsight.surfacedAt, cutoff),
        // Check if evidence contains this metric
        sql`${knosiaAiInsight.evidence}->>'metric' = ${metricSlug}`,
      ),
    );

  return (result[0]?.count ?? 0) > 0;
}

// ============================================================================
// METRIC DATA QUERIES
// ============================================================================

/**
 * Get vocabulary metrics for analysis
 */
export async function getWorkspaceMetrics(workspaceId: string) {
  return db
    .select({
      id: knosiaVocabularyItem.id,
      slug: knosiaVocabularyItem.slug,
      canonicalName: knosiaVocabularyItem.canonicalName,
      definition: knosiaVocabularyItem.definition,
    })
    .from(knosiaVocabularyItem)
    .where(
      and(
        eq(knosiaVocabularyItem.workspaceId, workspaceId),
        eq(knosiaVocabularyItem.type, "metric"),
      ),
    );
}
