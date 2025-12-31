/**
 * Component Intelligence Layer Tests
 *
 * Tests for manifest builder, query API, and LLM context generator
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildDefaultManifest,
  buildManifest,
  getManifestStats,
  validateManifest,
  createManifestQuery,
  queryManifest,
  findComponentForIntent,
  getComponent,
  getLeafComponents,
  getContainerComponents,
  getSiblingComponents,
  getRelatedComponents,
  generateLLMContext,
  generateQuickContext,
  generateComponentContext,
  generateCompositionContext,
  layoutSpecs,
  formSpecs,
  dataDisplaySpecs,
  chartSpecs,
  type ComponentManifest,
  type ComponentSpec,
} from "../src/manifest";

// ============================================================================
// §1 Manifest Builder Tests
// ============================================================================

describe("Manifest Builder", () => {
  let manifest: ComponentManifest;

  beforeAll(() => {
    manifest = buildDefaultManifest();
  });

  describe("buildDefaultManifest", () => {
    it("should create a manifest with all component specs", () => {
      expect(manifest).toBeDefined();
      expect(manifest.meta.name).toBe("liquidrender-default");
      expect(manifest.version).toBeDefined();
    });

    it("should include all layout specs", () => {
      for (const spec of layoutSpecs) {
        expect(manifest.components[spec.type]).toBeDefined();
      }
    });

    it("should include all form specs", () => {
      for (const spec of formSpecs) {
        expect(manifest.components[spec.type]).toBeDefined();
      }
    });

    it("should include all data display specs", () => {
      for (const spec of dataDisplaySpecs) {
        expect(manifest.components[spec.type]).toBeDefined();
      }
    });

    it("should include all chart specs", () => {
      for (const spec of chartSpecs) {
        expect(manifest.components[spec.type]).toBeDefined();
      }
    });

    it("should have valid composition rules", () => {
      expect(manifest.composition.maxNestingDepth).toBeGreaterThan(0);
      expect(manifest.composition.leafComponents).toBeInstanceOf(Array);
      expect(manifest.composition.containerComponents).toBeInstanceOf(Array);
    });

    it("should have semantic graph with relationships", () => {
      expect(manifest.semantics.relationships).toBeInstanceOf(Array);
      expect(manifest.semantics.patterns).toBeInstanceOf(Array);
      expect(manifest.semantics.antiPatterns).toBeInstanceOf(Array);
    });

    it("should have design tokens", () => {
      expect(manifest.tokens.colors).toBeDefined();
      expect(manifest.tokens.spacing).toBeDefined();
      expect(manifest.tokens.radius).toBeDefined();
      expect(manifest.tokens.fontSize).toBeDefined();
    });
  });

  describe("buildManifest", () => {
    it("should build manifest including all default specs plus additional", () => {
      // buildManifest always includes all default specs (layout, form, dataDisplay, chart)
      // additionalSpecs are added to the base set
      const customManifest = buildManifest({});

      // Should have all components from default specs
      expect(Object.keys(customManifest.components).length).toBeGreaterThan(0);
      // All layout specs should be included
      for (const spec of layoutSpecs) {
        expect(customManifest.components[spec.type]).toBeDefined();
      }
    });

    it("should use custom metadata", () => {
      const customManifest = buildManifest({
        specs: layoutSpecs,
        meta: {
          name: "custom-theme",
          version: "2.0.0",
          description: "Custom theme",
          author: "Test",
        },
      });

      expect(customManifest.meta.name).toBe("custom-theme");
      expect(customManifest.meta.version).toBe("2.0.0");
    });
  });

  describe("getManifestStats", () => {
    it("should return accurate component counts", () => {
      const stats = getManifestStats(manifest);

      expect(stats.totalComponents).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
      expect(stats.totalRelationships).toBeDefined();
      expect(stats.totalPatterns).toBeDefined();
    });

    it("should count categories correctly", () => {
      const stats = getManifestStats(manifest);

      // Should have layout, forms, data, charts categories
      expect(Object.keys(stats.byCategory).length).toBeGreaterThan(0);
    });
  });

  describe("validateManifest", () => {
    it("should validate a correct manifest", () => {
      const result = validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate manifest with default specs", () => {
      // buildManifest requires meta parameter
      const defaultManifest = buildManifest({
        meta: { name: "test-theme", version: "1.0.0" },
      });
      const result = validateManifest(defaultManifest);

      // Default manifest should be valid
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// §2 Query API Tests
// ============================================================================

describe("Query API", () => {
  let manifest: ComponentManifest;

  beforeAll(() => {
    manifest = buildDefaultManifest();
  });

  describe("createManifestQuery", () => {
    it("should create a query interface", () => {
      const query = createManifestQuery(manifest);

      expect(query.byCategory).toBeInstanceOf(Function);
      expect(query.byDataShape).toBeInstanceOf(Function);
      expect(query.byFeatures).toBeInstanceOf(Function);
      expect(query.search).toBeInstanceOf(Function);
    });

    it("should find components by category", () => {
      const query = createManifestQuery(manifest);
      const layoutComponents = query.byCategory("layout");

      expect(layoutComponents.length).toBeGreaterThan(0);
      for (const spec of layoutComponents) {
        expect(spec.category).toMatch(/^layout/);
      }
    });

    it("should find components by features", () => {
      const query = createManifestQuery(manifest);
      const responsiveComponents = query.byFeatures({ responsive: true });

      expect(responsiveComponents.length).toBeGreaterThan(0);
      for (const spec of responsiveComponents) {
        expect(spec.features.responsive).toBe(true);
      }
    });

    it("should search components by text", () => {
      const query = createManifestQuery(manifest);
      const results = query.search("table");

      expect(results.length).toBeGreaterThan(0);
      // First result should be most relevant (data-table)
      expect(results[0]?.type).toContain("table");
    });

    it("should validate composition", () => {
      const query = createManifestQuery(manifest);
      const result = query.validateComposition("card", ["heading", "text"]);

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe("boolean");
    });

    it("should suggest children for parent", () => {
      const query = createManifestQuery(manifest);
      const children = query.suggestChildren("card");

      expect(children).toBeInstanceOf(Array);
    });

    it("should get alternatives for component", () => {
      const query = createManifestQuery(manifest);
      const alternatives = query.getAlternatives("data-table");

      expect(alternatives).toBeInstanceOf(Array);
    });
  });

  describe("queryManifest (fluent builder)", () => {
    it("should chain category filter", () => {
      const results = queryManifest(manifest).category("forms").get();

      expect(results.length).toBeGreaterThan(0);
      for (const spec of results) {
        expect(spec.category).toMatch(/^forms/);
      }
    });

    it("should chain feature filter", () => {
      const results = queryManifest(manifest).hasFeature("validation").get();

      for (const spec of results) {
        expect(spec.features.validation).toBe(true);
      }
    });

    it("should chain multiple filters", () => {
      const results = queryManifest(manifest)
        .category("forms")
        .hasFeature("validation")
        .limit(5)
        .get();

      expect(results.length).toBeLessThanOrEqual(5);
      for (const spec of results) {
        expect(spec.category).toMatch(/^forms/);
        expect(spec.features.validation).toBe(true);
      }
    });

    it("should return types only", () => {
      const types = queryManifest(manifest).category("charts").types();

      expect(types).toBeInstanceOf(Array);
      for (const type of types) {
        expect(typeof type).toBe("string");
      }
    });

    it("should return count", () => {
      const count = queryManifest(manifest).category("layout").count();

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(0);
    });

    it("should return first match", () => {
      const first = queryManifest(manifest).matching("card").first();

      expect(first).toBeDefined();
      expect(first?.type).toContain("card");
    });
  });

  describe("specialized query functions", () => {
    it("findComponentForIntent should find matching component", () => {
      const spec = findComponentForIntent(manifest, "display data in a table");

      expect(spec).toBeDefined();
      expect(spec?.type).toBe("data-table");
    });

    it("getComponent should return specific component", () => {
      const spec = getComponent(manifest, "card");

      expect(spec).toBeDefined();
      expect(spec?.type).toBe("card");
    });

    it("getComponent should return undefined for unknown type", () => {
      const spec = getComponent(manifest, "unknown-component");

      expect(spec).toBeUndefined();
    });

    it("getLeafComponents should return leaf components", () => {
      const leaves = getLeafComponents(manifest);

      expect(leaves).toBeInstanceOf(Array);
    });

    it("getContainerComponents should return container components", () => {
      const containers = getContainerComponents(manifest);

      expect(containers).toBeInstanceOf(Array);
    });
  });
});

// ============================================================================
// §3 LLM Context Generator Tests
// ============================================================================

describe("LLM Context Generator", () => {
  let manifest: ComponentManifest;

  beforeAll(() => {
    manifest = buildDefaultManifest();
  });

  describe("generateLLMContext", () => {
    it("should generate context with all sections", () => {
      const context = generateLLMContext({
        manifest,
        context: {
          device: "desktop",
          audience: "developer",
          fidelity: "production",
          tokenBudget: 10000,
        },
      });

      expect(context.version).toBeDefined();
      expect(context.generatedAt).toBeDefined();
      expect(context.tokensUsed).toBeGreaterThan(0);
      expect(context.systemPrompt).toBeDefined();
      expect(context.componentReference).toBeDefined();
      expect(context.compositionGuidance).toBeDefined();
      expect(context.tokensSummary).toBeDefined();
    });

    it("should respect token budget", () => {
      const smallContext = generateLLMContext({
        manifest,
        context: {
          device: "desktop",
          audience: "developer",
          fidelity: "production",
          tokenBudget: 1000,
        },
      });

      const largeContext = generateLLMContext({
        manifest,
        context: {
          device: "desktop",
          audience: "developer",
          fidelity: "production",
          tokenBudget: 50000,
        },
      });

      // Smaller budget should produce smaller output
      expect(smallContext.tokensUsed).toBeLessThan(largeContext.tokensUsed);
    });

    it("should prioritize specified types", () => {
      const context = generateLLMContext({
        manifest,
        context: {
          device: "desktop",
          audience: "developer",
          fidelity: "production",
          tokenBudget: 5000,
        },
        priorityTypes: ["data-table", "card"],
      });

      // Priority types should appear in component reference
      expect(context.componentReference).toContain("data-table");
      expect(context.componentReference).toContain("card");
    });

    it("should include examples when requested", () => {
      const withExamples = generateLLMContext({
        manifest,
        context: {
          device: "desktop",
          audience: "developer",
          fidelity: "production",
          tokenBudget: 10000,
        },
        includeExamples: true,
      });

      const withoutExamples = generateLLMContext({
        manifest,
        context: {
          device: "desktop",
          audience: "developer",
          fidelity: "production",
          tokenBudget: 10000,
        },
        includeExamples: false,
      });

      expect(withExamples.componentReference.length).toBeGreaterThan(
        withoutExamples.componentReference.length
      );
    });
  });

  describe("generateQuickContext", () => {
    it("should generate minimal context for intent", () => {
      const context = generateQuickContext("table for user data", manifest);

      expect(context).toContain("data-table");
      expect(context.length).toBeLessThan(2000); // Should be concise
    });

    it("should work without explicit manifest", () => {
      const context = generateQuickContext("display a chart");

      expect(context).toBeDefined();
      expect(context.length).toBeGreaterThan(0);
    });
  });

  describe("generateComponentContext", () => {
    it("should generate detailed context for specific component", () => {
      const context = generateComponentContext("card", manifest);

      expect(context).toContain("card");
      expect(context).toContain("Props");
      expect(context).toContain("Binding");
    });

    it("should return error for unknown component", () => {
      const context = generateComponentContext("unknown-type", manifest);

      expect(context).toContain("not found");
    });
  });

  describe("generateCompositionContext", () => {
    it("should generate composition guidance", () => {
      const context = generateCompositionContext("card", manifest);

      expect(context).toContain("Composition");
      expect(context).toContain("card");
    });

    it("should include valid children", () => {
      const context = generateCompositionContext("grid", manifest);

      expect(context).toContain("Valid Children");
    });
  });
});

// ============================================================================
// §4 Component Spec Validation Tests
// ============================================================================

describe("Component Specs", () => {
  const allSpecs = [...layoutSpecs, ...formSpecs, ...dataDisplaySpecs, ...chartSpecs];

  describe("spec structure", () => {
    it.each(allSpecs)("$type should have required fields", (spec) => {
      expect(spec.type).toBeDefined();
      expect(spec.category).toBeDefined();
      expect(spec.description).toBeDefined();
      expect(spec.props).toBeInstanceOf(Array);
      expect(spec.bindings).toBeDefined();
      expect(spec.composition).toBeDefined();
      expect(spec.features).toBeDefined();
      expect(spec.a11y).toBeDefined();
      expect(spec.usage).toBeDefined();
      expect(spec.examples).toBeInstanceOf(Array);
    });
  });

  describe("layout specs", () => {
    // layoutSpecs includes: layout, typography, navigation, disclosure, overlays
    it("should include layout-related components", () => {
      const types = layoutSpecs.map((s) => s.type);
      expect(types).toContain("container");
      expect(types).toContain("grid");
      expect(types).toContain("stack");
    });

    it("should have valid categories", () => {
      // layoutSpecs includes misc category for utility components like separator
      const validPrefixes = ["layout", "typography", "navigation", "disclosure", "overlays", "misc"];
      for (const spec of layoutSpecs) {
        const rootCategory = spec.category.split(".")[0];
        expect(validPrefixes).toContain(rootCategory);
      }
    });
  });

  describe("form specs", () => {
    // formSpecs includes: forms, actions
    it("should include form-related components", () => {
      const types = formSpecs.map((s) => s.type);
      expect(types).toContain("input");
      expect(types).toContain("select");
      expect(types).toContain("form");
    });

    it("should have error feature on input components", () => {
      const inputTypes = ["input", "select", "textarea"];
      for (const spec of formSpecs) {
        if (inputTypes.some((t) => spec.type === t)) {
          // Form inputs have error state support
          expect(spec.features.error).toBe(true);
        }
      }
    });
  });

  describe("chart specs", () => {
    // chartSpecs includes: charts, media
    it("should include chart components", () => {
      const types = chartSpecs.map((s) => s.type);
      expect(types).toContain("line");
      expect(types).toContain("bar");
      expect(types).toContain("pie");
    });

    it("chart components should have responsive feature (except inline charts)", () => {
      // Filter to chart components, excluding sparkline which is fixed-size by design
      const chartComponents = chartSpecs.filter(
        (s) => s.category.startsWith("charts") && s.type !== "sparkline"
      );
      for (const spec of chartComponents) {
        expect(spec.features.responsive).toBe(true);
      }
    });
  });
});
