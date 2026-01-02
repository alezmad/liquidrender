# Vocabulary System Implementation Reference

**Date:** 2026-01-02
**Status:** Source of Truth (Post-Implementation)
**Purpose:** Context document for AI agents and developers

---

## Executive Summary

Knosia's vocabulary system implements a 3-level hierarchy that ensures everyone computes the same numbers while allowing domain-specific extensions and personal customization.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ORGANIZATION ─────── "What is true"      (governed)           │
│   workspaceId = NULL                                            │
│         ↓                                                       │
│   WORKSPACE ────────── "What is relevant"  (domain-specific)    │
│   workspaceId = "xxx"                                           │
│         ↓                                                       │
│   USER ─────────────── "What matters to me" (personal)          │
│   Stored in knosia_user_vocabulary_prefs                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### knosia_vocabulary_item

**Location:** `packages/db/src/schema/knosia.ts:377`

Stores organization and workspace level vocabulary items.

```typescript
{
  id: text().primaryKey(),
  workspaceId: text() | null,  // NULL = org-level, set = workspace-level
  orgId: text().notNull(),

  // Identity
  canonicalName: text().notNull(),
  abbreviation: text(),
  slug: text().notNull(),
  aliases: jsonb<string[]>().default([]),

  // Classification
  type: enum("metric" | "dimension" | "entity" | "event"),
  category: text(),

  // Definition
  definition: jsonb<{
    descriptionHuman?: string;
    formulaHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
    sourceColumn?: string;
    caveats?: string[];
    exampleValues?: { low?: string; typical?: string; high?: string };
  }>(),

  // Semantics
  semantics: jsonb<{
    direction?: "higher_is_better" | "lower_is_better" | "target_range";
    format?: "currency" | "percentage" | "count" | "duration" | "ratio";
    grain?: "daily" | "weekly" | "monthly" | "point_in_time";
    sensitivity?: "public" | "internal" | "confidential" | "pii";
  }>(),

  // Governance
  status: enum("draft" | "approved" | "deprecated"),
  currentVersion: integer().default(1),
  governance: jsonb<{
    ownerTeam?: string;
    stewardUserId?: string;
    reviewSchedule?: string;
  }>(),

  // Role Suggestions (soft filter)
  suggestedForRoles: jsonb<string[]>(),  // ["strategist", "operator", "analyst", "builder"]

  // Extraction Metadata
  aggregation: enum("SUM" | "AVG" | "COUNT" | "MIN" | "MAX"),
  aggregationConfidence: integer(),
  cardinality: integer(),
  isPrimaryTime: boolean().default(false),
  joinsTo: jsonb<{ target: string; via: string; type: string }[]>(),

  // Timestamps
  createdAt: timestamp(),
  updatedAt: timestamp(),
}
```

### knosia_user_vocabulary_prefs

**Location:** `packages/db/src/schema/knosia.ts:569`

Stores user-level personalization and private vocabulary.

```typescript
{
  id: text().primaryKey(),
  userId: text().notNull(),           // FK to user
  workspaceId: text().notNull(),      // FK to knosia_workspace

  // Personalization
  favorites: jsonb<string[]>().default([]),           // Vocabulary slugs
  synonyms: jsonb<Record<string, string>>().default({}),  // { "my_term": "official_slug" }
  dismissedSuggestions: jsonb<string[]>().default([]),

  // Usage Tracking
  recentlyUsed: jsonb<{
    slug: string;
    lastUsedAt: string;  // ISO date
    useCount: number;
  }[]>().default([]),

  // Private Vocabulary (user-only formulas)
  privateVocabulary: jsonb<{
    id: string;
    name: string;
    slug: string;
    type: "metric" | "dimension" | "filter";
    formula: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
  }[]>().default([]),

  // Timestamps
  createdAt: timestamp(),
  updatedAt: timestamp(),
}

// Unique constraint: one preferences record per user per workspace
unique(userId, workspaceId)
```

---

## API Endpoints

**Location:** `packages/api/src/modules/knosia/vocabulary/router.ts`

All endpoints require authentication (`enforceAuth` middleware).

### Vocabulary CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/items` | List vocabulary (merged org + workspace + private) |
| `GET` | `/items/:slug` | Get single vocabulary item by slug |
| `POST` | `/items` | Create vocabulary item (org or workspace level) |
| `PATCH` | `/items/:id` | Update vocabulary item |
| `POST` | `/items/:id/deprecate` | Mark vocabulary item as deprecated |

### Analysis-Based Vocabulary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analysis/:analysisId` | Get vocabulary from completed analysis |
| `POST` | `/analysis/:analysisId/confirm` | Confirm vocabulary selections |
| `POST` | `/items/:vocabularyId/report-mismatch` | Report vocabulary issue |

