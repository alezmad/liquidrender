/**
 * Factory Functions Tests
 *
 * Tests for the adapter factory functions in index.ts:
 * - createDuckDBAdapter(config) - creates DuckDBAdapter via dynamic import
 * - createAdapter(config) - universal factory that delegates to createDuckDBAdapter
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  createDuckDBAdapter,
  createAdapter,
  type DuckDBConnectionConfig,
} from "../index";
import type { DatabaseAdapter } from "../../extractor";

describe("Factory Functions", () => {
  let adapter: DatabaseAdapter | null = null;

  afterEach(async () => {
    if (adapter) {
      try {
        await adapter.disconnect();
      } catch {
        // Ignore disconnect errors in cleanup
      }
      adapter = null;
    }
  });

  describe("createDuckDBAdapter", () => {
    it("should return a DuckDBAdapter instance", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);

      expect(adapter).toBeDefined();
      expect(adapter.type).toBe("duckdb");
    });

    it("should work with duckdb config type", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);

      expect(adapter.type).toBe("duckdb");
      expect(adapter.getDatabaseName()).toBe(":memory:");
    });

    it("should work with postgres config type", () => {
      const config: DuckDBConnectionConfig = {
        type: "postgres",
        host: "localhost",
        port: 5432,
        database: "testdb",
        user: "user",
        password: "pass",
      };

      adapter = createDuckDBAdapter(config);

      expect(adapter.type).toBe("postgres");
      expect(adapter.getDatabaseName()).toBe("testdb");
    });

    it("should work with mysql config type", () => {
      const config: DuckDBConnectionConfig = {
        type: "mysql",
        host: "localhost",
        port: 3306,
        database: "testdb",
        user: "user",
        password: "pass",
      };

      adapter = createDuckDBAdapter(config);

      expect(adapter.type).toBe("mysql");
      expect(adapter.getDatabaseName()).toBe("testdb");
    });

    it("should work with sqlite config type", () => {
      const config: DuckDBConnectionConfig = {
        type: "sqlite",
        path: "/path/to/database.sqlite",
      };

      adapter = createDuckDBAdapter(config);

      expect(adapter.type).toBe("sqlite");
      expect(adapter.getDatabaseName()).toBe("/path/to/database.sqlite");
    });

    it("should work with parquet config type (maps to duckdb)", () => {
      const config: DuckDBConnectionConfig = {
        type: "parquet",
        path: "/path/to/data.parquet",
      };

      adapter = createDuckDBAdapter(config);

      // parquet type maps to duckdb internally
      expect(adapter.type).toBe("duckdb");
    });

    it("should work with csv config type (maps to duckdb)", () => {
      const config: DuckDBConnectionConfig = {
        type: "csv",
        url: "https://example.com/data.csv",
      };

      adapter = createDuckDBAdapter(config);

      // csv type maps to duckdb internally
      expect(adapter.type).toBe("duckdb");
    });
  });

  describe("createAdapter", () => {
    it("should delegate to createDuckDBAdapter", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createAdapter(config);

      expect(adapter).toBeDefined();
      expect(adapter.type).toBe("duckdb");
    });

    it("should work with all supported config types", () => {
      // Test postgres
      const postgresConfig: DuckDBConnectionConfig = {
        type: "postgres",
        host: "localhost",
        port: 5432,
        database: "testdb",
        user: "user",
        password: "pass",
      };
      adapter = createAdapter(postgresConfig);
      expect(adapter.type).toBe("postgres");
      adapter = null;

      // Test mysql
      const mysqlConfig: DuckDBConnectionConfig = {
        type: "mysql",
        host: "localhost",
        port: 3306,
        database: "testdb",
        user: "user",
        password: "pass",
      };
      adapter = createAdapter(mysqlConfig);
      expect(adapter.type).toBe("mysql");
      adapter = null;

      // Test sqlite
      const sqliteConfig: DuckDBConnectionConfig = {
        type: "sqlite",
        path: "/path/to/db.sqlite",
      };
      adapter = createAdapter(sqliteConfig);
      expect(adapter.type).toBe("sqlite");
    });
  });

  describe("DatabaseAdapter interface compliance", () => {
    it("should implement type property", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);

      expect(typeof adapter.type).toBe("string");
      expect(adapter.type).toBe("duckdb");
    });

    it("should implement connect method", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);

      expect(typeof adapter.connect).toBe("function");
    });

    it("should implement disconnect method", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);

      expect(typeof adapter.disconnect).toBe("function");
    });

    it("should implement query method", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);

      expect(typeof adapter.query).toBe("function");
    });

    it("should implement getDatabaseName method", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);

      expect(typeof adapter.getDatabaseName).toBe("function");
      expect(adapter.getDatabaseName()).toBe(":memory:");
    });
  });

  describe("in-memory connection", () => {
    it("should connect to in-memory database via createDuckDBAdapter", async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createDuckDBAdapter(config);
      await adapter.connect();

      const rows = await adapter.query<{ test: number }>("SELECT 1 AS test");
      expect(rows).toHaveLength(1);
      expect(rows[0].test).toBe(1);
    });

    it("should connect to in-memory database via createAdapter", async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createAdapter(config);
      await adapter.connect();

      const rows = await adapter.query<{ value: string }>(
        "SELECT 'hello' AS value"
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe("hello");
    });

    it("should execute queries with multiple rows", async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createAdapter(config);
      await adapter.connect();

      // Use VALUES clause to create test data
      const rows = await adapter.query<{ n: number }>(
        "SELECT * FROM (VALUES (1), (2), (3)) AS t(n)"
      );

      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.n)).toEqual([1, 2, 3]);
    });

    it("should handle connection lifecycle correctly", async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };

      adapter = createAdapter(config);

      // Should throw before connect
      await expect(adapter.query("SELECT 1")).rejects.toThrow();

      // Should work after connect
      await adapter.connect();
      const rows = await adapter.query<{ n: number }>("SELECT 1 AS n");
      expect(rows[0].n).toBe(1);

      // Should throw after disconnect
      await adapter.disconnect();
      await expect(adapter.query("SELECT 1")).rejects.toThrow();
    });
  });
});
