// Hook for managing canvases list

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { Canvas, CanvasStatus } from "../types";

interface UseCanvasesListOptions {
  workspaceId: string;
  status?: CanvasStatus;
  page?: number;
  perPage?: number;
}

interface CanvasesListResponse {
  data: Canvas[];
  total: number;
}

interface CreateCanvasInput {
  name: string;
  description?: string;
  icon?: string;
}

interface UseCanvasesListReturn {
  canvases: Canvas[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  createCanvas: (input: CreateCanvasInput) => Promise<Canvas>;
  isCreating: boolean;
  deleteCanvas: (canvasId: string) => Promise<void>;
  isDeleting: boolean;
  refetch: () => void;
}

export function useCanvasesList({
  workspaceId,
  status,
  page = 1,
  perPage = 20,
}: UseCanvasesListOptions): UseCanvasesListReturn {
  const queryClient = useQueryClient();

  // Fetch canvases list
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["knosia", "canvases", workspaceId, { status, page, perPage }],
    queryFn: async () => {
      // Use workspace-specific endpoint if workspaceId provided
      const res = await api.knosia.canvas.workspaces[":workspaceId"].canvases.$get({
        param: { workspaceId },
        query: {
          scope: status === "archived" ? "private" : "workspace",
          includeDeleted: status === "archived" ? "true" : undefined,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch canvases");
      // Type assertion: API schema differs from frontend types
      return res.json() as unknown as Promise<CanvasesListResponse>;
    },
    enabled: !!workspaceId,
  });

  // Create canvas mutation
  // Note: API requires title, scope, and schema - frontend uses name/description
  const createMutation = useMutation({
    mutationFn: async (input: CreateCanvasInput) => {
      const res = await api.knosia.canvas.canvases.$post({
        json: {
          workspaceId,
          title: input.name,
          scope: "private" as const,
          schema: { version: "1.0", layers: [] },
        },
      });
      if (!res.ok) throw new Error("Failed to create canvas");
      // Type assertion: API returns different structure than frontend Canvas type
      return res.json() as unknown as Promise<Canvas>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "canvases", workspaceId],
      });
    },
  });

  // Delete canvas mutation
  const deleteMutation = useMutation({
    mutationFn: async (canvasId: string) => {
      const res = await api.knosia.canvas.canvases[":id"].$delete({
        param: { id: canvasId },
      });
      if (!res.ok) throw new Error("Failed to delete canvas");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "canvases", workspaceId],
      });
    },
  });

  return {
    canvases: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    createCanvas: async (input) => {
      return createMutation.mutateAsync(input);
    },
    isCreating: createMutation.isPending,
    deleteCanvas: async (canvasId) => {
      await deleteMutation.mutateAsync(canvasId);
    },
    isDeleting: deleteMutation.isPending,
    refetch,
  };
}
