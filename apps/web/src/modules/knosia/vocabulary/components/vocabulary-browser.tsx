"use client";

// Main vocabulary browser with search, filters, and list

import { useState, useMemo, useCallback } from "react";
import { cn } from "@turbostarter/ui";
import { Input } from "@turbostarter/ui-web/input";
import { Button } from "@turbostarter/ui-web/button";
import { Tabs, TabsList, TabsTrigger } from "@turbostarter/ui-web/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";
import { Icons } from "@turbostarter/ui-web/icons";

import { VocabularyList } from "./vocabulary-list";
import { useVocabulary } from "../hooks/use-vocabulary";
import type {
  VocabularyBrowserProps,
  VocabularyFilters,
  VocabularyTypeFilter,
  VocabularyScopeFilter,
  VocabularyItem,
} from "../types";

// ============================================================================
// FILTER CONFIGURATION
// ============================================================================

const typeFilters: { value: VocabularyTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "metric", label: "Metrics" },
  { value: "dimension", label: "Dimensions" },
  { value: "entity", label: "Entities" },
  { value: "event", label: "Events" },
];

const scopeFilters: { value: VocabularyScopeFilter; label: string; icon: keyof typeof Icons }[] = [
  { value: "all", label: "All Scopes", icon: "Globe2" },
  { value: "org", label: "Organization", icon: "Building" },
  { value: "workspace", label: "Workspace", icon: "LayoutDashboard" },
  { value: "private", label: "My Items", icon: "Lock" },
];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultFilters: VocabularyFilters = {
  search: "",
  type: "all",
  scope: "all",
};

// ============================================================================
// VOCABULARY BROWSER COMPONENT
// ============================================================================

export function VocabularyBrowser({
  workspaceId,
  initialFilters,
  onItemSelect,
}: VocabularyBrowserProps) {
  // State
  const [filters, setFilters] = useState<VocabularyFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  // Fetch vocabulary data
  const {
    items,
    isLoading,
    isError,
    error,
    toggleFavorite,
    isTogglingFavorite,
    refetch,
  } = useVocabulary({
    workspaceId,
    search: filters.search || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    scope: filters.scope === "all" ? undefined : filters.scope,
  });

  // Filter handlers
  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const handleTypeChange = useCallback((value: VocabularyTypeFilter) => {
    setFilters((prev) => ({ ...prev, type: value }));
  }, []);

  const handleScopeChange = useCallback((value: VocabularyScopeFilter) => {
    setFilters((prev) => ({ ...prev, scope: value }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Item handlers
  const handleItemClick = useCallback(
    (item: VocabularyItem) => {
      onItemSelect?.(item);
    },
    [onItemSelect]
  );

  const handleFavoriteToggle = useCallback(
    (item: VocabularyItem) => {
      toggleFavorite(item.slug);
    },
    [toggleFavorite]
  );

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.type !== "all" ||
      filters.scope !== "all"
    );
  }, [filters]);

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-3">
          <Icons.AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Failed to load vocabulary
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          {error?.message || "An unexpected error occurred"}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Icons.RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with Search */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vocabulary..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <Icons.X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="shrink-0"
            >
              <Icons.RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Scope Selector */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        {/* Type Tabs */}
        <Tabs
          value={filters.type}
          onValueChange={(v) => handleTypeChange(v as VocabularyTypeFilter)}
        >
          <TabsList className="h-8">
            {typeFilters.map((filter) => (
              <TabsTrigger
                key={filter.value}
                value={filter.value}
                className="px-3 text-xs"
              >
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Scope Dropdown */}
        <Select
          value={filters.scope}
          onValueChange={(v) => handleScopeChange(v as VocabularyScopeFilter)}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            {scopeFilters.map((filter) => {
              const Icon = Icons[filter.icon];
              return (
                <SelectItem key={filter.value} value={filter.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {isLoading
            ? "Loading..."
            : `${items.length} item${items.length !== 1 ? "s" : ""} found`}
        </span>
      </div>

      {/* Vocabulary List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <VocabularyList
            items={items}
            groupBy="type"
            onFavoriteToggle={handleFavoriteToggle}
            onItemClick={handleItemClick}
            isLoading={isLoading || isTogglingFavorite}
            emptyMessage={
              hasActiveFilters
                ? "No items match your filters"
                : "No vocabulary items yet"
            }
          />
        </div>
      </ScrollArea>
    </div>
  );
}
