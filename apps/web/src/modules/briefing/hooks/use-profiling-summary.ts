"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "~/lib/api/client";

import type { ProfilingSummary } from "../types";

export function useProfilingSummary(analysisId: string | null) {
  return useQuery<ProfilingSummary>({
    queryKey: ["profilingSummary", analysisId],
    queryFn: async (): Promise<ProfilingSummary> => {
      if (!analysisId) throw new Error("Analysis ID required");

      const res = await api.knosia.analysis[":id"].profiling.$get({
        param: { id: analysisId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch profiling summary");
      }

      return res.json() as Promise<ProfilingSummary>;
    },
    enabled: !!analysisId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
