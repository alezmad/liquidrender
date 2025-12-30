"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "@turbostarter/i18n";

import { pathsConfig } from "~/config/paths";
import { useOnboardingState } from "~/modules/onboarding";
import { ConfirmationCarousel } from "~/modules/onboarding/components/confirm";

import type { VocabularyConfirmation, ConfirmationAnswer } from "~/modules/onboarding";

/**
 * Default confirmation questions when analysis doesn't provide them.
 * These are common vocabulary confirmations for SaaS businesses.
 */
const DEFAULT_QUESTIONS: VocabularyConfirmation[] = [
  {
    id: "q1",
    question: "What does 'MRR' mean in your business?",
    category: "revenue",
    options: [
      { id: "mrr-monthly", label: "Monthly Recurring Revenue", isDefault: true },
      { id: "mrr-margin", label: "Monthly Revenue Rate" },
      { id: "mrr-other", label: "Something else" },
    ],
    currentValue: "MRR",
  },
  {
    id: "q2",
    question: "How do you define an 'Active User'?",
    category: "customers",
    options: [
      { id: "user-login", label: "Logged in within 30 days", isDefault: true },
      { id: "user-action", label: "Performed an action this week" },
      { id: "user-paid", label: "Has an active subscription" },
    ],
    currentValue: "active_user",
  },
  {
    id: "q3",
    question: "What's your primary revenue metric?",
    category: "revenue",
    options: [
      { id: "rev-arr", label: "ARR (Annual Recurring Revenue)", isDefault: true },
      { id: "rev-revenue", label: "Total Revenue" },
      { id: "rev-bookings", label: "Bookings" },
    ],
  },
  {
    id: "q4",
    question: "How do you measure churn?",
    category: "customers",
    options: [
      { id: "churn-monthly", label: "Monthly customer churn rate", isDefault: true },
      { id: "churn-revenue", label: "Revenue churn (MRR lost)" },
      { id: "churn-annual", label: "Annual churn" },
    ],
  },
  {
    id: "q5",
    question: "What's your fiscal year start?",
    category: "time",
    options: [
      { id: "fy-jan", label: "January 1st", isDefault: true },
      { id: "fy-apr", label: "April 1st" },
      { id: "fy-jul", label: "July 1st" },
      { id: "fy-oct", label: "October 1st" },
    ],
  },
  {
    id: "q6",
    question: "How do you segment customers?",
    category: "customers",
    options: [
      { id: "seg-tier", label: "By pricing tier (SMB/Enterprise)", isDefault: true },
      { id: "seg-industry", label: "By industry" },
      { id: "seg-region", label: "By region" },
    ],
  },
];

/**
 * Confirmation questions page.
 * User answers vocabulary confirmation questions to personalize the experience.
 */
export default function ConfirmPage() {
  const router = useRouter();
  const { t } = useTranslation("knosia");
  const { progress, setAnswer, completeStep, isHydrated } = useOnboardingState();

  // Use default questions for now (in production, fetch from analysis)
  const questions = useMemo(() => DEFAULT_QUESTIONS, []);

  // Redirect if no role selected (need to complete previous steps first)
  useEffect(() => {
    if (isHydrated && !progress.selectedRole) {
      router.push(pathsConfig.onboarding.role);
    }
  }, [isHydrated, progress.selectedRole, router]);

  const handleAnswer = useCallback(
    (answer: ConfirmationAnswer) => {
      setAnswer(answer);
    },
    [setAnswer]
  );

  const handleComplete = useCallback(() => {
    completeStep("confirm");
    router.push(pathsConfig.onboarding.ready);
  }, [completeStep, router]);

  const handleSkip = useCallback(() => {
    // Apply default answers
    questions.forEach((q) => {
      const defaultOption = q.options.find((o) => o.isDefault);
      if (defaultOption) {
        setAnswer({
          questionId: q.id,
          selectedOptionId: defaultOption.id,
        });
      }
    });

    toast.success(t("onboarding.confirm.skipToast"));
    completeStep("confirm");
    router.push(pathsConfig.onboarding.ready);
  }, [questions, setAnswer, completeStep, router, t]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ConfirmationCarousel
      questions={questions}
      answers={progress.answers}
      onAnswer={handleAnswer}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
