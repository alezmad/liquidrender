import { describe, it, expect } from 'vitest';
import { DuckDBUniversalAdapter } from '../duckdb-adapter';

describe('DuckDBUniversalAdapter', () => {
  describe('Database Type Detection', () => {
    it('detects PostgreSQL connection strings', () => {
      const adapter = new DuckDBUniversalAdapter();
      // Access private method through bracket notation for testing
      const type = (adapter as any).detectDatabaseType(
        'postgresql://user:pass@localhost/db'
      );
      expect(type).toBe('postgres');
    });

    it('detects PostgreSQL with alternate prefix', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = (adapter as any).detectDatabaseType(
        'postgres://user:pass@localhost/db'
      );
      expect(type).toBe('postgres');
    });

    it('detects MySQL connection strings', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = (adapter as any).detectDatabaseType('mysql://user:pass@localhost/db');
      expect(type).toBe('mysql');
    });

    it('detects SQLite file paths with .db extension', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = (adapter as any).detectDatabaseType('./test.db');
      expect(type).toBe('sqlite');
    });

    it('detects SQLite file paths with .sqlite extension', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = (adapter as any).detectDatabaseType('./test.sqlite');
      expect(type).toBe('sqlite');
    });

    it('detects SQLite with sqlite:// protocol', () => {
      const adapter = new DuckDBUniversalAdapter();
      const type = (adapter as any).detectDatabaseType('sqlite://./test.db');
      expect(type).toBe('sqlite');
    });

    it('throws for unrecognized connection strings', () => {
      const adapter = new DuckDBUniversalAdapter();
      expect(() =>
        (adapter as any).detectDatabaseType('invalid://connection')
      ).toThrow('Unable to detect database type');
    });
  });

  describe('Constructor Options', () => {
    it('uses default options when none provided', () => {
      const adapter = new DuckDBUniversalAdapter();
      const options = (adapter as any).options;

      expect(options.duckdbPath).toBe(':memory:');
      expect(options.attachedName).toBe('source_db');
      expect(options.autoInstallExtensions).toBe(true);
      expect(options.connectionTimeout).toBe(30000);
    });

    it('accepts custom options', () => {
      const adapter = new DuckDBUniversalAdapter({
        duckdbPath: './test.duckdb',
        attachedName: 'custom_db',
        autoInstallExtensions: false,
        connectionTimeout: 60000,
      });
      const options = (adapter as any).options;

      expect(options.duckdbPath).toBe('./test.duckdb');
      expect(options.attachedName).toBe('custom_db');
      expect(options.autoInstallExtensions).toBe(false);
      expect(options.connectionTimeout).toBe(60000);
    });

    it('merges partial options with defaults', () => {
      const adapter = new DuckDBUniversalAdapter({
        attachedName: 'my_db',
      });
      const options = (adapter as any).options;

      expect(options.duckdbPath).toBe(':memory:');
      expect(options.attachedName).toBe('my_db');
      expect(options.autoInstallExtensions).toBe(true);
    });
  });

  describe('getDatabaseName', () => {
    it('extracts database name from PostgreSQL connection string', () => {
      const adapter = new DuckDBUniversalAdapter();
      (adapter as any).connectionString = 'postgresql://user:pass@localhost:5432/mydb';

      expect(adapter.getDatabaseName()).toBe('mydb');
    });

    it('extracts database name from MySQL connection string', () => {
      const adapter = new DuckDBUniversalAdapter();
      (adapter as any).connectionString = 'mysql://user:pass@localhost:3306/testdb';

      expect(adapter.getDatabaseName()).toBe('testdb');
    });

    it('handles connection strings with query parameters', () => {
      const adapter = new DuckDBUniversalAdapter();
      (adapter as any).connectionString = 'postgresql://localhost/mydb?sslmode=require';

      expect(adapter.getDatabaseName()).toBe('mydb');
    });

    it('returns unknown for unmatched patterns', () => {
      const adapter = new DuckDBUniversalAdapter();
      (adapter as any).connectionString = 'invalid-string';

      expect(adapter.getDatabaseName()).toBe('unknown');
    });

    it('throws when not connected', () => {
      const adapter = new DuckDBUniversalAdapter();

      expect(() => adapter.getDatabaseName()).toThrow('Not connected');
    });
  });

  describe('Type Property', () => {
    it('throws when accessing type before connection', () => {
      const adapter = new DuckDBUniversalAdapter();

      expect(() => adapter.type).toThrow('Not connected - call connect() first');
    });

    it('returns detected type after setting sourceType', () => {
      const adapter = new DuckDBUniversalAdapter();
      (adapter as any).sourceType = 'postgres';

      expect(adapter.type).toBe('postgres');
    });
  });

  describe('Integration Tests', () => {
    it.skip('connects to in-memory DuckDB', async () => {
      // Skip by default as it requires DuckDB binary
      const adapter = new DuckDBUniversalAdapter();

      // For testing, would need a real DuckDB instance
      // This is a placeholder for integration testing

      await expect(async () => {
        await adapter.connect(':memory:');
        await adapter.disconnect();
      }).not.toThrow();
    });
  });
});

describe('createDuckDBUniversalAdapter', () => {
  it('creates a new DuckDBUniversalAdapter instance', async () => {
    const { createDuckDBUniversalAdapter } = await import('../duckdb-adapter');
    const adapter = createDuckDBUniversalAdapter();

    expect(adapter).toBeInstanceOf(DuckDBUniversalAdapter);
  });

  it('passes options to the adapter', async () => {
    const { createDuckDBUniversalAdapter } = await import('../duckdb-adapter');
    const adapter = createDuckDBUniversalAdapter({
      attachedName: 'test_db',
    });

    const options = (adapter as any).options;
    expect(options.attachedName).toBe('test_db');
  });
});
