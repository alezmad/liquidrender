import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import { getActivityFeed } from "./queries";
import { getActivityFeedInputSchema } from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const activityRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // ACTIVITY ENDPOINTS
  // ============================================================================

  /**
   * GET / - Get activity feed for workspace
   */
  .get("/", async (c) => {
    const query = c.req.query();

    const workspaceId = query.workspaceId;
    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const input = getActivityFeedInputSchema.parse({
      workspaceId,
      type: query.type as
        | "thread_created"
        | "thread_shared"
        | "canvas_created"
        | "canvas_shared"
        | "canvas_updated"
        | "comment_added"
        | "insight_converted"
        | undefined,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 50,
    });

    const result = await getActivityFeed(input);
    return c.json(result);
  });
