# Wave 5: Polish [PARALLEL]

**Duration:** 3 days
**LOC:** Throughout codebase
**Files:** Throughout
**Mode:** PARALLEL (4 independent groups)

---

## Entry Criteria

- ✅ Wave 4 complete (Thread interface working)
- ✅ All core features implemented
- ✅ Happy path works end-to-end

---

## Overview

Wave 5 adds production-readiness: error handling, loading states, responsive design, and tests.

**Why Parallel:** Four independent quality improvements:
- Group A: Error handling
- Group B: Loading states
- Group C: Responsive CSS
- Group D: E2E tests

---

## Parallel Execution Groups

### Group A: Error Handling

**Agent Assignment:** Agent-A
**Files:** Throughout (add error boundaries, try-catch, fallbacks)
**Duration:** 1 day

#### Scope

Add comprehensive error handling to:
1. Pipeline orchestrator
2. API endpoints
3. React components
4. Query execution

#### Task A1: Pipeline Error Handling

**File:** `packages/api/src/modules/knosia/pipeline/index.ts` (modify)

**Enhancements:**
```typescript
// Wrap each step in try-catch
try {
  const extractedSchema = await extractSchema(adapter);
} catch (error) {
  errors.push(`Schema extraction failed: ${error.message}`);
  // Continue with partial results or abort
}

// Add timeout handling
const extractSchemaWithTimeout = withTimeout(
  extractSchema(adapter),
  30000, // 30 seconds
  "Schema extraction timed out"
);

// Add retry logic for transient failures
const result = await retry(
  () => executeQuery(sql, adapter),
  { maxAttempts: 3, delay: 1000 }
);
```

**Issues:** ERR-001, PIPE-006

#### Task A2: API Error Responses

**File:** `packages/api/src/modules/knosia/analysis/router.ts` (modify)

**Standardize error responses:**
```typescript
.post("/trigger", async (c) => {
  try {
    const result = await triggerAnalysis(...);
    return c.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    if (error instanceof ConnectionError) {
      return c.json({ error: "Connection failed", hint: "Check credentials" }, 503);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});
```

**Issues:** ERR-002, API-002

#### Task A3: React Error Boundaries

**File:** `apps/web/src/modules/knosia/components/error-boundary.tsx` (create)

```typescript
import { Component, ReactNode } from "react";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Icons.AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button onClick={() => this.setState({ hasError: false, error: null })}>
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

Wrap modules:
```typescript
// apps/web/src/modules/knosia/home/components/home-view.tsx
export function HomeView({ ... }) {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* content */}
      </div>
    </ErrorBoundary>
  );
}
```

**Issues:** ERR-003, UI-009

---

### Group B: Loading States

**Agent Assignment:** Agent-B
**Files:** Throughout (add skeletons, spinners, progress indicators)
**Duration:** 1 day

#### Scope

Add loading states to:
1. Onboarding analysis step
2. HOME page KPI loading
3. Thread query execution
4. Data fetching

#### Task B1: Onboarding Loading

**File:** `apps/web/src/modules/onboarding/components/analysis/analysis-step.tsx` (modify)

**Add progress indicator:**
```typescript
import { Progress } from "@turbostarter/ui-web/progress";
import { Skeleton } from "@turbostarter/ui-web/skeleton";

