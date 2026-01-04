// Hook for fetching and managing calculated metrics

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

// ============================================================================
// TYPES
// ============================================================================

export interface CalculatedMetric {
  id: string;
  workspaceId: string;
  connectionId: string;
  name: string;
  category: string | null;
  description: string | null;
  semanticDefinition: Record<string, unknown>;
  confidence: number | null;
  feasible: boolean | null;
  source: string;
  vocabularyItemIds: string[] | null;
  canvasCount: number | null;
  executionCount: number | null;
  lastExecutedAt: string | null;
  lastExecutionResult: ExecutionResult | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionResult {
  value: number | string;
  formattedValue: string;
  executedAt: string;
  executionTimeMs: number;
  fromCache: boolean;
}

export interface UseMetricsOptions {
  connectionId: string;
  category?: string;
  status?: string;
}

export interface UseMetricsReturn {
  metrics: CalculatedMetric[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// HOOK: useMetrics
// ============================================================================

export function useMetrics({
  connectionId,
  category,
  status,
}: UseMetricsOptions): UseMetricsReturn {
  // Build query key with all filter parameters
  const queryKey = [
    "knosia",
    "metrics",
    connectionId,
    { category, status },
  ];

  // Fetch metrics list
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.knosia.metrics.$get({
        query: {
          connectionId,
          category: category as "revenue" | "growth" | "engagement" | "operational" | "other" | undefined,
          status: status as "active" | "draft" | "deprecated" | undefined,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const result = await res.json();
      return (result.metrics ?? []) as CalculatedMetric[];
    },
    enabled: !!connectionId,
    staleTime: 30000, // 30 seconds
  });

  return {
    metrics: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// ============================================================================
// HOOK: useExecuteMetric
// ============================================================================

export function useExecuteMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      metricId,
      useCache = true,
    }: {
      metricId: string;
      useCache?: boolean;
    }) => {
      const res = await api.knosia.metrics[":id"].execute.$post({
        param: { id: metricId },
        json: { useCache },
      });

      if (!res.ok) {
        throw new Error("Failed to execute metric");
      }

      const result = await res.json();
      return result.result as ExecutionResult;
    },
    onSuccess: () => {
      // Invalidate metrics cache to show updated execution result
      queryClient.invalidateQueries({ queryKey: ["knosia", "metrics"] });
    },
  });
}

// ============================================================================
// HOOK: useUpdateMetric
// ============================================================================

export interface UpdateMetricInput {
  name?: string;
  category?: "revenue" | "growth" | "engagement" | "operational" | "other";
  description?: string;
  semanticDefinition?: {
    type: "simple" | "derived" | "cumulative";
    expression: string;
    aggregation?: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";
    entity?: string;
    timeField?: string;
    timeGranularity?: "hour" | "day" | "week" | "month" | "quarter" | "year";
    filters?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };
  status?: "active" | "draft" | "deprecated";
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      metricId,
      data,
    }: {
      metricId: string;
      data: UpdateMetricInput;
    }) => {
      const res = await api.knosia.metrics[":id"].$patch({
        param: { id: metricId },
        json: data,
      });

      if (!res.ok) {
        throw new Error("Failed to update metric");
      }

      const result = await res.json();
      return result.metric as CalculatedMetric;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knosia", "metrics"] });
    },
  });
}

// ============================================================================
// HOOK: useDeleteMetric
// ============================================================================

export function useDeleteMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metricId: string) => {
      const res = await api.knosia.metrics[":id"].$delete({
        param: { id: metricId },
      });

      if (!res.ok) {
        throw new Error("Failed to delete metric");
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knosia", "metrics"] });
    },
  });
}

// ============================================================================
// HOOK: useCreateMetric
// ============================================================================

export interface CreateMetricInput {
  workspaceId: string;
  connectionId: string;
  name: string;
  category?: "revenue" | "growth" | "engagement" | "operational" | "other";
  description?: string;
  semanticDefinition: {
    type: "simple" | "derived" | "cumulative";
    expression: string;
    aggregation?: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX";
    entity?: string;
    timeField?: string;
    timeGranularity?: "hour" | "day" | "week" | "month" | "quarter" | "year";
    filters?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };
  confidence?: number;
  source?: "ai_generated" | "user_created";
}

export function useCreateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMetricInput) => {
      const res = await api.knosia.metrics.$post({
        json: data,
      });

      if (!res.ok) {
        throw new Error("Failed to create metric");
      }

      const result = await res.json();
      return result.metric as CalculatedMetric;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knosia", "metrics"] });
    },
  });
}
