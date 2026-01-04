import { Hono } from "hono";

// import { activityRouter } from "./activity"; // V2: Not implemented yet
import { analysisRouter } from "./analysis";
import { briefingRouter } from "./briefing";
import { canvasRouter } from "./canvas";
// import { commentRouter } from "./comment"; // V2: Not implemented yet
import { connectionsRouter } from "./connections";
// import { insightRouter } from "./insight"; // V2: Not implemented yet
import { notificationRouter } from "./notification";
// import { searchRouter } from "./search"; // V2: Not implemented yet
import { threadRouter } from "./thread";
import { knosiaOrganizationRouter } from "./organization";
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
 *
 * Active: analysis, briefing, canvas, connections, notification, thread, organization, preferences, vocabulary
 * V2 Roadmap: activity, comment, insight, search (not yet implemented)
 */
export const knosiaRouter = new Hono<{ Variables: Variables }>()
  // .route("/activity", activityRouter)
  .route("/analysis", analysisRouter)
  .route("/briefing", briefingRouter)
  .route("/canvas", canvasRouter)
  // .route("/comment", commentRouter)
  .route("/connections", connectionsRouter)
  // .route("/insight", insightRouter)
  .route("/notification", notificationRouter)
  // .route("/search", searchRouter)
  .route("/thread", threadRouter)
  .route("/organization", knosiaOrganizationRouter)
  .route("/preferences", preferencesRouter)
  .route("/vocabulary", knosiaVocabularyRouter);
