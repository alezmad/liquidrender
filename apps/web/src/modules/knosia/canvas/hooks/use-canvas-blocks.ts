// Hook for managing canvas blocks

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { CanvasBlock, BlockPosition, BlockType, BlockConfig, BlockDataSource } from "../types";

interface UseCanvasBlocksOptions {
  canvasId: string;
}

interface CreateBlockInput {
  type: BlockType;
  title?: string;
  position: BlockPosition;
  config?: BlockConfig;
  dataSource?: BlockDataSource;
}

interface UpdateBlockInput {
  title?: string;
  position?: BlockPosition;
  config?: BlockConfig;
  dataSource?: BlockDataSource;
  cachedData?: unknown;
}

interface UseCanvasBlocksReturn {
  createBlock: (input: CreateBlockInput) => Promise<CanvasBlock>;
  isCreating: boolean;
  updateBlock: (blockId: string, updates: UpdateBlockInput) => Promise<CanvasBlock>;
  isUpdating: boolean;
  deleteBlock: (blockId: string) => Promise<void>;
  isDeleting: boolean;
  reorderBlocks: (blocks: Array<{ id: string; position: BlockPosition }>) => Promise<void>;
  isReordering: boolean;
}

export function useCanvasBlocks({ canvasId }: UseCanvasBlocksOptions): UseCanvasBlocksReturn {
  const queryClient = useQueryClient();

  const invalidateCanvas = () => {
    queryClient.invalidateQueries({
      queryKey: ["knosia", "canvas", canvasId],
    });
  };

  // Create block
  // TODO: Implement /canvas/canvases/:canvasId/blocks route in backend
  const createMutation = useMutation({
    mutationFn: async (input: CreateBlockInput) => {
      // @ts-expect-error - Route not yet implemented in backend
      const res = await api.knosia.canvas.canvases[":canvasId"].blocks.$post({
        param: { canvasId },
        json: input,
      });
      if (!res.ok) throw new Error("Failed to create block");
      return res.json() as Promise<CanvasBlock>;
    },
    onSuccess: invalidateCanvas,
  });

  // Update block
  // TODO: Implement /canvas/canvases/:canvasId/blocks/:blockId route in backend
  const updateMutation = useMutation({
    mutationFn: async ({ blockId, updates }: { blockId: string; updates: UpdateBlockInput }) => {
      // @ts-expect-error - Route not yet implemented in backend
      const res = await api.knosia.canvas.canvases[":canvasId"].blocks[":blockId"].$patch({
        param: { canvasId, blockId },
        json: updates,
      });
      if (!res.ok) throw new Error("Failed to update block");
      return res.json() as Promise<CanvasBlock>;
    },
    onSuccess: invalidateCanvas,
  });

  // Delete block
  // TODO: Implement /canvas/canvases/:canvasId/blocks/:blockId route in backend
  const deleteMutation = useMutation({
    mutationFn: async (blockId: string) => {
      // @ts-expect-error - Route not yet implemented in backend
      const res = await api.knosia.canvas.canvases[":canvasId"].blocks[":blockId"].$delete({
        param: { canvasId, blockId },
      });
      if (!res.ok) throw new Error("Failed to delete block");
    },
    onSuccess: invalidateCanvas,
  });

  // Reorder blocks
  // TODO: Implement /canvas/canvases/:canvasId/blocks/reorder route in backend
  const reorderMutation = useMutation({
    mutationFn: async (blocks: Array<{ id: string; position: BlockPosition }>) => {
      // @ts-expect-error - Route not yet implemented in backend
      const res = await api.knosia.canvas.canvases[":canvasId"].blocks.reorder.$post({
        param: { canvasId },
        json: { blocks },
      });
      if (!res.ok) throw new Error("Failed to reorder blocks");
    },
    onSuccess: invalidateCanvas,
  });

  return {
    createBlock: async (input) => createMutation.mutateAsync(input),
    isCreating: createMutation.isPending,
    updateBlock: async (blockId, updates) => updateMutation.mutateAsync({ blockId, updates }),
    isUpdating: updateMutation.isPending,
    deleteBlock: async (blockId) => deleteMutation.mutateAsync(blockId),
    isDeleting: deleteMutation.isPending,
    reorderBlocks: async (blocks) => reorderMutation.mutateAsync(blocks),
    isReordering: reorderMutation.isPending,
  };
}
