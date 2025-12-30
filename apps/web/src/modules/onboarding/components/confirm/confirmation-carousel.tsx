"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";

import { QuestionCard } from "./question-card";

import type { VocabularyConfirmation, ConfirmationAnswer } from "../../types";

interface ConfirmationCarouselProps {
  questions: VocabularyConfirmation[];
  answers: ConfirmationAnswer[];
  onAnswer: (answer: ConfirmationAnswer) => void;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Carousel for vocabulary confirmation questions.
 * Shows progress indicator and question cards.
 */
export function ConfirmationCarousel({
  questions,
  answers,
  onAnswer,
  onComplete,
  onSkip,
}: ConfirmationCarouselProps) {
  const { t } = useTranslation("knosia");
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id);
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      onComplete();
    } else {
      setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
    }
  }, [isLastQuestion, onComplete, questions.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  if (!currentQuestion) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold">{t("onboarding.confirm.title")}</h2>
        <p className="text-muted-foreground">No questions to confirm.</p>
        <Button onClick={onComplete}>Continue</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{t("onboarding.confirm.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("onboarding.confirm.subtitle")}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t("onboarding.confirm.questionOf", {
            current: currentIndex + 1,
            total: questions.length,
          })}
        </span>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          {t("onboarding.confirm.skipDefaults")}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <QuestionCard
        question={currentQuestion}
        currentAnswer={currentAnswer}
        onAnswer={onAnswer}
        onNext={handleNext}
        isLast={isLastQuestion}
      />

      {/* Navigation */}
      {currentIndex > 0 && (
        <Button variant="outline" onClick={handlePrevious} className="w-full">
          Previous
        </Button>
      )}
    </div>
  );
}
