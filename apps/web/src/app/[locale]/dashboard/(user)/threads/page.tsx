import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { ThreadsListView } from "./threads-list-view";

export default async function ThreadsPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return <ThreadsListView />;
}
