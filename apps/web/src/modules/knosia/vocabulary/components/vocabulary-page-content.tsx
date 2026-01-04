"use client";

// Vocabulary Page Content - Main content with tabs for Vocabulary and Metrics

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@turbostarter/ui-web/tabs";
import { Icons } from "@turbostarter/ui-web/icons";

import { VocabularyBrowser } from "./vocabulary-browser";
import { MetricsTab } from "./metrics-tab";

// ============================================================================
// TYPES
// ============================================================================

interface VocabularyPageContentProps {
  /** Workspace ID */
  workspaceId: string;
  /** Connection ID for fetching metrics */
  connectionId?: string;
  /** Initial active tab */
  initialTab?: "vocabulary" | "metrics";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VocabularyPageContent({
  workspaceId,
  connectionId,
  initialTab = "vocabulary",
}: VocabularyPageContentProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="vocabulary" className="gap-2">
          <Icons.BookOpen className="h-4 w-4" />
          Vocabulary
        </TabsTrigger>
        <TabsTrigger value="metrics" className="gap-2">
          <Icons.BarChart3 className="h-4 w-4" />
          Metrics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="vocabulary" className="mt-6">
        <VocabularyBrowser workspaceId={workspaceId} />
      </TabsContent>

      <TabsContent value="metrics" className="mt-6">
        {connectionId ? (
          <MetricsTab connectionId={connectionId} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Icons.Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No Connection Selected</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Connect a database to view and manage calculated metrics.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
