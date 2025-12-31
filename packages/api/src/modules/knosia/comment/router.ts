import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import { getComments, getComment } from "./queries";
import { createComment, updateComment, deleteComment } from "./mutations";
import {
  getCommentsInputSchema,
  createCommentInputSchema,
  updateCommentInputSchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const commentRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // COMMENT ENDPOINTS
  // ============================================================================

  /**
   * GET / - Get comments for a target
   */
  .get("/", async (c) => {
    const query = c.req.query();

    const targetType = query.targetType as "thread_message" | "canvas_block" | "thread" | undefined;
    const targetId = query.targetId;

    if (!targetType || !targetId) {
      return c.json({ error: "targetType and targetId query parameters are required" }, 400);
    }

    const input = getCommentsInputSchema.parse({
      targetType,
      targetId,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 50,
    });

    const result = await getComments(input);
    return c.json(result);
  })

  /**
   * GET /:id - Get single comment with replies
   */
  .get("/:id", async (c) => {
    const id = c.req.param("id");

    const comment = await getComment(id);
    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    return c.json(comment);
  })

  /**
   * POST / - Create comment
   */
  .post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const input = createCommentInputSchema.parse(body);
    const comment = await createComment({ ...input, userId: user.id });

    // TODO: Notify mentioned users
    // if (input.mentions?.length) {
    //   await notifyMentions(input.mentions, comment);
    // }

    return c.json(comment, 201);
  })

  /**
   * PATCH /:id - Update comment
   */
  .patch("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();

    // Verify ownership
    const existing = await getComment(id);
    if (!existing) {
      return c.json({ error: "Comment not found" }, 404);
    }
    if (existing.userId !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const input = updateCommentInputSchema.parse(body);
    const comment = await updateComment(id, input, user.id);

    return c.json(comment);
  })

  /**
   * DELETE /:id - Delete comment
   */
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    // Verify ownership
    const existing = await getComment(id);
    if (!existing) {
      return c.json({ error: "Comment not found" }, 404);
    }
    if (existing.userId !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await deleteComment(id, user.id);
    return c.json({ success: true });
  });
