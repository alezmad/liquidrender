import { eq, and } from "@turbostarter/db";
import {
  knosiaAnalysis,
  knosiaConnection,
  knosiaWorkspace,
  knosiaTableProfile,
  knosiaColumnProfile,
  knosiaWorkspaceCanvas,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

// Dynamic import to avoid Turbopack issues with native modules
const getDuckDBAdapter = async () => {
  const { DuckDBUniversalAdapter, applyHardRules, profileSchema, extractProfilingData } = await import("@repo/liquid-connect/uvb");
  return { DuckDBUniversalAdapter, applyHardRules, profileSchema, extractProfilingData };
};

import type { GetAnalysisInput } from "./schemas";
import type { StepEvent, CompleteEvent, ErrorEvent, BackgroundEnrichmentEvent } from "./schemas";

// ============================================================================
// ANALYSIS STEP DEFINITIONS
// ============================================================================

const ANALYSIS_STEPS = [
  { step: 1, label: "Connecting to database", detail: "Establishing secure connection..." },
  { step: 2, label: "Scanning schema", detail: "Discovering tables and relationships..." },
  { step: 3, label: "Detecting business type", detail: "Analyzing naming patterns..." },
  { step: 4, label: "Classifying fields", detail: "Identifying metrics, dimensions, entities..." },
  { step: 5, label: "Quick vocabulary preview", detail: "Enriching most important fields..." },
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
 * @param userId - User ID (for canvas ownership)
 * @param workspaceId - Workspace ID (for canvas creation and organization)
 * @param includeDataProfiling - Optional: Enable data profiling (steps 6-8)
 */
export async function* runAnalysis(
  connectionId: string,
  userId: string,
  workspaceId: string | null,
  includeDataProfiling: boolean = false
): AsyncGenerator<
  | { event: "step"; data: StepEvent }
  | { event: "complete"; data: CompleteEvent }
  | { event: "background_complete"; data: BackgroundEnrichmentEvent }
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
      workspaceId,
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
  const { DuckDBUniversalAdapter, applyHardRules, profileSchema, extractProfilingData } = await getDuckDBAdapter();
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

    // Step 3: Detect business type using LLM
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

    // Use LLM-based detection (with fallback to regex if LLM fails)
    let businessType: {
      detected: string;
      confidence: number;
      reasoning: string;
      alternatives: { type: string; confidence: number }[];
    };

    try {
      const { detectBusinessTypeLLM } = await import("@turbostarter/ai/businessType/detect");
      const llmResult = await detectBusinessTypeLLM(schema, { model: "haiku" });

      businessType = {
        detected: llmResult.businessType,
        confidence: llmResult.confidence,
        reasoning: llmResult.reasoning,
        alternatives: llmResult.alternatives,
      };
    } catch (error) {
      // Fallback to regex-based detection if LLM fails
      console.warn('[Analysis] LLM business type detection failed, falling back to regex:', error);
      const tableNames = schema.tables.map((t) => t.name.toLowerCase());
      businessType = detectBusinessType(tableNames);
    }

    yield {
      event: "step",
      data: {
        step: 3,
        status: "completed",
        label: ANALYSIS_STEPS[2].label,
      },
    };

    // V2: Profile schema BEFORE applying hard rules (for enhanced vocabulary detection)
    // This runs unconditionally to improve vocabulary accuracy (~500ms overhead)
    const profilingResult = await profileSchema(adapter, schema, {
      enableTier1: true,
      enableTier2: true,
      enableTier3: false, // Tier 3 is expensive, skip for initial analysis
      maxConcurrentTables: 5,
    });
    const profilingData = extractProfilingData(profilingResult.schema);

    // Step 4: Apply hard rules (with profiling data for enhanced detection)
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

    const { detected, confirmations } = applyHardRules(schema, {
      profilingData,
    });

    yield {
      event: "step",
      data: {
        step: 4,
        status: "completed",
        label: ANALYSIS_STEPS[3].label,
      },
    };

    // Step 5: Quick vocabulary preview (fast, top fields only)
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

    // PHASE 1: Quick Preview - Enrich top 25 most important fields
    let quickEnrichedVocab = detected;
    let querySuggestions: any = null;
    let remainingFieldsCount = 0;

    try {
      const {
        selectTopFields,
        enrichVocabularyDescriptions,
        generateQuerySuggestions,
      } = await import("./llm-enrichment");

      // Select top fields for quick preview (typically 15-25 fields)
      const topFields = selectTopFields(detected, 25);
      const topFieldsCount = topFields.metrics.length + topFields.dimensions.length;

      console.log(`[Analysis] Quick preview: enriching ${topFieldsCount} top fields`);

      // Enrich top fields + generate query suggestions in parallel
      const [enrichedTopResult, querySuggestionsResult] = await Promise.all([
        enrichVocabularyDescriptions(
          { metrics: topFields.metrics, dimensions: topFields.dimensions, entities: detected.entities },
          schema,
          businessType.detected
        ),
        generateQuerySuggestions(detected, businessType.detected),
      ]);

      // Merge enriched top fields back into detected vocabulary
      quickEnrichedVocab = {
        ...detected,
        metrics: detected.metrics.map(m => {
          const enriched = enrichedTopResult.metrics?.find((e: any) => e.name === m.name);
          return enriched || m;
        }),
        dimensions: detected.dimensions.map(d => {
          const enriched = enrichedTopResult.dimensions?.find((e: any) => e.name === d.name);
          return enriched || d;
        }),
      };

      querySuggestions = querySuggestionsResult;

      // Calculate remaining fields for background enrichment
      const totalFields = detected.metrics.length + detected.dimensions.length;
      remainingFieldsCount = totalFields - topFieldsCount;

      console.log(`[Analysis] Quick preview complete: ${topFieldsCount} enriched, ${remainingFieldsCount} pending`);
    } catch (error) {
      console.warn("[Analysis] Quick preview enrichment skipped:", error);
      quickEnrichedVocab = detected;
    }

    // Build summary from detected vocabulary
    const summary = {
      tables: schema.tables.length,
      metrics: quickEnrichedVocab.metrics.length,
      dimensions: quickEnrichedVocab.dimensions.length,
      entities: quickEnrichedVocab.entities.map((e) => e.name),
    };

    yield {
      event: "step",
      data: {
        step: 5,
        status: "completed",
        label: ANALYSIS_STEPS[4].label,
      },
    };

    // Optional: Data Profiling UI Steps (Steps 6-8)
    // Note: Profiling was already done before step 4 for vocabulary enhancement
    if (includeDataProfiling) {
      // Step 6: Profile data quality (UI step - already computed)
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

      // Profiling already completed, just show the UI step
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

    // Update analysis with results (including LLM enrichments)
    await db
      .update(knosiaAnalysis)
      .set({
        status: "completed",
        currentStep: totalSteps,
        summary,
        businessType,
        detectedVocab: quickEnrichedVocab,
        completedAt: new Date(),
      })
      .where(eq(knosiaAnalysis.id, analysis.id));

    // Save quick preview enriched vocabulary to knosia_vocabulary_item table
    let workspaceId: string | null = null;
    let orgId: string | null = null;

    try {
      const { saveEnrichedVocabulary } = await import("../vocabulary/from-detected");

      // Get connection to access orgId
      const connection = await db
        .select()
        .from(knosiaConnection)
        .where(eq(knosiaConnection.id, analysis.connectionId))
        .limit(1)
        .then(rows => rows[0]);

      if (connection) {
        orgId = connection.orgId;

        // Get default workspace for this org (or create one)
        let workspace = await db
          .select()
          .from(knosiaWorkspace)
          .where(eq(knosiaWorkspace.orgId, connection.orgId))
          .limit(1)
          .then(rows => rows[0]);

        if (!workspace) {
          // Create default workspace if none exists
          const newWorkspace = await db
            .insert(knosiaWorkspace)
            .values({
              orgId: connection.orgId,
              name: "Main Workspace",
              slug: "main",
              visibility: "org_wide",
            })
            .returning()
            .then(rows => rows[0]);

          if (!newWorkspace) {
            throw new Error("Failed to create workspace");
          }
          workspace = newWorkspace;
        }

        workspaceId = workspace.id;

        console.log("[Analysis] Saving quick preview vocabulary to workspace:", workspace.id);
        const saveResult = await saveEnrichedVocabulary(
          quickEnrichedVocab, // Quick preview vocabulary
          connection.orgId,
          workspace.id,
          { skipExisting: false }
        );

        console.log("[Analysis] Saved quick preview vocabulary items:", {
          metrics: saveResult.metrics.created,
          dimensions: saveResult.dimensions.created,
          entities: saveResult.entities.created,
          errors: saveResult.errors.length,
        });
      }
    } catch (error) {
      console.error("[Analysis] Failed to save vocabulary items:", error);
      // Don't fail the analysis if vocabulary saving fails
    }

    // Emit completion (quick preview ready, background enrichment pending)
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
        querySuggestions,
        llmEnriched: !!querySuggestions,
        quickPreviewComplete: remainingFieldsCount > 0,
        backgroundEnrichmentPending: remainingFieldsCount,
      },
    };

    // PHASE 1.5: Create default workspace canvas (non-blocking)
    console.log("[Canvas] Checking canvas creation conditions:", { workspaceId, orgId, hasWorkspace: !!workspaceId, hasOrg: !!orgId, businessType: businessType.detected });

    // Log why canvas creation is being skipped
    if (!workspaceId) console.log("[Canvas] ❌ Skipping: workspaceId is null");
    if (!orgId) console.log("[Canvas] ❌ Skipping: orgId is null");
    if (!businessType.detected) console.log("[Canvas] ❌ Skipping: businessType.detected is empty");

    if (workspaceId && orgId && businessType.detected) {
      try {
        console.log("[Canvas] Generating default canvas for workspace:", workspaceId);

        // Import canvas generation dependencies
        const { mapToTemplate, getTemplate } = await import("@repo/liquid-connect/business-types");
        const { generateDashboardSpec } = await import("@repo/liquid-connect/dashboard");
        const { dashboardSpecToLiquidSchema } = await import("@repo/liquid-render/dashboard");

        // Use already-detected business type (convert to lowercase for template lookup)
        const businessTypeKey = businessType.detected.toLowerCase().replace(/[^a-z]/g, '') as any;
        const template = getTemplate(businessTypeKey);
        console.log("[Canvas] Vocabulary for mapping:", {
          businessType: businessType.detected,
          businessTypeKey,
          metrics: quickEnrichedVocab.metrics?.length || 0,
          dimensions: quickEnrichedVocab.dimensions?.length || 0,
          entities: quickEnrichedVocab.entities?.length || 0,
          templateKPIs: template.kpis?.length || 0,
        });
        const mappingResult = mapToTemplate(quickEnrichedVocab, template);
        console.log("[Canvas] Mapping result:", { coverage: mappingResult.coverage, matched: mappingResult.matched?.length || 0 });

        // For generic/custom templates (Media, etc.), bypass mapping if we have vocabulary
        const hasVocabulary = (quickEnrichedVocab.metrics?.length || 0) > 0 ||
                             (quickEnrichedVocab.dimensions?.length || 0) > 0;
        const isGenericTemplate = template.id === 'custom';
        const shouldCreateCanvas = mappingResult.coverage >= 10 || (isGenericTemplate && hasVocabulary);

        console.log("[Canvas] Creation decision:", {
          coverage: mappingResult.coverage,
          hasVocabulary,
          isGenericTemplate,
          shouldCreateCanvas
        });

        if (shouldCreateCanvas) { // At least 10% KPI coverage (or vocabulary for generic templates)
          const dashboardSpec = generateDashboardSpec(mappingResult);
          const liquidSchema = dashboardSpecToLiquidSchema(dashboardSpec);

          // Check if default canvas already exists
          const existingCanvas = await db
            .select()
            .from(knosiaWorkspaceCanvas)
            .where(
              and(
                eq(knosiaWorkspaceCanvas.workspaceId, workspaceId),
                eq(knosiaWorkspaceCanvas.isDefault, true)
              )
            )
            .limit(1);

          if (existingCanvas.length === 0) {
            await db.insert(knosiaWorkspaceCanvas).values({
              id: generateId(),
              workspaceId,
              title: "Main Dashboard",
              schema: liquidSchema,
              scope: "workspace",
              ownerId: userId,
              isDefault: true,
              currentVersion: 1,
              lastEditedBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log("[Canvas] Default canvas created successfully");
          } else {
            console.log("[Canvas] Default canvas already exists, skipping");
          }
        } else {
          console.log(`[Canvas] Skipping canvas creation - low KPI coverage: ${mappingResult.coverage}%`);
        }
      } catch (error) {
        console.error("[Canvas] Failed to create default canvas:", error);
        // Don't fail the analysis if canvas creation fails
      }
    }

    // PHASE 2: Background Enrichment (runs AFTER user sees results)
    if (remainingFieldsCount > 0 && workspaceId && orgId) {
      console.log(`[Background] Starting background enrichment of ${remainingFieldsCount} remaining fields`);

      try {
        const { enrichRemainingFieldsAdaptive } = await import("./llm-enrichment");
        const { saveEnrichedVocabulary } = await import("../vocabulary/from-detected");

        // Get remaining fields (those not in quick preview)
        const enrichedFieldNames = new Set([
          ...quickEnrichedVocab.metrics.filter((m: any) => m.description || m.displayName).map((m: any) => m.name),
          ...quickEnrichedVocab.dimensions.filter((d: any) => d.description || d.displayName).map((d: any) => d.name),
        ]);

        const remainingVocab = {
          metrics: detected.metrics.filter((m: any) => !enrichedFieldNames.has(m.name)),
          dimensions: detected.dimensions.filter((d: any) => !enrichedFieldNames.has(d.name)),
        };

        // Enrich remaining fields adaptively
        const backgroundEnriched = await enrichRemainingFieldsAdaptive(
          remainingVocab,
          schema,
          businessType.detected
        );

        // Save background enriched vocabulary
        const saveResult = await saveEnrichedVocabulary(
          backgroundEnriched,
          orgId,
          workspaceId,
          { skipExisting: true } // Don't override quick preview items
        );

        const totalEnriched =
          saveResult.metrics.created +
          saveResult.dimensions.created +
          saveResult.entities.created;

        console.log("[Background] Background enrichment complete:", {
          enriched: totalEnriched,
          errors: saveResult.errors.length,
        });

        // Yield background completion event (for toast notification)
        yield {
          event: "background_complete",
          data: {
            totalFieldsEnriched: totalEnriched + (summary.metrics + summary.dimensions),
            quickPreviewCount: summary.metrics + summary.dimensions,
            backgroundEnrichCount: totalEnriched,
          },
        };
      } catch (error) {
        console.warn("[Background] Background enrichment failed:", error);
        // Don't fail the analysis - user already has quick preview
      }
    }
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

