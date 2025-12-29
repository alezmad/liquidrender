"use client";

import { usePathname } from "next/navigation";

import { cn } from "@turbostarter/ui";

import { pathsConfig } from "~/config/paths";

import { ExpirationBanner } from "./expiration-banner";
import { ProgressIndicator } from "./progress-indicator";

import type { OnboardingStep } from "../../types";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Onboarding layout wrapper with progress indicator.
 * Minimal chrome - focuses user on the task at hand.
 */
export function OnboardingLayout({
  children,
  className,
}: OnboardingLayoutProps) {
  const pathname = usePathname();
  const currentStep = getStepFromPath(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Expiration warning for guest users */}
      <ExpirationBanner className="rounded-none border-x-0 border-t-0" />

      {/* Header with logo */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">Knosia</span>
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="border-b border-border/40 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <ProgressIndicator currentStep={currentStep} />
        </div>
      </div>

      {/* Main content */}
      <main
        className={cn(
          "flex flex-1 flex-col items-center px-6 py-8",
          className
        )}
      >
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}

/**
 * Maps URL path to onboarding step.
 */
function getStepFromPath(pathname: string): OnboardingStep {
  // Extract the last segment of the path
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  // Map path segments to steps
  const stepMap: Record<string, OnboardingStep> = {
    connect: "connect",
    review: "review",
    role: "role",
    confirm: "confirm",
    ready: "ready",
    onboarding: "connect", // default to connect if on index
  };

  return stepMap[lastSegment ?? ""] ?? "connect";
}

/**
 * Get macro step (1, 2, or 3) from onboarding step.
 */
export function getMacroStep(step: OnboardingStep): 1 | 2 | 3 {
  switch (step) {
    case "connect":
      return 1;
    case "review":
    case "role":
    case "confirm":
      return 2;
    case "ready":
      return 3;
  }
}
