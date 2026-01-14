/**
 * Full Onboarding Pipeline Test with KPI Value Validation
 *
 * Tests the complete pipeline AND validates computed KPI values:
 * 1. Generate KPIs from schema
 * 2. Execute KPIs against real data
 * 3. LLM validates if values make business sense
 *
 * Usage:
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-with-validation.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  DuckDBUniversalAdapter,
  applyHardRules,
  profileSchema,
  extractProfilingData,
} from "@repo/liquid-connect/uvb";
// No external compiler - we'll build SQL directly from the semantic definitions
import { generateKPIRecipes, type GenerateRecipeInput } from "@turbostarter/ai/kpi";
import { VALUE_VALIDATION_PROMPT, type KPIValueValidation } from "@turbostarter/ai/kpi/prompts/index";

// Northwind via LiquidGym PostgreSQL
const DB_CONNECTION = "postgresql://superadmin:superadmin@localhost:5433/northwind";
const DB_SCHEMA = "public";
const DB_NAME = "Northwind";
const BUSINESS_TYPE = "ecommerce";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  console.log("═".repeat(70));
  console.log("  KPI GENERATION + VALUE VALIDATION TEST");
  console.log("═".repeat(70));

  // =========================================================================
  // STEP 1: Connect and extract schema
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 1: Extracting schema                                          │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const adapter = new DuckDBUniversalAdapter();
  await adapter.connect(DB_CONNECTION);
  console.log(`\n  ✓ Connected to ${DB_NAME}`);

  const schema = await adapter.extractSchema(DB_SCHEMA);
  console.log(`  ✓ Found ${schema.tables.length} tables`);

  // =========================================================================
  // STEP 2: Profile and detect vocabulary
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 2: Profiling tables                                           │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const profiles = await profileSchema(adapter, schema, {
    sampleSize: 1000,
    analyzeDistributions: true,
  });

  const safeProfiles = {
    ...profiles,
    columnProfiles: profiles.columnProfiles ?? {},
    tableProfiles: profiles.tableProfiles ?? {},
  };
  const profilingData = extractProfilingData(safeProfiles);
  const vocabulary = applyHardRules(schema, profilingData);

  console.log(`\n  ✓ Detected ${vocabulary.metrics?.length ?? 0} metrics, ${vocabulary.dimensions?.length ?? 0} dimensions`);

  // =========================================================================
  // STEP 3: Generate KPIs
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 3: Generating KPIs                                            │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const vocabularyContext: GenerateRecipeInput["vocabularyContext"] = {
    tables: schema.tables.map((t) => ({
      name: t.name,
      columns: t.columns.map((c) => ({
        name: c.name,
        type: c.dataType,
      })),
    })),
    detectedMetrics: vocabulary.metrics?.map((m) => m.name) ?? [],
    detectedDimensions: vocabulary.dimensions?.map((d) => d.name) ?? [],
  };

  console.log("\n  Generating KPIs...\n");

  const result = await generateKPIRecipes(
    {
      businessType: BUSINESS_TYPE,
      vocabularyContext,
      useSchemaFirstGeneration: true,
    },
    {
      model: "haiku",
      maxRecipes: 10,
    }
  );

  console.log(`  ✓ Generated ${result.recipes.length} KPIs`);


  // =========================================================================
  // STEP 4: Execute KPIs against real data
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 4: Executing KPIs against real data                           │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const kpiResults: Array<{
    name: string;
    description: string;
    value: number | string | null;
    sql?: string;
    error?: string;
  }> = [];

  // Helper to build SQL from semantic definition
  function buildSQL(def: any): string {
    const entity = `"source_db"."${def.entity}"`;

    // If aggregation is defined, use simple aggregation
    if (def.aggregation && def.type === "simple") {
      return `SELECT ${def.aggregation}(${def.expression}) AS value FROM ${entity}`;
    }

    // For ratio types with numerator/denominator
    if (def.type === "ratio" && def.numerator && def.denominator) {
      const num = `${def.numerator.aggregation}(${def.numerator.expression})`;
      const den = `${def.denominator.aggregation}(${def.denominator.expression})`;
      const multiplier = def.multiplier || 1;
      return `SELECT (CAST(${num} AS FLOAT) / NULLIF(${den}, 0)) * ${multiplier} AS value FROM ${entity}`;
    }

    // If expression already contains SQL (LLM embedded aggregations)
    // Detect by checking if expression contains SQL functions
    if (def.expression && /\b(SUM|COUNT|AVG|MIN|MAX)\s*\(/i.test(def.expression)) {
      // Expression has embedded SQL - normalize COUNT_DISTINCT variations
      let expr = def.expression
        .replace(/COUNT_DISTINCT\(([^)]+)\)/gi, "COUNT(DISTINCT $1)")
        .replace(/count_distinct\(([^)]+)\)/gi, "COUNT(DISTINCT $1)");
      return `SELECT ${expr} AS value FROM ${entity}`;
    }

    // Fallback: try to build a simple query
    const agg = def.aggregation || "SUM";
    return `SELECT ${agg}(${def.expression}) AS value FROM ${entity}`;
  }

  for (const recipe of result.recipes) {
    const kpiDef = recipe.semanticDefinition;
    if (!kpiDef) {
      kpiResults.push({
        name: recipe.name,
        description: recipe.description,
        value: null,
        error: "No semantic definition",
      });
      continue;
    }

    try {
      // Build SQL directly from the semantic definition
      const sql = buildSQL(kpiDef);

      // Execute SQL - adapter.query returns T[] (array of rows)
      const rows = await adapter.query<{value: unknown}>(sql);
      const value = rows[0]?.value ?? null;

      // Convert BigInt to Number if needed
      const numValue = typeof value === 'bigint' ? Number(value) : value;

      kpiResults.push({
        name: recipe.name,
        description: recipe.description,
        value: numValue,
        sql: sql,
      });

      console.log(`  ✓ ${recipe.name}: ${numValue}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      kpiResults.push({
        name: recipe.name,
        description: recipe.description,
        value: null,
        error: errorMsg.substring(0, 100),
      });
      console.log(`  ✗ ${recipe.name}: ERROR - ${errorMsg.substring(0, 50)}...`);
    }
  }

  // =========================================================================
  // STEP 5: LLM Value Validation
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 5: LLM Value Validation                                       │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  // Filter to only KPIs with values (not errors)
  const successfulKpis = kpiResults.filter((k) => k.value !== null && !k.error);

  if (successfulKpis.length === 0) {
    console.log("\n  ⚠️ No KPIs executed successfully - skipping validation");
  } else {
    console.log(`\n  Validating ${successfulKpis.length} KPI values with LLM...\n`);

    const prompt = VALUE_VALIDATION_PROMPT.render({
      businessType: BUSINESS_TYPE,
      kpiResults: successfulKpis,
    });

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type === "text") {
        const validations: KPIValueValidation[] = JSON.parse(content.text);

        console.log("  📊 Validation Results:\n");

        let validCount = 0;
        let suspiciousCount = 0;
        let invalidCount = 0;

        for (const v of validations) {
          const icon = v.status === "VALID" ? "✅" : v.status === "SUSPICIOUS" ? "⚠️" : "❌";
          console.log(`  ${icon} ${v.kpiName}: ${v.value}`);
          console.log(`     Status: ${v.status}`);
          console.log(`     Reasoning: ${v.reasoning}`);
          if (v.suggestedFix) {
            console.log(`     Fix: ${v.suggestedFix}`);
          }
          console.log();

          if (v.status === "VALID") validCount++;
          else if (v.status === "SUSPICIOUS") suspiciousCount++;
          else invalidCount++;
        }

        console.log("  ─────────────────────────────────────────────");
        console.log(`  Summary: ${validCount} valid, ${suspiciousCount} suspicious, ${invalidCount} invalid`);
      }
    } catch (error) {
      console.error("  ❌ LLM validation failed:", error);
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n╔═════════════════════════════════════════════════════════════════════╗");
  console.log("║                           PIPELINE SUMMARY                          ║");
  console.log("╚═════════════════════════════════════════════════════════════════════╝");

  const executed = kpiResults.filter((k) => k.value !== null && !k.error).length;
  const failed = kpiResults.filter((k) => k.error).length;

  console.log(`
  Database:         ${DB_NAME}
  KPIs Generated:   ${result.recipes.length}
  KPIs Executed:    ${executed} successful, ${failed} failed
  `);

  // Show failed executions
  const failedKpis = kpiResults.filter((k) => k.error);
  if (failedKpis.length > 0) {
    console.log("  Failed Executions:");
    failedKpis.forEach((k) => {
      console.log(`    - ${k.name}: ${k.error}`);
    });
  }

  await adapter.disconnect();
  console.log("\n  ✓ Test complete\n");

  process.exit(0);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
