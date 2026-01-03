# Knosia Data Profiling Integration Assessment

**Date:** 2026-01-02
**Question:** Is the profiling implementation well-integrated with Knosia?
**Answer:** YES - Integration is clean and follows existing patterns

---

## Integration Quality: ✅ EXCELLENT

### Why It's Well-Integrated

**1. Builds on Existing Architecture**
- Uses same `DuckDBUniversalAdapter` that Knosia already imports
- Extends existing `runAnalysis()` SSE streaming (no new patterns)
- Follows established UVB (Universal Vocabulary Builder) structure
- Stores in same database with proper foreign keys

**2. Non-Breaking Changes**
- Profiling is OPTIONAL (controlled by parameter)
- Existing 5-step analysis flow continues to work unchanged
- New profiling becomes steps 6-8 (seamless extension)
- Backward compatible with existing onboarding flow

**3. Proper Separation of Concerns**
```
liquid-connect/uvb/          ← Pure profiling logic (no Knosia knowledge)
├── profiler.ts              ← Core engine
├── profiler-queries.ts      ← SQL builders
└── models.ts                ← Type definitions

knosia/analysis/             ← Knosia-specific orchestration
├── queries.ts               ← Integrates profiler into runAnalysis()
└── router.ts                ← SSE endpoint (no changes needed)

knosia schema                ← Storage layer
├── knosia_table_profile     ← New table (clean addition)
└── knosia_column_profile    ← New table (clean addition)
```

**4. UI Already Prepared**
- Onboarding SSE progress display exists (just add new steps)
- Analysis results stored with `analysisId` (already tracked)
- Briefing module exists (enhance with profiled data)

---

## Current Knosia Analysis Flow

**File:** `packages/api/src/modules/knosia/analysis/queries.ts`

```typescript
export async function* runAnalysis(connectionId: string): AsyncGenerator<...> {
  // Step 1: Connecting to database ✅ EXISTS
  // Step 2: Scanning schema ✅ EXISTS
  // Step 3: Detecting business type ✅ EXISTS
  // Step 4: Classifying fields (applyHardRules) ✅ EXISTS
  // Step 5: Generating vocabulary ✅ EXISTS

  // 🆕 PROFILING ADDS (optional):
  // Step 6: Profiling data (Tier 1 statistics)
  // Step 7: Sampling tables (Tier 2)
  // Step 8: Deep analysis (Tier 3 - selective)

  yield { event: "complete", data: {...} }
}
```

**Integration Point:** Add profiling steps INSIDE existing generator, after step 5.

---

## Integration Changes (Corrected Flow)

### Wave 2.5: Foundation ✅ (No Knosia changes)

**Location:** `packages/liquid-connect/src/uvb/`

```
profiler.ts              ← New file (pure profiling engine)
profiler-queries.ts      ← New file (SQL builders)
models.ts                ← Extend with ProfiledSchema types
```

**No changes to Knosia code** - just building the engine.

---

### Wave 2.6: API Integration (CORRECTED)

**We DON'T create `mutations.ts`** - that file doesn't exist and shouldn't.

**Instead, we enhance EXISTING files:**

#### Change 1: Enhance `queries.ts::runAnalysis()`

**File:** `packages/api/src/modules/knosia/analysis/queries.ts`

