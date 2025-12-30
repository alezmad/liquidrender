# DuckDB Universal Adapter - Implementation Plan

> **Purpose:** Replace multiple database adapters with a single DuckDB-based adapter for schema extraction AND query execution.
> **Created:** 2025-12-29
> **Status:** Ready for Implementation
> **Estimated Effort:** 3-4 days

---

## Architecture Decision

**Decision:** Use DuckDB as the universal database adapter layer.

**Rationale:**
- DuckDB extensions can connect to PostgreSQL, MySQL, SQLite, and more
- Single codebase instead of N adapters
- Same engine for schema extraction AND query execution
- DuckDB-WASM enables browser-side execution later
- Consistent SQL dialect across all sources

---

## Implementation Phases

### Phase 1: Core DuckDB Adapter (Day 1)

#### 1.1 Create DuckDB Adapter File

**File:** `packages/liquid-connect/src/uvb/adapters/duckdb.ts`

```typescript
/**
 * DuckDB Universal Adapter
 *
 * Connects to multiple database types through DuckDB extensions:
 * - postgres_scanner: PostgreSQL, CockroachDB, Supabase
 * - mysql_scanner: MySQL, MariaDB
 * - sqlite_scanner: SQLite files
 *
 * @see https://duckdb.org/docs/extensions/overview
 */

import type { DatabaseAdapter, ConnectionConfig, ExtractedSchema, QueryResult } from '../types';

// Dynamic import for optional dependency
let duckdb: typeof import('duckdb') | null = null;

async function loadDuckDB() {
  if (!duckdb) {
    try {
      duckdb = await import('duckdb');
    } catch {
      throw new Error(
        'DuckDB is not installed. Run: pnpm add duckdb'
      );
    }
  }
  return duckdb;
}

export interface DuckDBConnectionConfig extends ConnectionConfig {
  type: 'postgres' | 'mysql' | 'sqlite' | 'duckdb' | 'parquet' | 'csv';
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

export class DuckDBAdapter implements DatabaseAdapter {
  private db: any = null;
  private connection: any = null;
  private config: DuckDBConnectionConfig;
  private attachedAs: string = 'source';

  constructor(config: DuckDBConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const DuckDB = await loadDuckDB();

    // Create in-memory DuckDB instance
    this.db = new DuckDB.Database(':memory:');
    this.connection = this.db.connect();

    // Load required extension and attach source
    await this.attachSource();
  }

  private async attachSource(): Promise<void> {
    const { type } = this.config;

    switch (type) {
      case 'postgres':
        await this.attachPostgres();
        break;
      case 'mysql':
        await this.attachMySQL();
        break;
      case 'sqlite':
        await this.attachSQLite();
        break;
      case 'duckdb':
        await this.attachDuckDB();
        break;
      case 'parquet':
        await this.attachParquet();
        break;
      case 'csv':
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
    await this.run(`ATTACH '${connStr}' AS ${this.attachedAs} (TYPE postgres, READ_ONLY)`);
  }

  private async attachMySQL(): Promise<void> {
    const { host, port, database, user, password } = this.config;

    await this.run(`INSTALL mysql_scanner`);
    await this.run(`LOAD mysql_scanner`);

    const connStr = `mysql://${user}:${password}@${host}:${port}/${database}`;
    await this.run(`ATTACH '${connStr}' AS ${this.attachedAs} (TYPE mysql, READ_ONLY)`);
  }

  private async attachSQLite(): Promise<void> {
    const { path } = this.config;
    if (!path) throw new Error('SQLite requires path');

    await this.run(`ATTACH '${path}' AS ${this.attachedAs} (TYPE sqlite, READ_ONLY)`);
  }

  private async attachDuckDB(): Promise<void> {
    const { path } = this.config;
    if (!path) throw new Error('DuckDB requires path');

    await this.run(`ATTACH '${path}' AS ${this.attachedAs} (READ_ONLY)`);
  }

  private async attachParquet(): Promise<void> {
    const { url, path } = this.config;
    const location = url || path;
    if (!location) throw new Error('Parquet requires url or path');

    // For remote files, load httpfs
    if (url?.startsWith('http') || url?.startsWith('s3://')) {
      await this.run(`INSTALL httpfs`);
      await this.run(`LOAD httpfs`);
    }

    // Create view from parquet file
    await this.run(`CREATE VIEW ${this.attachedAs}_data AS SELECT * FROM '${location}'`);
  }

  private async attachCSV(): Promise<void> {
    const { url, path } = this.config;
    const location = url || path;
    if (!location) throw new Error('CSV requires url or path');

    if (url?.startsWith('http') || url?.startsWith('s3://')) {
      await this.run(`INSTALL httpfs`);
      await this.run(`LOAD httpfs`);
    }

    await this.run(`CREATE VIEW ${this.attachedAs}_data AS SELECT * FROM read_csv_auto('${location}')`);
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

  async run(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.run(sql, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.connection.all(sql, (err: Error | null, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1 AS test');
      return {
        success: true,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async extractSchema(schemaName?: string): Promise<ExtractedSchema> {
    const schema = schemaName || 'public';

    // Get tables
    const tables = await this.query<{
      table_schema: string;
      table_name: string;
      table_type: string;
    }>(`
      SELECT table_schema, table_name, table_type
      FROM ${this.attachedAs}.information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_type IN ('BASE TABLE', 'VIEW')
    `);

    // Get columns for each table
    const columns = await this.query<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      ordinal_position: number;
    }>(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM ${this.attachedAs}.information_schema.columns
      WHERE table_schema = '${schema}'
      ORDER BY table_name, ordinal_position
    `);

    // Get primary keys
    const primaryKeys = await this.query<{
      table_name: string;
      column_name: string;
    }>(`
      SELECT tc.table_name, kcu.column_name
      FROM ${this.attachedAs}.information_schema.table_constraints tc
      JOIN ${this.attachedAs}.information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = '${schema}'
    `);

    // Get foreign keys
    const foreignKeys = await this.query<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(`
      SELECT
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM ${this.attachedAs}.information_schema.table_constraints tc
      JOIN ${this.attachedAs}.information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN ${this.attachedAs}.information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = '${schema}'
    `);

    // Build schema structure
    const pkMap = new Map<string, Set<string>>();
    for (const pk of primaryKeys) {
      if (!pkMap.has(pk.table_name)) pkMap.set(pk.table_name, new Set());
      pkMap.get(pk.table_name)!.add(pk.column_name);
    }

    const fkMap = new Map<string, Array<{
      column: string;
      foreignTable: string;
      foreignColumn: string;
    }>>();
    for (const fk of foreignKeys) {
      if (!fkMap.has(fk.table_name)) fkMap.set(fk.table_name, []);
      fkMap.get(fk.table_name)!.push({
        column: fk.column_name,
        foreignTable: fk.foreign_table_name,
        foreignColumn: fk.foreign_column_name,
      });
    }

    const columnsByTable = new Map<string, typeof columns>();
    for (const col of columns) {
      if (!columnsByTable.has(col.table_name)) columnsByTable.set(col.table_name, []);
      columnsByTable.get(col.table_name)!.push(col);
    }

    return {
      schema,
      tables: tables.map((t) => ({
        name: t.table_name,
        type: t.table_type === 'VIEW' ? 'view' : 'table',
        columns: (columnsByTable.get(t.table_name) || []).map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
          default: c.column_default,
          isPrimaryKey: pkMap.get(t.table_name)?.has(c.column_name) || false,
        })),
        primaryKey: Array.from(pkMap.get(t.table_name) || []),
        foreignKeys: fkMap.get(t.table_name) || [],
      })),
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Execute a query and return results with metadata
   */
  async executeQuery(sql: string, params?: unknown[]): Promise<QueryResult> {
    const start = Date.now();

    try {
      // TODO: Parameterized queries support
      const rows = await this.query(sql);

      return {
        success: true,
        rows,
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
        error: error instanceof Error ? error.message : 'Query execution failed',
      };
    }
  }

  /**
   * Get the attached database name for queries
   */
  getSourceAlias(): string {
    return this.attachedAs;
  }
}

export default DuckDBAdapter;
```

#### 1.2 Add Types

**File:** `packages/liquid-connect/src/uvb/types.ts` (extend existing)

```typescript
// Add to existing types file

export interface QueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  columns: string[];
  error?: string;
}

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }>;
  extractSchema(schemaName?: string): Promise<ExtractedSchema>;
  executeQuery(sql: string, params?: unknown[]): Promise<QueryResult>;
}
```

#### 1.3 Update Adapter Index

**File:** `packages/liquid-connect/src/uvb/adapters/index.ts`

```typescript
export { PostgresAdapter } from './postgres';
export { DuckDBAdapter } from './duckdb';
export type { DuckDBConnectionConfig } from './duckdb';

// Factory function for creating adapters
export function createAdapter(config: ConnectionConfig): DatabaseAdapter {
  // Use DuckDB for all types (universal adapter)
  const { DuckDBAdapter } = require('./duckdb');
  return new DuckDBAdapter(config);
}
```

---

### Phase 2: Query Execution Service (Day 2)

#### 2.1 Create Query Executor

**File:** `packages/liquid-connect/src/executor/index.ts`

```typescript
/**
 * Query Executor
 *
 * Executes SQL queries against connected databases using DuckDB adapter.
 * Handles connection pooling, timeouts, and result serialization.
 */

import { DuckDBAdapter, type DuckDBConnectionConfig } from '../uvb/adapters/duckdb';
import type { QueryResult } from '../uvb/types';

export interface ExecutorConfig {
  connection: DuckDBConnectionConfig;
  timeout?: number; // ms, default 30000
  maxRows?: number; // default 10000
}

export class QueryExecutor {
  private adapter: DuckDBAdapter | null = null;
  private config: ExecutorConfig;
  private connected: boolean = false;

  constructor(config: ExecutorConfig) {
    this.config = {
      timeout: 30000,
      maxRows: 10000,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    this.adapter = new DuckDBAdapter(this.config.connection);
    await this.adapter.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
      this.connected = false;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    if (!this.adapter || !this.connected) {
      await this.connect();
    }

    // Add LIMIT if not present and maxRows is set
    let finalSql = sql;
    if (this.config.maxRows && !sql.toLowerCase().includes('limit')) {
      finalSql = `${sql} LIMIT ${this.config.maxRows}`;
    }

    // Execute with timeout
    const timeoutPromise = new Promise<QueryResult>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), this.config.timeout);
    });

    const queryPromise = this.adapter!.executeQuery(finalSql, params);

    return Promise.race([queryPromise, timeoutPromise]);
  }

  /**
   * Execute a query from LiquidFlow IR
   */
  async executeFlow(flow: LiquidFlowIR, dialect: 'duckdb' | 'postgres' = 'duckdb'): Promise<QueryResult> {
    const { DuckDBEmitter, PostgresEmitter } = await import('../emitters');

    const emitter = dialect === 'duckdb'
      ? new DuckDBEmitter()
      : new PostgresEmitter();

    const { sql, params } = emitter.emit(flow);
    return this.execute(sql, params);
  }
}

export default QueryExecutor;
```

#### 2.2 Integrate with API

**File:** `packages/api/src/modules/knosia/conversation/mutations.ts` (update)

```typescript
import { QueryExecutor } from '@repo/liquid-connect';

export async function executeConversationQuery(input: {
  conversationId: string;
  query: string;
  connectionId: string;
}) {
  // Get connection config from database
  const connection = await db
    .select()
    .from(knosiaConnection)
    .where(eq(knosiaConnection.id, input.connectionId))
    .limit(1)
    .then(rows => rows[0]);

  if (!connection) {
    throw new Error('Connection not found');
  }

  // Create executor with connection config
  const executor = new QueryExecutor({
    connection: {
      type: connection.type as DuckDBConnectionConfig['type'],
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password, // Decrypt in production
      ssl: connection.sslMode === 'require',
    },
  });

  try {
    await executor.connect();

    // Parse natural language query through pipeline
    const { sql, flow } = await parseAndEmitQuery(input.query, connection.workspaceId);

    // Execute query
    const result = await executor.execute(sql);

    return {
      success: result.success,
      data: result.rows,
      sql, // For transparency
      executionTimeMs: result.executionTimeMs,
    };
  } finally {
    await executor.disconnect();
  }
}
```

---

### Phase 3: Update UVB to Use DuckDB (Day 3)

#### 3.1 Refactor Analysis to Use DuckDB Adapter

**File:** `packages/api/src/modules/knosia/analysis/queries.ts` (update)

```typescript
import { DuckDBAdapter } from '@repo/liquid-connect';

export async function* runAnalysis(input: AnalysisInput): AsyncGenerator<AnalysisEvent> {
  const { connectionId, workspaceId } = input;

  // Get connection from database
  const connection = await getConnection(connectionId);

  yield { type: 'step', step: 1, total: 5, message: 'Connecting to database...' };

  // Use DuckDB adapter (universal)
  const adapter = new DuckDBAdapter({
    type: connection.type,
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    ssl: connection.sslMode === 'require',
  });

  try {
    await adapter.connect();

    // Test connection
    const testResult = await adapter.testConnection();
    if (!testResult.success) {
      yield { type: 'error', code: 'CONNECTION_FAILED', message: testResult.error };
      return;
    }

    yield { type: 'step', step: 2, total: 5, message: 'Extracting schema...' };

    // Extract schema (works for any database type!)
    const schema = await adapter.extractSchema(connection.schemaName || 'public');

    yield {
      type: 'step',
      step: 3,
      total: 5,
      message: `Found ${schema.tables.length} tables`
    };

    // Apply hard rules (existing logic)
    const { detected, confirmations } = applyHardRules(schema);

    yield { type: 'step', step: 4, total: 5, message: 'Detecting business patterns...' };

    // Detect business type
    const businessType = await detectBusinessType(schema.tables);

    yield { type: 'step', step: 5, total: 5, message: 'Generating vocabulary...' };

    // Store results
    const analysis = await saveAnalysisResults({
      connectionId,
      workspaceId,
      schema,
      detected,
      businessType,
    });

    yield {
      type: 'complete',
      analysisId: analysis.id,
      summary: {
        tables: schema.tables.length,
        metrics: detected.metrics.length,
        dimensions: detected.dimensions.length,
        entities: detected.entities.length,
      },
      businessType,
      confirmations,
    };

  } finally {
    await adapter.disconnect();
  }
}
```

---

### Phase 4: Add Package Dependency & Tests (Day 3-4)

#### 4.1 Add DuckDB Dependency

**File:** `packages/liquid-connect/package.json`

```json
{
  "dependencies": {
    "duckdb": "^1.1.0"
  },
  "optionalDependencies": {
    "pg": "^8.11.0"
  }
}
```

Run: `pnpm add duckdb -F @repo/liquid-connect`

#### 4.2 Add Tests

**File:** `packages/liquid-connect/src/uvb/adapters/__tests__/duckdb.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DuckDBAdapter } from '../duckdb';

describe('DuckDBAdapter', () => {
  describe('SQLite via DuckDB', () => {
    let adapter: DuckDBAdapter;

    beforeAll(async () => {
      adapter = new DuckDBAdapter({
        type: 'sqlite',
        path: ':memory:',
      });
      await adapter.connect();

      // Create test table
      await adapter.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await adapter.run(`INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@test.com')`);
    });

    afterAll(async () => {
      await adapter.disconnect();
    });

    it('should extract schema', async () => {
      const schema = await adapter.extractSchema('main');
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users');
      expect(schema.tables[0].columns).toHaveLength(4);
    });

    it('should execute queries', async () => {
      const result = await adapter.executeQuery('SELECT * FROM users');
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1);
      expect(result.rows[0]).toMatchObject({ name: 'Alice' });
    });
  });

  describe('PostgreSQL via DuckDB', () => {
    // These tests require a running PostgreSQL instance
    // Skip in CI unless POSTGRES_TEST_URL is set
    const skipPostgres = !process.env.POSTGRES_TEST_URL;

    it.skipIf(skipPostgres)('should connect to PostgreSQL', async () => {
      const adapter = new DuckDBAdapter({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'postgres',
        password: 'postgres',
      });

      await adapter.connect();
      const test = await adapter.testConnection();
      expect(test.success).toBe(true);
      await adapter.disconnect();
    });
  });
});
```

---

### Phase 5: Update CLAUDE.md & Documentation

#### 5.1 Update Architecture Diagram

Add to CLAUDE.md under "KNOSIA STACK":

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KNOSIA STACK                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   packages/liquid-connect/     ← Schema → Vocabulary engine         │
│   └── uvb/                     ← Universal Vocabulary Builder       │
│   └── uvb/adapters/duckdb.ts   ← Universal DB adapter (NEW)         │
│   └── executor/                ← Query execution layer (NEW)        │
│   └── emitters/                ← SQL generation (DuckDB/Trino/PG)   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

After implementation, verify:

- [ ] `pnpm add duckdb -F @repo/liquid-connect` succeeds
- [ ] DuckDBAdapter connects to SQLite (simplest test)
- [ ] DuckDBAdapter connects to PostgreSQL via postgres_scanner
- [ ] Schema extraction returns same structure as PostgresAdapter
- [ ] QueryExecutor executes queries and returns results
- [ ] Analysis SSE stream works with DuckDB adapter
- [ ] Existing PostgreSQL connections still work

---

## Rollback Plan

If issues arise:
1. Keep PostgresAdapter as fallback
2. Add `useUniversalAdapter: boolean` config flag
3. Factory can choose based on flag:

```typescript
function createAdapter(config, useUniversal = true) {
  if (useUniversal) {
    return new DuckDBAdapter(config);
  }
  // Fallback to specific adapters
  switch (config.type) {
    case 'postgres': return new PostgresAdapter(config);
    // ...
  }
}
```

---

## Future Extensions (Not in Scope)

- DuckDB-WASM for browser execution
- MotherDuck integration for cloud DuckDB
- Iceberg/Delta Lake support
- Materialized view caching

---

*Ready for implementation. Execute phases in order.*
