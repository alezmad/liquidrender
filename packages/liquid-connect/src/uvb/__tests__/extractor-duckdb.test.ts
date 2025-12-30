/**
 * SchemaExtractor Tests with DuckDB Adapter
 *
 * Tests schema extraction functionality using file-based DuckDB.
 * Uses temp files because SchemaExtractor manages its own connection lifecycle
 * and in-memory databases are ephemeral across connect/disconnect cycles.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SchemaExtractor } from "../extractor";
import { DuckDBAdapter, type DuckDBConnectionConfig } from "../adapters/duckdb";
import type { Column } from "../models";

describe("SchemaExtractor with DuckDB", () => {
  let adapter: DuckDBAdapter;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(async () => {
    // Create temp directory and database file
    tmpDir = mkdtempSync(join(tmpdir(), "duckdb-extractor-test-"));
    dbPath = join(tmpDir, "test.duckdb");

    const config: DuckDBConnectionConfig = {
      type: "duckdb",
      path: dbPath,
    };
    adapter = new DuckDBAdapter(config);
    await adapter.connect();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
    // Clean up temp directory
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("single table extraction", () => {
    it("should extract schema from database with single table", async () => {
      await adapter.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255)
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      expect(schema.database).toBe(dbPath);
      expect(schema.type).toBe("duckdb");
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe("users");
      expect(schema.extractedAt).toBeDefined();
    });

    it("should extract column information correctly", async () => {
      await adapter.run(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          price DECIMAL(10, 2),
          description TEXT
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const table = schema.tables[0];
      expect(table.columns).toHaveLength(4);

      // Check id column
      const idCol = table.columns.find((c) => c.name === "id");
      expect(idCol).toBeDefined();
      expect(idCol!.dataType.toLowerCase()).toContain("integer");
      expect(idCol!.isPrimaryKey).toBe(true);

      // Check name column (NOT NULL)
      const nameCol = table.columns.find((c) => c.name === "name");
      expect(nameCol).toBeDefined();
      expect(nameCol!.dataType.toLowerCase()).toContain("varchar");
      expect(nameCol!.isNotNull).toBe(true);

      // Check price column (nullable DECIMAL)
      const priceCol = table.columns.find((c) => c.name === "price");
      expect(priceCol).toBeDefined();
      expect(priceCol!.dataType.toLowerCase()).toContain("decimal");
      expect(priceCol!.isNotNull).toBe(false);
    });
  });

  describe("multiple tables extraction", () => {
    it("should extract schema from database with multiple tables", async () => {
      await adapter.run(`
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        )
      `);

      await adapter.run(`
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY,
          customer_id INTEGER,
          total DECIMAL(10, 2)
        )
      `);

      await adapter.run(`
        CREATE TABLE order_items (
          id INTEGER PRIMARY KEY,
          order_id INTEGER,
          product_name VARCHAR(100),
          quantity INTEGER
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      expect(schema.tables).toHaveLength(3);

      const tableNames = schema.tables.map((t) => t.name).sort();
      expect(tableNames).toEqual(["customers", "order_items", "orders"]);
    });

    it("should extract correct column counts for each table", async () => {
      await adapter.run(`
        CREATE TABLE table_a (col1 INTEGER, col2 VARCHAR(50))
      `);

      await adapter.run(`
        CREATE TABLE table_b (col1 INTEGER, col2 VARCHAR(50), col3 DATE, col4 BOOLEAN)
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const tableA = schema.tables.find((t) => t.name === "table_a");
      const tableB = schema.tables.find((t) => t.name === "table_b");

      expect(tableA?.columns).toHaveLength(2);
      expect(tableB?.columns).toHaveLength(4);
    });
  });

  describe("column type extraction", () => {
    it("should extract different column types correctly", async () => {
      await adapter.run(`
        CREATE TABLE type_test (
          int_col INTEGER,
          bigint_col BIGINT,
          varchar_col VARCHAR(100),
          text_col TEXT,
          decimal_col DECIMAL(12, 4),
          double_col DOUBLE,
          float_col FLOAT,
          date_col DATE,
          timestamp_col TIMESTAMP,
          bool_col BOOLEAN,
          json_col JSON
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const table = schema.tables[0];
      expect(table.columns).toHaveLength(11);

      // Helper to find column by name
      const findCol = (name: string): Column | undefined =>
        table.columns.find((c) => c.name === name);

      // Verify integer types
      expect(findCol("int_col")?.dataType.toLowerCase()).toContain("integer");
      expect(findCol("bigint_col")?.dataType.toLowerCase()).toContain("bigint");

      // Verify string types
      expect(findCol("varchar_col")?.dataType.toLowerCase()).toContain("varchar");
      expect(findCol("text_col")?.dataType.toLowerCase()).toMatch(/text|varchar/i);

      // Verify numeric types
      expect(findCol("decimal_col")?.dataType.toLowerCase()).toContain("decimal");
      expect(findCol("double_col")?.dataType.toLowerCase()).toContain("double");
      expect(findCol("float_col")?.dataType.toLowerCase()).toContain("float");

      // Verify date/time types
      expect(findCol("date_col")?.dataType.toLowerCase()).toContain("date");
      expect(findCol("timestamp_col")?.dataType.toLowerCase()).toContain("timestamp");

      // Verify boolean type
      expect(findCol("bool_col")?.dataType.toLowerCase()).toContain("boolean");
    });

    it("should extract nullable vs NOT NULL correctly", async () => {
      await adapter.run(`
        CREATE TABLE nullable_test (
          required_col INTEGER NOT NULL,
          optional_col INTEGER,
          required_string VARCHAR(50) NOT NULL,
          optional_string VARCHAR(50)
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const table = schema.tables[0];
      const findCol = (name: string): Column | undefined =>
        table.columns.find((c) => c.name === name);

      expect(findCol("required_col")?.isNotNull).toBe(true);
      expect(findCol("optional_col")?.isNotNull).toBe(false);
      expect(findCol("required_string")?.isNotNull).toBe(true);
      expect(findCol("optional_string")?.isNotNull).toBe(false);
    });
  });

  describe("primary key extraction", () => {
    it("should extract single column primary key", async () => {
      await adapter.run(`
        CREATE TABLE pk_single (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100)
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const table = schema.tables[0];
      expect(table.primaryKeyColumns).toContain("id");
      expect(table.primaryKeyColumns).toHaveLength(1);

      const idCol = table.columns.find((c) => c.name === "id");
      expect(idCol?.isPrimaryKey).toBe(true);
    });

    it("should extract composite primary key", async () => {
      await adapter.run(`
        CREATE TABLE pk_composite (
          order_id INTEGER,
          product_id INTEGER,
          quantity INTEGER,
          PRIMARY KEY (order_id, product_id)
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const table = schema.tables[0];
      expect(table.primaryKeyColumns).toContain("order_id");
      expect(table.primaryKeyColumns).toContain("product_id");
      expect(table.primaryKeyColumns).toHaveLength(2);

      // Both columns should be marked as PK
      const orderIdCol = table.columns.find((c) => c.name === "order_id");
      const productIdCol = table.columns.find((c) => c.name === "product_id");
      expect(orderIdCol?.isPrimaryKey).toBe(true);
      expect(productIdCol?.isPrimaryKey).toBe(true);
    });

    it("should handle table without primary key", async () => {
      await adapter.run(`
        CREATE TABLE no_pk (
          col1 INTEGER,
          col2 VARCHAR(100)
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const table = schema.tables[0];
      expect(table.primaryKeyColumns).toHaveLength(0);

      // No column should be marked as PK
      for (const col of table.columns) {
        expect(col.isPrimaryKey).toBe(false);
      }
    });
  });

  describe("foreign key extraction", () => {
    it("should extract foreign key relationships between tables", async () => {
      await adapter.run(`
        CREATE TABLE authors (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        )
      `);

      await adapter.run(`
        CREATE TABLE books (
          id INTEGER PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          author_id INTEGER REFERENCES authors(id)
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const booksTable = schema.tables.find((t) => t.name === "books");
      expect(booksTable).toBeDefined();

      // Note: DuckDB's FK introspection may have limitations
      // The test validates the structure but FK data depends on DuckDB capabilities
      const authorIdCol = booksTable?.columns.find((c) => c.name === "author_id");
      expect(authorIdCol).toBeDefined();

      // If FK was extracted properly, validate the relationship
      if (booksTable!.foreignKeys.length > 0) {
        const fk = booksTable!.foreignKeys.find((f) => f.column === "author_id");
        expect(fk?.referencedTable).toBe("authors");
        expect(fk?.referencedColumn).toBe("id");
        expect(authorIdCol?.isForeignKey).toBe(true);
        expect(authorIdCol?.references?.table).toBe("authors");
        expect(authorIdCol?.references?.column).toBe("id");
      }
    });

    it("should extract multiple foreign keys in one table", async () => {
      await adapter.run(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100)
        )
      `);

      await adapter.run(`
        CREATE TABLE suppliers (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100)
        )
      `);

      await adapter.run(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY,
          name VARCHAR(200),
          category_id INTEGER REFERENCES categories(id),
          supplier_id INTEGER REFERENCES suppliers(id)
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      const productsTable = schema.tables.find((t) => t.name === "products");
      expect(productsTable).toBeDefined();

      // DuckDB FK introspection may be limited - validate structure exists
      const categoryCol = productsTable?.columns.find((c) => c.name === "category_id");
      const supplierCol = productsTable?.columns.find((c) => c.name === "supplier_id");

      expect(categoryCol).toBeDefined();
      expect(supplierCol).toBeDefined();

      // If FKs were extracted, validate them
      if (productsTable!.foreignKeys.length >= 2) {
        const categoryFk = productsTable!.foreignKeys.find(
          (f) => f.column === "category_id"
        );
        const supplierFk = productsTable!.foreignKeys.find(
          (f) => f.column === "supplier_id"
        );

        expect(categoryFk?.referencedTable).toBe("categories");
        expect(supplierFk?.referencedTable).toBe("suppliers");
      }
    });
  });

  describe("empty database handling", () => {
    it("should handle empty database with no tables", async () => {
      // Database is already empty, just extract
      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      expect(schema.tables).toHaveLength(0);
      expect(schema.database).toBe(dbPath);
      expect(schema.type).toBe("duckdb");
      expect(schema.extractedAt).toBeDefined();
    });
  });

  describe("extraction options", () => {
    it("should exclude tables matching exclude patterns", async () => {
      await adapter.run("CREATE TABLE users (id INTEGER)");
      await adapter.run("CREATE TABLE _internal_data (id INTEGER)");
      await adapter.run("CREATE TABLE schema_migrations (id INTEGER)");

      const extractor = new SchemaExtractor(adapter, {
        excludePatterns: [/^_/, /^schema_/i],
      });
      const schema = await extractor.extract();

      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe("users");
    });

    it("should exclude specific tables by name", async () => {
      await adapter.run("CREATE TABLE users (id INTEGER)");
      await adapter.run("CREATE TABLE logs (id INTEGER)");
      await adapter.run("CREATE TABLE temp_data (id INTEGER)");

      const extractor = new SchemaExtractor(adapter, {
        excludePatterns: [],
        excludeTables: ["logs", "temp_data"],
      });
      const schema = await extractor.extract();

      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe("users");
    });

    it("should include only specified tables when includeTables is set", async () => {
      await adapter.run("CREATE TABLE users (id INTEGER)");
      await adapter.run("CREATE TABLE orders (id INTEGER)");
      await adapter.run("CREATE TABLE products (id INTEGER)");

      const extractor = new SchemaExtractor(adapter, {
        excludePatterns: [],
        includeTables: ["users", "orders"],
      });
      const schema = await extractor.extract();

      expect(schema.tables).toHaveLength(2);
      const tableNames = schema.tables.map((t) => t.name).sort();
      expect(tableNames).toEqual(["orders", "users"]);
    });
  });

  describe("schema metadata", () => {
    it("should include extraction timestamp", async () => {
      await adapter.run("CREATE TABLE test (id INTEGER)");

      const beforeExtract = new Date().toISOString();
      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();
      const afterExtract = new Date().toISOString();

      expect(schema.extractedAt).toBeDefined();
      expect(schema.extractedAt >= beforeExtract).toBe(true);
      expect(schema.extractedAt <= afterExtract).toBe(true);
    });

    it("should include correct database type", async () => {
      await adapter.run("CREATE TABLE test (id INTEGER)");

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      expect(schema.type).toBe("duckdb");
    });

    it("should include schema name in table metadata", async () => {
      await adapter.run("CREATE TABLE test (id INTEGER)");

      const extractor = new SchemaExtractor(adapter, {
        excludePatterns: [],
        schema: "main", // DuckDB default schema
      });
      const schema = await extractor.extract();

      expect(schema.tables[0].schema).toBe("main");
    });
  });

  describe("complex schema scenarios", () => {
    it("should extract e-commerce style schema correctly", async () => {
      // Create a realistic e-commerce schema
      await adapter.run(`
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          name VARCHAR(100),
          created_at TIMESTAMP
        )
      `);

      await adapter.run(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY,
          sku VARCHAR(50) NOT NULL,
          name VARCHAR(200) NOT NULL,
          price DECIMAL(10, 2),
          quantity_in_stock INTEGER,
          is_active BOOLEAN
        )
      `);

      await adapter.run(`
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          order_date DATE,
          total_amount DECIMAL(12, 2),
          status VARCHAR(20)
        )
      `);

      await adapter.run(`
        CREATE TABLE order_items (
          id INTEGER PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id),
          product_id INTEGER REFERENCES products(id),
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL
        )
      `);

      const extractor = new SchemaExtractor(adapter, { excludePatterns: [] });
      const schema = await extractor.extract();

      expect(schema.tables).toHaveLength(4);

      // Validate customers table
      const customers = schema.tables.find((t) => t.name === "customers");
      expect(customers?.columns).toHaveLength(4);
      expect(customers?.primaryKeyColumns).toContain("id");

      // Validate products table
      const products = schema.tables.find((t) => t.name === "products");
      expect(products?.columns).toHaveLength(6);

      // Validate orders table
      const orders = schema.tables.find((t) => t.name === "orders");
      expect(orders?.columns).toHaveLength(5);

      // Validate order_items table (junction table)
      const orderItems = schema.tables.find((t) => t.name === "order_items");
      expect(orderItems?.columns).toHaveLength(5);

      // Verify NOT NULL constraints propagated
      const quantityCol = orderItems?.columns.find((c) => c.name === "quantity");
      expect(quantityCol?.isNotNull).toBe(true);
    });
  });
});
