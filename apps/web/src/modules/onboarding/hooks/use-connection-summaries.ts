"use client";

import { useQuery } from "@tanstack/react-query";
import type { ConnectionSummary, ConnectionType } from "../types";

const API_BASE = "/api/knosia/connections";

interface ApiConnection {
  id: string;
  orgId: string;
  name: string | null;
  type: string;
  host: string;
  port: number | null;
  database: string;
  schema: string | null;
  sslEnabled: boolean | null;
  tablesCount: number | null;
  createdAt: string;
  updatedAt: string;
  health?: {
    status: string;
    lastCheck: string | null;
    errorMessage: string | null;
    latencyMs: number | null;
  } | null;
}

/**
 * Fetch a single connection by ID
 */
async function fetchConnection(id: string, orgId: string): Promise<ApiConnection | null> {
  const response = await fetch(`${API_BASE}/${id}?orgId=${encodeURIComponent(orgId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    console.warn(`[useConnectionSummaries] Failed to fetch connection ${id}:`, response.status);
    return null;
  }

  return response.json() as Promise<ApiConnection>;
}

/**
 * Convert API response to ConnectionSummary format
 */
function mapToSummary(conn: ApiConnection): ConnectionSummary {
  return {
    id: conn.id,
    type: conn.type as ConnectionType,
    name: conn.name ?? conn.database,
    host: conn.host,
    port: conn.port ?? 5432,
    database: conn.database,
    tablesCount: conn.tablesCount ?? 0,
    status: conn.health?.status === "error" ? "error" : "connected",
    connectedAt: new Date(conn.createdAt),
  };
}

/**
 * Fetch connection details for display in summary screen.
 */
export function useConnectionSummaries(connectionIds: string[], orgId: string) {
  return useQuery({
    queryKey: ["connections", "summaries", connectionIds],
    queryFn: async (): Promise<ConnectionSummary[]> => {
      if (connectionIds.length === 0) return [];

      const results = await Promise.allSettled(
        connectionIds.map((id) => fetchConnection(id, orgId))
      );

      return results
        .filter((r): r is PromiseFulfilledResult<ApiConnection | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((conn): conn is ApiConnection => conn !== null)
        .map(mapToSummary);
    },
    enabled: connectionIds.length > 0 && !!orgId,
  });
}

/**
 * Convert a raw API connection response to ConnectionSummary format.
 * Exported for use in connection-test flow.
 */
export function toConnectionSummary(conn: {
  id: string;
  type: string;
  name?: string | null;
  host: string;
  port?: number | null;
  database: string;
  tablesCount?: number;
  createdAt?: Date | string;
}): ConnectionSummary {
  return {
    id: conn.id,
    type: conn.type as ConnectionType,
    name: conn.name ?? conn.database,
    host: conn.host,
    port: conn.port ?? 5432,
    database: conn.database,
    tablesCount: conn.tablesCount ?? 0,
    status: "connected",
    connectedAt: conn.createdAt
      ? (typeof conn.createdAt === "string" ? new Date(conn.createdAt) : conn.createdAt)
      : new Date(),
  };
}
