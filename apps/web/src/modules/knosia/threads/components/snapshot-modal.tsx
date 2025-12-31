"use client";

// Modal for viewing/saving thread snapshots

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@turbostarter/ui-web/dialog";
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import { Label } from "@turbostarter/ui-web/label";
import { Icons } from "@turbostarter/ui-web/icons";

import type { SnapshotModalProps } from "../types";

export function SnapshotModal({
  threadId,
  open,
  onOpenChange,
}: SnapshotModalProps) {
  const [snapshotName, setSnapshotName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!snapshotName.trim()) return;

    setIsSaving(true);
    try {
      // TODO: Implement snapshot saving
      console.log("Saving snapshot:", { threadId, name: snapshotName });
      onOpenChange(false);
      setSnapshotName("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Thread Snapshot</DialogTitle>
          <DialogDescription>
            Create a snapshot of this thread's current state. Snapshots can be
            referenced later and shared with team members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="snapshot-name">Snapshot Name</Label>
            <Input
              id="snapshot-name"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="e.g., Q4 Revenue Analysis"
            />
          </div>

          <div className="rounded-md bg-muted p-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Icons.Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Snapshots capture all messages, visualizations, and insights
                from this conversation. They're read-only and can't be modified
                after creation.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!snapshotName.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icons.Image className="mr-2 h-4 w-4" />
                Save Snapshot
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
