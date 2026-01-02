# Vocabulary Architecture Implementation Plan

**Date:** 2026-01-01
**Source:** `.artifacts/2026-01-01-knosia-vocabulary-architecture.md`
**Status:** Ready for implementation

---

## Gap Analysis

### What Already Exists

| Component | Location | Status |
|-----------|----------|--------|
| `knosiaVocabularyItem` table | `packages/db/src/schema/knosia.ts:376` | Has org/workspace scoping via `workspaceId` (NULL = org-level) |
| `knosiaVocabularyVersion` table | `packages/db/src/schema/knosia.ts:434` | Version history tracking |
| `knosiaUserPreference` table | `packages/db/src/schema/knosia.ts:530` | Has `favorites` but wrong structure for vocab prefs |
| `knosiaMismatchReport` table | `packages/db/src/schema/knosia.ts:691` | Governance: issue reporting |
| Vocabulary API (basic) | `packages/api/src/modules/knosia/vocabulary/` | Only handles analysis-based extraction |
| Vocabulary enums | `packages/db/src/schema/knosia.ts:43-63` | `type`, `status`, `aggregation` enums exist |

### What's Missing

| Component | From Architecture Doc | Priority |
|-----------|----------------------|----------|
| `knosia_user_vocabulary_prefs` table | Section 3.2 - dedicated vocab preferences | P1 |
| `suggestedForRoles` field | Section 3.1 - role-based suggestions | P1 |
| Resolution algorithm | Section 4 - merge org + workspace + private | P1 |
| Full vocabulary CRUD API | Section 7.1 - list, get, create, update endpoints | P1 |
| User preferences API | Section 7.1 - favorites, synonyms, private vocab | P1 |
| Private vocabulary support | Section 2.3.2 - personal formulas | P2 |
| Vocabulary browser UI | Section 5.1 - full vocabulary page | P2 |
| Search with ranking | Section 4.1 - smart search resolution | P2 |
| Promote to workspace flow | Section 5.4 - propose private → workspace | P3 |
| Governance approval workflow | Section 6.1 - pending status flow | P3 |

---

## Implementation Phases

### Phase 1: Schema Updates (~1 hour)

**Tasks:**

1. **Add `suggestedForRoles` to `knosiaVocabularyItem`**
   ```typescript
   // packages/db/src/schema/knosia.ts
   suggestedForRoles: jsonb().$type<string[]>(), // Role archetypes: ["strategist", "operator", "analyst", "builder"]
   ```

2. **Create `knosiaUserVocabularyPrefs` table**
   ```typescript
   export const knosiaUserVocabularyPrefs = pgTable(
     "knosia_user_vocabulary_prefs",
     {
       id: text().primaryKey().$defaultFn(generateId),
       userId: text().references(() => user.id, { onDelete: "cascade" }).notNull(),
       workspaceId: text().references(() => knosiaWorkspace.id, { onDelete: "cascade" }).notNull(),
       favorites: jsonb().$type<string[]>().default([]), // Vocabulary slugs
       synonyms: jsonb().$type<Record<string, string>>().default({}),
       recentlyUsed: jsonb().$type<{ slug: string; lastUsedAt: string; useCount: number }[]>().default([]),
       dismissedSuggestions: jsonb().$type<string[]>().default([]),
       privateVocabulary: jsonb().$type<{
         id: string;
         name: string;
         slug: string;
         type: "metric" | "dimension" | "filter";
         formula: string;
         description?: string;
         createdAt: string;
         updatedAt?: string;
       }[]>().default([]),
       createdAt: timestamp().notNull().defaultNow(),
       updatedAt: timestamp().$onUpdate(() => new Date()),
     },
     (table) => [unique().on(table.userId, table.workspaceId)]
   );
   ```

3. **Add indexes for efficient queries**
   ```sql
   CREATE INDEX idx_vocab_org_workspace ON knosia_vocabulary_item(org_id, workspace_id);
   CREATE INDEX idx_vocab_slug ON knosia_vocabulary_item(slug);
   CREATE INDEX idx_vocab_status ON knosia_vocabulary_item(status);
   CREATE UNIQUE INDEX idx_user_vocab_prefs ON knosia_user_vocabulary_prefs(user_id, workspace_id);
   ```

