"use client";

import { useState } from "react";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Card } from "@turbostarter/ui-web/card";
import { Badge } from "@turbostarter/ui-web/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@turbostarter/ui-web/dropdown-menu";
import { Icons } from "@turbostarter/ui-web/icons";

import type { CalculatedMetric } from "../hooks/use-metrics";

// ============================================================================
// TYPES
// ============================================================================

interface MetricCardProps {
  metric: CalculatedMetric;
  onExecute: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAddToCanvas?: () => void;
  isExecuting?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

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

/** Format semantic definition into human-readable text */
function formatSemanticDefinition(def: Record<string, unknown>): string {
  const parts: string[] = [];

  if (def.aggregation && def.expression) {
    parts.push(`${def.aggregation}(${def.expression})`);
  }

  if (def.entity) {
    parts.push(`from ${def.entity}`);
  }

  if (def.filters && Array.isArray(def.filters) && def.filters.length > 0) {
    const filterStr = (def.filters as Array<{ field: string; operator: string; value: unknown }>)
      .map((f) => `${f.field} ${f.operator} ${String(f.value)}`)
      .join(", ");
    parts.push(`where ${filterStr}`);
  }

  if (def.timeGranularity) {
    parts.push(`by ${def.timeGranularity}`);
  }

  return parts.join(" ") || "Custom calculation";
}

/** Format relative time */
function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MetricCard({
  metric,
  onExecute,
  onEdit,
  onDelete,
  onDuplicate,
  onAddToCanvas,
  isExecuting = false,
}: MetricCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const emoji = getCategoryEmoji(metric.category);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {/* Header with icon and name */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <h3 className="truncate text-lg font-semibold">{metric.name}</h3>
            {metric.confidence !== null && metric.confidence < 0.8 && (
              <Badge variant="secondary" className="shrink-0">
                {Math.round(metric.confidence * 100)}% confidence
              </Badge>
            )}
            {metric.status === "draft" && (
              <Badge variant="outline" className="shrink-0">
                Draft
              </Badge>
            )}
            {metric.status === "deprecated" && (
              <Badge variant="destructive" className="shrink-0">
                Deprecated
              </Badge>
            )}
          </div>

          {/* Semantic definition */}
          <p className="mt-1 text-sm text-muted-foreground">
            {formatSemanticDefinition(metric.semanticDefinition)}
          </p>

          {/* Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {metric.lastExecutedAt && (
              <span className="flex items-center gap-1">
                <Icons.ClockFading className="h-3 w-3" />
                Last run: {formatRelativeTime(metric.lastExecutedAt)}
              </span>
            )}
            {metric.canvasCount !== null && metric.canvasCount > 0 && (
              <span className="flex items-center gap-1">
                <Icons.LayoutDashboard className="h-3 w-3" />
                Used in {metric.canvasCount} canvas{metric.canvasCount > 1 ? "es" : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icons.Sparkles className="h-3 w-3" />
              {metric.source === "ai_generated" ? "AI Generated" : "User Created"}
            </span>
          </div>

          {/* Last execution result */}
          {metric.lastExecutionResult && (
            <div className="mt-3 inline-flex items-baseline gap-2 rounded-md bg-muted/50 px-3 py-1">
              <span className="text-xl font-bold">
                {metric.lastExecutionResult.formattedValue}
              </span>
              {metric.lastExecutionResult.fromCache && (
                <span className="text-xs text-muted-foreground">(cached)</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ml-4 flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExecute}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.Play className="mr-2 h-4 w-4" />
            )}
            Execute
          </Button>

          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icons.Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Icons.EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDetails(!showDetails)}>
                <Icons.Eye className="mr-2 h-4 w-4" />
                {showDetails ? "Hide Details" : "View Details"}
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Icons.Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onAddToCanvas && (
                <DropdownMenuItem onClick={onAddToCanvas}>
                  <Icons.LayoutDashboard className="mr-2 h-4 w-4" />
                  Add to Canvas
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Icons.Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-4 rounded-md bg-muted p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Semantic Definition
          </div>
          <pre className="overflow-x-auto text-xs">
            {JSON.stringify(metric.semanticDefinition, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}
