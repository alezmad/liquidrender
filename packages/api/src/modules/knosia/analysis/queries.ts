import { eq } from "@turbostarter/db";
import { knosiaAnalysis, knosiaConnection } from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";

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
 * This is a mock implementation with delays.
 * Real implementation will integrate with UVB (Universal Vocabulary Bridge).
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

  try {
    // Step through analysis phases
    for (const stepDef of ANALYSIS_STEPS) {
      // Emit step started
      yield {
        event: "step",
        data: {
          step: stepDef.step as 1 | 2 | 3 | 4 | 5,
          status: "started",
          label: stepDef.label,
          detail: stepDef.detail,
        },
      };

      // Update DB with current step
      await db
        .update(knosiaAnalysis)
        .set({ currentStep: stepDef.step })
        .where(eq(knosiaAnalysis.id, analysis.id));

      // Simulate processing time (mock - replace with real UVB calls)
      await delay(800 + Math.random() * 400);

      // Emit step completed
      yield {
        event: "step",
        data: {
          step: stepDef.step as 1 | 2 | 3 | 4 | 5,
          status: "completed",
          label: stepDef.label,
        },
      };
    }

    // Mock analysis results
    // TODO: Replace with real UVB integration
    const mockSummary = {
      tables: 12,
      metrics: 8,
      dimensions: 15,
      entities: ["Customer", "Order", "Product", "Employee"],
    };

    const mockBusinessType = {
      detected: "E-Commerce",
      confidence: 0.87,
      reasoning: "Detected order, product, and customer tables with typical e-commerce patterns",
      alternatives: [
        { type: "Retail", confidence: 0.72 },
        { type: "Marketplace", confidence: 0.45 },
      ],
    };

    // Update analysis with results
    await db
      .update(knosiaAnalysis)
      .set({
        status: "completed",
        currentStep: 5,
        summary: mockSummary,
        businessType: mockBusinessType,
        completedAt: new Date(),
      })
      .where(eq(knosiaAnalysis.id, analysis.id));

    // Emit completion
    yield {
      event: "complete",
      data: {
        analysisId: analysis.id,
        summary: mockSummary,
        businessType: mockBusinessType,
      },
    };
  } catch (error) {
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

// ============================================================================
// UTILITIES
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
