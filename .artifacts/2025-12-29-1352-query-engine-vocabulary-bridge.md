# Query Engine ↔ Vocabulary Bridge

> How the Knosia vocabulary architecture affects Query Engine implementation.
> Transfer this to the Query Engine implementation chat.

---

## TL;DR

The Query Engine's pattern matcher needs to resolve vocabulary at **3 levels**:

```
User says: "monthly revenue"
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  RESOLUTION ORDER                                                │
├─────────────────────────────────────────────────────────────────┤
│  1. User aliases    → user_preferences.aliases["monthly revenue"]│
│  2. Org aliases     → vocabulary_items.aliases (array)           │
│  3. Canonical match → vocabulary_items.canonical_name            │
│  4. Abbreviation    → vocabulary_items.abbreviation              │
│  5. Fuzzy match     → Levenshtein on all above                   │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
         Resolves to: @mrr (vocabulary_items.slug)
```

---

## VocabularyItem Structure (Query Engine Needs)

```typescript
interface VocabularyItem {
  // IDENTITY - what the matcher resolves to
  id: string;
  slug: string;                    // @mrr, #region, ~Q-1
  canonical_name: string;          // "Monthly Recurring Revenue"
  abbreviation: string;            // "MRR"
  aliases: string[];               // ["Monthly Revenue", "Recurring Rev"]

  // CLASSIFICATION - what LC DSL type this maps to
  type: "metric" | "dimension" | "entity" | "event";
  //      ↓           ↓            ↓          ↓
  //     @mrr       #region      $customer   !signup

  // SEMANTICS - affects response formatting
  direction: "higher_is_better" | "lower_is_better" | "neutral";
  format: "currency" | "percentage" | "count" | "duration";
  grain: "daily" | "weekly" | "monthly" | "point_in_time";

  // RELATIONSHIPS - for "why" queries
  components: string[];      // mrr → [new_mrr, expansion_mrr, churned_mrr]
  derived_from: string[];    // mrr derived from arr
  correlates_with: string[]; // mrr correlates with active_users
  inversely_correlates: string[]; // mrr inversely correlates with churn
  often_analyzed_with: string[]; // common co-queries

  // ROLE RELEVANCE - for ambiguous queries
  role_relevance: Record<string, {
    priority: "primary" | "secondary" | "context" | "hidden";
    in_briefing: boolean;
  }>;
}
```

---

## Resolution Examples

### Example 1: Simple Match

```
User: "revenue by region"
                │
Normalizer:     "revenue by region"
                │
Matcher:        ┌─────────────────────────────────────┐
                │ "revenue" → @revenue (alias match)  │
                │ "by"      → grouping indicator      │
                │ "region"  → #region (exact match)   │
                └─────────────────────────────────────┘
                │
Output:         Q @revenue #region
```

### Example 2: User Alias Override

```
User has: aliases: { "my mrr": "mrr" }

User: "show my mrr"
                │
Resolution:     1. Check user aliases → "my mrr" → "mrr"
                2. Resolve "mrr" → @mrr
                │
Output:         Q @mrr
```

### Example 3: Role-Aware Ambiguity

```
User (CEO): "how are we doing"
                │
Role context:   CEO.primary_kpis = [mrr, churn, nrr]
                │
Resolution:     Ambiguous → return top 3 from role context
                │
Output:         Q @mrr @churn @nrr ~MTD
```

### Example 4: "Why" Query Using Relationships

```
User: "why is MRR down"
                │
Resolver:       1. Identify @mrr
                2. direction = "higher_is_better" → "down" = bad
                3. components = [new_mrr, expansion_mrr, churned_mrr]
                │
Strategy:       Break into components, compare to baseline
                │
Output:         Q @new_mrr @expansion_mrr @churned_mrr ~MTD ~compare(M-1)
                + LLM analysis prompt
```

---

## Pattern Compiler Integration

