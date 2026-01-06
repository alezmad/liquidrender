import { redirect } from "next/navigation";

import { getTranslation } from "@turbostarter/i18n/server";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { getSession } from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import {
  DashboardHeader,
  DashboardHeaderDescription,
  DashboardHeaderTitle,
} from "~/modules/common/layout/dashboard/header";
import { VocabularyPageContent } from "~/modules/knosia/vocabulary";

export const generateMetadata = getMetadata({
  title: "Vocabulary",
  description: "Browse and manage your business vocabulary",
});

export default async function VocabularyPage() {
  const { t } = await getTranslation({ ns: "dashboard" });
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  // Knosia org ID follows the pattern: user-{userId}
  const orgId = `user-${user.id}`;

  // Fetch user's connections to get workspace ID and first connection
  let workspaceId: string | undefined;
  let connectionId: string | undefined;

  try {
    const res = await api.knosia.connections.$get({
      query: { orgId },
    });

    if (res.ok) {
      const connectionsData = await res.json();
      if (connectionsData?.data && connectionsData.data.length > 0) {
        workspaceId = connectionsData.data[0]?.workspaceId;
        connectionId = connectionsData.data[0]?.id;
      }
    }
  } catch (error) {
    console.error("[VocabularyPage] Failed to fetch connections:", error);
  }

  return (
    <div className="px-4 lg:px-6">
      <DashboardHeader>
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <DashboardHeaderTitle>{t("vocabulary.title", "Vocabulary")}</DashboardHeaderTitle>
          <DashboardHeaderDescription>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {t("vocabulary.description", "Browse and manage your business vocabulary")}
          </DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="py-6">
        {workspaceId ? (
          <VocabularyPageContent workspaceId={workspaceId} connectionId={connectionId} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No connections found. Add a database connection first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
