import { z } from "zod";

// Database types matching the knosia schema enum
export const connectionTypeSchema = z.enum([
  "postgres",
  "mysql",
  "snowflake",
  "bigquery",
  "redshift",
  "duckdb",
]);

export const connectionStatusSchema = z.enum(["connected", "error", "stale"]);

// Test connection schema - for testing before saving
export const testConnectionInputSchema = z.object({
  type: connectionTypeSchema,
  host: z.string().min(1, "Host is required"),
  port: z.number().int().positive().optional(),
  database: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  schema: z.string().default("public"),
  ssl: z.boolean().default(true),
});

// Create connection schema - extends test with name
export const createConnectionInputSchema = testConnectionInputSchema.extend({
  name: z.string().min(1, "Connection name is required").max(255).optional(),
  orgId: z.string(),
  userId: z.string(), // User who creates the connection (added as workspace member)
});

// Get connection schema
export const getConnectionInputSchema = z.object({
  id: z.string(),
  orgId: z.string(),
});

// Delete connection schema
export const deleteConnectionInputSchema = z.object({
  id: z.string(),
  orgId: z.string(),
});

// Delete connection query schema (for typed query params)
export const deleteConnectionQuerySchema = z.object({
  orgId: z.string(),
  preview: z.string().optional(),
});

// List connections schema
export const getConnectionsInputSchema = z.object({
  orgId: z.string(),
});

// Connection with health response type
export const connectionWithHealthSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  workspaceId: z.string(), // Auto-created or existing workspace
  name: z.string(),
  type: connectionTypeSchema,
  host: z.string(),
  port: z.number().nullable(),
  database: z.string(),
  schema: z.string().nullable(),
  sslEnabled: z.boolean().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Schema info (from knosiaConnectionSchema table)
  tablesCount: z.number().nullable(),
  // Health info (from joined table)
  health: z
    .object({
      status: connectionStatusSchema,
      lastCheck: z.date().nullable(),
      errorMessage: z.string().nullable(),
      latencyMs: z.number().nullable(),
    })
    .nullable(),
});

// Types
export type ConnectionType = z.infer<typeof connectionTypeSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionInputSchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionInputSchema>;
export type GetConnectionInput = z.infer<typeof getConnectionInputSchema>;
export type DeleteConnectionInput = z.infer<typeof deleteConnectionInputSchema>;
export type GetConnectionsInput = z.infer<typeof getConnectionsInputSchema>;
export type ConnectionWithHealth = z.infer<typeof connectionWithHealthSchema>;
