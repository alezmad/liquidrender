"use client";

import { useState } from "react";

import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { Textarea } from "@turbostarter/ui-web/textarea";

import type { CommentTargetType } from "../hooks/use-comments";
import { useCreateComment } from "../hooks/use-comments";

interface CommentFormProps {
  targetType: CommentTargetType;
  targetId: string;
  placeholder?: string;
}

export function CommentForm({
  targetType,
  targetId,
  placeholder = "Add a comment...",
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const createMutation = useCreateComment();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    await createMutation.mutateAsync({
      targetType,
      targetId,
      content: content.trim(),
    });

    setContent("");
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setContent("");
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsExpanded(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[40px] resize-none"
        rows={isExpanded ? 3 : 1}
      />

      {isExpanded && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Press ⌘+Enter to submit
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMutation.isPending || !content.trim()}
            >
              {createMutation.isPending ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Comment"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
