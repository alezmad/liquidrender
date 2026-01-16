"use client";

import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

import { BriefingPreviewCard } from "./briefing-preview";

import type { BriefingPreview, BriefingKPI, UserRole, AnalysisSummary } from "../../types";

/** Role-specific greetings */
const roleGreetings: Record<UserRole, string> = {
  executive: "Here's what's happening across your business.",
  finance: "Your financial overview at a glance.",
  sales: "Pipeline and deals update for today.",
  marketing: "Campaign performance summary.",
  product: "User engagement and feature metrics.",
  support: "Support ticket status and trends.",
};

interface ReadyScreenProps {
  role: UserRole;
  summary: AnalysisSummary | null;
  kpis?: BriefingKPI[];
  onGoToDashboard: () => void;
}

/**
 * Ready screen shown after onboarding completes.
 * Shows success state, summary of setup, and briefing preview.
 */
export function ReadyScreen({
  role,
  summary,
  kpis = [],
  onGoToDashboard,
}: ReadyScreenProps) {
  const { t } = useTranslation("knosia");

  // Build briefing preview from real KPIs (or show placeholder if none)
  const preview: BriefingPreview = {
    greeting: roleGreetings[role],
    kpis: kpis.length > 0 ? kpis : [
      {
        id: "placeholder-1",
        label: "Loading KPIs...",
        value: "—",
      },
    ],
    alerts: [], // No mock alerts - only show real alerts when implemented
  };

  return (
    <div className="space-y-8">
      {/* Success header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Icons.Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-semibold">{t("onboarding.ready.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("onboarding.ready.subtitle")}</p>
      </div>

      {/* Setup summary */}
      {summary && (
        <div className="flex justify-center gap-6 text-center text-sm text-muted-foreground">
          <div>
            <span className="block text-lg font-semibold text-foreground">{summary.tables}</span>
            tables
          </div>
          <div>
            <span className="block text-lg font-semibold text-foreground">{summary.metrics}</span>
            metrics
          </div>
          <div>
            <span className="block text-lg font-semibold text-foreground">{summary.dimensions}</span>
            dimensions
          </div>
        </div>
      )}

      {/* Briefing preview */}
      <BriefingPreviewCard preview={preview} />

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onGoToDashboard}>
        {t("onboarding.ready.goToDashboard")}
        <Icons.ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
