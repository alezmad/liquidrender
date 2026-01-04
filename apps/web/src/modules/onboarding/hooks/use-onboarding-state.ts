"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import type {
  OnboardingProgress,
  OnboardingStep,
  UserRole,
  ConfirmationAnswer,
} from "../types";

import {
  DEFAULT_ONBOARDING_PROGRESS,
  ONBOARDING_STORAGE_KEY,
} from "../types";

/**
 * Hook to manage onboarding state.
 * - Current step derived from URL path (source of truth)
 * - Progress persisted in localStorage for session continuity
 */
export function useOnboardingState() {
  const pathname = usePathname();

  // Derive current step from URL
  const step = deriveStepFromPath(pathname);

  // Progress state (synced with localStorage)
  const [progress, setProgress] = useState<OnboardingProgress>(DEFAULT_ONBOARDING_PROGRESS);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<OnboardingProgress>;
        // Merge with defaults to handle migration from old localStorage data
        const migratedProgress: OnboardingProgress = {
          ...DEFAULT_ONBOARDING_PROGRESS,
          ...parsed,
          // Ensure connectionIds exists (migrate from old single connectionId if needed)
          connectionIds: parsed.connectionIds ?? (parsed.connectionId ? [parsed.connectionId] : []),
          primaryConnectionId: parsed.primaryConnectionId ?? parsed.connectionId ?? null,
        };
        setProgress(migratedProgress);
      }
    } catch (err) {
      console.error("[useOnboardingState] Failed to load from localStorage:", err);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isHydrated) return;

    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.error("[useOnboardingState] Failed to save to localStorage:", err);
    }
  }, [progress, isHydrated]);

  /** Update connection ID (legacy single connection) */
  const setConnectionId = useCallback((connectionId: string | null) => {
    setProgress((prev) => ({ ...prev, connectionId }));
  }, []);

  /** Add a connection to the connectionIds array */
  const addConnection = useCallback((connectionId: string) => {
    setProgress((prev) => {
      const newIds = [...prev.connectionIds, connectionId];
      return {
        ...prev,
        connectionIds: newIds,
        // Always set new connection as primary and active during onboarding
        primaryConnectionId: connectionId,
        connectionId: connectionId,
        // Clear old analysis since we're using a new connection
        analysisId: null,
      };
    });
  }, []);

  /** Remove a connection from the connectionIds array */
  const removeConnection = useCallback((connectionId: string) => {
    setProgress((prev) => {
      const newIds = prev.connectionIds.filter((id) => id !== connectionId);
      const newPrimary = prev.primaryConnectionId === connectionId
        ? newIds[0] ?? null
        : prev.primaryConnectionId;
      return {
        ...prev,
        connectionIds: newIds,
        primaryConnectionId: newPrimary,
        connectionId: newPrimary,
      };
    });
  }, []);

  /** Set the primary connection */
  const setPrimaryConnection = useCallback((connectionId: string) => {
    setProgress((prev) => ({
      ...prev,
      primaryConnectionId: connectionId,
      connectionId: connectionId,
    }));
  }, []);

  /** Update analysis ID */
  const setAnalysisId = useCallback((analysisId: string | null) => {
    setProgress((prev) => ({ ...prev, analysisId }));
  }, []);

  /** Update workspace ID */
  const setWorkspaceId = useCallback((workspaceId: string | null) => {
    setProgress((prev) => ({ ...prev, workspaceId }));
  }, []);

  /** Update selected role */
  const setSelectedRole = useCallback((role: UserRole | null) => {
    setProgress((prev) => ({ ...prev, selectedRole: role }));
  }, []);

  /** Update selected metric IDs */
  const setSelectedMetricIds = useCallback((metricIds: string[]) => {
    setProgress((prev) => ({ ...prev, selectedMetricIds: metricIds }));
  }, []);

  /** Add or update an answer */
  const setAnswer = useCallback((answer: ConfirmationAnswer) => {
    setProgress((prev) => {
      const existingIndex = prev.answers.findIndex(
        (a) => a.questionId === answer.questionId
      );

      const newAnswers =
        existingIndex >= 0
          ? prev.answers.map((a, i) => (i === existingIndex ? answer : a))
          : [...prev.answers, answer];

      return { ...prev, answers: newAnswers };
    });
  }, []);

  /** Mark a step as completed */
  const completeStep = useCallback((completedStep: OnboardingStep) => {
    setProgress((prev) => {
      if (prev.completedSteps.includes(completedStep)) {
        return prev;
      }
      return {
        ...prev,
        completedSteps: [...prev.completedSteps, completedStep],
      };
    });
  }, []);

  /** Check if a step is completed */
  const isStepCompleted = useCallback(
    (checkStep: OnboardingStep) => {
      return progress.completedSteps.includes(checkStep);
    },
    [progress.completedSteps]
  );

  /** Reset all progress */
  const resetProgress = useCallback(() => {
    setProgress(DEFAULT_ONBOARDING_PROGRESS);
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (err) {
      console.error("[useOnboardingState] Failed to clear localStorage:", err);
    }
  }, []);

  /** Get progress summary for display */
  const getProgressSummary = useCallback(() => {
    return {
      hasConnection: !!progress.connectionId,
      hasAnalysis: !!progress.analysisId,
      hasRole: !!progress.selectedRole,
      answersCount: progress.answers.length,
      completedStepsCount: progress.completedSteps.length,
    };
  }, [progress]);

  // Computed values for multi-connection support
  const connectionCount = progress.connectionIds.length;
  const hasConnections = progress.connectionIds.length > 0;

  return {
    // Current step (from URL)
    step,

    // Progress data
    progress,
    isHydrated,

    // Multi-connection computed values
    connectionCount,
    hasConnections,

    // Setters
    setConnectionId,
    addConnection,
    removeConnection,
    setPrimaryConnection,
    setAnalysisId,
    setWorkspaceId,
    setSelectedRole,
    setSelectedMetricIds,
    setAnswer,
    completeStep,

    // Utilities
    isStepCompleted,
    resetProgress,
    getProgressSummary,
  };
}

/**
 * Derive onboarding step from URL path.
 */
function deriveStepFromPath(pathname: string): OnboardingStep {
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  const stepMap: Record<string, OnboardingStep> = {
    connect: "connect",
    review: "review",
    role: "role",
    confirm: "confirm",
    ready: "ready",
    onboarding: "connect", // Default for /onboarding
  };

  return stepMap[lastSegment ?? ""] ?? "connect";
}
