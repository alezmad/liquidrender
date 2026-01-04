// Hook for managing a single canvas

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { Canvas, CanvasBlock, CanvasAlert } from "../types";

interface UseCanvasOptions {
  canvasId: string;
  enabled?: boolean;
}

interface CanvasWithDetails extends Canvas {
  blocks: CanvasBlock[];
  alerts: CanvasAlert[];
}

// Extract Canvas fields from response (excludes blocks/alerts)
function extractCanvas(data: CanvasWithDetails): Canvas {
  const { blocks, alerts, ...canvas } = data;
  return canvas;
}

// Input type matching API schema (no null, only undefined)
interface UpdateCanvasInput {
  name?: string;
  description?: string;
  icon?: string;
  status?: "draft" | "active" | "archived";
  layout?: { type: "grid" | "freeform"; columns?: number; rows?: number };
}

interface UseCanvasReturn {
  canvas: Canvas | undefined;
  blocks: CanvasBlock[];
  alerts: CanvasAlert[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  updateCanvas: (updates: UpdateCanvasInput) => Promise<void>;
  isUpdating: boolean;
  refetch: () => void;
}

export function useCanvas({ canvasId, enabled = true }: UseCanvasOptions): UseCanvasReturn {
  const queryClient = useQueryClient();

  // Fetch canvas with blocks and alerts
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["knosia", "canvas", canvasId],
    queryFn: async () => {
      const res = await api.knosia.canvas.canvases[":id"].$get({
        param: { id: canvasId },
      });
      if (!res.ok) throw new Error("Failed to fetch canvas");
      // Type assertion: API schema differs from frontend types (title vs name, etc.)
      return res.json() as unknown as Promise<CanvasWithDetails>;
    },
    enabled: enabled && !!canvasId,
  });

  // Update canvas mutation
  // Note: API requires expectedVersion for optimistic concurrency control
  const updateMutation = useMutation({
    mutationFn: async (updates: UpdateCanvasInput) => {
      // Build API-compatible payload
      const apiPayload = {
        expectedVersion: 1, // TODO: Track actual version for OCC
        title: updates.name,
        schema: updates.layout ? { version: "1.0", layers: [] } : undefined,
        changeSummary: "Updated via UI",
      };
      const res = await api.knosia.canvas.canvases[":id"].$put({
        param: { id: canvasId },
        json: apiPayload,
      });
      if (!res.ok) throw new Error("Failed to update canvas");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "canvas", canvasId],
      });
    },
  });

  return {
    canvas: data ? extractCanvas(data) : undefined,
    blocks: data?.blocks ?? [],
    alerts: data?.alerts ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    updateCanvas: async (updates) => {
      await updateMutation.mutateAsync(updates);
    },
    isUpdating: updateMutation.isPending,
    refetch,
  };
}
