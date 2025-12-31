"use client";

// Grid layout for canvas blocks

import { cn } from "@turbostarter/ui";
import { CanvasBlockComponent } from "./canvas-block";
import type { CanvasGridProps, CanvasBlock, BlockPosition } from "../types";

const DEFAULT_COLUMNS = 12;
const DEFAULT_CELL_HEIGHT = 100; // pixels

export function CanvasGrid({
  blocks,
  layout,
  editable = false,
  onBlockClick,
  onBlockMove,
  onBlockResize,
}: CanvasGridProps) {
  const columns = layout?.columns ?? DEFAULT_COLUMNS;
  const isGrid = layout?.type !== "freeform";

  if (blocks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          {editable
            ? "Click the + button or use AI to add blocks"
            : "No blocks in this canvas"}
        </p>
      </div>
    );
  }

  if (isGrid) {
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            style={{
              gridColumn: `span ${Math.min(block.position.width, columns)}`,
              minHeight: `${block.position.height * DEFAULT_CELL_HEIGHT}px`,
            }}
          >
            <CanvasBlockComponent
              block={block}
              editable={editable}
              onSelect={() => onBlockClick?.(block.id)}
            />
          </div>
        ))}
      </div>
    );
  }

  // Freeform layout
  return (
    <div className="relative min-h-[600px]">
      {blocks.map((block) => (
        <div
          key={block.id}
          className={cn(
            "absolute",
            editable && "cursor-move"
          )}
          style={{
            left: `${block.position.x}%`,
            top: `${block.position.y}px`,
            width: `${(block.position.width / columns) * 100}%`,
            height: `${block.position.height * DEFAULT_CELL_HEIGHT}px`,
          }}
        >
          <CanvasBlockComponent
            block={block}
            editable={editable}
            onSelect={() => onBlockClick?.(block.id)}
          />
        </div>
      ))}
    </div>
  );
}
