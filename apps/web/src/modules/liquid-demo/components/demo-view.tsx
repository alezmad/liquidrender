"use client";

import { useState, useMemo, useCallback } from "react";
import {
  LiquidProvider,
  LiquidUI,
  parseUI,
  defaultTheme,
  turbostarterTheme,
  type LiquidTheme,
  type LiquidSchema,
} from "@repo/liquid-render";
import { snippets, categories, type DemoSnippet } from "../snippets";
import { cn } from "@turbostarter/ui";

// ============================================================================
// Types
// ============================================================================

interface ParseResult {
  success: boolean;
  schema?: LiquidSchema;
  error?: string;
}

// ============================================================================
// Theme Selector
// ============================================================================

const themes: { id: string; name: string; theme: LiquidTheme }[] = [
  { id: "default", name: "Default", theme: defaultTheme },
  { id: "turbostarter", name: "TurboStarter", theme: turbostarterTheme },
];

interface ThemeSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Theme:</span>
      <div className="flex rounded-lg border bg-muted p-1">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              value === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Category Filter
// ============================================================================

interface CategoryFilterProps {
  value: string;
  onChange: (id: string) => void;
}

function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full transition-colors",
            value === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Code Editor
// ============================================================================

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function CodeEditor({ value, onChange, error }: CodeEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">DSL Code</span>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-64 p-4 font-mono text-sm rounded-lg border resize-none",
          "bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive"
        )}
        placeholder="Enter LiquidRender DSL code..."
        spellCheck={false}
      />
    </div>
  );
}

// ============================================================================
// Data Editor
// ============================================================================

interface DataEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function DataEditor({ value, onChange, error }: DataEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Data (JSON)</span>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-40 p-4 font-mono text-sm rounded-lg border resize-none",
          "bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive"
        )}
        placeholder='{"key": "value"}'
        spellCheck={false}
      />
    </div>
  );
}

// ============================================================================
// Snippet Card
// ============================================================================

interface SnippetCardProps {
  snippet: DemoSnippet;
  isSelected: boolean;
  onClick: () => void;
}

function SnippetCard({ snippet, isSelected, onClick }: SnippetCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 text-left rounded-lg border transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div className="font-medium">{snippet.name}</div>
      <div className="text-sm text-muted-foreground mt-1">
        {snippet.description}
      </div>
      <div className="mt-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {snippet.category}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Preview Panel
// ============================================================================

interface PreviewPanelProps {
  schema: LiquidSchema | null;
  data: Record<string, unknown>;
  theme: LiquidTheme;
  error?: string;
}

function PreviewPanel({ schema, data, theme, error }: PreviewPanelProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-destructive font-medium">Parse Error</div>
          <div className="text-sm text-muted-foreground mt-2 font-mono">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
        Enter DSL code to see preview
      </div>
    );
  }

  return (
    <LiquidProvider theme={theme}>
      <div className="p-6">
        <LiquidUI schema={schema} data={data} />
      </div>
    </LiquidProvider>
  );
}

// ============================================================================
// Main Demo View
// ============================================================================

export function DemoView() {
  // State
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSnippet, setSelectedSnippet] = useState<DemoSnippet | null>(
    snippets[0] ?? null
  );
  const [dslCode, setDslCode] = useState(selectedSnippet?.dsl ?? "");
  const [dataJson, setDataJson] = useState(
    JSON.stringify(selectedSnippet?.data ?? {}, null, 2)
  );
  const [parseError, setParseError] = useState<string | undefined>();
  const [dataError, setDataError] = useState<string | undefined>();

  // Get current theme
  const currentTheme = useMemo(
    () => themes.find((t) => t.id === selectedTheme)?.theme ?? defaultTheme,
    [selectedTheme]
  );

  // Filter snippets by category
  const filteredSnippets = useMemo(
    () =>
      selectedCategory === "all"
        ? snippets
        : snippets.filter((s) => s.category === selectedCategory),
    [selectedCategory]
  );

  // Parse data JSON
  const parsedData = useMemo((): Record<string, unknown> => {
    try {
      const data = JSON.parse(dataJson || "{}") as Record<string, unknown>;
      setDataError(undefined);
      return data;
    } catch (e) {
      setDataError("Invalid JSON");
      return {};
    }
  }, [dataJson]);

  // Parse DSL code
  const parsedSchema = useMemo(() => {
    if (!dslCode.trim()) {
      setParseError(undefined);
      return null;
    }

    try {
      const schema = parseUI(dslCode);
      setParseError(undefined);
      return schema;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Parse error";
      setParseError(message);
      return null;
    }
  }, [dslCode]);

  // Handle snippet selection
  const handleSnippetSelect = useCallback((snippet: DemoSnippet) => {
    setSelectedSnippet(snippet);
    setDslCode(snippet.dsl);
    setDataJson(JSON.stringify(snippet.data, null, 2));
    setParseError(undefined);
    setDataError(undefined);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">LiquidRender Demo</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive component gallery with theme switching
              </p>
            </div>
            <ThemeSelector value={selectedTheme} onChange={setSelectedTheme} />
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <CategoryFilter
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Snippet List */}
          <div className="col-span-3 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Examples ({filteredSnippets.length})
            </h2>
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {filteredSnippets.map((snippet) => (
                <SnippetCard
                  key={snippet.name}
                  snippet={snippet}
                  isSelected={selectedSnippet?.name === snippet.name}
                  onClick={() => handleSnippetSelect(snippet)}
                />
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="col-span-4 space-y-4">
            <CodeEditor
              value={dslCode}
              onChange={setDslCode}
              error={parseError}
            />
            <DataEditor
              value={dataJson}
              onChange={setDataJson}
              error={dataError}
            />
          </div>

          {/* Preview */}
          <div className="col-span-5">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Preview
                </h2>
                <span className="text-xs text-muted-foreground">
                  Theme: {currentTheme.name} v{currentTheme.version}
                </span>
              </div>
              <div className="rounded-lg border bg-card min-h-[500px]">
                <PreviewPanel
                  schema={parsedSchema}
                  data={parsedData}
                  theme={currentTheme}
                  error={parseError}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
