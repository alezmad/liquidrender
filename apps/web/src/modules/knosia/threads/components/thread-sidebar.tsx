"use client";

// Sidebar showing list of threads

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@turbostarter/ui-web/button";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";
import { Icons } from "@turbostarter/ui-web/icons";
import { cn } from "@turbostarter/ui";
import { pathsConfig } from "~/config/paths";

import { useThreadsList } from "../hooks/use-threads-list";
import type { Thread } from "../types";

interface ThreadSidebarProps {
  workspaceId?: string;
  selectedId?: string;
}

export function ThreadSidebar({ workspaceId, selectedId }: ThreadSidebarProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);

  const { threads, isLoading, createThread, isCreating } = useThreadsList({
    workspaceId,
    status: showArchived ? "archived" : "active",
  });

  const handleNewThread = async () => {
    try {
      const thread = await createThread();
      router.push(pathsConfig.knosia.threads.detail(thread.id));
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleSelectThread = (threadId: string) => {
    router.push(pathsConfig.knosia.threads.detail(threadId));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold">Threads</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleNewThread}
          disabled={isCreating}
        >
          {isCreating ? (
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {showArchived ? "No archived threads" : "No threads yet"}
            </div>
          ) : (
            <div className="space-y-1">
              {threads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === selectedId}
                  onClick={() => handleSelectThread(thread.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Icons.Package className="mr-2 h-4 w-4" />
          {showArchived ? "Show Active" : "Show Archived"}
        </Button>
      </div>
    </div>
  );
}

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  onClick: () => void;
  formatDate: (dateStr: string) => string;
}

function ThreadItem({
  thread,
  isActive,
  onClick,
  formatDate,
}: ThreadItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md p-2 text-left transition-colors",
        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {thread.title || "New Thread"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(thread.updatedAt)}
        </span>
      </div>
    </button>
  );
}
