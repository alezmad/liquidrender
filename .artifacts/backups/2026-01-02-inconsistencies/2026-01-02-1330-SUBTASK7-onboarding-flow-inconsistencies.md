# Onboarding Flow Inconsistencies Analysis

**Date:** 2026-01-02
**Task:** SUBTASK7 - Analyze onboarding flow documentation inconsistencies
**Scope:** 5 artifact files vs actual implementation

---

## Executive Summary

Major inconsistencies found between documentation and implementation:

1. **Step Sequence Mismatch**: Documentation shows 6 steps (Connect → Analyze → Review → Role → Confirm → Ready), implementation has 5 steps (Connect → Review → Role → Confirm → Ready)
2. **Missing "Analysis" Step**: Implementation lacks the "Analyze" step shown in all documentation
3. **Step Naming Conflict**: "Analyze" step in docs vs "Review" step in implementation
4. **Multi-connection Support**: Implementation has full support, documentation inconsistent
5. **Route Structure**: Docs show `/onboarding/analyze`, implementation has no such route

---

## Inconsistencies by Category

### 1. Step Sequence Inconsistencies

```yaml
- id: SEQ-001
  category: step_sequence
  severity: critical
  title: "Analysis step missing in implementation"
  description: |
    All documentation files show a 6-step onboarding flow including an "Analyze" step,
    but the actual implementation only has 5 steps with no "Analyze" step.

  documented_flow:
    - connect
    - analyze    # Missing in implementation
    - review
    - role
    - confirm
    - ready

  implemented_flow:
    - connect
    - review     # No "analyze" step
    - role
    - confirm
    - ready

  sources:
    - file: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
      location: "Lines 106-318"
      shows: "STEP 1: CONNECT → STEP 2: ANALYZING → STEP 3: REVIEW → STEP 4: ROLE → STEP 5: CONFIRM → STEP 6: READY"

    - file: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md
      location: "Lines 289-360"
      shows: "connect → analysis → review flow"

    - file: .artifacts/2026-01-02-1700-knosia-project-structure.md
      location: "Lines 312-346"
      shows: "analysis/ component directory mentioned"

    - file: apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts
      location: "Lines 215-224"
      shows: |
        stepMap only contains: connect, review, role, confirm, ready
        No "analyze" or "analysis" step in mapping

  impact: |
    - Documentation-implementation mismatch causes confusion
    - Developers following docs will create wrong routes
    - UX journeys document shows screens that don't exist

  recommendation: |
    Option A: Add /onboarding/analysis route and implement the step
    Option B: Update all documentation to remove "analyze" step
    Option C: Merge "analyze" functionality into "review" step (appears to be current state)

- id: SEQ-002
  category: step_sequence
  severity: high
  title: "Progress indicator shows 6 steps, implementation has 5"
  description: |
    UX Journeys document shows a progress indicator with 6 steps including "Analyze",
    but implementation only supports 5 steps.

  documented_progress:
    source: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
    location: "Lines 322-330"
    content: "Connect ──── Analyze ──── Review ──── Role ──── Ready"

  actual_progress:
    source: apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts
    content: "Only 5 steps: connect, review, role, confirm, ready"

  impact: |
    - UI progress bar will be wrong if implemented from docs
    - Step counting logic will be off by one

  recommendation: |
    Update progress indicator documentation to show 5 steps

- id: SEQ-003
  category: step_sequence
  severity: medium
  title: "Consolidated implementation shows different flow than project structure"
  description: |
    Consolidated implementation doc shows: connect → analysis → review → dashboard
    Project structure doc shows: connect → analysis → review → summary → ready

  sources:
    - file: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md
      flow: "connect → analysis → review → dashboard"

    - file: .artifacts/2026-01-02-1700-knosia-project-structure.md
      location: "Lines 312-346"
      flow: "connect → analysis → review → summary → ready"
      note: "Shows 'summary' and 'ready' as NEW STEPS 🆕"

  impact: |
    - Unclear what the actual final steps should be
    - "summary" step mentioned as new but not in other docs or implementation

  recommendation: |
    Clarify whether "summary" step exists and standardize documentation
```

### 2. Step Naming Inconsistencies

