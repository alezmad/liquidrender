import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import { confirmVocabulary, reportMismatch } from "./mutations";
import { getVocabularyFromAnalysis } from "./queries";
import {
  getVocabularySchema,
  confirmVocabularySchema,
  reportMismatchSchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const knosiaVocabularyRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  /**
   * GET /:analysisId - Get vocabulary from a completed analysis
   *
   * Returns vocabulary items (metrics, dimensions, entities) detected
   * from schema analysis, along with confirmation questions.
   */
  .get("/:analysisId", async (c) => {
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
   * POST /:analysisId/confirm - Confirm vocabulary selections
   *
   * Saves user's vocabulary confirmations and creates vocabulary items
   * in the database. Supports "skipped" mode to use defaults.
   */
  .post("/:analysisId/confirm", async (c) => {
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
   * POST /:vocabularyId/report-mismatch - Report a vocabulary issue
   *
   * Allows users to report when vocabulary items are incorrect,
   * have wrong mappings, or are missing expected terms.
   */
  .post("/:vocabularyId/report-mismatch", async (c) => {
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
  });
