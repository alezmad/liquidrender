"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Icons } from "@turbostarter/ui-web/icons";

import type { AnalysisProgress as AnalysisProgressType, AnalysisStep } from "../../types";

interface AnalysisProgressProps {
  progress: AnalysisProgressType;
}

/**
 * Shows analysis progress with animated steps.
 */
export function AnalysisProgress({ progress }: AnalysisProgressProps) {
  const { t } = useTranslation("knosia");
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  // Show "taking longer" message after 10 seconds
  useEffect(() => {
    if (progress.isComplete || progress.error) {
      setShowSlowMessage(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSlowMessage(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [progress.isComplete, progress.error]);

  const completedSteps = progress.steps.filter((s) => s.status === "completed").length;
  const progressPercent = (completedSteps / progress.steps.length) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{t("onboarding.analysis.title")}</h2>
        <p className="mt-2 text-muted-foreground">
          {showSlowMessage
            ? t("onboarding.analysis.slowMessage")
            : t("onboarding.analysis.subtitle")}
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-3">
        {progress.steps.map((step) => (
          <StepItem key={step.id} step={step} />
        ))}
      </div>

      {progress.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <Icons.XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{progress.error.message}</p>
              {progress.error.recoverable && (
                <p className="mt-1 text-sm text-muted-foreground">
                  This error may be temporary. You can try again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepItemProps {
  step: AnalysisStep;
}

function StepItem({ step }: StepItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-all",
        step.status === "completed" && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30",
        step.status === "active" && "border-primary/50 bg-primary/5",
        step.status === "pending" && "border-border/50 opacity-50",
        step.status === "error" && "border-destructive/50 bg-destructive/5"
      )}
    >
      <StepIcon status={step.status} />
      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            step.status === "completed" && "text-green-700 dark:text-green-300",
            step.status === "active" && "text-foreground",
            step.status === "pending" && "text-muted-foreground",
            step.status === "error" && "text-destructive"
          )}
        >
          {step.label}
        </p>
        {step.detail && (
          <p className="text-xs text-muted-foreground">{step.detail}</p>
        )}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: AnalysisStep["status"] }) {
  switch (status) {
    case "completed":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <Icons.Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      );
    case "active":
      return (
        <div className="flex h-6 w-6 items-center justify-center">
          <Icons.Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      );
    case "error":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10">
          <Icons.X className="h-4 w-4 text-destructive" />
        </div>
      );
    default:
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        </div>
      );
  }
}
