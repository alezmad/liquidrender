/**
 * Unified Pipeline Test Script
 *
 * Tests the full onboarding pipeline against any LiquidGym database.
 *
 * Usage:
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts <database>
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts --list
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts --all
 *
 * Examples:
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts northwind
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts pagila
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts chinook
 *   pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts --all
 */

import { db } from "@turbostarter/db/server";
import { like, inArray, eq } from "drizzle-orm";
import {
  knosiaConnection,
  knosiaConnectionSchema,
  knosiaConnectionHealth,
  knosiaVocabularyItem,
  knosiaCalculatedMetric,
  knosiaTableProfile,
  knosiaColumnProfile,
  knosiaAnalysis,
  knosiaWorkspaceConnection,
  knosiaWorkspace,
} from "@turbostarter/db/schema";
import {
  DuckDBUniversalAdapter,
  applyHardRules,
  profileSchema,
  extractProfilingData,
} from "@repo/liquid-connect/uvb";
import { generateAndStoreKPIs } from "../src/modules/knosia/vocabulary/kpi-generation";
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
  adventureworks: {
    name: "adventureworks",
    displayName: "AdventureWorks",
    connectionString: "postgresql://superadmin:superadmin@localhost:5433/adventureworks",
    schema: "public",
    businessType: "manufacturing",
    description: "Manufacturing - HR, production, purchasing",
  },
  netflix: {
    name: "netflix",
    displayName: "Netflix",
    connectionString: "postgresql://superadmin:superadmin@localhost:5433/netflix",
    schema: "public",
    businessType: "entertainment",
    description: "Entertainment - Shows, ratings",
  },
  lego: {
    name: "lego",
    displayName: "Lego",
    connectionString: "postgresql://superadmin:superadmin@localhost:5433/lego",
    schema: "public",
    businessType: "ecommerce",
    description: "Product Catalog - Parts, themes, inventories",
  },
  employees: {
    name: "employees",
    displayName: "Employees",
    connectionString: "postgresql://superadmin:superadmin@localhost:5433/employees",
    schema: "public",
    businessType: "hr",
    description: "HR - Employee records, departments",
  },
};

// Use existing test organization
const TEST_ORG_ID = "user-36tZoyvgjnq1EvalhwH5VUyvZ0aJcaO1";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Helper to create URL-safe slug
const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// =============================================================================
// PIPELINE RUNNER
// =============================================================================

interface PipelineResult {
  database: string;
  tables: number;
  vocabularyItems: number;
  kpisGenerated: number;
  kpisFailed: number;
  repairRate: number;
  duration: number;
  success: boolean;
  valueValidation?: {
    executed: number;
    valid: number;
    suspicious: number;
    invalid: number;
    executionErrors: number;
  };
}

