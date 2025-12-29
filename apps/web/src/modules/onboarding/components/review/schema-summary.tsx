"use client";

import { useTranslation } from "@turbostarter/i18n";
import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";

import type { AnalysisSummary } from "../../types";

interface SchemaSummaryProps {
  summary: AnalysisSummary;
}

/**
 * Shows schema analysis summary with stats.
 */
export function SchemaSummary({ summary }: SchemaSummaryProps) {
  const { t } = useTranslation("knosia");

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">
          {t("onboarding.review.found")}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <StatItem
            icon={<Icons.ChartNoAxesGantt className="h-4 w-4" />}
            value={summary.tables}
            label={t("onboarding.review.tables")}
          />
          <StatItem
            icon={<Icons.TrendingUp className="h-4 w-4" />}
            value={summary.metrics}
            label={t("onboarding.review.metrics")}
          />
          <StatItem
            icon={<Icons.ChevronsUpDown className="h-4 w-4" />}
            value={summary.dimensions}
            label={t("onboarding.review.dimensions")}
          />
        </div>

        {summary.entities.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {t("onboarding.review.entities")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.entities.map((entity) => (
                <span
                  key={entity}
                  className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

function StatItem({ icon, value, label }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
