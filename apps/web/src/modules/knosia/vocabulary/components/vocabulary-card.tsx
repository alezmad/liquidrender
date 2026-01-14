"use client";

// Card displaying a single vocabulary item - compact list style

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@turbostarter/ui-web/tooltip";
import { Icons } from "@turbostarter/ui-web/icons";

import type { VocabularyCardProps, VocabularyType, VocabularyScope, KPIQualityFlag } from "../types";
import { getQualityLevel, getQualityColor, getQualityBgColor } from "../types";

// ============================================================================
// TYPE & SCOPE CONFIGURATIONS
// ============================================================================

const typeConfig: Record<VocabularyType, {
  label: string;
  icon: keyof typeof Icons;
  className: string;
}> = {
  metric: {
    label: "Metric",
    icon: "ChartNoAxesColumn",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  measure: {
    label: "Measure",
    icon: "BarChart3",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  kpi: {
    label: "KPI",
    icon: "Target",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  dimension: {
    label: "Dimension",
    icon: "ChartNoAxesGantt",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  entity: {
    label: "Entity",
    icon: "Database",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  event: {
    label: "Event",
    icon: "Zap",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
};

const scopeIcons: Record<VocabularyScope, keyof typeof Icons> = {
  org: "Building",
  workspace: "LayoutDashboard",
  private: "Lock",
};

const scopeLabels: Record<VocabularyScope, string> = {
  org: "Organization",
  workspace: "Workspace",
  private: "Private",
};

/**
 * Human-readable labels for quality flags
 */
const qualityFlagLabels: Record<KPIQualityFlag, string> = {
  proxy_calculation: "Approximate data",
  high_null_rate: "Missing values",
  stale_data: "Outdated data",
  low_coverage: "Limited coverage",
  complex_formula: "Complex formula",
  missing_time_field: "No time series",
  low_cardinality: "Few unique values",
  derived_metric: "Depends on other metrics",
};

// ============================================================================
// VOCABULARY CARD COMPONENT
// ============================================================================

export function VocabularyCard({
  item,
  onFavoriteToggle,
  onClick,
  isLoading = false,
}: VocabularyCardProps) {
  const typeInfo = typeConfig[item.type];
  const TypeIcon = Icons[typeInfo.icon];
  const ScopeIcon = Icons[scopeIcons[item.scope]];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(item);
  };

  const description = item.definition?.descriptionHuman;
  const qualityScore = item.definition?.qualityScore;
  const isKPI = item.type === "kpi";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors",
        "hover:border-primary/30 hover:bg-accent/50 cursor-pointer",
        isLoading && "pointer-events-none opacity-50"
      )}
      onClick={() => onClick?.(item)}
    >
      {/* Type Icon */}
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", typeInfo.className)}>
        <TypeIcon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Name Row */}
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {item.canonicalName}
          </span>
          {item.abbreviation && (
            <span className="shrink-0 text-xs text-muted-foreground">
              ({item.abbreviation})
            </span>
          )}
          {/* Category */}
          {item.category && item.category !== "private" && (
            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
              {item.category}
            </Badge>
          )}
          {/* Quality Score Badge (KPIs only) */}
          {isKPI && qualityScore && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    getQualityBgColor(qualityScore.overall),
                    getQualityColor(qualityScore.overall)
                  )}>
                    <Icons.Activity className="h-2.5 w-2.5" />
                    <span>{qualityScore.overall}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1.5 text-xs">
                    <div className="font-medium">Quality: {getQualityLevel(qualityScore.overall).toUpperCase()}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                      <span>Data Fit:</span><span className={getQualityColor(qualityScore.dataFit)}>{qualityScore.dataFit}%</span>
                      <span>Relevance:</span><span className={getQualityColor(qualityScore.businessRelevance)}>{qualityScore.businessRelevance}%</span>
                      <span>Confidence:</span><span className={getQualityColor(qualityScore.calculationConfidence)}>{qualityScore.calculationConfidence}%</span>
                      <span>Actionability:</span><span className={getQualityColor(qualityScore.actionability)}>{qualityScore.actionability}%</span>
                      <span>Data Quality:</span><span className={getQualityColor(qualityScore.dataQuality)}>{qualityScore.dataQuality}%</span>
                    </div>
                    {qualityScore.flags.length > 0 && (
                      <div className="border-t pt-1.5 text-muted-foreground">
                        <span className="text-yellow-600 dark:text-yellow-400">Warnings: </span>
                        {qualityScore.flags.map(f => qualityFlagLabels[f]).join(", ")}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="truncate text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Right Side: Scope + Favorite */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Scope Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-6 w-6 items-center justify-center text-muted-foreground/60">
                <ScopeIcon className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {scopeLabels[item.scope]} level
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Favorite Button */}
        {onFavoriteToggle && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              item.isFavorite
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
            )}
            onClick={handleFavoriteClick}
            disabled={isLoading}
          >
            {item.isFavorite ? (
              <Icons.Star className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Icons.Star className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
