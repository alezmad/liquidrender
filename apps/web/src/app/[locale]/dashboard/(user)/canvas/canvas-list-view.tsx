"use client";

import { CanvasSidebar } from "~/modules/knosia";
import { Icons } from "@turbostarter/ui-web/icons";

export function CanvasListView() {
  return (
    <div className="flex h-full">
      <CanvasSidebar />
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Icons.ChartNoAxesColumn className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4">Select a canvas to view</p>
        </div>
      </div>
    </div>
  );
}
