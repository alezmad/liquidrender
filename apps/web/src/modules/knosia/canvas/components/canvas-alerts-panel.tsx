"use client";

// Panel for displaying and managing canvas alerts

import { useState, useMemo } from "react";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { cn } from "@turbostarter/ui";

import type { CanvasAlert, AlertSeverity, AlertStatus, AlertOperator } from "../types";

// ============================================================================
// Types
// ============================================================================

interface CanvasAlertsPanelProps {
  canvasId: string;
  alerts: CanvasAlert[];
  onCreateAlert: () => void;
  onEditAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onToggleAlert?: (alertId: string, enabled: boolean) => void;
}

type FilterStatus = AlertStatus | "all";
type FilterSeverity = AlertSeverity | "all";

// ============================================================================
// Config
// ============================================================================

const severityConfig: Record<AlertSeverity, {
  label: string;
  color: string;
  badgeClass: string;
}> = {
  info: {
    label: "Info",
    color: "text-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  warning: {
    label: "Warning",
    color: "text-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  critical: {
    label: "Critical",
    color: "text-red-500",
    badgeClass: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
};

const operatorLabels: Record<string, string> = {
  gt: ">",
  lt: "<",
  eq: "=",
  gte: ">=",
  lte: "<=",
  change_gt: "change >",
  change_lt: "change <",
};

// ============================================================================
// Helper Functions
// ============================================================================

function getAlertStatus(alert: CanvasAlert): AlertStatus {
  if (!alert.enabled) return "paused";
  // Consider "triggered" if triggered within last 24 hours
  if (alert.lastTriggeredAt) {
    const triggeredAt = new Date(alert.lastTriggeredAt);
    const now = new Date();
    const hoursSinceTriggered = (now.getTime() - triggeredAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceTriggered < 24) return "triggered";
  }
  return "active";
}

function formatCondition(alert: CanvasAlert): string {
  const { metric, operator, threshold } = alert.condition;
  const opLabel = operatorLabels[operator] ?? operator;
  return `${metric} ${opLabel} ${threshold}`;
}

function formatLastTriggered(dateStr: string | null): string {
  if (!dateStr) return "Never";

  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

/**
 * Derive alert severity from its condition.
 * - Critical: change operators with high thresholds (>50), or any operator with very high threshold (>1000)
 * - Warning: comparison operators (gt, lt, gte, lte) with moderate thresholds
 * - Info: equality checks or low thresholds
 */
function deriveAlertSeverity(alert: CanvasAlert): AlertSeverity {
  const { operator, threshold } = alert.condition;

  // Change operators with high thresholds are critical
  if (operator === "change_gt" || operator === "change_lt") {
    if (Math.abs(threshold) >= 50) return "critical";
    if (Math.abs(threshold) >= 20) return "warning";
    return "info";
  }

  // Very high thresholds suggest critical conditions
  if (Math.abs(threshold) >= 1000) return "critical";
  if (Math.abs(threshold) >= 100) return "warning";

  // Equality checks are usually informational
  if (operator === "eq") return "info";

  // Other comparison operators are warnings by default
  return "warning";
}

// ============================================================================
// Components
// ============================================================================

interface AlertRowProps {
  alert: CanvasAlert;
  status: AlertStatus;
  severity: AlertSeverity;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function AlertRow({ alert, status, severity, onEdit, onDelete, onToggle }: AlertRowProps) {
  const severityStyle = severityConfig[severity];

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      {/* Icon */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
        severityStyle.color
      )}>
        <Icons.AlertCircle className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{alert.name}</span>
          <Badge variant="outline" className={cn("shrink-0 text-xs", severityStyle.badgeClass)}>
            {severityStyle.label}
          </Badge>
          <StatusBadge status={status} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatCondition(alert)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Last triggered: {formatLastTriggered(alert.lastTriggeredAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
          title={alert.enabled ? "Pause alert" : "Enable alert"}
        >
          {alert.enabled ? (
            <Icons.Pause className="h-4 w-4 text-green-500" />
          ) : (
            <Icons.Play className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          title="Edit alert"
        >
          <Icons.SquarePen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Delete alert"
        >
          <Icons.Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const config: Record<AlertStatus, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    triggered: {
      label: "Triggered",
      className: "bg-red-100 text-red-700 animate-pulse dark:bg-red-900/30 dark:text-red-400",
    },
    paused: {
      label: "Paused",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
  };

  const { label, className } = config[status];

  return (
    <Badge variant="outline" className={cn("shrink-0 text-xs", className)}>
      {label}
    </Badge>
  );
}

function EmptyState({ onCreateAlert }: { onCreateAlert: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icons.AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium">No alerts configured</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Create alerts to get notified when metrics change
      </p>
      <Button className="mt-4" onClick={onCreateAlert}>
        <Icons.Plus className="mr-2 h-4 w-4" />
        Add Alert
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CanvasAlertsPanel({
  canvasId,
  alerts,
  onCreateAlert,
  onEditAlert,
  onDeleteAlert,
  onToggleAlert,
}: CanvasAlertsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>("all");

  // Compute status and severity for each alert
  const alertsWithMetadata = useMemo(() => {
    return alerts.map(alert => ({
      alert,
      status: getAlertStatus(alert),
      severity: deriveAlertSeverity(alert),
    }));
  }, [alerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alertsWithMetadata.filter(({ status, severity }) => {
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (severityFilter !== "all" && severity !== severityFilter) return false;
      return true;
    });
  }, [alertsWithMetadata, statusFilter, severityFilter]);

  const handleToggle = (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert && onToggleAlert) {
      onToggleAlert(alertId, !alert.enabled);
    }
  };

  if (alerts.length === 0) {
    return <EmptyState onCreateAlert={onCreateAlert} />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icons.AlertCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Alerts</h3>
          <Badge variant="secondary" className="text-xs">
            {alerts.length}
          </Badge>
        </div>
        <Button size="sm" onClick={onCreateAlert}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Alert
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="triggered">Triggered</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as FilterSeverity)}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || severityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setStatusFilter("all");
              setSeverityFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No alerts match the current filters
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlerts.map(({ alert, status, severity }) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                status={status}
                severity={severity}
                onEdit={() => onEditAlert(alert.id)}
                onDelete={() => onDeleteAlert(alert.id)}
                onToggle={() => handleToggle(alert.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
