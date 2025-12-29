# Progressive Connection Onboarding - Implementation Spec

> Implementation guide for multi-connection support in Knosia onboarding.
> Extends: `2025-12-29-2330-knosia-frontend-implementation.md`
> UX Spec: `2025-12-29-progressive-connection-onboarding.md`
> Created: 2025-12-29
> Updated: 2025-12-29 (ID schema consistency fixes)

---

## Critical Notes

**ID Schema Pattern**: Use shared schemas from `packages/api/src/modules/knosia/shared-schemas.ts`:
- `connectionIdSchema` - NOT `z.string().uuid()` or plain `z.string()`
- See `CLAUDE.md` → "ID Patterns" section for rationale

**Hydration**: All pages using `useOnboardingState()` must check `isHydrated` before making state-based decisions.
- See `CLAUDE.md` → "Hydration & localStorage" section for pattern and rationale

---

## TurboStarter Compliance Check

Verified against `.context/turbostarter-framework-context/framework.md`:

| Pattern | Requirement | This Spec | Status |
|---------|-------------|-----------|--------|
| State Management | No Redux/Zustand/MobX | React Query + localStorage + nuqs | ✅ |
| API Calls | Use `handle()` wrapper | All hooks use `@turbostarter/api/utils` | ✅ |
| Server vs Client | RSC default, minimize `"use client"` | Only interactive components are client | ✅ |
| Business Logic | API layer only | State hook has no business logic | ✅ |
| URL State | Use `nuqs` for shareable state | `?summary=true` via nuqs | ✅ |
| Persistence | localStorage for onboarding | Extends existing pattern | ✅ |
| Components | Reuse `@turbostarter/ui-web` | Button, Card, Badge, Icons | ✅ |
| i18n | Use `getTranslation`/`useTranslation` | All strings via namespace | ✅ |

**Key patterns followed:**
- `handle()` from `@turbostarter/api/utils` for all API calls (lines 111-164 in framework.md)
- Extends existing `OnboardingProgress` interface (backward compatible)
- Keeps `connectionId` for legacy migration alongside `connectionIds[]`

---

## Overview

This spec adds progressive multi-connection support to the existing onboarding flow while preserving the 60-second single-connection path.

**Key principle:** The primary CTA is always "Continue" - multi-connection is opt-in.

---

## Files to Modify

### 1. Onboarding State Types

```typescript
// apps/web/src/modules/onboarding/types.ts

// BEFORE (single connection)
export interface OnboardingProgress {
  connectionId: string | null;
  analysisId: string | null;
  // ...
}

// AFTER (multi-connection)
export interface OnboardingProgress {
  // Legacy - keep for migration
  connectionId: string | null;

  // NEW: Multi-connection support
  connectionIds: string[];
  primaryConnectionId: string | null;

  analysisId: string | null;
  workspaceId: string | null;
  selectedRole: UserRole | null;
  answers: ConfirmationAnswer[];
  completedSteps: OnboardingStep[];
}

// NEW: Connection summary for display
export interface ConnectionSummary {
  id: string;
  type: ConnectionType;
  name: string;
  host: string;
  database: string;
  tablesCount: number;
  status: 'connected' | 'error';
  connectedAt: Date;
}

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  connectionId: null,
  connectionIds: [],
  primaryConnectionId: null,
  analysisId: null,
  workspaceId: null,
  selectedRole: null,
  answers: [],
  completedSteps: [],
};
```

### 2. Onboarding State Hook

