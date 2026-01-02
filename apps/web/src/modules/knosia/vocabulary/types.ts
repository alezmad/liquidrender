// Vocabulary module types for Knosia

// ============================================================================
// VOCABULARY TYPES
// ============================================================================

export type VocabularyScope = "org" | "workspace" | "private";
export type VocabularyType = "metric" | "dimension" | "entity" | "event";
export type VocabularyStatus = "draft" | "approved" | "deprecated";

export interface VocabularyDefinition {
  descriptionHuman?: string;
  formulaHuman?: string;
  formulaSql?: string;
  sourceTables?: string[];
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
}
