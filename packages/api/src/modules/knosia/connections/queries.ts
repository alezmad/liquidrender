import { and, eq } from "@turbostarter/db";
import {
  knosiaConnection,
  knosiaConnectionHealth,
  knosiaWorkspaceConnection,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

import type {
  GetConnectionInput,
  GetConnectionsInput,
  TestConnectionInput,
  ConnectionWithHealth,
} from "./schemas";

/**
 * Get a single connection by ID and orgId
 */
export const getConnection = async (
  input: GetConnectionInput,
): Promise<ConnectionWithHealth | null> => {
  const result = await db
    .select({
      id: knosiaConnection.id,
      orgId: knosiaConnection.orgId,
      workspaceId: knosiaWorkspaceConnection.workspaceId,
      name: knosiaConnection.name,
      type: knosiaConnection.type,
      host: knosiaConnection.host,
      port: knosiaConnection.port,
      database: knosiaConnection.database,
      schema: knosiaConnection.schema,
      sslEnabled: knosiaConnection.sslEnabled,
      createdAt: knosiaConnection.createdAt,
      updatedAt: knosiaConnection.updatedAt,
      healthStatus: knosiaConnectionHealth.status,
      healthLastCheck: knosiaConnectionHealth.lastCheck,
      healthErrorMessage: knosiaConnectionHealth.errorMessage,
      healthLatencyMs: knosiaConnectionHealth.latencyMs,
    })
    .from(knosiaConnection)
    .leftJoin(
      knosiaConnectionHealth,
      eq(knosiaConnection.id, knosiaConnectionHealth.connectionId),
    )
    .leftJoin(
      knosiaWorkspaceConnection,
      eq(knosiaConnection.id, knosiaWorkspaceConnection.connectionId),
    )
    .where(
      and(
        eq(knosiaConnection.id, input.id),
        eq(knosiaConnection.orgId, input.orgId),
      ),
    )
    .limit(1);

  if (!result[0]) {
    return null;
  }

  const row = result[0];
  return {
    id: row.id,
    orgId: row.orgId,
    workspaceId: row.workspaceId!,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    database: row.database,
    schema: row.schema,
    sslEnabled: row.sslEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    health: row.healthStatus
      ? {
          status: row.healthStatus,
          lastCheck: row.healthLastCheck,
          errorMessage: row.healthErrorMessage,
          latencyMs: row.healthLatencyMs,
        }
      : null,
  };
};

/**
 * Get all connections for an organization with their health status
 */
export const getConnections = async (
  input: GetConnectionsInput,
): Promise<ConnectionWithHealth[]> => {
  const results = await db
    .select({
      id: knosiaConnection.id,
      orgId: knosiaConnection.orgId,
      workspaceId: knosiaWorkspaceConnection.workspaceId,
      name: knosiaConnection.name,
      type: knosiaConnection.type,
      host: knosiaConnection.host,
      port: knosiaConnection.port,
      database: knosiaConnection.database,
      schema: knosiaConnection.schema,
      sslEnabled: knosiaConnection.sslEnabled,
      createdAt: knosiaConnection.createdAt,
      updatedAt: knosiaConnection.updatedAt,
      healthStatus: knosiaConnectionHealth.status,
      healthLastCheck: knosiaConnectionHealth.lastCheck,
      healthErrorMessage: knosiaConnectionHealth.errorMessage,
      healthLatencyMs: knosiaConnectionHealth.latencyMs,
    })
    .from(knosiaConnection)
    .leftJoin(
      knosiaConnectionHealth,
      eq(knosiaConnection.id, knosiaConnectionHealth.connectionId),
    )
    .leftJoin(
      knosiaWorkspaceConnection,
      eq(knosiaConnection.id, knosiaWorkspaceConnection.connectionId),
    )
    .where(eq(knosiaConnection.orgId, input.orgId))
    .orderBy(knosiaConnection.createdAt);

  return results.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    workspaceId: row.workspaceId!,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    database: row.database,
    schema: row.schema,
    sslEnabled: row.sslEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    health: row.healthStatus
      ? {
          status: row.healthStatus,
          lastCheck: row.healthLastCheck,
          errorMessage: row.healthErrorMessage,
          latencyMs: row.healthLatencyMs,
        }
      : null,
  }));
};

// testDatabaseConnection is now in mutations.ts with real PostgresAdapter integration
