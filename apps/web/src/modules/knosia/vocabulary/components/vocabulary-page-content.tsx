"use client";

// Vocabulary Page Content - Main content with tabs for All, KPIs, Measures, Dimensions, Entities

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@turbostarter/ui-web/tabs";
import { Icons } from "@turbostarter/ui-web/icons";
import { Badge } from "@turbostarter/ui-web/badge";

import { VocabularyBrowser } from "./vocabulary-browser";
import { useVocabulary } from "../hooks/use-vocabulary";

// ============================================================================
// TYPES
// ============================================================================

interface VocabularyPageContentProps {
  /** Workspace ID */
  workspaceId: string;
  /** Connection ID for fetching metrics */
  connectionId?: string;
  /** Initial active tab */
  initialTab?: "all" | "kpis" | "measures" | "dimensions" | "entities";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VocabularyPageContent({
  workspaceId,
  // connectionId reserved for future KPI execution features
  initialTab = "all",
}: VocabularyPageContentProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Fetch vocabulary to get counts
  const { counts, isLoading } = useVocabulary({ workspaceId });

  // Use counts from API (includes all types regardless of limit)
  const kpiCount = counts.kpi;
  const measureCount = counts.measure + counts.metric; // Include legacy "metric" type
  const dimensionCount = counts.dimension;
  const entityCount = counts.entity;
  const totalCount = counts.all;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="all" className="gap-2">
          <Icons.BookOpen className="h-4 w-4" />
          All
          {!isLoading && totalCount > 0 && <Badge variant="secondary" className="ml-1">{totalCount}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="kpis" className="gap-2">
          <Icons.Target className="h-4 w-4" />
          KPIs
          {!isLoading && kpiCount > 0 && <Badge variant="secondary" className="ml-1">{kpiCount}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="measures" className="gap-2">
          <Icons.BarChart3 className="h-4 w-4" />
          Measures
          {!isLoading && measureCount > 0 && <Badge variant="secondary" className="ml-1">{measureCount}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="dimensions" className="gap-2">
          <Icons.ChartNoAxesGantt className="h-4 w-4" />
          Dimensions
          {!isLoading && dimensionCount > 0 && <Badge variant="secondary" className="ml-1">{dimensionCount}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="entities" className="gap-2">
          <Icons.Database className="h-4 w-4" />
          Entities
          {!isLoading && entityCount > 0 && <Badge variant="secondary" className="ml-1">{entityCount}</Badge>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-2">
        <VocabularyBrowser workspaceId={workspaceId} hideTypeFilter />
      </TabsContent>

      <TabsContent value="kpis" className="mt-2">
        <VocabularyBrowser workspaceId={workspaceId} initialFilters={{ type: "kpi" }} hideTypeFilter />
      </TabsContent>

      <TabsContent value="measures" className="mt-2">
        <VocabularyBrowser workspaceId={workspaceId} initialFilters={{ type: "measure" }} hideTypeFilter />
      </TabsContent>

      <TabsContent value="dimensions" className="mt-2">
        <VocabularyBrowser workspaceId={workspaceId} initialFilters={{ type: "dimension" }} hideTypeFilter />
      </TabsContent>

      <TabsContent value="entities" className="mt-2">
        <VocabularyBrowser workspaceId={workspaceId} initialFilters={{ type: "entity" }} hideTypeFilter />
      </TabsContent>
    </Tabs>
  );
}