### User Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/user/preferences` | Get user vocabulary preferences |
| `PATCH` | `/user/preferences` | Update favorites, synonyms, dismissed |
| `POST` | `/user/private` | Create private vocabulary item |
| `PATCH` | `/user/private/:id` | Update private vocabulary item |
| `DELETE` | `/user/private/:id` | Delete private vocabulary item |
| `POST` | `/user/track-usage` | Track vocabulary usage for recently used |
| `GET` | `/user/suggestions` | Get role-based vocabulary suggestions |

---

## Resolution Algorithm

**Location:** `packages/api/src/modules/knosia/vocabulary/resolution.ts`

### resolveVocabulary(userId, workspaceId)

Merges vocabulary from three scopes with priority: **Private > Workspace > Org**

```typescript
async function resolveVocabulary(userId: string, workspaceId: string): Promise<ResolvedVocabulary>

interface ResolvedVocabulary {
  items: ResolvedVocabularyItem[];
  bySlug: Map<string, ResolvedVocabularyItem>;
  favorites: string[];
  recentlyUsed: { slug: string; lastUsedAt: string; useCount: number }[];
  synonyms: Record<string, string>;
}
```

**Algorithm:**
1. Fetch workspace to get orgId
2. Query all vocabulary items where `orgId = X AND (workspaceId IS NULL OR workspaceId = Y)`
3. Fetch user preferences from `knosia_user_vocabulary_prefs`
4. Build `bySlug` map:
   - First pass: Add org-level items (`workspaceId = NULL`)
   - Second pass: Add workspace items (overwrites same slugs)
   - Third pass: Add private vocabulary (highest priority)
5. Attach `isFavorite`, `recentlyUsedAt`, `useCount` from preferences

### searchVocabulary(query, resolved, limit)

Smart search with ranking.

```typescript
function searchVocabulary(query: string, resolved: ResolvedVocabulary, limit?: number): SearchResult[]

interface SearchResult {
  item: ResolvedVocabularyItem;
  score: number;
  matchType: "exact" | "prefix" | "contains" | "synonym" | "fuzzy";
}
```

**Scoring Priority:**
1. User synonym match → score 95
2. Exact slug/name match → score 100
3. Prefix match → score 80
4. Contains match → score 60
5. Abbreviation match → score 50

**Boosters:**
- +10 if item is favorite
- +min(useCount, 5) for recently used items

### getSuggestedVocabulary(userId, workspaceId, roleArchetype)

Returns items suggested for user's role that haven't been dismissed.

---

## Frontend Types

**Location:** `apps/web/src/modules/knosia/vocabulary/types.ts`

```typescript
// Core vocabulary types
type VocabularyScope = "org" | "workspace" | "private";
type VocabularyType = "metric" | "dimension" | "entity" | "event";
type VocabularyStatus = "draft" | "approved" | "deprecated";

interface VocabularyItem {
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

interface VocabularyPrefs {
  favorites: string[];
  synonyms: Record<string, string>;
  recentlyUsed: RecentlyUsedItem[];
  dismissedSuggestions: string[];
  privateVocabulary: PrivateVocab[];
}

// Filter types
type VocabularyScopeFilter = "all" | VocabularyScope;
type VocabularyTypeFilter = "all" | VocabularyType;
```

---

## React Hooks

### useVocabulary

**Location:** `apps/web/src/modules/knosia/vocabulary/hooks/use-vocabulary.ts`

```typescript
function useVocabulary({
  workspaceId: string;
  search?: string;
  type?: VocabularyType;
  scope?: VocabularyScope | "all";
  limit?: number;
}): {
  items: VocabularyItem[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  toggleFavorite: (slug: string) => void;
  isTogglingFavorite: boolean;
}
```

**Features:**
- Query key includes all filter parameters for proper cache invalidation
- Optimistic updates for favorite toggles
- Stale time: 30 seconds
- Automatic rollback on mutation error

### useVocabularyPrefs

**Location:** `apps/web/src/modules/knosia/vocabulary/hooks/use-vocabulary-prefs.ts`

Manages user vocabulary preferences (favorites, synonyms, private vocabulary).

---

## UI Components

**Location:** `apps/web/src/modules/knosia/vocabulary/components/`

### VocabularyBrowser

Main vocabulary browser with search, filters, and list.

```typescript
interface VocabularyBrowserProps {
  workspaceId: string;
  initialFilters?: Partial<VocabularyFilters>;
  onItemSelect?: (item: VocabularyItem) => void;
}
```

**Features:**
- Search input with clear button
- Type tabs: All | Metrics | Dimensions | Entities | Events
- Scope dropdown: All Scopes | Organization | Workspace | My Items
- Results count display
- Reset filters button
- Error state with retry
- Scrollable list area

### VocabularyList

Groups and displays vocabulary items.

```typescript
interface VocabularyListProps {
  items: VocabularyItem[];
  groupBy?: "category" | "type" | "none";
  onFavoriteToggle?: (item: VocabularyItem) => void;
  onItemClick?: (item: VocabularyItem) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}
```

### VocabularyCard

Individual vocabulary item card with favorite toggle.

