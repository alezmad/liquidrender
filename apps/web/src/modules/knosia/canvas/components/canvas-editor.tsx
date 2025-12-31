"use client";

// Full canvas editor with block management

import { useState } from "react";
import { Button } from "@turbostarter/ui-web/button";
import { Card } from "@turbostarter/ui-web/card";
import { Input } from "@turbostarter/ui-web/input";
import { Label } from "@turbostarter/ui-web/label";
import { Textarea } from "@turbostarter/ui-web/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@turbostarter/ui-web/sheet";
import { Icons } from "@turbostarter/ui-web/icons";

import { useCanvasBlocks } from "../hooks/use-canvas-blocks";
import { CanvasGrid } from "./canvas-grid";
import type { CanvasEditorProps, BlockType, BlockPosition } from "../types";

const BLOCK_TYPES: { type: BlockType; label: string; icon: keyof typeof Icons }[] = [
  { type: "kpi", label: "KPI", icon: "Target" },
  { type: "hero_metric", label: "Hero Metric", icon: "Target" },
  { type: "line_chart", label: "Line Chart", icon: "ChartNoAxesColumn" },
  { type: "bar_chart", label: "Bar Chart", icon: "ChartNoAxesColumn" },
  { type: "area_chart", label: "Area Chart", icon: "ChartNoAxesColumn" },
  { type: "pie_chart", label: "Pie Chart", icon: "ChartNoAxesColumn" },
  { type: "table", label: "Table", icon: "ChartNoAxesGantt" },
  { type: "watch_list", label: "Watch List", icon: "Eye" },
  { type: "comparison", label: "Comparison", icon: "ArrowRight" },
  { type: "insight", label: "Insight", icon: "Lightbulb" },
  { type: "text", label: "Text", icon: "FileText" },
];

export function CanvasEditor({
  canvas,
  blocks,
  onSave,
  onCancel,
}: CanvasEditorProps) {
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const {
    createBlock,
    isCreating,
    deleteBlock,
    isDeleting,
  } = useCanvasBlocks({ canvasId: canvas.id });

  const handleAddBlock = async (type: BlockType) => {
    // Calculate position for new block
    const maxY = blocks.reduce((max, b) => Math.max(max, b.position.y + b.position.height), 0);
    const position: BlockPosition = {
      x: 0,
      y: maxY,
      width: 4,
      height: 2,
    };

    await createBlock({ type, position });
    setShowBlockPicker(false);
  };

  const handleDeleteBlock = async () => {
    if (!selectedBlockId) return;
    await deleteBlock(selectedBlockId);
    setSelectedBlockId(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBlockPicker(true)}
          >
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add Block
          </Button>

          {selectedBlockId && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteBlock}
              disabled={isDeleting}
            >
              <Icons.Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Canvas Grid */}
      <div className="flex-1 overflow-auto p-4">
        <CanvasGrid
          blocks={blocks}
          layout={canvas.layout}
          editable
          onBlockClick={setSelectedBlockId}
        />
      </div>

      {/* Block Picker Sheet */}
      <Sheet open={showBlockPicker} onOpenChange={setShowBlockPicker}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Add Block</SheetTitle>
            <SheetDescription>
              Choose a block type to add to your canvas
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map(({ type, label, icon }) => {
              const Icon = Icons[icon];
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => handleAddBlock(type)}
                  disabled={isCreating}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs">{label}</span>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
