/**
 * Cascade Registry
 *
 * Central definition of cascade relationships for destructive operations.
 * Used to preview impact counts before deletion.
 */

import {
  knosiaAnalysis,
  knosiaCalculatedMetric,
  knosiaCanvasVersion,
  knosiaConnectionHealth,
  knosiaConnectionSchema,
  knosiaMismatchReport,
  knosiaThread,
  knosiaThreadMessage,
  knosiaThreadSnapshot,
  knosiaVocabularyVersion,
  knosiaWorkspaceCanvas,
  knosiaWorkspaceConnection,
  knosiaWorkspaceMembership,
} from "@turbostarter/db/schema";

import type { PgTableWithColumns } from "drizzle-orm/pg-core";

export interface CascadeRelation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTableWithColumns<any>;
  fk: string;
  label: string;
  /** If true, don't show to user (internal/technical records) */
  hidden?: boolean;
  /** Display field to show in preview (defaults to "name" or "title") */
  displayField?: string;
}

export const CASCADE_REGISTRY = {
  connection: {
    calculatedMetrics: {
      table: knosiaCalculatedMetric,
      fk: "connectionId",
      label: "calculated metrics",
      displayField: "name",
    },
    analyses: {
      table: knosiaAnalysis,
      fk: "connectionId",
      label: "analyses",
      hidden: true, // Internal system records, not user-created
    },
    connectionHealth: {
      table: knosiaConnectionHealth,
      fk: "connectionId",
      label: "health records",
      hidden: true,
    },
    connectionSchema: {
      table: knosiaConnectionSchema,
      fk: "connectionId",
      label: "schema snapshots",
      hidden: true,
    },
    workspaceConnections: {
      table: knosiaWorkspaceConnection,
      fk: "connectionId",
      label: "workspace links",
      hidden: true,
    },
  },

  workspace: {
    workspaceConnections: {
      table: knosiaWorkspaceConnection,
      fk: "workspaceId",
      label: "connection links",
      hidden: true, // Internal link records
    },
    canvases: {
      table: knosiaWorkspaceCanvas,
      fk: "workspaceId",
      label: "canvases",
      displayField: "title",
    },
    threads: {
      table: knosiaThread,
      fk: "workspaceId",
      label: "threads",
      displayField: "title",
    },
    analyses: {
      table: knosiaAnalysis,
      fk: "workspaceId",
      label: "analyses",
      hidden: true, // Internal system records
    },
    memberships: {
      table: knosiaWorkspaceMembership,
      fk: "workspaceId",
      label: "memberships",
      hidden: true, // Internal link records
    },
  },

  vocabularyItem: {
    versions: {
      table: knosiaVocabularyVersion,
      fk: "itemId",
      label: "versions",
      displayField: "version",
    },
    mismatchReports: {
      table: knosiaMismatchReport,
      fk: "itemId",
      label: "mismatch reports",
      displayField: "issueType",
    },
  },

  thread: {
    messages: {
      table: knosiaThreadMessage,
      fk: "threadId",
      label: "messages",
      displayField: "intent",
    },
    snapshots: {
      table: knosiaThreadSnapshot,
      fk: "threadId",
      label: "snapshots",
      displayField: "name",
    },
  },

  canvas: {
    versions: {
      table: knosiaCanvasVersion,
      fk: "canvasId",
      label: "versions",
      displayField: "versionNumber",
    },
  },
} as const satisfies Record<string, Record<string, CascadeRelation>>;

export type ResourceType = keyof typeof CASCADE_REGISTRY;
