"use client";

// Card displaying a single vocabulary item

import { cn } from "@turbostarter/ui";
import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@turbostarter/ui-web/tooltip";
import { Icons } from "@turbostarter/ui-web/icons";

import type { VocabularyCardProps, VocabularyType, VocabularyScope } from "../types";

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
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  dimension: {
    label: "Dimension",
    icon: "ChartNoAxesGantt",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  entity: {
    label: "Entity",
    icon: "Database",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  event: {
    label: "Event",
    icon: "Zap",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

const scopeConfig: Record<VocabularyScope, {
  label: string;
  icon: keyof typeof Icons;
  className: string;
}> = {
  org: {
    label: "Organization",
    icon: "Building",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  workspace: {
    label: "Workspace",
    icon: "LayoutDashboard",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  private: {
    label: "Private",
    icon: "Lock",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
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
  const scopeInfo = scopeConfig[item.scope];
  const TypeIcon = Icons[typeInfo.icon];
  const ScopeIcon = Icons[scopeInfo.icon];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(item);
  };

  const description = item.definition?.descriptionHuman;
  const hasFormula = !!item.definition?.formulaHuman || !!item.definition?.formulaSql;

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm",
        isLoading && "pointer-events-none opacity-50"
      )}
      onClick={() => onClick?.(item)}
    >
      <CardContent className="p-4">
        {/* Header Row: Name + Badges + Favorite */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Name and Abbreviation */}
            <div className="flex items-center gap-2">
              <h4 className="truncate font-medium text-foreground">
                {item.canonicalName}
              </h4>
              {item.abbreviation && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  ({item.abbreviation})
                </span>
              )}
            </div>

            {/* Badges Row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {/* Type Badge */}
              <Badge
                variant="secondary"
                className={cn("gap-1 px-1.5 py-0 text-xs", typeInfo.className)}
              >
                <TypeIcon className="h-3 w-3" />
                {typeInfo.label}
              </Badge>

              {/* Scope Badge */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn("gap-1 px-1.5 py-0 text-xs", scopeInfo.className)}
                    >
                      <ScopeIcon className="h-3 w-3" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {scopeInfo.label} level
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Category Badge */}
              {item.category && (
                <Badge variant="outline" className="px-1.5 py-0 text-xs">
                  {item.category}
                </Badge>
              )}

              {/* Formula Indicator */}
              {hasFormula && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="gap-1 px-1.5 py-0 text-xs"
                      >
                        <Icons.Code className="h-3 w-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Has formula definition
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Favorite Button */}
          {onFavoriteToggle && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0",
                item.isFavorite
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-muted-foreground opacity-0 group-hover:opacity-100"
              )}
              onClick={handleFavoriteClick}
              disabled={isLoading}
            >
              {item.isFavorite ? (
                <Icons.Star className="h-4 w-4 fill-current" />
              ) : (
                <Icons.Star className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {/* Usage Stats */}
        {(item.useCount > 0 || item.recentlyUsedAt) && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {item.useCount > 0 && (
              <span className="flex items-center gap-1">
                <Icons.TrendingUp className="h-3 w-3" />
                Used {item.useCount} time{item.useCount !== 1 ? "s" : ""}
              </span>
            )}
            {item.recentlyUsedAt && (
              <span className="flex items-center gap-1">
                <Icons.ClockFading className="h-3 w-3" />
                Recently used
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
