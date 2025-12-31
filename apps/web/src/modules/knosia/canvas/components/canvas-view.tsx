"use client";

// Main canvas view with blocks and editing

import { useState } from "react";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

import { useCanvas } from "../hooks/use-canvas";
import { CanvasGrid } from "./canvas-grid";
import { CanvasPromptBar } from "./canvas-prompt-bar";
import type { CanvasViewProps } from "../types";

export function CanvasView({
  canvasId,
  workspaceId,
  editable = true,
}: CanvasViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    canvas,
    blocks,
    isLoading,
    isError,
    updateCanvas,
  } = useCanvas({ canvasId });

  const handlePromptSubmit = async (instruction: string) => {
    setIsProcessing(true);
    try {
      // TODO: Implement AI canvas editing via API
      console.log("Canvas instruction:", instruction);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !canvas) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Icons.AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load canvas</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          {canvas.icon && (
            <span className="text-2xl">{canvas.icon}</span>
          )}
          <div>
            <h1 className="text-xl font-semibold">{canvas.name}</h1>
            {canvas.description && (
              <p className="text-sm text-muted-foreground">
                {canvas.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editable && (
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Icons.Check className="mr-2 h-4 w-4" />
                  Done
                </>
              ) : (
                <>
                  <Icons.SquarePen className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Icons.EllipsisVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Grid */}
      <div className="flex-1 overflow-auto p-4">
        <CanvasGrid
          blocks={blocks}
          layout={canvas.layout}
          editable={isEditing}
        />
      </div>

      {/* Prompt Bar (for AI editing) */}
      {editable && (
        <div className="border-t p-4">
          <CanvasPromptBar
            canvasId={canvasId}
            onSubmit={handlePromptSubmit}
            isProcessing={isProcessing}
          />
        </div>
      )}
    </div>
  );
}
