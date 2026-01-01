"use client";

import { ThreadSidebar } from "~/modules/knosia";
import { Icons } from "@turbostarter/ui-web/icons";

export function ThreadsListView() {
  return (
    <div className="flex h-full">
      <ThreadSidebar />
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Icons.MessagesSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4">Select a thread to view</p>
        </div>
      </div>
    </div>
  );
}
