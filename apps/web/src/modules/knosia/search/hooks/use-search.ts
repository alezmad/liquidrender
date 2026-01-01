"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@turbostarter/ui-web/hooks/use-debounced-value";

import { api } from "~/lib/api/client";

export interface SearchResult {
  id: string;
  type: "thread" | "canvas" | "vocabulary";
  title: string;
  description: string | null;
  matchedField: string;
  excerpt: string | null;
  updatedAt: string;
  link: string;
}

interface UseSearchOptions {
  workspaceId: string;
  query: string;
  types?: ("thread" | "canvas" | "vocabulary")[];
  limit?: number;
  enabled?: boolean;
}

export function useSearch({
  workspaceId,
  query,
  types,
  limit = 20,
  enabled = true,
}: UseSearchOptions) {
  const [debouncedQuery] = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: ["knosia", "search", workspaceId, debouncedQuery, types, limit],
    queryFn: async () => {
      const res = await api.knosia.search.$get({
        query: {
          workspaceId,
          query: debouncedQuery,
          types: types?.join(","),
          limit: limit.toString(),
        },
      });

      if (!res.ok) {
        throw new Error("Search failed");
      }

      return res.json() as Promise<{
        query: string;
        results: SearchResult[];
        counts: {
          thread: number;
          canvas: number;
          vocabulary: number;
          total: number;
        };
      }>;
    },
    enabled: enabled && debouncedQuery.length >= 1,
    staleTime: 10 * 1000, // 10 seconds
  });
}
