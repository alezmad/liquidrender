/**
 * DuckDB Universal Adapter (DEPRECATED)
 *
 * @deprecated This adapter uses the old 'duckdb' package which is incompatible with Next.js 16 Turbopack.
 * Use DuckDBUniversalAdapter from '../duckdb-adapter' instead.
 *
 * This file is kept for type exports only. The implementation is deprecated.
 *
 * Migration guide:
 * OLD: new DuckDBAdapter({ type: 'postgres', host, port, database, user, password })
 * NEW: new DuckDBUniversalAdapter().connect('postgresql://user:pass@host:port/database')
 */

// @ts-nocheck - Skip type checking for deprecated file
import type { DatabaseAdapter } from "../extractor";
import type { DatabaseType } from "../models";

// Deprecated - types kept for backward compatibility
let duckdb: typeof import("duckdb") | null = null;

async function loadDuckDB() {
  throw new Error(
    "DuckDB adapter is deprecated. Use DuckDBUniversalAdapter with connection strings instead.\n" +
    "Example: new DuckDBUniversalAdapter().connect('postgresql://user:pass@host/db')"
  );
}

// =============================================================================
// Types
// =============================================================================

export interface DuckDBConnectionConfig {
  type: "postgres" | "mysql" | "sqlite" | "duckdb" | "parquet" | "csv";
  // PostgreSQL/MySQL
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  // SQLite/DuckDB/Files
  path?: string;
  // Parquet/CSV
  url?: string;
}

export interface QueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  columns: string[];
  error?: string;
}

// =============================================================================
// DuckDB Adapter Class
// =============================================================================

export class DuckDBAdapter implements DatabaseAdapter {
  readonly type: DatabaseType;
  private db: InstanceType<typeof import("duckdb").Database> | null = null;
  private connection: ReturnType<
    InstanceType<typeof import("duckdb").Database>["connect"]
  > | null = null;
  private config: DuckDBConnectionConfig;
  private attachedAs: string = "source";

  constructor(config: DuckDBConnectionConfig) {
    this.config = config;
    // Map to internal DatabaseType (use duckdb for all since it's universal)
    this.type =
      config.type === "parquet" || config.type === "csv"
        ? "duckdb"
        : config.type;
  }

  async connect(): Promise<void> {
    // If already connected, skip (allows reuse with SchemaExtractor)
    if (this.db && this.connection) {
      return;
    }

    const DuckDB = await loadDuckDB();

    // For native DuckDB files, open directly. For other types, use in-memory + attach.
    if (this.config.type === "duckdb" && this.config.path && this.config.path !== ":memory:") {
      // Open DuckDB file directly - tables are in 'main' schema
      this.db = new DuckDB.Database(this.config.path);
      this.connection = this.db.connect();
    } else {
      // Create in-memory DuckDB instance
      this.db = new DuckDB.Database(":memory:");
      this.connection = this.db.connect();
      // Load required extension and attach source
      await this.attachSource();
    }
  }

