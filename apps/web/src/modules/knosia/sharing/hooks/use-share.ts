"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";

// Currently only threads have sharing API implemented
// Canvas sharing can be added when the API endpoint is created
export type ShareTargetType = "thread";

interface ShareInput {
  targetType: ShareTargetType;
  targetId: string;
  userIds: string[];
  mode: "view" | "collaborate";
}

/**
 * Share a thread with other users
 * Note: Canvas sharing endpoint not yet implemented
 */
export function useShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetType, targetId, userIds, mode }: ShareInput) => {
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
