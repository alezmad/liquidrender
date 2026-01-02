/**
 * Dashboard Specification
 *
 * Output of business type mapping, input to LiquidSchema generation.
 */

export interface DashboardSpec {
  businessType: string;
  title: string;
  generatedAt: string;
  sections: DashboardSection[];
  coverage: number; // % of KPIs successfully mapped
  warnings: string[];
}

export interface DashboardSection {
  id: string;
  name: string;
  kpis: DashboardKPI[];
  chart?: DashboardChart;
}

export interface DashboardKPI {
  id: string;
  name: string;
  slug: string; // For data binding
  format: string; // currency, percentage, number
  query: string; // LC DSL query (usually just the slug for simple metrics)
  suggestedForRoles?: string[];
  isFavorite?: boolean;
}

export interface DashboardChart {
  type: "line" | "bar" | "area" | "pie";
  title: string;
  binding: string; // Field name for data
  xAxis: string;
  yAxis: string;
  query: string; // LC DSL query
}

// ============================================================================
// Canvas Types
// ============================================================================

/**
 * Workspace Canvas
 * Saved canvas state for a workspace (used in Wave 3)
 *
 * Layout is defined in the LiquidSchema itself, not here.
 */
export interface WorkspaceCanvas {
  id: string;
  workspaceId: string;
  schema: unknown; // LiquidSchema (from @repo/liquid-render)
  sourceType: "template" | "custom" | "hybrid";
  templateId?: string; // BusinessType if sourced from template
  lastEditedBy?: string; // User ID
  createdAt: string;
  updatedAt: string;
}

/**
 * Canvas edit permissions
 * Determines what user can do with canvas
 */
export interface CanvasPermissions {
  canView: boolean;
  canEdit: boolean;
  canReset: boolean; // Reset to business type template
  canShare: boolean; // V2 feature
}

/**
 * Canvas edit action (for audit trail, V2)
 */
export interface CanvasEditAction {
  type: "add_block" | "remove_block" | "move_block" | "update_block" | "reset";
  blockId?: string;
  timestamp: string;
  userId: string;
  metadata?: Record<string, unknown>;
}
