"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Card } from "@turbostarter/ui-web/card";
import { Checkbox } from "@turbostarter/ui-web/checkbox";
import { Badge } from "@turbostarter/ui-web/badge";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import { Icons } from "@turbostarter/ui-web/icons";

import { api } from "~/lib/api/client";

// ============================================================================
// TYPES
// ============================================================================

interface CalculatedMetric {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  confidence: number | null;
  semanticDefinition: Record<string, unknown>;
  source: string;
  lastExecutionResult?: {
    value: number | string;
    formattedValue: string;
  } | null;
}

interface MetricsSectionProps {
  connectionId: string;
  onMetricsSelected: (metricIds: string[]) => void;
  initialSelectedIds?: string[];
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const getCategoryIcon = (category: string | null) => {
  switch (category) {
    case "revenue":
      return "DollarSign";
    case "growth":
      return "TrendingUp";
    case "engagement":
      return "Users";
    case "operational":
      return "Settings";
    default:
      return "BarChart";
  }
};

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
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  metric: CalculatedMetric;
  isSelected: boolean;
  onToggle: () => void;
}

function MetricCard({ metric, isSelected, onToggle }: MetricCardProps) {
  const IconName = getCategoryIcon(metric.category);
  const Icon = Icons[IconName as keyof typeof Icons] ?? Icons.BarChart3;
  const emoji = getCategoryEmoji(metric.category);

  // Format semantic definition into human-readable text
  const formatDefinition = (def: Record<string, unknown>): string => {
    const parts: string[] = [];

    if (def.aggregation && def.expression) {
      parts.push(`${def.aggregation}(${def.expression})`);
    }

    if (def.entity) {
      parts.push(`from ${def.entity}`);
    }

    if (def.filters && Array.isArray(def.filters) && def.filters.length > 0) {
      const filterStr = (def.filters as unknown[])
        .map((f) => {
          const filter = f as { field: string; operator: string; value: unknown };
          return `${filter.field} ${filter.operator} ${String(filter.value)}`;
        })
        .join(", ");
      parts.push(`where ${filterStr}`);
    }

    return parts.join(" ") || "No definition";
  };

  return (
    <Card
      className={cn(
        "relative cursor-pointer p-4 transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
          {emoji}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-medium">{metric.name}</h4>
            {metric.confidence !== null && metric.confidence < 0.8 && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {Math.round(metric.confidence * 100)}%
              </Badge>
            )}
          </div>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            {formatDefinition(metric.semanticDefinition)}
          </p>

          {/* Mock value if available */}
          {metric.lastExecutionResult?.formattedValue && (
            <p className="mt-2 text-lg font-semibold">
              {metric.lastExecutionResult.formattedValue}
            </p>
          )}
        </div>

        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle()}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
      </div>
    </Card>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function MetricsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MetricsSection({
  connectionId,
  onMetricsSelected,
  initialSelectedIds = [],
}: MetricsSectionProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(initialSelectedIds)
  );

  // Fetch metrics for this connection
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["knosia", "metrics", "connection", connectionId],
    queryFn: async () => {
      const res = await api.knosia.metrics.connection[":connectionId"].$get({
        param: { connectionId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const result = await res.json();
      return result.metrics as CalculatedMetric[];
    },
    enabled: !!connectionId,
  });

  const metrics = data ?? [];

  // Auto-select top 3 metrics by confidence on first load
  useEffect(() => {
    if (metrics.length > 0 && selectedMetrics.size === 0 && initialSelectedIds.length === 0) {
      const top3 = metrics
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
        .slice(0, 3)
        .map((m) => m.id);
      setSelectedMetrics(new Set(top3));
    }
  }, [metrics, initialSelectedIds.length, selectedMetrics.size]);

  // Notify parent when selection changes
  useEffect(() => {
    onMetricsSelected(Array.from(selectedMetrics));
  }, [selectedMetrics, onMetricsSelected]);

  // Toggle metric selection
  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(metricId)) {
        newSet.delete(metricId);
      } else {
        newSet.add(metricId);
      }
      return newSet;
    });
  };

  // Select/deselect all
  const selectAll = () => {
    setSelectedMetrics(new Set(metrics.map((m) => m.id)));
  };

  const deselectAll = () => {
    setSelectedMetrics(new Set());
  };

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-destructive">
          <Icons.AlertCircle className="h-5 w-5" />
          <p>Failed to load metrics. Please refresh or continue without metrics.</p>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Calculated Business Metrics</h3>
            <p className="text-sm text-muted-foreground">Loading metrics...</p>
          </div>
        </div>
        <MetricsSkeleton />
      </div>
    );
  }

  // Empty state
  if (metrics.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Icons.BarChart3 className="h-5 w-5" />
          <p>No metrics were generated for this connection. You can create custom metrics later.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Calculated Business Metrics</h3>
          <p className="text-sm text-muted-foreground">
            We identified {metrics.length} key metrics based on your data.
            Select the ones to add to your dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectedMetrics.size === metrics.length ? deselectAll : selectAll}
          >
            {selectedMetrics.size === metrics.length ? "Deselect All" : "Select All"}
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            isSelected={selectedMetrics.has(metric.id)}
            onToggle={() => toggleMetric(metric.id)}
          />
        ))}
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {selectedMetrics.size} of {metrics.length} metrics selected
        </span>
        <Button variant="outline" size="sm" disabled>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Custom Metric
        </Button>
      </div>
    </div>
  );
}
