"use client";

// Hero Metric Block - Large centered KPI with optional delta and sparkline

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import { Icons } from "@turbostarter/ui-web/icons";

import type { CanvasBlock } from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface HeroMetricData {
  value: number | string;
  label: string;
  change?: number;
  changeDirection?: "up" | "down" | "neutral";
  sparkline?: number[];
}

interface HeroMetricBlockProps {
  block: CanvasBlock;
  data?: HeroMetricData;
}

// ============================================================================
// Sparkline Component (Simple SVG)
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

function Sparkline({
  data,
  width = 120,
  height = 32,
  strokeColor = "currentColor",
  strokeWidth = 1.5,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Prevent division by zero

  // Calculate normalized points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2; // 2px padding
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      />
    </svg>
  );
}

// ============================================================================
// Delta Badge Component
// ============================================================================

interface DeltaBadgeProps {
  change: number;
  direction: "up" | "down" | "neutral";
}

function DeltaBadge({ change, direction }: DeltaBadgeProps) {
  const isPositive = direction === "up";
  const isNegative = direction === "down";
  const isNeutral = direction === "neutral";

  const formattedChange = Math.abs(change).toFixed(1);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-0.5 px-2 py-0.5 text-xs font-medium",
        isPositive && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
        isNegative && "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
        isNeutral && "border-muted-foreground/30 bg-muted text-muted-foreground"
      )}
    >
      {isPositive && <Icons.TrendingUp className="h-3 w-3" />}
      {isNegative && <Icons.TrendingDown className="h-3 w-3" />}
      {isNeutral && <Icons.Minus className="h-3 w-3" />}
      <span>{formattedChange}%</span>
    </Badge>
  );
}

// ============================================================================
// Format Value Helper
// ============================================================================

function formatValue(value: number | string): string {
  if (typeof value === "string") {
    return value;
  }

  // Format large numbers with K, M, B suffixes
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  // Format decimals appropriately
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// ============================================================================
// Main Component
// ============================================================================

export function HeroMetricBlock({ block, data }: HeroMetricBlockProps) {
  // Empty state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-5xl font-bold text-muted-foreground/50">--</div>
        <div className="mt-2 text-sm text-muted-foreground">
          {block.title || "No data available"}
        </div>
      </div>
    );
  }

  const { value, label, change, changeDirection, sparkline } = data;

  // Determine sparkline color based on direction
  const sparklineColor =
    changeDirection === "up"
      ? "rgb(34 197 94)" // green-500
      : changeDirection === "down"
        ? "rgb(239 68 68)" // red-500
        : "rgb(148 163 184)"; // slate-400

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {/* Main Value */}
      <div className="text-5xl font-bold tracking-tight">
        {formatValue(value)}
      </div>

      {/* Label */}
      <div className="mt-2 text-lg text-muted-foreground">
        {label}
      </div>

      {/* Delta Badge */}
      {change !== undefined && changeDirection && (
        <div className="mt-3">
          <DeltaBadge change={change} direction={changeDirection} />
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length >= 2 && (
        <div className="mt-4" style={{ color: sparklineColor }}>
          <Sparkline
            data={sparkline}
            width={140}
            height={36}
            strokeColor={sparklineColor}
            strokeWidth={2}
          />
        </div>
      )}
    </div>
  );
}

export default HeroMetricBlock;
