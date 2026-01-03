"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Database, Activity, TrendingUp } from "lucide-react";

import { Alert, AlertDescription } from "@turbostarter/ui-web/alert";
import { Badge } from "@turbostarter/ui-web/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@turbostarter/ui-web/card";
import { Skeleton } from "@turbostarter/ui-web/skeleton";

import { api } from "~/lib/api/client";

// ============================================================================
// Types
// ============================================================================

interface ProfilingSummary {
  analysisId: string;
  tableCount: number;
  totalRows: number;
  totalSizeBytes: number;
  averageRowsPerTable: number;
  tablesWithFreshness: number;
  staleTables: number;
  updateFrequencies: Record<string, number>;
}

interface Analysis {
  id: string;
  status: string;
  completedAt?: string;
  businessType?: {
    detected: string;
    confidence: number;
  };
}

/**
 * Data Health Dashboard
 *
 * Displays:
 * - Overall health summary (total tables, rows, size)
 * - Table list with freshness indicators
 * - Stale table warnings (> 30 days)
 * - Empty table warnings (rowCount = 0)
 * - Update frequency patterns
 */
export function DataHealthView() {
  // Get latest analysis ID from onboarding state (localStorage)
  // In production, this should come from user's workspace context
  const analysisId = typeof window !== "undefined"
    ? (JSON.parse(localStorage.getItem("knosia_onboarding_progress") ?? "{}") as { analysisId?: string }).analysisId ?? null
    : null;

  const { data: summary, isLoading, error } = useQuery<ProfilingSummary>({
    queryKey: ["profiling-summary", analysisId],
    queryFn: async (): Promise<ProfilingSummary> => {
      if (!analysisId) throw new Error("Analysis ID required");

      const res = await api.knosia.analysis[":id"].profiling.$get({
        param: { id: analysisId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch profiling summary");
      }

      return res.json() as Promise<ProfilingSummary>;
    },
    enabled: !!analysisId,
  });

  const { data: analysis } = useQuery<Analysis>({
    queryKey: ["analysis", analysisId],
    queryFn: async (): Promise<Analysis> => {
      if (!analysisId) throw new Error("Analysis ID required");

      const res = await api.knosia.analysis[":id"].$get({
        param: { id: analysisId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch analysis");
      }

      return res.json() as Promise<Analysis>;
    },
    enabled: !!analysisId,
  });

  if (!analysisId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No data profiling available. Please run an analysis with data profiling enabled first.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <DataHealthSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load data health information. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No profiling data found for this analysis. Please run analysis with data profiling enabled.
        </AlertDescription>
      </Alert>
    );
  }

  const stalePercentage = summary.tablesWithFreshness > 0
    ? Math.round((summary.staleTables / summary.tablesWithFreshness) * 100)
    : 0;

  const avgRowsFormatted = formatNumber(summary.averageRowsPerTable);
  const totalRowsFormatted = formatNumber(summary.totalRows);
  const totalSizeFormatted = formatBytes(summary.totalSizeBytes);

  return (
    <div className="space-y-6">
      {/* Overall Health Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.tableCount}</div>
            <p className="text-xs text-muted-foreground">
              Avg {avgRowsFormatted} rows/table
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRowsFormatted}</div>
            <p className="text-xs text-muted-foreground">
              {totalSizeFormatted} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Freshness</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.tablesWithFreshness > 0
                ? `${100 - stalePercentage}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.staleTables} stale tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common Pattern</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getMostCommonPattern(summary.updateFrequencies)}
            </div>
            <p className="text-xs text-muted-foreground">
              Update frequency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Info */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <Badge variant={analysis.status === "completed" ? "default" : "secondary"}>
                    {analysis.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Completed</dt>
                <dd className="mt-1 text-sm">
                  {analysis.completedAt
                    ? formatDistanceToNow(new Date(analysis.completedAt), { addSuffix: true })
                    : "N/A"}
                </dd>
              </div>
              {analysis.businessType && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Business Type</dt>
                    <dd className="mt-1 text-sm">{analysis.businessType.detected}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Confidence</dt>
                    <dd className="mt-1 text-sm">
                      {Math.round(analysis.businessType.confidence * 100)}%
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Update Frequency Breakdown */}
      {Object.keys(summary.updateFrequencies).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Update Frequency Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(summary.updateFrequencies)
                .sort(([, a], [, b]) => b - a)
                .map(([pattern, count]) => (
                  <div key={pattern} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{pattern.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(count / summary.tableCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {count} tables
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {summary.staleTables > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {summary.staleTables} table{summary.staleTables > 1 ? "s" : ""} haven't been updated in over 30 days.
            This may indicate stale or inactive data sources.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function DataHealthSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getMostCommonPattern(frequencies: Record<string, number>): string {
  const entries = Object.entries(frequencies);
  if (entries.length === 0) return "Unknown";

  const [pattern] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  return pattern.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(2)} KB`;
  return `${bytes} B`;
}
