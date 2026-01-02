"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@turbostarter/ui-web/command";
import { Icons } from "@turbostarter/ui-web/icons";

import { useSearch, type SearchResult } from "../hooks/use-search";

interface SearchCommandProps {
  workspaceId: string;
}

const typeIcons: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  thread: Icons.MessagesSquare,
  canvas: Icons.LayoutDashboard,
  vocabulary: Icons.BookOpen,
};

const typeLabels: Record<SearchResult["type"], string> = {
  thread: "Thread",
  canvas: "Canvas",
  vocabulary: "Vocabulary",
};

function SearchResultItem({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: () => void;
}) {
  const Icon = typeIcons[result.type];

  return (
    <CommandItem
      value={`${result.type}-${result.id}`}
      onSelect={onSelect}
      className="flex items-start gap-3 py-3"
    >
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {typeLabels[result.type]}
          </Badge>
        </div>
        {result.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {result.description}
          </p>
        )}
        {result.excerpt && (
          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
            {result.excerpt}
          </p>
        )}
      </div>
    </CommandItem>
  );
}

export function SearchCommand({ workspaceId }: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const { data, isLoading } = useSearch({
    workspaceId,
    query,
    enabled: open,
  });

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      router.push(result.link);
    },
    [router],
  );

  // Group results by type
  const groupedResults = data?.results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<SearchResult["type"], SearchResult[]>,
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground",
          "border rounded-md hover:bg-muted/50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        )}
      >
        <Icons.Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search threads, canvases, vocabulary..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && query.length > 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Icons.Loader2 className="h-4 w-4 mx-auto animate-spin mb-2" />
              Searching...
            </div>
          )}

          {!isLoading && query.length > 0 && data?.results.length === 0 && (
            <CommandEmpty>No results found for "{query}"</CommandEmpty>
          )}

          {!isLoading && query.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type to search threads, canvases, and vocabulary...
            </div>
          )}

          {groupedResults && Object.keys(groupedResults).length > 0 && (
            <>
              {groupedResults.thread && groupedResults.thread.length > 0 && (
                <CommandGroup heading="Threads">
                  {groupedResults.thread.map((result) => (
                    <SearchResultItem
                      key={result.id}
                      result={result}
                      onSelect={() => handleSelect(result)}
                    />
                  ))}
                </CommandGroup>
              )}

              {groupedResults.canvas && groupedResults.canvas.length > 0 && (
                <>
                  {groupedResults.thread && <CommandSeparator />}
                  <CommandGroup heading="Canvases">
                    {groupedResults.canvas.map((result) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        onSelect={() => handleSelect(result)}
                      />
                    ))}
                  </CommandGroup>
                </>
              )}

              {groupedResults.vocabulary && groupedResults.vocabulary.length > 0 && (
                <>
                  {(groupedResults.thread || groupedResults.canvas) && (
                    <CommandSeparator />
                  )}
                  <CommandGroup heading="Vocabulary">
                    {groupedResults.vocabulary.map((result) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        onSelect={() => handleSelect(result)}
                      />
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
