"use client";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Icons } from "@turbostarter/ui-web/icons";

import type { OnboardingStep } from "../../types";

interface ProgressIndicatorProps {
  currentStep: OnboardingStep;
}

type StepLabelKey =
  | "onboarding.steps.connect"
  | "onboarding.steps.understand"
  | "onboarding.steps.dashboard";

interface StepConfig {
  id: 1 | 2 | 3;
  labelKey: StepLabelKey;
  steps: OnboardingStep[];
}

const MACRO_STEPS: StepConfig[] = [
  { id: 1, labelKey: "onboarding.steps.connect", steps: ["connect"] },
  {
    id: 2,
    labelKey: "onboarding.steps.understand",
    steps: ["review", "role", "confirm"],
  },
  { id: 3, labelKey: "onboarding.steps.dashboard", steps: ["ready"] },
];

/**
 * Progress indicator showing the 3 macro steps of onboarding.
 * Connect Data → Confirm Understanding → Your Dashboard
 */
export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const { t } = useTranslation("knosia");

  const currentMacroStep = getMacroStepFromStep(currentStep);

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2">
        {MACRO_STEPS.map((step, index) => {
          const status = getStepStatus(step.id, currentMacroStep);
          const isLast = index === MACRO_STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                <StepIndicator status={status} stepNumber={step.id} />
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    status === "current" && "text-foreground",
                    status === "completed" && "text-muted-foreground",
                    status === "upcoming" && "text-muted-foreground/60"
                  )}
                >
                  {t(step.labelKey)}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-4 h-0.5 w-16 transition-colors",
                    status === "completed"
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type StepStatus = "completed" | "current" | "upcoming";

interface StepIndicatorProps {
  status: StepStatus;
  stepNumber: number;
}

function StepIndicator({ status, stepNumber }: StepIndicatorProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
        status === "current" &&
          "bg-primary text-primary-foreground ring-4 ring-primary/20",
        status === "completed" && "bg-primary text-primary-foreground",
        status === "upcoming" && "bg-muted text-muted-foreground"
      )}
    >
      {status === "completed" ? (
        <Icons.Check className="h-4 w-4" />
      ) : (
        stepNumber
      )}
    </div>
  );
}

function getMacroStepFromStep(step: OnboardingStep): 1 | 2 | 3 {
  for (const macro of MACRO_STEPS) {
    if (macro.steps.includes(step)) {
      return macro.id;
    }
  }
  return 1;
}

function getStepStatus(stepId: number, currentMacroStep: number): StepStatus {
  if (stepId < currentMacroStep) return "completed";
  if (stepId === currentMacroStep) return "current";
  return "upcoming";
}
