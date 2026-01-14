"use client";

import { Database, Trash2, Activity, Table } from "lucide-react";
import { Card, CardContent, CardHeader } from "@turbostarter/ui-web/card";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import { formatDistanceToNow } from "date-fns";
import type { ConnectionWithHealth } from "../types";

interface ConnectionCardProps {
  connection: ConnectionWithHealth;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function ConnectionCard({
  connection,
  onDelete,
  isDeleting = false,
}: ConnectionCardProps) {
  const healthStatus = connection.health?.status || "unknown";
  const statusColors = {
    connected: "bg-green-500/10 text-green-700 dark:text-green-400",
    error: "bg-red-500/10 text-red-700 dark:text-red-400",
    stale: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    unknown: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{connection.name}</h3>
            <p className="text-sm text-muted-foreground">
              {connection.type} • {connection.database}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(connection.id)}
          disabled={isDeleting}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Host</span>
          <span className="font-mono text-xs">
            {connection.host}
            {connection.port ? `:${connection.port}` : ""}
          </span>
        </div>
        {connection.schema && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Schema</span>
            <span className="font-mono text-xs">{connection.schema}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Table className="h-3 w-3" />
            Tables
          </span>
          <span className="font-medium">
            {connection.tablesCount ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {connection.health?.lastCheck
                ? `Checked ${formatDistanceToNow(connection.health.lastCheck, { addSuffix: true })}`
                : "Not checked"}
            </span>
          </div>
          <Badge
            variant="outline"
            className={statusColors[healthStatus as keyof typeof statusColors]}
          >
            {healthStatus}
          </Badge>
        </div>
        {connection.health?.errorMessage && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {connection.health.errorMessage}
          </div>
        )}
        {connection.health?.latencyMs != null && connection.health.latencyMs > 0 && (
          <div className="text-xs text-muted-foreground">
            Latency: {connection.health.latencyMs}ms
          </div>
        )}
      </CardContent>
    </Card>
  );
}
