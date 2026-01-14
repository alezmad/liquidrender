/**
 * Test KPI Validation Pipeline
 *
 * Tests the self-healing KPI generation without going through the frontend.
 * Connects directly to a test database, runs the pipeline, and verifies results.
 *
 * Usage:
 *   pnpm with-env npx tsx packages/api/scripts/test-kpi-validation-pipeline.ts
 *
 *   # With specific database:
 *   TEST_DB_CONNECTION=postgresql://user:pass@host:5432/db pnpm with-env npx tsx packages/api/scripts/test-kpi-validation-pipeline.ts
 */

import {
  DuckDBUniversalAdapter,
  applyHardRules,
  profileSchema,
  extractProfilingData,
} from "@repo/liquid-connect/uvb";
import { generateKPIRecipes, type GenerateRecipeInput } from "@turbostarter/ai/kpi";

// Test database - use explicit TEST_DB_CONNECTION or fall back to DATABASE_URL
const TEST_CONNECTION_STRING = process.env.TEST_DB_CONNECTION
  || process.env.DATABASE_URL;

async function main() {
  console.log("=".repeat(60));
  console.log("KPI VALIDATION PIPELINE TEST");
  console.log("=".repeat(60));

  if (!TEST_CONNECTION_STRING) {
    console.error("✗ No database connection string found.");
    console.error("  Set TEST_DB_CONNECTION or DATABASE_URL environment variable.");
    process.exit(1);
  }

  // Step 1: Connect to database
  console.log("\n[1/5] Connecting to database...");
  console.log(`  Using: ${TEST_CONNECTION_STRING.replace(/:[^:@]+@/, ":***@")}`);
  const adapter = new DuckDBUniversalAdapter();

  try {
    await adapter.connect(TEST_CONNECTION_STRING);
    console.log("✓ Connected successfully");
  } catch (error) {
    console.error("✗ Connection failed:", error);
    process.exit(1);
  }

  // Step 2: Extract schema
  console.log("\n[2/5] Extracting schema...");
  // Use adapter's built-in extractSchema method (it's already connected)
  const schema = await adapter.extractSchema("public");
  console.log(`✓ Found ${schema.tables.length} tables`);
  schema.tables.forEach((t) => {
    console.log(`  - ${t.name} (${t.columns.length} columns)`);
  });

  // Step 3: Profile schema (optional but improves KPI quality)
  console.log("\n[3/5] Profiling schema...");
  const profiles = await profileSchema(adapter, schema, {
    sampleSize: 1000,
    analyzeDistributions: true,
  });

  // Handle potential null/undefined profiles
  const safeProfiles = {
    ...profiles,
    columnProfiles: profiles.columnProfiles ?? {},
    tableProfiles: profiles.tableProfiles ?? {},
  };
  const profilingData = extractProfilingData(safeProfiles);
  console.log(`✓ Profiled ${Object.keys(profilingData.tableProfiles).length} tables`);

  // Step 4: Detect vocabulary
  console.log("\n[4/5] Detecting vocabulary...");
  const vocabulary = applyHardRules(schema, profilingData);
  console.log(`✓ Detected:`);
  console.log(`  - ${vocabulary.metrics?.length ?? 0} metrics`);
  console.log(`  - ${vocabulary.dimensions?.length ?? 0} dimensions`);
  console.log(`  - ${vocabulary.entities?.length ?? 0} entities`);

  // Step 5: Generate KPIs with validation
  console.log("\n[5/5] Generating KPIs with self-healing validation...");

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

  const startTime = Date.now();
  const result = await generateKPIRecipes(
    {
      businessType: "distribution", // Northwind is a distribution business
      vocabularyContext,
      useSchemaFirstGeneration: true,
    },
    {
      model: "haiku",
      maxRecipes: 20,
    }
  );
  const duration = Date.now() - startTime;

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));

  console.log(`\nGeneration completed in ${(duration / 1000).toFixed(1)}s`);

  if (result.generationStats) {
    const stats = result.generationStats;
    console.log("\n📊 Generation Stats:");
    console.log(`  Attempted:         ${stats.attempted}`);
    console.log(`  Passed Schema:     ${stats.passedSchema}`);
    console.log(`  Passed Compile:    ${stats.passedCompile}`);
    console.log(`  Repaired (Haiku):  ${stats.repairedByHaiku}`);
    console.log(`  Repaired (Sonnet): ${stats.repairedBySonnet}`);
    console.log(`  Final Success:     ${stats.finalSuccess}`);
    console.log(`  Final Failed:      ${stats.finalFailed}`);
  }

  console.log("\n✅ Successful KPIs:");
  result.recipes.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.name} (${r.category}, confidence: ${r.confidence?.toFixed(2)})`);
  });

  if (result.failedRecipes && result.failedRecipes.length > 0) {
    console.log("\n❌ Failed KPIs:");
    result.failedRecipes.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     Stage: ${f.failureStage}`);
      console.log(`     Error: ${f.lastError.substring(0, 100)}...`);
      console.log(`     Attempts: ${f.validationLog.length}`);
    });
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const successRate = result.generationStats
    ? ((result.generationStats.finalSuccess / result.generationStats.attempted) * 100).toFixed(1)
    : "N/A";

  const repairRate = result.generationStats
    ? (((result.generationStats.repairedByHaiku + result.generationStats.repairedBySonnet) / result.generationStats.attempted) * 100).toFixed(1)
    : "N/A";

  console.log(`\n  Success Rate: ${successRate}%`);
  console.log(`  Repair Rate:  ${repairRate}%`);
  console.log(`  Total KPIs:   ${result.recipes.length} successful, ${result.failedRecipes?.length ?? 0} failed`);

  // Cleanup
  await adapter.disconnect();
  console.log("\n✓ Disconnected from database");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
