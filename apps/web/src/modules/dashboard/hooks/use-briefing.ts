"use client";

import { useQuery } from "@tanstack/react-query";

import type { BriefingResponse, UseBriefingOptions, UseBriefingResult } from "../types";

const API_BASE = "/api/knosia/briefing";

/**
 * Fetch briefing data from the API.
 */
async function fetchBriefing(options: UseBriefingOptions): Promise<BriefingResponse> {
  const params = new URLSearchParams();

  if (options.connectionId) {
    params.set("connectionId", options.connectionId);
  }
  if (options.date) {
    params.set("date", options.date);
  }

  const url = params.toString() ? `${API_BASE}?${params.toString()}` : API_BASE;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { error?: string }).error ?? "Failed to fetch briefing");
  }

  return response.json() as Promise<BriefingResponse>;
}

/**
 * Hook to fetch the daily briefing.
 *
 * @param options - Optional filters for connectionId, date, and enabled state
 * @returns Briefing data with loading/error states
 *
 * @example
 * ```tsx
 * const { briefing, isLoading, isError } = useBriefing();
 *
 * if (isLoading) return <Skeleton />;
 * if (isError) return <ErrorMessage />;
 *
 * return <BriefingCard greeting={briefing.greeting} dataThrough={briefing.dataThrough} />;
 * ```
 */
export function useBriefing(options: UseBriefingOptions = {}): UseBriefingResult {
  const { connectionId, date, enabled = true } = options;

  const query = useQuery({
    queryKey: ["knosia", "briefing", { connectionId, date }],
    queryFn: () => fetchBriefing({ connectionId, date }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    briefing: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
