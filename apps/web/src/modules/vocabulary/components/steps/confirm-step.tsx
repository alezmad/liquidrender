"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { memo, useState, useMemo, useCallback } from "react";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@turbostarter/ui-web/card";
import { Icons } from "@turbostarter/ui-web/icons";
import { Input } from "@turbostarter/ui-web/input";
import { Label } from "@turbostarter/ui-web/label";

import type { Confirmation } from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface ConfirmStepProps {
  readonly confirmations: Confirmation[];
  readonly onNext: (answers: Record<string, string | string[]>) => void;
  readonly onBack: () => void;
  readonly isLoading?: boolean;
}

// ============================================================================
// RadioGroup Components (inline shadcn/ui pattern)
// ============================================================================

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <Icons.Circle className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

// ============================================================================
// Question Card Component
// ============================================================================

interface QuestionCardProps {
  readonly confirmation: Confirmation;
  readonly index: number;
  readonly total: number;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly isActive: boolean;
}

const QuestionCard = memo<QuestionCardProps>(
  ({ confirmation, index, total, value, onChange, isActive }) => {
    return (
      <Card
        className={cn(
          "transition-all duration-200",
          isActive
            ? "border-primary/50 shadow-md"
            : "border-border opacity-80"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Question {index + 1} of {total}
            </span>
            {value && (
              <span className="bg-success/10 text-success flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                <Icons.Check className="size-3" />
                Answered
              </span>
            )}
          </div>
          <CardTitle className="text-lg">{confirmation.question}</CardTitle>
          {confirmation.context && (
            <CardDescription className="text-muted-foreground text-sm">
              {confirmation.context}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {confirmation.type === "select_one" && (
            <RadioGroup value={value} onValueChange={onChange}>
              {confirmation.options?.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-3 rounded-md border p-3 transition-colors",
                    value === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`${confirmation.id}-${option.value}`}
                  />
                  <Label
                    htmlFor={`${confirmation.id}-${option.value}`}
                    className="flex flex-1 cursor-pointer items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {option.recommended && (
                      <span className="bg-primary/10 text-primary ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
                        Recommended
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {confirmation.type === "rename" && (
            <div className="space-y-3">
              <div className="bg-muted/50 flex items-center gap-2 rounded-md border p-3">
                <span className="text-muted-foreground text-sm">
                  Current value:
                </span>
                <code className="bg-background rounded px-2 py-0.5 text-sm font-mono">
                  {confirmation.currentValue}
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${confirmation.id}-rename`}>
                  New display name
                </Label>
                <Input
                  id={`${confirmation.id}-rename`}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={
                    confirmation.suggestion || confirmation.currentValue
                  }
                  className="w-full"
                />
                {confirmation.suggestion && value !== confirmation.suggestion && (
                  <button
                    type="button"
                    onClick={() => onChange(confirmation.suggestion!)}
                    className="text-primary text-xs hover:underline"
                  >
                    Use suggestion: {confirmation.suggestion}
                  </button>
                )}
              </div>
            </div>
          )}

          {confirmation.type === "classify" && (
            <RadioGroup value={value} onValueChange={onChange}>
              {confirmation.options?.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-3 rounded-md border p-3 transition-colors",
                    value === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`${confirmation.id}-${option.value}`}
                  />
                  <Label
                    htmlFor={`${confirmation.id}-${option.value}`}
                    className="flex flex-1 cursor-pointer items-center gap-2"
                  >
                    {option.value === "metric" && (
                      <Icons.TrendingUp className="text-primary size-4" />
                    )}
                    {option.value === "dimension" && (
                      <Icons.Filter className="text-primary size-4" />
                    )}
                    {option.value === "skip" && (
                      <Icons.Minus className="text-muted-foreground size-4" />
                    )}
                    <span>{option.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>
    );
  }
);

QuestionCard.displayName = "QuestionCard";

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  readonly current: number;
  readonly total: number;
  readonly answered: number;
}

const ProgressBar = memo<ProgressBarProps>(({ current, total, answered }) => {
  const percentage = total > 0 ? (answered / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {answered} of {total} answered
        </span>
        <span className="text-muted-foreground">{Math.round(percentage)}%</span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";

// ============================================================================
// Main Component
// ============================================================================

export const ConfirmStep = memo<ConfirmStepProps>(
  ({ confirmations, onNext, onBack, isLoading = false }) => {
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
      // Initialize with suggested values for rename questions
      const initial: Record<string, string> = {};
      confirmations.forEach((c) => {
        if (c.type === "rename" && c.suggestion) {
          initial[c.id] = c.suggestion;
        }
        // Set recommended options as default for select_one
        if (c.type === "select_one") {
          const recommended = c.options?.find((o) => o.recommended);
          if (recommended) {
            initial[c.id] = recommended.value;
          }
        }
        // classify type doesn't have recommended, no default needed
      });
      return initial;
    });

    const [activeIndex, setActiveIndex] = useState(0);

    const handleAnswerChange = useCallback((id: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [id]: value }));
    }, []);

    const answeredCount = useMemo(
      () =>
        confirmations.filter((c) => {
          const answer = answers[c.id];
          return answer !== undefined && answer !== "";
        }).length,
      [confirmations, answers]
    );

    const allAnswered = answeredCount === confirmations.length;

    const handleNext = useCallback(() => {
      if (allAnswered) {
        onNext(answers);
      }
    }, [allAnswered, answers, onNext]);

    const handleQuestionClick = useCallback((index: number) => {
      setActiveIndex(index);
    }, []);

    // Empty state
    if (confirmations.length === 0) {
      return (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="bg-success/10 flex h-16 w-16 items-center justify-center rounded-full">
                <Icons.CheckCircle2
                  className="text-success h-8 w-8"
                  strokeWidth={1.5}
                />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Confirmations Needed</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  All vocabulary items were detected with high confidence.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
            >
              <Icons.ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <Button type="button" onClick={handleNext} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue
                  <Icons.ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold">Quick Questions</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Answer {confirmations.length} question
            {confirmations.length !== 1 ? "s" : ""} to finalize your vocabulary
          </p>
        </div>

        {/* Progress */}
        <ProgressBar
          current={activeIndex + 1}
          total={confirmations.length}
          answered={answeredCount}
        />

        {/* Question Navigation Dots */}
        <div className="flex items-center justify-center gap-2">
          {confirmations.map((confirmation, index) => {
            const isAnswered =
              answers[confirmation.id] !== undefined &&
              answers[confirmation.id] !== "";
            return (
              <button
                key={confirmation.id}
                type="button"
                onClick={() => handleQuestionClick(index)}
                className={cn(
                  "size-3 rounded-full transition-all",
                  index === activeIndex
                    ? "bg-primary scale-125"
                    : isAnswered
                      ? "bg-success"
                      : "bg-muted hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to question ${index + 1}`}
              />
            );
          })}
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {confirmations.map((confirmation, index) => (
            <QuestionCard
              key={confirmation.id}
              confirmation={confirmation}
              index={index}
              total={confirmations.length}
              value={answers[confirmation.id] || ""}
              onChange={(value) => handleAnswerChange(confirmation.id, value)}
              isActive={index === activeIndex}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            <Icons.ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!allAnswered || isLoading}
          >
            {isLoading ? (
              <>
                <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {allAnswered ? "Continue to Save" : `${answeredCount}/${confirmations.length} Answered`}
                {allAnswered && <Icons.ArrowRight className="ml-2 size-4" />}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }
);

ConfirmStep.displayName = "ConfirmStep";