```typescript
// Add to imports
import { profileSchema } from "@repo/liquid-connect/uvb";

// Update ANALYSIS_STEPS constant
const ANALYSIS_STEPS = [
  // ... existing 5 steps
  { step: 6, label: "Profiling data", detail: "Analyzing row counts and freshness..." },
  { step: 7, label: "Sampling tables", detail: "Computing statistics and cardinality..." },
  { step: 8, label: "Quality check", detail: "Detecting data quality issues..." },
] as const;

// Enhance runAnalysis generator
export async function* runAnalysis(
  connectionId: string,
  options?: { includeDataProfiling?: boolean } // NEW: optional profiling
): AsyncGenerator<...> {

  // ... existing steps 1-5 unchanged ...

  // NEW: Optional profiling steps (only if includeDataProfiling = true)
  if (options?.includeDataProfiling) {
    // Step 6: Profile schema
    yield { event: "step", data: { step: 6, status: "started", ... } };

    const profileResult = await profileSchema(adapter, schema, {
      enableTier1: true,
      enableTier2: true,
      enableTier3: false, // Only for large deployments
      maxConcurrentTables: 5,
    });

    yield { event: "step", data: { step: 6, status: "completed" } };

    // Store profiling results in DB
    await storeProfilingResults(analysis.id, profileResult);

    // Include profile summary in completion event
    summary.profiledTables = profileResult.stats.tablesProfiled;
    summary.dataFreshness = getLatestTimestamp(profileResult.schema);
  }

  // ... rest of completion logic ...
}

// NEW: Helper function to store profiling results
async function storeProfilingResults(
  analysisId: string,
  result: ProfileResult
) {
  for (const [tableName, profile] of Object.entries(result.schema.tableProfiles)) {
    const [tableProfile] = await db
      .insert(knosiaTableProfile)
      .values({
        analysisId,
        tableName,
        profile,
      })
      .returning();

    // Store column profiles
    const columnProfiles = result.schema.columnProfiles[tableName] ?? {};
    for (const [columnName, colProfile] of Object.entries(columnProfiles)) {
      await db.insert(knosiaColumnProfile).values({
        tableProfileId: tableProfile.id,
        columnName,
        profile: colProfile,
      });
    }
  }
}
```

**Changes:**
- ✅ Add optional `options` parameter to `runAnalysis()`
- ✅ Add 3 new profiling steps (conditionally executed)
- ✅ Call `profileSchema()` from uvb
- ✅ Store results in new profiling tables
- ✅ Include profiling summary in completion event

**Backward Compatible:**
- Default: `includeDataProfiling = false` (5-step analysis, existing behavior)
- Opt-in: `includeDataProfiling = true` (8-step analysis with profiling)

---

#### Change 2: Add Query Functions

**File:** `packages/api/src/modules/knosia/analysis/queries.ts` (same file, add new exports)

```typescript
/**
 * Get table profile for an analysis
 */
export async function getTableProfile(analysisId: string, tableName: string) {
  const result = await db
    .select()
    .from(knosiaTableProfile)
    .where(
      and(
        eq(knosiaTableProfile.analysisId, analysisId),
        eq(knosiaTableProfile.tableName, tableName)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get column profiles for a table
 */
export async function getColumnProfiles(tableProfileId: string) {
  return db
    .select()
    .from(knosiaColumnProfile)
    .where(eq(knosiaColumnProfile.tableProfileId, tableProfileId));
}

/**
 * Get profiling summary for an analysis
 */
export async function getProfilingSummary(analysisId: string) {
  const profiles = await db
    .select()
    .from(knosiaTableProfile)
    .where(eq(knosiaTableProfile.analysisId, analysisId));

  return {
    totalTables: profiles.length,
    latestData: profiles.reduce((latest, p) => {
      const tableLatest = p.profile.latestDataAt;
      if (!tableLatest) return latest;
      return !latest || tableLatest > latest ? tableLatest : latest;
    }, null as Date | null),
    emptyTables: profiles.filter(p => p.profile.rowCountEstimate === 0),
    staleTables: profiles.filter(p => {
      if (!p.profile.latestDataAt) return false;
      const daysSince = (Date.now() - p.profile.latestDataAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30;
    }),
  };
}
```

---

#### Change 3: Update Router (Enable Profiling)

**File:** `packages/api/src/modules/knosia/analysis/router.ts`

