// Connections module types

export interface ConnectionsViewProps {
  user: { id: string; email: string };
}

export interface ConnectionWithHealth {
  id: string;
  orgId: string;
  workspaceId: string;
  name: string;
  type: string;
  host: string;
  port: number | null;
  database: string;
  schema: string | null;
  sslEnabled: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  tablesCount: number | null;
  health: {
    status: "connected" | "error" | "stale";
    lastCheck: Date | null;
    errorMessage: string | null;
    latencyMs: number | null;
  } | null;
}
