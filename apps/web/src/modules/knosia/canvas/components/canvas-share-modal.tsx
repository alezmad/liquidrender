"use client";

// Modal for sharing a canvas with collaborators

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@turbostarter/ui-web/dialog";
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@turbostarter/ui-web/avatar";
import { Badge } from "@turbostarter/ui-web/badge";
import { Icons } from "@turbostarter/ui-web/icons";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";
import { toast } from "sonner";

import type { Canvas } from "../types";

// ============================================================================
// Types
// ============================================================================

type PermissionLevel = "view" | "comment" | "edit";

interface Collaborator {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  permission: PermissionLevel;
}

interface CanvasShareModalProps {
  canvas: Canvas;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Permission Badge Styles
// ============================================================================

const permissionStyles: Record<PermissionLevel, string> = {
  view: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  comment: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  edit: "bg-green-100 text-green-700 hover:bg-green-100",
};

const permissionLabels: Record<PermissionLevel, string> = {
  view: "Can view",
  comment: "Can comment",
  edit: "Can edit",
};

// ============================================================================
// Collaborator Row Component
// ============================================================================

interface CollaboratorRowProps {
  collaborator: Collaborator;
  onRemove: (id: string) => void;
  isRemoving?: boolean;
}

function CollaboratorRow({
  collaborator,
  onRemove,
  isRemoving,
}: CollaboratorRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
          <AvatarFallback>
            <Icons.UserRound className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {collaborator.name && (
            <p className="truncate text-sm font-medium">{collaborator.name}</p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {collaborator.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={permissionStyles[collaborator.permission]}>
          {permissionLabels[collaborator.permission]}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(collaborator.id)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.X className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CanvasShareModal({
  canvas,
  open,
  onOpenChange,
}: CanvasShareModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<PermissionLevel>("view");
  const [isInviting, setIsInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // TODO: Replace with actual API call to fetch collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    // Mock data - will be replaced with API integration
  ]);

  const shareableLink = typeof window !== "undefined"
    ? `${window.location.origin}/canvas/${canvas.id}`
    : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) return;

    setIsInviting(true);
    try {
      // TODO: Implement API call to invite collaborator
      console.log("Inviting:", { email, permission, canvasId: canvas.id });

      // Mock adding collaborator for now
      const newCollaborator: Collaborator = {
        id: crypto.randomUUID(),
        email: email.trim(),
        permission,
      };
      setCollaborators((prev) => [...prev, newCollaborator]);

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setPermission("view");
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);
    try {
      // TODO: Implement API call to remove collaborator
      console.log("Removing collaborator:", collaboratorId);

      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      toast.success("Collaborator removed");
    } catch {
      toast.error("Failed to remove collaborator");
    } finally {
      setRemovingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isInviting && email.trim()) {
      e.preventDefault();
      void handleInvite();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.UsersRound className="h-5 w-5" />
            Share Canvas
          </DialogTitle>
          <DialogDescription>
            Share "{canvas.name || "Untitled Canvas"}" with your team members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Icons.UserRoundPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Email address"
                  type="email"
                  className="pl-9"
                />
              </div>
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as PermissionLevel)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="comment">Can comment</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleInvite}
              disabled={!email.trim() || isInviting}
            >
              {isInviting ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Icons.UserRoundPlus className="mr-2 h-4 w-4" />
                  Invite
                </>
              )}
            </Button>
          </div>

          {/* Copy Link Section */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Shareable Link</p>
            <div className="flex gap-2">
              <Input
                value={shareableLink}
                readOnly
                className="flex-1 bg-muted text-muted-foreground"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                <Icons.Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can access the canvas based on their permissions.
            </p>
          </div>

          {/* Collaborators List */}
          {collaborators.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Collaborators ({collaborators.length})
              </p>
              <ScrollArea className="max-h-48">
                <div className="divide-y">
                  {collaborators.map((collaborator) => (
                    <CollaboratorRow
                      key={collaborator.id}
                      collaborator={collaborator}
                      onRemove={handleRemove}
                      isRemoving={removingId === collaborator.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Empty State */}
          {collaborators.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-center">
              <Icons.UsersRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No collaborators yet. Invite team members to collaborate on this canvas.
              </p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
