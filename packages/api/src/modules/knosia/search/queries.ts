import { and, eq, ilike, or, desc, sql } from "@turbostarter/db";
import {
  knosiaThread,
  knosiaCanvas,
  knosiaVocabularyItem,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type { GlobalSearchInput, SearchResultItem, GlobalSearchResult } from "./schemas";

// ============================================================================
// GLOBAL SEARCH
// ============================================================================

/**
 * Search across threads, canvases, and vocabulary items.
 * Returns results grouped by type with match excerpts.
 */
export async function globalSearch(
  input: GlobalSearchInput,
  userId: string,
): Promise<GlobalSearchResult> {
  const { workspaceId, query, types, limit } = input;
  const searchPattern = `%${query}%`;

  const searchTypes = types ?? ["thread", "canvas", "vocabulary"];
  const results: SearchResultItem[] = [];
  const counts = { thread: 0, canvas: 0, vocabulary: 0, total: 0 };

  // Search threads
  if (searchTypes.includes("thread")) {
    const threads = await db
      .select({
        id: knosiaThread.id,
        title: knosiaThread.title,
        status: knosiaThread.status,
        updatedAt: knosiaThread.updatedAt,
      })
      .from(knosiaThread)
      .where(
        and(
          eq(knosiaThread.workspaceId, workspaceId),
          eq(knosiaThread.userId, userId),
          or(
            ilike(knosiaThread.title, searchPattern),
          ),
        ),
      )
      .orderBy(desc(knosiaThread.updatedAt))
      .limit(limit);

    counts.thread = threads.length;

    for (const thread of threads) {
      results.push({
        id: thread.id,
        type: "thread",
        title: thread.title || "Untitled Thread",
        description: `Status: ${thread.status}`,
        matchedField: "title",
        excerpt: highlightMatch(thread.title || "", query),
        updatedAt: thread.updatedAt?.toISOString() || new Date().toISOString(),
        link: `/dashboard/knosia/threads/${thread.id}`,
      });
    }
  }

  // Search canvases
  if (searchTypes.includes("canvas")) {
    const canvases = await db
      .select({
        id: knosiaCanvas.id,
        name: knosiaCanvas.name,
        description: knosiaCanvas.description,
        status: knosiaCanvas.status,
        updatedAt: knosiaCanvas.updatedAt,
      })
      .from(knosiaCanvas)
      .where(
        and(
          eq(knosiaCanvas.workspaceId, workspaceId),
          eq(knosiaCanvas.createdBy, userId),
          or(
            ilike(knosiaCanvas.name, searchPattern),
            ilike(knosiaCanvas.description, searchPattern),
          ),
        ),
      )
      .orderBy(desc(knosiaCanvas.updatedAt))
      .limit(limit);

    counts.canvas = canvases.length;

    for (const canvas of canvases) {
      const matchedField = canvas.name.toLowerCase().includes(query.toLowerCase())
        ? "name"
        : "description";

      results.push({
        id: canvas.id,
        type: "canvas",
        title: canvas.name,
        description: canvas.description,
        matchedField,
        excerpt: highlightMatch(
          matchedField === "name" ? canvas.name : (canvas.description || ""),
          query,
        ),
        updatedAt: canvas.updatedAt?.toISOString() || new Date().toISOString(),
        link: `/dashboard/knosia/canvases/${canvas.id}`,
      });
    }
  }

  // Search vocabulary items
  if (searchTypes.includes("vocabulary")) {
    const vocabulary = await db
      .select({
        id: knosiaVocabularyItem.id,
        canonicalName: knosiaVocabularyItem.canonicalName,
        type: knosiaVocabularyItem.type,
        category: knosiaVocabularyItem.category,
        updatedAt: knosiaVocabularyItem.updatedAt,
      })
      .from(knosiaVocabularyItem)
      .where(
        and(
          eq(knosiaVocabularyItem.workspaceId, workspaceId),
          or(
            ilike(knosiaVocabularyItem.canonicalName, searchPattern),
            ilike(knosiaVocabularyItem.category, searchPattern),
          ),
        ),
      )
      .orderBy(desc(knosiaVocabularyItem.updatedAt))
      .limit(limit);

    counts.vocabulary = vocabulary.length;

    for (const item of vocabulary) {
      const matchedField = item.canonicalName.toLowerCase().includes(query.toLowerCase())
        ? "name"
        : "category";

      results.push({
        id: item.id,
        type: "vocabulary",
        title: item.canonicalName,
        description: `${item.type}${item.category ? ` • ${item.category}` : ""}`,
        matchedField,
        excerpt: highlightMatch(
          matchedField === "name" ? item.canonicalName : (item.category || ""),
          query,
        ),
        updatedAt: item.updatedAt?.toISOString() || new Date().toISOString(),
        link: `/dashboard/knosia/vocabulary#${item.id}`,
      });
    }
  }

  counts.total = counts.thread + counts.canvas + counts.vocabulary;

  // Sort by recency across all types
  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return {
    query,
    results: results.slice(0, limit),
    counts,
  };
}

/**
 * Highlight matching text in excerpt.
 */
function highlightMatch(text: string, query: string): string {
  if (!text || !query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text.substring(0, 100);

  // Get context around match
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + query.length + 30);

  let excerpt = text.substring(start, end);
  if (start > 0) excerpt = "..." + excerpt;
  if (end < text.length) excerpt = excerpt + "...";

  return excerpt;
}