The **Vocabulary Compiler** (from the implementation plan) generates patterns FROM vocabulary:

```typescript
// Input: vocabulary items
const vocabulary: VocabularyItem[] = [
  { slug: "mrr", canonical_name: "Monthly Recurring Revenue",
    abbreviation: "MRR", aliases: ["monthly revenue"], type: "metric" },
  { slug: "region", canonical_name: "Region", type: "dimension" },
  { slug: "Q-1", canonical_name: "Last Quarter", type: "time" },
];

// Output: generated patterns
const patterns: Pattern[] = [
  // From metric vocabulary
  { template: "{metric}", example: "mrr", slots: { metric: "@mrr" } },
  { template: "{metric} by {dimension}", slots: { metric: "@mrr", dimension: "#" } },
  { template: "show me {metric}", slots: { metric: "@" } },

  // With synonyms injected
  { template: "monthly recurring revenue", slots: {}, output: "Q @mrr" },
  { template: "monthly revenue", slots: {}, output: "Q @mrr" },  // from alias
  { template: "MRR", slots: {}, output: "Q @mrr" },              // from abbreviation
];
```

---

## Synonym Layers

```typescript
interface SynonymRegistry {
  // Global patterns (built-in)
  global: {
    "last quarter": "~Q-1",
    "this month": "~MTD",
    "year over year": "~compare(Y-1)",
    "by": "GROUP BY indicator",
    "per": "GROUP BY indicator",
    "trend": "~D-30",
  };

  // Org-level (from vocabulary_items.aliases)
  org: {
    "monthly revenue": "@mrr",      // from vocabulary
    "subscriber count": "@customers",
  };

  // User-level (from user_preferences.aliases)
  user: {
    "my number": "@mrr",            // personal alias
    "the board metric": "@arr",
  };
}

// Resolution order: user → org → global
function resolveSynonym(term: string, context: QueryContext): string {
  return context.userAliases[term]
      ?? context.orgAliases[term]
      ?? globalSynonyms[term]
      ?? term;
}
```

---

## Role Context for Disambiguation

When queries are ambiguous, use role context:

```typescript
interface RoleContext {
  role_id: string;
  primary_kpis: string[];      // What to show for "how are we doing"
  default_time_range: string;  // ~MTD vs ~WTD
  comparison_default: string;  // ~compare(M-1) vs ~compare(Y-1)
  detail_level: "summary" | "detailed"; // Affects aggregation
}

// Usage in matcher
function resolveAmbiguousQuery(
  normalized: string,
  role: RoleContext
): string {
  if (normalized === "how are we doing") {
    const metrics = role.primary_kpis.map(k => `@${k}`).join(" ");
    return `Q ${metrics} ${role.default_time_range}`;
  }
  // ...
}
```

---

## LLM Fallback Context

When falling back to LLM, provide vocabulary context:

```typescript
const llmPrompt = `
You are a query translator for a business intelligence system.

AVAILABLE VOCABULARY:
${vocabulary.map(v => `- @${v.slug}: ${v.canonical_name} (${v.type})`).join('\n')}

USER'S ROLE: ${role.name} (focuses on: ${role.primary_kpis.join(', ')})

USER'S ALIASES:
${Object.entries(userAliases).map(([k,v]) => `- "${k}" means "${v}"`).join('\n')}

RELATIONSHIPS:
${vocabulary.filter(v => v.components?.length).map(v =>
  `- ${v.slug} = ${v.components.join(' + ')}`
).join('\n')}

USER QUERY: "${userQuery}"

Output LC DSL:
`;
```

---

## Implementation Impact

### Pattern Compiler Changes