```typescript
// apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts

export function useOnboardingState() {
  // ... existing code ...

  // NEW: Multi-connection helpers
  const addConnection = useCallback((connectionId: string) => {
    setProgress((prev) => {
      const newIds = [...prev.connectionIds, connectionId];
      return {
        ...prev,
        connectionIds: newIds,
        // First connection becomes primary
        primaryConnectionId: prev.primaryConnectionId ?? connectionId,
        // Legacy support
        connectionId: prev.connectionId ?? connectionId,
      };
    });
  }, []);

  const removeConnection = useCallback((connectionId: string) => {
    setProgress((prev) => {
      const newIds = prev.connectionIds.filter((id) => id !== connectionId);
      const newPrimary = prev.primaryConnectionId === connectionId
        ? newIds[0] ?? null
        : prev.primaryConnectionId;
      return {
        ...prev,
        connectionIds: newIds,
        primaryConnectionId: newPrimary,
        connectionId: newPrimary,
      };
    });
  }, []);

  const setPrimaryConnection = useCallback((connectionId: string) => {
    setProgress((prev) => ({
      ...prev,
      primaryConnectionId: connectionId,
      connectionId: connectionId,
    }));
  }, []);

  return {
    // ... existing returns ...
    isHydrated, // From existing hook - MUST check before redirects

    // NEW
    addConnection,
    removeConnection,
    setPrimaryConnection,
    connectionCount: progress.connectionIds.length,
    hasConnections: progress.connectionIds.length > 0,
  };
}
```

### 3. Connection Summary Hook

```typescript
// apps/web/src/modules/onboarding/hooks/use-connection-summaries.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { handle } from "@turbostarter/api/utils";  // TurboStarter pattern
import { api } from "~/lib/api/client";
import type { ConnectionSummary } from "../types";

/**
 * Fetch connection details for display in summary screen.
 * Uses TurboStarter's handle() wrapper for consistent error handling.
 */
export function useConnectionSummaries(connectionIds: string[], orgId: string) {
  return useQuery({
    queryKey: ["connections", "summaries", connectionIds],
    queryFn: async (): Promise<ConnectionSummary[]> => {
      if (connectionIds.length === 0) return [];

      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled(
        connectionIds.map((id) =>
          handle(api.knosia.connections[":id"].$get)({
            param: { id },
            query: { orgId },
          })
        )
      );

      // Filter successful results
      return results
        .filter((r): r is PromiseFulfilledResult<ConnectionSummary> =>
          r.status === "fulfilled"
        )
        .map((r) => r.value);
    },
    enabled: connectionIds.length > 0 && !!orgId,
  });
}
```

> **TurboStarter Pattern:** Always use `handle()` from `@turbostarter/api/utils` for API calls.
> This unwraps responses, handles errors consistently, and provides type-safe return values.

---

## New Components

### 4. Connection Summary Card

```typescript
// apps/web/src/modules/onboarding/components/connect/connection-summary-card.tsx
"use client";

import { Icons } from "@turbostarter/ui-web/icons";
import { Button } from "@turbostarter/ui-web/button";
import { Badge } from "@turbostarter/ui-web/badge";
import { cn } from "@turbostarter/ui";
import type { ConnectionSummary } from "../../types";

const DATABASE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  postgres: Icons.Database,
  mysql: Icons.Database,
  snowflake: Icons.Snowflake,
  bigquery: Icons.Cloud,
  redshift: Icons.Database,
  duckdb: Icons.Database,
};

interface ConnectionSummaryCardProps {
  connection: ConnectionSummary;
  isPrimary?: boolean;
  onRemove?: () => void;
  compact?: boolean;
}

export function ConnectionSummaryCard({
  connection,
  isPrimary,
  onRemove,
  compact = false,
}: ConnectionSummaryCardProps) {
  const Icon = DATABASE_ICONS[connection.type] ?? Icons.Database;

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{connection.type}</span>
              {isPrimary && (
                <Badge variant="secondary" className="text-xs">Primary</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {connection.host}/{connection.database} &bull; {connection.tablesCount} tables
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            <Icons.Check className="mr-1 h-3 w-3" />
            Ready
          </Badge>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Icons.X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold capitalize">{connection.type}</h3>
              {isPrimary && (
                <Badge variant="secondary">Primary</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connection.host}:{connection.port}/{connection.database}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-green-600">
          <Icons.Check className="mr-1 h-3 w-3" />
          Ready
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span>Connected just now</span>
        <span>&bull;</span>
        <span>{connection.tablesCount} tables found</span>
      </div>
    </div>
  );
}
```

