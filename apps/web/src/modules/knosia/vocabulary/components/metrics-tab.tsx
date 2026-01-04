"use client";

import { useState, useMemo, useCallback } from "react";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import { Icons } from "@turbostarter/ui-web/icons";

import { MetricCard } from "./metric-card";
import {
  useMetrics,
  useExecuteMetric,
  useDeleteMetric,
  type CalculatedMetric,
} from "../hooks/use-metrics";

// ============================================================================
// TYPES
// ============================================================================

interface MetricsTabProps {
  connectionId: string;
  onCreateMetric?: () => void;
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "revenue", label: "Revenue" },
  { value: "growth", label: "Growth" },
  { value: "engagement", label: "Engagement" },
  { value: "operational", label: "Operational" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "deprecated", label: "Deprecated" },
  { value: "all", label: "All Statuses" },
];

// ============================================================================
// LOADING SKELETON
// ============================================================================

function MetricsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icons.BarChart3 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-medium">
        {hasFilters ? "No metrics match your filters" : "No metrics yet"}
      </h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Metrics are automatically generated during onboarding, or you can create custom metrics."}
      </p>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <Icons.AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-destructive">Failed to load metrics</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading metrics."}
      </p>
      <Button variant="outline" onClick={onRetry}>
        <Icons.RefreshCcw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MetricsTab({ connectionId, onCreateMetric }: MetricsTabProps) {
  // Filter state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Fetch metrics
  const {
    metrics,
    isLoading,
    isError,
    error,
    refetch,
  } = useMetrics({
    connectionId,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Mutations
  const executeMetric = useExecuteMetric();
  const deleteMetric = useDeleteMetric();

  // Client-side search filter
  const filteredMetrics = useMemo(() => {
    if (!search.trim()) return metrics;

    const searchLower = search.toLowerCase();
    return metrics.filter(
      (m) =>
        m.name.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower)
    );
  }, [metrics, search]);

  // Check if any filters are active
  const hasActiveFilters = search !== "" || categoryFilter !== "all" || statusFilter !== "active";

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("active");
  }, []);

  // Handle execute
  const handleExecute = useCallback(
    (metricId: string) => {
      executeMetric.mutate({ metricId, useCache: false });
    },
    [executeMetric]
  );

  // Handle delete
  const handleDelete = useCallback(
    (metricId: string) => {
      if (window.confirm("Are you sure you want to delete this metric?")) {
        deleteMetric.mutate(metricId);
      }
    },
    [deleteMetric]
  );

  // Error state
  if (isError && error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search metrics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[250px] pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearch("")}
              >
                <Icons.X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <Icons.RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Create Button */}
        <Button onClick={onCreateMetric} disabled={!onCreateMetric}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Create Metric
        </Button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading..."
            : `${filteredMetrics.length} metric${filteredMetrics.length !== 1 ? "s" : ""}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <Icons.RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && <MetricsSkeleton />}

      {/* Empty State */}
      {!isLoading && filteredMetrics.length === 0 && (
        <EmptyState hasFilters={hasActiveFilters} />
      )}

      {/* Metric List */}
      {!isLoading && filteredMetrics.length > 0 && (
        <div className="space-y-3">
          {filteredMetrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              onExecute={() => handleExecute(metric.id)}
              onEdit={() => {
                // TODO: Open edit dialog
                console.log("Edit metric:", metric.id);
              }}
              onDelete={() => handleDelete(metric.id)}
              onDuplicate={() => {
                // TODO: Implement duplicate
                console.log("Duplicate metric:", metric.id);
              }}
              onAddToCanvas={() => {
                // TODO: Implement add to canvas
                console.log("Add to canvas:", metric.id);
              }}
              isExecuting={
                executeMetric.isPending &&
                executeMetric.variables?.metricId === metric.id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
