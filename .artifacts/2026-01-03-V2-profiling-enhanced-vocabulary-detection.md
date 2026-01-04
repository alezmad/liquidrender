# V2: Profiling-Enhanced Vocabulary Detection

**Date:** 2026-01-03
**Status:** Implementation Specification
**Priority:** High — Unlocks data-driven vocabulary intelligence

---

## Executive Summary

**Current State (V1):**
✅ Profiling data collected and stored (Tier 1 + Tier 2)
✅ Displayed in Data Health Dashboard
❌ **NOT used in vocabulary detection** — `applyHardRules()` only uses schema structure

**V2 Enhancement:**
Feed profiling data back into `applyHardRules()` to achieve **data-driven vocabulary detection** with significantly higher accuracy.

**Impact:**
- **Smarter metric detection** — Use cardinality to distinguish `COUNT(DISTINCT user_id)` vs `SUM(quantity)`
- **Better dimension classification** — Low cardinality (< 100 values) → dimension, high cardinality → ID
- **Required field detection** — Null% < 5% → required field, 100% null → ignore
- **Enum/category detection** — Fixed value patterns (e.g., `status: [pending|active|closed]`)
- **Time freshness awareness** — Stale columns (no recent data) marked for exclusion
- **ID vs metric disambiguation** — High cardinality integers are IDs, not metrics

---

## Architecture Overview

### Current Flow (V1)

```
extractSchema() → ExtractedSchema
                      ↓
              applyHardRules(schema) → DetectedVocabulary
                      ↓
              (Schema structure only: names, types, FKs)
```

### Enhanced Flow (V2)

```
extractSchema() → ExtractedSchema
                      ↓
profileSchema() → ProfiledSchema (extends ExtractedSchema)
                      ↓
              applyHardRules(schema, profilingData) → DetectedVocabulary
                      ↓
              (Schema + profiling: null%, cardinality, patterns, freshness)
```

---

## Data Structures

### Current `applyHardRules()` Signature

```typescript
export function applyHardRules(
  schema: ExtractedSchema,
  config: HardRulesConfig = DEFAULT_HARD_RULES_CONFIG
): ApplyHardRulesResult
```

### Enhanced Signature (V2)

```typescript
export function applyHardRules(
  schema: ExtractedSchema,
  config: HardRulesConfig = DEFAULT_HARD_RULES_CONFIG,
  profilingData?: ProfilingData  // NEW: Optional profiling data
): ApplyHardRulesResult
```

### New Type: `ProfilingData`

```typescript
/**
 * Profiling data extracted from ProfiledSchema
 * Passed to applyHardRules() for enhanced vocabulary detection
 */
export interface ProfilingData {
  // Table-level profiling
  tableProfiles: Record<string, TableProfile>;

  // Column-level profiling (indexed by table.column)
  columnProfiles: Record<string, ColumnProfile>;

  // Profiling metadata
  profiledAt: string;
  samplingStrategy: "full" | "adaptive" | "statistics-only";
}
```

### Helper: Convert `ProfiledSchema` → `ProfilingData`

```typescript
/**
 * Extract profiling data from ProfiledSchema for applyHardRules()
 */
export function extractProfilingData(profiledSchema: ProfiledSchema): ProfilingData {
  const columnProfiles: Record<string, ColumnProfile> = {};

  // Flatten column profiles to tableName.columnName keys
  for (const [tableName, columns] of Object.entries(profiledSchema.columnProfiles)) {
    for (const [columnName, profile] of Object.entries(columns)) {
      const key = `${tableName}.${columnName}`;
      columnProfiles[key] = profile;
    }
  }

  return {
    tableProfiles: profiledSchema.tableProfiles,
    columnProfiles,
    profiledAt: profiledSchema.profiledAt,
    samplingStrategy: profiledSchema.samplingStrategy,
  };
}
```

---

## Enhancement Strategies

### 1. Metric Detection Enhancement

**Problem:** Current logic flags ALL numeric columns as metrics
**Solution:** Use **cardinality** and **distinct count** to filter out IDs

