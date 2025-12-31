"use client";

// Section showing items requiring attention

import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Badge } from "@turbostarter/ui-web/badge";
import { Icons } from "@turbostarter/ui-web/icons";
import { cn } from "@turbostarter/ui";

import type { AttentionSectionProps, BriefItem, InsightPriority } from "../types";

const priorityConfig: Record<InsightPriority, {
  icon: keyof typeof Icons;
  color: string;
  bgColor: string;
}> = {
  critical: {
    icon: "AlertTriangle",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
  high: {
    icon: "AlertCircle",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950",
  },
  medium: {
    icon: "Info",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
  },
  low: {
    icon: "Info",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
};

export function AttentionSection({ items, onItemClick }: AttentionSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icons.AlertCircle className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold">Needs Attention</h2>
        <Badge variant="secondary" className="ml-auto">
          {items.length}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <AttentionCard
            key={item.id}
            item={item}
            onClick={() => onItemClick?.(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface AttentionCardProps {
  item: BriefItem;
  onClick?: () => void;
}

function AttentionCard({ item, onClick }: AttentionCardProps) {
  const priority = item.priority ?? "medium";
  const config = priorityConfig[priority];
  const Icon = Icons[config.icon];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        config.bgColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 shrink-0", config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium leading-tight">{item.title}</h3>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}
            {item.value !== undefined && (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold">{item.value}</span>
                {item.change && (
                  <span className={cn(
                    "text-sm",
                    item.change.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {item.change.direction === "up" ? "↑" : "↓"}
                    {item.change.value}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
