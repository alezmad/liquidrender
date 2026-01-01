"use client";

// Insight Card Block - Displays AI-generated insights with severity-based styling

import { useState } from "react";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

import type { CanvasBlock } from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface InsightCardData {
  headline: string;
  explanation: string;
  severity: "info" | "warning" | "critical";
  evidence?: {
    metric: string;
    value: number;
    change: number;
  };
  actions?: Array<{ label: string; action: string }>;
}

export interface InsightCardBlockProps {
  block: CanvasBlock;
  data: InsightCardData;
  onAction?: (action: string) => void;
}

// ============================================================================
// Severity Config
// ============================================================================

const severityConfig = {
  info: {
    icon: Icons.Info,
    containerClass: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50",
    iconClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  warning: {
    icon: Icons.AlertTriangle,
    containerClass: "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/50",
    iconClass: "text-yellow-600 dark:text-yellow-400",
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  critical: {
    icon: Icons.AlertCircle,
    containerClass: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50",
    iconClass: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
} as const;

// ============================================================================
// Main Component
// ============================================================================

export function InsightCardBlock({
  block,
  data,
  onAction,
}: InsightCardBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { headline, explanation, severity, evidence, actions } = data;
  const config = severityConfig[severity];
  const SeverityIcon = config.icon;

  return (
    <div
      data-block-type="insight-card"
      data-block-id={block.id}
      className={cn(
        "rounded-lg border p-4 transition-all",
        config.containerClass
      )}
    >
      {/* Header with icon and headline */}
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", config.iconClass)}>
          <SeverityIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                config.badgeClass
              )}
            >
              {severity}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-foreground">
            {headline}
          </h3>
        </div>
      </div>

      {/* Evidence metrics */}
      {evidence && (
        <div className="mt-3 flex items-center gap-4 rounded-md bg-background/50 p-2">
          <div className="text-xs text-muted-foreground">{evidence.metric}</div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-sm font-medium">
              {typeof evidence.value === "number"
                ? evidence.value.toLocaleString()
                : evidence.value}
            </span>
            {evidence.change !== 0 && (
              <span
                className={cn(
                  "flex items-center text-xs",
                  evidence.change > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {evidence.change > 0 ? (
                  <Icons.TrendingUp className="mr-0.5 h-3 w-3" />
                ) : (
                  <Icons.TrendingDown className="mr-0.5 h-3 w-3" />
                )}
                {Math.abs(evidence.change)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collapsible explanation */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icons.ChevronRight
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
          {isExpanded ? "Hide details" : "Show details"}
        </button>
        <div
          className={cn(
            "grid transition-all duration-200",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <p className="pt-2 text-sm text-muted-foreground leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {actions && actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAction?.(action.action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default InsightCardBlock;
