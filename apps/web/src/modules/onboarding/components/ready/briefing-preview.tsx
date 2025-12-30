"use client";

import { cn } from "@turbostarter/ui";
import { Icons } from "@turbostarter/ui-web/icons";

import type { BriefingPreview, BriefingKPI, BriefingAlert } from "../../types";

interface BriefingPreviewCardProps {
  preview: BriefingPreview;
}

/**
 * Preview of the briefing that shows after onboarding completes.
 * Displays greeting, KPIs, and alerts.
 */
export function BriefingPreviewCard({ preview }: BriefingPreviewCardProps) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      {/* Greeting */}
      <p className="text-lg text-muted-foreground">{preview.greeting}</p>

      {/* KPIs */}
      {preview.kpis.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {preview.kpis.map((kpi) => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Alerts */}
      {preview.alerts.length > 0 && (
        <div className="space-y-2">
          {preview.alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

function KPICard({ kpi }: { kpi: BriefingKPI }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{kpi.label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{kpi.value}</span>
        {kpi.trend && (
          <span
            className={cn(
              "flex items-center text-sm",
              kpi.trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {kpi.trend.direction === "up" && <Icons.TrendingUp className="mr-1 h-4 w-4" />}
            {kpi.trend.direction === "down" && <Icons.TrendingDown className="mr-1 h-4 w-4" />}
            {kpi.trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: BriefingAlert }) {
  const severityStyles = {
    high: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50",
    medium: "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/50",
    low: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50",
  };

  const severityIcons = {
    high: <Icons.AlertTriangle className="h-4 w-4 text-red-600" />,
    medium: <Icons.AlertCircle className="h-4 w-4 text-yellow-600" />,
    low: <Icons.Info className="h-4 w-4 text-blue-600" />,
  };

  return (
    <div className={cn("flex gap-3 rounded-lg border p-3", severityStyles[alert.severity])}>
      {severityIcons[alert.severity]}
      <div>
        <p className="font-medium">{alert.title}</p>
        <p className="text-sm text-muted-foreground">{alert.description}</p>
      </div>
    </div>
  );
}
