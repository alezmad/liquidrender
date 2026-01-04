"use client";

import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

import { BusinessTypeCard } from "./business-type-card";
import { SchemaSummary } from "./schema-summary";

import type { AnalysisResult } from "../../types";

interface DetectionReviewProps {
  result: AnalysisResult;
  onContinue: () => void;
  onChangeType?: () => void;
  onReviewMatch?: () => void;
}

/**
 * Shows analysis results for user review.
 * Displays detected business type and schema summary.
 */
export function DetectionReview({
  result,
  onContinue,
  onChangeType,
  onReviewMatch,
}: DetectionReviewProps) {
  const { t } = useTranslation("knosia");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{t("onboarding.review.title")}</h2>
      </div>

      {result.quickPreviewComplete && result.backgroundEnrichmentPending && result.backgroundEnrichmentPending > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Icons.Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Quick Analysis Complete!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We've analyzed your key fields and will continue enriching vocabulary in the background to improve accuracy.
              </p>
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                {result.backgroundEnrichmentPending} more fields being enriched...
              </p>
            </div>
          </div>
        </div>
      )}

      <BusinessTypeCard
        businessType={result.businessType}
        onChangeType={onChangeType}
      />

      <SchemaSummary summary={result.summary} />

      <div className="flex gap-3 pt-4">
        {onReviewMatch && (
          <Button variant="outline" onClick={onReviewMatch}>
            {t("onboarding.review.reviewMatch")}
          </Button>
        )}
        <Button className="flex-1" onClick={onContinue}>
          {t("onboarding.review.looksGood")}
        </Button>
      </div>
    </div>
  );
}