```typescript
interface VocabularyCardProps {
  item: VocabularyItem;
  onFavoriteToggle?: (item: VocabularyItem) => void;
  onClick?: (item: VocabularyItem) => void;
  isLoading?: boolean;
}
```

---

## File Locations

| Component | Path |
|-----------|------|
| **Database Schema** | `packages/db/src/schema/knosia.ts` |
| **API Router** | `packages/api/src/modules/knosia/vocabulary/router.ts` |
| **API Schemas** | `packages/api/src/modules/knosia/vocabulary/schemas.ts` |
| **API Queries** | `packages/api/src/modules/knosia/vocabulary/queries.ts` |
| **API Mutations** | `packages/api/src/modules/knosia/vocabulary/mutations.ts` |
| **Resolution Algorithm** | `packages/api/src/modules/knosia/vocabulary/resolution.ts` |
| **Frontend Types** | `apps/web/src/modules/knosia/vocabulary/types.ts` |
| **useVocabulary Hook** | `apps/web/src/modules/knosia/vocabulary/hooks/use-vocabulary.ts` |
| **VocabularyBrowser** | `apps/web/src/modules/knosia/vocabulary/components/vocabulary-browser.tsx` |
| **VocabularyList** | `apps/web/src/modules/knosia/vocabulary/components/vocabulary-list.tsx` |
| **VocabularyCard** | `apps/web/src/modules/knosia/vocabulary/components/vocabulary-card.tsx` |

---

## Implementation Status

### Implemented (Ready to Use)

| Feature | Status | Notes |
|---------|--------|-------|
| 3-level hierarchy (org/workspace/private) | ✅ | Full resolution algorithm |
| knosia_vocabulary_item table | ✅ | With suggestedForRoles field |
| knosia_user_vocabulary_prefs table | ✅ | Favorites, synonyms, private vocab |
| Vocabulary CRUD API | ✅ | Create, read, update, deprecate |
| User preferences API | ✅ | Full CRUD for all preference types |
| Private vocabulary | ✅ | Create, update, delete |
| Usage tracking | ✅ | Recently used with counts |
| Role-based suggestions | ✅ | Query + dismiss |
| Resolution algorithm | ✅ | Merge with priority |
| Smart search | ✅ | Synonym, favorite, recent boosts |
| VocabularyBrowser component | ✅ | Search + filters + list |
| useVocabulary hook | ✅ | With optimistic favorite toggle |

### Not Implemented (Future)

| Feature | Priority | Notes |
|---------|----------|-------|
| Vocabulary browser page route | P1 | Need `/dashboard/knosia/vocabulary/page.tsx` |
| Vocabulary detail sheet/panel | P2 | Full definition, ownership, actions |
| Synonyms management UI | P2 | Add/edit/delete interface |
| Private formula modal | P2 | Create/edit with validation |
| Promote to workspace flow | P3 | Private → workspace proposal |
| Governance approval workflow | P3 | Pending → approved flow |

---

## Usage Examples

### Fetch Vocabulary List

```typescript
// API call
const res = await api.knosia.vocabulary.items.$get({
  query: {
    workspaceId: "ws_123",
    search: "revenue",
    type: "metric",
    scope: "org",
    limit: "20",
  },
});

// Response
{
  items: [
    {
      id: "vocab_abc",
      slug: "mrr",
      canonicalName: "Monthly Recurring Revenue",
      type: "metric",
      scope: "org",
      isFavorite: true,
      useCount: 15,
      ...
    }
  ],
  total: 1
}
```

### Toggle Favorite

```typescript
// Get current preferences
const prefs = await api.knosia.vocabulary.user.preferences.$get({
  query: { workspaceId: "ws_123" },
});

// Toggle favorite
const newFavorites = prefs.favorites.includes("mrr")
  ? prefs.favorites.filter(s => s !== "mrr")
  : [...prefs.favorites, "mrr"];

// Update
await api.knosia.vocabulary.user.preferences.$patch({
  json: { workspaceId: "ws_123", favorites: newFavorites },
});
```

### Create Private Vocabulary

```typescript
await api.knosia.vocabulary.user.private.$post({
  json: {
    workspaceId: "ws_123",
    name: "My Conversion Rate",
    slug: "my_conversion_rate",
    type: "metric",
    formula: "COUNT(deals WHERE status = 'won') / COUNT(deals) * 100",
    description: "Personal conversion tracking",
  },
});
```

### Track Usage

```typescript
await api.knosia.vocabulary.user["track-usage"].$post({
  json: {
    workspaceId: "ws_123",
    slug: "mrr",
  },
});
```

---

## Core Principles (From Architecture)

1. **Everyone Sees Everything** - No hiding based on role. Transparency builds trust.
2. **Relevance Over Restriction** - Role determines what's surfaced first, not what's accessible.
3. **One Truth, Many Views** - Org defines canonical formulas. Users personalize view.
4. **Additive, Not Override** - Lower levels can ADD, never REDEFINE.
5. **Clear Ownership** - Every item has an owner.

---

*End of Vocabulary Implementation Reference*
