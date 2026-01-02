"use client";

// Main canvas view with blocks and editing

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

import { api } from "~/lib/api/client";
import { useCanvas } from "../hooks/use-canvas";
import { CanvasGrid } from "./canvas-grid";
import { CanvasPromptBar } from "./canvas-prompt-bar";
import { CanvasAlertsPanel } from "./canvas-alerts-panel";
import { CanvasShareModal } from "./canvas-share-modal";
import { CanvasAlertModal } from "./canvas-alert-modal";
import type { CanvasViewProps, CanvasAlert, AlertOperator, AlertChannel } from "../types";

export function CanvasView({
  canvasId,
  workspaceId,
  editable = true,
}: CanvasViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<CanvasAlert | null>(null);

  const queryClient = useQueryClient();

  const {
    canvas,
    blocks,
    alerts,
    isLoading,
    isError,
    updateCanvas,
    refetch,
  } = useCanvas({ canvasId });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // AI Canvas Edit mutation
  const editCanvasMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const res = await api.knosia.canvas[":id"].edit.$post({
        param: { id: canvasId },
        json: { instruction },
      });
      if (!res.ok) {
        throw new Error("Failed to edit canvas");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate canvas query to refetch blocks
      queryClient.invalidateQueries({
        queryKey: ["knosia", "canvas", canvasId],
      });
      const changesApplied = (data as { changesApplied?: number }).changesApplied ?? 0;
      toast.success(`Canvas updated: ${changesApplied} change(s) applied`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to edit canvas");
    },
  });

  // Create Alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: {
      name: string;
      condition: {
        metric: string;
        operator: "gt" | "lt" | "eq" | "gte" | "lte" | "change_gt" | "change_lt";
        threshold: number;
        timeWindow?: string;
      };
      channels?: ("in_app" | "email" | "slack")[];
      blockId?: string;
    }) => {
      const res = await api.knosia.canvas[":canvasId"].alerts.$post({
        param: { canvasId },
        json: alertData,
      });
      if (!res.ok) {
        throw new Error("Failed to create alert");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast.success("Alert created");
    },
    onError: () => {
      toast.error("Failed to create alert");
    },
  });

  // Update Alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({
      alertId,
      updates,
    }: {
      alertId: string;
      updates: {
        name?: string;
        condition?: {
          metric: string;
          operator: "gt" | "lt" | "eq" | "gte" | "lte" | "change_gt" | "change_lt";
          threshold: number;
          timeWindow?: string;
        };
        channels?: ("in_app" | "email" | "slack")[];
        enabled?: boolean;
      };
    }) => {
      const res = await api.knosia.canvas[":canvasId"].alerts[":alertId"].$patch({
        param: { canvasId, alertId },
        json: updates,
      });
      if (!res.ok) {
        throw new Error("Failed to update alert");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast.success("Alert updated");
    },
    onError: () => {
      toast.error("Failed to update alert");
    },
  });

  // Delete Alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await api.knosia.canvas[":canvasId"].alerts[":alertId"].$delete({
        param: { canvasId, alertId },
      });
      if (!res.ok) {
        throw new Error("Failed to delete alert");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast.success("Alert deleted");
    },
    onError: () => {
      toast.error("Failed to delete alert");
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Alert handlers
  const handleCreateAlert = () => {
    setEditingAlert(null);
    setShowAlertModal(true);
  };

  const handleEditAlert = (alertId: string) => {
    const alertToEdit = alerts.find((a) => a.id === alertId);
    if (!alertToEdit) {
      toast.error("Alert not found");
      return;
    }
    setEditingAlert(alertToEdit);
    setShowAlertModal(true);
  };

  const handleAlertModalSubmit = (data: {
    name: string;
    condition: {
      metric: string;
      operator: AlertOperator;
      threshold: number;
      timeWindow?: string;
    };
    channels: AlertChannel[];
    blockId?: string;
  }) => {
    if (editingAlert) {
      // Update existing alert
      updateAlertMutation.mutate(
        {
          alertId: editingAlert.id,
          updates: {
            name: data.name,
            condition: data.condition,
            channels: data.channels,
          },
        },
        {
          onSuccess: () => {
            setShowAlertModal(false);
            setEditingAlert(null);
          },
        }
      );
    } else {
      // Create new alert
      createAlertMutation.mutate(
        {
          name: data.name,
          condition: data.condition,
          channels: data.channels,
          blockId: data.blockId,
        },
        {
          onSuccess: () => {
            setShowAlertModal(false);
          },
        }
      );
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    deleteAlertMutation.mutate(alertId);
  };

  const handleToggleAlert = (alertId: string, enabled: boolean) => {
    updateAlertMutation.mutate({
      alertId,
      updates: { enabled },
    });
  };

  const handlePromptSubmit = async (instruction: string) => {
    editCanvasMutation.mutate(instruction);
  };

  // Computed state for processing indicator
  const isProcessing = editCanvasMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !canvas) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Icons.AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load canvas</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          {canvas.icon && (
            <span className="text-2xl">{canvas.icon}</span>
          )}
          <div>
            <h1 className="text-xl font-semibold">{canvas.name}</h1>
            {canvas.description && (
              <p className="text-sm text-muted-foreground">
                {canvas.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAlerts(!showAlerts)}
              >
                <Icons.Bell className="mr-2 h-4 w-4" />
                Alerts
                {alerts.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({alerts.length})
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareModal(true)}
              >
                <Icons.Share className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <Icons.Check className="mr-2 h-4 w-4" />
                    Done
                  </>
                ) : (
                  <>
                    <Icons.SquarePen className="mr-2 h-4 w-4" />
                    Edit
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon">
            <Icons.EllipsisVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Grid */}
      <div className="flex-1 overflow-auto p-4">
        <CanvasGrid
          blocks={blocks}
          layout={canvas.layout}
          editable={isEditing}
        />
      </div>

      {/* Alerts Panel (collapsible) */}
      {showAlerts && (
        <div className="border-t">
          <CanvasAlertsPanel
            canvasId={canvasId}
            alerts={alerts}
            onCreateAlert={handleCreateAlert}
            onEditAlert={handleEditAlert}
            onDeleteAlert={handleDeleteAlert}
            onToggleAlert={handleToggleAlert}
          />
        </div>
      )}

      {/* Prompt Bar (for AI editing) */}
      {editable && (
        <div className="border-t p-4">
          <CanvasPromptBar
            canvasId={canvasId}
            onSubmit={handlePromptSubmit}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {/* Share Modal */}
      {canvas && (
        <CanvasShareModal
          canvas={canvas}
          open={showShareModal}
          onOpenChange={setShowShareModal}
        />
      )}

      {/* Alert Modal */}
      <CanvasAlertModal
        open={showAlertModal}
        onOpenChange={(open) => {
          setShowAlertModal(open);
          if (!open) setEditingAlert(null);
        }}
        alert={editingAlert}
        blocks={blocks}
        onSubmit={handleAlertModalSubmit}
        isSubmitting={createAlertMutation.isPending || updateAlertMutation.isPending}
      />
    </div>
  );
}
