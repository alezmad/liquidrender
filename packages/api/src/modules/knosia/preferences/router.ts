import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import { updatePreferences } from "./mutations";
import { getPreferences } from "./queries";
import { updatePreferencesSchema } from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const preferencesRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)
  // Get user's Knosia preferences for a workspace
  .get("/", async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.query("workspaceId");

    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const preferences = await getPreferences({
      userId: user.id,
      workspaceId,
    });

    return c.json(preferences);
  })
  // Update user's Knosia preferences for a workspace
  .patch("/", async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.query("workspaceId");

    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const body = await c.req.json();

    // Validate the request body
    const parseResult = updatePreferencesSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues,
        },
        400,
      );
    }

    const preferences = await updatePreferences({
      userId: user.id,
      workspaceId,
      updates: parseResult.data,
    });

    return c.json(preferences);
  });
