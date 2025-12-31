// Hook for managing AI insights

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { APIInsight, InsightStatus } from "../types";

interface UseInsightsOptions {
  workspaceId: string;
  status?: InsightStatus;
  page?: number;
  perPage?: number;
}

interface InsightsResponse {
  data: APIInsight[];
  total: number;
}

interface UseInsightsReturn {
  insights: APIInsight[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  updateStatus: (insightId: string, status: InsightStatus) => Promise<void>;
  isUpdating: boolean;
  refetch: () => void;
}

export function useInsights({
  workspaceId,
  status,
  page = 1,
  perPage = 20,
}: UseInsightsOptions): UseInsightsReturn {
  const queryClient = useQueryClient();

  // Fetch insights
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["knosia", "insights", workspaceId, { status, page, perPage }],
    queryFn: async () => {
      const res = await api.knosia.notification.insights.$get({
        query: {
          workspaceId,
          status,
          page: String(page),
          perPage: String(perPage),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json() as Promise<InsightsResponse>;
    },
    enabled: !!workspaceId,
  });

  // Update insight status
  const updateMutation = useMutation({
    mutationFn: async ({ insightId, status }: { insightId: string; status: InsightStatus }) => {
      const res = await api.knosia.notification.insights[":id"].status.$patch({
        param: { id: insightId },
        json: { status },
      });
      if (!res.ok) throw new Error("Failed to update insight status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "insights", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["knosia", "brief", workspaceId],
      });
    },
  });

  return {
    insights: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    updateStatus: async (insightId, status) => {
      await updateMutation.mutateAsync({ insightId, status });
    },
    isUpdating: updateMutation.isPending,
    refetch,
  };
}
