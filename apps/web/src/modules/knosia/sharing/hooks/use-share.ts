"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";

export type ShareTargetType = "thread" | "canvas";

interface ShareInput {
  targetType: ShareTargetType;
  targetId: string;
  userIds: string[];
  mode: "view" | "comment" | "edit";
}

/**
 * Share a thread or canvas with other users
 */
export function useShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetType, targetId, userIds, mode }: ShareInput) => {
      if (targetType === "canvas") {
        const res = await api.knosia.canvas[":canvasId"].share.$post({
          param: { canvasId: targetId },
          json: { userIds, mode },
        });

        if (!res.ok) {
          throw new Error("Failed to share canvas");
        }

        return res.json();
      }

      // Default: thread sharing
      const res = await api.knosia.thread[":id"].share.$post({
        param: { id: targetId },
        json: { userIds, mode },
      });

      if (!res.ok) {
        throw new Error("Failed to share thread");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", variables.targetType, variables.targetId],
      });
    },
  });
}
