"use client";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Alert, AlertDescription, AlertTitle } from "@turbostarter/ui-web/alert";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

import type { ConnectionTestResult } from "../../types";

interface ConnectionTestProps {
  result: ConnectionTestResult | null;
  isLoading: boolean;
  onRetry: () => void;
  onCopyError?: () => void;
}

/**
 * Displays connection test result with success/error UI.
 */
export function ConnectionTest({
  result,
  isLoading,
  onRetry,
  onCopyError,
}: ConnectionTestProps) {
  const { t } = useTranslation("knosia");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          Testing connection...
        </p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  if (result.success) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <Icons.CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Connection successful
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          {result.message ?? "Successfully connected to your database."}
          {result.latencyMs && (
            <span className="ml-2 text-xs opacity-75">
              ({result.latencyMs}ms)
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <Icons.XCircle className="h-4 w-4" />
        <AlertTitle>{t("onboarding.connect.error.title")}</AlertTitle>
        <AlertDescription>
          {result.error?.message ?? "Failed to connect to database."}
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <h4 className="text-sm font-medium text-foreground">
          {t("onboarding.connect.error.checkHost")}
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground" />
            {t("onboarding.connect.error.checkHost")}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground" />
            {t("onboarding.connect.error.checkCredentials")}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground" />
            {t("onboarding.connect.error.checkAccess")}
          </li>
        </ul>

        {result.error?.details && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              {t("onboarding.connect.error.technicalDetails")}
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
              {result.error.details}
            </pre>
          </details>
        )}
      </div>

      <div className="flex gap-3">
        {onCopyError && result.error && (
          <Button variant="outline" size="sm" onClick={onCopyError}>
            <Icons.Copy className="mr-2 h-3 w-3" />
            {t("onboarding.connect.error.copyForIT")}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("onboarding.connect.error.tryAgain")}
        </Button>
      </div>
    </div>
  );
}
