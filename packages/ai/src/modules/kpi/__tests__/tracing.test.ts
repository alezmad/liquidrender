/**
 * KPI Tracing Test
 *
 * Tests the prompt versioning and trace logging functionality.
 *
 * Usage:
 *   pnpm with-env pnpm -F @turbostarter/ai test -- --testPathPattern=tracing
 */

import { describe, it, expect } from "vitest";
import { generateKPIRecipes, type GenerateRecipeInput } from "../index";
import { SCHEMA_FIRST_GENERATION_PROMPT, SCHEMA_REPAIR_PROMPT, COMPILE_REPAIR_PROMPT } from "../prompts";

describe("KPI Tracing", () => {
  describe("Prompt Templates", () => {
    it("should have versioned prompts", () => {
      expect(SCHEMA_FIRST_GENERATION_PROMPT.name).toBe("schema-first-kpi-generation");
      expect(SCHEMA_FIRST_GENERATION_PROMPT.version).toBe("1.0.0");

      expect(SCHEMA_REPAIR_PROMPT.name).toBe("schema-repair");
      expect(SCHEMA_REPAIR_PROMPT.version).toBe("1.0.0");

      expect(COMPILE_REPAIR_PROMPT.name).toBe("compile-repair");
      expect(COMPILE_REPAIR_PROMPT.version).toBe("1.0.0");
    });

    it("should render schema-first prompt correctly", () => {
      const rendered = SCHEMA_FIRST_GENERATION_PROMPT.render({
        businessType: "ecommerce",
        priorityKPIs: ["Revenue", "Orders"],
        schemaMarkdown: "Table: orders",
        maxRecipes: 10,
      });

      expect(rendered).toContain("ecommerce");
      expect(rendered).toContain("ECOMMERCE");
      expect(rendered).toContain("1. Revenue");
      expect(rendered).toContain("2. Orders");
      expect(rendered).toContain("Table: orders");
    });

    it("should render schema-repair prompt correctly", () => {
      const rendered = SCHEMA_REPAIR_PROMPT.render({
        originalDefinition: { name: "Test KPI" },
        zodError: "kpiDefinition.type: Required",
        schemaContext: "Table: orders",
      });

      expect(rendered).toContain("Test KPI");
      expect(rendered).toContain("kpiDefinition.type: Required");
      expect(rendered).toContain("Table: orders");
    });

    it("should render compile-repair prompt correctly", () => {
      const rendered = COMPILE_REPAIR_PROMPT.render({
        kpiDefinition: { type: "simple", expression: "COUNT(*)" },
        error: "Invalid expression",
        schemaContext: "Table: orders",
      });

      expect(rendered).toContain("simple");
      expect(rendered).toContain("Invalid expression");
      expect(rendered).toContain("Table: orders");
    });
  });

  describe("KPI Generation with Tracing", () => {
    // Skip this test if no API key (will be run manually)
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    it.skipIf(!hasApiKey)("should capture trace data in validation logs", async () => {
      const vocabularyContext: GenerateRecipeInput["vocabularyContext"] = {
        tables: [
          {
            name: "orders",
            columns: [
              { name: "order_id", type: "INTEGER" },
              { name: "amount", type: "DECIMAL" },
              { name: "order_date", type: "DATE" },
            ],
          },
        ],
        detectedMetrics: ["amount"],
        detectedDimensions: [],
      };

      const result = await generateKPIRecipes(
        {
          businessType: "ecommerce",
          vocabularyContext,
          useSchemaFirstGeneration: true,
        },
        {
          model: "haiku",
          maxRecipes: 3,
        }
      );

      // Check that generation completed
      expect(result.recipes).toBeDefined();
      expect(result.generationStats).toBeDefined();

      // If there were failures, check for trace data
      if (result.failedRecipes && result.failedRecipes.length > 0) {
        const firstFailed = result.failedRecipes[0];
        const repairLogs = firstFailed.validationLog.filter(
          (log) => log.stage === "repair"
        );

        if (repairLogs.length > 0) {
          const repairLog = repairLogs[0];

          // Verify NEW trace fields are captured
          expect(repairLog.promptName).toBeDefined();
          expect(repairLog.promptVersion).toBeDefined();
          expect(repairLog.fullPrompt).toBeDefined();
          expect(repairLog.latencyMs).toBeDefined();
          expect(typeof repairLog.latencyMs).toBe("number");

          console.log("\n📊 Trace Data Captured:");
          console.log(`  Prompt: ${repairLog.promptName} v${repairLog.promptVersion}`);
          console.log(`  Latency: ${repairLog.latencyMs}ms`);
          console.log(`  Tokens In: ${repairLog.tokensIn}`);
          console.log(`  Tokens Out: ${repairLog.tokensOut}`);
        }
      }
    }, 60000); // 60s timeout for LLM calls
  });
});
