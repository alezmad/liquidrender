/**
 * Database Adapters
 *
 * Adapters for different database types.
 * Install the required driver package for your database.
 *
 * DuckDB is the recommended universal adapter - it can connect to:
 * - PostgreSQL via postgres_scanner extension
 * - MySQL via mysql_scanner extension
 * - SQLite files directly
 * - Parquet/CSV files (local or remote via httpfs)
 */

export { PostgresAdapter, createPostgresAdapter, type PostgresConfig } from "./postgres";

// Legacy DuckDB adapter - deprecated in favor of DuckDBUniversalAdapter
// Commented out during migration to @duckdb/node-api
// export {
//   DuckDBAdapter,
//   type DuckDBConnectionConfig,
//   type QueryResult,
// } from "./duckdb";

// Re-export types for backward compatibility
export type { QueryResult, DuckDBConnectionConfig } from "./duckdb";

// =============================================================================
// Factory Functions
// =============================================================================

import type { DatabaseAdapter } from "../extractor";
// import { DuckDBAdapter as DuckDBAdapterClass, type DuckDBConnectionConfig } from "./duckdb";

/**
 * @deprecated Use DuckDBUniversalAdapter with connection strings instead
 * Legacy factory function - temporarily disabled during migration to @duckdb/node-api
 */
export function createDuckDBAdapter(
  _config: unknown
): DatabaseAdapter {
  throw new Error(
    'createDuckDBAdapter (legacy) is deprecated. Use DuckDBUniversalAdapter with connection strings instead.\n' +
    'Example: new DuckDBUniversalAdapter().connect("postgresql://user:pass@host/db")'
  );
}

/**
 * @deprecated Use DuckDBUniversalAdapter instead
 */
export function createAdapter(
  _config: unknown
): DatabaseAdapter {
  throw new Error(
    'createAdapter is deprecated. Use DuckDBUniversalAdapter with connection strings instead.'
  );
}
