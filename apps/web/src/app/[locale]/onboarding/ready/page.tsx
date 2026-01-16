"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

import { pathsConfig } from "~/config/paths";
import { useOnboardingState } from "~/modules/onboarding";
import { useBriefingKPIs } from "~/modules/onboarding/hooks/use-briefing-kpis";
import { ReadyScreen } from "~/modules/onboarding/components/ready";

/**
 * Ready page - onboarding completion screen.
 * Shows success state and leads to dashboard.
 */
export default function ReadyPage() {
  const router = useRouter();
  const { progress, completeStep, isHydrated } = useOnboardingState();

  // Fetch real KPIs and analysis summary
  const { kpis, summary, isLoading: isLoadingKPIs } = useBriefingKPIs({
    workspaceId: progress.workspaceId,
    analysisId: progress.analysisId,
    enabled: isHydrated && !!progress.workspaceId,
    maxKPIs: 4,
  });

  // Redirect if no confirmation answers (need to complete previous steps first)
  useEffect(() => {
    if (isHydrated && progress.answers.length === 0) {
      router.push(pathsConfig.onboarding.confirm);
    }
  }, [isHydrated, progress.answers.length, router]);

  // Mark ready step as complete when component mounts
  useEffect(() => {
    if (isHydrated && progress.answers.length > 0) {
      completeStep("ready");
    }
  }, [isHydrated, progress.answers.length, completeStep]);

  const handleGoToDashboard = useCallback(() => {
    // Navigate to the Knosia briefing page
    router.push(pathsConfig.knosia.briefing);
  }, [router]);

  // Show loading while hydrating or fetching data
  if (!isHydrated || isLoadingKPIs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ReadyScreen
      role={progress.selectedRole ?? "executive"}
      summary={summary}
      kpis={kpis}
      onGoToDashboard={handleGoToDashboard}
    />
  );
}