4. **Generate and apply migration**

**Files to modify:**
- `packages/db/src/schema/knosia.ts`
- `packages/db/src/schema/index.ts` (ensure exports)

---

### Phase 2: Core Vocabulary API (~2 hours)

**New module structure:**
```
packages/api/src/modules/knosia/vocabulary/
├── router.ts        ← Existing, extend with new routes
├── schemas.ts       ← Existing, add new schemas
├── queries.ts       ← Existing, add resolution queries
├── mutations.ts     ← Existing, add CRUD mutations
├── resolution.ts    ← NEW: Resolution algorithm
└── index.ts         ← Existing barrel
```

**Tasks:**

1. **Create resolution algorithm** (`resolution.ts`)
   ```typescript
   export async function resolveVocabulary(
     userId: string,
     workspaceId: string
   ): Promise<ResolvedVocabulary>

   export function searchVocabulary(
     query: string,
     resolved: ResolvedVocabulary
   ): SearchResult[]
   ```

2. **Add new schemas** (`schemas.ts`)
   ```typescript
   // List vocabulary
   export const listVocabularySchema = z.object({
     workspaceId: z.string().min(1),
     search: z.string().optional(),
     type: z.enum(["metric", "dimension", "entity", "event"]).optional(),
     scope: z.enum(["all", "org", "workspace", "private"]).optional(),
   });

   // Create vocabulary item
   export const createVocabularyItemSchema = z.object({
     workspaceId: z.string().optional(), // null = org-level
     orgId: z.string().min(1),
     canonicalName: z.string().min(1),
     slug: z.string().min(1),
     type: z.enum(["metric", "dimension", "entity", "event"]),
     definition: z.object({
       descriptionHuman: z.string().optional(),
       formulaHuman: z.string().optional(),
       formulaSql: z.string().optional(),
       sourceTables: z.array(z.string()).optional(),
     }).optional(),
     suggestedForRoles: z.array(z.string()).optional(),
   });

   // Update preferences
   export const updateVocabularyPrefsSchema = z.object({
     workspaceId: z.string().min(1),
     favorites: z.array(z.string()).optional(),
     synonyms: z.record(z.string()).optional(),
     dismissedSuggestions: z.array(z.string()).optional(),
   });

   // Create private vocabulary
   export const createPrivateVocabSchema = z.object({
     workspaceId: z.string().min(1),
     name: z.string().min(1),
     type: z.enum(["metric", "dimension", "filter"]),
     formula: z.string().min(1),
     description: z.string().optional(),
   });
   ```

3. **Add new queries** (`queries.ts`)
   ```typescript
   export async function getVocabularyList(input: ListVocabularyInput)
   export async function getVocabularyBySlug(orgId: string, slug: string)
   export async function getUserVocabularyPrefs(userId: string, workspaceId: string)
   ```

4. **Add new mutations** (`mutations.ts`)
   ```typescript
   export async function createVocabularyItem(input: CreateVocabularyItemInput)
   export async function updateVocabularyItem(id: string, input: UpdateVocabularyItemInput)
   export async function deprecateVocabularyItem(id: string)
   export async function updateUserVocabularyPrefs(userId: string, input: UpdatePrefsInput)
   export async function createPrivateVocabulary(userId: string, input: CreatePrivateVocabInput)
   export async function trackVocabularyUsage(userId: string, workspaceId: string, slug: string)
   ```

5. **Extend router** (`router.ts`)
   ```typescript
   // New routes:
   GET    /                          → List vocabulary (merged)
   GET    /:slug                     → Get vocabulary item detail
   POST   /                          → Create vocabulary item
   PATCH  /:id                       → Update vocabulary item
   POST   /:id/deprecate             → Mark as deprecated
   GET    /user/preferences          → Get user preferences
   PATCH  /user/preferences          → Update favorites, synonyms, dismissed
   POST   /user/private              → Create private formula
   PATCH  /user/private/:id          → Update private formula
   DELETE /user/private/:id          → Delete private formula
   POST   /user/track-usage          → Track vocabulary usage
   ```

