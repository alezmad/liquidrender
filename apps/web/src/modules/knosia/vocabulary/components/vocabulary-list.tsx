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
  const typeOrder = ["metric", "dimension", "entity", "event"];
  const typeLabels: Record<string, string> = {
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
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
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
      <div className="space-y-6">
        {groupKeys.map((groupName) => (
          <div key={groupName}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span>{groupName}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {groupedItems[groupName]?.length ?? 0}
              </span>
            </h3>
            <div className="space-y-2">
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
    <div className="space-y-2">
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
