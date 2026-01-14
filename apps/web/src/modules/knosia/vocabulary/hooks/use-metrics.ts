// Hook for fetching and managing metrics (vocabulary items with type='metric')

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Vocabulary metric item - this represents a detected metric from the schema
 * Note: This is different from the older CalculatedMetric which was never populated
 */
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
  workspaceId: string;
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
  workspaceId,
  category,
  status,
}: UseMetricsOptions): UseMetricsReturn {
  // Build query key with all filter parameters
  const queryKey = [
    "knosia",
    "metrics",
    workspaceId,
    { category, status },
  ];

  // Fetch vocabulary items with type='metric'
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.knosia.vocabulary.items.$get({
        query: {
          workspaceId,
          type: "metric",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const result = await res.json();
      const items = result.items ?? [];

      // Transform vocabulary items to CalculatedMetric format for backwards compatibility
      // The API returns ResolvedVocabularyItem which doesn't have status field
      return items.map((item: {
        id: string;
        canonicalName: string;
        abbreviation: string | null;
        category: string | null;
        slug: string;
        type: "metric" | "dimension" | "entity" | "event";
        scope: "org" | "workspace" | "private";
        definition: {
          descriptionHuman?: string;
          formulaHuman?: string;
          formulaSql?: string;
          sourceTables?: string[];
        } | null;
        suggestedForRoles: string[] | null;
        isFavorite: boolean;
        recentlyUsedAt: string | null;
        useCount: number;
      }) => ({
        id: item.id,
        workspaceId,
        connectionId,
        name: item.canonicalName,
        category: item.category,
        description: item.definition?.descriptionHuman ?? null,
        semanticDefinition: {
          expression: item.definition?.formulaSql,
          sourceTables: item.definition?.sourceTables,
        },
        confidence: null, // Not available in resolved vocabulary
        feasible: true,
        source: item.scope,
        vocabularyItemIds: [item.id],
        canvasCount: null,
        executionCount: null,
        lastExecutedAt: null,
        lastExecutionResult: null,
        status: "active", // Vocabulary items don't have status in resolved form
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies CalculatedMetric));
    },
    enabled: !!workspaceId,
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