#### Before (V1)

```typescript
function detectMetric(column: Column, tableName: string, config: HardRulesConfig) {
  const isInteger = isIntegerType(column.dataType);
  const hasMetricName = matchesAnyPattern(column.name, config.metricNamePatterns);

  if (!isDecimal && !(isInteger && hasMetricName)) {
    return null;
  }

  // All numeric columns → metrics
  return { aggregation: "SUM", certainty: 0.8, ... };
}
```

#### After (V2)

```typescript
function detectMetric(
  column: Column,
  tableName: string,
  config: HardRulesConfig,
  profilingData?: ProfilingData  // NEW
) {
  const isInteger = isIntegerType(column.dataType);
  const hasMetricName = matchesAnyPattern(column.name, config.metricNamePatterns);

  if (!isDecimal && !(isInteger && hasMetricName)) {
    return null;
  }

  // NEW: Use profiling data to disambiguate IDs vs metrics
  if (profilingData) {
    const profile = profilingData.columnProfiles[`${tableName}.${column.name}`];

    if (profile?.numeric) {
      // High cardinality (> 90% unique) → likely an ID, not a metric
      const cardinality = profile.numeric.distinctCount || 0;
      const totalRows = profilingData.tableProfiles[tableName]?.rowCountEstimate || 1;
      const uniqueRatio = cardinality / totalRows;

      if (uniqueRatio > 0.9 && isInteger) {
        console.log(`Skipping ${tableName}.${column.name}: High cardinality (${uniqueRatio.toFixed(2)}) suggests ID`);
        return null;  // Skip IDs
      }

      // Low cardinality (< 20 distinct values) → use COUNT instead of SUM
      if (cardinality < 20 && isInteger) {
        return {
          aggregation: "COUNT_DISTINCT",
          certainty: 1.0,
          ...
        };
      }

      // Decimal types remain SUM/AVG based on name patterns
    }
  }

  // Original logic as fallback
  let aggregation: AggregationType = "SUM";
  if (/rate|ratio|percent|average|avg|score|rating/i.test(column.name)) {
    aggregation = "AVG";
  }

  return { aggregation, certainty: 0.8, ... };
}
```

**Impact:**
✅ Eliminate false positives (user_id, order_id flagged as SUM metrics)
✅ Use COUNT_DISTINCT for low-cardinality enums
✅ Preserve SUM/AVG for true metrics

---

### 2. Dimension Detection Enhancement

**Problem:** Current logic uses name patterns only
**Solution:** Use **cardinality** and **categorical patterns** for smarter detection

#### Before (V1)

```typescript
function detectDimension(column: Column, tableName: string, config: HardRulesConfig) {
  if (!isStringType(column.dataType)) return null;
  if (column.isPrimaryKey || column.isForeignKey) return null;

  // Exclude long text fields
  if (matchesAnyPattern(column.name, config.dimensionExcludePatterns)) {
    return null;
  }

  // All short strings → dimensions
  return { type: "string", certainty: 0.7, ... };
}
```

#### After (V2)

```typescript
function detectDimension(
  column: Column,
  tableName: string,
  config: HardRulesConfig,
  profilingData?: ProfilingData  // NEW
) {
  if (!isStringType(column.dataType)) return null;
  if (column.isPrimaryKey || column.isForeignKey) return null;

  // Exclude long text fields
  if (matchesAnyPattern(column.name, config.dimensionExcludePatterns)) {
    return null;
  }

  let certainty = 0.7;
  let type: "categorical" | "free-text" | "enum" = "categorical";

  // NEW: Use profiling data for smarter classification
  if (profilingData) {
    const profile = profilingData.columnProfiles[`${tableName}.${column.name}`];

    if (profile?.categorical) {
      const cardinality = profile.categorical.distinctCount || 0;
      const topValuesCoverage = profile.categorical.topValues?.reduce((sum, v) => sum + v.percentage, 0) || 0;

      // Low cardinality (< 100 unique) + high top values coverage (> 80%) → enum
      if (cardinality < 100 && topValuesCoverage > 80) {
        type = "enum";
        certainty = 1.0;
        console.log(`${tableName}.${column.name}: Detected enum (${cardinality} values, ${topValuesCoverage.toFixed(0)}% coverage)`);
      }

      // Medium cardinality (100-1000) → categorical dimension
      else if (cardinality < 1000) {
        type = "categorical";
        certainty = 0.9;
      }

      // High cardinality (> 1000) → likely free text, lower certainty
      else {
        type = "free-text";
        certainty = 0.5;
        console.log(`${tableName}.${column.name}: High cardinality (${cardinality}), likely free text`);
      }

      // Null% > 80% → sparse dimension, lower priority
      if (profile.nullPercentage > 80) {
        certainty *= 0.5;
        console.log(`${tableName}.${column.name}: Sparse (${profile.nullPercentage.toFixed(0)}% null)`);
      }
    }
  }

  return {
    type,
    certainty,
    cardinality: profilingData?.columnProfiles[`${tableName}.${column.name}`]?.categorical?.distinctCount,
    ...
  };
}
```

