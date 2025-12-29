import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import {
  processQuery,
  processClarification,
  getConversation,
  getConversations,
  getConversationMessages,
  archiveConversation,
  deleteConversation,
} from "./queries";
import {
  conversationQueryInputSchema,
  clarifyInputSchema,
  getConversationsInputSchema,
  getConversationMessagesInputSchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const conversationRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // QUERY ENDPOINTS
  // ============================================================================

  /**
   * POST /query - Process a natural language query
   * Creates or continues a conversation and returns visualization/clarification
   */
  .post("/query", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const input = conversationQueryInputSchema.parse(body);

    try {
      const { conversation, response } = await processQuery({
        ...input,
        userId: user.id,
      });

      return c.json({
        conversationId: conversation.id,
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
   * Continues the conversation with the selected option
   */
  .post("/clarify", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const input = clarifyInputSchema.parse(body);
    const workspaceId = body.workspaceId;

    if (!workspaceId) {
      return c.json({ error: "workspaceId is required" }, 400);
    }

    try {
      const response = await processClarification({
        ...input,
        userId: user.id,
        workspaceId,
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
  // CONVERSATION MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * GET / - List conversations for the current user in a workspace
   */
  .get("/", async (c) => {
    const user = c.get("user");
    const query = c.req.query();

    const workspaceId = query.workspaceId;
    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const input = getConversationsInputSchema.parse({
      userId: user.id,
      workspaceId,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 20,
      status: query.status as "active" | "archived" | "shared" | undefined,
    });

    const result = await getConversations(input);
    return c.json(result);
  })

  /**
   * GET /:id - Get a single conversation
   */
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const workspaceId = c.req.query("workspaceId");

    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const conversation = await getConversation({
      id,
      userId: user.id,
      workspaceId,
    });

    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json(conversation);
  })

  /**
   * GET /:id/messages - Get messages for a conversation
   */
  .get("/:id/messages", async (c) => {
    const user = c.get("user");
    const conversationId = c.req.param("id");
    const query = c.req.query();

    const input = getConversationMessagesInputSchema.parse({
      conversationId,
      userId: user.id,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    const messages = await getConversationMessages(input);

    if (messages === null) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json({ messages });
  })

  /**
   * POST /:id/archive - Archive a conversation
   */
  .post("/:id/archive", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const workspaceId = body.workspaceId;

    if (!workspaceId) {
      return c.json({ error: "workspaceId is required" }, 400);
    }

    const conversation = await archiveConversation({
      id,
      userId: user.id,
      workspaceId,
    });

    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json(conversation);
  })

  /**
   * DELETE /:id - Delete a conversation
   */
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const workspaceId = c.req.query("workspaceId");

    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const conversation = await deleteConversation({
      id,
      userId: user.id,
      workspaceId,
    });

    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json({ success: true });
  });
