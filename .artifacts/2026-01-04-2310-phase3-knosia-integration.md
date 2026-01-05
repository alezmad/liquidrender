# Phase 3 Knosia Integration - Implementation Dossier

**Date:** 2026-01-04
**Status:** Complete
**Package:** `@turbostarter/api` (Knosia metrics module)

---

## Executive Summary

Integrated the Phase 3 LiquidFlow builder (`@repo/liquid-connect`) with the Knosia metrics API, enabling real SQL execution for calculated metrics. This replaces the previous mock implementation with a complete pipeline from semantic definitions to database query results.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Knosia Metrics Execution Pipeline                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  Database        │    │  LiquidConnect   │    │  DuckDB          │       │
│  │  (Stored Metric) │───▶│  (Compilation)   │───▶│  (Execution)     │       │
│  │                  │    │                  │    │                  │       │
│  │  • name          │    │  • Recipe→Flow   │    │  • Query         │       │
│  │  • semantic      │    │  • Flow→SQL      │    │  • Results       │       │
│  │    Definition    │    │  • Dialect       │    │  • Caching       │       │
│  │  • connectionId  │    │    Selection     │    │                  │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         API Response                                  │   │
│  │  { value, formattedValue, executedAt, executionTimeMs, sql }         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Files Modified

### 1. Execution Pipeline (`packages/api/src/modules/knosia/metrics/execution.ts`)

Complete rewrite integrating LiquidConnect.

**Key Imports:**
```typescript
import {
  compileRecipeToSQL,
  previewRecipeSQL,
  type CalculatedMetricRecipe,
  type Dialect,
} from "@repo/liquid-connect";
import { duckdbManager } from "../connections/duckdb-manager";
```

**Core Functions:**

| Function | Purpose |
|----------|---------|
| `metricToRecipe()` | Convert DB metric to `CalculatedMetricRecipe` format |
| `connectionTypeToDialect()` | Map connection type to SQL dialect |
| `formatMetricValue()` | Format result based on semantic definition |
| `executeMetricWithCache()` | Full execution pipeline with caching |
| `previewMetricSQL()` | Generate SQL without executing |
| `executeMetricsBatch()` | Batch execution for multiple metrics |

**Type Definitions:**
```typescript
export interface ExecutionResult {
  value: number | string | null;
  formattedValue: string;
  executedAt: string;
  executionTimeMs: number;
  fromCache: boolean;
  sql?: string;
  error?: string;
  warnings?: string[];
}

export interface SQLPreviewResult {
  metricId: string;
  name: string;
  sql: string;
  dialect: Dialect;
  warnings: string[];
}
```

### 2. Schemas (`packages/api/src/modules/knosia/metrics/schemas.ts`)

Added SQL preview schema:

```typescript
export const previewSQLSchema = z.object({
  dialect: z.enum(["postgres", "duckdb", "trino"]).optional().default("postgres"),
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});

export type PreviewSQLInput = z.infer<typeof previewSQLSchema>;
```

### 3. Router (`packages/api/src/modules/knosia/metrics/router.ts`)

Added SQL preview endpoint:

```typescript
// Preview SQL for metric (without executing)
.post(
  "/:id/preview-sql",
  enforceAuth,
  zValidator("json", schemas.previewSQLSchema),
  async (c) => {
    const id = c.req.param("id");
    const { dialect, timeRange } = c.req.valid("json");

    try {
      const preview = await previewMetricSQL(id, dialect, timeRange);
      return c.json({ preview });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 500);
    }
  },
)
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics` | List metrics with filters |
| GET | `/metrics/:id` | Get single metric |
| POST | `/metrics/:id/execute` | Execute metric and return result |
| POST | `/metrics/:id/preview-sql` | Preview SQL without executing |
| POST | `/metrics` | Create user-defined metric |
| PATCH | `/metrics/:id` | Update metric |
| DELETE | `/metrics/:id` | Soft delete metric |
| GET | `/metrics/connection/:connectionId` | Get metrics by connection |

---

## Execution Flow

### `executeMetricWithCache(metricId, options)`

```
1. Get metric from database
   └─ SELECT * FROM knosia_calculated_metric WHERE id = ?

2. Check cache (if enabled)
   └─ Return cached result if lastExecutionResult exists

3. Get connection details
   └─ SELECT * FROM knosia_connection WHERE id = metric.connectionId

4. Convert to recipe format
   └─ metricToRecipe(metric) → CalculatedMetricRecipe

5. Determine SQL dialect
   └─ connectionTypeToDialect(connection.type) → 'postgres' | 'duckdb' | 'trino'

6. Compile to SQL
   └─ compileRecipeToSQL(recipe, { dialect, schema, timeRange })

7. Execute via DuckDB adapter
   └─ duckdbManager.getAdapter(connection)
   └─ adapter.query(compiled.sql)

8. Extract and format value
   └─ formatMetricValue(value, semanticDef, category)

9. Cache result
   └─ UPDATE knosia_calculated_metric SET lastExecutionResult = ?

10. Return ExecutionResult
```

### `previewMetricSQL(metricId, dialect, timeRange)`

```
1. Get metric from database
2. Get connection for schema info
3. Convert to recipe format
4. Compile to SQL (without executing)
5. Return SQLPreviewResult
```

---

## Type Mappings

### Connection Type → SQL Dialect

| Connection Type | Dialect |
|-----------------|---------|
| `postgres` | `postgres` |
| `mysql` | `postgres` (compatible syntax) |
| `duckdb` | `duckdb` |
| (default) | `postgres` |

### Format Type → Display

