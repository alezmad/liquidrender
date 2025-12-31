"use client";

// Section showing AI's current thinking/analysis

import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";

import type { ThinkingSectionProps } from "../types";

export function ThinkingSection({ content, isLoading }: ThinkingSectionProps) {
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Icons.Brain className="h-4 w-4 animate-pulse text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Analyzing your data...</span>
                <Icons.Loader2 className="h-3 w-3 animate-spin" />
              </div>
              <p className="text-xs text-muted-foreground">
                Looking for patterns and insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <Icons.Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium">Knosia is thinking</span>
              <Icons.Sparkles className="h-3 w-3 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
