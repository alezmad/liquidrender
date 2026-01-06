"use client";

import { CanvasSidebar, CanvasView } from "~/modules/knosia";
import { Icons } from "@turbostarter/ui-web/icons";

interface CanvasDetailViewProps {
  canvasId: string;
  workspaceId?: string;
}

export function CanvasDetailView({ canvasId, workspaceId }: CanvasDetailViewProps) {
  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Icons.Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4">No connections found. Add a database connection first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <CanvasSidebar workspaceId={workspaceId} selectedId={canvasId} />
      <div className="flex-1">
        <CanvasView canvasId={canvasId} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