```typescript
// Before (static patterns):
const patterns = [
  { template: "revenue by {dimension}", ... }
];

// After (vocabulary-generated):
function compilePatterns(vocabulary: VocabularyItem[]): Pattern[] {
  const patterns: Pattern[] = [];

  for (const item of vocabulary) {
    // Generate from canonical name
    patterns.push({
      template: item.canonical_name.toLowerCase(),
      output: `@${item.slug}`,
      type: item.type,
    });

    // Generate from abbreviation
    if (item.abbreviation) {
      patterns.push({
        template: item.abbreviation.toLowerCase(),
        output: `@${item.slug}`,
      });
    }

    // Generate from aliases
    for (const alias of item.aliases) {
      patterns.push({
        template: alias.toLowerCase(),
        output: `@${item.slug}`,
      });
    }

    // Generate combination patterns
    if (item.type === "metric") {
      patterns.push({
        template: `${item.canonical_name.toLowerCase()} by {dimension}`,
        output: `Q @${item.slug} #{dimension}`,
      });
    }
  }

  return patterns;
}
```

### Matcher Changes

```typescript
interface MatcherConfig {
  vocabulary: VocabularyItem[];
  userAliases: Record<string, string>;
  roleContext: RoleContext;
}

class VocabularyAwareMatcher {
  private patterns: Pattern[];
  private synonyms: SynonymRegistry;

  constructor(config: MatcherConfig) {
    // Build patterns from vocabulary
    this.patterns = compilePatterns(config.vocabulary);

    // Build synonym layers
    this.synonyms = {
      global: GLOBAL_SYNONYMS,
      org: this.extractOrgSynonyms(config.vocabulary),
      user: config.userAliases,
    };
  }

  match(query: string): MatchResult {
    // 1. Normalize
    const normalized = this.normalize(query);

    // 2. Resolve synonyms (user → org → global)
    const resolved = this.resolveSynonyms(normalized);

    // 3. Match against patterns
    return this.matchPatterns(resolved);
  }
}
```

---

## API Contract

The Query Engine endpoint needs vocabulary context:

```typescript
// Request
POST /api/knosia/query
{
  "query": "revenue by region last quarter",
  "workspace_id": "...",
  "user_id": "...",
  // Vocabulary context is loaded server-side from these IDs
}

// Server loads:
// 1. vocabulary_items WHERE workspace_id = ? OR workspace_id IS NULL (org-level)
// 2. user_preferences.aliases WHERE user_id = ?
// 3. role_templates WHERE id = (user's role in this workspace)

// Response
{
  "lc_dsl": "Q @revenue #region ~Q-1",
  "confidence": 0.95,
  "matched_vocabulary": [
    { "term": "revenue", "resolved": "@revenue", "via": "canonical" },
    { "term": "region", "resolved": "#region", "via": "canonical" },
    { "term": "last quarter", "resolved": "~Q-1", "via": "global_synonym" }
  ],
  "fallback_used": false
}
```

---

## Summary: What Query Engine Needs

| Concept | How It Affects Query Engine |
|---------|----------------------------|
| **3-level aliases** | Resolution order: user → org → canonical |
| **Vocabulary type** | Maps to LC DSL sigil: metric→@, dimension→#, time→~ |
| **Relationships** | "Why" queries decompose into components |
| **Role context** | Resolves ambiguous queries ("how are we doing") |
| **Semantic metadata** | direction/format affects response framing |

---

## The 7 Hard Rules (Metadata Source)

The vocabulary items come with **metadata from extraction rules**. The Query Engine uses this metadata.

### Rule Reference

| Rule | Detects | Metadata Created | Query Engine Uses For |
|------|---------|------------------|----------------------|
| **1. Entity** | Table + PK | `type: "entity"` | `$customer` sigil mapping |
| **2. Relationship** | FK constraints | `relationships[]` | Auto-join in LC output |
| **3. Metric** | DECIMAL + pattern | `aggregation: SUM\|AVG` | Default aggregation |
| **4. Dimension** | ENUM/low-cardinality | `type: "dimension"` | `#region` sigil mapping |
| **5. Time Field** | DATE + pattern | `is_primary_time: bool` | `~Q-1` anchor resolution |
| **6. Filter** | BOOLEAN/is_/has_ | `type: "filter"` | `?active` sigil mapping |
| **7. Cardinality** | Column stats | `cardinality: number` | GROUP BY safety check |

