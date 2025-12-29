import { and, eq } from "@turbostarter/db";
import {
  knosiaConnection,
  knosiaConnectionHealth,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import type {
  CreateConnectionInput,
  DeleteConnectionInput,
  ConnectionWithHealth,
} from "./schemas";

/**
 * Create a new database connection
 */
export const createConnection = async (
  input: CreateConnectionInput,
): Promise<ConnectionWithHealth> => {
  const connectionId = generateId();

  // Build credentials object (would be encrypted in production)
  const credentials = JSON.stringify({
    username: input.username,
    password: input.password,
  });

  // Generate a default name if not provided
  const name =
    input.name || `${input.type}://${input.host}/${input.database}`;

  // Use a transaction to create both connection and initial health record
  const result = await db.transaction(async (tx) => {
    // Insert the connection
    const [connection] = await tx
      .insert(knosiaConnection)
      .values({
        id: connectionId,
        orgId: input.orgId,
        name,
        type: input.type,
        host: input.host,
        port: input.port ?? null,
        database: input.database,
        schema: input.schema ?? "public",
        credentials,
        sslEnabled: input.ssl ?? true,
      })
      .returning();

    // Create initial health record
    const [health] = await tx
      .insert(knosiaConnectionHealth)
      .values({
        connectionId: connectionId,
        status: "connected",
        lastCheck: new Date(),
        latencyMs: 0,
      })
      .returning();

    return { connection, health };
  });

  if (!result.connection) {
    throw new Error("Failed to create connection");
  }

  return {
    id: result.connection.id,
    orgId: result.connection.orgId,
    name: result.connection.name,
    type: result.connection.type,
    host: result.connection.host,
    port: result.connection.port,
    database: result.connection.database,
    schema: result.connection.schema,
    sslEnabled: result.connection.sslEnabled,
    createdAt: result.connection.createdAt,
    updatedAt: result.connection.updatedAt,
    health: result.health
      ? {
          status: result.health.status,
          lastCheck: result.health.lastCheck,
          errorMessage: result.health.errorMessage,
          latencyMs: result.health.latencyMs,
        }
      : null,
  };
};

/**
 * Delete a database connection
 */
export const deleteConnection = async (
  input: DeleteConnectionInput,
): Promise<{ id: string } | null> => {
  // The health records will be cascade deleted due to FK constraint
  const result = await db
    .delete(knosiaConnection)
    .where(
      and(
        eq(knosiaConnection.id, input.id),
        eq(knosiaConnection.orgId, input.orgId),
      ),
    )
    .returning({ id: knosiaConnection.id });

  return result[0] ?? null;
};