**Files to create/modify:**
- `packages/api/src/modules/knosia/vocabulary/resolution.ts` (new)
- `packages/api/src/modules/knosia/vocabulary/schemas.ts` (extend)
- `packages/api/src/modules/knosia/vocabulary/queries.ts` (extend)
- `packages/api/src/modules/knosia/vocabulary/mutations.ts` (extend)
- `packages/api/src/modules/knosia/vocabulary/router.ts` (extend)

---

### Phase 3: User Preferences & Private Vocabulary (~1.5 hours)

**Tasks:**

1. **Implement favorites management**
   - Toggle favorite on vocabulary items
   - Store in `knosiaUserVocabularyPrefs.favorites[]`

2. **Implement synonyms management**
   - CRUD for personal synonyms
   - Store in `knosiaUserVocabularyPrefs.synonyms{}`

3. **Implement recently used tracking**
   - Auto-update on vocabulary usage
   - Store in `knosiaUserVocabularyPrefs.recentlyUsed[]`
   - Limit to 50 most recent

4. **Implement private vocabulary**
   - CRUD for personal formulas
   - Store in `knosiaUserVocabularyPrefs.privateVocabulary[]`
   - Generate unique slug from name

5. **Implement dismissed suggestions**
   - Track dismissed role suggestions
   - Filter from "suggested for you" section

---

### Phase 4: Role Suggestions (~1 hour)

**Tasks:**

1. **Populate `suggestedForRoles` during analysis**
   - Map metric categories to role archetypes
   - Revenue metrics → strategist, analyst
   - Customer metrics → operator, analyst
   - Technical metrics → builder

2. **Query suggested vocabulary for user**
   ```typescript
   async function getSuggestedVocabulary(
     userId: string,
     workspaceId: string
   ): Promise<VocabularyItem[]> {
     const membership = await getWorkspaceMembership(userId, workspaceId);
     const role = await getRoleTemplate(membership.roleId);
     const dismissed = await getDismissedSuggestions(userId, workspaceId);

     return db.select()
       .from(knosiaVocabularyItem)
       .where(and(
         sql`${knosiaVocabularyItem.suggestedForRoles} @> ${JSON.stringify([role.archetype])}::jsonb`,
         not(inArray(knosiaVocabularyItem.slug, dismissed))
       ));
   }
   ```

3. **Add dismiss endpoint**
   ```typescript
   POST /vocabulary/user/dismiss-suggestion
   { slug: string }
   ```

---

### Phase 5: Vocabulary Browser UI (~3 hours)

**New module structure:**
```
apps/web/src/modules/knosia/vocabulary/
├── components/
│   ├── vocabulary-browser.tsx      ← Main page component
│   ├── vocabulary-list.tsx         ← Grouped list (org/workspace/private)
│   ├── vocabulary-card.tsx         ← Individual item card
│   ├── vocabulary-detail.tsx       ← Detail panel/sheet
│   ├── favorites-section.tsx       ← Favorites with current values
│   ├── suggested-section.tsx       ← Role-based suggestions
│   ├── recent-section.tsx          ← Recently used
│   ├── private-formula-modal.tsx   ← Create/edit private formula
│   ├── synonyms-manager.tsx        ← Manage personal synonyms
│   └── search-input.tsx            ← Smart search with autocomplete
├── hooks/
│   ├── use-vocabulary.ts           ← Query vocabulary list
│   ├── use-vocabulary-prefs.ts     ← Query/mutate preferences
│   └── use-vocabulary-search.ts    ← Smart search hook
├── types.ts
└── index.ts
```

**Tasks:**

1. **Create vocabulary browser page**
   - Route: `/dashboard/knosia/vocabulary`
   - Sections: Favorites, Suggested, Org, Workspace, Private, Recent

