"use client";

// Main brief view with sections

import { Icons } from "@turbostarter/ui-web/icons";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";

import { useBrief } from "../hooks/use-brief";
import { AttentionSection } from "./attention-section";
import { OnTrackSection } from "./on-track-section";
import { ThinkingSection } from "./thinking-section";
import { TasksSection } from "./tasks-section";
import type { BriefViewProps } from "../types";

export function BriefView({ workspaceId, roleId }: BriefViewProps) {
  const {
    sections,
    insights,
    isLoading,
    isError,
    refetch,
  } = useBrief({ workspaceId, roleId });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Preparing your briefing...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Icons.AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load briefing</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const attentionSection = sections.find(s => s.type === "attention");
  const onTrackSection = sections.find(s => s.type === "on_track");
  const thinkingSection = sections.find(s => s.type === "thinking");
  const tasksSection = sections.find(s => s.type === "tasks");

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Good morning</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your data
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Icons.RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Attention Section */}
        {attentionSection && attentionSection.items.length > 0 && (
          <AttentionSection items={attentionSection.items} />
        )}

        {/* Thinking Section */}
        <ThinkingSection
          content={thinkingSection?.items[0]?.description}
          isLoading={false}
        />

        {/* On Track Section */}
        {onTrackSection && onTrackSection.items.length > 0 && (
          <OnTrackSection items={onTrackSection.items} />
        )}

        {/* Tasks Section */}
        {tasksSection && tasksSection.items.length > 0 && (
          <TasksSection items={tasksSection.items} />
        )}

        {/* Empty state */}
        {sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icons.PackageOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No updates yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start exploring your data to get personalized insights
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
