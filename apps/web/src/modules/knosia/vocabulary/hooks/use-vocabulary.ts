// Hook for fetching and managing vocabulary items

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { VocabularyItem, VocabularyType, VocabularyScope } from "../types";

// ============================================================================
// TYPES
// ============================================================================

interface UseVocabularyOptions {
  workspaceId: string;
  search?: string;
  type?: VocabularyType;
  scope?: VocabularyScope | "all";
  limit?: number;
}

interface VocabularyListResponse {
  items: VocabularyItem[];
  total: number;
}

interface UseVocabularyReturn {
  items: VocabularyItem[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  toggleFavorite: (slug: string) => void;
  isTogglingFavorite: boolean;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useVocabulary({
  workspaceId,
  search,
  type,
  scope,
  limit = 50,
}: UseVocabularyOptions): UseVocabularyReturn {
  const queryClient = useQueryClient();

  // Build query key with all filter parameters
  const queryKey = [
    "knosia",
    "vocabulary",
    workspaceId,
    { search, type, scope, limit },
  ];

  // Fetch vocabulary list
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
          search: search || undefined,
          type: type || undefined,
          scope: scope === "all" ? undefined : scope,
          limit: String(limit),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch vocabulary");
      }

      // API returns { items: [...], total: number } or just { items: [...] }
      const result = await res.json();

      // Handle both response formats
      if ("items" in result && Array.isArray(result.items)) {
        return result as VocabularyListResponse;
      }

      // If the API returns array directly
      if (Array.isArray(result)) {
        return {
          items: result as VocabularyItem[],
          total: result.length,
        };
      }

      // Fallback
      return { items: [], total: 0 };
    },
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (slug: string) => {
      // First get current preferences
      const prefsRes = await api.knosia.vocabulary.user.preferences.$get({
        query: { workspaceId },
      });

      if (!prefsRes.ok) {
        throw new Error("Failed to get preferences");
      }

      const prefs = await prefsRes.json();
      const currentFavorites: string[] = (prefs.favorites as string[]) || [];

      // Toggle the favorite
      const newFavorites = currentFavorites.includes(slug)
        ? currentFavorites.filter((s) => s !== slug)
        : [...currentFavorites, slug];

      // Update preferences
      const updateRes = await api.knosia.vocabulary.user.preferences.$patch({
        json: {
          workspaceId,
          favorites: newFavorites,
        },
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update favorites");
      }

      return { slug, isFavorite: newFavorites.includes(slug) };
    },
    onMutate: async (slug) => {
      // Optimistically update the cache
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<VocabularyListResponse>(queryKey);

      if (previousData) {
        queryClient.setQueryData<VocabularyListResponse>(queryKey, {
          ...previousData,
          items: previousData.items.map((item) =>
            item.slug === slug
              ? { ...item, isFavorite: !item.isFavorite }
              : item
          ),
        });
      }

      return { previousData };
    },
    onError: (err, slug, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["knosia", "vocabulary"] });
    },
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    toggleFavorite: (slug: string) => toggleFavoriteMutation.mutate(slug),
    isTogglingFavorite: toggleFavoriteMutation.isPending,
  };
}
