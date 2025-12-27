# LiquidConnect Architecture

> **Deterministic context delivery for LLM-powered visualization**

| Version | 1.3 |
|---------|-----|
| Status | Production-Ready |
| Date | 2025-12-26 |

---

## 1. Design Principles

1. **Model reasons, system delivers** — LLM interprets user intent; system deterministically supplies minimal context
2. **Same input = same output** — Deterministic behavior enables testing, debugging, trust
3. **Precompute, don't explore** — Build context at sync time, pack at query time
4. **Hard budgets** — Token limits, scan limits, time limits are non-negotiable
5. **Escape hatches, not defaults** — MCP tools for edge cases, not the hot path

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYNC TIME                                       │
│                         (minutes/hours, async)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│   │  Sources │───▶│ Introspector │───▶│ Context Store│───▶│ Index/Slice │  │
│   │          │    │              │    │              │    │  Generator  │  │
│   │ Postgres │    │ • Schema     │    │ • Assets     │    │             │  │
│   │ MySQL    │    │ • Profile    │    │ • Columns    │    │ • index.json│  │
│   │ XLSX/CSV │    │ • Classify   │    │ • Relations  │    │ • slices/*  │  │
│   │ REST API │    │ • Relate     │    │ • Overrides  │    │             │  │
│   └──────────┘    └──────────────┘    └──────────────┘    └─────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              QUERY TIME                                      │
│                          (milliseconds, sync)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│   │  Query   │───▶│    Packer    │───▶│   Context    │───▶│    LLM      │  │
│   │          │    │              │    │    Pack      │    │             │  │
│   │ "Show    │    │ • Score      │    │              │    │ • Reason    │  │
│   │  revenue │    │ • Select     │    │ ~1200 tokens │    │ • Generate  │  │
│   │  by      │    │ • Load       │    │ + trace      │    │   DSL       │  │
│   │  region" │    │ • Prune      │    │              │    │             │  │
│   └──────────┘    └──────────────┘    └──────────────┘    └─────────────┘  │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                     NO LLM IN THIS PATH ▲                            │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Artifacts

### 3.1 index.json (2-20KB, always loaded)

```json
{
  "version": 1,
  "tenantId": "acme",
  "generatedAt": "2025-12-26T10:00:00Z",

  "domains": {
    "sales": {
      "assets": ["orders", "customers", "products"],
      "metrics": ["revenue", "order_count", "aov"],
      "dimensions": ["region", "segment", "status"],
      "signals": {
        "hasTemporal": true,
        "hasCurrency": true,
        "rowCountTier": "large"
      },
      "slicePath": "slices/sales.json"
    },
    "inventory": {
      "assets": ["stock", "warehouses"],
      "metrics": ["stock_level", "turnover"],
      "dimensions": ["warehouse", "category"],
      "signals": {
        "hasTemporal": true,
        "hasCurrency": false,
        "rowCountTier": "medium"
      },
      "slicePath": "slices/inventory.json"
    }
  },

  "vocabulary": {
    "revenue": { "type": "metric", "id": "revenue", "domain": "sales" },
    "sales": { "type": "metric", "id": "revenue", "domain": "sales" },
    "income": { "type": "metric", "id": "revenue", "domain": "sales" },
    "region": { "type": "dimension", "id": "region", "domain": "sales" },
    "orders": { "type": "asset", "id": "orders", "domain": "sales" }
  },

  "relationshipEdges": [
    {
      "id": "orders_customers",
      "fromColumn": "orders.customer_id",
      "toColumn": "customers.id",
      "cardinality": "many-to-one",
      "discoverySource": "foreign_key",
      "confidence": 1.0,
      "validated": true
    },
    {
      "id": "orders_products",
      "fromColumn": "order_items.product_id",
      "toColumn": "products.id",
      "cardinality": "many-to-one",
      "discoverySource": "inferred_name",
      "confidence": 0.85,
      "validated": false
    }
  ],

  // Canonical discoverySource enum (enforced everywhere):
  // - "foreign_key"    : DB-defined FK constraint (confidence=1.0, auto-validated)
  // - "inferred_name"  : Column name pattern match (e.g., *_id → *.id)
  // - "inferred_value" : Value overlap analysis (sampling-based)
  // - "manual"         : Admin-created via UI/API

  "joinPaths": {
    "orders→customers": {
      "edges": ["orders_customers"],
      "depth": 1,
      "cost": 1
    },
    "orders→products": {
      "edges": ["orders_products"],
      "depth": 1,
      "cost": 1
    }
  }
}
```

### 3.2 slices/<domain>.json (5-50KB each, lazy loaded)

```json
{
  "domain": "sales",
  "version": 1,
  "generatedAt": "2025-12-26T10:00:00Z",
  "tokenCount": 850,

  "assets": [
    { "id": "orders", "name": "Orders", "description": "Customer orders" },
    { "id": "customers", "name": "Customers" },
    { "id": "products", "name": "Products" }
  ],

  "columns": [
    { "id": "orders.id", "assetId": "orders", "name": "id", "role": "identifier" },
    { "id": "orders.customer_id", "assetId": "orders", "name": "customer_id", "role": "foreign_key" },
    { "id": "orders.amount", "assetId": "orders", "name": "amount", "role": "metric" },
    { "id": "orders.status", "assetId": "orders", "name": "status", "role": "dimension" },
    { "id": "orders.created_at", "assetId": "orders", "name": "created_at", "role": "temporal" },
    { "id": "customers.id", "assetId": "customers", "name": "id", "role": "identifier" },
    { "id": "customers.segment", "assetId": "customers", "name": "segment", "role": "dimension" }
  ],

  "relationships": [
    { "from": "orders.customer_id", "to": "customers.id", "type": "many-to-one" }
  ],

  "metrics": [
    { "id": "revenue", "name": "Revenue", "expression": "sum(orders.amount)" },
    { "id": "order_count", "name": "Order Count", "expression": "count(orders.id)" },
    { "id": "aov", "name": "AOV", "expression": "avg(orders.amount)" }
  ],

  "dimensions": [
    { "id": "region", "name": "Region", "columnId": "customers.region" },
    { "id": "segment", "name": "Segment", "columnId": "customers.segment", "values": ["free", "pro", "enterprise"] },
    { "id": "status", "name": "Status", "columnId": "orders.status", "values": ["pending", "shipped", "delivered"] }
  ]
}
```

---

## 4. Packer Algorithm

```
pack(query, index, loadSlice, config) → ContextPack
```

### Steps (no LLM, deterministic):

| Step | Input | Output | Complexity |
|------|-------|--------|------------|
| 1. Tokenize | query string | tokens[] | O(n) |
| 2. Score | tokens + index | scoredDomains[] | O(domains × tokens) |
| 3. Select | scoredDomains | topN domains | O(1) |
| 4. Load | domain paths | slices[] | O(slices) |
| 5. Merge | slices[] | merged context | O(columns) |
| 6. Connect | merged + edges | + join paths | O(V+E), bounded by maxDepth |
| 7. Prune | merged + budget | pruned context | O(columns log columns) |
| 8. Trace | all above | PackTrace | O(1) |

### Pruning Priority (when over budget):

1. Remove samples
2. Remove stats
3. Keep only essential roles (metric, dimension, temporal, identifier, foreign_key)
4. Drop dimension values
5. Limit columns per asset (max 5)

### Default Config:

```typescript
{
  tokenBudget: 1200,
  maxSlices: 3,
  includeRoles: ['metric', 'dimension', 'temporal', 'identifier', 'foreign_key'],
  includeSamples: false,
  includeStats: false,
  joinMaxDepth: 3,
  joinMaxPaths: 5,
  minEdgeConfidence: 0.7
}
```

### Deterministic Ordering (Critical for Reproducibility)

**Tokenization**:
- Lowercase all input
- Remove punctuation except hyphens/underscores
- Split on whitespace
- No stemming (exact match only)
- Locale: invariant (ASCII folding for non-ASCII)

**Scoring Tie-Breaks** (applied in order):
1. Score descending
2. Domain name ascending (alphabetical)
3. Asset name ascending

**Merge Order**:
1. Domains: alphabetical by name
2. Assets within domain: alphabetical by name
3. Columns within asset: by role priority, then alphabetical
4. Role priority: `identifier` > `foreign_key` > `metric` > `dimension` > `temporal` > `text`

**Pruning Order** (when over budget, drop first):
1. Columns with lowest role priority
2. Within same role: lowest-scoring domain's columns first
3. Within same domain: alphabetical (last alphabetically dropped first)

**Artifact Generation**:
- All JSON keys sorted alphabetically
- All arrays sorted by `id` or `name`
- `generatedAt` excluded from golden test comparisons

### Join Path Computation (BFS)

Replace O(assets²) connectivity check with bounded BFS:

```typescript
function findJoinPath(
  fromAsset: string,
  toAsset: string,
  edges: RelationshipEdge[],
  config: { maxDepth: number; maxPaths: number; minConfidence: number }
): JoinPath[] {
  // BFS over approved edges only
  // Filter edges: confidence >= minConfidence AND validated === true
  // Stop at maxDepth
  // Return top maxPaths by cost (fewest edges)
  // Complexity: O(V + E) per query, bounded by maxDepth
}
```

**Join Path Selection** (enterprise-safe rules):

```typescript
function isEdgeUsable(edge: RelationshipEdge): boolean {
  // Rule 1: Validated edges always usable
  if (edge.validated) return true;

  // Rule 2: Foreign keys auto-trusted even if not explicitly validated
  if (edge.discoverySource === 'foreign_key' && edge.confidence >= 0.95) return true;

  // Rule 3: Everything else requires validation
  // Unvalidated inferred edges are "suggested only" → approval workflow
  return false;
}
```

**Selection Order**:
1. Use precomputed `joinPaths` from index if available (already validated)
2. Fall back to runtime BFS over `isEdgeUsable()` edges only
3. Reject if no valid path within depth limit
4. **Unvalidated inferred edges**: Surface via escape hatch for admin approval, never auto-use

---

## 5. Formal Schemas (Versioned Contracts)

### 5.1 ContextPack Schema (v1)

```typescript
interface ContextPack {
  // Schema version for backwards compatibility
  schemaVersion: 1;

  // Content
  assets: SliceAsset[];
  columns: SliceColumn[];
  relationships: ResolvedJoin[];
  metrics: SliceMetric[];
  dimensions: SliceDimension[];

  // Budgeting
  tokenCount: number;
  tokenBudget: number;

  // Traceability (required)
  trace: PackTrace;
}

interface ResolvedJoin {
  id: string;
  fromColumn: string;
  toColumn: string;
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  pathDepth: number;
  confidence: number;
}
```

### 5.2 PackTrace Schema (v1) — The Audit Contract

```typescript
interface PackTrace {
  // Schema version
  schemaVersion: 1;

  // Input
  query: string;
  queryTokens: string[];
  configSnapshot: PackerConfig;

  // Scoring
  vocabHits: Array<{ term: string; target: VocabTarget }>;
  domainScores: Array<{ domain: string; score: number; rank: number }>;

  // Selection
  domainsSelected: string[];
  slicesLoaded: string[];

  // Join resolution
  joinPathsResolved: Array<{
    from: string;
    to: string;
    path: string[];
    depth: number;
    confidence: number;
  }>;

  // Pruning audit
  pruning: {
    initialColumns: number;
    initialTokens: number;
    steps: Array<{
      rule: 'samples' | 'stats' | 'roles' | 'dimension_values' | 'column_limit';
      columnsBefore: number;
      columnsAfter: number;
      tokensBefore: number;
      tokensAfter: number;
    }>;
    finalColumns: number;
    finalTokens: number;
  };

  // Timing
  timingMs: {
    tokenize: number;
    score: number;
    load: number;
    merge: number;
    connect: number;
    prune: number;
    total: number;
  };

  // Reproducibility
  checksum: string;  // SHA256 of canonicalized ContextPack (see below)
}

/**
 * Checksum Canonicalization Rules
 * ================================
 * The checksum ensures reproducibility: same input = same checksum.
 *
 * 1. Canonical JSON Serialization:
 *    - Object keys: sorted alphabetically at all levels
 *    - Arrays: sorted by `id` field if present, else by first string field
 *    - No whitespace (compact JSON)
 *
 * 2. Field Normalization:
 *    - confidence: round to 2 decimal places (0.8523 → 0.85)
 *    - tokenCount: integer only
 *    - All strings: trimmed, NFC normalized
 *
 * 3. Excluded Fields (runtime-only, not part of content identity):
 *    - trace.timingMs (varies per execution)
 *    - trace.checksum (circular)
 *    - Any field matching /_at$/ (timestamps)
 *
 * 4. Implementation:
 */
