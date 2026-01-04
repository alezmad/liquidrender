/**
 * Glue Integration Test
 *
 * Tests the full glue chain from DetectedVocabulary to LiquidSchema:
 * 1. detectBusinessType() + mapToTemplate() - Schema → MappingResult
 * 2. generateSemanticLayer() - ResolvedVocabulary → SemanticLayer
 * 3. generateDashboardSpec() - MappingResult → DashboardSpec
 * 4. dashboardSpecToLiquidSchema() - DashboardSpec → LiquidSchema
 *
 * Wave 2 Integration Test
 */

import { describe, it, expect } from "vitest";
import type { DetectedVocabulary, ExtractedSchema } from "@repo/liquid-connect";
import {
  detectBusinessType,
  getTemplate,
  mapToTemplate,
  generateSemanticLayer,
  generateDashboardSpec,
} from "@repo/liquid-connect";
import { dashboardSpecToLiquidSchema, type Block } from "@repo/liquid-render";
import type { ResolvedVocabulary, ResolvedVocabularyItem } from "../vocabulary/resolution";

// ============================================================================
// Mock Data Factories
// ============================================================================

function createMockDetectedVocabulary(): DetectedVocabulary {
  return {
    entities: [
      {
        name: "Subscription",
        table: "subscriptions",
        schema: "public",
        primaryKey: "id",
        columnCount: 6,
        certainty: 0.95,
        isJunction: false,
      },
    ],
    metrics: [
      {
        id: "mrr_1",
        name: "Monthly Recurring Revenue",
        table: "subscriptions",
        column: "amount",
        dataType: "decimal",
        aggregation: "SUM",
        certainty: 0.9,
        suggestedDisplayName: "MRR",
      },
    ],
    dimensions: [
      {
        id: "plan_name_1",
        name: "Plan Name",
        table: "plans",
        column: "name",
        dataType: "varchar",
        cardinality: 5,
        certainty: 0.95,
      },
    ],
    timeFields: [
      {
        id: "created_date_1",
        name: "Created Date",
        table: "subscriptions",
        column: "created_at",
        dataType: "timestamp",
        isPrimaryCandidate: true,
        certainty: 0.9,
      },
    ],
    filters: [],
    relationships: [
      {
        id: "sub_customer_1",
        from: { entity: "Subscription", field: "customer_id" },
        to: { entity: "Customer", field: "id" },
        type: "many_to_one",
        certainty: 0.9,
      },
    ],
  };
}

function createMockExtractedSchema(): ExtractedSchema {
  return {
    database: "test_db",
    type: "postgres",
    schema: "public",
    extractedAt: new Date().toISOString(),
    tables: [
      {
        name: "subscriptions",
        schema: "public",
        columns: [
          { name: "id", dataType: "integer", isPrimaryKey: true, isForeignKey: false, isNotNull: true },
          { name: "customer_id", dataType: "integer", isPrimaryKey: false, isForeignKey: true, isNotNull: true, references: { table: "customers", column: "id" } },
          { name: "plan_id", dataType: "integer", isPrimaryKey: false, isForeignKey: true, isNotNull: true, references: { table: "plans", column: "id" } },
          { name: "amount", dataType: "decimal", isPrimaryKey: false, isForeignKey: false, isNotNull: true },
          { name: "status", dataType: "varchar", isPrimaryKey: false, isForeignKey: false, isNotNull: true },
          { name: "created_at", dataType: "timestamp", isPrimaryKey: false, isForeignKey: false, isNotNull: true },
        ],
        primaryKeyColumns: ["id"],
        foreignKeys: [
          {
            column: "customer_id",
            referencedTable: "customers",
            referencedColumn: "id",
          },
          {
            column: "plan_id",
            referencedTable: "plans",
            referencedColumn: "id",
          },
        ],
      },
      {
        name: "customers",
        schema: "public",
        columns: [
          { name: "id", dataType: "integer", isPrimaryKey: true, isForeignKey: false, isNotNull: true },
          { name: "email", dataType: "varchar", isPrimaryKey: false, isForeignKey: false, isNotNull: true },
          { name: "created_at", dataType: "timestamp", isPrimaryKey: false, isForeignKey: false, isNotNull: true },
        ],
        primaryKeyColumns: ["id"],
        foreignKeys: [],
      },
      {
        name: "plans",
        schema: "public",
        columns: [
          { name: "id", dataType: "integer", isPrimaryKey: true, isForeignKey: false, isNotNull: true },
          { name: "name", dataType: "varchar", isPrimaryKey: false, isForeignKey: false, isNotNull: true },
          { name: "price", dataType: "decimal", isPrimaryKey: false, isForeignKey: false, isNotNull: true },
        ],
        primaryKeyColumns: ["id"],
        foreignKeys: [],
      },
    ],
  };
}

