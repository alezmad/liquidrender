"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "~/lib/api/client";

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType =
  | "thread_created"
  | "thread_shared"
  | "canvas_created"
  | "canvas_shared"
  | "canvas_updated"
  | "comment_added"
  | "insight_converted";

export interface Activity {
  id: string;
  workspaceId: string;
  userId: string;
  type: ActivityType;
  targetType: string;
  targetId: string;
  targetName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface UseActivityFeedOptions {
  workspaceId: string;
  type?: ActivityType;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch activity feed for a workspace
 */
export function useActivityFeed({
  workspaceId,
  type,
  page = 1,
  perPage = 50,
  enabled = true,
}: UseActivityFeedOptions) {
  // TODO: Activity route not yet implemented in backend (V2 feature)
  return useQuery({
    queryKey: ["knosia", "activity", workspaceId, type, page, perPage],
    queryFn: async () => {
      // @ts-expect-error - Route not yet implemented in backend
      const res = await api.knosia.activity.$get({
        query: {
          workspaceId,
          ...(type && { type }),
          page: page.toString(),
          perPage: perPage.toString(),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch activity feed");
      }

      return res.json() as Promise<{ data: Activity[]; total: number }>;
    },
    enabled: enabled && !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