function computeChecksum(pack: ContextPack): string {
  const canonical = {
    schemaVersion: pack.schemaVersion,
    assets: sortById(pack.assets),
    columns: sortById(pack.columns),
    relationships: sortById(pack.relationships),
    metrics: sortById(pack.metrics),
    dimensions: sortById(pack.dimensions),
    tokenCount: pack.tokenCount,
    tokenBudget: pack.tokenBudget,
    // trace excluded except for input fingerprint
    traceInput: {
      query: pack.trace.query,
      queryTokens: pack.trace.queryTokens.sort(),
      configSnapshot: sortKeys(pack.trace.configSnapshot)
    }
  };

  const json = JSON.stringify(canonical, jsonReplacer);
  return SHA256(json);
}

function jsonReplacer(key: string, value: unknown): unknown {
  if (key.endsWith('_at') || key === 'timingMs') return undefined;
  if (typeof value === 'number' && key === 'confidence') {
    return Math.round(value * 100) / 100;
  }
  return value;
}
```

### 5.3 Token Estimation with Field Weights

```typescript
interface TokenEstimator {
  // Versioned for reproducibility and calibration tracking
  version: string;  // e.g., "v1.2.0"
  calibratedAt: Date;
  calibrationAccuracy: number;  // e.g., 0.95 = estimates within 5% of actual

