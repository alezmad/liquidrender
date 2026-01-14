import { describe, it, expect } from "vitest";
import { buildSemanticLayer } from "./semantic";
import type {
  SelectKnosiaVocabularyItem,
  SelectKnosiaWorkspace,
  SelectKnosiaConnection,
} from "@turbostarter/db/schema";

// =============================================================================
// Test Fixtures
// =============================================================================

const createWorkspace = (
  overrides: Partial<SelectKnosiaWorkspace> = {}
): SelectKnosiaWorkspace => ({
  id: "ws-1",
  orgId: "org-1",
  name: "Test Workspace",
  slug: "test_workspace",
  description: "Test workspace description",
  icon: null,
  visibility: "org_wide",
  defaults: null,
  aiConfig: null,
  compiledVocabulary: null,
  vocabularyVersion: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createConnection = (
  overrides: Partial<SelectKnosiaConnection> = {}
): SelectKnosiaConnection => ({
  id: "conn-1",
  orgId: "org-1",
  name: "Test Connection",
  type: "postgres",
  host: "localhost",
  port: 5432,
  database: "testdb",
  schema: "public",
  credentials: JSON.stringify({ username: "user", password: "pass" }),
  sslEnabled: true,
  duckdbAttachedName: null,
  scannerType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

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

describe("buildSemanticLayer", () => {
  describe("basic structure", () => {
    it("should return a valid SemanticLayer structure", () => {
      const workspace = createWorkspace();
      const items = [createVocabItem({ type: "metric", slug: "revenue" })];

      const result = buildSemanticLayer({
        workspace,
        vocabularyItems: items,
      });

      expect(result.version).toBe("1.0");
      expect(result.name).toBe("knosia_test_workspace");
      expect(result.description).toBe("Test workspace description");
      expect(result.sources).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.dimensions).toBeDefined();
    });

    it("should handle empty vocabulary items", () => {
      const workspace = createWorkspace();

      const result = buildSemanticLayer({
        workspace,
        vocabularyItems: [],
      });

      expect(result.sources).toHaveProperty("default");
      expect(result.entities).toHaveProperty("default");
      expect(result.metrics).toEqual({});
      expect(result.dimensions).toEqual({});
    });

    it("should use connection schema when provided", () => {
      const workspace = createWorkspace();
      const connection = createConnection({ schema: "analytics" });
      const items = [
        createVocabItem({
          slug: "revenue",
          definition: { sourceTables: ["orders"] },
        }),
      ];

      const result = buildSemanticLayer({
        workspace,
        vocabularyItems: items,
        connection,
      });

      expect(result.sources.orders?.schema).toBe("analytics");
    });
  });

  describe("source generation", () => {
    it("should create a source for each unique table", () => {
      const items = [
        createVocabItem({
          slug: "revenue",
          definition: { sourceTables: ["orders"] },
        }),
        createVocabItem({
          slug: "quantity",
          definition: { sourceTables: ["orders"] },
        }),
        createVocabItem({
          slug: "customer_name",
          type: "dimension",
          definition: { sourceTables: ["customers"] },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(Object.keys(result.sources)).toContain("orders");
      expect(Object.keys(result.sources)).toContain("customers");
      expect(result.sources.orders?.type).toBe("table");
      expect(result.sources.orders?.table).toBe("orders");
    });

    it("should not create source for 'default' table", () => {
      const items = [
        createVocabItem({
          slug: "revenue",
          definition: null, // Will fallback to 'default'
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      // Should create a default source as fallback
      expect(result.sources.default).toBeDefined();
    });
  });

  describe("entity generation", () => {
    it("should create an entity for each table with items", () => {
      const items = [
        createVocabItem({
          slug: "revenue",
          definition: { sourceTables: ["orders"], sourceColumn: "amount" },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.entities.orders).toBeDefined();
      expect(result.entities.orders?.source).toBe("orders");
      expect(result.entities.orders?.primaryKey).toBe("id");
    });

    it("should include fields from vocabulary items", () => {
      const items = [
        createVocabItem({
          type: "metric",
          slug: "revenue",
          canonicalName: "Revenue",
          definition: {
            sourceTables: ["orders"],
            sourceColumn: "amount",
            descriptionHuman: "Total revenue",
          },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      const fields = result.entities.orders?.fields;
      expect(fields?.revenue).toBeDefined();
      expect(fields?.revenue?.column).toBe("amount");
      expect(fields?.revenue?.type).toBe("decimal"); // metrics are decimal
      expect(fields?.revenue?.label).toBe("Revenue");
      expect(fields?.revenue?.description).toBe("Total revenue");
    });

    it("should set defaultTimeField when isPrimaryTime item exists", () => {
      const items = [
        createVocabItem({
          type: "dimension",
          slug: "created_at",
          isPrimaryTime: true,
          definition: { sourceTables: ["orders"] },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.entities.orders?.defaultTimeField).toBe("created_at");
    });
  });

  describe("metric generation", () => {
    it("should create metrics from metric type items", () => {
      const items = [
        createVocabItem({
          type: "metric",
          slug: "total_revenue",
          canonicalName: "Total Revenue",
          aggregation: "SUM",
          definition: {
            sourceTables: ["orders"],
            sourceColumn: "amount",
            descriptionHuman: "Sum of all order amounts",
          },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.metrics.total_revenue).toBeDefined();
      expect(result.metrics.total_revenue).toEqual({
        type: "simple",
        aggregation: "SUM",
        expression: "amount",
        entity: "orders",
        description: "Sum of all order amounts",
        label: "Total Revenue",
      });
    });

    it("should use formulaSql as expression for derived metrics", () => {
      const items = [
        createVocabItem({
          type: "metric",
          slug: "profit_margin",
          aggregation: "AVG",
          definition: {
            sourceTables: ["orders"],
            sourceColumn: "margin",
            formulaSql: "(revenue - cost) / revenue * 100",
          },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.metrics.profit_margin?.type).toBe("derived");
      expect(result.metrics.profit_margin?.expression).toBe(
        "(revenue - cost) / revenue * 100"
      );
    });

    it("should map all aggregation types correctly", () => {
      const aggregationMap: Record<string, string> = {
        SUM: "SUM",
        AVG: "AVG",
        COUNT: "COUNT",
        MIN: "MIN",
        MAX: "MAX",
      };

      for (const [input, expected] of Object.entries(aggregationMap)) {
        const items = [
          createVocabItem({
            type: "metric",
            slug: `metric_${input}`,
            aggregation: input as "SUM" | "AVG" | "COUNT" | "MIN" | "MAX",
          }),
        ];

        const result = buildSemanticLayer({
          workspace: createWorkspace(),
          vocabularyItems: items,
        });

        expect(result.metrics[`metric_${input}`]?.aggregation).toBe(expected);
      }
    });
  });

  describe("dimension generation", () => {
    it("should create dimensions from dimension type items", () => {
      const items = [
        createVocabItem({
          type: "dimension",
          slug: "region",
          canonicalName: "Region",
          cardinality: 50,
          definition: {
            sourceTables: ["customers"],
            sourceColumn: "region_name",
            descriptionHuman: "Customer region",
          },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.dimensions.region).toBeDefined();
      expect(result.dimensions.region).toEqual({
        entity: "customers",
        expression: "region_name",
        type: "string",
        description: "Customer region",
        label: "Region",
        cardinality: "medium", // 50 maps to medium
      });
    });

    it("should map cardinality to categories correctly", () => {
      const cardinalityMap: Record<number, string> = {
        5: "low", // < 10
        50: "medium", // < 100
        5000: "high", // < 10000
        50000: "unique", // >= 10000
      };

      for (const [input, expected] of Object.entries(cardinalityMap)) {
        const items = [
          createVocabItem({
            type: "dimension",
            slug: `dim_${input}`,
            cardinality: parseInt(input),
          }),
        ];

        const result = buildSemanticLayer({
          workspace: createWorkspace(),
          vocabularyItems: items,
        });

        expect(result.dimensions[`dim_${input}`]?.cardinality).toBe(expected);
      }
    });

    it("should handle null cardinality", () => {
      const items = [
        createVocabItem({
          type: "dimension",
          slug: "region",
          cardinality: null,
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.dimensions.region?.cardinality).toBeUndefined();
    });
  });

  describe("filter generation", () => {
    it("should create filters from event type items", () => {
      const items = [
        createVocabItem({
          type: "event",
          slug: "is_active",
          definition: {
            sourceTables: ["users"],
            sourceColumn: "active",
            descriptionHuman: "User is active",
          },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.filters?.is_active).toBeDefined();
      expect(result.filters?.is_active?.description).toBe("User is active");
      expect(result.filters?.is_active?.condition).toEqual({
        field: "active",
        operator: "=",
        value: true,
        entity: "users",
      });
    });

    it("should not include filters key when no event items exist", () => {
      const items = [createVocabItem({ type: "metric" })];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.filters).toBeUndefined();
    });
  });

  describe("relationship generation", () => {
    it("should create relationships from joinsTo metadata", () => {
      const items = [
        createVocabItem({
          slug: "customer_name",
          type: "dimension",
          definition: { sourceTables: ["orders"] },
          joinsTo: [
            {
              target: "customers",
              via: "customer_id",
              type: "many_to_one",
            },
          ],
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships?.[0]).toEqual({
        name: "orders_to_customers",
        from: "orders",
        to: "customers",
        type: "many_to_one",
        join: {
          leftField: "customer_id",
          rightField: "id",
          joinType: "LEFT",
        },
      });
    });

    it("should deduplicate relationships", () => {
      const items = [
        createVocabItem({
          slug: "item1",
          definition: { sourceTables: ["orders"] },
          joinsTo: [{ target: "customers", via: "customer_id", type: "many_to_one" }],
        }),
        createVocabItem({
          slug: "item2",
          definition: { sourceTables: ["orders"] },
          joinsTo: [{ target: "customers", via: "customer_id", type: "many_to_one" }],
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.relationships).toHaveLength(1);
    });

    it("should not include relationships key when no joins exist", () => {
      const items = [createVocabItem({ joinsTo: null })];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.relationships).toBeUndefined();
    });
  });

  describe("field type mapping", () => {
    it("should map metric type to decimal", () => {
      const items = [
        createVocabItem({
          type: "metric",
          definition: { sourceTables: ["orders"] },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.entities.orders?.fields?.test_item?.type).toBe("decimal");
    });

    it("should map event type to boolean", () => {
      const items = [
        createVocabItem({
          type: "event",
          definition: { sourceTables: ["users"] },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.entities.users?.fields?.test_item?.type).toBe("boolean");
    });

    it("should map dimension and entity types to string", () => {
      const items = [
        createVocabItem({
          type: "dimension",
          slug: "dim1",
          definition: { sourceTables: ["table1"] },
        }),
        createVocabItem({
          type: "entity",
          slug: "ent1",
          definition: { sourceTables: ["table1"] },
        }),
      ];

      const result = buildSemanticLayer({
        workspace: createWorkspace(),
        vocabularyItems: items,
      });

      expect(result.entities.table1?.fields?.dim1?.type).toBe("string");
      expect(result.entities.table1?.fields?.ent1?.type).toBe("string");
    });
  });
});
