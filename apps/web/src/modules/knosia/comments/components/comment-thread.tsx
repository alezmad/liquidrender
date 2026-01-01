"use client";

import { cn } from "@turbostarter/ui";
import { Icons } from "@turbostarter/ui-web/icons";
import { Separator } from "@turbostarter/ui-web/separator";

import type { CommentTargetType } from "../hooks/use-comments";
import { useComments } from "../hooks/use-comments";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";

interface CommentThreadProps {
  targetType: CommentTargetType;
  targetId: string;
  currentUserId: string;
  className?: string;
  showHeader?: boolean;
}

export function CommentThread({
  targetType,
  targetId,
  currentUserId,
  className,
  showHeader = true,
}: CommentThreadProps) {
  const { data, isLoading, error } = useComments({
    targetType,
    targetId,
  });

  const comments = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className={cn("space-y-4", className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Icons.MessageSquare className="h-4 w-4" />
            Comments
            {total > 0 && (
              <span className="text-muted-foreground">({total})</span>
            )}
          </h3>
        </div>
      )}

      <CommentForm targetType={targetType} targetId={targetId} />

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-4">
          Failed to load comments
        </div>
      )}

      {!isLoading && !error && comments.length === 0 && (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No comments yet. Be the first to comment!
        </div>
      )}

      {comments.length > 0 && (
        <div className="divide-y">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              targetType={targetType}
              targetId={targetId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
