"use client";

// Individual block in a canvas

import { cn } from "@turbostarter/ui";
import { Card, CardHeader, CardTitle, CardContent } from "@turbostarter/ui-web/card";
import { Button } from "@turbostarter/ui-web/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@turbostarter/ui-web/dropdown-menu";
import { Icons } from "@turbostarter/ui-web/icons";

import { BlockRenderer } from "./blocks/block-renderer";
import type { CanvasBlockProps, BlockType } from "../types";

const blockIcons: Record<BlockType, keyof typeof Icons> = {
  kpi: "Target",
  line_chart: "ChartNoAxesColumn",
  bar_chart: "ChartNoAxesColumn",
  area_chart: "ChartNoAxesColumn",
  pie_chart: "ChartNoAxesColumn",
  table: "ChartNoAxesGantt",
  hero_metric: "Target",
  watch_list: "Eye",
  comparison: "ArrowRight",
  insight: "Lightbulb",
  text: "FileText",
};

export function CanvasBlockComponent({
  block,
  editable = false,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
}: CanvasBlockProps) {
  const Icon = Icons[blockIcons[block.type]] || Icons.Square;

  return (
    <Card
      className={cn(
        "h-full transition-shadow",
        selected && "ring-2 ring-primary",
        editable && "cursor-pointer hover:shadow-md"
      )}
      onClick={onSelect}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            {block.title || formatBlockType(block.type)}
          </CardTitle>
        </div>

        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <Icons.EllipsisVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Icons.SquarePen className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Icons.Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        <BlockRenderer
          block={block}
          data={block.cachedData}
        />
      </CardContent>
    </Card>
  );
}

function formatBlockType(type: BlockType): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
