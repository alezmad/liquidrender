import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";
import type { ConnectionWithHealth } from "../types";

export function useConnections(orgId: string) {
  return useQuery({
    queryKey: ["connections", orgId],
    queryFn: async () => {
      const res = await api.knosia.connections.$get({
        query: { orgId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch connections");
      }

      const data = await res.json();
      // Map API response to expected type (API returns string dates, we convert to Date objects)
      const connections = data.data.map((conn: unknown) => {
        const c = conn as Record<string, unknown>;
        return {
          ...c,
          createdAt: new Date(c.createdAt as string),
          updatedAt: new Date(c.updatedAt as string),
          health: c.health
            ? {
                ...(c.health as Record<string, unknown>),
                lastCheck: (c.health as Record<string, unknown>).lastCheck
                  ? new Date(
                      (c.health as Record<string, unknown>).lastCheck as string,
                    )
                  : null,
              }
            : null,
        } as ConnectionWithHealth;
      });
      return { data: connections };
    },
  });
}

/**
 * Preview cascade impacts before deleting a connection
 */
export async function previewDeleteConnection({
  id,
  orgId,
}: {
  id: string;
  orgId: string;
}) {
  const res = await api.knosia.connections[":id"].$delete({
    param: { id },
    query: { orgId, preview: "true" },
  });

  if (!res.ok) {
    throw new Error("Failed to preview deletion");
  }

  const data = (await res.json()) as {
    preview: boolean;
    resourceId: string;
    userFacingImpacts: {
      label: string;
      count: number;
      items: { id: string; displayName: string }[];
      hasMore: boolean;
    }[];
    totalAffected: number;
  };

  return data;
}

/**
 * Execute connection deletion
 */
export async function executeDeleteConnection({
  id,
  orgId,
}: {
  id: string;
  orgId: string;
}) {
  const res = await api.knosia.connections[":id"].$delete({
    param: { id },
    query: { orgId },
  });

  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    throw new Error(error.error ?? "Failed to delete connection");
  }
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const res = await api.knosia.connections[":id"].$delete({
        param: { id },
        query: { orgId },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error ?? "Failed to delete connection");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["connections", variables.orgId],
      });
    },
  });
}
