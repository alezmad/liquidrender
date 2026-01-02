"use client";

// Watch List Block Component
// Displays a compact list of metrics with threshold-based status indicators

import { useState } from "react";
import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@turbostarter/ui-web/dropdown-menu";
import type { CanvasBlock } from "../../types";

// ============================================================================
// Types
// ============================================================================

type WatchItemStatus = "normal" | "warning" | "critical";
type SortField = "name" | "value" | "status";
type SortDirection = "asc" | "desc";

export interface WatchItem {
  id: string;
  name: string;
  value: number | string;
  threshold?: { min?: number; max?: number };
  status: WatchItemStatus;
}

interface WatchListBlockProps {
  block: CanvasBlock;
  data?: WatchItem[];
  onClick?: (itemId: string) => void;
}

// ============================================================================
// Status Utilities
// ============================================================================

const statusConfig: Record<
  WatchItemStatus,
  { color: string; bgColor: string; label: string; priority: number }
> = {
  critical: {
    color: "bg-red-500",
    bgColor: "bg-red-500/10",
    label: "Critical",
    priority: 3,
  },
  warning: {
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Warning",
    priority: 2,
  },
  normal: {
    color: "bg-green-500",
    bgColor: "bg-green-500/10",
    label: "Normal",
    priority: 1,
  },
};

function getStatusFromThreshold(
  value: number | string,
  threshold?: { min?: number; max?: number }
): WatchItemStatus {
  if (!threshold || typeof value !== "number") return "normal";

  const { min, max } = threshold;

  // Critical if outside bounds
  if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
    return "critical";
  }

  // Warning if within 10% of bounds
  const warningMargin = 0.1;
  if (min !== undefined) {
    const warningThreshold = min * (1 + warningMargin);
    if (value < warningThreshold) return "warning";
  }
  if (max !== undefined) {
    const warningThreshold = max * (1 - warningMargin);
    if (value > warningThreshold) return "warning";
  }

  return "normal";
}

function formatValue(value: number | string): string {
  if (typeof value === "number") {
    // Format large numbers with suffixes
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    // Format decimals nicely
    if (!Number.isInteger(value)) {
      return value.toFixed(2);
    }
    return value.toLocaleString();
  }
  return value;
}

// ============================================================================
// Main Component
// ============================================================================

export function WatchListBlock({ block, data, onClick }: WatchListBlockProps) {
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Handle empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Icons.Eye className="h-6 w-6" />
        <p className="text-sm">No items to watch</p>
      </div>
    );
  }

  // Sort the data
  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "value":
        const aVal = typeof a.value === "number" ? a.value : parseFloat(String(a.value)) || 0;
        const bVal = typeof b.value === "number" ? b.value : parseFloat(String(b.value)) || 0;
        comparison = aVal - bVal;
        break;
      case "status":
        comparison =
          statusConfig[a.status].priority - statusConfig[b.status].priority;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "status" ? "desc" : "asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <Icons.ArrowUp className="h-3 w-3" />
    ) : (
      <Icons.ArrowDown className="h-3 w-3" />
    );
  };

  return (
    <div className="space-y-3">
      {/* Header with sort dropdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {data.length} item{data.length !== 1 ? "s" : ""}
          </span>
          <StatusSummary data={data} />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              <Icons.ChevronsUpDown className="h-3 w-3" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSort("status")} className="gap-2">
              <span className="flex-1">Status</span>
              {getSortIcon("status")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("value")} className="gap-2">
              <span className="flex-1">Value</span>
              {getSortIcon("value")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("name")} className="gap-2">
              <span className="flex-1">Name</span>
              {getSortIcon("name")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Watch list items */}
      <div className="space-y-1">
        {sortedData.map((item) => (
          <WatchListItem
            key={item.id}
            item={item}
            onClick={onClick ? () => onClick(item.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface WatchListItemProps {
  item: WatchItem;
  onClick?: () => void;
}

function WatchListItem({ item, onClick }: WatchListItemProps) {
  const config = statusConfig[item.status];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-accent/50",
        !onClick && "cursor-default"
      )}
    >
      {/* Status indicator */}
      <div
        className={cn("h-2 w-2 shrink-0 rounded-full", config.color)}
        title={config.label}
      />

      {/* Name */}
      <span className="flex-1 truncate text-sm">{item.name}</span>

      {/* Value */}
      <span
        className={cn(
          "shrink-0 text-sm font-medium tabular-nums",
          item.status === "critical" && "text-red-600 dark:text-red-400",
          item.status === "warning" && "text-yellow-600 dark:text-yellow-400"
        )}
      >
        {formatValue(item.value)}
      </span>

      {/* Drill-down indicator */}
      {onClick && (
        <Icons.ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

interface StatusSummaryProps {
  data: WatchItem[];
}

function StatusSummary({ data }: StatusSummaryProps) {
  const counts = data.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<WatchItemStatus, number>
  );

  const hasIssues = counts.critical > 0 || counts.warning > 0;
  if (!hasIssues) return null;

  return (
    <div className="flex items-center gap-1.5">
      {counts.critical > 0 && (
        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {counts.critical}
        </span>
      )}
      {counts.warning > 0 && (
        <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          {counts.warning}
        </span>
      )}
    </div>
  );
}

export default WatchListBlock;
