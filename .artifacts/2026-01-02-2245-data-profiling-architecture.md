# Data Profiling Architecture for Knosia

**Date:** 2026-01-02
**Status:** Design Complete - Ready for Implementation
**Context:** Wave 2 complete, all schema extraction tests passing (13/13 including Knosia DB)

---

## Executive Summary

Elevate Knosia from "schema reader" to "data scientist assistant" by profiling actual data inside tables. Go beyond structure to understand:
- **Data freshness** - "Last sale 2 hours ago" not just "has a timestamp column"
- **Data quality** - "95% NULL" vs "complete data"
- **Business context** - "1.2M transactions, $2.3M revenue" not just "numeric column"

**Goal:** 3-5 minute comprehensive profiling that powers intelligent briefings.

---

## What Data Scientists Actually Do

```python
# Schema only (what we have now):
df.columns  # ['order_id', 'customer_id', 'revenue', 'created_at']

# What data scientists immediately run:
df.describe()              # Min, max, mean, std dev, percentiles
df.info()                  # NULL counts, memory usage
df['customer_id'].nunique()  # Cardinality
df['created_at'].max()     # Data freshness
df['status'].value_counts()  # Top values and distributions
```

**The Gap:** We tell users "You have a revenue column of type NUMERIC"
**The Opportunity:** "You have $2.3M revenue across 1,247 transactions, last sale 2 hours ago"

---

## Architecture Overview

### Three-Tier Profiling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: Database Statistics (Instant - 0.1s per table)      │
├─────────────────────────────────────────────────────────────┤
│ • Row count estimate (pg_class.reltuples)                   │
│ • Table size (pg_class.relpages)                            │
│ • Column statistics (pg_stats)                              │
│ • Index information                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 2: Smart Sampling (Fast - 1-5s per table)             │
├─────────────────────────────────────────────────────────────┤
│ • Adaptive sample size (1% for >100K rows, 100% otherwise) │
│ • Single-pass multi-metric computation                      │
│ • Cardinality estimation (HyperLogLog)                      │
│ • NULL percentage, data types                               │
│ • Min/Max for numeric and date columns                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 3: Detailed Profiling (Selective - 5-15s per table)   │
├─────────────────────────────────────────────────────────────┤
│ • Top N values with counts                                  │
│ • Statistical distributions (mean, median, percentiles)     │
│ • Pattern detection (emails, URLs, IDs)                     │
│ • Data quality scores                                       │
│ • Only run on "interesting" tables (detected metrics/dims)  │
└─────────────────────────────────────────────────────────────┘
```

### Performance Model

**Target:** 3-5 minutes for full database profiling

| Database Size | Tables | Tier 1 | Tier 2 | Tier 3 | Total |
|---------------|--------|--------|--------|--------|-------|
| Small (Knosia) | 40 | 4s | 40s | 60s | ~2 min |
| Medium (Pagila) | 22 | 2s | 22s | 45s | ~1 min |
| Large (100+ tables) | 150 | 15s | 150s | 200s | ~6 min |

**Optimizations:**
- Parallel table profiling (5-10 concurrent)
- Progressive results (stream as tables complete)
- Skip tables with 0 rows
- Tier 3 only on tables with detected business value

---

## Data Structures

### ProfiledSchema (extends ExtractedSchema)

```typescript
export interface ProfiledSchema extends ExtractedSchema {
  // Schema metadata (existing)
  database: string;
  type: DatabaseType;
  tables: Table[];

  // NEW: Profiling data
  tableProfiles: Record<string, TableProfile>;
  columnProfiles: Record<string, Record<string, ColumnProfile>>;

  // Profiling metadata
  profiledAt: string;
  profilingDuration: number;
  samplingStrategy: 'full' | 'adaptive' | 'statistics-only';
}

export interface TableProfile {
  tableName: string;

  // Tier 1: Database Statistics (always available)
  rowCountEstimate: number;        // From pg_class.reltuples
  tableSizeBytes: number;          // From pg_class.relpages
  lastVacuum?: Date;               // From pg_stat_user_tables
  lastAnalyze?: Date;

  // Tier 2: Sample-based (computed if >0 rows)
  rowCountExact?: number;          // Exact count (if sampled or small)
  samplingRate: number;            // 1.0 = full scan, 0.01 = 1% sample

  // Data freshness
  latestDataAt?: Date;             // MAX of all timestamp columns
  earliestDataAt?: Date;           // MIN of all timestamp columns
  dataSpanDays?: number;           // Range in days

  // Data quality
  emptyColumnCount: number;        // Columns with 100% NULL
  sparseColumnCount: number;       // Columns with >50% NULL

