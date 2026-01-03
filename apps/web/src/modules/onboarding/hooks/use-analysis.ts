"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import type {
  AnalysisProgress,
  AnalysisResult,
  AnalysisSSEEvent,
  AnalysisStep,
  StepEvent,
  CompleteEvent,
  BackgroundEnrichmentEvent,
  ErrorEvent,
} from "../types";

/** Initial analysis steps (8 steps including data profiling) */
const INITIAL_STEPS: AnalysisStep[] = [
  { id: 1, label: "Connecting to database", status: "pending" },
  { id: 2, label: "Scanning schema", status: "pending" },
  { id: 3, label: "Detecting business type", status: "pending" },
  { id: 4, label: "Classifying fields", status: "pending" },
  { id: 5, label: "Quick vocabulary preview", status: "pending" },
  { id: 6, label: "Profiling data quality", status: "pending" },
  { id: 7, label: "Assessing freshness", status: "pending" },
  { id: 8, label: "Finalizing insights", status: "pending" },
];

interface UseAnalysisOptions {
  onComplete?: (result: AnalysisResult) => void;
  onError?: (error: { code: string; message: string; recoverable: boolean }) => void;
}

interface UseAnalysisReturn {
  /** Start analysis for a connection */
  startAnalysis: (connectionId: string, workspaceId?: string | null) => void;
  /** Stop the current analysis */
  stopAnalysis: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Current analysis progress */
  progress: AnalysisProgress;
  /** Analysis result (only available when complete) */
  result: AnalysisResult | null;
  /** Whether analysis is currently running */
  isRunning: boolean;
}

/**
 * Hook to subscribe to analysis SSE stream.
 * Manages progress state and handles SSE events.
 */
export function useAnalysis(options: UseAnalysisOptions = {}): UseAnalysisReturn {
  const { onComplete, onError } = options;

  const [progress, setProgress] = useState<AnalysisProgress>({
    steps: INITIAL_STEPS,
    currentStep: 0,
    isComplete: false,
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** Handle step event from SSE */
  const handleStepEvent = useCallback((event: StepEvent) => {
    setProgress((prev) => {
      const newSteps = prev.steps.map((step) => {
        if (step.id === event.step) {
          return {
            ...step,
            status: event.status === "completed" ? "completed" : "active",
            label: event.label,
            detail: event.detail,
          } as AnalysisStep;
        }
        // Mark previous steps as completed
        if (step.id < event.step) {
          return { ...step, status: "completed" } as AnalysisStep;
        }
        return step;
      });

      return {
        ...prev,
        steps: newSteps,
        currentStep: event.step,
      };
    });
  }, []);

  /** Handle complete event from SSE */
  const handleCompleteEvent = useCallback(
    (event: CompleteEvent) => {
      const analysisResult: AnalysisResult = {
        analysisId: event.analysisId,
        summary: event.summary,
        businessType: event.businessType,
        confirmations: event.confirmations as AnalysisResult["confirmations"],
        profiling: event.profiling,
        quickPreviewComplete: event.quickPreviewComplete,
        backgroundEnrichmentPending: event.backgroundEnrichmentPending,
      };

      setResult(analysisResult);
      setProgress((prev) => ({
        ...prev,
        steps: prev.steps.map((step) => ({ ...step, status: "completed" as const })),
        isComplete: true,
      }));
      setIsRunning(false);

      onComplete?.(analysisResult);
    },
    [onComplete]
  );

  /** Handle error event from SSE */
  const handleErrorEvent = useCallback(
    (event: ErrorEvent) => {
      setProgress((prev) => ({
        ...prev,
        error: {
          code: event.code,
          message: event.message,
          recoverable: event.recoverable,
        },
      }));
      setIsRunning(false);

      onError?.(event);
    },
    [onError]
  );

  /** Start analysis for a connection */
  const startAnalysis = useCallback(
    (connectionId: string, workspaceId?: string | null) => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Reset state
      setProgress({
        steps: INITIAL_STEPS,
        currentStep: 0,
        isComplete: false,
      });
      setResult(null);
      setIsRunning(true);

      // Create SSE connection
      const params = new URLSearchParams({ connectionId });
      if (workspaceId) {
        params.set("workspaceId", workspaceId);
      }
      const url = `/api/knosia/analysis/run?${params.toString()}`;
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      // Safety timeout: close EventSource after 2 minutes max
      timeoutRef.current = setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          console.log("[useAnalysis] Closing EventSource after timeout (2 minutes)");
          eventSource.close();
          eventSourceRef.current = null;
        }
      }, 120000); // 2 minutes

      // Handle SSE events
      eventSource.addEventListener("step", (e) => {
        try {
          const data = JSON.parse(e.data) as StepEvent;
          handleStepEvent(data);
        } catch (err) {
          console.error("[useAnalysis] Failed to parse step event:", err);
        }
      });

      eventSource.addEventListener("complete", (e) => {
        try {
          const data = JSON.parse(e.data) as CompleteEvent;
          handleCompleteEvent(data);
          eventSource.close();
        } catch (err) {
          console.error("[useAnalysis] Failed to parse complete event:", err);
        }
      });

      eventSource.addEventListener("background_complete", (e) => {
        try {
          const data = JSON.parse(e.data) as BackgroundEnrichmentEvent;

          // Show toast notification
          toast.success(
            `🎉 Enrichment Complete! ${data.totalFieldsEnriched} fields now have detailed descriptions and business context.`
          );

          console.log("[useAnalysis] Background enrichment complete:", data);

          // Close EventSource - background enrichment is done
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          eventSource.close();
          eventSourceRef.current = null;
        } catch (err) {
          console.error("[useAnalysis] Failed to parse background_complete event:", err);
        }
      });

      eventSource.addEventListener("error", (e) => {
        // Check if it's an SSE error event with data
        if (e instanceof MessageEvent && e.data) {
          try {
            const data = JSON.parse(e.data) as ErrorEvent;
            handleErrorEvent(data);
          } catch (err) {
            console.error("[useAnalysis] Failed to parse error event:", err);
          }
        } else {
          // Connection error
          handleErrorEvent({
            code: "CONNECTION_ERROR",
            message: "Lost connection to analysis server",
            recoverable: true,
          });
        }
        eventSource.close();
      });

      eventSource.onerror = () => {
        // Only handle if still running (not closed intentionally)
        if (isRunning && eventSourceRef.current === eventSource) {
          handleErrorEvent({
            code: "STREAM_ERROR",
            message: "Analysis stream disconnected unexpectedly",
            recoverable: true,
          });
          eventSource.close();
        }
      };
    },
    [handleStepEvent, handleCompleteEvent, handleErrorEvent, isRunning]
  );

  /** Stop the current analysis */
  const stopAnalysis = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRunning(false);
  }, []);

  /** Reset to initial state */
  const reset = useCallback(() => {
    stopAnalysis();
    setProgress({
      steps: INITIAL_STEPS,
      currentStep: 0,
      isComplete: false,
    });
    setResult(null);
  }, [stopAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    startAnalysis,
    stopAnalysis,
    reset,
    progress,
    result,
    isRunning,
  };
}