```yaml
- id: NAME-001
  category: step_naming
  severity: critical
  title: "Analyze vs Analysis naming inconsistency"
  description: |
    Documentation uses both "analyze" and "analysis" for the same step,
    but implementation doesn't have either.

  variants_found:
    - name: "analyze"
      source: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
      location: "Line 142 - STEP 2: ANALYZING"
      route: "/onboarding/analyze"

    - name: "analysis"
      source: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md
      route: "/onboarding/analysis"

    - name: "analysis"
      source: .artifacts/2026-01-02-1700-knosia-project-structure.md
      location: "Line 316 - ├── analysis/"

  implementation:
    source: apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts
    status: "No 'analyze' or 'analysis' step exists"

  impact: |
    - Route naming confusion (analyze vs analysis)
    - Component naming confusion
    - Developers unsure which name to use

  recommendation: |
    If step is added, standardize on one name (suggest: "analysis")

- id: NAME-002
  category: step_naming
  severity: low
  title: "Confirm vs Confirmation inconsistency"
  description: |
    Documentation shows "confirm" step but some text refers to "confirmation questions"

  sources:
    - file: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
      location: "Line 251 - STEP 5: QUICK QUESTIONS"
      route: "/onboarding/confirm"
      content: "A Few Quick Questions"

  implementation:
    source: apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts
    location: "Line 219"
    shows: "confirm: \"confirm\""

  impact: |
    - Minor naming confusion in comments/documentation

  recommendation: |
    Use "confirm" consistently (already correct in implementation)
```

### 3. Route Structure Inconsistencies

```yaml
- id: ROUTE-001
  category: routes
  severity: critical
  title: "Analysis route documented but doesn't exist"
  description: |
    Multiple documentation files reference /onboarding/analysis or /onboarding/analyze
    but implementation has no such route in the stepMap.

  documented_routes:
    - route: "/onboarding/analyze"
      source: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
      location: "Line 142"

    - route: "/onboarding/analysis"
      source: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md

  implemented_routes:
    source: apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts
    location: "Lines 215-224"
    routes:
      - /onboarding/connect
      - /onboarding/review
      - /onboarding/role
      - /onboarding/confirm
      - /onboarding/ready

  impact: |
    - 404 errors if users navigate to /onboarding/analyze or /onboarding/analysis
    - Documentation-implementation mismatch

  recommendation: |
    Either implement the route or remove from documentation

- id: ROUTE-002
  category: routes
  severity: medium
  title: "Summary route mentioned but not in implementation"
  description: |
    Project structure doc mentions a "summary" component as a NEW STEP,
    but it's not in the step map or any other documentation.

  source:
    file: .artifacts/2026-01-02-1700-knosia-project-structure.md
    location: "Lines 312-346"
    shows: "│   ├── summary/  🆕 NEW STEP"

  implementation:
    status: "No 'summary' step in stepMap"

  impact: |
    - Unclear if this was planned or abandoned
    - Component directory might exist but not be routable

  recommendation: |
    Clarify if summary step should be implemented or documentation should be updated
```

### 4. Multi-Connection Support Inconsistencies

```yaml
- id: MULTI-001
  category: multi_connection
  severity: medium
  title: "Implementation has full multi-connection support, docs inconsistent"
  description: |
    Implementation has connectionIds array and multi-connection management functions,
    but documentation doesn't consistently mention this capability.

  implementation:
    source: apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts
    location: "Lines 64-99"
    features:
      - connectionIds: "string[]"
      - addConnection(connectionId)
      - removeConnection(connectionId)
      - setPrimaryConnection(connectionId)
      - primaryConnectionId tracking

    computed_values:
      - connectionCount: "progress.connectionIds.length"
      - hasConnections: "progress.connectionIds.length > 0"

  documentation:
    - file: .artifacts/2026-01-02-1600-knosia-consolidated-implementation.md
      mentions_multi: false
      shows_only: "Single connection flow"

    - file: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
      mentions_multi: false
      shows_only: "Connect single database"

    - file: .artifacts/2026-01-02-1700-knosia-project-structure.md
      location: "Line 335"
      mentions: "🚧 Connection Summary Screen - After first test"
      context: "Implies multi-connection capability but not detailed"

  impact: |
    - Developers may not know multi-connection is fully implemented
    - UX documentation doesn't show how to add additional connections
    - Missing user journey for multi-connection workflow

  recommendation: |
    Update UX journeys to include:
    - "Add Another Connection" flow after first connection
    - Connection summary screen showing all connections
    - Primary connection selection UI

- id: MULTI-002
  category: multi_connection
  severity: low
  title: "Legacy connectionId field still exists alongside connectionIds array"
  description: |
    Implementation maintains both connectionId (single) and connectionIds (array)
    for backwards compatibility, but documentation doesn't explain this.

  implementation:
    source: apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts
    shows:
      single: "connectionId: string | null"
      multi: "connectionIds: string[]"
      sync_logic: |
        When adding first connection:
        - Sets primaryConnectionId
        - Also sets connectionId for legacy support

  documentation:
    status: "No documentation of this dual-field pattern"

  impact: |
    - Confusion about which field to use
    - Risk of using deprecated field in new code

  recommendation: |
    Document the migration strategy and deprecation timeline for connectionId
```

### 5. Component Structure Inconsistencies