  // Tier 3: Detailed (selective)
  updateFrequency?: {              // Detected from timestamp patterns
    pattern: 'realtime' | 'hourly' | 'daily' | 'batch' | 'stale';
    confidence: number;
  };
}

export interface ColumnProfile {
  columnName: string;
  dataType: string;

  // Tier 1: From pg_stats (if available)
  distinctCountEstimate?: number;  // n_distinct from pg_stats
  nullFraction?: number;           // null_frac from pg_stats
  avgWidth?: number;               // avg_width from pg_stats

  // Tier 2: Sample-based
  nullCount: number;
  nullPercentage: number;

  // Type-specific profiling
  numeric?: NumericProfile;
  temporal?: TemporalProfile;
  categorical?: CategoricalProfile;
  text?: TextProfile;
}

export interface NumericProfile {
  min: number;
  max: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  percentiles?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  zeroCount?: number;
  negativeCount?: number;
}

export interface TemporalProfile {
  min: Date;
  max: Date;
  spanDays: number;

  // Granularity detection
  hasTime: boolean;              // vs date-only
  uniqueDates: number;           // Cardinality at date level

  // Patterns
  gaps?: Array<{                 // Detected missing date ranges
    start: Date;
    end: Date;
    days: number;
  }>;
}

export interface CategoricalProfile {
  cardinality: number;           // Unique values

  topValues: Array<{             // Most common values
    value: unknown;
    count: number;
    percentage: number;
  }>;

  // Flags
  isHighCardinality: boolean;    // >1000 unique values
  isLowCardinality: boolean;     // <20 unique values
  possiblyUnique: boolean;       // cardinality ~= row count
}

export interface TextProfile {
  minLength: number;
  maxLength: number;
  avgLength: number;

  patterns?: {                   // Pattern detection
    email: number;               // Count of email-like values
    url: number;
    phone: number;
    uuid: number;
    json: number;
  };

  topValues?: Array<{            // Sample values
    value: string;
    count: number;
  }>;
}
```

---

## Implementation Plan

### Phase 1: Core Profiling Engine

**File:** `packages/liquid-connect/src/uvb/profiler.ts`

```typescript
export interface ProfileOptions {
  // Sampling
  maxSampleRows?: number;           // Default: 100,000
  minSampleRate?: number;           // Default: 0.01 (1%)

  // Tiers
  enableTier1?: boolean;            // Default: true (statistics)
  enableTier2?: boolean;            // Default: true (sampling)
  enableTier3?: boolean;            // Default: false (detailed)

  // Concurrency
  maxConcurrentTables?: number;     // Default: 5

  // Selective profiling
  includePatterns?: string[];       // Only profile tables matching regex
  excludePatterns?: string[];       // Skip tables matching regex

  // Performance limits
  timeoutPerTable?: number;         // Default: 30000ms
  totalTimeout?: number;            // Default: 300000ms (5 min)
}

export interface ProfileResult {
  schema: ProfiledSchema;
  stats: {
    tablesProfiled: number;
    tablesSkipped: number;
    totalDuration: number;
    tier1Duration: number;
    tier2Duration: number;
    tier3Duration: number;
  };
  warnings: Array<{
    table: string;
    message: string;
  }>;
}

/**
 * Profile a database schema with actual data analysis
 */
export async function profileSchema(
  adapter: DuckDBUniversalAdapter,
  schema: ExtractedSchema,
  options?: ProfileOptions
): Promise<ProfileResult>;

/**
 * Profile a single table (for on-demand deep analysis)
 */
export async function profileTable(
  adapter: DuckDBUniversalAdapter,
  tableName: string,
  schemaName: string,
  options?: ProfileOptions
): Promise<TableProfile>;
```

### Phase 2: SQL Query Builders

**File:** `packages/liquid-connect/src/uvb/profiler-queries.ts`

Efficient single-pass queries:

```typescript
/**
 * Tier 1: Database statistics (instant)
 */
export function buildStatisticsQuery(
  tableName: string,
  schemaName: string
): string;

/**
 * Tier 2: Sample-based profiling (single pass)
 *
 * Returns all metrics in ONE query:
 * - Row count
 * - NULL counts per column
 * - Cardinality estimates
 * - Min/Max for numeric/temporal
 * - Top values for categorical
 */
export function buildSampleProfilingQuery(
  table: Table,
  sampleRate: number
): string;

/**
 * Tier 3: Detailed statistical profiling
 */
