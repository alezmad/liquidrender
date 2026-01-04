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
      const connections: ConnectionWithHealth[] = data.data.map((conn: any) => ({
        ...conn,
        createdAt: new Date(conn.createdAt),
        updatedAt: new Date(conn.updatedAt),
        health: conn.health
          ? {
              ...conn.health,
              lastCheck: conn.health.lastCheck ? new Date(conn.health.lastCheck) : null,
            }
          : null,
      }));
      return { data: connections };
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const res = await api.knosia.connections[":id"].$delete({
        param: { id },
      });

      if (!res.ok) {
        const error = await res.json();
        if ("error" in error) {
          throw new Error(error.error as string);
        }
        throw new Error("Failed to delete connection");
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