### Vocabulary Item with Rule Metadata

```typescript
interface VocabularyItem {
  // ... identity fields ...

  // FROM RULE 3 (Metric Detection)
  aggregation?: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
  aggregation_confidence: number;  // 80-100%

  // FROM RULE 5 (Time Field)
  is_primary_time?: boolean;  // true = default for ~now

  // FROM RULE 7 (Cardinality)
  cardinality?: number;
  safe_for_groupby: boolean;  // cardinality < 100

  // FROM RULE 2 (Relationships)
  joins_to?: Array<{
    target_entity: string;  // slug
    via_column: string;
    relationship: "many_to_one" | "one_to_many" | "many_to_many";
  }>;
}
```

### Query Engine Uses Metadata

```typescript
// Example: "average order value by region"

function resolveQuery(tokens: Token[], vocabulary: VocabularyItem[]): string {
  const orderValue = vocabulary.find(v => v.slug === "order_value");
  const region = vocabulary.find(v => v.slug === "region");

  // Check if user overrode aggregation
  const userSaidAverage = tokens.some(t => t.value === "average");
  const aggregation = userSaidAverage ? "AVG" : orderValue.aggregation; // "SUM" from Rule 3

  // Check if dimension is safe
  if (!region.safe_for_groupby) {
    return ERROR("Region has too many values for grouping");
  }

  // Build LC with aggregation override if needed
  if (aggregation !== orderValue.aggregation) {
    return `Q @order_value:${aggregation} #region`;  // Override syntax
  }
  return `Q @order_value #region`;  // Use default
}
```

### Aggregation Override Patterns

The Query Engine should detect these patterns and override defaults:

| User Says | Default (from Rule 3) | Override To | LC Output |
|-----------|----------------------|-------------|-----------|
| "total revenue" | SUM | - | `Q @revenue` |
| "average revenue" | SUM | AVG | `Q @revenue:AVG` |
| "max revenue" | SUM | MAX | `Q @revenue:MAX` |
| "count of orders" | SUM | COUNT | `Q @orders:COUNT` |

### Time Field Resolution

Rule 5 marks one time field as `is_primary_time: true`. This is the default anchor:

```typescript
// "revenue last quarter" → which date field?
const primaryTime = vocabulary.find(v => v.is_primary_time);
// primaryTime.slug = "order_date" (from Rule 5 detection)

// Output: Q @revenue ~Q-1
// Compiler knows to use order_date for the time filter
```

### Relationship-Aware Joins

Rule 2 metadata enables automatic join resolution:

```typescript
// "revenue by customer region"
// revenue is on orders table
// region is on customers table
// Rule 2 detected: orders.customer_id → customers.id

const revenue = vocabulary.find(v => v.slug === "revenue");
const region = vocabulary.find(v => v.slug === "region");

// Check if join path exists
const joinPath = findJoinPath(revenue, region);
// joinPath = [{ from: "orders", to: "customers", via: "customer_id" }]

// LC Compiler uses this for JOIN clause generation
```

---

## Files to Transfer

1. This document
2. `.claude/artifacts/2025-12-29-knosia-architecture-vision.md` (full reference)
3. `.claude/artifacts/2025-12-29-0149-vocabulary-engine-architecture.md` (7 Hard Rules detail)

The Query Engine implementation should:
1. Accept vocabulary as input (loaded from DB)
2. Build patterns dynamically from vocabulary
3. Resolve synonyms in user → org → global order
4. Use role context for disambiguation
5. Pass vocabulary context to LLM fallback
6. **Use Rule 3 metadata for default aggregations**
7. **Use Rule 7 metadata to validate GROUP BY safety**
8. **Use Rule 5 metadata to resolve time anchors**
9. **Use Rule 2 metadata for join path discovery**
