"use client";

// Quality Metrics - Displays null percentages, cardinality, and data quality flags

import { useQuery } from "@tanstack/react-query";

import { cn } from "@turbostarter/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";
import { Skeleton } from "@turbostarter/ui-web/skeleton";

import { api } from "~/lib/api/client";
import { handle } from "@turbostarter/api/utils";

import type { QualityMetricsProps } from "../types";

// ============================================================================
// Types
// ============================================================================

interface ColumnProfile {
  columnName: string;
  profile: {
    nullPercentage: number;
    uniqueCount?: number;
    totalCount: number;
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function QualityMetrics({
  tableName,
  analysisId,
  className,
}: QualityMetricsProps) {
  // Fetch table profile with column profiles
  const { data, isLoading, error } = useQuery({
    queryKey: ["tableProfile", analysisId, tableName],
    queryFn: async () => {
      return handle(
        api.knosia.analysis[":id"].tables[":tableName"].profile.$get,
      )({
        param: { id: analysisId, tableName },
      });
    },
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !("columns" in data)) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No quality metrics available
          </p>
        </CardContent>
      </Card>
    );
  }

  const { columns } = data as { columns: ColumnProfile[] };
  const columnProfiles = columns;

  // Calculate quality flags
  const emptyColumns = columnProfiles.filter(
    (col) => col.profile.nullPercentage >= 90,
  );
  const sparseColumns = columnProfiles.filter(
    (col) =>
      col.profile.nullPercentage >= 50 && col.profile.nullPercentage < 90,
  );

  // Calculate average null percentage
  const avgNullPercentage =
    columnProfiles.length > 0
      ? columnProfiles.reduce((sum, col) => sum + col.profile.nullPercentage, 0) /
        columnProfiles.length
      : 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icons.Info className="h-4 w-4" />
          Quality Metrics: {tableName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Quality Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg Completeness</span>
            <span
              className={cn(
                "font-medium",
                avgNullPercentage <= 10
                  ? "text-green-600 dark:text-green-400"
                  : avgNullPercentage <= 30
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400",
              )}
            >
              {(100 - avgNullPercentage).toFixed(1)}%
            </span>
          </div>

          {/* Quality Bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                avgNullPercentage <= 10
                  ? "bg-green-500"
                  : avgNullPercentage <= 30
                    ? "bg-yellow-500"
                    : "bg-red-500",
              )}
              style={{ width: `${100 - avgNullPercentage}%` }}
            />
          </div>
        </div>

        {/* Quality Flags */}
        {(emptyColumns.length > 0 || sparseColumns.length > 0) && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quality Flags
            </p>

            {emptyColumns.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/50 p-2 border border-red-200 dark:border-red-900">
                <Icons.AlertCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Empty Columns
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                    {emptyColumns.length} column{emptyColumns.length !== 1 ? "s" : ""}{" "}
                    with &gt;90% null values
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {emptyColumns.slice(0, 3).map((col) => (
                      <li
                        key={col.columnName}
                        className="text-xs font-mono text-red-700 dark:text-red-400"
                      >
                        {col.columnName} ({col.profile.nullPercentage.toFixed(1)}% null)
                      </li>
                    ))}
                    {emptyColumns.length > 3 && (
                      <li className="text-xs text-red-600 dark:text-red-500">
                        +{emptyColumns.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {sparseColumns.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/50 p-2 border border-yellow-200 dark:border-yellow-900">
                <Icons.AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Sparse Columns
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5">
                    {sparseColumns.length} column{sparseColumns.length !== 1 ? "s" : ""}{" "}
                    with 50-90% null values
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {sparseColumns.slice(0, 3).map((col) => (
                      <li
                        key={col.columnName}
                        className="text-xs font-mono text-yellow-700 dark:text-yellow-400"
                      >
                        {col.columnName} ({col.profile.nullPercentage.toFixed(1)}% null)
                      </li>
                    ))}
                    {sparseColumns.length > 3 && (
                      <li className="text-xs text-yellow-600 dark:text-yellow-500">
                        +{sparseColumns.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Column Breakdown */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Column Summary
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {columnProfiles.map((col) => (
              <div
                key={col.columnName}
                className="flex items-center justify-between text-xs py-1 hover:bg-muted/50 rounded px-1"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono truncate">{col.columnName}</span>
                  {col.profile.uniqueCount !== undefined && (
                    <span className="text-muted-foreground shrink-0">
                      ({col.profile.uniqueCount.toLocaleString()} unique)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full",
                        col.profile.nullPercentage <= 10
                          ? "bg-green-500"
                          : col.profile.nullPercentage <= 50
                            ? "bg-yellow-500"
                            : "bg-red-500",
                      )}
                      style={{ width: `${100 - col.profile.nullPercentage}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "font-mono w-10 text-right",
                      col.profile.nullPercentage <= 10
                        ? "text-green-600 dark:text-green-400"
                        : col.profile.nullPercentage <= 50
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {(100 - col.profile.nullPercentage).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default QualityMetrics;
