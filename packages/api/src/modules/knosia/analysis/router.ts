import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { enforceAuth } from "../../../middleware";
import { runAnalysis, getAnalysis } from "./queries";
import { runAnalysisSchema, getAnalysisSchema } from "./schemas";

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

    const { connectionId } = parsed.data;

    // Stream SSE events
    return streamSSE(c, async (stream) => {
      try {
        for await (const event of runAnalysis(connectionId)) {
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
  });