| Format Type | Output Example |
|-------------|----------------|
| `currency` | `$125,000` |
| `percent` | `45.2%` |
| `number` | `1,234,567` |

### Category Fallback Formatting

| Category | Format |
|----------|--------|
| `revenue` | Currency (`$X`) |
| `growth` | Percentage (`X.X%`) |
| (default) | Locale number |

---

## Integration with LiquidConnect

### Recipe Conversion

```typescript
function metricToRecipe(metric: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  semanticDefinition: unknown;
  confidence: string | null;
  feasible: boolean;
}): CalculatedMetricRecipe {
  const semanticDef = metric.semanticDefinition as CalculatedMetricRecipe["semanticDefinition"];

  return {
    name: metric.name,
    description: metric.description ?? "",
    category: (metric.category as CalculatedMetricRecipe["category"]) ?? "custom",
    businessType: [], // Not stored in DB, but not needed for execution
    semanticDefinition: semanticDef,
    confidence: metric.confidence ? parseFloat(metric.confidence) : 0.8,
    feasible: metric.feasible,
  };
}
```

### SQL Compilation

```typescript
const compiled = compileRecipeToSQL(recipe, {
  dialect,
  schema: connection.schema ?? undefined,
  timeRange: timeRangeOpt,
});

// compiled.sql contains the generated SQL
// compiled.warnings contains any compilation warnings
```

---

## DuckDB Adapter Integration

The execution uses `duckdbManager` singleton for connection pooling:

```typescript
// Get adapter (creates if not exists)
const adapter = await duckdbManager.getAdapter(connection);

// Execute query
const rows = await adapter.query<Record<string, unknown>>(compiled.sql);

// Release adapter back to pool
duckdbManager.release(connection.id);
```

Connection string building supports:
- PostgreSQL: `postgresql://user:pass@host:port/database`
- MySQL: `mysql://user:pass@host:port/database`
- DuckDB: Direct file path

---

## Error Handling

| Error Type | Response |
|------------|----------|
| Metric not found | 404 with message |
| Connection not found | 500 with message |
| Compilation failed | Result with `error` field, no value |
| Execution failed | Result with `error` field, no value |

```typescript
// Compilation error handling
if (!compiled.sql) {
  return {
    value: null,
    formattedValue: "N/A",
    executedAt: new Date().toISOString(),
    executionTimeMs: 0,
    fromCache: false,
    error: `Compilation failed: ${compiled.warnings.join(", ")}`,
    warnings: compiled.warnings,
  };
}

// Execution error handling
catch (error) {
  executionResult = {
    value: null,
    formattedValue: "N/A",
    error: error instanceof Error ? error.message : String(error),
    // ... other fields
  };
}
```

---

## Caching Strategy

Results are cached in `knosia_calculated_metric.lastExecutionResult`:

```typescript
// On successful execution
await db
  .update(knosiaCalculatedMetric)
  .set({
    lastExecutionResult: executionResult,
    lastExecutedAt: new Date(),
    executionCount: (metric.executionCount ?? 0) + 1,
  })
  .where(eq(knosiaCalculatedMetric.id, metricId));
```

Cache can be bypassed with `useCache: false` in options.

---

## Test Results

```
✓ src/kpi/__tests__/execute.test.ts (15 tests) 7ms

Tests:  12 passed | 3 skipped
```

Type checking: ✅ Pass
API package: ✅ No errors

---

## Usage Examples

### Execute a Metric

```typescript
// Via API
POST /api/knosia/metrics/cm_abc123/execute
{
  "useCache": false,
  "timeRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  }
}

// Response
{
  "result": {
    "value": 125000,
    "formattedValue": "$125,000",
    "executedAt": "2026-01-04T23:10:00.000Z",
    "executionTimeMs": 45,
    "fromCache": false,
    "sql": "SELECT SUM(amount) AS \"Monthly Recurring Revenue\" FROM subscriptions WHERE status = 'active'"
  }
}
```

### Preview SQL

```typescript
// Via API
POST /api/knosia/metrics/cm_abc123/preview-sql
{
  "dialect": "postgres",
  "timeRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  }
}

// Response
{
  "preview": {
    "metricId": "cm_abc123",
    "name": "Monthly Recurring Revenue",
    "sql": "SELECT SUM(amount) AS \"Monthly Recurring Revenue\" FROM subscriptions WHERE status = 'active' AND created_at >= '2024-01-01' AND created_at < '2024-12-31'",
    "dialect": "postgres",
    "warnings": []
  }
}
```

---

## Future Enhancements

1. **Parallel Batch Execution** - Group metrics by connection for optimized batch queries
2. **Query Optimization** - Combine multiple metrics on same entity into single query
3. **Real-time Streaming** - WebSocket support for live metric updates
4. **Query Cost Estimation** - Predict execution cost before running

---

## Dependencies

```
@repo/liquid-connect
├── compileRecipeToSQL()
├── previewRecipeSQL()
├── CalculatedMetricRecipe (type)
├── Dialect (type)
└── DuckDBUniversalAdapter

@turbostarter/db
├── knosiaCalculatedMetric (table)
├── knosiaConnection (table)
└── db (Drizzle instance)
```

---

## Conclusion

The Phase 3 integration is complete. Calculated metrics stored in the Knosia database can now be:

1. **Compiled** to SQL using LiquidConnect's recipe-to-flow pipeline
2. **Executed** against connected databases via DuckDB adapter
3. **Cached** for improved performance on repeated queries
4. **Previewed** without execution for debugging and user inspection

The system supports PostgreSQL, MySQL, and DuckDB connections with automatic dialect selection.
