import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import {
  getUserNotifications,
  getNotification,
  getUserDigests,
  getDigest,
  getAiInsights,
  getAiInsight,
  getCanvasesData,
  getMetricsData,
  getRecentAlerts,
  getRecentInsights,
} from "./queries";
import {
  markNotificationsRead,
  dismissNotification,
  createDigest,
  updateDigest,
  deleteDigest,
  updateAiInsightStatus,
  convertInsightToThread,
} from "./mutations";
import {
  getNotificationsInputSchema,
  markNotificationReadInputSchema,
  createDigestInputSchema,
  updateDigestInputSchema,
  getAiInsightsInputSchema,
  updateAiInsightStatusInputSchema,
  getAiInsightsQuerySchema,
  convertInsightToThreadInputSchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const notificationRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // NOTIFICATION ENDPOINTS
  // ============================================================================

  /**
   * GET / - Get user's notifications
   */
  .get("/", async (c) => {
    const user = c.get("user");
    const query = c.req.query();

    const input = getNotificationsInputSchema.parse({
      workspaceId: query.workspaceId,
      unreadOnly: query.unreadOnly === "true",
      type: query.type as "alert" | "mention" | "share" | "ai_insight" | "thread_activity" | "digest" | undefined,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 50,
    });

    const result = await getUserNotifications(user.id, input);
    return c.json(result);
  })

  /**
   * POST /read - Mark notifications as read
   */
  .post("/read", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const input = markNotificationReadInputSchema.parse(body);
    const notifications = await markNotificationsRead(user.id, input.ids, input.all);

    return c.json({ count: notifications.length });
  })

  /**
   * POST /:id/read - Mark single notification as read
   */
  .post("/:id/read", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const existing = await getNotification(id, user.id);
    if (!existing) {
      return c.json({ error: "Notification not found" }, 404);
    }

    const notifications = await markNotificationsRead(user.id, [id]);
    return c.json(notifications[0]);
  })

  /**
   * POST /:id/dismiss - Dismiss notification
   */
  .post("/:id/dismiss", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const notification = await dismissNotification(id, user.id);
    if (!notification) {
      return c.json({ error: "Notification not found" }, 404);
    }

    return c.json({ success: true });
  })

  /**
   * POST /read-all - Mark all notifications as read
   */
  .post("/read-all", async (c) => {
    const user = c.get("user");

    const notifications = await markNotificationsRead(user.id, undefined, true);
    return c.json({ count: notifications.length });
  })

  // ============================================================================
  // DIGEST ENDPOINTS
  // ============================================================================

  /**
   * GET /digests - Get user's digests
   */
  .get("/digests", async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.query("workspaceId");

    const digests = await getUserDigests(user.id, workspaceId);
    return c.json({ data: digests });
  })

  /**
   * GET /digests/:id - Get single digest
   */
  .get("/digests/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const digest = await getDigest(id, user.id);
    if (!digest) {
      return c.json({ error: "Digest not found" }, 404);
    }

    return c.json(digest);
  })

  /**
   * POST /digests - Create digest
   */
  .post("/digests", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const input = createDigestInputSchema.parse(body);
    const digest = await createDigest({ ...input, userId: user.id });

    return c.json(digest, 201);
  })

  /**
   * PATCH /digests/:id - Update digest
   */
  .patch("/digests/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await getDigest(id, user.id);
    if (!existing) {
      return c.json({ error: "Digest not found" }, 404);
    }

    const input = updateDigestInputSchema.parse(body);
    const digest = await updateDigest(id, input, user.id);

    return c.json(digest);
  })

  /**
   * DELETE /digests/:id - Delete digest
   */
  .delete("/digests/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const digest = await deleteDigest(id, user.id);
    if (!digest) {
      return c.json({ error: "Digest not found" }, 404);
    }

    return c.json({ success: true });
  })

  /**
   * POST /digests/:id/preview - Preview digest content
   */
  .post("/digests/:id/preview", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const digest = await getDigest(id, user.id);
    if (!digest) {
      return c.json({ error: "Digest not found" }, 404);
    }

    // Generate actual preview content based on digest.include settings
    const sections: Array<{
      title: string;
      type: string;
      items: Array<{
        label: string;
        value: string;
        change?: number | null;
        severity?: string;
      }>;
    }> = [];

    const include = digest.include as {
      canvasIds?: string[];
      metrics?: string[];
      includeAlerts?: boolean;
      includeAiInsights?: boolean;
    } | null;

    // 1. Canvas Highlights
    if (include?.canvasIds?.length) {
      const canvasData = await getCanvasesData(include.canvasIds);
      if (canvasData.length) {
        sections.push({
          title: "Canvas Highlights",
          type: "canvases",
          items: canvasData.map((c) => ({
            label: c.name,
            value: c.summary,
          })),
        });
      }
    }

    // 2. Key Metrics
    if (include?.metrics?.length) {
      const metricsData = await getMetricsData(
        digest.workspaceId,
        include.metrics,
      );
      if (metricsData.length) {
        sections.push({
          title: "Key Metrics",
          type: "metrics",
          items: metricsData.map((m) => ({
            label: m.name,
            value: m.formattedValue,
            change: m.change,
          })),
        });
      }
    }

    // 3. Alerts
    if (include?.includeAlerts) {
      const alerts = await getRecentAlerts(digest.workspaceId);
      if (alerts.length) {
        sections.push({
          title: "Alerts",
          type: "alerts",
          items: alerts.map((a) => ({
            label: a.name,
            value: a.message,
            severity: a.severity,
          })),
        });
      }
    }

    // 4. AI Insights
    if (include?.includeAiInsights) {
      const insights = await getRecentInsights(digest.workspaceId);
      if (insights.length) {
        sections.push({
          title: "AI Insights",
          type: "insights",
          items: insights.map((i) => ({
            label: i.headline,
            value: i.explanation,
            severity: i.severity ?? undefined,
          })),
        });
      }
    }

    return c.json({
      digestId: digest.id,
      name: digest.name,
      generatedAt: new Date().toISOString(),
      sections,
    });
  })

  // ============================================================================
  // AI INSIGHT ENDPOINTS
  // ============================================================================

  /**
   * GET /insights - Get AI insights
   */
  .get("/insights", zValidator("query", getAiInsightsQuerySchema), async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");

    const input = getAiInsightsInputSchema.parse({
      workspaceId: query.workspaceId,
      status: query.status,
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 20,
    });

    const result = await getAiInsights(user.id, input);
    return c.json(result);
  })

  /**
   * GET /insights/:id - Get single AI insight
   */
  .get("/insights/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const insight = await getAiInsight(id, user.id);
    if (!insight) {
      return c.json({ error: "Insight not found" }, 404);
    }

    return c.json(insight);
  })

  /**
   * PATCH /insights/:id/status - Update insight status
   */
  .patch("/insights/:id/status", zValidator("json", updateAiInsightStatusInputSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    const existing = await getAiInsight(id, user.id);
    if (!existing) {
      return c.json({ error: "Insight not found" }, 404);
    }

    const insight = await updateAiInsightStatus(id, input, user.id);

    return c.json(insight);
  })

  /**
   * POST /insights/:id/convert-to-thread - Convert insight to a Thread
   * Creates a new Thread with the insight context and initial AI message.
   */
  .post("/insights/:id/convert-to-thread", zValidator("json", convertInsightToThreadInputSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const input = c.req.valid("json");

    const result = await convertInsightToThread(id, input, user.id);

    if ("error" in result) {
      if (result.error === "Insight not found") {
        return c.json({ error: result.error }, 404);
      }
      if (result.error === "Access denied") {
        return c.json({ error: result.error }, 403);
      }
      if (result.error === "Insight already converted") {
        return c.json({ error: result.error, threadId: result.threadId }, 409);
      }
      return c.json({ error: result.error }, 400);
    }

    return c.json(result.thread, 201);
  });