### 5. Connection Summary Screen

```typescript
// apps/web/src/modules/onboarding/components/connect/connection-summary.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@turbostarter/i18n";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { pathsConfig } from "~/config/paths";
import { ConnectionSummaryCard } from "./connection-summary-card";
import { useOnboardingState, useConnectionSummaries, useKnosiaOrg } from "../../hooks";

export function ConnectionSummary() {
  const router = useRouter();
  const { t } = useTranslation("knosia");

  const { progress, removeConnection } = useOnboardingState();
  const { orgId } = useKnosiaOrg();
  const { data: connections, isLoading } = useConnectionSummaries(
    progress.connectionIds,
    orgId ?? ""
  );

  const handleAddAnother = () => {
    // Navigate back to database selector
    router.push(pathsConfig.onboarding.connect);
  };

  const handleContinue = () => {
    router.push(pathsConfig.onboarding.review);
  };

  const handleRemove = (connectionId: string) => {
    removeConnection(connectionId);
    // If no connections left, go back to selector
    if (progress.connectionIds.length <= 1) {
      router.push(pathsConfig.onboarding.connect);
    }
  };

  const totalTables = connections?.reduce((sum, c) => sum + c.tablesCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("onboarding.summary.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("onboarding.summary.description")}
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-4">
        {/* Connected sources */}
        <div className="space-y-3">
          {connections?.map((connection, index) => (
            <ConnectionSummaryCard
              key={connection.id}
              connection={connection}
              isPrimary={index === 0}
              onRemove={
                connections.length > 1
                  ? () => handleRemove(connection.id)
                  : undefined
              }
              compact={connections.length > 1}
            />
          ))}
        </div>

        {/* Add another option */}
        <button
          onClick={handleAddAnother}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Icons.Plus className="h-5 w-5" />
          <span>{t("onboarding.summary.addAnother")}</span>
        </button>

        {connections && connections.length > 1 && (
          <p className="text-center text-sm text-muted-foreground">
            {connections.length} sources connected &bull; {totalTables} tables total
          </p>
        )}

        {/* Continue button */}
        <div className="pt-4">
          <Button
            onClick={handleContinue}
            className="w-full"
            size="lg"
          >
            {t("onboarding.summary.continue")}
            <Icons.ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("onboarding.summary.addLater")}
        </p>
      </div>
    </div>
  );
}

export { ConnectionSummary };
```

### 6. Updated Connect Page

