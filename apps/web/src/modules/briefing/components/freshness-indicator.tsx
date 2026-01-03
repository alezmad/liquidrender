"use client";

// Freshness Indicator - Visual indicator for data recency

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import { Icons } from "@turbostarter/ui-web/icons";

import type { FreshnessIndicatorProps, FreshnessConfig } from "../types";

// ============================================================================
// Freshness Config
// ============================================================================

function getFreshnessConfig(latestDataAt: string | null): FreshnessConfig {
  if (!latestDataAt) {
    return {
      level: "unknown",
      label: "Unknown",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      borderColor: "border-muted",
      daysSince: null,
    };
  }

  const now = new Date();
  const lastUpdate = new Date(latestDataAt);
  const daysSince = Math.floor(
    (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSince <= 7) {
    return {
      level: "recent",
      label: "Fresh",
      color: "text-green-700 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-950/50",
      borderColor: "border-green-200 dark:border-green-900",
      daysSince,
    };
  }

  if (daysSince <= 30) {
    return {
      level: "stale",
      label: "Aging",
      color: "text-yellow-700 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-950/50",
      borderColor: "border-yellow-200 dark:border-yellow-900",
      daysSince,
    };
  }

  return {
    level: "very-stale",
    label: "Stale",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/50",
    borderColor: "border-red-200 dark:border-red-900",
    daysSince,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function FreshnessIndicator({
  tableName,
  latestDataAt,
  className,
}: FreshnessIndicatorProps) {
  const config = getFreshnessConfig(latestDataAt);

  const Icon =
    config.level === "recent"
      ? Icons.CheckCircle2
      : config.level === "stale"
        ? Icons.AlertTriangle
        : config.level === "very-stale"
          ? Icons.AlertCircle
          : Icons.AlertCircle;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("h-4 w-4", config.color)} />
      <Badge variant="outline" className={cn(config.bgColor, config.color)}>
        {config.label}
      </Badge>
      {config.daysSince !== null && (
        <span className="text-xs text-muted-foreground">
          {config.daysSince === 0
            ? "Today"
            : config.daysSince === 1
              ? "Yesterday"
              : `${config.daysSince} days ago`}
        </span>
      )}
    </div>
  );
}

export default FreshnessIndicator;
