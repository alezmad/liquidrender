# Knosia: API Contract Specification

> Defines all API endpoints, request/response schemas, and error handling for Knosia onboarding and dashboard.
> Created: 2025-12-29
> Framework: TurboStarter (Hono + Zod + Drizzle)

---

## Module Structure

```
packages/api/src/modules/knosia/
├── connections/
│   ├── router.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── schemas.ts
├── analysis/
│   ├── router.ts
│   ├── queries.ts
│   └── schemas.ts
├── vocabulary/
│   ├── router.ts
│   ├── queries.ts
│   ├── mutations.ts
│   └── schemas.ts
├── briefing/
│   ├── router.ts
│   ├── queries.ts
│   └── schemas.ts
└── conversation/
    ├── router.ts
    ├── queries.ts
    └── schemas.ts
```

---

# Part 1: Connections Module

## POST /api/knosia/connections/test

Test database connection without saving.

### Request

```typescript
// schemas.ts
import { z } from "zod";

export const testConnectionSchema = z.object({
  type: z.enum(["postgres", "mysql", "snowflake", "bigquery", "redshift"]),
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  schema: z.string().optional().default("public"),
  ssl: z.boolean().optional().default(true),
});

export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
```

### Response

```typescript
// Success (200)
interface TestConnectionSuccess {
  success: true;
  tables: number;
  schemas: string[];
  version: string; // e.g., "PostgreSQL 15.2"
}

// Error (400)
interface TestConnectionError {
  success: false;
  error: {
    code: "CONNECTION_REFUSED" | "AUTH_FAILED" | "TIMEOUT" | "SSL_ERROR" | "UNKNOWN";
    message: string; // User-friendly message
    details: string; // Technical details (for "Copy for IT")
  };
}
```

### Router Implementation

```typescript
// router.ts
import { Hono } from "hono";
import { enforceAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { testConnectionSchema } from "./schemas";
import { testDatabaseConnection } from "./queries";

export const connectionsRouter = new Hono()
  .post(
    "/test",
    enforceAuth,
    validate("json", testConnectionSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await testDatabaseConnection(input);

      if (!result.success) {
        return c.json(result, 400);
      }

      return c.json(result, 200);
    }
  );
```

---

## POST /api/knosia/connections

Save a validated connection.

### Request

```typescript
export const createConnectionSchema = testConnectionSchema.extend({
  name: z.string().min(1).max(100).optional(), // Auto-generated if not provided
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
```

### Response

```typescript
// Success (201)
interface CreateConnectionSuccess {
  id: string; // UUID
  name: string;
  type: string;
  host: string;
  database: string;
  schema: string;
  createdAt: string; // ISO 8601
}
```

---

## GET /api/knosia/connections

List user's connections.

### Response

```typescript
// Success (200)
interface ConnectionListResponse {
  connections: Array<{
    id: string;
    name: string;
    type: string;
    host: string;
    database: string;
    status: "connected" | "error" | "stale";
    lastSyncAt: string | null;
    createdAt: string;
  }>;
}
```

---

## DELETE /api/knosia/connections/:id

Remove a connection.

### Response

```typescript
// Success (200)
{ success: true }

// Not found (404)
{ error: "Connection not found" }
```

---

# Part 2: Analysis Module

## GET /api/knosia/analysis/run

Run schema analysis on a connection. Returns Server-Sent Events (SSE) stream.

### Request

```typescript
export const runAnalysisSchema = z.object({
  connectionId: z.string().uuid(),
});
```

### SSE Stream Format

```typescript
// Event types
type AnalysisEvent =
  | { event: "step"; data: StepEvent }
  | { event: "complete"; data: CompleteEvent }
  | { event: "error"; data: ErrorEvent };

interface StepEvent {
  step: 1 | 2 | 3 | 4 | 5;
  status: "started" | "completed";
  label: string;
  detail?: string; // e.g., "Found 127 tables"
}

interface CompleteEvent {
  analysisId: string;
  summary: {
    tables: number;
    metrics: number;
    dimensions: number;
    entities: string[]; // Top entities detected
  };
  businessType: {
    detected: string; // e.g., "saas"
    confidence: number; // 0-100
    reasoning: string; // e.g., "Based on subscription and billing tables"
    alternatives: Array<{
      type: string;
      confidence: number;
    }>;
  };
}

interface ErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
}
```

### SSE Implementation Pattern

```typescript
// router.ts
import { streamSSE } from "hono/streaming";

export const analysisRouter = new Hono()
  .get(
    "/run",
    enforceAuth,
    validate("query", runAnalysisSchema),
    async (c) => {
      const { connectionId } = c.req.valid("query");

      return streamSSE(c, async (stream) => {
        // Step 1: Connect
        await stream.writeSSE({ event: "step", data: JSON.stringify({
          step: 1, status: "completed", label: "Connected to database"
        })});

        // Step 2: Scan tables
        const tables = await scanTables(connectionId);
        await stream.writeSSE({ event: "step", data: JSON.stringify({
          step: 2, status: "completed", label: "Found tables", detail: `${tables.length} tables`
        })});

        // ... steps 3-5 ...

        // Complete
        await stream.writeSSE({ event: "complete", data: JSON.stringify({
          analysisId: "...",
          summary: { ... },
          businessType: { ... }
        })});
      });
    }
  );
```