export function buildDetailedProfilingQuery(
  table: Table,
  column: Column
): string;
```

**Example Tier 2 Query (single-pass efficiency):**

```sql
-- Profile entire table in one scan
WITH sampled AS (
  SELECT * FROM orders TABLESAMPLE BERNOULLI (1) -- 1% sample
),
numeric_stats AS (
  SELECT
    'amount' as col,
    COUNT(*) as total,
    COUNT(amount) as non_null,
    COUNT(DISTINCT amount) as cardinality,
    MIN(amount) as min_val,
    MAX(amount) as max_val,
    AVG(amount) as mean_val,
    STDDEV(amount) as std_val,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) as median_val
  FROM sampled
),
temporal_stats AS (
  SELECT
    'created_at' as col,
    MIN(created_at) as earliest,
    MAX(created_at) as latest,
    COUNT(DISTINCT DATE(created_at)) as unique_dates
  FROM sampled
),
categorical_stats AS (
  SELECT
    'status' as col,
    status as value,
    COUNT(*) as count
  FROM sampled
  GROUP BY status
  ORDER BY count DESC
  LIMIT 10
)
SELECT * FROM numeric_stats
UNION ALL
SELECT * FROM temporal_stats
UNION ALL
SELECT * FROM categorical_stats;
```

### Phase 3: Integration with Hard Rules

**File:** `packages/liquid-connect/src/uvb/rules.ts`

Enhance hard rules with profiling data:

```typescript
export interface ApplyHardRulesOptions {
  // Existing
  config?: VocabularyConfig;

  // NEW: Use profiling data for smarter detection
  useProfilingData?: boolean;      // Default: true if available
}

export function applyHardRules(
  schema: ExtractedSchema | ProfiledSchema,
  options?: ApplyHardRulesOptions
): HardRulesResult;

// Enhanced detection using profiling:
// - Skip empty tables (rowCount = 0)
// - Boost metric certainty if cardinality is high
// - Demote dimension if cardinality > 10,000
// - Detect time fields with actual data ranges
// - Identify stale tables (no data in 90+ days)
```

### Phase 4: API Integration

**File:** `packages/api/src/modules/knosia/analysis/mutations.ts`

```typescript
/**
 * Run schema analysis with optional profiling
 */
