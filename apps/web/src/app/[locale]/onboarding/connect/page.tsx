"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import { useTranslation } from "@turbostarter/i18n";
import { Icons } from "@turbostarter/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import {
  DatabaseSelector,
  ConnectionForm,
  ConnectionTest,
  useConnectionTest,
  useCreateConnection,
  useOnboardingState,
  useKnosiaOrg,
  toConnectionTestResult,
} from "~/modules/onboarding";

import type { ConnectionType, ConnectionFormValues, ConnectionTestResult } from "~/modules/onboarding";

type Step = "select" | "form";

/**
 * Connect page - database selection and connection form.
 */
export default function ConnectPage() {
  const router = useRouter();
  const { t } = useTranslation("knosia");

  const [step, setStep] = useState<Step>("select");
  const [selectedDatabase, setSelectedDatabase] = useState<ConnectionType | undefined>(undefined);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const { setConnectionId, progress } = useOnboardingState();
  const { orgId, isLoading: isOrgLoading } = useKnosiaOrg();

  const connectionTest = useConnectionTest();
  const createConnection = useCreateConnection();

  const handleDatabaseSelect = useCallback((type: ConnectionType) => {
    setSelectedDatabase(type);
    setTestResult(null);
    setStep("form");
  }, []);

  const handleBack = useCallback(() => {
    setStep("select");
    setSelectedDatabase(undefined);
    setTestResult(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: ConnectionFormValues) => {
      setTestResult(null);

      try {
        const result = await connectionTest.mutateAsync(values);
        const testRes = toConnectionTestResult(result);
        setTestResult(testRes);

        if (testRes.success && orgId) {
          // Create the connection and proceed
          // Generate a name from the database type and host
          const connectionName = `${values.type} - ${values.host}`;
          const connection = await createConnection.mutateAsync({
            ...values,
            name: connectionName,
            orgId,
          });
          setConnectionId(connection.id);
          router.push(pathsConfig.onboarding.review);
        }
      } catch (error) {
        setTestResult({
          success: false,
          error: {
            code: "CONNECTION_ERROR",
            message: error instanceof Error ? error.message : "Connection test failed",
          },
        });
      }
    },
    [connectionTest, createConnection, setConnectionId, router, orgId]
  );

  const handleRetry = useCallback(() => {
    setTestResult(null);
  }, []);

  const isLoading = connectionTest.isPending || createConnection.isPending || isOrgLoading;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("onboarding.connect.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("onboarding.connect.description")}
        </p>
      </div>

      {step === "select" && (
        <DatabaseSelector
          onSelect={handleDatabaseSelect}
          selectedType={selectedDatabase}
        />
      )}

      {step === "form" && selectedDatabase && (
        <div className="space-y-6">
          <ConnectionForm
            databaseType={selectedDatabase}
            onSubmit={handleFormSubmit}
            onBack={handleBack}
            isLoading={isLoading}
          />

          <ConnectionTest
            result={testResult}
            isLoading={connectionTest.isPending}
            onRetry={handleRetry}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Icons.Lock className="h-3 w-3" />
        <span>{t("onboarding.connect.security")}</span>
      </div>
    </div>
  );
}