### Client Consumption

```typescript
// React hook for SSE
function useAnalysisStream(connectionId: string) {
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [result, setResult] = useState<CompleteEvent | null>(null);
  const [error, setError] = useState<ErrorEvent | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/knosia/analysis/run?connectionId=${connectionId}`
    );

    eventSource.addEventListener("step", (e) => {
      setSteps(prev => [...prev, JSON.parse(e.data)]);
    });

    eventSource.addEventListener("complete", (e) => {
      setResult(JSON.parse(e.data));
      eventSource.close();
    });

    eventSource.addEventListener("error", (e) => {
      setError(JSON.parse(e.data));
      eventSource.close();
    });

    return () => eventSource.close();
  }, [connectionId]);

  return { steps, result, error };
}
```

---

# Part 3: Vocabulary Module

## GET /api/knosia/vocabulary/:analysisId

Get vocabulary from analysis.

### Response

```typescript
interface VocabularyResponse {
  analysisId: string;
  businessType: string;

  // Grouped vocabulary items
  metrics: VocabularyItem[];
  dimensions: VocabularyItem[];
  entities: VocabularyItem[];

  // Confirmation questions
  questions: ConfirmationQuestion[];
}

interface VocabularyItem {
  id: string;
  canonicalName: string; // e.g., "Monthly Recurring Revenue"
  abbreviation: string;  // e.g., "MRR"
  category: string;      // e.g., "revenue"
  confidence: number;    // 0-100
  source: {
    table: string;
    column: string;
    expression?: string; // For computed metrics
  };
  description?: string;
}

interface ConfirmationQuestion {
  id: string;
  category: "revenue" | "customers" | "time";
  question: string;
  impact: string; // e.g., "This affects how revenue trends are calculated"
  options: Array<{
    id: string;
    label: string;           // e.g., "MRR (Monthly recurring revenue)"
    vocabularyItemId: string;
    suggested: boolean;
  }>;
}
```

---

## POST /api/knosia/vocabulary/:analysisId/confirm

Save user's vocabulary confirmations.

### Request

```typescript
export const confirmVocabularySchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    selectedOptionId: z.string(),
  })),
  skipped: z.boolean().optional().default(false), // "Skip and use defaults"
});
```

### Response

```typescript
// Success (200)
interface ConfirmVocabularySuccess {
  vocabularyId: string;
  confirmedAt: string;
  answersApplied: number;
}
```

---

## POST /api/knosia/vocabulary/:vocabularyId/report-mismatch

Report a vocabulary mismatch.

### Request

```typescript
export const reportMismatchSchema = z.object({
  itemId: z.string(),
  issue: z.enum(["wrong_mapping", "wrong_name", "missing", "other"]),
  description: z.string().max(500).optional(),
});
```

### Response

```typescript
// Success (200)
{ success: true, message: "Thanks, we'll review this" }

// Already reported (200)
{ success: true, message: "Already received—thank you" }

// Error (500)
{ success: false, error: "Couldn't send—try again" }
```

---

# Part 4: Briefing Module

## GET /api/knosia/briefing

Get current briefing for user.

### Request

```typescript
export const getBriefingSchema = z.object({
  connectionId: z.string().uuid().optional(), // Uses default if not provided
  date: z.string().date().optional(),         // Defaults to today
});
```

### Response

```typescript
interface BriefingResponse {
  greeting: string; // e.g., "Good morning, Sarah."
  dataThrough: string; // ISO date

  kpis: KPI[];
  alerts: Alert[];
  insights: Insight[];

  suggestedQuestions: string[];
}

interface KPI {
  id: string;
  label: string;        // e.g., "MRR"
  value: string;        // Formatted: "$2.3M"
  rawValue: number;
  change?: {
    value: string;      // "+8%"
    direction: "up" | "down" | "flat";
    comparison: string; // "MoM"
    tooltip: string;    // "$2.3M vs $2.1M last month"
  };
  status?: "normal" | "warning" | "critical";
  vocabularyItemId: string;
}

interface Alert {
  id: string;
  severity: "warning" | "critical";
  title: string;
  description: string;
  factors: Array<{
    text: string;
    grounding: string[]; // Vocabulary item IDs
  }>;
  actions: Array<{
    label: string;
    query: string; // Pre-filled conversation query
  }>;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  correlation?: {
    factor: string;
    impact: string;
    confidence: number;
  };
  actions: Array<{
    label: string;
    query: string;
  }>;
}
```

---

# Part 5: Conversation Module

## POST /api/knosia/conversation/query

Process a natural language query.

### Request

```typescript
export const conversationQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  connectionId: z.string().uuid(),
  context: z.object({
    pageId: z.string().optional(),           // Current page context
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]),
      value: z.unknown(),
    })).optional(),
    previousQueryId: z.string().optional(),   // For follow-up queries
  }).optional(),
});
```

### Response

```typescript
interface ConversationResponse {
  queryId: string;

