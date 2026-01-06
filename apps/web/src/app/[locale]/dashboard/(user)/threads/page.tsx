import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Icons } from "@turbostarter/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { ThreadsListView } from "./threads-list-view";

export default async function ThreadsPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ThreadsListView />
    </Suspense>
  );
}
