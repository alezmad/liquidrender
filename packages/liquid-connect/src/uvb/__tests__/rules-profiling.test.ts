/**
 * Unit tests for profiling-enhanced vocabulary detection (V2)
 */

import { describe, it, expect } from "vitest";
import { applyHardRules } from "../rules";
import { extractProfilingData } from "../models";
import type { ExtractedSchema, ProfilingData, ProfiledSchema } from "../models";

describe("applyHardRules() with profiling data", () => {
  describe("Metric detection with cardinality", () => {
    it("should skip high-cardinality integer columns (IDs)", () => {
      const schema: ExtractedSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [
          {
            name: "users",
            schema: "public",
            primaryKeyColumns: ["user_id"],
            foreignKeys: [],
            columns: [
              {
                name: "user_id",
                dataType: "integer",
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
              },
              {
                name: "total_orders",
                dataType: "integer",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
              },
            ],
          },
        ],
        extractedAt: new Date().toISOString(),
      };

      const profilingData: ProfilingData = {
        tableProfiles: {
          users: {
            tableName: "users",
            rowCountEstimate: 10000,
            tableSizeBytes: 1000000,
            samplingRate: 1.0,
            emptyColumnCount: 0,
            sparseColumnCount: 0,
          },
        },
        columnProfiles: {
          "users.user_id": {
            columnName: "user_id",
            dataType: "integer",
            nullCount: 0,
            nullPercentage: 0,
            numeric: {
              distinctCount: 9800,
              min: 1,
              max: 10000,
            },
          },
          "users.total_orders": {
            columnName: "total_orders",
            dataType: "integer",
            nullCount: 500,
            nullPercentage: 5,
            numeric: {
              distinctCount: 45,
              min: 0,
              max: 150,
            },
          },
        },
        profiledAt: new Date().toISOString(),
        samplingStrategy: "adaptive",
      };

      const result = applyHardRules(schema, { profilingData });

      // user_id should be skipped (98% unique - high cardinality)
      expect(
        result.detected.metrics.find((m) => m.column === "user_id" && m.aggregation === "SUM")
      ).toBeUndefined();

      // total_orders should be detected as SUM metric (low cardinality)
      const totalOrders = result.detected.metrics.find((m) => m.column === "total_orders");
      expect(totalOrders).toBeDefined();
      expect(totalOrders?.aggregation).toBe("SUM");
    });

    it("should use COUNT_DISTINCT for low-cardinality integers", () => {
      const schema: ExtractedSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [
          {
            name: "orders",
            schema: "public",
            primaryKeyColumns: ["order_id"],
            foreignKeys: [],
            columns: [
              {
                name: "order_id",
                dataType: "integer",
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
              },
              {
                name: "quantity",
                dataType: "integer",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
              },
            ],
          },
        ],
        extractedAt: new Date().toISOString(),
      };

      const profilingData: ProfilingData = {
        tableProfiles: {
          orders: {
            tableName: "orders",
            rowCountEstimate: 1000,
            tableSizeBytes: 100000,
            samplingRate: 1.0,
            emptyColumnCount: 0,
            sparseColumnCount: 0,
          },
        },
        columnProfiles: {
          "orders.quantity": {
            columnName: "quantity",
            dataType: "integer",
            nullCount: 0,
            nullPercentage: 0,
            numeric: {
              distinctCount: 5,
              min: 1,
              max: 5,
            },
          },
        },
        profiledAt: new Date().toISOString(),
        samplingStrategy: "adaptive",
      };

      const result = applyHardRules(schema, { profilingData });

      const quantity = result.detected.metrics.find((m) => m.column === "quantity");
      expect(quantity?.aggregation).toBe("COUNT_DISTINCT");
    });
  });

  describe("Dimension detection with cardinality", () => {
    it("should classify enums with high coverage", () => {
      const schema: ExtractedSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [
          {
            name: "orders",
            schema: "public",
            primaryKeyColumns: ["order_id"],
            foreignKeys: [],
            columns: [
              {
                name: "order_id",
                dataType: "integer",
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
              },
              {
                name: "status",
                dataType: "varchar(50)",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
                charMaxLength: 50,
              },
            ],
          },
        ],
        extractedAt: new Date().toISOString(),
      };

      const profilingData: ProfilingData = {
        tableProfiles: {
          orders: {
            tableName: "orders",
            rowCountEstimate: 1000,
            tableSizeBytes: 100000,
            samplingRate: 1.0,
            emptyColumnCount: 0,
            sparseColumnCount: 0,
          },
        },
        columnProfiles: {
          "orders.status": {
            columnName: "status",
            dataType: "varchar(50)",
            nullCount: 0,
            nullPercentage: 0,
            categorical: {
              cardinality: 5,
              distinctCount: 5,
              isHighCardinality: false,
              isLowCardinality: true,
              possiblyUnique: false,
              topValues: [
                { value: "pending", count: 500, percentage: 50 },
                { value: "active", count: 300, percentage: 30 },
                { value: "completed", count: 200, percentage: 20 },
              ],
            },
          },
        },
        profiledAt: new Date().toISOString(),
        samplingStrategy: "adaptive",
      };

      const result = applyHardRules(schema, { profilingData });

      const dimension = result.detected.dimensions.find((d) => d.column === "status");
      expect(dimension?.type).toBe("enum");
      expect(dimension?.certainty).toBeGreaterThan(0.9);
    });

    it("should detect free-text with high cardinality", () => {
      const schema: ExtractedSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [
          {
            name: "products",
            schema: "public",
            primaryKeyColumns: ["product_id"],
            foreignKeys: [],
            columns: [
              {
                name: "product_id",
                dataType: "integer",
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
              },
              {
                name: "name",
                dataType: "varchar(255)",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
                charMaxLength: 255,
              },
            ],
          },
        ],
        extractedAt: new Date().toISOString(),
      };

      const profilingData: ProfilingData = {
        tableProfiles: {
          products: {
            tableName: "products",
            rowCountEstimate: 5000,
            tableSizeBytes: 500000,
            samplingRate: 1.0,
            emptyColumnCount: 0,
            sparseColumnCount: 0,
          },
        },
        columnProfiles: {
          "products.name": {
            columnName: "name",
            dataType: "varchar(255)",
            nullCount: 0,
            nullPercentage: 0,
            categorical: {
              cardinality: 5000,
              distinctCount: 5000,
              isHighCardinality: true,
              isLowCardinality: false,
              possiblyUnique: true,
              topValues: [],
            },
          },
        },
        profiledAt: new Date().toISOString(),
        samplingStrategy: "adaptive",
      };

      const result = applyHardRules(schema, { profilingData });

      const dimension = result.detected.dimensions.find((d) => d.column === "name");
      expect(dimension?.type).toBe("free-text");
      expect(dimension?.certainty).toBeLessThan(0.7);
    });
  });

  describe("Required field detection", () => {
    it("should detect fields with null% < 5%", () => {
      const schema: ExtractedSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [
          {
            name: "users",
            schema: "public",
            primaryKeyColumns: ["user_id"],
            foreignKeys: [],
            columns: [
              {
                name: "user_id",
                dataType: "integer",
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
              },
              {
                name: "email",
                dataType: "varchar(255)",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
                charMaxLength: 255,
              },
              {
                name: "phone",
                dataType: "varchar(20)",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
                charMaxLength: 20,
              },
            ],
          },
        ],
        extractedAt: new Date().toISOString(),
      };

      const profilingData: ProfilingData = {
        tableProfiles: {
          users: {
            tableName: "users",
            rowCountEstimate: 1000,
            tableSizeBytes: 100000,
            samplingRate: 1.0,
            emptyColumnCount: 0,
            sparseColumnCount: 1,
          },
        },
        columnProfiles: {
          "users.email": {
            columnName: "email",
            dataType: "varchar(255)",
            nullCount: 0,
            nullPercentage: 0,
          },
          "users.phone": {
            columnName: "phone",
            dataType: "varchar(20)",
            nullCount: 600,
            nullPercentage: 60,
          },
        },
        profiledAt: new Date().toISOString(),
        samplingStrategy: "adaptive",
      };

      const result = applyHardRules(schema, { profilingData });

      expect(result.detected.requiredFields).toContainEqual(
        expect.objectContaining({ column: "email", certainty: 1.0 })
      );

      expect(
        result.detected.requiredFields?.find((f) => f.column === "phone")
      ).toBeUndefined();
    });
  });

  describe("Time field freshness", () => {
    it("should mark stale time fields with low certainty", () => {
      const schema: ExtractedSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [
          {
            name: "logs",
            schema: "public",
            primaryKeyColumns: ["log_id"],
            foreignKeys: [],
            columns: [
              {
                name: "log_id",
                dataType: "integer",
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
              },
              {
                name: "created_at",
                dataType: "timestamp",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
              },
              {
                name: "archived_at",
                dataType: "timestamp",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
              },
            ],
          },
        ],
        extractedAt: new Date().toISOString(),
      };

      const profilingData: ProfilingData = {
        tableProfiles: {
          logs: {
            tableName: "logs",
            rowCountEstimate: 1000,
            tableSizeBytes: 100000,
            samplingRate: 1.0,
            emptyColumnCount: 0,
            sparseColumnCount: 0,
          },
        },
        columnProfiles: {
          "logs.created_at": {
            columnName: "created_at",
            dataType: "timestamp",
            nullCount: 0,
            nullPercentage: 0,
            temporal: {
              min: new Date("2025-01-01"),
              max: new Date("2025-12-31"),
              spanDays: 365,
              hasTime: true,
              uniqueDates: 365,
              daysSinceLatest: 1,
            },
          },
          "logs.archived_at": {
            columnName: "archived_at",
            dataType: "timestamp",
            nullCount: 500,
            nullPercentage: 50,
            temporal: {
              min: new Date("2024-01-01"),
              max: new Date("2024-06-30"),
              spanDays: 180,
              hasTime: true,
              uniqueDates: 180,
              daysSinceLatest: 90,
            },
          },
        },
        profiledAt: new Date().toISOString(),
        samplingStrategy: "adaptive",
      };

      const result = applyHardRules(schema, { profilingData });

      const fresh = result.detected.timeFields.find((t) => t.column === "created_at");
      const stale = result.detected.timeFields.find((t) => t.column === "archived_at");

      // created_at matches audit pattern (0.3 base certainty), but is not stale
      expect(fresh?.isStale).toBe(false);

      expect(stale?.certainty).toBe(0.3); // audit column AND stale
      expect(stale?.isStale).toBe(true);
      expect(stale?.daysSinceLatest).toBe(90);
    });
  });

  describe("Backward compatibility", () => {
    it("should work without profiling data (V1 behavior)", () => {
      const schema: ExtractedSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [
          {
            name: "users",
            schema: "public",
            primaryKeyColumns: ["user_id"],
            foreignKeys: [],
            columns: [
              {
                name: "user_id",
                dataType: "integer",
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
              },
              {
                name: "total_orders",
                dataType: "integer",
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: false,
              },
            ],
          },
        ],
        extractedAt: new Date().toISOString(),
      };

      const result = applyHardRules(schema); // No profiling data

      expect(result.detected.metrics).toBeDefined();
      expect(result.profilingUsed).toBe(false);
      expect(result.detected.requiredFields).toEqual([]);
      expect(result.detected.enumFields).toEqual([]);
    });
  });

  describe("extractProfilingData helper", () => {
    it("should flatten column profiles correctly", () => {
      const profiledSchema: ProfiledSchema = {
        database: "test",
        type: "postgres",
        schema: "public",
        tables: [],
        extractedAt: new Date().toISOString(),
        profiledAt: new Date().toISOString(),
        profilingDuration: 1000,
        samplingStrategy: "adaptive",
        tableProfiles: {
          users: {
            tableName: "users",
            rowCountEstimate: 1000,
            tableSizeBytes: 100000,
            samplingRate: 1.0,
            emptyColumnCount: 0,
            sparseColumnCount: 0,
          },
        },
        columnProfiles: {
          users: {
            user_id: {
              columnName: "user_id",
              dataType: "integer",
              nullCount: 0,
              nullPercentage: 0,
            },
            email: {
              columnName: "email",
              dataType: "varchar",
              nullCount: 10,
              nullPercentage: 1,
            },
          },
        },
      };

      const profilingData = extractProfilingData(profiledSchema);

      expect(profilingData.columnProfiles["users.user_id"]).toEqual(
        profiledSchema.columnProfiles.users.user_id
      );
      expect(profilingData.columnProfiles["users.email"]).toEqual(
        profiledSchema.columnProfiles.users.email
      );
      expect(profilingData.tableProfiles).toEqual(profiledSchema.tableProfiles);
      expect(profilingData.samplingStrategy).toBe("adaptive");
    });
  });
});
