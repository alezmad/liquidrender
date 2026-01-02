import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

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
  generateCanvasFromAI,
  interpretCanvasEdit,
  createAIGeneratedCanvas,
  createBlocksFromSpecs,
  shareCanvas,
  getCanvasCollaborators,
  removeCanvasCollaborator,
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
  shareCanvasInputSchema,
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
  // SHARING ENDPOINTS
  // ============================================================================

  /**
   * POST /:canvasId/share - Share canvas with users
   */
  .post("/:canvasId/share", zValidator("json", shareCanvasInputSchema), async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const input = c.req.valid("json");

    const result = await shareCanvas(canvasId, input, user.id);
    if (!result) {
      return c.json({ error: "Canvas not found or you don't have permission to share" }, 404);
    }

    return c.json(result);
  })

  /**
   * GET /:canvasId/collaborators - Get list of collaborators
   */
  .get("/:canvasId/collaborators", async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");

    const collaborators = await getCanvasCollaborators(canvasId, user.id);
    if (collaborators === null) {
      return c.json({ error: "Canvas not found or access denied" }, 404);
    }

    return c.json({ data: collaborators });
  })

  /**
   * DELETE /:canvasId/collaborators/:userId - Remove a collaborator
   */
  .delete("/:canvasId/collaborators/:userId", async (c) => {
    const user = c.get("user");
    const canvasId = c.req.param("canvasId");
    const collaboratorUserId = c.req.param("userId");

    const result = await removeCanvasCollaborator(canvasId, collaboratorUserId, user.id);
    if (!result) {
      return c.json({ error: "Canvas not found or you don't have permission to manage collaborators" }, 404);
    }

    return c.json(result);
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

    // Generate canvas layout from prompt using AI helper
    const generated = await generateCanvasFromAI({
      prompt: input.prompt,
      workspaceId: input.workspaceId,
      roleId: input.roleId,
      userId: user.id,
    });

    // Create canvas with AI generation flag
    const canvas = await createAIGeneratedCanvas({
      workspaceId: input.workspaceId,
      name: generated.name,
      description: generated.description,
      userId: user.id,
    });

    // Create blocks from generated specs
    const blocks = await createBlocksFromSpecs(canvas!.id, generated.blocks);

    return c.json({
      ...canvas,
      blocks,
      generatedFrom: {
        prompt: input.prompt,
        roleId: input.roleId,
        blockCount: blocks.length,
      },
    }, 201);
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

    // Get existing blocks
    const existingBlocks = await getCanvasBlocks(id);

    // Interpret the edit instruction using AI helper
    const changes = await interpretCanvasEdit({
      canvasId: id,
      existingBlocks,
      instruction: input.instruction,
      userId: user.id,
    });

    // Apply the changes
    const appliedChanges: Array<{
      type: "add" | "update" | "remove";
      blockId?: string;
      success: boolean;
    }> = [];

    for (const change of changes) {
      try {
        if (change.type === "add" && change.block) {
          const [newBlock] = await createBlocksFromSpecs(id, [change.block]);
          appliedChanges.push({
            type: "add",
            blockId: newBlock?.id,
            success: true,
          });
        } else if (change.type === "remove" && change.blockId) {
          await deleteBlock(change.blockId);
          appliedChanges.push({
            type: "remove",
            blockId: change.blockId,
            success: true,
          });
        } else if (change.type === "update" && change.blockId && change.updates) {
          const updatePayload: Record<string, unknown> = {};
          if (change.updates.title) {
            updatePayload.title = change.updates.title;
          }
          if (change.updates.position) {
            updatePayload.position = {
              x: change.updates.position.x ?? 0,
              y: change.updates.position.y ?? 0,
              width: change.updates.position.w ?? 4,
              height: change.updates.position.h ?? 2,
            };
          }
          if (change.updates.config) {
            updatePayload.config = change.updates.config;
          }
          if (change.updates.dataSource) {
            updatePayload.dataSource = {
              type: change.updates.dataSource.type ?? "vocabulary",
              vocabularyId: change.updates.dataSource.vocabularyItemId,
              sql: change.updates.dataSource.query,
            };
          }

          await updateBlock(change.blockId, updatePayload);
          appliedChanges.push({
            type: "update",
            blockId: change.blockId,
            success: true,
          });
        }
      } catch {
        appliedChanges.push({
          type: change.type,
          blockId: change.blockId,
          success: false,
        });
      }
    }

    // Get updated blocks
    const updatedBlocks = await getCanvasBlocks(id);

    return c.json({
      canvas,
      blocks: updatedBlocks,
      instruction: input.instruction,
      changes: appliedChanges,
      changesApplied: appliedChanges.filter((c) => c.success).length,
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
