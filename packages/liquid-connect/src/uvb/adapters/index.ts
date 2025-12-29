/**
 * Database Adapters
 *
 * Adapters for different database types.
 * Install the required driver package for your database.
 */

export { PostgresAdapter, createPostgresAdapter, type PostgresConfig } from "./postgres";

// Future adapters:
// export { MySQLAdapter, createMySQLAdapter } from "./mysql";
// export { SQLiteAdapter, createSQLiteAdapter } from "./sqlite";
// export { DuckDBAdapter, createDuckDBAdapter } from "./duckdb";
