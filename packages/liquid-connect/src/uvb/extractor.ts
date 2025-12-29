/**
 * Universal Vocabulary Builder - Schema Extractor
 *
 * Extracts schema information from databases using information_schema queries.
 * Supports PostgreSQL, MySQL, SQLite, and DuckDB.
 */

import type {
  Table,
  Column,
  ForeignKeyConstraint,
  ExtractedSchema,
  DatabaseType,
  ExtractionOptions,
} from "./models";

// =============================================================================
// Database Adapter Interface
// =============================================================================

export interface DatabaseAdapter {
  type: DatabaseType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getDatabaseName(): string;
}

// =============================================================================
// SQL Queries (information_schema based, works across most DBs)
// =============================================================================

const QUERIES = {
  postgres: {
    tables: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `,
    columns: `
      SELECT
        column_name,
        data_type,
        is_nullable,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
    primaryKeys: `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    `,
    foreignKeys: `
      SELECT
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    `,
  },

  mysql: {
    tables: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `,
    columns: `
      SELECT
        column_name,
        data_type,
        is_nullable,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ?
      ORDER BY ordinal_position
    `,
    primaryKeys: `
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND constraint_name = 'PRIMARY'
    `,
    foreignKeys: `
      SELECT
        column_name,
        referenced_table_name AS referenced_table,
        referenced_column_name AS referenced_column
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND referenced_table_name IS NOT NULL
    `,
  },

  sqlite: {
    tables: `
      SELECT name AS table_name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `,
    // SQLite uses PRAGMA instead of information_schema
    columns: "PRAGMA table_info(?)",
    primaryKeys: "PRAGMA table_info(?)", // pk column in result
    foreignKeys: "PRAGMA foreign_key_list(?)",
  },

  duckdb: {
    tables: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `,
    columns: `
      SELECT
        column_name,
        data_type,
        is_nullable,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'main' AND table_name = ?
      ORDER BY ordinal_position
    `,
    primaryKeys: `
      SELECT column_name
      FROM duckdb_constraints()
      WHERE table_name = ? AND constraint_type = 'PRIMARY KEY'
    `,
    foreignKeys: `
      SELECT
        constraint_column_names[1] AS column_name,
        -- DuckDB FK introspection is limited, may need custom handling
        NULL AS referenced_table,
        NULL AS referenced_column
      FROM duckdb_constraints()
      WHERE table_name = ? AND constraint_type = 'FOREIGN KEY'
    `,
  },
};

// =============================================================================
// Schema Extractor Class
// =============================================================================

export class SchemaExtractor {
  private adapter: DatabaseAdapter;
  private options: ExtractionOptions;

  constructor(adapter: DatabaseAdapter, options: ExtractionOptions = {}) {
    this.adapter = adapter;
    this.options = {
      schema: options.schema ?? "public",
      excludeTables: options.excludeTables ?? [],
      includeTables: options.includeTables,
      excludePatterns: options.excludePatterns ?? [
        /^_/,
        /^pg_/,
        /^sql_/,
        /_migration/i,
        /^schema_/i,
      ],
    };
  }

  async extract(): Promise<ExtractedSchema> {
    await this.adapter.connect();

    try {
      const tableNames = await this.getTableNames();
      const tables = await this.extractTables(tableNames);

      return {
        database: this.adapter.getDatabaseName(),
        type: this.adapter.type,
        schema: this.options.schema!,
        tables,
        extractedAt: new Date().toISOString(),
      };
    } finally {
      await this.adapter.disconnect();
    }
  }

  private async getTableNames(): Promise<string[]> {
    const type = this.adapter.type;
    const queries = QUERIES[type];

    let tableNames: string[];

    if (type === "postgres") {
      interface TableRow { table_name: string }
      const rows = await this.adapter.query<TableRow>(queries.tables, [
        this.options.schema,
      ]);
      tableNames = rows.map((r) => r.table_name);
    } else if (type === "mysql") {
      interface TableRow { table_name: string }
      const rows = await this.adapter.query<TableRow>(queries.tables);
      tableNames = rows.map((r) => r.table_name);
    } else if (type === "sqlite") {
      interface TableRow { table_name: string }
      const rows = await this.adapter.query<TableRow>(queries.tables);
      tableNames = rows.map((r) => r.table_name);
    } else if (type === "duckdb") {
      interface TableRow { table_name: string }
      const rows = await this.adapter.query<TableRow>(queries.tables);
      tableNames = rows.map((r) => r.table_name);
    } else {
      throw new Error(`Unsupported database type: ${type}`);
    }

    // Apply filters
    return tableNames.filter((name) => {
      // Exclude patterns
      if (this.options.excludePatterns?.some((p) => p.test(name))) {
        return false;
      }
      // Explicit exclude list
      if (this.options.excludeTables?.includes(name)) {
        return false;
      }
      // Include list (if specified)
      if (
        this.options.includeTables &&
        !this.options.includeTables.includes(name)
      ) {
        return false;
      }
      return true;
    });
  }

  private async extractTables(tableNames: string[]): Promise<Table[]> {
    const tables: Table[] = [];

    for (const tableName of tableNames) {
      const columns = await this.extractColumns(tableName);
      const primaryKeys = await this.extractPrimaryKeys(tableName);
      const foreignKeys = await this.extractForeignKeys(tableName);

      // Mark PK and FK columns
      for (const col of columns) {
        col.isPrimaryKey = primaryKeys.includes(col.name);
        col.isForeignKey = foreignKeys.some((fk) => fk.column === col.name);
        const fk = foreignKeys.find((f) => f.column === col.name);
        if (fk) {
          col.references = {
            table: fk.referencedTable,
            column: fk.referencedColumn,
          };
        }
      }

      tables.push({
        name: tableName,
        schema: this.options.schema!,
        columns,
        primaryKeyColumns: primaryKeys,
        foreignKeys,
      });
    }

    return tables;
  }

