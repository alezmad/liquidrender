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
      const res = await api.knosia.canvas.$get({
        query: {
          workspaceId,
          status,
          page: String(page),
          perPage: String(perPage),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch canvases");
      return res.json() as Promise<CanvasesListResponse>;
    },
    enabled: !!workspaceId,
  });

  // Create canvas mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateCanvasInput) => {
      const res = await api.knosia.canvas.$post({
        json: { workspaceId, ...input },
      });
      if (!res.ok) throw new Error("Failed to create canvas");
      return res.json() as Promise<Canvas>;
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
      const res = await api.knosia.canvas[":id"].$delete({
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
