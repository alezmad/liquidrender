"use client";

// Card for displaying AI insights

import { Card, CardContent, CardFooter } from "@turbostarter/ui-web/card";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { cn } from "@turbostarter/ui";

import type { InsightCardProps, BriefInsight } from "../types";

const insightTypeConfig: Record<BriefInsight["type"], {
  icon: keyof typeof Icons;
  color: string;
  label: string;
}> = {
  anomaly: {
    icon: "AlertTriangle",
    color: "text-orange-500",
    label: "Anomaly",
  },
  trend: {
    icon: "TrendingUp",
    color: "text-blue-500",
    label: "Trend",
  },
  correlation: {
    icon: "Link",
    color: "text-purple-500",
    label: "Correlation",
  },
  recommendation: {
    icon: "Lightbulb",
    color: "text-yellow-500",
    label: "Recommendation",
  },
  warning: {
    icon: "AlertCircle",
    color: "text-red-500",
    label: "Warning",
  },
};

const priorityBadgeVariant: Record<BriefInsight["priority"], "default" | "secondary" | "outline" | "destructive"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

export function InsightCard({
  insight,
  compact = false,
  onView,
  onEngage,
  onDismiss,
}: InsightCardProps) {
  const config = insightTypeConfig[insight.type];
  const Icon = Icons[config.icon];

  if (compact) {
    return (
      <div
        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
        onClick={onView}
      >
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{insight.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {insight.summary}
          </p>
        </div>
        <Badge variant={priorityBadgeVariant[insight.priority]} className="shrink-0 text-xs">
          {insight.priority}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            "bg-muted"
          )}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
              <Badge variant={priorityBadgeVariant[insight.priority]} className="text-xs">
                {insight.priority}
              </Badge>
            </div>

            <h3 className="mt-2 font-medium">{insight.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {insight.summary}
            </p>

            {insight.details && (
              <p className="mt-2 text-sm text-muted-foreground">
                {insight.details}
              </p>
            )}

            {/* Evidence */}
            {insight.evidence && insight.evidence.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.evidence.map((e, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {e.label}: {e.value}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2 border-t px-4 py-3">
        {insight.suggestedActions?.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onEngage?.()}
          >
            {action.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
        >
          <Icons.X className="mr-1 h-3 w-3" />
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
}
