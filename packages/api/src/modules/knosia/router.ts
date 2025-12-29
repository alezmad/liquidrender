import { Hono } from "hono";

import { analysisRouter } from "./analysis";
import { briefingRouter } from "./briefing";
import { connectionsRouter } from "./connections";
import { conversationRouter } from "./conversation";
import { preferencesRouter } from "./preferences";
import { knosiaVocabularyRouter } from "./vocabulary";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

/**
 * Main Knosia API router
 * Mounts all Knosia-related sub-routers
 */
export const knosiaRouter = new Hono<{ Variables: Variables }>()
  .route("/analysis", analysisRouter)
  .route("/briefing", briefingRouter)
  .route("/connections", connectionsRouter)
  .route("/conversation", conversationRouter)
  .route("/preferences", preferencesRouter)
  .route("/vocabulary", knosiaVocabularyRouter);
