"use client";

// Metric KPI Block - Displays calculated metrics from the Knosia metrics system
// Integrates with the metrics API to fetch and display live values

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import { Icons } from "@turbostarter/ui-web/icons";

import { api } from "~/lib/api/client";
import type { CanvasBlock } from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface MetricKPIBlockConfig {
  /** ID of the calculated metric */
  metricId: string;
  /** Show trend indicator if available */
  showTrend?: boolean;
  /** Auto-refresh interval in seconds (0 = no auto-refresh) */
  refreshInterval?: number;
  /** Compact mode for smaller display */
  compact?: boolean;
}

interface MetricKPIBlockProps {
  block: CanvasBlock;
  config?: MetricKPIBlockConfig;
}

interface ExecutionResult {
  value: number | string;
  formattedValue: string;
  executedAt: string;
  executionTimeMs: number;
  fromCache: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const getCategoryEmoji = (category: string | null) => {
  switch (category) {
    case "revenue":
      return "💰";
    case "growth":
      return "📈";
    case "engagement":
      return "👥";
    case "operational":
      return "⚙️";
    default:
      return "📊";
  }
};

// ============================================================================
// Loading State
// ============================================================================

function LoadingState({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Skeleton className="h-6 w-6 rounded" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Skeleton className="h-10 w-32 mb-2" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-20 mt-2" />
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icons.AlertCircle className="h-8 w-8 text-destructive mb-2" />
      <div className="text-sm text-destructive">{message}</div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <Icons.RefreshCcw className="mr-2 h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="text-4xl font-bold text-muted-foreground/50">—</div>
      <div className="mt-2 text-sm text-muted-foreground">
        {label || "No data available"}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MetricKPIBlock({ block, config }: MetricKPIBlockProps) {
  const metricId = config?.metricId || (block.cachedData as { metricId?: string } | null)?.metricId;
  const showTrend = config?.showTrend ?? true;
  const refreshInterval = config?.refreshInterval ?? 0;
  const compact = config?.compact ?? false;

  // Fetch metric data
  const {
    data: metricData,
    isLoading: isLoadingMetric,
    error: metricError,
  } = useQuery({
    queryKey: ["knosia", "metric", metricId],
    queryFn: async () => {
      if (!metricId) return null;

      const res = await api.knosia.metrics[":id"].$get({
        param: { id: metricId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch metric");
      }

      const result = await res.json();
      return result.metric as {
        id: string;
        name: string;
        category: string | null;
        lastExecutionResult: ExecutionResult | null;
        lastExecutedAt: string | null;
      };
    },
    enabled: !!metricId,
    staleTime: 30000, // 30 seconds
  });

  // Execute metric to get fresh data
  const {
    data: executionResult,
    isLoading: isExecuting,
    error: executeError,
    refetch: executeMetric,
  } = useQuery({
    queryKey: ["knosia", "metric", metricId, "execute"],
    queryFn: async () => {
      if (!metricId) return null;

      const res = await api.knosia.metrics[":id"].execute.$post({
        param: { id: metricId },
        json: { useCache: true },
      });

      if (!res.ok) {
        throw new Error("Failed to execute metric");
      }

      const result = await res.json();
      return result.result as ExecutionResult;
    },
    enabled: !!metricId,
    staleTime: refreshInterval > 0 ? refreshInterval * 1000 : 60000, // Use refresh interval or 1 minute
    refetchInterval: refreshInterval > 0 ? refreshInterval * 1000 : false,
  });

  // Handle refresh
  const handleRefresh = useCallback(() => {
    executeMetric();
  }, [executeMetric]);

  // Determine which result to show
  const displayResult = useMemo(() => {
    if (executionResult) return executionResult;
    if (metricData?.lastExecutionResult) return metricData.lastExecutionResult;
    return null;
  }, [executionResult, metricData?.lastExecutionResult]);

  // No metric ID configured
  if (!metricId) {
    return <EmptyState label="No metric configured" />;
  }

  // Loading state
  if (isLoadingMetric && !metricData) {
    return <LoadingState compact={compact} />;
  }

  // Error state
  if (metricError || executeError) {
    const error = metricError || executeError;
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load metric"}
        onRetry={handleRefresh}
      />
    );
  }

  // No metric found
  if (!metricData) {
    return <EmptyState label="Metric not found" />;
  }

  const { name, category } = metricData;
  const emoji = getCategoryEmoji(category);

  // Compact variant
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3">
        <span className="text-xl">{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-muted-foreground">{name}</div>
          <div className="text-lg font-semibold">
            {displayResult?.formattedValue ?? "—"}
          </div>
        </div>
        {isExecuting && (
          <Icons.Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {/* Emoji */}
      <span className="text-3xl mb-2">{emoji}</span>

      {/* Main Value */}
      <div className="relative">
        <div className="text-4xl font-bold tracking-tight">
          {displayResult?.formattedValue ?? "—"}
        </div>
        {isExecuting && (
          <div className="absolute -right-6 top-1/2 -translate-y-1/2">
            <Icons.Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="mt-2 text-sm text-muted-foreground">{block.title || name}</div>

      {/* Timestamp and Cache Status */}
      {displayResult && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatRelativeTime(displayResult.executedAt)}</span>
          {displayResult.fromCache && (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              cached
            </Badge>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isExecuting}
        className="mt-3"
      >
        <Icons.RefreshCcw className={cn("mr-2 h-3 w-3", isExecuting && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}

export default MetricKPIBlock;