**Impact:**
✅ Identify enum fields (status, category, type)
✅ Distinguish dimensions from free-text columns
✅ Lower priority for sparse dimensions (high null%)

---

### 3. Required Field Detection (NEW)

**Problem:** No way to identify required fields
**Solution:** Use **null percentage** to detect required/optional fields

```typescript
/**
 * Detect required fields (null% < 5%)
 * These are high-priority fields for data quality
 */
function detectRequiredFields(
  tables: Table[],
  profilingData?: ProfilingData
): DetectedRequiredField[] {
  if (!profilingData) return [];

  const requiredFields: DetectedRequiredField[] = [];

  for (const table of tables) {
    for (const column of table.columns) {
      const profile = profilingData.columnProfiles[`${table.name}.${column.name}`];

      if (profile && profile.nullPercentage < 5) {
        requiredFields.push({
          id: generateId(table.name, column.name, "required"),
          table: table.name,
          column: column.name,
          nullPercentage: profile.nullPercentage,
          certainty: profile.nullPercentage === 0 ? 1.0 : 0.9,
          suggestedDisplayName: toDisplayName(column.name),
        });
      }
    }
  }

  return requiredFields;
}

export interface DetectedRequiredField {
  id: string;
  table: string;
  column: string;
  nullPercentage: number;
  certainty: number;
  suggestedDisplayName: string;
}
```

**Impact:**
✅ Identify required fields for data quality checks
✅ Prioritize fields in UI (required fields shown first)
✅ Validation rules for user input

---

### 4. Time Field Enhancement

**Problem:** Current logic uses type only
**Solution:** Use **data freshness** to identify active vs stale time fields

#### After (V2)

```typescript
function detectTimeField(
  column: Column,
  tableName: string,
  config: HardRulesConfig,
  profilingData?: ProfilingData  // NEW
): DetectedTimeField | null {
  if (!isTemporalType(column.dataType)) return null;

  let certainty = 0.9;
  let isStale = false;

  // NEW: Use profiling data to detect stale columns
  if (profilingData) {
    const profile = profilingData.columnProfiles[`${tableName}.${column.name}`];

    if (profile?.temporal) {
      const daysSinceLatest = profile.temporal.daysSinceLatest || Infinity;

      // No data in last 30 days → stale
      if (daysSinceLatest > 30) {
        isStale = true;
        certainty = 0.3;
        console.log(`${tableName}.${column.name}: Stale (${daysSinceLatest} days since latest)`);
      }

      // No data at all (100% null)
      if (profile.nullPercentage === 100) {
        console.log(`${tableName}.${column.name}: Empty time field, skipping`);
        return null;
      }
    }
  }

  return {
    certainty,
    isStale,
    daysSinceLatest: profilingData?.columnProfiles[`${tableName}.${column.name}`]?.temporal?.daysSinceLatest,
    ...
  };
}
```

**Impact:**
✅ Identify stale time fields (archived data)
✅ Prioritize active time fields for time-series analysis

---

### 5. Empty Column Detection (NEW)