async function runPipeline(config: DatabaseConfig, verbose = true): Promise<PipelineResult> {
  const startTime = Date.now();
  const { name, displayName, connectionString, schema, businessType } = config;

  console.log("\n" + "═".repeat(70));
  console.log(`  PIPELINE TEST - ${displayName.toUpperCase()}`);
  console.log(`  ${config.description}`);
  console.log("═".repeat(70));

  // =========================================================================
  // STEP 1: Clean up existing data
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log(`│ STEP 1: Cleaning up existing ${displayName} data`.padEnd(70) + "│");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const existingConnections = await db
    .select({ id: knosiaConnection.id, name: knosiaConnection.name })
    .from(knosiaConnection)
    .where(like(knosiaConnection.name, `%${displayName}%`));

  if (existingConnections.length > 0) {
    console.log(`\n  Found ${existingConnections.length} existing connection(s):`);
    existingConnections.forEach((c) => console.log(`    - ${c.name} (${c.id})`));

    const connectionIds = existingConnections.map((c) => c.id);

    console.log("\n  Deleting related data...");

    const deletedMetrics = await db
      .delete(knosiaCalculatedMetric)
      .where(inArray(knosiaCalculatedMetric.connectionId, connectionIds))
      .returning({ id: knosiaCalculatedMetric.id });
    console.log(`    ✓ Deleted ${deletedMetrics.length} calculated metrics`);

    const deletedAnalyses = await db
      .delete(knosiaAnalysis)
      .where(inArray(knosiaAnalysis.connectionId, connectionIds))
      .returning({ id: knosiaAnalysis.id });
    console.log(`    ✓ Deleted ${deletedAnalyses.length} analyses (cascades to profiles)`);

    const deletedSchemas = await db
      .delete(knosiaConnectionSchema)
      .where(inArray(knosiaConnectionSchema.connectionId, connectionIds))
      .returning({ id: knosiaConnectionSchema.id });
    console.log(`    ✓ Deleted ${deletedSchemas.length} connection schemas`);

    const deletedHealth = await db
      .delete(knosiaConnectionHealth)
      .where(inArray(knosiaConnectionHealth.connectionId, connectionIds))
      .returning({ id: knosiaConnectionHealth.id });
    console.log(`    ✓ Deleted ${deletedHealth.length} health records`);

    const deletedWorkspaceConn = await db
      .delete(knosiaWorkspaceConnection)
      .where(inArray(knosiaWorkspaceConnection.connectionId, connectionIds))
      .returning({ connectionId: knosiaWorkspaceConnection.connectionId });
    console.log(`    ✓ Deleted ${deletedWorkspaceConn.length} workspace connections`);

    const deletedConnections = await db
      .delete(knosiaConnection)
      .where(inArray(knosiaConnection.id, connectionIds))
      .returning({ id: knosiaConnection.id });
    console.log(`    ✓ Deleted ${deletedConnections.length} connections`);
  } else {
    console.log("\n  No existing connections found.");
  }

  // =========================================================================
  // STEP 2: Create new connection
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log(`│ STEP 2: Creating new ${displayName} connection`.padEnd(70) + "│");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const connectionId = generateId();
  const now = new Date();
  const [newConnection] = await db
    .insert(knosiaConnection)
    .values({
      id: connectionId,
      orgId: TEST_ORG_ID,
      name: `${displayName} (Test)`,
      type: "postgres",
      host: "localhost",
      port: 5433,
      database: name,
      schema,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  console.log(`\n  ✓ Created connection: ${newConnection.name} (${newConnection.id})`);

  // =========================================================================
  // STEP 3: Connect and extract schema
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 3: Extracting schema                                          │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const adapter = new DuckDBUniversalAdapter();
  await adapter.connect(connectionString);
  console.log("\n  ✓ Connected to LiquidGym PostgreSQL");

  const extractedSchema = await adapter.extractSchema(schema);
  console.log(`  ✓ Found ${extractedSchema.tables.length} tables:`);
  if (verbose) {
    extractedSchema.tables.forEach((t) => {
      console.log(`    - ${t.name} (${t.columns.length} columns)`);
    });
  }

  const [savedSchema] = await db
    .insert(knosiaConnectionSchema)
    .values({
      id: generateId(),
      connectionId,
      schemaName: schema,
      extractedSchema: extractedSchema as any,
      tablesCount: extractedSchema.tables.length,
      columnsCount: extractedSchema.tables.reduce((sum, t) => sum + t.columns.length, 0),
    })
    .returning();

  console.log(`  ✓ Saved schema to database (${savedSchema.tablesCount} tables, ${savedSchema.columnsCount} columns)`);

  // =========================================================================
  // STEP 4: Profile tables
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 4: Profiling tables                                           │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const profileResult = await profileSchema(adapter, extractedSchema, {
    enableTier2: true,
    maxConcurrentTables: 3,
  });

  // profileSchema returns ProfileResult with schema: ProfiledSchema inside
  const profiledSchema = profileResult.schema;
  const safeProfiles = {
    ...profiledSchema,
    columnProfiles: profiledSchema.columnProfiles ?? {},
    tableProfiles: profiledSchema.tableProfiles ?? {},
  };
  const profilingData = extractProfilingData(safeProfiles);
  console.log(`\n  ✓ Profiled ${Object.keys(profilingData.tableProfiles).length} tables`);

  // =========================================================================
  // STEP 5: Detect vocabulary
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 5: Detecting vocabulary                                       │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const vocabulary = applyHardRules(extractedSchema, profilingData);

  console.log(`\n  ✓ Detected vocabulary:`);
  console.log(`    - ${vocabulary.metrics?.length ?? 0} metrics`);
  console.log(`    - ${vocabulary.dimensions?.length ?? 0} dimensions`);
  console.log(`    - ${vocabulary.entities?.length ?? 0} entities`);

  // Create an analysis record (required for profiles)
  const analysisId = generateId();
  await db.insert(knosiaAnalysis).values({
    id: analysisId,
    connectionId,
    status: "completed",
    currentStep: 5,
    totalSteps: 5,
    summary: {
      tables: extractedSchema.tables.length,
      metrics: vocabulary.metrics?.length ?? 0,
      dimensions: vocabulary.dimensions?.length ?? 0,
      entities: vocabulary.entities?.map((e) => e.name) ?? [],
    },
    detectedVocab: {
      metrics: vocabulary.metrics ?? [],
      dimensions: vocabulary.dimensions ?? [],
      entities: vocabulary.entities ?? [],
    },
    completedAt: new Date(),
  });
  console.log(`  ✓ Created analysis record: ${analysisId}`);

  // Create or get workspace for KPI storage
  let workspaceId: string;
  const existingWorkspace = await db
    .select()
    .from(knosiaWorkspace)
    .where(eq(knosiaWorkspace.orgId, TEST_ORG_ID))
    .limit(1);

  if (existingWorkspace.length > 0) {
    workspaceId = existingWorkspace[0].id;
    console.log(`  ✓ Using existing workspace: ${workspaceId}`);
  } else {
    workspaceId = generateId();
    await db.insert(knosiaWorkspace).values({
      id: workspaceId,
      orgId: TEST_ORG_ID,
      name: "Test Workspace",
      slug: "test-workspace",
    });
    console.log(`  ✓ Created workspace: ${workspaceId}`);
  }

  // Save profiles to database
  let tableProfileCount = 0;
  let columnProfileCount = 0;

  for (const [tableName, profile] of Object.entries(profilingData.tableProfiles)) {
    const tableProfileId = generateId();
    await db.insert(knosiaTableProfile).values({
      id: tableProfileId,
      analysisId,
      tableName,
      profile: {
        tableName,
        rowCountEstimate: profile.rowCount ?? 0,
        tableSizeBytes: 0,
        samplingRate: 1.0,
        emptyColumnCount: 0,
        sparseColumnCount: 0,
      },
    });
    tableProfileCount++;

    // Save column profiles for this table
    for (const [key, colProfile] of Object.entries(profilingData.columnProfiles)) {
      const [tbl, columnName] = key.split(".");
      if (tbl !== tableName) continue;

      await db.insert(knosiaColumnProfile).values({
        id: generateId(),
        tableProfileId,
        columnName,
        profile: {
          columnName,
          dataType: colProfile.dataType ?? "unknown",
          nullCount: Math.round(((colProfile.nullPercentage ?? 0) * (profile.rowCount ?? 0)) / 100),
          nullPercentage: colProfile.nullPercentage ?? 0,
          ...(colProfile.distinctCount !== undefined && {
            categorical: {
              cardinality: colProfile.distinctCount,
              topValues: [],
              isHighCardinality: colProfile.distinctCount > 1000,
              isLowCardinality: colProfile.distinctCount < 20,
              possiblyUnique: colProfile.distinctCount === profile.rowCount,
            },
          }),
        },
      });
      columnProfileCount++;
    }
  }

  console.log(`  ✓ Saved ${tableProfileCount} table profiles, ${columnProfileCount} column profiles`);

  // Save vocabulary items to database
  let vocabCount = 0;

  for (const metric of vocabulary.metrics ?? []) {
    await db.insert(knosiaVocabularyItem).values({
      id: generateId(),
      orgId: TEST_ORG_ID,
      canonicalName: metric.name,
      slug: toSlug(metric.name),
      type: "metric",
      status: "approved",
      aggregation: metric.aggregationHint as "SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | undefined,
      definition: {
        descriptionHuman: `${metric.semanticType ?? "Numeric"} metric from ${metric.tableName}`,
        sourceColumn: metric.columnName,
        sourceTables: [metric.tableName],
      },
    });
    vocabCount++;
  }

  for (const dimension of vocabulary.dimensions ?? []) {
    await db.insert(knosiaVocabularyItem).values({
      id: generateId(),
      orgId: TEST_ORG_ID,
      canonicalName: dimension.name,
      slug: toSlug(dimension.name),
      type: "dimension",
      status: "approved",
      cardinality: dimension.cardinality,
      definition: {
        descriptionHuman: `${dimension.semanticType ?? "Categorical"} dimension from ${dimension.tableName}`,
        sourceColumn: dimension.columnName,
        sourceTables: [dimension.tableName],
      },
    });
    vocabCount++;
  }

  console.log(`  ✓ Saved ${vocabCount} vocabulary items`);

  // =========================================================================
  // STEP 6: Generate KPIs (Full Pipeline with Value Validation)
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 6: Generating KPIs (full pipeline + value validation)         │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n  Generating KPIs (this may take 60-90 seconds with validation)...\n");

  const kpiStartTime = Date.now();
  const result = await generateAndStoreKPIs({
    detectedVocabulary: vocabulary.detected,
    profilingData,
    businessType,
    extractedSchema,
    orgId: TEST_ORG_ID,
    workspaceId,
    connection: {
      connectionString,
      defaultSchema: schema,
      type: "postgres",
    },
  });
  const kpiDuration = Date.now() - kpiStartTime;

  console.log(`  ✓ Generation completed in ${(kpiDuration / 1000).toFixed(1)}s`);

  if (result.generationStats) {
    const stats = result.generationStats;
    console.log("\n  📊 Generation Stats:");
    console.log(`    Attempted:         ${stats.attempted}`);
    console.log(`    Passed Schema:     ${stats.passedSchema}`);
    console.log(`    Passed Compile:    ${stats.passedCompile}`);
    console.log(`    Repaired (Haiku):  ${stats.repairedByHaiku}`);
    console.log(`    Repaired (Sonnet): ${stats.repairedBySonnet}`);
    console.log(`    Final Success:     ${stats.finalSuccess}`);
    console.log(`    Final Failed:      ${stats.finalFailed}`);
  }

  // Value validation results
  const valueValidation = result.valueValidation;
  if (valueValidation) {
    console.log("\n  🔍 Value Validation Results:");
    console.log(`    Executed:          ${valueValidation.executed}`);
    console.log(`    Valid:             ${valueValidation.valid} ✅`);
    console.log(`    Suspicious:        ${valueValidation.suspicious} ⚠️`);
    console.log(`    Invalid:           ${valueValidation.invalid} ❌`);
    console.log(`    Execution Errors:  ${valueValidation.executionErrors}`);
  }

  const successCount = result.storedCount;
  const failedCount = result.failedCount;
  const repairRate = result.generationStats
    ? ((result.generationStats.repairedByHaiku + result.generationStats.repairedBySonnet) /
        (result.generationStats.attempted || 1)) *
      100
    : 0;

  // Log successful KPIs
  console.log("\n  ✅ Stored KPIs:");
  result.kpis.forEach((kpi, i) => {
    const qualityIcon = kpi.qualityScore === "high" ? "🟢" : kpi.qualityScore === "medium" ? "🟡" : "🔴";
    console.log(`    ${i + 1}. ${kpi.name} (${kpi.category}) ${qualityIcon}`);
  });
  console.log(`\n  ✓ Stored ${successCount} KPIs to database`);

  // Cleanup
  await adapter.disconnect();

  const duration = (Date.now() - startTime) / 1000;

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n╔═════════════════════════════════════════════════════════════════════╗");
  console.log("║                           PIPELINE SUMMARY                          ║");
  console.log("╚═════════════════════════════════════════════════════════════════════╝");

  // Build value validation summary
  let valueValidationSummary = "";
  if (valueValidation) {
    valueValidationSummary = `
  Value Validation: ${valueValidation.valid} valid, ${valueValidation.suspicious} suspicious, ${valueValidation.invalid} invalid`;
  }

  console.log(`
  Connection:       ${newConnection.name} (${newConnection.id})
  Database:         ${displayName}
  Business Type:    ${businessType}
  Tables:           ${extractedSchema.tables.length}
  Vocabulary Items: ${vocabCount}
  KPIs Stored:      ${successCount} successful, ${failedCount} failed
  Total Duration:   ${duration.toFixed(1)}s

  Success Rate:     ${((successCount / (successCount + failedCount || 1)) * 100).toFixed(1)}%
  Repair Rate:      ${repairRate.toFixed(1)}%${valueValidationSummary}
  `);

  console.log("  ✓ Pipeline complete\n");

  return {
    database: displayName,
    tables: extractedSchema.tables.length,
    vocabularyItems: vocabCount,
    kpisGenerated: successCount,
    kpisFailed: failedCount,
    repairRate,
    duration,
    success: failedCount === 0,
    valueValidation,
  };
}

// =============================================================================
// MAIN
// =============================================================================

function printUsage() {
  console.log(`
Usage: pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts <database|option>

Options:
  --list, -l    List available databases
  --all, -a     Run pipeline for all databases

Available databases:`);
  Object.entries(DATABASES).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(15)} ${config.description}`);
  });
  console.log(`
Examples:
  pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts northwind
  pnpm with-env pnpm tsx packages/api/scripts/test-pipeline.ts --all
`);
}

async function main() {
  const args = process.argv.slice(2);
  const arg = args[0]?.toLowerCase();

  if (!arg || arg === "--help" || arg === "-h") {
    printUsage();
    process.exit(0);
  }

  if (arg === "--list" || arg === "-l") {
    console.log("\nAvailable databases:\n");
    Object.entries(DATABASES).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(15)} ${config.description}`);
    });
    process.exit(0);
  }

  if (arg === "--all" || arg === "-a") {
    console.log("\n" + "█".repeat(70));
    console.log("  RUNNING ALL DATABASE PIPELINES");
    console.log("█".repeat(70));

    const results: PipelineResult[] = [];
    for (const config of Object.values(DATABASES)) {
      try {
        const result = await runPipeline(config, false); // Less verbose for --all
        results.push(result);
      } catch (error) {
        console.error(`\n❌ Failed to run pipeline for ${config.displayName}:`, error);
        results.push({
          database: config.displayName,
          tables: 0,
          vocabularyItems: 0,
          kpisGenerated: 0,
          kpisFailed: 0,
          repairRate: 0,
          duration: 0,
          success: false,
        });
      }
    }

    // Print summary table
    console.log("\n\n" + "█".repeat(70));
    console.log("  ALL PIPELINES COMPLETE - SUMMARY");
    console.log("█".repeat(70));
    console.log("\n  Database         Tables  Vocab  KPIs   Failed  Repair%  Time    Status");
    console.log("  " + "─".repeat(72));
    results.forEach((r) => {
      const status = r.success ? "✅" : "❌";
      console.log(
        `  ${r.database.padEnd(17)} ${String(r.tables).padStart(5)}  ${String(r.vocabularyItems).padStart(5)}  ${String(r.kpisGenerated).padStart(4)}   ${String(r.kpisFailed).padStart(5)}   ${r.repairRate.toFixed(1).padStart(6)}%  ${r.duration.toFixed(1).padStart(5)}s   ${status}`
      );
    });

    const totalKPIs = results.reduce((sum, r) => sum + r.kpisGenerated, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.kpisFailed, 0);
    const avgRepair = results.reduce((sum, r) => sum + r.repairRate, 0) / results.length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    const allSuccess = results.every((r) => r.success);

    console.log("  " + "─".repeat(72));
    console.log(
      `  ${"TOTAL".padEnd(17)} ${String(results.reduce((s, r) => s + r.tables, 0)).padStart(5)}  ${String(results.reduce((s, r) => s + r.vocabularyItems, 0)).padStart(5)}  ${String(totalKPIs).padStart(4)}   ${String(totalFailed).padStart(5)}   ${avgRepair.toFixed(1).padStart(6)}%  ${totalTime.toFixed(1).padStart(5)}s   ${allSuccess ? "✅" : "❌"}`
    );

    process.exit(allSuccess ? 0 : 1);
  }

  // Single database
  const config = DATABASES[arg];
  if (!config) {
    console.error(`\n❌ Unknown database: ${arg}`);
    printUsage();
    process.exit(1);
  }

  try {
    const result = await runPipeline(config, true); // Verbose for single db
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Pipeline failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