  private async extractColumns(tableName: string): Promise<Column[]> {
    const type = this.adapter.type;
    const queries = QUERIES[type];

    if (type === "sqlite") {
      // SQLite uses PRAGMA
      interface SqliteColumnRow {
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }
      const rows = await this.adapter.query<SqliteColumnRow>(
        `PRAGMA table_info("${tableName}")`
      );
      return rows.map((row) => ({
        name: row.name,
        dataType: row.type || "TEXT",
        isPrimaryKey: row.pk === 1,
        isForeignKey: false,
        isNotNull: row.notnull === 1,
        charMaxLength: undefined,
        numericPrecision: undefined,
        numericScale: undefined,
      }));
    }

    interface ColumnRow {
      column_name: string;
      data_type: string;
      is_nullable: string;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
    }

    const params = type === "postgres" ? [this.options.schema, tableName] : [tableName];
    const rows = await this.adapter.query<ColumnRow>(queries.columns, params);

    return rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      isPrimaryKey: false, // Will be set later
      isForeignKey: false, // Will be set later
      isNotNull: row.is_nullable === "NO",
      charMaxLength: row.character_maximum_length ?? undefined,
      numericPrecision: row.numeric_precision ?? undefined,
      numericScale: row.numeric_scale ?? undefined,
    }));
  }

  private async extractPrimaryKeys(tableName: string): Promise<string[]> {
    const type = this.adapter.type;
    const queries = QUERIES[type];

    if (type === "sqlite") {
      interface SqliteColumnRow {
        name: string;
        pk: number;
      }
      const rows = await this.adapter.query<SqliteColumnRow>(
        `PRAGMA table_info("${tableName}")`
      );
      return rows.filter((r) => r.pk > 0).map((r) => r.name);
    }

    interface PKRow {
      column_name: string;
    }

    const params = type === "postgres" ? [this.options.schema, tableName] : [tableName];
    const rows = await this.adapter.query<PKRow>(queries.primaryKeys, params);
    return rows.map((r) => r.column_name);
  }

  private async extractForeignKeys(tableName: string): Promise<ForeignKeyConstraint[]> {
    const type = this.adapter.type;
    const queries = QUERIES[type];

    if (type === "sqlite") {
      interface SqliteFKRow {
        from: string;
        table: string;
        to: string;
      }
      const rows = await this.adapter.query<SqliteFKRow>(
        `PRAGMA foreign_key_list("${tableName}")`
      );
      return rows.map((row) => ({
        column: row.from,
        referencedTable: row.table,
        referencedColumn: row.to,
      }));
    }

    interface FKRow {
      column_name: string;
      referenced_table: string | null;
      referenced_column: string | null;
    }

    const params = type === "postgres" ? [this.options.schema, tableName] : [tableName];
    const rows = await this.adapter.query<FKRow>(queries.foreignKeys, params);

    return rows
      .filter((r) => r.referenced_table && r.referenced_column)
      .map((r) => ({
        column: r.column_name,
        referencedTable: r.referenced_table!,
        referencedColumn: r.referenced_column!,
      }));
  }
}

// =============================================================================
// Connection String Parser
// =============================================================================

export interface ParsedConnection {
  type: DatabaseType;
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  path?: string;
}

export function parseConnectionString(connectionString: string): ParsedConnection {
  // PostgreSQL: postgresql://user:pass@host:port/database
  if (connectionString.startsWith("postgresql://") || connectionString.startsWith("postgres://")) {
    const url = new URL(connectionString);
    return {
      type: "postgres",
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username || undefined,
      password: url.password || undefined,
    };
  }

  // MySQL: mysql://user:pass@host:port/database
  if (connectionString.startsWith("mysql://")) {
    const url = new URL(connectionString);
    return {
      type: "mysql",
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      database: url.pathname.slice(1),
      user: url.username || undefined,
      password: url.password || undefined,
    };
  }

  // SQLite: sqlite:///path/to/file.db or /path/to/file.db
  if (connectionString.startsWith("sqlite://") || connectionString.endsWith(".db") || connectionString.endsWith(".sqlite")) {
    const path = connectionString.replace("sqlite://", "").replace(/^\/\//, "");
    return {
      type: "sqlite",
      database: path,
      path,
    };
  }

  // DuckDB: duckdb:///path/to/file.duckdb or *.duckdb or *.parquet or *.csv
  if (
    connectionString.startsWith("duckdb://") ||
    connectionString.endsWith(".duckdb") ||
    connectionString.endsWith(".parquet") ||
    connectionString.endsWith(".csv")
  ) {
    const path = connectionString.replace("duckdb://", "").replace(/^\/\//, "");
    return {
      type: "duckdb",
      database: path,
      path,
    };
  }

  throw new Error(`Unable to parse connection string: ${connectionString}`);
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Extract schema from a database.
 *
 * Usage:
 * ```typescript
 * import { extractSchema, PostgresAdapter } from '@repo/liquid-connect/uvb'
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
 * ```
 */
export async function extractSchema(
  adapter: DatabaseAdapter,
  options?: ExtractionOptions
): Promise<ExtractedSchema> {
  const extractor = new SchemaExtractor(adapter, options);
  return extractor.extract();
}
