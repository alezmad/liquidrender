import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import { globalSearch } from "./queries";
import { searchQuerySchema, globalSearchInputSchema } from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const searchRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  /**
   * GET / - Global search across threads, canvases, and vocabulary
   */
  .get("/", zValidator("query", searchQuerySchema), async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");

    // Parse types from comma-separated string
    const types = query.types
      ? (query.types.split(",") as ("thread" | "canvas" | "vocabulary")[])
      : undefined;

    const input = globalSearchInputSchema.parse({
      workspaceId: query.workspaceId,
      query: query.query,
      types,
      limit: query.limit ? parseInt(query.limit) : 20,
    });

    const result = await globalSearch(input, user.id);
    return c.json(result);
  });
