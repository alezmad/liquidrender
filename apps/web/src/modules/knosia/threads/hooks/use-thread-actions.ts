// Hook for thread actions (archive, delete, export)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

interface UseThreadActionsOptions {
  threadId: string;
  workspaceId: string;
  onSuccess?: () => void;
}

interface UseThreadActionsReturn {
  archive: () => Promise<void>;
  isArchiving: boolean;
  deleteThread: () => Promise<void>;
  isDeleting: boolean;
  updateTitle: (title: string) => Promise<void>;
  isUpdating: boolean;
}

export function useThreadActions({
  threadId,
  workspaceId,
  onSuccess,
}: UseThreadActionsOptions): UseThreadActionsReturn {
  const queryClient = useQueryClient();

  const invalidateThreads = () => {
    queryClient.invalidateQueries({
      queryKey: ["knosia", "threads", workspaceId],
    });
    queryClient.invalidateQueries({
      queryKey: ["knosia", "thread", threadId],
    });
  };

  // Archive thread - uses POST /:id/archive
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.knosia.thread[":id"].archive.$post({
        param: { id: threadId },
        json: { workspaceId },
      });
      if (!res.ok) throw new Error("Failed to archive thread");
    },
    onSuccess: () => {
      invalidateThreads();
      onSuccess?.();
    },
  });

  // Delete thread - requires workspaceId query param
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.knosia.thread[":id"].$delete({
        param: { id: threadId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error("Failed to delete thread");
    },
    onSuccess: () => {
      invalidateThreads();
      onSuccess?.();
    },
  });

  // Update title - Note: Title updates happen via thread context, not direct API
  // This is a no-op placeholder for future API support
  const updateMutation = useMutation({
    mutationFn: async (_title: string) => {
      // TODO: Thread title updates are currently managed via conversation context
      // API endpoint for direct title update may be added in future
      console.warn("Thread title update not yet supported via API");
    },
    onSuccess: () => {
      invalidateThreads();
    },
  });

  return {
    archive: async () => {
      await archiveMutation.mutateAsync();
    },
    isArchiving: archiveMutation.isPending,
    deleteThread: async () => {
      await deleteMutation.mutateAsync();
    },
    isDeleting: deleteMutation.isPending,
    updateTitle: async (title: string) => {
      await updateMutation.mutateAsync(title);
    },
    isUpdating: updateMutation.isPending,
  };
}