**Problem:** No way to identify useless columns
**Solution:** Use **null percentage** to filter out 100% null columns

```typescript
/**
 * Filter out empty columns (100% null)
 * These columns should be excluded from vocabulary
 */
function filterEmptyColumns(
  columns: Column[],
  tableName: string,
  profilingData?: ProfilingData
): Column[] {
  if (!profilingData) return columns;

  return columns.filter((column) => {
    const profile = profilingData.columnProfiles[`${tableName}.${column.name}`];

    if (profile && profile.nullPercentage === 100) {
      console.log(`Filtering ${tableName}.${column.name}: 100% null`);
      return false;
    }

    return true;
  });
}
```

**Impact:**
✅ Reduce noise in vocabulary
✅ Exclude unused columns from dashboard

---

## Updated `applyHardRules()` Implementation

### Function Signature

```typescript
export interface ApplyHardRulesOptions {
  config?: HardRulesConfig;
  profilingData?: ProfilingData;  // NEW
}

export function applyHardRules(
  schema: ExtractedSchema,
  options: ApplyHardRulesOptions = {}
): ApplyHardRulesResult {
  const config = options.config || DEFAULT_HARD_RULES_CONFIG;
  const profilingData = options.profilingData;

  // Enhanced detection with profiling data
  const entities = detectEntities(schema.tables);
  const relationships = detectRelationships(schema.tables);
  const metrics = detectMetrics(schema.tables, config, profilingData);  // Enhanced
  const dimensions = detectDimensions(schema.tables, config, profilingData);  // Enhanced
  const timeFields = detectTimeFields(schema.tables, config, profilingData);  // Enhanced
  const filters = detectFilters(schema.tables, config);

  // NEW: Additional detections with profiling data
  const requiredFields = detectRequiredFields(schema.tables, profilingData);
  const enumFields = detectEnumFields(schema.tables, profilingData);

  const detected: DetectedVocabulary = {
    entities: entities.filter((e) => !e.isJunction),
    metrics,
    dimensions,
    timeFields,
    filters,
    relationships,
    requiredFields,  // NEW
    enumFields,      // NEW
  };

  const confirmations = generateConfirmations(detected);

  return {
    detected,
    confirmations,
    stats: {
      tables: schema.tables.length,
      entities: entities.filter((e) => !e.isJunction).length,
      junctionTables: entities.filter((e) => e.isJunction).length,
      metrics: metrics.length,
      dimensions: dimensions.length,
      timeFields: timeFields.length,
      filters: filters.length,
      relationships: relationships.length,
      requiredFields: requiredFields.length,  // NEW
      enumFields: enumFields.length,          // NEW
    },
    profilingUsed: !!profilingData,  // NEW: Flag whether profiling data was used
  };
}
```

### Backward Compatibility

```typescript
// V1 API (still works)
const result = applyHardRules(schema);

// V2 API (with profiling)
const result = applyHardRules(schema, {
  config: customConfig,
  profilingData: extractProfilingData(profiledSchema),
});
```

---

## Pipeline Integration

### Updated `runKnosiaPipeline()`

**Location:** `packages/api/src/modules/knosia/pipeline/index.ts:157`

#### Before (V1)

```typescript
const rulesResult = await applyHardRules(extractedSchema);
```

#### After (V2)

```typescript
// Extract schema
const extractedSchema = await extractSchema(adapter, schema);

// Optional: Profile schema (enabled via options.enableProfiling)
let profilingData: ProfilingData | undefined;
if (options?.enableProfiling) {
  const profiledSchema = await profileSchema(adapter, extractedSchema, {
    enableTier1: true,
    enableTier2: true,
    enableTier3: false,
    maxConcurrentTables: 5,
  });
  profilingData = extractProfilingData(profiledSchema);
}

// Apply hard rules with profiling data
const rulesResult = await applyHardRules(extractedSchema, {
  config: DEFAULT_HARD_RULES_CONFIG,
  profilingData,  // NEW
});
```

### Updated `analyzeConnection()` SSE Stream

