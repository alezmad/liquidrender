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

export {
  DuckDBAdapter,
  type DuckDBConnectionConfig,
  type QueryResult,
} from "./duckdb";

// =============================================================================
// Factory Functions
// =============================================================================

import type { DatabaseAdapter } from "../extractor";
import { DuckDBAdapter as DuckDBAdapterClass, type DuckDBConnectionConfig } from "./duckdb";

/**
 * Create a DuckDB adapter for any supported database type
 */
export function createDuckDBAdapter(
  config: DuckDBConnectionConfig
): DatabaseAdapter {
  // Uses the imported DuckDBAdapter class
  return new DuckDBAdapterClass(config);
}

/**
 * Create the appropriate adapter for the given configuration
 * Uses DuckDB as the universal adapter for all database types
 */
export function createAdapter(
  config: DuckDBConnectionConfig
): DatabaseAdapter {
  return createDuckDBAdapter(config);
}
