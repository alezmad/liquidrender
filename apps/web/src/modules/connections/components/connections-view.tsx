"use client";

import { ConnectionsList } from "./connections-list";
import { AddConnectionDialog } from "./add-connection-dialog";
import { useConnections } from "../hooks/use-connections";
import type { ConnectionsViewProps } from "../types";
import { Alert, AlertDescription } from "@turbostarter/ui-web/alert";
import { Loader2 } from "lucide-react";

export function ConnectionsView({ user }: ConnectionsViewProps) {
  // Knosia org ID follows the pattern: user-{userId}
  // See: packages/api/src/modules/knosia/organization/mutations.ts:29
  const orgId = `user-${user.id}`;

  const { data, isLoading, error } = useConnections(orgId);

  const connections = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Manage your database connections
          </p>
        </div>
        <AddConnectionDialog orgId={orgId} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load connections. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ConnectionsList connections={connections} orgId={orgId} />
      )}
    </div>
  );
}
