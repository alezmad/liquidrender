import { Hono } from "hono";

import { enforceAuth } from "../../../middleware";

import { getOrCreateKnosiaOrg } from "./mutations";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const knosiaOrganizationRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // Get or create user's knosia organization
  .post("/me", async (c) => {
    const user = c.get("user");

    const org = await getOrCreateKnosiaOrg(user);

    return c.json({
      id: org.id,
      name: org.name,
      isGuest: org.isGuest,
      expiresAt: org.expiresAt?.toISOString() ?? null,
      createdAt: org.createdAt.toISOString(),
    });
  });
