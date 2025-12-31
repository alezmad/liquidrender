"use client";

import { useRouter } from "next/navigation";

import { useTranslation } from "@turbostarter/i18n";
import { Skeleton } from "@turbostarter/ui-web/skeleton";

import {
  BriefingCard,
  KPIGrid,
  AlertList,
  DashboardPrompter,
  useBriefing,
} from "~/modules/dashboard";
import { pathsConfig } from "~/config/paths";

/**
 * Knosia Dashboard Page
 *
 * Main dashboard landing page showing:
 * - Personalized greeting with data freshness
 * - Key performance indicators
 * - Alerts requiring attention
 * - Modern chat-style prompter at bottom
 */
export default function KnosiaDashboardPage() {
  const { t } = useTranslation("knosia");
  const router = useRouter();
  const { briefing, isLoading, isError } = useBriefing();

  const handleSubmit = (query: string) => {
    router.push(`${pathsConfig.knosia.ask}?q=${encodeURIComponent(query)}`);
  };

  const handleAlertAction = (query: string) => {
    router.push(`${pathsConfig.knosia.ask}?q=${encodeURIComponent(query)}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-6 overflow-auto p-6">
          <Skeleton className="h-16 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-32" />
        </div>
        <div className="border-t p-4">
          <Skeleton className="mx-auto h-24 max-w-3xl" />
        </div>
      </div>
    );
  }

  if (isError || !briefing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-12">
        <p className="text-muted-foreground">{t("errors.connectionLost")}</p>
      </div>
    );
  }

  const hasContent = briefing.kpis.length > 0 || briefing.alerts.length > 0;

  return (
    <div className="@container relative h-full">
      {/* Scrollable briefing content */}
      <div className="h-full space-y-6 overflow-auto p-6 pb-24">
        {/* Greeting + Data Freshness */}
        <BriefingCard
          greeting={briefing.greeting}
          dataThrough={briefing.dataThrough}
        />

        {/* KPI Grid */}
        {hasContent && <KPIGrid kpis={briefing.kpis} />}

        {/* Alerts */}
        {briefing.alerts.length > 0 && (
          <AlertList
            alerts={briefing.alerts}
            onActionClick={handleAlertAction}
          />
        )}
      </div>

      {/* Floating prompter */}
      <DashboardPrompter onSubmit={handleSubmit} />
    </div>
  );
}
