import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
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

  return <CanvasDetailView canvasId={id} />;
}
