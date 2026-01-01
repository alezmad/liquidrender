"use client";

// LiquidRender Block - Delegates to LiquidRender for chart/visualization types

import { useMemo } from "react";
import { cn } from "@turbostarter/ui";
import { Icons } from "@turbostarter/ui-web/icons";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@turbostarter/ui-web/alert";
import { LiquidUI, parseUI, type LiquidSchema, type DataContext } from "@repo/liquid-render";

import type { CanvasBlock, BlockConfig } from "../../types";

// ============================================================================
// Types
// ============================================================================

export interface LiquidRenderBlockProps {
  block: CanvasBlock;
  data: unknown;
  isLoading?: boolean;
  error?: string | null;
}

// Block type to LiquidRender component type mapping
const BLOCK_TYPE_TO_LIQUID_TYPE: Record<string, string> = {
  // Chart types
  line_chart: "line",
  bar_chart: "bar",
  area_chart: "area",
  pie_chart: "pie",
  scatter_chart: "scatter",
  heatmap: "heatmap",
  sankey: "sankey",
  sparkline: "sparkline",
  gauge: "gauge",
  flow: "flow",
  org: "org",
  map: "map",

  // Data display types
  table: "table",
  list: "list",
  tree: "tree",
  kanban: "kanban",
  timeline: "timeline",

  // KPI and metrics
  kpi: "kpi",

  // Layout types
  accordion: "accordion",
  card: "card",
  container: "container",
  grid: "grid",
  header: "header",
  modal: "modal",
  nav: "nav",
  split: "split",
  sidebar: "sidebar",
  stack: "stack",
  stepper: "stepper",
  tabs: "tabs",
  collapsible: "collapsible",

  // Feedback types
  drawer: "drawer",
  popover: "popover",
  sheet: "sheet",
  tooltip: "tooltip",
  hovercard: "hovercard",
  alert: "alert",
  alertdialog: "alertdialog",
  toast: "toast",
  skeleton: "skeleton",
  spinner: "spinner",
  dropdown: "dropdown",
  contextmenu: "contextmenu",
  command: "command",

  // Display types
  avatar: "avatar",
  badge: "badge",
  breadcrumb: "breadcrumb",
  heading: "heading",
  icon: "icon",
  image: "image",
  "kpi-card": "kpi",
  progress: "progress",
  tag: "tag",
  text: "text",
  separator: "separator",
  empty: "empty",
  pagination: "pagination",

  // Form types
  button: "button",
  checkbox: "checkbox",
  date: "date",
  daterange: "daterange",
  time: "time",
  form: "form",
  input: "input",
  radio: "radio",
  range: "range",
  rating: "rating",
  select: "select",
  switch: "switch",
  textarea: "textarea",
  upload: "upload",
  otp: "otp",
  color: "color",

  // Media types
  video: "video",
  audio: "audio",
  carousel: "carousel",
  lightbox: "lightbox",
  calendar: "calendar",
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Gets the LiquidRender component type from block type or config
 */
function getLiquidRenderType(block: CanvasBlock): string {
  // First check if there's an explicit liquidRenderType in config
  if (block.config?.liquidRenderType) {
    return block.config.liquidRenderType;
  }

  // Otherwise, map block type to LiquidRender type
  return BLOCK_TYPE_TO_LIQUID_TYPE[block.type] ?? block.type;
}

/**
 * Transforms data to DataContext format for LiquidRender
 */
function transformToDataContext(data: unknown): DataContext {
  if (data === null || data === undefined) {
    return {};
  }

  // If data is already an object, use it directly
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as DataContext;
  }

  // If data is an array, wrap it in a 'rows' key for common chart usage
  if (Array.isArray(data)) {
    return { rows: data };
  }

  // For primitive values, wrap in 'value' key
  return { value: data };
}

/**
 * Creates a minimal LiquidSchema for the given component type
 */
function createMinimalSchema(
  type: string,
  config: BlockConfig | null,
  label?: string | null
): LiquidSchema {
  return {
    version: "1.0",
    signals: [],
    layers: [
      {
        id: 0,
        visible: true,
        root: {
          uid: "root",
          type,
          label: label ?? undefined,
          binding: { kind: "field", value: "rows" },
          children: [],
        },
      },
    ],
  };
}

// ============================================================================
// Loading State Component
// ============================================================================

function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      <Skeleton className="h-4 w-32" />
      <div className="flex items-end gap-2 h-40">
        {[60, 80, 45, 90, 70, 55, 85].map((height, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

function ErrorState({
  error,
  blockType,
  className
}: {
  error: string;
  blockType: string;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={cn("m-4", className)}>
      <Icons.AlertCircle className="h-4 w-4" />
      <AlertTitle>Failed to render {blockType.replace(/_/g, " ")}</AlertTitle>
      <AlertDescription className="mt-1 text-sm">
        {error}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  blockType,
  className
}: {
  blockType: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground",
      className
    )}>
      <Icons.ChartNoAxesColumn className="h-8 w-8" />
      <p className="text-sm">
        No data for {blockType.replace(/_/g, " ")}
      </p>
    </div>
  );
}

// ============================================================================
// Fallback Renderer (when LiquidRender component not found)
// ============================================================================

function FallbackRenderer({
  type,
  data,
  label
}: {
  type: string;
  data: unknown;
  label?: string | null;
}) {
  return (
    <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <Icons.AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Component not registered
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            LiquidRender type: <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">{type}</code>
          </p>
          {label && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Label: {label}
            </p>
          )}
          {data !== undefined && data !== null && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-amber-600 dark:text-amber-400">
                View data
              </summary>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-amber-100 p-2 text-xs dark:bg-amber-900">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LiquidRenderBlock({
  block,
  data,
  isLoading = false,
  error = null,
}: LiquidRenderBlockProps) {
  // Get the LiquidRender component type
  const liquidType = useMemo(() => getLiquidRenderType(block), [block]);

  // Transform data to DataContext format
  const dataContext = useMemo(() => transformToDataContext(data), [data]);

  // Create the LiquidSchema for rendering
  const schema = useMemo(
    () => createMinimalSchema(liquidType, block.config, block.title),
    [liquidType, block.config, block.title]
  );

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} blockType={block.type} />;
  }

  // Empty data state
  const hasData = data !== undefined && data !== null &&
    (Array.isArray(data) ? data.length > 0 : Object.keys(data as object).length > 0);

  if (!hasData) {
    return <EmptyState blockType={block.type} />;
  }

  // Render with LiquidUI
  return (
    <div
      data-liquid-block-id={block.id}
      data-liquid-type={liquidType}
      className="min-h-[120px]"
    >
      <LiquidUI
        schema={schema}
        data={dataContext}
        className="h-full w-full"
      />
    </div>
  );
}

// ============================================================================
// Static Usage Exports
// ============================================================================

export { BLOCK_TYPE_TO_LIQUID_TYPE };
export default LiquidRenderBlock;