export function AnalysisStep() {
  const { data: analysis, isLoading } = useQuery({ ... });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Progress value={0} />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2>Analyzing Your Data...</h2>
      <Progress value={analysis.progress} />
      <ul className="space-y-2">
        {analysis.steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2">
            {step.completed ? (
              <Icons.CheckCircle className="h-4 w-4 text-success" />
            ) : step.inProgress ? (
              <Icons.Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.Circle className="h-4 w-4 text-muted" />
            )}
            <span>{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Issues:** LOAD-001, UI-010

#### Task B2: HOME Page Skeletons

**File:** `apps/web/src/modules/knosia/home/components/home-view.tsx` (modify)

```typescript
import { Skeleton } from "@turbostarter/ui-web/skeleton";

export function HomeView({ ... }) {
  const { data: dashboardSpec, isLoading } = useQuery({ ... });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (/* actual content */);
}
```

**Issues:** LOAD-002, UI-011

#### Task B3: Thread Query Loading

**File:** `apps/web/src/modules/knosia/thread/components/thread-view.tsx` (modify)

```typescript
export function ThreadView({ ... }) {
  const sendQuery = useMutation({
    mutationFn: async (query: string) => { ... },
  });

  return (
    <div className="flex flex-col">
      <MessageList messages={messages} />

      {/* Show loading state while query executes */}
      {sendQuery.isPending && (
        <div className="flex items-center gap-2 p-4 bg-accent">
          <Icons.Loader className="h-4 w-4 animate-spin" />
          <span>Processing query...</span>
        </div>
      )}

      <QueryInput
        onSubmit={(q) => sendQuery.mutate(q)}
        disabled={sendQuery.isPending}
      />
    </div>
  );
}
```

**Issues:** LOAD-003, THREAD-004

---

### Group C: Responsive CSS

**Agent Assignment:** Agent-C
**Files:** Throughout (add breakpoints, mobile layouts)
**Duration:** 1 day

#### Scope

Make responsive:
1. HOME page grid
2. Thread interface
3. Onboarding steps
4. Navigation

#### Task C1: HOME Page Responsive Grid

**File:** `apps/web/src/modules/knosia/home/components/kpi-grid.tsx` (modify)

```typescript
export function KpiGrid({ spec }: { spec: DashboardSpec }) {
  return (
    <div className="space-y-6">
      {spec.sections.map((section) => (
        <div key={section.id}>
          <h3 className="text-lg font-semibold mb-4">{section.name}</h3>

          {/* Responsive grid: 1 col mobile, 2 tablet, 4 desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {section.kpis.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>

          {/* Chart takes full width on mobile */}
          {section.chart && (
            <div className="mt-4">
              <ChartCard chart={section.chart} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Issues:** CSS-001, UI-012

#### Task C2: Thread Mobile Layout

**File:** `apps/web/src/modules/knosia/thread/components/thread-view.tsx` (modify)

```typescript
export function ThreadView({ ... }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      {/* Mobile: Drawer sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Icons.Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          {/* Thread list */}
        </SheetContent>
      </Sheet>

      {/* Desktop: Fixed sidebar */}
      <div className="hidden md:block w-64 border-r">
        {/* Thread list */}
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Messages + Input */}
      </div>
    </div>
  );
}
```

**Issues:** CSS-002, MOBILE-001

#### Task C3: Onboarding Mobile Steps

**File:** `apps/web/src/modules/onboarding/components/onboarding-layout.tsx` (modify)

```typescript
export function OnboardingLayout({ children }) {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <Logo className="h-8 md:h-10" />
        </div>

        {/* Steps indicator - horizontal on desktop, vertical on mobile */}
        <div className="mb-8">
          <div className="hidden md:flex items-center justify-between">
            {/* Desktop steps */}
          </div>
          <div className="md:hidden space-y-2">
            {/* Mobile steps */}
          </div>
        </div>

        {/* Content */}
        <div className="bg-card rounded-lg p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
```

**Issues:** CSS-003, ONB-002

---

### Group D: E2E Tests

**Agent Assignment:** Agent-D
**Files:** `apps/web/tests/e2e/`
**Duration:** 1 day

#### Scope

Test critical user journeys:
1. Onboarding flow
2. HOME page load
3. Thread query execution

#### Task D1: Onboarding E2E

**File:** `apps/web/tests/e2e/onboarding.spec.ts` (create)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Knosia Onboarding', () => {
  test('completes full onboarding flow', async ({ page }) => {
    // Navigate to onboarding
    await page.goto('/onboarding/connect');

    // Connect database
    await page.fill('[name="connectionString"]', process.env.TEST_DB_URL!);
    await page.click('button:has-text("Test Connection")');
    await expect(page.locator('text=Connected successfully')).toBeVisible();

    // Continue to analysis
    await page.click('button:has-text("Continue")');
    await expect(page.locator('h2:has-text("Analyzing Your Data")')).toBeVisible();

    // Wait for analysis to complete
    await expect(page.locator('text=Analysis complete')).toBeVisible({ timeout: 60000 });

    // Review results
    await expect(page.locator('text=Detected:')).toBeVisible();
    await expect(page.locator('text=SaaS')).toBeVisible();

    // Complete onboarding
    await page.click('button:has-text("Confirm & Continue")');
    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/knosia/);
  });
});
```

**Issues:** TEST-001, E2E-001

#### Task D2: HOME Page E2E

**File:** `apps/web/tests/e2e/home.spec.ts` (create)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Knosia HOME', () => {
  test('displays KPIs from dashboard spec', async ({ page }) => {
    // Assume onboarding complete
    await page.goto('/dashboard/test-org/knosia');

    // Wait for greeting
    await expect(page.locator('h1:has-text("Good morning")')).toBeVisible();

    // Check KPIs loaded
    await expect(page.locator('[data-liquid-type="kpi"]')).toHaveCount(4, { timeout: 10000 });

    // Check chart rendered
    await expect(page.locator('[data-liquid-type="line"]')).toBeVisible();
  });
});
```

**Issues:** TEST-002, E2E-002

#### Task D3: Thread E2E

**File:** `apps/web/tests/e2e/thread.spec.ts` (create)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Knosia Thread', () => {
  test('executes query and displays result', async ({ page }) => {
    await page.goto('/dashboard/test-org/knosia/thread');

    // Send query
    await page.fill('textarea[placeholder*="Ask a question"]', "What's our MRR?");
    await page.click('button[type="submit"]');

    // Wait for result
    await expect(page.locator('text=95% confidence')).toBeVisible({ timeout: 30000 });

    // Check chart rendered
    await expect(page.locator('[data-liquid-type="kpi"]')).toBeVisible();

    // Check suggested follow-ups
    await expect(page.locator('text=Suggested follow-ups')).toBeVisible();
  });
});
```

