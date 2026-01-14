"use client";

// Detail sheet for viewing vocabulary item information

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@turbostarter/ui-web/sheet";
import { Separator } from "@turbostarter/ui-web/separator";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import { Icons } from "@turbostarter/ui-web/icons";

import { useVocabularyPreview } from "../hooks/use-vocabulary-preview";
import type { PreviewResult } from "../hooks/use-vocabulary-preview";
import type { VocabularyItem, VocabularyType, VocabularyScope, VocabularyStatus } from "../types";

// ============================================================================
// TYPE CONFIGURATIONS
// ============================================================================

const typeConfig: Record<VocabularyType, {
  label: string;
  icon: keyof typeof Icons;
  className: string;
}> = {
  metric: {
    label: "Metric",
    icon: "ChartNoAxesColumn",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  measure: {
    label: "Measure",
    icon: "BarChart3",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  kpi: {
    label: "KPI",
    icon: "Target",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  dimension: {
    label: "Dimension",
    icon: "ChartNoAxesGantt",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  entity: {
    label: "Entity",
    icon: "Database",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  event: {
    label: "Event",
    icon: "Zap",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
};

const scopeConfig: Record<VocabularyScope, {
  label: string;
  icon: keyof typeof Icons;
  description: string;
}> = {
  org: {
    label: "Organization",
    icon: "Building",
    description: "Shared across all workspaces",
  },
  workspace: {
    label: "Workspace",
    icon: "LayoutDashboard",
    description: "Available in this workspace",
  },
  private: {
    label: "Private",
    icon: "Lock",
    description: "Only visible to you",
  },
};

const statusConfig: Record<VocabularyStatus, {
  label: string;
  className: string;
}> = {
  draft: {
    label: "Draft",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  deprecated: {
    label: "Deprecated",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

const sourceConfig: Record<string, {
  label: string;
  icon: keyof typeof Icons;
}> = {
  ai_generated: { label: "AI Generated", icon: "Sparkles" },
  user_created: { label: "User Created", icon: "User2" },
  detected: { label: "Auto-detected", icon: "TextSearch" },
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface VocabularyDetailSheetProps {
  item: VocabularyItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavoriteToggle?: (item: VocabularyItem) => void;
  workspaceId?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function DetailSection({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: keyof typeof Icons;
}) {
  const Icon = icon ? Icons[icon] : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ code, language = "sql" }: { code: string; language?: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
      <code className="text-foreground">{code}</code>
    </pre>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const color =
    percentage >= 80 ? "text-green-600 bg-green-500/10" :
    percentage >= 60 ? "text-yellow-600 bg-yellow-500/10" :
    "text-red-600 bg-red-500/10";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", color)}>
      <Icons.Activity className="h-3 w-3" />
      {percentage}% confidence
    </span>
  );
}

function LiveDataPreview({
  result,
  isLoading,
  isError,
  onRefresh,
}: {
  result: PreviewResult | null;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icons.Database className="h-3.5 w-3.5" />
          Live Data
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (isError || !result) {
    return null;
  }

  if (result.type === "error") {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-destructive">
            <Icons.AlertCircle className="h-3.5 w-3.5" />
            Preview Error
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 px-2">
            <Icons.RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  if (result.type === "unsupported") {
    return null;
  }

  if (result.type === "metric") {
    return (
      <div className="rounded-lg border bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Icons.BarChart3 className="h-3.5 w-3.5" />
            Current Value
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 px-2">
            <Icons.RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-foreground">
            {result.formattedValue}
          </span>
          {result.trend && (
            <span
              className={cn(
                "ml-2 inline-flex items-center gap-1 text-sm",
                result.trend.direction === "up" && "text-green-600",
                result.trend.direction === "down" && "text-red-600",
                result.trend.direction === "flat" && "text-muted-foreground"
              )}
            >
              {result.trend.direction === "up" && <Icons.TrendingUp className="h-4 w-4" />}
              {result.trend.direction === "down" && <Icons.TrendingDown className="h-4 w-4" />}
              {result.trend.direction === "flat" && <Icons.Minus className="h-4 w-4" />}
              {result.trend.percentage !== null && `${result.trend.percentage}%`}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (result.type === "dimension") {
    return (
      <div className="rounded-lg border bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Icons.ChartNoAxesGantt className="h-3.5 w-3.5" />
            Sample Values
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 px-2">
            <Icons.RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {result.sampleValues.slice(0, 6).map((value, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {value}
            </Badge>
          ))}
          {result.hasMore && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{result.totalCount - 6} more
            </Badge>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {result.totalCount.toLocaleString()} unique values
        </p>
      </div>
    );
  }

  if (result.type === "entity") {
    return (
      <div className="rounded-lg border bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Icons.Database className="h-3.5 w-3.5" />
            Record Count
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 px-2">
            <Icons.RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-foreground">
            {result.formattedCount}
          </span>
          <span className="ml-2 text-sm text-muted-foreground">records</span>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VocabularyDetailSheet({
  item,
  open,
  onOpenChange,
  onFavoriteToggle,
  workspaceId,
}: VocabularyDetailSheetProps) {
  // Fetch live preview data when sheet is open
  const { preview, isLoading: previewLoading, isError: previewError, refetch: refetchPreview } = useVocabularyPreview({
    itemId: item?.id ?? null,
    workspaceId: workspaceId ?? "",
    enabled: open && !!item && !!workspaceId,
  });

  if (!item) return null;

  const typeInfo = typeConfig[item.type];
  const TypeIcon = Icons[typeInfo.icon];
  const scopeInfo = scopeConfig[item.scope];
  const ScopeIcon = Icons[scopeInfo.icon];
  const statusInfo = item.status ? statusConfig[item.status] : null;
  const sourceInfo = item.source ? sourceConfig[item.source] : null;

  const description = item.definition?.descriptionHuman;
  const formulaHuman = item.definition?.formulaHuman || item.formulaHuman;
  const formulaSql = item.definition?.formulaSql || item.formulaSql;
  const sourceTables = item.definition?.sourceTables;

  const hasFormula = formulaHuman || formulaSql;
  const isKpiOrMeasure = item.type === "kpi" || item.type === "measure" || item.type === "metric";
  const showPreview = workspaceId && (isKpiOrMeasure || item.type === "dimension" || item.type === "entity" || item.type === "event");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-lg">
        <SheetHeader className="space-y-4 pb-4">
          {/* Type Badge */}
          <div className={cn("inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5", typeInfo.className)}>
            <TypeIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{typeInfo.label}</span>
          </div>

          {/* Title + Favorite */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <SheetTitle className="text-xl">
                {item.canonicalName}
                {item.abbreviation && (
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    ({item.abbreviation})
                  </span>
                )}
              </SheetTitle>
              {onFavoriteToggle && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 shrink-0",
                    item.isFavorite
                      ? "text-yellow-500 hover:text-yellow-600"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onFavoriteToggle(item)}
                >
                  {item.isFavorite ? (
                    <Icons.Star className="h-4 w-4 fill-current" />
                  ) : (
                    <Icons.Star className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Meta badges */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {item.category && (
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              )}
              {statusInfo && (
                <Badge variant="secondary" className={cn("text-xs", statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
              )}
              {sourceInfo && (() => {
                const SourceIcon = Icons[sourceInfo.icon];
                return (
                  <Badge variant="secondary" className="text-xs">
                    <SourceIcon className="mr-1 h-3 w-3" />
                    {sourceInfo.label}
                  </Badge>
                );
              })()}
              {item.confidence !== null && item.confidence !== undefined && (
                <ConfidenceBadge confidence={item.confidence} />
              )}
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          {/* Live Data Preview */}
          {showPreview && (
            <LiveDataPreview
              result={preview?.result ?? null}
              isLoading={previewLoading}
              isError={previewError}
              onRefresh={refetchPreview}
            />
          )}

          {/* Description */}
          {description && (
            <DetailSection title="Description" icon="FileText">
              <p className="text-sm leading-relaxed text-foreground">
                {description}
              </p>
            </DetailSection>
          )}

          {/* Formula (for KPIs/Measures) */}
          {hasFormula && isKpiOrMeasure && (
            <DetailSection title="Formula" icon="BarChart3">
              {formulaHuman && (
                <p className="mb-2 text-sm text-foreground">
                  {formulaHuman}
                </p>
              )}
              {formulaSql && (
                <CodeBlock code={formulaSql} />
              )}
            </DetailSection>
          )}

          {/* Source Tables */}
          {sourceTables && sourceTables.length > 0 && (
            <DetailSection title="Source Tables" icon="Database">
              <div className="flex flex-wrap gap-1.5">
                {sourceTables.map((table) => (
                  <Badge key={table} variant="secondary" className="font-mono text-xs">
                    {table}
                  </Badge>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Scope */}
          <DetailSection title="Scope" icon={scopeInfo.icon}>
            <div className="flex items-center gap-2">
              <ScopeIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{scopeInfo.label}</p>
                <p className="text-xs text-muted-foreground">{scopeInfo.description}</p>
              </div>
            </div>
          </DetailSection>

          {/* Suggested Roles */}
          {item.suggestedForRoles && item.suggestedForRoles.length > 0 && (
            <DetailSection title="Suggested For" icon="UsersRound">
              <div className="flex flex-wrap gap-1.5">
                {item.suggestedForRoles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Usage Stats */}
          {(item.useCount > 0 || item.recentlyUsedAt) && (
            <DetailSection title="Usage" icon="Activity">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {item.useCount > 0 && (
                  <div>
                    <p className="text-muted-foreground">Times used</p>
                    <p className="font-medium">{item.useCount}</p>
                  </div>
                )}
                {item.recentlyUsedAt && (
                  <div>
                    <p className="text-muted-foreground">Last used</p>
                    <p className="font-medium">
                      {new Date(item.recentlyUsedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          {/* Technical Details */}
          <DetailSection title="Technical" icon="Code">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Slug</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {item.slug}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ID</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {item.id.slice(0, 12)}...
                </code>
              </div>
            </div>
          </DetailSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}
