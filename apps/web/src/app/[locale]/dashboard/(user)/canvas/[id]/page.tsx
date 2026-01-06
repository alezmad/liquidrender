import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { getSession } from "~/lib/auth/server";
import { CanvasDetailView } from "./canvas-detail-view";

interface CanvasDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CanvasDetailPage({
  params,
}: CanvasDetailPageProps) {
  const { user } = await getSession();
  const { id } = await params;

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  // Knosia org ID follows the pattern: user-{userId}
  const orgId = `user-${user.id}`;

  // Fetch user's connections to get workspace ID
  let workspaceId: string | undefined;

  try {
    const res = await api.knosia.connections.$get({
      query: { orgId },
    });

    if (res.ok) {
      const connectionsData = await res.json();
      if (connectionsData?.data && connectionsData.data.length > 0) {
        workspaceId = connectionsData.data[0]?.workspaceId;
      }
    }
  } catch (error) {
    console.error("[CanvasDetailPage] Failed to fetch connections:", error);
  }

  return <CanvasDetailView canvasId={id} workspaceId={workspaceId} />;
}
