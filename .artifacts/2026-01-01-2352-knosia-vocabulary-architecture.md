# Knosia Vocabulary Architecture

**Date:** 2026-01-01
**Status:** Approved
**Authors:** Claude + Human collaboration

---

## Executive Summary

Knosia's vocabulary system solves the semantic layer problem: "Active Users" means different things to Engineering, Product, Sales, and the CEO. This misalignment costs companies millions.

**Solution:** A 3-level vocabulary hierarchy that ensures everyone computes the same numbers while allowing domain-specific extensions and personal customization.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ORGANIZATION ─────── "What is true"      (governed)           │
│         ↓                                                       │
│   WORKSPACE ────────── "What is relevant"  (domain-specific)    │
│         ↓                                                       │
│   USER ─────────────── "What matters to me" (personal)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [3-Level Hierarchy](#2-3-level-hierarchy)
3. [Schema Design](#3-schema-design)
4. [Resolution Algorithm](#4-resolution-algorithm)
5. [UX Specification](#5-ux-specification)
6. [Governance Model](#6-governance-model)
7. [API Design](#7-api-design)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. Core Principles

### 1.1 Everyone Sees Everything

No hiding vocabulary based on role or permission. The CEO and analyst query the same "Revenue" metric and get the same number. Transparency builds trust.

### 1.2 Relevance Over Restriction

Role determines what's **surfaced first**, not what's accessible. Suggestions, not permissions.

```typescript
// ❌ Bad: Role restricts access
if (!userRole.canAccess("detailed_metrics")) throw "Access denied";

// ✅ Good: Role suggests relevance
const suggested = metrics.filter(m =>
  m.suggestedForRoles?.includes(userRole.archetype)
);
```

### 1.3 One Truth, Many Views

Organization defines canonical formulas. Workspaces add domain context. Users personalize their view. But the underlying computation is always the same.

### 1.4 Additive, Not Override

Lower levels can ADD vocabulary, never REDEFINE what exists above:

| Level | Can Add | Can Override |
|-------|---------|--------------|
| Organization | ✅ Define canonical metrics | N/A (top level) |
| Workspace | ✅ Add domain metrics | ❌ Cannot redefine org metrics |
| User | ✅ Add private formulas | ❌ Cannot redefine org/workspace |

### 1.5 Clear Ownership

Every vocabulary item has an owner. Users know who to contact for questions or corrections.

---

## 2. 3-Level Hierarchy

### 2.1 Organization Level

**Purpose:** Single source of truth for the entire company.

**What belongs here:**
- Core business metrics (Revenue, Churn, Active Users)
- Universal dimensions (Date, Country, Product)
- Company-wide entities (Customers, Orders, Subscriptions)

**Who manages:** Data team, admins, designated stewards.

**Schema indicator:** `workspaceId = NULL`

```typescript
// Organization-level vocabulary item
{
  workspaceId: null,           // NULL = org-level
  orgId: "acme-corp",
  canonicalName: "Monthly Recurring Revenue",
  slug: "mrr",
  type: "metric",
  status: "approved",
  definition: {
    formulaSql: "SUM(subscription_amount) WHERE status = 'active'",
    descriptionHuman: "Total recurring revenue from active subscriptions",
  },
  stewardUserId: "user-123",   // Data team member
  ownerTeam: "Data",
}
```

### 2.2 Workspace Level

**Purpose:** Domain-specific vocabulary tied to specific data connections.

**What belongs here:**
- Sales: Pipeline, Win Rate, Quota Attainment
- Finance: ARR, Burn Rate, Runway
- Product: DAU/MAU, Feature Adoption, Time to Value
- Support: Ticket Volume, CSAT, Resolution Time

**Who manages:** Workspace members with edit permissions.

**Schema indicator:** `workspaceId = "specific-workspace-id"`

```typescript
// Workspace-level vocabulary item
{
  workspaceId: "sales-analytics",  // Specific workspace
  orgId: "acme-corp",
  canonicalName: "Pipeline Value",
  slug: "pipeline_value",
  type: "metric",
  status: "approved",
  definition: {
    formulaSql: "SUM(opportunity_amount) WHERE stage != 'closed_lost'",
    descriptionHuman: "Total value of open opportunities",
  },
  stewardUserId: "user-456",   // Sales ops member
  ownerTeam: "Sales",
}
```

### 2.3 User Level

**Purpose:** Personal preferences and private formulas.

**Two aspects:**

#### 2.3.1 Preferences (View Customization)
- Favorites (pinned metrics)
- Synonyms ("my team" → "sales_west")
- Recently used (auto-tracked)
- Dismissed suggestions

#### 2.3.2 Private Vocabulary (Personal Formulas)
- Custom calculations only the user sees
- Experimental metrics before proposing to team
- Ad-hoc analysis shortcuts

**Who manages:** The user themselves. No governance needed.

```typescript
// User preferences
{
  userId: "user-789",
  workspaceId: "sales-analytics",
  favorites: ["mrr", "pipeline_value", "win_rate"],
  synonyms: {
    "my team": "sales_west_region",
    "this quarter": "Q1_2026",
    "rev": "mrr",
  },
  recentlyUsed: [
    { itemId: "pipeline_value", usedAt: "2026-01-01", count: 15 },
    { itemId: "mrr", usedAt: "2026-01-01", count: 8 },
  ],
  privateVocabulary: [
    {
      id: "pv-001",
      name: "my_conversion_rate",
      type: "metric",
      formula: "COUNT(won_deals) / COUNT(all_deals) * 100",
      description: "My personal conversion tracking",
      createdAt: "2026-01-01",
    },
  ],
}
```

---

## 3. Schema Design

### 3.1 Existing Tables (No Changes Required)

#### knosia_vocabulary_item

Already supports org vs workspace scoping:

```typescript
export const knosiaVocabularyItem = pgTable("knosia_vocabulary_item", {
  id: text().primaryKey().$defaultFn(generateId),

  // SCOPING: null = org-level, set = workspace-level
  workspaceId: text().references(() => knosiaWorkspace.id, {
    onDelete: "cascade",
  }),
  orgId: text()
    .references(() => knosiaOrganization.id, { onDelete: "cascade" })
    .notNull(),

  // IDENTITY
  canonicalName: text().notNull(),
  slug: text().notNull(),
  abbreviation: text(),
  aliases: jsonb().$type<string[]>().default([]),

  // CLASSIFICATION
  type: knosiaVocabularyTypeEnum().notNull(), // metric | dimension | entity | event
  category: text(),
  tags: jsonb().$type<string[]>().default([]),

  // DEFINITION
  definition: jsonb().$type<{
    descriptionHuman: string;
    formulaHuman?: string;
    formulaSql?: string;
    sourceTables?: string[];
    sourceColumn?: string;
    caveats?: string[];
    exampleValues?: { low: unknown; typical: unknown; high: unknown };
  }>(),

  // SEMANTICS
  semantics: jsonb().$type<{
    direction?: "higher_is_better" | "lower_is_better" | "target_range";
    format?: "currency" | "percentage" | "count" | "duration" | "ratio";
    grain?: "daily" | "weekly" | "monthly" | "point_in_time";
    sensitivity?: "public" | "internal" | "confidential" | "pii";
  }>(),

  // EXTRACTION METADATA
  aggregation: knosiaAggregationEnum(), // SUM | AVG | COUNT | MIN | MAX
  aggregationConfidence: integer(),

  // OWNERSHIP
  stewardUserId: text().references(() => user.id),
  ownerTeam: text(),

  // GOVERNANCE
  status: knosiaVocabularyStatusEnum().notNull().default("draft"),
  currentVersion: integer().default(1),

  // ROLE SUGGESTIONS (soft filter, not access control)
  suggestedForRoles: jsonb().$type<string[]>(),

  // TIMESTAMPS
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().$onUpdate(() => new Date()),
});
```

### 3.2 New Table: User Vocabulary Preferences

```typescript
export const knosiaUserVocabularyPrefs = pgTable(
  "knosia_user_vocabulary_prefs",
  {
    id: text().primaryKey().$defaultFn(generateId),
    userId: text()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: text()
      .references(() => knosiaWorkspace.id, { onDelete: "cascade" })
      .notNull(),

    // FAVORITES
    favorites: jsonb().$type<string[]>().default([]),
    // Array of vocabulary item slugs: ["mrr", "pipeline_value"]

    // SYNONYMS
    synonyms: jsonb().$type<Record<string, string>>().default({}),
    // { "my team": "sales_west", "rev": "mrr" }

    // RECENTLY USED (auto-tracked)
    recentlyUsed: jsonb().$type<{
      slug: string;
      lastUsedAt: string;
      useCount: number;
    }[]>().default([]),

    // DISMISSED SUGGESTIONS
    dismissedSuggestions: jsonb().$type<string[]>().default([]),
    // Slugs of items user dismissed from "suggested for you"

    // PRIVATE VOCABULARY
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

    // TIMESTAMPS
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().$onUpdate(() => new Date()),
  },
  (table) => [
    // Unique constraint: one preferences record per user per workspace
    unique().on(table.userId, table.workspaceId),
  ]
);
```

### 3.3 Indexes

```sql
-- Fast lookup for vocabulary resolution
CREATE INDEX idx_vocab_org_workspace ON knosia_vocabulary_item(org_id, workspace_id);
CREATE INDEX idx_vocab_slug ON knosia_vocabulary_item(slug);
CREATE INDEX idx_vocab_status ON knosia_vocabulary_item(status);

-- Fast lookup for user preferences
CREATE INDEX idx_user_vocab_prefs ON knosia_user_vocabulary_prefs(user_id, workspace_id);
```

---

## 4. Resolution Algorithm

When a user queries vocabulary (search, autocomplete, or NL→SQL):

```typescript
async function resolveVocabulary(
  userId: string,
  workspaceId: string
): Promise<ResolvedVocabulary> {
  const workspace = await getWorkspace(workspaceId);
  const userRole = await getUserRole(userId, workspaceId);
  const userPrefs = await getUserVocabularyPrefs(userId, workspaceId);

  // 1. Get organization-level vocabulary (workspaceId IS NULL)
  const orgVocab = await db
    .select()
    .from(knosiaVocabularyItem)
    .where(
      and(
        eq(knosiaVocabularyItem.orgId, workspace.orgId),
        isNull(knosiaVocabularyItem.workspaceId),
        eq(knosiaVocabularyItem.status, "approved")
      )
    );

  // 2. Get workspace-level vocabulary
  const workspaceVocab = await db
    .select()
    .from(knosiaVocabularyItem)
    .where(
      and(
        eq(knosiaVocabularyItem.workspaceId, workspaceId),
        eq(knosiaVocabularyItem.status, "approved")
      )
    );

  // 3. Merge (workspace extends org, no conflicts possible due to scope)
  const sharedVocab = [...orgVocab, ...workspaceVocab];

  // 4. Add user's private vocabulary
  const privateVocab = userPrefs?.privateVocabulary || [];

  // 5. Build synonym map (user synonyms take precedence)
  const synonyms = {
    global: buildGlobalSynonyms(sharedVocab),  // From aliases field
    user: userPrefs?.synonyms || {},
  };

  // 6. Determine suggested items for this role
  const suggested = sharedVocab.filter(item =>
    item.suggestedForRoles?.includes(userRole?.archetype) &&
    !userPrefs?.dismissedSuggestions?.includes(item.slug)
  );

  // 7. Return resolved vocabulary
  return {
    shared: sharedVocab,
    private: privateVocab,
    favorites: userPrefs?.favorites || [],
    suggested: suggested.map(s => s.slug),
    recentlyUsed: userPrefs?.recentlyUsed || [],
    synonyms,
  };
}
```

### 4.1 Search Resolution

When user searches for a term:

```typescript
function searchVocabulary(
  query: string,
  resolved: ResolvedVocabulary
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  // 1. Check user synonyms first (highest priority)
  if (resolved.synonyms.user[queryLower]) {
    const target = resolved.synonyms.user[queryLower];
    const item = findBySlug(resolved.shared, target);
    if (item) results.push({ item, matchType: "synonym", priority: 1 });
  }

  // 2. Check exact slug match
  const exactSlug = resolved.shared.find(v => v.slug === queryLower);
  if (exactSlug) results.push({ item: exactSlug, matchType: "exact", priority: 2 });

  // 3. Check canonical name match
  const nameMatch = resolved.shared.filter(v =>
    v.canonicalName.toLowerCase().includes(queryLower)
  );
  nameMatch.forEach(item =>
    results.push({ item, matchType: "name", priority: 3 })
  );

  // 4. Check aliases
  const aliasMatch = resolved.shared.filter(v =>
    v.aliases?.some(a => a.toLowerCase().includes(queryLower))
  );
  aliasMatch.forEach(item =>
    results.push({ item, matchType: "alias", priority: 4 })
  );

  // 5. Check private vocabulary
  const privateMatch = resolved.private.filter(v =>
    v.name.toLowerCase().includes(queryLower) ||
    v.slug.toLowerCase().includes(queryLower)
  );
  privateMatch.forEach(item =>
    results.push({ item, matchType: "private", priority: 5 })
  );

  // 6. Boost favorites and recently used
  return results
    .map(r => ({
      ...r,
      priority: resolved.favorites.includes(r.item.slug)
        ? r.priority - 0.5
        : r.priority,
    }))
    .sort((a, b) => a.priority - b.priority);
}
```

---

## 5. UX Specification

### 5.1 Vocabulary Browser Page

**Route:** `/dashboard/knosia/vocabulary`

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Vocabulary                              🔍 Search...        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⭐ YOUR FAVORITES                                      [Edit]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MRR              $2.4M    ↑ 12% MoM      [···]        │   │
│  │  Pipeline Value   $890K    → Stable       [···]        │   │
│  │  Win Rate         34%      ↓ 2% WoW       [···]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🎯 SUGGESTED FOR YOU (Sales Manager)              [Dismiss all]│
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Quota Attainment    Commonly used by your role         │   │
│  │  Deal Velocity       New metric available               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🏢 COMPANY-WIDE (12 metrics)                      [View all →]│
│  │  Revenue • Active Users • Churn Rate • NRR • ...           │
│                                                                 │
│  📁 SALES WORKSPACE (8 metrics)                    [View all →]│
│  │  Pipeline • Win Rate • Quota • Deals Closed • ...          │
│                                                                 │
│  🔒 MY PRIVATE (2 formulas)                        [+ Add New] │
│  │  my_conversion_rate • q4_pipeline                          │
│                                                                 │
│  🕐 RECENTLY USED                                               │
│  │  Pipeline Value • MRR • Win Rate • Quota Attainment        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Vocabulary Detail Panel

When user clicks a vocabulary item:

```
┌─────────────────────────────────────────────────────────────────┐
│  Monthly Recurring Revenue (MRR)                    ⭐ ✕        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  $2.4M                                          ↑ 12% vs LM    │
│  ══════════════════════════════════════════════════            │
│                                                                 │
│  DEFINITION                                                     │
│  Total recurring revenue from active subscriptions,             │
│  excluding one-time charges and refunds.                        │
│                                                                 │
│  FORMULA                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SUM(subscription_amount)                                │   │
│  │ WHERE status = 'active'                                 │   │
│  │   AND charge_type = 'recurring'                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  DETAILS                                                        │
│  Type:        Metric                                            │
│  Aggregation: SUM                                               │
│  Format:      Currency (USD)                                    │
│  Direction:   Higher is better                                  │
│  Grain:       Monthly                                           │
│                                                                 │
│  OWNERSHIP                                                      │
│  Owner:       Finance Team                                      │
│  Steward:     Jane Smith (@jane)                                │
│  Last updated: Dec 15, 2025                                     │
│                                                                 │
│  ALSO KNOWN AS                                                  │
│  "MRR", "Monthly Revenue", "Recurring Revenue"                  │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ + Favorite   │ │ Report Issue │ │ Use in Query │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Add Private Formula Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Private Formula                                    ✕    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NAME                                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ My Conversion Rate                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SLUG (auto-generated)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ my_conversion_rate                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  FORMULA                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ COUNT(deals WHERE status = 'won') /                     │   │
│  │ COUNT(deals) * 100                                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  💡 You can reference existing metrics like {pipeline_value}    │
│                                                                 │
│  DESCRIPTION (optional)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Personal conversion tracking for my deals               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔒 This formula is private. Only you can see it.              │
│                                                                 │
│                              ┌──────────┐ ┌──────────────────┐ │
│                              │  Cancel  │ │  Create Formula  │ │
│                              └──────────┘ └──────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Promote to Workspace Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Propose to Workspace                                      ✕    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You're proposing "my_conversion_rate" to become a shared       │
│  metric in the Sales workspace.                                 │
│                                                                 │
│  CANONICAL NAME                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Conversion Rate                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  DESCRIPTION                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Percentage of deals that convert to won status          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  FORMULA                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ COUNT(deals WHERE status = 'won') / COUNT(deals) * 100  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SUGGESTED FOR ROLES                                            │
│  ☑ Sales    ☑ Executive    ☐ Product    ☐ Finance              │
│                                                                 │
│  ⚠️ This will be visible to all members of Sales workspace.    │
│     A workspace admin will review your proposal.                │
│                                                                 │
│                              ┌──────────┐ ┌──────────────────┐ │
│                              │  Cancel  │ │  Submit Proposal │ │
│                              └──────────┘ └──────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Synonym Management

```
┌─────────────────────────────────────────────────────────────────┐
│  My Synonyms                                        [+ Add New] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  When I say...          Knosia understands...                   │
│  ─────────────────────────────────────────────────────────────  │
│  "my team"         →    sales_west_region           [Edit] [✕]  │
│  "rev"             →    mrr                         [Edit] [✕]  │
│  "this quarter"    →    Q1_2026                     [Edit] [✕]  │
│  "conversion"      →    win_rate                    [Edit] [✕]  │
│                                                                 │
│  💡 Synonyms help Knosia understand your personal terminology.  │
│     They only apply to your queries.                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Governance Model

### 6.1 Status Workflow

```
                    ┌─────────┐
                    │  DRAFT  │
                    └────┬────┘
                         │ Submit for review
                         ▼
                    ┌─────────┐
               ┌────│ PENDING │────┐
               │    └─────────┘    │
          Approve              Reject
               ▼                   ▼
         ┌──────────┐        ┌──────────┐
         │ APPROVED │        │   DRAFT  │ (with feedback)
         └────┬─────┘        └──────────┘
              │
              │ Deprecate
              ▼
         ┌────────────┐
         │ DEPRECATED │
         └─────┬──────┘
               │ Archive
               ▼
          ┌──────────┐
          │ ARCHIVED │
          └──────────┘
```

### 6.2 Permission Matrix

| Action | Org Admin | Workspace Admin | Workspace Member | User |
|--------|-----------|-----------------|------------------|------|
| View all vocabulary | ✅ | ✅ | ✅ | ✅ |
| Create org-level | ✅ | ❌ | ❌ | ❌ |
| Approve org-level | ✅ | ❌ | ❌ | ❌ |
| Create workspace-level | ✅ | ✅ | ✅ (as draft) | ❌ |
| Approve workspace-level | ✅ | ✅ | ❌ | ❌ |
| Create private formula | ✅ | ✅ | ✅ | ✅ |
| Manage own synonyms | ✅ | ✅ | ✅ | ✅ |
| Propose to workspace | ✅ | ✅ | ✅ | ✅ |

### 6.3 Conflict Prevention

Conflicts are prevented by scoping rules:

```typescript
async function validateVocabularyCreation(
  newItem: CreateVocabularyInput,
  scope: "org" | "workspace",
  workspaceId?: string
): Promise<ValidationResult> {
  // 1. Check slug uniqueness within scope
  const existingBySlug = await db
    .select()
    .from(knosiaVocabularyItem)
    .where(eq(knosiaVocabularyItem.slug, newItem.slug));

  for (const existing of existingBySlug) {
    // Conflict if same org and (both org-level OR same workspace)
    if (existing.orgId === newItem.orgId) {
      if (!existing.workspaceId && scope === "org") {
        return { valid: false, error: "Slug already exists at org level" };
      }
      if (existing.workspaceId === workspaceId) {
        return { valid: false, error: "Slug already exists in this workspace" };
      }
    }
  }

  // 2. Workspace cannot use slug that exists at org level
  if (scope === "workspace") {
    const orgLevel = existingBySlug.find(e =>
      e.orgId === newItem.orgId && !e.workspaceId
    );
    if (orgLevel) {
      return {
        valid: false,
        error: `Slug "${newItem.slug}" is reserved by org-level vocabulary`
      };
    }
  }

  return { valid: true };
}
```

---

## 7. API Design

### 7.1 Endpoints

```
GET    /api/knosia/vocabulary
       → List vocabulary for current workspace (merged org + workspace + private)
       Query: ?search=revenue&type=metric&scope=all|org|workspace|private

GET    /api/knosia/vocabulary/:slug
       → Get single vocabulary item detail

POST   /api/knosia/vocabulary
       → Create vocabulary item (org or workspace level based on permissions)

PATCH  /api/knosia/vocabulary/:id
       → Update vocabulary item

DELETE /api/knosia/vocabulary/:id
       → Delete vocabulary item (or archive if has usage)

POST   /api/knosia/vocabulary/:id/deprecate
       → Mark as deprecated

POST   /api/knosia/vocabulary/:id/approve
       → Approve draft item (admin only)

GET    /api/knosia/vocabulary/user/preferences
       → Get user's vocabulary preferences

PATCH  /api/knosia/vocabulary/user/preferences
       → Update favorites, synonyms, dismissed suggestions

POST   /api/knosia/vocabulary/user/private
       → Create private formula

PATCH  /api/knosia/vocabulary/user/private/:id
       → Update private formula

DELETE /api/knosia/vocabulary/user/private/:id
       → Delete private formula

POST   /api/knosia/vocabulary/user/private/:id/propose
       → Propose private formula to workspace

POST   /api/knosia/vocabulary/user/track-usage
       → Track vocabulary usage (for recently used)
```

### 7.2 Response Types

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

## 8. Implementation Plan

### Phase 1: Core (V1.0) - ~4 hours

**Already implemented:**
- [x] `knosia_vocabulary_item` table with org/workspace scoping
- [x] Basic CRUD API for vocabulary
- [x] UVB schema extraction
- [x] Hard rules for auto-detection

**Remaining:**
- [ ] Add `suggestedForRoles` field to vocabulary item
- [ ] Ensure resolution query handles org vs workspace correctly

### Phase 2: User Preferences (V1.1) - ~3 hours

- [ ] Create `knosia_user_vocabulary_prefs` table
- [ ] Migration
- [ ] API endpoints for preferences
- [ ] Frontend: Favorites toggle on vocabulary items
- [ ] Frontend: Synonym management UI
- [ ] Auto-track recently used

### Phase 3: Private Vocabulary (V1.2) - ~3 hours

- [ ] API for private formula CRUD
- [ ] Frontend: Add private formula modal
- [ ] Formula validation (reference existing metrics)
- [ ] Private vocab in search results

### Phase 4: Role Suggestions (V1.3) - ~2 hours

- [ ] Populate `suggestedForRoles` during onboarding
- [ ] "Suggested for you" section in vocabulary browser
- [ ] Dismiss suggestion functionality

### Phase 5: Promotion Flow (V1.4) - ~2 hours

- [ ] "Propose to workspace" API
- [ ] Proposal notification to workspace admins
- [ ] Approve/reject workflow
- [ ] Convert private → workspace item on approval

### Phase 6: Vocabulary Browser UI (V1.5) - ~4 hours

- [ ] Full vocabulary browser page
- [ ] Detail panel component
- [ ] Search with smart ranking
- [ ] Grouped display (org/workspace/private)

---

## Summary

| Level | Purpose | Who Manages | Schema Key |
|-------|---------|-------------|------------|
| **Organization** | Single truth | Data team | `workspaceId = NULL` |
| **Workspace** | Domain metrics | Workspace members | `workspaceId = "xxx"` |
| **User** | Personalization | Self | `knosia_user_vocabulary_prefs` |

**Core Philosophy:**

> Organization defines truth. Workspace adds context. User personalizes view. Everyone computes the same numbers.

---

*End of Vocabulary Architecture Document*
