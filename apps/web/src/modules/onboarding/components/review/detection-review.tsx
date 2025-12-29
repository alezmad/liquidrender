"use client";

import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";

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
