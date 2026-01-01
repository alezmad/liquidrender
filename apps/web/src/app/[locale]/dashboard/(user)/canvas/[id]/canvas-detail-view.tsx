"use client";

import { CanvasSidebar, CanvasView } from "~/modules/knosia";

interface CanvasDetailViewProps {
  canvasId: string;
}

export function CanvasDetailView({ canvasId }: CanvasDetailViewProps) {
  return (
    <div className="flex h-full">
      <CanvasSidebar selectedId={canvasId} />
      <div className="flex-1">
        <CanvasView canvasId={canvasId} workspaceId="default" />
      </div>
    </div>
  );
}
