// Hook for fetching KPIs (vocabulary items with type='kpi')

import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import type { VocabularyItem } from "../types";

// ============================================================================
// TYPES
// ============================================================================

export interface UseKPIsOptions {
  workspaceId: string;
  search?: string;
  enabled?: boolean;
}

export interface UseKPIsReturn {
  kpis: VocabularyItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// HOOK: useKPIs
// ============================================================================

/**
 * Fetch KPIs (calculated business formulas) from the vocabulary
 *
 * KPIs are vocabulary items with type='kpi' that represent business formulas
 * like GMV, Net Revenue, On-Time Delivery Rate, etc.
 */
export function useKPIs({
  workspaceId,
  search,
  enabled = true,
}: UseKPIsOptions): UseKPIsReturn {
  const queryKey = ["knosia", "vocabulary", "kpis", workspaceId, { search }];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.knosia.vocabulary.kpis.$get({
        query: {
          workspaceId,
          search: search ?? undefined,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch KPIs");
      }

      const result = await res.json();
      return (result.items ?? []) as VocabularyItem[];
    },
    enabled: enabled && !!workspaceId,
    staleTime: 30000, // 30 seconds
  });

  return {
    kpis: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// ============================================================================
// HOOK: useMeasures
// ============================================================================

export interface UseMeasuresOptions {
  workspaceId: string;
  search?: string;
  enabled?: boolean;
}

export interface UseMeasuresReturn {
  measures: VocabularyItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch measures (raw numeric columns) from the vocabulary
 *
 * Measures are vocabulary items with type='measure' that represent raw
 * database columns like unit_price, quantity, freight, etc.
 */
export function useMeasures({
  workspaceId,
  search,
  enabled = true,
}: UseMeasuresOptions): UseMeasuresReturn {
  const queryKey = ["knosia", "vocabulary", "measures", workspaceId, { search }];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.knosia.vocabulary.measures.$get({
        query: {
          workspaceId,
          search: search ?? undefined,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch measures");
      }

      const result = await res.json();
      return (result.items ?? []) as VocabularyItem[];
    },
    enabled: enabled && !!workspaceId,
    staleTime: 30000,
  });

  return {
    measures: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