  weights: TokenWeights;
}

interface TokenWeights {
  asset: { base: 15, perChar: 0.25 };
  column: { base: 10, perChar: 0.25, withSample: 25, withStats: 15 };
  relationship: { base: 8 };
  metric: { base: 12, perExpressionChar: 0.3 };
  dimension: { base: 8, perValue: 2 };
}

function estimateTokens(pack: ContextPack, estimator: TokenEstimator): number {
  const weights = estimator.weights;
  let tokens = 0;

  for (const asset of pack.assets) {
    tokens += weights.asset.base + (asset.name.length * weights.asset.perChar);
  }

  for (const col of pack.columns) {
    tokens += weights.column.base + (col.name.length * weights.column.perChar);
    if (col.samples) tokens += weights.column.withSample;
    if (col.stats) tokens += weights.column.withStats;
  }

  tokens += pack.relationships.length * weights.relationship.base;

  for (const metric of pack.metrics) {
    tokens += weights.metric.base + (metric.expression.length * weights.metric.perExpressionChar);
  }

  for (const dim of pack.dimensions) {
    tokens += weights.dimension.base;
    if (dim.values) tokens += dim.values.length * weights.dimension.perValue;
  }

  return Math.ceil(tokens);
}
```

**Calibration Protocol**:
```typescript
interface CalibrationResult {
  samplesChecked: number;
  meanError: number;        // (estimated - actual) / actual
  maxUndercount: number;    // Worst underestimate
  maxOvercount: number;     // Worst overestimate
  pass: boolean;            // meanError < 0.1 && maxUndercount < 0.15
}

async function calibrateEstimator(
  estimator: TokenEstimator,
  samplePacks: ContextPack[],
  formatter: (pack: ContextPack) => string,
  tokenizer: (text: string) => number
): Promise<CalibrationResult> {
  const errors: number[] = [];

  for (const pack of samplePacks) {
    const estimated = estimateTokens(pack, estimator);
    const formatted = formatter(pack);
    const actual = tokenizer(formatted);
    errors.push((estimated - actual) / actual);
  }

  return {
    samplesChecked: samplePacks.length,
    meanError: mean(errors),
    maxUndercount: Math.min(...errors),
    maxOvercount: Math.max(...errors),
    pass: Math.abs(mean(errors)) < 0.1 && Math.min(...errors) > -0.15
  };
}
```

**Hard Stop Behavior** (when estimate undercounts):
```typescript
function packWithBudgetEnforcement(
  query: string,
  index: ContextIndex,
  loadSlice: SliceLoader,
  config: PackerConfig,
  estimator: TokenEstimator,
  formatter: (pack: ContextPack) => string,
  tokenizer: (text: string) => number
): ContextPack {
  let pack = pack(query, index, loadSlice, config);

  // Verify actual tokens after formatting
  const formatted = formatter(pack);
  const actualTokens = tokenizer(formatted);

  // If undercount exceeded budget, re-prune deterministically
  if (actualTokens > config.tokenBudget) {
    const overage = actualTokens - config.tokenBudget;
    pack = emergencyPrune(pack, overage, estimator);

    // Re-verify (fail-safe: max 3 iterations)
    // Log calibration drift warning
  }

  return pack;
}
```

---

## 6. Components

### 6.1 Sync-Time Components

| Component | Responsibility | Output |
|-----------|----------------|--------|
| **Connectors** | Connect to data sources | Raw schema + samples |
| **Introspector** | Extract schema, profile columns | DataAsset[], DataColumn[] |
| **Classifier** | Assign column roles | role + confidence |
| **RelationshipDiscoverer** | Find joins (FK, inferred) | Relationship[] |
| **SliceGenerator** | Build domain slices | slices/*.json |
| **IndexGenerator** | Build routing index | index.json |

### 6.2 Query-Time Components

| Component | Responsibility | Input → Output |
|-----------|----------------|----------------|
| **Scorer** | Rank domains by relevance | query + index → scores[] |
| **SliceStore** | Load/cache slices | path → ContextSlice |
| **Packer** | Assemble + prune context | query + slices → ContextPack |
| **Formatter** | Convert to LLM format | ContextPack → string |

### 6.3 Escape Hatches (MCP Tools)

| Tool | When Used | Not For |
|------|-----------|---------|
| `sample(asset, limit)` | Schema is ambiguous | Hot path |
| `relate(assetA, assetB)` | Join path missing | Default joins |
| `bind(name, source, query)` | Dynamic binding creation | Pre-defined bindings |

---

## 7. Enterprise Requirements

### 7.1 Security Pipeline

```
Query → Policy Check → Pack → Policy Filter → LLM → DSL → Compile → RLS → Execute
         │                    │                              │
         │                    │                              │
         ▼                    ▼                              ▼
    "Can user see       "Mask PII columns"           "Push row filters
     this domain?"                                    to database"
```

| Gate | Enforcement | Failure Mode |
|------|-------------|--------------|
| Domain access | Check tenant + role | 403 |
| Column visibility | Filter from context | Exclude silently |
| PII masking | Redact in context | Mask values |
| RLS push-down | Add WHERE clause | Filter at DB |
| Scan limits | Abort if exceeded | 429 |

### 7.2 Sync-Time Policy Enforcement

**Principle**: Don't write what shouldn't be read.

```typescript
interface SyncTimePolicy {
  // Tenant-level exclusions
  excludeAssets: string[];           // Never sync these tables
  excludeColumns: string[];          // Never sync these columns
  excludePatterns: RegExp[];         // e.g., /.*_pii$/, /_secret_/

