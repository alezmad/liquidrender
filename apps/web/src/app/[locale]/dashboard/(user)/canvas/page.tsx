import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { CanvasListView } from "./canvas-list-view";

export default async function CanvasesPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return <CanvasListView />;
}
