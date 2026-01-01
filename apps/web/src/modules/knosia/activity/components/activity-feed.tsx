"use client";

import { useState } from "react";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { Icons } from "@turbostarter/ui-web/icons";

import type { ActivityType } from "../hooks/use-activity";
import { useActivityFeed } from "../hooks/use-activity";
import { ActivityItem } from "./activity-item";

interface ActivityFeedProps {
  workspaceId: string;
  className?: string;
  showFilters?: boolean;
  limit?: number;
}

const activityTypeLabels: Record<ActivityType | "all", string> = {
  all: "All Activity",
  thread_created: "Threads Created",
  thread_shared: "Threads Shared",
  canvas_created: "Canvases Created",
  canvas_shared: "Canvases Shared",
  canvas_updated: "Canvases Updated",
  comment_added: "Comments",
  insight_converted: "Insights Converted",
};

export function ActivityFeed({
  workspaceId,
  className,
  showFilters = true,
  limit = 50,
}: ActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useActivityFeed({
    workspaceId,
    type: typeFilter === "all" ? undefined : typeFilter,
    page,
    perPage: limit,
  });

  const activities = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = activities.length < total;

  return (
    <div className={cn("space-y-4", className)}>
      {showFilters && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icons.Activity className="h-5 w-5" />
            Activity Feed
          </h2>

          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as ActivityType | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(activityTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-4">
          Failed to load activity feed
        </div>
      )}

      {!isLoading && !error && activities.length === 0 && (
        <div className="text-center py-12">
          <Icons.Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No activity yet</h3>
          <p className="text-sm text-muted-foreground">
            Activity will appear here when you or your team members take actions.
          </p>
        </div>
      )}

      {activities.length > 0 && (
        <div className="space-y-1">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
