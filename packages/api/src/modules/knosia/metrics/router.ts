import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { enforceAuth } from "../../../middleware";
import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

import {
  listMetrics,
  getMetric,
  getMetricsByConnection,
} from "./queries";

import {
  createMetric,
  updateMetric,
  deleteMetric,
} from "./mutations";

import { executeMetricWithCache, previewMetricSQL } from "./execution";

import * as schemas from "./schemas";

export const metricsRouter = new Hono<{ Variables: Variables }>()
  // List metrics for workspace/connection
  .get(
    "/",
    enforceAuth,
    zValidator("query", schemas.listMetricsSchema),
    async (c) => {
      const query = c.req.valid("query");

      try {
        const metrics = await listMetrics(query);
        return c.json({ metrics });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    },
  )

  // Get single metric
  .get(
    "/:id",
    enforceAuth,
    async (c) => {
      const id = c.req.param("id");

      try {
        const metric = await getMetric(id);

        if (!metric) {
          return c.json({ error: "Metric not found" }, 404);
        }

        return c.json({ metric });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    },
  )

  // Execute metric (get current value)
  .post(
    "/:id/execute",
    enforceAuth,
    zValidator("json", schemas.executeMetricSchema),
    async (c) => {
      const id = c.req.param("id");
      const options = c.req.valid("json");

      try {
        const result = await executeMetricWithCache(id, options);
        return c.json({ result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not found")) {
          return c.json({ error: message }, 404);
        }
        return c.json({ error: message }, 500);
      }
    },
  )

  // Preview SQL for metric (without executing)
  .post(
    "/:id/preview-sql",
    enforceAuth,
    zValidator("json", schemas.previewSQLSchema),
    async (c) => {
      const id = c.req.param("id");
      const { dialect, timeRange } = c.req.valid("json");

      try {
        const preview = await previewMetricSQL(id, dialect, timeRange);
        return c.json({ preview });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not found")) {
          return c.json({ error: message }, 404);
        }
        return c.json({ error: message }, 500);
      }
    },
  )

  // Create metric (user-created)
  .post(
    "/",
    enforceAuth,
    zValidator("json", schemas.createMetricSchema),
    async (c) => {
      const data = c.req.valid("json");

      try {
        const metric = await createMetric(data);
        return c.json({ metric }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    },
  )

  // Update metric
  .patch(
    "/:id",
    enforceAuth,
    zValidator("json", schemas.updateMetricSchema),
    async (c) => {
      const id = c.req.param("id");
      const data = c.req.valid("json");

      try {
        const metric = await updateMetric(id, data);

        if (!metric) {
          return c.json({ error: "Metric not found" }, 404);
        }

        return c.json({ metric });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    },
  )

  // Delete metric
  .delete(
    "/:id",
    enforceAuth,
    async (c) => {
      const id = c.req.param("id");

      try {
        await deleteMetric(id, false); // Soft delete by default
        return c.json({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    },
  )

  // Get metrics by connection (for Vocabulary page)
  .get(
    "/connection/:connectionId",
    enforceAuth,
    async (c) => {
      const connectionId = c.req.param("connectionId");

      try {
        const metrics = await getMetricsByConnection(connectionId);
        return c.json({ metrics });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    },
  );
