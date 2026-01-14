/**
 * Full Onboarding Pipeline Test with Northwind
 *
 * Deletes existing Northwind data and runs complete onboarding:
 * 1. Clean up existing data
 * 2. Create connection
 * 3. Extract schema
 * 4. Profile tables
 * 5. Detect vocabulary
 * 6. Generate KPIs with tracing
 *
 * Usage:
 *   pnpm with-env pnpm tsx packages/api/scripts/test-full-onboarding-pipeline.ts
 */

import { db } from "@turbostarter/db/server";
import { like, inArray } from "drizzle-orm";
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
} from "@turbostarter/db/schema";
import {
  DuckDBUniversalAdapter,
  applyHardRules,
  profileSchema,
  extractProfilingData,
} from "@repo/liquid-connect/uvb";
import { generateKPIRecipes, type GenerateRecipeInput } from "@turbostarter/ai/kpi";
import { generateId } from "@turbostarter/shared/utils";

// Northwind via LiquidGym PostgreSQL (port 5433)
// Start with: cd ~/Desktop/liquidgym/infra && docker compose --profile loader up
// Datasets are loaded as separate DATABASES (not schemas)
const NORTHWIND_CONNECTION = "postgresql://superadmin:superadmin@localhost:5433/northwind";
const NORTHWIND_SCHEMA = "public";

// Use existing test organization (run check-orgs.ts to see available orgs)
const TEST_ORG_ID = "user-36tZoyvgjnq1EvalhwH5VUyvZ0aJcaO1";

