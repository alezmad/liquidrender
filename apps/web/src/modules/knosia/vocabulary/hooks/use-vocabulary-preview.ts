"use client";

/**
 * Hook for fetching live data preview for vocabulary items
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

// ============================================================================
// Types
// ============================================================================

export interface MetricPreviewResult {
  type: "metric";
  value: number | string | null;
  formattedValue: string;
  trend?: {
    direction: "up" | "down" | "flat";
    percentage: number | null;
  };
}

export interface DimensionPreviewResult {
  type: "dimension";
  sampleValues: string[];
  totalCount: number;
  hasMore: boolean;
}

export interface EntityPreviewResult {
  type: "entity";
  recordCount: number;
  formattedCount: string;
  sampleFields?: string[];
}

export interface ErrorPreviewResult {
  type: "error";
  error: string;
}

export interface UnsupportedPreviewResult {
  type: "unsupported";
  message: string;
}

export type PreviewResult =
  | MetricPreviewResult
  | DimensionPreviewResult
  | EntityPreviewResult
  | ErrorPreviewResult
  | UnsupportedPreviewResult;

export interface PreviewResponse {
  itemId: string;
  itemType: string;
  result: PreviewResult;
  executedAt: string;
  executionTimeMs: number;
  cached: boolean;
}

export interface UseVocabularyPreviewOptions {
  /** Vocabulary item ID */
  itemId: string | null;
  /** Workspace ID for connection lookup */
  workspaceId: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseVocabularyPreviewReturn {
  preview: PreviewResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useVocabularyPreview({
  itemId,
  workspaceId,
  enabled = true,
}: UseVocabularyPreviewOptions): UseVocabularyPreviewReturn {
  const shouldFetch = enabled && !!itemId && !!workspaceId;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["vocabulary", "preview", itemId, workspaceId],
    queryFn: async () => {
      if (!itemId) return null;

      const res = await api.knosia.vocabulary.items[":id"].preview.$get({
        param: { id: itemId },
        query: { workspaceId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch preview");
      }

      return (await res.json()) as PreviewResponse;
    },
    enabled: shouldFetch,
    staleTime: 30_000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  return {
    preview: data ?? null,
    isLoading: shouldFetch && isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
