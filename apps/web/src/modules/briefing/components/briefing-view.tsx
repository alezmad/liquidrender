"use client";

// Briefing View - Example usage of data health components

import { Skeleton } from "@turbostarter/ui-web/skeleton";

import { DataHealthCard } from "./data-health-card";
import { FreshnessIndicator } from "./freshness-indicator";
import { QualityMetrics } from "./quality-metrics";
import { useProfilingSummary } from "../hooks/use-profiling-summary";

// ============================================================================
// Types
// ============================================================================

interface BriefingViewProps {
  analysisId: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function BriefingView({ analysisId }: BriefingViewProps) {
  const { data: summary, isLoading, error } = useProfilingSummary(analysisId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <p className="text-sm text-destructive">
          Failed to load profiling data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Data Health Card */}
      <DataHealthCard summary={summary} />

      {/* Freshness Examples - Demo for documentation */}
      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Table Freshness Indicators</h3>
        <div className="space-y-2">
          <FreshnessIndicator
            tableName="users"
            latestDataAt={new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()}
          />
          <FreshnessIndicator
            tableName="orders"
            latestDataAt={new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()}
          />
          <FreshnessIndicator
            tableName="archive_data"
            latestDataAt={new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()}
          />
          <FreshnessIndicator tableName="temp_table" latestDataAt={null} />
        </div>
      </div>

      {/* Quality Metrics - Can be used for specific tables */}
      {/* Example usage (uncomment to use):
      <QualityMetrics
        analysisId={analysisId}
        tableName="users"
      />
      */}
    </div>
  );
}

export default BriefingView;
