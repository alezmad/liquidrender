"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ThreadSidebar, useThreadsList } from "~/modules/knosia";
import { Icons } from "@turbostarter/ui-web/icons";
import { pathsConfig } from "~/config/paths";

export function ThreadsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const hasCreatedRef = useRef(false);

  const { createThread, isCreating } = useThreadsList();

  useEffect(() => {
    if (initialQuery && !isCreating && !hasCreatedRef.current) {
      hasCreatedRef.current = true;
      createThread(initialQuery)
        .then((thread) => {
          router.replace(pathsConfig.knosia.threads.detail(thread.id));
        })
        .catch((error) => {
          console.error("Failed to create thread:", error);
          hasCreatedRef.current = false;
        });
    }
  }, [initialQuery, isCreating, createThread, router]);

  if (isCreating) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