  // Response type determines rendering
  type: "visualization" | "explanation" | "clarification" | "error";

  // For visualization
  visualization?: {
    type: "bar" | "line" | "table" | "kpi" | "pie";
    title: string;
    data: unknown; // Chart-specific data shape
    grounding: Grounding;
  };

  // For explanation
  explanation?: {
    summary: string;
    factors: Array<{
      title: string;
      description: string;
      grounding: string[];
    }>;
    expandable?: {
      count: number;
      label: string; // e.g., "2 more factors"
    };
    visualization?: { ... }; // Optional supporting chart
  };

  // For clarification (ambiguous query)
  clarification?: {
    question: string;
    options: Array<{
      id: string;
      label: string;
      description: string;
      preview?: string; // Current value if applicable
    }>;
    rememberChoice: boolean;
  };

  // For error
  error?: {
    message: string;
    alternatives: string[];
  };

  // Suggested follow-ups
  suggestions: string[];

  // Active filters (for context pills)
  appliedFilters: Array<{
    id: string;
    label: string;
    removable: boolean;
  }>;
}

interface Grounding {
  path: Array<{
    id: string;
    label: string;
    vocabularyItemId: string;
  }>;
  interactive: true; // Always clickable
}
```

---

## POST /api/knosia/conversation/clarify

Answer a clarification question.

### Request

```typescript
export const clarifySchema = z.object({
  queryId: z.string(),
  selectedOptionId: z.string(),
  remember: z.boolean().optional().default(false),
});
```

### Response

Same as `ConversationResponse` above.

---

# Part 6: User Preferences Module

## GET /api/knosia/preferences

Get user's Knosia preferences.

### Response

```typescript
interface PreferencesResponse {
  defaultConnectionId: string | null;
  role: string;

  // Remembered vocabulary choices
  vocabularyOverrides: Record<string, string>; // term -> preferred meaning

  // UI preferences
  comparisonPeriod: "WoW" | "MoM" | "YoY";

  // Notification settings
  briefingTime: string; // "08:00"
  alertsEnabled: boolean;
}
```

---

## PATCH /api/knosia/preferences

Update preferences.

### Request

```typescript
export const updatePreferencesSchema = z.object({
  defaultConnectionId: z.string().uuid().optional(),
  role: z.string().optional(),
  comparisonPeriod: z.enum(["WoW", "MoM", "YoY"]).optional(),
  briefingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  alertsEnabled: z.boolean().optional(),
});
```

---

# Error Response Format

All errors follow a consistent structure:

```typescript
interface APIError {
  error: {
    code: string;           // Machine-readable code
    message: string;        // User-friendly message
    details?: string;       // Technical details (optional)
    field?: string;         // For validation errors
  };
}

// HTTP Status Codes
// 400 - Bad Request (validation failed)
// 401 - Unauthorized (not logged in)
// 403 - Forbidden (no permission)
// 404 - Not Found
// 429 - Too Many Requests
// 500 - Internal Server Error
```

---

# Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/connections/test` | 10/min per user |
| `/analysis/run` | 3/min per user |
| `/conversation/query` | 30/min per user |
| All others | 60/min per user |

---

# Router Registration

```typescript
// packages/api/src/index.ts
import { connectionsRouter } from "./modules/knosia/connections/router";
import { analysisRouter } from "./modules/knosia/analysis/router";
import { vocabularyRouter } from "./modules/knosia/vocabulary/router";
import { briefingRouter } from "./modules/knosia/briefing/router";
import { conversationRouter } from "./modules/knosia/conversation/router";
import { preferencesRouter } from "./modules/knosia/preferences/router";

const appRouter = new Hono()
  .basePath("/api")
  // ... existing routes ...
  .route("/knosia/connections", connectionsRouter)
  .route("/knosia/analysis", analysisRouter)
  .route("/knosia/vocabulary", vocabularyRouter)
  .route("/knosia/briefing", briefingRouter)
  .route("/knosia/conversation", conversationRouter)
  .route("/knosia/preferences", preferencesRouter)
  .onError(onError);
```

---

# Database Schema Reference

See: `packages/db/src/schema/knosia/` (to be created)

| Table | Purpose |
|-------|---------|
| `knosia_connections` | Database connections |
| `knosia_analyses` | Analysis runs and results |
| `knosia_vocabulary` | Vocabulary items |
| `knosia_vocabulary_confirmations` | User confirmations |
| `knosia_preferences` | User preferences |
| `knosia_conversation_history` | Query history |
| `knosia_mismatch_reports` | Vocabulary feedback |

---

*Ready for implementation.*
