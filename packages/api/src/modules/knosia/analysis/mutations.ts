import { runKnosiaPipeline } from "../pipeline";

// ============================================================================
// MUTATIONS
// ============================================================================

export async function triggerAnalysis(
  connectionId: string,
  userId: string,
  workspaceId: string,
) {
  // Run pipeline
  const result = await runKnosiaPipeline(connectionId, userId, workspaceId, {
    debug: false,
  });

  return {
    analysisId: result.analysisId,
    success: result.success,
    businessType: result.businessType,
    confidence: result.businessTypeConfidence,
    vocabularyStats: result.vocabularyStats,
    warnings: result.warnings,
    errors: result.errors,
  };
}
