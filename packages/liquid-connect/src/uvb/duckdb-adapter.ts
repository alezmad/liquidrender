/**
 * DuckDB Universal Database Adapter
 *
 * Connects to PostgreSQL, MySQL, SQLite via DuckDB extensions.
 * Provides unified schema extraction and query interface.
 */

import { DuckDBInstance } from '@duckdb/node-api';
import type { DuckDBConnection, DuckDBValue } from '@duckdb/node-api';
import type {
  ExtractedSchema,
  Table,
  Column,
  ForeignKeyConstraint,
  DatabaseType,
} from './models';

// Connection string patterns for type detection
const CONNECTION_PATTERNS = {
  postgres: /^postgres(ql)?:\/\//i,
  mysql: /^mysql:\/\//i,
  sqlite: /^sqlite:\/\/|\.db$|\.sqlite$/i,
};

// Scanner mapping
const SCANNER_MAP = {
  postgres: 'postgres_scanner',
  mysql: 'mysql_scanner',
  sqlite: 'sqlite_scanner',
} as const;

export interface DuckDBAdapterOptions {
  /**
   * Path to DuckDB database file
   * Default: ':memory:' (in-memory database)
   */
  duckdbPath?: string;

  /**
   * Attached database name in DuckDB
   * Default: 'source_db'
   */
  attachedName?: string;

  /**
   * Auto-install extensions if not present
   * Default: true
   */
  autoInstallExtensions?: boolean;

  /**
   * Connection timeout (ms)
   * Default: 30000 (30 seconds)
   */
  connectionTimeout?: number;
}

export class DuckDBUniversalAdapter {
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private sourceType: DatabaseType | null = null;
  private connectionString: string | null = null;
  private options: Required<DuckDBAdapterOptions>;

  constructor(options: DuckDBAdapterOptions = {}) {
    this.options = {
      duckdbPath: options.duckdbPath ?? ':memory:',
      attachedName: options.attachedName ?? 'source_db',
      autoInstallExtensions: options.autoInstallExtensions ?? true,
      connectionTimeout: options.connectionTimeout ?? 30000,
    };
  }

  get type(): DatabaseType {
    if (!this.sourceType) {
      throw new Error('Not connected - call connect() first');
    }
    return this.sourceType;
  }

  /**
   * Connect to source database via DuckDB scanner
   */
  async connect(connectionString: string): Promise<void> {
    this.connectionString = connectionString;
    this.sourceType = this.detectDatabaseType(connectionString);

    // Initialize DuckDB instance
    this.instance = await DuckDBInstance.create(this.options.duckdbPath);
    this.connection = await this.instance.connect();

    // Install and load scanner extension
    await this.setupScanner(this.sourceType);

    // Attach source database
    await this.attachDatabase(connectionString);

    // Verify connection
    await this.verifyConnection();
  }

