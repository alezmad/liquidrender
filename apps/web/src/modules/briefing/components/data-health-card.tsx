"use client";

// Data Health Card - Shows high-level data quality and freshness metrics

import { cn } from "@turbostarter/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";

import type { DataHealthCardProps } from "../types";

// ============================================================================
// Helper Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// ============================================================================
// Main Component
// ============================================================================

export function DataHealthCard({ summary, className }: DataHealthCardProps) {
  const {
    tableCount,
    totalRows,
    totalSizeBytes,
    averageRowsPerTable,
    tablesWithFreshness,
    staleTables,
    updateFrequencies,
  } = summary;

  // Calculate freshness percentage
  const freshnessPercentage =
    tablesWithFreshness > 0
      ? Math.round(
          ((tablesWithFreshness - staleTables) / tablesWithFreshness) * 100,
        )
      : 0;

  // Get most common update pattern
  const mostCommonPattern =
    Object.entries(updateFrequencies).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "unknown";

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.Database className="h-5 w-5" />
          Data Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Table and Row Stats */}
        <div className="grid grid-cols-3 gap-4">
          <MetricItem
            icon={Icons.Database}
            label="Tables"
            value={tableCount.toLocaleString()}
          />
          <MetricItem
            icon={Icons.Activity}
            label="Total Rows"
            value={formatNumber(totalRows)}
          />
          <MetricItem
            icon={Icons.Database}
            label="Data Size"
            value={formatBytes(totalSizeBytes)}
          />
        </div>

        {/* Average Rows per Table */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg rows per table</span>
            <span className="font-medium">{formatNumber(averageRowsPerTable)}</span>
          </div>
        </div>

        {/* Freshness Indicator */}
        {tablesWithFreshness > 0 && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data Freshness</span>
              <span
                className={cn(
                  "font-medium",
                  freshnessPercentage >= 80
                    ? "text-green-600 dark:text-green-400"
                    : freshnessPercentage >= 50
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400",
                )}
              >
                {freshnessPercentage}%
              </span>
            </div>

            {/* Freshness Bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  freshnessPercentage >= 80
                    ? "bg-green-500"
                    : freshnessPercentage >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500",
                )}
                style={{ width: `${freshnessPercentage}%` }}
              />
            </div>

            {staleTables > 0 && (
              <p className="text-xs text-muted-foreground">
                <Icons.AlertTriangle className="inline h-3 w-3 mr-1" />
                {staleTables} table{staleTables !== 1 ? "s" : ""} with stale data
                (&gt;30 days)
              </p>
            )}
          </div>
        )}

        {/* Update Frequency Distribution */}
        {Object.keys(updateFrequencies).length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Update Pattern</span>
              <span className="font-medium capitalize">
                {mostCommonPattern.replace(/_/g, " ")}
              </span>
            </div>

            {/* Frequency Breakdown */}
            <div className="space-y-1">
              {Object.entries(updateFrequencies).map(([pattern, count]) => (
                <div
                  key={pattern}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground capitalize">
                    {pattern.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetricItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function MetricItem({ icon: Icon, label, value }: MetricItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export default DataHealthCard;
