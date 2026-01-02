"use client";

import { useState } from "react";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@turbostarter/ui-web/dialog";
import { Input } from "@turbostarter/ui-web/input";
import { Label } from "@turbostarter/ui-web/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { Icons } from "@turbostarter/ui-web/icons";
import { Badge } from "@turbostarter/ui-web/badge";

import type { ShareTargetType } from "../hooks/use-share";
import { useShare } from "../hooks/use-share";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ShareTargetType;
  targetId: string;
  targetTitle: string;
}

// Type label for display
const typeLabels: Record<ShareTargetType, string> = {
  thread: "Thread",
  canvas: "Canvas",
};

export function ShareModal({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetTitle,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [mode, setMode] = useState<"view" | "comment" | "edit">("view");

  const shareMutation = useShare();

  const handleAddUser = () => {
    if (email && !selectedUsers.includes(email)) {
      setSelectedUsers([...selectedUsers, email]);
      setEmail("");
    }
  };

  const handleRemoveUser = (userToRemove: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u !== userToRemove));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    await shareMutation.mutateAsync({
      targetType,
      targetId,
      userIds: selectedUsers,
      mode,
    });

    // Reset and close
    setSelectedUsers([]);
    setMode("view");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddUser();
    }
  };

  const typeLabel = typeLabels[targetType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.Share className="h-5 w-5" />
            Share {typeLabel}
          </DialogTitle>
          <DialogDescription>
            Share &quot;{targetTitle}&quot; with team members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="email">Add people</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddUser}
                disabled={!email}
              >
                <Icons.Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected users</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge key={user} variant="secondary" className="gap-1 pr-1">
                    {user}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveUser(user)}
                    >
                      <Icons.X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Permission mode */}
          <div className="space-y-2">
            <Label htmlFor="mode">Permission</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "view" | "comment" | "edit")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Icons.Eye className="h-4 w-4" />
                    <span>Can view</span>
                  </div>
                </SelectItem>
                <SelectItem value="comment">
                  <div className="flex items-center gap-2">
                    <Icons.MessageSquare className="h-4 w-4" />
                    <span>Can comment</span>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Icons.Edit className="h-4 w-4" />
                    <span>Can edit</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === "view"
                ? "Users can view but not make changes"
                : mode === "comment"
                  ? "Users can view and add comments"
                  : "Users can view, comment, and make changes"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedUsers.length === 0 || shareMutation.isPending}
          >
            {shareMutation.isPending ? (
              <>
                <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Icons.Share className="h-4 w-4 mr-2" />
                Share
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