async function main() {
  console.log("═".repeat(70));
  console.log("  FULL ONBOARDING PIPELINE TEST - NORTHWIND");
  console.log("═".repeat(70));

  // =========================================================================
  // STEP 1: Clean up existing Northwind data
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 1: Cleaning up existing Northwind data                        │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  // Find existing Northwind connections
  const existingConnections = await db
    .select({ id: knosiaConnection.id, name: knosiaConnection.name })
    .from(knosiaConnection)
    .where(like(knosiaConnection.name, "%orthwind%"));

  if (existingConnections.length > 0) {
    console.log(`\n  Found ${existingConnections.length} existing Northwind connection(s):`);
    existingConnections.forEach((c) => console.log(`    - ${c.name} (${c.id})`));

    const connectionIds = existingConnections.map((c) => c.id);

    // Delete in order (respecting foreign keys)
    // Note: Most tables have ON DELETE CASCADE, but we delete explicitly for logging
    console.log("\n  Deleting related data...");

    // Delete calculated metrics (has connectionId)
    const deletedMetrics = await db
      .delete(knosiaCalculatedMetric)
      .where(inArray(knosiaCalculatedMetric.connectionId, connectionIds))
      .returning({ id: knosiaCalculatedMetric.id });
    console.log(`    ✓ Deleted ${deletedMetrics.length} calculated metrics`);

    // Delete analyses (has connectionId) - cascades to table_profile → column_profile
    const deletedAnalyses = await db
      .delete(knosiaAnalysis)
      .where(inArray(knosiaAnalysis.connectionId, connectionIds))
      .returning({ id: knosiaAnalysis.id });
    console.log(`    ✓ Deleted ${deletedAnalyses.length} analyses (cascades to profiles)`);

    // Delete connection schemas (has connectionId)
    const deletedSchemas = await db
      .delete(knosiaConnectionSchema)
      .where(inArray(knosiaConnectionSchema.connectionId, connectionIds))
      .returning({ id: knosiaConnectionSchema.id });
    console.log(`    ✓ Deleted ${deletedSchemas.length} connection schemas`);

    // Delete connection health records (has connectionId)
    const deletedHealth = await db
      .delete(knosiaConnectionHealth)
      .where(inArray(knosiaConnectionHealth.connectionId, connectionIds))
      .returning({ id: knosiaConnectionHealth.id });
    console.log(`    ✓ Deleted ${deletedHealth.length} health records`);

    // Delete workspace connections (has connectionId)
    const deletedWorkspaceConn = await db
      .delete(knosiaWorkspaceConnection)
      .where(inArray(knosiaWorkspaceConnection.connectionId, connectionIds))
      .returning({ connectionId: knosiaWorkspaceConnection.connectionId });
    console.log(`    ✓ Deleted ${deletedWorkspaceConn.length} workspace connections`);

    // Finally, delete the connections (remaining cascades handle any missed items)
    const deletedConnections = await db
      .delete(knosiaConnection)
      .where(inArray(knosiaConnection.id, connectionIds))
      .returning({ id: knosiaConnection.id });
    console.log(`    ✓ Deleted ${deletedConnections.length} connections`);

    // Note: knosiaVocabularyItem uses orgId, not connectionId
    // Vocabulary items are org-level, not connection-level, so we don't delete them here
  } else {
    console.log("\n  No existing Northwind connections found.");
  }

  // =========================================================================
  // STEP 2: Create new connection
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 2: Creating new Northwind connection                          │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const connectionId = generateId();
  const now = new Date();
  const [newConnection] = await db
    .insert(knosiaConnection)
    .values({
      id: connectionId,
      orgId: TEST_ORG_ID,
      name: "Northwind (Test)",
      type: "postgres",
      host: "localhost",
      port: 5433,
      database: "postgres",
      schema: NORTHWIND_SCHEMA,
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
  await adapter.connect(NORTHWIND_CONNECTION);
  console.log("\n  ✓ Connected to LiquidGym PostgreSQL");

  const schema = await adapter.extractSchema(NORTHWIND_SCHEMA);
  console.log(`  ✓ Found ${schema.tables.length} tables:`);
  schema.tables.forEach((t) => {
    console.log(`    - ${t.name} (${t.columns.length} columns)`);
  });

  // Save schema to database
  const [savedSchema] = await db
    .insert(knosiaConnectionSchema)
    .values({
      id: generateId(),
      connectionId,
      schemaName: NORTHWIND_SCHEMA,
      extractedSchema: schema as any,
      tablesCount: schema.tables.length,
      columnsCount: schema.tables.reduce((sum, t) => sum + t.columns.length, 0),
    })
    .returning();

  console.log(`  ✓ Saved schema to database (${savedSchema.tablesCount} tables, ${savedSchema.columnsCount} columns)`);

  // =========================================================================
  // STEP 4: Profile tables
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 4: Profiling tables                                           │");
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

  console.log(`\n  ✓ Profiled ${Object.keys(profilingData.tableProfiles).length} tables`);

  // =========================================================================
  // STEP 5: Detect vocabulary (moved before analysis/profile save)
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 5: Detecting vocabulary                                       │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  const vocabulary = applyHardRules(schema, profilingData);

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
      tables: schema.tables.length,
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

  // Save profiles to database using correct schema structure
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
          nullCount: Math.round((colProfile.nullPercentage ?? 0) * (profile.rowCount ?? 0) / 100),
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

  // Helper to create URL-safe slug
  const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
  // STEP 6: Generate KPIs with tracing
  // =========================================================================
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 6: Generating KPIs (with tracing)                             │");
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

  console.log("\n  Generating KPIs (this may take 30-60 seconds)...\n");

  const startTime = Date.now();
  const result = await generateKPIRecipes(
    {
      businessType: "ecommerce",
      vocabularyContext,
      useSchemaFirstGeneration: true,
    },
    {
      model: "haiku",
      maxRecipes: 15,
    }
  );
  const duration = Date.now() - startTime;

  console.log(`  ✓ Generation completed in ${(duration / 1000).toFixed(1)}s`);

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

  // Log successful KPIs (not saving to knosiaCalculatedMetric - requires workspace)
  console.log("\n  ✅ Successful KPIs:");
  let kpiCount = 0;
  for (const recipe of result.recipes) {
    kpiCount++;
    console.log(`    ${kpiCount}. ${recipe.name} (${recipe.category})`);
    if (recipe.semanticDefinition) {
      const def = recipe.semanticDefinition as { type?: string; entity?: string };
      console.log(`       Type: ${def.type}, Entity: ${def.entity}`);
    }
  }
  console.log(`\n  ✓ Generated ${kpiCount} KPIs (not persisted - test mode)`);

  // Show failed KPIs with trace data
  if (result.failedRecipes && result.failedRecipes.length > 0) {
    console.log("\n  ❌ Failed KPIs (with trace data):");
    result.failedRecipes.forEach((f, i) => {
      console.log(`\n    ${i + 1}. ${f.name}`);
      console.log(`       Stage: ${f.failureStage}`);
      console.log(`       Error: ${f.lastError.substring(0, 80)}...`);

      // Show trace data from repair attempts
      const repairLogs = f.validationLog.filter((log) => log.stage === "repair");
      if (repairLogs.length > 0) {
        console.log(`       Repair Attempts: ${repairLogs.length}`);
        repairLogs.forEach((log) => {
          if (log.promptName) {
            console.log(`         📝 Prompt: ${log.promptName} v${log.promptVersion}`);
          }
          if (log.latencyMs !== undefined) {
            console.log(`         ⏱️  Latency: ${log.latencyMs}ms`);
          }
          if (log.tokensIn !== undefined) {
            console.log(`         🔢 Tokens: ${log.tokensIn} in / ${log.tokensOut} out`);
          }
        });
      }
    });
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n╔═════════════════════════════════════════════════════════════════════╗");
  console.log("║                           PIPELINE SUMMARY                          ║");
  console.log("╚═════════════════════════════════════════════════════════════════════╝");

  console.log(`
  Connection:       ${newConnection.name} (${newConnection.id})
  Tables:           ${schema.tables.length}
  Vocabulary Items: ${vocabCount}
  KPIs Generated:   ${result.recipes.length} successful, ${result.failedRecipes?.length ?? 0} failed
  Total Duration:   ${(duration / 1000).toFixed(1)}s

  Success Rate:     ${result.generationStats ? ((result.generationStats.finalSuccess / result.generationStats.attempted) * 100).toFixed(1) : "N/A"}%
  Repair Rate:      ${result.generationStats ? (((result.generationStats.repairedByHaiku + result.generationStats.repairedBySonnet) / result.generationStats.attempted) * 100).toFixed(1) : "N/A"}%
  `);

  // Cleanup
  await adapter.disconnect();
  console.log("  ✓ Pipeline complete\n");

  process.exit(0);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
