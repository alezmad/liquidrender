// Hook for managing user vocabulary preferences

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type {
  VocabularyPrefs,
  PrivateVocab,
  RecentlyUsedItem,
  VocabularyItem,
} from "../types";

// ============================================================================
// TYPES
// ============================================================================

interface UseVocabularyPrefsOptions {
  workspaceId: string;
  enabled?: boolean;
}

interface UseVocabularyPrefsReturn {
  prefs: VocabularyPrefs | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  // Mutations
  toggleFavorite: (slug: string) => Promise<void>;
  setSynonym: (originalSlug: string, synonym: string | null) => Promise<void>;
  dismissSuggestion: (slug: string) => Promise<void>;
  trackUsage: (slug: string) => Promise<void>;
  // Mutation states
  isToggling: boolean;
  isSetting: boolean;
  isDismissing: boolean;
  isTracking: boolean;
}

const DEFAULT_PREFS: VocabularyPrefs = {
  favorites: [],
  synonyms: {},
  recentlyUsed: [],
  dismissedSuggestions: [],
  privateVocabulary: [],
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useVocabularyPrefs({
  workspaceId,
  enabled = true,
}: UseVocabularyPrefsOptions): UseVocabularyPrefsReturn {
  const queryClient = useQueryClient();
  const queryKey = ["knosia", "vocabulary", "prefs", workspaceId];

  // Fetch preferences
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.knosia.vocabulary.user.preferences.$get({
        query: { workspaceId },
      });
      if (!res.ok) throw new Error("Failed to fetch vocabulary preferences");
      const data = await res.json();
      return data as VocabularyPrefs;
    },
    enabled: enabled && !!workspaceId,
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const currentFavorites = data?.favorites ?? [];
      const isFavorite = currentFavorites.includes(slug);
      const newFavorites = isFavorite
        ? currentFavorites.filter((s) => s !== slug)
        : [...currentFavorites, slug];

      const res = await api.knosia.vocabulary.user.preferences.$patch({
        json: {
          workspaceId,
          favorites: newFavorites,
        },
      });
      if (!res.ok) throw new Error("Failed to update favorites");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      // Also invalidate vocabulary list to update isFavorite flags
      queryClient.invalidateQueries({
        queryKey: ["knosia", "vocabulary", workspaceId],
      });
    },
  });

  // Set synonym mutation
  const setSynonymMutation = useMutation({
    mutationFn: async ({
      originalSlug,
      synonym,
    }: {
      originalSlug: string;
      synonym: string | null;
    }) => {
      const currentSynonyms = data?.synonyms ?? {};
      const newSynonyms = { ...currentSynonyms };

      if (synonym === null) {
        delete newSynonyms[originalSlug];
      } else {
        newSynonyms[originalSlug] = synonym;
      }

      const res = await api.knosia.vocabulary.user.preferences.$patch({
        json: {
          workspaceId,
          synonyms: newSynonyms,
        },
      });
      if (!res.ok) throw new Error("Failed to update synonyms");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Dismiss suggestion mutation
  const dismissSuggestionMutation = useMutation({
    mutationFn: async (slug: string) => {
      const currentDismissed = data?.dismissedSuggestions ?? [];
      if (currentDismissed.includes(slug)) return; // Already dismissed

      const res = await api.knosia.vocabulary.user.preferences.$patch({
        json: {
          workspaceId,
          dismissedSuggestions: [...currentDismissed, slug],
        },
      });
      if (!res.ok) throw new Error("Failed to dismiss suggestion");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      // Also invalidate suggestions
      queryClient.invalidateQueries({
        queryKey: ["knosia", "vocabulary", "suggestions", workspaceId],
      });
    },
  });

  // Track usage mutation
  const trackUsageMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await api.knosia.vocabulary.user["track-usage"].$post({
        json: {
          workspaceId,
          slug,
        },
      });
      if (!res.ok) throw new Error("Failed to track usage");
      return res.json();
    },
    // Don't invalidate on success - this is a fire-and-forget operation
    // that updates recentlyUsed, which will be refreshed on next fetch
  });

  return {
    prefs: data ?? (enabled && !isLoading ? DEFAULT_PREFS : null),
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    // Mutations
    toggleFavorite: async (slug: string) => {
      await toggleFavoriteMutation.mutateAsync(slug);
    },
    setSynonym: async (originalSlug: string, synonym: string | null) => {
      await setSynonymMutation.mutateAsync({ originalSlug, synonym });
    },
    dismissSuggestion: async (slug: string) => {
      await dismissSuggestionMutation.mutateAsync(slug);
    },
    trackUsage: async (slug: string) => {
      await trackUsageMutation.mutateAsync(slug);
    },
    // Mutation states
    isToggling: toggleFavoriteMutation.isPending,
    isSetting: setSynonymMutation.isPending,
    isDismissing: dismissSuggestionMutation.isPending,
    isTracking: trackUsageMutation.isPending,
  };
}

// ============================================================================
// SUGGESTIONS HOOK
// ============================================================================

interface UseVocabularySuggestionsOptions {
  workspaceId: string;
  roleArchetype: string;
  enabled?: boolean;
}

interface UseVocabularySuggestionsReturn {
  suggestions: VocabularyItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useVocabularySuggestions({
  workspaceId,
  roleArchetype,
  enabled = true,
}: UseVocabularySuggestionsOptions): UseVocabularySuggestionsReturn {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "knosia",
      "vocabulary",
      "suggestions",
      workspaceId,
      roleArchetype,
    ],
    queryFn: async () => {
      const res = await api.knosia.vocabulary.user.suggestions.$get({
        query: { workspaceId, roleArchetype },
      });
      if (!res.ok) throw new Error("Failed to fetch vocabulary suggestions");
      const data = await res.json();
      return data as { items: VocabularyItem[] };
    },
    enabled: enabled && !!workspaceId && !!roleArchetype,
  });

  return {
    suggestions: data?.items ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// Re-export types for convenience
export type {
  VocabularyPrefs,
  PrivateVocab,
  RecentlyUsedItem,
  UseVocabularyPrefsOptions,
  UseVocabularyPrefsReturn,
  UseVocabularySuggestionsOptions,
  UseVocabularySuggestionsReturn,
};