```typescript
// Update GET /run endpoint to accept profiling option
.get("/run", async (c) => {
  const query = c.req.query();

  const parsed = runAnalysisSchema.safeParse({
    connectionId: query.connectionId,
    includeDataProfiling: query.includeDataProfiling === "true", // NEW
  });

  // ... validation ...

  return streamSSE(c, async (stream) => {
    for await (const event of runAnalysis(
      parsed.data.connectionId,
      { includeDataProfiling: parsed.data.includeDataProfiling } // NEW
    )) {
      await stream.writeSSE({ event: event.event, data: JSON.stringify(event.data) });
    }
  });
})

// NEW: Add profiling summary endpoint
.get("/:id/profiling", async (c) => {
  const analysisId = c.req.param("id");
  const summary = await getProfilingSummary(analysisId);
  return c.json(summary);
})

// NEW: Add table profile endpoint
.get("/:id/tables/:tableName/profile", async (c) => {
  const analysisId = c.req.param("id");
  const tableName = c.req.param("tableName");
  const profile = await getTableProfile(analysisId, tableName);

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  return c.json(profile);
});
```

---

#### Change 4: Update Schemas

**File:** `packages/api/src/modules/knosia/analysis/schemas.ts`

```typescript
import { z } from "zod";
import { knosiaAnalysisIdSchema } from "../shared-schemas";

export const runAnalysisSchema = z.object({
  connectionId: z.string(),
  includeDataProfiling: z.boolean().optional().default(false), // NEW
});

// ... rest unchanged ...
```

---

#### Change 5: Database Schema

**File:** `packages/db/src/schema/knosia.ts`

```typescript
// Add profiling tables (after knosiaAnalysis)

export const knosiaTableProfile = pgTable('knosia_table_profile', {
  id: id(),
  analysisId: text('analysis_id')
    .notNull()
    .references(() => knosiaAnalysis.id, { onDelete: 'cascade' }),
  tableName: text('table_name').notNull(),

  // Profiling data stored as JSONB
  profile: jsonb('profile').$type<TableProfile>().notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const knosiaColumnProfile = pgTable('knosia_column_profile', {
  id: id(),
  tableProfileId: text('table_profile_id')
    .notNull()
    .references(() => knosiaTableProfile.id, { onDelete: 'cascade' }),
  columnName: text('column_name').notNull(),

  // Profiling data stored as JSONB
  profile: jsonb('profile').$type<ColumnProfile>().notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add indexes for efficient queries
export const knosiaTableProfileAnalysisIdx = uniqueIndex(
  'knosia_table_profile_analysis_table_idx'
).on(knosiaTableProfile.analysisId, knosiaTableProfile.tableName);

export const knosiaColumnProfileTableIdx = uniqueIndex(
  'knosia_column_profile_table_column_idx'
).on(knosiaColumnProfile.tableProfileId, knosiaColumnProfile.columnName);
```

**Import ProfileTypes:**

```typescript
import type { TableProfile, ColumnProfile } from "@repo/liquid-connect/uvb";
```

---

### Wave 2.7: UI Integration

#### Change 1: Onboarding Progress

**File:** `apps/web/src/modules/onboarding/components/analysis-step.tsx`

**Current:** Shows 5 steps
**Enhanced:** Shows 8 steps when profiling enabled

```typescript
// Just update step labels to match ANALYSIS_STEPS from backend
const STEP_LABELS = [
  "Connecting to database",
  "Scanning schema",
  "Detecting business type",
  "Classifying fields",
  "Generating vocabulary",
  "Profiling data",        // NEW (shows conditionally)
  "Sampling tables",       // NEW
  "Quality check",         // NEW
];
```

**SSE handling already works** - no changes needed to streaming logic.

---

#### Change 2: Enhanced Briefing

**File:** `apps/web/src/modules/briefing/components/data-insights.tsx` (NEW)

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api/client";