```typescript
// apps/web/src/app/[locale]/onboarding/connect/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "@turbostarter/i18n";
import { Icons } from "@turbostarter/ui-web/icons";
import { pathsConfig } from "~/config/paths";
import {
  DatabaseSelector,
  ConnectionForm,
  ConnectionTest,
  ConnectionSummary,
  useConnectionTest,
  useCreateConnection,
  useOnboardingState,
  useKnosiaOrg,
  toConnectionTestResult,
} from "~/modules/onboarding";
import type { ConnectionType, ConnectionFormValues, ConnectionTestResult } from "~/modules/onboarding";

type Step = "select" | "form" | "summary";

export default function ConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation("knosia");

  // Check if we should show summary (returning from adding another)
  const showSummary = searchParams.get("summary") === "true";

  const [step, setStep] = useState<Step>(showSummary ? "summary" : "select");
  const [selectedDatabase, setSelectedDatabase] = useState<ConnectionType | undefined>();
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const { addConnection, progress, hasConnections, isHydrated } = useOnboardingState();
  const { orgId, isLoading: isOrgLoading } = useKnosiaOrg();

  const connectionTest = useConnectionTest();
  const createConnection = useCreateConnection();

  // Wait for hydration before making state-based decisions
  // This prevents race conditions with localStorage on SSR
  useEffect(() => {
    if (!isHydrated) return;

    if (showSummary && hasConnections) {
      setStep("summary");
    }
  }, [showSummary, hasConnections, isHydrated]);

  const handleDatabaseSelect = useCallback((type: ConnectionType) => {
    setSelectedDatabase(type);
    setTestResult(null);
    setStep("form");
  }, []);

  const handleBack = useCallback(() => {
    if (hasConnections) {
      // Go back to summary if we have connections
      setStep("summary");
    } else {
      setStep("select");
    }
    setSelectedDatabase(undefined);
    setTestResult(null);
  }, [hasConnections]);

  const handleFormSubmit = useCallback(
    async (values: ConnectionFormValues) => {
      setTestResult(null);

      try {
        const result = await connectionTest.mutateAsync(values);
        const testRes = toConnectionTestResult(result);
        setTestResult(testRes);

        if (testRes.success && orgId) {
          const connectionName = `${values.type} - ${values.host}`;
          const connection = await createConnection.mutateAsync({
            ...values,
            name: connectionName,
            orgId,
          });

          // Add to connections array
          addConnection(connection.id);

          // Go to summary screen (not directly to review)
          setStep("summary");
          router.replace(`${pathsConfig.onboarding.connect}?summary=true`);
        }
      } catch (error) {
        setTestResult({
          success: false,
          error: {
            code: "CONNECTION_ERROR",
            message: error instanceof Error ? error.message : "Connection test failed",
          },
        });
      }
    },
    [connectionTest, createConnection, addConnection, router, orgId]
  );

  const handleRetry = useCallback(() => {
    setTestResult(null);
  }, []);

  const isLoading = connectionTest.isPending || createConnection.isPending || isOrgLoading;

  // Render based on step
  if (step === "summary") {
    return <ConnectionSummary />;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("onboarding.connect.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("onboarding.connect.description")}
        </p>
      </div>

      {step === "select" && (
        <DatabaseSelector
          onSelect={handleDatabaseSelect}
          selectedType={selectedDatabase}
        />
      )}

      {step === "form" && selectedDatabase && (
        <div className="space-y-6">
          <ConnectionForm
            databaseType={selectedDatabase}
            onSubmit={handleFormSubmit}
            onBack={handleBack}
            isLoading={isLoading}
          />

          <ConnectionTest
            result={testResult}
            isLoading={connectionTest.isPending}
            onRetry={handleRetry}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Icons.Lock className="h-3 w-3" />
        <span>{t("onboarding.connect.security")}</span>
      </div>
    </div>
  );
}
```

---

## API Changes

### 7. Analysis Endpoint Extension

```typescript
// packages/api/src/modules/knosia/analysis/schemas.ts

import { z } from "zod";
import { connectionIdSchema, workspaceIdSchema } from "../shared-schemas";

// BEFORE (single connection)
export const startAnalysisInputSchema = z.object({
  connectionId: connectionIdSchema,
  workspaceId: workspaceIdSchema.optional(),
});

// AFTER (multi-connection support)
export const startAnalysisInputSchema = z.object({
  // Support single (legacy) or multiple connections
  connectionId: connectionIdSchema.optional(),
  connectionIds: z.array(connectionIdSchema).optional(),
  primaryConnectionId: connectionIdSchema.optional(),
  workspaceId: workspaceIdSchema.optional(),
}).refine(
  (data) => data.connectionId || (data.connectionIds && data.connectionIds.length > 0),
  { message: "Either connectionId or connectionIds must be provided" }
);
```

```typescript
// packages/api/src/modules/knosia/analysis/router.ts

.get("/run", async (c) => {
  const query = c.req.query();

  // Support both single and multiple connections
  const connectionIds = query.connectionIds
    ? query.connectionIds.split(",")
    : query.connectionId
      ? [query.connectionId]
      : [];

  if (connectionIds.length === 0) {
    return c.json({ error: "No connections provided" }, 400);
  }

  // Start analysis with all connections
  const analysis = await startMultiConnectionAnalysis({
    connectionIds,
    primaryConnectionId: query.primaryConnectionId ?? connectionIds[0],
    workspaceId: query.workspaceId,
  });

  // Return SSE stream...
});
```

### 8. Multi-Connection Analysis Logic

