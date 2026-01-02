/**
 * Vocabulary Resolution Algorithm
 *
 * Merges vocabulary from three scopes:
 * 1. Organization-level (workspaceId = NULL)
 * 2. Workspace-level (specific workspaceId)
 * 3. User private vocabulary (from preferences)
 *
 * Priority: Private > Workspace > Org (for same slug)
 */

import { eq, isNull, or, and, ilike, sql } from "@turbostarter/db";
import {
  knosiaVocabularyItem,
  knosiaUserVocabularyPrefs,
  knosiaWorkspace,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

// ============================================================================
// Types
// ============================================================================

export interface ResolvedVocabularyItem {
  id: string;
  slug: string;
  canonicalName: string;
  abbreviation: string | null;
  type: "metric" | "dimension" | "entity" | "event";
  category: string | null;
  scope: "org" | "workspace" | "private";
  definition: {
    descriptionHuman?: string;
    formulaHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
  } | null;
  suggestedForRoles: string[] | null;
  isFavorite: boolean;
  recentlyUsedAt: string | null;
  useCount: number;
}

export interface ResolvedVocabulary {
  items: ResolvedVocabularyItem[];
  bySlug: Map<string, ResolvedVocabularyItem>;
  favorites: string[];
  recentlyUsed: { slug: string; lastUsedAt: string; useCount: number }[];
  synonyms: Record<string, string>;
}

export interface SearchResult {
  item: ResolvedVocabularyItem;
  score: number;
  matchType: "exact" | "prefix" | "contains" | "synonym" | "fuzzy";
}

// ============================================================================
// Resolution
// ============================================================================

/**
 * Resolve vocabulary for a user in a workspace
 * Merges org + workspace + private scopes with proper priority
 */
export async function resolveVocabulary(
  userId: string,
  workspaceId: string
): Promise<ResolvedVocabulary> {
  // Handle "default" workspace - return all org-level vocabulary
  if (workspaceId === "default") {
    // Fetch all org-level vocabulary items (no specific workspace)
    const dbItems = await db
      .select()
      .from(knosiaVocabularyItem)
      .where(isNull(knosiaVocabularyItem.workspaceId));

    const bySlug = new Map<string, ResolvedVocabularyItem>();
    for (const item of dbItems) {
      bySlug.set(item.slug, {
        id: item.id,
        slug: item.slug,
        canonicalName: item.canonicalName,
        abbreviation: item.abbreviation,
        type: item.type as "metric" | "dimension" | "entity" | "event",
        category: item.category,
        scope: "org",
        definition: item.definition as ResolvedVocabularyItem["definition"],
        suggestedForRoles: item.suggestedForRoles as string[] | null,
        isFavorite: false,
        recentlyUsedAt: null,
        useCount: 0,
      });
    }

    return {
      items: Array.from(bySlug.values()),
      bySlug,
      favorites: [],
      recentlyUsed: [],
      synonyms: {},
    };
  }

  // Get workspace to find orgId
  const workspace = await db.query.knosiaWorkspace.findFirst({
    where: eq(knosiaWorkspace.id, workspaceId),
  });

  if (!workspace) {
    return {
      items: [],
      bySlug: new Map(),
      favorites: [],
      recentlyUsed: [],
      synonyms: {},
    };
  }

  const orgId = workspace.orgId;

  // Fetch all vocabulary items (org-level and workspace-level)
  const dbItems = await db
    .select()
    .from(knosiaVocabularyItem)
    .where(
      and(
        eq(knosiaVocabularyItem.orgId, orgId),
        or(
          isNull(knosiaVocabularyItem.workspaceId),
          eq(knosiaVocabularyItem.workspaceId, workspaceId)
        )
      )
    );

  // Fetch user preferences
  const prefs = await db.query.knosiaUserVocabularyPrefs.findFirst({
    where: and(
      eq(knosiaUserVocabularyPrefs.userId, userId),
      eq(knosiaUserVocabularyPrefs.workspaceId, workspaceId)
    ),
  });

  const favorites = (prefs?.favorites as string[] | null) ?? [];
  const synonyms = (prefs?.synonyms as Record<string, string> | null) ?? {};
  const recentlyUsed =
    (prefs?.recentlyUsed as { slug: string; lastUsedAt: string; useCount: number }[] | null) ?? [];
  const privateVocab =
    (prefs?.privateVocabulary as {
      id: string;
      name: string;
      slug: string;
      type: "metric" | "dimension" | "filter";
      formula: string;
      description?: string;
      createdAt: string;
    }[] | null) ?? [];

  // Build recently used map for quick lookup
  const recentlyUsedMap = new Map(
    recentlyUsed.map((r) => [r.slug, r])
  );

  // Build items map by slug (org first, then workspace overwrites)
  const bySlug = new Map<string, ResolvedVocabularyItem>();

  // First pass: org-level items
  for (const item of dbItems) {
    if (item.workspaceId === null) {
      const recentInfo = recentlyUsedMap.get(item.slug);
      bySlug.set(item.slug, {
        id: item.id,
        slug: item.slug,
        canonicalName: item.canonicalName,
        abbreviation: item.abbreviation,
        type: item.type as "metric" | "dimension" | "entity" | "event",
        category: item.category,
        scope: "org",
        definition: item.definition as ResolvedVocabularyItem["definition"],
        suggestedForRoles: item.suggestedForRoles as string[] | null,
        isFavorite: favorites.includes(item.slug),
        recentlyUsedAt: recentInfo?.lastUsedAt ?? null,
        useCount: recentInfo?.useCount ?? 0,
      });
    }
  }

  // Second pass: workspace-level items (overwrite org items with same slug)
  for (const item of dbItems) {
    if (item.workspaceId === workspaceId) {
      const recentInfo = recentlyUsedMap.get(item.slug);
      bySlug.set(item.slug, {
        id: item.id,
        slug: item.slug,
        canonicalName: item.canonicalName,
        abbreviation: item.abbreviation,
        type: item.type as "metric" | "dimension" | "entity" | "event",
        category: item.category,
        scope: "workspace",
        definition: item.definition as ResolvedVocabularyItem["definition"],
        suggestedForRoles: item.suggestedForRoles as string[] | null,
        isFavorite: favorites.includes(item.slug),
        recentlyUsedAt: recentInfo?.lastUsedAt ?? null,
        useCount: recentInfo?.useCount ?? 0,
      });
    }
  }

  // Third pass: private vocabulary (highest priority)
  for (const item of privateVocab) {
    const recentInfo = recentlyUsedMap.get(item.slug);
    bySlug.set(item.slug, {
      id: item.id,
      slug: item.slug,
      canonicalName: item.name,
      abbreviation: null,
      type: item.type === "filter" ? "dimension" : item.type,
      category: "private",
      scope: "private",
      definition: {
        descriptionHuman: item.description,
        formulaSql: item.formula,
      },
      suggestedForRoles: null,
      isFavorite: favorites.includes(item.slug),
      recentlyUsedAt: recentInfo?.lastUsedAt ?? null,
      useCount: recentInfo?.useCount ?? 0,
    });
  }

  return {
    items: Array.from(bySlug.values()),
    bySlug,
    favorites,
    recentlyUsed,
    synonyms,
  };
}

// ============================================================================
// Search
// ============================================================================

/**
 * Search vocabulary with smart ranking
 * Priority: favorites > recently used > exact match > prefix > contains > synonym
 */
export function searchVocabulary(
  query: string,
  resolved: ResolvedVocabulary,
  limit = 20
): SearchResult[] {
  if (!query.trim()) {
    // Return favorites first, then recently used
    const favoriteItems = resolved.items
      .filter((item) => item.isFavorite)
      .map((item) => ({ item, score: 100, matchType: "exact" as const }));

    const recentItems = resolved.items
      .filter((item) => item.recentlyUsedAt && !item.isFavorite)
      .sort((a, b) => {
        const aTime = a.recentlyUsedAt ? new Date(a.recentlyUsedAt).getTime() : 0;
        const bTime = b.recentlyUsedAt ? new Date(b.recentlyUsedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10)
      .map((item) => ({ item, score: 80, matchType: "exact" as const }));

    return [...favoriteItems, ...recentItems].slice(0, limit);
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // Check if query matches a synonym first
  const synonymTarget = resolved.synonyms[normalizedQuery];

  for (const item of resolved.items) {
    const name = item.canonicalName.toLowerCase();
    const slug = item.slug.toLowerCase();
    const abbrev = item.abbreviation?.toLowerCase() ?? "";

    let score = 0;
    let matchType: SearchResult["matchType"] = "fuzzy";

    // Synonym match (user's custom term)
    if (synonymTarget && item.slug === synonymTarget) {
      score = 95;
      matchType = "synonym";
    }
    // Exact match
    else if (name === normalizedQuery || slug === normalizedQuery || abbrev === normalizedQuery) {
      score = 100;
      matchType = "exact";
    }
    // Prefix match
    else if (name.startsWith(normalizedQuery) || slug.startsWith(normalizedQuery)) {
      score = 80;
      matchType = "prefix";
    }
    // Contains match
    else if (name.includes(normalizedQuery) || slug.includes(normalizedQuery)) {
      score = 60;
      matchType = "contains";
    }
    // Abbreviation contains
    else if (abbrev && abbrev.includes(normalizedQuery)) {
      score = 50;
      matchType = "contains";
    }

    if (score > 0) {
      // Boost favorites
      if (item.isFavorite) {
        score += 10;
      }

      // Boost recently used
      if (item.useCount > 0) {
        score += Math.min(item.useCount, 5);
      }

      results.push({ item, score, matchType });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Get vocabulary items suggested for a user's role
 */
export async function getSuggestedVocabulary(
  userId: string,
  workspaceId: string,
  userRoleArchetype: string
): Promise<ResolvedVocabularyItem[]> {
  const resolved = await resolveVocabulary(userId, workspaceId);

  // Get dismissed suggestions
  const prefs = await db.query.knosiaUserVocabularyPrefs.findFirst({
    where: and(
      eq(knosiaUserVocabularyPrefs.userId, userId),
      eq(knosiaUserVocabularyPrefs.workspaceId, workspaceId)
    ),
  });

  const dismissed = (prefs?.dismissedSuggestions as string[] | null) ?? [];

  // Filter items that are suggested for this role and not dismissed
  return resolved.items.filter((item) => {
    if (dismissed.includes(item.slug)) {
      return false;
    }

    if (!item.suggestedForRoles || item.suggestedForRoles.length === 0) {
      return false;
    }

    return item.suggestedForRoles.includes(userRoleArchetype);
  });
}