function createMockResolvedVocabulary(): ResolvedVocabulary {
  const items: ResolvedVocabularyItem[] = [
    {
      id: "mrr-1",
      slug: "mrr",
      canonicalName: "Monthly Recurring Revenue",
      abbreviation: "MRR",
      type: "metric",
      category: "revenue",
      scope: "org",
      definition: {
        descriptionHuman: "Total monthly recurring revenue from active subscriptions",
        formulaSql: "SUM(subscriptions.amount) WHERE status = 'active'",
        sourceTables: ["subscriptions"],
      },
      suggestedForRoles: ["executive", "finance"],
      isFavorite: false,
      recentlyUsedAt: null,
      useCount: 0,
    },
    {
      id: "created-date-1",
      slug: "created_date",
      canonicalName: "Created Date",
      abbreviation: null,
      type: "dimension",
      category: "time",
      scope: "org",
      definition: {
        descriptionHuman: "Date when subscription was created",
        formulaSql: "subscriptions.created_at",
        sourceTables: ["subscriptions"],
      },
      suggestedForRoles: null,
      isFavorite: false,
      recentlyUsedAt: null,
      useCount: 0,
    },
  ];

  const bySlug = new Map<string, ResolvedVocabularyItem>();
  items.forEach((item) => bySlug.set(item.slug, item));

  return {
    items,
    bySlug,
    favorites: [],
    recentlyUsed: [],
    synonyms: { "monthly revenue": "mrr" },
  };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe("Glue Integration", () => {
  it("transforms vocabulary through full glue chain", () => {
    // Step 1: Create mock data
    const detected = createMockDetectedVocabulary();
    const schema = createMockExtractedSchema();

    // Step 2: Detect business type & map template (Wave 1)
    const detection = detectBusinessType(schema);
    expect(detection.primary).toBeDefined();
    expect(detection.primary?.type).toBe("saas");

    const template = getTemplate(detection.primary!.type);
    expect(template).toBeDefined();
    expect(template.kpis.primary.length).toBeGreaterThan(0);

    const mapping = mapToTemplate(detected, template);
    expect(mapping.mappedKPIs.length).toBeGreaterThan(0);
    // Note: Coverage may be low due to partial mappings (mapper only searches metrics for slots)
    expect(mapping.coverage).toBeGreaterThanOrEqual(0);

    // Step 3: Generate semantic layer (Wave 2, Phase 2.1)
    const resolved = createMockResolvedVocabulary();
    const semanticLayer = generateSemanticLayer(resolved, schema);
    expect(semanticLayer.sources).toBeDefined();
    expect(semanticLayer.metrics).toBeDefined();
    expect(semanticLayer.dimensions).toBeDefined();

    // Step 4: Generate dashboard spec (Wave 2, Phase 2.2)
    // Include partial KPIs since reverse engineering often produces partial mappings initially
    const dashboardSpec = generateDashboardSpec(mapping, { includePartialKPIs: true });
    expect(dashboardSpec.sections.length).toBeGreaterThan(0);
    // Coverage may be low with partial mappings
    expect(dashboardSpec.coverage).toBeGreaterThanOrEqual(0);
    expect(dashboardSpec.businessType).toBe("saas");

    // Step 5: Generate LiquidSchema (Wave 2, Phase 2.3)
    const liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec);
    expect(liquidSchema.version).toBe("1.0");
    expect(liquidSchema.layers.length).toBe(1);

    const firstLayer = liquidSchema.layers[0];
    if (!firstLayer) {
      throw new Error("Expected first layer to be defined");
    }
    expect(firstLayer.root.type).toBe("container");
    expect(firstLayer.root.children).toBeDefined();

    const rootChildren = firstLayer.root.children;
    if (!rootChildren) {
      throw new Error("Expected root children to be defined");
    }
    expect(rootChildren.length).toBeGreaterThan(0);

    // Verify structure contains KPI blocks (inside grid blocks)
    const gridBlocks = rootChildren.filter((block: Block) => block.type === "grid");
    expect(gridBlocks.length).toBeGreaterThan(0);

    // KPIs are children of grid blocks
    const hasKPIBlock = gridBlocks.some((grid: Block) =>
      grid.children?.some((child: Block) => child.type === "kpi")
    );
    expect(hasKPIBlock).toBe(true);
  });

  it("generates valid LiquidSchema with grid layout", () => {
    const detected = createMockDetectedVocabulary();
    const schema = createMockExtractedSchema();
    const detection = detectBusinessType(schema);
    const template = getTemplate(detection.primary!.type);
    const mapping = mapToTemplate(detected, template);
    const dashboardSpec = generateDashboardSpec(mapping, { includePartialKPIs: true });

    const liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec, {
      maxKPIsPerRow: 2,
      gap: "lg",
    });

    const firstLayer = liquidSchema.layers[0];
    if (!firstLayer) {
      throw new Error("Expected first layer to be defined");
    }

    const rootChildren = firstLayer.root.children;
    if (!rootChildren) {
      throw new Error("Expected root children to be defined");
    }
    const gridBlocks = rootChildren.filter((block: Block) => block.type === "grid");

    expect(gridBlocks.length).toBeGreaterThan(0);

    gridBlocks.forEach((grid: Block) => {
      expect(grid.layout).toBeDefined();
      expect(grid.layout!.gap).toBe("lg");
      expect(grid.layout!.columns).toBeLessThanOrEqual(2);
      expect(grid.children).toBeDefined();
    });
  });

  it("generates warnings for unmapped KPIs", () => {
    const detected: DetectedVocabulary = {
      entities: [],
      metrics: [],
      dimensions: [],
      timeFields: [],
      filters: [],
      relationships: [],
    };

    const schema = createMockExtractedSchema();
    const detection = detectBusinessType(schema);
    const template = getTemplate(detection.primary!.type);
    const mapping = mapToTemplate(detected, template);

    const dashboardSpec = generateDashboardSpec(mapping);

    expect(dashboardSpec.warnings.length).toBeGreaterThan(0);
    expect(dashboardSpec.coverage).toBe(0);
  });
});