  // PII handling at sync
  piiColumns: {
    columnPattern: RegExp;
    action: 'exclude' | 'mask_name' | 'redact_samples';
  }[];

  // Sample value controls
  sampleValuePolicy: {
    allowed: boolean;
    maxSamplesPerColumn: number;
    excludeFromRoles: string[];      // e.g., ['contact', 'text']
    redactPatterns: RegExp[];        // e.g., email, phone patterns
  };

  // Vocabulary and description sanitization
  // (user-editable input → untrusted)
  vocabularyPolicy: {
    maxTermLength: number;           // e.g., 64 chars
    maxDescriptionLength: number;    // e.g., 256 chars
    sanitize: boolean;               // Strip HTML, control chars
    excludeSensitiveColumnNames: boolean;  // Don't alias excluded columns
  };
}
```

**Enforcement Points**:
| Stage | Check | Failure Mode |
|-------|-------|--------------|
| Schema extraction | Asset in excludeList | Skip entirely |
| Column sync | Column matches pattern | Skip column |
| Sample collection | PII pattern match | Redact or skip |
| Description sync | Length + sanitization | Truncate + strip |
| Vocabulary sync | Sensitive column alias | Skip vocab entry |
| Slice generation | Final audit | Remove any leaked PII |
| Index generation | Vocabulary audit | No sensitive terms |

**Vocabulary Leakage Prevention**:
```typescript
function buildVocabulary(
  columns: Column[],
  excludedColumns: Set<string>,
  policy: VocabularyPolicy
): VocabEntry[] {
  const vocab: VocabEntry[] = [];

  for (const col of columns) {
    // Rule 1: Never create vocab for excluded columns
    if (excludedColumns.has(col.id)) continue;

    // Rule 2: Sanitize and length-limit
    const term = sanitize(col.name, policy.maxTermLength);
    const description = sanitize(col.description, policy.maxDescriptionLength);

    // Rule 3: Check for alias leakage
    // (e.g., "ssn" alias pointing to excluded "social_security_number")
    if (policy.excludeSensitiveColumnNames) {
      if (looksLikeSensitiveName(term)) continue;
    }

    vocab.push({ term, columnId: col.id, description });
  }

  return vocab;
}

function sanitize(input: string, maxLength: number): string {
  return input
    .replace(/<[^>]*>/g, '')           // Strip HTML
    .replace(/[\x00-\x1F\x7F]/g, '')   // Strip control chars
    .trim()
    .slice(0, maxLength);
}
```

**Audit Requirement**: Every sync produces a `sync-audit.json`:
```json
{
  "syncId": "uuid",
  "tenantId": "acme",
  "assetsExcluded": ["hr_salaries", "auth_tokens"],
  "columnsExcluded": ["users.ssn", "users.password_hash"],
  "samplesRedacted": 42,
  "policyVersion": "v1.2",
  "timestamp": "2025-12-26T10:00:00Z"
}
```

### 7.3 Execution Context

```typescript
interface ExecutionContext {
  tenantId: string;
  userId: string;
  roles: string[];
  scopes: string[];
  attributes: Record<string, unknown>;  // For ABAC
  mfa: boolean;
  requestId: string;
}
```

**Rule**: ExecutionContext flows through every component. No shortcuts.

### 7.4 Governance

| Capability | Implementation |
|------------|----------------|
| Override roles | SemanticOverride table |
| Approve joins | ApprovalWorkflow |
| Audit changes | Append-only log |
| Schema migration | StableId + aliasHistory |

### 7.5 Stable Identity Strategy

**Problem**: Schema changes break bindings. Renaming `orders` → `sales_orders` invalidates references.

**Solution**: Stable IDs that survive renames.

```typescript
interface StableIdentity {
  // Computed at first sync, immutable thereafter
  stableId: string;  // SHA256(sourceId + schemaName + tableName + primaryKeySignature)

  // Current physical location
  physicalName: string;

  // Rename history
  aliasHistory: Array<{
    previousName: string;
    changedAt: Date;
    reason: 'rename' | 'migration' | 'merge';
  }>;

  // Fingerprint for drift detection
  fingerprint: {
    columnCount: number;
    primaryKeyColumns: string[];
    hash: string;  // SHA256 of sorted column names + types
  };
}
```

**Generation Rules**:

```typescript
interface StableIdGeneration {
  // Key quality tiers (determines identity stability)
  keyQuality: 'primary_key' | 'unique_index' | 'candidate_key' | 'weak';

  // Generation formula by tier
  formula: {
    primary_key:   'SHA256(sourceId.schemaName.tableName.sortedPKColumns)',
    unique_index:  'SHA256(sourceId.schemaName.tableName.firstUniqueIndexColumns)',
    candidate_key: 'SHA256(sourceId.schemaName.tableName.bestCandidateColumns)',
    weak:          'SHA256(sourceId.schemaName.tableName)' // No key - identity may drift
  };
}

function generateStableId(asset: Asset): StableIdentity {
  // 1. Try primary key
  if (asset.primaryKey?.length > 0) {
    return {
      stableId: hash(asset, asset.primaryKey),
      keyQuality: 'primary_key',
      keyColumns: asset.primaryKey
    };
  }

  // 2. Try first unique index
  const uniqueIndex = asset.indexes.find(i => i.unique);
  if (uniqueIndex) {
    return {
      stableId: hash(asset, uniqueIndex.columns),
      keyQuality: 'unique_index',
      keyColumns: uniqueIndex.columns
    };
  }

  // 3. Try candidate key heuristic (NOT NULL + high cardinality columns)
  const candidateKey = findCandidateKey(asset.columns);
  if (candidateKey) {
    return {
      stableId: hash(asset, candidateKey),
      keyQuality: 'candidate_key',
      keyColumns: candidateKey
    };
  }

  // 4. Weak identity - warn and require manual pinning for bindings
  return {
    stableId: SHA256(`${asset.sourceId}.${asset.schema}.${asset.name}`),
    keyQuality: 'weak',
    keyColumns: [],
    warning: 'No reliable key. Identity may drift on rename. Manual pinning required for bindings.'
  };
}
```

**Lifecycle Rules**:
1. On first sync: generate and store `stableId` with `keyQuality`
2. On schema change:
   - Same key columns → keep `stableId`, update `physicalName`, append to `aliasHistory`
   - Key columns changed → **new `stableId`** (treat as new table), log migration event
   - Column added/removed (non-key) → same `stableId`, update `fingerprint`
3. **Weak identity tables**: Alert on any schema change; require admin confirmation before updating bindings

**Binding Resolution**:
```typescript
function resolveStableId(stableId: string, store: ContextStore): string {
  const identity = store.getIdentity(stableId);
  if (!identity) {
    // Check alias history across all identities
    const found = store.findByAlias(stableId);
    if (found) return found.physicalName;
    throw new Error(`Unknown stableId: ${stableId}`);
  }
  return identity.physicalName;
}
```

**Migration Safety**:
- Bindings reference `stableId`, not physical names
- Compiler resolves `stableId` → current `physicalName` at execution time
- Broken bindings detected at sync time → alert before production impact

### 7.6 Multi-Tenant Isolation

**Principle**: Zero cross-tenant leakage, even in shared infrastructure.

```typescript
interface TenantIsolation {
  // Cache isolation
  cacheKeyPrefix: `tenant:${tenantId}:`;
  noCrossKeyAccess: true;

