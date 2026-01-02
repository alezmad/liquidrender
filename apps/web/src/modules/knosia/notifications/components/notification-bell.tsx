"use client";

import { useState } from "react";

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@turbostarter/ui-web/dropdown-menu";
import { Icons } from "@turbostarter/ui-web/icons";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";

import { TurboLink } from "~/modules/common/turbo-link";

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useDismissNotification,
  type Notification,
} from "../hooks/use-notifications";

interface NotificationBellProps {
  workspaceId: string;
}

const notificationIcons: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  alert: Icons.AlertTriangle,
  mention: Icons.AtSign,
  share: Icons.Share,
  ai_insight: Icons.Sparkles,
  thread_activity: Icons.MessageSquare,
  digest: Icons.FileText,
};

function NotificationItem({
  notification,
  onRead,
  onDismiss,
}: {
  notification: Notification;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const Icon = notificationIcons[notification.type] || Icons.Bell;
  const timeAgo = formatTimeAgo(new Date(notification.createdAt));

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0",
        !notification.read && "bg-muted/30",
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn("h-4 w-4", !notification.read ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        {notification.actions?.primary?.href ? (
          <TurboLink
            href={notification.actions.primary.href}
            className="font-medium text-sm hover:underline block truncate"
            onClick={onRead}
          >
            {notification.title}
          </TurboLink>
        ) : (
          <p className="font-medium text-sm truncate">{notification.title}</p>
        )}
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      <div className="flex-shrink-0 flex gap-1">
        {!notification.read && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRead}>
            <Icons.Check className="h-3 w-3" />
            <span className="sr-only">Mark as read</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
          <Icons.X className="h-3 w-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell({ workspaceId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useNotifications({ workspaceId });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const dismiss = useDismissNotification();

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];

  const handleMarkRead = (id: string) => {
    markRead.mutate({ id });
  };

  const handleDismiss = (id: string) => {
    dismiss.mutate({ id });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icons.Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Icons.Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => handleMarkRead(notification.id)}
                  onDismiss={() => handleDismiss(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
