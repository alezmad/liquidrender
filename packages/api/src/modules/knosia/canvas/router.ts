import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { enforceAuth } from "../../../middleware";
import type { Variables } from "../../../types";

import {
  listCanvases,
  listUserCanvases,
  getCanvas,
  getCanvasVersions,
  getCanvasVersion,
} from "./queries";

import {
  createCanvas,
  updateCanvas,
  deleteCanvas,
  changeCanvasScope,
  restoreCanvasVersion,
} from "./mutations";

import {
  createCanvasInputSchema,
  updateCanvasInputSchema,
  changeScopeInputSchema,
  listCanvasesQuerySchema,
  listVersionsQuerySchema,
} from "./schemas";

export const canvasRouter = new Hono<{ Variables: Variables }>()
  // List all canvases for authenticated user
  .get(
    "/",
    enforceAuth,
    zValidator("query", listCanvasesQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const userId = c.get("user")!.id;

      try {
        const result = await listUserCanvases(userId, query);
        return c.json({
          data: result.canvases,
          total: result.canvases.length
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    },
  )

  // List canvases in workspace
  .get(
    "/workspaces/:workspaceId/canvases",
    enforceAuth,
    zValidator("query", listCanvasesQuerySchema),
    async (c) => {
      const { workspaceId } = c.req.param();
      const query = c.req.valid("query");
      const userId = c.get("user")!.id;

      try {
        const result = await listCanvases(workspaceId, userId, query);
        return c.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message === "Not a workspace member") {
          return c.json({ error: message, code: "NOT_WORKSPACE_MEMBER" }, 403);
        }
        return c.json({ error: message }, 500);
      }
    },
  )

  // Get canvas
  .get("/canvases/:id", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const userId = c.get("user")!.id;

    try {
      const canvas = await getCanvas(id, userId);
      return c.json(canvas);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message === "Canvas not found") {
        return c.json({ error: message, code: "CANVAS_NOT_FOUND" }, 404);
      }
      if (message === "No view permission") {
        return c.json({ error: message, code: "NO_VIEW_PERMISSION" }, 403);
      }
      return c.json({ error: message }, 500);
    }
  })

  // Create canvas
  .post(
    "/canvases",
    enforceAuth,
    zValidator("json", createCanvasInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const userId = c.get("user")!.id;

      try {
        const canvas = await createCanvas(input, userId);
        return c.json(canvas, 201);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message === "Not a workspace member") {
          return c.json({ error: message, code: "NOT_WORKSPACE_MEMBER" }, 403);
        }
        return c.json({ error: message }, 500);
      }
    },
  )

  // Update canvas
  .put(
    "/canvases/:id",
    enforceAuth,
    zValidator("json", updateCanvasInputSchema),
    async (c) => {
      const { id } = c.req.param();
      const input = c.req.valid("json");
      const userId = c.get("user")!.id;

      try {
        const canvas = await updateCanvas(id, input, userId);
        return c.json(canvas);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message === "Canvas not found") {
          return c.json({ error: message, code: "CANVAS_NOT_FOUND" }, 404);
        }
        if (message === "No edit permission") {
          return c.json({ error: message, code: "NO_EDIT_PERMISSION" }, 403);
        }
        if (message === "Version conflict") {
          return c.json({ error: message, code: "VERSION_CONFLICT" }, 409);
        }
        return c.json({ error: message }, 500);
      }
    },
  )

  // Delete canvas
  .delete("/canvases/:id", enforceAuth, async (c) => {
    const { id } = c.req.param();
    const userId = c.get("user")!.id;
    const permanent = c.req.query("permanent") === "true";

    try {
      const result = await deleteCanvas(id, userId, permanent);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message === "Canvas not found") {
        return c.json({ error: message, code: "CANVAS_NOT_FOUND" }, 404);
      }
      if (message === "Not canvas owner") {
        return c.json({ error: message, code: "NOT_CANVAS_OWNER" }, 403);
      }
      if (message === "Cannot delete default workspace canvas") {
        return c.json({ error: message, code: "CANNOT_DELETE_DEFAULT" }, 400);
      }
      return c.json({ error: message }, 500);
    }
  })

  // Change canvas scope
  .put(
    "/canvases/:id/scope",
    enforceAuth,
    zValidator("json", changeScopeInputSchema),
    async (c) => {
      const { id } = c.req.param();
      const input = c.req.valid("json");
      const userId = c.get("user")!.id;

      try {
        const result = await changeCanvasScope(id, input.scope, userId);
        return c.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message === "Canvas not found") {
          return c.json({ error: message, code: "CANVAS_NOT_FOUND" }, 404);
        }
        if (message === "Not canvas owner") {
          return c.json({ error: message, code: "NOT_CANVAS_OWNER" }, 403);
        }
        if (message === "Invalid scope transition") {
          return c.json(
            { error: message, code: "INVALID_SCOPE_TRANSITION" },
            400,
          );
        }
        return c.json({ error: message }, 500);
      }
    },
  )

  // List versions
  .get(
    "/canvases/:id/versions",
    enforceAuth,
    zValidator("query", listVersionsQuerySchema),
    async (c) => {
      const { id } = c.req.param();
      const query = c.req.valid("query");
      const userId = c.get("user")!.id;

      try {
        const result = await getCanvasVersions(id, userId, query);
        return c.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (message === "Canvas not found") {
          return c.json({ error: message, code: "CANVAS_NOT_FOUND" }, 404);
        }
        if (message === "No view permission") {
          return c.json({ error: message, code: "NO_VIEW_PERMISSION" }, 403);
        }
        return c.json({ error: message }, 500);
      }
    },
  )

  // Get version
  .get("/canvases/:id/versions/:versionNumber", enforceAuth, async (c) => {
    const { id, versionNumber } = c.req.param();
    const userId = c.get("user")!.id;

    try {
      const version = await getCanvasVersion(
        id,
        parseInt(versionNumber, 10),
        userId,
      );
      return c.json(version);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (
        message === "Canvas not found" ||
        message === "Version not found"
      ) {
        const code =
          message === "Canvas not found"
            ? "CANVAS_NOT_FOUND"
            : "VERSION_NOT_FOUND";
        return c.json({ error: message, code }, 404);
      }
      if (message === "No view permission") {
        return c.json({ error: message, code: "NO_VIEW_PERMISSION" }, 403);
      }
      return c.json({ error: message }, 500);
    }
  })

  // Restore version
  .post(
    "/canvases/:id/versions/:versionNumber/restore",
    enforceAuth,
    async (c) => {
      const { id, versionNumber } = c.req.param();
      const userId = c.get("user")!.id;

      try {
        const result = await restoreCanvasVersion(
          id,
          parseInt(versionNumber, 10),
          userId,
        );
        return c.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (
          message === "Canvas not found" ||
          message === "Version not found"
        ) {
          const code =
            message === "Canvas not found"
              ? "CANVAS_NOT_FOUND"
              : "VERSION_NOT_FOUND";
          return c.json({ error: message, code }, 404);
        }
        if (message === "No edit permission") {
          return c.json({ error: message, code: "NO_EDIT_PERMISSION" }, 403);
        }
        return c.json({ error: message }, 500);
      }
    },
  );
