"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConnectionCard } from "./connection-card";
import {
  previewDeleteConnection,
  executeDeleteConnection,
} from "../hooks/use-connections";
import { useDestructiveAction } from "~/modules/common/hooks/use-destructive-action";
import { DestructiveActionDialog } from "~/modules/common/destructive-action-dialog";
import type { ConnectionWithHealth } from "../types";

interface ConnectionsListProps {
  connections: ConnectionWithHealth[];
  orgId: string;
}

export function ConnectionsList({
  connections,
  orgId,
}: ConnectionsListProps) {
  const queryClient = useQueryClient();

  const deleteAction = useDestructiveAction({
    previewFn: async ({ id }: { id: string }) => {
      return previewDeleteConnection({ id, orgId });
    },
    executeFn: async ({ id }: { id: string }) => {
      await executeDeleteConnection({ id, orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", orgId] });
      toast.success("Connection deleted", {
        description: "The connection has been removed successfully.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete connection", {
        description: error.message,
      });
    },
  });

  const connectionToDelete = connections.find(
    (c) => c.id === (deleteAction.pendingParams as { id: string } | null)?.id,
  );

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold">No connections</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by adding your first database connection.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            onDelete={(id) => deleteAction.initiate({ id })}
            isDeleting={deleteAction.isExecuting}
          />
        ))}
      </div>

      <DestructiveActionDialog
        open={deleteAction.isOpen}
        onOpenChange={() => deleteAction.cancel()}
        title="Delete connection?"
        description={`Are you sure you want to delete "${connectionToDelete?.name}"? This action cannot be undone.`}
        impacts={deleteAction.impacts}
        isLoading={deleteAction.isLoadingPreview}
        isExecuting={deleteAction.isExecuting}
        onConfirm={deleteAction.confirm}
        onCancel={deleteAction.cancel}
      />
    </>
  );
}