export function DataInsights({ analysisId }: { analysisId: string }) {
  const { data: profiling } = useQuery({
    queryKey: ["profiling", analysisId],
    queryFn: async () => {
      const res = await api.knosia.analysis[":id"].profiling.$get({
        param: { id: analysisId },
      });
      return res.json();
    },
  });

  if (!profiling) return null;

  return (
    <div className="space-y-4">
      <h3>Data Health</h3>

      {profiling.latestData && (
        <p>Latest data: {formatDistanceToNow(profiling.latestData)} ago</p>
      )}

      {profiling.emptyTables.length > 0 && (
        <Alert variant="warning">
          {profiling.emptyTables.length} empty tables detected
        </Alert>
      )}

      {profiling.staleTables.length > 0 && (
        <Alert variant="info">
          {profiling.staleTables.length} tables haven't been updated in 30+ days
        </Alert>
      )}
    </div>
  );
}
```

---

## Integration Benefits

### 1. Clean Architecture
```
UVB (liquid-connect)         ← Pure data profiling logic
     ↓ used by
Knosia Analysis (API)        ← Orchestration + SSE streaming
     ↓ consumed by
Onboarding UI (web)          ← Progress display
Briefing UI (web)            ← Enhanced insights
```

### 2. Incremental Adoption

**Phase 1 (Now):** Analysis without profiling
```
runAnalysis(connectionId)  // 5 steps, 30 seconds
```

**Phase 2 (Later):** Analysis with profiling
```
runAnalysis(connectionId, { includeDataProfiling: true })  // 8 steps, 2-3 minutes
```

**Phase 3 (Future):** Always-on profiling
```
// Default to true in production
runAnalysis(connectionId, { includeDataProfiling: true })
```

### 3. Performance Control

**Tiered profiling allows fine-tuning:**

```typescript
// Fast: Just database statistics (instant)
profileSchema(adapter, schema, {
  enableTier1: true,
  enableTier2: false,
  enableTier3: false,
});

// Balanced: Statistics + sampling (1-2 min)
profileSchema(adapter, schema, {
  enableTier1: true,
  enableTier2: true,
  enableTier3: false,
});

// Deep: Full profiling (3-5 min)
profileSchema(adapter, schema, {
  enableTier1: true,
  enableTier2: true,
  enableTier3: true,
});
```

### 4. Future Extensions

**Easy to add:**
- ✅ Per-workspace profiling preferences
- ✅ Scheduled re-profiling (daily refresh)
- ✅ Profiling diffs (compare over time)
- ✅ Data quality scoring
- ✅ Anomaly detection

**All without breaking existing code.**

---

## Corrected Implementation Flow

### Wave 2.5: Foundation (No Knosia changes)
- Create profiler.ts, profiler-queries.ts
- Add ProfiledSchema types to models.ts
- Write comprehensive tests

### Wave 2.6: API Integration (Enhance existing files)
- ✅ Update `queries.ts::runAnalysis()` with optional profiling
- ✅ Add profiling storage helper functions
- ✅ Add new query functions (getTableProfile, etc.)
- ✅ Update router with profiling endpoints
- ✅ Add profiling tables to schema
- ✅ Generate and run migration

### Wave 2.7: UI Integration (Enhance existing components)
- ✅ Update onboarding to show 8 steps
- ✅ Create data insights component for briefing
- ✅ Add data health dashboard (optional)

---

## Integration Risks: NONE IDENTIFIED

**Why safe:**

1. **Backward compatible** - existing analysis flow unchanged
2. **No breaking changes** - all additions are additive
3. **Clean separation** - profiling engine is independent
4. **Existing patterns** - follows established SSE + generator pattern
5. **Proper foreign keys** - profiling tables cascade delete with analysis

---

## Answer: Is It Well Integrated?

# ✅ YES - EXCELLENTLY INTEGRATED

**Why:**
- Builds on existing DuckDBUniversalAdapter
- Extends existing `runAnalysis()` generator (not a new flow)
- Uses existing SSE streaming (no new patterns)
- Proper database schema with foreign keys
- Backward compatible (opt-in profiling)
- UI already prepared for additional steps
- Clean separation of concerns

**No architectural conflicts. No breaking changes. Seamless extension.**
