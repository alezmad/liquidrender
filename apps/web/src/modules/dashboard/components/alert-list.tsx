"use client";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Card, CardContent, CardHeader, CardTitle } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";

import type { AlertListProps, Alert } from "../types";

/**
 * Displays alerts requiring attention.
 * Each alert shows severity icon, title, description, contributing factors, and suggested actions.
 */
export function AlertList({
  alerts,
  className,
  onActionClick,
}: AlertListProps) {
  const { t } = useTranslation("knosia");

  // Empty state: return null if no alerts
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-lg font-semibold">{t("briefing.attentionNeeded")}</h2>

      <div className="flex flex-col gap-4">
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onActionClick={onActionClick}
          />
        ))}
      </div>
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
  onActionClick?: (query: string) => void;
}

function AlertCard({ alert, onActionClick }: AlertCardProps) {
  const isCritical = alert.severity === "critical";

  return (
    <Card
      className={cn(
        "border-l-4",
        isCritical
          ? "border-l-red-500 dark:border-l-red-400"
          : "border-l-yellow-500 dark:border-l-yellow-400"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <SeverityIcon severity={alert.severity} />
          <div className="flex-1">
            <CardTitle className="text-base font-medium">
              {alert.title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {alert.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Contributing factors */}
        {alert.factors && alert.factors.length > 0 && (
          <ul className="mb-4 ml-9 list-disc space-y-1 text-sm text-muted-foreground">
            {alert.factors.map((factor, idx) => (
              <li key={idx}>{factor.text}</li>
            ))}
          </ul>
        )}

        {/* Suggested actions */}
        {alert.actions && alert.actions.length > 0 && (
          <div className="ml-9 flex flex-wrap gap-2">
            {alert.actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => onActionClick?.(action.query)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeverityIcon({ severity }: { severity: "warning" | "critical" }) {
  if (severity === "critical") {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
        <Icons.XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
    );
  }

  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
      <Icons.AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    </div>
  );
}
