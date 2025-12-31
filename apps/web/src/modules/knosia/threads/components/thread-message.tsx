"use client";

// Individual message in a thread

import { cn } from "@turbostarter/ui";
import { Avatar, AvatarFallback } from "@turbostarter/ui-web/avatar";
import { Icons } from "@turbostarter/ui-web/icons";

import { BlockTrustBadge } from "./block-trust-badge";
import type { ThreadMessageProps } from "../types";

export function ThreadMessage({
  message,
  user,
  showTrustBadge = false,
}: ThreadMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}>
          {isUser ? (
            user?.name?.charAt(0) || "U"
          ) : (
            <Icons.Brain className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>

        {/* Trust Badge */}
        {showTrustBadge && !isUser && message.metadata?.blockTrust && (
          <BlockTrustBadge trust={message.metadata.blockTrust} compact />
        )}

        {/* Query Info */}
        {!isUser && message.metadata?.queryInfo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {message.metadata.queryInfo.executionTimeMs && (
              <span>
                <Icons.ClockAlert className="mr-1 inline h-3 w-3" />
                {message.metadata.queryInfo.executionTimeMs}ms
              </span>
            )}
            {message.metadata.queryInfo.rowCount !== undefined && (
              <span>
                <Icons.ChartNoAxesGantt className="mr-1 inline h-3 w-3" />
                {message.metadata.queryInfo.rowCount} rows
              </span>
            )}
            {message.metadata.queryInfo.cached && (
              <span className="text-green-600">
                <Icons.Zap className="mr-1 inline h-3 w-3" />
                Cached
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
