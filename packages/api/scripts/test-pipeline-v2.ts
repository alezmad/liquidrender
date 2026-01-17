/**
 * Pipeline V2 Test Script
 *
 * Tests the KPI Pipeline V2 directly against LiquidGym databases.
 *
 * Usage:
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-v2.ts northwind
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-v2.ts pagila
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-v2.ts chinook
 */

import {
  DuckDBUniversalAdapter,
  applyHardRules,
  profileSchema,
  extractProfilingData,
} from "@repo/liquid-connect/uvb";
import {
  generateKPIsV2,
  analyzeForPipeline,
  createPipelineConfig,
  type PipelineOutput,
  type TableSchema,
} from "@turbostarter/ai/kpi";
import { generateId } from "@turbostarter/shared/utils";

// =============================================================================
// DATABASE CONFIGURATIONS
// =============================================================================

interface DatabaseConfig {
  name: string;
  displayName: string;
  connectionString: string;
  schema: string;
  businessType: string;
  description: string;
}

const DATABASES: Record<string, DatabaseConfig> = {
  northwind: {
    name: "northwind",
    displayName: "Northwind",
    connectionString: "postgresql://superadmin:superadmin@localhost:5433/northwind",
    schema: "public",
    businessType: "ecommerce",
    description: "B2B Trading - Orders, products, customers",
  },
  pagila: {
    name: "pagila",
    displayName: "Pagila",
    connectionString: "postgresql://superadmin:superadmin@localhost:5433/pagila",
    schema: "public",
    businessType: "subscription",
    description: "DVD Rental - Film rentals, payments",
  },
  chinook: {
    name: "chinook",
    displayName: "Chinook",
    connectionString: "postgresql://superadmin:superadmin@localhost:5433/chinook",
    schema: "public",
    businessType: "ecommerce",
    description: "Music Store - Albums, tracks, invoices",
  },
};

// =============================================================================
// MAIN TEST FUNCTION
// =============================================================================

