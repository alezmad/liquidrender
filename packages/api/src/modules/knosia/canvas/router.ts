import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { enforceAuth } from "../../../middleware";

import {
  getCanvas,
  getCanvases,
  getCanvasBlocks,
  getBlock,
  getCanvasAlerts,
  getAlert,
} from "./queries";
import {
  createCanvas,
  updateCanvas,
  deleteCanvas,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  createAlert,
  updateAlert,
  deleteAlert,
} from "./mutations";
import {
  createCanvasInputSchema,
  updateCanvasInputSchema,
  getCanvasesInputSchema,
  generateCanvasInputSchema,
  editCanvasInputSchema,
  createBlockInputSchema,
  updateBlockInputSchema,
  reorderBlocksInputSchema,
  createAlertInputSchema,
  updateAlertInputSchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const canvasRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // CANVAS CRUD
  // ============================================================================

  /**
   * GET / - List canvases for workspace
   */
  .get("/", async (c) => {
    const user = c.get("user");
    const query = c.req.query();

    const workspaceId = query.workspaceId;
    if (!workspaceId) {
      return c.json({ error: "workspaceId query parameter is required" }, 400);
    }

    const input = getCanvasesInputSchema.parse({
      workspaceId,
      status: query.status as "draft" | "active" | "archived" | undefined,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 20,
    });

    const result = await getCanvases({ ...input, userId: user.id });
    return c.json(result);
  })

  /**
   * GET /:id - Get single canvas with blocks
   */
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const canvas = await getCanvas(id, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const blocks = await getCanvasBlocks(id);
    const alerts = await getCanvasAlerts(id);

    return c.json({ ...canvas, blocks, alerts });
  })

  /**
   * POST / - Create canvas
   */
  .post("/", zValidator("json", createCanvasInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    const canvas = await createCanvas({ ...input, userId: user.id });

    return c.json(canvas, 201);
  })

  /**
   * PATCH /:id - Update canvas
   */
  .patch("/:id", zValidator("json", updateCanvasInputSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    // Verify access
    const existing = await getCanvas(id, user.id);
    if (!existing) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const canvas = await updateCanvas(id, input, user.id);

    return c.json(canvas);
  })

  /**
   * DELETE /:id - Delete canvas
   */
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    // Verify access
    const existing = await getCanvas(id, user.id);
    if (!existing) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    await deleteCanvas(id, user.id);
    return c.json({ success: true });
  })

  // ============================================================================
  // AI GENERATION
  // ============================================================================

  /**
   * POST /generate - AI-generate canvas from prompt
   */
  .post("/generate", zValidator("json", generateCanvasInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    // TODO: Implement AI canvas generation
    // For now, create a blank canvas
    const canvas = await createCanvas({
      workspaceId: input.workspaceId,
      name: `Generated: ${input.prompt.slice(0, 50)}`,
      description: `AI-generated from prompt: ${input.prompt}`,
      userId: user.id,
    });

    return c.json(canvas, 201);
  })

  /**
   * POST /:id/edit - Natural language canvas edit
   */
  .post("/:id/edit", zValidator("json", editCanvasInputSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    // Verify access
    const canvas = await getCanvas(id, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    // TODO: Implement AI canvas editing
    // For now, return the unchanged canvas
    return c.json({
      canvas,
      message: `Instruction received: ${input.instruction}`,
      changes: [],
    });
  })

  // ============================================================================
  // BLOCK ENDPOINTS
  // ============================================================================

  /**
   * GET /:canvasId/blocks - Get all blocks for canvas
   */
  .get("/:canvasId/blocks", async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const blocks = await getCanvasBlocks(canvasId);
    return c.json({ data: blocks });
  })

  /**
   * POST /:canvasId/blocks - Create block
   */
  .post("/:canvasId/blocks", zValidator("json", createBlockInputSchema.omit({ canvasId: true })), async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const body = c.req.valid("json");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const block = await createBlock({ ...body, canvasId });

    return c.json(block, 201);
  })

  /**
   * PATCH /:canvasId/blocks/:blockId - Update block
   */
  .patch("/:canvasId/blocks/:blockId", zValidator("json", updateBlockInputSchema), async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const blockId = c.req.param("blockId");
    const input = c.req.valid("json");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const existing = await getBlock(blockId);
    if (!existing || existing.canvasId !== canvasId) {
      return c.json({ error: "Block not found" }, 404);
    }

    const block = await updateBlock(blockId, input);

    return c.json(block);
  })

  /**
   * DELETE /:canvasId/blocks/:blockId - Delete block
   */
  .delete("/:canvasId/blocks/:blockId", async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const blockId = c.req.param("blockId");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const existing = await getBlock(blockId);
    if (!existing || existing.canvasId !== canvasId) {
      return c.json({ error: "Block not found" }, 404);
    }

    await deleteBlock(blockId);
    return c.json({ success: true });
  })

  /**
   * POST /:canvasId/blocks/reorder - Reorder blocks
   */
  .post("/:canvasId/blocks/reorder", zValidator("json", reorderBlocksInputSchema.omit({ canvasId: true })), async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const body = c.req.valid("json");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const blocks = await reorderBlocks({ ...body, canvasId });

    return c.json({ data: blocks });
  })

  // ============================================================================
  // ALERT ENDPOINTS
  // ============================================================================

  /**
   * GET /:canvasId/alerts - Get all alerts for canvas
   */
  .get("/:canvasId/alerts", async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const alerts = await getCanvasAlerts(canvasId);
    return c.json({ data: alerts });
  })

  /**
   * POST /:canvasId/alerts - Create alert
   */
  .post("/:canvasId/alerts", zValidator("json", createAlertInputSchema.omit({ canvasId: true })), async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const body = c.req.valid("json");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const alert = await createAlert({ ...body, canvasId });

    return c.json(alert, 201);
  })

  /**
   * PATCH /:canvasId/alerts/:alertId - Update alert
   */
  .patch("/:canvasId/alerts/:alertId", zValidator("json", updateAlertInputSchema), async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const alertId = c.req.param("alertId");
    const input = c.req.valid("json");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const existing = await getAlert(alertId);
    if (!existing || existing.canvasId !== canvasId) {
      return c.json({ error: "Alert not found" }, 404);
    }

    const alert = await updateAlert(alertId, input);

    return c.json(alert);
  })

  /**
   * DELETE /:canvasId/alerts/:alertId - Delete alert
   */
  .delete("/:canvasId/alerts/:alertId", async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const alertId = c.req.param("alertId");

    // Verify canvas access
    const canvas = await getCanvas(canvasId, user.id);
    if (!canvas) {
      return c.json({ error: "Canvas not found" }, 404);
    }

    const existing = await getAlert(alertId);
    if (!existing || existing.canvasId !== canvasId) {
      return c.json({ error: "Alert not found" }, 404);
    }

    await deleteAlert(alertId);
    return c.json({ success: true });
  });
