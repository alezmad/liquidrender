import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { enforceAuth } from "../../../middleware";
import { generateDailyInsights, createInsight } from "./mutations";
import {
  generateInsightsInputSchema,
  generatedInsightSchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";
import { z } from "zod";
import { workspaceIdSchema } from "../shared-schemas";

type Variables = {
  user: User;
  session: Session;
};

// Input schema for manual insight creation
const createInsightInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  targetUserId: z.string().nullable().optional(),
  insight: generatedInsightSchema,
});

export const insightRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // INSIGHT GENERATION ENDPOINTS
  // ============================================================================

  /**
   * POST /generate - Generate daily insights for a workspace
   *
   * This endpoint triggers AI insight generation for the specified workspace.
   * It analyzes metrics, detects anomalies and patterns, and creates up to
   * 3 insights per day (configurable via maxInsights).
   *
   * In production, this would typically be called by a scheduled job.
   */
  .post("/generate", zValidator("json", generateInsightsInputSchema), async (c) => {
    const input = c.req.valid("json");

    const result = await generateDailyInsights(input);

    return c.json(result, result.generatedCount > 0 ? 201 : 200);
  })

  /**
   * POST / - Create a single insight manually
   *
   * Used for testing or admin purposes to create insights directly
   * without going through the detection algorithms.
   */
  .post("/", zValidator("json", createInsightInputSchema), async (c) => {
    const { workspaceId, targetUserId, insight } = c.req.valid("json");

    const insightId = await createInsight(
      workspaceId,
      targetUserId ?? null,
      insight,
    );

    return c.json({ id: insightId }, 201);
  });
