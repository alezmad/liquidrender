import { getTranslation } from "@turbostarter/i18n/server";

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
        <VocabularyPageContent workspaceId="default" />
      </div>
    </div>
  );
}