  // Artifact isolation
  artifactPath: `tenants/${tenantId}/context/`;
  encryptionKeyId: string;  // Per-tenant KMS key

  // Embedding isolation (if used)
  vectorNamespace: `tenant_${tenantId}`;
  noSharedEmbeddings: true;

  // Query isolation
  rlsEnabled: true;
  tenantColumnRequired: true;  // All queries must filter by tenant
}
```

**Storage Keys**:
```
tenants/
├── acme/
│   ├── context/
│   │   ├── index.json          # Encrypted at rest
│   │   └── slices/
│   │       ├── sales.json
│   │       └── inventory.json
│   └── cache/
│       └── packs/              # Cached ContextPacks, TTL=1h
└── globex/
    └── ...
```

**Cache Boundaries**:
| Cache Type | Key Format | TTL | Isolation |
|------------|------------|-----|-----------|
| Slice cache | `tenant:{id}:slice:{domain}:{version}` | 24h | Tenant prefix |
| Pack cache | `tenant:{id}:pack:{securityHash}:{queryHash}` | 1h | Tenant + security |
| Index cache | `tenant:{id}:index:{version}` | 24h | Tenant prefix |

**Pack Cache Security Context** (critical fix):

Different users may see different packs due to column visibility, RLS, or role-based filtering.
The cache key MUST include security context to prevent cross-user leakage.

```typescript
interface PackCacheKey {
  tenantId: string;
  securityHash: string;  // Hash of security-affecting context
  queryHash: string;     // Hash of query + config
}

function computeSecurityHash(ctx: ExecutionContext): string {
  // Include all fields that affect pack content
  const securityFactors = {
    userId: ctx.userId,
    roles: ctx.roles.sort(),
    scopes: ctx.scopes.sort(),
    policyVersion: ctx.policyVersion,
    // For ABAC: include relevant attributes
    visibilityAttributes: filterSecurityRelevant(ctx.attributes)
  };

  return SHA256(JSON.stringify(securityFactors));
}

function computeQueryHash(query: string, config: PackerConfig): string {
  return SHA256(JSON.stringify({ query, config }));
}

// Cache key construction
function packCacheKey(
  tenantId: string,
  ctx: ExecutionContext,
  query: string,
  config: PackerConfig
): string {
  return `tenant:${tenantId}:pack:${computeSecurityHash(ctx)}:${computeQueryHash(query, config)}`;
}
```

**Conservative Option**: For maximum safety during initial deployment, use `userId` directly:
```typescript
// Simple but safe: no cross-user cache sharing
const key = `tenant:${tenantId}:pack:user:${userId}:${queryHash}`;
```

**Enforcement**:
- All storage operations require `tenantId` in context
- Cross-tenant key access throws security exception
- Audit log captures all cache hits/misses per tenant
- Periodic scan for orphaned cross-tenant data

### 7.7 Provenance

Every inferred value carries:

```typescript
interface Provenance {
  source: 'schema' | 'naming' | 'sampling' | 'user' | 'model';
  confidence: number;
  evidence: { ... };
  timestamp: Date;
}
```

---

## 8. Production Controls

> **Principle**: Fail closed, audit everything, leak nothing.

### 8.1 LLM Boundary Hardening

**Threat Model**: The LLM is untrusted. User queries, descriptions, vocabulary, and column names are attack vectors.

```typescript
interface LLMBoundaryConfig {
  // Input sanitization
  maxQueryLength: number;           // e.g., 2000 chars
  maxContextTokens: number;         // e.g., 4000 tokens
  stripControlChars: boolean;
  detectPromptInjection: boolean;   // Heuristic patterns

  // Output constraints
  allowedOutputTypes: ['dsl'];      // No tool calls unless policy allows
  maxOutputTokens: number;          // e.g., 1000 tokens
  strictDSLParsing: boolean;        // Reject if not valid DSL

  // Repair policy
  repairStrategy: 'reject' | 'deterministic_fix';
  maxRepairAttempts: number;        // e.g., 0 (no retry randomness)
}
```

**DSL Output Validator**:
```typescript
interface DSLValidationResult {
  valid: boolean;
  ast?: DSLNode;
  errors: ValidationError[];
  repaired: boolean;
  repairActions?: string[];
}

