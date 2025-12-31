// Canvas module types for Knosia

// ============================================================================
// CANVAS TYPES
// ============================================================================

export type CanvasStatus = "draft" | "active" | "archived";

export interface Canvas {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: CanvasStatus;
  layout: CanvasLayout | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasLayout {
  type: "grid" | "freeform";
  columns?: number;
  rows?: number;
}

// ============================================================================
// BLOCK TYPES
// ============================================================================

export type BlockType =
  | "kpi"
  | "line_chart"
  | "bar_chart"
  | "area_chart"
  | "pie_chart"
  | "table"
  | "hero_metric"
  | "watch_list"
  | "comparison"
  | "insight"
  | "text";

export interface CanvasBlock {
  id: string;
  canvasId: string;
  type: BlockType;
  title: string | null;
  position: BlockPosition;
  config: BlockConfig | null;
  dataSource: BlockDataSource | null;
  cachedData: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlockPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlockConfig {
  liquidRenderType?: string;
  liquidRenderConfig?: unknown;
  customStyles?: Record<string, string>;
}

export interface BlockDataSource {
  type: "vocabulary" | "query" | "static";
  vocabularyId?: string;
  sql?: string;
  staticData?: unknown;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertOperator = "gt" | "lt" | "eq" | "gte" | "lte" | "change_gt" | "change_lt";
export type AlertChannel = "in_app" | "email" | "slack";

export interface CanvasAlert {
  id: string;
  canvasId: string;
  blockId: string | null;
  name: string;
  condition: AlertCondition;
  channels: AlertChannel[];
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface AlertCondition {
  metric: string;
  operator: AlertOperator;
  threshold: number;
  timeWindow?: string;
}

// ============================================================================
// CANVAS UI PROPS
// ============================================================================

export interface CanvasViewProps {
  canvasId: string;
  workspaceId: string;
  editable?: boolean;
}

export interface CanvasGridProps {
  blocks: CanvasBlock[];
  layout: CanvasLayout | null;
  editable?: boolean;
  onBlockClick?: (blockId: string) => void;
  onBlockMove?: (blockId: string, position: BlockPosition) => void;
  onBlockResize?: (blockId: string, position: BlockPosition) => void;
}

export interface CanvasBlockProps {
  block: CanvasBlock;
  editable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface CanvasEditorProps {
  canvas: Canvas;
  blocks: CanvasBlock[];
  onSave: () => void;
  onCancel: () => void;
}

export interface CanvasPromptBarProps {
  canvasId: string;
  onSubmit: (instruction: string) => void;
  isProcessing?: boolean;
}

// ============================================================================
// BLOCK RENDERER PROPS
// ============================================================================

export interface BlockRendererProps {
  block: CanvasBlock;
  data?: unknown;
  isLoading?: boolean;
  error?: string | null;
}