```typescript
// packages/api/src/modules/knosia/analysis/mutations.ts

export async function startMultiConnectionAnalysis(input: {
  connectionIds: string[];
  primaryConnectionId: string;
  workspaceId?: string;
}) {
  const { connectionIds, primaryConnectionId, workspaceId } = input;

  // Create analysis record
  const [analysis] = await db
    .insert(knosiaAnalysis)
    .values({
      connectionId: primaryConnectionId,
      workspaceId,
      status: "running",
      totalSteps: 5 + connectionIds.length, // Extra steps for cross-referencing
    })
    .returning();

  // Process each connection
  const allSchemas: SchemaSnapshot[] = [];

  for (const connectionId of connectionIds) {
    const schema = await extractSchema(connectionId);
    allSchemas.push(schema);

    // Emit progress for each source
    yield {
      type: "progress",
      step: allSchemas.length,
      total: connectionIds.length + 3,
      message: `Scanned ${schema.tables.length} tables from source ${allSchemas.length}`,
    };
  }

  // Cross-reference schemas
  yield {
    type: "progress",
    step: connectionIds.length + 1,
    message: "Cross-referencing schemas...",
  };

  const crossReferences = findCrossReferences(allSchemas);

  // Detect business type from combined schemas
  yield {
    type: "progress",
    step: connectionIds.length + 2,
    message: "Detecting business patterns...",
  };

  const businessType = await detectBusinessType(allSchemas);

  // Generate unified vocabulary
  yield {
    type: "progress",
    step: connectionIds.length + 3,
    message: "Generating unified vocabulary...",
  };

  const vocabulary = await generateVocabulary(allSchemas, crossReferences);

  // Update analysis record
  await db
    .update(knosiaAnalysis)
    .set({
      status: "completed",
      summary: {
        tables: allSchemas.reduce((sum, s) => sum + s.tables.length, 0),
        metrics: vocabulary.metrics.length,
        dimensions: vocabulary.dimensions.length,
        sources: connectionIds.length,
        crossReferences: crossReferences.length,
      },
      businessType,
      detectedVocab: vocabulary,
      completedAt: new Date(),
    })
    .where(eq(knosiaAnalysis.id, analysis.id));

  return {
    type: "complete",
    analysisId: analysis.id,
    summary: { ... },
    businessType,
    confirmations: generateConfirmations(vocabulary, businessType),
  };
}
```

---

## i18n Strings

```json
// packages/i18n/translations/en/knosia.json

{
  "onboarding": {
    "connect": {
      "title": "Connect your data",
      "description": "We'll analyze your schema and have you up and running—usually under a minute.",
      "security": "Read-only access. Your data stays yours."
    },
    "summary": {
      "title": "Your data sources",
      "description": "Review your connected sources before we analyze them.",
      "addAnother": "Add another data source",
      "addAnotherHint": "Have data in Snowflake, BigQuery, or another database? Connect it now for a complete picture.",
      "continue": "Continue to analysis",
      "addLater": "You can always add more sources later.",
      "sourcesConnected": "{count} sources connected",
      "tablesTotal": "{count} tables total"
    },
    "review": {
      "analyzingMultiple": "Analyzing {count} sources...",
      "crossReferencing": "Cross-referencing schemas...",
      "foundAcross": "Here's what I found across your sources:",
      "sourceBreakdown": "Source breakdown:",
      "entitiesMatched": "{count} entities matched across sources"
    }
  }
}
```

---

## Module Exports

```typescript
// apps/web/src/modules/onboarding/index.ts

// Components
export { DatabaseSelector } from "./components/connect/database-selector";
export { ConnectionForm } from "./components/connect/connection-form";
export { ConnectionTest } from "./components/connect/connection-test";
export { ConnectionSummary } from "./components/connect/connection-summary";
export { ConnectionSummaryCard } from "./components/connect/connection-summary-card";

// Hooks
export { useConnectionTest } from "./hooks/use-connection-test";
export { useCreateConnection } from "./hooks/use-create-connection";
export { useOnboardingState } from "./hooks/use-onboarding-state";
export { useKnosiaOrg } from "./hooks/use-knosia-org";
export { useConnectionSummaries } from "./hooks/use-connection-summaries";
export { useAnalysis } from "./hooks/use-analysis";

// Utils
export { toConnectionTestResult } from "./lib/utils";

// Types
export type {
  ConnectionType,
  ConnectionFormValues,
  ConnectionTestResult,
  ConnectionSummary as ConnectionSummaryType,
  OnboardingProgress,
} from "./types";
```

