import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { ThreadDetailView } from "./thread-detail-view";

interface ThreadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ThreadDetailPage({
  params,
}: ThreadDetailPageProps) {
  const { user } = await getSession();
  const { id } = await params;

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return <ThreadDetailView threadId={id} />;
}
