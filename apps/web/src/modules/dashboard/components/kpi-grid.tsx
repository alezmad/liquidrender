"use client";

import { cn } from "@turbostarter/ui";
import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";

import type { KPIGridProps, KPI, ChangeDirection, KPIStatus } from "../types";

// ============================================================================
// Direction Icon Component
// ============================================================================

interface DirectionIconProps {
  direction: ChangeDirection;
  className?: string;
}

function DirectionIcon({ direction, className }: DirectionIconProps) {
  const iconClassName = cn("h-4 w-4", className);

  switch (direction) {
    case "up":
      return <Icons.TrendingUp className={iconClassName} />;
    case "down":
      return <Icons.TrendingDown className={iconClassName} />;
    case "flat":
      return <Icons.Minus className={iconClassName} />;
  }
}

// ============================================================================
// Single KPI Card Component
// ============================================================================

interface KPICardProps {
  kpi: KPI;
}

function KPICard({ kpi }: KPICardProps) {
  const { label, value, change, status = "normal" } = kpi;

  // Determine status colors
  const statusColors: Record<KPIStatus, string> = {
    normal: "",
    warning: "border-yellow-500/50",
    critical: "border-red-500/50",
  };

  // Determine change direction colors
  const getChangeColor = (direction: ChangeDirection): string => {
    switch (direction) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      case "flat":
        return "text-muted-foreground";
    }
  };

  return (
    <Card className={cn("transition-colors", statusColors[status])}>
      <CardContent className="p-4">
        {/* Label */}
        <p className="text-sm text-muted-foreground">{label}</p>

        {/* Value */}
        <p className="mt-1 text-2xl font-semibold">{value}</p>

        {/* Change Indicator */}
        {change && (
          <div className="mt-2 flex items-center gap-1.5">
            <DirectionIcon
              direction={change.direction}
              className={getChangeColor(change.direction)}
            />
            <span className={cn("text-sm", getChangeColor(change.direction))}>
              {change.value}
            </span>
            <span className="text-xs text-muted-foreground">
              {change.comparison}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Displays key performance indicators in a responsive grid.
 * Shows up to maxItems KPIs with change indicators and status coloring.
 */
export function KPIGrid({ kpis, className, maxItems = 4 }: KPIGridProps) {
  // Handle empty state
  if (!kpis || kpis.length === 0) {
    return null;
  }

  const displayKpis = kpis.slice(0, maxItems);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {displayKpis.map((kpi) => (
        <KPICard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