---

## Testing

### Unit Tests

```typescript
// apps/web/src/modules/onboarding/__tests__/use-onboarding-state.test.ts

describe("useOnboardingState", () => {
  describe("multi-connection", () => {
    it("adds connection to array", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.addConnection("conn-1");
      });

      expect(result.current.progress.connectionIds).toEqual(["conn-1"]);
      expect(result.current.progress.primaryConnectionId).toBe("conn-1");
    });

    it("sets first connection as primary", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.addConnection("conn-1");
        result.current.addConnection("conn-2");
      });

      expect(result.current.progress.primaryConnectionId).toBe("conn-1");
    });

    it("updates primary when primary is removed", () => {
      const { result } = renderHook(() => useOnboardingState());

      act(() => {
        result.current.addConnection("conn-1");
        result.current.addConnection("conn-2");
        result.current.removeConnection("conn-1");
      });

      expect(result.current.progress.primaryConnectionId).toBe("conn-2");
    });
  });
});
```

### E2E Tests

```typescript
// tests/e2e/onboarding-multi-connection.spec.ts

test.describe("Multi-Connection Onboarding", () => {
  test("can add multiple connections", async ({ page }) => {
    await page.goto("/onboarding/connect");

    // First connection
    await page.click('[data-testid="db-postgres"]');
    await page.fill('[name="host"]', "db1.example.com");
    await page.fill('[name="database"]', "production");
    await page.fill('[name="username"]', "user");
    await page.fill('[name="password"]', "pass");
    await page.click('[data-testid="test-connect"]');

    // Should show summary
    await page.waitForSelector('[data-testid="connection-summary"]');
    await expect(page.getByText("postgres")).toBeVisible();

    // Add another
    await page.click('[data-testid="add-another"]');

    // Second connection
    await page.click('[data-testid="db-snowflake"]');
    await page.fill('[name="host"]', "acme.snowflakecomputing.com");
    // ... fill form
    await page.click('[data-testid="test-connect"]');

    // Should show both in summary
    await page.waitForSelector('[data-testid="connection-summary"]');
    await expect(page.getByText("2 sources connected")).toBeVisible();

    // Continue to analysis
    await page.click('[data-testid="continue-to-analysis"]');
    await page.waitForURL("/onboarding/review");
  });
});
```

---

## Implementation Checklist

### Phase 1: State & Types (1h)
- [ ] Update `types.ts` with multi-connection types
- [ ] Update `use-onboarding-state.ts` with array helpers
- [ ] Add `use-connection-summaries.ts` hook

### Phase 2: Components (3h)
- [ ] Create `ConnectionSummaryCard` component
- [ ] Create `ConnectionSummary` screen component
- [ ] Update `connect/page.tsx` with step logic

### Phase 3: API (2h)
- [ ] Update analysis schema to accept `connectionIds[]`
- [ ] Implement `startMultiConnectionAnalysis` mutation
- [ ] Add cross-referencing logic

### Phase 4: i18n & Polish (1h)
- [ ] Add i18n strings
- [ ] Update exports
- [ ] Add loading states

### Phase 5: Testing (2h)
- [ ] Unit tests for state hook
- [ ] E2E test for multi-connection flow

**Total: ~9 hours**

---

## Migration Notes

- Existing onboarding progress in localStorage will still work (legacy `connectionId` field preserved)
- First connection is automatically set as `primaryConnectionId`
- Single-connection users see no difference (summary screen auto-continues after 1 connection)

---

*Ready for implementation. Extends Wave 1 of the main frontend spec.*