function validateLLMOutput(
  raw: string,
  config: LLMBoundaryConfig
): DSLValidationResult {
  // Step 1: Extract DSL from response (strip markdown, explanations)
  const extracted = extractDSL(raw);
  if (!extracted) {
    return { valid: false, errors: [{ code: 'NO_DSL_FOUND' }] };
  }

  // Step 2: Parse with strict grammar
  const parseResult = parseDSL(extracted);
  if (!parseResult.success) {
    if (config.repairStrategy === 'deterministic_fix') {
      // Attempt deterministic repairs only (no LLM retry)
      const repaired = attemptDeterministicRepair(extracted, parseResult.errors);
      if (repaired.success) {
        return { valid: true, ast: repaired.ast, repaired: true, repairActions: repaired.actions };
      }
    }
    return { valid: false, errors: parseResult.errors };
  }

  // Step 3: Validate AST against schema
  const schemaErrors = validateDSLSchema(parseResult.ast);
  if (schemaErrors.length > 0) {
    return { valid: false, errors: schemaErrors };
  }

  // Step 4: Validate binding references exist
  const bindingErrors = validateBindingRefs(parseResult.ast);
  if (bindingErrors.length > 0) {
    return { valid: false, errors: bindingErrors };
  }

  return { valid: true, ast: parseResult.ast, repaired: false };
}
```

**Deterministic Repair Rules** (no randomness):
| Error | Repair Action |
|-------|---------------|
| Missing closing quote | Insert at EOL |
| Missing binding ref | Replace with `placeholder` |
| Unknown component | Replace with `Text` |
| Invalid number format | Parse with fallback `0` |
| Truncated output | Mark incomplete, show partial |

**Reject Policy**: Any error not in the repair table → reject with user-friendly error.

**Double Enforcement** (belt and suspenders):
| Gate | Enforcement Point | Failure Mode |
|------|-------------------|--------------|
| DSL validation | After LLM output | Reject/repair |
| AST→SQL compile | BindingSpec guards | Reject unsafe plan |
| Execution | Query runner | Timeout, scan limit, RLS filter check |

### 8.2 Observability Redaction Policy

**Principle**: Logs and traces must never leak PII, queries, or business data by default.

```typescript
interface ObservabilityConfig {
  // Query redaction
  queryLogging: 'hash_only' | 'redacted' | 'full';  // Default: hash_only
  tokenLogging: 'omit' | 'count_only' | 'full';     // Default: count_only

  // Sample value redaction
  sampleLogging: 'never' | 'debug_only';            // Default: never

  // Retention
  traceRetentionDays: number;         // e.g., 30
  debugLogRetentionDays: number;      // e.g., 7
  auditLogRetentionDays: number;      // e.g., 365

  // Access control
  fullQueryAccessRoles: string[];     // e.g., ['security_admin']
}
```

**PackTrace Redaction**:
```typescript
function redactPackTrace(trace: PackTrace, config: ObservabilityConfig): RedactedPackTrace {
  return {
    ...trace,
    query: config.queryLogging === 'full'
      ? trace.query
      : config.queryLogging === 'redacted'
        ? redactPII(trace.query)
        : SHA256(trace.query),
    queryTokens: config.tokenLogging === 'full'
      ? trace.queryTokens
      : config.tokenLogging === 'count_only'
        ? { count: trace.queryTokens.length }
        : undefined,
    // Always include for debugging
    checksum: trace.checksum,
    timingMs: trace.timingMs,
    domainsSelected: trace.domainsSelected,
    pruning: trace.pruning
  };
}
```

**Log Levels**:
| Level | Includes | Retention | Access |
|-------|----------|-----------|--------|
| `audit` | queryHash, userId, tenantId, outcome | 365d | All ops |
| `operational` | + timing, slices, pruning stats | 30d | SRE |
| `debug` | + redacted query, domain scores | 7d | Dev (opt-in) |
| `full` | + raw query, tokens, samples | 1d | Security admin only |

### 8.3 Distributed Cache + Artifact Versioning

**Cache Architecture**:
```typescript
interface CacheConfig {
  // Location
  backend: 'in_memory' | 'redis' | 'memcached';

  // Per-tenant isolation
  tenantBudgetMB: number;             // e.g., 100MB per tenant
  evictionPolicy: 'lru_per_tenant';   // Never evict tenant A for tenant B

  // Versioning
  indexVersionKey: `tenant:${tenantId}:index:version`;
  sliceVersionKey: `tenant:${tenantId}:slice:${domain}:version`;

  // Invalidation
  invalidateOnVersionChange: true;
  staleCacheGracePeriodMs: number;    // e.g., 5000 (serve stale during refresh)
}
```

**Artifact Versioning + Atomic Publish**:
```typescript
interface ArtifactVersion {
  version: number;              // Monotonic, increments on every sync
  contentHash: string;          // SHA256 of artifact content
  publishedAt: Date;
  publishedBy: string;          // Sync job ID
}

// Atomic publish pattern for object storage
async function publishArtifacts(
  tenantId: string,
  index: ContextIndex,
  slices: Map<string, ContextSlice>
): Promise<ArtifactVersion> {
  const version = await getNextVersion(tenantId);

  // Step 1: Write new artifacts to versioned paths
  await writeArtifact(`tenants/${tenantId}/v${version}/index.json`, index);
  for (const [domain, slice] of slices) {
    await writeArtifact(`tenants/${tenantId}/v${version}/slices/${domain}.json`, slice);
  }

  // Step 2: Atomic pointer swap
  await updatePointer(`tenants/${tenantId}/current`, version);

  // Step 3: Invalidate caches
  await invalidateCaches(tenantId, version);

  // Step 4: Schedule old version cleanup (keep N versions for rollback)
  await scheduleCleanup(tenantId, version - KEEP_VERSIONS);

  return { version, contentHash: computeHash(index), publishedAt: new Date() };
}
```

**Cache Invalidation Flow**:
```
Sync completes → increment index.version → broadcast invalidation →
caches check version on read → stale? → reload from storage
```

### 8.4 Sync Reliability + Last-Known-Good

**Retry Strategy**:
```typescript
interface SyncRetryConfig {
  maxAttempts: number;            // e.g., 3
  backoffMs: number[];            // e.g., [1000, 5000, 30000]
  deadLetterAfter: number;        // After N failures, alert + pause

  // Partial failure handling
  continueOnAssetFailure: boolean;  // If one table fails, continue others
  quarantineFailedAssets: boolean;  // Mark as "sync_failed", exclude from index

  // Rate limiting (protect source DBs)
  maxSamplesPerMinute: number;    // e.g., 1000
  maxSchemaQueriesPerMinute: number;
}
```

**Last-Known-Good Artifacts**:
```typescript
interface SyncState {
  tenantId: string;
  currentVersion: number;
  lastSuccessfulVersion: number;
  lastSuccessfulAt: Date;

  // Rollback capability
  rollbackAvailable: boolean;
  rollbackVersions: number[];     // Last N successful versions
}

