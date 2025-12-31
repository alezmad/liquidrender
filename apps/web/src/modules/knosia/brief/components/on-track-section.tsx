"use client";

// Section showing metrics that are on track

import { useState } from "react";
import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { cn } from "@turbostarter/ui";

import type { OnTrackSectionProps, BriefItem } from "../types";

export function OnTrackSection({
  items,
  showAll: initialShowAll = false,
  onToggleShowAll,
}: OnTrackSectionProps) {
  const [showAll, setShowAll] = useState(initialShowAll);
  const displayItems = showAll ? items : items.slice(0, 4);
  const hasMore = items.length > 4;

  const handleToggle = () => {
    setShowAll(!showAll);
    onToggleShowAll?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icons.CheckCircle2 className="h-5 w-5 text-green-500" />
        <h2 className="text-lg font-semibold">On Track</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {displayItems.map((item) => (
          <OnTrackCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleToggle}
        >
          {showAll ? (
            <>
              <Icons.ChevronUp className="mr-2 h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <Icons.ChevronDown className="mr-2 h-4 w-4" />
              Show {items.length - 4} More
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface OnTrackCardProps {
  item: BriefItem;
}

function OnTrackCard({ item }: OnTrackCardProps) {
  return (
    <Card className="bg-green-50/50 dark:bg-green-950/20">
      <CardContent className="p-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{item.title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {item.value ?? "—"}
            </span>
            {item.change && (
              <span className={cn(
                "flex items-center text-sm",
                item.change.isPositive !== false ? "text-green-600" : "text-muted-foreground"
              )}>
                {item.change.direction === "up" && <Icons.TrendingUp className="mr-1 h-3 w-3" />}
                {item.change.direction === "down" && <Icons.TrendingDown className="mr-1 h-3 w-3" />}
                {item.change.value}%
              </span>
            )}
          </div>
          {item.change?.period && (
            <p className="text-xs text-muted-foreground">
              vs {item.change.period}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