**Location:** `packages/api/src/modules/knosia/analysis/queries.ts:367`

#### After (V2)

```typescript
// Step 4: Apply hard rules
const { detected, confirmations } = applyHardRules(schema, {
  profilingData: profilingResult ? extractProfilingData(profilingResult) : undefined,
});
```

---

## Type Extensions

### Updated `DetectedVocabulary`

```typescript
export interface DetectedVocabulary {
  entities: DetectedEntity[];
  metrics: DetectedMetric[];
  dimensions: DetectedDimension[];
  timeFields: DetectedTimeField[];
  filters: DetectedFilter[];
  relationships: DetectedRelationship[];

  // NEW: V2 additions
  requiredFields?: DetectedRequiredField[];
  enumFields?: DetectedEnumField[];
}
```

### New Type: `DetectedEnumField`

```typescript
export interface DetectedEnumField {
  id: string;
  table: string;
  column: string;
  dataType: string;
  distinctCount: number;
  topValues: Array<{ value: string; count: number; percentage: number }>;
  certainty: number;
  suggestedDisplayName: string;
}

function detectEnumFields(
  tables: Table[],
  profilingData?: ProfilingData
): DetectedEnumField[] {
  if (!profilingData) return [];

  const enumFields: DetectedEnumField[] = [];

  for (const table of tables) {
    for (const column of table.columns) {
      const profile = profilingData.columnProfiles[`${table.name}.${column.name}`];

      if (profile?.categorical) {
        const cardinality = profile.categorical.distinctCount || 0;
        const topValues = profile.categorical.topValues || [];
        const coverage = topValues.reduce((sum, v) => sum + v.percentage, 0);

        // Enum criteria: < 100 distinct values, > 80% coverage by top values
        if (cardinality < 100 && coverage > 80) {
          enumFields.push({
            id: generateId(table.name, column.name, "enum"),
            table: table.name,
            column: column.name,
            dataType: column.dataType,
            distinctCount: cardinality,
            topValues,
            certainty: coverage / 100,
            suggestedDisplayName: toDisplayName(column.name),
          });
        }
      }
    }
  }

  return enumFields;
}
```

---

## Testing Strategy

### Unit Tests

**File:** `packages/liquid-connect/src/uvb/__tests__/rules-profiling.test.ts`

