"use client";

import { useState, useCallback } from "react";

import { cn } from "@turbostarter/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@turbostarter/ui-web/card";
import { ScrollAreaWithShadows } from "@turbostarter/ui-web/scroll-area";

import type {
  ExtractionResult,
  ConfirmationAnswers,
  SaveVocabularyData,
} from "../types";
import { ConfirmStep } from "./steps/confirm-step";
import { ConnectStep } from "./steps/connect-step";
import { ReviewStep } from "./steps/review-step";
import { SaveStep } from "./steps/save-step";

import type { ConnectionData as ConnectStepConnectionData } from "./steps/connect-step";
import type { ReviewedVocabulary } from "./steps/review-step";

type WizardStep = "connect" | "review" | "confirm" | "save";

interface WizardState {
  currentStep: WizardStep;
  connection?: ConnectStepConnectionData;
  extraction?: ExtractionResult;
  reviewed?: ReviewedVocabulary;
  answers?: ConfirmationAnswers;
}

interface ErrorResponse {
  error?: string;
}

interface VocabularyCreateResponse {
  id: string;
}

const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: "connect", label: "Connect", description: "Enter your database connection details. Credentials are encrypted." },
  { id: "review", label: "Review", description: "Review and customize detected entities, metrics, and dimensions." },
  { id: "confirm", label: "Confirm", description: "Answer a few questions to improve accuracy." },
  { id: "save", label: "Save", description: "Name your vocabulary and save it." },
];

interface VocabularyWizardProps {
  onComplete?: (vocabularyId: string) => void;
}

export function VocabularyWizard({ onComplete }: VocabularyWizardProps) {
  const [state, setState] = useState<WizardState>({
    currentStep: "connect",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.id === state.currentStep);
  const currentStep = STEPS[currentStepIndex];

  const handleConnect = useCallback(
    async (connection: ConnectStepConnectionData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/vocabulary/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionString: connection.connectionString,
            databaseType: connection.databaseType,
            schemaName: connection.schemaName,
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as ErrorResponse;
          throw new Error(data.error ?? "Failed to extract schema");
        }

        const extraction = (await response.json()) as ExtractionResult;

        setState((prev) => ({
          ...prev,
          connection,
          extraction,
          currentStep: "review",
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleReview = useCallback((reviewed: ReviewedVocabulary) => {
    setState((prev) => ({
      ...prev,
      reviewed,
      currentStep: prev.extraction?.confirmations?.length ? "confirm" : "save",
    }));
  }, []);

  const handleConfirm = useCallback((answers: ConfirmationAnswers) => {
    setState((prev) => ({
      ...prev,
      answers,
      currentStep: "save",
    }));
  }, []);

  const handleSave = useCallback(
    async (data: SaveVocabularyData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            databaseType: state.connection?.databaseType,
            connectionName: state.connection?.connectionName,
            schemaName: state.connection?.schemaName,
            schemaInfo: state.extraction?.schemaInfo,
            vocabulary: state.reviewed ?? state.extraction?.detected,
            confirmationAnswers: state.answers,
          }),
        });

        if (!response.ok) {
          const responseData = (await response.json()) as ErrorResponse;
          throw new Error(responseData.error ?? "Failed to save vocabulary");
        }

        const vocabulary = (await response.json()) as VocabularyCreateResponse;
        onComplete?.(vocabulary.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setIsLoading(false);
      }
    },
    [state, onComplete]
  );

  const handleBack = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEPS.findIndex((s) => s.id === prev.currentStep);
      if (currentIndex <= 0) return prev;
      const previousStep = STEPS[currentIndex - 1];
      return previousStep ? { ...prev, currentStep: previousStep.id } : prev;
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center justify-center space-x-4">
          {STEPS.map((step, index) => (
            <li key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center",
                  index < currentStepIndex && "text-primary",
                  index === currentStepIndex && "text-primary font-medium",
                  index > currentStepIndex && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm",
                    index < currentStepIndex &&
                      "border-primary bg-primary text-primary-foreground",
                    index === currentStepIndex && "border-primary",
                    index > currentStepIndex && "border-muted"
                  )}
                >
                  {index < currentStepIndex ? "✓" : index + 1}
                </span>
                <span className="ml-2 hidden sm:inline">{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "ml-4 h-0.5 w-12",
                    index < currentStepIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStep?.label}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {currentStep?.description}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollAreaWithShadows className="px-6 pb-6">
            {state.currentStep === "connect" && (
              <ConnectStep onNext={handleConnect} isLoading={isLoading} />
            )}

            {state.currentStep === "review" && state.extraction && (
              <ReviewStep
                detected={state.extraction.detected}
                onNext={handleReview}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}

            {state.currentStep === "confirm" && state.extraction && (
              <ConfirmStep
                confirmations={state.extraction.confirmations}
                onNext={handleConfirm}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}

            {state.currentStep === "save" && state.extraction && (
              <SaveStep
                stats={state.extraction.stats}
                onSave={handleSave}
                onBack={handleBack}
                isLoading={isLoading}
                isSaving={isLoading}
              />
            )}
          </ScrollAreaWithShadows>
        </CardContent>
      </Card>
    </div>
  );
}
