"use client";

// Renders canvas blocks - delegates to LiquidRender when appropriate

import { Icons } from "@turbostarter/ui-web/icons";
import type { BlockRendererProps } from "../../types";
import { LiquidRenderBlock, BLOCK_TYPE_TO_LIQUID_TYPE } from "./liquid-render-block";
import { HeroMetricBlock } from "./hero-metric";
import { WatchListBlock } from "./watch-list";
import { ComparisonCardBlock } from "./comparison-card";
import { InsightCardBlock } from "./insight-card";

// Block types that should be delegated to LiquidRender
const LIQUID_RENDER_BLOCK_TYPES = new Set(Object.keys(BLOCK_TYPE_TO_LIQUID_TYPE));

export function BlockRenderer({
  block,
  data,
  isLoading = false,
  error = null,
}: BlockRendererProps) {
  // Check if this block should delegate to LiquidRender
  // Either by explicit config or by block type
  const shouldUseLiquidRender =
    block.config?.liquidRenderType ||
    LIQUID_RENDER_BLOCK_TYPES.has(block.type);

  if (shouldUseLiquidRender) {
    return (
      <LiquidRenderBlock
        block={block}
        data={data}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // Handle loading state for native blocks
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle error state for native blocks
  if (error) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-destructive">
        <Icons.AlertCircle className="h-6 w-6" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Native block rendering based on type
  switch (block.type) {
    case "hero_metric":
      return <HeroMetricBlock block={block} data={data} />;
    case "watch_list":
      return <WatchListBlock block={block} data={data} />;
    case "comparison":
      return <ComparisonCardBlock block={block} data={data} />;
    case "insight":
      return <InsightCardBlock block={block} data={data} />;
    case "text":
      return <TextBlock data={data} />;
    default:
      return <PlaceholderBlock type={block.type} data={data} />;
  }
}

// ============================================================================
// Fallback Block Renderers
// ============================================================================

interface BlockData {
  content?: string;
  [key: string]: unknown;
}

function TextBlock({ data }: { data?: unknown }) {
  const d = data as BlockData | undefined;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {d?.content || <span className="text-muted-foreground">No content</span>}
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
