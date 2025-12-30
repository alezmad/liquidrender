"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

import { pathsConfig } from "~/config/paths";
import { useOnboardingState } from "~/modules/onboarding";
import { RoleSelector } from "~/modules/onboarding/components/role";

import type { UserRole } from "~/modules/onboarding";

/**
 * Role selection page.
 * User selects their primary focus to personalize the experience.
 */
export default function RolePage() {
  const router = useRouter();
  const { progress, setSelectedRole, completeStep, isHydrated } = useOnboardingState();

  // Redirect if no analysis (need to complete previous steps first)
  useEffect(() => {
    if (isHydrated && !progress.analysisId) {
      router.push(pathsConfig.onboarding.connect);
    }
  }, [isHydrated, progress.analysisId, router]);

  const handleSelectRole = useCallback(
    (role: UserRole) => {
      setSelectedRole(role);
    },
    [setSelectedRole]
  );

  const handleContinue = useCallback(() => {
    if (progress.selectedRole) {
      completeStep("role");
      router.push(pathsConfig.onboarding.confirm);
    }
  }, [progress.selectedRole, completeStep, router]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleSelector
      selectedRole={progress.selectedRole}
      onSelectRole={handleSelectRole}
      onContinue={handleContinue}
    />
  );
}
