/**
 * DuckDB Adapter Tests
 *
 * Tests for the DuckDB universal adapter.
 * Uses in-memory DuckDB for testing without external dependencies.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DuckDBAdapter, type DuckDBConnectionConfig } from "../duckdb";

describe("DuckDBAdapter", () => {
  let adapter: DuckDBAdapter;

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
  });

  describe("constructor", () => {
    it("should create adapter with duckdb config", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.type).toBe("duckdb");
    });

    it("should create adapter with postgres config", () => {
      const config: DuckDBConnectionConfig = {
        type: "postgres",
        host: "localhost",
        port: 5432,
        database: "test",
        user: "user",
        password: "pass",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.type).toBe("postgres");
    });

    it("should create adapter with parquet config (maps to duckdb type)", () => {
      const config: DuckDBConnectionConfig = {
        type: "parquet",
        path: "/path/to/file.parquet",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.type).toBe("duckdb");
    });

    it("should create adapter with csv config (maps to duckdb type)", () => {
      const config: DuckDBConnectionConfig = {
        type: "csv",
        url: "https://example.com/data.csv",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.type).toBe("duckdb");
    });
  });

  describe("in-memory operations", () => {
    beforeEach(async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };
      adapter = new DuckDBAdapter(config);
    });

    it("should connect to in-memory database", async () => {
      await adapter.connect();
      const result = await adapter.testConnection();
      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should execute simple queries", async () => {
      await adapter.connect();
      const rows = await adapter.query<{ test: number }>("SELECT 1 AS test");
      expect(rows).toHaveLength(1);
      expect(rows[0].test).toBe(1);
    });

    it("should execute queries with multiple rows", async () => {
      await adapter.connect();

      // Create and populate a test table
      await adapter.run("CREATE TABLE test_users (id INTEGER, name VARCHAR)");
      await adapter.run("INSERT INTO test_users VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')");

      const rows = await adapter.query<{ id: number; name: string }>(
        "SELECT * FROM test_users ORDER BY id"
      );

      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({ id: 1, name: "Alice" });
      expect(rows[1]).toEqual({ id: 2, name: "Bob" });
      expect(rows[2]).toEqual({ id: 3, name: "Charlie" });
    });

    it("should handle empty result sets", async () => {
      await adapter.connect();
      await adapter.run("CREATE TABLE empty_table (id INTEGER)");

      const rows = await adapter.query("SELECT * FROM empty_table");
      expect(rows).toHaveLength(0);
    });

    it("should return query metadata from executeQuery", async () => {
      await adapter.connect();
      await adapter.run("CREATE TABLE metrics (value INTEGER)");
      await adapter.run("INSERT INTO metrics VALUES (10), (20), (30)");

      const result = await adapter.executeQuery("SELECT * FROM metrics");

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(3);
      expect(result.columns).toContain("value");
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("should handle query errors gracefully", async () => {
      await adapter.connect();

      const result = await adapter.executeQuery("SELECT * FROM nonexistent_table");

      expect(result.success).toBe(false);
      expect(result.rowCount).toBe(0);
      expect(result.rows).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("nonexistent_table");
    });
  });

  describe("connection lifecycle", () => {
    it("should throw error when querying without connection", async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };
      adapter = new DuckDBAdapter(config);

      await expect(adapter.query("SELECT 1")).rejects.toThrow(
        "Not connected. Call connect() first."
      );
    });

    it("should disconnect cleanly", async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };
      adapter = new DuckDBAdapter(config);

      await adapter.connect();
      await adapter.query("SELECT 1");
      await adapter.disconnect();

      // Should throw after disconnect
      await expect(adapter.query("SELECT 1")).rejects.toThrow(
        "Not connected. Call connect() first."
      );
    });

    it("should handle multiple connect/disconnect cycles", async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };
      adapter = new DuckDBAdapter(config);

      // First cycle
      await adapter.connect();
      const result1 = await adapter.query<{ n: number }>("SELECT 1 AS n");
      expect(result1[0].n).toBe(1);
      await adapter.disconnect();

      // Second cycle
      await adapter.connect();
      const result2 = await adapter.query<{ n: number }>("SELECT 2 AS n");
      expect(result2[0].n).toBe(2);
      await adapter.disconnect();
    });
  });

  describe("getDatabaseName", () => {
    it("should return database name for db config", () => {
      const config: DuckDBConnectionConfig = {
        type: "postgres",
        database: "mydb",
        host: "localhost",
        port: 5432,
        user: "user",
        password: "pass",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.getDatabaseName()).toBe("mydb");
    });

    it("should return path for file-based config", () => {
      const config: DuckDBConnectionConfig = {
        type: "sqlite",
        path: "/path/to/db.sqlite",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.getDatabaseName()).toBe("/path/to/db.sqlite");
    });

    it("should return unknown when neither set", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.getDatabaseName()).toBe("unknown");
    });
  });

  describe("getSourceAlias", () => {
    it("should return default alias", () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };
      adapter = new DuckDBAdapter(config);
      expect(adapter.getSourceAlias()).toBe("source");
    });
  });

  describe("DuckDB-specific features", () => {
    beforeEach(async () => {
      const config: DuckDBConnectionConfig = {
        type: "duckdb",
        path: ":memory:",
      };
      adapter = new DuckDBAdapter(config);
      await adapter.connect();
    });

    it("should support DuckDB aggregate functions", async () => {
      await adapter.run("CREATE TABLE sales (amount DECIMAL(10,2))");
      await adapter.run("INSERT INTO sales VALUES (100.50), (200.75), (50.25)");

      const result = await adapter.query<{ total: number; avg: number; count: bigint }>(
        "SELECT SUM(amount) as total, AVG(amount) as avg, COUNT(*) as count FROM sales"
      );

      expect(result).toHaveLength(1);
      expect(result[0].total).toBeCloseTo(351.5, 1);
      expect(result[0].avg).toBeCloseTo(117.17, 1);
      expect(Number(result[0].count)).toBe(3); // DuckDB returns BigInt for COUNT
    });

    it("should support window functions", async () => {
      await adapter.run("CREATE TABLE events (day INTEGER, value INTEGER)");
      await adapter.run("INSERT INTO events VALUES (1, 10), (2, 20), (3, 15)");

      const result = await adapter.query<{ day: number; running_sum: bigint }>(
        "SELECT day, SUM(value) OVER (ORDER BY day) as running_sum FROM events"
      );

      expect(result).toHaveLength(3);
      expect(Number(result[0].running_sum)).toBe(10); // DuckDB returns BigInt for window SUM
      expect(Number(result[1].running_sum)).toBe(30);
      expect(Number(result[2].running_sum)).toBe(45);
    });

    it("should support JSON operations", async () => {
      await adapter.run("CREATE TABLE json_data (data JSON)");
      await adapter.run(`INSERT INTO json_data VALUES ('{"name": "test", "value": 42}')`);

      const result = await adapter.query<{ name: string }>(
        "SELECT data->>'name' as name FROM json_data"
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("test");
    });

    it("should support date/time functions", async () => {
      const result = await adapter.query<{ today: string }>(
        "SELECT CURRENT_DATE::VARCHAR as today"
      );

      expect(result).toHaveLength(1);
      expect(result[0].today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
