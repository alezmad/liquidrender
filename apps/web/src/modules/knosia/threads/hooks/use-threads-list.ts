// Hook for managing threads list

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { Thread, ThreadStatus } from "../types";

interface UseThreadsListOptions {
  workspaceId?: string;
  connectionId?: string;
  status?: ThreadStatus;
  page?: number;
  perPage?: number;
}

interface ThreadsListResponse {
  data: Thread[];
  total: number;
}

interface UseThreadsListReturn {
  threads: Thread[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  createThread: (initialQuery?: string) => Promise<Thread>;
  isCreating: boolean;
  refetch: () => void;
}

export function useThreadsList({
  workspaceId = "default",
  connectionId = "default",
  status,
  page = 1,
  perPage = 20,
}: UseThreadsListOptions = {}): UseThreadsListReturn {
  const queryClient = useQueryClient();

  // Fetch threads list
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["knosia", "threads", workspaceId, { status, page, perPage }],
    queryFn: async () => {
      const res = await api.knosia.thread.$get({
        query: {
          workspaceId,
          status,
          page: String(page),
          perPage: String(perPage),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json() as Promise<ThreadsListResponse>;
    },
    enabled: !!workspaceId,
  });

  // Create thread mutation - threads are created via POST /query
  const createThreadMutation = useMutation({
    mutationFn: async (initialQuery?: string) => {
      const res = await api.knosia.thread.query.$post({
        json: {
          workspaceId,
          connectionId,
          query: initialQuery ?? "What can you help me with?",
        },
      });
      if (!res.ok) throw new Error("Failed to create thread");
      const result = await res.json();
      // POST /query returns { threadId, ...response }
      // Return a partial Thread - caller should refetch for full data
      return {
        id: result.threadId,
        userId: "",
        workspaceId,
        title: initialQuery ?? "New Thread",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knosia", "threads", workspaceId],
      });
    },
  });

  return {
    threads: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    createThread: async (title?: string) => {
      return createThreadMutation.mutateAsync(title);
    },
    isCreating: createThreadMutation.isPending,
    refetch,
  };
}
