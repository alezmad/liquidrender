"use client";

import { useState } from "react";
import { cn } from "@turbostarter/ui";
import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import { Badge } from "@turbostarter/ui-web/badge";

import type { VocabularyConfirmation, ConfirmationAnswer, ConfirmationCategory } from "../../types";

/** Category badge colors */
const categoryColors: Record<ConfirmationCategory, string> = {
  revenue: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  customers: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  time: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

interface QuestionCardProps {
  question: VocabularyConfirmation;
  currentAnswer?: ConfirmationAnswer;
  onAnswer: (answer: ConfirmationAnswer) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * Single question card with option selection.
 * Shows category badge, question text, and answer options.
 */
export function QuestionCard({
  question,
  currentAnswer,
  onAnswer,
  onNext,
  isLast,
}: QuestionCardProps) {
  const { t } = useTranslation("knosia");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleSelectOption = (optionId: string) => {
    if (optionId === "custom") {
      setShowCustomInput(true);
      return;
    }

    setShowCustomInput(false);
    onAnswer({
      questionId: question.id,
      selectedOptionId: optionId,
    });
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onAnswer({
        questionId: question.id,
        selectedOptionId: "custom",
        customValue: customValue.trim(),
      });
      setShowCustomInput(false);
    }
  };

  const selectedOptionId = currentAnswer?.selectedOptionId;
  const categoryLabel = t(`onboarding.confirm.categories.${question.category}`);

  return (
    <div className="space-y-6">
      {/* Category badge */}
      <Badge variant="secondary" className={cn("text-xs uppercase", categoryColors[question.category])}>
        {categoryLabel}
      </Badge>

      {/* Question */}
      <h3 className="text-xl font-medium">{question.question}</h3>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSelectOption(option.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all",
              "hover:border-primary/50 hover:bg-muted/50",
              selectedOptionId === option.id
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border bg-background"
            )}
          >
            <div>
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
              )}
            </div>
            {option.isDefault && (
              <Badge variant="outline" className="ml-2 shrink-0">
                {t("onboarding.confirm.suggested")}
              </Badge>
            )}
          </button>
        ))}

        {/* Something else option */}
        <button
          type="button"
          onClick={() => handleSelectOption("custom")}
          className={cn(
            "flex w-full items-center rounded-lg border p-4 text-left transition-all",
            "hover:border-primary/50 hover:bg-muted/50",
            showCustomInput || selectedOptionId === "custom"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border bg-background"
          )}
        >
          <span className="text-muted-foreground">{t("onboarding.confirm.somethingElse")}</span>
        </button>
      </div>

      {/* Custom input */}
      {showCustomInput && (
        <div className="flex gap-2">
          <Input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Enter your answer..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
            }}
          />
          <Button onClick={handleCustomSubmit} disabled={!customValue.trim()}>
            OK
          </Button>
        </div>
      )}

      {/* Next button */}
      <Button
        className="w-full"
        onClick={onNext}
        disabled={!selectedOptionId}
      >
        {isLast ? t("onboarding.confirm.seeDashboard") : "Next"}
      </Button>
    </div>
  );
}