```typescript
import { applyHardRules, extractProfilingData } from '../rules';
import type { ExtractedSchema, ProfilingData, ProfiledSchema } from '../models';

describe('applyHardRules() with profiling data', () => {
  describe('Metric detection with cardinality', () => {
    it('should skip high-cardinality integer columns (IDs)', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'users',
          columns: [
            { name: 'user_id', dataType: 'integer', isPrimaryKey: true },
            { name: 'total_orders', dataType: 'integer', isPrimaryKey: false },
          ],
        }],
      };

      const profilingData: ProfilingData = {
        tableProfiles: { users: { rowCountEstimate: 10000 } },
        columnProfiles: {
          'users.user_id': {
            numeric: { distinctCount: 9800, min: 1, max: 10000 },
            nullPercentage: 0,
          },
          'users.total_orders': {
            numeric: { distinctCount: 45, min: 0, max: 150 },
            nullPercentage: 5,
          },
        },
      };

      const result = applyHardRules(schema, { profilingData });

      // user_id should be skipped (98% unique)
      expect(result.detected.metrics.find(m => m.column === 'user_id')).toBeUndefined();

      // total_orders should be detected as SUM metric
      expect(result.detected.metrics.find(m => m.column === 'total_orders')).toBeDefined();
    });

    it('should use COUNT_DISTINCT for low-cardinality integers', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'orders',
          columns: [
            { name: 'status_code', dataType: 'integer' },
          ],
        }],
      };

      const profilingData: ProfilingData = {
        columnProfiles: {
          'orders.status_code': {
            numeric: { distinctCount: 5, min: 1, max: 5 },
            nullPercentage: 0,
          },
        },
      };

      const result = applyHardRules(schema, { profilingData });

      const metric = result.detected.metrics.find(m => m.column === 'status_code');
      expect(metric?.aggregation).toBe('COUNT_DISTINCT');
    });
  });

  describe('Dimension detection with cardinality', () => {
    it('should classify enums with high coverage', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'orders',
          columns: [
            { name: 'status', dataType: 'varchar(50)' },
          ],
        }],
      };

      const profilingData: ProfilingData = {
        columnProfiles: {
          'orders.status': {
            categorical: {
              distinctCount: 5,
              topValues: [
                { value: 'pending', count: 500, percentage: 50 },
                { value: 'active', count: 300, percentage: 30 },
                { value: 'completed', count: 200, percentage: 20 },
              ],
            },
            nullPercentage: 0,
          },
        },
      };

      const result = applyHardRules(schema, { profilingData });

      const dimension = result.detected.dimensions.find(d => d.column === 'status');
      expect(dimension?.type).toBe('enum');
      expect(dimension?.certainty).toBeGreaterThan(0.9);
    });

    it('should detect free-text with high cardinality', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'products',
          columns: [
            { name: 'name', dataType: 'varchar(255)' },
          ],
        }],
      };

      const profilingData: ProfilingData = {
        columnProfiles: {
          'products.name': {
            categorical: { distinctCount: 5000 },
            nullPercentage: 0,
          },
        },
      };

      const result = applyHardRules(schema, { profilingData });

      const dimension = result.detected.dimensions.find(d => d.column === 'name');
      expect(dimension?.type).toBe('free-text');
      expect(dimension?.certainty).toBeLessThan(0.7);
    });
  });

  describe('Required field detection', () => {
    it('should detect fields with null% < 5%', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'users',
          columns: [
            { name: 'email', dataType: 'varchar(255)' },
            { name: 'phone', dataType: 'varchar(20)' },
          ],
        }],
      };

      const profilingData: ProfilingData = {
        columnProfiles: {
          'users.email': { nullPercentage: 0 },
          'users.phone': { nullPercentage: 60 },
        },
      };

      const result = applyHardRules(schema, { profilingData });

      expect(result.detected.requiredFields).toContainEqual(
        expect.objectContaining({ column: 'email', certainty: 1.0 })
      );

      expect(result.detected.requiredFields?.find(f => f.column === 'phone')).toBeUndefined();
    });
  });

  describe('Empty column filtering', () => {
    it('should skip 100% null columns', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'products',
          columns: [
            { name: 'legacy_field', dataType: 'varchar(255)' },
            { name: 'active_field', dataType: 'varchar(255)' },
          ],
        }],
      };

      const profilingData: ProfilingData = {
        columnProfiles: {
          'products.legacy_field': { nullPercentage: 100 },
          'products.active_field': { nullPercentage: 5 },
        },
      };

      const result = applyHardRules(schema, { profilingData });

      // legacy_field should not appear in any vocabulary
      expect(result.detected.dimensions.find(d => d.column === 'legacy_field')).toBeUndefined();
    });
  });

  describe('Time field freshness', () => {
    it('should mark stale time fields with low certainty', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'logs',
          columns: [
            { name: 'created_at', dataType: 'timestamp' },
            { name: 'archived_at', dataType: 'timestamp' },
          ],
        }],
      };

      const profilingData: ProfilingData = {
        columnProfiles: {
          'logs.created_at': {
            temporal: { daysSinceLatest: 1 },
            nullPercentage: 0,
          },
          'logs.archived_at': {
            temporal: { daysSinceLatest: 90 },
            nullPercentage: 50,
          },
        },
      };

      const result = applyHardRules(schema, { profilingData });

      const fresh = result.detected.timeFields.find(t => t.column === 'created_at');
      const stale = result.detected.timeFields.find(t => t.column === 'archived_at');

      expect(fresh?.certainty).toBeGreaterThan(0.8);
      expect(stale?.certainty).toBeLessThan(0.5);
    });
  });

  describe('Backward compatibility', () => {
    it('should work without profiling data (V1 behavior)', () => {
      const schema: ExtractedSchema = {
        tables: [{
          name: 'users',
          columns: [
            { name: 'total_orders', dataType: 'integer' },
          ],
        }],
      };

      const result = applyHardRules(schema);  // No profiling data

      expect(result.detected.metrics).toBeDefined();
      expect(result.profilingUsed).toBe(false);
    });
  });
});
```

