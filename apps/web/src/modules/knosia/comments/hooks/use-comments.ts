"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";

// ============================================================================
// TYPES
// ============================================================================

export type CommentTargetType = "thread_message" | "canvas_block" | "thread";

export interface Comment {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  userId: string;
  content: string;
  mentions: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface UseCommentsOptions {
  targetType: CommentTargetType;
  targetId: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch comments for a target
 */
export function useComments({
  targetType,
  targetId,
  page = 1,
  perPage = 50,
  enabled = true,
}: UseCommentsOptions) {
  return useQuery({
    queryKey: ["knosia", "comments", targetType, targetId, page, perPage],
    queryFn: async () => {
      // @ts-expect-error - Route not yet implemented in backend (V2 feature)
      const res = await api.knosia.comment.$get({
        query: {
          targetType,
          targetId,
          page: page.toString(),
          perPage: perPage.toString(),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch comments");
      }

      return res.json() as Promise<{ data: Comment[]; total: number }>;
    },
    enabled: enabled && !!targetId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create a new comment
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      targetType: CommentTargetType;
      targetId: string;
      content: string;
      mentions?: string[];
    }) => {
      // @ts-expect-error - Route not yet implemented in backend (V2 feature)
      const res = await api.knosia.comment.$post({
        json: input,
      });

      if (!res.ok) {
        throw new Error("Failed to create comment");
      }

      return res.json() as Promise<Comment>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "comments", variables.targetType, variables.targetId],
      });
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      content,
      targetType,
      targetId,
    }: {
      id: string;
      content: string;
      targetType: CommentTargetType;
      targetId: string;
    }) => {
      // @ts-expect-error - Route not yet implemented in backend (V2 feature)
      const res = await api.knosia.comment[":id"].$patch({
        param: { id },
        json: { content },
      });

      if (!res.ok) {
        throw new Error("Failed to update comment");
      }

      return res.json() as Promise<Comment>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "comments", variables.targetType, variables.targetId],
      });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      targetType,
      targetId,
    }: {
      id: string;
      targetType: CommentTargetType;
      targetId: string;
    }) => {
      // @ts-expect-error - Route not yet implemented in backend (V2 feature)
      const res = await api.knosia.comment[":id"].$delete({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to delete comment");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "comments", variables.targetType, variables.targetId],
      });
    },
  });
}
