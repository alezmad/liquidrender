"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback, useMemo } from "react";

import { pathsConfig } from "~/config/paths";
import {
  AnalysisProgress,
  DetectionReview,
  useAnalysis,
  useOnboardingState,
} from "~/modules/onboarding";

/**
 * Review page - analysis progress and detection review.
 */
export default function ReviewPage() {
  const router = useRouter();

  const { progress, setAnalysisId, setSelectedMetricIds, isHydrated } = useOnboardingState();
  const { startAnalysis, progress: analysisProgress, result, isRunning } = useAnalysis();

  const connectionId = progress.connectionId;
  const workspaceId = progress.workspaceId;

  // Handle metric selection
  const handleMetricsSelected = useCallback(
    (metricIds: string[]) => {
      setSelectedMetricIds(metricIds);
    },
    [setSelectedMetricIds]
  );

  // Start analysis when page loads (only after hydration)
  useEffect(() => {
    if (isHydrated && connectionId && !isRunning && !result) {
      startAnalysis(connectionId, workspaceId);
    }
  }, [isHydrated, connectionId, workspaceId, startAnalysis, isRunning, result]);

  // Redirect if no connection (only after hydration to avoid race condition)
  useEffect(() => {
    if (isHydrated && !connectionId) {
      router.push(pathsConfig.onboarding.connect);
    }
  }, [isHydrated, connectionId, router]);

  const handleContinue = useCallback(() => {
    if (result?.analysisId) {
      setAnalysisId(result.analysisId);
    }
    router.push(pathsConfig.onboarding.role);
  }, [result, setAnalysisId, router]);

  const handleChangeType = useCallback(() => {
    // Could implement business type selection modal here
    console.log("Change business type requested");
  }, []);

  const handleReviewMatch = useCallback(() => {
    // Could implement match review modal here
    console.log("Review match requested");
  }, []);

  // Show loading while hydrating
  if (!isHydrated) {
    return <AnalysisProgress progress={analysisProgress} result={result} />;
  }

  // Show progress while analyzing
  if (!analysisProgress.isComplete || !result) {
    return <AnalysisProgress progress={analysisProgress} result={result} />;
  }

  // Show detection review when complete
  return (
    <DetectionReview
      result={result}
      onContinue={handleContinue}
      onChangeType={handleChangeType}
      onReviewMatch={handleReviewMatch}
      connectionId={connectionId ?? undefined}
      onMetricsSelected={handleMetricsSelected}
    />
  );
}