### Integration Tests

**File:** `packages/api/src/modules/knosia/__tests__/pipeline-profiling.test.ts`

```typescript
import { runKnosiaPipeline } from '../pipeline';

describe('Pipeline with profiling-enhanced vocabulary', () => {
  it('should use profiling data when enableProfiling=true', async () => {
    const result = await runKnosiaPipeline(connectionId, userId, workspaceId, {
      enableProfiling: true,
      debug: true,
    });

    expect(result.debug?.profilingUsed).toBe(true);
    expect(result.vocabularyStats.requiredFields).toBeGreaterThan(0);
    expect(result.vocabularyStats.enumFields).toBeGreaterThan(0);
  });

  it('should exclude high-cardinality IDs from metrics', async () => {
    // Test with real database connection
    const result = await runKnosiaPipeline(connectionId, userId, workspaceId, {
      enableProfiling: true,
    });

    // user_id should NOT be detected as a SUM metric
    const metrics = result.debug?.detectedVocabulary.metrics || [];
    expect(metrics.find(m => m.column === 'user_id' && m.aggregation === 'SUM')).toBeUndefined();
  });
});
```

---

## Performance Considerations

### Profiling Overhead

| Tier | Cost | Use Case |
|------|------|----------|
| **Tier 1** | ~10ms | PostgreSQL statistics (instant) |
| **Tier 2** | ~500ms | Adaptive sampling (1-5% sample) |
| **Tier 3** | ~10s | Detailed analysis (full scan) |

**Recommendation:** Use Tier 1 + Tier 2 for V2 (same as V1)

### Caching Strategy

```typescript
// Cache profiling results for 24 hours
const PROFILING_CACHE_TTL = 24 * 60 * 60 * 1000;

async function getOrComputeProfiling(connectionId: string) {
  const cached = await redis.get(`profiling:${connectionId}`);
  if (cached) {
    const data = JSON.parse(cached);
    if (Date.now() - data.timestamp < PROFILING_CACHE_TTL) {
      return data.profilingData;
    }
  }

  // Compute fresh profiling
  const profilingData = await profileSchema(...);
  await redis.set(`profiling:${connectionId}`, JSON.stringify({
    timestamp: Date.now(),
    profilingData,
  }));

  return profilingData;
}
```

---

## Migration Guide

### Phase 1: Add Profiling Data Support (Non-Breaking)

1. **Update `applyHardRules()` signature**
   - Add optional `profilingData` parameter
   - Maintain backward compatibility (works without profiling)

2. **Add helper functions**
   - `extractProfilingData()` — Convert `ProfiledSchema` → `ProfilingData`
   - `detectRequiredFields()`, `detectEnumFields()` — New detections

3. **Enhanced detection logic**
   - Update `detectMetric()` with cardinality checks
   - Update `detectDimension()` with cardinality + patterns
   - Update `detectTimeField()` with freshness checks

### Phase 2: Pipeline Integration

4. **Update pipeline**
   - Pass profiling data to `applyHardRules()` when available
   - Add `enableProfiling` option (default: `true`)

5. **Update SSE stream**
   - Use profiling data in `analyzeConnection()` flow

### Phase 3: Testing & Validation

6. **Unit tests**
   - Test each enhancement individually
   - Test backward compatibility

7. **Integration tests**
   - Test with real database connections
   - Validate accuracy improvements

8. **E2E tests**
   - Test full pipeline with profiling enabled
   - Compare vocabulary quality V1 vs V2

---

## Success Metrics

### Accuracy Improvements (Target)

| Detection Type | V1 Accuracy | V2 Target | Improvement |
|----------------|-------------|-----------|-------------|
| **Metrics** | ~70% | ~90% | +20pp (ID exclusion) |
| **Dimensions** | ~75% | ~95% | +20pp (cardinality) |
| **Enums** | 0% | ~95% | New feature |
| **Required Fields** | 0% | ~99% | New feature |
| **Time Fields** | ~85% | ~95% | +10pp (freshness) |