**Issues:** TEST-003, E2E-003

---

## Additional Polish Tasks

### Task E: TypeScript Strict Mode

Enable strict mode and fix violations:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Issues:** TS-001

### Task F: Accessibility

- Add ARIA labels to interactive elements
- Ensure keyboard navigation works
- Test with screen reader

**Issues:** A11Y-001

### Task G: Performance

- Add React.memo to expensive components
- Implement virtualization for long lists
- Optimize bundle size

**Issues:** PERF-001

---

## Exit Criteria

- ✅ All 4 groups complete
- ✅ Error handling covers all failure modes:
  ```bash
  # Test error cases
  - Invalid connection string
  - Database timeout
  - Query execution error
  - Network failure
  ```
- ✅ Loading states smooth:
  ```bash
  # Throttle network to "Slow 3G"
  # Verify skeletons appear
  ```
- ✅ Responsive on mobile:
  ```bash
  # Test on iPhone 12 viewport (390x844)
  # All features accessible
  ```
- ✅ E2E tests pass:
  ```bash
  pnpm --filter web test:e2e
  ```
- ✅ Lighthouse scores:
  - Performance: >90
  - Accessibility: >95
  - Best Practices: >90
- ✅ Git commit:
  ```bash
  git add apps/web/
  git add packages/
  git commit -m "feat(knosia): wave-5 - production polish

  Wave 5: Polish (4 parallel groups)
  Group A: Error handling
  - Pipeline error boundaries
  - API error responses
  - React error boundaries

  Group B: Loading states
  - Onboarding progress indicators
  - HOME page skeletons
  - Thread query loading

  Group C: Responsive CSS
  - Mobile-first grid layouts
  - Thread drawer sidebar
  - Responsive onboarding

  Group D: E2E tests
  - Onboarding flow test
  - HOME page test
  - Thread execution test

  Additional:
  - TypeScript strict mode
  - Accessibility improvements
  - Performance optimizations

  Closes: #ERR-001 #ERR-002 #ERR-003 #LOAD-001 #LOAD-002
  Closes: #LOAD-003 #CSS-001 #CSS-002 #CSS-003 #TEST-001
  Closes: #TEST-002 #TEST-003 #E2E-001 #E2E-002 #E2E-003
  Closes: #UI-009 #UI-010 #UI-011 #UI-012 #MOBILE-001
  Closes: #ONB-002 #THREAD-004 #TS-001 #A11Y-001 #PERF-001"
  ```

---

## Final Verification

After Wave 5:

1. ✅ Run full test suite:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
   ```

2. ✅ Manual smoke test:
   - Complete onboarding
   - View HOME page
   - Execute thread query
   - Pin result to Canvas

3. ✅ Performance audit:
   - Run Lighthouse
   - Check bundle size
   - Verify no memory leaks

4. ✅ Documentation:
   - Update README
   - Add deployment guide
   - Document API endpoints

---

## Implementation Complete

After Wave 5 completes, the full Knosia implementation is **PRODUCTION READY**:

- ✅ Wave 0: Type definitions
- ✅ Wave 1: Business type detection + templates
- ✅ Wave 2: 4 glue functions
- ✅ Wave 3: Pipeline + HOME page
- ✅ Wave 4: Thread interface
- ✅ Wave 5: Production polish

**Total Implementation:**
- **Files:** 39 new + 13 modified = 52 files
- **LOC:** ~2,650 lines of new code
- **Timeline:** 16 days (2 weeks)

---

*Wave 5 complete. Knosia ready for production deployment.*
