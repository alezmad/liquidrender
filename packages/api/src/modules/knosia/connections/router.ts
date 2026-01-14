import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { enforceAuth } from "../../../middleware";

import {
  createConnection,
  deleteConnection,
  testDatabaseConnection,
} from "./mutations";
import { getConnection, getConnections } from "./queries";
import {
  testConnectionInputSchema,
  createConnectionInputSchema,
  getConnectionsInputSchema,
  deleteConnectionInputSchema,
  deleteConnectionQuerySchema,
} from "./schemas";
import { getCascadeImpact } from "../shared";

import type { Session, User } from "@turbostarter/auth";

type Variables = {
  user: User;
  session: Session;
};

export const connectionsRouter = new Hono<{ Variables: Variables }>()
  .use(enforceAuth)

  // Test database connection (without saving)
  .post("/test", async (c) => {
    const body = await c.req.json();

    const input = testConnectionInputSchema.parse(body);

    const result = await testDatabaseConnection(input);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.message,
        },
        400,
      );
    }

    return c.json({
      success: true,
      message: result.message,
      latencyMs: result.latencyMs,
    });
  })

  // Create new connection
  .post("/", async (c) => {
    const body = await c.req.json();
    const user = c.get("user");

    // For now, use a placeholder orgId from the request body
    // In production, this would come from the user's active organization
    const input = createConnectionInputSchema.parse({
      ...body,
      orgId: body.orgId,
      userId: user.id,
    });

    // First test the connection
    const testResult = await testDatabaseConnection({
      type: input.type,
      host: input.host,
      port: input.port,
      database: input.database,
      username: input.username,
      password: input.password,
      schema: input.schema,
      ssl: input.ssl,
    });

    if (!testResult.success) {
      return c.json(
        {
          error: "Connection test failed",
          details: testResult.message,
        },
        400,
      );
    }

    const connection = await createConnection(input);
    return c.json(connection, 201);
  })

  // List all connections for organization
  .get("/", async (c) => {
    const orgId = c.req.query("orgId");

    if (!orgId) {
      return c.json({ error: "orgId query parameter is required" }, 400);
    }

    const input = getConnectionsInputSchema.parse({ orgId });
    const connections = await getConnections(input);

    return c.json({ data: connections });
  })

  // Get single connection
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const orgId = c.req.query("orgId");

    if (!orgId) {
      return c.json({ error: "orgId query parameter is required" }, 400);
    }

    const connection = await getConnection({ id, orgId });

    if (!connection) {
      return c.json({ error: "Connection not found" }, 404);
    }

    return c.json(connection);
  })

  // Delete connection (with preview support)
  .delete(
    "/:id",
    zValidator("query", deleteConnectionQuerySchema),
    async (c) => {
      const id = c.req.param("id");
      const { orgId, preview } = c.req.valid("query");

      // Preview mode - return impact counts without deleting
      if (preview === "true") {
        const impact = await getCascadeImpact("connection", id);
        return c.json({
          preview: true,
          resourceId: id,
          ...impact,
        });
      }

      // Execute mode - perform deletion
      const input = deleteConnectionInputSchema.parse({ id, orgId });
      const result = await deleteConnection(input);

      if (!result) {
        return c.json({ error: "Connection not found" }, 404);
      }

      return c.json({ success: true, id: result.id });
    },
  );