  /**
   * Disconnect from source database
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        // Detach source database
        await this.exec(`DETACH ${this.options.attachedName}`);
      } catch {
        // Ignore errors during detach
      }
      this.connection.closeSync();
      this.connection = null;
    }
    this.instance = null;
    this.sourceType = null;
    this.connectionString = null;
  }

  /**
   * Execute SQL query
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.connection) {
      throw new Error('Not connected - call connect() first');
    }

    const reader = await this.connection.runAndReadAll(sql, params as DuckDBValue[]);
    const rows = reader.getRowObjects() as T[];
    return rows;
  }

  /**
   * Execute SQL statement (no results)
   */
  async exec(sql: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected - call connect() first');
    }
    await this.connection.run(sql);
  }

  /**
   * Get database name from connection
   */
  getDatabaseName(): string {
    if (!this.connectionString) {
      throw new Error('Not connected');
    }

    // Extract database name from connection string
    const match = this.connectionString.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Extract schema from source database
   */
  async extractSchema(schemaName = 'public'): Promise<ExtractedSchema> {
    const tableNames = await this.getTableNames(schemaName);
    const tables = await this.extractTables(tableNames, schemaName);

    return {
      database: this.getDatabaseName(),
      type: this.type,
      schema: schemaName,
      extractedAt: new Date().toISOString(),
      tables,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Detect database type from connection string
   */
  private detectDatabaseType(connectionString: string): DatabaseType {
    // In-memory DuckDB database
    if (connectionString === ':memory:' || connectionString.startsWith('duckdb://')) {
      return 'duckdb';
    }

    if (CONNECTION_PATTERNS.postgres.test(connectionString)) {
      return 'postgres';
    }
    if (CONNECTION_PATTERNS.mysql.test(connectionString)) {
      return 'mysql';
    }
    if (CONNECTION_PATTERNS.sqlite.test(connectionString)) {
      return 'sqlite';
    }

    throw new Error(
      `Unable to detect database type from connection string: ${connectionString}`
    );
  }

  /**
   * Install and load DuckDB scanner extension
   */
  private async setupScanner(type: DatabaseType): Promise<void> {
    // DuckDB itself doesn't need a scanner
    if (type === 'duckdb') {
      return;
    }

    const scanner = SCANNER_MAP[type];

    if (this.options.autoInstallExtensions) {
      // Install extension (no-op if already installed)
      await this.exec(`INSTALL ${scanner}`);
    }

    // Load extension
    await this.exec(`LOAD ${scanner}`);
  }

  /**
   * Attach source database
   */
  private async attachDatabase(connectionString: string): Promise<void> {
    // In-memory DuckDB doesn't need attach - it's already the main database
    if (connectionString === ':memory:') {
      return;
    }

    const type = this.sourceType!.toUpperCase();
    const name = this.options.attachedName;

    // Sanitize connection string for SQL
    const sanitized = connectionString.replace(/'/g, "''");

    await this.exec(`
      ATTACH '${sanitized}' AS ${name} (TYPE ${type})
    `);
  }

  /**
   * Verify connection is working
   */
  private async verifyConnection(): Promise<void> {
    try {
      // For in-memory, just verify we can query
      if (this.connectionString === ':memory:') {
        await this.query('SELECT 1 AS test');
        return;
      }

      await this.query(
        `SELECT 1 FROM ${this.options.attachedName}.information_schema.tables LIMIT 1`
      );
    } catch (error) {
      throw new Error(
        `Failed to verify connection to source database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get table names from schema
   */
  private async getTableNames(schemaName: string): Promise<string[]> {
    // For in-memory, use 'main' catalog
    const catalog = this.connectionString === ':memory:' ? 'main' : this.options.attachedName;

    const sql = `
      SELECT table_name
      FROM ${catalog}.information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const results = await this.query<{ table_name: string }>(sql, [schemaName]);
    return results.map((row) => row.table_name);
  }

  /**
   * Extract full table information
   */
  private async extractTables(
    tableNames: string[],
    schemaName: string
  ): Promise<Table[]> {
    const tables: Table[] = [];

    for (const tableName of tableNames) {
      const columns = await this.getColumns(tableName, schemaName);
      const primaryKeyColumns = columns
        .filter((col) => col.isPrimaryKey)
        .map((col) => col.name);
      const foreignKeys = await this.getForeignKeys(tableName, schemaName);

      tables.push({
        name: tableName,
        schema: schemaName,
        columns,
        primaryKeyColumns,
        foreignKeys,
      });
    }

    return tables;
  }

  /**
   * Get columns for a table
   */
  private async getColumns(
    tableName: string,
    schemaName: string
  ): Promise<Column[]> {
    const catalog = this.connectionString === ':memory:' ? 'main' : this.options.attachedName;

    const sql = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM ${catalog}.information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const results = await this.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
    }>(sql, [schemaName, tableName]);

    // Get primary keys
    const primaryKeys = await this.getPrimaryKeys(tableName, schemaName);
    const primaryKeySet = new Set(primaryKeys);

    // Get foreign keys
    const foreignKeys = await this.getForeignKeys(tableName, schemaName);
    const foreignKeyMap = new Map(
      foreignKeys.map((fk) => [
        fk.column,
        { table: fk.referencedTable, column: fk.referencedColumn },
      ])
    );

    return results.map((row) => ({
      name: row.column_name,
      dataType: row.data_type.toUpperCase(),
      isPrimaryKey: primaryKeySet.has(row.column_name),
      isForeignKey: foreignKeyMap.has(row.column_name),
      isNotNull: row.is_nullable === 'NO',
      charMaxLength: row.character_maximum_length ?? undefined,
      numericPrecision: row.numeric_precision ?? undefined,
      numericScale: row.numeric_scale ?? undefined,
      references: foreignKeyMap.get(row.column_name),
    }));
  }

  /**
   * Get primary key columns
   */
  private async getPrimaryKeys(
    tableName: string,
    schemaName: string
  ): Promise<string[]> {
    const catalog = this.connectionString === ':memory:' ? 'main' : this.options.attachedName;

    const sql = `
      SELECT column_name
      FROM ${catalog}.information_schema.key_column_usage
      WHERE table_schema = $1
        AND table_name = $2
        AND constraint_name IN (
          SELECT constraint_name
          FROM ${catalog}.information_schema.table_constraints
          WHERE table_schema = $1
            AND table_name = $2
            AND constraint_type = 'PRIMARY KEY'
        )
      ORDER BY ordinal_position
    `;

    const results = await this.query<{ column_name: string }>(sql, [
      schemaName,
      tableName,
    ]);
    return results.map((row) => row.column_name);
  }

  /**
   * Get foreign key constraints
   * Note: For composite foreign keys, only the first column is returned
   */
  private async getForeignKeys(
    tableName: string,
    schemaName: string
  ): Promise<ForeignKeyConstraint[]> {
    const catalog = this.connectionString === ':memory:' ? 'main' : this.options.attachedName;

    const sql = `
      SELECT
        kcu.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM ${catalog}.information_schema.key_column_usage kcu
      JOIN ${catalog}.information_schema.referential_constraints rc
        ON kcu.constraint_name = rc.constraint_name
      JOIN ${catalog}.information_schema.key_column_usage ccu
        ON ccu.constraint_name = rc.unique_constraint_name
      WHERE kcu.table_schema = $1
        AND kcu.table_name = $2
      ORDER BY kcu.constraint_name, kcu.ordinal_position
    `;

    const results = await this.query<{
      constraint_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
    }>(sql, [schemaName, tableName]);

    // Group by constraint name and take first column of each
    const constraintMap = new Map<string, ForeignKeyConstraint>();

    for (const row of results) {
      if (!constraintMap.has(row.constraint_name)) {
        constraintMap.set(row.constraint_name, {
          column: row.column_name,
          referencedTable: row.referenced_table,
          referencedColumn: row.referenced_column,
        });
      }
    }

    return Array.from(constraintMap.values());
  }
}

/**
 * Factory function to create a DuckDBUniversalAdapter instance
 */
export function createDuckDBUniversalAdapter(
  options: DuckDBAdapterOptions = {}
): DuckDBUniversalAdapter {
  return new DuckDBUniversalAdapter(options);
}