```yaml
- id: COMP-001
  category: components
  severity: medium
  title: "Analysis component directory mentioned but may not exist"
  description: |
    Project structure doc shows analysis/ component directory,
    but implementation doesn't route to it.

  documented_structure:
    source: .artifacts/2026-01-02-1700-knosia-project-structure.md
    location: "Lines 312-346"
    shows: |
      web/src/modules/onboarding/
      ├── components/
      │   ├── connect/
      │   ├── analysis/  ← Shown in docs
      │   ├── review/

  actual_structure:
    status: "Need to verify if directory exists"
    note: "Glob results showed: connect, review, role, confirm, ready components"

  impact: |
    - Dead component code if directory exists but not routed
    - Documentation maintenance burden

  recommendation: |
    Verify component directory existence and remove from docs if not used

- id: COMP-002
  category: components
  severity: low
  title: "Summary and ready components marked as NEW but not in all docs"
  description: |
    Project structure shows summary/ and ready/ as NEW STEPS,
    but other docs don't mention summary at all.

  source:
    file: .artifacts/2026-01-02-1700-knosia-project-structure.md
    location: "Lines 312-346"
    shows: |
      │   ├── summary/  🆕 NEW STEP
      │   └── ready/    🆕 NEW STEP

  verification:
    ready: "Exists in implementation (confirmed in stepMap)"
    summary: "Not in stepMap, unclear if implemented"

  impact: |
    - Unclear implementation status of summary step

  recommendation: |
    Remove "NEW STEP" markers or add summary to implementation
```

### 6. Business Type Detection Inconsistencies

```yaml
- id: BIZ-001
  category: business_type
  severity: medium
  title: "Business type detection mentioned but location unclear"
  description: |
    Multiple docs mention business type detection (SaaS, e-commerce, etc.)
    but unclear which step performs this detection.

  sources:
    - file: .artifacts/2026-01-02-1535-knosia-ux-journeys.md
      location: "Lines 160-162"
      shows: |
        During ANALYZING step:
        "Looks like a SaaS business!"
        "Detected: subscriptions, customers, invoices"

    - file: .artifacts/2026-01-02-1700-knosia-project-structure.md
      location: "Line 337"
      shows: "🆕 Add business type display to analysis step"

  implementation:
    status: "Unclear - no analysis step exists"
    question: "Does review step perform this? Or is it backend only?"

  impact: |
    - Unclear where to implement business type UI
    - Confusion about when detection happens

  recommendation: |
    Clarify which step displays business type detection results
```

---

## Summary of Critical Issues

### Must Fix

1. **SEQ-001**: Analysis step missing in implementation (critical)
2. **ROUTE-001**: Analysis route documented but doesn't exist (critical)
3. **NAME-001**: Analyze vs Analysis naming inconsistency (critical)

### Should Fix

4. **SEQ-002**: Progress indicator mismatch (high)
5. **MULTI-001**: Multi-connection documentation gap (medium)
6. **ROUTE-002**: Summary route unclear (medium)

### Nice to Fix

7. **SEQ-003**: Flow variations across docs (medium)
8. **BIZ-001**: Business type detection location unclear (medium)
9. **COMP-001**: Analysis component directory status (medium)

---

## Recommended Actions

### Immediate (This Week)

1. **Decision**: Keep or remove "analysis" step?
   - If keep: Implement route and component
   - If remove: Update all documentation to remove it

2. **Standardize step sequence** across all docs:
   - Pick one canonical flow
   - Update all artifact files to match

3. **Document multi-connection support** in UX journeys:
   - Add "Add Another Connection" flow
   - Show connection summary screen

### Short Term (Next Sprint)

4. **Audit component directories**:
   - Remove unused analysis/ if exists
   - Clarify summary/ component status

5. **Standardize naming**:
   - Use "analysis" consistently if keeping step
   - Use "confirm" not "confirmation"

6. **Update progress indicators**:
   - Match actual implementation (5 steps)
   - Remove "analyze" from progress bar docs

### Long Term

7. **Create single source of truth** for onboarding flow:
   - Mark one document as canonical
   - Have other docs reference it
   - Add validation to catch drift

---

## Files Analyzed

1. `/Users/agutierrez/Desktop/liquidrender/.artifacts/2026-01-02-1500-knosia-platform-architecture.md` ✓
2. `/Users/agutierrez/Desktop/liquidrender/.artifacts/2026-01-02-1535-knosia-ux-journeys.md` ✓
3. `/Users/agutierrez/Desktop/liquidrender/.artifacts/2026-01-02-1600-knosia-consolidated-implementation.md` ✓
4. `/Users/agutierrez/Desktop/liquidrender/.artifacts/2026-01-02-1700-knosia-project-structure.md` ✓
5. `/Users/agutierrez/Desktop/liquidrender/.artifacts/2026-01-02-1800-knosia-glue-implementation-blueprint.md` ✓
6. `/Users/agutierrez/Desktop/liquidrender/apps/web/src/modules/onboarding/hooks/use-onboarding-state.ts` ✓

---

**Analysis Complete:** 2026-01-02
**Total Inconsistencies Found:** 12
**Critical:** 3 | **High:** 1 | **Medium:** 6 | **Low:** 2
