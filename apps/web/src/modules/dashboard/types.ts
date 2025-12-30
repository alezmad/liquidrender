// Dashboard Module Types
// Re-export API types for convenience and add UI-specific types

import type {
  BriefingResponse,
  KPI,
  KPIChange,
  KPIStatus,
  ChangeDirection,
  Alert,
  AlertSeverity,
  Insight,
  Factor,
  SuggestedAction,
} from "@turbostarter/api/modules/knosia/briefing";

// Re-export API types
export type {
  BriefingResponse,
  KPI,
  KPIChange,
  KPIStatus,
  ChangeDirection,
  Alert,
  AlertSeverity,
  Insight,
  Factor,
  SuggestedAction,
};

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for BriefingCard component
 * Displays greeting and data freshness
 */
export interface BriefingCardProps {
  greeting: string;
  dataThrough: string;
  className?: string;
}

/**
 * Props for KPIGrid component
 * Displays key metrics in a grid layout
 */
export interface KPIGridProps {
  kpis: KPI[];
  className?: string;
  /** Maximum KPIs to display (default: 4) */
  maxItems?: number;
}

/**
 * Props for AlertList component
 * Displays alerts requiring attention
 */
export interface AlertListProps {
  alerts: Alert[];
  className?: string;
  /** Callback when an action is clicked */
  onActionClick?: (query: string) => void;
}

/**
 * Props for AskInput component
 * Quick query input for conversation
 */
export interface AskInputProps {
  placeholder?: string;
  suggestedQuestions?: string[];
  className?: string;
  /** Callback when query is submitted */
  onSubmit?: (query: string) => void;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Options for useBriefing hook
 */
export interface UseBriefingOptions {
  /** Connection ID to filter briefing (optional) */
  connectionId?: string;
  /** Date for historical briefing (optional) */
  date?: string;
  /** Enable/disable auto-refresh */
  enabled?: boolean;
}

/**
 * Return type for useBriefing hook
 */
export interface UseBriefingResult {
  briefing: BriefingResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
