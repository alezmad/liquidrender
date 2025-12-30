"use client";

import { useState } from "react";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";
import { Input } from "@turbostarter/ui-web/input";

import type { AskInputProps } from "../types";

/**
 * Ask input component for quick query submission.
 * Displays an input field with optional suggested questions as clickable chips.
 */
export function AskInput({
  placeholder,
  suggestedQuestions,
  className,
  onSubmit,
}: AskInputProps) {
  const { t } = useTranslation("knosia");
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSubmit) {
      onSubmit(query.trim());
      setQuery("");
    }
  };

  const handleSuggestedClick = (question: string) => {
    if (onSubmit) {
      onSubmit(question);
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder ?? t("briefing.askPlaceholder")}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!query.trim()}
            aria-label="Submit question"
          >
            <Icons.ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {suggestedQuestions && suggestedQuestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t("conversation.try")}
            </span>
            {suggestedQuestions.map((question) => (
              <Button
                key={question}
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => handleSuggestedClick(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
