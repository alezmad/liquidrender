import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { enforceAuth } from "../../../middleware";

import {
  processQuery,
  processClarification,
  getThread,
  getThreads,
  getThreadMessages,
  archiveThread,
  deleteThread,
} from "./queries";
import {
  threadQueryInputSchema,
  clarifyInputSchema,
  getThreadsInputSchema,
  getThreadMessagesInputSchema,
  archiveThreadInputSchema,
  workspaceIdQuerySchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const threadRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // QUERY ENDPOINTS
  // ============================================================================

  /**
   * POST /query - Process a natural language query
   * Creates or continues a thread and returns visualization/clarification
   */
  .post("/query", zValidator("json", threadQueryInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    try {
      const { thread, response } = await processQuery({
        ...input,
        userId: user.id,
      });

      return c.json({
        threadId: thread.id,
        ...response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process query";
      return c.json(
        {
          queryId: crypto.randomUUID(),
          type: "error" as const,
          error: {
            message,
            alternatives: [
              "Try rephrasing your question",
              "Check that the connection is active",
              "Ask about a specific metric or entity",
            ],
          },
          suggestions: [],
          appliedFilters: [],
        },
        500,
      );
    }
  })

  /**
   * POST /clarify - Answer a clarification question
   * Continues the thread with the selected option
   */
  .post("/clarify", zValidator("json", clarifyInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    try {
      const response = await processClarification({
        ...input,
        userId: user.id,
      });

      return c.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process clarification";
      return c.json(
        {
          queryId: crypto.randomUUID(),
          type: "error" as const,
          error: {
            message,
            alternatives: ["Try selecting a different option"],
          },
          suggestions: [],
          appliedFilters: [],
        },
        500,
      );
    }
  })

  // ============================================================================
  // THREAD MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * GET / - List threads for the current user in a workspace
   */
  .get("/", async (c) => {
    const user = c.get("user");
    const query = c.req.query();

    const workspaceId = query.workspaceId;
    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const input = getThreadsInputSchema.parse({
      userId: user.id,
      workspaceId,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 20,
      status: query.status as "active" | "archived" | "shared" | undefined,
    });

    const result = await getThreads(input);
    return c.json(result);
  })

  /**
   * GET /:id - Get a single thread
   */
  .get("/:id", zValidator("query", workspaceIdQuerySchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const { workspaceId } = c.req.valid("query");

    const thread = await getThread({
      id,
      userId: user.id,
      workspaceId,
    });

    if (!thread) {
      return c.json({ error: "Thread not found" }, 404);
    }

    return c.json(thread);
  })

  /**
   * GET /:id/messages - Get messages for a thread
   */
  .get("/:id/messages", async (c) => {
    const user = c.get("user");
    const threadId = c.req.param("id");
    const query = c.req.query();

    const input = getThreadMessagesInputSchema.parse({
      threadId,
      userId: user.id,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    const messages = await getThreadMessages(input);

    if (messages === null) {
      return c.json({ error: "Thread not found" }, 404);
    }

    return c.json({ messages });
  })

  /**
   * POST /:id/archive - Archive a thread
   */
  .post("/:id/archive", zValidator("json", archiveThreadInputSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const { workspaceId } = c.req.valid("json");

    const thread = await archiveThread({
      id,
      userId: user.id,
      workspaceId,
    });

    if (!thread) {
      return c.json({ error: "Thread not found" }, 404);
    }

    return c.json(thread);
  })

  /**
   * DELETE /:id - Delete a thread
   */
  .delete("/:id", zValidator("query", workspaceIdQuerySchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const { workspaceId } = c.req.valid("query");

    const thread = await deleteThread({
      id,
      userId: user.id,
      workspaceId,
    });

    if (!thread) {
      return c.json({ error: "Thread not found" }, 404);
    }

    return c.json({ success: true });
  });
