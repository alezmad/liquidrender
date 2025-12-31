// Hook for fetching and managing brief data

import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

import type { Brief, BriefSection, BriefItem, Insight, Alert, KPI } from "../types";

interface UseBriefOptions {
  workspaceId: string;
  roleId?: string;
  enabled?: boolean;
}

interface UseBriefReturn {
  brief: Brief | undefined;
  sections: BriefSection[];
  insights: Insight[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Transform API Brief response into UI sections
 */
function transformToSections(brief: Brief): BriefSection[] {
  const sections: BriefSection[] = [];

  // Attention section from alerts
  if (brief.alerts.length > 0) {
    sections.push({
      type: "attention",
      title: "Needs Attention",
      items: brief.alerts.map((alert): BriefItem => ({
        id: alert.id,
        type: "alert",
        title: alert.title,
        description: alert.description,
        priority: alert.severity === "critical" ? "critical" : "high",
      })),
    });
  }

  // On track section from KPIs with positive status
  const onTrackKPIs = brief.kpis.filter(
    (kpi) => kpi.status === "normal" && kpi.change?.direction !== "down"
  );
  if (onTrackKPIs.length > 0) {
    sections.push({
      type: "on_track",
      title: "On Track",
      items: onTrackKPIs.map((kpi): BriefItem => ({
        id: kpi.id,
        type: "metric",
        title: kpi.label,
        value: kpi.value,
        change: kpi.change ? {
          direction: kpi.change.direction === "flat" ? "stable" : kpi.change.direction,
          value: parseFloat(kpi.change.value.replace(/[^0-9.-]/g, "")) || 0,
          period: kpi.change.comparison,
          isPositive: kpi.change.direction === "up",
        } : undefined,
      })),
    });
  }

  // Thinking section from insights
  if (brief.insights.length > 0) {
    sections.push({
      type: "thinking",
      title: "Insights",
      items: brief.insights.map((insight): BriefItem => ({
        id: insight.id,
        type: "insight",
        title: insight.title,
        description: insight.description,
      })),
    });
  }

  // Tasks section from suggested questions
  if (brief.suggestedQuestions.length > 0) {
    sections.push({
      type: "tasks",
      title: "Suggested Actions",
      items: brief.suggestedQuestions.map((question, idx): BriefItem => ({
        id: `task-${idx}`,
        type: "task",
        title: question,
        action: {
          label: "Ask",
        },
      })),
    });
  }

  return sections;
}

export function useBrief({
  workspaceId,
  roleId,
  enabled = true,
}: UseBriefOptions): UseBriefReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["knosia", "brief", workspaceId, roleId],
    queryFn: async () => {
      const res = await api.knosia.briefing.$get({
        query: {
          workspaceId,
          ...(roleId && { roleId }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch brief");
      return res.json();
    },
    enabled: enabled && !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Transform API response to Brief type
  const brief: Brief | undefined = data ? {
    greeting: data.greeting,
    dataThrough: data.dataThrough,
    kpis: data.kpis,
    alerts: data.alerts,
    insights: data.insights,
    suggestedQuestions: data.suggestedQuestions,
  } : undefined;

  return {
    brief,
    sections: brief ? transformToSections(brief) : [],
    insights: brief?.insights ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
