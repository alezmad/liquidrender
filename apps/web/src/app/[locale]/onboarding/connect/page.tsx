"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

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
import { ConnectionSummary } from "~/modules/onboarding/components/connect/connection-summary";

import type { ConnectionType, ConnectionFormValues, ConnectionTestResult } from "~/modules/onboarding";

type Step = "select" | "form" | "summary";

/**
 * Connect page - database selection, connection form, and summary.
 *
 * Flow:
 * - If `?summary=true` and has connections → show ConnectionSummary
 * - Otherwise show database selector → form → summary
 */
export default function ConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation("knosia");

  const [step, setStep] = useState<Step>("select");
  const [selectedDatabase, setSelectedDatabase] = useState<ConnectionType | undefined>(undefined);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const { addConnection, hasConnections, isHydrated, setWorkspaceId } = useOnboardingState();
  const { orgId, isLoading: isOrgLoading } = useKnosiaOrg();

  // Check URL param and existing connections to determine initial step
  const showSummary = searchParams.get("summary") === "true";

  // Set step to summary if URL param is set and user has connections
  useEffect(() => {
    if (!isHydrated) return;

    if (showSummary && hasConnections) {
      setStep("summary");
    }
  }, [isHydrated, showSummary, hasConnections]);

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

        if (testRes.success) {
          if (!orgId) {
            // OrgId not loaded yet - show error
            setTestResult({
              success: false,
              error: {
                code: "ORG_NOT_LOADED",
                message: "Organization not loaded. Please refresh the page and try again.",
              },
            });
            return;
          }

          // Create the connection and proceed to summary
          // Generate a name from the database type and host
          const connectionName = `${values.type} - ${values.host}`;
          const connection = await createConnection.mutateAsync({
            ...values,
            name: connectionName,
            orgId,
          });

          // Add connection to multi-connection state
          addConnection(connection.id);

          // Store workspaceId from the connection response
          if (connection.workspaceId) {
            setWorkspaceId(connection.workspaceId);
          }

          // Go to summary step with URL param
          setStep("summary");
          router.replace(`${pathsConfig.onboarding.connect}?summary=true`);
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
    [connectionTest, createConnection, addConnection, router, orgId]
  );

  const handleRetry = useCallback(() => {
    setTestResult(null);
  }, []);

  const isLoading = connectionTest.isPending || createConnection.isPending || isOrgLoading;

  // Wait for hydration before rendering state-dependent UI
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Summary step: show ConnectionSummary component
  if (step === "summary") {
    return <ConnectionSummary />;
  }

  // Select and Form steps
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
