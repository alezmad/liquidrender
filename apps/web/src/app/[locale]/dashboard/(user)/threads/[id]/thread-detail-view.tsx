"use client";

import { ThreadSidebar, ThreadView } from "~/modules/knosia";

interface ThreadDetailViewProps {
  threadId: string;
}

export function ThreadDetailView({ threadId }: ThreadDetailViewProps) {
  return (
    <div className="flex h-full">
      <ThreadSidebar selectedId={threadId} />
      <div className="flex-1">
        <ThreadView threadId={threadId} />
      </div>
    </div>
  );
}
