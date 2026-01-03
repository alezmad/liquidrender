import { and, eq } from "@turbostarter/db";
import {
  knosiaConnection,
  knosiaConnectionHealth,
  knosiaWorkspace,
  knosiaWorkspaceConnection,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

// Dynamic import to avoid Turbopack issues with native modules
const getDuckDBAdapter = async () => {
  const { DuckDBUniversalAdapter } = await import("@repo/liquid-connect/uvb");
  return DuckDBUniversalAdapter;
};

import type {
  CreateConnectionInput,
  DeleteConnectionInput,
  ConnectionWithHealth,
  TestConnectionInput,
} from "./schemas";

// =============================================================================
// Test Connection Result
// =============================================================================

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  serverVersion?: string;
}

// =============================================================================
// Test Database Connection
// =============================================================================

/**
 * Test a database connection using DuckDB Universal Adapter
 *
 * Validates credentials and measures latency without saving.
 */
export const testDatabaseConnection = async (
  input: TestConnectionInput
): Promise<TestConnectionResult> => {
  // Build connection string
  let connectionString: string;

  switch (input.type) {
    case 'postgres': {
      const port = input.port ?? 5432;
      const auth = input.username && input.password
        ? `${input.username}:${input.password}@`
        : '';
      connectionString = `postgresql://${auth}${input.host}:${port}/${input.database}`;
      break;
    }

    case 'mysql': {
      const port = input.port ?? 3306;
      const auth = input.username && input.password
        ? `${input.username}:${input.password}@`
        : '';
      connectionString = `mysql://${auth}${input.host}:${port}/${input.database}`;
      break;
    }

    case 'duckdb': {
      connectionString = input.database; // database field contains the file path
      break;
    }

    default:
      return {
        success: false,
        message: `Connection type '${input.type}' not yet supported.`,
      };
  }

  console.log('[testDatabaseConnection] Connection string:', connectionString.replace(/:[^:@]+@/, ':***@'));

  const DuckDBAdapter = await getDuckDBAdapter();
  const adapter = new DuckDBAdapter();
  const startTime = Date.now();

  try {
    console.log('[testDatabaseConnection] Starting adapter.connect()...');
    await adapter.connect(connectionString);
    console.log('[testDatabaseConnection] adapter.connect() completed successfully');

    // Test with a simple query
    console.log('[testDatabaseConnection] Running test query...');
    const result = await adapter.query('SELECT 1 AS test');
    console.log('[testDatabaseConnection] Test query returned:', result);
    const latencyMs = Date.now() - startTime;

    if (!result || result.length === 0) {
      throw new Error('Connection test query returned no results');
    }

    // Capture type BEFORE disconnecting (disconnect clears this.sourceType)
    const dbType = adapter.type;

    await adapter.disconnect();

    return {
      success: true,
      message: `Successfully connected to ${dbType} database`,
      latencyMs,
      serverVersion: `DuckDB ${dbType} scanner`,
    };
  } catch (error) {
    console.error('[testDatabaseConnection] Error:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
    return {
      success: false,
      message: errorMessage,
    };
  }
};

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

  // Use a transaction to create connection, health record, and ensure workspace exists
  const result = await db.transaction(async (tx) => {
    console.log('[createConnection] Starting transaction');
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
        schema: input.schema && input.schema.trim() !== "" ? input.schema : "public",
        credentials,
        sslEnabled: input.ssl ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
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

    // Auto-create default workspace if org has no workspaces
    let workspace = await tx
      .select()
      .from(knosiaWorkspace)
      .where(eq(knosiaWorkspace.orgId, input.orgId))
      .limit(1);

    if (!workspace.length) {
      const [newWorkspace] = await tx
        .insert(knosiaWorkspace)
        .values({
          id: generateId(),
          orgId: input.orgId,
          name: "Main Workspace",
          slug: `main-${Date.now()}`,
          visibility: "org_wide",
        })
        .returning();
      workspace = [newWorkspace!];
    }

    // Link connection to workspace
    await tx.insert(knosiaWorkspaceConnection).values({
      id: generateId(),
      workspaceId: workspace[0]!.id,
      connectionId: connectionId,
    });

    return { connection, health, workspace: workspace[0] };
  });

  if (!result.connection) {
    throw new Error("Failed to create connection");
  }

  return {
    id: result.connection.id,
    orgId: result.connection.orgId,
    workspaceId: result.workspace!.id,
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
