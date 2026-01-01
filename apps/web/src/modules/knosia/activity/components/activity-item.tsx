"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { cn } from "@turbostarter/ui";
import { Avatar, AvatarFallback } from "@turbostarter/ui-web/avatar";
import { Icons } from "@turbostarter/ui-web/icons";

import type { Activity, ActivityType } from "../hooks/use-activity";

interface ActivityItemProps {
  activity: Activity;
}

const activityConfig: Record<
  ActivityType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
  }
> = {
  thread_created: {
    icon: Icons.MessageSquarePlus,
    label: "created a thread",
    color: "text-blue-500",
  },
  thread_shared: {
    icon: Icons.Share,
    label: "shared a thread",
    color: "text-green-500",
  },
  canvas_created: {
    icon: Icons.LayoutDashboard,
    label: "created a canvas",
    color: "text-purple-500",
  },
  canvas_shared: {
    icon: Icons.Share,
    label: "shared a canvas",
    color: "text-green-500",
  },
  canvas_updated: {
    icon: Icons.Edit,
    label: "updated a canvas",
    color: "text-orange-500",
  },
  comment_added: {
    icon: Icons.MessageCircle,
    label: "added a comment",
    color: "text-yellow-500",
  },
  insight_converted: {
    icon: Icons.Sparkles,
    label: "converted an insight to thread",
    color: "text-pink-500",
  },
};

function getActivityLink(activity: Activity): string | null {
  if (!activity.targetType || !activity.targetId) return null;

  switch (activity.targetType) {
    case "thread":
      return `/dashboard/knosia/threads/${activity.targetId}`;
    case "canvas":
      return `/dashboard/knosia/canvases/${activity.targetId}`;
    default:
      return null;
  }
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const config = activityConfig[activity.type];
  const Icon = config.icon;
  const link = getActivityLink(activity);
  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });

  const initials = activity.userId.slice(0, 2).toUpperCase();

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        link && "hover:bg-muted/50 cursor-pointer",
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
          <span className="text-sm">
            <span className="font-medium">User</span>{" "}
            <span className="text-muted-foreground">{config.label}</span>
          </span>
        </div>

        {activity.targetName && (
          <p className="text-sm font-medium mt-1 truncate">
            {activity.targetName}
          </p>
        )}

        <span className="text-xs text-muted-foreground mt-1 block">
          {timeAgo}
        </span>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
