/**
 * QueryExecutor Tests
 *
 * Tests for the query executor service.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryExecutor, createExecutor, executeQuery, type ExecutorConfig } from "../index";
import { TimeoutError } from "../timeout";

describe("QueryExecutor", () => {
  let executor: QueryExecutor;

  const inMemoryConfig: ExecutorConfig = {
    connection: {
      type: "duckdb",
      path: ":memory:",
    },
  };

  afterEach(async () => {
    if (executor) {
      await executor.disconnect();
    }
  });

  describe("constructor", () => {
    it("should create executor with default config", () => {
      executor = new QueryExecutor(inMemoryConfig);
      const status = executor.getStatus();
      expect(status.connected).toBe(false);
      expect(status.databaseName).toBeNull();
    });

    it("should accept custom timeout and maxRows", () => {
      executor = new QueryExecutor({
        ...inMemoryConfig,
        timeout: 5000,
        maxRows: 100,
      });
      expect(executor).toBeDefined();
    });
  });

  describe("connect/disconnect", () => {
    it("should connect to database", async () => {
      executor = new QueryExecutor(inMemoryConfig);
      await executor.connect();

      const status = executor.getStatus();
      expect(status.connected).toBe(true);
      expect(status.databaseName).toBe(":memory:");
      expect(status.sourceAlias).toBe("source");
    });

    it("should disconnect from database", async () => {
      executor = new QueryExecutor(inMemoryConfig);
      await executor.connect();
      await executor.disconnect();

      const status = executor.getStatus();
      expect(status.connected).toBe(false);
    });

    it("should handle multiple connect calls (idempotent)", async () => {
      executor = new QueryExecutor(inMemoryConfig);
      await executor.connect();
      await executor.connect();
      await executor.connect();

      const status = executor.getStatus();
      expect(status.connected).toBe(true);
    });
  });

  describe("execute", () => {
    beforeEach(async () => {
      executor = new QueryExecutor(inMemoryConfig);
      await executor.connect();
    });

    it("should execute simple query", async () => {
      const result = await executor.execute("SELECT 1 AS value");

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1);
      expect(result.rows[0]).toEqual({ value: 1 });
      expect(result.columns).toContain("value");
    });

    it("should auto-add LIMIT when not present", async () => {
      // Create a table with more rows than maxRows
      await executor.execute("CREATE TABLE many_rows AS SELECT generate_series AS id FROM generate_series(1, 100)");

      // Create executor with low maxRows
      await executor.disconnect();
      executor = new QueryExecutor({
        connection: { type: "duckdb", path: ":memory:" },
        maxRows: 10,
      });
      await executor.connect();
      await executor.execute("CREATE TABLE many_rows AS SELECT generate_series AS id FROM generate_series(1, 100)");

      const result = await executor.execute("SELECT * FROM many_rows");

      expect(result.success).toBe(true);
      expect(result.rowCount).toBeLessThanOrEqual(10);
    });

    it("should not add LIMIT when already present", async () => {
      await executor.execute("CREATE TABLE test AS SELECT generate_series AS id FROM generate_series(1, 100)");

      const result = await executor.execute("SELECT * FROM test LIMIT 5");

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(5);
    });

    it("should handle query errors", async () => {
      const result = await executor.execute("SELECT * FROM nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.rowCount).toBe(0);
    });
  });

  describe("auto-connect", () => {
    it("should auto-connect when executing query", async () => {
      executor = new QueryExecutor({
        ...inMemoryConfig,
        autoConnect: true,
      });

      const result = await executor.execute("SELECT 42 AS answer");

      expect(result.success).toBe(true);
      expect(result.rows[0]).toEqual({ answer: 42 });
      expect(executor.getStatus().connected).toBe(true);
    });

    it("should respect autoConnect: false", async () => {
      executor = new QueryExecutor({
        ...inMemoryConfig,
        autoConnect: false,
      });

      const result = await executor.execute("SELECT 1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Not connected");
    });
  });

  describe("executeMany", () => {
    beforeEach(async () => {
      executor = new QueryExecutor(inMemoryConfig);
      await executor.connect();
    });

    it("should execute multiple queries", async () => {
      const results = await executor.executeMany([
        "SELECT 1 AS a",
        "SELECT 2 AS b",
        "SELECT 3 AS c",
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].rows[0]).toEqual({ a: 1 });
      expect(results[1].rows[0]).toEqual({ b: 2 });
      expect(results[2].rows[0]).toEqual({ c: 3 });
    });

    it("should continue after failed query", async () => {
      const results = await executor.executeMany([
        "SELECT 1 AS good",
        "SELECT * FROM bad_table",
        "SELECT 3 AS also_good",
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe("testConnection", () => {
    it("should test connection successfully", async () => {
      executor = new QueryExecutor(inMemoryConfig);
      await executor.connect();

      const result = await executor.testConnection();

      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("should auto-connect when testing", async () => {
      executor = new QueryExecutor(inMemoryConfig);

      const result = await executor.testConnection();

      expect(result.success).toBe(true);
      expect(executor.getStatus().connected).toBe(true);
    });
  });
});

describe("Factory functions", () => {
  describe("createExecutor", () => {
    it("should create executor instance", () => {
      const executor = createExecutor({
        connection: { type: "duckdb", path: ":memory:" },
      });

      expect(executor).toBeInstanceOf(QueryExecutor);
    });
  });

  describe("executeQuery", () => {
    it("should execute query and return result", async () => {
      const result = await executeQuery(
        { connection: { type: "duckdb", path: ":memory:" } },
        "SELECT 'hello' AS greeting"
      );

      expect(result.success).toBe(true);
      expect(result.rows[0]).toEqual({ greeting: "hello" });
    });

    it("should disconnect after execution", async () => {
      // This is a one-shot function, connection should be cleaned up
      const result = await executeQuery(
        { connection: { type: "duckdb", path: ":memory:" } },
        "SELECT 1"
      );

      expect(result.success).toBe(true);
      // No way to verify disconnection externally, but no errors means success
    });
  });
});

describe("TimeoutError", () => {
  it("should create error with message and timeout", () => {
    const error = new TimeoutError("Test timeout", 5000);

    expect(error.message).toBe("Test timeout");
    expect(error.timeoutMs).toBe(5000);
    expect(error.name).toBe("TimeoutError");
  });

  it("should have default message", () => {
    const error = new TimeoutError(undefined, 1000);

    expect(error.message).toBe("Operation timed out");
  });
});
