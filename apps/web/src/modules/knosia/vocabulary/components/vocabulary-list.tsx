"use client";

// List of vocabulary items with optional grouping

import { useMemo } from "react";
import { Icons } from "@turbostarter/ui-web/icons";
import { Skeleton } from "@turbostarter/ui-web/skeleton";

import { VocabularyCard } from "./vocabulary-card";
import type { VocabularyListProps, VocabularyItem } from "../types";

// ============================================================================
// GROUPING UTILITIES
// ============================================================================

type GroupedItems = Record<string, VocabularyItem[]>;

function groupByCategory(items: VocabularyItem[]): GroupedItems {
  return items.reduce((acc, item) => {
    const key = item.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as GroupedItems);
}

function groupByType(items: VocabularyItem[]): GroupedItems {
  const typeOrder = ["kpi", "measure", "metric", "dimension", "entity", "event"];
  const typeLabels: Record<string, string> = {
    kpi: "KPIs",
    measure: "Measures",
    metric: "Metrics",
    dimension: "Dimensions",
    entity: "Entities",
    event: "Events",
  };

  const grouped = items.reduce((acc, item) => {
    const key = item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as GroupedItems);

  // Return in consistent order
  const ordered: GroupedItems = {};
  for (const type of typeOrder) {
    if (grouped[type]) {
      ordered[typeLabels[type] || type] = grouped[type];
    }
  }
  return ordered;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function VocabularyListSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
          {/* Type Icon */}
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          {/* Content */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          {/* Right Side */}
          <div className="flex shrink-0 items-center gap-1">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <Icons.BookOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ============================================================================
// VOCABULARY LIST COMPONENT
// ============================================================================

export function VocabularyList({
  items,
  groupBy = "none",
  onFavoriteToggle,
  onItemClick,
  isLoading = false,
  emptyMessage = "No vocabulary items found",
}: VocabularyListProps) {
  // Group items if requested
  const groupedItems = useMemo(() => {
    if (groupBy === "category") {
      return groupByCategory(items);
    }
    if (groupBy === "type") {
      return groupByType(items);
    }
    return null;
  }, [items, groupBy]);

  // Loading state
  if (isLoading) {
    return <VocabularyListSkeleton />;
  }

  // Empty state
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  // Grouped rendering
  if (groupedItems) {
    const groupKeys = Object.keys(groupedItems);

    return (
      <div className="space-y-4">
        {groupKeys.map((groupName) => (
          <div key={groupName}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                {groupName}
              </span>
              <span className="text-xs text-muted-foreground/50">
                {groupedItems[groupName]?.length ?? 0}
              </span>
            </div>
            <div className="space-y-1">
              {groupedItems[groupName]?.map((item) => (
                <VocabularyCard
                  key={item.id}
                  item={item}
                  onFavoriteToggle={onFavoriteToggle}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Flat list rendering
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <VocabularyCard
          key={item.id}
          item={item}
          onFavoriteToggle={onFavoriteToggle}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
}