2. **Create vocabulary list components**
   - Grouped by scope (org/workspace/private)
   - Expandable sections
   - Quick actions (favorite, use in query)

3. **Create detail panel**
   - Sheet/drawer for full details
   - Shows definition, formula, ownership
   - Actions: favorite, report issue, use in query

4. **Create private formula modal**
   - Create/edit personal formulas
   - Formula validation (reference existing metrics)
   - Slug auto-generation

5. **Create synonyms manager**
   - Table view of synonyms
   - Add/edit/delete

6. **Add search functionality**
   - Real-time search
   - Highlight matches
   - Rank by favorites, recently used

**Files to create:**
- `apps/web/src/modules/knosia/vocabulary/` (new module)
- `apps/web/src/app/[locale]/dashboard/knosia/vocabulary/page.tsx`

---

### Phase 6: Promotion & Governance (Future - P3)

**Tasks:**

1. **Propose to workspace flow**
   - Convert private → draft vocabulary item
   - Notify workspace admins

2. **Approval workflow**
   - Admin review pending items
   - Approve/reject with feedback
   - Status: draft → pending → approved

3. **Conflict prevention**
   - Validate slug uniqueness within scope
   - Prevent workspace from using org-level slugs

---

## Migration Path

### Step 1: Schema Migration

```bash
# 1. Add new column and table
pnpm with-env -F @turbostarter/db db:generate
# Review generated migration

# 2. Apply migration
pnpm with-env -F @turbostarter/db db:migrate
```

### Step 2: API Deployment

Deploy in order:
1. Resolution algorithm (no breaking changes)
2. New query/mutation functions
3. New API routes

### Step 3: UI Deployment

1. Add vocabulary module
2. Add page route
3. Add sidebar link

---

## Response Types

```typescript
// List response
interface VocabularyListResponse {
  data: {
    org: VocabularyItem[];
    workspace: VocabularyItem[];
    private: PrivateVocabularyItem[];
  };
  meta: {
    favorites: string[];
    suggested: string[];
    recentlyUsed: { slug: string; lastUsedAt: string }[];
  };
}

// Single item response
interface VocabularyItemResponse {
  data: VocabularyItem;
  meta: {
    isFavorite: boolean;
    usageCount: number;
    lastUsedAt: string | null;
  };
}

// Preferences response
interface VocabularyPreferencesResponse {
  favorites: string[];
  synonyms: Record<string, string>;
  dismissedSuggestions: string[];
  privateVocabulary: PrivateVocabularyItem[];
  recentlyUsed: { slug: string; lastUsedAt: string; count: number }[];
}
```

---

## Effort Estimate

| Phase | Description | Estimate |
|-------|-------------|----------|
| 1 | Schema Updates | 1 hour |
| 2 | Core Vocabulary API | 2 hours |
| 3 | User Preferences & Private Vocab | 1.5 hours |
| 4 | Role Suggestions | 1 hour |
| 5 | Vocabulary Browser UI | 3 hours |
| 6 | Promotion & Governance | 2 hours (future) |
| **Total (P1-P2)** | **Phases 1-5** | **8.5 hours** |

---

## Dependencies

- Phases 1 must complete before Phase 2
- Phase 2 must complete before Phases 3, 4, 5
- Phases 3, 4, 5 can run in parallel
- Phase 6 depends on all others

```
[Phase 1] ──→ [Phase 2] ──┬──→ [Phase 3]
                          ├──→ [Phase 4]
                          ├──→ [Phase 5]
                          └──→ [Phase 6] (future)
```

---

## Success Criteria

- [ ] User can view merged vocabulary (org + workspace + private)
- [ ] User can favorite/unfavorite vocabulary items
- [ ] User can create personal synonyms
- [ ] User can create private formulas
- [ ] User sees role-based suggestions
- [ ] User can dismiss suggestions
- [ ] Recently used items are tracked
- [ ] Search returns ranked results
- [ ] All scopes are clearly labeled in UI
