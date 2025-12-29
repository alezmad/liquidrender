import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import { getBriefing } from "./queries";
import { getBriefingSchema } from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

/**
 * Knosia Briefing Router
 *
 * Provides daily KPI briefings with alerts and insights.
 * Briefings are personalized based on user's role and preferences.
 */
export const briefingRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)
  /**
   * GET /
   * Get current briefing for authenticated user
   *
   * Query params:
   * - connectionId (optional): Specific connection to use for data
   * - date (optional): Date for the briefing (defaults to today)
   *
   * Returns:
   * - greeting: Personalized greeting based on time of day
   * - dataThrough: Data freshness timestamp
   * - kpis: Primary KPIs for user's role
   * - alerts: Active alerts requiring attention
   * - insights: Proactive insights from data analysis
   * - suggestedQuestions: Follow-up questions for exploration
   */
  .get("/", async (c) => {
    const user = c.get("user");
    const query = c.req.query();

    // Parse and validate query parameters
    const input = getBriefingSchema.parse({
      connectionId: query.connectionId,
      date: query.date,
    });

    // For now, use a placeholder workspaceId
    // In a full implementation, this would come from:
    // 1. Query param (explicit workspace selection)
    // 2. User's default workspace preference
    // 3. First available workspace for the user
    const workspaceId = query.workspaceId ?? "default";

    const briefing = await getBriefing(user.id, workspaceId, input);

    return c.json(briefing);
  });
