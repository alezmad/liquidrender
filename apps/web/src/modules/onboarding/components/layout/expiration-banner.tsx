"use client";

import { AlertTriangle, Clock, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@turbostarter/ui-web/alert";
import { Button } from "@turbostarter/ui-web/button";
import { cn } from "@turbostarter/ui";

import { useTranslation } from "@turbostarter/i18n";
import { useKnosiaOrg } from "../../hooks/use-knosia-org";
import { pathsConfig } from "~/config/paths";

interface ExpirationBannerProps {
  className?: string;
}

/**
 * Shows a warning banner when guest workspace is nearing expiration.
 * Displays different messages based on time remaining.
 */
export function ExpirationBanner({ className }: ExpirationBannerProps) {
  const { t } = useTranslation("knosia");
  const { isGuest, expiration, isLoading } = useKnosiaOrg();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if:
  // - Still loading
  // - Not a guest
  // - No warning needed
  // - Dismissed by user
  if (isLoading || !isGuest || !expiration.showWarning || dismissed) {
    return null;
  }

  // Determine the message based on expiration state
  const getMessage = () => {
    if (expiration.isExpired) {
      return t("guest.warning.expired");
    }
    if (expiration.daysRemaining !== null && expiration.daysRemaining >= 1) {
      return t("guest.warning.expiring", { days: expiration.daysRemaining });
    }
    if (expiration.hoursRemaining !== null) {
      return t("guest.warning.expiringHours", { hours: expiration.hoursRemaining });
    }
    return t("guest.warning.expiring", { days: 1 });
  };

  const isUrgent = expiration.isExpired || (expiration.hoursRemaining !== null && expiration.hoursRemaining < 24);

  return (
    <Alert
      variant="destructive"
      className={cn(
        "relative border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        isUrgent && "border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-100",
        className
      )}
    >
      {isUrgent ? (
        <AlertTriangle className="size-4" />
      ) : (
        <Clock className="size-4" />
      )}
      <AlertTitle className="flex items-center justify-between">
        <span>{getMessage()}</span>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 size-6 p-0 opacity-70 hover:opacity-100"
          onClick={() => setDismissed(true)}
        >
          <X className="size-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm opacity-90">
          {t("guest.warning.description")}
        </span>
        <Button
          asChild
          size="sm"
          variant={isUrgent ? "destructive" : "outline"}
          className="shrink-0"
        >
          <Link href={pathsConfig.auth.register}>
            {t("guest.warning.signUp")}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
