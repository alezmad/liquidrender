"use client";

// Comparison Card Block - Visual comparison bars with percentage change indicators

import { cn } from "@turbostarter/ui";
import { Icons } from "@turbostarter/ui-web/icons";
import type { CanvasBlock } from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface ComparisonItem {
  label: string;
  current: number;
  previous: number;
  change: number;
}

export interface ComparisonCardData {
  items: ComparisonItem[];
  mode: "side-by-side" | "stacked";
}

export interface ComparisonCardBlockProps {
  block: CanvasBlock;
  data: ComparisonCardData;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function getChangeColor(change: number): string {
  if (change > 0) return "text-green-600 dark:text-green-400";
  if (change < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function getChangeBgColor(change: number): string {
  if (change > 0) return "bg-green-100 dark:bg-green-900/30";
  if (change < 0) return "bg-red-100 dark:bg-red-900/30";
  return "bg-muted";
}

function getBarColor(type: "current" | "previous"): string {
  if (type === "current") {
    return "bg-primary";
  }
  return "bg-muted-foreground/30";
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ChangeIndicatorProps {
  change: number;
  className?: string;
}

function ChangeIndicator({ change, className }: ChangeIndicatorProps) {
  const Icon = change > 0 ? Icons.TrendingUp : change < 0 ? Icons.TrendingDown : Icons.Minus;
  const formattedChange = `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        getChangeBgColor(change),
        getChangeColor(change),
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{formattedChange}</span>
    </div>
  );
}

interface ComparisonBarProps {
  current: number;
  previous: number;
  maxValue: number;
  mode: "side-by-side" | "stacked";
}

function ComparisonBar({ current, previous, maxValue, mode }: ComparisonBarProps) {
  const currentPercent = maxValue > 0 ? (current / maxValue) * 100 : 0;
  const previousPercent = maxValue > 0 ? (previous / maxValue) * 100 : 0;

  if (mode === "side-by-side") {
    return (
      <div className="flex flex-col gap-1">
        {/* Current bar */}
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-muted-foreground">Current</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-300", getBarColor("current"))}
              style={{ width: `${Math.min(currentPercent, 100)}%` }}
            />
          </div>
          <span className="w-14 text-right text-xs font-medium">{formatNumber(current)}</span>
        </div>
        {/* Previous bar */}
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-muted-foreground">Previous</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-300", getBarColor("previous"))}
              style={{ width: `${Math.min(previousPercent, 100)}%` }}
            />
          </div>
          <span className="w-14 text-right text-xs font-medium">{formatNumber(previous)}</span>
        </div>
      </div>
    );
  }

  // Stacked mode - overlapping bars
  return (
    <div className="relative h-6 w-full overflow-hidden rounded-full bg-muted">
      {/* Previous bar (underneath) */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
          getBarColor("previous")
        )}
        style={{ width: `${Math.min(previousPercent, 100)}%` }}
      />
      {/* Current bar (on top, slightly smaller height) */}
      <div
        className={cn(
          "absolute inset-y-1 left-0 rounded-full transition-all duration-300",
          getBarColor("current")
        )}
        style={{ width: `${Math.min(currentPercent, 100)}%` }}
      />
      {/* Value labels */}
      <div className="absolute inset-0 flex items-center justify-between px-3">
        <span className="text-xs font-medium text-primary-foreground drop-shadow">
          {formatNumber(current)}
        </span>
        <span className="text-xs text-muted-foreground">
          vs {formatNumber(previous)}
        </span>
      </div>
    </div>
  );
}

interface ComparisonItemRowProps {
  item: ComparisonItem;
  maxValue: number;
  mode: "side-by-side" | "stacked";
}

function ComparisonItemRow({ item, maxValue, mode }: ComparisonItemRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{item.label}</span>
        <ChangeIndicator change={item.change} />
      </div>
      <ComparisonBar
        current={item.current}
        previous={item.previous}
        maxValue={maxValue}
        mode={mode}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ComparisonCardBlock({ block, data }: ComparisonCardBlockProps) {
  // Handle empty or invalid data
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Icons.ChartNoAxesColumn className="h-8 w-8" />
        <p className="text-sm">No comparison data available</p>
      </div>
    );
  }

  const { items, mode = "side-by-side" } = data;

  // Calculate max value across all items for consistent bar scaling
  const maxValue = Math.max(...items.flatMap((item) => [item.current, item.previous]));

  return (
    <div className="space-y-4">
      {/* Optional title from block */}
      {block.title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{block.title}</h3>
          <span className="text-xs text-muted-foreground">
            {mode === "side-by-side" ? "Side by Side" : "Stacked"}
          </span>
        </div>
      )}

      {/* Comparison items */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <ComparisonItemRow
            key={`${item.label}-${index}`}
            item={item}
            maxValue={maxValue}
            mode={mode}
          />
        ))}
      </div>

      {/* Legend for stacked mode */}
      {mode === "stacked" && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">Previous</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparisonCardBlock;
