// Hook for managing a single thread

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { Thread, ThreadMessage } from "../types";

interface UseThreadOptions {
  threadId: string;
  workspaceId: string;
  connectionId: string;
  enabled?: boolean;
}

interface UseThreadReturn {
  thread: Thread | undefined;
  messages: ThreadMessage[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  isSending: boolean;
}

export function useThread({ threadId, workspaceId, connectionId, enabled = true }: UseThreadOptions): UseThreadReturn {
  const queryClient = useQueryClient();

  // Fetch thread - API uses query params for workspaceId
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["knosia", "thread", threadId, workspaceId],
    queryFn: async () => {
      const res = await api.knosia.thread[":id"].$get({
        param: { id: threadId },
        query: { workspaceId },
      });
      if (!res.ok) throw new Error("Failed to fetch thread");
      return res.json();
    },
    enabled: enabled && !!threadId && !!workspaceId,
  });

  // Fetch messages separately
  const messagesQuery = useQuery({
    queryKey: ["knosia", "thread", threadId, "messages"],
    queryFn: async () => {
      const res = await api.knosia.thread[":id"].messages.$get({
        param: { id: threadId },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: enabled && !!threadId,
  });

  // Send message via POST /query - use context.previousQueryId for thread continuation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.knosia.thread.query.$post({
        json: {
          workspaceId,
          connectionId,
          query: content,
          context: {
            previousQueryId: threadId, // Continue existing thread via context
          },
        },
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate thread and messages queries to refetch
      queryClient.invalidateQueries({
        queryKey: ["knosia", "thread", threadId],
      });
    },
  });

  return {
    thread: data as Thread | undefined,
    messages: (messagesQuery.data as { messages?: ThreadMessage[] })?.messages ?? [],
    isLoading: isLoading || messagesQuery.isLoading,
    isError: isError || messagesQuery.isError,
    error: (error ?? messagesQuery.error) as Error | null,
    sendMessage: async (content: string) => {
      await sendMessageMutation.mutateAsync(content);
    },
    isSending: sendMessageMutation.isPending,
  };
}
