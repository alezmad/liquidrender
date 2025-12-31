"use client";

// Renders canvas blocks - delegates to LiquidRender when appropriate

import { Icons } from "@turbostarter/ui-web/icons";
import type { BlockRendererProps } from "../../types";

export function BlockRenderer({
  block,
  data,
  isLoading = false,
  error = null,
}: BlockRendererProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-destructive">
        <Icons.AlertCircle className="h-6 w-6" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Check if this block should delegate to LiquidRender
  if (block.config?.liquidRenderType) {
    return (
      <LiquidRenderDelegate
        type={block.config.liquidRenderType}
        config={block.config.liquidRenderConfig}
        data={data}
      />
    );
  }

  // Native block rendering based on type
  switch (block.type) {
    case "kpi":
      return <KPIBlock data={data} />;
    case "hero_metric":
      return <HeroMetricBlock data={data} />;
    case "text":
      return <TextBlock data={data} />;
    case "insight":
      return <InsightBlock data={data} />;
    default:
      return <PlaceholderBlock type={block.type} data={data} />;
  }
}

// ============================================================================
// LiquidRender Delegation
// ============================================================================

interface LiquidRenderDelegateProps {
  type: string;
  config?: unknown;
  data?: unknown;
}

function LiquidRenderDelegate({ type, config, data }: LiquidRenderDelegateProps) {
  // TODO: Import and use actual LiquidRender components
  return (
    <div className="flex h-32 items-center justify-center rounded bg-muted/50">
      <p className="text-sm text-muted-foreground">
        LiquidRender: {type}
      </p>
    </div>
  );
}

// ============================================================================
// Native Block Renderers
// ============================================================================

interface BlockData {
  value?: string | number;
  label?: string;
  change?: { value: number; direction: "up" | "down" | "stable" };
  content?: string;
  summary?: string;
  [key: string]: unknown;
}

function KPIBlock({ data }: { data?: unknown }) {
  const d = data as BlockData | undefined;

  return (
    <div className="space-y-1">
      <div className="text-3xl font-bold">
        {d?.value ?? "—"}
      </div>
      {d?.label && (
        <div className="text-sm text-muted-foreground">{d.label}</div>
      )}
      {d?.change && (
        <div className={
          d.change.direction === "up" ? "text-green-600" :
          d.change.direction === "down" ? "text-red-600" :
          "text-muted-foreground"
        }>
          {d.change.direction === "up" && "↑"}
          {d.change.direction === "down" && "↓"}
          {d.change.value}%
        </div>
      )}
    </div>
  );
}

function HeroMetricBlock({ data }: { data?: unknown }) {
  const d = data as BlockData | undefined;

  return (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <div className="text-5xl font-bold">
        {d?.value ?? "—"}
      </div>
      {d?.label && (
        <div className="mt-2 text-lg text-muted-foreground">{d.label}</div>
      )}
    </div>
  );
}

function TextBlock({ data }: { data?: unknown }) {
  const d = data as BlockData | undefined;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {d?.content || <span className="text-muted-foreground">No content</span>}
    </div>
  );
}

function InsightBlock({ data }: { data?: unknown }) {
  const d = data as BlockData | undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Icons.Lightbulb className="mt-0.5 h-4 w-4 text-yellow-500" />
        <p className="text-sm">{d?.summary || "No insight available"}</p>
      </div>
    </div>
  );
}

function PlaceholderBlock({ type, data }: { type: string; data?: unknown }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2 rounded bg-muted/50">
      <Icons.Square className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {type.replace(/_/g, " ")}
      </p>
      {data !== undefined && data !== null && (
        <p className="text-xs text-muted-foreground">
          Data loaded
        </p>
      )}
    </div>
  );
}
