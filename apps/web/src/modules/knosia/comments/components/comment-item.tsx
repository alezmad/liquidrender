"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@turbostarter/ui";
import { Avatar, AvatarFallback } from "@turbostarter/ui-web/avatar";
import { Button } from "@turbostarter/ui-web/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@turbostarter/ui-web/dropdown-menu";
import { Icons } from "@turbostarter/ui-web/icons";
import { Textarea } from "@turbostarter/ui-web/textarea";

import type { Comment, CommentTargetType } from "../hooks/use-comments";
import { useUpdateComment, useDeleteComment } from "../hooks/use-comments";

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  targetType: CommentTargetType;
  targetId: string;
}

export function CommentItem({
  comment,
  currentUserId,
  targetType,
  targetId,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  const isOwner = comment.userId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    await updateMutation.mutateAsync({
      id: comment.id,
      content: editContent,
      targetType,
      targetId,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({
      id: comment.id,
      targetType,
      targetId,
    });
  };

  const initials = comment.userId.slice(0, 2).toUpperCase();

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium truncate">User</span>
            <span className="text-muted-foreground">{timeAgo}</span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-muted-foreground text-xs">(edited)</span>
            )}
          </div>

          {isOwner && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Icons.MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Icons.Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                  disabled={deleteMutation.isPending}
                >
                  <Icons.Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending || !editContent.trim()}
              >
                {updateMutation.isPending ? (
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
            {comment.content}
          </p>
        )}
      </div>
    </div>
  );
}
