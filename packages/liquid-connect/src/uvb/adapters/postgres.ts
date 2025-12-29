/**
 * PostgreSQL Database Adapter
 *
 * Uses the 'pg' package for PostgreSQL connections.
 * Install: npm install pg @types/pg
 */

import type { DatabaseAdapter } from "../extractor";
import type { DatabaseType } from "../models";

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
}

/**
 * PostgreSQL adapter for schema extraction.
 *
 * Requires the 'pg' package to be installed:
 * ```
 * npm install pg @types/pg
 * ```
 *
 * Usage:
 * ```typescript
 * import { PostgresAdapter } from '@repo/liquid-connect/uvb/adapters/postgres'
 * import { extractSchema, applyHardRules } from '@repo/liquid-connect/uvb'
 *
 * const adapter = new PostgresAdapter({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 *   user: 'postgres',
 *   password: 'secret'
 * })
 *
 * const schema = await extractSchema(adapter, { schema: 'public' })
 * const { detected, confirmations } = applyHardRules(schema)
 * ```
 */
export class PostgresAdapter implements DatabaseAdapter {
  readonly type: DatabaseType = "postgres";
  private config: PostgresConfig;
  private client: unknown = null;
  private Pool: unknown = null;

  constructor(config: PostgresConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Dynamic import to avoid bundling pg when not used
    try {
      const pg = await import("pg");
      this.Pool = pg.Pool;
      this.client = new (pg.Pool as { new (config: PostgresConfig): unknown })(this.config);
    } catch (e) {
      throw new Error(
        "PostgreSQL driver not installed. Run: npm install pg @types/pg"
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await (this.client as { end(): Promise<void> }).end();
      this.client = null;
    }
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.client) {
      throw new Error("Not connected to database");
    }

    interface QueryResult {
      rows: T[];
    }

    const result = await (
      this.client as { query(sql: string, params?: unknown[]): Promise<QueryResult> }
    ).query(sql, params);

    return result.rows;
  }

  getDatabaseName(): string {
    return this.config.database;
  }
}

/**
 * Create a PostgreSQL adapter from a connection string.
 *
 * @param connectionString - PostgreSQL connection string
 *   Format: postgresql://user:password@host:port/database
 */
export function createPostgresAdapter(connectionString: string): PostgresAdapter {
  const url = new URL(connectionString);

  return new PostgresAdapter({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: url.searchParams.get("ssl") === "true" ? true : undefined,
  });
}
