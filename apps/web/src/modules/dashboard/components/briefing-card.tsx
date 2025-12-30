"use client";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Card, CardContent } from "@turbostarter/ui-web/card";

import type { BriefingCardProps } from "../types";

/**
 * Displays greeting and data freshness timestamp.
 * Top card on the briefing dashboard.
 */
export function BriefingCard({
  greeting,
  dataThrough,
  className,
}: BriefingCardProps) {
  const { t } = useTranslation("knosia");

  return (
    <Card className={cn("border-0 bg-transparent shadow-none", className)}>
      <CardContent className="p-0">
        <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("briefing.dataThrough", { date: dataThrough })}
        </p>
      </CardContent>
    </Card>
  );
}
