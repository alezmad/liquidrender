import { redirect } from "next/navigation";

import { getTranslation } from "@turbostarter/i18n/server";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import {
  DashboardHeader,
  DashboardHeaderDescription,
  DashboardHeaderTitle,
} from "~/modules/common/layout/dashboard/header";
import { DataHealthView } from "~/modules/knosia/data-health";

export const generateMetadata = getMetadata({
  title: "Data Health",
  description: "Monitor data quality and table freshness",
});

export default async function DataHealthPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  const { t } = await getTranslation({ ns: "dashboard" });

  return (
    <div className="px-4 lg:px-6">
      <DashboardHeader>
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <DashboardHeaderTitle>
            {t("dataHealth.title", "Data Health")}
          </DashboardHeaderTitle>
          <DashboardHeaderDescription>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {t(
              "dataHealth.description",
              "Monitor data quality and table freshness"
            )}
          </DashboardHeaderDescription>
        </div>
      </DashboardHeader>

      <div className="py-6">
        <DataHealthView />
      </div>
    </div>
  );
}
