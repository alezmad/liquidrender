"use client";

import { Icons } from "@turbostarter/ui-web/icons";
import { Button } from "@turbostarter/ui-web/button";
import { Badge } from "@turbostarter/ui-web/badge";
import type { ConnectionSummary } from "../../types";
import type { ConnectionType } from "../../types";

const DATABASE_ICONS: Record<ConnectionType, React.ComponentType<{ className?: string }>> = {
  postgres: Icons.Database,
  mysql: Icons.Database,
  snowflake: Icons.Snowflake,
  bigquery: Icons.Cloud,
  redshift: Icons.Database,
  duckdb: Icons.Database,
};

interface ConnectionSummaryCardProps {
  connection: ConnectionSummary;
  isPrimary?: boolean;
  onRemove?: () => void;
  compact?: boolean;
}

export function ConnectionSummaryCard({
  connection,
  isPrimary,
  onRemove,
  compact = false,
}: ConnectionSummaryCardProps) {
  const Icon = DATABASE_ICONS[connection.type] ?? Icons.Database;

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{connection.type}</span>
              {isPrimary && (
                <Badge variant="secondary" className="text-xs">Primary</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {connection.host}/{connection.database} &bull; {connection.tablesCount} tables
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            <Icons.Check className="mr-1 h-3 w-3" />
            Ready
          </Badge>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Icons.X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold capitalize">{connection.type}</h3>
              {isPrimary && (
                <Badge variant="secondary">Primary</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connection.host}:{connection.port}/{connection.database}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-green-600">
          <Icons.Check className="mr-1 h-3 w-3" />
          Ready
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span>Connected just now</span>
        <span>&bull;</span>
        <span>{connection.tablesCount} tables found</span>
      </div>
    </div>
  );
}
