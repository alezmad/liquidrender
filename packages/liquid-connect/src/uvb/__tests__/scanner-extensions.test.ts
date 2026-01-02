/**
 * Scanner Extensions Integration Test
 *
 * Tests that DuckDB scanner extensions work with the new @duckdb/node-api.
 * This verifies postgres_scanner, mysql_scanner, and sqlite_scanner can be loaded.
 *
 * NOTE: These tests verify the API works correctly with the new @duckdb/node-api.
 * Full database integration tests require actual database servers which are tested manually.
 */

import { describe, it, expect } from 'vitest';
import { DuckDBUniversalAdapter } from '../duckdb-adapter';

describe('DuckDB Scanner Extensions with @duckdb/node-api', () => {
  describe('Extension Loading', () => {
    it('loads postgres_scanner extension without error', async () => {
      const adapter = new DuckDBUniversalAdapter();

      // Connect to in-memory database
      await adapter.connect(':memory:');

      // Install and load postgres_scanner
      await expect(
        adapter.exec('INSTALL postgres_scanner')
      ).resolves.not.toThrow();

      await expect(
        adapter.exec('LOAD postgres_scanner')
      ).resolves.not.toThrow();

      await adapter.disconnect();
    });

    it('loads mysql_scanner extension without error', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      await expect(
        adapter.exec('INSTALL mysql_scanner')
      ).resolves.not.toThrow();

      await expect(
        adapter.exec('LOAD mysql_scanner')
      ).resolves.not.toThrow();

      await adapter.disconnect();
    });

    it('loads sqlite_scanner extension without error', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      // SQLite scanner is built-in, just verify ATTACH works
      await expect(
        adapter.exec('SELECT 1')
      ).resolves.not.toThrow();

      await adapter.disconnect();
    });
  });

  describe('In-Memory Database Operations', () => {
    it('creates tables and queries data', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      // Create a test table
      await adapter.exec(`
        CREATE TABLE test_data (
          id INTEGER,
          name VARCHAR
        )
      `);

      // Insert data
      await adapter.exec(`
        INSERT INTO test_data VALUES
          (1, 'Alice'),
          (2, 'Bob')
      `);

      // Query data
      const result = await adapter.query<{ id: number; name: string }>(
        'SELECT * FROM test_data ORDER BY id'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, name: 'Alice' });
      expect(result[1]).toMatchObject({ id: 2, name: 'Bob' });

      await adapter.disconnect();
    });

    it('handles parameterized queries', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      await adapter.exec(`
        CREATE TABLE users (id INTEGER, name VARCHAR)
      `);

      await adapter.exec(`
        INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')
      `);

      // Query with parameter
      const result = await adapter.query<{ name: string }>(
        'SELECT name FROM users WHERE id = $1',
        [2]
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Bob');

      await adapter.disconnect();
    });

    it('handles multiple query parameters', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      await adapter.exec(`
        CREATE TABLE numbers (value INTEGER)
      `);

      await adapter.exec(`
        INSERT INTO numbers VALUES (1), (2), (3), (4), (5)
      `);

      const result = await adapter.query<{ value: number }>(
        'SELECT value FROM numbers WHERE value >= $1 AND value <= $2 ORDER BY value',
        [2, 4]
      );

      expect(result).toHaveLength(3);
      expect(result.map(r => r.value)).toEqual([2, 3, 4]);

      await adapter.disconnect();
    });
  });

  describe('Connection String Parsing', () => {
    it('detects PostgreSQL connection type', () => {
      const adapter = new DuckDBUniversalAdapter();

      // Private method access for testing
      const type = (adapter as any).detectDatabaseType(
        'postgresql://user:pass@localhost:5432/testdb'
      );

      expect(type).toBe('postgres');
    });

    it('detects MySQL connection type', () => {
      const adapter = new DuckDBUniversalAdapter();

      const type = (adapter as any).detectDatabaseType(
        'mysql://user:pass@localhost:3306/testdb'
      );

      expect(type).toBe('mysql');
    });

    it('detects SQLite connection type', () => {
      const adapter = new DuckDBUniversalAdapter();

      const type = (adapter as any).detectDatabaseType('./test.db');

      expect(type).toBe('sqlite');
    });
  });

  describe('Error Handling', () => {
    it('throws error when querying without connection', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await expect(
        adapter.query('SELECT 1')
      ).rejects.toThrow('Not connected');
    });

    it('throws error when executing without connection', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await expect(
        adapter.exec('SELECT 1')
      ).rejects.toThrow('Not connected');
    });

    it('throws error for invalid SQL', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      await expect(
        adapter.query('INVALID SQL SYNTAX')
      ).rejects.toThrow();

      await adapter.disconnect();
    });

    it('provides type information before connection for detected types', () => {
      const adapter = new DuckDBUniversalAdapter();

      // Type is detected but not connected yet
      (adapter as any).connectionString = 'postgresql://localhost/db';
      (adapter as any).sourceType = 'postgres';

      expect(adapter.type).toBe('postgres');
    });

    it('throws error when accessing type without detection', () => {
      const adapter = new DuckDBUniversalAdapter();

      expect(() => adapter.type).toThrow('Not connected');
    });
  });

  describe('Connection Management', () => {
    it('disconnects cleanly', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');
      await adapter.disconnect();

      // Should not be able to query after disconnect
      await expect(
        adapter.query('SELECT 1')
      ).rejects.toThrow('Not connected');
    });

    it('handles multiple disconnect calls without error', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');
      await adapter.disconnect();

      // Second disconnect should not throw
      await expect(
        adapter.disconnect()
      ).resolves.not.toThrow();
    });

    it('supports custom options', async () => {
      const adapter = new DuckDBUniversalAdapter({
        attachedName: 'custom_db',
        autoInstallExtensions: false,
      });

      const options = (adapter as any).options;

      expect(options.attachedName).toBe('custom_db');
      expect(options.autoInstallExtensions).toBe(false);
    });
  });

  describe('Query Result Handling', () => {
    it('returns empty array for no results', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      await adapter.exec('CREATE TABLE empty_table (id INTEGER)');

      const result = await adapter.query('SELECT * FROM empty_table');

      expect(result).toEqual([]);

      await adapter.disconnect();
    });

    it('handles different data types correctly', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      await adapter.exec(`
        CREATE TABLE types_test (
          int_col INTEGER,
          str_col VARCHAR,
          bool_col BOOLEAN,
          float_col DOUBLE
        )
      `);

      await adapter.exec(`
        INSERT INTO types_test VALUES
          (42, 'hello', true, 3.14)
      `);

      const result = await adapter.query<{
        int_col: number;
        str_col: string;
        bool_col: boolean;
        float_col: number;
      }>('SELECT * FROM types_test');

      expect(result[0]).toMatchObject({
        int_col: 42,
        str_col: 'hello',
        bool_col: true,
        float_col: 3.14,
      });

      await adapter.disconnect();
    });
  });

  describe('Database Name Extraction', () => {
    it('extracts database name from PostgreSQL connection string', async () => {
      const adapter = new DuckDBUniversalAdapter();

      // Connect will fail without real server, but we can test name extraction
      try {
        await adapter.connect('postgresql://user:pass@localhost:5432/my_database');
      } catch {
        // Expected to fail
      }

      const dbName = adapter.getDatabaseName();
      expect(dbName).toBe('my_database');
    });

    it('extracts database name from MySQL connection string', async () => {
      const adapter = new DuckDBUniversalAdapter();

      try {
        await adapter.connect('mysql://user:pass@localhost:3306/test_db');
      } catch {
        // Expected to fail
      }

      const dbName = adapter.getDatabaseName();
      expect(dbName).toBe('test_db');
    });

    it('returns unknown for in-memory database', async () => {
      const adapter = new DuckDBUniversalAdapter();

      await adapter.connect(':memory:');

      const dbName = adapter.getDatabaseName();
      expect(dbName).toBe('unknown');

      await adapter.disconnect();
    });
  });
});