  private async attachSource(): Promise<void> {
    const { type } = this.config;

    switch (type) {
      case "postgres":
        await this.attachPostgres();
        break;
      case "mysql":
        await this.attachMySQL();
        break;
      case "sqlite":
        await this.attachSQLite();
        break;
      case "duckdb":
        await this.attachDuckDB();
        break;
      case "parquet":
        await this.attachParquet();
        break;
      case "csv":
        await this.attachCSV();
        break;
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  private async attachPostgres(): Promise<void> {
    const { host, port, database, user, password } = this.config;

    // Install and load extension
    await this.run(`INSTALL postgres_scanner`);
    await this.run(`LOAD postgres_scanner`);

    // Build connection string
    const connStr = `postgresql://${user}:${password}@${host}:${port}/${database}`;

    // Attach database
    await this.run(
      `ATTACH '${connStr}' AS ${this.attachedAs} (TYPE postgres, READ_ONLY)`
    );
  }

  private async attachMySQL(): Promise<void> {
    const { host, port, database, user, password } = this.config;

    await this.run(`INSTALL mysql_scanner`);
    await this.run(`LOAD mysql_scanner`);

    const connStr = `mysql://${user}:${password}@${host}:${port}/${database}`;
    await this.run(
      `ATTACH '${connStr}' AS ${this.attachedAs} (TYPE mysql, READ_ONLY)`
    );
  }

  private async attachSQLite(): Promise<void> {
    const { path } = this.config;
    if (!path) throw new Error("SQLite requires path");

    await this.run(
      `ATTACH '${path}' AS ${this.attachedAs} (TYPE sqlite, READ_ONLY)`
    );
  }

  private async attachDuckDB(): Promise<void> {
    const { path } = this.config;
    if (!path) throw new Error("DuckDB requires path");

    // For in-memory databases, we don't need to attach anything
    // The in-memory database created in connect() is already usable
    if (path === ":memory:") {
      return;
    }

    await this.run(`ATTACH '${path}' AS ${this.attachedAs} (READ_ONLY)`);
  }

  private async attachParquet(): Promise<void> {
    const { url, path } = this.config;
    const location = url || path;
    if (!location) throw new Error("Parquet requires url or path");

    // For remote files, load httpfs
    if (url?.startsWith("http") || url?.startsWith("s3://")) {
      await this.run(`INSTALL httpfs`);
      await this.run(`LOAD httpfs`);
    }

    // Create view from parquet file
    await this.run(
      `CREATE VIEW ${this.attachedAs}_data AS SELECT * FROM '${location}'`
    );
  }

  private async attachCSV(): Promise<void> {
    const { url, path } = this.config;
    const location = url || path;
    if (!location) throw new Error("CSV requires url or path");

    if (url?.startsWith("http") || url?.startsWith("s3://")) {
      await this.run(`INSTALL httpfs`);
      await this.run(`LOAD httpfs`);
    }

    await this.run(
      `CREATE VIEW ${this.attachedAs}_data AS SELECT * FROM read_csv_auto('${location}')`
    );
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Execute a SQL statement without returning results
   */
  async run(sql: string): Promise<void> {
    if (!this.connection) {
      throw new Error("Not connected. Call connect() first.");
    }
    return new Promise((resolve, reject) => {
      this.connection!.run(sql, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Execute a query and return rows
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    _params?: unknown[]
  ): Promise<T[]> {
    if (!this.connection) {
      throw new Error("Not connected. Call connect() first.");
    }
    // Note: DuckDB Node.js binding doesn't support parameterized queries in .all()
    // TODO: Use prepared statements when available
    return new Promise((resolve, reject) => {
      this.connection!.all(sql, (err: Error | null, rows: unknown) => {
        if (err) reject(err);
        else resolve((rows as T[]) ?? []);
      });
    });
  }

  /**
   * Get the database name for identification
   */
  getDatabaseName(): string {
    return this.config.database || this.config.path || "unknown";
  }

  /**
   * Get the attached database alias for qualified queries
   */
  getSourceAlias(): string {
    return this.attachedAs;
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.query("SELECT 1 AS test");
      return {
        success: true,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute a query and return results with metadata
   */
  async executeQuery(
    sql: string,
    _params?: unknown[]
  ): Promise<QueryResult> {
    const start = Date.now();

    try {
      const rows = await this.query(sql);

      return {
        success: true,
        rows: rows as Record<string, unknown>[],
        rowCount: rows.length,
        executionTimeMs: Date.now() - start,
        columns: rows.length > 0 ? Object.keys(rows[0] as object) : [],
      };
    } catch (error) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTimeMs: Date.now() - start,
        columns: [],
        error:
          error instanceof Error ? error.message : "Query execution failed",
      };
    }
  }
}

export default DuckDBAdapter;
