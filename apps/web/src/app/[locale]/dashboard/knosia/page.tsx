"use client";

import { useTranslation } from "@turbostarter/i18n";
import { Skeleton } from "@turbostarter/ui-web/skeleton";

import {
  BriefingCard,
  KPIGrid,
  AlertList,
  AskInput,
  useBriefing,
} from "~/modules/dashboard";
import { pathsConfig } from "~/config/paths";
import { useRouter } from "next/navigation";

/**
 * Knosia Briefing Page
 *
 * Main dashboard landing page showing:
 * - Personalized greeting
 * - Key performance indicators
 * - Alerts requiring attention
 * - Quick ask input
 */
export default function KnosiaBriefingPage() {
  const { t } = useTranslation("knosia");
  const router = useRouter();
  const { briefing, isLoading, isError } = useBriefing();

  const handleAskSubmit = (query: string) => {
    // Navigate to Ask page with query
    router.push(`${pathsConfig.knosia.ask}?q=${encodeURIComponent(query)}`);
  };

  const handleAlertAction = (query: string) => {
    // Navigate to Ask page with the action query
    router.push(`${pathsConfig.knosia.ask}?q=${encodeURIComponent(query)}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-16 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (isError || !briefing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-muted-foreground">{t("errors.connectionLost")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Greeting + Data Freshness */}
      <BriefingCard
        greeting={briefing.greeting}
        dataThrough={briefing.dataThrough}
      />

      {/* KPI Grid */}
      <KPIGrid kpis={briefing.kpis} />

      {/* Alerts */}
      {briefing.alerts.length > 0 && (
        <AlertList
          alerts={briefing.alerts}
          onActionClick={handleAlertAction}
        />
      )}

      {/* Ask Input */}
      <AskInput
        suggestedQuestions={briefing.suggestedQuestions}
        onSubmit={handleAskSubmit}
      />
    </div>
  );
}