### Performance Targets

- ✅ Profiling overhead: < 1s per analysis (Tier 1 + Tier 2 only)
- ✅ Backward compatibility: 100% (works without profiling)
- ✅ Cache hit rate: > 80% (24h TTL)

---

## Rollout Plan

### Week 1: Core Implementation

- [ ] Update `applyHardRules()` signature
- [ ] Add `extractProfilingData()` helper
- [ ] Implement cardinality-based metric detection
- [ ] Implement cardinality-based dimension detection
- [ ] Add required field detection
- [ ] Add enum field detection

### Week 2: Pipeline Integration

- [ ] Update `runKnosiaPipeline()` to pass profiling data
- [ ] Update `analyzeConnection()` SSE stream
- [ ] Add `enableProfiling` option
- [ ] Update type definitions

### Week 3: Testing

- [ ] Unit tests for enhanced detection
- [ ] Integration tests with real databases
- [ ] E2E tests for full pipeline
- [ ] Performance benchmarks

### Week 4: Validation & Launch

- [ ] Manual QA with sample databases
- [ ] Compare vocabulary quality V1 vs V2
- [ ] Documentation updates
- [ ] Production deployment

---

## Open Questions

1. **Should profiling be enabled by default?**
   - Pro: Better accuracy out of the box
   - Con: ~500ms overhead per analysis
   - **Recommendation:** Enable by default, allow opt-out

2. **Cache invalidation strategy?**
   - When should profiling cache be refreshed?
   - **Recommendation:** 24h TTL + manual refresh button

3. **Tier 3 profiling for production?**
   - Tier 3 provides detailed patterns but costs ~10s
   - **Recommendation:** Only for user-triggered "deep analysis"

4. **Profiling for non-PostgreSQL databases?**
   - MySQL, DuckDB, SQLite statistics differ
   - **Recommendation:** Start with PostgreSQL, expand later

---

## Appendix: File Changes

### Modified Files

| File | Changes | LoC |
|------|---------|-----|
| `packages/liquid-connect/src/uvb/models.ts` | Add `ProfilingData` type | +30 |
| `packages/liquid-connect/src/uvb/rules.ts` | Update `applyHardRules()` signature | +200 |
| `packages/liquid-connect/src/uvb/rules.ts` | Enhance `detectMetric()` | +50 |
| `packages/liquid-connect/src/uvb/rules.ts` | Enhance `detectDimension()` | +60 |
| `packages/liquid-connect/src/uvb/rules.ts` | Enhance `detectTimeField()` | +30 |
| `packages/liquid-connect/src/uvb/rules.ts` | Add `detectRequiredFields()` | +40 |
| `packages/liquid-connect/src/uvb/rules.ts` | Add `detectEnumFields()` | +50 |
| `packages/liquid-connect/src/uvb/index.ts` | Export `extractProfilingData()` | +30 |
| `packages/api/src/modules/knosia/pipeline/index.ts` | Pass profiling data | +15 |
| `packages/api/src/modules/knosia/analysis/queries.ts` | Pass profiling data | +10 |

### New Files

| File | Purpose | LoC |
|------|---------|-----|
| `packages/liquid-connect/src/uvb/__tests__/rules-profiling.test.ts` | Unit tests | ~400 |
| `packages/api/src/modules/knosia/__tests__/pipeline-profiling.test.ts` | Integration tests | ~200 |

**Total Estimated LoC:** ~1,100 lines

---

## References

- V1 Profiling Architecture: `.artifacts/2026-01-02-2245-data-profiling-architecture.md`
- V1 Implementation Complete: `.artifacts/2026-01-03-data-profiling-implementation-complete.md`
- Hard Rules Engine: `packages/liquid-connect/src/uvb/rules.ts`
- Profiling Models: `packages/liquid-connect/src/uvb/models.ts`

---

**END OF SPECIFICATION**
