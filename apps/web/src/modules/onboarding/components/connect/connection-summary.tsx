"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { pathsConfig } from "~/config/paths";
import { ConnectionSummaryCard } from "./connection-summary-card";
import { useOnboardingState } from "../../hooks/use-onboarding-state";
import { useConnectionSummaries } from "../../hooks/use-connection-summaries";
import { useKnosiaOrg } from "../../hooks/use-knosia-org";

export function ConnectionSummary() {
  const router = useRouter();
  const { t } = useTranslation("knosia");

  const { progress, removeConnection } = useOnboardingState();
  const { orgId } = useKnosiaOrg();
  const { data: connections, isLoading } = useConnectionSummaries(
    progress.connectionIds,
    orgId ?? ""
  );

  const handleAddAnother = () => {
    router.push(pathsConfig.onboarding.connect);
  };

  const handleContinue = () => {
    router.push(pathsConfig.onboarding.review);
  };

  const handleRemove = (connectionId: string) => {
    removeConnection(connectionId);
    if (progress.connectionIds.length <= 1) {
      router.push(pathsConfig.onboarding.connect);
    }
  };

  const totalTables = connections?.reduce((sum, c) => sum + c.tablesCount, 0) ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("onboarding.summary.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("onboarding.summary.description")}
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-4">
        <div className="space-y-3">
          {connections?.map((connection, index) => (
            <ConnectionSummaryCard
              key={connection.id}
              connection={connection}
              isPrimary={index === 0}
              onRemove={
                connections.length > 1
                  ? () => handleRemove(connection.id)
                  : undefined
              }
              compact={connections.length > 1}
            />
          ))}
        </div>

        <button
          onClick={handleAddAnother}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Icons.Plus className="h-5 w-5" />
          <span>{t("onboarding.summary.addAnother")}</span>
        </button>

        {connections && connections.length > 1 && (
          <p className="text-center text-sm text-muted-foreground">
            {connections.length} sources connected &bull; {totalTables} tables total
          </p>
        )}

        <div className="pt-4">
          <Button
            onClick={handleContinue}
            className="w-full"
            size="lg"
          >
            {t("onboarding.summary.continue")}
            <Icons.ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("onboarding.summary.addLater")}
        </p>
      </div>
    </div>
  );
}