export async function analyzeConnection(input: {
  connectionId: string;
  includeDataProfiling?: boolean;  // Default: true
  profilingOptions?: ProfileOptions;
}): Promise<{
  analysisId: string;
  schema: ExtractedSchema | ProfiledSchema;
  detected: DetectedVocabulary;
  profileStats?: ProfileResult['stats'];
}>;
```

Store profiling results in database:

```typescript
// packages/db/src/schema/knosia.ts
export const knosiaTableProfile = pgTable('knosia_table_profile', {
  id: id(),
  analysisId: text('analysis_id').notNull().references(() => knosiaAnalysis.id),
  tableName: text('table_name').notNull(),

  // Profiling data (JSONB)
  profile: jsonb('profile').$type<TableProfile>().notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const knosiaColumnProfile = pgTable('knosia_column_profile', {
  id: id(),
  tableProfileId: text('table_profile_id').notNull().references(() => knosiaTableProfile.id),
  columnName: text('column_name').notNull(),

  // Profiling data (JSONB)
  profile: jsonb('profile').$type<ColumnProfile>().notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

---

## Smart Optimizations

### 1. Adaptive Sampling Strategy

```typescript
function calculateSampleRate(estimatedRows: number): number {
  if (estimatedRows === 0) return 0;           // Skip empty
  if (estimatedRows < 10000) return 1.0;       // Full scan for small tables
  if (estimatedRows < 100000) return 0.1;      // 10% for medium
  if (estimatedRows < 1000000) return 0.01;    // 1% for large
  return 0.001;                                // 0.1% for huge (1M+ rows)
}
```

### 2. Parallel Table Processing

```typescript
async function profileTablesInParallel(
  tables: Table[],
  maxConcurrent: number = 5
): Promise<TableProfile[]> {
  const queue = [...tables];
  const results: TableProfile[] = [];
  const active = new Set<Promise<TableProfile>>();

  while (queue.length > 0 || active.size > 0) {
    // Fill up to maxConcurrent
    while (active.size < maxConcurrent && queue.length > 0) {
      const table = queue.shift()!;
      const promise = profileTable(table).then(profile => {
        active.delete(promise);
        results.push(profile);
        return profile;
      });
      active.add(promise);
    }

    // Wait for one to complete
    if (active.size > 0) {
      await Promise.race(active);
    }
  }

  return results;
}
```

### 3. Progressive Results (SSE Streaming)

```typescript
// API endpoint streams results as they complete
export async function* streamProfilingResults(
  connectionId: string
): AsyncGenerator<ProfilingProgress> {
  for await (const table of profileTablesStreaming()) {
    yield {
      type: 'table-complete',
      tableName: table.name,
      profile: table.profile,
      progress: {
        completed: completedCount,
        total: totalTables,
        percentage: (completedCount / totalTables) * 100,
      },
    };
  }

  yield { type: 'complete', summary: ... };
}
```

### 4. Intelligent Column Selection

Only profile columns that matter:

```typescript
function selectColumnsToProfile(table: Table): Column[] {
  // Always profile:
  // - Primary keys (for cardinality)
  // - Foreign keys (for relationships)
  // - Timestamp columns (for freshness)
  // - Numeric columns (for metrics)
  // - Low-cardinality text (for dimensions)

  // Skip:
  // - Binary/blob columns
  // - Very long text (>1000 avg chars)
  // - JSON columns (unless tier 3)
}
```

---

## Briefing Enhancement Examples

### Without Profiling
```
Connected to 'sales_db' with 15 tables.
Detected 8 entities, 12 metrics, 6 dimensions.
```

### With Profiling
```
Connected to 'sales_db' - last updated 2 hours ago.

📊 Your Data at a Glance:
• Orders: 1.2M transactions spanning Jan 2022 - Today
  Latest: 2 hours ago | Revenue: $2.3M | Avg: $1,915

• Customers: 15,247 active (23% increase vs last quarter)
  Top segment: Enterprise (42% of revenue)

• Products: 842 SKUs, most popular: Widget Pro (1,247 sales)

⚠️ Attention Needed:
• Returns table empty - integration issue?
• Inventory data stale (last update: 5 days ago)

🎯 Recommended First Questions:
• "Show revenue by product category"
• "Which customers haven't ordered in 90 days?"
• "What's our average order value trend?"
```

---

## Performance Benchmarks (Expected)

### Knosia Database (40 tables, ~10K rows each)
- Tier 1 (statistics): 4 seconds
- Tier 2 (sampling): 40 seconds
- Tier 3 (selective): 60 seconds
- **Total: ~2 minutes**

### Pagila (22 tables, 100K+ rows)
- Tier 1: 2 seconds
- Tier 2: 22 seconds (1% sampling)
- Tier 3: 45 seconds
- **Total: ~1 minute**

### Large Enterprise DB (150 tables, 10M+ rows)
- Tier 1: 15 seconds
- Tier 2: 150 seconds (0.1% sampling)
- Tier 3: 200 seconds (top 20 tables)
- **Total: ~6 minutes**

---

## Implementation Checklist

### Wave 2.5: Data Profiling Foundation

- [ ] Create `profiler.ts` with core engine
- [ ] Create `profiler-queries.ts` with SQL builders
- [ ] Add `ProfiledSchema` and profile types to `models.ts`
- [ ] Implement Tier 1 (database statistics)
- [ ] Implement Tier 2 (adaptive sampling)
- [ ] Implement Tier 3 (detailed profiling)
- [ ] Add parallel processing with concurrency control
- [ ] Write unit tests against in-memory DuckDB
- [ ] Write integration tests against LiquidGym databases
- [ ] Write integration tests against Knosia database

### Wave 2.6: API & Storage

- [ ] Add profiling tables to Knosia schema
- [ ] Generate and run migrations
- [ ] Update `analyzeConnection` to include profiling
- [ ] Add SSE streaming for progressive results
- [ ] Cache profiling results in database
- [ ] Add TTL/refresh logic (re-profile after 24 hours)

### Wave 2.7: UI Integration

- [ ] Update onboarding flow to show profiling progress
- [ ] Enhance briefing with profiled data
- [ ] Add "Data Health" dashboard with quality metrics
- [ ] Show freshness indicators in vocabulary items

---

## Success Metrics

**Technical:**
- ✅ Profile Knosia (40 tables) in <2 minutes
- ✅ Profile Pagila (22 tables) in <1 minute
- ✅ Profile large DB (150 tables) in <6 minutes
- ✅ 90%+ accuracy on cardinality estimates
- ✅ Zero crashes on 100K+ row tables

**Product:**
- ✅ Briefing mentions data freshness ("2 hours ago")
- ✅ Briefing shows business context ("1.2M transactions, $2.3M revenue")
- ✅ Filters out empty/stale tables automatically
- ✅ Suggests actionable first questions based on data

**Business:**
- ✅ "Wow factor" in demo - shows understanding beyond schema
- ✅ Reduces time-to-first-query from 10 min to <2 min
- ✅ Eliminates "which tables should I look at?" confusion

---

## Next Steps

1. **Review this architecture** - validate approach
2. **Implement Wave 2.5** - core profiling engine
3. **Test against real databases** - Knosia, LiquidGym
4. **Optimize performance** - hit <3 min target
5. **Integrate with briefing** - elevate user experience

This positions Knosia as an **intelligent data scientist assistant**, not just a schema reader.