async function syncWithRollback(tenantId: string): Promise<SyncResult> {
  const state = await getSyncState(tenantId);

  try {
    const newArtifacts = await performSync(tenantId);
    await publishArtifacts(tenantId, newArtifacts);
    await updateSyncState(tenantId, { lastSuccessfulVersion: newArtifacts.version });
    return { success: true, version: newArtifacts.version };
  } catch (error) {
    // Log failure but keep serving last-known-good
    await logSyncFailure(tenantId, error);

    if (state.lastSuccessfulVersion) {
      // Continue serving stale but valid artifacts
      return {
        success: false,
        servingVersion: state.lastSuccessfulVersion,
        error: error.message,
        stale: true
      };
    }

    // No fallback available - critical failure
    throw new CriticalSyncFailure(tenantId, error);
  }
}
```

**Blast Radius Control**:
| Failure | Impact | Mitigation |
|---------|--------|------------|
| Single table sync fails | That table excluded | Quarantine + alert |
| Full sync fails | Serve stale artifacts | Last-known-good + alert |
| Source DB unreachable | No sync possible | Exponential backoff + dead letter |
| Artifact publish fails | No update | Retry + manual intervention |

### 8.5 Stable Identity Edge Cases

**Views and Materialized Views**:
```typescript
interface ViewIdentityConfig {
  // Views typically have no keys
  viewHandling: 'weak_identity' | 'definition_hash' | 'skip';

  // Use view definition as identity anchor
  useDefinitionHash: boolean;     // SHA256 of CREATE VIEW statement

  // Materialized view refresh tracking
  trackRefreshTimestamp: boolean;
}

function generateViewStableId(view: View): StableIdentity {
  if (view.definition) {
    // Use definition hash - survives renames if definition unchanged
    return {
      stableId: SHA256(`view:${view.sourceId}:${hashDefinition(view.definition)}`),
      keyQuality: 'definition_hash',
      keyColumns: [],
      isView: true
    };
  }

  // Fall back to weak identity
  return {
    stableId: SHA256(`view:${view.sourceId}:${view.schema}:${view.name}`),
    keyQuality: 'weak',
    keyColumns: [],
    isView: true,
    warning: 'View identity tied to name. Rename will break bindings.'
  };
}
```

**Weak Identity Rename Behavior** (deterministic rule):
```typescript
// POLICY: Freeze bindings until admin resolves
// Do NOT auto-follow aliases for weak identity tables

async function handleWeakIdentityRename(
  stableId: string,
  oldName: string,
  newName: string
): Promise<RenameAction> {
  // Step 1: Detect rename via schema diff
  const identity = await getIdentity(stableId);

  if (identity.keyQuality === 'weak') {
    // Step 2: Freeze affected bindings
    await freezeBindings(stableId, 'pending_rename_resolution');

    // Step 3: Create admin task
    await createAdminTask({
      type: 'weak_identity_rename',
      stableId,
      oldName,
      newName,
      action: 'confirm_same_table | create_new_identity | delete_bindings'
    });

    // Step 4: Do NOT auto-update
    return { action: 'frozen', requiresAdminAction: true };
  }

  // Strong identity: safe to auto-follow
  return { action: 'auto_follow', newPhysicalName: newName };
}
```

### 8.6 Versioned Behavior Specs

**All Pack-Affecting Behaviors Must Be Versioned**:
```typescript
interface BehaviorVersions {
  // Core algorithms
  packerVersion: string;          // e.g., "1.3.0"
  scorerVersion: string;          // e.g., "1.0.0"
  tokenizerVersion: string;       // e.g., "1.1.0"

  // Normalization
  textNormalizationVersion: string;  // e.g., "1.0.0"

  // Policy
  policyVersion: string;          // e.g., "2.0.0"

  // Token estimation
  tokenEstimatorVersion: string;  // e.g., "1.2.0"
}

interface TextNormalizationSpec {
  version: "1.0.0";
  rules: {
    unicodeNormalization: 'NFC';    // Canonical decomposition + composition
    caseNormalization: 'lowercase';
    whitespaceNormalization: 'collapse_to_single_space';
    punctuationHandling: 'remove_except_hyphen_underscore';
    localeIndependent: true;        // No locale-specific transforms
    asciiFolding: true;             // café → cafe
  };
}

