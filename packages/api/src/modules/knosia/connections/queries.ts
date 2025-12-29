import { and, eq } from "@turbostarter/db";
import {
  knosiaConnection,
  knosiaConnectionHealth,
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
    .where(eq(knosiaConnection.orgId, input.orgId))
    .orderBy(knosiaConnection.createdAt);

  return results.map((row) => ({
    id: row.id,
    orgId: row.orgId,
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

/**
 * Test a database connection without saving it
 *
 * NOTE: This is a stub implementation. Real implementation requires
 * database adapters for each connection type (postgres, mysql, etc.)
 */
export const testDatabaseConnection = async (
  input: TestConnectionInput,
): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> => {
  const startTime = Date.now();

  // TODO: Implement real connection testing with database adapters
  // For now, return a stub success response
  // In production, this would:
  // 1. Create appropriate database adapter based on input.type
  // 2. Attempt to connect with credentials
  // 3. Run a simple query (e.g., SELECT 1)
  // 4. Return success/failure with latency

  // Stub implementation - simulates a successful connection
  const latencyMs = Date.now() - startTime + Math.floor(Math.random() * 50);

  // Basic validation that would be needed for real implementation
  if (!input.host || !input.database || !input.username) {
    return {
      success: false,
      message: "Missing required connection parameters",
    };
  }

  // Simulate success for now
  return {
    success: true,
    message: `Successfully connected to ${input.type} database "${input.database}" at ${input.host}`,
    latencyMs,
  };
};
