import { eq, and } from "@turbostarter/db";
import {
  knosiaAnalysis,
  knosiaConnection,
  knosiaTableProfile,
  knosiaColumnProfile,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

// Dynamic import to avoid Turbopack issues with native modules
const getDuckDBAdapter = async () => {
  const { DuckDBUniversalAdapter, applyHardRules, profileSchema } = await import("@repo/liquid-connect/uvb");
  return { DuckDBUniversalAdapter, applyHardRules, profileSchema };
};

import type { GetAnalysisInput } from "./schemas";
import type { StepEvent, CompleteEvent, ErrorEvent } from "./schemas";

// ============================================================================
// ANALYSIS STEP DEFINITIONS
// ============================================================================

const ANALYSIS_STEPS = [
  { step: 1, label: "Connecting to database", detail: "Establishing secure connection..." },
  { step: 2, label: "Scanning schema", detail: "Discovering tables and relationships..." },
  { step: 3, label: "Detecting business type", detail: "Analyzing naming patterns..." },
  { step: 4, label: "Classifying fields", detail: "Identifying metrics, dimensions, entities..." },
  { step: 5, label: "Generating vocabulary", detail: "Building semantic mappings..." },
  // Profiling steps (optional - enabled via includeDataProfiling parameter)
  { step: 6, label: "Profiling data quality", detail: "Analyzing data completeness and patterns..." },
  { step: 7, label: "Assessing freshness", detail: "Checking recency and update patterns..." },
  { step: 8, label: "Finalizing insights", detail: "Compiling data health summary..." },
] as const;

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get analysis by ID
 */
export const getAnalysis = async (input: GetAnalysisInput) => {
  const result = await db
    .select()
    .from(knosiaAnalysis)
    .where(eq(knosiaAnalysis.id, input.id))
    .limit(1);

  return result[0] ?? null;
};

/**
 * Get connection by ID (validates it exists)
 */
export const getConnection = async (connectionId: string) => {
  const result = await db
    .select()
    .from(knosiaConnection)
    .where(eq(knosiaConnection.id, connectionId))
    .limit(1);

  return result[0] ?? null;
};

/**
 * Get table profile for a specific table in an analysis
 */
export const getTableProfile = async (analysisId: string, tableName: string) => {
  const result = await db
    .select()
    .from(knosiaTableProfile)
    .where(
      and(
        eq(knosiaTableProfile.analysisId, analysisId),
        eq(knosiaTableProfile.tableName, tableName),
      ),
    )
    .limit(1);

  return result[0] ?? null;
};

/**
 * Get all column profiles for a specific table profile
 */
export const getColumnProfiles = async (tableProfileId: string) => {
  return db
    .select()
    .from(knosiaColumnProfile)
    .where(eq(knosiaColumnProfile.tableProfileId, tableProfileId));
};

/**
 * Get high-level profiling summary for an analysis
 */
export const getProfilingSummary = async (analysisId: string) => {
  const tableProfiles = await db
    .select()
    .from(knosiaTableProfile)
    .where(eq(knosiaTableProfile.analysisId, analysisId));

  if (tableProfiles.length === 0) {
    return null;
  }

  // Calculate aggregate statistics
  let totalRows = 0;
  let totalSize = 0;
  let tablesWithFreshness = 0;
  let staleTables = 0;
  const updateFrequencies: Record<string, number> = {};

  for (const tp of tableProfiles) {
    const profile = tp.profile as any;
    totalRows += profile.rowCountEstimate || 0;
    totalSize += profile.tableSizeBytes || 0;

    if (profile.latestDataAt) {
      tablesWithFreshness++;
      const daysSinceUpdate = profile.dataSpanDays || 0;
      if (daysSinceUpdate > 30) {
        staleTables++;
      }
    }

    if (profile.updateFrequency?.pattern) {
      const pattern = profile.updateFrequency.pattern;
      updateFrequencies[pattern] = (updateFrequencies[pattern] || 0) + 1;
    }
  }

  return {
    analysisId,
    tableCount: tableProfiles.length,
    totalRows,
    totalSizeBytes: totalSize,
    averageRowsPerTable: Math.round(totalRows / tableProfiles.length),
    tablesWithFreshness,
    staleTables,
    updateFrequencies,
  };
};

// ============================================================================
// ANALYSIS EXECUTION
// ============================================================================

/**
 * Run analysis - returns async generator for SSE streaming
 *
 * Uses UVB (Universal Vocabulary Builder) for real schema extraction
 * and hard rules detection.
 *
 * @param connectionId - Database connection ID
 * @param includeDataProfiling - Optional: Enable data profiling (steps 6-8)
 */
export async function* runAnalysis(
  connectionId: string,
  includeDataProfiling: boolean = false
): AsyncGenerator<
  | { event: "step"; data: StepEvent }
  | { event: "complete"; data: CompleteEvent }
  | { event: "error"; data: ErrorEvent }
> {
  const totalSteps = includeDataProfiling ? 8 : 5;
  // Validate connection exists
  const connection = await getConnection(connectionId);
  if (!connection) {
    yield {
      event: "error",
      data: {
        code: "CONNECTION_NOT_FOUND",
        message: "The specified connection was not found",
        recoverable: false,
      },
    };
    return;
  }

  // Create analysis record
  const analysisResult = await db
    .insert(knosiaAnalysis)
    .values({
      connectionId,
      status: "running",
      currentStep: 0,
      totalSteps,
      startedAt: new Date(),
    })
    .returning();

  const analysis = analysisResult[0];
  if (!analysis) {
    yield {
      event: "error",
      data: {
        code: "ANALYSIS_CREATE_FAILED",
        message: "Failed to create analysis record",
        recoverable: true,
      },
    };
    return;
  }

  // Parse credentials
  let credentials: { username?: string; password?: string };
  try {
    credentials = JSON.parse(connection.credentials ?? "{}") as { username?: string; password?: string };
  } catch {
    credentials = {};
  }

  // Build connection string
  let connectionString: string;
  try {
    switch (connection.type) {
      case 'postgres': {
        const port = connection.port ?? 5432;
        const auth = credentials.username && credentials.password
          ? `${credentials.username}:${credentials.password}@`
          : '';
        connectionString = `postgresql://${auth}${connection.host}:${port}/${connection.database}`;
        break;
      }

      case 'mysql': {
        const port = connection.port ?? 3306;
        const auth = credentials.username && credentials.password
          ? `${credentials.username}:${credentials.password}@`
          : '';
        connectionString = `mysql://${auth}${connection.host}:${port}/${connection.database}`;
        break;
      }

      case 'duckdb': {
        connectionString = connection.database; // database field contains the file path
        break;
      }

      default:
        yield {
          event: "error",
          data: {
            code: "UNSUPPORTED_TYPE",
            message: `Connection type '${connection.type}' is not supported`,
            recoverable: false,
          },
        };
        return;
    }
  } catch (error) {
    yield {
      event: "error",
      data: {
        code: "CONNECTION_STRING_ERROR",
        message: error instanceof Error ? error.message : "Failed to build connection string",
        recoverable: false,
      },
    };
    return;
  }

  // Create DuckDB Universal Adapter (using dynamic import)
  const { DuckDBUniversalAdapter, applyHardRules, profileSchema } = await getDuckDBAdapter();
  const adapter = new DuckDBUniversalAdapter();

  try {
    // Step 1: Connect to database
    yield {
      event: "step",
      data: {
        step: 1,
        status: "started",
        label: ANALYSIS_STEPS[0].label,
        detail: ANALYSIS_STEPS[0].detail,
      },
    };

    await db
      .update(knosiaAnalysis)
      .set({ currentStep: 1 })
      .where(eq(knosiaAnalysis.id, analysis.id));

    await adapter.connect(connectionString);

    yield {
      event: "step",
      data: {
        step: 1,
        status: "completed",
        label: ANALYSIS_STEPS[0].label,
      },
    };

    // Step 2: Extract schema
    yield {
      event: "step",
      data: {
        step: 2,
        status: "started",
        label: ANALYSIS_STEPS[1].label,
        detail: ANALYSIS_STEPS[1].detail,
      },
    };

    await db
      .update(knosiaAnalysis)
      .set({ currentStep: 2 })
      .where(eq(knosiaAnalysis.id, analysis.id));

    const schema = await adapter.extractSchema(connection.schema ?? "public");

    yield {
      event: "step",
      data: {
        step: 2,
        status: "completed",
        label: ANALYSIS_STEPS[1].label,
      },
    };

    // Step 3: Detect business type (mock for now - could use LLM)
    yield {
      event: "step",
      data: {
        step: 3,
        status: "started",
        label: ANALYSIS_STEPS[2].label,
        detail: ANALYSIS_STEPS[2].detail,
      },
    };

    await db
      .update(knosiaAnalysis)
      .set({ currentStep: 3 })
      .where(eq(knosiaAnalysis.id, analysis.id));

    // Simple heuristic for business type detection
    const tableNames = schema.tables.map((t) => t.name.toLowerCase());
    const businessType = detectBusinessType(tableNames);

    yield {
      event: "step",
      data: {
        step: 3,
        status: "completed",
        label: ANALYSIS_STEPS[2].label,
      },
    };

    // Step 4: Apply hard rules
    yield {
      event: "step",
      data: {
        step: 4,
        status: "started",
        label: ANALYSIS_STEPS[3].label,
        detail: ANALYSIS_STEPS[3].detail,
      },
    };

    await db
      .update(knosiaAnalysis)
      .set({ currentStep: 4 })
      .where(eq(knosiaAnalysis.id, analysis.id));

    const { detected, confirmations } = applyHardRules(schema);

    yield {
      event: "step",
      data: {
        step: 4,
        status: "completed",
        label: ANALYSIS_STEPS[3].label,
      },
    };

    // Step 5: Generate vocabulary
    yield {
      event: "step",
      data: {
        step: 5,
        status: "started",
        label: ANALYSIS_STEPS[4].label,
        detail: ANALYSIS_STEPS[4].detail,
      },
    };

    await db
      .update(knosiaAnalysis)
      .set({ currentStep: 5 })
      .where(eq(knosiaAnalysis.id, analysis.id));

    // Build summary from detected vocabulary
    const summary = {
      tables: schema.tables.length,
      metrics: detected.metrics.length,
      dimensions: detected.dimensions.length,
      entities: detected.entities.map((e) => e.name),
    };

    yield {
      event: "step",
      data: {
        step: 5,
        status: "completed",
        label: ANALYSIS_STEPS[4].label,
      },
    };

    // Optional: Data Profiling (Steps 6-8)
    let profilingResult;
    if (includeDataProfiling) {
      // Step 6: Profile data quality
      yield {
        event: "step",
        data: {
          step: 6,
          status: "started",
          label: ANALYSIS_STEPS[5].label,
          detail: ANALYSIS_STEPS[5].detail,
        },
      };

      await db
        .update(knosiaAnalysis)
        .set({ currentStep: 6 })
        .where(eq(knosiaAnalysis.id, analysis.id));

      profilingResult = await profileSchema(adapter, schema, {
        enableTier1: true,
        enableTier2: true,
        enableTier3: false, // Tier 3 is expensive, skip for now
        maxConcurrentTables: 5,
      });

      yield {
        event: "step",
        data: {
          step: 6,
          status: "completed",
          label: ANALYSIS_STEPS[5].label,
        },
      };

      // Step 7: Assess freshness
      yield {
        event: "step",
        data: {
          step: 7,
          status: "started",
          label: ANALYSIS_STEPS[6].label,
          detail: ANALYSIS_STEPS[6].detail,
        },
      };

      await db
        .update(knosiaAnalysis)
        .set({ currentStep: 7 })
        .where(eq(knosiaAnalysis.id, analysis.id));

      // Store profiling results in database
      await storeProfilingResults(analysis.id, profilingResult);

      yield {
        event: "step",
        data: {
          step: 7,
          status: "completed",
          label: ANALYSIS_STEPS[6].label,
        },
      };

      // Step 8: Finalize insights
      yield {
        event: "step",
        data: {
          step: 8,
          status: "started",
          label: ANALYSIS_STEPS[7].label,
          detail: ANALYSIS_STEPS[7].detail,
        },
      };

      await db
        .update(knosiaAnalysis)
        .set({ currentStep: 8 })
        .where(eq(knosiaAnalysis.id, analysis.id));

      yield {
        event: "step",
        data: {
          step: 8,
          status: "completed",
          label: ANALYSIS_STEPS[7].label,
        },
      };
    }

    // Disconnect from database
    await adapter.disconnect();

    // Update analysis with results
    await db
      .update(knosiaAnalysis)
      .set({
        status: "completed",
        currentStep: totalSteps,
        summary,
        businessType,
        detectedVocab: detected,
        completedAt: new Date(),
      })
      .where(eq(knosiaAnalysis.id, analysis.id));

    // Emit completion
    yield {
      event: "complete",
      data: {
        analysisId: analysis.id,
        summary,
        businessType,
        confirmations,
        profiling: profilingResult
          ? {
              tablesProfiled: profilingResult.stats.tablesProfiled,
              tablesSkipped: profilingResult.stats.tablesSkipped,
              duration: profilingResult.stats.totalDuration,
              tier1Duration: profilingResult.stats.tier1Duration,
              tier2Duration: profilingResult.stats.tier2Duration,
            }
          : undefined,
      },
    };
  } catch (error) {
    // Ensure we disconnect on error
    try {
      await adapter.disconnect();
    } catch {
      // Ignore disconnect errors
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Update analysis with error
    await db
      .update(knosiaAnalysis)
      .set({
        status: "failed",
        error: {
          code: "ANALYSIS_FAILED",
          message: errorMessage,
        },
      })
      .where(eq(knosiaAnalysis.id, analysis.id));

    yield {
      event: "error",
      data: {
        code: "ANALYSIS_FAILED",
        message: errorMessage,
        recoverable: true,
      },
    };
  }
}

/**
 * Simple heuristic business type detection based on table names
 */
function detectBusinessType(tableNames: string[]): {
  detected: string;
  confidence: number;
  reasoning: string;
  alternatives: { type: string; confidence: number }[];
} {
  const patterns: Record<string, { keywords: string[]; weight: number }> = {
    "E-Commerce": {
      keywords: ["order", "product", "cart", "customer", "payment", "shipping"],
      weight: 1,
    },
    "SaaS": {
      keywords: ["user", "subscription", "plan", "tenant", "organization", "team"],
      weight: 1,
    },
    "CRM": {
      keywords: ["contact", "lead", "opportunity", "account", "deal", "pipeline"],
      weight: 1,
    },
    "ERP": {
      keywords: ["inventory", "warehouse", "supplier", "purchase", "invoice", "employee"],
      weight: 1,
    },
    "Analytics": {
      keywords: ["event", "metric", "dimension", "fact", "session", "pageview"],
      weight: 1,
    },
  };

  const scores: Record<string, number> = {};

  for (const [type, config] of Object.entries(patterns)) {
    let matches = 0;
    for (const keyword of config.keywords) {
      if (tableNames.some((t) => t.includes(keyword))) {
        matches++;
      }
    }
    scores[type] = (matches / config.keywords.length) * config.weight;
  }

  // Sort by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = sorted[0] ?? ["Unknown", 0];
  const alternatives = sorted.slice(1, 3).map(([type, score]) => ({
    type,
    confidence: Math.round(score * 100) / 100,
  }));

  return {
    detected: topType,
    confidence: Math.round(topScore * 100) / 100,
    reasoning: `Detected ${Math.round(topScore * 6)} matching table patterns for ${topType}`,
    alternatives,
  };
}

/**
 * Store profiling results in database
 *
 * Inserts table profiles and column profiles into respective tables
 */
async function storeProfilingResults(analysisId: string, profilingResult: any): Promise<void> {
  const { schema } = profilingResult;

  // Insert table profiles
  const tableProfilePromises = Object.entries(schema.tableProfiles).map(
    async ([tableName, tableProfile]) => {
      const [inserted] = await db
        .insert(knosiaTableProfile)
        .values({
          analysisId,
          tableName,
          profile: tableProfile as any,
        })
        .returning();

      // Insert column profiles for this table
      const columnProfiles = schema.columnProfiles[tableName];
      if (columnProfiles && inserted) {
        const columnInserts = Object.values(columnProfiles).map((columnProfile: any) =>
          db.insert(knosiaColumnProfile).values({
            tableProfileId: inserted.id,
            columnName: columnProfile.columnName,
            profile: columnProfile,
          }),
        );

        await Promise.all(columnInserts);
      }
    },
  );

  await Promise.all(tableProfilePromises);
}