// Checksum must include behavior versions
function computeChecksumWithVersions(
  pack: ContextPack,
  versions: BehaviorVersions
): string {
  const canonical = {
    behaviorVersions: versions,
    // ... rest of pack
  };
  return SHA256(JSON.stringify(canonical));
}
```

**Version Change = Cache Invalidation**:
```typescript
function shouldInvalidateCache(
  cachedVersions: BehaviorVersions,
  currentVersions: BehaviorVersions
): boolean {
  // Any version change invalidates affected caches
  return (
    cachedVersions.packerVersion !== currentVersions.packerVersion ||
    cachedVersions.scorerVersion !== currentVersions.scorerVersion ||
    cachedVersions.tokenizerVersion !== currentVersions.tokenizerVersion ||
    cachedVersions.textNormalizationVersion !== currentVersions.textNormalizationVersion
  );
}
```

### 8.7 Production SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pack latency (p50) | < 50ms | Packer only, no LLM |
| Pack latency (p99) | < 200ms | Packer only, no LLM |
| Cache hit rate | > 80% | Per tenant |
| Sync success rate | > 99% | Per source |
| Golden test pass rate | 100% | Block deploy if < 100% |
| Token budget adherence | 100% | Never exceed budget |
| Join validation rate | 100% | Never use unvalidated joins |

---

## 9. Data Flow

### 9.1 Sync Flow

```
1. Connector.connect(source)
2. Introspector.extractSchema(source) → assets[], columns[]
3. Classifier.classifyRoles(columns) → columns with roles
4. RelationshipDiscoverer.findRelationships(columns) → relationships[]
5. ContextStore.save(assets, columns, relationships)
6. SliceGenerator.generate(contextStore) → slices/*.json
7. IndexGenerator.generate(slices) → index.json
```

### 8.2 Query Flow

```
1. Packer.pack(query, index, loadSlice) → ContextPack
2. Formatter.formatForLLM(pack) → contextString
3. LLM.generate(systemPrompt + contextString + query) → DSL
4. DSLCompiler.compile(dsl) → BindingRefs[]
5. BindingResolver.resolve(refs, executionContext) → data[]
6. Renderer.render(dsl, data) → UI
```

---

## 10. Storage

| Scale | Storage | When |
|-------|---------|------|
| Small | JSON files | < 50 tables, single tenant |
| Medium | SQLite | 50-500 tables, queryable metadata |
| Large | PostgreSQL | 500+ tables, multi-tenant |

**Schema** (same across all storage):

```
sources (id, type, connection_encrypted, status, last_sync)
assets (id, source_id, name, stable_id, schema_hash)
columns (id, asset_id, name, role, role_confidence, provenance)
relationships (id, from_column, to_column, type, discovery_source, confidence)
overrides (id, target_type, target_id, field, value, created_by, created_at)
```

---

## 11. Bindings

### 11.1 BindingSpec (Admin-authored only)

```typescript
interface BindingSpec {
  name: string;
  kind: 'metric' | 'dataset' | 'dimension';
  authoredBy: 'system' | 'admin';  // Never 'model'

  query: {
    language: 'ast_v1';
    plan: QueryPlanAST;
  };

  safety: {
    allowlistAssets: string[];
    maxScanBytes: number;
    timeout: number;
  };

  output: {
    schema: Record<string, DataType>;
    cardinality: 'scalar' | 'array';
  };
}
```

### 11.2 QueryPlanAST (Safe, no SQL injection)

```typescript
interface QueryPlanAST {
  from: AssetRef[];
  joins?: JoinClause[];
  select: SelectExpr[];
  where?: FilterExpr[];
  groupBy?: string[];
  orderBy?: OrderExpr[];
  limit?: number;
}

interface FilterExpr {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'between' | 'is_null';
  value: unknown;
  // No arbitrary SQL. Closed operator set.
}
```

### 11.3 Binding Safety Guards

**Principle**: Valid AST ≠ Safe Plan. Enforce constraints at compilation.

```typescript
interface BindingSafetyConfig {
  // Join safety
  requireApprovedJoins: boolean;        // Joins must use relationshipEdges
  prohibitCrossJoins: boolean;          // No Cartesian products
  maxJoinDepth: number;                 // Limit join chain length

  // Scan safety
  requireLimitClause: boolean;          // Always have LIMIT
  defaultLimit: number;                 // e.g., 10000
  maxLimit: number;                     // e.g., 100000

  // Partition safety (for large tables)
  requireTemporalFilter: {
    assetPatterns: RegExp[];            // e.g., /^fact_/, /events$/
    maxRangeDays: number;               // e.g., 90
  };

  // Asset safety
  allowlistAssets: string[];            // Explicit allowlist
  allowlistColumns: string[];           // Column-level allowlist
}
```

**Compilation Guards** (checked during QueryPlanAST → SQL):

| Guard | Check | Rejection |
|-------|-------|-----------|
| Approved joins | `join.edge ∈ relationshipEdges` | "Join not in approved relationships" |
| No cross joins | `join.type !== 'cross'` | "Cross joins prohibited" |
| Limit present | `plan.limit !== undefined` | Apply `defaultLimit` |
| Limit bounded | `plan.limit <= maxLimit` | Clamp to `maxLimit` |
| Temporal filter | Large table has date filter | "Partition filter required for {table}" |
| Asset allowed | `plan.from ∈ allowlistAssets` | "Asset not in allowlist" |
| Column allowed | `plan.select ∈ allowlistColumns` | "Column not in allowlist" |

**Reject vs Clamp**: Limits are clamped silently. Security violations are rejected with error.

---

## 12. Testing Strategy

### 12.1 Golden Tests

```typescript
interface GoldenTest {
  query: string;
  expectedSlices: string[];
  expectedBindings: string[];
  expectedVizType: string;
}
```

**Property**: Same query + same index = same slices loaded = same bindings used

### 12.2 Test Levels

| Level | What | How |
|-------|------|-----|
| Unit | Scorer, Packer | Pure function tests |
| Integration | Pack → LLM → DSL | Mocked LLM, real packer |
| E2E | Query → UI | Record/replay binding results |

### 12.3 Regression Gates

- Run golden tests after every introspection
- Block deployment if accuracy < threshold
- Alert on schema changes that break bindings

---

## 13. File Structure

```
packages/liquid-render/src/platform/
├── context/
│   ├── index.ts              # Exports
│   ├── types.ts              # Core types
│   ├── packer.ts             # Deterministic packer (hot path)
│   ├── introspector.ts       # Schema extraction
│   └── orchestrator.ts       # DEPRECATED → re-exports packer
├── connectors/
│   ├── base-connector.ts     # Interface
│   ├── postgres-connector.ts # PostgreSQL
│   ├── file-connector.ts     # XLSX/CSV
│   └── memory-connector.ts   # Demo/testing
├── bindings/
│   ├── binding-spec.ts       # BindingSpec types
│   ├── resolver.ts           # Binding resolution
│   └── compiler.ts           # AST → SQL compilation
└── security/
    ├── execution-context.ts  # ExecutionContext
    ├── policy.ts             # Policy enforcement
    └── rls.ts                # Row-level security
```

---

## 14. MVP Scope

### Ship First

| Component | Status |
|-----------|--------|
| Postgres connector | Build |
| File connector (CSV/XLSX) | Build |
| Introspector + classifier | Build |
| Packer (deterministic) | ✅ Done |
| index.json + slices | Build |
| BindingSpec (AST only) | Build |
| Basic overrides | Build |
| Golden tests | Build |

### Defer

| Component | Why |
|-----------|-----|
| Embeddings search | Lexical match covers 90% |
| Graph DB | SQLite sufficient |
| Cross-source entity resolution | Complex, not MVP |
| Full policy-as-code | Start with simple RBAC |

---

## 15. Future Enhancements (Next Iteration)

These are strongly recommended but not blockers for initial deployment:

| Enhancement | Benefit | Complexity |
|-------------|---------|------------|
| **Undirected edge storage** | Store edges as undirected for path search but preserve join direction for SQL compilation | Low |
| **Must-keep pruning set** | Columns required by selected metrics/dimensions + join keys must never be pruned | Medium |
| **Domain ownership** | Add ownership to assets/columns in slices to avoid drift across domains | Low |
| **Artifact signing** | HMAC signing to detect tampering in multi-tenant deployments | Medium |
| **Incremental sync** | Only resync changed tables/columns, not full introspection | High |
| **Embedding fallback** | Vector search for queries that don't match vocabulary (currently 10% miss rate) | Medium |

---

## 16. Summary

```
┌────────────────────────────────────────────────────────────────┐
│                    LiquidConnect                                │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Sync Time: Sources → Introspect → Store → Index/Slices │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Query Time: Query → Score → Pack → LLM → DSL → Render  │  │
│  │                      ▲                                   │  │
│  │                      │                                   │  │
│  │               DETERMINISTIC                              │  │
│  │               (no LLM here)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Principles:                                                   │
│  • Model reasons, system delivers                              │
│  • Same input = same output                                    │
│  • Precompute, don't explore                                   │
│  • Hard budgets                                                │
│  • Escape hatches, not defaults                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

*This architecture enables enterprise-ready context delivery without putting the LLM in the orchestration loop.*
