// Vocabulary module types for Knosia

// ============================================================================
// VOCABULARY TYPES
// ============================================================================

export type VocabularyScope = "org" | "workspace" | "private";
export type VocabularyType = "metric" | "measure" | "kpi" | "dimension" | "entity" | "event";
export type VocabularyStatus = "draft" | "approved" | "deprecated";

export interface VocabularyDefinition {
  descriptionHuman?: string;
  formulaHuman?: string;
  formulaSql?: string;
  sourceTables?: string[];
  // KPI quality scoring
  qualityScore?: KPIQualityScore;
}

// ============================================================================
// KPI QUALITY SCORING
// ============================================================================

/**
 * Quality score for a KPI - helps users understand reliability and usefulness
 */
export interface KPIQualityScore {
  /** Overall quality score (0-100) - weighted average of dimensions */
  overall: number;

  /** How well does the available data match what's needed? (0-100) */
  dataFit: number;

  /** Is this a standard/important KPI for this business type? (0-100) */
  businessRelevance: number;

  /** How reliable is the calculation formula? (0-100) */
  calculationConfidence: number;

  /** Can decisions be made from this metric? (0-100) */
  actionability: number;

  /** Based on profiling - nulls, freshness, completeness (0-100) */
  dataQuality: number;

  /** Warning flags for the user */
  flags: KPIQualityFlag[];
}

export type KPIQualityFlag =
  | "proxy_calculation"    // Using approximate data
  | "high_null_rate"       // >10% nulls in source columns
  | "stale_data"           // Data hasn't been updated recently
  | "low_coverage"         // Only covers subset of business
  | "complex_formula"      // Multi-step calculation, more error-prone
  | "missing_time_field"   // Can't do time-series analysis
  | "low_cardinality"      // Few unique values, less meaningful
  | "derived_metric";      // Depends on other metrics

/**
 * Get quality level from overall score
 */
export function getQualityLevel(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

/**
 * Get quality color for UI display
 */
export function getQualityColor(score: number): string {
  if (score >= 85) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-blue-600 dark:text-blue-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get quality background color for UI display
 */
export function getQualityBgColor(score: number): string {
  if (score >= 85) return "bg-green-500/10";
  if (score >= 70) return "bg-blue-500/10";
  if (score >= 50) return "bg-yellow-500/10";
  return "bg-red-500/10";
}

export interface VocabularyItem {
  id: string;
  slug: string;
  canonicalName: string;
  abbreviation: string | null;
  type: VocabularyType;
  category: string | null;
  scope: VocabularyScope;
  definition: VocabularyDefinition | null;
  suggestedForRoles: string[] | null;
  status?: VocabularyStatus;
  isFavorite: boolean;
  recentlyUsedAt: string | null;
  useCount: number;
  // KPI-specific fields (null for non-KPIs)
  formulaSql?: string | null;
  formulaHuman?: string | null;
  confidence?: number | null;
  feasible?: boolean;
  source?: "ai_generated" | "user_created" | "detected" | null;
  sourceVocabularyIds?: string[] | null;
  executionCount?: number;
  lastExecutedAt?: string | null;
}

// ============================================================================
// USER PREFERENCES TYPES
// ============================================================================

export interface RecentlyUsedItem {
  slug: string;
  lastUsedAt: string;
  useCount: number;
}

export interface PrivateVocab {
  id: string;
  name: string;
  slug: string;
  type: "metric" | "dimension" | "filter";
  formula: string;
  description?: string;
  createdAt: string;
}

export interface VocabularyPrefs {
  favorites: string[];
  synonyms: Record<string, string>;
  recentlyUsed: RecentlyUsedItem[];
  dismissedSuggestions: string[];
  privateVocabulary: PrivateVocab[];
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

export type VocabularyScopeFilter = "all" | VocabularyScope;
export type VocabularyTypeFilter = "all" | VocabularyType;

export interface VocabularyFilters {
  search: string;
  type: VocabularyTypeFilter;
  scope: VocabularyScopeFilter;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface VocabularyCardProps {
  item: VocabularyItem;
  onFavoriteToggle?: (item: VocabularyItem) => void;
  onClick?: (item: VocabularyItem) => void;
  isLoading?: boolean;
}

export interface VocabularyListProps {
  items: VocabularyItem[];
  groupBy?: "category" | "type" | "none";
  onFavoriteToggle?: (item: VocabularyItem) => void;
  onItemClick?: (item: VocabularyItem) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export interface VocabularyBrowserProps {
  workspaceId: string;
  initialFilters?: Partial<VocabularyFilters>;
  onItemSelect?: (item: VocabularyItem) => void;
  /** Hide the type filter tabs (used when parent handles type filtering) */
  hideTypeFilter?: boolean;
}
