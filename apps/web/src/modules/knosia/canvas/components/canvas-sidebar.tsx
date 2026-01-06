"use client";

// Sidebar showing list of canvases

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@turbostarter/ui-web/button";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";
import { Icons } from "@turbostarter/ui-web/icons";
import { cn } from "@turbostarter/ui";
import { pathsConfig } from "~/config/paths";

import { useCanvasesList } from "../hooks/use-canvases-list";
import type { Canvas, CanvasStatus } from "../types";

interface CanvasSidebarProps {
  workspaceId?: string;
  selectedId?: string;
}

export function CanvasSidebar({ workspaceId, selectedId }: CanvasSidebarProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { canvases, isLoading, createCanvas } = useCanvasesList({
    workspaceId: workspaceId ?? "",
    status: showArchived ? "archived" : "active",
  });

  const handleNewCanvas = async () => {
    setIsCreating(true);
    try {
      const canvas = await createCanvas({
        name: "Untitled Canvas",
      });
      router.push(pathsConfig.knosia.canvas.detail(canvas.id));
    } catch (error) {
      console.error("Failed to create canvas:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectCanvas = (canvasId: string) => {
    router.push(pathsConfig.knosia.canvas.detail(canvasId));
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
        <h3 className="font-semibold">Canvases</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleNewCanvas}
          disabled={isCreating}
        >
          {isCreating ? (
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Canvas List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : canvases.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {showArchived ? "No archived canvases" : "No canvases yet"}
            </div>
          ) : (
            <div className="space-y-1">
              {canvases.map((canvas) => (
                <CanvasItem
                  key={canvas.id}
                  canvas={canvas}
                  isActive={canvas.id === selectedId}
                  onClick={() => handleSelectCanvas(canvas.id)}
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

interface CanvasItemProps {
  canvas: Canvas;
  isActive: boolean;
  onClick: () => void;
  formatDate: (dateStr: string) => string;
}

function CanvasItem({
  canvas,
  isActive,
  onClick,
  formatDate,
}: CanvasItemProps) {
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
          <div className="flex items-center gap-2">
            {canvas.icon && <span className="text-sm">{canvas.icon}</span>}
            <p className="truncate text-sm font-medium">
              {canvas.name || "Untitled Canvas"}
            </p>
          </div>
          {canvas.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {canvas.description}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(canvas.updatedAt)}
        </span>
      </div>
    </button>
  );
}
