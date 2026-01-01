import { getTranslation } from "@turbostarter/i18n/server";

import { getMetadata } from "~/lib/metadata";
import {
  DashboardHeader,
  DashboardHeaderDescription,
  DashboardHeaderTitle,
} from "~/modules/common/layout/dashboard/header";
import { VocabularyWizard } from "~/modules/vocabulary";

export const generateMetadata = getMetadata({
  title: "Vocabulary",
  description: "Create and manage your data vocabulary",
});

export default async function VocabularyPage() {
  const { t } = await getTranslation({ ns: "dashboard" });

  return (
    <div className="px-4 lg:px-6">
      <DashboardHeader>
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <DashboardHeaderTitle>{t("vocabulary.title", "Vocabulary Builder")}</DashboardHeaderTitle>
          <DashboardHeaderDescription>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {t("vocabulary.description", "Connect your database and create a vocabulary for your data")}
          </DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="py-6">
        <VocabularyWizard />
      </div>
    </div>
  );
}
