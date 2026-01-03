"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { handle } from "@turbostarter/api/utils";

import type { ProfilingSummary } from "../types";

export function useProfilingSummary(analysisId: string | null) {
  return useQuery<ProfilingSummary>({
    queryKey: ["profilingSummary", analysisId],
    queryFn: async () => {
      if (!analysisId) throw new Error("Analysis ID required");
      return handle(api.knosia.analysis[":id"].profiling.$get)({
        param: { id: analysisId },
      });
    },
    enabled: !!analysisId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
