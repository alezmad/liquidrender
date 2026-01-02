import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { enforceAuth } from "../../../middleware";
import {
  runAnalysis,
  getAnalysis,
  getTableProfile,
  getColumnProfiles,
  getProfilingSummary,
} from "./queries";
import {
  runAnalysisSchema,
  getAnalysisSchema,
  getTableProfileSchema,
  getProfilingSummarySchema,
} from "./schemas";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const analysisRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // ============================================================================
  // GET /run - Run analysis with SSE streaming
  // ============================================================================
  .get("/run", async (c) => {
    const query = c.req.query();

    // Validate input
    const parsed = runAnalysisSchema.safeParse({
      connectionId: query.connectionId,
      includeDataProfiling: query.includeDataProfiling === "true",
    });

    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid request",
          details: parsed.error.issues,
        },
        400
      );
    }

    const { connectionId, includeDataProfiling } = parsed.data;

    // Stream SSE events
    return streamSSE(c, async (stream) => {
      try {
        for await (const event of runAnalysis(connectionId, includeDataProfiling)) {
          await stream.writeSSE({
            event: event.event,
            data: JSON.stringify(event.data),
          });

          // If error event, close the stream
          if (event.event === "error") {
            break;
          }
        }
      } catch (error) {
        // Handle unexpected errors
        const message = error instanceof Error ? error.message : "Unexpected error";
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            code: "STREAM_ERROR",
            message,
            recoverable: false,
          }),
        });
      }
    });
  })

  // ============================================================================
  // GET /:id - Get analysis by ID
  // ============================================================================
  .get("/:id", async (c) => {
    const id = c.req.param("id");

    const parsed = getAnalysisSchema.safeParse({ id });
    if (!parsed.success) {
      return c.json({ error: "Invalid analysis ID" }, 400);
    }

    const analysis = await getAnalysis(parsed.data);

    if (!analysis) {
      return c.json({ error: "Analysis not found" }, 404);
    }

    return c.json(analysis);
  })

  // ============================================================================
  // GET /:id/profiling - Get profiling summary for an analysis
  // ============================================================================
  .get("/:id/profiling", async (c) => {
    const id = c.req.param("id");

    const parsed = getProfilingSummarySchema.safeParse({ id });
    if (!parsed.success) {
      return c.json({ error: "Invalid analysis ID" }, 400);
    }

    const summary = await getProfilingSummary(parsed.data.id);

    if (!summary) {
      return c.json({ error: "No profiling data found for this analysis" }, 404);
    }

    return c.json(summary);
  })

  // ============================================================================
  // GET /:id/tables/:tableName/profile - Get table profile with column profiles
  // ============================================================================
  .get("/:id/tables/:tableName/profile", async (c) => {
    const analysisId = c.req.param("id");
    const tableName = c.req.param("tableName");

    const parsed = getTableProfileSchema.safeParse({ analysisId, tableName });
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid request",
          details: parsed.error.issues,
        },
        400
      );
    }

    const tableProfile = await getTableProfile(analysisId, tableName);

    if (!tableProfile) {
      return c.json({ error: "Table profile not found" }, 404);
    }

    // Get column profiles for this table
    const columnProfiles = await getColumnProfiles(tableProfile.id);

    return c.json({
      table: tableProfile,
      columns: columnProfiles,
    });
  });
