"use client";

import { ConnectionCard } from "./connection-card";
import { useDeleteConnection } from "../hooks/use-connections";
import type { ConnectionWithHealth } from "../types";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@turbostarter/ui-web/alert-dialog";
import { toast } from "sonner";

interface ConnectionsListProps {
  connections: ConnectionWithHealth[];
  orgId: string;
}

export function ConnectionsList({
  connections,
  orgId,
}: ConnectionsListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteConnection = useDeleteConnection();

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteConnection.mutateAsync({ id: deleteId, orgId });
      toast.success("Connection deleted", {
        description: "The connection has been removed successfully.",
      });
      setDeleteId(null);
    } catch (error) {
      toast.error("Failed to delete connection", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const connectionToDelete = connections.find((c) => c.id === deleteId);

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
            onDelete={setDeleteId}
            isDeleting={deleteConnection.isPending}
          />
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{connectionToDelete?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
