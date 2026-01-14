import { describe, it, expect } from "vitest";
import { transformToDetectedVocabulary } from "./transforms";
import type { SelectKnosiaVocabularyItem } from "@turbostarter/db/schema";

// =============================================================================
// Test Fixtures
// =============================================================================

const createVocabItem = (
  overrides: Partial<SelectKnosiaVocabularyItem>
): SelectKnosiaVocabularyItem => ({
  id: "test-id",
  workspaceId: "ws-1",
  orgId: "org-1",
  canonicalName: "Test Item",
  abbreviation: null,
  slug: "test_item",
  aliases: [],
  type: "metric",
  category: null,
  semantics: null,
  currentVersion: 1,
  status: "approved",
  governance: null,
  aggregation: "SUM",
  aggregationConfidence: 85,
  cardinality: null,
  isPrimaryTime: false,
  joinsTo: null,
  suggestedForRoles: null,
  definition: {
    sourceTables: ["orders"],
    sourceColumn: "amount",
    descriptionHuman: "Test description",
  },
  // KPI-specific fields
  formulaSql: null,
  formulaHuman: null,
  confidence: null,
  feasible: true,
  source: null,
  sourceVocabularyIds: null,
  executionCount: 0,
  lastExecutedAt: null,
  lastExecutionResult: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe("transformToDetectedVocabulary", () => {
  describe("basic structure", () => {
    it("should return empty arrays when given empty input", () => {
      const result = transformToDetectedVocabulary([]);

      expect(result).toEqual({
        entities: [],
        metrics: [],
        dimensions: [],
        timeFields: [],
        filters: [],
        relationships: [],
      });
    });

    it("should always return empty entities and relationships", () => {
      const items = [createVocabItem({ type: "metric" })];
      const result = transformToDetectedVocabulary(items);

      expect(result.entities).toEqual([]);
      expect(result.relationships).toEqual([]);
    });
  });

  describe("metric transformation", () => {
    it("should transform metric items correctly", () => {
      const items = [
        createVocabItem({
          type: "metric",
          slug: "total_revenue",
          canonicalName: "Total Revenue",
          aggregation: "SUM",
          aggregationConfidence: 90,
          definition: {
            sourceTables: ["orders"],
            sourceColumn: "amount",
          },
        }),
      ];

      const result = transformToDetectedVocabulary(items);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0]).toEqual({
        id: "total_revenue",
        name: "total_revenue",
        table: "orders",
        column: "amount",
        dataType: "decimal",
        aggregation: "SUM",
        certainty: 90,
        suggestedDisplayName: "Total Revenue",
        expression: undefined,
      });
    });

    it("should include formulaSql as expression for computed metrics", () => {
      const items = [
        createVocabItem({
          type: "metric",
          slug: "profit_margin",
          definition: {
            sourceTables: ["orders"],
            sourceColumn: "amount",
            formulaSql: "(revenue - cost) / revenue * 100",
          },
        }),
      ];

      const result = transformToDetectedVocabulary(items);

      expect(result.metrics[0]?.expression).toBe(
        "(revenue - cost) / revenue * 100"
      );
    });

    it("should map all aggregation types correctly", () => {
      const aggregations = ["SUM", "AVG", "COUNT", "MIN", "MAX"] as const;

      for (const agg of aggregations) {
        const items = [createVocabItem({ type: "metric", aggregation: agg })];
        const result = transformToDetectedVocabulary(items);
        expect(result.metrics[0]?.aggregation).toBe(agg);
      }
    });

    it("should default to SUM for null aggregation", () => {
      const items = [createVocabItem({ type: "metric", aggregation: null })];
      const result = transformToDetectedVocabulary(items);
      expect(result.metrics[0]?.aggregation).toBe("SUM");
    });

    it("should use slug as column fallback when sourceColumn is missing", () => {
      const items = [
        createVocabItem({
          type: "metric",
          slug: "order_count",
          definition: { sourceTables: ["orders"] },
        }),
      ];

      const result = transformToDetectedVocabulary(items);
      expect(result.metrics[0]?.column).toBe("order_count");
    });

    it("should use empty string for table when sourceTables is missing", () => {
      const items = [
        createVocabItem({
          type: "metric",
          definition: null,
        }),
      ];

      const result = transformToDetectedVocabulary(items);
      expect(result.metrics[0]?.table).toBe("");
    });
  });

  describe("dimension transformation", () => {
    it("should transform dimension items correctly", () => {
      const items = [
        createVocabItem({
          type: "dimension",
          slug: "region",
          canonicalName: "Region",
          cardinality: 50,
          aggregationConfidence: 95,
          definition: {
            sourceTables: ["customers"],
            sourceColumn: "region_name",
          },
        }),
      ];

      const result = transformToDetectedVocabulary(items);

      expect(result.dimensions).toHaveLength(1);
      expect(result.dimensions[0]).toEqual({
        id: "region",
        name: "region",
        table: "customers",
        column: "region_name",
        dataType: "varchar",
        cardinality: 50,
        certainty: 95,
      });
    });

    it("should handle null cardinality", () => {
      const items = [
        createVocabItem({
          type: "dimension",
          cardinality: null,
        }),
      ];

      const result = transformToDetectedVocabulary(items);
      expect(result.dimensions[0]?.cardinality).toBeUndefined();
    });
  });

  describe("time field transformation", () => {
    it("should transform isPrimaryTime items to timeFields", () => {
      const items = [
        createVocabItem({
          type: "dimension",
          slug: "order_date",
          isPrimaryTime: true,
          aggregationConfidence: 100,
          definition: {
            sourceTables: ["orders"],
            sourceColumn: "created_at",
          },
        }),
      ];

      const result = transformToDetectedVocabulary(items);

      expect(result.timeFields).toHaveLength(1);
      expect(result.timeFields[0]).toEqual({
        id: "order_date",
        name: "order_date",
        table: "orders",
        column: "created_at",
        dataType: "timestamp",
        isPrimaryCandidate: true,
        certainty: 100,
      });
    });

    it("should only include items with isPrimaryTime=true", () => {
      const items = [
        createVocabItem({ slug: "not_time", isPrimaryTime: false }),
        createVocabItem({ slug: "is_time", isPrimaryTime: true }),
      ];

      const result = transformToDetectedVocabulary(items);

      expect(result.timeFields).toHaveLength(1);
      expect(result.timeFields[0]?.id).toBe("is_time");
    });
  });

  describe("filter transformation", () => {
    it("should transform event type items to filters", () => {
      const items = [
        createVocabItem({
          type: "event",
          slug: "is_active",
          aggregationConfidence: 80,
          definition: {
            sourceTables: ["users"],
            sourceColumn: "active",
            formulaSql: "status = 'active'",
          },
        }),
      ];

      const result = transformToDetectedVocabulary(items);

      expect(result.filters).toHaveLength(1);
      expect(result.filters[0]).toEqual({
        id: "is_active",
        name: "is_active",
        table: "users",
        column: "active",
        dataType: "boolean",
        certainty: 80,
        expression: "status = 'active'",
      });
    });
  });

  describe("mixed item types", () => {
    it("should correctly categorize items by type", () => {
      const items = [
        createVocabItem({ type: "metric", slug: "revenue" }),
        createVocabItem({ type: "metric", slug: "orders" }),
        createVocabItem({ type: "dimension", slug: "region" }),
        createVocabItem({ type: "dimension", slug: "category" }),
        createVocabItem({ type: "dimension", slug: "date", isPrimaryTime: true }),
        createVocabItem({ type: "event", slug: "is_paid" }),
        createVocabItem({ type: "entity", slug: "customer" }), // Should be ignored
      ];

      const result = transformToDetectedVocabulary(items);

      expect(result.metrics).toHaveLength(2);
      expect(result.dimensions).toHaveLength(3);
      expect(result.timeFields).toHaveLength(1);
      expect(result.filters).toHaveLength(1);
    });
  });

  describe("confidence handling", () => {
    it("should use aggregationConfidence as certainty", () => {
      const items = [
        createVocabItem({
          type: "metric",
          aggregationConfidence: 75,
        }),
      ];

      const result = transformToDetectedVocabulary(items);
      expect(result.metrics[0]?.certainty).toBe(75);
    });

    it("should default to 80 when aggregationConfidence is null", () => {
      const items = [
        createVocabItem({
          type: "metric",
          aggregationConfidence: null,
        }),
      ];

      const result = transformToDetectedVocabulary(items);
      expect(result.metrics[0]?.certainty).toBe(80);
    });
  });
});
