import { eq } from "@turbostarter/db";
import { knosiaAnalysis, knosiaConnection } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import {
  PostgresAdapter,
  extractSchema,
  applyHardRules,
} from "@repo/liquid-connect/uvb";

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

// ============================================================================
// ANALYSIS EXECUTION
// ============================================================================

/**
 * Run analysis - returns async generator for SSE streaming
 *
 * Uses UVB (Universal Vocabulary Builder) for real schema extraction
 * and hard rules detection.
 */
export async function* runAnalysis(connectionId: string): AsyncGenerator<
  | { event: "step"; data: StepEvent }
  | { event: "complete"; data: CompleteEvent }
  | { event: "error"; data: ErrorEvent }
> {
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

  // Only postgres supported currently
  if (connection.type !== "postgres") {
    yield {
      event: "error",
      data: {
        code: "UNSUPPORTED_TYPE",
        message: `Connection type '${connection.type}' not yet supported. Only 'postgres' is available.`,
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
      totalSteps: 5,
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
  let credentials: { username: string; password: string };
  try {
    credentials = JSON.parse(connection.credentials ?? "{}") as { username: string; password: string };
  } catch {
    yield {
      event: "error",
      data: {
        code: "INVALID_CREDENTIALS",
        message: "Failed to parse connection credentials",
        recoverable: false,
      },
    };
    return;
  }

  // Create PostgresAdapter
  const adapter = new PostgresAdapter({
    host: connection.host,
    port: connection.port ?? 5432,
    database: connection.database,
    user: credentials.username,
    password: credentials.password,
    ssl: connection.sslEnabled ?? true,
  });

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

    await adapter.connect();

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

    const schema = await extractSchema(adapter, {
      schema: connection.schema ?? "public",
    });

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

    // Disconnect from database
    await adapter.disconnect();

    // Update analysis with results
    await db
      .update(knosiaAnalysis)
      .set({
        status: "completed",
        currentStep: 5,
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

