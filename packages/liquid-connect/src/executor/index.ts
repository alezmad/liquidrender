/**
 * Query Executor
 *
 * Executes SQL queries against connected databases using DuckDB adapter.
 * Handles connection management, timeouts, and result limiting.
 */

import {
  DuckDBAdapter,
  type DuckDBConnectionConfig,
  type QueryResult,
} from "../uvb/adapters/duckdb";
import { withTimeout, TimeoutError } from "./timeout";

// =============================================================================
// Types
// =============================================================================

export interface ExecutorConfig {
  connection: DuckDBConnectionConfig;
  /** Query timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum rows to return (default: 10000) */
  maxRows?: number;
  /** Auto-connect on first query (default: true) */
  autoConnect?: boolean;
}

export interface ExecutorStatus {
  connected: boolean;
  databaseName: string | null;
  sourceAlias: string | null;
}

// =============================================================================
// Query Executor Class
// =============================================================================

export class QueryExecutor {
  private adapter: DuckDBAdapter | null = null;
  private connected: boolean = false;
  private readonly config: Required<
    Pick<ExecutorConfig, "timeout" | "maxRows" | "autoConnect">
  > &
    ExecutorConfig;

  constructor(config: ExecutorConfig) {
    this.config = {
      timeout: 30000,
      maxRows: 10000,
      autoConnect: true,
      ...config,
    };
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.adapter = new DuckDBAdapter(this.config.connection);
    await this.adapter.connect();
    this.connected = true;
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
      this.connected = false;
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ExecutorStatus {
    return {
      connected: this.connected,
      databaseName: this.adapter?.getDatabaseName() ?? null,
      sourceAlias: this.adapter?.getSourceAlias() ?? null,
    };
  }

  /**
   * Execute a SQL query with timeout and row limiting
   */
  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    // Auto-connect if configured and not connected
    if (!this.connected && this.config.autoConnect) {
      await this.connect();
    }

    if (!this.adapter || !this.connected) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        columns: [],
        error: "Not connected. Call connect() first.",
      };
    }

    // Add LIMIT if not present and maxRows is set
    let finalSql = sql.trim();
    if (this.config.maxRows && !this.hasLimitClause(finalSql)) {
      // Remove trailing semicolon if present
      if (finalSql.endsWith(";")) {
        finalSql = finalSql.slice(0, -1);
      }
      finalSql = `${finalSql} LIMIT ${this.config.maxRows}`;
    }

    try {
      // Execute with timeout
      const result = await withTimeout(
        this.adapter.executeQuery(finalSql, params),
        this.config.timeout
      );
      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        return {
          success: false,
          rows: [],
          rowCount: 0,
          executionTimeMs: this.config.timeout,
          columns: [],
          error: error.message,
        };
      }
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        columns: [],
        error: error instanceof Error ? error.message : "Query execution failed",
      };
    }
  }

  /**
   * Execute multiple queries in sequence
   */
  async executeMany(queries: string[]): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    for (const sql of queries) {
      results.push(await this.execute(sql));
    }
    return results;
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> {
    if (!this.connected && this.config.autoConnect) {
      try {
        await this.connect();
      } catch (error) {
        return {
          success: false,
          latencyMs: 0,
          error: error instanceof Error ? error.message : "Connection failed",
        };
      }
    }

    if (!this.adapter) {
      return {
        success: false,
        latencyMs: 0,
        error: "Not connected",
      };
    }

    return this.adapter.testConnection();
  }

  /**
   * Check if SQL already has a LIMIT clause
   */
  private hasLimitClause(sql: string): boolean {
    // Simple check - looks for LIMIT keyword not in a string
    const normalized = sql.toLowerCase();
    // Look for LIMIT as a word (not part of another word)
    return /\blimit\s+\d+/i.test(normalized);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a QueryExecutor with the given configuration
 */
export function createExecutor(config: ExecutorConfig): QueryExecutor {
  return new QueryExecutor(config);
}

/**
 * Execute a single query and return results (convenience function)
 */
export async function executeQuery(
  config: ExecutorConfig,
  sql: string,
  params?: unknown[]
): Promise<QueryResult> {
  const executor = new QueryExecutor(config);
  try {
    await executor.connect();
    return await executor.execute(sql, params);
  } finally {
    await executor.disconnect();
  }
}

// =============================================================================
// Exports
// =============================================================================

export { TimeoutError } from "./timeout";
export type { QueryResult } from "../uvb/adapters/duckdb";

export default QueryExecutor;
