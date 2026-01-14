import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import {
  confirmVocabulary,
  reportMismatch,
  createVocabularyItem,
  updateVocabularyItem,
  deprecateVocabularyItem,
  updateUserVocabularyPrefs,
  createPrivateVocabulary,
  updatePrivateVocabulary,
  deletePrivateVocabulary,
  trackVocabularyUsage,
} from "./mutations";
import {
  getVocabularyFromAnalysis,
  getVocabularyList,
  getVocabularyBySlug,
  getUserVocabularyPrefs,
  getVocabularySuggestions,
} from "./queries";
import {
  getVocabularySchema,
  confirmVocabularySchema,
  reportMismatchSchema,
  listVocabularySchema,
  createVocabularyItemSchema,
  updateVocabularyItemSchema,
  updateVocabularyPrefsSchema,
  createPrivateVocabSchema,
  updatePrivateVocabSchema,
  deletePrivateVocabSchema,
  trackVocabularyUsageSchema,
  getVocabularyBySlugSchema,
  getUserVocabularyPrefsSchema,
  getSuggestionsSchema,
  previewVocabularySchema,
} from "./schemas";
import { previewVocabularyItem } from "./preview";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const knosiaVocabularyRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  /**
   * GET /analysis/:analysisId - Get vocabulary from a completed analysis
   *
   * Returns vocabulary items (metrics, dimensions, entities) detected
   * from schema analysis, along with confirmation questions.
   */
  .get("/analysis/:analysisId", async (c) => {
    const analysisId = c.req.param("analysisId");

    // Validate input
    const parseResult = getVocabularySchema.safeParse({ analysisId });
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const vocabulary = await getVocabularyFromAnalysis(parseResult.data);

    if (!vocabulary) {
      return c.json(
        { error: "Analysis not found or not completed" },
        404
      );
    }

    return c.json(vocabulary);
  })

  /**
   * POST /analysis/:analysisId/confirm - Confirm vocabulary selections
   *
   * Saves user's vocabulary confirmations and creates vocabulary items
   * in the database. Supports "skipped" mode to use defaults.
   */
  .post("/analysis/:analysisId/confirm", async (c) => {
    const user = c.get("user");
    const analysisId = c.req.param("analysisId");
    const body = await c.req.json();

    // Validate input
    const parseResult = confirmVocabularySchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await confirmVocabulary(
      analysisId,
      parseResult.data,
      user.id
    );

    if (!result) {
      return c.json(
        { error: "Analysis not found or not ready for confirmation" },
        404
      );
    }

    return c.json(result);
  })

  /**
   * POST /items/:vocabularyId/report-mismatch - Report a vocabulary issue
   *
   * Allows users to report when vocabulary items are incorrect,
   * have wrong mappings, or are missing expected terms.
   */
  .post("/items/:vocabularyId/report-mismatch", async (c) => {
    const user = c.get("user");
    const vocabularyId = c.req.param("vocabularyId");
    const body = await c.req.json();

    // Validate input
    const parseResult = reportMismatchSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await reportMismatch(
      parseResult.data.itemId,
      user.id,
      vocabularyId, // Use vocabularyId as workspaceId context
      parseResult.data
    );

    if (!result.success) {
      return c.json(result, result.message === "Vocabulary item not found" ? 404 : 500);
    }

    return c.json(result);
  })

  // ============================================================================
  // User Preferences Routes (static paths - must come before dynamic :id routes)
  // ============================================================================

  /**
   * GET /user/preferences - Get user vocabulary preferences
   *
   * Returns favorites, synonyms, recently used items, dismissed suggestions,
   * and private vocabulary for the current user in a workspace.
   */
  .get("/user/preferences", async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.query("workspaceId");

    const parseResult = getUserVocabularyPrefsSchema.safeParse({ workspaceId });
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const prefs = await getUserVocabularyPrefs(user.id, parseResult.data);

    if (!prefs) {
      // Return empty defaults if no preferences exist yet
      return c.json({
        favorites: [],
        synonyms: {},
        recentlyUsed: [],
        dismissedSuggestions: [],
        privateVocabulary: [],
      });
    }

    return c.json(prefs);
  })

  /**
   * PATCH /user/preferences - Update user vocabulary preferences
   *
   * Updates favorites, synonyms, or dismissed suggestions.
   */
  .patch("/user/preferences", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const parseResult = updateVocabularyPrefsSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await updateUserVocabularyPrefs(user.id, parseResult.data);
    return c.json(result);
  })

  /**
   * POST /user/private - Create private vocabulary item
   *
   * Creates a user-private formula/metric that only this user can see.
   */
  .post("/user/private", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const parseResult = createPrivateVocabSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await createPrivateVocabulary(user.id, parseResult.data);
    return c.json(result, 201);
  })

  /**
   * PATCH /user/private/:id - Update private vocabulary item
   */
  .patch("/user/private/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();

    const parseResult = updatePrivateVocabSchema.safeParse({ ...body, id });
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await updatePrivateVocabulary(user.id, parseResult.data);

    if (!result) {
      return c.json({ error: "Private vocabulary item not found" }, 404);
    }

    return c.json(result);
  })

  /**
   * DELETE /user/private/:id - Delete private vocabulary item
   */
  .delete("/user/private/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const workspaceId = c.req.query("workspaceId");

    const parseResult = deletePrivateVocabSchema.safeParse({ id, workspaceId });
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await deletePrivateVocabulary(user.id, parseResult.data);

    if (!result) {
      return c.json({ error: "Private vocabulary item not found" }, 404);
    }

    return c.json({ success: true });
  })

  /**
   * POST /user/track-usage - Track vocabulary usage
   *
   * Records when a user uses a vocabulary item for search ranking.
   */
  .post("/user/track-usage", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const parseResult = trackVocabularyUsageSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    await trackVocabularyUsage(user.id, parseResult.data);
    return c.json({ success: true });
  })

  /**
   * GET /user/suggestions - Get role-based vocabulary suggestions
   *
   * Returns vocabulary items suggested for the user's role archetype.
   */
  .get("/user/suggestions", async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.query("workspaceId");
    const roleArchetype = c.req.query("roleArchetype");

    const parseResult = getSuggestionsSchema.safeParse({ workspaceId, roleArchetype });
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const suggestions = await getVocabularySuggestions(user.id, parseResult.data);
    return c.json({ items: suggestions });
  })

  // ============================================================================
  // Convenience Type Endpoints
  // ============================================================================

  /**
   * GET /kpis - List KPI vocabulary items
   *
   * Shorthand for: GET /items?type=kpi
   * Returns calculated business formulas (GMV, Net Revenue, etc.)
   */
  .get("/kpis", async (c) => {
    const user = c.get("user");
    const query = {
      workspaceId: c.req.query("workspaceId"),
      search: c.req.query("search"),
      type: "kpi" as const,
      limit: c.req.query("limit"),
    };

    const parseResult = listVocabularySchema.safeParse(query);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await getVocabularyList(user.id, parseResult.data);
    return c.json(result);
  })

  /**
   * GET /measures - List measure vocabulary items
   *
   * Shorthand for: GET /items?type=measure
   * Returns raw numeric columns (unit_price, quantity, etc.)
   */
  .get("/measures", async (c) => {
    const user = c.get("user");
    const query = {
      workspaceId: c.req.query("workspaceId"),
      search: c.req.query("search"),
      type: "measure" as const,
      limit: c.req.query("limit"),
    };

    const parseResult = listVocabularySchema.safeParse(query);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await getVocabularyList(user.id, parseResult.data);
    return c.json(result);
  })

  // ============================================================================
  // Vocabulary CRUD Routes
  // ============================================================================

  /**
   * GET /items - List vocabulary (merged from org/workspace/private)
   *
   * Returns vocabulary items with smart merging and search support.
   */
  .get("/items", async (c) => {
    const user = c.get("user");
    const query = {
      workspaceId: c.req.query("workspaceId"),
      search: c.req.query("search"),
      type: c.req.query("type"),
      scope: c.req.query("scope"),
      limit: c.req.query("limit"),
    };

    const parseResult = listVocabularySchema.safeParse(query);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const result = await getVocabularyList(user.id, parseResult.data);
    return c.json(result);
  })

  /**
   * POST /items - Create vocabulary item
   *
   * Creates a new vocabulary item at org or workspace level.
   */
  .post("/items", async (c) => {
    const body = await c.req.json();

    const parseResult = createVocabularyItemSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const item = await createVocabularyItem(parseResult.data);
    return c.json(item, 201);
  })

  /**
   * GET /items/:slug - Get vocabulary item by slug
   *
   * Returns a single vocabulary item with full resolution.
   */
  .get("/items/:slug", async (c) => {
    const user = c.get("user");
    const slug = c.req.param("slug");
    const workspaceId = c.req.query("workspaceId");

    const parseResult = getVocabularyBySlugSchema.safeParse({ slug, workspaceId });
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const item = await getVocabularyBySlug(user.id, parseResult.data);

    if (!item) {
      return c.json({ error: "Vocabulary item not found" }, 404);
    }

    return c.json(item);
  })

  /**
   * PATCH /items/:id - Update vocabulary item
   */
  .patch("/items/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    const parseResult = updateVocabularyItemSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const item = await updateVocabularyItem(id, parseResult.data);

    if (!item) {
      return c.json({ error: "Vocabulary item not found" }, 404);
    }

    return c.json(item);
  })

  /**
   * POST /items/:id/deprecate - Deprecate vocabulary item
   */
  .post("/items/:id/deprecate", async (c) => {
    const id = c.req.param("id");

    const item = await deprecateVocabularyItem(id);

    if (!item) {
      return c.json({ error: "Vocabulary item not found" }, 404);
    }

    return c.json(item);
  })

  /**
   * GET /items/:id/preview - Preview vocabulary item with live data
   *
   * Executes the vocabulary item's definition against the connected
   * database and returns the calculated value or sample data.
   */
  .get("/items/:id/preview", async (c) => {
    const itemId = c.req.param("id");
    const workspaceId = c.req.query("workspaceId");

    const parseResult = previewVocabularySchema.safeParse({ itemId, workspaceId });
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        400
      );
    }

    const preview = await previewVocabularyItem(parseResult.data);
    return c.json(preview);
  });
