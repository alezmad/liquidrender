"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

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

  const { progress, setAnalysisId, isHydrated } = useOnboardingState();
  const { startAnalysis, progress: analysisProgress, result, isRunning } = useAnalysis();

  const connectionId = progress.connectionId;

  // Start analysis when page loads (only after hydration)
  useEffect(() => {
    if (isHydrated && connectionId && !isRunning && !result) {
      startAnalysis(connectionId);
    }
  }, [isHydrated, connectionId, startAnalysis, isRunning, result]);

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
    return <AnalysisProgress progress={analysisProgress} />;
  }

  // Show progress while analyzing
  if (!analysisProgress.isComplete || !result) {
    return <AnalysisProgress progress={analysisProgress} />;
  }

  // Show detection review when complete
  return (
    <DetectionReview
      result={result}
      onContinue={handleContinue}
      onChangeType={handleChangeType}
      onReviewMatch={handleReviewMatch}
    />
  );
}
