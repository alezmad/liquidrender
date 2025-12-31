"use client";

// Badge showing block trust/provenance information

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@turbostarter/ui-web/tooltip";
import { Icons } from "@turbostarter/ui-web/icons";

import type { BlockTrustBadgeProps, BlockProvenance, ConfidenceLevel } from "../types";

const provenanceConfig: Record<BlockProvenance, {
  label: string;
  icon: keyof typeof Icons;
  variant: "default" | "secondary" | "outline" | "destructive";
}> = {
  vocabulary: {
    label: "Verified",
    icon: "CheckCircle2",
    variant: "default",
  },
  derived: {
    label: "Derived",
    icon: "Link",
    variant: "secondary",
  },
  ai_generated: {
    label: "AI Generated",
    icon: "Sparkles",
    variant: "outline",
  },
  user_defined: {
    label: "Custom",
    icon: "User2",
    variant: "secondary",
  },
};

const confidenceColors: Record<ConfidenceLevel, string> = {
  high: "text-green-600",
  medium: "text-yellow-600",
  low: "text-red-600",
};

export function BlockTrustBadge({ trust, compact = false }: BlockTrustBadgeProps) {
  const config = provenanceConfig[trust.provenance];
  const Icon = Icons[config.icon];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={config.variant}
              className={cn(
                "cursor-help gap-1 px-1.5 py-0.5 text-xs",
                confidenceColors[trust.confidence]
              )}
            >
              <Icon className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">{config.label}</div>
              <div className="text-xs text-muted-foreground">
                Confidence: <span className="capitalize">{trust.confidence}</span>
              </div>
              {trust.vocabularyItemIds && trust.vocabularyItemIds.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Based on {trust.vocabularyItemIds.length} vocabulary item(s)
                </div>
              )}
              {trust.lastVerified && (
                <div className="text-xs text-muted-foreground">
                  Verified: {new Date(trust.lastVerified).toLocaleDateString()}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      <span className={cn("text-xs", confidenceColors[trust.confidence])}>
        {trust.confidence} confidence
      </span>
    </div>
  );
}
