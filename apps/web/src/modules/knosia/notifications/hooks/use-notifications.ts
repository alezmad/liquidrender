"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { handle } from "@turbostarter/api/utils";

import { api } from "~/lib/api/client";

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: "alert" | "mention" | "share" | "ai_insight" | "thread_activity" | "digest";
  title: string;
  body: string | null;
  sourceType: string | null;
  sourceId: string | null;
  read: boolean | null;
  dismissed: boolean | null;
  actions: {
    primary?: { label: string; href: string };
    secondary?: { label: string; href: string };
  } | null;
  createdAt: string;
}

interface UseNotificationsOptions {
  workspaceId: string;
  unreadOnly?: boolean;
}

export function useNotifications({ workspaceId, unreadOnly = false }: UseNotificationsOptions) {
  return useQuery({
    queryKey: ["knosia", "notifications", workspaceId, { unreadOnly }],
    queryFn: async () => {
      const res = await api.knosia.notification.$get({
        query: {
          workspaceId,
          unreadOnly: unreadOnly.toString(),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }

      return res.json() as Promise<{
        data: Notification[];
        total: number;
        unreadCount: number;
      }>;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUnreadCount(workspaceId: string) {
  const { data } = useNotifications({ workspaceId, unreadOnly: true });
  return data?.unreadCount ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await api.knosia.notification[":id"].read.$post({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to mark notification as read");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knosia", "notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.knosia.notification["read-all"].$post();

      if (!res.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knosia", "notifications"] });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await api.knosia.notification[":id"].dismiss.$post({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to dismiss notification");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knosia", "notifications"] });
    },
  });
}
