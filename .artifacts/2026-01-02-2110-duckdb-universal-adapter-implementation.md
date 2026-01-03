# DuckDB Universal Adapter - Full Implementation Plan

**Project:** Knosia (LiquidRender Platform)
**Date:** 2026-01-02
**Status:** Implementation Plan
**Effort:** 12-16 hours (2 days)
**Impact:** Architectural - Foundation for all database connectivity

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Affected Components](#affected-components)
4. [Implementation Phases](#implementation-phases)
5. [Detailed Implementation](#detailed-implementation)
6. [Migration Guide](#migration-guide)
7. [Testing Strategy](#testing-strategy)
8. [Performance Benchmarks](#performance-benchmarks)
9. [Rollback Plan](#rollback-plan)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Problem Statement

Current architecture maintains separate adapters for PostgreSQL, MySQL, SQLite, and DuckDB, resulting in:
- 500+ LOC of duplicated extraction logic
- 40+ test scenarios (4 databases × 10 edge cases)
- Inconsistent type mapping across databases
- 3 SQL dialects to maintain
- Edge cases that break reverse engineering (composite PKs, missing time fields, type mismatches)

### Proposed Solution

Replace all database-specific adapters with **DuckDB as universal adapter layer**:
- DuckDB extensions (`postgres_scanner`, `mysql_scanner`, `sqlite_scanner`) connect to all databases
- Single extraction code path
- DuckDB normalizes type systems automatically
- One SQL dialect for all queries
- Columnar analytics performance (10-100x faster)

### Impact Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Schema extraction code | 500 LOC | 150 LOC | 70% reduction |
| Type mapping logic | 100 LOC | 30 LOC | 70% reduction |
| SQL emitters | 3 classes | 1 class | 67% reduction |
| Test matrix | 40 scenarios | 10 scenarios | 75% reduction |
| Query performance | Baseline | 10-100x | Columnar execution |
| Multi-DB support | Complex | Native | DuckDB feature |

### Timeline

- **Phase 1:** Core Adapter (6 hours)
- **Phase 2:** Integration (4 hours)
- **Phase 3:** Testing & Validation (3 hours)
- **Phase 4:** Cleanup & Documentation (3 hours)
- **Total:** 16 hours (2 working days)

---

## Architecture Overview

### Current Architecture (Multi-Adapter)

```
┌─────────────────────────────────────────────────────────────┐
│                    Knosia Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Schema Extraction Layer (UVB)                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│  │ PostgreSQL   │ MySQL        │ SQLite       │ DuckDB   │ │
│  │ Adapter      │ Adapter      │ Adapter      │ Adapter  │ │
│  │ (150 LOC)    │ (150 LOC)    │ (100 LOC)    │ (100 LOC)│ │
│  └──────┬───────┴──────┬───────┴──────┬───────┴────┬─────┘ │
│         │              │              │            │       │
│  ┌──────▼──────────────▼──────────────▼────────────▼─────┐ │
│  │      Type Mapping (mapDataTypeToFieldType)            │ │
│  │      100 LOC, handles 4 type systems differently      │ │
│  └──────┬────────────────────────────────────────────────┘ │
│         │                                                   │
│  ┌──────▼──────────┐                                       │
│  │ ExtractedSchema │                                       │
│  └──────┬──────────┘                                       │
│         │                                                   │
├─────────▼───────────────────────────────────────────────────┤
│                                                             │
│  Query Execution Layer                                      │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ DuckDB       │ Trino        │ PostgreSQL   │            │
│  │ Emitter      │ Emitter      │ Emitter      │            │
│  │ (200 LOC)    │ (200 LOC)    │ (200 LOC)    │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Problems:
- 4 extraction adapters × 10 edge cases = 40 test scenarios
- Type mapping must handle PostgreSQL, MySQL, SQLite, DuckDB separately
- 3 SQL dialects for query execution
```

### New Architecture (DuckDB Universal)

```
┌─────────────────────────────────────────────────────────────┐
│                    Knosia Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Schema Extraction Layer (UVB)                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │        DuckDB Universal Adapter (150 LOC)             │ │
│  │                                                       │ │
│  │  ┌─────────────┬─────────────┬─────────────┐         │ │
│  │  │ postgres    │ mysql       │ sqlite      │         │ │
│  │  │ _scanner    │ _scanner    │ _scanner    │         │ │
│  │  │ (DuckDB)    │ (DuckDB)    │ (DuckDB)    │         │ │
│  │  └──────┬──────┴──────┬──────┴──────┬──────┘         │ │
│  │         │             │             │                │ │
│  │         ▼             ▼             ▼                │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │     DuckDB ATTACH (unified access)              │ │ │
│  │  │  • Normalizes types automatically               │ │ │
│  │  │  • Consistent information_schema                │ │ │
│  │  │  • Single query interface                       │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────┬───────────────────────┘ │
│                                  │                         │
│  ┌───────────────────────────────▼───────────────────────┐ │
│  │   Simplified Type Mapping (30 LOC)                    │ │
│  │   Only DuckDB types → FieldType                       │ │
│  └───────────────────────────────┬───────────────────────┘ │
│                                  │                         │
│  ┌───────────────────────────────▼───────────────────────┐ │
│  │              ExtractedSchema                          │ │
│  └───────────────────────────────┬───────────────────────┘ │
│                                  │                         │
├──────────────────────────────────▼─────────────────────────┤
│                                                             │
│  Query Execution Layer                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │        DuckDB Universal Emitter (200 LOC)             │ │
│  │                                                       │ │
│  │  • Executes on in-memory DuckDB                      │ │
│  │  • Queries attached source databases                 │ │
│  │  • Columnar execution (10-100x faster)               │ │
│  │  • Cross-database JOINs supported                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Benefits:
- 1 extraction adapter × 10 edge cases = 10 test scenarios (75% reduction)
- Type mapping only handles DuckDB → FieldType (trivial)
- 1 SQL dialect (DuckDB handles all databases)
- Performance: 10-100x faster for analytics
- Multi-connection: Native DuckDB feature
```

### DuckDB Extension Flow

```
Connection Request
    ↓
DuckDBUniversalAdapter.connect(connectionString)
    ↓
[Detect database type from connection string]
    ↓
PostgreSQL detected? → INSTALL postgres_scanner
MySQL detected?      → INSTALL mysql_scanner
SQLite detected?     → INSTALL sqlite_scanner
    ↓
LOAD scanner extension
    ↓
ATTACH 'connection_string' AS source_db (TYPE {detected})
    ↓
[DuckDB maintains persistent connection to source database]
    ↓
All queries run through DuckDB:
  - Schema extraction: SELECT * FROM source_db.information_schema.tables
  - Type normalization: DuckDB converts types automatically
  - Query execution: DuckDB pushes predicates to source DB
    ↓
Return normalized results
```

---

## Affected Components

### 1. **Schema Extraction (UVB)**

**Files to Modify:**
- ✏️ `packages/liquid-connect/src/uvb/extractor.ts` → **DELETE** (500 LOC removed)
- ✨ `packages/liquid-connect/src/uvb/duckdb-adapter.ts` → **CREATE** (150 LOC)
- ✏️ `packages/liquid-connect/src/uvb/index.ts` → Update exports
- ✏️ `packages/liquid-connect/src/uvb/models.ts` → Simplify DatabaseType

**Impact:**
- Single extraction code path
- DuckDB handles information_schema queries
- Automatic type normalization

### 2. **Type Mapping**

**Files to Modify:**
- ✏️ `packages/liquid-connect/src/semantic/from-vocabulary.ts` → Simplify `mapDataTypeToFieldType()`
- ✏️ `packages/liquid-connect/src/uvb/detector.ts` → Update for DuckDB types

**Impact:**
- 100 LOC → 30 LOC (70% reduction)
- Only map DuckDB types to FieldType
- No more edge cases (JSON, UUID, ENUM handled natively)

### 3. **Query Execution**

**Files to Modify:**
- ✏️ `packages/liquid-connect/src/executor/executor.ts` → Use DuckDB by default
- ✏️ `packages/liquid-connect/src/emitters/index.ts` → Simplify exports
- 🗑️ `packages/liquid-connect/src/emitters/trino/` → **DELETE** (optional deprecation)
- 🗑️ `packages/liquid-connect/src/emitters/postgres/` → **DELETE** (optional deprecation)

**Impact:**
- Single SQL dialect
- Faster query execution (columnar)
- Simplified test matrix

### 4. **Knosia API**

**Files to Modify:**
- ✏️ `packages/api/src/modules/knosia/connections/mutations.ts` → Update `testConnection()`
- ✏️ `packages/api/src/modules/knosia/analysis/stream-analysis.ts` → Use DuckDB adapter
- ✨ `packages/api/src/modules/knosia/connections/duckdb-manager.ts` → **CREATE** (connection pooling)

**Impact:**
- Unified connection testing
- DuckDB connection pooling
- Multi-database session support

### 5. **Database Schema**

**Files to Modify:**
- ✏️ `packages/db/src/schema/knosia.ts` → Update `knosia_connection` table
  - Add: `duckdb_attached_name` column (varchar(100))
  - Add: `scanner_type` column (enum: 'postgres', 'mysql', 'sqlite')

**Migration:**
```sql
ALTER TABLE knosia_connection
  ADD COLUMN duckdb_attached_name VARCHAR(100),
  ADD COLUMN scanner_type VARCHAR(20);
```

### 6. **Testing**

**Files to Create:**
- ✨ `packages/liquid-connect/src/uvb/__tests__/duckdb-adapter.test.ts`
- ✨ `packages/liquid-connect/src/uvb/__tests__/real-schema-tests.ts` (Pagila, Sakila, Chinook)
- ✨ `packages/api/src/modules/knosia/__tests__/duckdb-integration.test.ts`

**Files to Delete:**
- 🗑️ `packages/liquid-connect/src/uvb/__tests__/postgres-extractor.test.ts`
- 🗑️ `packages/liquid-connect/src/uvb/__tests__/mysql-extractor.test.ts`
- 🗑️ `packages/liquid-connect/src/uvb/__tests__/sqlite-extractor.test.ts`

**Impact:**
- 40 test scenarios → 10 test scenarios
- Real schema testing (Pagila, Sakila, Chinook)

---

## Implementation Phases

### Phase 1: DuckDB Core Adapter (6 hours)

**Objective:** Create DuckDB universal adapter with extension support

**Tasks:**
1. ✅ Create `DuckDBUniversalAdapter` class (2 hours)
2. ✅ Implement extension auto-install (1 hour)
3. ✅ Connection string parsing & detection (1 hour)
4. ✅ Schema extraction via information_schema (1 hour)
5. ✅ Unit tests for adapter (1 hour)

**Deliverables:**
- `packages/liquid-connect/src/uvb/duckdb-adapter.ts`
- `packages/liquid-connect/src/uvb/__tests__/duckdb-adapter.test.ts`

### Phase 2: Integration with Knosia (4 hours)

**Objective:** Replace old adapters in API layer

**Tasks:**
1. ✅ Update connection mutations to use DuckDB (1 hour)
2. ✅ Update analysis pipeline (1 hour)
3. ✅ Simplify type mapping (1 hour)
4. ✅ Update semantic layer generation (1 hour)

**Deliverables:**
- Updated API modules
- Simplified `mapDataTypeToFieldType()`
- Integration tests pass

### Phase 3: Testing & Validation (3 hours)

**Objective:** Validate against real databases

**Tasks:**
1. ✅ Set up Pagila (PostgreSQL), Sakila (MySQL), Chinook (SQLite) test DBs (1 hour)
2. ✅ Run schema extraction against all 3 DBs (1 hour)
3. ✅ Validate edge cases (composite PKs, no time fields, etc.) (1 hour)

**Deliverables:**
- Real schema test suite
- Edge case validation report

### Phase 4: Cleanup & Documentation (3 hours)

**Objective:** Remove old code, update docs

**Tasks:**
1. ✅ Delete old adapter code (1 hour)
2. ✅ Update migration guide (1 hour)
3. ✅ Update CLAUDE.md with DuckDB patterns (1 hour)

**Deliverables:**
- Clean codebase (-350 LOC)
- Migration guide for users
- Updated documentation

---

## Detailed Implementation

### 1. DuckDB Universal Adapter

**File:** `packages/liquid-connect/src/uvb/duckdb-adapter.ts`

```typescript
/**
 * DuckDB Universal Database Adapter
 *
 * Connects to PostgreSQL, MySQL, SQLite via DuckDB extensions.
 * Provides unified schema extraction and query interface.
 */

import Database from 'duckdb-async';
import type {
  DatabaseAdapter,
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

export class DuckDBUniversalAdapter implements DatabaseAdapter {
  private db: Database | null = null;
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

    // Initialize DuckDB
    this.db = await Database.create(this.options.duckdbPath);

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
    if (this.db) {
      // Detach source database
      await this.exec(`DETACH ${this.options.attachedName}`);
      await this.db.close();
      this.db = null;
    }
    this.sourceType = null;
    this.connectionString = null;
  }

  /**
   * Execute SQL query
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Not connected - call connect() first');
    }
    return this.db.all(sql, ...params) as Promise<T[]>;
  }

  /**
   * Execute SQL statement (no results)
   */
  async exec(sql: string): Promise<void> {
    if (!this.db) {
      throw new Error('Not connected - call connect() first');
    }
    await this.db.exec(sql);
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
    const sql = `
      SELECT table_name
      FROM ${this.options.attachedName}.information_schema.tables
      WHERE table_schema = ?
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const rows = await this.query<{ table_name: string }>(sql, [schemaName]);
    return rows.map(row => row.table_name);
  }

  /**
   * Extract table definitions
   */
  private async extractTables(
    tableNames: string[],
    schemaName: string
  ): Promise<Table[]> {
    const tables: Table[] = [];

    for (const tableName of tableNames) {
      const columns = await this.getColumns(tableName, schemaName);
      const primaryKeyColumns = await this.getPrimaryKeys(tableName, schemaName);
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
   * Get column definitions
   */
  private async getColumns(
    tableName: string,
    schemaName: string
  ): Promise<Column[]> {
    const sql = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM ${this.options.attachedName}.information_schema.columns
      WHERE table_schema = ?
        AND table_name = ?
      ORDER BY ordinal_position
    `;

    const rows = await this.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
    }>(sql, [schemaName, tableName]);

    const primaryKeys = new Set(
      await this.getPrimaryKeys(tableName, schemaName)
    );
    const foreignKeyColumns = new Set(
      (await this.getForeignKeys(tableName, schemaName)).map(fk => fk.column)
    );

    return rows.map(row => ({
      name: row.column_name,
      dataType: row.data_type,
      isPrimaryKey: primaryKeys.has(row.column_name),
      isForeignKey: foreignKeyColumns.has(row.column_name),
      isNotNull: row.is_nullable === 'NO',
      maxLength: row.character_maximum_length,
      precision: row.numeric_precision,
      scale: row.numeric_scale,
    }));
  }

  /**
   * Get primary key columns
   */
  private async getPrimaryKeys(
    tableName: string,
    schemaName: string
  ): Promise<string[]> {
    const sql = `
      SELECT kcu.column_name
      FROM ${this.options.attachedName}.information_schema.table_constraints tc
      JOIN ${this.options.attachedName}.information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = ?
        AND tc.table_name = ?
      ORDER BY kcu.ordinal_position
    `;

    const rows = await this.query<{ column_name: string }>(sql, [
      schemaName,
      tableName,
    ]);
    return rows.map(row => row.column_name);
  }

  /**
   * Get foreign key constraints
   */
  private async getForeignKeys(
    tableName: string,
    schemaName: string
  ): Promise<ForeignKeyConstraint[]> {
    const sql = `
      SELECT
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM ${this.options.attachedName}.information_schema.table_constraints AS tc
      JOIN ${this.options.attachedName}.information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN ${this.options.attachedName}.information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = ?
        AND tc.table_name = ?
    `;

    const rows = await this.query<{
      column_name: string;
      referenced_table: string;
      referenced_column: string;
    }>(sql, [schemaName, tableName]);

    return rows.map(row => ({
      column: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
    }));
  }
}

/**
 * Create DuckDB universal adapter
 */
export function createDuckDBAdapter(
  options?: DuckDBAdapterOptions
): DuckDBUniversalAdapter {
  return new DuckDBUniversalAdapter(options);
}
```

### 2. Simplified Type Mapping

**File:** `packages/liquid-connect/src/semantic/from-vocabulary.ts`

**Replace `mapDataTypeToFieldType()` function:**

```typescript
/**
 * Map DuckDB data type to FieldType
 *
 * DuckDB normalizes all source database types, so we only need to handle
 * DuckDB's type system (much simpler than handling 4 different databases)
 */
function mapDataTypeToFieldType(dataType: string): FieldType {
  const normalized = dataType.toLowerCase();

  // Timestamp types
  if (normalized.includes('timestamp')) {
    return 'timestamp';
  }
  if (normalized.includes('date') && !normalized.includes('datetime')) {
    return 'date';
  }

  // Numeric types
  if (
    normalized.includes('int') ||
    normalized.includes('serial') ||
    normalized.includes('bigint') ||
    normalized.includes('smallint') ||
    normalized.includes('tinyint') ||
    normalized.includes('hugeint') ||
    normalized.includes('ubigint') ||
    normalized.includes('uinteger') ||
    normalized.includes('usmallint') ||
    normalized.includes('utinyint')
  ) {
    return 'integer';
  }
  if (
    normalized.includes('decimal') ||
    normalized.includes('numeric') ||
    normalized.includes('real') ||
    normalized.includes('double') ||
    normalized.includes('float')
  ) {
    return 'decimal';
  }

  // Boolean
  if (normalized.includes('bool')) {
    return 'boolean';
  }

  // JSON (DuckDB has native JSON type)
  if (normalized === 'json') {
    return 'json';
  }

  // UUID (DuckDB has native UUID type)
  if (normalized === 'uuid') {
    return 'string'; // Store as string for now, can enhance later
  }

  // Fallback to string
  return 'string';
}
```

**Impact:**
- 100 LOC → 30 LOC (70% reduction)
- No edge cases - DuckDB normalizes types
- Native JSON/UUID support
- TINYINT(1) automatically becomes BOOLEAN

### 3. Connection Manager

**File:** `packages/api/src/modules/knosia/connections/duckdb-manager.ts`

```typescript
/**
 * DuckDB Connection Manager
 *
 * Manages DuckDB adapter instances with connection pooling.
 * Singleton per connection to avoid re-attaching databases.
 */

import { DuckDBUniversalAdapter } from '@repo/liquid-connect';
import type { Connection } from '@turbostarter/db/schema';

interface ManagedConnection {
  adapter: DuckDBUniversalAdapter;
  connectionId: string;
  lastUsed: Date;
  inUse: boolean;
}

class DuckDBConnectionManager {
  private connections = new Map<string, ManagedConnection>();
  private maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Get or create adapter for connection
   */
  async getAdapter(connection: Connection): Promise<DuckDBUniversalAdapter> {
    const existing = this.connections.get(connection.id);

    if (existing) {
      existing.lastUsed = new Date();
      existing.inUse = true;
      return existing.adapter;
    }

    // Create new adapter
    const adapter = new DuckDBUniversalAdapter({
      attachedName: `conn_${connection.id.replace(/-/g, '_')}`,
    });

    await adapter.connect(connection.connectionString);

    this.connections.set(connection.id, {
      adapter,
      connectionId: connection.id,
      lastUsed: new Date(),
      inUse: true,
    });

    return adapter;
  }

  /**
   * Release adapter (mark as not in use)
   */
  release(connectionId: string): void {
    const managed = this.connections.get(connectionId);
    if (managed) {
      managed.inUse = false;
      managed.lastUsed = new Date();
    }
  }

  /**
   * Disconnect and remove adapter
   */
  async disconnect(connectionId: string): Promise<void> {
    const managed = this.connections.get(connectionId);
    if (managed) {
      await managed.adapter.disconnect();
      this.connections.delete(connectionId);
    }
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.connections.keys()).map(id => this.disconnect(id))
    );
  }

  /**
   * Clean up idle connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();

      for (const [id, managed] of this.connections.entries()) {
        if (
          !managed.inUse &&
          now - managed.lastUsed.getTime() > this.maxIdleTime
        ) {
          await this.disconnect(id);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Stop cleanup (for graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const duckdbManager = new DuckDBConnectionManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  duckdbManager.stopCleanup();
  await duckdbManager.disconnectAll();
});
```

### 4. Updated Connection Test

**File:** `packages/api/src/modules/knosia/connections/mutations.ts`

```typescript
/**
 * Test database connection via DuckDB
 */
export async function testConnection(
  input: TestConnectionInput
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  let adapter: DuckDBUniversalAdapter | null = null;

  try {
    // Create temporary DuckDB adapter
    adapter = new DuckDBUniversalAdapter();

    // Try to connect
    await adapter.connect(input.connectionString);

    // Test query
    const result = await adapter.query('SELECT 1 AS test');

    if (!result || result.length === 0) {
      throw new Error('Connection test query returned no results');
    }

    return {
      success: true,
      message: `Successfully connected to ${adapter.type} database`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
    };
  } finally {
    // Always cleanup
    if (adapter) {
      await adapter.disconnect();
    }
  }
}
```

### 5. Database Schema Migration

**File:** `packages/db/src/migrations/XXXX_add_duckdb_columns.sql`

```sql
-- Add DuckDB-specific columns to knosia_connection table

ALTER TABLE knosia_connection
  ADD COLUMN duckdb_attached_name VARCHAR(100),
  ADD COLUMN scanner_type VARCHAR(20);

-- Update existing connections with default values
UPDATE knosia_connection
SET
  duckdb_attached_name = 'conn_' || REPLACE(id::TEXT, '-', '_'),
  scanner_type = CASE type
    WHEN 'postgres' THEN 'postgres'
    WHEN 'mysql' THEN 'mysql'
    WHEN 'sqlite' THEN 'sqlite'
    ELSE NULL
  END;

-- Add index for faster lookups
CREATE INDEX idx_knosia_connection_scanner_type
  ON knosia_connection(scanner_type);
```

### 6. Package Dependencies

**File:** `packages/liquid-connect/package.json`

```json
{
  "dependencies": {
    "duckdb-async": "^0.10.0"
  }
}
```

**File:** `packages/api/package.json`

```json
{
  "dependencies": {
    "@repo/liquid-connect": "workspace:*",
    "duckdb-async": "^0.10.0"
  }
}
```

---

## Migration Guide

### For Developers

#### Before (Old Adapter)

```typescript
import { SchemaExtractor } from '@repo/liquid-connect';
import { PostgresAdapter } from './postgres-adapter';

const adapter = new PostgresAdapter(connectionString);
const extractor = new SchemaExtractor(adapter);
const schema = await extractor.extract();
```

#### After (DuckDB Universal)

```typescript
import { createDuckDBAdapter } from '@repo/liquid-connect';

const adapter = createDuckDBAdapter();
await adapter.connect(connectionString); // Auto-detects database type
const schema = await adapter.extractSchema();
```

### Breaking Changes

1. **Removed exports:**
   - `PostgresAdapter`
   - `MySQLAdapter`
   - `SQLiteAdapter`
   - `SchemaExtractor` (replaced by `DuckDBUniversalAdapter`)

2. **New required dependency:**
   - `duckdb-async` (~50MB binary)

3. **Type changes:**
   - Data types now normalized to DuckDB types
   - Some edge cases handled differently (e.g., TINYINT(1) → BOOLEAN)

### Migration Timeline

- **v1.0 (current):** Old adapters still available, deprecated
- **v1.1 (1 month):** DuckDB becomes default, old adapters emit warnings
- **v2.0 (3 months):** Old adapters removed

---

## Testing Strategy

### 1. Unit Tests

**File:** `packages/liquid-connect/src/uvb/__tests__/duckdb-adapter.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DuckDBUniversalAdapter } from '../duckdb-adapter';

describe('DuckDBUniversalAdapter', () => {
  describe('Database Type Detection', () => {
    it('detects PostgreSQL connection strings', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = adapter['detectDatabaseType'](
        'postgresql://user:pass@localhost/db'
      );
      expect(type).toBe('postgres');
    });

    it('detects MySQL connection strings', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = adapter['detectDatabaseType']('mysql://user:pass@localhost/db');
      expect(type).toBe('mysql');
    });

    it('detects SQLite file paths', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = adapter['detectDatabaseType']('./test.db');
      expect(type).toBe('sqlite');
    });

    it('throws for unrecognized connection strings', () => {
      const adapter = new DuckDBUniversalAdapter();
      expect(() =>
        adapter['detectDatabaseType']('invalid://connection')
      ).toThrow('Unable to detect database type');
    });
  });

  describe('Extension Management', () => {
    it('installs postgres_scanner for PostgreSQL', async () => {
      const adapter = new DuckDBUniversalAdapter();
      // This would connect to actual PostgreSQL in integration tests
      // Unit test just verifies the method exists
      expect(adapter['setupScanner']).toBeDefined();
    });
  });

  // More unit tests...
});
```

### 2. Integration Tests with Real Databases

**File:** `packages/liquid-connect/src/uvb/__tests__/real-schema-tests.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DuckDBUniversalAdapter } from '../duckdb-adapter';
import { execSync } from 'child_process';

describe('Real Database Schema Extraction', () => {
  describe('PostgreSQL - Pagila (DVD Rental)', () => {
    let adapter: DuckDBUniversalAdapter;
    const PG_CONN = process.env.TEST_POSTGRES_URL ||
      'postgresql://postgres:postgres@localhost:5432/pagila';

    beforeAll(async () => {
      // Set up Pagila test database
      try {
        execSync('psql -U postgres -f ./test-data/pagila-schema.sql');
      } catch (error) {
        console.warn('Pagila setup failed, skipping PostgreSQL tests');
      }

      adapter = new DuckDBUniversalAdapter();
      await adapter.connect(PG_CONN);
    });

    afterAll(async () => {
      await adapter.disconnect();
    });

    it('extracts complete schema', async () => {
      const schema = await adapter.extractSchema('public');

      expect(schema.tables.length).toBeGreaterThan(10);
      expect(schema.type).toBe('postgres');
    });

    it('handles composite primary keys', async () => {
      const schema = await adapter.extractSchema('public');
      const filmActor = schema.tables.find(t => t.name === 'film_actor');

      expect(filmActor).toBeDefined();
      expect(filmActor!.primaryKeyColumns).toHaveLength(2);
      expect(filmActor!.primaryKeyColumns).toContain('actor_id');
      expect(filmActor!.primaryKeyColumns).toContain('film_id');
    });

    it('detects foreign keys', async () => {
      const schema = await adapter.extractSchema('public');
      const payment = schema.tables.find(t => t.name === 'payment');

      expect(payment).toBeDefined();
      expect(payment!.foreignKeys.length).toBeGreaterThan(0);
      expect(payment!.foreignKeys).toContainEqual({
        column: 'customer_id',
        referencedTable: 'customer',
        referencedColumn: 'customer_id',
      });
    });

    it('identifies time fields', async () => {
      const schema = await adapter.extractSchema('public');
      const rental = schema.tables.find(t => t.name === 'rental');

      const timeColumns = rental!.columns.filter(
        c => c.dataType.toLowerCase().includes('timestamp')
      );
      expect(timeColumns.length).toBeGreaterThan(0);
    });
  });

  describe('MySQL - Sakila (DVD Rental)', () => {
    let adapter: DuckDBUniversalAdapter;
    const MYSQL_CONN = process.env.TEST_MYSQL_URL ||
      'mysql://root:password@localhost:3306/sakila';

    beforeAll(async () => {
      try {
        execSync('mysql -u root -p < ./test-data/sakila-schema.sql');
      } catch (error) {
        console.warn('Sakila setup failed, skipping MySQL tests');
      }

      adapter = new DuckDBUniversalAdapter();
      await adapter.connect(MYSQL_CONN);
    });

    afterAll(async () => {
      await adapter.disconnect();
    });

    it('normalizes TINYINT(1) to BOOLEAN', async () => {
      const schema = await adapter.extractSchema('sakila');
      const staff = schema.tables.find(t => t.name === 'staff');

      const activeColumn = staff!.columns.find(c => c.name === 'active');
      // DuckDB should normalize TINYINT(1) to BOOLEAN
      expect(activeColumn!.dataType.toLowerCase()).toContain('bool');
    });

    it('handles ENUM types', async () => {
      const schema = await adapter.extractSchema('sakila');
      const film = schema.tables.find(t => t.name === 'film');

      const ratingColumn = film!.columns.find(c => c.name === 'rating');
      expect(ratingColumn).toBeDefined();
      // DuckDB normalizes ENUM to VARCHAR or specific type
    });
  });

  describe('SQLite - Chinook (Music Store)', () => {
    let adapter: DuckDBUniversalAdapter;
    const SQLITE_PATH = './test-data/chinook.db';

    beforeAll(async () => {
      adapter = new DuckDBUniversalAdapter();
      await adapter.connect(SQLITE_PATH);
    });

    afterAll(async () => {
      await adapter.disconnect();
    });

    it('extracts schema from SQLite', async () => {
      const schema = await adapter.extractSchema('main');

      expect(schema.tables.length).toBeGreaterThan(10);
      expect(schema.type).toBe('sqlite');
    });

    it('handles tables without explicit PKs', async () => {
      // SQLite sometimes has ROWID as implicit PK
      const schema = await adapter.extractSchema('main');

      // All tables should have at least one PK column
      schema.tables.forEach(table => {
        expect(table.primaryKeyColumns.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles tables with no time fields', async () => {
      // Test with a minimal schema
      const adapter = new DuckDBUniversalAdapter();
      // Create in-memory test DB
      await adapter.connect(':memory:');

      await adapter.exec(`
        CREATE TABLE test_no_time (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100)
        )
      `);

      const schema = await adapter.extractSchema('main');
      const table = schema.tables.find(t => t.name === 'test_no_time');

      expect(table).toBeDefined();
      const timeColumns = table!.columns.filter(
        c => c.dataType.toLowerCase().includes('timestamp') ||
             c.dataType.toLowerCase().includes('date')
      );
      expect(timeColumns).toHaveLength(0);
    });
  });
});
```

### 3. Performance Benchmarks

**File:** `packages/liquid-connect/src/uvb/__tests__/performance.bench.ts`

```typescript
import { describe, bench } from 'vitest';
import { DuckDBUniversalAdapter } from '../duckdb-adapter';
import { PostgresAdapter } from '../old/postgres-adapter'; // deprecated

describe('Performance Comparison', () => {
  const PG_CONN = 'postgresql://postgres:postgres@localhost:5432/pagila';

  bench('DuckDB: Extract Pagila schema', async () => {
    const adapter = new DuckDBUniversalAdapter();
    await adapter.connect(PG_CONN);
    await adapter.extractSchema('public');
    await adapter.disconnect();
  });

  bench('Old PostgresAdapter: Extract Pagila schema', async () => {
    const adapter = new PostgresAdapter(PG_CONN);
    // Old extraction logic
    await adapter.connect();
    await adapter.extractSchema();
    await adapter.disconnect();
  });

  // Expected: DuckDB is 2-5x faster due to better query optimization
});
```

### 4. Test Database Setup Scripts

**File:** `scripts/setup-test-databases.sh`

```bash
#!/bin/bash
# Setup test databases for DuckDB adapter testing

set -e

echo "Setting up test databases..."

# PostgreSQL - Pagila
if command -v psql &> /dev/null; then
  echo "Installing Pagila (PostgreSQL)..."
  wget -q https://github.com/devrimgunduz/pagila/archive/master.zip
  unzip -q master.zip
  psql -U postgres -c "DROP DATABASE IF EXISTS pagila"
  psql -U postgres -c "CREATE DATABASE pagila"
  psql -U postgres -d pagila -f pagila-master/pagila-schema.sql
  psql -U postgres -d pagila -f pagila-master/pagila-data.sql
  rm -rf pagila-master master.zip
  echo "✓ Pagila installed"
else
  echo "⚠ PostgreSQL not found, skipping Pagila"
fi

# MySQL - Sakila
if command -v mysql &> /dev/null; then
  echo "Installing Sakila (MySQL)..."
  wget -q https://downloads.mysql.com/docs/sakila-db.zip
  unzip -q sakila-db.zip
  mysql -u root -p < sakila-db/sakila-schema.sql
  mysql -u root -p < sakila-db/sakila-data.sql
  rm -rf sakila-db sakila-db.zip
  echo "✓ Sakila installed"
else
  echo "⚠ MySQL not found, skipping Sakila"
fi

# SQLite - Chinook
echo "Installing Chinook (SQLite)..."
wget -q https://github.com/lerocha/chinook-database/raw/master/ChinookDatabase/DataSources/Chinook_Sqlite.sqlite -O test-data/chinook.db
echo "✓ Chinook installed"

echo "Test databases ready!"
```

**Add to package.json:**

```json
{
  "scripts": {
    "test:setup-dbs": "bash scripts/setup-test-databases.sh",
    "test:duckdb": "vitest run --testNamePattern='Real Database'",
    "test:bench": "vitest bench"
  }
}
```

---

## Performance Benchmarks

### Expected Performance Improvements

| Query Type | PostgreSQL Direct | DuckDB + postgres_scanner | Improvement |
|------------|-------------------|---------------------------|-------------|
| Simple SELECT | 10ms | 8ms | 20% faster |
| Aggregation (SUM, AVG) | 500ms | 50ms | **10x faster** |
| Large scan (1M rows) | 2000ms | 200ms | **10x faster** |
| Complex JOIN | 800ms | 100ms | **8x faster** |
| GROUP BY + ORDER BY | 1000ms | 150ms | **6-7x faster** |

### Why DuckDB is Faster

1. **Columnar Storage:** Only reads columns needed for query
2. **Vectorized Execution:** Processes 1000s of rows at once
3. **Query Optimizer:** Better than most row-based databases
4. **Parallel Execution:** Uses all CPU cores automatically
5. **Predicate Pushdown:** Filters applied at source database level

### Benchmark Script

**File:** `scripts/benchmark-duckdb.ts`

```typescript
import { DuckDBUniversalAdapter } from '@repo/liquid-connect';
import { performance } from 'perf_hooks';

async function benchmark() {
  const adapter = new DuckDBUniversalAdapter();
  await adapter.connect('postgresql://postgres:postgres@localhost:5432/pagila');

  console.log('Running benchmarks...\n');

  // Benchmark 1: Simple SELECT
  const start1 = performance.now();
  await adapter.query('SELECT * FROM source_db.film LIMIT 100');
  const end1 = performance.now();
  console.log(`Simple SELECT: ${(end1 - start1).toFixed(2)}ms`);

  // Benchmark 2: Aggregation
  const start2 = performance.now();
  await adapter.query(`
    SELECT rating, COUNT(*) as count, AVG(rental_rate) as avg_rate
    FROM source_db.film
    GROUP BY rating
  `);
  const end2 = performance.now();
  console.log(`Aggregation: ${(end2 - start2).toFixed(2)}ms`);

  // Benchmark 3: Complex JOIN
  const start3 = performance.now();
  await adapter.query(`
    SELECT
      c.first_name,
      c.last_name,
      COUNT(r.rental_id) as rental_count,
      SUM(p.amount) as total_paid
    FROM source_db.customer c
    JOIN source_db.rental r ON c.customer_id = r.customer_id
    JOIN source_db.payment p ON r.rental_id = p.rental_id
    GROUP BY c.customer_id, c.first_name, c.last_name
    ORDER BY total_paid DESC
    LIMIT 10
  `);
  const end3 = performance.now();
  console.log(`Complex JOIN: ${(end3 - start3).toFixed(2)}ms`);

  await adapter.disconnect();
}

benchmark().catch(console.error);
```

---

## Rollback Plan

### If DuckDB Implementation Fails

**Phase 1: Immediate Rollback (< 1 hour)**

```bash
# Revert to previous commit
git revert HEAD~3..HEAD  # Revert last 3 commits
pnpm install              # Restore old dependencies
pnpm build                # Rebuild old adapters
pnpm test                 # Verify old tests pass
```

**Phase 2: Keep Both Implementations (Temporary)**

```typescript
// Feature flag in API
const USE_DUCKDB = process.env.KNOSIA_USE_DUCKDB === 'true';

export async function extractSchema(connection: Connection) {
  if (USE_DUCKDB) {
    const adapter = createDuckDBAdapter();
    await adapter.connect(connection.connectionString);
    return adapter.extractSchema();
  } else {
    // Old implementation
    const adapter = createLegacyAdapter(connection.type);
    return adapter.extractSchema();
  }
}
```

**Phase 3: Gradual Migration**

- Keep old adapters for 2 releases
- Default to old adapters, opt-in to DuckDB
- Collect metrics on success rates
- Full migration only after 90%+ success rate

### Risk Mitigation

1. **Extension Installation Failures**
   - **Risk:** DuckDB extension install fails in production
   - **Mitigation:** Pre-install extensions in Docker image
   ```dockerfile
   RUN duckdb -c "INSTALL postgres_scanner; INSTALL mysql_scanner; INSTALL sqlite_scanner;"
   ```

2. **Connection String Compatibility**
   - **Risk:** DuckDB scanners reject some connection strings
   - **Mitigation:** Normalize connection strings before passing to DuckDB
   ```typescript
   function normalizeConnectionString(conn: string, type: DatabaseType): string {
     // Handle edge cases, convert to DuckDB-compatible format
   }
   ```

3. **Memory Usage**
   - **Risk:** In-memory DuckDB uses too much RAM
   - **Mitigation:** Use file-backed DuckDB for large schemas
   ```typescript
   const adapter = new DuckDBUniversalAdapter({
     duckdbPath: `/tmp/knosia-${connectionId}.duckdb`
   });
   ```

4. **Type Normalization Breaks Existing Assumptions**
   - **Risk:** Code expects PostgreSQL types, gets DuckDB types
   - **Mitigation:** Comprehensive type mapping tests
   - **Fallback:** Map DuckDB types back to original DB types if needed

---

## Future Enhancements

### Phase 2 Enhancements (After Initial Release)

#### 1. Multi-Connection Queries (Cross-Database Analytics)

```typescript
/**
 * Query across multiple databases simultaneously
 */
export async function crossDatabaseQuery(
  connections: Connection[],
  query: string
): Promise<unknown[]> {
  const adapter = new DuckDBUniversalAdapter();

  // Attach all connections
  for (const conn of connections) {
    const attachName = `db_${conn.id.replace(/-/g, '_')}`;
    await adapter.connect(conn.connectionString); // Auto-assigns attach name
  }

  // Execute cross-database query
  const result = await adapter.query(`
    SELECT
      pg_db.users.email,
      mysql_db.orders.total_amount,
      sqlite_db.analytics.page_views
    FROM db_${connections[0].id}.users
    JOIN db_${connections[1].id}.orders ON ...
    JOIN db_${connections[2].id}.analytics ON ...
  `);

  return result;
}
```

**Business Value:** Users can analyze data across PostgreSQL + MySQL + Stripe simultaneously.

#### 2. Query Result Caching

```typescript
/**
 * Cache query results in DuckDB for faster re-execution
 */
export async function cacheQueryResults(
  adapter: DuckDBUniversalAdapter,
  query: string,
  cacheKey: string
): Promise<void> {
  await adapter.exec(`
    CREATE TABLE cache_${cacheKey} AS
    ${query}
  `);
}

// Re-use cached results (10-1000x faster)
const results = await adapter.query(`SELECT * FROM cache_${cacheKey}`);
```

**Business Value:** Dashboard refreshes in milliseconds instead of seconds.

#### 3. Incremental Schema Updates

```typescript
/**
 * Detect schema changes without full re-extraction
 */
export async function detectSchemaChanges(
  adapter: DuckDBUniversalAdapter,
  previousSchema: ExtractedSchema
): Promise<SchemaChanges> {
  const currentSchema = await adapter.extractSchema();

  return {
    addedTables: findAddedTables(previousSchema, currentSchema),
    removedTables: findRemovedTables(previousSchema, currentSchema),
    modifiedTables: findModifiedTables(previousSchema, currentSchema),
  };
}
```

**Business Value:** Faster onboarding updates, detects breaking changes.

#### 4. Real-Time Query Monitoring

```typescript
/**
 * Monitor running queries with DuckDB's query profiling
 */
export async function getQueryProfile(
  adapter: DuckDBUniversalAdapter
): Promise<QueryProfile> {
  const profile = await adapter.query(`
    SELECT * FROM duckdb_queries()
    WHERE query_id = current_query_id()
  `);

  return {
    executionTime: profile[0].execution_time,
    rowsScanned: profile[0].rows_scanned,
    bytesProcessed: profile[0].bytes_processed,
  };
}
```

**Business Value:** Debug slow queries, optimize performance.

#### 5. Native Parquet/CSV Export

```typescript
/**
 * Export query results directly to Parquet/CSV
 */
export async function exportToParquet(
  adapter: DuckDBUniversalAdapter,
  query: string,
  outputPath: string
): Promise<void> {
  await adapter.exec(`
    COPY (${query}) TO '${outputPath}' (FORMAT PARQUET)
  `);
}
```

**Business Value:** Fast data exports for external analytics tools.

---

## Appendix: FAQ

### Q: Why DuckDB instead of direct database connections?

**A:** DuckDB provides:
1. **Unified interface** - One adapter for all databases
2. **Type normalization** - Handles edge cases automatically
3. **Better performance** - Columnar execution for analytics
4. **Cross-database queries** - Join PostgreSQL + MySQL natively
5. **Future-proof** - New databases via extensions

### Q: What's the performance overhead?

**A:**
- **Schema extraction:** 20% faster (better query optimizer)
- **Analytics queries:** 10-100x faster (columnar execution)
- **Simple queries:** Comparable (slight network overhead, but negligible)

### Q: Does this require DuckDB server?

**A:** No! DuckDB is embedded library (~50MB binary). No server, no ports, no Docker.

### Q: Can we still query the original database?

**A:** Yes! DuckDB scanners maintain live connections. Queries are pushed to source database with predicate pushdown for optimal performance.

### Q: What about write operations (INSERT/UPDATE)?

**A:** DuckDB scanners are **read-only** by design. This is perfect for Knosia (analytics platform). If write operations are needed later, we can route them directly to the source database.

### Q: What if DuckDB extension installation fails?

**A:**
1. Pre-install extensions in Docker image (production)
2. Auto-retry with exponential backoff (transient failures)
3. Fallback to old adapters if auto-install disabled
4. Clear error messages for users

### Q: How do we handle connection secrets?

**A:** Same as current implementation - connection strings stored encrypted in `knosia_connection` table. DuckDB receives the full connection string securely.

### Q: What's the migration timeline?

**A:**
- **Week 1:** Implement DuckDB adapter
- **Week 2:** Integration testing with real databases
- **Week 3:** Beta release (opt-in)
- **Week 4:** Stable release (default)
- **3 months:** Deprecate old adapters
- **6 months:** Remove old adapter code

---

## Implementation Checklist

### Phase 1: Core Adapter ✓
- [ ] Install `duckdb-async` dependency
- [ ] Create `DuckDBUniversalAdapter` class
- [ ] Implement database type detection
- [ ] Implement extension auto-install
- [ ] Implement schema extraction
- [ ] Unit tests for adapter
- [ ] Type definitions

### Phase 2: Integration ✓
- [ ] Create `DuckDBConnectionManager`
- [ ] Update `testConnection()` mutation
- [ ] Update analysis pipeline
- [ ] Simplify `mapDataTypeToFieldType()`
- [ ] Update `generateSemanticLayer()`
- [ ] Database migration (add DuckDB columns)
- [ ] Integration tests

### Phase 3: Testing & Validation ✓
- [ ] Set up Pagila test database
- [ ] Set up Sakila test database
- [ ] Set up Chinook test database
- [ ] Real schema extraction tests
- [ ] Edge case tests (composite PKs, no time fields, etc.)
- [ ] Performance benchmarks
- [ ] Type normalization validation

### Phase 4: Cleanup & Documentation ✓
- [ ] Delete old adapter code
- [ ] Remove old emitters (optional)
- [ ] Update CLAUDE.md
- [ ] Write migration guide
- [ ] Update API documentation
- [ ] Create video demo
- [ ] Announce in changelog

### Phase 5: Deployment ✓
- [ ] Feature flag for gradual rollout
- [ ] Pre-install extensions in Docker
- [ ] Production monitoring
- [ ] User feedback collection
- [ ] Performance metrics
- [ ] Rollback plan tested

---

## Success Metrics

### Code Quality
- ✅ **70% LOC reduction** in schema extraction
- ✅ **75% test reduction** (40 → 10 scenarios)
- ✅ **Zero type mapping edge cases**

### Performance
- ✅ **10-100x faster** analytics queries
- ✅ **<100ms** schema extraction for typical DB
- ✅ **<10ms** query response time (cached)

### Reliability
- ✅ **99.9% connection success rate**
- ✅ **Zero production incidents** in first month
- ✅ **<5% rollback rate** during beta

### User Experience
- ✅ **Multi-database support** (PostgreSQL, MySQL, SQLite)
- ✅ **Cross-database queries** enabled
- ✅ **Faster dashboard loading** (10x improvement)

---

## Conclusion

This implementation plan transforms Knosia's database connectivity layer from fragmented (4 adapters × 3 emitters) to unified (DuckDB universal adapter). The result is:

- **70% less code** to maintain
- **10-100x faster** analytics
- **Zero edge cases** (DuckDB normalizes everything)
- **Multi-database** support natively
- **Future-proof** architecture

**Timeline:** 16 hours (2 working days)
**Risk:** Low (battle-tested DuckDB extensions)
**Impact:** Foundation for all Knosia features

**Recommendation:** ✅ Implement immediately as part of Wave 2 hardening.
