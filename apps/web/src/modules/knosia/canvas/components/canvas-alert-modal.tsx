"use client";

// Modal for creating and editing canvas alerts

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@turbostarter/ui-web/dialog";
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import { Label } from "@turbostarter/ui-web/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { Checkbox } from "@turbostarter/ui-web/checkbox";
import { Icons } from "@turbostarter/ui-web/icons";

import type { CanvasAlert, AlertOperator, AlertChannel, CanvasBlock } from "../types";

// ============================================================================
// Types & Schema
// ============================================================================

const alertFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  metric: z.string().min(1, "Metric is required"),
  operator: z.enum(["gt", "lt", "eq", "gte", "lte", "change_gt", "change_lt"]),
  threshold: z.number(),
  timeWindow: z.string().optional(),
  channels: z.array(z.enum(["in_app", "email", "slack"])).min(1, "Select at least one channel"),
  blockId: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertFormSchema>;

interface CanvasAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert?: CanvasAlert | null; // If provided, edit mode; otherwise create mode
  blocks?: CanvasBlock[]; // Available blocks to link alert to
  onSubmit: (data: {
    name: string;
    condition: {
      metric: string;
      operator: AlertOperator;
      threshold: number;
      timeWindow?: string;
    };
    channels: AlertChannel[];
    blockId?: string;
  }) => void;
  isSubmitting?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const operatorOptions: { value: AlertOperator; label: string; description: string }[] = [
  { value: "gt", label: ">", description: "Greater than" },
  { value: "lt", label: "<", description: "Less than" },
  { value: "eq", label: "=", description: "Equal to" },
  { value: "gte", label: ">=", description: "Greater than or equal" },
  { value: "lte", label: "<=", description: "Less than or equal" },
  { value: "change_gt", label: "Change >", description: "Change exceeds" },
  { value: "change_lt", label: "Change <", description: "Change below" },
];

const channelOptions: { value: AlertChannel; label: string; icon: keyof typeof Icons }[] = [
  { value: "in_app", label: "In-App", icon: "Bell" },
  { value: "email", label: "Email", icon: "MailPlus" },
  { value: "slack", label: "Slack", icon: "MessagesSquare" },
];

const timeWindowOptions = [
  { value: "", label: "No time window" },
  { value: "5m", label: "5 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
];

// ============================================================================
// Main Component
// ============================================================================

export function CanvasAlertModal({
  open,
  onOpenChange,
  alert,
  blocks = [],
  onSubmit,
  isSubmitting = false,
}: CanvasAlertModalProps) {
  const isEditMode = !!alert;

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      name: "",
      metric: "",
      operator: "gt",
      threshold: 0,
      timeWindow: "",
      channels: ["in_app"],
      blockId: "",
    },
  });

  // Reset form when alert changes (switching between create/edit)
  useEffect(() => {
    if (alert) {
      form.reset({
        name: alert.name,
        metric: alert.condition.metric,
        operator: alert.condition.operator,
        threshold: alert.condition.threshold,
        timeWindow: alert.condition.timeWindow ?? "",
        channels: (alert.channels ?? ["in_app"]) as AlertChannel[],
        blockId: alert.blockId ?? "",
      });
    } else {
      form.reset({
        name: "",
        metric: "",
        operator: "gt",
        threshold: 0,
        timeWindow: "",
        channels: ["in_app"],
        blockId: "",
      });
    }
  }, [alert, form]);

  const handleSubmit = (data: AlertFormData) => {
    onSubmit({
      name: data.name,
      condition: {
        metric: data.metric,
        operator: data.operator,
        threshold: data.threshold,
        timeWindow: data.timeWindow || undefined,
      },
      channels: data.channels,
      blockId: data.blockId || undefined,
    });
  };

  const selectedChannels = form.watch("channels");

  const toggleChannel = (channel: AlertChannel) => {
    const current = form.getValues("channels");
    if (current.includes(channel)) {
      // Don't allow removing the last channel
      if (current.length > 1) {
        form.setValue("channels", current.filter(c => c !== channel), { shouldValidate: true });
      }
    } else {
      form.setValue("channels", [...current, channel], { shouldValidate: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.AlertCircle className="h-5 w-5" />
            {isEditMode ? "Edit Alert" : "Create Alert"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the alert configuration."
              : "Set up an alert to get notified when conditions are met."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {/* Alert Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Alert Name</Label>
            <Input
              id="name"
              placeholder="e.g., Revenue drops below target"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Metric */}
          <div className="space-y-2">
            <Label htmlFor="metric">Metric</Label>
            <Input
              id="metric"
              placeholder="e.g., revenue, active_users, conversion_rate"
              {...form.register("metric")}
            />
            {form.formState.errors.metric && (
              <p className="text-xs text-destructive">{form.formState.errors.metric.message}</p>
            )}
          </div>

          {/* Condition Row: Operator + Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select
                value={form.watch("operator")}
                onValueChange={(v) => form.setValue("operator", v as AlertOperator)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operatorOptions.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      <span className="font-mono">{op.label}</span>
                      <span className="ml-2 text-muted-foreground">{op.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold</Label>
              <Input
                id="threshold"
                type="number"
                step="any"
                placeholder="100"
                {...form.register("threshold", { valueAsNumber: true })}
              />
              {form.formState.errors.threshold && (
                <p className="text-xs text-destructive">{form.formState.errors.threshold.message}</p>
              )}
            </div>
          </div>

          {/* Time Window */}
          <div className="space-y-2">
            <Label>Time Window (optional)</Label>
            <Select
              value={form.watch("timeWindow") ?? ""}
              onValueChange={(v) => form.setValue("timeWindow", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No time window" />
              </SelectTrigger>
              <SelectContent>
                {timeWindowOptions.map((tw) => (
                  <SelectItem key={tw.value} value={tw.value}>
                    {tw.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Evaluate condition over this time period
            </p>
          </div>

          {/* Link to Block (optional) */}
          {blocks.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Block (optional)</Label>
              <Select
                value={form.watch("blockId") ?? ""}
                onValueChange={(v) => form.setValue("blockId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No linked block" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No linked block</SelectItem>
                  {blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.title || `${block.type} block`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Associate this alert with a specific canvas block
              </p>
            </div>
          )}

          {/* Notification Channels */}
          <div className="space-y-2">
            <Label>Notification Channels</Label>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map((ch) => {
                const IconComponent = Icons[ch.icon];
                const isSelected = selectedChannels.includes(ch.value);
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted hover:bg-muted"
                    }`}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <IconComponent className="h-4 w-4" />
                    {ch.label}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.channels && (
              <p className="text-xs text-destructive">{form.formState.errors.channels.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Icons.Check className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Icons.Plus className="mr-2 h-4 w-4" />
                      Create Alert
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