async function testPipelineV2(dbName: string) {
  const config = DATABASES[dbName];
  if (!config) {
    console.error(`Unknown database: ${dbName}`);
    console.log("Available databases:", Object.keys(DATABASES).join(", "));
    process.exit(1);
  }

  const { displayName, connectionString, schema, businessType, description } = config;

  console.log("\n" + "═".repeat(70));
  console.log(`  PIPELINE V2 TEST - ${displayName.toUpperCase()}`);
  console.log(`  ${description}`);
  console.log("═".repeat(70));

  // =========================================================================
  // STEP 1: Connect and extract schema
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 1: Extracting schema via DuckDB Universal Adapter             │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const adapter = new DuckDBUniversalAdapter();
  await adapter.connect(connectionString);
  console.log("  ✓ Connected to database");

  const extractedSchema = await adapter.extractSchema(schema);
  console.log(`  ✓ Extracted ${extractedSchema.tables.length} tables`);

  // =========================================================================
  // STEP 2: Profile schema
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 2: Profiling schema                                           │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const profileResult = await profileSchema(adapter, extractedSchema, {
    enableTier2: true,
    maxConcurrentTables: 3,
  });
  const profiledSchema = profileResult.schema;
  const safeProfiles = {
    ...profiledSchema,
    columnProfiles: profiledSchema.columnProfiles ?? {},
    tableProfiles: profiledSchema.tableProfiles ?? {},
  };
  const profilingData = extractProfilingData(safeProfiles);
  console.log(`  ✓ Profiled ${Object.keys(profilingData.tableProfiles).length} tables`);
  console.log(`  ✓ Profiled ${Object.keys(profilingData.columnProfiles).length} columns`);

  // =========================================================================
  // STEP 3: Apply hard rules for vocabulary
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 3: Detecting vocabulary (hard rules)                          │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const vocabulary = applyHardRules(extractedSchema, profilingData);
  console.log(`  ✓ Detected ${vocabulary.metrics?.length ?? 0} metrics`);
  console.log(`  ✓ Detected ${vocabulary.dimensions?.length ?? 0} dimensions`);

  // =========================================================================
  // STEP 4: Convert to TableSchema format for V2 pipeline
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 4: Preparing schema for V2 pipeline                           │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  // Convert extracted schema to TableSchema format
  const tables: TableSchema[] = extractedSchema.tables.map((table) => ({
    name: table.name,
    columns: table.columns.map((col) => {
      const profileKey = `${table.name}.${col.name}`;
      const profile = profilingData.columnProfiles[profileKey];
      return {
        name: col.name,
        type: col.dataType,
        nullable: col.nullable ?? true,
        primaryKey: col.isPrimaryKey ?? false,
        foreignKey: col.foreignKey
          ? { table: col.foreignKey.table, column: col.foreignKey.column }
          : undefined,
        statistics: profile
          ? {
              distinctCount: profile.distinctCount,
              nullPercentage: profile.nullPercentage,
              min: profile.min,
              max: profile.max,
            }
          : undefined,
      };
    }),
    rowCount: profilingData.tableProfiles[table.name]?.rowCount,
  }));

  console.log(`  ✓ Converted ${tables.length} tables to V2 format`);

  // =========================================================================
  // STEP 5: Run V2 Pipeline (ANALYZE → PLAN → GENERATE → VALIDATE → REPAIR)
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 5: Running V2 Pipeline                                        │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n  Phase 0: ANALYZE (Schema Intelligence)...");
  const { schemaAnalysis, coverageAnalysis, patterns } = await analyzeForPipeline(
    tables,
    businessType
  );
  console.log(`    ✓ Detected ${schemaAnalysis.entities.length} entities`);
  console.log(`    ✓ Detected ${schemaAnalysis.metrics.length} metrics`);
  console.log(`    ✓ Detected ${schemaAnalysis.dimensions.length} dimensions`);
  console.log(`    ✓ Detected ${patterns.length} patterns`);
  console.log(`    ✓ Coverage requirements: ${coverageAnalysis.requirements.length}`);

  console.log("\n  Running full pipeline (PLAN → GENERATE → VALIDATE → REPAIR)...");
  console.log("  This may take 60-120 seconds...\n");

  const pipelineStartTime = Date.now();
  const connectionId = generateId();

  let output: PipelineOutput;
  try {
    output = await generateKPIsV2({
      schemaAnalysis,
      coverageAnalysis,
      patterns,
      config: createPipelineConfig(connectionId, "postgresql", businessType, {
        debug: true,
        maxKPIs: 15,
      }),
    });
  } catch (error) {
    console.error("\n  ❌ Pipeline failed:", error);
    await adapter.disconnect();
    process.exit(1);
  }

  const pipelineDuration = (Date.now() - pipelineStartTime) / 1000;
  console.log(`\n  ✓ Pipeline completed in ${pipelineDuration.toFixed(1)}s`);

  // =========================================================================
  // RESULTS
  // =========================================================================
  console.log("\n╔═════════════════════════════════════════════════════════════════════╗");
  console.log("║                         V2 PIPELINE RESULTS                         ║");
  console.log("╚═════════════════════════════════════════════════════════════════════╝");

  const { metrics, byStatus } = output;

  console.log("\n  📊 Summary:");
  console.log(`    Planned:           ${metrics.summary.planned}`);
  console.log(`    Valid (1st try):   ${metrics.summary.validFirstTry} ✅`);
  console.log(`    Needed Repair:     ${metrics.summary.neededRepair}`);
  console.log(`    Repaired:          ${metrics.summary.repaired} 🔧`);
  console.log(`    Failed:            ${metrics.summary.failed} ❌`);
  console.log(`    Success Rate:      ${(metrics.summary.successRate * 100).toFixed(1)}%`);
  console.log(`    Repair Rate:       ${(metrics.summary.repairRate * 100).toFixed(1)}%`);

  console.log("\n  ⏱️ Phase Timings:");
  if (metrics.phases.plan) {
    console.log(`    PLAN:     ${metrics.phases.plan.durationMs}ms`);
  }
  if (metrics.phases.generate) {
    console.log(`    GENERATE: ${metrics.phases.generate.durationMs}ms`);
  }
  if (metrics.phases.validate) {
    console.log(`    VALIDATE: ${metrics.phases.validate.durationMs}ms`);
  }
  if (metrics.phases.repair) {
    console.log(`    REPAIR:   ${metrics.phases.repair.durationMs}ms`);
  }

  console.log("\n  💰 Token Usage:");
  console.log(`    Total In:  ${metrics.tokenUsage.totalIn}`);
  console.log(`    Total Out: ${metrics.tokenUsage.totalOut}`);

  // List valid KPIs
  if (byStatus.valid.length > 0) {
    console.log("\n  ✅ Valid KPIs:");
    byStatus.valid.forEach((kpi, i) => {
      console.log(`    ${i + 1}. ${kpi.plan.name} (${kpi.plan.type})`);
      if (kpi.sql) {
        console.log(`       SQL: ${kpi.sql.substring(0, 60)}...`);
      }
    });
  }

  // List repaired KPIs
  if (byStatus.repaired.length > 0) {
    console.log("\n  🔧 Repaired KPIs:");
    byStatus.repaired.forEach((kpi, i) => {
      console.log(`    ${i + 1}. ${kpi.plan.name} (repaired by ${kpi.repairedBy})`);
    });
  }

  // List failed KPIs
  if (byStatus.needsReview.length > 0) {
    console.log("\n  ❌ Failed KPIs (needs review):");
    byStatus.needsReview.forEach((kpi, i) => {
      const errors = kpi.errors?.map((e) => e.message).join(", ") ?? "Unknown error";
      console.log(`    ${i + 1}. ${kpi.plan.name}: ${errors}`);
    });
  }

  // Warnings
  if (output.warnings && output.warnings.length > 0) {
    console.log("\n  ⚠️ Warnings:");
    output.warnings.forEach((w) => console.log(`    - ${w}`));
  }

  // Errors
  if (output.errors && output.errors.length > 0) {
    console.log("\n  🚨 Errors:");
    output.errors.forEach((e) => console.log(`    - ${e}`));
  }

  // Cleanup
  await adapter.disconnect();

  console.log("\n  ✓ Test complete\n");
}

// =============================================================================
// MAIN
// =============================================================================

const dbName = process.argv[2];

if (!dbName) {
  console.log("Usage: pnpm with-env pnpm tsx packages/api/scripts/test-pipeline-v2.ts <database>");
  console.log("Available databases:", Object.keys(DATABASES).join(", "));
  process.exit(1);
}

testPipelineV2(dbName).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
