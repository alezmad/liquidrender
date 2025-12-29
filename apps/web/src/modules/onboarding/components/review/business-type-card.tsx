"use client";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";

import type { DetectedBusinessType } from "../../types";

interface BusinessTypeCardProps {
  businessType: DetectedBusinessType;
  onChangeType?: () => void;
}

/**
 * Shows detected business type with confidence indicator.
 */
export function BusinessTypeCard({
  businessType,
  onChangeType,
}: BusinessTypeCardProps) {
  const { t } = useTranslation("knosia");

  const confidenceLevel = getConfidenceLevel(businessType.confidence);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.review.matchLabel")}
            </p>
            <h3 className="mt-1 text-2xl font-semibold">
              {t(`businessTypes.${businessType.detected}` as "businessTypes.saas")}
            </h3>
          </div>
          {onChangeType && (
            <Button variant="ghost" size="sm" onClick={onChangeType}>
              {t("onboarding.review.change")}
            </Button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <ConfidenceBadge level={confidenceLevel} />
          <span className="text-sm text-muted-foreground">
            {t(`onboarding.review.confidence.${confidenceLevel}`)}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {t("onboarding.review.basedOn", { reason: businessType.reasoning })}
        </p>

        {businessType.alternatives.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Other possibilities
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {businessType.alternatives.map((alt) => (
                <span
                  key={alt.type}
                  className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {t(`businessTypes.${alt.type}` as "businessTypes.saas")} ({Math.round(alt.confidence * 100)}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ConfidenceLevel = "high" | "medium" | "low";

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <div
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full",
        level === "high" && "bg-green-100 dark:bg-green-900",
        level === "medium" && "bg-yellow-100 dark:bg-yellow-900",
        level === "low" && "bg-orange-100 dark:bg-orange-900"
      )}
    >
      <Icons.Check
        className={cn(
          "h-3 w-3",
          level === "high" && "text-green-600 dark:text-green-400",
          level === "medium" && "text-yellow-600 dark:text-yellow-400",
          level === "low" && "text-orange-600 dark:text-orange-400"
        )}
      />
    </div>
  );
}
